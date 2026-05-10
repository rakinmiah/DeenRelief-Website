import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminSession } from "@/lib/admin-session";
import {
  computeDonationStats,
  fetchAdminDonations,
  formatAdminDate,
  type AdminDonationStatus,
  type AdminDonationFrequency,
  type DonationFilters,
} from "@/lib/admin-donations";
import { formatPence } from "@/lib/bazaar-format";
import DonationsFilters from "./DonationsFilters";

export const metadata: Metadata = {
  title: "Donations | Deen Relief Admin",
  robots: { index: false, follow: false },
};

// Donations page reads cookies via requireAdminSession + queries
// Supabase — must be dynamic per request, never prerendered.
export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<AdminDonationStatus, string> = {
  succeeded: "bg-green/10 text-green-dark border-green/30",
  pending: "bg-amber-light text-amber-dark border-amber/30",
  failed: "bg-red-50 text-red-700 border-red-200",
  refunded: "bg-charcoal/8 text-charcoal/60 border-charcoal/15",
};

const STATUS_LABEL: Record<AdminDonationStatus, string> = {
  succeeded: "paid",
  pending: "pending",
  failed: "failed",
  refunded: "refunded",
};

interface RouteParams {
  searchParams: Promise<{
    from?: string;
    to?: string;
    status?: string;
    campaign?: string;
    frequency?: string;
    giftAid?: string;
    q?: string;
  }>;
}

/**
 * Parse the URL search params into a typed DonationFilters object.
 * Whitespace / unknown values are silently dropped — we never want
 * a malformed URL to crash the page.
 */
function parseFilters(
  raw: Awaited<RouteParams["searchParams"]>
): DonationFilters {
  const status = (raw.status ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is AdminDonationStatus =>
      ["succeeded", "pending", "failed", "refunded"].includes(s)
    );
  const campaign = (raw.campaign ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const frequency: AdminDonationFrequency | undefined =
    raw.frequency === "one-time" || raw.frequency === "monthly"
      ? raw.frequency
      : undefined;
  const giftAidClaimed: boolean | undefined =
    raw.giftAid === "true"
      ? true
      : raw.giftAid === "false"
      ? false
      : undefined;

  return {
    from: raw.from && /^\d{4}-\d{2}-\d{2}$/.test(raw.from) ? raw.from : undefined,
    to: raw.to && /^\d{4}-\d{2}-\d{2}$/.test(raw.to) ? raw.to : undefined,
    status: status.length > 0 ? status : undefined,
    campaign: campaign.length > 0 ? campaign : undefined,
    frequency,
    giftAidClaimed,
    q: raw.q?.trim() || undefined,
  };
}

/**
 * Donations admin — primary daily surface.
 *
 * Auth gate: requireAdminSession() at the top redirects unauthenticated
 * users to /admin/login before any donor data is queried.
 *
 * Filters: parsed from URL search params and passed to both the row
 * fetch and the stats aggregation, so the strip and the table tell
 * the same story.
 *
 * Data: most-recent 200 donations matching the filters + computed
 * stats over the same window. Donor search filters the rows but not
 * the stats (intentional — search is a table-level concern).
 *
 * Empty state: when no donations match, the table renders a friendly
 * empty-state row.
 */
export default async function AdminDonationsPage({ searchParams }: RouteParams) {
  await requireAdminSession();

  const rawParams = await searchParams;
  const filters = parseFilters(rawParams);

  const [donations, stats] = await Promise.all([
    fetchAdminDonations(filters, 200),
    computeDonationStats(filters),
  ]);

  // Build the campaigns list for the filter dropdown — derived from
  // donations that exist (so trustees only see campaigns that have
  // received donations). Fetch a separate unfiltered list for the
  // dropdown so the campaign filter doesn't disappear after applying
  // it.
  const allCampaignsRows = await fetchAdminDonations({}, 500);
  const availableCampaigns = Array.from(
    new Map(
      allCampaignsRows.map((r) => [r.campaign, { slug: r.campaign, label: r.campaignLabel }])
    ).values()
  ).sort((a, b) => a.label.localeCompare(b.label));

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

      {/* Filters bar — date range, dimensions popover, donor search */}
      <DonationsFilters availableCampaigns={availableCampaigns} />

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
              {donations.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-12 text-center text-charcoal/50 text-sm"
                  >
                    No donations yet. New donations will appear here within
                    seconds of being received.
                  </td>
                </tr>
              ) : (
                donations.map((donation) => (
                  <tr
                    key={donation.id}
                    className="hover:bg-cream/50 transition-colors"
                  >
                    <td className="px-4 sm:px-5 py-4 text-charcoal/70 whitespace-nowrap">
                      {formatAdminDate(donation.chargedAt ?? donation.createdAt)}
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
                      {donation.giftAidClaimed && !donation.giftAidDeclarationRevoked ? (
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
                        {STATUS_LABEL[donation.status]}
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {donations.length > 0 && (
        <p className="mt-4 text-[11px] text-charcoal/40">
          Showing the {donations.length} most recent donations. Older
          donations are still in the database — pagination coming in a
          follow-up.
        </p>
      )}
    </main>
  );
}
