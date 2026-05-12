/**
 * Data layer for bazaar order message logs. Mirrors
 * donation-messages.ts — same shape, different parent.
 *
 * Logs every admin-initiated email sent in connection with a
 * specific bazaar order. Distinct from bazaar_inquiries (which is
 * customer-initiated conversation threads).
 */

import { getSupabaseAdmin } from "@/lib/supabase";

export type OrderMessageDirection = "inbound" | "outbound";

export interface BazaarOrderMessageRow {
  id: string;
  orderId: string;
  createdAt: string;
  direction: OrderMessageDirection;
  authorEmail: string;
  toEmail: string;
  subject: string;
  body: string;
  resendMessageId: string | null;
}

export interface AppendOrderMessageInput {
  orderId: string;
  direction: OrderMessageDirection;
  authorEmail: string;
  toEmail: string;
  subject: string;
  body: string;
  resendMessageId?: string | null;
}

export async function appendBazaarOrderMessage(
  input: AppendOrderMessageInput
): Promise<BazaarOrderMessageRow | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("bazaar_order_messages")
    .insert({
      order_id: input.orderId,
      direction: input.direction,
      author_email: input.authorEmail,
      to_email: input.toEmail,
      subject: input.subject,
      body: input.body,
      resend_message_id: input.resendMessageId ?? null,
    })
    .select(
      "id, order_id, created_at, direction, author_email, to_email, subject, body, resend_message_id"
    )
    .single();
  if (error || !data) {
    console.error("[bazaar-order-messages] append failed:", error);
    return null;
  }
  return mapRow(data);
}

export async function fetchBazaarOrderMessages(
  orderId: string
): Promise<BazaarOrderMessageRow[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("bazaar_order_messages")
    .select(
      "id, order_id, created_at, direction, author_email, to_email, subject, body, resend_message_id"
    )
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("[bazaar-order-messages] fetch failed:", error);
    return [];
  }
  return (data ?? []).map(mapRow);
}

export async function setBazaarOrderMessageResendId(
  messageId: string,
  resendMessageId: string
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("bazaar_order_messages")
    .update({ resend_message_id: resendMessageId })
    .eq("id", messageId);
  if (error) {
    console.error(
      "[bazaar-order-messages] resend id backfill failed:",
      error
    );
  }
}

interface RawRow {
  id: string;
  order_id: string;
  created_at: string;
  direction: string;
  author_email: string;
  to_email: string;
  subject: string;
  body: string;
  resend_message_id: string | null;
}

function mapRow(r: RawRow): BazaarOrderMessageRow {
  return {
    id: r.id,
    orderId: r.order_id,
    createdAt: r.created_at,
    direction: (r.direction as OrderMessageDirection) ?? "outbound",
    authorEmail: r.author_email,
    toEmail: r.to_email,
    subject: r.subject,
    body: r.body,
    resendMessageId: r.resend_message_id,
  };
}
