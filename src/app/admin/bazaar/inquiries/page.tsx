import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminSession } from "@/lib/admin-session";
import {
  fetchInquiries,
  type BazaarInquiryRow,
  type InquiryStatus,
} from "@/lib/bazaar-inquiries";
import { bazaarReceiptNumber } from "@/lib/bazaar-order-email";
import { formatAdminDate } from "@/lib/admin-donations";

export const metadata: Metadata = {
  title: "Inquiries | Bazaar Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Inbox for customer inquiries submitted via /bazaar/contact.
 *
 * Default view sorts by "most recent activity" so anything fresh
 * (or anything where the customer just replied — if we ever wire
 * inbound capture) bubbles to the top. The status filter chips at
 * the top let a trustee narrow to "open" when working through the
 * queue.
 *
 * The page intentionally doesn't show the message body itself —
 * just the subject + customer + order link. Clicking through to
 * the detail page is the right place to read full content, and
 * keeps this list scannable at a glance.
 */
export default async function AdminInquiriesListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminSession();
  const sp = await searchParams;
  const statusFilter = parseStatusFilter(sp.status);

  const inquiries = await fetchInquiries({ status: statusFilter ?? undefined });

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <span className="block text-[11px] font-bold tracking-[0.15em] uppercase text-amber-dark mb-1">
          Bazaar inbox
        </span>
        <h1 className="text-charcoal font-heading font-bold text-2xl sm:text-3xl">
          Customer inquiries
        </h1>
        <p className="text-grey text-sm mt-2 max-w-2xl">
          Every message sent via the bazaar contact form lands here.
          Reply directly — outbound replies go from{" "}
          <span className="font-mono">info@deenrelief.org</span> with
          a full chat log kept on each conversation.
        </p>
      </div>

      {/* Status filter chips. Plain links so the URL stays the
          source of truth and back/forward navigation works. */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <StatusChip current={statusFilter} target={null} label="All" />
        <StatusChip current={statusFilter} target="open" label="Open" />
        <StatusChip current={statusFilter} target="replied" label="Replied" />
        <StatusChip current={statusFilter} target="closed" label="Closed" />
      </div>

      <div className="bg-white border border-charcoal/10 rounded-2xl overflow-hidden">
        {inquiries.length === 0 ? (
          <div className="p-12 text-center text-charcoal/60 text-sm">
            {statusFilter
              ? `No ${statusFilter} inquiries.`
              : "No inquiries yet. New customer messages will land here."}
          </div>
        ) : (
          <>
          {/* Mobile card list (<md). One card per inquiry — subject
              up top, customer + last activity below, status pill on
              the right. Compact enough that 5–6 fit above the fold
              on a typical phone. */}
          <ul className="md:hidden divide-y divide-charcoal/8">
            {inquiries.map((inq) => {
              const receipt = inq.orderId ? bazaarReceiptNumber(inq.orderId) : null;
              return (
                <li key={inq.id}>
                  <Link
                    href={`/admin/bazaar/inquiries/${inq.id}`}
                    className="block px-4 py-4 active:bg-cream/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <p className="text-charcoal font-semibold text-[14px] truncate">
                        {inq.subject}
                      </p>
                      <StatusBadge status={inq.status} />
                    </div>
                    <p className="text-charcoal/70 text-[12px] truncate">
                      {inq.customerName}{" "}
                      <span className="text-charcoal/40">·</span>{" "}
                      <span className="text-charcoal/50">
                        {inq.customerEmail}
                      </span>
                    </p>
                    <p className="text-charcoal/50 text-[11px] mt-1 flex items-center gap-2 flex-wrap">
                      <span>{formatAdminDate(inq.lastMessageAt)}</span>
                      {receipt && (
                        <>
                          <span className="text-charcoal/30">·</span>
                          <span className="font-mono text-green-dark">
                            {receipt}
                          </span>
                        </>
                      )}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="bg-cream border-b border-charcoal/10">
                <tr className="text-left">
                  {[
                    "When",
                    "Customer",
                    "Subject",
                    "Order",
                    "Status",
                    "Last activity",
                    "",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3 font-bold uppercase tracking-[0.1em] text-charcoal/60 text-[11px] whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-charcoal/8">
                {inquiries.map((inq) => (
                  <InquiryRow key={inq.id} inquiry={inq} />
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>

      {inquiries.length > 0 && (
        <p className="mt-4 text-[11px] text-charcoal/40">
          {inquiries.length} {inquiries.length === 1 ? "row" : "rows"} shown.
        </p>
      )}
    </main>
  );
}

function parseStatusFilter(
  raw: string | string[] | undefined
): InquiryStatus | null {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (v === "open" || v === "replied" || v === "closed") return v;
  return null;
}

function StatusChip({
  current,
  target,
  label,
}: {
  current: InquiryStatus | null;
  target: InquiryStatus | null;
  label: string;
}) {
  const isActive = current === target;
  const href = target ? `/admin/bazaar/inquiries?status=${target}` : `/admin/bazaar/inquiries`;
  return (
    <Link
      href={href}
      className={`px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-colors ${
        isActive
          ? "bg-charcoal text-white border-charcoal"
          : "bg-white border-charcoal/15 text-charcoal/70 hover:border-charcoal/40 hover:text-charcoal"
      }`}
    >
      {label}
    </Link>
  );
}

function InquiryRow({ inquiry }: { inquiry: BazaarInquiryRow }) {
  const receipt = inquiry.orderId ? bazaarReceiptNumber(inquiry.orderId) : null;
  return (
    <tr className="hover:bg-cream/50 transition-colors">
      <td className="px-5 py-4 text-charcoal/70 whitespace-nowrap">
        {formatAdminDate(inquiry.createdAt)}
      </td>
      <td className="px-5 py-4">
        <div className="text-charcoal font-medium">{inquiry.customerName}</div>
        <div className="text-charcoal/50 text-[11px]">{inquiry.customerEmail}</div>
      </td>
      <td className="px-5 py-4 text-charcoal/80">{inquiry.subject}</td>
      <td className="px-5 py-4 whitespace-nowrap">
        {receipt ? (
          <Link
            href={`/admin/bazaar/orders/${inquiry.orderId}`}
            className="font-mono text-[11px] text-green-dark hover:underline"
          >
            {receipt}
          </Link>
        ) : inquiry.orderNumberRaw ? (
          <span
            className="font-mono text-[11px] text-charcoal/40"
            title="Customer cited an order number but it didn't match"
          >
            {inquiry.orderNumberRaw}
          </span>
        ) : (
          <span className="text-charcoal/30 text-[11px]">—</span>
        )}
      </td>
      <td className="px-5 py-4">
        <StatusBadge status={inquiry.status} />
      </td>
      <td className="px-5 py-4 text-charcoal/60 text-[11px] whitespace-nowrap">
        {formatAdminDate(inquiry.lastMessageAt)}
      </td>
      <td className="px-5 py-4 text-right whitespace-nowrap">
        <Link
          href={`/admin/bazaar/inquiries/${inquiry.id}`}
          className="text-green text-sm font-medium hover:underline"
        >
          Open →
        </Link>
      </td>
    </tr>
  );
}

function StatusBadge({ status }: { status: InquiryStatus }) {
  const styles: Record<InquiryStatus, string> = {
    open: "bg-amber-light text-amber-dark border-amber/30",
    replied: "bg-green/10 text-green-dark border-green/30",
    closed: "bg-charcoal/8 text-charcoal/60 border-charcoal/15",
  };
  return (
    <span
      className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium uppercase tracking-wider border ${styles[status]}`}
    >
      {status}
    </span>
  );
}
