import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireRoleAdmin } from "@/lib/admin-session";
import {
  cardBrandLabel,
  fetchAdminRecurringById,
} from "@/lib/admin-recurring";
import {
  formatAdminDate,
  formatAdminDateOnly,
} from "@/lib/admin-donations";
import { formatPence } from "@/lib/bazaar-format";
import { PageHeader, StatusBadge } from "@/components/admin/ui";
import RecurringActionsClient from "./RecurringActionsClient";

export const metadata: Metadata = {
  title: "Recurring donation | Deen Relief Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export default async function AdminRecurringDetailPage({ params }: RouteParams) {
  await requireRoleAdmin();
  const { id } = await params;
  const sub = await fetchAdminRecurringById(id);
  if (!sub) notFound();

  const isActive =
    sub.status === "active" ||
    sub.status === "trialing" ||
    sub.status === "past_due";

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <PageHeader
        backHref="/admin/recurring"
        backLabel="All recurring"
        title={
          <>
            {sub.donorName}{" "}
            <span className="text-charcoal/50 font-normal">· {sub.campaignLabel}</span>
          </>
        }
        description={
          <span className="font-mono text-[11px] text-charcoal/50">
            {sub.stripeSubscriptionId}
          </span>
        }
        actions={
          <StatusBadge domain="recurring" status={sub.status} variant="outline" />
        }
      />

      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-5">
          <section className="bg-white border border-charcoal/10 rounded-2xl p-5 sm:p-6">
            <h2 className="text-xs font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-3">
              Recurring details
            </h2>
            <div className="grid grid-cols-2 gap-6 mb-5">
              <div>
                <p className="text-[11px] uppercase tracking-[0.1em] text-charcoal/50 mb-1">
                  Per cycle
                </p>
                <p className="text-3xl font-heading font-bold text-charcoal">
                  {formatPence(sub.amountPerCyclePence)}
                </p>
                <p className="text-[12px] text-charcoal/50 mt-0.5">
                  every month
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.1em] text-charcoal/50 mb-1">
                  Lifetime
                </p>
                <p className="text-3xl font-heading font-bold text-charcoal">
                  {formatPence(sub.totalCollectedPence)}
                </p>
                <p className="text-[12px] text-charcoal/50 mt-0.5">
                  {sub.totalChargesCount} successful charges
                </p>
              </div>
            </div>
            <dl className="space-y-2.5 text-sm border-t border-charcoal/10 pt-4">
              <div className="grid grid-cols-[140px_1fr] gap-3">
                <dt className="text-charcoal/60">Started</dt>
                <dd className="text-charcoal">
                  {formatAdminDate(sub.startedAt)}
                </dd>
              </div>
              {sub.canceledAt && (
                <div className="grid grid-cols-[140px_1fr] gap-3">
                  <dt className="text-charcoal/60">Cancelled</dt>
                  <dd className="text-charcoal">
                    {formatAdminDate(sub.canceledAt)}
                  </dd>
                </div>
              )}
              {sub.nextChargeAt && (
                <div className="grid grid-cols-[140px_1fr] gap-3">
                  <dt className="text-charcoal/60">Next charge</dt>
                  <dd className="text-charcoal">
                    {formatAdminDateOnly(sub.nextChargeAt)}
                  </dd>
                </div>
              )}
              <div className="grid grid-cols-[140px_1fr] gap-3">
                <dt className="text-charcoal/60">Card</dt>
                <dd className="text-charcoal">
                  {sub.cardLast4
                    ? `${cardBrandLabel(sub.cardBrand)} ending ····${sub.cardLast4}`
                    : "—"}
                </dd>
              </div>
            </dl>
          </section>

          <section className="bg-white border border-charcoal/10 rounded-2xl p-5 sm:p-6">
            <h2 className="text-xs font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-3">
              Donor
            </h2>
            <p className="text-charcoal font-medium">{sub.donorName}</p>
            <a
              href={`mailto:${sub.donorEmail}`}
              className="text-green underline text-sm"
            >
              {sub.donorEmail}
            </a>
          </section>
        </div>

        <aside>
          <RecurringActionsClient
            internalId={sub.id}
            stripeSubscriptionId={sub.stripeSubscriptionId}
            stripeCustomerId={sub.stripeCustomerId}
            isActive={isActive}
          />
        </aside>
      </div>
    </main>
  );
}
