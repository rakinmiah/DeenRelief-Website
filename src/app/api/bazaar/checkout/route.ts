import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { isBazaarLive } from "@/lib/bazaar-flag";
import {
  attachStripeSessionId,
  createPendingOrder,
  type PendingOrderItem,
} from "@/lib/bazaar-db";
import {
  fetchProductsByIds,
  holdStockForOrder,
  releaseExpiredStockHolds,
  resolveUnitPricePence,
} from "@/lib/bazaar-catalog";
import {
  BAZAAR_STRIPE_METADATA_KEY,
  BAZAAR_STRIPE_METADATA_VALUE,
} from "@/lib/bazaar-config";
import type { CartLineItem } from "@/lib/bazaar-types";
import type { Product } from "@/lib/bazaar-types";

export const dynamic = "force-dynamic";

/**
 * Shipping rates exposed at Stripe Checkout. Mirrors the prose on
 * /bazaar/shipping. The customer picks one of the two; what they pick
 * is reflected back in the checkout.session.completed webhook payload
 * and the bazaar_orders.shipping_pence column gets overwritten with
 * the actual chosen amount.
 *
 * Free over the £75 threshold: implemented by suppressing the
 * standard rate and exposing only a £0 rate when the cart subtotal
 * crosses the line. Stripe doesn't support conditional shipping rates
 * natively, so we build the list at session-creation time.
 */
const FREE_SHIPPING_THRESHOLD_PENCE = 7500;
const TRACKED_48_PENCE = 399;
const TRACKED_24_PENCE = 499;
// When the order qualifies for free shipping, Tracked 48 drops
// to £0 — but customers should still be able to upgrade to
// Tracked 24 for just the price difference (~£1) rather than
// the full £4.99 they'd pay if shipping wasn't free.
const TRACKED_24_FREE_SHIP_UPGRADE_PENCE =
  TRACKED_24_PENCE - TRACKED_48_PENCE;

/**
 * POST /api/bazaar/checkout
 *
 * The end-to-end path:
 *   1. Browser POSTs the localStorage cart as { items: CartLineItem[] }.
 *   2. We validate every line against the live catalog — refuse on
 *      missing/inactive products (410), insufficient stock (409),
 *      or unit-price drift since add-to-cart (409, per Phase 2
 *      decision: surprise charges generate chargebacks).
 *   3. We write a pending bazaar_orders row + bazaar_order_items rows
 *      to Supabase, capturing the cart's intent under one order_id.
 *   4. We create a Stripe Checkout Session with:
 *      - line_items built from the validated cart
 *      - shipping_options for Tracked 48 (default) and Tracked 24
 *        (upgrade), with the £75-free threshold collapsing them to
 *        a single £0 rate
 *      - shipping_address_collection: GB only
 *      - metadata.source = "bazaar" — the SEPARATION pivot. The
 *        existing /api/stripe/webhook reads this to route the event
 *        to the bazaar handler instead of the donation handler.
 *        Donations never set this key.
 *      - metadata.order_id = the bazaar_orders.id we just wrote, so
 *        the webhook can promote THIS exact row.
 *      - success_url with {CHECKOUT_SESSION_ID} substitution so the
 *        order confirmation page can look up the order by session id.
 *      - cancel_url back to the cart so the customer doesn't lose
 *        their place.
 *   5. We return the Stripe-hosted session URL; the cart client
 *      does window.location.href = url.
 *
 * If the order row writes but the Stripe call fails (network,
 * rate-limit, key rotation), the pending row is harmless — it will
 * never receive a checkout.session.completed event because no Stripe
 * session was ever created. A daily cleanup script could prune rows
 * older than a few hours in pending_payment status. Not built yet —
 * for current volume the cruft is invisible.
 */
export async function POST(req: Request) {
  // Defense-in-depth: the /bazaar layout already returns 404 when
  // the feature flag is off, so customers can't reach the cart UI
  // to trigger this endpoint. But a direct POST from a script /
  // bookmarked dev tool would still bypass the layout. Match the
  // layout's behaviour by 404-ing the API too.
  if (!isBazaarLive()) {
    return new NextResponse("Not found", { status: 404 });
  }

  // ─── Parse & validate request body ─────────────────────────────
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

  // ─── Opportunistic cleanup of expired stock holds ──────────────
  // Releases any abandoned pre-checkout reservations from earlier
  // sessions before we validate stock for this new attempt. The
  // function is race-safe (FOR UPDATE SKIP LOCKED) so it never
  // blocks behind an in-flight webhook on the same row. Fire-and-
  // forget: a no-op cleanup means stale holds linger a few more
  // seconds, not operationally critical.
  await releaseExpiredStockHolds();

  // ─── Reconcile against catalog ────────────────────────────────
  //
  // Bulk-fetch every distinct product referenced in the cart in
  // ONE round-trip rather than one query per line. Then for every
  // line: (a) does the product still exist and is it active,
  // (b) is the stock count high enough, (c) does the snapshot
  // price still match the current catalog price.
  const distinctProductIds = [...new Set(items.map((i) => i.productId))];
  let catalogProducts: Product[];
  try {
    catalogProducts = await fetchProductsByIds(distinctProductIds);
  } catch (err) {
    console.error("[bazaar/checkout] catalog fetch failed:", err);
    return NextResponse.json(
      { error: "Could not start checkout. Please try again in a moment." },
      { status: 500 }
    );
  }
  const productById = new Map(catalogProducts.map((p) => [p.id, p]));

  let subtotalPence = 0;
  const pendingItems: PendingOrderItem[] = [];
  for (const item of items) {
    const product = productById.get(item.productId);
    if (!product || !product.isActive) {
      return NextResponse.json(
        { error: "One of your items is no longer available." },
        { status: 410 }
      );
    }

    const variant = item.variantId
      ? product.variants.find((v) => v.id === item.variantId)
      : undefined;
    if (item.variantId && !variant) {
      return NextResponse.json(
        { error: `The variant you chose for ${product.name} is no longer available.` },
        { status: 410 }
      );
    }

    const currentUnitPrice = resolveUnitPricePence(product, item.variantId);
    if (currentUnitPrice !== item.unitPricePenceSnapshot) {
      return NextResponse.json(
        {
          error: `The price of "${product.name}" has changed since you added it. Please review your cart and try again.`,
        },
        { status: 409 }
      );
    }

    const availableStock = variant ? variant.stockCount : product.stockCount;
    if (item.quantity > availableStock) {
      return NextResponse.json(
        {
          error: `Only ${availableStock} of "${product.name}" available.`,
        },
        { status: 409 }
      );
    }

    subtotalPence += currentUnitPrice * item.quantity;

    // Collect the enriched line for createPendingOrder. We're past
    // the validation gate so every field here is from the live
    // catalog and safe to persist as the order's snapshot.
    const variantLabel = variant
      ? [variant.size, variant.colour].filter(Boolean).join(" · ") || undefined
      : undefined;
    pendingItems.push({
      productId: product.id,
      ...(item.variantId ? { variantId: item.variantId } : {}),
      quantity: item.quantity,
      unitPricePence: currentUnitPrice,
      productName: product.name,
      ...(variantLabel ? { variantLabel } : {}),
      makerName: product.maker.name,
    });
  }

  // ─── Compute shipping at session-creation time ────────────────
  //
  // Provisional figure for the bazaar_orders row. The customer may
  // pick the Tracked 24 upgrade at the Stripe checkout page; the
  // webhook overwrites this column with the actual chosen rate.
  const qualifiesFreeShipping = subtotalPence >= FREE_SHIPPING_THRESHOLD_PENCE;
  const provisionalShippingPence = qualifiesFreeShipping ? 0 : TRACKED_48_PENCE;
  const provisionalTotalPence = subtotalPence + provisionalShippingPence;

  // ─── Insert pending order row ─────────────────────────────────
  let orderId: string;
  const livemode = (process.env.STRIPE_SECRET_KEY ?? "").startsWith("sk_live_");
  try {
    orderId = await createPendingOrder({
      items: pendingItems,
      subtotalPence,
      shippingPence: provisionalShippingPence,
      totalPence: provisionalTotalPence,
      livemode,
    });
  } catch (err) {
    console.error("[bazaar/checkout] createPendingOrder failed:", err);
    return NextResponse.json(
      { error: "Could not start checkout. Please try again in a moment." },
      { status: 500 }
    );
  }

  // ─── Reserve stock atomically (15-minute hold) ────────────────
  //
  // The pre-payment race window: between the catalog-side stock
  // check above and Stripe completing the customer's payment,
  // another customer could buy the same last-in-stock piece. The
  // atomic Postgres function below decrements each item's
  // stock_count with a `WHERE stock_count >= quantity` guard and
  // raises if any line falls short — so simultaneous checkouts
  // are serialised and at most one customer wins.
  //
  // The webhook (checkout.session.completed) does NOT re-decrement
  // when stock_held_until was set — it just clears the hold and
  // marks paid. Stock is debited exactly once.
  //
  // If the customer abandons (closes the Stripe tab, etc.), the
  // opportunistic cleanup above (releaseExpiredStockHolds) on the
  // NEXT customer's checkout will restock and mark the order
  // 'abandoned'.
  try {
    await holdStockForOrder(orderId, 15);
  } catch (err) {
    // The Postgres function raises 'insufficient_stock' when any
    // line can't be reserved. The catalog-side check above caught
    // most cases; this catches the actual race.
    const message = err instanceof Error ? err.message : String(err);
    console.error("[bazaar/checkout] hold failed:", message);
    const isStockProblem = message.includes("insufficient_stock");
    return NextResponse.json(
      {
        error: isStockProblem
          ? "One of your items just sold out — your cart needs a refresh."
          : "Could not start checkout. Please try again in a moment.",
      },
      { status: isStockProblem ? 409 : 500 }
    );
  }

  // ─── Create Stripe Checkout Session ────────────────────────────
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ??
    "https://deenrelief.org"; // last-resort fallback so misconfig doesn't 500

  // Build line items from the validated cart. TypeScript infers the
  // shape against stripe.checkout.sessions.create's parameter type at
  // the call site below — we don't pin it explicitly because the
  // dahlia SDK's Checkout namespace export shape moves between minor
  // versions, and inference keeps this routine version-resilient.
  const lineItems = items.map((i) => {
    // We've already verified every cart line above, so productById
    // is guaranteed to have an entry here. The non-null assertion
    // is safe.
    const product = productById.get(i.productId)!;
    const variant = i.variantId
      ? product.variants.find((v) => v.id === i.variantId)
      : undefined;
    const variantLabel = variant
      ? [variant.size, variant.colour].filter(Boolean).join(" · ")
      : "";
    return {
      price_data: {
        currency: "gbp",
        product_data: {
          name: variantLabel ? `${product.name} (${variantLabel})` : product.name,
          // SKU on the line shows in Stripe Dashboard's line-item
          // detail and on the receipt Stripe emails, which makes
          // accountant reconciliation cleaner.
          metadata: { sku: variant?.sku ?? product.sku },
        },
        unit_amount: resolveUnitPricePence(product, i.variantId),
      },
      quantity: i.quantity,
    };
  });

  // Shipping options. Above the free-shipping threshold we surface
  // ONE free rate so the customer doesn't see a £3.99 line they
  // could have avoided. Below it we surface the standard Tracked 48
  // and an upgrade to Tracked 24.
  // The type/unit fields need to be literal strings ("fixed_amount",
  // "business_day") to satisfy the Stripe SDK's ShippingOption shape.
  // We use a small helper to build each rate so the casts are
  // localised rather than scattered.
  type BizDayUnit = "business_day";
  function rate(
    amount: number,
    displayName: string,
    minDays: number,
    maxDays: number
  ) {
    return {
      shipping_rate_data: {
        type: "fixed_amount" as const,
        fixed_amount: { amount, currency: "gbp" },
        display_name: displayName,
        delivery_estimate: {
          minimum: { unit: "business_day" as BizDayUnit, value: minDays },
          maximum: { unit: "business_day" as BizDayUnit, value: maxDays },
        },
      },
    };
  }

  // Above the free-shipping threshold we still surface both
  // services, but Tracked 48 is free and Tracked 24 is priced at
  // just the upgrade differential (~£1) — customers who care about
  // 1–2 day delivery shouldn't lose that option just because they
  // qualified for the free-shipping benefit. Below the threshold,
  // both services are charged at their full rates.
  const shippingOptions = qualifiesFreeShipping
    ? [
        rate(0, "Free UK delivery — Royal Mail Tracked 48", 2, 4),
        rate(
          TRACKED_24_FREE_SHIP_UPGRADE_PENCE,
          "Royal Mail Tracked 24 (£1 upgrade)",
          1,
          2
        ),
      ]
    : [
        rate(TRACKED_48_PENCE, "Royal Mail Tracked 48", 2, 4),
        rate(TRACKED_24_PENCE, "Royal Mail Tracked 24", 1, 2),
      ];

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      shipping_options: shippingOptions,
      shipping_address_collection: { allowed_countries: ["GB"] },
      // Phone optional — we want it for delivery comms but won't
      // make it mandatory. Stripe's billing_address_collection
      // defaults to auto which is fine for GB.
      phone_number_collection: { enabled: true },
      success_url: `${baseUrl}/bazaar/order/{CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/bazaar/cart`,
      metadata: {
        [BAZAAR_STRIPE_METADATA_KEY]: BAZAAR_STRIPE_METADATA_VALUE,
        order_id: orderId,
        item_count: String(items.reduce((s, i) => s + i.quantity, 0)),
      },
      payment_intent_data: {
        // Mirror the same metadata onto the underlying PaymentIntent
        // so a Stripe Dashboard search by PI also surfaces the
        // bazaar tag, and so charge.refunded events (which carry the
        // PI ref) can be routed without joining back to the session.
        metadata: {
          [BAZAAR_STRIPE_METADATA_KEY]: BAZAAR_STRIPE_METADATA_VALUE,
          order_id: orderId,
        },
      },
    });

    if (!session.url) {
      throw new Error("Stripe returned a session with no url");
    }

    // Stamp the session id onto the pending order so the confirmation
    // page can find it by URL segment alone, even before the
    // checkout.session.completed webhook lands. If this fails we
    // still return the Stripe URL — the customer's payment flow
    // shouldn't be blocked by our own bookkeeping; the webhook can
    // patch the row when it arrives.
    try {
      await attachStripeSessionId({
        orderId,
        stripeSessionId: session.id,
      });
    } catch (err) {
      console.error("[bazaar/checkout] attachStripeSessionId failed:", err);
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[bazaar/checkout] Stripe session create failed:", err);
    // The pending bazaar_orders row will be pruned by the future
    // cleanup job. Leaving it doesn't affect reporting because all
    // money / reconciliation queries filter on status = 'paid'.
    return NextResponse.json(
      { error: "Could not start checkout. Please try again in a moment." },
      { status: 500 }
    );
  }
}
