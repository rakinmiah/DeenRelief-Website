import { NextResponse } from "next/server";
import { signAdminSession } from "@/lib/signed-token";
import { resolveAdminLogin } from "@/lib/admin-roles";
import { verifyAdminPassword } from "@/lib/admin-password";
import {
  clientIpFromRequest,
  countRecentLoginFailures,
  countRecentLoginFailuresByEmail,
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

  // Per-account throttle (in addition to the per-IP one above) so an attacker
  // rotating IPs can't get unlimited guesses against a single admin email.
  const emailFailures = await countRecentLoginFailuresByEmail(email);
  if (emailFailures >= LOGIN_RATE_LIMIT_MAX_FAILURES) {
    await logAdminAction({
      action: "sign_in_rate_limited",
      userEmail: email,
      request,
      metadata: { emailFailures, scope: "per-account" },
    });
    return NextResponse.json(
      {
        error: `Too many failed attempts for this account. Try again in ${LOGIN_RATE_LIMIT_WINDOW_MINUTES} minutes.`,
      },
      { status: 429, headers: { "Retry-After": String(LOGIN_RATE_LIMIT_WINDOW_MINUTES * 60) } }
    );
  }

  // Load both role passphrases up front. We fail closed when neither
  // is configured (no possible login), but per-role missing-passphrase
  // is fine — it just means that role can't sign in.
  const adminPassphrase = process.env.ADMIN_LOGIN_PASSPHRASE ?? "";
  const socialPassphrase = process.env.SOCIAL_LOGIN_PASSPHRASE ?? "";
  const writerPassphrase = process.env.WRITER_LOGIN_PASSPHRASE ?? "";
  const sponsorshipPassphrase = process.env.SPONSORSHIP_LOGIN_PASSPHRASE ?? "";
  if (
    !adminPassphrase &&
    !socialPassphrase &&
    !writerPassphrase &&
    !sponsorshipPassphrase
  ) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[admin login] None of ADMIN_LOGIN_PASSPHRASE / SOCIAL_LOGIN_PASSPHRASE / WRITER_LOGIN_PASSPHRASE / SPONSORSHIP_LOGIN_PASSPHRASE set — all logins rejected."
      );
    }
    return NextResponse.json(
      { error: "Invalid credentials." },
      { status: 401 }
    );
  }

  // Resolve role + per-user password state (DB lookup + env-allowlist
  // bootstrap). null = unknown email.
  const loginInfo = await resolveAdminLogin(email);
  const role = loginInfo?.role ?? null;

  // Two credential modes per account (migration 035):
  //   - password_hash SET → the account signs in with its OWN password.
  //     The shared role passphrase does NOT work for it (no backdoor).
  //   - password_hash NULL → the account uses the shared role passphrase
  //     (existing behaviour — e.g. info@, socialmedia@).
  // For an unknown email we still run a constant-time passphrase compare
  // so timing doesn't reveal whether the email is in the allowlist.
  let authed = false;
  let mustChange = false;

  if (loginInfo?.passwordHash) {
    authed = await verifyAdminPassword(passphrase, loginInfo.passwordHash);
    mustChange = loginInfo.mustChange;
  } else {
    const expectedPassphrase =
      role === "social"
        ? socialPassphrase
        : role === "writer"
        ? writerPassphrase
        : role === "sponsorship"
        ? sponsorshipPassphrase
        : adminPassphrase;
    const passphraseConfigured = expectedPassphrase.length > 0;
    authed =
      passphraseConfigured && secureCompare(passphrase, expectedPassphrase);
  }

  // After this point, `role` is narrowed to a real role (not null).
  if (!role || !authed) {
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
        credentialMode: loginInfo?.passwordHash ? "password" : "passphrase",
        matched: authed,
      },
    });
    return NextResponse.json(
      { error: "Invalid credentials." },
      { status: 401 }
    );
  }

  // Mint signed session token + set cookie. Role is baked into the
  // payload so page guards don't need a DB round-trip on every render.
  // mustChange forces the user through /admin/change-password first.
  let token: string;
  try {
    token = signAdminSession(email, role, { mustChange });
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

  return new NextResponse(
    JSON.stringify({ ok: true, email, role, mustChange }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": cookie,
      },
    }
  );
}
