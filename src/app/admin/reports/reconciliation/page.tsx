import type { Metadata } from "next";
import Link from "next/link";
import { requireRoleAdmin } from "@/lib/admin-session";
import {
  applySubsetFilter,
  defaultReconciliationDateRange,
  fetchReconciliationRows,
  rollupReconciliation,
  type ReconciliationFilters,
} from "@/lib/admin-reconciliation";
import { formatPence } from "@/lib/bazaar-format";
import { formatAdminDate } from "@/lib/admin-donations";
import { cn } from "@/lib/cn";
import {
  Button,
  PageHeader,
  ResponsiveTable,
  EmptyState,
  type Column,
} from "@/components/admin/ui";
import ReconciliationFiltersClient from "./ReconciliationFiltersClient";

export const metadata: Metadata = {
  title: "Reconciliation | Deen Relief Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type ReconRow = Awaited<ReturnType<typeof fetchReconciliationRows>>[number];

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
  await requireRoleAdmin();
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

  const columns: Column<ReconRow>[] = [
    {
      key: "date",
      header: "Date",
      cell: (r) => formatAdminDate(r.date),
      cellClassName: "whitespace-nowrap text-charcoal/70",
    },
    {
      key: "type",
      header: "Type",
      cell: (r) => (
        <span
          className={cn(
            "inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-[0.1em] border",
            r.type === "donation"
              ? "bg-green/10 text-green-dark border-green/30"
              : "bg-amber-light text-amber-dark border-amber/30"
          )}
        >
          {r.type === "donation" ? "Donation" : "Bazaar"}
        </span>
      ),
    },
    {
      key: "reference",
      header: "Reference",
      primary: true,
      cell: (r) => (
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
      ),
    },
    {
      key: "customer",
      header: "Customer",
      cell: (r) => (
        <div>
          <div className="text-charcoal text-[13px]">{r.customerName}</div>
          <div className="text-charcoal/50 text-[11px] break-all">{r.customerEmail}</div>
        </div>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      secondary: true,
      cell: (r) => (
        <span
          className={cn(
            "font-semibold whitespace-nowrap tabular-nums",
            r.isIncome ? "text-charcoal" : "text-red-700"
          )}
        >
          {r.isIncome ? "" : "−"}
          {formatPence(r.amountPence)}
        </span>
      ),
    },
    {
      key: "campaign",
      header: "Campaign",
      cell: (r) => (
        <span className="text-charcoal/70 text-[12px]">{r.campaign ?? "—"}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (r) => (
        <span className="text-charcoal/70 text-[12px] capitalize">
          {r.status.replace(/_/g, " ")}
        </span>
      ),
    },
    {
      key: "stripePi",
      header: "Stripe PI",
      hideOnMobile: true,
      cell: (r) => (
        <span className="font-mono text-[11px] text-charcoal/50 break-all">
          {r.stripePaymentIntent ?? "—"}
        </span>
      ),
    },
  ];

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <PageHeader
        backHref="/admin/reports"
        backLabel="All reports"
        title="Reconciliation"
        description="Donation income and bazaar trading income side by side, in one report. Pick a date range, then export the CSV for the accountant's ledger."
        actions={
          <Button href={exportHref} prefetch={false} size="sm">
            Export CSV
          </Button>
        }
      />

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
      <ResponsiveTable<ReconRow>
        rows={rows}
        getRowKey={(r) => `${r.type}-${r.id}`}
        rowClassName={(r) => (!r.isIncome ? "bg-red-50/30" : undefined)}
        columns={columns}
        empty={<EmptyState title="No transactions in this range" />}
      />

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
