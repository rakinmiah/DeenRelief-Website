import { NextResponse } from "next/server";
import { signAdminSession } from "@/lib/signed-token";
import { resolveAdminRoleForLogin } from "@/lib/admin-roles";
import {
  clientIpFromRequest,
  countRecentLoginFailures,
  logAdminAction,
  LOGIN_RATE_LIMIT_MAX_FAILURES,
  LOGIN_RATE_LIMIT_WINDOW_MINUTES,
} from "@/lib/admin-audit";

/**
 * POST /api/admin/login
 *
 * Validates admin credentials and sets the `dr_admin_session` cookie.
 *
 * Validation strategy (interim, pre-Supabase-Auth):
 *   - Server holds a shared passphrase via env var:
 *       ADMIN_LOGIN_PASSPHRASE = "long-random-string-from-1password"
 *   - Email must EITHER be in ADMIN_ALLOWED_EMAILS env (legacy admin
 *     bootstrap) OR have a row in the admin_users table (the new
 *     role-aware allowlist — see migration 019). Admin role is
 *     resolved by resolveAdminRoleForLogin().
 *   - Constant-time compare on the passphrase.
 *   - Session payload carries the resolved role; sidebar + page
 *     guards branch on it.
 *
 * Production swap (when Supabase Auth is wired):
 *   - Replace this body with `supabase.auth.signInWithPassword({...})`
 *   - Check the resulting user's id against the `admin_users` table
 *   - Set the same dr_admin_session cookie on success
 *   - The export route's verifier doesn't change.
 *
 * Cookie attributes:
 *   - HttpOnly  → JS can't read it (XSS-safe)
 *   - Secure    → HTTPS only in production
 *   - SameSite=Lax → standard CSRF protection while still allowing
 *                    top-level navigation (e.g. clicking a link in an
 *                    email)
 *   - Max-Age   → matches the 8h TTL of the signed payload
 *   - Path=/    → sent to all routes
 */

import { timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "dr_admin_session";
const COOKIE_MAX_AGE_SECONDS = 8 * 60 * 60;

function secureCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export async function POST(request: Request) {
  const ip = clientIpFromRequest(request);

  // Rate limit BEFORE parsing the body — even malformed requests count
  // as load and we want to throttle them. Read sign_in_failed events
  // from this IP in the last 15 minutes; reject with 429 if at limit.
  const recentFailures = await countRecentLoginFailures(ip);
  if (recentFailures >= LOGIN_RATE_LIMIT_MAX_FAILURES) {
    await logAdminAction({
      action: "sign_in_rate_limited",
      userEmail: null,
      request,
      metadata: { recentFailures, ip },
    });
    return NextResponse.json(
      {
        error: `Too many failed attempts. Try again in ${LOGIN_RATE_LIMIT_WINDOW_MINUTES} minutes.`,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(LOGIN_RATE_LIMIT_WINDOW_MINUTES * 60),
        },
      }
    );
  }

  let body: { email?: string; passphrase?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = (body.email ?? "").toLowerCase().trim();
  const passphrase = body.passphrase ?? "";

  if (!email || !passphrase) {
    return NextResponse.json(
      { error: "Email and passphrase required." },
      { status: 400 }
    );
  }

  const expectedPassphrase = process.env.ADMIN_LOGIN_PASSPHRASE ?? "";

  // Fail closed if passphrase not configured. We DO log to server
  // console so the sysadmin can spot the misconfig, but we don't leak
  // it to the client.
  if (!expectedPassphrase) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[admin login] ADMIN_LOGIN_PASSPHRASE not set — all logins rejected."
      );
    }
    return NextResponse.json(
      { error: "Invalid credentials." },
      { status: 401 }
    );
  }

  // Validate the passphrase first (constant-time). Doing this BEFORE
  // the role lookup ensures wrong-passphrase requests cost no DB query
  // and timing doesn't reveal whether the email is known.
  const passphraseMatch = secureCompare(passphrase, expectedPassphrase);

  // Resolve role (DB lookup + env-allowlist bootstrap). null = unknown
  // email. We still call this on wrong-passphrase attempts so timing
  // stays constant relative to email validity.
  const role = await resolveAdminRoleForLogin(email);
  const emailMatch = role !== null;

  if (!emailMatch || !passphraseMatch) {
    // Audit log the failure. The next-attempts-until-rate-limit count
    // helps trustees diagnose "I keep getting locked out" issues.
    await logAdminAction({
      action: "sign_in_failed",
      userEmail: emailMatch ? email : null,
      request,
      metadata: {
        // Record which side failed (timing-safe to log AFTER the fact)
        // for forensic purposes. Never returned to the client.
        emailKnown: emailMatch,
        passphraseMatched: passphraseMatch,
      },
    });
    return NextResponse.json(
      { error: "Invalid credentials." },
      { status: 401 }
    );
  }

  // Mint signed session token + set cookie. Role is baked into the
  // payload so page guards don't need a DB round-trip on every render.
  let token: string;
  try {
    token = signAdminSession(email, role);
  } catch {
    // signAdminSession throws if APP_SECRET is missing.
    return NextResponse.json(
      { error: "Server not configured for sessions." },
      { status: 500 }
    );
  }

  const isProd = process.env.NODE_ENV === "production";
  const cookie = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    "HttpOnly",
    "Path=/",
    `Max-Age=${COOKIE_MAX_AGE_SECONDS}`,
    "SameSite=Lax",
    isProd ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");

  // Audit log the successful sign-in.
  await logAdminAction({
    action: "sign_in",
    userEmail: email,
    request,
    metadata: { role },
  });

  return new NextResponse(JSON.stringify({ ok: true, email, role }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": cookie,
    },
  });
}
