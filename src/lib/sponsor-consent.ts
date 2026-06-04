import "server-only";

/**
 * Consent + data-request helpers for the sponsor portal (UK GDPR).
 *
 * Writes go through the service-role client: sponsor_consents has no INSERT
 * policy for `authenticated` (it's an append-only audit the sponsor must not
 * be able to backdate or forge), and account activation updates
 * sponsor_profiles which sponsors can only read. The CALLER is responsible
 * for passing the verified sponsor id from getSponsorUser().
 *
 * The current privacy/terms version. Bump when the policies materially
 * change so each consent row records exactly what was agreed to.
 */
import { getSupabaseAdmin } from "@/lib/supabase";

export const POLICY_VERSION = "2026-05-29";

export type ConsentType =
  | "account_terms"
  | "privacy_policy"
  | "child_media_confidentiality"
  | "marketing";

export type LawfulBasis = "consent" | "contract" | "legitimate_interest";

interface ConsentRecord {
  consentType: ConsentType;
  lawfulBasis: LawfulBasis;
  granted: boolean;
}

/** Append one or more consent rows for a sponsor. Never overwrites. */
export async function recordConsents(input: {
  sponsorId: string;
  consents: ConsentRecord[];
  ip?: string | null;
  userAgent?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabaseAdmin();
  const rows = input.consents.map((c) => ({
    sponsor_id: input.sponsorId,
    consent_type: c.consentType,
    lawful_basis: c.lawfulBasis,
    granted: c.granted,
    policy_version: POLICY_VERSION,
    ip: input.ip ?? null,
    user_agent: input.userAgent ?? null,
  }));
  const { error } = await supabase.from("sponsor_consents").insert(rows);
  if (error) {
    console.error("[sponsor-consent] recordConsents failed:", error.message);
    return { ok: false, error: "Couldn't record consent." };
  }
  return { ok: true };
}

/**
 * Mark a sponsor's account active on first password set, capturing the
 * mandatory activation consents in the same step. Idempotent enough: setting
 * status='active' again is harmless.
 */
export async function activateSponsor(input: {
  sponsorId: string;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("sponsor_profiles")
    .update({ status: "active", activated_at: new Date().toISOString() })
    .eq("id", input.sponsorId);
  if (error) {
    console.error("[sponsor-consent] activateSponsor failed:", error.message);
    return { ok: false, error: "Couldn't activate the account." };
  }
  return recordConsents({
    sponsorId: input.sponsorId,
    consents: [
      { consentType: "account_terms", lawfulBasis: "contract", granted: true },
      { consentType: "privacy_policy", lawfulBasis: "contract", granted: true },
      {
        consentType: "child_media_confidentiality",
        lawfulBasis: "consent",
        granted: true,
      },
    ],
    ip: input.ip,
    userAgent: input.userAgent,
  });
}

/** Update a sponsor's marketing-consent flag + append an audit row. */
export async function setMarketingConsent(input: {
  sponsorId: string;
  granted: boolean;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("sponsor_profiles")
    .update({
      marketing_consent: input.granted,
      marketing_consent_at: input.granted ? new Date().toISOString() : null,
    })
    .eq("id", input.sponsorId);
  if (error) return { ok: false, error: "Couldn't update preference." };
  return recordConsents({
    sponsorId: input.sponsorId,
    consents: [
      { consentType: "marketing", lawfulBasis: "consent", granted: input.granted },
    ],
    ip: input.ip,
    userAgent: input.userAgent,
  });
}

/** Toggle the "email me when there's a new update" preference. */
export async function setUpdateNotification(input: {
  sponsorId: string;
  enabled: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("sponsor_profiles")
    .update({ notify_new_update: input.enabled })
    .eq("id", input.sponsorId);
  if (error) {
    console.error("[sponsor-consent] setUpdateNotification failed:", error.message);
    return { ok: false, error: "Couldn't update preference." };
  }
  return { ok: true };
}

/** Raise an export/erasure request on the sponsor's behalf. */
export async function createDataRequest(input: {
  sponsorId: string;
  requestType: "export" | "erasure";
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("sponsor_data_requests").insert({
    sponsor_id: input.sponsorId,
    request_type: input.requestType,
    status: "pending",
  });
  if (error) {
    console.error("[sponsor-consent] createDataRequest failed:", error.message);
    return { ok: false, error: "Couldn't submit the request." };
  }
  return { ok: true };
}
