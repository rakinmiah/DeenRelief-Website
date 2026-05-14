import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { logAdminAction } from "@/lib/admin-audit";
import {
  fetchAdminBazaarOrderById,
  markOrderFulfilled,
} from "@/lib/bazaar-db";
import { sendBazaarShippingNotification } from "@/lib/bazaar-shipping-email";
import { cancelNotifications } from "@/lib/admin-notifications";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/bazaar/orders/[id]/mark-shipped
 *
 * The single fulfilment action: admin enters a Royal Mail tracking
 * number + service tier on the order detail page and clicks "Mark
 * shipped & notify customer". This route:
 *
 *   1. Validates the order exists and is currently `paid`. If it's
 *      already `fulfilled` we return 409 — the admin should refresh
 *      to see the current state.
 *   2. Flips the row to `fulfilled` and stamps tracking_number +
 *      royal_mail_service + fulfilled_at via a single UPDATE guarded
 *      by .eq("status", "paid") (defence against the same admin
 *      clicking the button twice in two tabs).
 *   3. Fires the shipping notification email to the customer. If the
 *      email fails we DON'T undo the DB write — the order is shipped
 *      either way, and the admin can hit a future "Resend shipping
 *      email" button. We return a 200 with `emailSent: false` so the
 *      UI can surface the warning.
 *   4. Logs to admin_audit_log with the order id, tracking number,
 *      and service tier in the metadata jsonb.
 */
export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = requireAdminAuth(request);
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;

  // Parse + validate body
  let body: {
    trackingNumber?: string;
    royalMailService?: string;
    internalNotes?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const trackingNumber = (body.trackingNumber ?? "").trim();
  if (!trackingNumber) {
    return NextResponse.json(
      { error: "Tracking number is required." },
      { status: 400 }
    );
  }
  // Light validation. Royal Mail tracking numbers are typically
  // 13 chars (2 letters + 9 digits + 2 letters) but we don't want
  // to reject international or special-service formats — keep this
  // permissive and trust the admin who types it.
  if (trackingNumber.length < 6 || trackingNumber.length > 50) {
    return NextResponse.json(
      { error: "Tracking number looks wrong — please double-check." },
      { status: 400 }
    );
  }

  const serviceRaw = body.royalMailService;
  if (
    serviceRaw !== "tracked-48" &&
    serviceRaw !== "tracked-24" &&
    serviceRaw !== "special-delivery"
  ) {
    return NextResponse.json(
      { error: "Pick a Royal Mail service tier." },
      { status: 400 }
    );
  }

  // Verify the order exists and is in a state we can move from.
  const existing = await fetchAdminBazaarOrderById(id);
  if (!existing) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (existing.order.status !== "paid") {
    return NextResponse.json(
      {
        error: `Order is currently ${existing.order.status}; refresh the page to see the current state.`,
      },
      { status: 409 }
    );
  }

  const updated = await markOrderFulfilled({
    orderId: id,
    trackingNumber,
    royalMailService: serviceRaw,
    internalNotes: body.internalNotes,
  });

  if (!updated) {
    // The .eq("status","paid") guard rejected — someone else flipped
    // it between our fetch and our update.
    return NextResponse.json(
      {
        error:
          "Order changed state while you were on this page. Refresh and try again.",
      },
      { status: 409 }
    );
  }

  // Suppress the "still unfulfilled" reminders for this order
  // — it's now shipped, so any pending reminder is no longer
  // relevant. The webhook enqueues two rows of the same type
  // (12h heads-up + 24h escalation), so this single cancel
  // nukes both with a target_id + type match. Fire-and-forget:
  // a failed cancel just means an unfulfilled-reminder might
  // show up later as expected (worst case: trustee gets a
  // notification about an order they've already fulfilled,
  // which they can dismiss).
  await cancelNotifications({
    targetId: id,
    type: "bazaar_order_unfulfilled_reminder",
  });

  // Email is best-effort. We've already shipped the parcel in real
  // life by the time this is being clicked, so a DB-only update +
  // failed email is recoverable — admin can fix from a future
  // "Resend shipping email" button.
  const emailSent = await sendBazaarShippingNotification({ order: updated });

  await logAdminAction({
    action: "mark_bazaar_order_shipped",
    userEmail: auth.email,
    targetId: id,
    request,
    metadata: {
      trackingNumber,
      royalMailService: serviceRaw,
      emailSent,
    },
  });

  return NextResponse.json({
    ok: true,
    emailSent,
    order: {
      id: updated.id,
      status: updated.status,
      trackingNumber: updated.trackingNumber,
      royalMailService: updated.royalMailService,
      fulfilledAt: updated.fulfilledAt,
    },
  });
}
