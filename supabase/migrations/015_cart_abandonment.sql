-- 015_cart_abandonment.sql
--
-- Dedup log for cart-abandonment recovery emails.
--
-- Cart abandonment recovery for the bazaar uses Stripe's own
-- `checkout.session.expired` events as the trigger — sessions
-- default to 24h expiry, and Stripe captures the customer's
-- email the moment they type it into the payment page (even if
-- they then close the tab). That gives us a higher-intent
-- recovery signal than tracking anonymous localStorage carts:
-- the customer was actively in the buy flow when they bailed.
--
-- This table exists to ensure we never send the same recovery
-- email twice for the same order (e.g. if Stripe replays the
-- expired event, or an admin manually triggers a resend). One
-- row per (order_id, kind) — the unique constraint enforces
-- single-send semantics at the database level rather than
-- relying on application logic.

CREATE TABLE IF NOT EXISTS bazaar_abandonment_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES bazaar_orders(id) ON DELETE CASCADE,
  sent_at timestamptz NOT NULL DEFAULT now(),

  -- 'cart_abandonment' = the 24h "still thinking about this?" email
  -- fired from checkout.session.expired. Future kinds could include
  -- 'cart_abandonment_followup' (a softer 7-day reminder) or
  -- 'cart_abandonment_final' (a 30-day last call), each with its
  -- own dedup row.
  kind text NOT NULL DEFAULT 'cart_abandonment',

  -- Snapshot of the recipient at send time. Stored even though it
  -- duplicates bazaar_orders.contact_email so the row stands alone
  -- for audit purposes (the order's contact_email may not be set
  -- at expire time if the customer abandoned BEFORE entering it).
  recipient_email text NOT NULL,

  -- Resend message id for delivery tracing.
  resend_message_id text,

  -- Stripe's recorded reason for expiry — useful for analytics
  -- but not required.
  expired_reason text,

  UNIQUE (order_id, kind)
);

CREATE INDEX IF NOT EXISTS bazaar_abandonment_emails_sent_idx
  ON bazaar_abandonment_emails (sent_at DESC);

ALTER TABLE bazaar_abandonment_emails ENABLE ROW LEVEL SECURITY;
-- No policies — service-role only.

COMMENT ON TABLE bazaar_abandonment_emails IS
  'Dedup log for cart-abandonment recovery emails. UNIQUE(order_id, kind) '
  'guarantees a given recovery kind never fires twice for the same '
  'order, even under Stripe webhook replay.';
