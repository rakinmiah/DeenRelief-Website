import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { updateSponsorSession } from "@/lib/supabase-middleware";

const SITE_PASSWORD = process.env.SITE_PASSWORD;

/**
 * Two responsibilities, in order:
 *
 *   1. SITE_PASSWORD gate (preview protection). When set, every page
 *      request must carry the matching `site-auth` cookie or it's
 *      rewritten to /auth. Must still cover /sponsor/* in preview.
 *
 *   2. Sponsor session refresh. For /sponsor/* + /api/sponsor/* requests
 *      (only — everything else early-returns), refresh the Supabase auth
 *      cookie so signed-in sponsors stay signed in across server renders.
 *      Separate from the admin `dr_admin_session` cookie, which this
 *      middleware never touches.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── 1. SITE_PASSWORD preview gate ──
  if (SITE_PASSWORD) {
    const exempt =
      pathname.startsWith("/api/") ||
      pathname.startsWith("/_next/") ||
      pathname.startsWith("/images/") ||
      pathname === "/auth" ||
      pathname === "/favicon.ico" ||
      pathname === "/icon.png" ||
      pathname === "/apple-icon.png" ||
      pathname === "/robots.txt" ||
      pathname === "/sitemap.xml";

    if (!exempt) {
      const authCookie = request.cookies.get("site-auth")?.value;
      if (authCookie !== SITE_PASSWORD) {
        const authUrl = new URL("/auth", request.url);
        authUrl.searchParams.set("redirect", pathname);
        return NextResponse.rewrite(authUrl);
      }
    }
  }

  // ── 2. Sponsor session refresh (scoped to the portal) ──
  // Skip /sponsor/auth/* — the callback route establishes the session itself
  // and must own its Set-Cookie response without the refresh helper racing it.
  if (
    (pathname.startsWith("/sponsor") || pathname.startsWith("/api/sponsor")) &&
    !pathname.startsWith("/sponsor/auth")
  ) {
    return updateSponsorSession(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
