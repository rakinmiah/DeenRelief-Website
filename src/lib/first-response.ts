/**
 * First Response — types + DB helpers for the crisis intelligence
 * half of the Social Operations Platform.
 *
 * This module is read-only schema access. Insertion happens in the
 * signal-source ingesters (Phase 3b) and the scoring engine
 * (Phase 3c) which haven't been built yet.
 */

import { getSupabaseAdmin } from "./supabase";

// ─── Coverage map ────────────────────────────────────────────────────

export interface CoverageEntry {
  campaignSlug: string;
  geographies: string[];
  triggerEventTypes: string[];
  triggerKeywords: string[];
  isCatchAll: boolean;
  weight: number;
  launchReadiness: string | null;
  fieldTeamPhone: string | null;
  notes: string | null;
}

interface CoverageRow {
  campaign_slug: string;
  geographies: string[] | null;
  trigger_event_types: string[] | null;
  trigger_keywords: string[] | null;
  is_catch_all: boolean;
  weight: number;
  launch_readiness: string | null;
  field_team_phone: string | null;
  notes: string | null;
}

function rowToCoverage(row: CoverageRow): CoverageEntry {
  return {
    campaignSlug: row.campaign_slug,
    geographies: row.geographies ?? [],
    triggerEventTypes: row.trigger_event_types ?? [],
    triggerKeywords: row.trigger_keywords ?? [],
    isCatchAll: row.is_catch_all,
    weight: row.weight,
    launchReadiness: row.launch_readiness,
    fieldTeamPhone: row.field_team_phone,
    notes: row.notes,
  };
}

/**
 * Full coverage map, ordered by weight desc. Used by the admin
 * dashboard. Cached server-side per render — the map changes rarely.
 */
export async function getCoverageMap(): Promise<CoverageEntry[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("coverage_map")
    .select(
      "campaign_slug, geographies, trigger_event_types, trigger_keywords, is_catch_all, weight, launch_readiness, field_team_phone, notes"
    )
    .order("weight", { ascending: false })
    .order("campaign_slug", { ascending: true })
    .returns<CoverageRow[]>();
  if (error) {
    console.error("[first-response] coverage_map read failed:", error);
    return [];
  }
  return (data ?? []).map(rowToCoverage);
}

// ─── Emergency events ────────────────────────────────────────────────

export type EmergencyEventStatus =
  | "detected"
  | "reviewed"
  | "launched"
  | "dismissed";

export type EmergencyEventSource =
  | "gdacs"
  | "usgs"
  | "reliefweb"
  | "acled"
  | "news"
  | "social"
  | "competitor"
  | "site_search"
  | "manual";

export interface EmergencyEvent {
  id: string;
  externalId: string | null;
  source: EmergencyEventSource | string;
  eventType: string | null;
  countryIso: string | null;
  region: string | null;
  title: string;
  summary: string | null;
  severityRaw: number | null;
  drPriorityScore: number | null;
  matchedCampaigns: string[];
  status: EmergencyEventStatus;
  detectedAt: Date;
  reviewedByEmail: string | null;
  reviewedAt: Date | null;
  sourceUrl: string | null;
}

interface EmergencyEventRow {
  id: string;
  external_id: string | null;
  source: string;
  event_type: string | null;
  country_iso: string | null;
  region: string | null;
  title: string;
  summary: string | null;
  severity_raw: number | null;
  dr_priority_score: number | null;
  matched_campaigns: string[] | null;
  status: EmergencyEventStatus;
  detected_at: string;
  reviewed_by_email: string | null;
  reviewed_at: string | null;
  source_url: string | null;
}

function rowToEvent(row: EmergencyEventRow): EmergencyEvent {
  return {
    id: row.id,
    externalId: row.external_id,
    source: row.source,
    eventType: row.event_type,
    countryIso: row.country_iso,
    region: row.region,
    title: row.title,
    summary: row.summary,
    severityRaw: row.severity_raw,
    drPriorityScore: row.dr_priority_score,
    matchedCampaigns: row.matched_campaigns ?? [],
    status: row.status,
    detectedAt: new Date(row.detected_at),
    reviewedByEmail: row.reviewed_by_email,
    reviewedAt: row.reviewed_at ? new Date(row.reviewed_at) : null,
    sourceUrl: row.source_url,
  };
}

/**
 * How long a detected report stays "live" in the First Response feed.
 * After this many days an emergency drops off the dashboard — disaster
 * news goes stale fast, and a week-old report is no longer a "first
 * response" opportunity. The underlying row is kept (history, by-id
 * detail links still resolve); it's only hidden from the live list.
 */
export const REPORT_EXPIRY_DAYS = 7;

export interface GetEmergencyEventsOptions {
  status?: EmergencyEventStatus | EmergencyEventStatus[];
  limit?: number;
  /**
   * Filter to events with score > 0 (i.e. at least one matched
   * campaign + non-zero normalised severity). Defaults true for
   * dashboard reads — events DR can't action stay hidden. Set false
   * to include zero-score events (forensic / audit views).
   */
  onlyActionable?: boolean;
  /**
   * Hide reports whose detected_at is older than this many days.
   * Defaults to REPORT_EXPIRY_DAYS (7) so the live feed only carries
   * current emergencies. Pass 0 / null to disable the window (audit /
   * historical views).
   */
  withinDays?: number | null;
}

/**
 * Fetch a single emergency_events row by id, including everything the
 * detail page + launch-packet generator need (raw_payload, draft_packet,
 * the works). Returns null when not found.
 */
export interface EmergencyEventDetail extends EmergencyEvent {
  rawPayload: unknown;
  draftPacketJson: unknown | null;
  draftPacketGeneratedAt: Date | null;
  draftPacketGeneratedByEmail: string | null;
  draftPacketModel: string | null;
  draftPacketInputTokens: number | null;
  draftPacketOutputTokens: number | null;
  appealLaunchedAt: Date | null;
  appealLaunchedByEmail: string | null;
}

export async function getEmergencyEventById(
  id: string
): Promise<EmergencyEventDetail | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("emergency_events")
    .select(
      "id, external_id, source, event_type, country_iso, region, title, summary, severity_raw, dr_priority_score, matched_campaigns, status, detected_at, reviewed_by_email, reviewed_at, source_url, raw_payload, draft_packet_json, draft_packet_generated_at, draft_packet_generated_by_email, draft_packet_model, draft_packet_input_tokens, draft_packet_output_tokens, appeal_launched_at, appeal_launched_by_email"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[first-response] event-by-id read failed:", error);
    return null;
  }
  if (!data) return null;

  return {
    id: data.id,
    externalId: data.external_id,
    source: data.source,
    eventType: data.event_type,
    countryIso: data.country_iso,
    region: data.region,
    title: data.title,
    summary: data.summary,
    severityRaw: data.severity_raw,
    drPriorityScore: data.dr_priority_score,
    matchedCampaigns: data.matched_campaigns ?? [],
    status: data.status,
    detectedAt: new Date(data.detected_at),
    reviewedByEmail: data.reviewed_by_email,
    reviewedAt: data.reviewed_at ? new Date(data.reviewed_at) : null,
    sourceUrl: data.source_url,
    rawPayload: data.raw_payload,
    draftPacketJson: data.draft_packet_json,
    draftPacketGeneratedAt: data.draft_packet_generated_at
      ? new Date(data.draft_packet_generated_at)
      : null,
    draftPacketGeneratedByEmail: data.draft_packet_generated_by_email,
    draftPacketModel: data.draft_packet_model,
    draftPacketInputTokens: data.draft_packet_input_tokens,
    draftPacketOutputTokens: data.draft_packet_output_tokens,
    appealLaunchedAt: data.appeal_launched_at
      ? new Date(data.appeal_launched_at)
      : null,
    appealLaunchedByEmail: data.appeal_launched_by_email,
  };
}

/**
 * Recent emergency events, sorted by priority score then time.
 * Empty array when the table is empty or the migration hasn't been
 * applied — caller renders an empty state.
 */
export async function getEmergencyEvents(
  options: GetEmergencyEventsOptions = {}
): Promise<EmergencyEvent[]> {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("emergency_events")
    .select(
      "id, external_id, source, event_type, country_iso, region, title, summary, severity_raw, dr_priority_score, matched_campaigns, status, detected_at, reviewed_by_email, reviewed_at, source_url"
    )
    .order("dr_priority_score", { ascending: false, nullsFirst: false })
    .order("detected_at", { ascending: false })
    .limit(options.limit ?? 50);

  if (options.status) {
    const statuses = Array.isArray(options.status)
      ? options.status
      : [options.status];
    query = query.in("status", statuses);
  }

  // Hide events DR can't action. Belt-and-braces: filter by BOTH
  //   (a) score > 0 — events that survived the severity floor + had
  //       coverage match at insert time
  //   (b) matched_campaigns non-empty — events with at least one
  //       campaign that can actually respond
  // Either alone would work in theory (the scorer returns 0 when
  // weight is 0), but pairing them protects against schema drift,
  // partial data backfills (e.g. migration 027 stripped slugs but
  // didn't recompute scores), and any future edge cases.
  if (options.onlyActionable !== false) {
    query = query
      .gt("dr_priority_score", 0)
      .not("matched_campaigns", "eq", "{}");
  }

  // Expire stale reports: only surface events detected within the window
  // (default 7 days). Keeps the live feed about *current* emergencies.
  const withinDays =
    options.withinDays === undefined ? REPORT_EXPIRY_DAYS : options.withinDays;
  if (withinDays && withinDays > 0) {
    const cutoffIso = new Date(
      Date.now() - withinDays * 24 * 60 * 60 * 1000
    ).toISOString();
    query = query.gte("detected_at", cutoffIso);
  }

  const { data, error } = await query.returns<EmergencyEventRow[]>();
  if (error) {
    console.error("[first-response] emergency_events read failed:", error);
    return [];
  }
  return (data ?? []).map(rowToEvent);
}

/**
 * The subset of `eventIds` that already have at least one (non-archived)
 * social post — i.e. the SMM has posted about them via "Mark as posted".
 * The First Response feed uses this to split alerts into "Active" (still
 * needs a post) and "Posted" (done this cycle).
 *
 * Resilient: if the provenance column doesn't exist yet (migration 037
 * unapplied), Postgres errors 42703 and we treat everything as unposted —
 * so the feed degrades to its old all-active behaviour rather than breaking.
 */
export async function getPostedEventIds(
  eventIds: string[]
): Promise<Set<string>> {
  if (eventIds.length === 0) return new Set();
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("social_posts")
    .select("event_id")
    .in("event_id", eventIds)
    .is("archived_at", null);
  if (error) {
    if ((error as { code?: string }).code !== "42703") {
      console.error("[first-response] posted-event lookup failed:", error);
    }
    return new Set();
  }
  const posted = new Set<string>();
  for (const row of data ?? []) {
    const id = (row as { event_id: string | null }).event_id;
    if (id) posted.add(id);
  }
  return posted;
}
