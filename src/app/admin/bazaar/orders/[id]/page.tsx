import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminSession } from "@/lib/admin-session";
import {
  fetchAdminBazaarOrderById,
  type BazaarOrderRow,
} from "@/lib/bazaar-db";
import { bazaarReceiptNumber } from "@/lib/bazaar-order-email";
import {
  BAZAAR_SERVICE_FULL_LABEL,
  deriveServiceFromShippingPence,
  formatPence,
} from "@/lib/bazaar-format";
import { formatAdminDate } from "@/lib/admin-donations";
import { fetchInquiriesByOrderId } from "@/lib/bazaar-inquiries";
import {
  fetchBazaarOrderMessages,
  type BazaarOrderMessageRow,
} from "@/lib/bazaar-order-messages";
import MarkShippedClient from "./MarkShippedClient";
import PostShipActionsClient from "./PostShipActionsClient";
import OrderMessageClient from "./OrderMessageClient";
import PackingSlipPrintButton from "./PackingSlipPrintButton";
import PushToClickAndDropClient from "./PushToClickAndDropClient";
import DeleteOrderClient from "./DeleteOrderClient";
import MobileActionPanel from "@/components/admin/MobileActionPanel";
import { CHARITY_NAME, CHARITY_NUMBER } from "@/lib/gift-aid";
import { BAZAAR_SUPPORT_EMAIL } from "@/lib/bazaar-config";

export const metadata: Metadata = {
  title: "Order detail | Bazaar Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const STATUS_BADGE: Record<BazaarOrderRow["status"], string> = {
  pending_payment: "bg-charcoal/8 text-charcoal/60 border-charcoal/15",
  paid: "bg-amber-light text-amber-dark border-amber/30",
  fulfilled: "bg-blue-50 text-blue-800 border-blue-200",
  delivered: "bg-green/10 text-green-dark border-green/30",
  refunded: "bg-red-50 text-red-700 border-red-200",
  cancelled: "bg-charcoal/8 text-charcoal/60 border-charcoal/15",
  abandoned: "bg-charcoal/8 text-charcoal/40 border-charcoal/10",
};

const STATUS_LABEL: Record<BazaarOrderRow["status"], string> = {
  pending_payment: "Pending payment",
  paid: "Awaiting fulfilment",
  fulfilled: "Shipped",
  delivered: "Delivered",
  refunded: "Refunded",
  cancelled: "Cancelled",
  abandoned: "Abandoned",
};

// SERVICE_LABEL moved to bazaar-format.ts as BAZAAR_SERVICE_FULL_LABEL.

/**
 * Admin order detail.
 *
 * What's on the page:
 *   - Items the admin needs to pack (with maker attribution so the
 *     parcel insert can name the right person)
 *   - The shipping address Stripe collected
 *   - Customer email — clickable mailto: so the admin can chase if
 *     something's wrong
 *   - Order summary card (subtotal, shipping, total, Stripe PI ref)
 *   - The Mark Shipped action panel (paid orders only)
 *   - Once shipped: the tracking number + service tier + the time
 *     it left, in place of the action panel
 *
 * Donor link: when the order was placed by an email that matches an
 * existing donors row, we display a "Returning customer" pill so
 * the admin knows this person has donated before. Useful context
 * for handwritten thank-yous on premium orders.
 */
export default async function AdminBazaarOrderDetailPage({ params }: RouteParams) {
  await requireAdminSession();
  const { id } = await params;

  const result = await fetchAdminBazaarOrderById(id);
  if (!result) notFound();

  const { order, items } = result;
  // Inquiries linked to this order (customer cited the receipt #
  // in a /bazaar/contact submission). Empty array if none.
  const linkedInquiries = await fetchInquiriesByOrderId(id);
  // History of admin-initiated emails sent against this order
  // (subject + body composer + audit trail).
  const orderMessages = await fetchBazaarOrderMessages(id);
  const receiptNum = bazaarReceiptNumber(order.id);
  const customerName = order.shippingAddress?.name ?? "—";
  const isPaid = order.status === "paid";
  const isShipped =
    order.status === "fulfilled" ||
    order.status === "delivered";
  const customerChosenService = deriveServiceFromShippingPence(
    order.shippingPence
  );

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 print:max-w-none print:p-0">
      {/* ─── Print-only packing slip ────────────────────────────
          Hidden by default (`hidden`), block-displayed on print
          (`print:block`). Browser Cmd+P captures the rendered
          page; combined with `print:hidden` on the admin chrome
          below, only this slip prints. Sized to comfortably fit
          on a single A4 page with margins. */}
      <section
        className="hidden print:block print:p-10 print:text-black"
        aria-hidden="true"
      >
        <div className="flex items-start justify-between mb-8 pb-4 border-b-2 border-black">
          <div>
            <p className="text-xs uppercase tracking-[0.15em] font-bold text-black/60 mb-1">
              Packing slip
            </p>
            <p className="text-2xl font-bold font-mono">{receiptNum}</p>
            <p className="text-xs text-black/60 mt-1">
              Order placed {formatAdminDate(order.createdAt)}
            </p>
          </div>
          <div className="text-right">
            {/* Brand mark for the print-only packing slip. Uses a
                plain <img> rather than Next.js <Image> because the
                slip's parent is `hidden print:block` — Next.js
                lazy-loads via intersection observer, which never
                fires on a display:none element, so by the time
                print activates the optimised image has never been
                fetched and the slip renders without the logo.
                Plain <img> loads eagerly + prints reliably. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/logo.webp"
              alt={CHARITY_NAME}
              width={191}
              height={32}
              className="ml-auto h-8 w-auto"
              loading="eager"
            />
            <p className="text-[11px] text-black/60 mt-2">
              Registered charity in England &amp; Wales, No. {CHARITY_NUMBER}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-black/60 mb-2">
              Ship to
            </p>
            <p className="font-semibold text-base">
              {order.shippingAddress?.name ?? customerName}
            </p>
            {order.shippingAddress && (
              <div className="text-sm leading-[1.5] mt-1">
                <p>{order.shippingAddress.line1}</p>
                {order.shippingAddress.line2 && (
                  <p>{order.shippingAddress.line2}</p>
                )}
                <p>{order.shippingAddress.city}</p>
                <p className="font-mono">{order.shippingAddress.postcode}</p>
                <p>United Kingdom</p>
              </div>
            )}
            <p className="text-[11px] text-black/60 mt-2 font-mono">
              {order.contactEmail}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-black/60 mb-2">
              Service
            </p>
            <p className="text-base font-semibold">
              {customerChosenService
                ? BAZAAR_SERVICE_FULL_LABEL[customerChosenService]
                : "Royal Mail"}
            </p>
            <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-black/60 mt-5 mb-2">
              Items
            </p>
            <p className="text-base font-semibold">
              {items.reduce((sum, it) => sum + it.quantity, 0)} piece
              {items.reduce((sum, it) => sum + it.quantity, 0) === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        <table className="w-full text-sm border-t border-b border-black/30">
          <thead>
            <tr className="text-left">
              <th className="py-2 text-[10px] uppercase tracking-[0.15em] font-bold text-black/60">
                Product
              </th>
              <th className="py-2 text-[10px] uppercase tracking-[0.15em] font-bold text-black/60">
                Variant
              </th>
              <th className="py-2 text-[10px] uppercase tracking-[0.15em] font-bold text-black/60">
                Maker
              </th>
              <th className="py-2 text-[10px] uppercase tracking-[0.15em] font-bold text-black/60 text-right">
                Qty
              </th>
            </tr>
          </thead>
          <tbody className="border-t border-black/15">
            {items.map((it) => (
              <tr key={it.id} className="align-top">
                <td className="py-2.5 pr-3">
                  <div className="font-medium">{it.productNameSnapshot}</div>
                </td>
                <td className="py-2.5 pr-3 text-black/70">
                  {it.variantSnapshot ?? "—"}
                </td>
                <td className="py-2.5 pr-3 text-black/70">
                  {it.makerNameSnapshot}
                </td>
                <td className="py-2.5 text-right font-semibold">
                  {it.quantity}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-8 pt-4 border-t border-black/15 text-[11px] text-black/60 leading-[1.5]">
          <p>
            Thank you for shopping the {CHARITY_NAME} Bazaar — every
            piece in this parcel was made by hand and the maker has
            already been paid for their work.
          </p>
          <p className="mt-2">
            Not quite right? 14 days from delivery to return. Email{" "}
            {BAZAAR_SUPPORT_EMAIL} or use the contact form at
            deenrelief.org/bazaar/contact.
          </p>
        </div>
      </section>

      {/* ─── Screen-only admin view ──────────────────────────── */}
      <div className="print:hidden">
      {/* Page header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link
            href="/admin/bazaar/orders"
            className="text-charcoal/60 hover:text-charcoal text-xs uppercase tracking-[0.1em] font-bold transition-colors"
          >
            ← All orders
          </Link>
          <h1 className="text-charcoal font-heading font-semibold text-xl sm:text-2xl mt-1 font-mono">
            {receiptNum}
          </h1>
          <p className="text-charcoal/50 text-[11px] mt-1 font-mono break-all">
            DB id: {order.id}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PackingSlipPrintButton />
          <span
            className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium uppercase tracking-wider border ${STATUS_BADGE[order.status]}`}
          >
            {STATUS_LABEL[order.status]}
          </span>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        {/* Main column — line items, address, customer */}
        <div className="space-y-5">
          {/* Items */}
          <section className="bg-white border border-charcoal/10 rounded-2xl overflow-hidden">
            <h2 className="px-5 py-4 border-b border-charcoal/10 text-charcoal font-heading font-semibold">
              Items to pack
            </h2>
            <ul className="divide-y divide-charcoal/8">
              {items.map((item) => (
                <li key={item.id} className="px-5 py-4 flex gap-4">
                  <div className="w-12 h-12 rounded-lg bg-cream flex-shrink-0 flex items-center justify-center text-xs font-bold text-charcoal/50">
                    {item.quantity}×
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-charcoal font-medium leading-tight">
                      {item.productNameSnapshot}
                    </p>
                    <p className="text-xs text-charcoal/60 mt-0.5">
                      {item.variantSnapshot && `${item.variantSnapshot} · `}
                      Made by {item.makerNameSnapshot}
                    </p>
                  </div>
                  <span className="text-charcoal/80 text-sm whitespace-nowrap">
                    {formatPence(
                      item.unitPricePenceSnapshot * item.quantity
                    )}
                  </span>
                </li>
              ))}
            </ul>
            <div className="px-5 py-3 bg-cream/50 border-t border-charcoal/10 text-xs text-charcoal/70">
              {items.reduce((s, i) => s + i.quantity, 0)} item
              {items.reduce((s, i) => s + i.quantity, 0) === 1 ? "" : "s"}
            </div>
          </section>

          {/* Shipping address */}
          {order.shippingAddress && (
            <section className="bg-white border border-charcoal/10 rounded-2xl p-5">
              <h2 className="text-charcoal font-heading font-semibold mb-3">
                Shipping address
              </h2>
              <address className="not-italic text-sm text-charcoal/80 leading-relaxed">
                <strong className="text-charcoal">
                  {order.shippingAddress.name}
                </strong>
                <br />
                {order.shippingAddress.line1}
                <br />
                {order.shippingAddress.line2 && (
                  <>
                    {order.shippingAddress.line2}
                    <br />
                  </>
                )}
                {order.shippingAddress.city}, {order.shippingAddress.postcode}
                <br />
                United Kingdom
              </address>
            </section>
          )}

          {/* Customer */}
          <section className="bg-white border border-charcoal/10 rounded-2xl p-5">
            <h2 className="text-charcoal font-heading font-semibold mb-3">
              Customer
            </h2>
            <p className="text-sm text-charcoal/80">
              <strong className="text-charcoal">{customerName}</strong>
              <br />
              {order.contactEmail ? (
                <a
                  href={`mailto:${order.contactEmail}`}
                  className="text-green underline"
                >
                  {order.contactEmail}
                </a>
              ) : (
                <span className="text-charcoal/40">No email on file</span>
              )}
              {order.donorId && (
                <span className="ml-2 inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-[0.1em] bg-green/10 text-green-dark border border-green/30 align-middle">
                  Returning donor
                </span>
              )}
            </p>
          </section>

          {/* Shipped info (replaces the action panel once fulfilled) */}
          {isShipped && order.trackingNumber && order.royalMailService && (
            <section className="bg-white border border-charcoal/10 rounded-2xl p-5">
              <h2 className="text-charcoal font-heading font-semibold mb-3">
                Shipped
              </h2>
              <dl className="text-sm space-y-2">
                <div className="flex justify-between gap-3">
                  <dt className="text-charcoal/60">Tracking</dt>
                  <dd className="text-charcoal font-mono font-medium break-all text-right">
                    {order.trackingNumber}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-charcoal/60">Service</dt>
                  <dd className="text-charcoal">
                    {BAZAAR_SERVICE_FULL_LABEL[order.royalMailService]}
                  </dd>
                </div>
                {order.fulfilledAt && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-charcoal/60">Shipped at</dt>
                    <dd className="text-charcoal">
                      {formatAdminDate(order.fulfilledAt)}
                    </dd>
                  </div>
                )}
              </dl>
            </section>
          )}

          {/* Internal notes (read-only display when not in action panel) */}
          {!isPaid && order.internalNotes && (
            <section className="bg-white border border-charcoal/10 rounded-2xl p-5">
              <h2 className="text-charcoal font-heading font-semibold mb-3">
                Internal notes
              </h2>
              <p className="text-sm text-charcoal/80 whitespace-pre-wrap">
                {order.internalNotes}
              </p>
            </section>
          )}
        </div>

        {/* Side panel — summary + action.
            Wrapped in MobileActionPanel so the entire sidebar is
            reachable from a sticky "Actions" bar on phones (otherwise
            it'd sit hundreds of pixels below the order details and
            require a full scroll to mark-shipped or refund). */}
        <aside>
        <MobileActionPanel
          actionLabel="Actions"
          sheetTitle={`${receiptNum} — actions`}
          inlineSummary={
            <>
              <span className="font-semibold text-charcoal">
                {formatPence(order.totalPence)}
              </span>{" "}
              · {STATUS_LABEL[order.status]}
            </>
          }
        >
          <div className="space-y-4">
          <section className="bg-white border border-charcoal/10 rounded-2xl p-5">
            <h2 className="text-xs font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-3">
              Order summary
            </h2>
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-charcoal/70">Subtotal</dt>
                <dd className="text-charcoal">
                  {formatPence(order.subtotalPence)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-charcoal/70">Shipping</dt>
                <dd className="text-charcoal">
                  {order.shippingPence === 0
                    ? "Free"
                    : formatPence(order.shippingPence)}
                </dd>
              </div>
              <div className="flex justify-between pt-2 border-t border-charcoal/10 mt-2">
                <dt className="text-charcoal font-semibold">Total paid</dt>
                <dd className="text-charcoal font-semibold">
                  {formatPence(order.totalPence)}
                </dd>
              </div>
            </dl>
            <p className="mt-4 text-[11px] text-charcoal/50 break-all">
              Placed {formatAdminDate(order.createdAt)}
              {order.stripePaymentIntent && (
                <>
                  <br />
                  Stripe PI: {order.stripePaymentIntent}
                </>
              )}
              {!order.livemode && (
                <>
                  <br />
                  <span className="text-amber-dark font-semibold">
                    TEST MODE
                  </span>
                </>
              )}
            </p>
          </section>

          {/* Push to Click & Drop — only meaningful for paid
              orders awaiting fulfilment. Pre-push state shows a
              button; post-push state shows the C&D reference +
              timestamp so the trustee knows it's safe to log in
              and generate the label. */}
          {isPaid && (
            <PushToClickAndDropClient
              orderId={order.id}
              alreadyPushed={Boolean(order.clickAndDropOrderId)}
              clickAndDropOrderId={order.clickAndDropOrderId}
              pushedAt={order.clickAndDropPushedAt}
            />
          )}

          {/* Mark Shipped panel — only for paid orders awaiting
              fulfilment. */}
          {isPaid && (
            <MarkShippedClient
              orderId={order.id}
              initialInternalNotes={order.internalNotes}
              initialService={customerChosenService}
            />
          )}

          {/* Post-ship actions — resend email, mark delivered, refund.
              Self-renders nothing for terminal states with no
              actions (refunded, cancelled, pending). */}
          <PostShipActionsClient
            orderId={order.id}
            status={order.status}
            hasTrackingNumber={
              Boolean(order.trackingNumber) &&
              Boolean(order.royalMailService)
            }
            totalFormatted={formatPence(order.totalPence)}
            customerEmail={order.contactEmail}
          />

          {/* Status-specific context message. Renders for every
              non-paid status; paid orders already have the
              MarkShippedClient above. */}
          {!isPaid && (
            <section className="bg-cream border border-charcoal/10 rounded-2xl p-5 text-xs text-charcoal/60 leading-relaxed">
              {order.status === "pending_payment" && (
                <>
                  This order hasn&apos;t paid yet. If it&apos;s been more than a
                  few hours, the customer abandoned at the Stripe page and you
                  can ignore the row.
                </>
              )}
              {order.status === "fulfilled" && (
                <>
                  This order has shipped. The customer received a tracking
                  email. Mark it delivered once Royal Mail confirms.
                </>
              )}
              {order.status === "delivered" && (
                <>This order is done.</>
              )}
              {order.status === "refunded" && (
                <>
                  This order was refunded. Stock counts will be restored when
                  the catalog is in the DB (currently snapshot-only).
                </>
              )}
              {order.status === "cancelled" && <>This order was cancelled.</>}
            </section>
          )}
          </div>
        </MobileActionPanel>
        </aside>
      </div>

      {/* Inquiries linked to this order. Only rendered when the
          customer used the contact form citing this order's receipt
          number — we expect this to be the exception, not the rule,
          so the section sits below the main two-column layout and
          stays out of the way when empty. */}
      {linkedInquiries.length > 0 && (
        <section className="mt-10 pt-8 border-t border-charcoal/10">
          <div className="mb-4">
            <span className="block text-[11px] font-bold tracking-[0.15em] uppercase text-amber-dark mb-1">
              Customer support
            </span>
            <h2 className="text-charcoal font-heading font-semibold text-lg">
              Inquiries about this order
            </h2>
            <p className="text-charcoal/60 text-sm mt-1">
              Messages the customer sent via the bazaar contact form
              citing this order&apos;s reference.
            </p>
          </div>
          <ul className="divide-y divide-charcoal/8 border border-charcoal/10 rounded-2xl overflow-hidden bg-white">
            {linkedInquiries.map((inq) => {
              const statusStyles: Record<string, string> = {
                open: "bg-amber-light text-amber-dark border-amber/30",
                replied: "bg-green/10 text-green-dark border-green/30",
                closed:
                  "bg-charcoal/8 text-charcoal/60 border-charcoal/15",
              };
              return (
                <li key={inq.id}>
                  <Link
                    href={`/admin/bazaar/inquiries/${inq.id}`}
                    className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-cream/40 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="text-charcoal text-sm font-medium truncate">
                        {inq.subject}
                      </div>
                      <div className="text-charcoal/50 text-[11px] mt-0.5">
                        {inq.customerName} ·{" "}
                        {formatAdminDate(inq.lastMessageAt)}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium uppercase tracking-wider border ${
                          statusStyles[inq.status] ??
                          statusStyles.closed
                        }`}
                      >
                        {inq.status}
                      </span>
                      <span className="text-green text-sm font-medium">
                        Open →
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Send-email composer + history. Mirrors the donation
          detail page's "Donor communication" block — same shape,
          different table (bazaar_order_messages). Distinct from
          the linked-inquiries section above: inquiries are
          customer-initiated conversations; these are admin-
          initiated one-off emails. */}
      <section className="mt-10 pt-8 border-t border-charcoal/10">
        <div className="mb-4">
          <span className="block text-[11px] font-bold tracking-[0.15em] uppercase text-amber-dark mb-1">
            Customer communication
          </span>
          <h2 className="text-charcoal font-heading font-semibold text-lg">
            Send an email about this order
          </h2>
          <p className="text-charcoal/60 text-sm mt-1">
            For one-off updates — shipping delays, packing notes,
            replacement offers. Every send is logged below.
          </p>
        </div>

        <div className="bg-white border border-charcoal/10 rounded-2xl p-5">
          {order.contactEmail ? (
            <OrderMessageClient
              orderId={order.id}
              customerEmail={order.contactEmail}
            />
          ) : (
            <p className="text-sm text-charcoal/60">
              No customer email on file — can&apos;t send.
            </p>
          )}
        </div>

        {orderMessages.length > 0 && (
          <div className="mt-8">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-3">
              History · {orderMessages.length} sent
            </h3>
            <ol className="space-y-3">
              {orderMessages.map((m) => (
                <OrderMessageHistoryItem key={m.id} message={m} />
              ))}
            </ol>
          </div>
        )}
      </section>

      {/* Danger zone — hard delete. Sits at the very bottom so it's
          a deliberate scroll-to-find. Typed `DELETE` confirm + an
          extra warning panel for live orders with received goods.
          Stock auto-restores when applicable. */}
      <div className="mt-10">
        <DeleteOrderClient
          orderId={order.id}
          receiptNumber={receiptNum}
          status={order.status}
          livemode={order.livemode}
          customerEmail={order.contactEmail}
          totalFormatted={formatPence(order.totalPence)}
        />
      </div>
      </div>
      {/* ─── End screen-only admin view ─── */}
    </main>
  );
}

function OrderMessageHistoryItem({
  message,
}: {
  message: BazaarOrderMessageRow;
}) {
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
