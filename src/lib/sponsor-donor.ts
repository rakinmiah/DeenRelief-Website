import "server-only";

/**
 * Bridges a signed-in sponsor to the donor record we already hold in the
 * donations system, for the "My Profile" section of the account portal.
 *
 * The donors / donations / gift_aid_declarations tables are deny-by-default
 * RLS (service-role only), so the sponsor's own client cannot read them. Every
 * function here uses the service-role client and is gated by the CALLER
 * passing the verified sponsor (from getSponsorUser + getSponsorById) — never
 * a client-supplied id.
 *
 * Resolution: prefer sponsor_profiles.stripe_customer_id → donors
 * (stable, unique), fall back to email (lowercased). A sponsor who hasn't
 * donated yet (or was hand-invited) may have no donor record — handled
 * gracefully (hasRecord:false).
 */

import type { User } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase";
import { fetchDonorProfile } from "@/lib/donor-profile";
import { getSponsorById, type SponsorProfile } from "@/lib/sponsorship-admin";

/**
 * Resolve the SponsorProfile for a signed-in auth user. Falls back to a
 * minimal profile synthesised from the auth user if the sponsor_profiles row
 * can't be read (e.g. a not-yet-applied migration) — so the profile UI still
 * renders and resolves the donor record by email rather than going blank.
 */
export async function resolveSponsor(user: User): Promise<SponsorProfile> {
  const existing = await getSponsorById(user.id);
  if (existing) return existing;
  return {
    id: user.id,
    fullName: "",
    contactEmail: user.email ?? "",
    phone: null,
    marketingConsent: false,
    notifyNewUpdate: true,
    status: "active",
    stripeCustomerId: null,
    invitedByEmail: null,
    activatedAt: null,
    createdAt: "",
  };
}

export interface SponsorGivingSummary {
  donationsCount: number;
  totalPence: number;
  giftAidReclaimablePence: number;
  firstDonationAt: string | null;
  lastDonationAt: string | null;
  hasActiveRecurring: boolean;
  activeMonthlyPence: number;
}

export interface SponsorProfileView {
  hasDonorRecord: boolean;
  donorId: string | null;
  fullName: string;
  email: string;
  phone: string | null;
  address: {
    line1: string | null;
    line2: string | null;
    city: string | null;
    postcode: string | null;
  };
  memberSince: string | null;
  giftAidActive: boolean;
  giving: SponsorGivingSummary | null;
}

/** Resolve the donor row id for a sponsor: stripe customer first, then email. */
async function resolveDonorId(sponsor: SponsorProfile): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  if (sponsor.stripeCustomerId) {
    const { data } = await supabase
      .from("donors")
      .select("id")
      .eq("stripe_customer_id", sponsor.stripeCustomerId)
      .maybeSingle();
    if (data?.id) return data.id as string;
  }
  const { data: byEmail } = await supabase
    .from("donors")
    .select("id")
    .ilike("email", sponsor.contactEmail.toLowerCase().trim())
    .maybeSingle();
  return (byEmail?.id as string) ?? null;
}

/** Is there an active (non-revoked, enduring-scope) Gift Aid declaration? */
async function isGiftAidActive(donorId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("gift_aid_declarations")
    .select("id")
    .eq("donor_id", donorId)
    .is("revoked_at", null)
    .eq("scope", "this-and-past-4-years-and-future")
    .limit(1)
    .maybeSingle();
  return Boolean(data);
}

/**
 * Assemble the donor-backed profile view for a sponsor. Falls back to the
 * sponsor_profiles values when there's no donor record yet.
 */
export async function getSponsorProfileView(
  sponsor: SponsorProfile
): Promise<SponsorProfileView> {
  const donorId = await resolveDonorId(sponsor);

  if (!donorId) {
    return {
      hasDonorRecord: false,
      donorId: null,
      fullName: sponsor.fullName,
      email: sponsor.contactEmail,
      phone: sponsor.phone,
      address: { line1: null, line2: null, city: null, postcode: null },
      memberSince: sponsor.createdAt || null,
      giftAidActive: false,
      giving: null,
    };
  }

  const [full, giftAidActive] = await Promise.all([
    fetchDonorProfile(donorId),
    isGiftAidActive(donorId),
  ]);

  if (!full) {
    return {
      hasDonorRecord: false,
      donorId: null,
      fullName: sponsor.fullName,
      email: sponsor.contactEmail,
      phone: sponsor.phone,
      address: { line1: null, line2: null, city: null, postcode: null },
      memberSince: sponsor.createdAt || null,
      giftAidActive: false,
      giving: null,
    };
  }

  const { profile, stats } = full;
  return {
    hasDonorRecord: true,
    donorId,
    fullName: profile.fullName || sponsor.fullName,
    email: profile.email || sponsor.contactEmail,
    phone: profile.phone ?? sponsor.phone,
    address: {
      line1: profile.addressLine1,
      line2: profile.addressLine2,
      city: profile.city,
      postcode: profile.postcode,
    },
    memberSince: profile.firstSeenAt || sponsor.createdAt || null,
    giftAidActive,
    giving: {
      donationsCount: stats.donationsCount,
      totalPence: stats.donationsTotalPence,
      giftAidReclaimablePence: stats.donationsGiftAidPence,
      firstDonationAt: stats.firstDonationAt,
      lastDonationAt: stats.lastDonationAt,
      hasActiveRecurring: stats.hasActiveRecurring,
      activeMonthlyPence: stats.activeRecurringMonthlyPence,
    },
  };
}

export interface UpdateSponsorDetailsInput {
  fullName: string;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  postcode: string | null;
}

/**
 * Update the sponsor's editable personal details. Always updates
 * sponsor_profiles (name + phone). If a donor record exists, also keeps it in
 * sync (name, split first/last for HMRC, phone, address). Email is NOT
 * editable here — it's the login + unique key.
 */
export async function updateSponsorDonorDetails(
  sponsor: SponsorProfile,
  input: UpdateSponsorDetailsInput
): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabaseAdmin();
  const fullName = input.fullName.trim();
  if (!fullName) return { ok: false, error: "Please enter your name." };

  // Always keep the sponsor profile current.
  const { error: spErr } = await supabase
    .from("sponsor_profiles")
    .update({ full_name: fullName, phone: input.phone?.trim() || null })
    .eq("id", sponsor.id);
  if (spErr) {
    console.error("[sponsor-donor] sponsor_profiles update failed:", spErr.message);
    return { ok: false, error: "Couldn't save your details." };
  }

  const donorId = await resolveDonorId(sponsor);
  if (donorId) {
    const [firstName, ...rest] = fullName.split(" ");
    const lastName = rest.join(" ") || firstName;

    // Address is for Gift Aid (HMRC needs line1 + postcode). Only write the
    // address if both required parts are present; otherwise leave it untouched
    // so we never violate the NOT NULL columns or corrupt a valid address.
    const patch: Record<string, unknown> = {
      full_name: fullName,
      first_name: firstName,
      last_name: lastName,
      phone: input.phone?.trim() || null,
    };
    const line1 = input.addressLine1?.trim();
    const postcode = input.postcode?.trim();
    if (line1 && postcode) {
      patch.address_line1 = line1;
      patch.address_line2 = input.addressLine2?.trim() || null;
      patch.city = input.city?.trim() || null;
      patch.postcode = postcode;
    }

    const { error: dErr } = await supabase
      .from("donors")
      .update(patch)
      .eq("id", donorId);
    if (dErr) {
      console.error("[sponsor-donor] donors update failed:", dErr.message);
      // Sponsor profile already saved; surface a soft error.
      return { ok: false, error: "Saved your name, but couldn't update your donor record." };
    }
  }

  return { ok: true };
}
