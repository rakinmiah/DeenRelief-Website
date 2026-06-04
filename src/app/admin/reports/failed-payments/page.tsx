import type { Metadata } from "next";
import { requireRoleAdmin } from "@/lib/admin-session";
import {
  fetchFailedDonations,
  formatAdminDate,
} from "@/lib/admin-donations";
import {
  cardBrandLabel,
  fetchAdminRecurring,
} from "@/lib/admin-recurring";
import { formatPence } from "@/lib/bazaar-format";
import {
  Button,
  PageHeader,
  StatusBadge,
  StatCard,
  ResponsiveTable,
  EmptyState,
  type Column,
} from "@/components/admin/ui";

export const metadata: Metadata = {
  title: "Failed payments | Deen Relief Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type FailedDonationRow = Awaited<ReturnType<typeof fetchFailedDonations>>[number];
type RecurringRow = Awaited<ReturnType<typeof fetchAdminRecurring>>[number];

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
 *
 * Note: these tables use an explicit "Open" action column rather than
 * a whole-row link, because the donor cell carries a `mailto:` link —
 * nesting that inside a row link would be invalid markup.
 */
export default async function AdminFailedPaymentsPage() {
  await requireRoleAdmin();

  const [failedDonations, allRecurring] = await Promise.all([
    fetchFailedDonations(50),
    fetchAdminRecurring(),
  ]);

  const pastDueRecurring = allRecurring.filter((r) =>
    ["past_due", "unpaid", "incomplete", "incomplete_expired"].includes(r.status)
  );

  const donationColumns: Column<FailedDonationRow>[] = [
    {
      key: "attempted",
      header: "Attempted",
      cell: (d) => formatAdminDate(d.createdAt),
      cellClassName: "whitespace-nowrap text-charcoal/70",
    },
    {
      key: "donor",
      header: "Donor",
      primary: true,
      cell: (d) => (
        <div>
          <div className="text-charcoal font-medium">{d.donorName}</div>
          <div className="text-charcoal/50 text-xs">
            <a href={`mailto:${d.donorEmail}`} className="hover:underline">
              {d.donorEmail}
            </a>
          </div>
        </div>
      ),
    },
    {
      key: "campaign",
      header: "Campaign",
      cell: (d) => <span className="text-charcoal/80">{d.campaignLabel}</span>,
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
      key: "receipt",
      header: "Receipt",
      hideOnMobile: true,
      cell: (d) => (
        <span className="font-mono text-[11px] text-charcoal/60">{d.receiptNumber}</span>
      ),
    },
    {
      key: "open",
      header: "",
      align: "right",
      isAction: true,
      cell: (d) => (
        <Button href={`/admin/donations/${d.id}`} variant="outline" size="sm">
          Open
        </Button>
      ),
    },
  ];

  const recurringColumns: Column<RecurringRow>[] = [
    {
      key: "donor",
      header: "Donor",
      primary: true,
      cell: (sub) => (
        <div>
          <div className="text-charcoal font-medium">{sub.donorName}</div>
          <div className="text-charcoal/50 text-xs">
            <a href={`mailto:${sub.donorEmail}`} className="hover:underline">
              {sub.donorEmail}
            </a>
          </div>
        </div>
      ),
    },
    {
      key: "campaign",
      header: "Campaign",
      cell: (sub) => <span className="text-charcoal/80">{sub.campaignLabel}</span>,
    },
    {
      key: "amount",
      header: "Amount / month",
      align: "right",
      secondary: true,
      cell: (sub) => (
        <span className="text-charcoal font-semibold whitespace-nowrap">
          {formatPence(sub.amountPerCyclePence)}
        </span>
      ),
    },
    {
      key: "card",
      header: "Card",
      hideOnMobile: true,
      cell: (sub) =>
        sub.cardLast4
          ? `${cardBrandLabel(sub.cardBrand)} ····${sub.cardLast4}`
          : "—",
      cellClassName: "whitespace-nowrap text-charcoal/70 text-[12px]",
    },
    {
      key: "status",
      header: "Status",
      cell: (sub) => (
        <StatusBadge domain="recurring" status={sub.status} variant="outline" />
      ),
    },
    {
      key: "open",
      header: "",
      align: "right",
      isAction: true,
      cell: (sub) => (
        <Button href={`/admin/recurring/${sub.id}`} variant="outline" size="sm">
          Open
        </Button>
      ),
    },
  ];

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <PageHeader
        backHref="/admin/reports"
        backLabel="Reports"
        eyebrow="Operations"
        title="Failed payments"
        description="Donations and recurring renewals where the donor's card declined. Most common cause is an expired card or insufficient funds. A friendly email or call usually recovers the donation."
      />

      {/* Stats strip — two tiles, so a fixed 2-up grid (not StatStrip). */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <StatCard
          label="Failed one-time donations"
          value={failedDonations.length.toString()}
          hint={
            failedDonations.length === 0
              ? "nothing to follow up"
              : "needs trustee attention"
          }
        />
        <StatCard
          label="Recurring · past due / failed renewal"
          value={pastDueRecurring.length.toString()}
          hint={
            pastDueRecurring.length === 0
              ? "all subscriptions healthy"
              : "renewal retry in progress"
          }
        />
      </div>

      {/* Failed one-time donations */}
      <section className="mb-8">
        <h2 className="text-charcoal font-heading font-semibold text-lg mb-3">
          One-time donations ({failedDonations.length})
        </h2>
        <ResponsiveTable<FailedDonationRow>
          rows={failedDonations}
          getRowKey={(d) => d.id}
          columns={donationColumns}
          empty={
            <EmptyState
              title="No failed one-time donations"
              description="New failures will appear here within seconds of Stripe declining a charge."
            />
          }
        />
      </section>

      {/* Past-due recurring */}
      <section>
        <h2 className="text-charcoal font-heading font-semibold text-lg mb-3">
          Recurring subscriptions ({pastDueRecurring.length})
        </h2>
        <ResponsiveTable<RecurringRow>
          rows={pastDueRecurring}
          getRowKey={(sub) => sub.id}
          columns={recurringColumns}
          empty={
            <EmptyState
              title="All recurring subscriptions are healthy"
              description="Renewal failures will appear here when Stripe's retry cycle starts."
            />
          }
        />
      </section>
    </main>
  );
}
