import { NextResponse } from "next/server";

/**
 * POST /api/bazaar/webhook/stripe
 *
 * Stripe webhook handler for the Bazaar Stripe account (NOT the donations
 * Stripe account — separate accounts, separate webhook endpoints, separate
 * signing secrets).
 *
 * This is the skeleton — the real implementation handles three events:
 *
 * 1. checkout.session.completed
 *    → Read the line items from the session
 *    → Insert a row in `orders` table with status = "paid"
 *    → Insert N rows in `order_items` with snapshots of name + maker
 *    → Atomically decrement product/variant stock counts
 *    → Send order confirmation email via Resend
 *    → Fire GA4 `purchase` event server-side via Measurement Protocol
 *      (with `commerce: true` parameter to disambiguate from donation
 *      `purchase` events — same event name, different revenue stream).
 *
 * 2. payment_intent.succeeded (defensive — paranoid double-check)
 *    → Verify the order row exists for this payment_intent
 *    → If missing (rare race condition), recreate from PaymentIntent metadata
 *
 * 3. charge.refunded
 *    → Update order status to "refunded"
 *    → Restore stock count
 *    → Send refund-issued email
 *
 * Signature verification is mandatory — without it, anyone could POST
 * fake webhook events to mark random orders as paid.
 */
export async function POST(req: Request) {
  // ─────────────────────────────────────────────────────────────────
  // PRODUCTION:
  //
  // import Stripe from "stripe";
  // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY_BAZAAR!);
  // const sig = req.headers.get("stripe-signature");
  // if (!sig) return new NextResponse("Missing signature", { status: 400 });
  //
  // const rawBody = await req.text();
  // let event: Stripe.Event;
  // try {
  //   event = stripe.webhooks.constructEvent(
  //     rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET_BAZAAR!
  //   );
  // } catch (err) {
  //   return new NextResponse(`Webhook Error: ${err}`, { status: 400 });
  // }
  //
  // switch (event.type) {
  //   case "checkout.session.completed": {
  //     const session = event.data.object as Stripe.Checkout.Session;
  //     // 1. Get line items
  //     const lineItems = await stripe.checkout.sessions.listLineItems(
  //       session.id, { limit: 100, expand: ["data.price.product"] }
  //     );
  //     // 2. Insert order + order_items in a Supabase transaction
  //     // 3. Decrement stock atomically (use Supabase rpc or Postgres txn)
  //     // 4. Send order confirmation email
  //     // 5. Fire GA4 purchase event server-side via Measurement Protocol
  //     break;
  //   }
  //   case "charge.refunded": {
  //     // Update order status, restore stock, notify customer
  //     break;
  //   }
  // }
  //
  // return NextResponse.json({ received: true });
  // ─────────────────────────────────────────────────────────────────

  // Mockup: accept and ignore. This route exists so the URL can be
  // registered in the Stripe dashboard ahead of going live.
  return NextResponse.json({
    received: true,
    note: "Bazaar webhook handler is a skeleton. Real implementation pending the Stripe account being provisioned.",
  });
}
