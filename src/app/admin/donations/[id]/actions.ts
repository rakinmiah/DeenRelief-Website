"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { requireAdminSession } from "@/lib/admin-session";
import { logAdminAction } from "@/lib/admin-audit";
import { fetchAdminDonationById } from "@/lib/admin-donations";
import {
  appendDonationMessage,
  setDonationMessageResendId,
} from "@/lib/donation-messages";
import { sendDonationMessageEmail } from "@/lib/donation-message-email";

/**
 * Server actions for the donation detail page.
 *
 * Currently one action: sendDonationMessageAction — the trustee
 * composes a subject + body in the donor-messaging composer and
 * we send it via Resend from info@deenrelief.org. Each send is
 * logged regardless of outcome so the trustee can see what they
 * tried to send and any error reason.
 *
 * Other donation actions (refund, resend receipt, cancel sub)
 * still live as REST endpoints under /api/admin/donations/[id]/*
 * — that's the existing pattern; we keep them as-is.
 */

export interface SendDonationMessageResult {
  ok: boolean;
  error?: string;
}

export async function sendDonationMessageAction(
  donationId: string,
  subject: string,
  body: string
): Promise<SendDonationMessageResult> {
  const session = await requireAdminSession();

  const trimmedSubject = subject.trim();
  const trimmedBody = body.trim();
  if (!trimmedSubject) {
    return { ok: false, error: "Subject can't be empty." };
  }
  if (!trimmedBody) {
    return { ok: false, error: "Message body can't be empty." };
  }

  const donation = await fetchAdminDonationById(donationId);
  if (!donation) {
    return { ok: false, error: "Donation not found." };
  }
  if (!donation.donorEmail) {
    return {
      ok: false,
      error: "This donation has no donor email on file.",
    };
  }

  // Log first — record-of-intent semantics. If the Resend send
  // fails after this row is written, the row stays as evidence
  // that the trustee attempted to send, and the audit log records
  // the failure reason in metadata.
  const logged = await appendDonationMessage({
    donationId,
    direction: "outbound",
    authorEmail: session.email,
    toEmail: donation.donorEmail,
    subject: trimmedSubject,
    body: trimmedBody,
  });
  if (!logged) {
    return { ok: false, error: "Couldn't save the message to the log." };
  }

  const sendResult = await sendDonationMessageEmail({
    donationId,
    messageId: logged.id,
    toName: donation.donorName || donation.donorEmail,
    toEmail: donation.donorEmail,
    subject: trimmedSubject,
    body: trimmedBody,
    adminEmail: session.email,
  });

  // Audit logs the attempt regardless of send outcome — gives
  // compliance a record of who tried to email whom and when.
  const h = await headers();
  const fauxRequest = new Request("http://server-action.local", {
    headers: {
      "user-agent": h.get("user-agent") ?? "",
      "x-forwarded-for": h.get("x-forwarded-for") ?? "",
    },
  });
  await logAdminAction({
    action: "send_donation_message",
    userEmail: session.email,
    targetId: donationId,
    request: fauxRequest,
    metadata: {
      to: donation.donorEmail,
      subject: trimmedSubject,
      bodyLength: trimmedBody.length,
      messageId: logged.id,
      resendMessageId: sendResult.messageId,
      error: sendResult.error,
    },
  });

  if (sendResult.error) {
    revalidatePath(`/admin/donations/${donationId}`);
    return { ok: false, error: sendResult.error };
  }

  // Backfill Resend's dashboard id so the chat log lines up with
  // their delivery records for diagnostics later.
  if (sendResult.messageId) {
    await setDonationMessageResendId(logged.id, sendResult.messageId);
  }

  revalidatePath(`/admin/donations/${donationId}`);
  return { ok: true };
}
