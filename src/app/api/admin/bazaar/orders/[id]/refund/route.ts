import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { logAdminAction } from "@/lib/admin-audit";
import { stripe } from "@/lib/stripe";
import {
  fetchAdminBazaarOrderById,
  markBazaarOrderRefundedFromAdmin,
} from "@/lib/bazaar-db";
import { restoreStockForOrderItems } from "@/lib/bazaar-catalog";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/bazaar/orders/[id]/refund
 *
 * Issues a full Stripe refund against the order's PaymentIntent.
 *
 * Flow:
 *   1. Validate the order is in a refundable state
 *      (paid / fulfilled / delivered).
 *   2. Issue the Stripe refund.
 *   3. Optimistically promote the row to status='refunded'.
 *   4. Stripe will ALSO fire `charge.refunded` shortly after —
 *      our webhook handler's bazaar branch will see the row is
 *      already refunded and no-op cleanly.
 *
 * Why both write paths exist: the webhook is the only writer for
 * refunds issued directly from the Stripe Dashboard. The
 * admin-initiated update here gives the trustee instant UI
 * feedback rather than waiting for the webhook round-trip.
 *
 * Partial refunds: not exposed in the UI for Phase 3. The full
 * refund covers the 14-day Consumer Contracts Regulations window
 * which is the only legally required path. Partial refunds
 * (e.g. shipping kept, items refunded) can be issued from the
 * Stripe Dashboard for now.
 */
export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = requireAdminAuth(request);
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const result = await fetchAdminBazaarOrderById(id);
  if (!result) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const { order } = result;

  if (order.status === "refunded") {
    return NextResponse.json({
      ok: true,
      alreadyRefunded: true,
      message: "Order has already been refunded.",
    });
  }
  if (
    order.status !== "paid" &&
    order.status !== "fulfilled" &&
    order.status !== "delivered"
  ) {
    return NextResponse.json(
      {
        error: `Cannot refund an order with status '${order.status}'.`,
      },
      { status: 400 }
    );
  }
  if (!order.stripePaymentIntent) {
    return NextResponse.json(
      { error: "No PaymentIntent on file for this order." },
      { status: 400 }
    );
  }

  try {
    const refund = await stripe.refunds.create({
      payment_intent: order.stripePaymentIntent,
      reason: "requested_by_customer",
      metadata: {
        refunded_by: "admin",
        refunded_via: "admin-dashboard",
        refunded_at: new Date().toISOString(),
        bazaar_order_id: order.id,
      },
    });

    // Promote the row immediately so the admin sees the new state
    // on refresh. The webhook will re-emit charge.refunded and our
    // handler will no-op on the already-refunded row.
    const updated = await markBazaarOrderRefundedFromAdmin(order.id);

    // Stock restore happens HERE (not in the webhook) for admin-
    // initiated refunds. The webhook's restore branch checks
    // status === "paid"|"fulfilled"|"delivered" BEFORE flipping,
    // so when it eventually fires it will see the already-flipped
    // row and skip — preventing double-restore.
    //
    // The `updated` guard ensures we only restore when this call
    // actually transitioned the order (a re-clicked Refund button
    // returning null from markBazaarOrderRefundedFromAdmin won't
    // re-restore).
    if (updated) {
      try {
        await restoreStockForOrderItems(result.items);
      } catch (err) {
        console.error(
          `[admin-bazaar-refund] stock restore failed for ${order.id} — admin should reconcile manually:`,
          err
        );
      }
    }

    await logAdminAction({
      action: "refund_bazaar_order",
      userEmail: auth.email,
      targetId: order.id,
      request,
      metadata: {
        amountPence: order.totalPence,
        stripeRefundId: refund.id,
        stripePaymentIntentId: order.stripePaymentIntent,
        previousStatus: order.status,
      },
    });

    return NextResponse.json({
      ok: true,
      alreadyRefunded: false,
      refundId: refund.id,
      status: updated?.status ?? "refunded",
      message:
        "Refund issued. Stripe typically settles within a few business days for the customer's bank.",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[admin-bazaar-refund] Stripe refund failed for ${id}:`, err);
    return NextResponse.json(
      { error: `Stripe rejected the refund: ${msg}` },
      { status: 502 }
    );
  }
}
