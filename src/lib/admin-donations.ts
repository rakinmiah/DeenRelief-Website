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
 * Filter parameters for the donations admin. All fields optional —
 * empty / null / undefined means "no filter on this dimension".
 *
 * Date semantics:
 *   - `from` is INCLUSIVE start of day (00:00:00Z)
 *   - `to` is INCLUSIVE end of day (23:59:59Z)
 *   - We filter on `created_at` rather than `completed_at` so pending
 *     and failed rows still appear in date-range queries (a donation
 *     that failed today should show in "today's donations" even if
 *     completed_at is null).
 *
 * URL search-param encoding:
 *   from=YYYY-MM-DD&to=YYYY-MM-DD
 *   status=succeeded,failed   (comma-separated)
 *   campaign=palestine,zakat
 *   frequency=monthly         (single value or omitted)
 *   giftAid=true              (true / false / omitted)
 *   q=aisha                   (donor name/email search)
 */
export interface DonationFilters {
  from?: string;
  to?: string;
  status?: AdminDonationStatus[];
  campaign?: string[];
  frequency?: AdminDonationFrequency;
  giftAidClaimed?: boolean;
  q?: string;
}

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
  /** UUID from the donors table — drives the "View profile" link on
   *  donation detail pages. Nullable for the (theoretical) case of
   *  an orphaned donation row whose donor was deleted. */
  donorId: string | null;
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
    donorId: donor?.id ?? null,
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
 * Fetch the most-recent N donations for the admin list view, with
 * optional filtering. Sorted by created_at desc so newest first.
 *
 * Always filters `livemode = true` — test-mode donations from Stripe
 * sandbox stay out of the trustee-facing admin entirely.
 *
 * Filtering strategy:
 *   - Date / status / campaign / frequency / giftAid filters apply at
 *     the Supabase query level (server-side, filtered count).
 *   - Donor name/email search (`q`) applies as a post-filter in JS
 *     because PostgREST OR across joined columns is awkward and the
 *     row volume is small (~200). The JS filter is case-insensitive
 *     substring match on full_name + email.
 *
 * Production: at low volume (~thousands of donations) we SELECT 200
 * latest rows. Once the table grows, switch to keyset pagination.
 */
export async function fetchAdminDonations(
  filters: DonationFilters = {},
  limit = 200
): Promise<AdminDonationRow[]> {
  const supabase = getSupabaseAdmin();
  let query = supabase
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
    .eq("livemode", true);

  if (filters.from) query = query.gte("created_at", `${filters.from}T00:00:00Z`);
  if (filters.to) query = query.lte("created_at", `${filters.to}T23:59:59Z`);
  if (filters.status && filters.status.length > 0) {
    query = query.in("status", filters.status);
  }
  if (filters.campaign && filters.campaign.length > 0) {
    query = query.in("campaign", filters.campaign);
  }
  if (filters.frequency) {
    query = query.eq("frequency", filters.frequency);
  }
  if (typeof filters.giftAidClaimed === "boolean") {
    query = query.eq("gift_aid_claimed", filters.giftAidClaimed);
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[admin-donations] fetchAdminDonations failed:", error);
    return [];
  }

  let rows = (data ?? []).map((r) => shapeRow(r as unknown as RawDonationRow));

  // Donor search post-filter — case-insensitive substring on
  // donor_name + donor_email. We do this in JS rather than via
  // PostgREST OR across the joined donors table because the row
  // volume is small and the OR syntax across joins is brittle.
  if (filters.q && filters.q.trim()) {
    const q = filters.q.trim().toLowerCase();
    rows = rows.filter(
      (r) =>
        r.donorName.toLowerCase().includes(q) ||
        r.donorEmail.toLowerCase().includes(q)
    );
  }

  return rows;
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
 * Hard-delete a donation row. Cascades handle donation_messages
 * (per migration 012). The donor row stays alive — donors may
 * have other donations, and we never auto-orphan a donor record.
 *
 * Gift Aid safety: refuses to delete a donation that has been
 * claimed under Gift Aid (gift_aid_claimed = true AND a non-revoked
 * declaration exists). HMRC requires us to retain records of every
 * Gift Aid claim for six years; deleting one would put us out of
 * compliance. The trustee must revoke the declaration FIRST if
 * they truly need to delete.
 *
 * Returns a snapshot of the deleted row for audit-log metadata.
 */
export async function deleteDonation(donationId: string): Promise<{
  deletedDonation: AdminDonationRow;
}> {
  const donation = await fetchAdminDonationById(donationId);
  if (!donation) {
    throw new Error(`deleteDonation: donation ${donationId} not found`);
  }

  if (
    donation.giftAidClaimed &&
    !donation.giftAidDeclarationRevoked
  ) {
    throw new Error(
      "Refusing to delete: this donation has an active Gift Aid claim. " +
        "HMRC requires us to retain Gift Aid records for six years. " +
        "Revoke the declaration first if deletion is truly necessary."
    );
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("donations")
    .delete()
    .eq("id", donationId);
  if (error) {
    throw new Error(`deleteDonation failed: ${error.message}`);
  }

  return { deletedDonation: donation };
}

/**
 * Aggregate stats for the donations dashboard header. By default
 * windowed to the last 30 days; when filters are passed, the date /
 * status / campaign / frequency / giftAid filters apply to the
 * aggregate so the strip and the table tell the same story.
 *
 * Donor search (`q`) does NOT affect the strip — that's a table-level
 * filter only.
 *
 * Recurring stats are point-in-time (active right now) regardless of
 * date filter — that question's always "how many sponsors do we have
 * today", not "how many in the filter window".
 */
export async function computeDonationStats(
  filters: DonationFilters = {}
): Promise<AdminDonationStats> {
  const supabase = getSupabaseAdmin();
  const last30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Build the date window. If the filters supply explicit from/to we
  // honour them; otherwise default to last-30-days for the legacy
  // "recent operational" view.
  const fromIso = filters.from
    ? `${filters.from}T00:00:00Z`
    : last30d;
  const toIso = filters.to ? `${filters.to}T23:59:59Z` : null;

  let recentQuery = supabase
    .from("donations")
    .select(
      "amount_pence, gift_aid_claimed, gift_aid_declaration:gift_aid_declarations(revoked_at)"
    )
    .eq("livemode", true)
    .gte("created_at", fromIso);

  if (toIso) recentQuery = recentQuery.lte("created_at", toIso);

  // Status: respect the filter if explicit; otherwise default to
  // status='succeeded' (the standard "money received" definition).
  if (filters.status && filters.status.length > 0) {
    recentQuery = recentQuery.in("status", filters.status);
  } else {
    recentQuery = recentQuery.eq("status", "succeeded");
  }
  if (filters.campaign && filters.campaign.length > 0) {
    recentQuery = recentQuery.in("campaign", filters.campaign);
  }
  if (filters.frequency) {
    recentQuery = recentQuery.eq("frequency", filters.frequency);
  }
  if (typeof filters.giftAidClaimed === "boolean") {
    recentQuery = recentQuery.eq("gift_aid_claimed", filters.giftAidClaimed);
  }

  const { data: recentRows, error: recentErr } = await recentQuery;

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

/**
 * Per-campaign breakdown over a rolling window. Used by the reports
 * landing page to show "where did the money go in the last 30 days".
 *
 * Returns one row per campaign that received at least one succeeded
 * live-mode donation, sorted by total raised DESC. Empty array when no
 * donations match.
 */
export interface CampaignBreakdownRow {
  campaign: string;
  campaignLabel: string;
  count: number;
  totalPence: number;
}

export async function fetchCampaignBreakdown(
  windowDays = 30
): Promise<CampaignBreakdownRow[]> {
  const supabase = getSupabaseAdmin();
  const cutoff = new Date(
    Date.now() - windowDays * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data, error } = await supabase
    .from("donations")
    .select("campaign, campaign_label, amount_pence")
    .eq("status", "succeeded")
    .eq("livemode", true)
    .gte("completed_at", cutoff);

  if (error) {
    console.error("[admin-donations] fetchCampaignBreakdown failed:", error);
    return [];
  }

  const byCampaign = new Map<string, CampaignBreakdownRow>();
  for (const row of data ?? []) {
    const slug = row.campaign as string;
    const existing = byCampaign.get(slug);
    if (existing) {
      existing.count += 1;
      existing.totalPence += row.amount_pence as number;
    } else {
      byCampaign.set(slug, {
        campaign: slug,
        campaignLabel: row.campaign_label as string,
        count: 1,
        totalPence: row.amount_pence as number,
      });
    }
  }

  return Array.from(byCampaign.values()).sort(
    (a, b) => b.totalPence - a.totalPence
  );
}

/**
 * Gift Aid eligible donations preview — same query as the export route,
 * but exposed for the /admin/reports/gift-aid preview table. Default
 * window matches the UK tax year (6 April → 5 April). Production
 * version of the export route handles the actual CSV download with
 * matching column shape.
 */
export interface GiftAidEligibleRow {
  donationId: string;
  receiptNumber: string;
  donorName: string;
  donorEmail: string;
  chargedAt: string;
  amountPence: number;
  giftAidReclaimablePence: number;
}

interface RawGiftAidRow {
  id: string;
  amount_pence: number;
  completed_at: string;
  donors: unknown;
  gift_aid_declaration: unknown;
}

export async function fetchGiftAidEligible(
  fromIso?: string,
  toIso?: string
): Promise<GiftAidEligibleRow[]> {
  const supabase = getSupabaseAdmin();

  // Default to current UK tax year (6 April → 5 April).
  const now = new Date();
  const taxYearStart = (() => {
    const y = now.getFullYear();
    const aprilSix = new Date(Date.UTC(y, 3, 6));
    return now < aprilSix ? new Date(Date.UTC(y - 1, 3, 6)) : aprilSix;
  })();
  const taxYearEnd = new Date(taxYearStart);
  taxYearEnd.setUTCFullYear(taxYearStart.getUTCFullYear() + 1);
  taxYearEnd.setUTCDate(taxYearStart.getUTCDate() - 1);

  const from = fromIso ?? taxYearStart.toISOString().slice(0, 10);
  const to = toIso ?? taxYearEnd.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("donations")
    .select(
      `id, amount_pence, completed_at,
       donors(email, full_name, first_name, last_name),
       gift_aid_declaration:gift_aid_declarations(revoked_at)`
    )
    .eq("gift_aid_claimed", true)
    .eq("status", "succeeded")
    .eq("livemode", true)
    .gte("completed_at", `${from}T00:00:00Z`)
    .lte("completed_at", `${to}T23:59:59Z`)
    .order("completed_at", { ascending: false });

  if (error) {
    console.error("[admin-donations] fetchGiftAidEligible failed:", error);
    return [];
  }

  const rows: GiftAidEligibleRow[] = [];
  for (const raw of (data ?? []) as unknown as RawGiftAidRow[]) {
    const decl = singleJoin<RawGiftAidDeclaration>(raw.gift_aid_declaration);
    if (decl?.revoked_at) continue; // declaration revoked — skip
    const donor = singleJoin<RawDonor>(raw.donors);
    const donorName =
      donor?.full_name ??
      [donor?.first_name, donor?.last_name].filter(Boolean).join(" ").trim() ??
      "Anonymous";
    rows.push({
      donationId: raw.id,
      receiptNumber: receiptNumberFor(raw.id),
      donorName: donorName || "Anonymous",
      donorEmail: donor?.email ?? "",
      chargedAt: raw.completed_at,
      amountPence: raw.amount_pence,
      giftAidReclaimablePence: Math.round(raw.amount_pence * 0.25),
    });
  }
  return rows;
}

/**
 * Failed donations — list of one-time donations whose Stripe charge
 * declined. Trustees use this to follow up with donors whose payment
 * didn't go through (most common cause: declined card, insufficient
 * funds, expired card).
 *
 * Filtered to livemode=true so test failures stay out. Sorted newest
 * first so trustees see the most recent failures at the top.
 *
 * Note: this is *one-time* failures only. Recurring subscription
 * failures show up as past_due in /admin/recurring and are surfaced
 * separately via fetchPastDueRecurring().
 */
export async function fetchFailedDonations(
  limit = 50
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
    .eq("status", "failed")
    .eq("livemode", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[admin-donations] fetchFailedDonations failed:", error);
    return [];
  }

  return (data ?? []).map((r) => shapeRow(r as unknown as RawDonationRow));
}

// Locked to Europe/London so timestamps render consistently regardless
// of where the code runs. Server components on Vercel execute in UTC,
// which previously meant a 09:30 BST event rendered as "08:30" in the
// admin — exactly one hour behind what UK trustees expected. The
// Intl formatter respects BST/GMT transitions automatically (no
// manual offset math). Cached module-level so we don't rebuild the
// formatter on every call.
const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Europe/London",
});

const DATE_ONLY_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "Europe/London",
});

/** UK-format an ISO date for display (DD/MM/YYYY HH:MM in Europe/London). */
export function formatAdminDate(iso: string): string {
  // en-GB with both date + time pieces emits "DD/MM/YYYY, HH:MM" with
  // a comma — strip it so the rendered shape matches the previous
  // hand-rolled formatter exactly. Every page that calls this assumes
  // the comma-less layout (and lots of existing screenshots / mocks
  // reference it), so preserving format is the lowest-risk change.
  return DATE_TIME_FORMATTER.format(new Date(iso)).replace(", ", " ");
}

export function formatAdminDateOnly(iso: string): string {
  return DATE_ONLY_FORMATTER.format(new Date(iso));
}
