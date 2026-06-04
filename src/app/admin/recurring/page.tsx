import type { Metadata } from "next";
import { requireRoleAdmin } from "@/lib/admin-session";
import {
  cardBrandLabel,
  fetchAdminRecurring,
  type AdminRecurringRow,
} from "@/lib/admin-recurring";
import { formatAdminDateOnly } from "@/lib/admin-donations";
import { formatPence } from "@/lib/bazaar-format";
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

export const metadata: Metadata = {
  title: "Recurring donations | Deen Relief Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

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
 * without active-table noise. Both render as a table on desktop and
 * stacked cards on mobile via the shared ResponsiveTable.
 */
export default async function AdminRecurringPage() {
  await requireRoleAdmin();
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
  const activeCount = active.filter(
    (r) => r.status === "active" || r.status === "trialing"
  ).length;

  const activeColumns: Column<AdminRecurringRow>[] = [
    {
      key: "donor",
      header: "Donor",
      primary: true,
      cell: (sub) => (
        <div>
          <div className="text-charcoal font-medium">{sub.donorName}</div>
          <div className="text-charcoal/50 text-xs break-all">{sub.donorEmail}</div>
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
      key: "started",
      header: "Started",
      cell: (sub) => formatAdminDateOnly(sub.startedAt),
      cellClassName: "whitespace-nowrap text-charcoal/70",
    },
    {
      key: "next",
      header: "Next charge",
      cell: (sub) =>
        sub.nextChargeAt ? formatAdminDateOnly(sub.nextChargeAt) : "—",
      cellClassName: "whitespace-nowrap text-charcoal/70",
    },
    {
      key: "lifetime",
      header: "Lifetime",
      align: "right",
      cell: (sub) => (
        <span className="whitespace-nowrap">
          <span className="font-medium text-charcoal/80">
            {formatPence(sub.totalCollectedPence)}
          </span>
          <span className="block text-[11px] text-charcoal/50">
            {sub.totalChargesCount} charges
          </span>
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
  ];

  const cancelledColumns: Column<AdminRecurringRow>[] = [
    {
      key: "donor",
      header: "Donor",
      primary: true,
      cell: (sub) => (
        <div>
          <div className="text-charcoal/80 font-medium">{sub.donorName}</div>
          <div className="text-charcoal/50 text-xs break-all">{sub.donorEmail}</div>
        </div>
      ),
    },
    {
      key: "campaign",
      header: "Campaign",
      cell: (sub) => <span className="text-charcoal/70">{sub.campaignLabel}</span>,
    },
    {
      key: "lifetime",
      header: "Lifetime",
      cell: (sub) => (
        <span className="whitespace-nowrap text-charcoal/70">
          {formatPence(sub.totalCollectedPence)} · {sub.totalChargesCount} charges
        </span>
      ),
    },
    {
      key: "started",
      header: "Started",
      cell: (sub) => formatAdminDateOnly(sub.startedAt),
      cellClassName: "whitespace-nowrap text-charcoal/70",
    },
    {
      key: "cancelled",
      header: "Cancelled",
      secondary: true,
      cell: (sub) =>
        sub.canceledAt ? formatAdminDateOnly(sub.canceledAt) : "—",
      cellClassName: "whitespace-nowrap text-charcoal/70",
    },
  ];

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <PageHeader
        eyebrow="Recurring income"
        title="Recurring donations"
        actions={
          <Button variant="outline" size="sm">
            Export CSV
          </Button>
        }
      />

      <StatStrip className="mb-8">
        <StatCard
          label="Active subscriptions"
          value={activeCount.toString()}
          hint="donors giving monthly"
        />
        <StatCard
          label="Monthly recurring"
          value={formatPence(monthlyRevenuePence)}
          hint="committed every month"
        />
        <StatCard
          label="Lifetime collected"
          value={formatPence(lifetimeCollectedPence)}
          hint="all subscriptions, all time"
        />
        <StatCard
          label="Past due"
          value={pastDue.length.toString()}
          hint={pastDue.length === 0 ? "nothing needs attention" : "needs follow-up"}
        />
      </StatStrip>

      {/* Active subscriptions */}
      <section className="mb-8">
        <h2 className="text-charcoal font-heading font-semibold text-lg mb-3">
          Active ({active.length})
        </h2>
        <ResponsiveTable<AdminRecurringRow>
          rows={active}
          getRowKey={(sub) => sub.id}
          rowHref={(sub) => `/admin/recurring/${sub.id}`}
          rowLabel={(sub) => `${sub.donorName} — recurring donation`}
          columns={activeColumns}
          empty={
            <EmptyState
              title="No active recurring subscriptions yet"
              description="New monthly donors will appear here within seconds of their first charge."
            />
          }
        />
      </section>

      {/* Cancelled */}
      {cancelled.length > 0 && (
        <section>
          <h2 className="text-charcoal/70 font-heading font-semibold text-lg mb-3">
            Cancelled ({cancelled.length})
          </h2>
          <ResponsiveTable<AdminRecurringRow>
            rows={cancelled}
            getRowKey={(sub) => sub.id}
            rowHref={(sub) => `/admin/recurring/${sub.id}`}
            rowLabel={(sub) => `${sub.donorName} — cancelled donation`}
            columns={cancelledColumns}
          />
        </section>
      )}
    </main>
  );
}
