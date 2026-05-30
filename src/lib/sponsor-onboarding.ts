import "server-only";

/**
 * Shared sponsor onboarding: create (or reuse) the Supabase Auth user, upsert
 * their sponsor_profiles row, mint a single-use activation link, and email it.
 *
 * One implementation, four callers:
 *   - admin manual invite        (/admin/sponsorship/sponsors)
 *   - admin "Resend activation"  (sponsor detail page)
 *   - Stripe webhook auto-onboard (on first orphan-sponsorship payment)
 *   - public "request a new link" (expired set-password page)
 *
 * The activation link points at /sponsor/auth/callback with the link's
 * token_hash, which the callback verifies server-side (verifyOtp) — robust
 * across auth flows. New users get an 'invite' link; existing users get a
 * 'recovery' link so we can always (re-)send them an activation email.
 */

import { getSupabaseAdmin } from "@/lib/supabase";
import { upsertSponsorProfile } from "@/lib/sponsorship-admin";
import { sendSponsorInviteEmail } from "@/lib/sponsor-invite-email";

function siteOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "https://deenrelief.org"
  );
}

export interface ProvisionResult {
  ok: boolean;
  error?: string;
  /** The auth user id, present whenever the account exists (even if the
   *  email send failed) so callers can still link an orphan. */
  userId?: string;
}

/**
 * Provision a sponsor account and email them an activation link.
 *
 * @param variant 'welcome' for the post-subscription auto email, 'invite' for
 *   an admin-initiated invite. Only changes the email copy.
 */
export async function provisionSponsorAndSendActivation(input: {
  email: string;
  fullName: string;
  stripeCustomerId?: string | null;
  invitedByEmail?: string | null;
  variant?: "invite" | "welcome";
}): Promise<ProvisionResult> {
  const email = input.email.toLowerCase().trim();
  if (!email.includes("@")) {
    return { ok: false, error: "That doesn't look like a valid email." };
  }

  const supabase = getSupabaseAdmin();
  const redirectTo = `${siteOrigin()}/sponsor/set-password`;

  // Try an invite link first (creates the auth user if absent).
  const invite = await supabase.auth.admin.generateLink({
    type: "invite",
    email,
    options: { redirectTo },
  });

  let userId = invite.data?.user?.id ?? null;
  let tokenHash = invite.data?.properties?.hashed_token ?? null;
  let linkType: "invite" | "recovery" = "invite";

  // Existing user → generateLink('invite') errors; fall back to recovery.
  if (invite.error || !userId || !tokenHash) {
    const recovery = await supabase.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo },
    });
    if (recovery.error || !recovery.data?.properties?.hashed_token) {
      console.error(
        "[sponsor-onboarding] link generation failed:",
        invite.error?.message ?? recovery.error?.message
      );
      return { ok: false, error: "Couldn't generate the activation link." };
    }
    userId = recovery.data.user?.id ?? userId;
    tokenHash = recovery.data.properties.hashed_token;
    linkType = "recovery";
  }

  if (!userId) {
    return { ok: false, error: "Couldn't resolve the sponsor account." };
  }

  await upsertSponsorProfile({
    id: userId,
    fullName: input.fullName,
    contactEmail: email,
    stripeCustomerId: input.stripeCustomerId ?? null,
    invitedByEmail: input.invitedByEmail ?? null,
  });

  const actionLink =
    `${siteOrigin()}/sponsor/auth/callback` +
    `?token_hash=${encodeURIComponent(tokenHash)}` +
    `&type=${linkType}` +
    `&next=${encodeURIComponent("/sponsor/set-password")}`;

  const sent = await sendSponsorInviteEmail({
    toEmail: email,
    toName: input.fullName,
    actionLink,
    variant: input.variant ?? "invite",
  });

  if (sent.error) {
    return {
      ok: false,
      error: `Account ready but the email failed: ${sent.error}`,
      userId,
    };
  }

  return { ok: true, userId };
}
