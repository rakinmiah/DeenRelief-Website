import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminSession } from "@/lib/admin-session";
import {
  fetchInquiryById,
  type BazaarInquiryMessageRow,
  type InquiryStatus,
} from "@/lib/bazaar-inquiries";
import { bazaarReceiptNumber } from "@/lib/bazaar-order-email";
import { formatAdminDate } from "@/lib/admin-donations";
import InquiryReplyClient from "./InquiryReplyClient";
import MobileActionPanel from "@/components/admin/MobileActionPanel";

export const metadata: Metadata = {
  title: "Inquiry | Bazaar Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Single-inquiry view: customer info, threaded chat log, reply
 * composer, status controls. The chat log is rendered server-
 * side (faster, no client fetch); reply + status flips are
 * server actions triggered from the client component below.
 */
export default async function AdminInquiryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminSession();
  const { id } = await params;
  const detail = await fetchInquiryById(id);
  if (!detail) notFound();

  const { inquiry, messages } = detail;
  const receipt = inquiry.orderId ? bazaarReceiptNumber(inquiry.orderId) : null;

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link
          href="/admin/bazaar/inquiries"
          className="text-charcoal/60 hover:text-charcoal text-xs uppercase tracking-[0.1em] font-bold transition-colors"
        >
          ← All inquiries
        </Link>
        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h1 className="text-charcoal font-heading font-bold text-2xl sm:text-3xl">
              {inquiry.subject}
            </h1>
            <p className="text-charcoal/50 text-[12px] mt-1">
              From{" "}
              <span className="text-charcoal font-medium">
                {inquiry.customerName}
              </span>{" "}
              ·{" "}
              <a
                href={`mailto:${inquiry.customerEmail}`}
                className="font-mono underline hover:text-charcoal transition-colors"
              >
                {inquiry.customerEmail}
              </a>{" "}
              · opened {formatAdminDate(inquiry.createdAt)}
            </p>
          </div>
          <StatusBadge status={inquiry.status} />
        </div>
      </div>

      {/* Linked order banner — surfaces the order context up-front
          if the customer cited a matchable receipt. */}
      {receipt && inquiry.orderId && (
        <div className="mb-6 bg-amber-light/40 border border-amber/30 rounded-2xl px-5 py-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-amber-dark mb-1">
              About an order
            </p>
            <p className="text-charcoal text-sm">
              This inquiry is linked to order{" "}
              <span className="font-mono font-semibold">{receipt}</span>.
            </p>
          </div>
          <Link
            href={`/admin/bazaar/orders/${inquiry.orderId}`}
            className="px-4 py-2 rounded-full bg-charcoal text-white text-sm font-semibold hover:bg-charcoal/90 transition-colors whitespace-nowrap"
          >
            View order →
          </Link>
        </div>
      )}

      {/* Unmatched receipt-number callout — sometimes the customer
          types something that looks like an order number but isn't
          a clean match. Surface it so the trustee can investigate. */}
      {!inquiry.orderId && inquiry.orderNumberRaw && (
        <div className="mb-6 bg-charcoal/[0.04] border border-charcoal/10 rounded-2xl px-5 py-3 text-[12px] text-charcoal/70">
          The customer cited &ldquo;
          <span className="font-mono">{inquiry.orderNumberRaw}</span>&rdquo;
          as an order number but we couldn&apos;t match it to an order
          on file.
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        {/* Chat log */}
        <section className="space-y-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal/60">
            Conversation
          </p>
          {messages.length === 0 ? (
            <p className="text-sm text-charcoal/50 italic">
              No messages yet.
            </p>
          ) : (
            <ol className="space-y-3">
              {messages.map((m) => (
                <Message key={m.id} message={m} />
              ))}
            </ol>
          )}
        </section>

        {/* Side panel — reply form + workflow.
            Wrapped in MobileActionPanel so the trustee can pop the
            reply composer from a sticky bottom "Reply" bar after
            scanning the conversation thread on a phone. */}
        <aside>
          <MobileActionPanel
            actionLabel="Reply"
            sheetTitle="Reply to inquiry"
            inlineSummary={
              <>
                <span className="font-semibold text-charcoal truncate">
                  {inquiry.customerName}
                </span>{" "}
                · {inquiry.status}
              </>
            }
          >
            <InquiryReplyClient
              inquiryId={inquiry.id}
              currentStatus={inquiry.status}
            />
          </MobileActionPanel>
        </aside>
      </div>
    </main>
  );
}

function Message({ message }: { message: BazaarInquiryMessageRow }) {
  const isOutbound = message.direction === "outbound";
  return (
    <li
      className={`rounded-2xl border p-4 ${
        isOutbound
          ? "bg-green/5 border-green/20"
          : "bg-white border-charcoal/10"
      }`}
    >
      <div className="flex items-center justify-between gap-3 mb-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.1em]">
          <span
            className={
              isOutbound ? "text-green-dark" : "text-charcoal/60"
            }
          >
            {isOutbound ? "You / Deen Relief" : "Customer"}
          </span>{" "}
          <span className="text-charcoal/40 font-medium normal-case">
            {message.authorEmail}
          </span>
        </p>
        <p className="text-[11px] text-charcoal/40 whitespace-nowrap">
          {formatAdminDate(message.createdAt)}
        </p>
      </div>
      <p className="text-charcoal text-sm leading-[1.65] whitespace-pre-line">
        {message.body}
      </p>
    </li>
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
