import type { Metadata } from "next";
import Link from "next/link";
import { requireRoleAdmin } from "@/lib/admin-session";
import {
  countAdminBazaarOrdersByStatus,
  fetchAdminBazaarOrders,
  type AdminBazaarOrderFilters,
  type BazaarOrderRow,
} from "@/lib/bazaar-db";
import { bazaarReceiptNumber } from "@/lib/bazaar-order-email";
import {
  BAZAAR_SERVICE_SHORT_LABEL,
  deriveServiceFromShippingPence,
  formatPence,
} from "@/lib/bazaar-format";
import { formatAdminDate } from "@/lib/admin-donations";
import { resolveStatus } from "@/lib/admin-status";
import PullToRefresh from "@/components/admin/PullToRefresh";
import {
  Button,
  PageHeader,
  StatusBadge,
  ResponsiveTable,
  EmptyState,
  type Column,
} from "@/components/admin/ui";
import BazaarOrdersFilters from "./BazaarOrdersFilters";

/** Row shape returned by fetchAdminBazaarOrders. */
type OrderListRow = { order: BazaarOrderRow; itemCount: number };

export const metadata: Metadata = {
  title: "Orders | Bazaar Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const VALID_STATUSES: BazaarOrderRow["status"][] = [
  "pending_payment",
  "paid",
  "fulfilled",
  "delivered",
  "refunded",
  "cancelled",
];

/**
 * Parse the URL search params into an AdminBazaarOrderFilters shape.
 * Defensive: any unrecognised status string is dropped silently
 * rather than erroring, so a bookmark with old filter values keeps
 * working as the status enum evolves.
 */
function parseFilters(
  raw: Record<string, string | string[] | undefined>
): AdminBazaarOrderFilters {
  const statusParam = Array.isArray(raw.status) ? raw.status[0] : raw.status;
  const fromParam = Array.isArray(raw.from) ? raw.from[0] : raw.from;
  const toParam = Array.isArray(raw.to) ? raw.to[0] : raw.to;
  const qParam = Array.isArray(raw.q) ? raw.q[0] : raw.q;

  const statuses = (statusParam ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is BazaarOrderRow["status"] =>
      (VALID_STATUSES as string[]).includes(s)
    );

  return {
    status: statuses.length > 0 ? statuses : undefined,
    from: fromParam && /^\d{4}-\d{2}-\d{2}$/.test(fromParam) ? fromParam : undefined,
    to: toParam && /^\d{4}-\d{2}-\d{2}$/.test(toParam) ? toParam : undefined,
    q: qParam?.trim() || undefined,
  };
}

/**
 * Admin bazaar orders list.
 *
 * Stats strip is a 4-tile navigation aid: each tile is a clickable
 * link that filters the table below to that subset. Counts come
 * from a separate count-by-status query so the tile values are
 * always the full inbox totals, not the current filtered view.
 *
 * Filter sidebar (BazaarOrdersFilters) drives the table via URL
 * params — status multi-select, date range, customer search. Active
 * filters show as a small chip bar above the table with a Clear
 * link so the user always knows which subset they're looking at.
 *
 * Service column displays the Royal Mail tier the customer chose
 * at Stripe Checkout (derived from the order's shipping_pence,
 * which Stripe sets to the chosen rate's amount). Lets the
 * fulfiller pick the right label without opening the detail page.
 */
export default async function AdminBazaarOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRoleAdmin();
  const params = await searchParams;
  const filters = parseFilters(params);

  // Two parallel queries: counts-by-status (always unfiltered, drives
  // the stat tiles) and the filtered list (drives the table).
  const [counts, rows] = await Promise.all([
    countAdminBazaarOrdersByStatus(),
    fetchAdminBazaarOrders({ filters }),
  ]);

  const awaitingCount = counts.paid ?? 0;
  const inTransitCount = counts.fulfilled ?? 0;
  const deliveredCount = counts.delivered ?? 0;
  const refundedCount = counts.refunded ?? 0;

  // Stat tile config — each click sets ONLY the status filter so
  // the trustee can drill in fresh from any other filter state.
  const tiles: {
    label: string;
    value: number;
    status: BazaarOrderRow["status"];
    accent?: boolean;
  }[] = [
    { label: "Awaiting fulfilment", value: awaitingCount, status: "paid", accent: true },
    { label: "Shipped, in transit", value: inTransitCount, status: "fulfilled" },
    { label: "Delivered", value: deliveredCount, status: "delivered" },
    { label: "Refunds", value: refundedCount, status: "refunded" },
  ];

  const hasActiveFilters =
    (filters.status && filters.status.length > 0) ||
    filters.from ||
    filters.to ||
    filters.q;

  const justDeleted = params.deleted === "1";

  // Column definitions drive both the desktop table and the mobile
  // cards. `order` (receipt #) is the primary link column; `total` is
  // pulled up beside it on mobile.
  const orderColumns: Column<OrderListRow>[] = [
    {
      key: "order",
      header: "Order",
      primary: true,
      cell: ({ order }) => (
        <span className="inline-flex items-center gap-2 flex-wrap">
          <span className="font-mono text-xs text-charcoal">
            {bazaarReceiptNumber(order.id)}
          </span>
          {!order.livemode && (
            <span
              title="Stripe test-mode order — created by a developer, no real money moved"
              className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-[0.1em] bg-amber-dark/15 text-amber-dark border border-amber-dark/30"
            >
              Test
            </span>
          )}
        </span>
      ),
    },
    {
      key: "placed",
      header: "Placed",
      cell: ({ order }) => formatAdminDate(order.createdAt),
      cellClassName: "whitespace-nowrap text-charcoal/70",
    },
    {
      key: "customer",
      header: "Customer",
      cell: ({ order }) => (
        <div>
          <div className="text-charcoal font-medium">
            {order.shippingAddress?.name ?? "—"}
          </div>
          <div className="text-charcoal/50 text-xs break-all">
            {order.contactEmail || "—"}
          </div>
        </div>
      ),
    },
    {
      key: "items",
      header: "Items",
      cell: ({ itemCount }) => itemCount,
      cellClassName: "text-charcoal/70",
    },
    {
      key: "total",
      header: "Total",
      align: "right",
      secondary: true,
      cell: ({ order }) => (
        <span className="text-charcoal font-semibold whitespace-nowrap">
          {formatPence(order.totalPence)}
        </span>
      ),
    },
    {
      key: "service",
      header: "Service",
      cell: ({ order }) => {
        const svc = deriveServiceFromShippingPence(order.shippingPence);
        if (!svc) return <span className="text-charcoal/40 text-[12px]">—</span>;
        return (
          <span className="text-charcoal/80 text-[12px]">
            {BAZAAR_SERVICE_SHORT_LABEL[svc]}
            {order.shippingPence === 0 && (
              <span className="block text-[10px] text-green-dark font-semibold">Free</span>
            )}
          </span>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      cell: ({ order }) => (
        <StatusBadge domain="bazaarOrder" status={order.status} variant="outline" />
      ),
    },
  ];

  return (
    <PullToRefresh>
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {justDeleted && (
        <p className="mb-6 px-4 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          Order deleted. Stock was restored if it had been debited.
          The audit log keeps a permanent record of what was removed.
        </p>
      )}
      <PageHeader
        eyebrow="Bazaar"
        title="Orders"
        description="Tap a tile to jump straight to that subset. Newest first."
        actions={
          <Button
            href="/api/admin/bazaar/export-click-and-drop"
            prefetch={false}
            variant="outline"
            size="sm"
          >
            Export Click &amp; Drop CSV
          </Button>
        }
      />

      {/* Stats strip — each tile is clickable */}
      <div className="grid sm:grid-cols-4 gap-4 mb-8">
        {tiles.map((tile) => {
          const isActive =
            filters.status?.length === 1 && filters.status[0] === tile.status;
          return (
            <Link
              key={tile.status}
              href={`/admin/bazaar/orders?status=${tile.status}`}
              className={`bg-white border rounded-2xl p-5 transition-all hover:shadow-md hover:-translate-y-0.5 ${
                isActive
                  ? "border-charcoal/40 shadow-md"
                  : tile.accent
                    ? "border-amber/40"
                    : "border-charcoal/10"
              }`}
            >
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-1">
                {tile.label}
              </p>
              <p className="text-3xl font-heading font-bold text-charcoal">
                {tile.value}
              </p>
              {isActive && (
                <p className="text-[10px] text-charcoal/50 mt-1.5 uppercase tracking-[0.1em] font-bold">
                  ← Showing
                </p>
              )}
            </Link>
          );
        })}
      </div>

      {/* Filter form */}
      <BazaarOrdersFilters />

      {/* Active filter chips */}
      {hasActiveFilters && (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-charcoal/60 font-medium">Filtering by:</span>
          {filters.status?.map((s) => (
            <span
              key={s}
              className="inline-block px-2.5 py-1 rounded-full bg-charcoal/8 text-charcoal border border-charcoal/15"
            >
              {resolveStatus("bazaarOrder", s).label}
            </span>
          ))}
          {filters.from && (
            <span className="inline-block px-2.5 py-1 rounded-full bg-charcoal/8 text-charcoal border border-charcoal/15">
              from {filters.from}
            </span>
          )}
          {filters.to && (
            <span className="inline-block px-2.5 py-1 rounded-full bg-charcoal/8 text-charcoal border border-charcoal/15">
              to {filters.to}
            </span>
          )}
          {filters.q && (
            <span className="inline-block px-2.5 py-1 rounded-full bg-charcoal/8 text-charcoal border border-charcoal/15">
              &ldquo;{filters.q}&rdquo;
            </span>
          )}
          <Link
            href="/admin/bazaar/orders"
            className="text-green underline ml-1 hover:text-green-dark"
          >
            Clear all
          </Link>
        </div>
      )}

      {/* One definition → desktop table on md+, stacked cards below. */}
      <ResponsiveTable<OrderListRow>
        rows={rows}
        getRowKey={(r) => r.order.id}
        rowHref={(r) => `/admin/bazaar/orders/${r.order.id}`}
        rowLabel={(r) => `Order ${bazaarReceiptNumber(r.order.id)}`}
        columns={orderColumns}
        empty={
          <EmptyState
            title={hasActiveFilters ? "No matching orders" : "No orders yet"}
            description={
              hasActiveFilters
                ? "No orders match these filters."
                : "The first checkout will appear here."
            }
          />
        }
      />

      {rows.length > 0 && (
        <p className="mt-4 text-[11px] text-charcoal/40">
          Showing {rows.length} order{rows.length === 1 ? "" : "s"}
          {hasActiveFilters ? " matching the current filter" : ""}.
          {process.env.NODE_ENV !== "production" &&
            " Test-mode orders are included in development."}
        </p>
      )}
    </main>
    </PullToRefresh>
  );
}

