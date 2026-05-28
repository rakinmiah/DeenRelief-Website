/**
 * Shared insertion helper for the First Response signal-source ingesters.
 *
 * Each ingester (GDACS, USGS, ReliefWeb, ...) fetches its source,
 * normalises results into the EmergencyEventInput shape, and calls
 * ingestEmergencyEvent() per event. This module handles:
 *
 *   - Dedupe via the unique external_id constraint on emergency_events
 *     (ON CONFLICT silently skipped — re-runs of the same cron are
 *     no-ops, which is what we want).
 *   - Basic country-to-campaign matching against coverage_map. Each
 *     event arrives tagged with matched_campaigns so the dashboard
 *     can render "this event maps to: Palestine, Zakat" without
 *     re-computing per render.
 *   - Initial dr_priority_score = severity_raw (just propagated as a
 *     baseline). Phase 3c will recompute with the multi-factor model
 *     once the scoring engine is built.
 *
 * Pass an explicit `coverage` array to avoid hitting the DB once per
 * event in a batch — each cron route fetches the coverage map once
 * at the start of a run and threads it through.
 */

import { getSupabaseAdmin } from "./supabase";
import { enqueueNotification } from "./admin-notifications";
import { type CoverageEntry, getCoverageMap } from "./first-response";
import {
  computeDrPriorityScore,
  getPushTier,
  type PushTier,
} from "./first-response-scoring";
import { CAMPAIGNS, isValidCampaign, type CampaignSlug } from "./campaigns";

export interface EmergencyEventInput {
  /** Unique cross-source key, conventionally '<source>:<source-id>'. */
  externalId: string;
  source: string;
  /** Free-text type, ideally from the coverage_map vocabulary. */
  eventType: string | null;
  /** ISO 3166-1 alpha-2. May include subdivision suffix (e.g. 'GB-BRT'). */
  countryIso: string | null;
  region: string | null;
  title: string;
  summary: string | null;
  /** Source-specific numeric severity. Earthquake magnitude, GDACS 1/2/3, etc. */
  severityRaw: number | null;
  sourceUrl: string | null;
  rawPayload: unknown;
}

export interface IngestResult {
  inserted: boolean;
  matchedCampaigns: string[];
  drPriorityScore: number | null;
  pushTier: PushTier;
}

/**
 * True if an event of the given (country_iso, event_type) should be
 * routed to the given coverage_map row.
 *
 * Rules:
 *   - Weight must be > 0 (excludes 'general').
 *   - The row must have at least one trigger_event_type configured
 *     (empty array = evergreen, never matches).
 *   - If event_type is known, it must be in the row's list.
 *   - Geographic gate: catch-all rows match any country; otherwise
 *     country_iso must appear in the row's geographies (with prefix
 *     match — 'GB' matches 'GB-BRT' too).
 */
function matchesEvent(
  row: CoverageEntry,
  countryIso: string | null,
  eventType: string | null
): boolean {
  if (row.weight <= 0) return false;
  if (row.triggerEventTypes.length === 0) return false;
  if (eventType && !row.triggerEventTypes.includes(eventType)) return false;
  if (row.isCatchAll) return true;
  if (!countryIso) return false;
  const c = countryIso.toUpperCase();
  return row.geographies.some(
    (g) => g === c || g.startsWith(`${c}-`) || c.startsWith(`${g}-`)
  );
}

/**
 * Compute the matched_campaigns list for an incoming event.
 * Returns campaign slugs sorted by coverage weight desc, then
 * campaign_slug asc for stable ordering.
 */
export function computeMatchedCampaigns(
  coverage: CoverageEntry[],
  countryIso: string | null,
  eventType: string | null
): string[] {
  return coverage
    .filter((row) => matchesEvent(row, countryIso, eventType))
    .sort((a, b) => {
      if (b.weight !== a.weight) return b.weight - a.weight;
      return a.campaignSlug.localeCompare(b.campaignSlug);
    })
    .map((row) => row.campaignSlug);
}

export interface IngestOptions {
  /**
   * Pre-fetched coverage map. Pass once per cron run rather than
   * letting each event re-fetch it.
   */
  coverage?: CoverageEntry[];
}

/**
 * Insert one emergency event. Dedupe is enforced by the unique
 * external_id constraint — repeat calls with the same externalId
 * return { inserted: false } without erroring.
 *
 * Scoring (Phase 3c): the multi-factor dr_priority_score is computed
 * from coverage weight × diaspora multiplier × Muslim-majority
 * multiplier × severity. See src/lib/first-response-scoring.ts for
 * full algorithm + calibration notes.
 *
 * Push alerts: when the score crosses CRITICAL or HIGH thresholds, a
 * notification is enqueued via the existing admin notification
 * system. Critical events fire an immediate audible push to every
 * subscribed device; high events sit silently in the bell.
 */
export async function ingestEmergencyEvent(
  input: EmergencyEventInput,
  options: IngestOptions = {}
): Promise<IngestResult> {
  const coverage = options.coverage ?? (await getCoverageMap());
  const matchedCoverage = coverage.filter((row) =>
    matchesEvent(row, input.countryIso, input.eventType)
  );
  const matched = computeMatchedCampaigns(
    coverage,
    input.countryIso,
    input.eventType
  );

  const score = computeDrPriorityScore({
    severityRaw: input.severityRaw,
    matchedCoverage,
    countryIso: input.countryIso,
  });
  const tier = getPushTier(score);

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("emergency_events")
    .insert({
      external_id: input.externalId,
      source: input.source,
      event_type: input.eventType,
      country_iso: input.countryIso,
      region: input.region,
      title: input.title,
      summary: input.summary,
      severity_raw: input.severityRaw,
      dr_priority_score: score,
      matched_campaigns: matched,
      source_url: input.sourceUrl,
      raw_payload: input.rawPayload as Record<string, unknown>,
    })
    .select("id")
    .maybeSingle<{ id: string }>();

  if (error) {
    // 23505 = unique_violation on external_id → already ingested.
    if ((error as { code?: string }).code === "23505") {
      return {
        inserted: false,
        matchedCampaigns: matched,
        drPriorityScore: score,
        pushTier: "none",
      };
    }
    console.error("[first-response-ingest] insert failed:", error);
    return {
      inserted: false,
      matchedCampaigns: matched,
      drPriorityScore: score,
      pushTier: "none",
    };
  }

  // Fire a push notification when the score crosses a threshold.
  // Failure-isolated — we never want a push hiccup to roll back the
  // insert (the event is already saved).
  if (tier !== "none" && data?.id) {
    await dispatchFirstResponseAlert({
      eventId: data.id,
      title: input.title,
      summary: input.summary,
      countryIso: input.countryIso,
      region: input.region,
      eventType: input.eventType,
      matchedCampaigns: matched,
      score: score!, // tier !== 'none' implies score !== null
      tier,
    });
  }

  return {
    inserted: true,
    matchedCampaigns: matched,
    drPriorityScore: score,
    pushTier: tier,
  };
}

/**
 * Dispatch the push notification for a scored event. Builds a
 * compact bell-row title + body and routes to the existing
 * enqueueNotification helper, which fans out as both a DB row (bell
 * icon) and an OS-level web push (subscribed devices).
 */
async function dispatchFirstResponseAlert(input: {
  eventId: string;
  title: string;
  summary: string | null;
  countryIso: string | null;
  region: string | null;
  eventType: string | null;
  matchedCampaigns: string[];
  score: number;
  tier: PushTier;
}): Promise<void> {
  // Campaign label hint — first matched campaign is the strongest
  // recommendation by score order.
  const topCampaign = input.matchedCampaigns[0];
  const campaignLabel =
    topCampaign && isValidCampaign(topCampaign)
      ? CAMPAIGNS[topCampaign as CampaignSlug]
      : topCampaign ?? null;

  const eventTypeLabel = input.eventType
    ? input.eventType.replace(/_/g, " ")
    : "event";

  // Tier-specific framing. Critical screams urgency; high is
  // informational ("you'll want to know about this soon").
  const tierPrefix = input.tier === "critical" ? "🚨 CRITICAL" : "⚠ Alert";
  const locationBit =
    input.region ?? input.countryIso ?? "unknown location";

  const title = `${tierPrefix}: ${eventTypeLabel} — ${locationBit}`;
  const body = [
    `Score ${input.score.toFixed(1)}`,
    campaignLabel ? `→ ${campaignLabel}` : null,
    input.summary?.slice(0, 120) ?? input.title.slice(0, 120),
  ]
    .filter(Boolean)
    .join(" · ");

  try {
    await enqueueNotification({
      type:
        input.tier === "critical"
          ? "first_response_critical"
          : "first_response_high",
      severity: input.tier === "critical" ? "urgent" : "warning",
      title,
      body,
      targetUrl: "/admin/social/first-response",
      targetId: input.eventId,
    });
  } catch (err) {
    console.error("[first-response-ingest] alert dispatch failed:", err);
  }
}


/**
 * Batch ingestion helper used by every cron route. Returns aggregate
 * counts the route can return as JSON for cron-log inspection.
 */
export async function ingestBatch(
  events: EmergencyEventInput[]
): Promise<{
  total: number;
  inserted: number;
  skipped: number;
  errors: number;
  critical: number;
  high: number;
}> {
  const coverage = await getCoverageMap();
  let inserted = 0;
  let skipped = 0;
  let errors = 0;
  let critical = 0;
  let high = 0;
  for (const ev of events) {
    try {
      const result = await ingestEmergencyEvent(ev, { coverage });
      if (result.inserted) {
        inserted += 1;
        if (result.pushTier === "critical") critical += 1;
        else if (result.pushTier === "high") high += 1;
      } else {
        skipped += 1;
      }
    } catch (err) {
      errors += 1;
      console.error("[first-response-ingest] batch error:", err);
    }
  }
  return { total: events.length, inserted, skipped, errors, critical, high };
}
