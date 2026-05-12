import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchOrderByStripeSession } from "@/lib/bazaar-db";
import { bazaarReceiptNumber } from "@/lib/bazaar-order-email";
import { formatPence } from "@/lib/bazaar-format";
import { fromPence } from "@/lib/stripe";
import ClearCartOnMount from "@/components/bazaar/ClearCartOnMount";
import BazaarPurchaseAnalytics from "@/components/bazaar/BazaarPurchaseAnalytics";
import type { BazaarPurchaseItem } from "@/lib/analytics";

export const metadata: Metadata = {
  title: "Order received | Deen Relief Bazaar",
  // The robots: noindex from /bazaar/layout.tsx cascades — confirmation
  // pages are explicitly per-customer and must never appear in any
  // index (also covers post-launch when the rest of /bazaar/* is
  // indexable).
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * /bazaar/order/[sessionId] — post-purchase confirmation page.
 *
 * Reached via Stripe Checkout's success_url substitution. The
 * [sessionId] segment is the Stripe Checkout Session id
 * (cs_test_… or cs_live_…), which we use to look up the order row
 * promoted to `paid` by the webhook.
 *
 * Race window: Stripe redirects the customer back IMMEDIATELY on
 * successful payment, but the webhook may take a beat to land. We
 * handle three cases:
 *
 *   1. Order found and status="paid" — render the happy path with
 *      itemised summary + shipping ETA.
 *   2. Order found but still status="pending_payment" — render a
 *      "we're processing" interstitial that auto-refreshes. The page
 *      becomes the order page on next load.
 *   3. No row at all for that session id — show notFound(). This
 *      means either someone is poking at a forged URL or there's a
 *      catastrophic webhook miss; either way we don't want to
 *      pretend the order exists.
 *
 * Authorisation: we DON'T require a sign-in to view this page. The
 * session id is opaque (cs_…[random]) and only Stripe's success_url
 * redirect produces it for the customer. We do NOT show the full
 * shipping address or contact email here to prevent a casual URL
 * leak from revealing PII — the customer gets the email in their
 * inbox with the full detail (Phase 4 send), and the admin order
 * page shows the rest.
 */
export default async function BazaarOrderConfirmationPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  // Defensive: Stripe Checkout Session ids start with "cs_" — if
  // someone tries a forged path, fail fast.
  if (!sessionId.startsWith("cs_")) {
    notFound();
  }

  const result = await fetchOrderByStripeSession(sessionId);

  // No order row at all — either a stale link, a manual URL fiddle,
  // or a much worse race where the webhook never landed. We don't
  // want to imply success in any of those scenarios.
  if (!result) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20 text-center">
        <h1 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal mb-4 leading-tight">
          We&apos;re still processing your order
        </h1>
        <p className="text-grey text-base sm:text-lg leading-[1.7] mb-8 max-w-lg mx-auto">
          If you completed payment a moment ago, the confirmation
          will appear here in a few seconds. If you arrived here from
          an old email or bookmark, the order has likely been
          finalised already — your email receipt is the canonical
          record.
        </p>
        <p className="text-grey text-sm mb-8">
          <Link href="/bazaar" className="text-green underline">
            Return to the shop
          </Link>
        </p>
        {/* Auto-refresh once after 4s in case this is the narrow
            webhook-lag window. The user only sees one refresh, no
            polling loop. */}
        <meta httpEquiv="refresh" content="4" />
      </div>
    );
  }

  const { order, items } = result;

  // Pending order: webhook hasn't promoted yet. Don't clear the
  // cart — the customer might still want it back if something
  // went wrong. Auto-refresh until the row flips to paid.
  if (order.status === "pending_payment") {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20 text-center">
        <h1 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal mb-4 leading-tight">
          We&apos;re confirming your payment
        </h1>
        <p className="text-grey text-base sm:text-lg leading-[1.7] mb-8 max-w-lg mx-auto">
          This usually takes a few seconds. We&apos;ll refresh this
          page automatically.
        </p>
        <meta httpEquiv="refresh" content="3" />
      </div>
    );
  }

  // Happy path — order is paid (or further along in fulfilment).
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  // Build the GA4 enhanced-ecommerce items array. Each cart line
  // becomes one item with maker as brand, variant snapshot, and
  // unit price in GBP. item_id falls back to the product name
  // snapshot when the catalog isn't in the DB yet (the
  // product_id column is currently null on every row).
  const analyticsItems: BazaarPurchaseItem[] = items.map((item) => ({
    item_id: item.productId ?? item.productNameSnapshot,
    item_name: item.productNameSnapshot,
    item_category: "Bazaar",
    ...(item.makerNameSnapshot ? { item_brand: item.makerNameSnapshot } : {}),
    ...(item.variantSnapshot ? { item_variant: item.variantSnapshot } : {}),
    price: fromPence(item.unitPricePenceSnapshot),
    quantity: item.quantity,
  }));

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
      {/* Cart wipe — only on a successful order load. */}
      <ClearCartOnMount />

      {/* GA4 purchase event — fires once on mount, consent-gated. */}
      <BazaarPurchaseAnalytics
        transactionId={bazaarReceiptNumber(order.id)}
        valueGbp={fromPence(order.totalPence)}
        shippingGbp={fromPence(order.shippingPence)}
        contactEmail={order.contactEmail || null}
        items={analyticsItems}
      />

      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green/10 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-green"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        <span className="block text-[11px] font-bold tracking-[0.15em] uppercase text-green mb-3">
          Order received
        </span>
        <h1 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal mb-4 leading-tight">
          Thank you for supporting our makers
        </h1>
        <p className="text-grey text-base sm:text-lg leading-[1.7] mb-8 max-w-lg mx-auto">
          Your order has been received. We&apos;ll pack and ship
          within two working days, and email you a tracking number
          when it&apos;s on its way.
        </p>
      </div>

      <div className="bg-cream rounded-2xl p-6 md:p-7 mb-8 text-left">
        <h2 className="text-xs font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-4">
          Order summary
        </h2>

        {/* Itemised lines */}
        <ul className="divide-y divide-charcoal/10 mb-5">
          {items.map((item) => (
            <li key={item.id} className="flex justify-between py-3 text-sm">
              <div className="min-w-0 flex-1 pr-3">
                <p className="text-charcoal font-medium">
                  {item.productNameSnapshot}
                  {item.quantity > 1 ? ` × ${item.quantity}` : ""}
                </p>
                <p className="text-grey text-[12px] mt-0.5">
                  {item.variantSnapshot
                    ? `${item.variantSnapshot} · `
                    : ""}
                  Made by {item.makerNameSnapshot}
                </p>
              </div>
              <span className="text-charcoal font-medium whitespace-nowrap">
                {formatPence(
                  item.unitPricePenceSnapshot * item.quantity
                )}
              </span>
            </li>
          ))}
        </ul>

        {/* Totals */}
        <dl className="space-y-2 text-sm border-t border-charcoal/10 pt-4">
          <div className="flex justify-between">
            <dt className="text-grey">
              {itemCount} item{itemCount === 1 ? "" : "s"}
            </dt>
            <dd className="text-charcoal">
              {formatPence(order.subtotalPence)}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-grey">Shipping</dt>
            <dd className="text-charcoal">
              {order.shippingPence === 0
                ? "Free"
                : formatPence(order.shippingPence)}
            </dd>
          </div>
          <div className="flex justify-between pt-2 border-t border-charcoal/10 text-base">
            <dt className="text-charcoal font-heading font-semibold">
              Total paid
            </dt>
            <dd className="text-charcoal font-heading font-semibold">
              {formatPence(order.totalPence)}
            </dd>
          </div>
        </dl>

        <div className="mt-5 pt-5 border-t border-charcoal/10">
          <p className="text-[12px] text-grey leading-relaxed">
            A confirmation email is on its way. The packing slip in
            your parcel includes the maker&apos;s name and a short
            note from them.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          // Deep-link to #catalog so the just-purchased customer
          // lands on the products grid, not the hero — they've
          // already been sold on the brand, the next click is
          // about more browsing.
          href="/bazaar#catalog"
          className="px-7 py-3.5 rounded-full bg-charcoal text-white font-semibold hover:bg-charcoal/90 transition-colors shadow-sm text-center"
        >
          Continue shopping
        </Link>
        <Link
          href="/our-work"
          className="px-7 py-3.5 rounded-full bg-white border border-charcoal/15 text-charcoal font-semibold hover:bg-cream hover:border-charcoal/30 transition-colors text-center"
        >
          See our charity work
        </Link>
      </div>
    </div>
  );
}
