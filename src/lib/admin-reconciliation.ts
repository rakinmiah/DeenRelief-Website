/**
 * Reconciliation: combined donations + bazaar trading income.
 *
 * The deliverable the client and accountant agreed on when we
 * decided to trade through the existing charity Stripe account
 * under HMRC's small-trading exemption (Path A).
 *
 * Why "reconciliation" lives here, separately from
 * admin-donations.ts and bazaar-db.ts:
 *   - It joins data from BOTH revenue streams under one normalised
 *     row shape, so the page table + CSV export render the same
 *     way regardless of source.
 *   - It is the only place in the codebase that knows "donations
 *     and bazaar orders coexist". Every other module is single-
 *     responsibility for one stream.
 *   - When the bazaar eventually moves into its own trading
 *     subsidiary (Path B), this module is the file that disappears
 *     and gets replaced with separate per-stream reports.
 *
 * Pence everywhere. No GBP floats. Formatting at the display
 * boundary only.
 */

import { getSupabaseAdmin } from "@/lib/supabase";
import type { BazaarOrderRow } from "@/lib/bazaar-db";

/**
 * A single reconcilable transaction. The same shape covers both
 * a donation and a bazaar order — the `type` discriminator tells
 * the accountant (and the CSV reader) which revenue stream this
 * belongs to.
 */
export interface ReconciliationRow {
  type: "donation" | "bazaar";
  /** UUID of the underlying donation / bazaar_orders row. */
  id: string;
  /** Human-readable receipt number — DR-DON-XXXXXXXX or DR-BZR-XXXXXXXX. */
  receiptNumber: string;
  /** ISO timestamp of the money-landed event. */
  date: string;
  /** Best-available customer name. */
  customerName: string;
  customerEmail: string;
  /** Amount in pence. For donations this is the donor's gift only
   *  (Gift Aid reclaim is a separate revenue line). For bazaar
   *  this is the full total paid (subtotal + shipping). */
  amountPence: number;
  /** Donation campaign label, or null for bazaar orders. */
  campaign: string | null;
  /** Free-text status — "succeeded" / "refunded" for donations;
   *  "paid" / "fulfilled" / "delivered" / "refunded" for bazaar. */
  status: string;
  /** Stripe PaymentIntent id when known. Used for cross-check
   *  against the Stripe Dashboard. Null for SetupIntent-only
   *  monthly donation rows that haven't yet had their first
   *  charge. */
  stripePaymentIntent: string | null;
  /** True if this row counts as positive income (succeeded /
   *  paid / fulfilled / delivered); false if it's a reversal
   *  (refunded). Lets the page render refunds in a different
   *  colour and exclude them from "gross income" tiles. */
  isIncome: boolean;
}

export interface ReconciliationFilters {
  /** ISO date YYYY-MM-DD, inclusive lower bound. */
  from?: string;
  /** ISO date YYYY-MM-DD, inclusive upper bound. */
  to?: string;
  /** Restrict to one stream. Empty = both. */
  type?: "donation" | "bazaar";
  /**
   * Restrict to one slice of the income/refunds split:
   *   - "income"  → only positive money-received rows
   *   - "refunds" → only reversed rows
   *   - undefined → both (default)
   *
   * Set by the stat tile clicks so the table snaps to the slice
   * the trustee just tapped. Independent of `type` so "Refunds"
   * tile can show refunds across both streams.
   */
  subset?: "income" | "refunds";
}

/** Convert a UUID to the DR-DON-XXXXXXXX human reference. */
function donationReceiptNumber(donationId: string): string {
  return `DR-DON-${donationId.replace(/-/g, "").slice(-8).toUpperCase()}`;
}
function bazaarReceiptNumber(orderId: string): string {
  return `DR-BZR-${orderId.replace(/-/g, "").slice(-8).toUpperCase()}`;
}

/**
 * Pull rows from both tables, normalise, merge, sort.
 *
 * Visibility rules:
 *   - Production: livemode=true on both tables.
 *   - Dev / preview: include test rows too. Accountant won't run
 *     CSV exports against dev, and on Vercel preview deploys this
 *     is the same env-based gate we use elsewhere in the admin.
 *
 * Date filter applies to:
 *   - donations.completed_at for donations (money-landed timestamp)
 *   - bazaar_orders.created_at for bazaar (close enough to the
 *     Stripe charge moment — within seconds)
 *
 * Status filter:
 *   - donations: succeeded + refunded (the financially-relevant
 *     ones; pending/failed are noise in a reconciliation report)
 *   - bazaar: paid + fulfilled + delivered + refunded (every
 *     state that represents money received or reversed)
 */
export async function fetchReconciliationRows(
  filters: ReconciliationFilters = {}
): Promise<ReconciliationRow[]> {
  const supabase = getSupabaseAdmin();
  const includeTestMode = process.env.NODE_ENV !== "production";

  const fromIso = filters.from ? `${filters.from}T00:00:00Z` : undefined;
  // Inclusive upper bound: rows up to the end of the "to" day.
  const toIso = filters.to
    ? new Date(
        new Date(`${filters.to}T00:00:00Z`).getTime() + 24 * 60 * 60 * 1000
      ).toISOString()
    : undefined;

  // ── Donations ─────────────────────────────────────────────
  const donationRows: ReconciliationRow[] = [];
  if (filters.type !== "bazaar") {
    let q = supabase
      .from("donations")
      .select(
        `id, amount_pence, campaign_label, status, completed_at, created_at,
         livemode, stripe_payment_intent_id,
         donors(first_name, last_name, email)`
      )
      .in("status", ["succeeded", "refunded"])
      .order("completed_at", { ascending: false, nullsFirst: false })
      .limit(2000);

    if (!includeTestMode) q = q.eq("livemode", true);
    if (fromIso) q = q.gte("completed_at", fromIso);
    if (toIso) q = q.lt("completed_at", toIso);

    const { data, error } = await q;
    if (error) {
      throw new Error(`reconciliation donations fetch failed: ${error.message}`);
    }

    for (const r of data ?? []) {
      // PostgREST may give donors as object or array — normalise.
      const rawDonor = r.donors as unknown;
      const donor = (
        Array.isArray(rawDonor) ? rawDonor[0] : rawDonor
      ) as
        | { first_name?: string; last_name?: string; email?: string }
        | undefined;
      const name = donor
        ? `${donor.first_name ?? ""} ${donor.last_name ?? ""}`.trim() || "—"
        : "—";
      donationRows.push({
        type: "donation",
        id: r.id as string,
        receiptNumber: donationReceiptNumber(r.id as string),
        // completed_at is the money-landed moment; fall back to
        // created_at for rare rows where completed_at is null.
        date: (r.completed_at as string) ?? (r.created_at as string),
        customerName: name,
        customerEmail: donor?.email ?? "",
        amountPence: r.amount_pence as number,
        campaign: (r.campaign_label as string) ?? null,
        status: r.status as string,
        stripePaymentIntent:
          (r.stripe_payment_intent_id as string | null) ?? null,
        isIncome: r.status === "succeeded",
      });
    }
  }

  // ── Bazaar orders ─────────────────────────────────────────
  const bazaarRows: ReconciliationRow[] = [];
  if (filters.type !== "donation") {
    let q = supabase
      .from("bazaar_orders")
      .select(
        "id, status, total_pence, shipping_address, contact_email, created_at, livemode, stripe_payment_intent"
      )
      .in("status", ["paid", "fulfilled", "delivered", "refunded"])
      .order("created_at", { ascending: false })
      .limit(2000);

    if (!includeTestMode) q = q.eq("livemode", true);
    if (fromIso) q = q.gte("created_at", fromIso);
    if (toIso) q = q.lt("created_at", toIso);

    type RawBazaarRecRow = {
      id: string;
      status: BazaarOrderRow["status"];
      total_pence: number;
      shipping_address: { name?: string } | null;
      contact_email: string;
      created_at: string;
      livemode: boolean;
      stripe_payment_intent: string | null;
    };
    const { data, error } = await q.returns<RawBazaarRecRow[]>();
    if (error) {
      throw new Error(
        `reconciliation bazaar fetch failed: ${error.message}`
      );
    }

    for (const r of data ?? []) {
      const name = r.shipping_address?.name ?? "—";
      bazaarRows.push({
        type: "bazaar",
        id: r.id,
        receiptNumber: bazaarReceiptNumber(r.id),
        date: r.created_at,
        customerName: name,
        customerEmail: r.contact_email,
        amountPence: r.total_pence,
        campaign: null,
        status: r.status,
        stripePaymentIntent: r.stripe_payment_intent,
        isIncome: r.status !== "refunded",
      });
    }
  }

  // Merge + sort by date DESC.
  //
  // We DON'T apply filters.subset here. The page renders tile
  // totals from the full date+type row set, then narrows the
  // table display via applySubsetFilter() — so the tiles always
  // reflect the period's true picture and never become £0
  // because the trustee tapped "Refunds".
  const all = [...donationRows, ...bazaarRows];
  all.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return all;
}

/**
 * Filter a row set by the income/refunds slice. Pure function so
 * the page and the CSV route apply the same logic.
 */
export function applySubsetFilter(
  rows: ReconciliationRow[],
  subset: ReconciliationFilters["subset"]
): ReconciliationRow[] {
  if (subset === "income") return rows.filter((r) => r.isIncome);
  if (subset === "refunds") return rows.filter((r) => !r.isIncome);
  return rows;
}

/**
 * Roll a row set up into the three headline tile values. Calculated
 * in-app from the same row set the table renders so the page never
 * shows "tiles say one thing, table shows another".
 *
 * "Gross" means before refunds. Refunds are a separate line because
 * the accountant typically treats them as a contra-entry, not a
 * subtraction from gross income — depends on the accounting policy
 * but both views are derivable from the CSV.
 */
export interface ReconciliationTotals {
  donationIncomePence: number;
  donationCount: number;
  bazaarIncomePence: number;
  bazaarCount: number;
  refundsPence: number;
  refundsCount: number;
}

export function rollupReconciliation(
  rows: ReconciliationRow[]
): ReconciliationTotals {
  let donationIncomePence = 0;
  let donationCount = 0;
  let bazaarIncomePence = 0;
  let bazaarCount = 0;
  let refundsPence = 0;
  let refundsCount = 0;

  for (const r of rows) {
    if (!r.isIncome) {
      refundsPence += r.amountPence;
      refundsCount += 1;
      continue;
    }
    if (r.type === "donation") {
      donationIncomePence += r.amountPence;
      donationCount += 1;
    } else {
      bazaarIncomePence += r.amountPence;
      bazaarCount += 1;
    }
  }

  return {
    donationIncomePence,
    donationCount,
    bazaarIncomePence,
    bazaarCount,
    refundsPence,
    refundsCount,
  };
}

/**
 * Default date range for the page when none is in the URL.
 * Current calendar month from the 1st through today. Calendar
 * months are what most accountants use for monthly close, and
 * "1st through today" is the at-a-glance current-period view.
 *
 * Note this runs on the server at request time. The
 * react-hooks/purity rule doesn't fire because this helper is
 * called from inside a Server Component, not a hook.
 */
export function defaultReconciliationDateRange(): {
  from: string;
  to: string;
} {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const day = now.getUTCDate();
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    from: `${year}-${pad(month + 1)}-01`,
    to: `${year}-${pad(month + 1)}-${pad(day)}`,
  };
}
