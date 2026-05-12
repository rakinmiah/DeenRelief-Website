import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { fetchActiveUnreadNotifications } from "@/lib/admin-notifications";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/notifications
 *
 * Returns the current set of active + unread admin notifications.
 * Drives the bell icon's dropdown and unread-count badge in the
 * AdminShell.
 *
 * "Active" means scheduled_for <= now() AND cancelled_at IS NULL.
 * "Unread" means read_at IS NULL.
 *
 * Sorted newest first, capped at 20 by default. The bell polls
 * this every 30s.
 *
 * No audit logging — read-only and very high-volume.
 */
export async function GET(request: Request) {
  const auth = requireAdminAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const rows = await fetchActiveUnreadNotifications(20);
    return NextResponse.json({ notifications: rows });
  } catch (err) {
    console.error("[admin-notifications] fetch failed:", err);
    return NextResponse.json(
      { notifications: [], error: "Notification fetch failed" },
      { status: 500 }
    );
  }
}
