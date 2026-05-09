"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  formatPence,
  useBazaarCart,
} from "@/components/bazaar/BazaarCartProvider";
import BazaarPlaceholderImage from "@/components/bazaar/BazaarPlaceholderImage";
import { findProductById } from "@/lib/bazaar-placeholder";

const FREE_SHIPPING_THRESHOLD_PENCE = 7500;
const STANDARD_SHIPPING_PENCE = 399;

/**
 * Cart page UI.
 *
 * Shipping rules:
 *   - £3.99 flat rate (Royal Mail Tracked 48) for any order under £75
 *   - Free shipping for orders £75 and above
 *
 * The progress bar to free shipping is a known AOV nudge — donors who
 * are £8 short will frequently add a hijab to clear it. Worth A/B
 * testing post-launch.
 *
 * The "Buy now" handoff posts to /api/bazaar/checkout, which (post-launch)
 * creates a Stripe Checkout Session and 303-redirects the browser.
 * Pre-launch, the route returns a placeholder URL pointing to
 * /bazaar/order/preview so the client can see the post-purchase page in
 * the pitch demo.
 */
export default function CartPageClient() {
  const {
    items,
    updateQuantity,
    removeItem,
    subtotalPence,
    isHydrated,
    clearCart,
  } = useBazaarCart();
  const router = useRouter();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const qualifiesForFreeShipping =
    subtotalPence >= FREE_SHIPPING_THRESHOLD_PENCE;
  const shippingPence = qualifiesForFreeShipping ? 0 : STANDARD_SHIPPING_PENCE;
  const totalPence = subtotalPence + shippingPence;
  const remainingForFreeShipping =
    FREE_SHIPPING_THRESHOLD_PENCE - subtotalPence;

  async function handleCheckout() {
    setIsCheckingOut(true);
    setCheckoutError(null);
    try {
      const res = await fetch("/api/bazaar/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Checkout failed");
      }
      const { url } = (await res.json()) as { url: string };
      // In production this is a Stripe Checkout URL. In the mockup it's
      // /bazaar/order/preview (full client-side redirect either way).
      window.location.href = url;
    } catch (err) {
      setCheckoutError(
        err instanceof Error ? err.message : "Something went wrong"
      );
      setIsCheckingOut(false);
    }
  }

  if (!isHydrated) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="h-6 w-32 bg-charcoal/10 rounded animate-pulse" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h1 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal mb-4">
          Your cart is empty
        </h1>
        <p className="text-grey text-base sm:text-lg leading-relaxed mb-8 max-w-md mx-auto">
          Start with a piece from the collection &mdash; everything is made
          by hand, in small batches, by people we work with directly.
        </p>
        <Link
          href="/bazaar"
          className="inline-block px-7 py-3.5 rounded-full bg-charcoal text-white font-semibold hover:bg-charcoal/90 transition-colors shadow-sm"
        >
          Browse the collection
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
      <h1 className="text-3xl md:text-4xl font-heading font-bold text-charcoal mb-2">
        Your cart
      </h1>
      <p className="text-grey text-sm mb-10">
        {items.reduce((s, i) => s + i.quantity, 0)} item
        {items.reduce((s, i) => s + i.quantity, 0) === 1 ? "" : "s"}
      </p>

      <div className="grid lg:grid-cols-[1fr_360px] gap-10 lg:gap-14">
        {/* Line items */}
        <div className="space-y-5">
          {items.map((item) => {
            const product = findProductById(item.productId);
            if (!product) return null;
            const variant = product.variants.find(
              (v) => v.id === item.variantId
            );
            const variantLabel = variant
              ? variant.size ?? variant.colour ?? variant.sku
              : null;
            const lineTotal = item.unitPricePenceSnapshot * item.quantity;
            return (
              <div
                key={`${item.productId}::${item.variantId ?? ""}`}
                className="flex gap-4 sm:gap-5 bg-white border border-charcoal/8 rounded-2xl p-4 sm:p-5"
              >
                <div className="relative w-24 sm:w-32 aspect-[4/5] flex-shrink-0 rounded-xl overflow-hidden bg-cream">
                  <BazaarPlaceholderImage
                    label={product.name}
                    variant="product"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/bazaar/${product.slug}`}
                        className="font-heading font-semibold text-base sm:text-lg text-charcoal hover:text-green transition-colors leading-tight block truncate"
                      >
                        {product.name}
                      </Link>
                      <p className="text-grey text-xs sm:text-sm mt-1">
                        {variantLabel ? `${variantLabel} · ` : ""}Made by{" "}
                        {product.maker.name}
                      </p>
                    </div>
                    <span className="text-charcoal font-heading font-semibold text-base flex-shrink-0">
                      {formatPence(lineTotal)}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 mt-4">
                    <div className="inline-flex items-center bg-cream border border-charcoal/10 rounded-full">
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(
                            item.productId,
                            item.variantId,
                            item.quantity - 1
                          )
                        }
                        className="w-8 h-8 flex items-center justify-center text-charcoal hover:bg-charcoal/5 rounded-l-full"
                        aria-label="Decrease quantity"
                      >
                        −
                      </button>
                      <span className="w-8 text-center text-charcoal text-sm font-medium">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(
                            item.productId,
                            item.variantId,
                            item.quantity + 1
                          )
                        }
                        className="w-8 h-8 flex items-center justify-center text-charcoal hover:bg-charcoal/5 rounded-r-full"
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.productId, item.variantId)}
                      className="text-grey hover:text-charcoal text-xs underline transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          <button
            type="button"
            onClick={() => {
              if (confirm("Empty your cart?")) clearCart();
            }}
            className="text-grey hover:text-charcoal text-xs underline transition-colors"
          >
            Empty cart
          </button>
        </div>

        {/* Order summary */}
        <aside className="bg-cream rounded-2xl p-6 lg:p-7 h-fit lg:sticky lg:top-32">
          <h2 className="text-xs font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-5">
            Order summary
          </h2>

          {/* Free shipping nudge */}
          {!qualifiesForFreeShipping && (
            <div className="mb-5 p-4 bg-white rounded-xl">
              <p className="text-xs text-charcoal mb-2">
                Add{" "}
                <strong>{formatPence(remainingForFreeShipping)}</strong>{" "}
                more for free UK delivery
              </p>
              <div className="h-1.5 bg-cream rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, (subtotalPence / FREE_SHIPPING_THRESHOLD_PENCE) * 100)}%`,
                  }}
                />
              </div>
            </div>
          )}

          <dl className="space-y-2.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-grey">Subtotal</dt>
              <dd className="text-charcoal font-medium">
                {formatPence(subtotalPence)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-grey">
                Shipping
                <span className="block text-[11px] text-grey/70">
                  Royal Mail Tracked 48
                </span>
              </dt>
              <dd className="text-charcoal font-medium">
                {qualifiesForFreeShipping ? (
                  <span className="text-green">Free</span>
                ) : (
                  formatPence(shippingPence)
                )}
              </dd>
            </div>
          </dl>

          <div className="my-5 border-t border-charcoal/10" />

          <div className="flex justify-between items-baseline mb-6">
            <span className="text-charcoal font-heading font-semibold text-base">
              Total
            </span>
            <span className="text-charcoal font-heading font-semibold text-2xl">
              {formatPence(totalPence)}
            </span>
          </div>

          {checkoutError && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
              {checkoutError}
            </p>
          )}

          <button
            type="button"
            onClick={handleCheckout}
            disabled={isCheckingOut}
            className="w-full px-6 py-3.5 rounded-full bg-charcoal text-white font-semibold hover:bg-charcoal/90 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-wait"
          >
            {isCheckingOut ? "Redirecting…" : "Checkout securely"}
          </button>

          <p className="text-[11px] text-grey/80 text-center mt-3 leading-relaxed">
            Payment by Stripe. UK delivery only.
            <br />
            14-day returns if it&apos;s not right.
          </p>

          <button
            type="button"
            onClick={() => router.push("/bazaar")}
            className="w-full mt-4 text-charcoal/70 hover:text-charcoal text-sm font-medium transition-colors"
          >
            ← Continue shopping
          </button>
        </aside>
      </div>
    </div>
  );
}
