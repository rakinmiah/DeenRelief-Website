"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { requireAdminSession } from "@/lib/admin-session";
import { logAdminAction } from "@/lib/admin-audit";
import { fetchAdminBazaarOrderById } from "@/lib/bazaar-db";
import {
  appendBazaarOrderMessage,
  setBazaarOrderMessageResendId,
} from "@/lib/bazaar-order-messages";
import { sendBazaarOrderMessageEmail } from "@/lib/bazaar-order-message-email";
import { bazaarReceiptNumber } from "@/lib/bazaar-order-email";

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
