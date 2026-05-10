import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminSession } from "@/lib/admin-session";
import {
  cardBrandLabel,
  fetchAdminRecurring,
  type AdminRecurringStatus,
} from "@/lib/admin-recurring";
import { formatAdminDateOnly } from "@/lib/admin-donations";
import { formatPence } from "@/lib/bazaar-format";

export const metadata: Metadata = {
  title: "Recurring donations | Deen Relief Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<AdminRecurringStatus, string> = {
  active: "bg-green/10 text-green-dark border-green/30",
  trialing: "bg-green/10 text-green-dark border-green/30",
  past_due: "bg-amber-light text-amber-dark border-amber/30",
  incomplete: "bg-amber-light text-amber-dark border-amber/30",
  unpaid: "bg-red-50 text-red-700 border-red-200",
  paused: "bg-charcoal/8 text-charcoal/60 border-charcoal/15",
  incomplete_expired: "bg-charcoal/8 text-charcoal/60 border-charcoal/15",
  canceled: "bg-charcoal/8 text-charcoal/60 border-charcoal/15",
};

const STATUS_LABEL: Record<AdminRecurringStatus, string> = {
  active: "active",
  trialing: "trialing",
  past_due: "past due",
  incomplete: "incomplete",
  unpaid: "unpaid",
  paused: "paused",
  incomplete_expired: "expired",
  canceled: "cancelled",
};

/**
 * Recurring donations admin — wired to real Supabase + Stripe data.
 *
 * Data flow:
 *   1. Pull all succeeded live-mode donations with stripe_subscription_id
 *      from Supabase
 *   2. Group by subscription, aggregate lifetime totals
 *   3. Enrich each with Stripe API for current status + next charge +
 *      card details (parallel via Promise.all)
 *
 * Tables: split into "active" (status active/trialing/past_due/etc.)
 * and "cancelled" so trustees can scan recently-lost donors quickly
 * without active-table noise.
 */
export default async function AdminRecurringPage() {
  await requireAdminSession();
  const rows = await fetchAdminRecurring();

  const active = rows.filter((r) =>
    ["active", "trialing", "past_due", "incomplete", "unpaid", "paused"].includes(
      r.status
    )
  );
  const cancelled = rows.filter((r) =>
    ["canceled", "incomplete_expired"].includes(r.status)
  );
  const pastDue = rows.filter((r) => r.status === "past_due");
  const monthlyRevenuePence = active
    .filter((r) => r.status === "active" || r.status === "trialing")
    .reduce((s, r) => s + r.amountPerCyclePence, 0);
  const lifetimeCollectedPence = rows.reduce(
    (s, r) => s + r.totalCollectedPence,
    0
  );

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="block text-[11px] font-bold tracking-[0.15em] uppercase text-amber-dark mb-1">
            Recurring income
          </span>
          <h1 className="text-charcoal font-heading font-bold text-2xl sm:text-3xl">
            Recurring donations
          </h1>
        </div>
        <button
          type="button"
          className="px-4 py-2 rounded-full bg-white border border-charcoal/15 text-charcoal text-sm font-medium hover:bg-charcoal/5 transition-colors"
        >
          Export CSV
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: "Active subscriptions",
            value: active.filter((r) => r.status === "active" || r.status === "trialing").length.toString(),
            sub: "donors giving monthly",
            accent: true,
          },
          {
            label: "Monthly recurring",
            value: formatPence(monthlyRevenuePence),
            sub: "committed every month",
          },
          {
            label: "Lifetime collected",
            value: formatPence(lifetimeCollectedPence),
            sub: "all subscriptions, all time",
          },
          {
            label: "Past due",
            value: pastDue.length.toString(),
            sub:
              pastDue.length === 0
                ? "nothing needs attention"
                : "needs follow-up",
          },
        ].map((s) => (
          <div
            key={s.label}
            className={`bg-white border rounded-2xl p-5 ${s.accent ? "border-amber/40" : "border-charcoal/10"}`}
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-1.5">
              {s.label}
            </p>
            <p className="text-2xl sm:text-3xl font-heading font-bold text-charcoal mb-0.5 leading-tight">
              {s.value}
            </p>
            <p className="text-[12px] text-charcoal/50">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Active subscriptions */}
      <section className="mb-8">
        <h2 className="text-charcoal font-heading font-semibold text-lg mb-3">
          Active ({active.length})
        </h2>
        {active.length === 0 ? (
          <div className="bg-white border border-charcoal/10 rounded-2xl p-8 text-center text-charcoal/50 text-sm">
            No active recurring subscriptions yet. New monthly donors
            will appear here within seconds of their first charge.
          </div>
        ) : (
          <div className="bg-white border border-charcoal/10 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-cream border-b border-charcoal/10">
                  <tr className="text-left">
                    {[
                      "Donor",
                      "Campaign",
                      "Amount / month",
                      "Started",
                      "Next charge",
                      "Lifetime",
                      "Card",
                      "Status",
                      "",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-4 sm:px-5 py-3 font-bold uppercase tracking-[0.1em] text-charcoal/60 text-[11px] whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-charcoal/8">
                  {active.map((sub) => (
                    <tr
                      key={sub.id}
                      className="hover:bg-cream/50 transition-colors"
                    >
                      <td className="px-4 sm:px-5 py-4">
                        <div className="text-charcoal font-medium">
                          {sub.donorName}
                        </div>
                        <div className="text-charcoal/50 text-xs">
                          {sub.donorEmail}
                        </div>
                      </td>
                      <td className="px-4 sm:px-5 py-4 text-charcoal/80">
                        {sub.campaignLabel}
                      </td>
                      <td className="px-4 sm:px-5 py-4 text-charcoal font-medium whitespace-nowrap">
                        {formatPence(sub.amountPerCyclePence)}
                      </td>
                      <td className="px-4 sm:px-5 py-4 text-charcoal/70 whitespace-nowrap">
                        {formatAdminDateOnly(sub.startedAt)}
                      </td>
                      <td className="px-4 sm:px-5 py-4 text-charcoal/70 whitespace-nowrap">
                        {sub.nextChargeAt
                          ? formatAdminDateOnly(sub.nextChargeAt)
                          : "—"}
                      </td>
                      <td className="px-4 sm:px-5 py-4 text-charcoal/80 whitespace-nowrap">
                        <span className="font-medium">
                          {formatPence(sub.totalCollectedPence)}
                        </span>
                        <span className="block text-[11px] text-charcoal/50">
                          {sub.totalChargesCount} charges
                        </span>
                      </td>
                      <td className="px-4 sm:px-5 py-4 text-charcoal/70 whitespace-nowrap text-[12px]">
                        {sub.cardLast4
                          ? `${cardBrandLabel(sub.cardBrand)} ····${sub.cardLast4}`
                          : "—"}
                      </td>
                      <td className="px-4 sm:px-5 py-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium uppercase tracking-wider border ${STATUS_STYLES[sub.status]}`}
                        >
                          {STATUS_LABEL[sub.status]}
                        </span>
                      </td>
                      <td className="px-4 sm:px-5 py-4 text-right">
                        <Link
                          href={`/admin/recurring/${sub.id}`}
                          className="text-green text-sm font-medium hover:underline whitespace-nowrap"
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
        )}
      </section>

      {/* Cancelled */}
      {cancelled.length > 0 && (
        <section>
          <h2 className="text-charcoal/70 font-heading font-semibold text-lg mb-3">
            Cancelled ({cancelled.length})
          </h2>
          <div className="bg-white border border-charcoal/10 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-cream border-b border-charcoal/10">
                  <tr className="text-left">
                    {[
                      "Donor",
                      "Campaign",
                      "Lifetime",
                      "Started",
                      "Cancelled",
                      "",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-4 sm:px-5 py-3 font-bold uppercase tracking-[0.1em] text-charcoal/60 text-[11px] whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-charcoal/8">
                  {cancelled.map((sub) => (
                    <tr
                      key={sub.id}
                      className="hover:bg-cream/50 transition-colors text-charcoal/70"
                    >
                      <td className="px-4 sm:px-5 py-4">
                        <div className="font-medium">{sub.donorName}</div>
                        <div className="text-charcoal/50 text-xs">
                          {sub.donorEmail}
                        </div>
                      </td>
                      <td className="px-4 sm:px-5 py-4">{sub.campaignLabel}</td>
                      <td className="px-4 sm:px-5 py-4 whitespace-nowrap">
                        {formatPence(sub.totalCollectedPence)} ·{" "}
                        {sub.totalChargesCount} charges
                      </td>
                      <td className="px-4 sm:px-5 py-4 whitespace-nowrap">
                        {formatAdminDateOnly(sub.startedAt)}
                      </td>
                      <td className="px-4 sm:px-5 py-4 whitespace-nowrap">
                        {sub.canceledAt
                          ? formatAdminDateOnly(sub.canceledAt)
                          : "—"}
                      </td>
                      <td className="px-4 sm:px-5 py-4 text-right">
                        <Link
                          href={`/admin/recurring/${sub.id}`}
                          className="text-green text-sm font-medium hover:underline whitespace-nowrap"
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
        </section>
      )}
    </main>
  );
}
