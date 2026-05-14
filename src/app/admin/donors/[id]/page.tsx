import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminSession } from "@/lib/admin-session";
import {
  fetchDonorProfile,
  type DonorTimelineEvent,
} from "@/lib/donor-profile";
import { formatPence } from "@/lib/bazaar-format";
import { formatAdminDate } from "@/lib/admin-donations";

export const metadata: Metadata = {
  title: "Donor profile | Deen Relief Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Unified donor activity profile.
 *
 * Two roles in one page:
 *   1. Identity panel — name, email, address, Stripe customer id,
 *      lifetime stats (total given, GA reclaimable, # orders, # open
 *      inquiries, etc.)
 *   2. Chronological timeline — every interaction across both
 *      donations and bazaar in one stream, newest first.
 *
 * Useful for the "client phoned about Sara K., I need 5 seconds of
 * context" moment — and for the "is this person worth a hand-
 * written thank-you" judgement call on major-donor outreach.
 *
 * Linking model: only people who have a row in the `donors` table
 * appear here. People with bazaar orders but no donation history
 * don't exist as donors yet — the existing bazaar order detail
 * page is their natural entry point.
 */
export default async function AdminDonorProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminSession();
  const { id } = await params;

  const profile = await fetchDonorProfile(id);
  if (!profile) notFound();

  const { profile: donor, stats, timeline } = profile;

  const displayName =
    donor.fullName ??
    [donor.firstName, donor.lastName].filter(Boolean).join(" ") ??
    donor.email;

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page header */}
      <div className="mb-6">
        <Link
          href="/admin/donations"
          className="text-charcoal/60 hover:text-charcoal text-xs uppercase tracking-[0.1em] font-bold transition-colors"
        >
          ← All donations
        </Link>
        <h1 className="text-charcoal font-heading font-bold text-2xl sm:text-3xl mt-1">
          {displayName}
        </h1>
        <p className="text-charcoal/60 text-sm mt-1">
          <a
            href={`mailto:${donor.email}`}
            className="text-green underline hover:text-green-dark transition-colors"
          >
            {donor.email}
          </a>
          {donor.phone && (
            <>
              {" · "}
              <span className="font-mono">{donor.phone}</span>
            </>
          )}
        </p>
      </div>

      <div className="grid lg:grid-cols-[1fr_300px] gap-6">
        {/* Main column — lifetime stats + timeline */}
        <div className="space-y-6">
          {/* Lifetime stats panel */}
          <section className="bg-white border border-charcoal/10 rounded-2xl p-5 sm:p-6">
            <h2 className="text-xs font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-4">
              Lifetime activity
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
              <Stat
                label="Total given"
                value={formatPence(stats.donationsTotalPence)}
                accent
              />
              <Stat
                label="Gift Aid eligible"
                value={formatPence(stats.donationsGiftAidPence)}
              />
              <Stat
                label="Donations"
                value={stats.donationsCount.toString()}
                sub={
                  stats.firstDonationAt
                    ? `since ${shortDate(stats.firstDonationAt)}`
                    : "none yet"
                }
              />
              <Stat
                label="Bazaar orders"
                value={stats.bazaarOrdersCount.toString()}
                sub={
                  stats.bazaarOrdersTotalPence > 0
                    ? formatPence(stats.bazaarOrdersTotalPence)
                    : "none yet"
                }
              />
            </div>

            {/* Status badges */}
            <div className="flex flex-wrap gap-2">
              {stats.hasActiveRecurring && (
                <Badge tone="green">
                  Active monthly · {formatPence(stats.activeRecurringMonthlyPence)}/mo
                </Badge>
              )}
              {stats.openInquiriesCount > 0 && (
                <Badge tone="amber">
                  {stats.openInquiriesCount} open inquir{stats.openInquiriesCount === 1 ? "y" : "ies"}
                </Badge>
              )}
              {stats.isLapsed && stats.lastDonationAt && (
                <Badge tone="charcoal">
                  Lapsed · last gave {shortDate(stats.lastDonationAt)}
                </Badge>
              )}
              {stats.donationsCount === 0 && stats.bazaarOrdersCount === 0 && (
                <Badge tone="charcoal">No activity yet</Badge>
              )}
            </div>
          </section>

          {/* Timeline */}
          <section className="bg-white border border-charcoal/10 rounded-2xl overflow-hidden">
            <header className="px-5 py-4 border-b border-charcoal/10">
              <h2 className="text-charcoal font-heading font-semibold">
                Activity timeline
              </h2>
              <p className="text-charcoal/50 text-[11px] mt-0.5">
                {timeline.length} event{timeline.length === 1 ? "" : "s"} —
                newest first
              </p>
            </header>

            {timeline.length === 0 ? (
              <div className="px-5 py-12 text-center text-charcoal/50 text-sm">
                No recorded activity yet.
              </div>
            ) : (
              <ol className="divide-y divide-charcoal/8">
                {timeline.map((event, idx) => (
                  <TimelineRow key={`${event.type}-${idx}`} event={event} />
                ))}
              </ol>
            )}
          </section>
        </div>

        {/* Side panel — contact + identity */}
        <aside className="space-y-4">
          <section className="bg-white border border-charcoal/10 rounded-2xl p-5">
            <h3 className="text-xs font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-3">
              Contact
            </h3>
            <dl className="space-y-3 text-sm">
              <Field label="Email" value={donor.email} mono />
              {donor.phone && (
                <Field label="Phone" value={donor.phone} mono />
              )}
              {(donor.addressLine1 || donor.city || donor.postcode) && (
                <div>
                  <dt className="text-[11px] uppercase tracking-wider font-bold text-charcoal/40 mb-1">
                    Address
                  </dt>
                  <dd className="text-charcoal text-sm leading-relaxed not-italic">
                    {donor.addressLine1 && (
                      <>
                        {donor.addressLine1}
                        <br />
                      </>
                    )}
                    {donor.addressLine2 && (
                      <>
                        {donor.addressLine2}
                        <br />
                      </>
                    )}
                    {donor.city && donor.city}
                    {donor.city && donor.postcode && ", "}
                    {donor.postcode && (
                      <span className="font-mono">{donor.postcode}</span>
                    )}
                  </dd>
                </div>
              )}
            </dl>
          </section>

          {donor.stripeCustomerId && (
            <section className="bg-white border border-charcoal/10 rounded-2xl p-5">
              <h3 className="text-xs font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-3">
                Stripe
              </h3>
              <p className="font-mono text-[11px] text-charcoal/70 break-all mb-3">
                {donor.stripeCustomerId}
              </p>
              <a
                href={`https://dashboard.stripe.com/customers/${donor.stripeCustomerId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-charcoal/70 hover:text-charcoal transition-colors"
              >
                Open in Stripe ↗
              </a>
            </section>
          )}

          <section className="bg-white border border-charcoal/10 rounded-2xl p-5">
            <h3 className="text-xs font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-3">
              First seen
            </h3>
            <p className="text-sm text-charcoal/80">
              {formatAdminDate(donor.firstSeenAt)}
            </p>
          </section>
        </aside>
      </div>
    </main>
  );
}

// ─── Reusable bits ─────────────────────────────────────────────

function Stat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal/50 mb-1">
        {label}
      </p>
      <p
        className={`font-heading font-bold text-xl sm:text-2xl leading-tight ${
          accent ? "text-green-dark" : "text-charcoal"
        }`}
      >
        {value}
      </p>
      {sub && (
        <p className="text-[11px] text-charcoal/40 mt-0.5">{sub}</p>
      )}
    </div>
  );
}

function Badge({
  tone,
  children,
}: {
  tone: "green" | "amber" | "charcoal";
  children: React.ReactNode;
}) {
  const styles: Record<typeof tone, string> = {
    green: "bg-green/10 text-green-dark border-green/30",
    amber: "bg-amber-light text-amber-dark border-amber/30",
    charcoal: "bg-charcoal/8 text-charcoal/60 border-charcoal/15",
  };
  return (
    <span
      className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium uppercase tracking-wider border ${styles[tone]}`}
    >
      {children}
    </span>
  );
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wider font-bold text-charcoal/40 mb-0.5">
        {label}
      </dt>
      <dd
        className={`text-charcoal text-sm ${mono ? "font-mono break-all" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}

function shortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

// ─── Timeline row renderer ─────────────────────────────────────

function TimelineRow({ event }: { event: DonorTimelineEvent }) {
  switch (event.type) {
    case "donation":
      return (
        <li>
          <Link
            href={`/admin/donations/${event.donation.id}`}
            className="block px-5 py-4 hover:bg-cream/40 transition-colors"
          >
            <div className="flex items-start gap-3">
              <Icon kind="donation" />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-charcoal font-semibold text-sm">
                    {event.donation.status === "succeeded"
                      ? "Donated"
                      : event.donation.status === "refunded"
                      ? "Refunded donation"
                      : event.donation.status === "failed"
                      ? "Failed donation"
                      : "Pending donation"}{" "}
                    <span className="font-mono text-charcoal/60 text-[12px]">
                      · {event.donation.receiptNumber}
                    </span>
                  </p>
                  <p className="text-charcoal font-semibold text-sm whitespace-nowrap">
                    {formatPence(event.donation.amountPence)}
                  </p>
                </div>
                <p className="text-charcoal/60 text-[12px] mt-0.5">
                  {event.donation.campaignLabel}
                  {event.donation.frequency === "monthly" && " · Monthly"}
                  {event.donation.giftAidClaimed &&
                    !event.donation.giftAidDeclarationRevoked &&
                    " · Gift Aid"}
                </p>
                <p className="text-charcoal/40 text-[11px] mt-0.5">
                  {formatAdminDate(event.at)}
                </p>
              </div>
            </div>
          </Link>
        </li>
      );

    case "donation_message":
      return (
        <li>
          <Link
            href={`/admin/donations/${event.donationId}`}
            className="block px-5 py-4 hover:bg-cream/40 transition-colors"
          >
            <div className="flex items-start gap-3">
              <Icon kind="email" />
              <div className="flex-1 min-w-0">
                <p className="text-charcoal text-sm">
                  Email sent ·{" "}
                  <span className="text-charcoal/60 font-mono text-[12px]">
                    {event.donationReceipt}
                  </span>
                </p>
                <p className="text-charcoal/70 text-[12px] mt-0.5 truncate">
                  &ldquo;{event.message.subject}&rdquo;
                </p>
                <p className="text-charcoal/40 text-[11px] mt-0.5">
                  By {event.message.authorEmail} · {formatAdminDate(event.at)}
                </p>
              </div>
            </div>
          </Link>
        </li>
      );

    case "bazaar_order":
      return (
        <li>
          <Link
            href={`/admin/bazaar/orders/${event.order.id}`}
            className="block px-5 py-4 hover:bg-cream/40 transition-colors"
          >
            <div className="flex items-start gap-3">
              <Icon kind="bag" />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-charcoal font-semibold text-sm">
                    Bazaar order{" "}
                    <span className="font-mono text-charcoal/60 text-[12px]">
                      · {event.order.receiptNumber}
                    </span>
                  </p>
                  <p className="text-charcoal font-semibold text-sm whitespace-nowrap">
                    {formatPence(event.order.totalPence)}
                  </p>
                </div>
                <p className="text-charcoal/60 text-[12px] mt-0.5 capitalize">
                  {event.order.itemCount} item
                  {event.order.itemCount === 1 ? "" : "s"} ·{" "}
                  {event.order.status.replace(/_/g, " ")}
                </p>
                <p className="text-charcoal/40 text-[11px] mt-0.5">
                  {formatAdminDate(event.at)}
                </p>
              </div>
            </div>
          </Link>
        </li>
      );

    case "bazaar_order_message":
      return (
        <li>
          <Link
            href={`/admin/bazaar/orders/${event.orderId}`}
            className="block px-5 py-4 hover:bg-cream/40 transition-colors"
          >
            <div className="flex items-start gap-3">
              <Icon kind="email" />
              <div className="flex-1 min-w-0">
                <p className="text-charcoal text-sm">
                  Order email sent ·{" "}
                  <span className="text-charcoal/60 font-mono text-[12px]">
                    {event.orderReceipt}
                  </span>
                </p>
                <p className="text-charcoal/70 text-[12px] mt-0.5 truncate">
                  &ldquo;{event.message.subject}&rdquo;
                </p>
                <p className="text-charcoal/40 text-[11px] mt-0.5">
                  By {event.message.authorEmail} · {formatAdminDate(event.at)}
                </p>
              </div>
            </div>
          </Link>
        </li>
      );

    case "bazaar_inquiry":
      return (
        <li>
          <Link
            href={`/admin/bazaar/inquiries/${event.inquiry.id}`}
            className="block px-5 py-4 hover:bg-cream/40 transition-colors"
          >
            <div className="flex items-start gap-3">
              <Icon kind="chat" />
              <div className="flex-1 min-w-0">
                <p className="text-charcoal text-sm">
                  Inquiry · <span className="capitalize">{event.inquiry.status}</span>
                </p>
                <p className="text-charcoal/70 text-[12px] mt-0.5 truncate">
                  {event.inquiry.subject}
                </p>
                <p className="text-charcoal/40 text-[11px] mt-0.5">
                  {formatAdminDate(event.at)}
                </p>
              </div>
            </div>
          </Link>
        </li>
      );
  }
}

function Icon({ kind }: { kind: "donation" | "email" | "bag" | "chat" }) {
  const tone =
    kind === "donation"
      ? "bg-green/10 text-green-dark"
      : kind === "bag"
      ? "bg-amber-light text-amber-dark"
      : kind === "chat"
      ? "bg-blue-50 text-blue-700"
      : "bg-charcoal/5 text-charcoal/60";
  return (
    <div
      className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${tone}`}
    >
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        {kind === "donation" && (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"
          />
        )}
        {kind === "bag" && (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007Z"
          />
        )}
        {kind === "email" && (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
          />
        )}
        {kind === "chat" && (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.068.157 2.148.279 3.238.364.466.037.893.281 1.153.671L12 21l2.652-3.978c.26-.39.687-.634 1.153-.67 1.09-.086 2.17-.208 3.238-.365 1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"
          />
        )}
      </svg>
    </div>
  );
}
