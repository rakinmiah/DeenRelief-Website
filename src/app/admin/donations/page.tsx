import type { Metadata } from "next";
import Link from "next/link";
import {
  PLACEHOLDER_DONATIONS,
  donationStats,
  formatAdminDate,
  type DonationStatus,
} from "@/lib/admin-placeholder";
import { formatPence } from "@/lib/bazaar-format";

export const metadata: Metadata = {
  title: "Donations | Deen Relief Admin",
  robots: { index: false, follow: false },
};

const STATUS_STYLES: Record<DonationStatus, string> = {
  paid: "bg-green/10 text-green-dark border-green/30",
  pending: "bg-amber-light text-amber-dark border-amber/30",
  failed: "bg-red-50 text-red-700 border-red-200",
  refunded: "bg-charcoal/8 text-charcoal/60 border-charcoal/15",
};

/**
 * Donations list — the admin's primary daily surface.
 *
 * What's here:
 *   - Stats strip: last-30d count, last-30d total, Gift Aid reclaimable,
 *     active recurring donors, monthly recurring revenue.
 *   - Filter chips: All / Paid / Pending / Failed / Refunded
 *     (mockup: chips render but don't yet filter the table — the
 *     production version filters server-side via search params).
 *   - Sortable table with the columns most useful for daily operations
 *     and audit (date / receipt / donor / campaign / amount / Gift Aid /
 *     status). Click any row for detail.
 *   - Export CSV button — generates a download with all visible rows
 *     (with current filters applied). Critical for the trustees' annual
 *     return + HMRC Gift Aid reclaim.
 *
 * Not here on this page (separate routes):
 *   - Recurring subscriptions → /admin/recurring (lifecycle UI)
 *   - Reports → /admin/reports (annual / by-campaign / Gift Aid)
 *   - Bazaar orders → /admin/bazaar/orders
 */
export default function AdminDonationsPage() {
  const stats = donationStats();

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page header */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="block text-[11px] font-bold tracking-[0.15em] uppercase text-amber-dark mb-1">
            Income
          </span>
          <h1 className="text-charcoal font-heading font-bold text-2xl sm:text-3xl">
            Donations
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="px-4 py-2 rounded-full bg-white border border-charcoal/15 text-charcoal text-sm font-medium hover:bg-charcoal/5 transition-colors"
          >
            Export CSV
          </button>
          <Link
            href="/admin/reports/gift-aid"
            className="px-4 py-2 rounded-full bg-charcoal text-white text-sm font-medium hover:bg-charcoal/90 transition-colors"
          >
            Gift Aid export →
          </Link>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: "Last 30 days · count",
            value: stats.last30dCount.toString(),
            sub: "donations received",
          },
          {
            label: "Last 30 days · raised",
            value: formatPence(stats.last30dTotalPence),
            sub: "before Gift Aid",
            accent: true,
          },
          {
            label: "Gift Aid reclaimable",
            value: formatPence(stats.last30dGiftAidReclaimablePence),
            sub: "from HMRC, last 30 days",
          },
          {
            label: "Active monthly recurring",
            value: stats.activeRecurringCount.toString(),
            sub: `${formatPence(stats.activeRecurringMonthlyPence)} / month`,
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

      {/* Filters (mockup; chips render but the table shows everything) */}
      <div className="mb-5 flex flex-wrap gap-2 items-center">
        <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal/50 mr-2">
          Filter
        </span>
        {[
          { label: "All", active: true },
          { label: "Paid", active: false },
          { label: "Pending", active: false },
          { label: "Failed", active: false },
          { label: "Refunded", active: false },
        ].map((chip) => (
          <button
            key={chip.label}
            type="button"
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              chip.active
                ? "bg-charcoal text-white"
                : "bg-white border border-charcoal/10 text-charcoal/70 hover:bg-charcoal/5"
            }`}
          >
            {chip.label}
          </button>
        ))}
        <span className="mx-2 text-charcoal/20">·</span>
        <button
          type="button"
          className="px-3 py-1.5 rounded-full text-sm font-medium bg-white border border-charcoal/10 text-charcoal/70 hover:bg-charcoal/5"
        >
          Date range
        </button>
        <button
          type="button"
          className="px-3 py-1.5 rounded-full text-sm font-medium bg-white border border-charcoal/10 text-charcoal/70 hover:bg-charcoal/5"
        >
          Campaign
        </button>
        <button
          type="button"
          className="px-3 py-1.5 rounded-full text-sm font-medium bg-white border border-charcoal/10 text-charcoal/70 hover:bg-charcoal/5"
        >
          Gift Aid only
        </button>
      </div>

      {/* Donations table */}
      <div className="bg-white border border-charcoal/10 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-cream border-b border-charcoal/10">
              <tr className="text-left">
                {[
                  "Date",
                  "Receipt",
                  "Donor",
                  "Campaign",
                  "Amount",
                  "Gift Aid",
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
              {PLACEHOLDER_DONATIONS.map((donation) => (
                <tr
                  key={donation.id}
                  className="hover:bg-cream/50 transition-colors"
                >
                  <td className="px-4 sm:px-5 py-4 text-charcoal/70 whitespace-nowrap">
                    {formatAdminDate(donation.chargedAt)}
                  </td>
                  <td className="px-4 sm:px-5 py-4">
                    <span className="font-mono text-[11px] text-charcoal">
                      {donation.receiptNumber}
                    </span>
                  </td>
                  <td className="px-4 sm:px-5 py-4">
                    <div className="text-charcoal font-medium">
                      {donation.donorName}
                    </div>
                    <div className="text-charcoal/50 text-xs">
                      {donation.donorEmail}
                    </div>
                  </td>
                  <td className="px-4 sm:px-5 py-4">
                    <span className="text-charcoal/80 text-sm">
                      {donation.campaignLabel}
                    </span>
                    {donation.pathway && (
                      <span className="block text-[11px] text-charcoal/40 italic">
                        Pathway: {donation.pathway}
                      </span>
                    )}
                    {donation.frequency === "monthly" && (
                      <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-[0.1em] text-charcoal/60 bg-charcoal/8 px-2 py-0.5 rounded-full">
                        Monthly
                      </span>
                    )}
                  </td>
                  <td className="px-4 sm:px-5 py-4 text-charcoal font-medium whitespace-nowrap">
                    {formatPence(donation.amountPence)}
                  </td>
                  <td className="px-4 sm:px-5 py-4 whitespace-nowrap">
                    {donation.giftAidClaimed ? (
                      <span className="inline-flex items-center gap-1 text-green-dark text-[11px] font-medium">
                        <svg
                          className="w-3.5 h-3.5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                          aria-hidden="true"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.7-9.3a1 1 0 0 0-1.4-1.4L9 10.6 7.7 9.3a1 1 0 0 0-1.4 1.4l2 2a1 1 0 0 0 1.4 0l4-4Z"
                            clipRule="evenodd"
                          />
                        </svg>
                        +{formatPence(donation.giftAidReclaimablePence)}
                      </span>
                    ) : (
                      <span className="text-charcoal/30 text-[11px]">—</span>
                    )}
                  </td>
                  <td className="px-4 sm:px-5 py-4">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium uppercase tracking-wider border ${STATUS_STYLES[donation.status]}`}
                    >
                      {donation.status}
                    </span>
                  </td>
                  <td className="px-4 sm:px-5 py-4 text-right">
                    <Link
                      href={`/admin/donations/${donation.id}`}
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

      {/* Pitch banner */}
      <div className="mt-8 p-5 bg-amber-light border border-amber/30 rounded-2xl text-sm text-charcoal/80 leading-relaxed">
        <span className="block text-[10px] font-bold uppercase tracking-[0.15em] text-amber-dark mb-1">
          Pitch preview
        </span>
        Mockup data, no real donations. Production version reads from
        Supabase, gates the route behind admin auth, applies the filter
        chips server-side via search params, and the &quot;Export CSV&quot;
        button generates a downloadable file with the currently-filtered
        rows (suitable for the annual return and trustee meetings).
      </div>
    </main>
  );
}
