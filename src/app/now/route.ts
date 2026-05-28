/**
 * GET /now — the SMM's "spotlight" bio link.
 *
 * Looks up the currently-active spotlight (most recent unexpired
 * uncleared row in now_spotlights) and 302s to its destination path
 * with UTM params baked in for attribution.
 *
 * Falls back gracefully to the homepage when:
 *   - No spotlight has ever been set.
 *   - The most recent spotlight has expired (auto-reset — no cron
 *     needed; expiry is purely query-time).
 *   - The SMM hit "Reset to homepage" (cleared_at is set).
 *   - The DB lookup errors (defensive — donor still lands somewhere).
 *
 * Designed to be the SMM's single, never-changing Instagram/TikTok
 * bio URL. The destination updates as she changes the spotlight in
 * /admin/social/spotlight, but the URL she puts in the bio is always
 * deenrelief.org/now.
 *
 * Attribution model:
 *   utm_source   = 'now'
 *   utm_medium   = 'bio_link'
 *   utm_campaign = active spotlight's campaign_slug (or 'homepage' when
 *                  no spotlight is active — so the SMM can see in GA4
 *                  how much of her bio-link traffic landed cold)
 *   utm_content  = the spotlight row id (per-spotlight attribution)
 *
 * Existing UTM params on the destination path are preserved.
 */

import { NextResponse } from "next/server";
import { getActiveSpotlight } from "@/lib/now-spotlight";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function withUtm(
  dest: URL,
  utm: { source: string; medium: string; campaign: string; content?: string }
): URL {
  if (!dest.searchParams.has("utm_source")) {
    dest.searchParams.set("utm_source", utm.source);
  }
  if (!dest.searchParams.has("utm_medium")) {
    dest.searchParams.set("utm_medium", utm.medium);
  }
  if (!dest.searchParams.has("utm_campaign")) {
    dest.searchParams.set("utm_campaign", utm.campaign);
  }
  if (utm.content && !dest.searchParams.has("utm_content")) {
    dest.searchParams.set("utm_content", utm.content);
  }
  return dest;
}

export async function GET(request: Request) {
  const requestUrl = request.url;
  let active: Awaited<ReturnType<typeof getActiveSpotlight>> = null;
  try {
    active = await getActiveSpotlight();
  } catch (err) {
    console.error("[/now] active spotlight lookup threw:", err);
    // Fall through to homepage fallback.
  }

  if (active) {
    let dest: URL;
    try {
      dest = new URL(active.destinationPath, requestUrl);
    } catch {
      // Malformed destination_path — fall back to homepage rather than
      // breaking the donor journey.
      dest = new URL("/", requestUrl);
    }
    return NextResponse.redirect(
      withUtm(dest, {
        source: "now",
        medium: "bio_link",
        campaign: active.campaignSlug,
        content: active.id,
      }),
      302
    );
  }

  // No active spotlight — homepage with 'homepage' utm_campaign so the
  // SMM can see in GA4 how often her bio link lands cold (vs spotlighted).
  return NextResponse.redirect(
    withUtm(new URL("/", requestUrl), {
      source: "now",
      medium: "bio_link",
      campaign: "homepage",
    }),
    302
  );
}
