import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminSession } from "@/lib/admin-session";
import {
  applySubsetFilter,
  defaultReconciliationDateRange,
  fetchReconciliationRows,
  rollupReconciliation,
  type ReconciliationFilters,
} from "@/lib/admin-reconciliation";
import { formatPence } from "@/lib/bazaar-format";
import { formatAdminDate } from "@/lib/admin-donations";
import ReconciliationFiltersClient from "./ReconciliationFiltersClient";

export const metadata: Metadata = {
  title: "Reconciliation | Deen Relief Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Reconciliation report — combined donations + bazaar trading
 * income with a Type column.
 *
 * The deliverable agreed with the accountant when we decided to
 * trade through the existing charity Stripe account under HMRC's
 * small-trading exemption. Single page shows:
 *   - Donation income (succeeded donations in range)
 *   - Bazaar trading income (paid/fulfilled/delivered orders in
 *     range)
 *   - Refunds (across both streams)
 *   - One row per transaction, sortable by date, with Type pill,
 *     Stripe PI for cross-check, customer name + email
 *
 * Date defaults to current calendar month (1st through today) —
 * the typical monthly-close window an accountant operates in. URL
 * params override (?from=YYYY-MM-DD&to=YYYY-MM-DD&type=...).
 *
 * Export CSV button passes the active filters through so what
 * the trustee sees on screen is exactly what they download.
 */
export default async function AdminReconciliationPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminSession();
  const params = await searchParams;
  const fromParam = Array.isArray(params.from) ? params.from[0] : params.from;
  const toParam = Array.isArray(params.to) ? params.to[0] : params.to;
  const typeParam = Array.isArray(params.type) ? params.type[0] : params.type;
  const subsetParam = Array.isArray(params.subset)
    ? params.subset[0]
    : params.subset;

  const defaults = defaultReconciliationDateRange();
  const filters: ReconciliationFilters = {
    from:
      fromParam && /^\d{4}-\d{2}-\d{2}$/.test(fromParam)
        ? fromParam
        : defaults.from,
    to:
      toParam && /^\d{4}-\d{2}-\d{2}$/.test(toParam) ? toParam : defaults.to,
    type:
      typeParam === "donation" || typeParam === "bazaar" ? typeParam : undefined,
    subset:
      subsetParam === "income" || subsetParam === "refunds"
        ? subsetParam
        : undefined,
  };

  // Fetch the FULL row set (no subset applied) for the tile totals,
  // then narrow to the subset only for table render. That keeps tile
  // values stable as the user taps between cards.
  const allRows = await fetchReconciliationRows(filters);
  const totals = rollupReconciliation(allRows);
  const rows = applySubsetFilter(allRows, filters.subset);

  // Build the export CSV link with the same filter params so what
  // the trustee sees on screen matches what they download.
  const exportQs = new URLSearchParams();
  if (filters.from) exportQs.set("from", filters.from);
  if (filters.to) exportQs.set("to", filters.to);
  if (filters.type) exportQs.set("type", filters.type);
  if (filters.subset) exportQs.set("subset", filters.subset);
  const exportHref = `/api/admin/export-reconciliation?${exportQs.toString()}`;

  // Build the tile click-through URLs. Tiles snap to a slice of
  // the current date range — they DON'T drop date filters, so the
  // trustee can "look at refunds in May" without re-picking dates.
  function tileHref(tile: {
    type?: "donation" | "bazaar";
    subset: "income" | "refunds";
  }): string {
    const q = new URLSearchParams();
    if (filters.from) q.set("from", filters.from);
    if (filters.to) q.set("to", filters.to);
    if (tile.type) q.set("type", tile.type);
    q.set("subset", tile.subset);
    return `/admin/reports/reconciliation?${q.toString()}`;
  }

  // A tile is "active" when the URL filter matches its slice.
  const donationTileActive =
    filters.type === "donation" && filters.subset === "income";
  const bazaarTileActive =
    filters.type === "bazaar" && filters.subset === "income";
  const refundsTileActive =
    filters.subset === "refunds" && !filters.type;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page header */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link
            href="/admin/reports"
            className="text-charcoal/60 hover:text-charcoal text-xs uppercase tracking-[0.1em] font-bold transition-colors"
          >
            ← All reports
          </Link>
          <h1 className="text-charcoal font-heading font-bold text-2xl sm:text-3xl mt-1">
            Reconciliation
          </h1>
          <p className="text-grey text-sm mt-2 max-w-2xl">
            Donation income and bazaar trading income side by side, in
            one report. Pick a date range, then export the CSV for the
            accountant&apos;s ledger.
          </p>
        </div>
        <a
          href={exportHref}
          className="px-4 py-2 rounded-full bg-charcoal text-white text-sm font-semibold hover:bg-charcoal/90 transition-colors whitespace-nowrap"
        >
          Export CSV
        </a>
      </div>

      {/* Stats strip — each tile is a clickable filter shortcut */}
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <Link
          href={tileHref({ type: "donation", subset: "income" })}
          className={`bg-white border rounded-2xl p-5 transition-all hover:shadow-md hover:-translate-y-0.5 ${
            donationTileActive
              ? "border-green/60 shadow-md"
              : "border-green/30"
          }`}
        >
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-green-dark mb-1">
            Donation income
          </p>
          <p className="text-3xl font-heading font-bold text-charcoal">
            {formatPence(totals.donationIncomePence)}
          </p>
          <p className="text-[12px] text-charcoal/50 mt-1">
            {totals.donationCount} succeeded donation
            {totals.donationCount === 1 ? "" : "s"}
          </p>
          {donationTileActive && (
            <p className="text-[10px] text-charcoal/50 mt-1.5 uppercase tracking-[0.1em] font-bold">
              ← Showing
            </p>
          )}
        </Link>

        <Link
          href={tileHref({ type: "bazaar", subset: "income" })}
          className={`bg-white border rounded-2xl p-5 transition-all hover:shadow-md hover:-translate-y-0.5 ${
            bazaarTileActive
              ? "border-amber/60 shadow-md"
              : "border-amber/40"
          }`}
        >
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-amber-dark mb-1">
            Bazaar trading income
          </p>
          <p className="text-3xl font-heading font-bold text-charcoal">
            {formatPence(totals.bazaarIncomePence)}
          </p>
          <p className="text-[12px] text-charcoal/50 mt-1">
            {totals.bazaarCount} paid order
            {totals.bazaarCount === 1 ? "" : "s"}
          </p>
          {bazaarTileActive && (
            <p className="text-[10px] text-charcoal/50 mt-1.5 uppercase tracking-[0.1em] font-bold">
              ← Showing
            </p>
          )}
        </Link>

        <Link
          href={tileHref({ subset: "refunds" })}
          className={`bg-white border rounded-2xl p-5 transition-all hover:shadow-md hover:-translate-y-0.5 ${
            refundsTileActive
              ? "border-red-400 shadow-md"
              : "border-red-200"
          }`}
        >
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-red-700 mb-1">
            Refunds (contra)
          </p>
          <p className="text-3xl font-heading font-bold text-charcoal">
            {formatPence(totals.refundsPence)}
          </p>
          <p className="text-[12px] text-charcoal/50 mt-1">
            {totals.refundsCount} reversed transaction
            {totals.refundsCount === 1 ? "" : "s"}
          </p>
          {refundsTileActive && (
            <p className="text-[10px] text-charcoal/50 mt-1.5 uppercase tracking-[0.1em] font-bold">
              ← Showing
            </p>
          )}
        </Link>
      </div>

      {/* "Clear card filter" affordance — visible only when a tile
          is active. Returns to the unfiltered table while keeping
          the date range intact. */}
      {(donationTileActive || bazaarTileActive || refundsTileActive) && (
        <div className="mb-3 text-[12px]">
          <Link
            href={(() => {
              const q = new URLSearchParams();
              if (filters.from) q.set("from", filters.from);
              if (filters.to) q.set("to", filters.to);
              return q.toString().length > 0
                ? `/admin/reports/reconciliation?${q.toString()}`
                : "/admin/reports/reconciliation";
            })()}
            className="text-green underline hover:text-green-dark"
          >
            ← Show all transactions in range
          </Link>
        </div>
      )}

      {/* Filter form */}
      <ReconciliationFiltersClient />

      {/* Range label */}
      <p className="text-[12px] text-charcoal/60 mb-3">
        Showing transactions from <strong>{filters.from}</strong> to{" "}
        <strong>{filters.to}</strong>
        {filters.type === "donation"
          ? " · donations only"
          : filters.type === "bazaar"
            ? " · bazaar only"
            : " · both revenue streams"}
        {filters.subset === "income"
          ? " · income only"
          : filters.subset === "refunds"
            ? " · refunds only"
            : ""}
        .
      </p>

      {/* Table */}
      <div className="bg-white border border-charcoal/10 rounded-2xl overflow-hidden">
        {rows.length === 0 ? (
          <div className="p-12 text-center text-charcoal/60 text-sm">
            No transactions in this range.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[920px]">
              <thead className="bg-cream border-b border-charcoal/10">
                <tr className="text-left">
                  {[
                    "Date",
                    "Type",
                    "Reference",
                    "Customer",
                    "Amount",
                    "Campaign",
                    "Status",
                    "Stripe PI",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3 font-bold uppercase tracking-[0.1em] text-charcoal/60 text-[11px] whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-charcoal/8">
                {rows.map((r) => (
                  <tr
                    key={`${r.type}-${r.id}`}
                    className={`hover:bg-cream/50 transition-colors ${
                      !r.isIncome ? "bg-red-50/30" : ""
                    }`}
                  >
                    <td className="px-5 py-3 text-charcoal/70 whitespace-nowrap">
                      {formatAdminDate(r.date)}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-[0.1em] border ${
                          r.type === "donation"
                            ? "bg-green/10 text-green-dark border-green/30"
                            : "bg-amber-light text-amber-dark border-amber/30"
                        }`}
                      >
                        {r.type === "donation" ? "Donation" : "Bazaar"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <Link
                        href={
                          r.type === "donation"
                            ? `/admin/donations/${r.id}`
                            : `/admin/bazaar/orders/${r.id}`
                        }
                        className="font-mono text-xs text-green hover:underline"
                      >
                        {r.receiptNumber}
                      </Link>
                    </td>
                    <td className="px-5 py-3">
                      <div className="text-charcoal text-[13px]">
                        {r.customerName}
                      </div>
                      <div className="text-charcoal/50 text-[11px] break-all">
                        {r.customerEmail}
                      </div>
                    </td>
                    <td
                      className={`px-5 py-3 font-medium whitespace-nowrap tabular-nums ${
                        r.isIncome ? "text-charcoal" : "text-red-700"
                      }`}
                    >
                      {r.isIncome ? "" : "−"}
                      {formatPence(r.amountPence)}
                    </td>
                    <td className="px-5 py-3 text-charcoal/70 text-[12px]">
                      {r.campaign ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-charcoal/70 text-[12px] capitalize">
                      {r.status.replace(/_/g, " ")}
                    </td>
                    <td className="px-5 py-3 font-mono text-[11px] text-charcoal/50 break-all">
                      {r.stripePaymentIntent ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {rows.length > 0 && (
        <p className="mt-4 text-[11px] text-charcoal/40">
          {rows.length} transaction{rows.length === 1 ? "" : "s"} shown.
          {process.env.NODE_ENV !== "production" &&
            " Test-mode rows are included in development."}
        </p>
      )}
    </main>
  );
}
