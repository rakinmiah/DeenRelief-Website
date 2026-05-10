import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminSession } from "@/lib/admin-session";
import {
  fetchFailedDonations,
  formatAdminDate,
} from "@/lib/admin-donations";
import {
  cardBrandLabel,
  fetchAdminRecurring,
} from "@/lib/admin-recurring";
import { formatPence } from "@/lib/bazaar-format";

export const metadata: Metadata = {
  title: "Failed payments | Deen Relief Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Failed payments report.
 *
 * Two distinct sources surfaced together:
 *   1. One-time donations with status='failed' — donor's card
 *      declined at attempt time. Trustees follow up by email/phone
 *      to offer help completing the donation.
 *   2. Recurring subscriptions in past_due / unpaid / incomplete /
 *      incomplete_expired status — the latest renewal charge failed
 *      and Stripe is in its retry cycle (or has given up). Trustees
 *      follow up before the donor lapses.
 *
 * Both filtered to livemode=true. Both sorted newest first.
 */
export default async function AdminFailedPaymentsPage() {
  await requireAdminSession();

  const [failedDonations, allRecurring] = await Promise.all([
    fetchFailedDonations(50),
    fetchAdminRecurring(),
  ]);

  const pastDueRecurring = allRecurring.filter((r) =>
    ["past_due", "unpaid", "incomplete", "incomplete_expired"].includes(r.status)
  );

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <Link
          href="/admin/reports"
          className="inline-block text-charcoal/60 hover:text-charcoal text-xs uppercase tracking-[0.1em] font-bold transition-colors mb-2"
        >
          ← Reports
        </Link>
        <span className="block text-[11px] font-bold tracking-[0.15em] uppercase text-amber-dark mb-1">
          Operations
        </span>
        <h1 className="text-charcoal font-heading font-bold text-2xl sm:text-3xl">
          Failed payments
        </h1>
        <p className="text-grey text-sm mt-2 max-w-2xl">
          Donations and recurring renewals where the donor&apos;s card
          declined. Most common cause is an expired card or insufficient
          funds. A friendly email or call usually recovers the donation.
        </p>
      </div>

      {/* Stats strip */}
      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        <div
          className={`bg-white border rounded-2xl p-5 ${failedDonations.length > 0 ? "border-amber/40" : "border-charcoal/10"}`}
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-1.5">
            Failed one-time donations
          </p>
          <p className="text-2xl sm:text-3xl font-heading font-bold text-charcoal mb-0.5 leading-tight">
            {failedDonations.length}
          </p>
          <p className="text-[12px] text-charcoal/50">
            {failedDonations.length === 0
              ? "nothing to follow up"
              : "needs trustee attention"}
          </p>
        </div>
        <div
          className={`bg-white border rounded-2xl p-5 ${pastDueRecurring.length > 0 ? "border-amber/40" : "border-charcoal/10"}`}
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-1.5">
            Recurring · past due / failed renewal
          </p>
          <p className="text-2xl sm:text-3xl font-heading font-bold text-charcoal mb-0.5 leading-tight">
            {pastDueRecurring.length}
          </p>
          <p className="text-[12px] text-charcoal/50">
            {pastDueRecurring.length === 0
              ? "all subscriptions healthy"
              : "renewal retry in progress"}
          </p>
        </div>
      </div>

      {/* Failed one-time donations table */}
      <section className="mb-8">
        <h2 className="text-charcoal font-heading font-semibold text-lg mb-3">
          One-time donations ({failedDonations.length})
        </h2>
        <div className="bg-white border border-charcoal/10 rounded-2xl overflow-hidden">
          {failedDonations.length === 0 ? (
            <div className="p-8 text-center text-charcoal/50 text-sm">
              No failed one-time donations. New failures will appear here
              within seconds of Stripe declining a charge.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-cream border-b border-charcoal/10">
                  <tr className="text-left">
                    {[
                      "Attempted",
                      "Donor",
                      "Campaign",
                      "Amount",
                      "Receipt",
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
                  {failedDonations.map((d) => (
                    <tr
                      key={d.id}
                      className="hover:bg-cream/50 transition-colors"
                    >
                      <td className="px-4 sm:px-5 py-4 text-charcoal/70 whitespace-nowrap">
                        {formatAdminDate(d.createdAt)}
                      </td>
                      <td className="px-4 sm:px-5 py-4">
                        <div className="text-charcoal font-medium">
                          {d.donorName}
                        </div>
                        <div className="text-charcoal/50 text-xs">
                          <a
                            href={`mailto:${d.donorEmail}`}
                            className="hover:underline"
                          >
                            {d.donorEmail}
                          </a>
                        </div>
                      </td>
                      <td className="px-4 sm:px-5 py-4 text-charcoal/80">
                        {d.campaignLabel}
                      </td>
                      <td className="px-4 sm:px-5 py-4 text-charcoal font-medium whitespace-nowrap">
                        {formatPence(d.amountPence)}
                      </td>
                      <td className="px-4 sm:px-5 py-4 font-mono text-[11px] text-charcoal/60">
                        {d.receiptNumber}
                      </td>
                      <td className="px-4 sm:px-5 py-4 text-right">
                        <Link
                          href={`/admin/donations/${d.id}`}
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
          )}
        </div>
      </section>

      {/* Past-due recurring */}
      <section>
        <h2 className="text-charcoal font-heading font-semibold text-lg mb-3">
          Recurring subscriptions ({pastDueRecurring.length})
        </h2>
        <div className="bg-white border border-charcoal/10 rounded-2xl overflow-hidden">
          {pastDueRecurring.length === 0 ? (
            <div className="p-8 text-center text-charcoal/50 text-sm">
              All recurring subscriptions are healthy. Renewal failures
              will appear here when Stripe&apos;s retry cycle starts.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-cream border-b border-charcoal/10">
                  <tr className="text-left">
                    {[
                      "Donor",
                      "Campaign",
                      "Amount / month",
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
                  {pastDueRecurring.map((sub) => (
                    <tr
                      key={sub.id}
                      className="hover:bg-cream/50 transition-colors"
                    >
                      <td className="px-4 sm:px-5 py-4">
                        <div className="text-charcoal font-medium">
                          {sub.donorName}
                        </div>
                        <div className="text-charcoal/50 text-xs">
                          <a
                            href={`mailto:${sub.donorEmail}`}
                            className="hover:underline"
                          >
                            {sub.donorEmail}
                          </a>
                        </div>
                      </td>
                      <td className="px-4 sm:px-5 py-4 text-charcoal/80">
                        {sub.campaignLabel}
                      </td>
                      <td className="px-4 sm:px-5 py-4 text-charcoal font-medium whitespace-nowrap">
                        {formatPence(sub.amountPerCyclePence)}
                      </td>
                      <td className="px-4 sm:px-5 py-4 text-charcoal/70 whitespace-nowrap text-[12px]">
                        {sub.cardLast4
                          ? `${cardBrandLabel(sub.cardBrand)} ····${sub.cardLast4}`
                          : "—"}
                      </td>
                      <td className="px-4 sm:px-5 py-4">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium uppercase tracking-wider border bg-amber-light text-amber-dark border-amber/30">
                          {sub.status.replace("_", " ")}
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
          )}
        </div>
      </section>
    </main>
  );
}
