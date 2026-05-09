import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Orders | Bazaar Admin",
  robots: { index: false, follow: false },
};

/**
 * Admin fulfillment dashboard.
 *
 * Auth: in production this is gated behind Supabase Auth + an
 * `is_admin = true` claim. For the mockup it's an open route —
 * but unindexed via robots metadata so it doesn't leak via search.
 *
 * Workflow this dashboard supports:
 *   1. Daily/weekly: open this page, see new "paid" orders
 *   2. Click into each order to see line items + shipping address
 *   3. Pack the order, drop the maker tag in
 *   4. Generate a Royal Mail Tracked 48 label via Click & Drop
 *      (manual; export the orders as CSV and bulk-upload to Click & Drop)
 *   5. Click "Mark as shipped" with the tracking number → triggers
 *      the shipping confirmation email to the customer
 *   6. (Optional) Click "Refund" on cancelled / returned orders
 *
 * The mockup populates with three illustrative orders so the client
 * can see the UI. Real implementation reads from Supabase.
 */

const MOCK_ORDERS = [
  {
    id: "DR-BZR-A4F2K9X1",
    placedAt: "2026-05-09 14:23",
    customer: "Aisha Hussain",
    email: "aisha.h@example.co.uk",
    itemCount: 2,
    totalPence: 11800,
    status: "paid" as const,
  },
  {
    id: "DR-BZR-B8N3M7L2",
    placedAt: "2026-05-09 11:08",
    customer: "Yusuf Rahman",
    email: "yusuf.rahman@example.com",
    itemCount: 1,
    totalPence: 6900,
    status: "paid" as const,
  },
  {
    id: "DR-BZR-C2P9Q4R7",
    placedAt: "2026-05-08 18:42",
    customer: "Khadija Ali",
    email: "k.ali@example.co.uk",
    itemCount: 3,
    totalPence: 14500,
    status: "fulfilled" as const,
  },
  {
    id: "DR-BZR-D5T1U6V8",
    placedAt: "2026-05-07 09:15",
    customer: "Mehmet Kaya",
    email: "mkaya@example.com",
    itemCount: 1,
    totalPence: 4500,
    status: "delivered" as const,
  },
];

const STATUS_STYLES: Record<string, string> = {
  paid: "bg-amber-light text-amber-dark border-amber/30",
  fulfilled: "bg-blue-50 text-blue-800 border-blue-200",
  delivered: "bg-green/10 text-green-dark border-green/30",
  refunded: "bg-grey/10 text-grey border-grey/30",
};

function formatPence(pence: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(pence / 100);
}

export default function AdminBazaarOrdersPage() {
  const pendingCount = MOCK_ORDERS.filter((o) => o.status === "paid").length;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page header — admin chrome (header nav, sign-out) is provided
          by the shared AdminShell in /admin/layout.tsx. */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="block text-[11px] font-bold tracking-[0.15em] uppercase text-amber-dark mb-1">
            Bazaar
          </span>
          <h1 className="text-charcoal font-heading font-bold text-2xl sm:text-3xl">
            Orders
          </h1>
        </div>
        <button
          type="button"
          className="px-4 py-2 rounded-full bg-white border border-charcoal/15 text-charcoal text-sm font-medium hover:bg-charcoal/5 transition-colors"
        >
          Export CSV for Click &amp; Drop
        </button>
      </div>
        {/* Stats strip */}
        <div className="grid sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Awaiting fulfilment", value: pendingCount, accent: true },
            {
              label: "Shipped, in transit",
              value: MOCK_ORDERS.filter((o) => o.status === "fulfilled").length,
            },
            {
              label: "Delivered (last 7d)",
              value: MOCK_ORDERS.filter((o) => o.status === "delivered").length,
            },
            { label: "Refunds (last 7d)", value: 0 },
          ].map((s) => (
            <div
              key={s.label}
              className={`bg-white border rounded-2xl p-5 ${s.accent ? "border-amber/40" : "border-charcoal/10"}`}
            >
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-1">
                {s.label}
              </p>
              <p className="text-3xl font-heading font-bold text-charcoal">
                {s.value}
              </p>
            </div>
          ))}
        </div>

        {/* Order table */}
        <div className="bg-white border border-charcoal/10 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-cream border-b border-charcoal/10">
                <tr className="text-left">
                  <th className="px-5 py-3 font-bold uppercase tracking-[0.1em] text-charcoal/60 text-[11px]">
                    Order
                  </th>
                  <th className="px-5 py-3 font-bold uppercase tracking-[0.1em] text-charcoal/60 text-[11px]">
                    Placed
                  </th>
                  <th className="px-5 py-3 font-bold uppercase tracking-[0.1em] text-charcoal/60 text-[11px]">
                    Customer
                  </th>
                  <th className="px-5 py-3 font-bold uppercase tracking-[0.1em] text-charcoal/60 text-[11px]">
                    Items
                  </th>
                  <th className="px-5 py-3 font-bold uppercase tracking-[0.1em] text-charcoal/60 text-[11px]">
                    Total
                  </th>
                  <th className="px-5 py-3 font-bold uppercase tracking-[0.1em] text-charcoal/60 text-[11px]">
                    Status
                  </th>
                  <th className="px-5 py-3 font-bold uppercase tracking-[0.1em] text-charcoal/60 text-[11px]" />
                </tr>
              </thead>
              <tbody className="divide-y divide-charcoal/8">
                {MOCK_ORDERS.map((order) => (
                  <tr key={order.id} className="hover:bg-cream/50 transition-colors">
                    <td className="px-5 py-4">
                      <span className="font-mono text-xs text-charcoal">
                        {order.id}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-charcoal/70">
                      {order.placedAt}
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-charcoal font-medium">
                        {order.customer}
                      </div>
                      <div className="text-charcoal/50 text-xs">
                        {order.email}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-charcoal/70">
                      {order.itemCount}
                    </td>
                    <td className="px-5 py-4 text-charcoal font-medium">
                      {formatPence(order.totalPence)}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium uppercase tracking-wider border ${STATUS_STYLES[order.status]}`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/admin/bazaar/orders/${order.id}`}
                        className="text-green text-sm font-medium hover:underline"
                      >
                        Open →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pitch-mode banner */}
        <div className="mt-8 p-5 bg-amber-light border border-amber/30 rounded-2xl text-sm text-charcoal/80 leading-relaxed">
          <span className="block text-[10px] font-bold uppercase tracking-[0.15em] text-amber-dark mb-1">
            Pitch preview
          </span>
          Mockup data, no real orders. Real implementation reads from
          Supabase, gates behind admin auth, and the &quot;Export CSV&quot;
          button generates a Royal Mail Click &amp; Drop import file
          (one row per pending order with destination address, weight, and
          service tier).
        </div>
    </main>
  );
}
