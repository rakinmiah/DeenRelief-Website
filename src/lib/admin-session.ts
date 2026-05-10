import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAdminSession, type AdminSessionPayload } from "./signed-token";

/**
 * Server-side admin session helpers.
 *
 * Pattern: each /admin/* page (server component) calls one of these at
 * the top of its render function. Public pages (e.g. /admin/login) skip
 * the call. Pages that gate themselves get a verified session object;
 * un-gated requests are 302-redirected to /admin/login before any
 * sensitive data is fetched.
 *
 * Why per-page instead of a single layout-level gate: layouts in
 * Next.js apply to every child route under their tree. The login page
 * lives at /admin/login (under the /admin/layout), so a blanket layout
 * gate would either need pathname detection (awkward in server
 * layouts) or a route-group restructure. Per-page calls are explicit
 * and trivial to reason about.
 *
 * Production swap path (when Supabase Auth replaces the cookie+passphrase
 * scheme): change the body of these helpers to read
 * `supabase.auth.getUser()` and check the user against an `admin_users`
 * allow-list table. Page-level call sites don't change.
 */

const COOKIE_NAME = "dr_admin_session";

/**
 * Read + verify the current admin session. Returns the payload or null.
 * No redirect — for pages that want to render different UI based on
 * sign-in state without forcing a redirect.
 */
export async function getAdminSession(): Promise<AdminSessionPayload | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(COOKIE_NAME)?.value;
  if (!value) return null;
  return verifyAdminSession(value);
}

/**
 * Require an admin session. Redirects to /admin/login if missing or
 * invalid (expired, tampered, malformed). Returns the verified payload
 * — guaranteed non-null on the success branch.
 *
 * Call this at the top of every protected page's server component.
 */
export async function requireAdminSession(): Promise<AdminSessionPayload> {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return session;
}
