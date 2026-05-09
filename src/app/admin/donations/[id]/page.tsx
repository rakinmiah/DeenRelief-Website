import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  findDonationById,
  formatAdminDate,
  type DonationStatus,
} from "@/lib/admin-placeholder";
import { formatPence } from "@/lib/bazaar-format";

export const metadata: Metadata = {
  title: "Donation detail | Deen Relief Admin",
  robots: { index: false, follow: false },
};

interface RouteParams {
  params: Promise<{ id: string }>;
}

const STATUS_STYLES: Record<DonationStatus, string> = {
  paid: "bg-green/10 text-green-dark border-green/30",
  pending: "bg-amber-light text-amber-dark border-amber/30",
  failed: "bg-red-50 text-red-700 border-red-200",
  refunded: "bg-charcoal/8 text-charcoal/60 border-charcoal/15",
};

/**
 * Donation detail page.
 *
 * Designed so a trustee or staff member can answer, in 30 seconds,
 * every question they're likely to be asked about a single donation:
 *   - Did it actually go through? (Status badge + Stripe payment intent)
 *   - Who donated? (Donor card, links to donor history)
 *   - Where did it go? (Campaign + pathway)
 *   - Did the donor claim Gift Aid? (Declaration block with version
 *     and acceptance timestamp)
 *   - How does this map to Stripe? (Payment intent ID, customer ID,
 *     "Open in Stripe" link)
 *   - If recurring, where does it sit in the subscription history?
 *     (Linked subscription card)
 *
 * Action panel:
 *   - Refund — for one-time donations within Stripe's refund window.
 *   - Resend receipt — re-trigger the Resend email.
 *   - Open in Stripe — deep link to the Stripe dashboard.
 *
 * Internal notes — free-text per donation, audit-trailed.
 */
export default async function AdminDonationDetailPage({
  params,
}: RouteParams) {
  const { id } = await params;
  const donation = findDonationById(id);
  if (!donation) notFound();

  const totalWithGiftAid =
    donation.amountPence + donation.giftAidReclaimablePence;
  const isMonthly = donation.frequency === "monthly";

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link
            href="/admin/donations"
            className="inline-block text-charcoal/60 hover:text-charcoal text-xs uppercase tracking-[0.1em] font-bold transition-colors mb-1"
          >
            ← All donations
          </Link>
          <h1 className="text-charcoal font-heading font-semibold text-xl sm:text-2xl font-mono">
            {donation.receiptNumber}
          </h1>
        </div>
        <span
          className={`inline-block px-3 py-1 rounded-full text-[11px] font-medium uppercase tracking-wider border ${STATUS_STYLES[donation.status]}`}
        >
          {donation.status}
        </span>
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        {/* Main column */}
        <div className="space-y-5">
          {/* Amount + breakdown */}
          <section className="bg-white border border-charcoal/10 rounded-2xl p-5 sm:p-6">
            <h2 className="text-xs font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-3">
              Amount
            </h2>
            <p className="text-3xl sm:text-4xl font-heading font-bold text-charcoal mb-4">
              {formatPence(donation.amountPence)}
            </p>
            <dl className="space-y-2 text-sm border-t border-charcoal/10 pt-4">
              <div className="flex justify-between">
                <dt className="text-charcoal/70">Donor paid</dt>
                <dd className="text-charcoal">
                  {formatPence(donation.amountPence)}
                </dd>
              </div>
              {donation.giftAidClaimed && (
                <div className="flex justify-between">
                  <dt className="text-charcoal/70">
                    Gift Aid (reclaimable from HMRC)
                  </dt>
                  <dd className="text-green-dark font-medium">
                    +{formatPence(donation.giftAidReclaimablePence)}
                  </dd>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-charcoal/10 mt-2">
                <dt className="text-charcoal font-semibold">
                  Total to charity
                </dt>
                <dd className="text-charcoal font-semibold">
                  {formatPence(totalWithGiftAid)}
                </dd>
              </div>
            </dl>
          </section>

          {/* Allocation */}
          <section className="bg-white border border-charcoal/10 rounded-2xl p-5 sm:p-6">
            <h2 className="text-xs font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-3">
              Allocation
            </h2>
            <dl className="space-y-2.5 text-sm">
              <div className="grid grid-cols-[140px_1fr] gap-3">
                <dt className="text-charcoal/60">Campaign</dt>
                <dd className="text-charcoal">{donation.campaignLabel}</dd>
              </div>
              {donation.pathway && (
                <div className="grid grid-cols-[140px_1fr] gap-3">
                  <dt className="text-charcoal/60">Zakat pathway</dt>
                  <dd className="text-charcoal italic">{donation.pathway}</dd>
                </div>
              )}
              <div className="grid grid-cols-[140px_1fr] gap-3">
                <dt className="text-charcoal/60">Frequency</dt>
                <dd className="text-charcoal">
                  {isMonthly ? "Monthly recurring" : "One-time"}
                </dd>
              </div>
              <div className="grid grid-cols-[140px_1fr] gap-3">
                <dt className="text-charcoal/60">Charged at</dt>
                <dd className="text-charcoal">
                  {formatAdminDate(donation.chargedAt)}
                </dd>
              </div>
            </dl>
          </section>

          {/* Donor */}
          <section className="bg-white border border-charcoal/10 rounded-2xl p-5 sm:p-6">
            <h2 className="text-xs font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-3">
              Donor
            </h2>
            <dl className="space-y-2.5 text-sm">
              <div className="grid grid-cols-[140px_1fr] gap-3">
                <dt className="text-charcoal/60">Name</dt>
                <dd className="text-charcoal font-medium">
                  {donation.donorName}
                </dd>
              </div>
              <div className="grid grid-cols-[140px_1fr] gap-3">
                <dt className="text-charcoal/60">Email</dt>
                <dd className="text-charcoal">
                  <a
                    href={`mailto:${donation.donorEmail}`}
                    className="text-green underline"
                  >
                    {donation.donorEmail}
                  </a>
                </dd>
              </div>
              <div className="grid grid-cols-[140px_1fr] gap-3">
                <dt className="text-charcoal/60">Stripe customer</dt>
                <dd>
                  <span className="font-mono text-[11px] text-charcoal/70">
                    {donation.stripeCustomerId}
                  </span>
                </dd>
              </div>
            </dl>
          </section>

          {/* Gift Aid declaration */}
          <section className="bg-white border border-charcoal/10 rounded-2xl p-5 sm:p-6">
            <h2 className="text-xs font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-3">
              Gift Aid declaration
            </h2>
            {donation.giftAidClaimed ? (
              <>
                <div className="mb-4 inline-flex items-center gap-1.5 text-green-dark text-sm font-medium">
                  <svg
                    className="w-4 h-4"
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
                  Donor has confirmed Gift Aid eligibility
                </div>
                <blockquote className="text-[12px] text-charcoal/70 leading-relaxed bg-cream p-4 rounded-lg border border-charcoal/10 italic">
                  &ldquo;I am a UK taxpayer and understand that if I pay
                  less Income Tax and/or Capital Gains Tax in the current
                  tax year than the amount of Gift Aid claimed on all my
                  donations, it is my responsibility to pay any
                  difference. I want to Gift Aid my donation and any
                  donations I make in the future or have made in the past
                  4 years to Deen Relief.&rdquo;
                </blockquote>
                <p className="mt-3 text-[11px] text-charcoal/50">
                  Declaration version 2 · accepted{" "}
                  {formatAdminDate(donation.chargedAt)} ·
                  reclaimable {formatPence(donation.giftAidReclaimablePence)}
                </p>
              </>
            ) : (
              <p className="text-sm text-charcoal/60">
                Donor declined Gift Aid (or didn&apos;t confirm UK
                taxpayer status).
              </p>
            )}
          </section>

          {/* Stripe metadata */}
          <section className="bg-white border border-charcoal/10 rounded-2xl p-5 sm:p-6">
            <h2 className="text-xs font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-3">
              Stripe reference
            </h2>
            <dl className="space-y-2 text-sm">
              <div className="grid grid-cols-[140px_1fr] gap-3">
                <dt className="text-charcoal/60">Payment intent</dt>
                <dd className="font-mono text-[11px] text-charcoal/70 break-all">
                  {donation.stripePaymentIntent}
                </dd>
              </div>
              {donation.stripeSubscriptionId && (
                <div className="grid grid-cols-[140px_1fr] gap-3">
                  <dt className="text-charcoal/60">Subscription</dt>
                  <dd>
                    <Link
                      href={`/admin/recurring`}
                      className="font-mono text-[11px] text-green underline break-all"
                    >
                      {donation.stripeSubscriptionId}
                    </Link>
                  </dd>
                </div>
              )}
            </dl>
            <a
              href="#"
              className="inline-flex items-center gap-1 mt-4 text-sm text-charcoal/70 hover:text-charcoal transition-colors"
            >
              Open in Stripe dashboard ↗
            </a>
          </section>
        </div>

        {/* Side panel — actions */}
        <aside className="space-y-4">
          <section className="bg-charcoal text-white rounded-2xl p-5">
            <h2 className="text-xs font-bold uppercase tracking-[0.1em] text-white/60 mb-3">
              Actions
            </h2>
            <div className="space-y-2">
              <button
                type="button"
                disabled
                className="w-full px-4 py-2.5 rounded-full bg-white/10 text-white text-sm font-medium hover:bg-white/15 transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-left"
              >
                Resend receipt email
              </button>
              <button
                type="button"
                disabled
                className="w-full px-4 py-2.5 rounded-full bg-white/10 text-white text-sm font-medium hover:bg-white/15 transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-left"
              >
                Download PDF receipt
              </button>
              {donation.status === "paid" && (
                <button
                  type="button"
                  disabled
                  className="w-full px-4 py-2.5 rounded-full bg-red-500/20 text-red-200 text-sm font-medium hover:bg-red-500/30 transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-left"
                >
                  Issue refund…
                </button>
              )}
            </div>
            <p className="mt-4 text-[10px] text-white/40 leading-relaxed">
              Disabled in pitch preview. Real version: Resend triggers
              the receipt template, refund posts to Stripe and writes a
              row to the audit log.
            </p>
          </section>

          {/* Internal notes */}
          <section className="bg-white border border-charcoal/10 rounded-2xl p-5">
            <h2 className="text-xs font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-3">
              Internal notes
            </h2>
            <textarea
              rows={5}
              disabled
              placeholder="Anything the team should know about this donation…"
              className="w-full px-3 py-2 rounded-lg bg-cream border border-charcoal/10 text-sm text-charcoal placeholder:text-charcoal/30 disabled:cursor-not-allowed"
            />
            <p className="mt-2 text-[11px] text-charcoal/40">
              Notes are stamped with the staff member&apos;s name and
              timestamp on save.
            </p>
          </section>

          {/* Audit timeline */}
          <section className="bg-white border border-charcoal/10 rounded-2xl p-5">
            <h2 className="text-xs font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-3">
              History
            </h2>
            <ol className="space-y-3 text-[12px]">
              <li className="flex gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green mt-1.5 flex-shrink-0" />
                <div>
                  <p className="text-charcoal">Payment received</p>
                  <p className="text-charcoal/50">
                    {formatAdminDate(donation.chargedAt)}
                  </p>
                </div>
              </li>
              <li className="flex gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-charcoal/30 mt-1.5 flex-shrink-0" />
                <div>
                  <p className="text-charcoal/70">Receipt emailed</p>
                  <p className="text-charcoal/50">
                    {formatAdminDate(donation.chargedAt)}
                  </p>
                </div>
              </li>
              {donation.giftAidClaimed && (
                <li className="flex gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-charcoal/30 mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="text-charcoal/70">
                      Gift Aid declaration recorded
                    </p>
                    <p className="text-charcoal/50">v2 · accepted</p>
                  </div>
                </li>
              )}
            </ol>
          </section>
        </aside>
      </div>
    </main>
  );
}
