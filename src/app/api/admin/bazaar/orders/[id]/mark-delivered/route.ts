import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { logAdminAction } from "@/lib/admin-audit";
import { markOrderDelivered } from "@/lib/bazaar-db";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/bazaar/orders/[id]/mark-delivered
 *
 * Transition an order from `fulfilled` to `delivered`. Currently a
 * manual admin step — Royal Mail's tracking API would automate this
 * but at our volume the trustee can flip it by hand when Royal
 * Mail's tracking confirms delivery.
 *
 * No customer email fires on this transition; "delivered" is a
 * bookkeeping state, not a customer-facing milestone (Royal Mail
 * sends its own delivery confirmation).
 *
 * Guarded by .eq("status", "fulfilled") so it can't be replayed
 * once already delivered. A failed guard returns 409.
 */
export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = requireAdminAuth(request);
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const updated = await markOrderDelivered(id);

  if (!updated) {
    return NextResponse.json(
      {
        error:
          "Order is not in 'fulfilled' state — refresh the page to see its current state.",
      },
      { status: 409 }
    );
  }

  await logAdminAction({
    action: "mark_bazaar_order_delivered",
    userEmail: auth.email,
    targetId: id,
    request,
  });

  return NextResponse.json({ ok: true, status: updated.status });
}
