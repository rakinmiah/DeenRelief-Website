/**
 * Data layer for donation message logs.
 *
 * One table — donation_messages — backs admin-initiated emails sent
 * from the donation detail page. Every send writes a row even if
 * the Resend send errored, so the trustee can see what they tried
 * to send and why it failed.
 *
 * Phase 1 only supports outbound (admin → donor). The direction
 * column exists on the row so a future inbound-capture phase
 * (donor replies routed through a parsing service) can append to
 * the same table.
 */

import { getSupabaseAdmin } from "@/lib/supabase";

export type DonationMessageDirection = "inbound" | "outbound";

export interface DonationMessageRow {
  id: string;
  donationId: string;
  createdAt: string;
  direction: DonationMessageDirection;
  authorEmail: string;
  toEmail: string;
  subject: string;
  body: string;
  resendMessageId: string | null;
}

export interface AppendDonationMessageInput {
  donationId: string;
  direction: DonationMessageDirection;
  authorEmail: string;
  toEmail: string;
  subject: string;
  body: string;
  resendMessageId?: string | null;
}

export async function appendDonationMessage(
  input: AppendDonationMessageInput
): Promise<DonationMessageRow | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("donation_messages")
    .insert({
      donation_id: input.donationId,
      direction: input.direction,
      author_email: input.authorEmail,
      to_email: input.toEmail,
      subject: input.subject,
      body: input.body,
      resend_message_id: input.resendMessageId ?? null,
    })
    .select(
      "id, donation_id, created_at, direction, author_email, to_email, subject, body, resend_message_id"
    )
    .single();
  if (error || !data) {
    console.error("[donation-messages] append failed:", error);
    return null;
  }
  return mapRow(data);
}

export async function fetchDonationMessages(
  donationId: string
): Promise<DonationMessageRow[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("donation_messages")
    .select(
      "id, donation_id, created_at, direction, author_email, to_email, subject, body, resend_message_id"
    )
    .eq("donation_id", donationId)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("[donation-messages] fetch failed:", error);
    return [];
  }
  return (data ?? []).map(mapRow);
}

/**
 * Update the resend_message_id on an already-logged row. Used
 * when we logged the message before the Resend send returned, and
 * now want to backfill the dashboard id.
 */
export async function setDonationMessageResendId(
  messageId: string,
  resendMessageId: string
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("donation_messages")
    .update({ resend_message_id: resendMessageId })
    .eq("id", messageId);
  if (error) {
    console.error(
      "[donation-messages] resend id backfill failed:",
      error
    );
  }
}

// ─────────────────────────────────────────────────────────────────
// Row → typed object mapper
// ─────────────────────────────────────────────────────────────────

interface RawRow {
  id: string;
  donation_id: string;
  created_at: string;
  direction: string;
  author_email: string;
  to_email: string;
  subject: string;
  body: string;
  resend_message_id: string | null;
}

function mapRow(r: RawRow): DonationMessageRow {
  return {
    id: r.id,
    donationId: r.donation_id,
    createdAt: r.created_at,
    direction: (r.direction as DonationMessageDirection) ?? "outbound",
    authorEmail: r.author_email,
    toEmail: r.to_email,
    subject: r.subject,
    body: r.body,
    resendMessageId: r.resend_message_id,
  };
}
