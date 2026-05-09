"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useBazaarCart } from "@/components/bazaar/BazaarCartProvider";

/**
 * Mockup post-purchase confirmation page.
 *
 * In production this lives at /bazaar/order/[stripeSessionId] and reads
 * the order from Supabase using the session ID. The mockup version reads
 * from URL search params so the client can preview the layout in the
 * pitch demo.
 *
 * Side effect: clears the cart on mount, so the back-button doesn't show
 * stale items. Same behavior as the real version.
 */
export default function PreviewClient() {
  const params = useSearchParams();
  const total = Number(params.get("total") ?? "0");
  const itemCount = Number(params.get("items") ?? "1");
  const { clearCart } = useBazaarCart();

  useEffect(() => {
    clearCart();
  }, [clearCart]);

  const formattedTotal = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(total / 100);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20 text-center">
      {/* Pitch-mode banner */}
      <div className="mb-10 inline-block px-4 py-2 rounded-full bg-amber-light border border-amber/30 text-amber-dark text-[11px] font-bold uppercase tracking-[0.15em]">
        Pitch preview — no real charge
      </div>

      <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green/10 flex items-center justify-center">
        <svg
          className="w-8 h-8 text-green"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <span className="block text-[11px] font-bold tracking-[0.15em] uppercase text-green mb-3">
        Order received
      </span>
      <h1 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal mb-4 leading-tight">
        Thank you for supporting our makers
      </h1>
      <p className="text-grey text-base sm:text-lg leading-[1.7] mb-8 max-w-lg mx-auto">
        Your order has been received and your makers have been paid for
        their work. We&apos;ll pack and ship within two working days,
        and email you a tracking number when it&apos;s on its way.
      </p>

      <div className="bg-cream rounded-2xl p-6 md:p-7 mb-8 text-left">
        <h2 className="text-xs font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-4">
          Order summary
        </h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-grey">Order number</dt>
            <dd className="text-charcoal font-mono">DR-BZR-XXXXXXXX</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-grey">Items</dt>
            <dd className="text-charcoal">
              {itemCount} item{itemCount === 1 ? "" : "s"}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-grey">Total paid</dt>
            <dd className="text-charcoal font-semibold">{formattedTotal}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-grey">Delivery</dt>
            <dd className="text-charcoal">Royal Mail Tracked 48 (2-4 days)</dd>
          </div>
        </dl>
        <div className="mt-5 pt-5 border-t border-charcoal/10">
          <p className="text-[12px] text-grey leading-relaxed">
            A confirmation email is on its way. The packing slip in your
            parcel includes the maker&apos;s name and a short note from
            them.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href="/bazaar"
          className="px-7 py-3.5 rounded-full bg-charcoal text-white font-semibold hover:bg-charcoal/90 transition-colors shadow-sm"
        >
          Continue shopping
        </Link>
        <Link
          href="/our-work"
          className="px-7 py-3.5 rounded-full bg-white border border-charcoal/15 text-charcoal font-semibold hover:bg-cream hover:border-charcoal/30 transition-colors"
        >
          See our charity work
        </Link>
      </div>
    </div>
  );
}
