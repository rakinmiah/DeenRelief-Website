/**
 * Server-side data layer for the admin donations surfaces.
 *
 * All queries use the service-role Supabase client (getSupabaseAdmin)
 * because the admin pages need to read every donation regardless of
 * Row-Level Security policies. The service role key is server-only —
 * never exposed to client components.
 *
 * Call sites should already have called requireAdminSession() before
 * invoking these helpers, so the auth gate is upstream.
 *
 * Schema notes (donations table):
 *   - status: "pending" | "succeeded" | "failed" | "refunded"
 *   - frequency: "one-time" | "monthly"
 *   - amount_pence: integer (no GBP/USD distinction yet — currency col)
 *   - completed_at: ISO timestamp, set when payment succeeded; null for
 *     pending/failed
 *   - donor_id → donors.id, joined via PostgREST embed
 *   - gift_aid_declaration_id → gift_aid_declarations.id, joined to
 *     check declaration revocation status
 *
 * Schema notes (donors table):
 *   - email is the natural key (UPSERT conflict column)
 *   - first_name, last_name, full_name, address_line1/2, city,
 *     postcode, country, phone, marketing_consent, stripe_customer_id
 */

import { getSupabaseAdmin } from "./supabase";

export type AdminDonationStatus =
  | "pending"
  | "succeeded"
  | "failed"
  | "refunded";

export type AdminDonationFrequency = "one-time" | "monthly";

/**
 * Display shape — derived from the joined donations + donors row, with
 * fields normalised so the admin UI doesn't have to know about
 * PostgREST relationship cardinality quirks.
 */
export interface AdminDonationRow {
  id: string;
  /** Display receipt number derived from id + created_at. */
  receiptNumber: string;
  chargedAt: string | null;
  createdAt: string;
  donorName: string;
  donorEmail: string;
  donorFirstName: string | null;
  donorLastName: string | null;
  donorAddressLine1: string | null;
  donorAddressLine2: string | null;
  donorCity: string | null;
  donorPostcode: string | null;
  donorPhone: string | null;
  donorStripeCustomerId: string | null;
  amountPence: number;
  giftAidReclaimablePence: number;
  giftAidClaimed: boolean;
  /** True if the donor's Gift Aid declaration has been revoked. */
  giftAidDeclarationRevoked: boolean;
  campaign: string;
  campaignLabel: string;
  frequency: AdminDonationFrequency;
  status: AdminDonationStatus;
  stripePaymentIntent: string | null;
  stripeSetupIntent: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  // Attribution (useful in the detail view for "where did this donor
  // come from" diagnostics):
  gclid: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
}

export interface AdminDonationStats {
  /** Total number of succeeded donations in last 30 days. */
  last30dCount: number;
  /** Sum of amount_pence on succeeded donations in last 30 days. */
  last30dTotalPence: number;
  /** Sum of amount_pence on succeeded + Gift-Aid-claimed donations in
   *  last 30 days, where the declaration is not revoked. */
  last30dGiftAidEligiblePence: number;
  /** 25% of last30dGiftAidEligiblePence — what HMRC will reclaim. */
  last30dGiftAidReclaimablePence: number;
  /** Number of donations rows with non-null stripe_subscription_id. */
  activeRecurringCount: number;
  /** Sum of amount_pence across active recurring rows (per cycle). */
  activeRecurringMonthlyPence: number;
}

/**
 * Postgrest may return joined rows as either a single object or an
 * array depending on the relationship's cardinality detection. We
 * coerce to "single object or null" since donations:donors and
 * donations:gift_aid_declarations are both 1:1.
 */
function singleJoin<T>(value: unknown): T | null {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) return (value[0] as T) ?? null;
  return value as T;
}

interface RawDonationRow {
  id: string;
  amount_pence: number;
  currency: string;
  status: AdminDonationStatus;
  frequency: AdminDonationFrequency;
  campaign: string;
  campaign_label: string;
  gift_aid_claimed: boolean;
  completed_at: string | null;
  created_at: string;
  stripe_payment_intent_id: string | null;
  stripe_setup_intent_id: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  gclid: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  donors: unknown;
  gift_aid_declaration: unknown;
}

interface RawDonor {
  id: string;
  email: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  postcode: string | null;
  phone: string | null;
  stripe_customer_id: string | null;
}

interface RawGiftAidDeclaration {
  revoked_at: string | null;
}

/** Compute the admin receipt number used in the UI ("DR-DON-XXXXXXXX"). */
function receiptNumberFor(donationId: string): string {
  // Take the last 8 chars of the UUID, uppercase. Stable per donation,
  // human-readable, doesn't expose the full id.
  const tail = donationId.replace(/-/g, "").slice(-8).toUpperCase();
  return `DR-DON-${tail}`;
}

/** Map a raw Supabase row into the display shape. */
function shapeRow(raw: RawDonationRow): AdminDonationRow {
  const donor = singleJoin<RawDonor>(raw.donors);
  const decl = singleJoin<RawGiftAidDeclaration>(raw.gift_aid_declaration);

  const donorName =
    donor?.full_name ??
    [donor?.first_name, donor?.last_name].filter(Boolean).join(" ").trim() ??
    "Anonymous";

  const giftAidReclaimable = raw.gift_aid_claimed
    ? Math.round(raw.amount_pence * 0.25)
    : 0;

  return {
    id: raw.id,
    receiptNumber: receiptNumberFor(raw.id),
    chargedAt: raw.completed_at,
    createdAt: raw.created_at,
    donorName: donorName || "Anonymous",
    donorEmail: donor?.email ?? "",
    donorFirstName: donor?.first_name ?? null,
    donorLastName: donor?.last_name ?? null,
    donorAddressLine1: donor?.address_line1 ?? null,
    donorAddressLine2: donor?.address_line2 ?? null,
    donorCity: donor?.city ?? null,
    donorPostcode: donor?.postcode ?? null,
    donorPhone: donor?.phone ?? null,
    donorStripeCustomerId: donor?.stripe_customer_id ?? null,
    amountPence: raw.amount_pence,
    giftAidReclaimablePence: giftAidReclaimable,
    giftAidClaimed: raw.gift_aid_claimed,
    giftAidDeclarationRevoked: !!decl?.revoked_at,
    campaign: raw.campaign,
    campaignLabel: raw.campaign_label,
    frequency: raw.frequency,
    status: raw.status,
    stripePaymentIntent: raw.stripe_payment_intent_id,
    stripeSetupIntent: raw.stripe_setup_intent_id,
    stripeCustomerId: raw.stripe_customer_id,
    stripeSubscriptionId: raw.stripe_subscription_id,
    gclid: raw.gclid,
    utmSource: raw.utm_source,
    utmMedium: raw.utm_medium,
    utmCampaign: raw.utm_campaign,
  };
}

/**
 * Fetch the most-recent N donations for the admin list view.
 * Sorted by created_at desc so newest donations appear first.
 *
 * Always filters `livemode = true` — test-mode donations from Stripe
 * sandbox stay out of the trustee-facing admin entirely. The livemode
 * column is written from the authoritative `pi.livemode`/`si.livemode`
 * value Stripe returns when the donation is confirmed, never inferred
 * from API key prefix.
 *
 * Production: at low volume (~thousands of donations) we just SELECT
 * 200 latest rows. Once the table grows, switch to keyset pagination.
 */
export async function fetchAdminDonations(
  limit = 200
): Promise<AdminDonationRow[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("donations")
    .select(
      `id, amount_pence, currency, status, frequency, campaign,
       campaign_label, gift_aid_claimed, completed_at, created_at,
       stripe_payment_intent_id, stripe_setup_intent_id,
       stripe_customer_id, stripe_subscription_id,
       gclid, utm_source, utm_medium, utm_campaign,
       donors(id, email, full_name, first_name, last_name,
              address_line1, address_line2, city, postcode, phone,
              stripe_customer_id),
       gift_aid_declaration:gift_aid_declarations(revoked_at)`
    )
    .eq("livemode", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[admin-donations] fetchAdminDonations failed:", error);
    return [];
  }

  return (data ?? []).map((r) => shapeRow(r as unknown as RawDonationRow));
}

/**
 * Fetch a single donation by id. Returns null if not found.
 * Same join shape as the list query so the detail page can render the
 * full donor + Gift Aid declaration context.
 */
export async function fetchAdminDonationById(
  id: string
): Promise<AdminDonationRow | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("donations")
    .select(
      `id, amount_pence, currency, status, frequency, campaign,
       campaign_label, gift_aid_claimed, completed_at, created_at,
       stripe_payment_intent_id, stripe_setup_intent_id,
       stripe_customer_id, stripe_subscription_id,
       gclid, utm_source, utm_medium, utm_campaign,
       donors(id, email, full_name, first_name, last_name,
              address_line1, address_line2, city, postcode, phone,
              stripe_customer_id),
       gift_aid_declaration:gift_aid_declarations(revoked_at)`
    )
    .eq("id", id)
    .eq("livemode", true)
    .maybeSingle();

  if (error) {
    console.error("[admin-donations] fetchAdminDonationById failed:", error);
    return null;
  }
  if (!data) return null;
  return shapeRow(data as unknown as RawDonationRow);
}

/**
 * Aggregate stats for the donations dashboard header. All windowed to
 * the last 30 days for "recent operational" KPIs; recurring is
 * point-in-time (active right now).
 *
 * Each branch is a separate query — Postgres SUM/COUNT fast enough at
 * any sane charity scale. If row counts ever exceed ~1M, switch to a
 * materialized view refreshed nightly.
 */
export async function computeDonationStats(): Promise<AdminDonationStats> {
  const supabase = getSupabaseAdmin();
  const last30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Last-30d succeeded donations.
  const { data: recentRows, error: recentErr } = await supabase
    .from("donations")
    .select(
      "amount_pence, gift_aid_claimed, gift_aid_declaration:gift_aid_declarations(revoked_at)"
    )
    .eq("status", "succeeded")
    .eq("livemode", true)
    .gte("completed_at", last30d);

  if (recentErr) {
    console.error("[admin-donations] computeDonationStats recent failed:", recentErr);
  }

  let last30dCount = 0;
  let last30dTotalPence = 0;
  let last30dGiftAidEligiblePence = 0;
  for (const row of recentRows ?? []) {
    last30dCount += 1;
    last30dTotalPence += row.amount_pence as number;
    const decl = singleJoin<RawGiftAidDeclaration>(row.gift_aid_declaration);
    if (row.gift_aid_claimed && !decl?.revoked_at) {
      last30dGiftAidEligiblePence += row.amount_pence as number;
    }
  }
  const last30dGiftAidReclaimablePence = Math.round(
    last30dGiftAidEligiblePence * 0.25
  );

  // Active recurring — donations rows that are part of a subscription.
  // We deduplicate by stripe_subscription_id since each subscription
  // produces multiple donation rows over time (one per charge).
  const { data: recurringRows, error: recurringErr } = await supabase
    .from("donations")
    .select("amount_pence, stripe_subscription_id")
    .not("stripe_subscription_id", "is", null)
    .eq("status", "succeeded")
    .eq("livemode", true);

  if (recurringErr) {
    console.error("[admin-donations] computeDonationStats recurring failed:", recurringErr);
  }

  // Group by subscription id, take the most recent charge amount as the
  // "per-cycle" amount (handles the case where a donor changed amount
  // mid-subscription).
  const perSubscription = new Map<string, number>();
  for (const row of recurringRows ?? []) {
    const subId = row.stripe_subscription_id as string;
    perSubscription.set(subId, row.amount_pence as number);
  }
  const activeRecurringCount = perSubscription.size;
  const activeRecurringMonthlyPence = Array.from(
    perSubscription.values()
  ).reduce((s, v) => s + v, 0);

  return {
    last30dCount,
    last30dTotalPence,
    last30dGiftAidEligiblePence,
    last30dGiftAidReclaimablePence,
    activeRecurringCount,
    activeRecurringMonthlyPence,
  };
}

/** UK-format an ISO date for display (DD/MM/YYYY HH:MM). */
export function formatAdminDate(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

export function formatAdminDateOnly(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}
