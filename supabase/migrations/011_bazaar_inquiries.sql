-- 011_bazaar_inquiries.sql
--
-- Customer inquiries inbox for the Deen Relief Bazaar.
--
-- The /bazaar/contact form already emails info@deenrelief.org. This
-- migration adds an admin-side record of those inquiries so the
-- trustees can read + reply from DR Admin instead of (or alongside)
-- working out of Gmail. Reply emails sent from DR Admin are logged
-- as outbound messages on the same inquiry, giving every conversation
-- a chat log that's queryable, audit-friendly, and survives
-- individual trustees moving on.
--
-- Phase-1 scope (Option A, see ChatOps thread): outbound replies are
-- fully logged; customer follow-up replies are not auto-captured —
-- they land in Gmail. Future phases can add inbound parsing via
-- Cloudflare Email Workers to fill that gap without schema changes.
--
-- Two tables:
--
--   bazaar_inquiries          — one row per conversation (≈ thread).
--                               Tracks status, customer identity,
--                               and an optional FK to the order the
--                               customer cited.
--
--   bazaar_inquiry_messages   — many rows per inquiry. Direction
--                               tells inbound (from customer) from
--                               outbound (admin reply). The initial
--                               contact-form message is the first
--                               inbound row.
--
-- Why two tables (rather than one with a JSON message log): SQL
-- queryability — "how many inquiries did we receive last month",
-- "average time to first reply", "which trustee replied last on this
-- inquiry" all turn into trivial GROUP BYs against the messages
-- table. A JSON log column makes those queries painful.

-- ─────────────────────────────────────────────────────────────────
-- bazaar_inquiries — one row per conversation
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS bazaar_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),

  -- Workflow state. Open = waiting on admin reply.
  -- Replied = admin sent a reply, awaiting customer (or closure).
  -- Closed = trustee marked done. Customer can always reply via
  -- email — that lands in Gmail; the inquiry stays closed in DR
  -- Admin until someone reopens it via a manual log/reply.
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'replied', 'closed')),

  -- Customer identity captured at submission time. Email is the
  -- key axis — same customer emailing twice gets two inquiries,
  -- not one merged thread (admins decide whether to merge
  -- manually if needed).
  customer_name text NOT NULL,
  customer_email text NOT NULL,

  -- Subject = the reason dropdown value from the contact form
  -- ("Order status", "Returns & refunds", "Sizing question", etc).
  -- Free-text since the dropdown options can evolve without a
  -- migration; admin UI relies on application code for the
  -- canonical list.
  subject text NOT NULL,

  -- The order the customer typed in the form, as a raw string —
  -- kept even when we couldn't match it to a real order (e.g.
  -- they typed it wrong). order_id is set when the raw text
  -- successfully resolved via the receipt-number format.
  order_number_raw text,
  order_id uuid REFERENCES bazaar_orders(id) ON DELETE SET NULL,

  -- Bumped on every new inbound or outbound message so list views
  -- can sort by "most recently active" cheaply. Trigger below
  -- maintains this on inserts to bazaar_inquiry_messages.
  last_message_at timestamptz NOT NULL DEFAULT now(),

  -- Optional: which trustee picked up this inquiry. Future use —
  -- currently inserts leave it NULL. The reply server action can
  -- write the current admin's email here if we add "claim this"
  -- UX later.
  assigned_to_email text
);

-- Hot-path index for the list view — "active first, then closed,
-- newest activity first within each bucket". The bell + list page
-- both filter heavily by status so this carries most of the load.
CREATE INDEX IF NOT EXISTS bazaar_inquiries_status_activity_idx
  ON bazaar_inquiries (status, last_message_at DESC);

-- Lookup index for "show inquiries linked to this order" on the
-- bazaar order detail page. Partial index because the majority of
-- inquiries probably won't have an order link.
CREATE INDEX IF NOT EXISTS bazaar_inquiries_order_idx
  ON bazaar_inquiries (order_id, created_at DESC)
  WHERE order_id IS NOT NULL;

-- Catch-all for "all inquiries, newest first" (the default list
-- view ordering when no filter is applied).
CREATE INDEX IF NOT EXISTS bazaar_inquiries_created_idx
  ON bazaar_inquiries (created_at DESC);

ALTER TABLE bazaar_inquiries ENABLE ROW LEVEL SECURITY;
-- No policies — service-role only. Matches admin_audit_log,
-- admin_notifications, bazaar_orders, etc.

COMMENT ON TABLE bazaar_inquiries IS
  'Customer inquiries from /bazaar/contact. One row per conversation. '
  'Status drives the admin inbox workflow (open → replied → closed). '
  'order_id is set when the customer cited a matchable receipt number.';

-- ─────────────────────────────────────────────────────────────────
-- bazaar_inquiry_messages — chat log entries
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS bazaar_inquiry_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id uuid NOT NULL REFERENCES bazaar_inquiries(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),

  -- Inbound = from customer (form submission OR a manually-pasted
  --           follow-up reply in phase 1; auto-parsed reply in
  --           future phases).
  -- Outbound = admin reply sent via Resend from DR Admin.
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),

  -- The email address the message originated from. For inbound:
  -- the customer. For outbound: the admin's email (audit trail —
  -- which trustee sent which reply).
  author_email text NOT NULL,

  -- The message body itself. Plain text — Resend renders it
  -- inside our standard transactional HTML wrapper at send time;
  -- the chat log displays it as-is with whitespace preserved.
  body text NOT NULL,

  -- Resend's outbound message ID (returned by their send API).
  -- Captured for delivery tracing — if a customer says "I never
  -- got a reply", a trustee can look up the Resend dashboard
  -- entry. NULL for inbound messages and outbound sends where
  -- the API returned no id.
  resend_message_id text
);

CREATE INDEX IF NOT EXISTS bazaar_inquiry_messages_inquiry_idx
  ON bazaar_inquiry_messages (inquiry_id, created_at ASC);

ALTER TABLE bazaar_inquiry_messages ENABLE ROW LEVEL SECURITY;
-- No policies — service-role only.

COMMENT ON TABLE bazaar_inquiry_messages IS
  'Individual messages within an inquiry conversation. Direction '
  'distinguishes customer inbound from admin outbound replies. '
  'Ordered ASC by created_at to render as a chat log.';

-- ─────────────────────────────────────────────────────────────────
-- last_message_at maintenance trigger
-- ─────────────────────────────────────────────────────────────────
--
-- Every inserted message bumps its parent inquiry's
-- last_message_at. Done via trigger rather than at application-
-- code level so a single SQL statement (or future inbound parser)
-- can't accidentally skip the update.

CREATE OR REPLACE FUNCTION bazaar_inquiries_touch_last_message()
RETURNS trigger AS $$
BEGIN
  UPDATE bazaar_inquiries
  SET last_message_at = NEW.created_at
  WHERE id = NEW.inquiry_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS bazaar_inquiry_messages_touch_trigger
  ON bazaar_inquiry_messages;

CREATE TRIGGER bazaar_inquiry_messages_touch_trigger
  AFTER INSERT ON bazaar_inquiry_messages
  FOR EACH ROW
  EXECUTE FUNCTION bazaar_inquiries_touch_last_message();
