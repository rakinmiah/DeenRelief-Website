/**
 * Per-post performance — types + DB helpers.
 *
 * Reads the social_post_stats view from migration 025, which pre-joins
 * short_link_clicks (by short_link_id) and donations (by
 * utm_content = short_link.slug) into per-post totals. The view excludes
 * archived posts; pass `includeArchived: true` to query the underlying
 * table directly when the SMM wants the archive view.
 *
 * Platform-native metrics (likes/views/comments) live in metrics_json
 * once Meta Graph + TikTok APIs are wired up post-Meta-verification.
 * This module surfaces the column so the dashboard can render them
 * when present, but doesn't depend on them.
 */

import { getSupabaseAdmin } from "./supabase";

export const SOCIAL_PLATFORMS = [
  "instagram",
  "tiktok",
  "facebook",
  "x",
  "threads",
  "linkedin",
  "whatsapp_channel",
  "youtube",
  "other",
] as const;

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export function isSocialPlatform(value: unknown): value is SocialPlatform {
  return (
    typeof value === "string" &&
    (SOCIAL_PLATFORMS as readonly string[]).includes(value)
  );
}

/** Display label per platform — used in headers, dropdowns, badges. */
export function platformLabel(platform: string): string {
  switch (platform) {
    case "instagram":
      return "Instagram";
    case "tiktok":
      return "TikTok";
    case "facebook":
      return "Facebook";
    case "x":
      return "X";
    case "threads":
      return "Threads";
    case "linkedin":
      return "LinkedIn";
    case "whatsapp_channel":
      return "WhatsApp Channel";
    case "youtube":
      return "YouTube";
    default:
      return platform;
  }
}

export interface SocialPostStats {
  id: string;
  platform: string;
  externalPostId: string | null;
  externalUrl: string | null;
  title: string | null;
  caption: string | null;
  shortLinkId: string | null;
  shortLinkSlug: string | null;
  campaignSlug: string | null;
  captionKeyword: string | null;
  publishedAt: Date;
  metricsJson: unknown | null;
  metricsUpdatedAt: Date | null;
  createdByEmail: string | null;
  createdAt: Date;
  clickCount: number;
  donationCount: number;
  donationTotalPence: number;
}

interface StatsRow {
  id: string;
  platform: string;
  external_post_id: string | null;
  external_url: string | null;
  title: string | null;
  caption: string | null;
  short_link_id: string | null;
  short_link_slug: string | null;
  campaign_slug: string | null;
  caption_keyword: string | null;
  published_at: string;
  metrics_json: unknown | null;
  metrics_updated_at: string | null;
  created_by_email: string | null;
  created_at: string;
  click_count: number;
  donation_count: number;
  donation_total_pence: number;
}

function rowToStats(row: StatsRow): SocialPostStats {
  return {
    id: row.id,
    platform: row.platform,
    externalPostId: row.external_post_id,
    externalUrl: row.external_url,
    title: row.title,
    caption: row.caption,
    shortLinkId: row.short_link_id,
    shortLinkSlug: row.short_link_slug,
    campaignSlug: row.campaign_slug,
    captionKeyword: row.caption_keyword,
    publishedAt: new Date(row.published_at),
    metricsJson: row.metrics_json,
    metricsUpdatedAt: row.metrics_updated_at
      ? new Date(row.metrics_updated_at)
      : null,
    createdByEmail: row.created_by_email,
    createdAt: new Date(row.created_at),
    clickCount: row.click_count,
    donationCount: row.donation_count,
    donationTotalPence: row.donation_total_pence,
  };
}

export interface GetPostStatsOptions {
  platform?: SocialPlatform;
  campaignSlug?: string;
  limit?: number;
}

/**
 * Most recent posts with per-post stats. Default sort is published_at
 * desc; filter by platform or campaign as needed.
 */
export async function getPostStats(
  options: GetPostStatsOptions = {}
): Promise<SocialPostStats[]> {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("social_post_stats")
    .select(
      "id, platform, external_post_id, external_url, title, caption, short_link_id, short_link_slug, campaign_slug, caption_keyword, published_at, metrics_json, metrics_updated_at, created_by_email, created_at, click_count, donation_count, donation_total_pence"
    )
    .order("published_at", { ascending: false })
    .limit(options.limit ?? 200);

  if (options.platform) {
    query = query.eq("platform", options.platform);
  }
  if (options.campaignSlug) {
    query = query.eq("campaign_slug", options.campaignSlug);
  }

  const { data, error } = await query.returns<StatsRow[]>();
  if (error) {
    console.error("[social-performance] stats read failed:", error);
    return [];
  }
  return (data ?? []).map(rowToStats);
}

export interface AggregateTotals {
  postCount: number;
  totalClicks: number;
  totalDonations: number;
  totalRaisedPence: number;
  conversionRate: number; // donations / clicks (0–1)
}

/** Total clicks + donations + £ across the supplied posts. */
export function aggregateTotals(posts: SocialPostStats[]): AggregateTotals {
  const totalClicks = posts.reduce((s, p) => s + p.clickCount, 0);
  const totalDonations = posts.reduce((s, p) => s + p.donationCount, 0);
  const totalRaisedPence = posts.reduce(
    (s, p) => s + p.donationTotalPence,
    0
  );
  return {
    postCount: posts.length,
    totalClicks,
    totalDonations,
    totalRaisedPence,
    conversionRate: totalClicks > 0 ? totalDonations / totalClicks : 0,
  };
}

/** Aggregate stats grouped by an arbitrary key extractor. */
export function aggregateBy<K extends string>(
  posts: SocialPostStats[],
  key: (post: SocialPostStats) => K
): Map<K, AggregateTotals> {
  const groups = new Map<K, SocialPostStats[]>();
  for (const post of posts) {
    const k = key(post);
    const list = groups.get(k);
    if (list) list.push(post);
    else groups.set(k, [post]);
  }
  const result = new Map<K, AggregateTotals>();
  for (const [k, list] of groups) {
    result.set(k, aggregateTotals(list));
  }
  return result;
}

/** Format pence as a GBP string (£12,345.67). */
export function formatGbp(pence: number): string {
  const pounds = pence / 100;
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: pounds >= 100 ? 0 : 2,
  }).format(pounds);
}
