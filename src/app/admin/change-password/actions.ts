"use server";

import { cookies } from "next/headers";
import { getAdminSession } from "@/lib/admin-session";
import { getSupabaseAdmin } from "@/lib/supabase";
import { signAdminSession } from "@/lib/signed-token";
import { logAdminAction } from "@/lib/admin-audit";
import {
  hashAdminPassword,
  verifyAdminPassword,
  validateAdminPassword,
} from "@/lib/admin-password";

const COOKIE_NAME = "dr_admin_session";
const COOKIE_MAX_AGE_SECONDS = 8 * 60 * 60;

/**
 * Set or change the signed-in admin's personal password.
 *
 * Two modes, decided from the DB row (not the client):
 *   - Forced (must_change_password = true): a one-time temporary
 *     password was issued; the user just authenticated with it, so we
 *     don't ask for the current password again — they just set a new one.
 *   - Voluntary (already has a password, not forced): we re-verify the
 *     current password first, so a hijacked session can't silently
 *     change it.
 *
 * Accounts with no personal password that aren't being forced use the
 * shared team passphrase and have nothing to change here.
 *
 * On success we clear must_change_password and re-issue the session
 * cookie WITHOUT the mustChange flag, so the page guards stop bouncing
 * the user back to this screen.
 */
export async function changeAdminPasswordAction(input: {
  currentPassword?: string;
  newPassword: string;
}): Promise<{ ok: boolean; error?: string }> {
  const session = await getAdminSession();
  if (!session) return { ok: false, error: "You're not signed in." };

  const email = session.email;
  const supabase = getSupabaseAdmin();

  const { data: row, error } = await supabase
    .from("admin_users")
    .select("id, role, password_hash, must_change_password")
    .ilike("email", email)
    .maybeSingle();

  if (error || !row) {
    return { ok: false, error: "Your admin account couldn't be found." };
  }

  const storedHash = (row.password_hash as string | null) ?? null;
  const forced = row.must_change_password === true;

  // Shared-passphrase account, not being forced → nothing to change.
  if (!storedHash && !forced) {
    return {
      ok: false,
      error:
        "This account signs in with the shared team passphrase — there's no personal password to change.",
    };
  }

  // Voluntary change on an account that already has a password → re-auth.
  if (storedHash && !forced) {
    const ok = await verifyAdminPassword(input.currentPassword ?? "", storedHash);
    if (!ok) return { ok: false, error: "Your current password is incorrect." };
  }

  const validationError = validateAdminPassword(input.newPassword);
  if (validationError) return { ok: false, error: validationError };

  // Don't allow re-setting the same password.
  if (storedHash && (await verifyAdminPassword(input.newPassword, storedHash))) {
    return { ok: false, error: "Choose a password different from your current one." };
  }

  const newHash = await hashAdminPassword(input.newPassword);
  const { error: updErr } = await supabase
    .from("admin_users")
    .update({
      password_hash: newHash,
      must_change_password: false,
      password_updated_at: new Date().toISOString(),
    })
    .eq("id", row.id);

  if (updErr) {
    return { ok: false, error: "Couldn't update your password — please try again." };
  }

  // Re-issue the session cookie without mustChange so the guards stop
  // redirecting here. Best-effort: the DB flag is already cleared, so
  // even if this throws the next sign-in is clean.
  try {
    const token = signAdminSession(email, session.role ?? "admin", {
      mustChange: false,
    });
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: COOKIE_MAX_AGE_SECONDS,
    });
  } catch (err) {
    console.error("[change-password] cookie re-issue failed:", err);
  }

  await logAdminAction({
    action: "admin_password_changed",
    userEmail: email,
    metadata: { firstTime: forced },
  });

  return { ok: true };
}
