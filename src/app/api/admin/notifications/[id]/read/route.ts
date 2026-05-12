import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { markNotificationRead } from "@/lib/admin-notifications";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/notifications/[id]/read
 *
 * Marks a single notification read. Called by the bell dropdown
 * when an admin clicks a notification row (which then navigates
 * to the targetUrl).
 *
 * Idempotent: marking an already-read row is a no-op.
 */
export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = requireAdminAuth(request);
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  try {
    await markNotificationRead(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(
      `[admin-notifications] markRead failed for ${id}:`,
      err
    );
    return NextResponse.json(
      { error: "Mark-read failed" },
      { status: 500 }
    );
  }
}
