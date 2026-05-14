-- 018_admin_push_subscriptions.sql
--
-- Web Push subscriptions for the DR Admin PWA.
--
-- Each row is one browser/device that has opted into push
-- notifications. When the bell queue enqueues a new notification,
-- the server iterates these subscriptions and sends a VAPID-signed
-- push payload to each endpoint. The browser's push service (FCM /
-- APNs / Mozilla autopush) wakes the service worker, which then
-- calls showNotification() to surface a real OS-level notification
-- on the user's lock screen / notification shade.
--
-- iOS support note: iOS 16.4+ supports web push, but only for
-- PWAs that have been installed to the Home Screen via Safari's
-- Share → Add to Home Screen. The subscription created from a
-- regular Safari tab is silently no-op on iOS. The client UI
-- handles this — only shows the "Enable notifications" button
-- when the install + standalone-display-mode checks both pass.
--
-- One trustee = one row PER device. A single person using the
-- admin from their iPhone and their laptop has two subscriptions.
-- Pruning happens lazily: if a sendNotification() call returns
-- 410 Gone (subscription expired or revoked at the OS level), we
-- delete the row in the same request.

CREATE TABLE IF NOT EXISTS admin_push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The signed-in admin's email at subscription time. Used for
  -- audit ("who enabled this device") and for future per-trustee
  -- filtering (e.g. "only notify trustee X about orders they
  -- own"). Multiple rows can share an email — one trustee, many
  -- devices.
  user_email text NOT NULL,

  -- Browser-issued unique push endpoint. The actual URL of the
  -- push service that delivers messages to this subscription.
  -- One endpoint per subscription per device; uniqueness lets us
  -- upsert on re-subscribe (e.g. after the user denies + then
  -- re-enables permission, or after the browser auto-renews).
  endpoint text NOT NULL,

  -- VAPID encryption keys — both required by the web-push
  -- protocol for the payload-encryption envelope. The browser
  -- generated these at subscribe time; we just store them.
  p256dh_key text NOT NULL,
  auth_key text NOT NULL,

  -- Best-effort user-agent string for debugging ("which device is
  -- this row from"). Not used for routing — purely diagnostic.
  user_agent text,

  created_at timestamptz NOT NULL DEFAULT now(),

  -- Touched on every successful push delivery. A row that hasn't
  -- been seen in months is a candidate for cleanup but we don't
  -- auto-prune — 410 Gone responses are the authoritative signal.
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

-- Unique endpoint → enables ON CONFLICT (endpoint) DO UPDATE on
-- re-subscribe so the same device re-enabling notifications
-- doesn't accumulate duplicate rows.
CREATE UNIQUE INDEX IF NOT EXISTS admin_push_subscriptions_endpoint_idx
  ON admin_push_subscriptions (endpoint);

-- Lookup-by-user index for future per-trustee filtering and for
-- the "list my devices" UI we might add later.
CREATE INDEX IF NOT EXISTS admin_push_subscriptions_user_idx
  ON admin_push_subscriptions (user_email);

ALTER TABLE admin_push_subscriptions ENABLE ROW LEVEL SECURITY;
-- No policies — service-role only. Same defence-in-depth pattern
-- as admin_notifications + admin_audit_log.

COMMENT ON TABLE admin_push_subscriptions IS
  'Web Push subscriptions for the DR Admin PWA. One row per '
  'browser/device that has opted into OS-level push notifications. '
  'Endpoint is unique; re-subscribes upsert. iOS support requires '
  'install-to-home-screen first per Apple''s PWA push policy.';
