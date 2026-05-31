import type { Metadata } from "next";
import Link from "next/link";
import { requireRoleAdmin } from "@/lib/admin-session";
import {
  fetchInquiries,
  type BazaarInquiryRow,
  type InquiryStatus,
} from "@/lib/bazaar-inquiries";
import { bazaarReceiptNumber } from "@/lib/bazaar-order-email";
import { formatAdminDate } from "@/lib/admin-donations";
import { BAZAAR_SUPPORT_EMAIL } from "@/lib/bazaar-config";
import {
  PageHeader,
  StatusBadge,
  ResponsiveTable,
  EmptyState,
  type Column,
} from "@/components/admin/ui";

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
  await requireRoleAdmin();
  const sp = await searchParams;
  const statusFilter = parseStatusFilter(sp.status);

  const inquiries = await fetchInquiries({ status: statusFilter ?? undefined });

  const inquiryColumns: Column<BazaarInquiryRow>[] = [
    {
      key: "when",
      header: "When",
      hideOnMobile: true,
      cell: (inq) => formatAdminDate(inq.createdAt),
      cellClassName: "whitespace-nowrap text-charcoal/70",
    },
    {
      key: "customer",
      header: "Customer",
      cell: (inq) => (
        <div>
          <div className="text-charcoal font-medium">{inq.customerName}</div>
          <div className="text-charcoal/50 text-[11px] break-all">{inq.customerEmail}</div>
        </div>
      ),
    },
    {
      key: "subject",
      header: "Subject",
      primary: true,
      cell: (inq) => inq.subject,
    },
    {
      key: "order",
      header: "Order",
      cell: (inq) => {
        const receipt = inq.orderId ? bazaarReceiptNumber(inq.orderId) : null;
        if (receipt) {
          return (
            <Link
              href={`/admin/bazaar/orders/${inq.orderId}`}
              className="font-mono text-[11px] text-green-dark hover:underline"
            >
              {receipt}
            </Link>
          );
        }
        if (inq.orderNumberRaw) {
          return (
            <span
              className="font-mono text-[11px] text-charcoal/40"
              title="Customer cited an order number but it didn't match"
            >
              {inq.orderNumberRaw}
            </span>
          );
        }
        return <span className="text-charcoal/30 text-[11px]">—</span>;
      },
    },
    {
      key: "status",
      header: "Status",
      secondary: true,
      cell: (inq) => <StatusBadge domain="bazaarInquiry" status={inq.status} variant="outline" />,
    },
    {
      key: "lastActivity",
      header: "Last activity",
      cell: (inq) => formatAdminDate(inq.lastMessageAt),
      cellClassName: "whitespace-nowrap text-charcoal/60 text-[11px]",
    },
  ];

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <PageHeader
        eyebrow="Bazaar inbox"
        title="Customer inquiries"
        description={
          <>
            Every message sent via the bazaar contact form lands here. Reply
            directly — outbound replies go from{" "}
            <span className="font-mono">{BAZAAR_SUPPORT_EMAIL}</span> with a full
            chat log kept on each conversation.
          </>
        }
      />

      {/* Status filter chips. Plain links so the URL stays the
          source of truth and back/forward navigation works. */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <StatusChip current={statusFilter} target={null} label="All" />
        <StatusChip current={statusFilter} target="open" label="Open" />
        <StatusChip current={statusFilter} target="replied" label="Replied" />
        <StatusChip current={statusFilter} target="closed" label="Closed" />
      </div>

      <ResponsiveTable<BazaarInquiryRow>
        rows={inquiries}
        getRowKey={(inq) => inq.id}
        rowHref={(inq) => `/admin/bazaar/inquiries/${inq.id}`}
        rowLabel={(inq) => inq.subject}
        columns={inquiryColumns}
        empty={
          <EmptyState
            title={statusFilter ? `No ${statusFilter} inquiries` : "No inquiries yet"}
            description={
              statusFilter
                ? "Nothing in this status right now."
                : "New customer messages will land here."
            }
          />
        }
      />

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

