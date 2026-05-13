import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminSession } from "@/lib/admin-session";
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
import BazaarOrdersFilters from "./BazaarOrdersFilters";

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
  await requireAdminSession();
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

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {justDeleted && (
        <p className="mb-6 px-4 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          Order deleted. Stock was restored if it had been debited.
          The audit log keeps a permanent record of what was removed.
        </p>
      )}
      {/* Page header */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="block text-[11px] font-bold tracking-[0.15em] uppercase text-amber-dark mb-1">
            Bazaar
          </span>
          <h1 className="text-charcoal font-heading font-bold text-2xl sm:text-3xl">
            Orders
          </h1>
          <p className="text-grey text-sm mt-2 max-w-2xl">
            Tap a tile to jump straight to that subset. Newest first.
          </p>
        </div>
        <a
          href="/api/admin/bazaar/export-click-and-drop"
          title="Download a Royal Mail Click & Drop CSV of every order currently awaiting fulfilment."
          className="px-4 py-2 rounded-full bg-white border border-charcoal/15 text-charcoal text-sm font-medium hover:bg-cream transition-colors whitespace-nowrap"
        >
          Export Click &amp; Drop CSV
        </a>
      </div>

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
              {STATUS_LABEL[s]}
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

      {/* Order table */}
      <div className="bg-white border border-charcoal/10 rounded-2xl overflow-hidden">
        {rows.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-charcoal/60 text-sm">
              {hasActiveFilters
                ? "No orders match these filters."
                : "No orders yet. The first checkout will appear here."}
            </p>
          </div>
        ) : (
          <>
          {/* Mobile card list (<md). Each row becomes a tap-target
              card with the order's most important signal — total +
              status — surfaced above receipt#/customer/service. The
              desktop table below stays unchanged. */}
          <ul className="md:hidden divide-y divide-charcoal/8">
            {rows.map(({ order, itemCount }) => {
              const chosenService = deriveServiceFromShippingPence(order.shippingPence);
              const receiptNum = bazaarReceiptNumber(order.id);
              return (
                <li key={order.id}>
                  <Link
                    href={`/admin/bazaar/orders/${order.id}`}
                    className="block px-4 py-4 active:bg-cream/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <p className="font-mono text-[11px] text-charcoal/60">
                        {receiptNum}
                      </p>
                      <p className="text-charcoal font-heading font-semibold text-base whitespace-nowrap">
                        {formatPence(order.totalPence)}
                      </p>
                    </div>
                    <p className="text-charcoal text-sm font-medium truncate">
                      {order.shippingAddress?.name ?? order.contactEmail ?? "—"}
                    </p>
                    <p className="text-charcoal/50 text-[12px] mt-0.5">
                      {formatAdminDate(order.createdAt)} · {itemCount}{" "}
                      {itemCount === 1 ? "item" : "items"}
                      {chosenService && (
                        <>
                          {" · "}
                          {BAZAAR_SERVICE_SHORT_LABEL[chosenService]}
                        </>
                      )}
                    </p>
                    <div className="mt-2">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider border ${STATUS_STYLES[order.status]}`}
                      >
                        {STATUS_LABEL[order.status]}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm min-w-[860px]">
              <thead className="bg-cream border-b border-charcoal/10">
                <tr className="text-left">
                  {[
                    "Order",
                    "Placed",
                    "Customer",
                    "Items",
                    "Total",
                    "Service",
                    "Status",
                    "",
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
                {rows.map(({ order, itemCount }) => (
                  <BazaarOrderRowView
                    key={order.id}
                    order={order}
                    itemCount={itemCount}
                  />
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>

      {rows.length > 0 && (
        <p className="mt-4 text-[11px] text-charcoal/40">
          Showing {rows.length} order{rows.length === 1 ? "" : "s"}
          {hasActiveFilters ? " matching the current filter" : ""}.
          {process.env.NODE_ENV !== "production" &&
            " Test-mode orders are included in development."}
        </p>
      )}
    </main>
  );
}

const STATUS_STYLES: Record<BazaarOrderRow["status"], string> = {
  pending_payment: "bg-charcoal/8 text-charcoal/60 border-charcoal/15",
  paid: "bg-amber-light text-amber-dark border-amber/30",
  fulfilled: "bg-blue-50 text-blue-800 border-blue-200",
  delivered: "bg-green/10 text-green-dark border-green/30",
  refunded: "bg-red-50 text-red-700 border-red-200",
  cancelled: "bg-charcoal/8 text-charcoal/60 border-charcoal/15",
  abandoned: "bg-charcoal/8 text-charcoal/40 border-charcoal/10",
};

const STATUS_LABEL: Record<BazaarOrderRow["status"], string> = {
  pending_payment: "Pending",
  paid: "Paid",
  fulfilled: "Shipped",
  delivered: "Delivered",
  refunded: "Refunded",
  cancelled: "Cancelled",
  abandoned: "Abandoned",
};

function BazaarOrderRowView({
  order,
  itemCount,
}: {
  order: BazaarOrderRow;
  itemCount: number;
}) {
  const customerName = order.shippingAddress?.name ?? "—";
  const chosenService = deriveServiceFromShippingPence(order.shippingPence);
  return (
    <tr className="hover:bg-cream/50 transition-colors">
      <td className="px-5 py-4">
        <div className="flex items-center gap-2 flex-wrap">
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
        </div>
      </td>
      <td className="px-5 py-4 text-charcoal/70 whitespace-nowrap">
        {formatAdminDate(order.createdAt)}
      </td>
      <td className="px-5 py-4">
        <div className="text-charcoal font-medium">{customerName}</div>
        <div className="text-charcoal/50 text-xs break-all">
          {order.contactEmail || "—"}
        </div>
      </td>
      <td className="px-5 py-4 text-charcoal/70">{itemCount}</td>
      <td className="px-5 py-4 text-charcoal font-medium whitespace-nowrap">
        {formatPence(order.totalPence)}
      </td>
      <td className="px-5 py-4 whitespace-nowrap">
        {chosenService ? (
          <span className="text-charcoal/80 text-[12px]">
            {BAZAAR_SERVICE_SHORT_LABEL[chosenService]}
            {order.shippingPence === 0 && (
              <span className="block text-[10px] text-green-dark font-semibold">
                Free
              </span>
            )}
          </span>
        ) : (
          <span className="text-charcoal/40 text-[12px]">—</span>
        )}
      </td>
      <td className="px-5 py-4">
        <span
          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium uppercase tracking-wider border ${STATUS_STYLES[order.status]}`}
        >
          {STATUS_LABEL[order.status]}
        </span>
      </td>
      <td className="px-5 py-4 text-right whitespace-nowrap">
        <Link
          href={`/admin/bazaar/orders/${order.id}`}
          className="text-green text-sm font-medium hover:underline"
        >
          Open →
        </Link>
      </td>
    </tr>
  );
}
