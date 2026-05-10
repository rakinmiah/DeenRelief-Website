-- 006_admin_audit_log.sql
--
-- Persistent audit trail for every privileged admin action.
--
-- What gets logged:
--   sign_in              — successful admin sign-in
--   sign_in_failed       — failed admin sign-in (also drives rate limiting)
--   sign_out             — explicit sign-out via /api/admin/logout
--   view_gift_aid_csv    — HMRC reclaim spreadsheet downloaded (highest
--                          legally-loaded action; this is the row a
--                          regulator or trustee will most want to see)
--   refund_donation      — full refund issued via the admin
--   resend_receipt       — receipt email resent to donor
--   cancel_subscription  — recurring subscription cancelled
--   send_portal_link     — Stripe portal link generated for a donor
--   backfill_livemode    — one-time data backfill run
--
-- What we capture per row:
--   user_email   — the admin's email when known. NULL when access was
--                  via the ADMIN_API_TOKEN bearer (scripted / curl).
--   action       — one of the strings above (free-text, validated in
--                  application code rather than DB enum so we can add
--                  new actions without a migration).
--   target_id    — donation id, subscription id, etc. NULL for
--                  not-target-bound actions like sign_in.
--   ip           — best-effort client IP from x-forwarded-for.
--   user_agent   — browser user agent for forensic context.
--   metadata     — jsonb for action-specific context (refund amount,
--                  Stripe refund id, tax year on Gift Aid export, etc.).
--   created_at   — server timestamp.
--
-- Performance: three indexes for the common query patterns:
--   1. created_at DESC for the audit-log viewer page
--   2. (user_email, created_at) for "what did this admin do recently"
--   3. (ip, action, created_at) for the rate-limit query (count
--      sign_in_failed from this IP in the last 15 min)

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email text,
  action text NOT NULL,
  target_id text,
  ip text,
  user_agent text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_audit_log_created_idx
  ON admin_audit_log (created_at DESC);

CREATE INDEX IF NOT EXISTS admin_audit_log_user_idx
  ON admin_audit_log (user_email, created_at DESC)
  WHERE user_email IS NOT NULL;

-- Hot-path index for the rate-limit query on /api/admin/login.
-- Partial index keeps it small even as overall log volume grows.
CREATE INDEX IF NOT EXISTS admin_audit_log_ratelimit_idx
  ON admin_audit_log (ip, created_at DESC)
  WHERE action = 'sign_in_failed';

COMMENT ON TABLE admin_audit_log IS
  'Audit trail for admin actions. Writes are fire-and-forget — a failed '
  'log write never blocks the underlying action. Reads back the audit '
  'history via /admin/audit-log and drives the login rate limit.';
