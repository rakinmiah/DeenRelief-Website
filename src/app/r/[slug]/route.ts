/**
 * GET /r/[slug] — short link redirect handler.
 *
 * Looks up the slug in the short_links table, builds the destination
 * URL with UTMs baked in (see buildDestinationUrl), and 302s the
 * donor there. The click is logged via Next.js after() so the
 * redirect response goes out immediately — donor latency is the
 * single DB read for the lookup (typically <30ms), then the browser
 * navigates to the destination page.
 *
 * Graceful failure modes:
 *   - Invalid slug (bad chars, too long, reserved) → 302 to homepage
 *     with utm_campaign=missing so the SMM can spot it in analytics.
 *   - Unknown slug → same as invalid.
 *   - Archived slug → same. Old in-the-wild URLs degrade gracefully
 *     rather than breaking the donor journey.
 *
 * We deliberately do NOT 404 — every /r/ URL the donor types resolves
 * to a real Deen Relief page. The fallback target tracks the broken
 * hits in analytics so the SMM can fix any stale Story stickers /
 * printed flyers without donors ever seeing an error page.
 */

import { NextResponse, after } from "next/server";
import { buildDestinationUrl, normalizeSlug } from "@/lib/short-links";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface ShortLinkLookup {
  id: string;
  slug: string;
  destination_url: string;
  campaign_slug: string | null;
  platform: string | null;
  archived_at: string | null;
}

function getClientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? null;
}

function fallbackUrl(requestUrl: string, reason: "missing" | "archived"): URL {
  const url = new URL("/", requestUrl);
  url.searchParams.set("utm_source", "short_link");
  url.searchParams.set("utm_medium", "short_link");
  url.searchParams.set("utm_campaign", reason);
  return url;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug: rawSlug } = await params;
  const slug = normalizeSlug(rawSlug);

  // Invalid slug: someone typed /r/'; or /r/Q with caps that we
  // already lowercase but the lower-cased form still violates the
  // regex (e.g. starts with a hyphen). Either way: send to homepage
  // tagged as a missing-link click for analytics visibility.
  if (!slug) {
    return NextResponse.redirect(fallbackUrl(request.url, "missing"), 302);
  }

  const supabase = getSupabaseAdmin();
  const { data: link, error } = await supabase
    .from("short_links")
    .select("id, slug, destination_url, campaign_slug, platform, archived_at")
    .ilike("slug", slug)
    .maybeSingle<ShortLinkLookup>();

  if (error) {
    console.error("[/r] short link lookup error:", error);
    return NextResponse.redirect(fallbackUrl(request.url, "missing"), 302);
  }

  if (!link) {
    return NextResponse.redirect(fallbackUrl(request.url, "missing"), 302);
  }

  if (link.archived_at) {
    return NextResponse.redirect(fallbackUrl(request.url, "archived"), 302);
  }

  const destination = buildDestinationUrl(link, request.url);

  // Log the click in the background so the redirect response goes out
  // immediately. after() runs the callback after the response has
  // been sent to the client — perfect for telemetry that must not
  // delay the redirect.
  const clickPayload = {
    short_link_id: link.id,
    ip_address: getClientIp(request),
    user_agent: request.headers.get("user-agent")?.slice(0, 500) ?? null,
    referrer: request.headers.get("referer")?.slice(0, 500) ?? null,
    country_iso: request.headers.get("x-vercel-ip-country") ?? null,
  };

  after(async () => {
    try {
      const { error: insertErr } = await supabase
        .from("short_link_clicks")
        .insert(clickPayload);
      if (insertErr) {
        console.error("[/r] click log failed:", insertErr);
      }
    } catch (err) {
      console.error("[/r] click log threw:", err);
    }
  });

  return NextResponse.redirect(destination, 302);
}
