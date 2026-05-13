"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { requireAdminSession } from "@/lib/admin-session";
import { logAdminAction } from "@/lib/admin-audit";
import {
  deleteDonation,
  fetchAdminDonationById,
} from "@/lib/admin-donations";
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

// ─────────────────────────────────────────────────────────────────
// Hard-delete the donation
// ─────────────────────────────────────────────────────────────────

export interface DeleteDonationResult {
  ok: boolean;
  error?: string;
}

/**
 * Permanently delete a donation row. Cascades remove
 * donation_messages; the donor row stays alive (they may have
 * other donations).
 *
 * The lib-level deleteDonation() helper refuses if the donation
 * has an active Gift Aid claim — HMRC requires us to retain those
 * records for six years.
 *
 * Snapshots the full donation payload to admin_audit_log before
 * deletion so we have a permanent record of who deleted what.
 *
 * Redirects to the donations list on success — the detail page
 * would 404 immediately after the delete.
 */
export async function deleteDonationAction(
  donationId: string
): Promise<DeleteDonationResult> {
  const session = await requireAdminSession();

  const donation = await fetchAdminDonationById(donationId);
  if (!donation) {
    return { ok: false, error: "Donation not found." };
  }

  // Snapshot before delete so audit log has a permanent record.
  const auditSnapshot = {
    receiptNumber: donation.receiptNumber,
    status: donation.status,
    frequency: donation.frequency,
    amountPence: donation.amountPence,
    campaign: donation.campaign,
    donorEmail: donation.donorEmail,
    donorName: donation.donorName,
    giftAidClaimed: donation.giftAidClaimed,
    giftAidDeclarationRevoked: donation.giftAidDeclarationRevoked,
    stripePaymentIntent: donation.stripePaymentIntent,
    stripeSubscriptionId: donation.stripeSubscriptionId,
    chargedAt: donation.chargedAt,
  };

  try {
    await deleteDonation(donationId);
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Couldn't delete the donation.";
    return { ok: false, error: message };
  }

  // Audit only on successful delete — failed delete attempts
  // (e.g. Gift Aid block) don't reach this branch.
  const h = await headers();
  const fauxRequest = new Request("http://server-action.local", {
    headers: {
      "user-agent": h.get("user-agent") ?? "",
      "x-forwarded-for": h.get("x-forwarded-for") ?? "",
    },
  });
  await logAdminAction({
    action: "delete_donation",
    userEmail: session.email,
    targetId: donationId,
    request: fauxRequest,
    metadata: auditSnapshot,
  });

  revalidatePath("/admin/donations");
  redirect("/admin/donations?deleted=1");
}
