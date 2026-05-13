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
import { CAMPAIGNS } from "@/lib/campaigns";
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
    /** Set to "1" by the delete-donation server action's redirect
     *  so the list page renders a one-shot success banner. */
    deleted?: string;
  }>;
}

/**
 * Parse the URL search params into a typed DonationFilters object.
 * Whitespace / unknown values are silently dropped — we never want
 * a malformed URL to crash the page.
 *
 * Status default: when no `status` URL param is present, defaults to
 * showing ONLY succeeded donations. This is the most common mental
 * model for "what donations did we receive" — failed / pending /
 * refunded are operational exception states surfaced via /admin/
 * reports/failed-payments and explicit filter chips. To see all four
 * statuses, the trustee opens the Filters popover and ticks the
 * additional chips.
 */
function parseFilters(
  raw: Awaited<RouteParams["searchParams"]>
): DonationFilters {
  // `raw.status === undefined` → URL had no status param → default
  //   filter is [succeeded] only.
  // `raw.status === ""` → user explicitly cleared (e.g. via "Clear
  //   all" link). Treated identically to the default — without an
  //   explicit non-empty list, the page shows succeeded-only.
  // `raw.status === "succeeded,failed,..."` → use the listed values.
  const statusParam = raw.status;
  let status: AdminDonationStatus[];
  if (typeof statusParam === "string" && statusParam.trim() !== "") {
    status = statusParam
      .split(",")
      .map((s) => s.trim())
      .filter((s): s is AdminDonationStatus =>
        ["succeeded", "pending", "failed", "refunded"].includes(s)
      );
    if (status.length === 0) status = ["succeeded"];
  } else {
    status = ["succeeded"];
  }
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
    // status is always non-empty now (defaults to ["succeeded"]) — see
    // status default logic above. Page table + stats + CSV export all
    // honour this filter.
    status,
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

  // Build the Export-CSV URL with the same filter params the page is
  // applying — what the trustee sees in the table is what they'll
  // download. Encoded server-side (no JS round-trip needed).
  const exportSearchParams = new URLSearchParams();
  if (filters.from) exportSearchParams.set("from", filters.from);
  if (filters.to) exportSearchParams.set("to", filters.to);
  if (filters.status && filters.status.length > 0)
    exportSearchParams.set("status", filters.status.join(","));
  if (filters.campaign && filters.campaign.length > 0)
    exportSearchParams.set("campaign", filters.campaign.join(","));
  if (filters.frequency)
    exportSearchParams.set("frequency", filters.frequency);
  if (typeof filters.giftAidClaimed === "boolean")
    exportSearchParams.set("giftAid", String(filters.giftAidClaimed));
  if (filters.q) exportSearchParams.set("q", filters.q);
  const exportCsvHref = `/api/admin/export-donations${
    exportSearchParams.toString() ? `?${exportSearchParams.toString()}` : ""
  }`;

  // Campaign list for the filter dropdown — derived from the
  // CAMPAIGNS registry in lib/campaigns.ts (the source of truth used
  // by the donate flow). We previously fetched 500 unfiltered
  // donation rows to extract distinct campaigns — that added a fourth
  // Supabase round-trip on every page load purely for the dropdown.
  // Hardcoded list is correct (these ARE all the campaigns the donate
  // flow accepts), faster, and removes one full DB query per render.
  const availableCampaigns = Object.entries(CAMPAIGNS)
    .filter(([slug]) => slug !== "general") // 'general' is fallback, not a public campaign
    .map(([slug, label]) => ({ slug, label }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const justDeleted = rawParams.deleted === "1";

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {justDeleted && (
        <p className="mb-6 px-4 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          Donation deleted. The audit log keeps a permanent record
          of what was removed.
        </p>
      )}
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
          <a
            href={exportCsvHref}
            className="px-4 py-2 rounded-full bg-white border border-charcoal/15 text-charcoal text-sm font-medium hover:bg-charcoal/5 transition-colors"
          >
            Export CSV
          </a>
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

      {/* Mobile card list (<md). Stacked cards beat a 6-column
          table on a 390px viewport — every column would otherwise
          fight for ~50px and become unreadable. The desktop table
          below stays untouched. */}
      <ul className="md:hidden space-y-3">
        {donations.length === 0 ? (
          <li className="bg-white border border-charcoal/10 rounded-2xl p-8 text-center text-charcoal/50 text-sm">
            No donations yet.
          </li>
        ) : (
          donations.map((donation) => (
            <li key={donation.id}>
              <Link
                href={`/admin/donations/${donation.id}`}
                className="block bg-white border border-charcoal/10 rounded-2xl p-4 hover:border-charcoal/25 active:bg-cream/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <p className="text-charcoal font-semibold text-base truncate">
                      {donation.donorName}
                    </p>
                    <p className="text-charcoal/50 text-[12px] truncate">
                      {donation.donorEmail}
                    </p>
                  </div>
                  <p className="text-charcoal font-heading font-semibold text-lg whitespace-nowrap">
                    {formatPence(donation.amountPence)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
                  <span className="text-charcoal/60">
                    {formatAdminDate(donation.chargedAt ?? donation.createdAt)}
                  </span>
                  <span className="text-charcoal/30">·</span>
                  <span className="text-charcoal/70">
                    {donation.campaignLabel}
                  </span>
                  {donation.frequency === "monthly" && (
                    <span className="text-charcoal/30">·</span>
                  )}
                  {donation.frequency === "monthly" && (
                    <span className="font-bold uppercase tracking-wider text-charcoal/60">
                      Monthly
                    </span>
                  )}
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider border ${STATUS_STYLES[donation.status]}`}
                  >
                    {STATUS_LABEL[donation.status]}
                  </span>
                  {donation.giftAidClaimed && !donation.giftAidDeclarationRevoked && (
                    <span className="text-green-dark text-[11px] font-medium">
                      +{formatPence(donation.giftAidReclaimablePence)} Gift Aid
                    </span>
                  )}
                </div>
              </Link>
            </li>
          ))
        )}
      </ul>

      {/* Donations table (desktop only) */}
      <div className="hidden md:block bg-white border border-charcoal/10 rounded-2xl overflow-hidden">
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
