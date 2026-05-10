import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminSession } from "@/lib/admin-session";
import {
  PLACEHOLDER_DONATIONS,
  donationStats,
  type CampaignSlug,
} from "@/lib/admin-placeholder";
import { formatPence } from "@/lib/bazaar-format";

export const metadata: Metadata = {
  title: "Reports | Deen Relief Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Reports landing.
 *
 * What lives here: pre-built reports that trustees ask for repeatedly:
 *   - Gift Aid claim — most-frequent + highest-stakes; HMRC reclaim
 *     workflow. Has its own dedicated route with an HMRC-format export.
 *   - Annual report (current FY) — running totals by month + by campaign
 *   - By-campaign breakdown — for trustee meetings, social media reports
 *   - Failed payments — for follow-up + write-off decisions
 *
 * Each report is a saved "view" of the underlying donations data with
 * the right filters baked in. Production version: each report's CSV
 * export goes through /api/admin/reports/<name>/export.
 */
export default async function AdminReportsPage() {
  await requireAdminSession();
  const stats = donationStats();

  // Compute per-campaign breakdown from placeholder data.
  const byCampaign: Record<string, { count: number; totalPence: number }> = {};
  for (const d of PLACEHOLDER_DONATIONS.filter((d) => d.status === "paid")) {
    const key = d.campaignSlug as CampaignSlug;
    if (!byCampaign[key]) byCampaign[key] = { count: 0, totalPence: 0 };
    byCampaign[key].count += 1;
    byCampaign[key].totalPence += d.amountPence;
  }
  const campaignRows = Object.entries(byCampaign)
    .map(([slug, v]) => ({
      slug,
      label:
        PLACEHOLDER_DONATIONS.find((d) => d.campaignSlug === slug)
          ?.campaignLabel ?? slug,
      count: v.count,
      totalPence: v.totalPence,
    }))
    .sort((a, b) => b.totalPence - a.totalPence);

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

        <div className="bg-white border border-charcoal/10 rounded-2xl p-5">
          <div className="flex items-start justify-between mb-3">
            <span className="block text-[11px] font-bold tracking-[0.1em] uppercase text-amber-dark">
              Operations
            </span>
          </div>
          <h2 className="text-charcoal font-heading font-semibold text-lg mb-1">
            Failed payments
          </h2>
          <p className="text-grey text-sm leading-relaxed">
            Recent failed charges that may need follow-up. For recurring,
            past_due subscriptions are flagged for re-engagement emails.
          </p>
          <button
            type="button"
            disabled
            className="mt-4 px-3 py-1.5 rounded-full text-xs font-medium bg-charcoal/8 text-charcoal/50 cursor-not-allowed"
          >
            View failed payments
          </button>
        </div>

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
          <table className="w-full text-sm">
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
                const sharePct = grandTotal === 0 ? 0 : (row.totalPence / grandTotal) * 100;
                return (
                  <tr
                    key={row.slug}
                    className="hover:bg-cream/50 transition-colors"
                  >
                    <td className="px-5 py-4 text-charcoal font-medium">
                      {row.label}
                    </td>
                    <td className="px-5 py-4 text-charcoal/70">
                      {row.count}
                    </td>
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
      </section>

      <div className="p-5 bg-amber-light border border-amber/30 rounded-2xl text-sm text-charcoal/80 leading-relaxed">
        <span className="block text-[10px] font-bold uppercase tracking-[0.15em] text-amber-dark mb-1">
          Pitch preview
        </span>
        Production: each report is a server-rendered SQL view over the
        donations table. CSVs are streamed (not buffered) so a tax-year
        Gift Aid export with thousands of rows downloads instantly.
        Generated reports are stamped with the trustee&apos;s name +
        timestamp for the audit trail.
      </div>
    </main>
  );
}
