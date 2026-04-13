import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SITE_PASSWORD = process.env.SITE_PASSWORD;

export function middleware(request: NextRequest) {
  // If no password is set, allow all traffic (production mode)
  if (!SITE_PASSWORD) return NextResponse.next();

  // Skip password gate for API routes, static files, and the auth endpoint
  if (
    request.nextUrl.pathname.startsWith("/api/") ||
    request.nextUrl.pathname.startsWith("/_next/") ||
    request.nextUrl.pathname.startsWith("/images/") ||
    request.nextUrl.pathname === "/auth" ||
    request.nextUrl.pathname === "/favicon.ico" ||
    request.nextUrl.pathname === "/icon.png" ||
    request.nextUrl.pathname === "/apple-icon.png" ||
    request.nextUrl.pathname === "/robots.txt" ||
    request.nextUrl.pathname === "/sitemap.xml"
  ) {
    return NextResponse.next();
  }

  // Check for auth cookie
  const authCookie = request.cookies.get("site-auth")?.value;
  if (authCookie === SITE_PASSWORD) {
    return NextResponse.next();
  }

  // Redirect to auth page
  const authUrl = new URL("/auth", request.url);
  authUrl.searchParams.set("redirect", request.nextUrl.pathname);
  return NextResponse.rewrite(authUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
