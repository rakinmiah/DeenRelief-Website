import { NextResponse } from "next/server";
import {
  findProductById,
  resolveUnitPricePence,
} from "@/lib/bazaar-placeholder";
import type { CartLineItem } from "@/lib/bazaar-types";

const FREE_SHIPPING_THRESHOLD_PENCE = 7500;
const STANDARD_SHIPPING_PENCE = 399;

/**
 * POST /api/bazaar/checkout
 *
 * Creates a Stripe Checkout Session for the cart and returns the hosted
 * checkout URL. The browser then 303-redirects to Stripe.
 *
 * Mockup mode (current): returns a placeholder URL pointing at the
 * order-preview page so the client can walk through the post-purchase
 * UX in the pitch. No real charge.
 *
 * Production mode (post-launch): swap the body of this handler for the
 * commented-out Stripe call. The Stripe account, secret key, and
 * success/cancel URLs are the only env-side configuration changes
 * needed — the request and response shapes are identical.
 *
 * Inventory protection (production):
 *   - Server-side validates each line item's stock against the live
 *     Supabase row (NOT the client-side snapshot).
 *   - Server-side recomputes the unit price from Supabase to prevent
 *     a client tampering with the cart and paying less.
 *   - Reserves stock by decrementing on session creation with a 30-min
 *     timeout (release if not paid). Webhook flips reservation to
 *     committed on payment_intent.succeeded.
 */
export async function POST(req: Request) {
  let body: { items?: CartLineItem[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const items = body.items ?? [];
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  }

  // Reconcile against current placeholder catalog. In production this
  // becomes a Supabase query; the rest of the validation is the same.
  let subtotalPence = 0;
  for (const item of items) {
    const product = findProductById(item.productId);
    if (!product || !product.isActive) {
      return NextResponse.json(
        { error: `Product no longer available` },
        { status: 410 }
      );
    }
    const unitPrice = resolveUnitPricePence(product, item.variantId);
    subtotalPence += unitPrice * item.quantity;

    // Stock check
    const variant = product.variants.find((v) => v.id === item.variantId);
    const availableStock = variant
      ? variant.stockCount
      : product.stockCount;
    if (item.quantity > availableStock) {
      return NextResponse.json(
        {
          error: `Only ${availableStock} of "${product.name}" available`,
        },
        { status: 409 }
      );
    }
  }

  const shippingPence =
    subtotalPence >= FREE_SHIPPING_THRESHOLD_PENCE
      ? 0
      : STANDARD_SHIPPING_PENCE;
  const totalPence = subtotalPence + shippingPence;

  // ─────────────────────────────────────────────────────────────────
  // PRODUCTION: replace mock URL with real Stripe Checkout Session.
  //
  // import Stripe from "stripe";
  // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY_BAZAAR!);
  // const session = await stripe.checkout.sessions.create({
  //   mode: "payment",
  //   line_items: items.map((i) => {
  //     const p = findProductById(i.productId)!;
  //     return {
  //       price_data: {
  //         currency: "gbp",
  //         product_data: { name: p.name, metadata: { sku: p.sku } },
  //         unit_amount: resolveUnitPricePence(p, i.variantId),
  //       },
  //       quantity: i.quantity,
  //     };
  //   }),
  //   shipping_options: [
  //     { shipping_rate_data: { type: "fixed_amount",
  //       fixed_amount: { amount: shippingPence, currency: "gbp" },
  //       display_name: "Royal Mail Tracked 48",
  //       delivery_estimate: { minimum: { unit: "business_day", value: 2 },
  //                            maximum: { unit: "business_day", value: 4 } } } }
  //   ],
  //   shipping_address_collection: { allowed_countries: ["GB"] },
  //   success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/bazaar/order/{CHECKOUT_SESSION_ID}`,
  //   cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/bazaar/cart`,
  //   metadata: { source: "bazaar", item_count: String(items.length) },
  // });
  // return NextResponse.json({ url: session.url });
  // ─────────────────────────────────────────────────────────────────

  // Mockup: redirect to the post-purchase preview page so the client
  // can see the full post-checkout UX without a real Stripe account.
  return NextResponse.json({
    url: `/bazaar/order/preview?total=${totalPence}&items=${items.length}`,
  });
}
