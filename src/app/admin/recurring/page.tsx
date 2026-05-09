import type { Metadata } from "next";
import Link from "next/link";
import {
  PLACEHOLDER_RECURRING,
  formatAdminDateOnly,
} from "@/lib/admin-placeholder";
import { formatPence } from "@/lib/bazaar-format";

export const metadata: Metadata = {
  title: "Recurring donations | Deen Relief Admin",
  robots: { index: false, follow: false },
};

const STATUS_STYLES = {
  active: "bg-green/10 text-green-dark border-green/30",
  past_due: "bg-amber-light text-amber-dark border-amber/30",
  cancelled: "bg-charcoal/8 text-charcoal/60 border-charcoal/15",
};

const CARD_BRAND_LABEL = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "Amex",
};

/**
 * Recurring donations list.
 *
 * Why this is a separate route from /admin/donations: a recurring
 * subscription has lifecycle that one-time donations don't (started_at,
 * cancelled_at, next_charge_at, total_charges_count). Trustees ask
 * different questions about subscriptions ("how many active sponsors?"
 * "how many cancelled this month?") than they do about individual
 * donation rows.
 *
 * The most common admin actions on this surface:
 *   - See active recurring donor count (top stat)
 *   - Find a specific donor's subscription to cancel on request
 *   - See how much committed monthly revenue exists
 *   - Spot subscriptions that have failed payment retries (past_due)
 */
export default function AdminRecurringPage() {
  const active = PLACEHOLDER_RECURRING.filter((r) => r.status === "active");
  const cancelled = PLACEHOLDER_RECURRING.filter(
    (r) => r.status === "cancelled"
  );
  const pastDue = PLACEHOLDER_RECURRING.filter((r) => r.status === "past_due");
  const monthlyRevenuePence = active.reduce(
    (s, r) => s + r.amountPerCyclePence,
    0
  );
  const lifetimeCollectedPence = PLACEHOLDER_RECURRING.reduce(
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

      {/* Stats strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: "Active subscriptions",
            value: active.length.toString(),
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
            sub: pastDue.length === 0 ? "nothing needs attention" : "needs follow-up",
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

      {/* Active subscriptions table */}
      <section className="mb-8">
        <h2 className="text-charcoal font-heading font-semibold text-lg mb-3">
          Active ({active.length})
        </h2>
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
                      {CARD_BRAND_LABEL[sub.cardBrand]} ····{sub.cardLast4}
                    </td>
                    <td className="px-4 sm:px-5 py-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium uppercase tracking-wider border ${STATUS_STYLES[sub.status]}`}
                      >
                        {sub.status}
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
                        {sub.cancelledAt &&
                          formatAdminDateOnly(sub.cancelledAt)}
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

      <div className="mt-8 p-5 bg-amber-light border border-amber/30 rounded-2xl text-sm text-charcoal/80 leading-relaxed">
        <span className="block text-[10px] font-bold uppercase tracking-[0.15em] text-amber-dark mb-1">
          Pitch preview
        </span>
        Mockup data, no real subscriptions. Production version reads
        from Supabase + Stripe Subscriptions API, filters on status, and
        the &quot;Open&quot; action lets a trustee cancel a subscription
        on a donor&apos;s request without leaving the admin (writes to
        Stripe, syncs status, sends a cancellation-confirmation email).
      </div>
    </main>
  );
}
