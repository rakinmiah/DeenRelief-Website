"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { requireAdminSession } from "@/lib/admin-session";
import { logAdminAction, type AdminAction } from "@/lib/admin-audit";
import {
  appendInquiryMessage,
  fetchInquiryById,
  updateInquiryStatus,
  type InquiryStatus,
} from "@/lib/bazaar-inquiries";
import { sendInquiryReply } from "@/lib/bazaar-inquiry-email";
import { bazaarReceiptNumber } from "@/lib/bazaar-order-email";

/**
 * Server actions for the Bazaar inquiries inbox.
 *
 * Three actions:
 *   - sendReplyAction: trustee composes a reply, we send via Resend
 *                      from info@deenrelief.org, log the outbound
 *                      message, set status='replied', audit.
 *   - updateStatusAction: change open/replied/closed.
 *   - addManualMessageAction: trustee pastes a customer's Gmail
 *                              reply into the chat log (the Option-A
 *                              "manual inbound capture" workflow).
 *
 * All three: requireAdminSession at entry, audit on success,
 * revalidate the inquiry detail + list pages so the UI redraws.
 */

async function audit(
  action: AdminAction,
  opts: { targetId?: string | null; metadata?: Record<string, unknown> } = {}
) {
  const session = await requireAdminSession();
  const h = await headers();
  const fauxRequest = new Request("http://server-action.local", {
    headers: {
      "user-agent": h.get("user-agent") ?? "",
      "x-forwarded-for": h.get("x-forwarded-for") ?? "",
    },
  });
  await logAdminAction({
    action,
    userEmail: session.email,
    targetId: opts.targetId ?? null,
    metadata: opts.metadata,
    request: fauxRequest,
  });
  return session;
}

export interface SendReplyResult {
  ok: boolean;
  /** Surface error to the UI when send failed but log is preserved. */
  error?: string;
}

/**
 * Trustee replies to an inquiry. The reply is:
 *   1. Logged in bazaar_inquiry_messages as an outbound row first
 *      (we want the record even if Resend rejects the send).
 *   2. Sent via Resend with the inquiry's threading Message-ID.
 *   3. Reflected in the inquiry by flipping status to 'replied'.
 *   4. Audited regardless of send outcome.
 *
 * If the send fails, the log message stays (so the trustee can see
 * what they tried to send) and an error is surfaced; status stays
 * at 'open' so the inquiry still shows up in the inbox queue.
 */
export async function sendReplyAction(
  inquiryId: string,
  body: string
): Promise<SendReplyResult> {
  const session = await requireAdminSession();

  const trimmed = body.trim();
  if (!trimmed) {
    return { ok: false, error: "Reply body can't be empty." };
  }

  const detail = await fetchInquiryById(inquiryId);
  if (!detail) {
    return { ok: false, error: "Inquiry not found." };
  }

  // Log the outbound message first — record-of-intent semantics.
  // resend_message_id is populated below once we have it.
  const message = await appendInquiryMessage({
    inquiryId,
    direction: "outbound",
    authorEmail: session.email,
    body: trimmed,
  });
  if (!message) {
    return { ok: false, error: "Couldn't save reply to the log." };
  }

  // Receipt number is only present if we matched a real order at
  // submission time. The customer sees it in the email body for
  // their reference.
  const receiptNumber = detail.inquiry.orderId
    ? bazaarReceiptNumber(detail.inquiry.orderId)
    : null;

  const sendResult = await sendInquiryReply({
    inquiryId,
    messageId: message.id,
    toName: detail.inquiry.customerName,
    toEmail: detail.inquiry.customerEmail,
    inquirySubject: detail.inquiry.subject,
    receiptNumber,
    body: trimmed,
    adminEmail: session.email,
  });

  // Always audit — gives compliance a record even when sends fail.
  await audit("send_bazaar_inquiry_reply", {
    targetId: inquiryId,
    metadata: {
      to: detail.inquiry.customerEmail,
      messageId: message.id,
      resendMessageId: sendResult.messageId,
      error: sendResult.error,
      bodyLength: trimmed.length,
    },
  });

  if (sendResult.error) {
    // Don't flip status — the customer didn't actually receive
    // anything. UI surfaces the error; the trustee can retry.
    revalidatePath(`/admin/bazaar/inquiries/${inquiryId}`);
    return { ok: false, error: sendResult.error };
  }

  // Backfill the Resend message id on the row we already logged so
  // the chat log lines up with Resend's dashboard for diagnostics.
  if (sendResult.messageId) {
    try {
      const { getSupabaseAdmin } = await import("@/lib/supabase");
      await getSupabaseAdmin()
        .from("bazaar_inquiry_messages")
        .update({ resend_message_id: sendResult.messageId })
        .eq("id", message.id);
    } catch (err) {
      // Non-fatal — log only.
      console.error(
        "[inquiry-reply] resend_message_id backfill failed:",
        err
      );
    }
  }

  // Flip status to replied so the inbox queue trims the row out
  // of "open".
  try {
    await updateInquiryStatus(inquiryId, "replied");
  } catch (err) {
    console.error("[inquiry-reply] status update failed:", err);
  }

  revalidatePath(`/admin/bazaar/inquiries/${inquiryId}`);
  revalidatePath(`/admin/bazaar/inquiries`);
  if (detail.inquiry.orderId) {
    revalidatePath(`/admin/bazaar/orders/${detail.inquiry.orderId}`);
  }

  return { ok: true };
}

export async function updateStatusAction(
  inquiryId: string,
  status: InquiryStatus
): Promise<void> {
  await updateInquiryStatus(inquiryId, status);
  await audit("update_bazaar_inquiry_status", {
    targetId: inquiryId,
    metadata: { newStatus: status },
  });
  revalidatePath(`/admin/bazaar/inquiries/${inquiryId}`);
  revalidatePath(`/admin/bazaar/inquiries`);
}

/**
 * Add a manually-pasted message to the chat log. Used by the
 * trustee to capture a customer's follow-up reply that landed in
 * Gmail. Direction = inbound; author = customer email.
 *
 * Doesn't send any email — purely a log addition.
 */
export async function addManualMessageAction(
  inquiryId: string,
  direction: "inbound" | "outbound",
  body: string,
  authorEmail?: string | null
): Promise<{ ok: boolean; error?: string }> {
  const session = await requireAdminSession();
  const trimmed = body.trim();
  if (!trimmed) return { ok: false, error: "Message body can't be empty." };

  const detail = await fetchInquiryById(inquiryId);
  if (!detail) return { ok: false, error: "Inquiry not found." };

  const effectiveAuthor =
    direction === "inbound"
      ? (authorEmail || detail.inquiry.customerEmail)
      : session.email;

  const msg = await appendInquiryMessage({
    inquiryId,
    direction,
    authorEmail: effectiveAuthor,
    body: trimmed,
  });
  if (!msg) return { ok: false, error: "Couldn't save the message." };

  await audit("log_manual_inquiry_message", {
    targetId: inquiryId,
    metadata: { direction, bodyLength: trimmed.length },
  });

  revalidatePath(`/admin/bazaar/inquiries/${inquiryId}`);
  revalidatePath(`/admin/bazaar/inquiries`);
  return { ok: true };
}
