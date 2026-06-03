import type { Metadata } from "next";
import { requireRoleAdmin } from "@/lib/admin-session";
import {
  computeDonationStats,
  fetchAdminDonations,
  formatAdminDate,
  type AdminDonationRow,
  type AdminDonationStatus,
  type AdminDonationFrequency,
  type DonationFilters,
} from "@/lib/admin-donations";
import { formatPence } from "@/lib/bazaar-format";
import { CAMPAIGNS } from "@/lib/campaigns";
import PullToRefresh from "@/components/admin/PullToRefresh";
import {
  Button,
  PageHeader,
  StatusBadge,
  StatCard,
  StatStrip,
  ResponsiveTable,
  EmptyState,
  type Column,
} from "@/components/admin/ui";
import DonationsFilters from "./DonationsFilters";

export const metadata: Metadata = {
  title: "Donations | Deen Relief Admin",
  robots: { index: false, follow: false },
};

// Donations page reads cookies via requireRoleAdmin + queries
// Supabase — must be dynamic per request, never prerendered.
export const dynamic = "force-dynamic";

/** Small "Monthly" pill shown beside a recurring donation's campaign. */
function MonthlyTag() {
  return (
    <span className="inline-block text-[10px] font-bold uppercase tracking-[0.1em] text-charcoal/60 bg-charcoal/8 px-2 py-0.5 rounded-full">
      Monthly
    </span>
  );
}

/** Gift Aid cell — green tick + reclaimable amount, or an em dash. */
function giftAidCell(d: AdminDonationRow) {
  if (d.giftAidClaimed && !d.giftAidDeclarationRevoked) {
    return (
      <span className="inline-flex items-center gap-1 text-green-dark text-[11px] font-medium">
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.7-9.3a1 1 0 0 0-1.4-1.4L9 10.6 7.7 9.3a1 1 0 0 0-1.4 1.4l2 2a1 1 0 0 0 1.4 0l4-4Z"
            clipRule="evenodd"
          />
        </svg>
        +{formatPence(d.giftAidReclaimablePence)}
      </span>
    );
  }
  return <span className="text-charcoal/30 text-[11px]">—</span>;
}

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
 * Auth gate: requireRoleAdmin() at the top redirects unauthenticated
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
  await requireRoleAdmin();

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

  // Column definitions drive both the desktop table and the mobile
  // cards. `donor` is the primary (link) column; `amount` is pulled up
  // beside it on mobile.
  const donationColumns: Column<AdminDonationRow>[] = [
    {
      key: "date",
      header: "Date",
      cell: (d) => formatAdminDate(d.chargedAt ?? d.createdAt),
      cellClassName: "whitespace-nowrap text-charcoal/70",
    },
    {
      key: "receipt",
      header: "Receipt",
      hideOnMobile: true,
      cell: (d) => (
        <span className="font-mono text-[11px] text-charcoal">{d.receiptNumber}</span>
      ),
    },
    {
      key: "donor",
      header: "Donor",
      primary: true,
      cell: (d) => (
        <div>
          <div className="text-charcoal font-medium">{d.donorName}</div>
          <div className="text-charcoal/50 text-xs">{d.donorEmail}</div>
        </div>
      ),
    },
    {
      key: "campaign",
      header: "Campaign",
      cell: (d) => (
        <span className="inline-flex flex-wrap items-center gap-1.5">
          <span className="text-charcoal/80 text-sm">{d.campaignLabel}</span>
          {d.frequency === "monthly" && <MonthlyTag />}
        </span>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      secondary: true,
      cell: (d) => (
        <span className="text-charcoal font-semibold whitespace-nowrap">
          {formatPence(d.amountPence)}
        </span>
      ),
    },
    {
      key: "giftaid",
      header: "Gift Aid",
      align: "right",
      cell: (d) => giftAidCell(d),
    },
    {
      key: "status",
      header: "Status",
      cell: (d) => <StatusBadge domain="donation" status={d.status} variant="outline" />,
    },
  ];

  return (
    <PullToRefresh>
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {justDeleted && (
        <p className="mb-6 px-4 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          Donation deleted. The audit log keeps a permanent record
          of what was removed.
        </p>
      )}
      <PageHeader
        eyebrow="Income"
        title="Donations"
        className="mb-6"
        actions={
          <>
            <Button href="/admin/donations/issue-receipt" variant="outline" size="sm">
              Issue receipt
            </Button>
            <Button href={exportCsvHref} prefetch={false} variant="outline" size="sm">
              Export CSV
            </Button>
            <Button href="/admin/reports/gift-aid" size="sm">
              Gift Aid export →
            </Button>
          </>
        }
      />

      {/* Stats strip */}
      <StatStrip className="mb-8">
        <StatCard
          label="Last 30 days · count"
          value={stats.last30dCount.toString()}
          hint="donations received"
        />
        <StatCard
          label="Last 30 days · raised"
          value={formatPence(stats.last30dTotalPence)}
          hint="before Gift Aid"
        />
        <StatCard
          label="Gift Aid reclaimable"
          value={formatPence(stats.last30dGiftAidReclaimablePence)}
          hint="from HMRC, last 30 days"
        />
        <StatCard
          label="Active monthly recurring"
          value={stats.activeRecurringCount.toString()}
          hint={`${formatPence(stats.activeRecurringMonthlyPence)} / month`}
        />
      </StatStrip>

      {/* Filters bar — date range, dimensions popover, donor search */}
      <DonationsFilters availableCampaigns={availableCampaigns} />

      {/* One definition → desktop table on md+, stacked cards below. */}
      <ResponsiveTable<AdminDonationRow>
        rows={donations}
        getRowKey={(d) => d.id}
        rowHref={(d) => `/admin/donations/${d.id}`}
        rowLabel={(d) => `Donation from ${d.donorName}`}
        columns={donationColumns}
        empty={
          <EmptyState
            title="No donations yet"
            description="New donations will appear here within seconds of being received."
          />
        }
      />

      {donations.length > 0 && (
        <p className="mt-4 text-[11px] text-charcoal/40">
          Showing the {donations.length} most recent donations. Older
          donations are still in the database — pagination coming in a
          follow-up.
        </p>
      )}
    </main>
    </PullToRefresh>
  );
}
