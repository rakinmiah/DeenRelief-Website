/**
 * /now spotlight helpers.
 *
 * The "spotlight" is a timed pointer that decides where
 * deenrelief.org/now redirects. SMM clicks "Spotlight on /now" on a
 * campaign tile → new row in now_spotlights with expires_at default
 * 3 days from now (configurable 1–30) → /now picks it up
 * automatically → 3 days later it expires and /now silently returns
 * to the homepage.
 *
 * Why timed-row rather than a single "current spotlight" KV: clean
 * audit history, no race condition between concurrent setters, easy
 * to "Reset to homepage" by soft-clearing the active row, easy to
 * extend by inserting a new row with later expiry.
 */

import { CAMPAIGNS, type CampaignSlug, isValidCampaign } from "./campaigns";
import { CAMPAIGN_LANDING_PATHS } from "./short-links";
import { getSupabaseAdmin } from "./supabase";

/** Minimum + maximum spotlight duration in days. */
export const SPOTLIGHT_MIN_DAYS = 1;
export const SPOTLIGHT_MAX_DAYS = 30;
export const SPOTLIGHT_DEFAULT_DAYS = 3;

export interface ActiveSpotlight {
  id: string;
  campaignSlug: CampaignSlug;
  campaignLabel: string;
  destinationPath: string;
  spotlightedByEmail: string | null;
  spotlightedAt: Date;
  expiresAt: Date;
  /** Milliseconds remaining until expires_at. Negative if already expired. */
  msRemaining: number;
}

interface SpotlightRow {
  id: string;
  campaign_slug: string;
  destination_path: string;
  spotlighted_by_email: string | null;
  spotlighted_at: string;
  expires_at: string;
  social_post_id: string | null;
  cleared_at: string | null;
}

/**
 * Get the currently active spotlight (most recent unexpired uncleared
 * row). Returns null when nothing is currently spotlighted — /now
 * falls back to the homepage in that case.
 */
export async function getActiveSpotlight(): Promise<ActiveSpotlight | null> {
  const supabase = getSupabaseAdmin();
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("now_spotlights")
    .select(
      "id, campaign_slug, destination_path, spotlighted_by_email, spotlighted_at, expires_at, social_post_id, cleared_at"
    )
    .is("cleared_at", null)
    .gt("expires_at", nowIso)
    .order("spotlighted_at", { ascending: false })
    .limit(1)
    .maybeSingle<SpotlightRow>();

  if (error) {
    console.error("[now-spotlight] active read failed:", error);
    return null;
  }
  if (!data) return null;

  const campaignSlug = isValidCampaign(data.campaign_slug)
    ? (data.campaign_slug as CampaignSlug)
    : null;
  // Unknown campaign in the DB → treat as no active spotlight rather
  // than break the redirect. Shouldn't happen but defensive.
  if (!campaignSlug) return null;

  const spotlightedAt = new Date(data.spotlighted_at);
  const expiresAt = new Date(data.expires_at);
  return {
    id: data.id,
    campaignSlug,
    campaignLabel: CAMPAIGNS[campaignSlug],
    destinationPath: data.destination_path,
    spotlightedByEmail: data.spotlighted_by_email,
    spotlightedAt,
    expiresAt,
    msRemaining: expiresAt.getTime() - Date.now(),
  };
}

export interface SpotlightHistoryEntry {
  id: string;
  campaignSlug: string;
  campaignLabel: string;
  spotlightedByEmail: string | null;
  spotlightedAt: Date;
  expiresAt: Date;
  clearedAt: Date | null;
  /** Why it's no longer active: 'expired' | 'manual_reset' | 'superseded'. */
  endedReason: "expired" | "manual_reset" | "superseded" | "active";
  /** social_posts.id this spotlight was launched from (Phase 1f linkage). */
  socialPostId: string | null;
  /** Post title for the history view, joined when socialPostId is set. */
  socialPostTitle: string | null;
}

/**
 * Most recent N spotlights for the history view. Includes the
 * currently-active one at the top if any.
 *
 * Joins social_posts via the FK from migration 025 so the history can
 * display which post triggered each spotlight (Phase 1f).
 */
export async function getSpotlightHistory(
  limit = 10
): Promise<SpotlightHistoryEntry[]> {
  const supabase = getSupabaseAdmin();
  // The "social_post:social_posts(title)" syntax is the PostgREST embed
  // form — pulls the related row through the FK and flattens it via the
  // returns<> cast below.
  const { data, error } = await supabase
    .from("now_spotlights")
    .select(
      "id, campaign_slug, spotlighted_by_email, spotlighted_at, expires_at, cleared_at, cleared_reason, social_post_id, social_post:social_posts(title)"
    )
    .order("spotlighted_at", { ascending: false })
    .limit(limit)
    .returns<
      Array<
        Pick<
          SpotlightRow,
          "id" | "campaign_slug" | "spotlighted_by_email" | "spotlighted_at" | "expires_at" | "cleared_at" | "social_post_id"
        > & {
          cleared_reason: string | null;
          social_post: { title: string | null } | null;
        }
      >
    >();

  if (error) {
    console.error("[now-spotlight] history read failed:", error);
    return [];
  }

  const now = Date.now();
  return (data ?? []).map((row) => {
    const expiresAt = new Date(row.expires_at);
    const clearedAt = row.cleared_at ? new Date(row.cleared_at) : null;
    let endedReason: SpotlightHistoryEntry["endedReason"];
    if (clearedAt) {
      endedReason =
        row.cleared_reason === "superseded" ? "superseded" : "manual_reset";
    } else if (expiresAt.getTime() < now) {
      endedReason = "expired";
    } else {
      endedReason = "active";
    }
    const label = isValidCampaign(row.campaign_slug)
      ? CAMPAIGNS[row.campaign_slug as CampaignSlug]
      : row.campaign_slug;
    return {
      id: row.id,
      campaignSlug: row.campaign_slug,
      campaignLabel: label,
      spotlightedByEmail: row.spotlighted_by_email,
      spotlightedAt: new Date(row.spotlighted_at),
      expiresAt,
      clearedAt,
      endedReason,
      socialPostId: row.social_post_id,
      socialPostTitle: row.social_post?.title ?? null,
    };
  });
}

/**
 * Per-post spotlight status — surfaces "did this post trigger any
 * spotlights, and is one of them currently live?" on the performance
 * dashboard (Phase 1f).
 *
 * status:
 *   'active'   — at least one spotlight from this post is currently live
 *   'ended'    — past spotlights exist but none are active
 *   'none'     — no spotlight has ever been launched from this post
 *
 * Latest fields refer to the most recent spotlight (active first, else
 * most recently ended). Used to render the "Active 2d 4h" pill etc.
 */
export interface PostSpotlightSummary {
  status: "active" | "ended" | "none";
  totalCount: number;
  latestId: string | null;
  latestStartedAt: Date | null;
  latestExpiresAt: Date | null;
  latestEndedReason: "expired" | "manual_reset" | "superseded" | "active" | null;
}

const EMPTY_POST_SPOTLIGHT_SUMMARY: PostSpotlightSummary = {
  status: "none",
  totalCount: 0,
  latestId: null,
  latestStartedAt: null,
  latestExpiresAt: null,
  latestEndedReason: null,
};

/**
 * Bulk lookup of spotlight status per post id. Returns a Map keyed by
 * social_post_id so the performance dashboard can render one column
 * across the whole posts table from a single DB read. Posts with no
 * spotlights are simply absent from the map — callers should fall back
 * to EMPTY_POST_SPOTLIGHT_SUMMARY (exported helper below).
 */
export async function getSpotlightSummaryByPostIds(
  postIds: string[]
): Promise<Map<string, PostSpotlightSummary>> {
  if (postIds.length === 0) return new Map();
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("now_spotlights")
    .select(
      "id, social_post_id, spotlighted_at, expires_at, cleared_at, cleared_reason"
    )
    .in("social_post_id", postIds)
    .order("spotlighted_at", { ascending: false })
    .returns<
      Array<{
        id: string;
        social_post_id: string;
        spotlighted_at: string;
        expires_at: string;
        cleared_at: string | null;
        cleared_reason: string | null;
      }>
    >();

  if (error) {
    console.error("[now-spotlight] summary-by-posts read failed:", error);
    return new Map();
  }

  const now = Date.now();
  // Group rows by post id; rows are already sorted spotlighted_at desc.
  const grouped = new Map<string, typeof data>();
  for (const row of data ?? []) {
    const list = grouped.get(row.social_post_id);
    if (list) list.push(row);
    else grouped.set(row.social_post_id, [row]);
  }

  const result = new Map<string, PostSpotlightSummary>();
  for (const [postId, rows] of grouped) {
    if (!rows || rows.length === 0) continue;
    // Find the currently-active row if any; otherwise the most recent.
    const active = rows.find(
      (r) => !r.cleared_at && new Date(r.expires_at).getTime() > now
    );
    const latest = active ?? rows[0];
    if (!latest) continue;

    const expiresAt = new Date(latest.expires_at);
    const clearedAt = latest.cleared_at ? new Date(latest.cleared_at) : null;
    let endedReason: PostSpotlightSummary["latestEndedReason"];
    if (clearedAt) {
      endedReason =
        latest.cleared_reason === "superseded" ? "superseded" : "manual_reset";
    } else if (expiresAt.getTime() < now) {
      endedReason = "expired";
    } else {
      endedReason = "active";
    }

    result.set(postId, {
      status: active ? "active" : "ended",
      totalCount: rows.length,
      latestId: latest.id,
      latestStartedAt: new Date(latest.spotlighted_at),
      latestExpiresAt: expiresAt,
      latestEndedReason: endedReason,
    });
  }
  return result;
}

/** Convenience for callers that need a default when a post isn't in the map. */
export function emptyPostSpotlightSummary(): PostSpotlightSummary {
  return EMPTY_POST_SPOTLIGHT_SUMMARY;
}

export interface CreateSpotlightInput {
  campaignSlug: CampaignSlug;
  /** Optional override of the destination path; defaults to the canonical campaign landing path. */
  destinationPath?: string;
  /** Duration in days. 1–30, default 3. */
  durationDays?: number;
  /** Optional forward-reference to a social_posts row. */
  socialPostId?: string;
  byEmail: string | null;
}

/**
 * Create a new spotlight. Implicitly supersedes any existing active
 * spotlight — both rows are kept for history, but the most recent one
 * is what /now uses.
 */
export async function createSpotlight(
  input: CreateSpotlightInput
): Promise<{ ok: true; expiresAt: Date } | { ok: false; error: string }> {
  if (!isValidCampaign(input.campaignSlug)) {
    return { ok: false, error: "Unknown campaign." };
  }
  const durationDays =
    input.durationDays === undefined
      ? SPOTLIGHT_DEFAULT_DAYS
      : Math.round(input.durationDays);
  if (durationDays < SPOTLIGHT_MIN_DAYS || durationDays > SPOTLIGHT_MAX_DAYS) {
    return {
      ok: false,
      error: `Duration must be between ${SPOTLIGHT_MIN_DAYS} and ${SPOTLIGHT_MAX_DAYS} days.`,
    };
  }

  const destinationPath =
    input.destinationPath ?? CAMPAIGN_LANDING_PATHS[input.campaignSlug];
  if (!destinationPath?.startsWith("/")) {
    return {
      ok: false,
      error: "Destination must be a relative path starting with /.",
    };
  }

  const supabase = getSupabaseAdmin();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

  // Mark any existing active spotlight as superseded — keeps history
  // clean by giving us an explicit "this row was replaced" reason.
  await supabase
    .from("now_spotlights")
    .update({
      cleared_at: now.toISOString(),
      cleared_reason: "superseded",
    })
    .is("cleared_at", null)
    .gt("expires_at", now.toISOString());

  const { error } = await supabase.from("now_spotlights").insert({
    campaign_slug: input.campaignSlug,
    destination_path: destinationPath,
    spotlighted_by_email: input.byEmail,
    spotlighted_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
    social_post_id: input.socialPostId ?? null,
  });

  if (error) {
    console.error("[now-spotlight] insert failed:", error);
    return { ok: false, error: "Could not set the spotlight." };
  }
  return { ok: true, expiresAt };
}

/**
 * Extend the currently-active spotlight by N more days from NOW (not
 * from the existing expires_at — extending an almost-expired spotlight
 * shouldn't give it only a few extra minutes). Re-uses the same row;
 * no superseding.
 */
export async function extendActiveSpotlight(
  durationDays: number,
  byEmail: string | null
): Promise<{ ok: true; expiresAt: Date } | { ok: false; error: string }> {
  if (
    durationDays < SPOTLIGHT_MIN_DAYS ||
    durationDays > SPOTLIGHT_MAX_DAYS
  ) {
    return {
      ok: false,
      error: `Duration must be between ${SPOTLIGHT_MIN_DAYS} and ${SPOTLIGHT_MAX_DAYS} days.`,
    };
  }
  const active = await getActiveSpotlight();
  if (!active) {
    return { ok: false, error: "No active spotlight to extend." };
  }
  const newExpiry = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("now_spotlights")
    .update({
      expires_at: newExpiry.toISOString(),
      spotlighted_by_email: byEmail ?? active.spotlightedByEmail,
    })
    .eq("id", active.id);
  if (error) {
    console.error("[now-spotlight] extend failed:", error);
    return { ok: false, error: "Could not extend the spotlight." };
  }
  return { ok: true, expiresAt: newExpiry };
}

/**
 * Reset to homepage — soft-clears the currently-active spotlight.
 * /now reverts to the homepage immediately on the next request.
 */
export async function clearActiveSpotlight(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const active = await getActiveSpotlight();
  if (!active) return { ok: true }; // already homepage
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("now_spotlights")
    .update({
      cleared_at: new Date().toISOString(),
      cleared_reason: "manual_reset",
    })
    .eq("id", active.id);
  if (error) {
    console.error("[now-spotlight] clear failed:", error);
    return { ok: false, error: "Could not reset the spotlight." };
  }
  return { ok: true };
}

/**
 * Friendly "2 days, 4 hours" style remaining-time renderer for the admin
 * dashboard. Falls through to "Expired" / "Just expired" for edge cases.
 */
export function formatTimeRemaining(msRemaining: number): string {
  if (msRemaining <= 0) return "Expired";
  const secs = Math.floor(msRemaining / 1000);
  const days = Math.floor(secs / 86_400);
  const hours = Math.floor((secs % 86_400) / 3_600);
  const mins = Math.floor((secs % 3_600) / 60);
  if (days > 0) {
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  }
  if (hours > 0) {
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  return `${Math.max(mins, 1)}m`;
}
