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
import { type CoverageEntry, getCoverageMap } from "./first-response";

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
 */
export async function ingestEmergencyEvent(
  input: EmergencyEventInput,
  options: IngestOptions = {}
): Promise<IngestResult> {
  const coverage = options.coverage ?? (await getCoverageMap());
  const matched = computeMatchedCampaigns(
    coverage,
    input.countryIso,
    input.eventType
  );

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("emergency_events").insert({
    external_id: input.externalId,
    source: input.source,
    event_type: input.eventType,
    country_iso: input.countryIso,
    region: input.region,
    title: input.title,
    summary: input.summary,
    severity_raw: input.severityRaw,
    // Baseline score = raw severity. Phase 3c scoring engine recomputes
    // with weight × severity × diaspora × media-velocity once built.
    dr_priority_score: input.severityRaw,
    matched_campaigns: matched,
    source_url: input.sourceUrl,
    raw_payload: input.rawPayload as Record<string, unknown>,
  });

  if (error) {
    // 23505 = unique_violation on external_id → already ingested.
    if ((error as { code?: string }).code === "23505") {
      return { inserted: false, matchedCampaigns: matched };
    }
    console.error("[first-response-ingest] insert failed:", error);
    return { inserted: false, matchedCampaigns: matched };
  }
  return { inserted: true, matchedCampaigns: matched };
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
}> {
  const coverage = await getCoverageMap();
  let inserted = 0;
  let skipped = 0;
  let errors = 0;
  for (const ev of events) {
    try {
      const result = await ingestEmergencyEvent(ev, { coverage });
      if (result.inserted) inserted += 1;
      else skipped += 1;
    } catch (err) {
      errors += 1;
      console.error("[first-response-ingest] batch error:", err);
    }
  }
  return { total: events.length, inserted, skipped, errors };
}
