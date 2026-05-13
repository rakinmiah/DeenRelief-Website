"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { requireAdminSession } from "@/lib/admin-session";
import { logAdminAction } from "@/lib/admin-audit";
import {
  attachClickAndDropOrderId,
  deleteBazaarOrder,
  fetchAdminBazaarOrderById,
} from "@/lib/bazaar-db";
import {
  appendBazaarOrderMessage,
  setBazaarOrderMessageResendId,
} from "@/lib/bazaar-order-messages";
import { sendBazaarOrderMessageEmail } from "@/lib/bazaar-order-message-email";
import { bazaarReceiptNumber } from "@/lib/bazaar-order-email";
import { pushOrderToClickAndDrop } from "@/lib/royal-mail-api";
import { restoreStockForOrderItems } from "@/lib/bazaar-catalog";

/**
 * Server actions for the bazaar order detail page.
 *
 * Currently one action: sendBazaarOrderMessageAction — composes
 * + sends an email to the order's contact_email via Resend, logs
 * the send (success or failure) in bazaar_order_messages, audits
 * the attempt.
 *
 * Other order workflow actions (mark shipped, refund, resend
 * shipping email) live as REST endpoints under
 * /api/admin/bazaar/orders/[id]/* — that's the existing pattern.
 */

export interface SendBazaarOrderMessageResult {
  ok: boolean;
  error?: string;
}

export async function sendBazaarOrderMessageAction(
  orderId: string,
  subject: string,
  body: string
): Promise<SendBazaarOrderMessageResult> {
  const session = await requireAdminSession();

  const trimmedSubject = subject.trim();
  const trimmedBody = body.trim();
  if (!trimmedSubject) {
    return { ok: false, error: "Subject can't be empty." };
  }
  if (!trimmedBody) {
    return { ok: false, error: "Message body can't be empty." };
  }

  const result = await fetchAdminBazaarOrderById(orderId);
  if (!result) {
    return { ok: false, error: "Order not found." };
  }
  const { order } = result;
  if (!order.contactEmail) {
    return {
      ok: false,
      error: "This order has no contact email on file.",
    };
  }

  // Log first — same record-of-intent pattern as donation messages.
  const logged = await appendBazaarOrderMessage({
    orderId,
    direction: "outbound",
    authorEmail: session.email,
    toEmail: order.contactEmail,
    subject: trimmedSubject,
    body: trimmedBody,
  });
  if (!logged) {
    return { ok: false, error: "Couldn't save the message to the log." };
  }

  const sendResult = await sendBazaarOrderMessageEmail({
    orderId,
    messageId: logged.id,
    toName: order.shippingAddress?.name || order.contactEmail,
    toEmail: order.contactEmail,
    subject: trimmedSubject,
    body: trimmedBody,
    receiptNumber: bazaarReceiptNumber(order.id),
    adminEmail: session.email,
  });

  const h = await headers();
  const fauxRequest = new Request("http://server-action.local", {
    headers: {
      "user-agent": h.get("user-agent") ?? "",
      "x-forwarded-for": h.get("x-forwarded-for") ?? "",
    },
  });
  await logAdminAction({
    action: "send_bazaar_order_message",
    userEmail: session.email,
    targetId: orderId,
    request: fauxRequest,
    metadata: {
      to: order.contactEmail,
      subject: trimmedSubject,
      bodyLength: trimmedBody.length,
      messageId: logged.id,
      resendMessageId: sendResult.messageId,
      error: sendResult.error,
    },
  });

  if (sendResult.error) {
    revalidatePath(`/admin/bazaar/orders/${orderId}`);
    return { ok: false, error: sendResult.error };
  }

  if (sendResult.messageId) {
    await setBazaarOrderMessageResendId(logged.id, sendResult.messageId);
  }

  revalidatePath(`/admin/bazaar/orders/${orderId}`);
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────
// Push to Royal Mail Click & Drop
// ─────────────────────────────────────────────────────────────────

export interface PushToClickAndDropResult {
  ok: boolean;
  /** C&D reference if the push succeeded (so the UI can display it
   *  in the success toast). */
  clickAndDropOrderId?: string;
  error?: string;
}

/**
 * Send the order to the trustee's Royal Mail Click & Drop dashboard
 * via the Order API. On success, stamps the C&D reference + push
 * timestamp on the order so:
 *   - the UI shows "Pushed to C&D · ref XYZ"
 *   - re-pushing the same order is refused at the UI level
 *   - if the trustee somehow does push twice, C&D rejects the
 *     duplicate `orderReference` (DR-BZR-...) so no double-create
 *
 * The trustee still has to log into C&D to generate the actual
 * label — that's a paid Shipping API V4 feature we don't use.
 */
export async function pushToClickAndDropAction(
  orderId: string
): Promise<PushToClickAndDropResult> {
  const session = await requireAdminSession();

  const result = await fetchAdminBazaarOrderById(orderId);
  if (!result) {
    return { ok: false, error: "Order not found." };
  }
  const { order, items } = result;

  // Idempotency guard at the application layer. C&D rejects
  // duplicate orderReference too, but bailing here avoids the
  // round-trip + makes the UX clearer.
  if (order.clickAndDropOrderId) {
    return {
      ok: false,
      error: `Already pushed to C&D as ${order.clickAndDropOrderId}.`,
    };
  }

  if (!order.shippingAddress) {
    return { ok: false, error: "Order has no shipping address." };
  }

  // Only push paid (awaiting fulfilment) orders. Pushing an
  // unpaid / refunded / cancelled / abandoned order would clutter
  // C&D with parcels that shouldn't ship.
  if (order.status !== "paid") {
    return {
      ok: false,
      error: `Order status is ${order.status} — only 'paid' orders can be pushed to C&D.`,
    };
  }

  const push = await pushOrderToClickAndDrop({ order, items });

  // Audit the attempt regardless of outcome — compliance trail.
  const h = await headers();
  const fauxRequest = new Request("http://server-action.local", {
    headers: {
      "user-agent": h.get("user-agent") ?? "",
      "x-forwarded-for": h.get("x-forwarded-for") ?? "",
    },
  });
  await logAdminAction({
    action: "push_to_click_and_drop",
    userEmail: session.email,
    targetId: orderId,
    request: fauxRequest,
    metadata: {
      clickAndDropOrderId: push.clickAndDropOrderId,
      error: push.error,
    },
  });

  if (push.error || !push.clickAndDropOrderId) {
    return { ok: false, error: push.error ?? "Push failed." };
  }

  try {
    await attachClickAndDropOrderId({
      orderId,
      clickAndDropOrderId: push.clickAndDropOrderId,
    });
  } catch (err) {
    // The push to Royal Mail succeeded but we couldn't persist the
    // reference. Surface so the trustee knows to record manually,
    // because the next push attempt would create a duplicate at
    // C&D (which their unique-reference check would reject anyway,
    // but it'd look confusing).
    console.error("[pushToClickAndDropAction] persist failed:", err);
    return {
      ok: false,
      error: `Pushed to C&D as ${push.clickAndDropOrderId} but couldn't save the reference locally — record it manually before re-pushing.`,
    };
  }

  revalidatePath(`/admin/bazaar/orders/${orderId}`);
  return { ok: true, clickAndDropOrderId: push.clickAndDropOrderId };
}

// ─────────────────────────────────────────────────────────────────
// Hard-delete the order
// ─────────────────────────────────────────────────────────────────

/**
 * Permanently delete a bazaar order + all dependent rows
 * (line items, abandonment emails, customer comms messages cascade
 * via FK; inquiry links set to NULL).
 *
 * Stock restore: orders in paid / fulfilled / delivered status
 * have stock decremented, so deletion must restore those quantities
 * before removing the row. Orders that were already 'refunded' or
 * 'cancelled' already had stock restored. 'abandoned' orders had
 * stock restored by the cleanup job. 'pending_payment' with an
 * active hold still has stock debited — also needs restore.
 *
 * Audits the full deleted-order payload to admin_audit_log
 * (metadata field) so the action is permanently recoverable even
 * though the source row is gone.
 *
 * Redirects to the orders list on success — the detail page would
 * 404 immediately after the delete.
 */
export async function deleteBazaarOrderAction(
  orderId: string
): Promise<void> {
  const session = await requireAdminSession();

  const detail = await fetchAdminBazaarOrderById(orderId);
  if (!detail) {
    throw new Error("Order not found.");
  }
  const { order, items } = detail;

  // Stock restore for any status where stock was debited and not
  // yet returned. Refund/cancel/abandoned paths already restored.
  const stockWasDebited =
    order.status === "paid" ||
    order.status === "fulfilled" ||
    order.status === "delivered" ||
    (order.status === "pending_payment" && order.stockHeldUntil);

  if (stockWasDebited) {
    try {
      await restoreStockForOrderItems(items);
    } catch (err) {
      console.error(
        `[deleteBazaarOrderAction] stock restore failed for ${orderId}:`,
        err
      );
      // Don't block the delete — admin can manually adjust stock.
    }
  }

  // Snapshot the order BEFORE we delete it so the audit log can
  // record everything that vanished.
  const auditSnapshot = {
    receiptNumber: bazaarReceiptNumber(order.id),
    status: order.status,
    livemode: order.livemode,
    contactEmail: order.contactEmail,
    totalPence: order.totalPence,
    itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
    stripeSessionId: order.stripeSessionId,
    stripePaymentIntent: order.stripePaymentIntent,
    items: items.map((i) => ({
      productName: i.productNameSnapshot,
      variant: i.variantSnapshot,
      maker: i.makerNameSnapshot,
      quantity: i.quantity,
      unitPricePence: i.unitPricePenceSnapshot,
    })),
    stockRestored: stockWasDebited,
  };

  await deleteBazaarOrder(orderId);

  // Audit on the way out.
  const h = await headers();
  const fauxRequest = new Request("http://server-action.local", {
    headers: {
      "user-agent": h.get("user-agent") ?? "",
      "x-forwarded-for": h.get("x-forwarded-for") ?? "",
    },
  });
  await logAdminAction({
    action: "delete_bazaar_order",
    userEmail: session.email,
    targetId: orderId,
    request: fauxRequest,
    metadata: auditSnapshot,
  });

  revalidatePath("/admin/bazaar/orders");
  redirect("/admin/bazaar/orders?deleted=1");
}
