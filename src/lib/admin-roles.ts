/**
 * Admin role helpers — the source of truth for who has which role.
 *
 * Two roles:
 *   - 'admin'  → full DR Admin (donations, donors, bazaar, reports,
 *                audit log, plus all social tools)
 *   - 'social' → social/marketing tools only (Campaign Command Center,
 *                /now spotlight, short links, QR generator, First
 *                Response when built, per-post performance)
 *
 * The role lives in two places:
 *   1. The `admin_users` table (DB source of truth — see migration 019).
 *   2. The signed session cookie payload (so role decisions don't need
 *      a DB round-trip on every page render).
 *
 * The login flow reads from (1), mints (2). Page guards read (2). When
 * the cookie's role disagrees with the table (rare — only if a user's
 * role was changed mid-session), the session expires at 8h anyway, so
 * the change naturally propagates on next sign-in.
 *
 * Legacy sessions: payloads minted before this module shipped don't
 * carry a `role` field. We treat those as 'admin' for backward compat —
 * existing trustees keep working without a re-login.
 */

import { getSupabaseAdmin } from "./supabase";

export type AdminRole = "admin" | "social" | "writer" | "sponsorship";

/** True if the value is a known role string. */
export function isValidRole(value: unknown): value is AdminRole {
  return (
    value === "admin" ||
    value === "social" ||
    value === "writer" ||
    value === "sponsorship"
  );
}

/**
 * Resolved login info for an admin email: the role plus per-user
 * password state (migration 035). `passwordHash` is null when the
 * account uses the shared role passphrase (the default / legacy
 * behaviour); set when the account signs in with its own password.
 */
export interface AdminLoginInfo {
  role: AdminRole;
  passwordHash: string | null;
  mustChange: boolean;
}

/**
 * Look up (or bootstrap) the login info for a given admin email.
 *
 * Behaviour:
 *   - If a row exists in admin_users for this email → return its role +
 *     password state (and update last_login_at as a side-effect).
 *   - If no row exists but the email is in the ADMIN_ALLOWED_EMAILS
 *     env var → auto-create an admin_users row with role='admin' (no
 *     per-user password) and return it. Bootstrap path for trustees set
 *     up under the old env-var-only system.
 *   - Otherwise → return null (caller should reject the login).
 *
 * Email comparison is case-insensitive; the unique index on
 * lower(email) enforces this at the DB level too.
 */
export async function resolveAdminLogin(
  email: string
): Promise<AdminLoginInfo | null> {
  const normalised = email.toLowerCase().trim();
  if (!normalised) return null;

  const supabase = getSupabaseAdmin();

  // 1. Look up existing row.
  const { data: existing, error: lookupErr } = await supabase
    .from("admin_users")
    .select("id, role, password_hash, must_change_password")
    .ilike("email", normalised)
    .maybeSingle();

  if (lookupErr) {
    console.error("[admin-roles] admin_users lookup failed:", lookupErr);
    return null;
  }

  if (existing) {
    if (!isValidRole(existing.role)) {
      console.warn(
        `[admin-roles] admin_users row for ${normalised} has unknown role "${existing.role}" — rejecting login.`
      );
      return null;
    }
    // Fire-and-forget last_login update — we don't block login on it.
    void supabase
      .from("admin_users")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", existing.id);
    return {
      role: existing.role,
      passwordHash: (existing.password_hash as string | null) ?? null,
      mustChange: existing.must_change_password === true,
    };
  }

  // 2. No row — fall back to env-var bootstrap (admin only).
  const envAllowed = (process.env.ADMIN_ALLOWED_EMAILS ?? "")
    .split(",")
    .map((e) => e.toLowerCase().trim())
    .filter(Boolean);

  if (!envAllowed.includes(normalised)) {
    return null;
  }

  // 3. Auto-create the bootstrap row so future logins read it directly.
  const { error: insertErr } = await supabase.from("admin_users").insert({
    email: normalised,
    role: "admin",
    last_login_at: new Date().toISOString(),
    created_by_email: null, // null = env-allowlist bootstrap
  });

  if (insertErr) {
    // Most likely a race where another concurrent login inserted the
    // same row — that's fine, the email is still admin. Log and continue.
    console.warn(
      `[admin-roles] bootstrap insert for ${normalised} failed (race ok):`,
      insertErr.message
    );
  }

  return { role: "admin", passwordHash: null, mustChange: false };
}

/**
 * Thin wrapper returning just the role. Retained for callers that don't
 * need the password state.
 */
export async function resolveAdminRoleForLogin(
  email: string
): Promise<AdminRole | null> {
  const info = await resolveAdminLogin(email);
  return info?.role ?? null;
}

/**
 * Default landing path for a role after sign-in. Used by the login
 * client to route the user to a page they can actually access.
 *
 *   admin       → /admin/donations  (current default for trustees)
 *   social      → /admin/social     (Campaign Command Center entry point)
 *   writer      → /admin/blog         (blog CMS — their only section)
 *   sponsorship → /admin/sponsorship  (orphan profiles + updates + sponsors)
 */
export function defaultLandingPathForRole(role: AdminRole): string {
  if (role === "social") return "/admin/social";
  if (role === "writer") return "/admin/blog";
  if (role === "sponsorship") return "/admin/sponsorship";
  return "/admin/donations";
}
