import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminSession } from "@/lib/admin-session";
import {
  cardBrandLabel,
  fetchAdminRecurringById,
  type AdminRecurringStatus,
} from "@/lib/admin-recurring";
import {
  formatAdminDate,
  formatAdminDateOnly,
} from "@/lib/admin-donations";
import { formatPence } from "@/lib/bazaar-format";
import RecurringActionsClient from "./RecurringActionsClient";

export const metadata: Metadata = {
  title: "Recurring donation | Deen Relief Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const STATUS_STYLES: Record<AdminRecurringStatus, string> = {
  active: "bg-green/10 text-green-dark border-green/30",
  trialing: "bg-green/10 text-green-dark border-green/30",
  past_due: "bg-amber-light text-amber-dark border-amber/30",
  incomplete: "bg-amber-light text-amber-dark border-amber/30",
  unpaid: "bg-red-50 text-red-700 border-red-200",
  paused: "bg-charcoal/8 text-charcoal/60 border-charcoal/15",
  incomplete_expired: "bg-charcoal/8 text-charcoal/60 border-charcoal/15",
  canceled: "bg-charcoal/8 text-charcoal/60 border-charcoal/15",
};

const STATUS_LABEL: Record<AdminRecurringStatus, string> = {
  active: "active",
  trialing: "trialing",
  past_due: "past due",
  incomplete: "incomplete",
  unpaid: "unpaid",
  paused: "paused",
  incomplete_expired: "expired",
  canceled: "cancelled",
};

export default async function AdminRecurringDetailPage({ params }: RouteParams) {
  await requireAdminSession();
  const { id } = await params;
  const sub = await fetchAdminRecurringById(id);
  if (!sub) notFound();

  const isActive =
    sub.status === "active" ||
    sub.status === "trialing" ||
    sub.status === "past_due";

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link
            href="/admin/recurring"
            className="inline-block text-charcoal/60 hover:text-charcoal text-xs uppercase tracking-[0.1em] font-bold transition-colors mb-1"
          >
            ← All recurring
          </Link>
          <h1 className="text-charcoal font-heading font-semibold text-xl sm:text-2xl">
            {sub.donorName}{" "}
            <span className="text-charcoal/50 font-normal">
              · {sub.campaignLabel}
            </span>
          </h1>
          <p className="text-[11px] font-mono text-charcoal/50 mt-1">
            {sub.stripeSubscriptionId}
          </p>
        </div>
        <span
          className={`inline-block px-3 py-1 rounded-full text-[11px] font-medium uppercase tracking-wider border ${STATUS_STYLES[sub.status]}`}
        >
          {STATUS_LABEL[sub.status]}
        </span>
      </div>

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
