"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Action panel rendered on /admin/bazaar/orders/[id] for orders
 * that are past the "paid" state — fulfilled, delivered, or to be
 * refunded.
 *
 * Three actions, each is an independent confirm-then-POST:
 *   - Resend shipping email — only when status is fulfilled OR
 *     delivered. Fires the same email the customer received when we
 *     marked the order shipped.
 *   - Mark as delivered — only when status is fulfilled. No customer
 *     email; bookkeeping only.
 *   - Refund — when status is paid / fulfilled / delivered. Full
 *     refund only. Confirms via window.confirm (irreversible action).
 *
 * Each button is independently disabled during its own request; the
 * others stay clickable so a slow Stripe response doesn't lock the
 * whole panel.
 *
 * On success: router.refresh() so the parent server component
 * re-renders with the new status and the action set updates
 * naturally (e.g. "Mark delivered" disappears after the row flips).
 */
type OrderStatus =
  | "pending_payment"
  | "paid"
  | "fulfilled"
  | "delivered"
  | "refunded"
  | "cancelled"
  | "abandoned";

export default function PostShipActionsClient({
  orderId,
  status,
  hasTrackingNumber,
  totalFormatted,
  customerEmail,
}: {
  orderId: string;
  status: OrderStatus;
  /** True only when tracking_number AND royal_mail_service are both
   *  populated — guards the "Resend shipping email" button so it
   *  doesn't appear on orders that never had a tracking email. */
  hasTrackingNumber: boolean;
  /** Pre-formatted total ("£72.99") — surfaced in the refund
   *  confirm so the admin sees the exact amount before clicking
   *  through. Belt-and-braces against fat-finger refunds. */
  totalFormatted: string;
  /** Customer email — surfaced in the refund confirm so the admin
   *  knows whose card will be credited. */
  customerEmail: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<
    null | "resend" | "delivered" | "refund"
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const canResend =
    hasTrackingNumber && (status === "fulfilled" || status === "delivered");
  const canMarkDelivered = status === "fulfilled";
  const canRefund =
    status === "paid" || status === "fulfilled" || status === "delivered";

  // Nothing to show — order is in a terminal state with no actions.
  if (!canResend && !canMarkDelivered && !canRefund) return null;

  async function post(path: string, action: "resend" | "delivered" | "refund") {
    setBusy(action);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.error ?? `Server returned ${res.status}`);
      }
      if (action === "resend") {
        setNotice(
          body?.sentTo
            ? `Shipping email resent to ${body.sentTo}.`
            : "Shipping email resent."
        );
      } else if (action === "delivered") {
        setNotice("Order marked as delivered.");
        router.refresh();
      } else {
        setNotice(
          body?.alreadyRefunded
            ? "Order was already refunded."
            : "Refund issued."
        );
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  }

  function handleRefund() {
    // Multi-line confirm with amount + customer + consequences.
    // Browsers honour \n\n inside window.confirm() as paragraph
    // breaks, matching the donation refund confirm's pattern.
    const confirmed = window.confirm(
      `Issue a ${totalFormatted} refund to ${customerEmail || "the customer"}?\n\n` +
        "Stripe will refund the card immediately. The customer's bank " +
        "typically settles the funds within 5–10 working days.\n\n" +
        "Stock for items in this order will be restored automatically. " +
        "The order will be marked 'refunded' and removed from the " +
        "fulfilment queue.\n\n" +
        "This action cannot be undone from the admin. Partial refunds " +
        "can be issued from the Stripe Dashboard if needed."
    );
    if (!confirmed) return;
    post(`/api/admin/bazaar/orders/${orderId}/refund`, "refund");
  }

  return (
    <section className="bg-white border border-charcoal/10 rounded-2xl p-5">
      <h2 className="text-xs font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-4">
        Actions
      </h2>

      {error && (
        <p className="text-[12px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
          {error}
        </p>
      )}
      {notice && (
        <p className="text-[12px] text-green-dark bg-green/10 border border-green/30 rounded-lg px-3 py-2 mb-3">
          {notice}
        </p>
      )}

      <div className="space-y-2">
        {canResend && (
          <button
            type="button"
            onClick={() =>
              post(
                `/api/admin/bazaar/orders/${orderId}/resend-shipping-email`,
                "resend"
              )
            }
            disabled={busy !== null}
            className="w-full px-4 py-2.5 rounded-lg bg-white border border-charcoal/15 text-charcoal text-sm font-medium hover:bg-cream transition-colors disabled:opacity-60 disabled:cursor-wait"
          >
            {busy === "resend" ? "Sending…" : "Resend shipping email"}
          </button>
        )}

        {canMarkDelivered && (
          <button
            type="button"
            onClick={() =>
              post(
                `/api/admin/bazaar/orders/${orderId}/mark-delivered`,
                "delivered"
              )
            }
            disabled={busy !== null}
            className="w-full px-4 py-2.5 rounded-lg bg-green text-white text-sm font-semibold hover:bg-green-dark transition-colors disabled:opacity-60 disabled:cursor-wait"
          >
            {busy === "delivered" ? "Updating…" : "Mark as delivered"}
          </button>
        )}

        {canRefund && (
          <button
            type="button"
            onClick={handleRefund}
            disabled={busy !== null}
            className="w-full px-4 py-2.5 rounded-lg bg-white border border-red-200 text-red-700 text-sm font-semibold hover:bg-red-50 transition-colors disabled:opacity-60 disabled:cursor-wait"
          >
            {busy === "refund" ? "Refunding…" : "Issue full refund"}
          </button>
        )}
      </div>

      <p className="mt-4 text-[10px] text-charcoal/40 leading-relaxed">
        Resend hits Resend immediately. Mark-delivered is a bookkeeping
        flag (no customer email). Refund goes through Stripe; it
        typically settles to the customer&apos;s bank in 5&ndash;10
        business days.
      </p>
    </section>
  );
}
