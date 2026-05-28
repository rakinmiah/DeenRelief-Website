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
 *   - Server holds TWO passphrases, one per role:
 *       ADMIN_LOGIN_PASSPHRASE   — for trustee/admin role
 *       SOCIAL_LOGIN_PASSPHRASE  — for social-media-manager role
 *     This means the SMM can never use a trustee credential and
 *     vice versa, even if one passphrase leaks.
 *   - Email must EITHER be in ADMIN_ALLOWED_EMAILS env (legacy admin
 *     bootstrap) OR have a row in the admin_users table (the new
 *     role-aware allowlist — see migration 019). Role is resolved by
 *     resolveAdminRoleForLogin(), which picks the correct passphrase
 *     to validate against.
 *   - Constant-time compare on the passphrase. Timing stays uniform
 *     whether the email is known or not (we still run a compare on
 *     unknown-email requests to avoid leaking allowlist info).
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

  // Load both role passphrases up front. We fail closed when neither
  // is configured (no possible login), but per-role missing-passphrase
  // is fine — it just means that role can't sign in.
  const adminPassphrase = process.env.ADMIN_LOGIN_PASSPHRASE ?? "";
  const socialPassphrase = process.env.SOCIAL_LOGIN_PASSPHRASE ?? "";
  if (!adminPassphrase && !socialPassphrase) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[admin login] Neither ADMIN_LOGIN_PASSPHRASE nor SOCIAL_LOGIN_PASSPHRASE set — all logins rejected."
      );
    }
    return NextResponse.json(
      { error: "Invalid credentials." },
      { status: 401 }
    );
  }

  // Resolve role (DB lookup + env-allowlist bootstrap). null = unknown
  // email. We then pick the role-appropriate passphrase to compare
  // against. Unknown email still triggers a passphrase compare against
  // adminPassphrase so the request timing doesn't reveal whether the
  // email is in the allowlist — uniform DB hit + uniform compare for
  // every request.
  const role: "admin" | "social" | null = await resolveAdminRoleForLogin(email);

  // Pick the expected passphrase by role. For unknown emails we still
  // compare against adminPassphrase (or empty string fallback) so the
  // compare cost is constant.
  const expectedPassphrase =
    role === "social" ? socialPassphrase : adminPassphrase;

  // Guard against the per-role passphrase being unset — treat as
  // rejection. This keeps the error generic (still "Invalid credentials")
  // so an attacker can't tell which role's passphrase is missing.
  const passphraseConfigured = expectedPassphrase.length > 0;
  const passphraseMatch =
    passphraseConfigured && secureCompare(passphrase, expectedPassphrase);

  // After this point, `role` is narrowed to a real role (not null).
  if (!role || !passphraseMatch) {
    // Audit log the failure. The next-attempts-until-rate-limit count
    // helps trustees diagnose "I keep getting locked out" issues.
    await logAdminAction({
      action: "sign_in_failed",
      userEmail: role ? email : null,
      request,
      metadata: {
        // Record which side failed (timing-safe to log AFTER the fact)
        // for forensic purposes. Never returned to the client.
        emailKnown: role !== null,
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
