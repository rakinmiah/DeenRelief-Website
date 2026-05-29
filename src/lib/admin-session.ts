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
 * Require an admin session — ANY role. Redirects to /admin/login if
 * missing or invalid (expired, tampered, malformed). Returns the
 * verified payload — guaranteed non-null on the success branch.
 *
 * Call this at the top of pages accessible to BOTH 'admin' and
 * 'social' roles (e.g. the new social tools section).
 */
export async function requireAdminSession(): Promise<AdminSessionPayload> {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return session;
}

/**
 * Require an admin-role session. Redirects to /admin/login on missing
 * session, and to /admin/social (the social-role landing page) when the
 * session belongs to a 'social' user — they're already authenticated,
 * just not authorised for this page, so the redirect should land them
 * somewhere useful rather than back at login.
 *
 * Call this at the top of every page that exposes donor PII, financial
 * data, bazaar orders, or any other admin-restricted surface — i.e.
 * everything currently in /admin/* except the future /admin/social/*.
 */
export async function requireRoleAdmin(): Promise<AdminSessionPayload> {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (session.role !== "admin") {
    // Authenticated but not authorised — land them on a page they can
    // actually use rather than bouncing back to login.
    redirect(landingForNonAdmin(session.role));
  }
  return session;
}

/**
 * Where to send an authenticated-but-not-admin user who lands on an
 * admin-only page: their own section, not back to login.
 */
function landingForNonAdmin(role: AdminSessionPayload["role"]): string {
  if (role === "writer") return "/admin/blog";
  if (role === "sponsorship") return "/admin/sponsorship";
  return "/admin/social";
}

/**
 * Require a session that can access the blog CMS — 'admin' OR 'writer'.
 * Redirects to /admin/login when unauthenticated, and to /admin/social
 * when a 'social' user (who has no blog access) lands here.
 *
 * Call this at the top of every /admin/blog/* page. Admin-only actions
 * within the CMS (publishing, managing writers) call requireRoleAdmin()
 * on top of this for the stricter check.
 */
export async function requireBlogAccess(): Promise<AdminSessionPayload> {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (session.role !== "admin" && session.role !== "writer") {
    redirect(landingForNonAdmin(session.role));
  }
  return session;
}

/**
 * Require a session that can access the orphan-sponsorship area —
 * 'admin' OR the dedicated 'sponsorship' coordinator role. Redirects to
 * /admin/login when unauthenticated, and to the user's own section when
 * another role lands here.
 *
 * Call this at the top of every /admin/sponsorship/* page and inside the
 * sponsorship server actions before any mutation. Because this surface
 * handles children's media, the page guard AND the action guard both
 * call it — defence in depth.
 */
export async function requireSponsorshipAccess(): Promise<AdminSessionPayload> {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (session.role !== "admin" && session.role !== "sponsorship") {
    redirect(landingForNonAdmin(session.role));
  }
  return session;
}
