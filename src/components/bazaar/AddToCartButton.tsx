"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Product } from "@/lib/bazaar-types";
import { useBazaarCart } from "./BazaarCartProvider";

/**
 * The add-to-cart control on the product detail page.
 *
 * Handles three states:
 *   1. Variant selection (when the product has variants like sizes)
 *   2. Stock validation (disabled / soft-warning if requested qty > stock)
 *   3. Post-add feedback (transient "Added to cart" before reverting)
 *
 * On successful add we offer two actions: "Continue shopping" (stay on
 * the page, swap button to "Added") and "View cart" (navigate to /cart).
 * No automatic redirect — donors hate having their reading interrupted.
 */
export default function AddToCartButton({ product }: { product: Product }) {
  const { addItem } = useBazaarCart();
  const router = useRouter();

  const hasVariants = product.variants.length > 0;
  const [selectedVariantId, setSelectedVariantId] = useState<string>(
    hasVariants ? product.variants[0].id : ""
  );
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

  const selectedVariant = product.variants.find(
    (v) => v.id === selectedVariantId
  );
  const effectiveStock = selectedVariant
    ? selectedVariant.stockCount
    : product.stockCount;
  const isSoldOut = effectiveStock === 0;

  function handleAdd() {
    addItem(product.id, hasVariants ? selectedVariantId : undefined, quantity);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 2200);
  }

  function handleAddAndCheckout() {
    addItem(product.id, hasVariants ? selectedVariantId : undefined, quantity);
    router.push("/bazaar/cart");
  }

  return (
    <div className="space-y-5">
      {/* Variant picker */}
      {hasVariants && (
        <div>
          <label className="block text-xs font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-2">
            {product.variants[0].size !== undefined ? "Size" : "Colour"}
          </label>
          <div className="flex flex-wrap gap-2">
            {product.variants.map((v) => {
              const label = v.size ?? v.colour ?? v.sku;
              const isSelected = v.id === selectedVariantId;
              const variantSoldOut = v.stockCount === 0;
              return (
                <button
                  key={v.id}
                  type="button"
                  disabled={variantSoldOut}
                  onClick={() => setSelectedVariantId(v.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                    variantSoldOut
                      ? "opacity-40 cursor-not-allowed border-charcoal/15 text-charcoal/40 line-through"
                      : isSelected
                      ? "bg-charcoal text-white border-charcoal"
                      : "bg-white border-charcoal/15 text-charcoal hover:border-charcoal/40"
                  }`}
                  aria-pressed={isSelected}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Quantity selector */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-2">
          Quantity
        </label>
        <div className="inline-flex items-center bg-white border border-charcoal/15 rounded-full">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="w-10 h-10 flex items-center justify-center text-charcoal hover:bg-charcoal/5 rounded-l-full"
            aria-label="Decrease quantity"
          >
            −
          </button>
          <span className="w-10 text-center text-charcoal font-medium">
            {quantity}
          </span>
          <button
            type="button"
            onClick={() =>
              setQuantity((q) => Math.min(effectiveStock, q + 1))
            }
            disabled={quantity >= effectiveStock}
            className="w-10 h-10 flex items-center justify-center text-charcoal hover:bg-charcoal/5 rounded-r-full disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
      </div>

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={handleAdd}
          disabled={isSoldOut}
          className={`flex-1 px-6 py-3.5 rounded-full font-semibold transition-colors ${
            isSoldOut
              ? "bg-charcoal/15 text-charcoal/40 cursor-not-allowed"
              : justAdded
              ? "bg-green text-white"
              : "bg-charcoal text-white hover:bg-charcoal/90"
          }`}
        >
          {isSoldOut
            ? "Sold out"
            : justAdded
            ? "✓ Added to cart"
            : "Add to cart"}
        </button>
        <button
          type="button"
          onClick={handleAddAndCheckout}
          disabled={isSoldOut}
          className="flex-1 px-6 py-3.5 rounded-full font-semibold bg-amber text-charcoal hover:bg-amber-dark transition-colors disabled:bg-charcoal/15 disabled:text-charcoal/40 disabled:cursor-not-allowed shadow-sm"
        >
          Buy now
        </button>
      </div>

      {/* Stock indicator under the CTAs */}
      {!isSoldOut && effectiveStock <= product.lowStockThreshold && (
        <p className="text-sm text-amber-dark font-medium">
          Only {effectiveStock} left in stock — these are made by hand and
          we restock slowly.
        </p>
      )}
    </div>
  );
}
