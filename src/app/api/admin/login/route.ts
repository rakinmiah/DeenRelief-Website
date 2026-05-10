import { NextResponse } from "next/server";
import { signAdminSession } from "@/lib/signed-token";
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
 *   - Server holds an allow-list of admin emails + a single shared
 *     passphrase, both via env vars:
 *       ADMIN_ALLOWED_EMAILS   = "alice@deenrelief.org,bob@deenrelief.org"
 *       ADMIN_LOGIN_PASSPHRASE = "long-random-string-from-1password"
 *   - Email must be in the allow-list AND passphrase must match.
 *   - Constant-time compare on the passphrase.
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

  const allowedEmails = (process.env.ADMIN_ALLOWED_EMAILS ?? "")
    .split(",")
    .map((e) => e.toLowerCase().trim())
    .filter(Boolean);
  const expectedPassphrase = process.env.ADMIN_LOGIN_PASSPHRASE ?? "";

  // Fail closed if not configured. We DO log to server console so the
  // sysadmin can spot the misconfig, but we don't leak it to the client.
  if (allowedEmails.length === 0 || !expectedPassphrase) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[admin login] ADMIN_ALLOWED_EMAILS or ADMIN_LOGIN_PASSPHRASE not set — all logins rejected."
      );
    }
    return NextResponse.json(
      { error: "Invalid credentials." },
      { status: 401 }
    );
  }

  // Validate. Compare the passphrase even when the email is wrong, so
  // the timing of failure doesn't reveal whether the email exists.
  const emailMatch = allowedEmails.includes(email);
  const passphraseMatch = secureCompare(passphrase, expectedPassphrase);

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

  // Mint signed session token + set cookie.
  let token: string;
  try {
    token = signAdminSession(email);
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
  });

  return new NextResponse(JSON.stringify({ ok: true, email }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": cookie,
    },
  });
}
