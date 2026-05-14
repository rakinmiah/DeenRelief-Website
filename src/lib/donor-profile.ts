/**
 * Unified donor / customer activity profile for /admin/donors/[id].
 *
 * Pulls every interaction we have with a single person across both
 * sides of the org — donations AND bazaar orders — and assembles
 * them into one chronological timeline plus a lifetime-stats panel.
 *
 * Why a separate library instead of extending admin-donations.ts:
 * the profile genuinely spans both data domains (donations + bazaar)
 * and pulling bazaar imports into admin-donations would entangle
 * code paths that we deliberately kept separate at the table /
 * tracing / reconciliation level. Keeping it in its own module
 * means donations admin stays decoupled from bazaar admin even
 * though the profile happens to read both.
 *
 * Linking model: a person is identified by their email. A row in
 * the `donors` table is the canonical identity (id, name, address,
 * Stripe customer id), and we cross-reference into bazaar_orders +
 * bazaar_inquiries by matching contact_email / customer_email
 * against the donor's email. People who have ONLY made bazaar
 * orders but no donations don't have a donors row and so don't
 * appear at /admin/donors/[id] — the existing order detail page is
 * their entry point.
 *
 * Fire posture: read-only fetches, no writes. Throws on hard DB
 * errors; callers (server components) treat throws as 500s and
 * never call from a path where one slow query blocks something
 * critical.
 */

import { getSupabaseAdmin } from "@/lib/supabase";
import { type AdminDonationRow } from "@/lib/admin-donations";
import {
  fetchDonationMessages,
  type DonationMessageRow,
} from "@/lib/donation-messages";
import {
  fetchBazaarOrderMessages,
  type BazaarOrderMessageRow,
} from "@/lib/bazaar-order-messages";
import { type BazaarInquiryRow } from "@/lib/bazaar-inquiries";
import { bazaarReceiptNumber } from "@/lib/bazaar-order-email";

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

export interface DonorProfile {
  id: string;
  email: string;
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  postcode: string | null;
  stripeCustomerId: string | null;
  /** When the donor row was first created in our DB. */
  firstSeenAt: string;
}

export interface DonorLifetimeStats {
  // ─── Donation side ───
  donationsCount: number;
  donationsTotalPence: number;
  /** Sum of reclaimable Gift Aid across all donations where it was
   *  claimed and the declaration isn't revoked. */
  donationsGiftAidPence: number;
  firstDonationAt: string | null;
  lastDonationAt: string | null;
  hasActiveRecurring: boolean;
  /** Sum of currently active monthly recurring subscriptions in
   *  pence-per-month. Sum because a donor might have multiple
   *  active subscriptions (rare but possible). */
  activeRecurringMonthlyPence: number;

  // ─── Bazaar side ───
  bazaarOrdersCount: number;
  bazaarOrdersTotalPence: number;
  firstBazaarOrderAt: string | null;
  lastBazaarOrderAt: string | null;

  // ─── Inquiries ───
  openInquiriesCount: number;
  totalInquiriesCount: number;

  /** True when the donor has given at least once but their last
   *  donation was more than 180 days ago AND they have no active
   *  recurring subscription. A signal for "send a re-engagement
   *  email" without needing the page render to call Date.now. */
  isLapsed: boolean;
}

/**
 * One event in the unified timeline. Discriminator `type` lets the
 * page render each row with the right icon + body + click-through.
 *
 * Sorted chronologically (newest first) by `at`.
 */
export type DonorTimelineEvent =
  | {
      type: "donation";
      at: string;
      donation: AdminDonationRow;
    }
  | {
      type: "donation_message";
      at: string;
      message: DonationMessageRow;
      /** Donation id this message was sent against — for the
       *  click-through. */
      donationId: string;
      /** Receipt number for display ("DR-DON-..."). */
      donationReceipt: string;
    }
  | {
      type: "bazaar_order";
      at: string;
      order: TimelineBazaarOrder;
    }
  | {
      type: "bazaar_order_message";
      at: string;
      message: BazaarOrderMessageRow;
      orderId: string;
      orderReceipt: string;
    }
  | {
      type: "bazaar_inquiry";
      at: string;
      inquiry: BazaarInquiryRow;
    };

export interface TimelineBazaarOrder {
  id: string;
  receiptNumber: string;
  status: string;
  totalPence: number;
  itemCount: number;
  createdAt: string;
  /** Timestamp of fulfilment (mark-shipped). Null while the order
   *  is in pending_payment / paid / cancelled / refunded states. */
  fulfilledAt: string | null;
  /** Delivered-status transition has no dedicated timestamp on the
   *  current schema (markOrderDelivered() flips status only). The
   *  bazaar_orders.status field is the source of truth — when it
   *  reads "delivered", you're past that transition. */
}

export interface FullDonorProfile {
  profile: DonorProfile;
  stats: DonorLifetimeStats;
  timeline: DonorTimelineEvent[];
}

// ─────────────────────────────────────────────────────────────────
// Loader
// ─────────────────────────────────────────────────────────────────

/**
 * Fetch the donor row + every related event keyed off their email.
 * Returns null if the donor id doesn't exist (callers should 404).
 *
 * Network shape: 4 parallel queries (donor row, donations,
 * donation messages, bazaar orders, bazaar inquiries) — first
 * needs the donor email so a small serial-then-parallel pattern.
 */
export async function fetchDonorProfile(
  donorId: string
): Promise<FullDonorProfile | null> {
  const supabase = getSupabaseAdmin();

  // Step 1: the donor row. We need the email to drive the bazaar
  // and inquiry lookups, so this can't run in parallel with them.
  const { data: donorRow, error: donorErr } = await supabase
    .from("donors")
    .select(
      "id, email, full_name, first_name, last_name, phone, address_line1, address_line2, city, postcode, stripe_customer_id, created_at"
    )
    .eq("id", donorId)
    .maybeSingle();

  if (donorErr) {
    throw new Error(`fetchDonorProfile donor query: ${donorErr.message}`);
  }
  if (!donorRow) return null;

  const profile: DonorProfile = {
    id: donorRow.id,
    email: donorRow.email,
    fullName: donorRow.full_name,
    firstName: donorRow.first_name,
    lastName: donorRow.last_name,
    phone: donorRow.phone,
    addressLine1: donorRow.address_line1,
    addressLine2: donorRow.address_line2,
    city: donorRow.city,
    postcode: donorRow.postcode,
    stripeCustomerId: donorRow.stripe_customer_id,
    firstSeenAt: donorRow.created_at,
  };

  // Step 2: parallel fetches keyed off the donor.
  //
  // - Donations: use the standard fetchAdminDonations with a donor
  //   filter rather than re-inventing. We use a wide limit because
  //   one donor's full history fits comfortably in a single page;
  //   admin-donations.ts caps the default at 200, which is fine
  //   for the visualised lifetime view.
  // - Donation messages: aggregated below from the per-donation
  //   results so we don't fan out N queries.
  // - Bazaar orders: by contact_email match.
  // - Bazaar inquiries: by customer_email match.
  const [donations, bazaarOrdersRaw, inquiries] = await Promise.all([
    fetchDonationsForDonor(donorId),
    fetchBazaarOrdersForEmail(profile.email),
    fetchInquiriesForEmail(profile.email),
  ]);

  // Step 3: donation messages — one query per donation. In
  // practice donor lifetimes have low dozens of donations max so
  // this is fine. If volume grows, batch via in().
  const donationMessages = await Promise.all(
    donations.map(async (d) => ({
      donation: d,
      messages: await fetchDonationMessages(d.id),
    }))
  );

  // Step 4: bazaar order messages — same per-order pattern.
  const orderMessages = await Promise.all(
    bazaarOrdersRaw.map(async (o) => ({
      order: o,
      messages: await fetchBazaarOrderMessages(o.id),
    }))
  );

  // Step 5: assemble stats.
  const stats = computeLifetimeStats({
    donations,
    bazaarOrders: bazaarOrdersRaw,
    inquiries,
  });

  // Step 6: build the unified timeline.
  const timeline = buildTimeline({
    donations,
    donationMessages,
    bazaarOrders: bazaarOrdersRaw,
    orderMessages,
    inquiries,
  });

  return { profile, stats, timeline };
}

// ─────────────────────────────────────────────────────────────────
// Per-source loaders
// ─────────────────────────────────────────────────────────────────

async function fetchDonationsForDonor(
  donorId: string
): Promise<AdminDonationRow[]> {
  // Reuse the existing donations fetcher but without filtering. We
  // need ALL statuses for the timeline (failed + refunded + pending
  // belong in the history just as much as succeeded). The library
  // doesn't expose a donor_id-only fetch path, so we go direct.
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("donations")
    .select(
      `
        id,
        amount_pence,
        currency,
        status,
        frequency,
        campaign,
        campaign_label,
        gift_aid_claimed,
        completed_at,
        created_at,
        stripe_payment_intent_id,
        stripe_setup_intent_id,
        stripe_customer_id,
        stripe_subscription_id,
        gclid,
        utm_source,
        utm_medium,
        utm_campaign,
        donors!inner ( id, email, full_name, first_name, last_name, address_line1, address_line2, city, postcode, phone, stripe_customer_id ),
        gift_aid_declaration:gift_aid_declarations ( revoked_at )
      `
    )
    .eq("donor_id", donorId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`fetchDonationsForDonor: ${error.message}`);
  }

  return (data ?? []).map((raw) =>
    mapDonationRowForTimeline(raw as RawDonationJoined)
  );
}

interface RawDonationJoined {
  id: string;
  amount_pence: number;
  status: string;
  frequency: string;
  campaign: string;
  campaign_label: string | null;
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

function mapDonationRowForTimeline(raw: RawDonationJoined): AdminDonationRow {
  const donor = singleJoin<{
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
  }>(raw.donors);
  const giftAid = singleJoin<{ revoked_at: string | null }>(
    raw.gift_aid_declaration
  );

  const giftAidReclaimable = raw.gift_aid_claimed
    ? Math.floor(raw.amount_pence * 0.25)
    : 0;

  return {
    id: raw.id,
    receiptNumber: `DR-DON-${raw.id.slice(-8).toUpperCase()}`,
    chargedAt: raw.completed_at,
    createdAt: raw.created_at,
    donorId: donor?.id ?? null,
    donorName:
      donor?.full_name ??
      [donor?.first_name, donor?.last_name].filter(Boolean).join(" ") ??
      donor?.email ??
      "Unknown",
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
    giftAidDeclarationRevoked: Boolean(giftAid?.revoked_at),
    campaign: raw.campaign,
    campaignLabel: raw.campaign_label ?? raw.campaign,
    frequency: raw.frequency as AdminDonationRow["frequency"],
    status: raw.status as AdminDonationRow["status"],
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

function singleJoin<T>(value: unknown): T | null {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) return (value[0] as T) ?? null;
  return value as T;
}

async function fetchInquiriesForEmail(
  email: string
): Promise<BazaarInquiryRow[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("bazaar_inquiries")
    .select(
      "id, status, customer_name, customer_email, subject, order_number_raw, order_id, last_message_at, assigned_to_email, created_at"
    )
    .eq("customer_email", email)
    .order("last_message_at", { ascending: false });
  if (error) {
    throw new Error(`fetchInquiriesForEmail: ${error.message}`);
  }
  return (data ?? []).map((r) => {
    const row = r as {
      id: string;
      status: string;
      customer_name: string;
      customer_email: string;
      subject: string;
      order_number_raw: string | null;
      order_id: string | null;
      last_message_at: string;
      assigned_to_email: string | null;
      created_at: string;
    };
    return {
      id: row.id,
      status: (row.status as BazaarInquiryRow["status"]) ?? "open",
      customerName: row.customer_name,
      customerEmail: row.customer_email,
      subject: row.subject,
      orderNumberRaw: row.order_number_raw,
      orderId: row.order_id,
      lastMessageAt: row.last_message_at,
      assignedToEmail: row.assigned_to_email,
      createdAt: row.created_at,
    };
  });
}

async function fetchBazaarOrdersForEmail(
  email: string
): Promise<TimelineBazaarOrder[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("bazaar_orders")
    .select(
      `id, status, total_pence, created_at, fulfilled_at,
       bazaar_order_items ( id )`
    )
    .eq("contact_email", email)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`fetchBazaarOrdersForEmail: ${error.message}`);
  }

  return (data ?? []).map((raw) => {
    const r = raw as {
      id: string;
      status: string;
      total_pence: number;
      created_at: string;
      fulfilled_at: string | null;
      bazaar_order_items: { id: string }[] | null;
    };
    return {
      id: r.id,
      receiptNumber: bazaarReceiptNumber(r.id),
      status: r.status,
      totalPence: r.total_pence,
      itemCount: r.bazaar_order_items?.length ?? 0,
      createdAt: r.created_at,
      fulfilledAt: r.fulfilled_at,
    };
  });
}

// ─────────────────────────────────────────────────────────────────
// Stats + timeline assembly
// ─────────────────────────────────────────────────────────────────

function computeLifetimeStats(input: {
  donations: AdminDonationRow[];
  bazaarOrders: TimelineBazaarOrder[];
  inquiries: BazaarInquiryRow[];
}): DonorLifetimeStats {
  // Donations: include only succeeded for the lifetime sum (failed
  // / refunded / pending shouldn't count toward "total given") but
  // include all statuses in the count so the donor sees the full
  // history.
  const succeeded = input.donations.filter((d) => d.status === "succeeded");
  const refunded = input.donations.filter((d) => d.status === "refunded");
  const donationsTotalPence = succeeded.reduce(
    (sum, d) => sum + d.amountPence,
    0
  );
  const donationsGiftAidPence = succeeded
    .filter((d) => d.giftAidClaimed && !d.giftAidDeclarationRevoked)
    .reduce((sum, d) => sum + d.giftAidReclaimablePence, 0);

  // Active recurring: monthly + has a non-null subscription id + isn't
  // refunded. A donor might have multiple active subscriptions (rare
  // but possible — e.g. one for £20 to Palestine + one for £10 to
  // Cancer Care). Sum those.
  const activeRecurring = succeeded.filter(
    (d) => d.frequency === "monthly" && d.stripeSubscriptionId !== null
  );
  // Deduplicate by subscription id — multiple monthly donations
  // sharing one subscription only count once.
  const uniqueSubs = new Map<string, AdminDonationRow>();
  for (const d of activeRecurring) {
    if (d.stripeSubscriptionId) {
      const existing = uniqueSubs.get(d.stripeSubscriptionId);
      // Use the most recent donation per subscription as the
      // canonical "current monthly amount".
      if (
        !existing ||
        new Date(d.chargedAt ?? d.createdAt).getTime() >
          new Date(existing.chargedAt ?? existing.createdAt).getTime()
      ) {
        uniqueSubs.set(d.stripeSubscriptionId, d);
      }
    }
  }
  const activeRecurringMonthlyPence = Array.from(uniqueSubs.values()).reduce(
    (sum, d) => sum + d.amountPence,
    0
  );

  // First / last dates use chargedAt where available (the moment
  // the donation actually completed), falling back to createdAt
  // for pending rows where there's no chargedAt yet.
  const donationDates = succeeded
    .map((d) => d.chargedAt ?? d.createdAt)
    .filter((s): s is string => Boolean(s))
    .sort();

  // Bazaar.
  const succeededOrders = input.bazaarOrders.filter(
    (o) =>
      o.status === "paid" ||
      o.status === "fulfilled" ||
      o.status === "delivered"
  );
  const bazaarTotal = succeededOrders.reduce(
    (sum, o) => sum + o.totalPence,
    0
  );
  const orderDates = succeededOrders.map((o) => o.createdAt).sort();

  // Inquiries.
  const openInquiries = input.inquiries.filter((i) => i.status === "open");

  const lastDonationAt = donationDates[donationDates.length - 1] ?? null;
  // "Lapsed" = at least one historical donation, no active recurring,
  // last gift over 180 days ago. Computed here (server-side, at fetch
  // time) so the page component stays pure — calling Date.now() in
  // JSX trips a React purity lint warning and would also make the
  // component non-deterministic per render.
  const LAPSED_THRESHOLD_MS = 180 * 24 * 60 * 60 * 1000;
  const isLapsed =
    succeeded.length > 0 &&
    uniqueSubs.size === 0 &&
    lastDonationAt !== null &&
    Date.now() - new Date(lastDonationAt).getTime() > LAPSED_THRESHOLD_MS;

  return {
    donationsCount: succeeded.length + refunded.length,
    donationsTotalPence,
    donationsGiftAidPence,
    firstDonationAt: donationDates[0] ?? null,
    lastDonationAt,
    hasActiveRecurring: uniqueSubs.size > 0,
    activeRecurringMonthlyPence,
    bazaarOrdersCount: succeededOrders.length,
    bazaarOrdersTotalPence: bazaarTotal,
    firstBazaarOrderAt: orderDates[0] ?? null,
    lastBazaarOrderAt: orderDates[orderDates.length - 1] ?? null,
    openInquiriesCount: openInquiries.length,
    totalInquiriesCount: input.inquiries.length,
    isLapsed,
  };
}

function buildTimeline(input: {
  donations: AdminDonationRow[];
  donationMessages: { donation: AdminDonationRow; messages: DonationMessageRow[] }[];
  bazaarOrders: TimelineBazaarOrder[];
  orderMessages: {
    order: TimelineBazaarOrder;
    messages: BazaarOrderMessageRow[];
  }[];
  inquiries: BazaarInquiryRow[];
}): DonorTimelineEvent[] {
  const events: DonorTimelineEvent[] = [];

  for (const donation of input.donations) {
    events.push({
      type: "donation",
      at: donation.chargedAt ?? donation.createdAt,
      donation,
    });
  }
  for (const { donation, messages } of input.donationMessages) {
    for (const message of messages) {
      events.push({
        type: "donation_message",
        at: message.createdAt,
        message,
        donationId: donation.id,
        donationReceipt: donation.receiptNumber,
      });
    }
  }
  for (const order of input.bazaarOrders) {
    events.push({
      type: "bazaar_order",
      at: order.createdAt,
      order,
    });
  }
  for (const { order, messages } of input.orderMessages) {
    for (const message of messages) {
      events.push({
        type: "bazaar_order_message",
        at: message.createdAt,
        message,
        orderId: order.id,
        orderReceipt: order.receiptNumber,
      });
    }
  }
  for (const inquiry of input.inquiries) {
    events.push({
      type: "bazaar_inquiry",
      at: inquiry.createdAt,
      inquiry,
    });
  }

  // Newest first.
  events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  return events;
}

// ─────────────────────────────────────────────────────────────────
// Reverse lookup: find donor by email
// ─────────────────────────────────────────────────────────────────

/**
 * Resolve an email to a donor id. Used by the "View profile" links
 * on donation list rows, which have the email but not the donor
 * uuid handy.
 */
export async function findDonorIdByEmail(
  email: string
): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("donors")
    .select("id")
    .eq("email", email.toLowerCase().trim())
    .maybeSingle();
  if (error) {
    console.error("[donor-profile] findDonorIdByEmail:", error.message);
    return null;
  }
  return data?.id ?? null;
}
