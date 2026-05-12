import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { logAdminAction } from "@/lib/admin-audit";
import { fetchAdminBazaarOrderById } from "@/lib/bazaar-db";
import { sendBazaarShippingNotification } from "@/lib/bazaar-shipping-email";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/bazaar/orders/[id]/resend-shipping-email
 *
 * Re-fires the original shipping notification email for an order
 * that's already been shipped (status='fulfilled' or 'delivered').
 *
 * Trustees use this when a customer reports they didn't receive the
 * tracking email (spam folder, mistyped email at checkout, Resend
 * outage when the original was sent).
 *
 * Validation:
 *   - Order must exist
 *   - Status must be 'fulfilled' or 'delivered' (only orders with
 *     tracking numbers can have shipping emails)
 *   - tracking_number and royal_mail_service must be populated
 *
 * Idempotency: Resend will deliver every time. If the trustee
 * double-clicks, two emails arrive — UI disables the button
 * during the request to mitigate.
 */
export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = requireAdminAuth(request);
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const result = await fetchAdminBazaarOrderById(id);
  if (!result) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const { order } = result;
  if (order.status !== "fulfilled" && order.status !== "delivered") {
    return NextResponse.json(
      {
        error: `Cannot resend shipping email for an order with status '${order.status}'.`,
      },
      { status: 400 }
    );
  }
  if (!order.trackingNumber || !order.royalMailService) {
    return NextResponse.json(
      { error: "Order is missing tracking number or service — cannot send." },
      { status: 400 }
    );
  }

  const ok = await sendBazaarShippingNotification({ order });

  if (!ok) {
    return NextResponse.json(
      {
        error:
          "Resend rejected the email. Check server logs and the Resend dashboard.",
      },
      { status: 502 }
    );
  }

  await logAdminAction({
    action: "resend_bazaar_shipping_email",
    userEmail: auth.email,
    targetId: id,
    request,
    metadata: { sentTo: order.contactEmail, trackingNumber: order.trackingNumber },
  });

  return NextResponse.json({
    ok: true,
    sentTo: order.contactEmail,
  });
}
