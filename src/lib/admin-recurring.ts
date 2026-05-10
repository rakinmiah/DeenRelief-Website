/**
 * Server-side data layer for the admin recurring-donations surfaces.
 *
 * Architecture: a "recurring subscription" in our system is the union of
 *   1. The Stripe Subscription object (canonical lifecycle state — active,
 *      past_due, canceled, current_period_end, default payment method).
 *   2. The donations rows tagged with the same stripe_subscription_id
 *      (each successful monthly charge produces one row — these give us
 *      lifetime totals, donor identity, campaign, started_at).
 *
 * We use BOTH because:
 *   - Donations table gives us Bangladesh-fast aggregate queries (sum,
 *     count, donor join) without round-tripping Stripe.
 *   - Stripe API is the source of truth for subscription status, next
 *     charge date, and current card details. We never sync those into
 *     local columns — too easy for them to drift.
 *
 * Performance: list view fetches ~10-50 active subscriptions, then
 * Promise.all-fans Stripe retrieves. Stripe's live API rate-limits at
 * 100 rps, so 50 subscriptions in parallel is fine. At higher volume,
 * batch via stripe.subscriptions.list() and join in memory.
 *
 * livemode: filtered at the donations-table layer via the same
 * `livemode = true` clause used by the donations admin pages. Any
 * subscription whose donation rows are test-mode never appears in
 * the recurring admin.
 */

import Stripe from "stripe";
import { stripe } from "./stripe";
import { getSupabaseAdmin } from "./supabase";

export type AdminRecurringStatus =
  | "active"
  | "past_due"
  | "canceled"
  | "trialing"
  | "incomplete"
  | "incomplete_expired"
  | "unpaid"
  | "paused";

export type CardBrand =
  | "visa"
  | "mastercard"
  | "amex"
  | "discover"
  | "diners"
  | "jcb"
  | "unionpay"
  | "unknown";

export interface AdminRecurringRow {
  /** Donations table row id of the most recent charge — used as our
   *  internal `id` for routing (`/admin/recurring/[id]`). */
  id: string;
  /** Stripe subscription id (sub_...) — the canonical key. */
  stripeSubscriptionId: string;
  /** Stripe customer id (cus_...) — for portal links etc. */
  stripeCustomerId: string | null;
  donorName: string;
  donorEmail: string;
  campaign: string;
  campaignLabel: string;
  /** Per-cycle amount in pence — taken from the most recent successful
   *  charge so it reflects any donor-initiated amount changes. */
  amountPerCyclePence: number;
  /** Stripe-canonical lifecycle status. */
  status: AdminRecurringStatus;
  /** ISO timestamp of the first successful charge for this subscription. */
  startedAt: string;
  /** ISO timestamp of when Stripe canceled the subscription. Only set
   *  when status = canceled. */
  canceledAt: string | null;
  /** ISO timestamp of the next scheduled charge. Null if canceled or
   *  Stripe hasn't returned a current_period_end. */
  nextChargeAt: string | null;
  totalChargesCount: number;
  /** Sum of all successful charges in pence. */
  totalCollectedPence: number;
  /** Last 4 digits of the active default card. Null if no card or if
   *  the default payment method isn't a card. */
  cardLast4: string | null;
  cardBrand: CardBrand | null;
}

/** Aggregate row from the donations table, before Stripe enrichment. */
interface DonationAggregate {
  stripe_subscription_id: string;
  most_recent_donation_id: string;
  most_recent_amount_pence: number;
  total_charges_count: number;
  total_collected_pence: number;
  earliest_completed_at: string;
  donor_name: string;
  donor_email: string;
  campaign: string;
  campaign_label: string;
  stripe_customer_id: string | null;
}

interface DonationRowForAggregation {
  id: string;
  amount_pence: number;
  completed_at: string;
  campaign: string;
  campaign_label: string;
  stripe_subscription_id: string;
  stripe_customer_id: string | null;
  donors: unknown;
}

interface RawDonor {
  email: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
}

function singleJoin<T>(value: unknown): T | null {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) return (value[0] as T) ?? null;
  return value as T;
}

/**
 * Pull all donation rows that belong to a recurring subscription, then
 * group by stripe_subscription_id in memory. Returns one aggregate row
 * per subscription with the fields needed for the list view.
 *
 * Filters: livemode=true (test-mode rows excluded), status='succeeded'
 * (failed/refunded charges don't count toward lifetime totals).
 */
async function aggregateSubscriptionDonations(): Promise<DonationAggregate[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("donations")
    .select(
      `id, amount_pence, completed_at, campaign, campaign_label,
       stripe_subscription_id, stripe_customer_id,
       donors(email, full_name, first_name, last_name)`
    )
    .not("stripe_subscription_id", "is", null)
    .eq("livemode", true)
    .eq("status", "succeeded")
    .order("completed_at", { ascending: true });

  if (error) {
    console.error("[admin-recurring] aggregate fetch failed:", error);
    return [];
  }

  const bySubscription = new Map<string, DonationAggregate>();
  for (const row of (data ?? []) as unknown as DonationRowForAggregation[]) {
    const subId = row.stripe_subscription_id;
    if (!subId) continue;
    const donor = singleJoin<RawDonor>(row.donors);
    const donorName =
      donor?.full_name ??
      [donor?.first_name, donor?.last_name].filter(Boolean).join(" ").trim() ??
      "Anonymous";

    const existing = bySubscription.get(subId);
    if (!existing) {
      bySubscription.set(subId, {
        stripe_subscription_id: subId,
        most_recent_donation_id: row.id,
        most_recent_amount_pence: row.amount_pence,
        total_charges_count: 1,
        total_collected_pence: row.amount_pence,
        earliest_completed_at: row.completed_at,
        donor_name: donorName || "Anonymous",
        donor_email: donor?.email ?? "",
        campaign: row.campaign,
        campaign_label: row.campaign_label,
        stripe_customer_id: row.stripe_customer_id,
      });
    } else {
      existing.total_charges_count += 1;
      existing.total_collected_pence += row.amount_pence;
      // Rows arrive ordered ASC by completed_at — the LAST one wins as
      // most-recent. Earliest stays the first one.
      existing.most_recent_donation_id = row.id;
      existing.most_recent_amount_pence = row.amount_pence;
    }
  }

  return Array.from(bySubscription.values());
}

/**
 * Enrich one aggregate with the Stripe Subscription object's live state.
 * Returns null if Stripe rejects the lookup (e.g. subscription was
 * deleted in Stripe but the DB rows persist) — caller filters out.
 */
async function enrichWithStripe(
  agg: DonationAggregate
): Promise<AdminRecurringRow | null> {
  let sub: Stripe.Subscription;
  try {
    sub = await stripe.subscriptions.retrieve(agg.stripe_subscription_id, {
      expand: ["default_payment_method"],
    });
  } catch (err) {
    console.warn(
      `[admin-recurring] Stripe retrieve failed for ${agg.stripe_subscription_id}:`,
      err
    );
    return null;
  }

  // Pull card details from the expanded default_payment_method.
  let cardLast4: string | null = null;
  let cardBrand: CardBrand | null = null;
  const pm = sub.default_payment_method;
  if (pm && typeof pm !== "string" && pm.type === "card" && pm.card) {
    cardLast4 = pm.card.last4 ?? null;
    cardBrand = (pm.card.brand as CardBrand) ?? "unknown";
  }

  // current_period_end is the next-charge date for active subs. In
  // Stripe API 2024-09+ this moved from the Subscription root to the
  // subscription item (one period per item). For our single-product
  // subscriptions we read item 0; null on canceled subs after the
  // period has ended.
  const firstItemPeriodEnd = sub.items?.data?.[0]?.current_period_end;
  const nextChargeAt =
    sub.status === "canceled" || !firstItemPeriodEnd
      ? null
      : new Date(firstItemPeriodEnd * 1000).toISOString();
  const canceledAt = sub.canceled_at
    ? new Date(sub.canceled_at * 1000).toISOString()
    : null;

  return {
    id: agg.most_recent_donation_id,
    stripeSubscriptionId: agg.stripe_subscription_id,
    stripeCustomerId: agg.stripe_customer_id,
    donorName: agg.donor_name,
    donorEmail: agg.donor_email,
    campaign: agg.campaign,
    campaignLabel: agg.campaign_label,
    amountPerCyclePence: agg.most_recent_amount_pence,
    status: sub.status as AdminRecurringStatus,
    startedAt: agg.earliest_completed_at,
    canceledAt,
    nextChargeAt,
    totalChargesCount: agg.total_charges_count,
    totalCollectedPence: agg.total_collected_pence,
    cardLast4,
    cardBrand,
  };
}

/**
 * List view query. Returns all recurring subscriptions visible to the
 * admin, sorted by status (active first, then past_due, then canceled),
 * then by total collected (largest contributors first).
 */
export async function fetchAdminRecurring(): Promise<AdminRecurringRow[]> {
  const aggregates = await aggregateSubscriptionDonations();
  if (aggregates.length === 0) return [];

  const enriched = await Promise.all(aggregates.map(enrichWithStripe));
  const rows = enriched.filter((r): r is AdminRecurringRow => r !== null);

  // Sort: active first, then past_due/incomplete/etc., canceled last.
  // Within each tier, by total collected DESC (recognise biggest givers).
  const statusOrder: Record<AdminRecurringStatus, number> = {
    active: 0,
    trialing: 1,
    past_due: 2,
    incomplete: 3,
    unpaid: 4,
    paused: 5,
    incomplete_expired: 6,
    canceled: 7,
  };
  rows.sort((a, b) => {
    const sa = statusOrder[a.status] ?? 99;
    const sb = statusOrder[b.status] ?? 99;
    if (sa !== sb) return sa - sb;
    return b.totalCollectedPence - a.totalCollectedPence;
  });

  return rows;
}

/**
 * Detail view — single subscription by our internal id (the
 * most-recent-donation-row id, which is what the list view links to).
 *
 * Returns null on miss. The detail page should call notFound() in
 * that case rather than render an empty shell.
 */
export async function fetchAdminRecurringById(
  id: string
): Promise<AdminRecurringRow | null> {
  const supabase = getSupabaseAdmin();
  const { data: donation, error } = await supabase
    .from("donations")
    .select(
      `stripe_subscription_id, livemode, frequency`
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[admin-recurring] detail lookup failed:", error);
    return null;
  }
  if (!donation || !donation.stripe_subscription_id) return null;
  if (donation.livemode !== true) return null;
  if (donation.frequency !== "monthly") return null;

  // Now aggregate JUST this subscription's rows.
  const all = await aggregateSubscriptionDonations();
  const agg = all.find(
    (a) => a.stripe_subscription_id === donation.stripe_subscription_id
  );
  if (!agg) return null;

  return await enrichWithStripe(agg);
}

/**
 * Card-brand display label. Stripe lowercases brand strings; we
 * Title-Case for the admin UI without losing the discriminator value.
 */
export function cardBrandLabel(brand: CardBrand | null): string {
  if (!brand) return "Card";
  return brand.charAt(0).toUpperCase() + brand.slice(1);
}
