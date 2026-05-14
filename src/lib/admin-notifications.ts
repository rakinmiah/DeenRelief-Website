/**
 * Admin notification feed — the data layer behind the bell icon.
 *
 * A notification is a row in admin_notifications (migration 009).
 * Two delivery axes:
 *   - scheduled_for — invisible until this timestamp is reached.
 *     Used to schedule the "still unfulfilled 24h later" reminder
 *     without a cron.
 *   - cancelled_at — when set, the row is hidden regardless of
 *     scheduled_for. Used to suppress the reminder when an order
 *     is fulfilled before 24h.
 *
 * All writes are fire-and-forget (same posture as admin-audit) so
 * a failed notification insert never blocks the operation it was
 * attached to (e.g. a paid order still goes through if the
 * notification queue is unreachable).
 */

import { getSupabaseAdmin } from "@/lib/supabase";
import { sendAdminPush } from "@/lib/admin-push";

export type NotificationType =
  | "bazaar_order_placed"
  | "bazaar_order_unfulfilled_reminder"
  | "bazaar_stock_low"
  | "bazaar_stock_out"
  // Customer inquiry submitted via /bazaar/contact. Created by
  // /api/contact when source === "bazaar". Severity "warning"
  // because every inquiry expects a reply within ~1 working day —
  // not as urgent as an unfulfilled order but a missed reply
  // hurts the brand promise on the bazaar contact page.
  | "bazaar_inquiry_new"
  // Resend failed to send a customer-facing email. Emitted by the
  // donation + bazaar email senders in their error branch. Severity
  // "urgent" because a failed send means a customer didn't receive
  // an email they expect (order confirmation, refund confirmation,
  // tracking notification, etc.) — every minute of delay erodes
  // trust. The trustee gets the failure context (which email kind,
  // who it was to, the underlying Resend error) so they can either
  // retry from the admin UI or follow up out-of-band.
  | "email_send_failure";

export type NotificationSeverity = "info" | "warning" | "urgent";

export interface AdminNotificationRow {
  id: string;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  body: string | null;
  targetUrl: string | null;
  targetId: string | null;
  scheduledFor: string;
  cancelledAt: string | null;
  readAt: string | null;
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────────
// Writes
// ─────────────────────────────────────────────────────────────────

export interface EnqueueNotificationInput {
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  body?: string | null;
  targetUrl?: string | null;
  targetId?: string | null;
  /** Set in the future to delay visibility. Default: now (immediate). */
  scheduledFor?: Date;
}

/**
 * Fire-and-forget insert. Logs on failure but never throws — the
 * caller's primary operation (e.g. webhook ack) must not be
 * blocked by a notification write.
 */
export async function enqueueNotification(
  input: EnqueueNotificationInput
): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    await supabase.from("admin_notifications").insert({
      type: input.type,
      severity: input.severity,
      title: input.title,
      body: input.body ?? null,
      target_url: input.targetUrl ?? null,
      target_id: input.targetId ?? null,
      scheduled_for: (input.scheduledFor ?? new Date()).toISOString(),
    });
  } catch (err) {
    console.error("[admin-notifications] enqueue failed:", err);
  }

  // Fan out as a Web Push to every subscribed device so trustees
  // get an OS-level alert even when DR Admin isn't the active tab.
  // Skipped (no-op inside sendAdminPush) when:
  //   - VAPID keys aren't configured (warns once, then quietly skips)
  //   - The notification is scheduled for the future (a 24h reminder
  //     shouldn't buzz the phone now — the push fires when the
  //     reminder becomes due via the same scheduled-reminders cron
  //     that surfaces the bell row)
  //
  // Failure-isolated: a dead push service never blocks the insert
  // (which is already committed at this point).
  const scheduledAt = input.scheduledFor ?? new Date();
  const isImmediate = scheduledAt.getTime() <= Date.now() + 1000;
  if (isImmediate) {
    try {
      await sendAdminPush({
        title: input.title,
        body: input.body ?? null,
        url: input.targetUrl ?? null,
        // Dedup tag pairs type with target_id so two rapid events
        // about the same object (e.g. abandonment + reminder) don't
        // stack as separate banners on the lock screen.
        tag: input.targetId ? `${input.type}:${input.targetId}` : input.type,
        severity: input.severity,
      });
    } catch (err) {
      console.error("[admin-notifications] push send failed:", err);
    }
  }
}

/**
 * Convenience wrapper for the "Resend failed to send X" pattern.
 *
 * Called from every email sender's error branch (bazaar order
 * confirmation, shipping notification, abandonment recovery,
 * inquiry reply, order message, donation receipt, donation
 * message). Produces a consistently-shaped urgent notification
 * with enough context that the trustee can either retry from the
 * relevant admin UI or follow up with the customer out-of-band.
 *
 * `kind` is a human-readable short label used in the notification
 * title (e.g. "Order confirmation", "Inquiry reply"). Keep it
 * short — it renders in the bell dropdown.
 *
 * `targetUrl` should deep-link to wherever the trustee should look
 * (the order detail page, the inquiry detail page, etc.). The
 * notification badge becomes the entry point for recovery.
 *
 * Same fire-and-forget posture as the rest of this module — a
 * failed notification insert never re-throws, because the email
 * send has ALREADY failed and we don't want to compound errors.
 */
export async function notifyEmailFailure(params: {
  kind: string;
  recipientEmail: string;
  errorMessage: string;
  targetUrl?: string;
  targetId?: string;
}): Promise<void> {
  const truncatedError =
    params.errorMessage.length > 280
      ? `${params.errorMessage.slice(0, 280)}…`
      : params.errorMessage;
  await enqueueNotification({
    type: "email_send_failure",
    severity: "urgent",
    title: `Email failed: ${params.kind}`,
    body: `To ${params.recipientEmail} — ${truncatedError}`,
    targetUrl: params.targetUrl,
    targetId: params.targetId,
  });
}

/**
 * Mark every pending (un-cancelled) notification matching the
 * target + type combo as cancelled. The query is narrow enough
 * (target_id + type, with a partial index) to run in microseconds.
 *
 * Idempotent: a second call after all rows are already cancelled
 * is a no-op.
 *
 * Used by the mark-shipped route to suppress the 24h reminder
 * for an order that's just been fulfilled.
 */
export async function cancelNotifications(opts: {
  targetId: string;
  type: NotificationType;
}): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    await supabase
      .from("admin_notifications")
      .update({ cancelled_at: new Date().toISOString() })
      .eq("target_id", opts.targetId)
      .eq("type", opts.type)
      .is("cancelled_at", null);
  } catch (err) {
    console.error("[admin-notifications] cancel failed:", err);
  }
}

/**
 * Mark a single notification as read. The bell row's click handler
 * fires this — the API route is /api/admin/notifications/[id]/read.
 */
export async function markNotificationRead(id: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("admin_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .is("read_at", null);
  if (error) {
    throw new Error(`markNotificationRead failed: ${error.message}`);
  }
}

/**
 * "Mark all read" action — marks every currently-active and
 * unread notification as read. Used by the bell's footer button.
 */
export async function markAllNotificationsRead(): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("admin_notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null)
    .is("cancelled_at", null)
    .lte("scheduled_for", new Date().toISOString());
  if (error) {
    throw new Error(`markAllNotificationsRead failed: ${error.message}`);
  }
}

// ─────────────────────────────────────────────────────────────────
// Reads
// ─────────────────────────────────────────────────────────────────

const COLUMNS =
  "id, type, severity, title, body, target_url, target_id, scheduled_for, cancelled_at, read_at, created_at";

type RawRow = {
  id: string;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  body: string | null;
  target_url: string | null;
  target_id: string | null;
  scheduled_for: string;
  cancelled_at: string | null;
  read_at: string | null;
  created_at: string;
};

function mapRow(r: RawRow): AdminNotificationRow {
  return {
    id: r.id,
    type: r.type,
    severity: r.severity,
    title: r.title,
    body: r.body,
    targetUrl: r.target_url,
    targetId: r.target_id,
    scheduledFor: r.scheduled_for,
    cancelledAt: r.cancelled_at,
    readAt: r.read_at,
    createdAt: r.created_at,
  };
}

/**
 * The bell-icon query — active (scheduled_for <= now, not
 * cancelled) and unread, newest first.
 *
 * Sorted by scheduled_for DESC because reminders fire at their
 * scheduled time — the user expects the most recently-surfaced
 * notification at the top of the list, not the one that was
 * originally inserted first.
 */
export async function fetchActiveUnreadNotifications(
  limit = 20
): Promise<AdminNotificationRow[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("admin_notifications")
    .select(COLUMNS)
    .is("cancelled_at", null)
    .is("read_at", null)
    .lte("scheduled_for", new Date().toISOString())
    .order("scheduled_for", { ascending: false })
    .limit(limit)
    .returns<RawRow[]>();

  if (error) {
    throw new Error(
      `fetchActiveUnreadNotifications failed: ${error.message}`
    );
  }
  return (data ?? []).map(mapRow);
}
