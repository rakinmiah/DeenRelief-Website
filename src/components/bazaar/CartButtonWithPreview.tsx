"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useBazaarCart } from "./BazaarCartProvider";
import { formatPence } from "@/lib/bazaar-format";
import BazaarPlaceholderImage from "./BazaarPlaceholderImage";

/**
 * Cart button with hover-preview popover.
 *
 * Desktop UX:
 *   - Hovering over the cart pill opens a 320px-wide popover below it
 *     showing each line item (thumbnail, name, variant, qty, price),
 *     subtotal, and two CTAs: View cart / Checkout.
 *   - 150ms close delay on mouse-leave so users can travel to the
 *     popover itself without it slamming shut.
 *   - Clicking anywhere outside dismisses immediately.
 *
 * Mobile UX:
 *   - hover doesn't fire on touch devices — `onMouseEnter` is a no-op.
 *     Tapping the cart pill navigates straight to /bazaar/cart, which
 *     was the existing behaviour before this component existed.
 *
 * Accessibility:
 *   - The link itself remains a real <Link> so keyboard users tab to
 *     it and Enter activates navigation.
 *   - Popover has role="dialog" + aria-label so screen-reader users
 *     get context when it opens (though for sighted-keyboard users the
 *     popover is informational only — main interaction is still the
 *     link click).
 *   - Escape key closes the popover.
 *
 * Edge cases handled:
 *   - Cart empty → popover shows empty state with "Browse the
 *     collection" CTA instead of the line-items list.
 *   - Many items → max-height + overflow-y-auto on the items list.
 *   - Long product names → truncate with ellipsis.
 *   - SSR / hydration → suppress rendering until isHydrated true so we
 *     don't flash a "0 items" preview during the brief moment before
 *     localStorage cart state is loaded.
 */
export default function CartButtonWithPreview() {
  const { items, itemCount, subtotalPence, isHydrated } = useBazaarCart();
  const [isOpen, setIsOpen] = useState(false);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click-outside (catches taps on mobile and clicks on
  // desktop when the user clicks something outside the cart area).
  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Escape key closes the popover.
  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen]);

  function handleMouseEnter() {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setIsOpen(true);
  }

  function handleMouseLeave() {
    // Delay close so the user can travel from the cart pill to the
    // popover without flicker. 150ms is short enough to feel instant
    // on intentional moves away.
    closeTimeoutRef.current = setTimeout(() => setIsOpen(false), 150);
  }

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Link
        href="/bazaar/cart"
        className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium text-charcoal/80 hover:bg-charcoal/5 transition-colors"
        aria-label={`Cart, ${itemCount} item${itemCount === 1 ? "" : "s"}`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 3h1.386a1.125 1.125 0 0 1 1.097.852l.481 1.927M7.5 14.25a3 3 0 0 0-3 3h15.75M7.5 14.25h11.25l1.45-7.25H5.214M7.5 14.25 5.214 7"
          />
        </svg>
        <span>Cart</span>
        {isHydrated && itemCount > 0 && (
          <span className="bg-amber text-charcoal text-[11px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
            {itemCount}
          </span>
        )}
      </Link>

      {isOpen && isHydrated && (
        <div
          role="dialog"
          aria-label="Cart preview"
          className="absolute right-0 top-full mt-2 w-80 bg-white border border-charcoal/10 rounded-2xl shadow-lg overflow-hidden z-50"
        >
          {items.length === 0 ? (
            <EmptyPreview />
          ) : (
            <PopulatedPreview
              items={items}
              subtotalPence={subtotalPence}
              itemCount={itemCount}
            />
          )}
        </div>
      )}
    </div>
  );
}

function EmptyPreview() {
  return (
    <div className="p-5 text-center">
      <div className="text-charcoal font-heading font-semibold text-base mb-1">
        Your cart is empty
      </div>
      <p className="text-grey text-xs mb-4 leading-relaxed">
        Browse the collection to add pieces — every purchase pays the
        maker fairly.
      </p>
      <Link
        // Match the empty-cart page and the header Shop link —
        // anchor straight to the catalog grid, not the hero.
        href="/bazaar#catalog"
        className="inline-block w-full px-4 py-2 rounded-full bg-charcoal text-white text-sm font-medium hover:bg-charcoal/90 transition-colors"
      >
        Browse the collection
      </Link>
    </div>
  );
}

function PopulatedPreview({
  items,
  subtotalPence,
  itemCount,
}: {
  items: ReturnType<typeof useBazaarCart>["items"];
  subtotalPence: number;
  itemCount: number;
}) {
  return (
    <>
      {/* Header */}
      <div className="px-5 py-3 border-b border-charcoal/10 bg-cream">
        <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal/60">
          Your cart
        </div>
        <div className="text-sm text-charcoal/80 mt-0.5">
          {itemCount} item{itemCount === 1 ? "" : "s"}
        </div>
      </div>

      {/* Items list — scrollable when many items */}
      <ul className="max-h-72 overflow-y-auto divide-y divide-charcoal/8">
        {items.map((item) => {
          // The cart line now carries display snapshots set at
          // add-to-cart time — no catalog query needed here.
          const variantLabel = item.variantLabelSnapshot ?? null;
          const lineTotal = item.unitPricePenceSnapshot * item.quantity;
          const key = `${item.productId}::${item.variantId ?? ""}`;
          return (
            <li key={key} className="px-5 py-3 flex gap-3">
              <Link
                href={`/bazaar/${item.productSlugSnapshot}`}
                className="block w-12 h-15 flex-shrink-0 rounded-lg overflow-hidden bg-cream"
                style={{ height: "60px" }}
              >
                <BazaarPlaceholderImage
                  label={item.productNameSnapshot}
                  variant="product"
                  src={item.productImageSnapshot}
                  sizes="48px"
                />
              </Link>
              <div className="flex-1 min-w-0">
                <Link
                  href={`/bazaar/${item.productSlugSnapshot}`}
                  className="text-charcoal font-medium text-sm leading-tight block truncate hover:text-green transition-colors"
                >
                  {item.productNameSnapshot}
                </Link>
                <div className="text-charcoal/50 text-[11px] mt-0.5 truncate">
                  {variantLabel ? `${variantLabel} · ` : ""}
                  Qty {item.quantity}
                </div>
                <div className="text-charcoal text-sm font-medium mt-1">
                  {formatPence(lineTotal)}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Footer with subtotal + CTAs */}
      <div className="px-5 py-4 bg-cream border-t border-charcoal/10">
        <div className="flex justify-between items-baseline mb-3">
          <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal/60">
            Subtotal
          </span>
          <span className="text-charcoal font-heading font-semibold text-base">
            {formatPence(subtotalPence)}
          </span>
        </div>
        <div className="flex gap-2">
          <Link
            href="/bazaar/cart"
            className="flex-1 px-3 py-2 rounded-full text-center text-sm font-medium bg-white border border-charcoal/15 text-charcoal hover:bg-charcoal/5 transition-colors"
          >
            View cart
          </Link>
          <Link
            href="/bazaar/cart"
            className="flex-1 px-3 py-2 rounded-full text-center text-sm font-semibold bg-charcoal text-white hover:bg-charcoal/90 transition-colors"
          >
            Checkout →
          </Link>
        </div>
        <p className="text-[10px] text-charcoal/40 text-center mt-2 leading-relaxed">
          Free UK delivery over £75
        </p>
      </div>
    </>
  );
}
