/**
 * Data layer for the Bazaar inquiries inbox.
 *
 * Sits above migration 011_bazaar_inquiries.sql. Two tables —
 * bazaar_inquiries (one row per conversation) and
 * bazaar_inquiry_messages (chat log entries). All writes go through
 * the service-role Supabase client; RLS denies non-service traffic.
 *
 * Receipt-number matching: customers cite orders via the
 * "DR-BZR-XXXXXXXX" format (defined in bazaar-order-email.ts). The
 * receipt is the last 8 hex chars of the order UUID, uppercased.
 * findOrderIdByReceipt() reverses the format and looks up the order;
 * if no match (typo / wrong format), the raw text is still saved so
 * a trustee can investigate manually.
 */

import { getSupabaseAdmin } from "@/lib/supabase";

export type InquiryStatus = "open" | "replied" | "closed";
export type InquiryDirection = "inbound" | "outbound";

export interface BazaarInquiryRow {
  id: string;
  status: InquiryStatus;
  customerName: string;
  customerEmail: string;
  subject: string;
  orderNumberRaw: string | null;
  orderId: string | null;
  lastMessageAt: string;
  assignedToEmail: string | null;
  createdAt: string;
}

export interface BazaarInquiryMessageRow {
  id: string;
  inquiryId: string;
  createdAt: string;
  direction: InquiryDirection;
  authorEmail: string;
  body: string;
  resendMessageId: string | null;
}

// ─────────────────────────────────────────────────────────────────
// Receipt-number ↔ order id
// ─────────────────────────────────────────────────────────────────

/**
 * Resolve a customer-typed receipt string to a real
 * bazaar_orders.id, or null if no match. Accepts any of:
 *
 *   - "DR-BZR-A1B2C3D4"  (canonical, as it appears in our emails)
 *   - "drb-a1b2c3d4"      (loose / lowercased variant)
 *   - "DR_BZR_A1B2C3D4"   (separator slips happen)
 *   - "a1b2c3d4"          (just the suffix)
 *
 * Strategy: strip everything that isn't [a-f0-9], uppercase, and
 * match the last 8 chars against UUID suffix substrings on
 * bazaar_orders. We could replicate the exact UUID-tail derivation
 * in SQL (extract the last 8 hex chars and compare), but a
 * straightforward LIKE on the textual UUID with the % prefix
 * leverages the existing primary-key index well enough at our scale
 * and keeps the lookup readable.
 *
 * Returns null on any failure so the caller can fall back to
 * saving the raw text without erroring the contact submission.
 */
export async function findOrderIdByReceipt(
  raw: string | null | undefined
): Promise<string | null> {
  if (!raw) return null;

  const normalized = raw.toLowerCase().replace(/[^a-f0-9]/g, "");
  if (normalized.length < 6) return null; // too short to be safe to match

  // We want the trailing 8 hex chars (the receipt tail). If the
  // user typed fewer than 8 chars worth, use what we have but
  // require at least 6 to avoid wildcard-matching huge result sets.
  const tail = normalized.slice(-8);

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("bazaar_orders")
      .select("id")
      .like("id", `%${tail}`)
      .limit(2); // limit 2 — if more than 1 matches, refuse to guess

    if (error) {
      console.error("[bazaar-inquiries] receipt lookup failed:", error);
      return null;
    }
    if (!data || data.length !== 1) {
      // Either 0 (no match) or 2+ (ambiguous — don't guess).
      return null;
    }
    return data[0].id as string;
  } catch (err) {
    console.error("[bazaar-inquiries] receipt lookup threw:", err);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────
// Creates
// ─────────────────────────────────────────────────────────────────

export interface CreateInquiryInput {
  customerName: string;
  customerEmail: string;
  subject: string;
  initialMessage: string;
  orderNumberRaw?: string | null;
  /** Pre-resolved order id (caller passes the result of
   *  findOrderIdByReceipt). Kept separate from orderNumberRaw so a
   *  failed lookup still records the raw text for manual triage. */
  orderId?: string | null;
}

export interface CreatedInquiry {
  inquiry: BazaarInquiryRow;
  firstMessage: BazaarInquiryMessageRow;
}

/**
 * Create an inquiry + its first inbound message in a single
 * server-side call. Used by /api/contact on bazaar submissions.
 *
 * Two inserts, no transaction wrapper — we accept that a freak
 * failure between them could leave a parent inquiry with no
 * messages. The trade-off is: the alternative (postgres function
 * for atomicity) is more complex code than the failure rate
 * warrants at this scale, and a no-message inquiry is harmless
 * noise the admin can delete manually.
 */
export async function createInquiry(
  input: CreateInquiryInput
): Promise<CreatedInquiry | null> {
  const supabase = getSupabaseAdmin();
  const { data: inquiryRow, error: inquiryErr } = await supabase
    .from("bazaar_inquiries")
    .insert({
      customer_name: input.customerName,
      customer_email: input.customerEmail,
      subject: input.subject,
      order_number_raw: input.orderNumberRaw ?? null,
      order_id: input.orderId ?? null,
      status: "open",
    })
    .select(
      "id, status, customer_name, customer_email, subject, order_number_raw, order_id, last_message_at, assigned_to_email, created_at"
    )
    .single();

  if (inquiryErr || !inquiryRow) {
    console.error("[bazaar-inquiries] inquiry insert failed:", inquiryErr);
    return null;
  }

  const inquiry = mapInquiryRow(inquiryRow);

  const { data: messageRow, error: messageErr } = await supabase
    .from("bazaar_inquiry_messages")
    .insert({
      inquiry_id: inquiry.id,
      direction: "inbound",
      author_email: input.customerEmail,
      body: input.initialMessage,
    })
    .select(
      "id, inquiry_id, created_at, direction, author_email, body, resend_message_id"
    )
    .single();

  if (messageErr || !messageRow) {
    console.error("[bazaar-inquiries] first message insert failed:", messageErr);
    return null;
  }

  return { inquiry, firstMessage: mapMessageRow(messageRow) };
}

export interface AppendMessageInput {
  inquiryId: string;
  direction: InquiryDirection;
  authorEmail: string;
  body: string;
  resendMessageId?: string | null;
}

/**
 * Insert a message row and (via trigger) bump
 * parent.last_message_at. Returns the inserted row or null.
 */
export async function appendInquiryMessage(
  input: AppendMessageInput
): Promise<BazaarInquiryMessageRow | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("bazaar_inquiry_messages")
    .insert({
      inquiry_id: input.inquiryId,
      direction: input.direction,
      author_email: input.authorEmail,
      body: input.body,
      resend_message_id: input.resendMessageId ?? null,
    })
    .select(
      "id, inquiry_id, created_at, direction, author_email, body, resend_message_id"
    )
    .single();

  if (error || !data) {
    console.error("[bazaar-inquiries] append message failed:", error);
    return null;
  }
  return mapMessageRow(data);
}

// ─────────────────────────────────────────────────────────────────
// Updates
// ─────────────────────────────────────────────────────────────────

export async function updateInquiryStatus(
  inquiryId: string,
  status: InquiryStatus
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("bazaar_inquiries")
    .update({ status })
    .eq("id", inquiryId);
  if (error) {
    console.error("[bazaar-inquiries] status update failed:", error);
    throw new Error(`Failed to update inquiry status: ${error.message}`);
  }
}

// ─────────────────────────────────────────────────────────────────
// Reads
// ─────────────────────────────────────────────────────────────────

export interface FetchInquiriesOptions {
  /** Filter by status. Omit to get all. */
  status?: InquiryStatus;
  /** Soft cap on rows returned. Default 200. */
  limit?: number;
}

export async function fetchInquiries(
  opts: FetchInquiriesOptions = {}
): Promise<BazaarInquiryRow[]> {
  const supabase = getSupabaseAdmin();
  let q = supabase
    .from("bazaar_inquiries")
    .select(
      "id, status, customer_name, customer_email, subject, order_number_raw, order_id, last_message_at, assigned_to_email, created_at"
    )
    .order("last_message_at", { ascending: false })
    .limit(opts.limit ?? 200);
  if (opts.status) {
    q = q.eq("status", opts.status);
  }
  const { data, error } = await q;
  if (error) {
    console.error("[bazaar-inquiries] fetchInquiries failed:", error);
    return [];
  }
  return (data ?? []).map(mapInquiryRow);
}

export interface InquiryWithMessages {
  inquiry: BazaarInquiryRow;
  messages: BazaarInquiryMessageRow[];
}

export async function fetchInquiryById(
  id: string
): Promise<InquiryWithMessages | null> {
  const supabase = getSupabaseAdmin();
  const { data: inquiryRow, error: inquiryErr } = await supabase
    .from("bazaar_inquiries")
    .select(
      "id, status, customer_name, customer_email, subject, order_number_raw, order_id, last_message_at, assigned_to_email, created_at"
    )
    .eq("id", id)
    .maybeSingle();

  if (inquiryErr) {
    console.error("[bazaar-inquiries] fetchInquiryById failed:", inquiryErr);
    return null;
  }
  if (!inquiryRow) return null;

  const { data: messageRows, error: messagesErr } = await supabase
    .from("bazaar_inquiry_messages")
    .select(
      "id, inquiry_id, created_at, direction, author_email, body, resend_message_id"
    )
    .eq("inquiry_id", id)
    .order("created_at", { ascending: true });

  if (messagesErr) {
    console.error(
      "[bazaar-inquiries] fetchInquiryById messages failed:",
      messagesErr
    );
    return { inquiry: mapInquiryRow(inquiryRow), messages: [] };
  }

  return {
    inquiry: mapInquiryRow(inquiryRow),
    messages: (messageRows ?? []).map(mapMessageRow),
  };
}

/**
 * All inquiries that reference a given order. Used by the
 * /admin/bazaar/orders/[id] detail page to surface
 * "conversations about this order" inline. Sorted newest-first.
 */
export async function fetchInquiriesByOrderId(
  orderId: string
): Promise<BazaarInquiryRow[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("bazaar_inquiries")
    .select(
      "id, status, customer_name, customer_email, subject, order_number_raw, order_id, last_message_at, assigned_to_email, created_at"
    )
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[bazaar-inquiries] fetchInquiriesByOrderId failed:", error);
    return [];
  }
  return (data ?? []).map(mapInquiryRow);
}

export async function countOpenInquiries(): Promise<number> {
  const supabase = getSupabaseAdmin();
  const { count, error } = await supabase
    .from("bazaar_inquiries")
    .select("id", { count: "exact", head: true })
    .eq("status", "open");
  if (error) {
    console.error("[bazaar-inquiries] countOpenInquiries failed:", error);
    return 0;
  }
  return count ?? 0;
}

// ─────────────────────────────────────────────────────────────────
// Row → typed object mappers
// ─────────────────────────────────────────────────────────────────

interface RawInquiryRow {
  id: string;
  status: string;
  customer_name: string;
  customer_email: string;
  subject: string;
  order_number_raw: string | null;
  order_id: string | null;
  last_message_at: string;
  assigned_to_email: string | null;
  created_at: string;
}

interface RawMessageRow {
  id: string;
  inquiry_id: string;
  created_at: string;
  direction: string;
  author_email: string;
  body: string;
  resend_message_id: string | null;
}

function mapInquiryRow(r: RawInquiryRow): BazaarInquiryRow {
  return {
    id: r.id,
    status: (r.status as InquiryStatus) ?? "open",
    customerName: r.customer_name,
    customerEmail: r.customer_email,
    subject: r.subject,
    orderNumberRaw: r.order_number_raw,
    orderId: r.order_id,
    lastMessageAt: r.last_message_at,
    assignedToEmail: r.assigned_to_email,
    createdAt: r.created_at,
  };
}

function mapMessageRow(r: RawMessageRow): BazaarInquiryMessageRow {
  return {
    id: r.id,
    inquiryId: r.inquiry_id,
    createdAt: r.created_at,
    direction: (r.direction as InquiryDirection) ?? "inbound",
    authorEmail: r.author_email,
    body: r.body,
    resendMessageId: r.resend_message_id,
  };
}
