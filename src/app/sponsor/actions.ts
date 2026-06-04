"use server";

import { headers } from "next/headers";
import { createServerSupabase, getSponsorUser } from "@/lib/supabase-server";
import { clientIpFromRequest } from "@/lib/admin-audit";
import {
  activateSponsor,
  setMarketingConsent,
  setUpdateNotification,
  createDataRequest,
} from "@/lib/sponsor-consent";
import { getSponsorByEmail } from "@/lib/sponsorship-admin";
import { provisionSponsorAndSendActivation } from "@/lib/sponsor-onboarding";
import { checkRateLimitByKey } from "@/lib/rate-limit";
import {
  resolveSponsor,
  updateSponsorDonorDetails,
  type UpdateSponsorDetailsInput,
} from "@/lib/sponsor-donor";

/**
 * Server actions for the sponsor portal. Each one re-derives the verified
 * sponsor from the session cookie via getSponsorUser() — the client never
 * passes its own id, so there's nothing to spoof. Writes happen through the
 * service-role helpers in sponsor-consent.ts because sponsors are read-only
 * on these tables.
 */

async function requestContext() {
  const h = await headers();
  const fauxRequest = new Request("http://server-action.local", {
    headers: {
      "user-agent": h.get("user-agent") ?? "",
      "x-forwarded-for": h.get("x-forwarded-for") ?? "",
    },
  });
  return {
    ip: clientIpFromRequest(fauxRequest),
    userAgent: h.get("user-agent"),
  };
}

/**
 * Set the sponsor's password AND finalise activation, entirely server-side.
 *
 * Runs against the recovery/invite session cookie set by the callback route
 * — so it does NOT depend on the browser client seeing the session, which is
 * the fragile part that surfaces as a false "link expired". After setting the
 * password it records the mandatory activation consents and (optionally)
 * marketing consent.
 */
export async function setPasswordAction(
  password: string,
  marketingOptIn: boolean
): Promise<{ ok: boolean; error?: string }> {
  if (!password || password.length < 8) {
    return { ok: false, error: "Use at least 8 characters." };
  }
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      ok: false,
      error: "Your activation link has expired. Please ask us to resend it.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { ok: false, error: "Couldn't set your password — please try again." };
  }

  const { ip, userAgent } = await requestContext();
  await activateSponsor({ sponsorId: user.id, ip, userAgent });
  if (marketingOptIn) {
    await setMarketingConsent({ sponsorId: user.id, granted: true, ip, userAgent });
  }
  return { ok: true };
}

/**
 * Finalise account activation only (consents + status) for an
 * already-signed-in sponsor. Kept for completeness; setPasswordAction is the
 * primary activation path.
 */
export async function activateAccountAction(): Promise<{
  ok: boolean;
  error?: string;
}> {
  const user = await getSponsorUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const { ip, userAgent } = await requestContext();
  return activateSponsor({ sponsorId: user.id, ip, userAgent });
}

export async function setMarketingConsentAction(
  granted: boolean
): Promise<{ ok: boolean; error?: string }> {
  const user = await getSponsorUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const { ip, userAgent } = await requestContext();
  return setMarketingConsent({ sponsorId: user.id, granted, ip, userAgent });
}

/** Update the sponsor's editable personal details (name, phone, address). */
export async function updateProfileAction(
  input: UpdateSponsorDetailsInput
): Promise<{ ok: boolean; error?: string }> {
  const user = await getSponsorUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const sponsor = await resolveSponsor(user);
  return updateSponsorDonorDetails(sponsor, input);
}

export async function setUpdateNotificationAction(
  enabled: boolean
): Promise<{ ok: boolean; error?: string }> {
  const user = await getSponsorUser();
  if (!user) return { ok: false, error: "Not signed in." };
  return setUpdateNotification({ sponsorId: user.id, enabled });
}

export async function requestDataExportAction(): Promise<{
  ok: boolean;
  error?: string;
}> {
  const user = await getSponsorUser();
  if (!user) return { ok: false, error: "Not signed in." };
  return createDataRequest({ sponsorId: user.id, requestType: "export" });
}

export async function requestErasureAction(): Promise<{
  ok: boolean;
  error?: string;
}> {
  const user = await getSponsorUser();
  if (!user) return { ok: false, error: "Not signed in." };
  return createDataRequest({ sponsorId: user.id, requestType: "erasure" });
}

/**
 * PUBLIC (unauthenticated): re-send an activation link to a sponsor whose
 * link expired. Only sends if a sponsor account already exists for that
 * email — it can't be used to email arbitrary addresses. Always reports
 * success so it never reveals whether an email is registered.
 */
export async function requestActivationLinkAction(
  email: string
): Promise<{ ok: boolean }> {
  const clean = (email ?? "").toLowerCase().trim();
  if (!clean.includes("@")) return { ok: true };

  // Rate-limit per-email and per-IP. On limit we still report success (never
  // reveal whether the email exists) but skip the send — caps email-bombing.
  if (await authThrottled(clean)) return { ok: true };

  const sponsor = await getSponsorByEmail(clean);
  if (sponsor) {
    await provisionSponsorAndSendActivation({
      email: sponsor.contactEmail,
      fullName: sponsor.fullName,
      stripeCustomerId: sponsor.stripeCustomerId,
      variant: "invite",
    });
  }
  return { ok: true };
}

/**
 * PUBLIC: send a password-reset email, routed server-side so we can throttle
 * it (the browser path would bypass our rate limit). Always reports success.
 */
export async function requestPasswordResetAction(
  email: string
): Promise<{ ok: boolean }> {
  const clean = (email ?? "").toLowerCase().trim();
  if (!clean.includes("@")) return { ok: true };
  if (await authThrottled(clean)) return { ok: true };

  try {
    const supabase = await createServerSupabase();
    const origin =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
      "https://deenrelief.org";
    await supabase.auth.resetPasswordForEmail(clean, {
      redirectTo: `${origin}/sponsor/set-password`,
    });
  } catch (err) {
    console.error("[sponsor] password reset failed:", err);
  }
  return { ok: true };
}

/** True if this email or its requesting IP has exceeded the auth-email limit. */
async function authThrottled(email: string): Promise<boolean> {
  const { ip } = await requestContext();
  const [byEmail, byIp] = await Promise.all([
    checkRateLimitByKey("sponsor-auth-email", `email:${email}`),
    checkRateLimitByKey("sponsor-auth-email", `ip:${ip ?? "unknown"}`),
  ]);
  return !byEmail.success || !byIp.success;
}
