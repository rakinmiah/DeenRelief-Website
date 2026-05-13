import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminSession } from "@/lib/admin-session";
import {
  fetchAdminDonationById,
  formatAdminDate,
  type AdminDonationStatus,
} from "@/lib/admin-donations";
import { formatPence } from "@/lib/bazaar-format";
import {
  fetchDonationMessages,
  type DonationMessageRow,
} from "@/lib/donation-messages";
import DonationActionsClient from "./DonationActionsClient";
import DonationMessageClient from "./DonationMessageClient";
import DeleteDonationClient from "./DeleteDonationClient";

export const metadata: Metadata = {
  title: "Donation detail | Deen Relief Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

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

/**
 * Donation detail — fully wired to real Supabase data.
 *
 * If a trustee opens a URL with an unknown id (e.g. a stale link), we
 * 404 rather than render an empty shell.
 */
export default async function AdminDonationDetailPage({ params }: RouteParams) {
  await requireAdminSession();
  const { id } = await params;
  const donation = await fetchAdminDonationById(id);
  if (!donation) notFound();

  // History of admin-initiated emails sent in connection with this
  // donation. Empty array when none — the UI renders the composer
  // either way and only shows the history list when something's
  // been sent.
  const messageHistory = await fetchDonationMessages(donation.id);

  const totalWithGiftAid =
    donation.amountPence + donation.giftAidReclaimablePence;
  const isMonthly = donation.frequency === "monthly";
  const stripeRef =
    donation.stripePaymentIntent ??
    donation.stripeSetupIntent ??
    null;

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
          {STATUS_LABEL[donation.status]}
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
              {donation.giftAidClaimed && !donation.giftAidDeclarationRevoked && (
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
              <div className="grid grid-cols-[140px_1fr] gap-3">
                <dt className="text-charcoal/60">Frequency</dt>
                <dd className="text-charcoal">
                  {isMonthly ? "Monthly recurring" : "One-time"}
                </dd>
              </div>
              <div className="grid grid-cols-[140px_1fr] gap-3">
                <dt className="text-charcoal/60">Charged at</dt>
                <dd className="text-charcoal">
                  {donation.chargedAt
                    ? formatAdminDate(donation.chargedAt)
                    : "—"}
                </dd>
              </div>
              <div className="grid grid-cols-[140px_1fr] gap-3">
                <dt className="text-charcoal/60">Created at</dt>
                <dd className="text-charcoal">
                  {formatAdminDate(donation.createdAt)}
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
              {donation.donorPhone && (
                <div className="grid grid-cols-[140px_1fr] gap-3">
                  <dt className="text-charcoal/60">Phone</dt>
                  <dd className="text-charcoal">{donation.donorPhone}</dd>
                </div>
              )}
              {donation.donorAddressLine1 && (
                <div className="grid grid-cols-[140px_1fr] gap-3">
                  <dt className="text-charcoal/60">Address</dt>
                  <dd className="text-charcoal not-italic leading-relaxed">
                    {donation.donorAddressLine1}
                    {donation.donorAddressLine2 && (
                      <>
                        <br />
                        {donation.donorAddressLine2}
                      </>
                    )}
                    {donation.donorCity && (
                      <>
                        <br />
                        {donation.donorCity}
                      </>
                    )}
                    {donation.donorPostcode && (
                      <>
                        {donation.donorCity ? ", " : <br />}
                        {donation.donorPostcode}
                      </>
                    )}
                  </dd>
                </div>
              )}
              {donation.donorStripeCustomerId && (
                <div className="grid grid-cols-[140px_1fr] gap-3">
                  <dt className="text-charcoal/60">Stripe customer</dt>
                  <dd>
                    <span className="font-mono text-[11px] text-charcoal/70">
                      {donation.donorStripeCustomerId}
                    </span>
                  </dd>
                </div>
              )}
            </dl>
          </section>

          {/* Gift Aid declaration */}
          <section className="bg-white border border-charcoal/10 rounded-2xl p-5 sm:p-6">
            <h2 className="text-xs font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-3">
              Gift Aid declaration
            </h2>
            {donation.giftAidClaimed && !donation.giftAidDeclarationRevoked ? (
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
                  Reclaimable: {formatPence(donation.giftAidReclaimablePence)}
                </p>
              </>
            ) : donation.giftAidClaimed && donation.giftAidDeclarationRevoked ? (
              <p className="text-sm text-amber-dark">
                Donor originally claimed Gift Aid but has since revoked
                the declaration. This donation is no longer eligible for
                HMRC reclaim.
              </p>
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
              {stripeRef && (
                <div className="grid grid-cols-[140px_1fr] gap-3">
                  <dt className="text-charcoal/60">
                    {donation.stripePaymentIntent
                      ? "Payment intent"
                      : "Setup intent"}
                  </dt>
                  <dd className="font-mono text-[11px] text-charcoal/70 break-all">
                    {stripeRef}
                  </dd>
                </div>
              )}
              {donation.stripeCustomerId && (
                <div className="grid grid-cols-[140px_1fr] gap-3">
                  <dt className="text-charcoal/60">Customer</dt>
                  <dd className="font-mono text-[11px] text-charcoal/70 break-all">
                    {donation.stripeCustomerId}
                  </dd>
                </div>
              )}
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
            {stripeRef && (
              <a
                href={`https://dashboard.stripe.com/payments/${stripeRef}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-4 text-sm text-charcoal/70 hover:text-charcoal transition-colors"
              >
                Open in Stripe dashboard ↗
              </a>
            )}
          </section>

          {/* Attribution (where did this donor come from) */}
          {(donation.gclid || donation.utmSource || donation.utmCampaign) && (
            <section className="bg-white border border-charcoal/10 rounded-2xl p-5 sm:p-6">
              <h2 className="text-xs font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-3">
                Attribution
              </h2>
              <dl className="space-y-2 text-sm">
                {donation.gclid && (
                  <div className="grid grid-cols-[140px_1fr] gap-3">
                    <dt className="text-charcoal/60">Google click ID</dt>
                    <dd className="font-mono text-[11px] text-charcoal/70 break-all">
                      {donation.gclid}
                    </dd>
                  </div>
                )}
                {donation.utmSource && (
                  <div className="grid grid-cols-[140px_1fr] gap-3">
                    <dt className="text-charcoal/60">UTM source</dt>
                    <dd className="text-charcoal">{donation.utmSource}</dd>
                  </div>
                )}
                {donation.utmMedium && (
                  <div className="grid grid-cols-[140px_1fr] gap-3">
                    <dt className="text-charcoal/60">UTM medium</dt>
                    <dd className="text-charcoal">{donation.utmMedium}</dd>
                  </div>
                )}
                {donation.utmCampaign && (
                  <div className="grid grid-cols-[140px_1fr] gap-3">
                    <dt className="text-charcoal/60">UTM campaign</dt>
                    <dd className="text-charcoal">{donation.utmCampaign}</dd>
                  </div>
                )}
              </dl>
            </section>
          )}
        </div>

        {/* Side panel — actions wired to real Stripe + Resend endpoints */}
        <aside className="space-y-4">
          <DonationActionsClient
            internalId={donation.id}
            status={donation.status}
            frequency={donation.frequency}
            amountFormatted={formatPence(donation.amountPence)}
            donorEmail={donation.donorEmail}
            giftAidClaimed={
              donation.giftAidClaimed &&
              !donation.giftAidDeclarationRevoked
            }
          />
        </aside>
      </div>

      {/* Send-email composer + history. Sits below the main two-
          column layout so it's a deliberate scroll-to-find — most
          interactions with a donation don't involve sending a
          custom email, but when they do the trustee gets a full
          composer + an audit trail of every prior send on this
          donation. */}
      <section className="mt-10 pt-8 border-t border-charcoal/10">
        <div className="mb-4">
          <span className="block text-[11px] font-bold tracking-[0.15em] uppercase text-green-dark mb-1">
            Donor communication
          </span>
          <h2 className="text-charcoal font-heading font-semibold text-lg">
            Send an email to {donation.donorFirstName || "the donor"}
          </h2>
          <p className="text-charcoal/60 text-sm mt-1">
            For one-off notes — refund explanations, programme
            updates, thank-yous for major gifts. Every send is logged
            below.
          </p>
        </div>

        <div className="bg-white border border-charcoal/10 rounded-2xl p-5">
          {donation.donorEmail ? (
            <DonationMessageClient
              donationId={donation.id}
              donorEmail={donation.donorEmail}
            />
          ) : (
            <p className="text-sm text-charcoal/60">
              No donor email on file — can&apos;t send. Resending the
              receipt would require backfilling the email first.
            </p>
          )}
        </div>

        {messageHistory.length > 0 && (
          <div className="mt-8">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-3">
              History · {messageHistory.length} sent
            </h3>
            <ol className="space-y-3">
              {messageHistory.map((m) => (
                <MessageHistoryItem key={m.id} message={m} />
              ))}
            </ol>
          </div>
        )}
      </section>

      {/* Danger zone — hard delete. Sits below the donor-comms
          section so it's a deliberate scroll-to-find. Hard-stops
          on Gift Aid claimed donations (HMRC 6-year retention).
          Typed `DELETE` confirm + a "this is real donor data"
          warning panel for all other deletes. */}
      <div className="mt-10">
        <DeleteDonationClient
          donationId={donation.id}
          receiptNumber={donation.receiptNumber}
          amountFormatted={formatPence(donation.amountPence)}
          donorEmail={donation.donorEmail}
          giftAidClaimed={donation.giftAidClaimed}
          giftAidRevoked={donation.giftAidDeclarationRevoked}
        />
      </div>
    </main>
  );
}

function MessageHistoryItem({ message }: { message: DonationMessageRow }) {
  const failed = !message.resendMessageId;
  return (
    <li
      className={`rounded-2xl border p-4 ${
        failed
          ? "bg-red-50/30 border-red-200/60"
          : "bg-white border-charcoal/10"
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <p className="text-charcoal font-medium text-sm truncate">
            {message.subject}
          </p>
          <p className="text-[11px] text-charcoal/50 mt-0.5">
            From{" "}
            <span className="font-mono">{message.authorEmail}</span> · to{" "}
            <span className="font-mono">{message.toEmail}</span>
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <p className="text-[11px] text-charcoal/40 whitespace-nowrap">
            {formatAdminDate(message.createdAt)}
          </p>
          {failed ? (
            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border bg-red-50 text-red-700 border-red-200">
              Send failed
            </span>
          ) : (
            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border bg-green/10 text-green-dark border-green/30">
              Sent
            </span>
          )}
        </div>
      </div>
      <p className="text-charcoal/80 text-sm leading-[1.65] whitespace-pre-line">
        {message.body}
      </p>
    </li>
  );
}
