import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { markAllNotificationsRead } from "@/lib/admin-notifications";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/notifications/read-all
 *
 * Marks every currently-active and unread notification as read.
 * Triggered by the bell dropdown's "Mark all read" footer button.
 *
 * Future-scheduled notifications (scheduled_for > now) are NOT
 * touched — they're not visible to the trustee yet, so marking
 * them "read" would suppress their future appearance.
 */
export async function POST(request: Request) {
  const auth = requireAdminAuth(request);
  if (!auth.ok) return auth.response;

  try {
    await markAllNotificationsRead();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin-notifications] markAllRead failed:", err);
    return NextResponse.json(
      { error: "Mark-all-read failed" },
      { status: 500 }
    );
  }
}
