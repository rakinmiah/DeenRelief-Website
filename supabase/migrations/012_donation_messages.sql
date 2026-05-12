-- 012_donation_messages.sql
--
-- Admin-initiated outbound emails to donors, logged per-donation.
--
-- This is the "send a one-off email to the donor from inside DR
-- Admin" feature. Distinct from the bazaar inquiries system (which
-- starts customer-side); these are admin-initiated messages with a
-- subject and body that go out via Resend from info@deenrelief.org
-- and are logged here so the donation detail page can show every
-- email that's ever been sent in connection with this donation.
--
-- One row per send. No threading — each email is a discrete record.
-- A future inbound-capture phase could add direction='inbound' rows
-- (the table already supports the direction column for that
-- forward compatibility) without schema changes.

CREATE TABLE IF NOT EXISTS donation_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donation_id uuid NOT NULL REFERENCES donations(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),

  -- Always 'outbound' in phase 1 (admin → donor). 'inbound' is
  -- reserved for future use when we add reply-capture.
  direction text NOT NULL DEFAULT 'outbound'
    CHECK (direction IN ('inbound', 'outbound')),

  -- The signed-in admin's email at send time. Audit trail —
  -- which trustee composed which message.
  author_email text NOT NULL,

  -- Snapshot of the donor email at send time. We snapshot rather
  -- than join through donor_id because (a) it survives the donor
  -- changing their email later and (b) the chat log should always
  -- show "this email went to <address>" exactly as it left us.
  to_email text NOT NULL,

  -- The subject line as typed in the composer.
  subject text NOT NULL,

  -- The plain-text body. Resend wraps this in our transactional
  -- HTML template at send time; the log here stays plain-text so
  -- the chat-log UI doesn't need an HTML parser.
  body text NOT NULL,

  -- Resend's outbound message ID (for matching against their
  -- delivery dashboard). NULL when the send errored before
  -- Resend issued an id.
  resend_message_id text
);

-- Hot path: "all messages for this donation, oldest first" — the
-- shape the detail page renders.
CREATE INDEX IF NOT EXISTS donation_messages_donation_idx
  ON donation_messages (donation_id, created_at ASC);

ALTER TABLE donation_messages ENABLE ROW LEVEL SECURITY;
-- No policies — service-role only. Same defence-in-depth pattern
-- as admin_audit_log, admin_notifications, donations.

COMMENT ON TABLE donation_messages IS
  'Admin-initiated emails sent to donors from the donation detail '
  'page. One row per send. Each record captures the subject, body, '
  'author trustee, recipient email snapshot, and Resend message id '
  'for later delivery tracing.';
