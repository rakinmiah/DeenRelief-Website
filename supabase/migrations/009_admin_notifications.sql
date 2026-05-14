-- 009_admin_notifications.sql
--
-- Admin in-app notification feed for the Deen Relief admin PWA.
--
-- A notification is a queryable row representing "something the
-- trustee should see in the admin bell icon". Two delivery
-- properties:
--
--   scheduled_for — when the notification becomes visible. Default
--                   now() (immediate). Future-dated rows are how
--                   we schedule reminders without a cron — the
--                   bell query filters by scheduled_for <= now()
--                   so a future row is invisible until its time
--                   arrives.
--
--   cancelled_at  — when set, the notification is hidden
--                   regardless of scheduled_for. Used to suppress
--                   the "still unfulfilled after 24h" reminder
--                   when the admin marks the order shipped before
--                   the 24-hour mark.
--
-- target_id + target_url drive the click-through: the bell row
-- links to /admin/bazaar/orders/<id> (or wherever the event
-- belongs). target_id is also the key used by cancelNotifications()
-- so a single order's pending reminders can be cancelled in one
-- UPDATE.
--
-- The bell polls a small unread+active window via
-- /api/admin/notifications. Volume is low — at typical bazaar
-- order counts the table stays small. Old read rows can be
-- pruned later if needed; no auto-cleanup at this scale.

CREATE TABLE IF NOT EXISTS admin_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Event taxonomy. Free-text validated in application code so
  -- new event types don't require a migration.
  --
  -- Current values:
  --   bazaar_order_placed                  — fires on paid webhook
  --   bazaar_order_unfulfilled_reminder    — 24h after place if
  --                                          still status='paid'
  type text NOT NULL,

  -- Visual weight in the bell dropdown.
  --   'info'    — normal/operational
  --   'warning' — needs action soon
  --   'urgent'  — needs action now
  severity text NOT NULL CHECK (severity IN ('info', 'warning', 'urgent')),

  title text NOT NULL,
  body text,

  -- Where the click-through navigates.
  target_url text,

  -- Stable id of the underlying record (e.g. bazaar_orders.id) so
  -- cancellations target a single object cleanly. NULL for
  -- notifications not bound to a row.
  target_id text,

  -- When the notification becomes visible. Defaults to now(); set
  -- in the future to schedule a reminder.
  scheduled_for timestamptz NOT NULL DEFAULT now(),

  -- Set when the event the notification refers to is no longer
  -- relevant (e.g. order fulfilled before the 24h reminder fires).
  cancelled_at timestamptz,

  -- Set when an admin clicks the notification in the bell.
  read_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now()
);

-- Hot-path index for the bell query — "active and unread,
-- newest first". Filters: scheduled_for <= now() AND cancelled_at
-- IS NULL AND read_at IS NULL. Partial index keeps it small.
CREATE INDEX IF NOT EXISTS admin_notifications_active_idx
  ON admin_notifications (scheduled_for DESC, created_at DESC)
  WHERE cancelled_at IS NULL AND read_at IS NULL;

-- Index for cancellations: cancelNotifications() filters by
-- target_id + type + cancelled_at IS NULL.
CREATE INDEX IF NOT EXISTS admin_notifications_target_idx
  ON admin_notifications (target_id, type)
  WHERE cancelled_at IS NULL;

-- Catch-all index for the bell's "all notifications, recent first"
-- view (when we add a full notifications page later).
CREATE INDEX IF NOT EXISTS admin_notifications_created_idx
  ON admin_notifications (created_at DESC);

ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;
-- No policies — service-role only. Same defence-in-depth pattern
-- as admin_audit_log and bazaar_orders.

COMMENT ON TABLE admin_notifications IS
  'In-app notification feed for the Deen Relief admin. Bell icon '
  'in the AdminShell polls the active+unread rows. scheduled_for '
  'enables 24h-delayed reminders without a cron — rows become '
  'visible when scheduled_for <= now(). cancelled_at lets us '
  'suppress reminders that are no longer relevant.';
