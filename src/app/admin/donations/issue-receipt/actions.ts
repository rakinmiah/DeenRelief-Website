"use server";

import { randomUUID } from "node:crypto";
import { requireRoleAdmin } from "@/lib/admin-session";
import { sendDonationReceipt } from "@/lib/donation-receipt";
import { logAdminAction } from "@/lib/admin-audit";
import { isValidCampaign, getCampaignLabel } from "@/lib/campaigns";

export interface IssueReceiptInput {
  firstName: string;
  lastName: string;
  email: string;
  amountGbp: number | string;
  donationDate: string; // YYYY-MM-DD
  campaign: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  postcode?: string;
}

/**
 * Issue a Deen Relief receipt for a PAST / offline donation (e.g. a gift
 * made on the old website that never got a receipt). Emails a branded
 * receipt + PDF to the donor.
 *
 * Receipt-only by design: it creates NO donation row, so it never
 * inflates income/recurring totals and never enters a Gift Aid claim.
 * The receipt number is derived from a generated reference, identical in
 * format to website receipts (DR-DON-XXXXXXXX).
 */
export async function issueManualReceiptAction(
  input: IssueReceiptInput
): Promise<{ ok: boolean; error?: string; reference?: string }> {
  const session = await requireRoleAdmin();

  const email = String(input.email ?? "").trim().toLowerCase();
  const firstName = String(input.firstName ?? "").trim();
  const lastName = String(input.lastName ?? "").trim();
  const campaign = String(input.campaign ?? "").trim();
  const amountPence = Math.round(Number(input.amountGbp) * 100);

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
    return { ok: false, error: "Enter a valid email address." };
  if (!firstName) return { ok: false, error: "Enter the donor's first name." };
  if (!Number.isFinite(amountPence) || amountPence < 100)
    return { ok: false, error: "Enter a valid amount (at least £1)." };
  if (!isValidCampaign(campaign)) return { ok: false, error: "Choose a cause." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.donationDate))
    return { ok: false, error: "Enter the donation date." };
  const date = new Date(`${input.donationDate}T12:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.getTime() > Date.now() + 86_400_000)
    return { ok: false, error: "Enter a valid (past) donation date." };

  // Generated reference — drives the receipt number; no DB row created.
  const reference =
    "DR-DON-" + randomUUID().replace(/-/g, "").slice(-8).toUpperCase();
  const fakeId = randomUUID();

  const sent = await sendDonationReceipt({
    toEmail: email,
    firstName,
    lastName,
    amountPence,
    campaignLabel: getCampaignLabel(campaign),
    campaignSlug: campaign,
    frequency: "one-time",
    giftAidClaimed: false,
    paymentIntentId: reference,
    completedAt: date,
    donationId: fakeId,
    addressLine1: input.addressLine1?.trim() || null,
    addressLine2: input.addressLine2?.trim() || null,
    city: input.city?.trim() || null,
    postcode: input.postcode?.trim() || null,
  });

  if (!sent) {
    return {
      ok: false,
      error: "Couldn't send the receipt — check the email address and try again.",
    };
  }

  const receiptNumber =
    "DR-DON-" + fakeId.replace(/-/g, "").slice(-8).toUpperCase();

  await logAdminAction({
    action: "issue_manual_receipt",
    userEmail: session.email,
    metadata: {
      toEmail: email,
      amountPence,
      campaign,
      donationDate: input.donationDate,
      receiptNumber,
    },
  });

  return { ok: true, reference: receiptNumber };
}
