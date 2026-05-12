-- 013_bazaar_order_messages.sql
--
-- Admin-initiated outbound emails to bazaar customers, logged
-- per-order. Mirrors migration 012_donation_messages.sql exactly
-- — same schema, different parent table.
--
-- Distinct from bazaar_inquiries (which are customer-initiated
-- conversations starting via /bazaar/contact). This table logs
-- ad-hoc emails a trustee composes from the order detail page —
-- "your shipping was delayed", "thanks for the kind note", etc.

CREATE TABLE IF NOT EXISTS bazaar_order_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES bazaar_orders(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),

  -- Always 'outbound' in phase 1. 'inbound' reserved for future
  -- reply-capture (Cloudflare Email Workers, etc).
  direction text NOT NULL DEFAULT 'outbound'
    CHECK (direction IN ('inbound', 'outbound')),

  -- Trustee email at send time.
  author_email text NOT NULL,

  -- Snapshot of the recipient address — usually the order's
  -- contact_email, but kept as a snapshot so a customer changing
  -- their email later doesn't rewrite history.
  to_email text NOT NULL,

  subject text NOT NULL,
  body text NOT NULL,
  resend_message_id text
);

CREATE INDEX IF NOT EXISTS bazaar_order_messages_order_idx
  ON bazaar_order_messages (order_id, created_at ASC);

ALTER TABLE bazaar_order_messages ENABLE ROW LEVEL SECURITY;
-- No policies — service-role only.

COMMENT ON TABLE bazaar_order_messages IS
  'Admin-initiated emails sent to bazaar customers from the order '
  'detail page. One row per send. Captures subject, body, author '
  'trustee, recipient snapshot, and Resend message id for tracing.';
