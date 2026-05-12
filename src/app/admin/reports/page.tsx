import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminSession } from "@/lib/admin-session";
import {
  computeDonationStats,
  fetchCampaignBreakdown,
} from "@/lib/admin-donations";
import { formatPence } from "@/lib/bazaar-format";

export const metadata: Metadata = {
  title: "Reports | Deen Relief Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Reports landing — wired to real Supabase aggregations.
 *
 * The Gift Aid card surfaces the live reclaimable figure (last-30-day
 * window, livemode-only) so trustees can eyeball whether it's worth
 * filing a claim now or waiting for the next quarter to accumulate
 * enough volume.
 *
 * The per-campaign breakdown table runs a single Supabase aggregation
 * over the same 30-day window, grouped by campaign slug. Filtered to
 * status='succeeded' AND livemode=true so test-mode donations are
 * permanently invisible to trustees.
 */
export default async function AdminReportsPage() {
  await requireAdminSession();

  const [stats, campaignRows] = await Promise.all([
    computeDonationStats(),
    fetchCampaignBreakdown(30),
  ]);

  const grandTotal = campaignRows.reduce((s, r) => s + r.totalPence, 0);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <span className="block text-[11px] font-bold tracking-[0.15em] uppercase text-amber-dark mb-1">
          Reports
        </span>
        <h1 className="text-charcoal font-heading font-bold text-2xl sm:text-3xl">
          Financial reports
        </h1>
        <p className="text-grey text-sm mt-2 max-w-2xl">
          Pre-built views of the donations data, ready to download for
          trustee meetings, the annual return, and HMRC Gift Aid reclaims.
        </p>
      </div>

      {/* Quick reports grid */}
      <div className="grid sm:grid-cols-2 gap-4 mb-10">
        <Link
          href="/admin/reports/reconciliation"
          className="group bg-white border border-charcoal/10 rounded-2xl p-5 hover:border-charcoal/30 hover:shadow-sm transition-all sm:col-span-2"
        >
          <div className="flex items-start justify-between mb-3">
            <span className="block text-[11px] font-bold tracking-[0.1em] uppercase text-amber-dark">
              Accountant export
            </span>
            <span className="text-charcoal/40 group-hover:text-charcoal transition-colors">
              →
            </span>
          </div>
          <h2 className="text-charcoal font-heading font-semibold text-lg mb-1">
            Reconciliation &mdash; donations + bazaar
          </h2>
          <p className="text-grey text-sm leading-relaxed">
            Combined view of donation income and bazaar trading income
            with a Type column, side-by-side stat tiles, and a CSV export
            that drops straight into the accountant&apos;s ledger. The
            deliverable agreed when we chose to trade through the charity
            Stripe account under HMRC&apos;s small-trading exemption.
          </p>
        </Link>

        <Link
          href="/admin/reports/gift-aid"
          className="group bg-white border border-charcoal/10 rounded-2xl p-5 hover:border-charcoal/30 hover:shadow-sm transition-all"
        >
          <div className="flex items-start justify-between mb-3">
            <span className="block text-[11px] font-bold tracking-[0.1em] uppercase text-amber-dark">
              HMRC reclaim
            </span>
            <span className="text-charcoal/40 group-hover:text-charcoal transition-colors">
              →
            </span>
          </div>
          <h2 className="text-charcoal font-heading font-semibold text-lg mb-1">
            Gift Aid claim export
          </h2>
          <p className="text-grey text-sm leading-relaxed">
            Generate the HMRC-format spreadsheet of all Gift-Aid-eligible
            donations for a tax year. Reclaim the 25% from HMRC&apos;s
            Charities Online portal.
          </p>
          <p className="mt-3 text-[12px] text-charcoal/60">
            Reclaimable last 30 days:{" "}
            <strong className="text-green-dark">
              {formatPence(stats.last30dGiftAidReclaimablePence)}
            </strong>
          </p>
        </Link>

        <div className="bg-white border border-charcoal/10 rounded-2xl p-5">
          <div className="flex items-start justify-between mb-3">
            <span className="block text-[11px] font-bold tracking-[0.1em] uppercase text-amber-dark">
              Annual return
            </span>
          </div>
          <h2 className="text-charcoal font-heading font-semibold text-lg mb-1">
            Charity Commission annual return
          </h2>
          <p className="text-grey text-sm leading-relaxed">
            Income broken down by source for the financial year-end (31
            July). Restricted vs unrestricted funds, by-cause allocations,
            ancillary trading separated.
          </p>
          <button
            type="button"
            disabled
            className="mt-4 px-3 py-1.5 rounded-full text-xs font-medium bg-charcoal/8 text-charcoal/50 cursor-not-allowed"
          >
            Generate FY2025-26 (coming soon)
          </button>
        </div>

        <Link
          href="/admin/reports/failed-payments"
          className="group bg-white border border-charcoal/10 rounded-2xl p-5 hover:border-charcoal/30 hover:shadow-sm transition-all"
        >
          <div className="flex items-start justify-between mb-3">
            <span className="block text-[11px] font-bold tracking-[0.1em] uppercase text-amber-dark">
              Operations
            </span>
            <span className="text-charcoal/40 group-hover:text-charcoal transition-colors">
              →
            </span>
          </div>
          <h2 className="text-charcoal font-heading font-semibold text-lg mb-1">
            Failed payments
          </h2>
          <p className="text-grey text-sm leading-relaxed">
            Recent failed charges that may need follow-up. For recurring,
            past_due subscriptions are flagged for re-engagement emails.
          </p>
        </Link>

        <div className="bg-white border border-charcoal/10 rounded-2xl p-5">
          <div className="flex items-start justify-between mb-3">
            <span className="block text-[11px] font-bold tracking-[0.1em] uppercase text-amber-dark">
              Per-cause
            </span>
          </div>
          <h2 className="text-charcoal font-heading font-semibold text-lg mb-1">
            Donor cohorts by campaign
          </h2>
          <p className="text-grey text-sm leading-relaxed">
            Which donors give to which causes, repeat-donor rate by
            campaign, average gift size, lifetime value. For social media
            and trustee impact reports.
          </p>
          <button
            type="button"
            disabled
            className="mt-4 px-3 py-1.5 rounded-full text-xs font-medium bg-charcoal/8 text-charcoal/50 cursor-not-allowed"
          >
            View cohorts (coming soon)
          </button>
        </div>
      </div>

      {/* Campaign breakdown table */}
      <section className="mb-8">
        <h2 className="text-charcoal font-heading font-semibold text-lg mb-3">
          By campaign · last 30 days
        </h2>
        <div className="bg-white border border-charcoal/10 rounded-2xl overflow-hidden">
          {campaignRows.length === 0 ? (
            <div className="p-8 text-center text-charcoal/50 text-sm">
              No live donations in the last 30 days. New donations will
              appear here within seconds of being received.
            </div>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-cream border-b border-charcoal/10">
                <tr className="text-left">
                  <th className="px-5 py-3 font-bold uppercase tracking-[0.1em] text-charcoal/60 text-[11px]">
                    Campaign
                  </th>
                  <th className="px-5 py-3 font-bold uppercase tracking-[0.1em] text-charcoal/60 text-[11px]">
                    Donations
                  </th>
                  <th className="px-5 py-3 font-bold uppercase tracking-[0.1em] text-charcoal/60 text-[11px]">
                    Total raised
                  </th>
                  <th className="px-5 py-3 font-bold uppercase tracking-[0.1em] text-charcoal/60 text-[11px]">
                    Share
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-charcoal/8">
                {campaignRows.map((row) => {
                  const sharePct =
                    grandTotal === 0 ? 0 : (row.totalPence / grandTotal) * 100;
                  return (
                    <tr
                      key={row.campaign}
                      className="hover:bg-cream/50 transition-colors"
                    >
                      <td className="px-5 py-4 text-charcoal font-medium">
                        {row.campaignLabel}
                      </td>
                      <td className="px-5 py-4 text-charcoal/70">{row.count}</td>
                      <td className="px-5 py-4 text-charcoal font-medium">
                        {formatPence(row.totalPence)}
                      </td>
                      <td className="px-5 py-4 w-48">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-charcoal/8 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-amber rounded-full"
                              style={{ width: `${sharePct}%` }}
                            />
                          </div>
                          <span className="text-[12px] text-charcoal/60 tabular-nums w-10 text-right">
                            {sharePct.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-cream/50 font-semibold">
                  <td className="px-5 py-3 text-charcoal">Total</td>
                  <td className="px-5 py-3 text-charcoal/70">
                    {campaignRows.reduce((s, r) => s + r.count, 0)}
                  </td>
                  <td className="px-5 py-3 text-charcoal">
                    {formatPence(grandTotal)}
                  </td>
                  <td className="px-5 py-3 text-charcoal/40 text-[12px]">
                    100%
                  </td>
                </tr>
              </tbody>
            </table>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
