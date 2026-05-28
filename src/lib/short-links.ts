/**
 * Short links library — slug validation, destination URL building,
 * and DB query helpers for the /r/[slug] redirect system.
 *
 * Used by:
 *   - src/app/r/[slug]/route.ts        — the redirect handler
 *   - src/app/admin/social/links/*     — SMM-facing admin UI
 *   - Future: per-post performance dashboard (Phase 5)
 *
 * Design choices:
 *   - Slugs are case-insensitive, validated to lowercase ASCII +
 *     digits + hyphens. We allow single-letter slugs (e.g. /r/q for
 *     Qurbani) because voice-readable URLs work better in TikTok/
 *     Reels voiceovers than long descriptive ones.
 *   - The destination_url is stored as a relative path (e.g.
 *     "/qurbani") in the common case and resolved against the
 *     request origin at redirect time. Absolute URLs are also
 *     accepted for cross-domain destinations (e.g. blog/news links).
 *   - UTM parameters are appended at redirect time, never stored on
 *     the destination_url itself — keeps the row clean and lets us
 *     evolve the UTM strategy without rewriting historical data.
 */

import { CAMPAIGNS, type CampaignSlug } from "./campaigns";

/**
 * The fixed set of platforms a short link can be tagged with. Drives
 * the utm_source value and the per-platform performance breakdown in
 * the dashboard. Free-text in the DB column so we can add new entries
 * here without a migration, but the UI selects from this list.
 */
export const SHORT_LINK_PLATFORMS = [
  "instagram",
  "tiktok",
  "facebook",
  "x",
  "threads",
  "linkedin",
  "whatsapp_channel",
  "email",
  "voice", // spoken URL in podcasts / Reels voiceovers
  "qr",    // QR codes on posters, flyers, leaflets
  "other",
] as const;

export type ShortLinkPlatform = (typeof SHORT_LINK_PLATFORMS)[number];

export function isShortLinkPlatform(value: unknown): value is ShortLinkPlatform {
  return typeof value === "string" && (SHORT_LINK_PLATFORMS as readonly string[]).includes(value);
}

/**
 * Canonical campaign → landing path mapping. Used by the link create
 * form's destination dropdown so the SMM picks from real campaign
 * pages rather than typing URLs by hand. All entries in this map
 * correspond to existing routes — keep in sync if /donate or any
 * campaign page is renamed.
 */
export const CAMPAIGN_LANDING_PATHS: Record<CampaignSlug, string> = {
  palestine: "/palestine",
  "cancer-care": "/cancer-care",
  "orphan-sponsorship": "/orphan-sponsorship",
  "build-a-school": "/build-a-school",
  "clean-water": "/clean-water",
  "uk-homeless": "/uk-homeless",
  zakat: "/zakat",
  sadaqah: "/sadaqah",
  qurbani: "/qurbani",
  general: "/donate",
};

/** All campaign options as [path, label] pairs for the destination dropdown. */
export function getCampaignDestinationOptions(): { path: string; label: string }[] {
  return (Object.keys(CAMPAIGN_LANDING_PATHS) as CampaignSlug[]).map((slug) => ({
    path: CAMPAIGN_LANDING_PATHS[slug],
    label: CAMPAIGNS[slug],
  }));
}

// ─── Slug validation ─────────────────────────────────────────────────────

/**
 * Slugs are lowercase ASCII letters + digits + hyphens, 1–50 chars,
 * cannot start or end with a hyphen. Empty hyphens between alphanums
 * are fine ("orphans-tiktok-may25").
 */
const SLUG_REGEX = /^[a-z0-9](?:[a-z0-9-]{0,48}[a-z0-9])?$/;

/**
 * Slugs that would collide with Next.js route conventions or other
 * critical paths. Defensive: the redirect route is mounted at /r/
 * so these collisions can't actually happen at the URL level, but
 * blocking them at create time prevents future confusion if the
 * routing surface ever changes.
 */
const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "auth",
  "donate",
  "now",
  "r",
  "robots",
  "sitemap",
]);

export function isValidSlug(slug: string): boolean {
  if (!slug || slug.length > 50) return false;
  if (RESERVED_SLUGS.has(slug)) return false;
  return SLUG_REGEX.test(slug);
}

/**
 * Lowercase + trim + validate. Returns the cleaned slug or null if
 * invalid. The redirect handler uses this to reject malformed paths
 * before hitting the DB.
 */
export function normalizeSlug(input: string): string | null {
  const trimmed = input.trim().toLowerCase();
  return isValidSlug(trimmed) ? trimmed : null;
}

/** Returns a human-readable validation error for the slug, or null if valid. */
export function describeSlugError(input: string): string | null {
  if (!input) return "Slug is required.";
  if (input.length > 50) return "Slug must be 50 characters or fewer.";
  if (input !== input.toLowerCase()) return "Slug must be lowercase.";
  if (RESERVED_SLUGS.has(input)) return `"${input}" is reserved.`;
  if (!SLUG_REGEX.test(input)) {
    return "Use lowercase letters, numbers, and hyphens. No spaces. Cannot start or end with a hyphen.";
  }
  return null;
}

// ─── Destination URL construction ───────────────────────────────────────

interface ShortLinkRow {
  destination_url: string;
  slug: string;
  campaign_slug: string | null;
  platform: string | null;
}

/**
 * Build the redirect target URL for a short link click.
 *
 * The destination is resolved against the request origin so a stored
 * relative path like "/qurbani" becomes the absolute "https://
 * deenrelief.org/qurbani" we return to the browser.
 *
 * UTM params are added only when missing from the destination — that
 * way a destination URL that already carries UTMs (e.g. a campaign
 * page deep link with a specific tracking tag) is respected.
 *
 *   utm_source   ← link.platform || 'short_link'
 *   utm_medium   ← link.platform ? 'social' : 'short_link'
 *   utm_campaign ← link.campaign_slug || link.slug
 *   utm_content  ← link.slug                (per-link attribution)
 *
 * Malformed destination URLs fall back to the homepage so a broken
 * link never breaks the donor journey.
 */
export function buildDestinationUrl(
  link: ShortLinkRow,
  requestUrl: string
): URL {
  let dest: URL;
  try {
    dest = new URL(link.destination_url, requestUrl);
  } catch {
    dest = new URL("/", requestUrl);
  }

  const params = dest.searchParams;
  const utmSource = link.platform || "short_link";
  const utmMedium = link.platform ? "social" : "short_link";
  const utmCampaign = link.campaign_slug || link.slug;

  if (!params.has("utm_source")) params.set("utm_source", utmSource);
  if (!params.has("utm_medium")) params.set("utm_medium", utmMedium);
  if (!params.has("utm_campaign")) params.set("utm_campaign", utmCampaign);
  if (!params.has("utm_content")) params.set("utm_content", link.slug);

  return dest;
}

/**
 * Build the public short URL for a given slug, used in admin UI
 * for "copy this URL" actions. Reads NEXT_PUBLIC_SITE_URL (set in
 * env) — falls back to a sensible default at build time.
 */
export function buildShortLinkUrl(slug: string): string {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "https://deenrelief.org";
  return `${base}/r/${slug}`;
}
