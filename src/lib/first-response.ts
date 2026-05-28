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

export interface GetEmergencyEventsOptions {
  status?: EmergencyEventStatus | EmergencyEventStatus[];
  limit?: number;
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
}

export async function getEmergencyEventById(
  id: string
): Promise<EmergencyEventDetail | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("emergency_events")
    .select(
      "id, external_id, source, event_type, country_iso, region, title, summary, severity_raw, dr_priority_score, matched_campaigns, status, detected_at, reviewed_by_email, reviewed_at, source_url, raw_payload, draft_packet_json, draft_packet_generated_at, draft_packet_generated_by_email, draft_packet_model, draft_packet_input_tokens, draft_packet_output_tokens"
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

  const { data, error } = await query.returns<EmergencyEventRow[]>();
  if (error) {
    console.error("[first-response] emergency_events read failed:", error);
    return [];
  }
  return (data ?? []).map(rowToEvent);
}
