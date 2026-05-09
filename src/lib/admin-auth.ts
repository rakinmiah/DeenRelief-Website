/**
 * Auth gate for admin-only API routes.
 *
 * Two valid credentials are accepted, in priority order:
 *
 *   1. Signed admin session cookie (`dr_admin_session`) — set by the
 *      admin login page when a trustee/staff member signs in via the
 *      browser. This is what makes the "Download HMRC CSV" button on
 *      /admin/reports/gift-aid actually work for browser clicks (the
 *      <a href> can't attach a Bearer header). HMAC-signed via
 *      APP_SECRET; tampering or expiry rejects with 401.
 *
 *   2. Bearer token (`Authorization: Bearer $ADMIN_API_TOKEN`) — for
 *      scripted/curl access to the same endpoints (e.g. CI extracting
 *      data, an accountant's automated pull). Constant-time comparison
 *      to prevent timing-based brute force.
 *
 * Behaviour notes:
 *   - "Fail closed": if neither credential is configured server-side
 *     (no APP_SECRET, no ADMIN_API_TOKEN), the gate still returns 401,
 *     not 500. We don't leak environment-config gaps to potential
 *     attackers via a different status code.
 *   - On success the function returns the verified email when a
 *     session cookie was used; for bearer-token access the email is
 *     null (audit logs reflect "scripted access" in that case).
 */

import { timingSafeEqual } from "node:crypto";
import { verifyAdminSession } from "./signed-token";

export type AdminAuthResult =
  | { ok: true; email: string | null; method: "session" | "bearer" }
  | { ok: false; response: Response };

const COOKIE_NAME = "dr_admin_session";

function unauthorizedResponse(): Response {
  return new Response(JSON.stringify({ error: "Unauthorized." }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

/** Constant-time string comparison guarded against length differences. */
function secureCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/** Read a single cookie value from a Request's Cookie header. */
function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    const k = part.slice(0, eq).trim();
    if (k === name) return decodeURIComponent(part.slice(eq + 1).trim());
  }
  return null;
}

export function requireAdminAuth(request: Request): AdminAuthResult {
  // 1. Try signed session cookie (browser path)
  const cookieValue = readCookie(request, COOKIE_NAME);
  if (cookieValue) {
    const session = verifyAdminSession(cookieValue);
    if (session) {
      return { ok: true, email: session.email, method: "session" };
    }
    // Cookie present but invalid/expired — fall through to bearer
    // check rather than 401 immediately, so a curl request that
    // happens to carry a stale browser cookie still works.
  }

  // 2. Try bearer token (scripted path)
  const expected = process.env.ADMIN_API_TOKEN;
  if (expected) {
    const header = request.headers.get("authorization") ?? "";
    const match = header.match(/^Bearer\s+(.+)$/i);
    if (match && secureCompare(match[1], expected)) {
      return { ok: true, email: null, method: "bearer" };
    }
  }

  return { ok: false, response: unauthorizedResponse() };
}

/**
 * Cron auth — Vercel Cron attaches a `CRON_SECRET` bearer token to scheduled
 * invocations. Reject anything else so the endpoint can't be hit externally.
 */
export function requireCronAuth(request: Request): { ok: true } | { ok: false; response: Response } {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({ error: "CRON_SECRET not configured on server." }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      ),
    };
  }

  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match || match[1] !== expected) {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({ error: "Unauthorized." }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      ),
    };
  }

  return { ok: true };
}
