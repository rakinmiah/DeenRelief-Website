import { NextResponse } from "next/server";
import { fetchOrderByStripeSession } from "@/lib/bazaar-db";
import { createInquiry } from "@/lib/bazaar-inquiries";
import { enqueueNotification } from "@/lib/admin-notifications";
import { bazaarReceiptNumber } from "@/lib/bazaar-order-email";
import { isBazaarLive } from "@/lib/bazaar-flag";

/**
 * Customer-facing "Request a return" endpoint.
 *
 * Called from the `/bazaar/order/[sessionId]` confirmation page
 * when the customer expands the return form and hits Send. Spins
 * up a new inquiry in the bazaar inbox with the order pre-linked
 * so trustees handle the request through the same UI they use for
 * every other customer query.
 *
 * Security: we trust the `sessionId` in the body only insofar as
 * we look up the order by it and use the order's own contact
 * email + shipping name on the inquiry — nothing the customer
 * submits goes into the inquiry header. The inquiry body holds
 * the reason + note they typed; the rest is system-generated.
 *
 * Status guard: returns only make sense on paid / fulfilled /
 * delivered orders. Pending/refunded/cancelled orders bounce
 * here — the contact form is the right surface for those.
 */
export async function POST(req: Request) {
  // Match the /bazaar layout gate — direct POSTs that bypass the
  // confirmation page UI get 404'd while the flag is off.
  if (!isBazaarLive()) {
    return new NextResponse("Not found", { status: 404 });
  }

  let payload: {
    sessionId?: string;
    reason?: string;
    note?: string;
  };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Couldn't parse the request body." },
      { status: 400 }
    );
  }

  const { sessionId, reason, note } = payload;
  if (!sessionId || typeof sessionId !== "string") {
    return NextResponse.json(
      { error: "Missing order reference." },
      { status: 400 }
    );
  }
  if (!reason || typeof reason !== "string" || !reason.trim()) {
    return NextResponse.json(
      { error: "Pick a reason for the return." },
      { status: 400 }
    );
  }

  let detail;
  try {
    detail = await fetchOrderByStripeSession(sessionId);
  } catch (err) {
    console.error("[return-request] order lookup failed:", err);
    return NextResponse.json(
      { error: "Couldn't look up the order. Please email info@deenrelief.org." },
      { status: 500 }
    );
  }

  if (!detail) {
    return NextResponse.json(
      { error: "Order not found." },
      { status: 404 }
    );
  }

  const { order } = detail;

  // Status guard: returns are only meaningful for orders that
  // have actually been paid for and (probably) received. Pending
  // = card hasn't cleared yet, refunded/cancelled = nothing to
  // return. Direct those to the contact form instead.
  const okStatuses = new Set(["paid", "fulfilled", "delivered"]);
  if (!okStatuses.has(order.status)) {
    return NextResponse.json(
      {
        error:
          "This order isn't eligible for a return request yet. Email info@deenrelief.org if you need help.",
      },
      { status: 409 }
    );
  }

  if (!order.contactEmail) {
    return NextResponse.json(
      { error: "No customer email on file for this order." },
      { status: 400 }
    );
  }

  const receiptNum = bazaarReceiptNumber(order.id);
  const customerName = order.shippingAddress?.name ?? "Customer";
  const trimmedNote = (note ?? "").trim();

  // Inquiry body — combine the structured reason with the
  // optional free-text note so the trustee sees both in one
  // message in the chat log.
  const initialMessage = trimmedNote
    ? `Reason: ${reason}\n\n${trimmedNote}`
    : `Reason: ${reason}`;

  try {
    const created = await createInquiry({
      customerName,
      customerEmail: order.contactEmail,
      subject: "Returns & refunds",
      initialMessage,
      orderNumberRaw: receiptNum,
      orderId: order.id,
    });
    if (!created) {
      throw new Error("Couldn't create the inquiry row.");
    }

    await enqueueNotification({
      type: "bazaar_inquiry_new",
      severity: "warning",
      title: `Return requested — ${receiptNum}`,
      body: `${customerName} · ${reason}`,
      targetUrl: `/admin/bazaar/inquiries/${created.inquiry.id}`,
      targetId: created.inquiry.id,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[return-request] inquiry creation failed:", err);
    return NextResponse.json(
      {
        error:
          "Couldn't submit the request. Please email info@deenrelief.org and we'll help.",
      },
      { status: 500 }
    );
  }
}
