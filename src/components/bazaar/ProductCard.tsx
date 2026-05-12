import Link from "next/link";
import type { Product } from "@/lib/bazaar-types";
import { formatPence } from "@/lib/bazaar-format";
import BazaarPlaceholderImage from "./BazaarPlaceholderImage";

/**
 * Catalog grid card. Mirrors the structure of CampaignsGrid card but with
 * commerce affordances: price, maker attribution, live stock indicator.
 *
 * Stock pill is always visible — three tonal variants:
 *   - Sold out     → "SOLD OUT" (charcoal, strongest visual weight)
 *   - Low stock    → "ONLY N LEFT" (amber, urgency cue)
 *   - In stock     → "N in stock" (white/cream, informational)
 *
 * Always-on stock reinforces the small-batch story — these are
 * hand-made items in low quantities, and visible scarcity is itself
 * a conversion driver as the inventory tightens.
 */
export default function ProductCard({ product }: { product: Product }) {
  const isSoldOut = product.stockCount === 0;
  const isLowStock =
    product.stockCount > 0 && product.stockCount <= product.lowStockThreshold;

  return (
    <Link
      href={`/bazaar/${product.slug}`}
      className="group flex flex-col bg-white rounded-2xl overflow-hidden shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-1"
    >
      {/* Image */}
      <div className="relative aspect-[4/5] overflow-hidden bg-cream">
        <BazaarPlaceholderImage
          label={product.name}
          variant="product"
          src={product.primaryImage}
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="transition-transform duration-300 group-hover:scale-105"
        />

        {/* Live stock pill — always rendered, style varies by state */}
        {isSoldOut ? (
          <span className="absolute top-3 left-3 text-[10px] font-bold tracking-wider uppercase bg-charcoal text-white px-3 py-1 rounded-full">
            Sold out
          </span>
        ) : isLowStock ? (
          // Word-spacing arbitrary value (0.15em) compensates for
          // the tighter look that `tracking-wider` + bold + uppercase
          // at 10px gives — at that size the within-word letter gap
          // creeps close to the between-word space, so the eye reads
          // "Only 2 left" as "Only 2left". Explicit word-spacing
          // restores a visible inter-word gap.
          <span className="absolute top-3 left-3 text-[10px] font-bold tracking-wider uppercase bg-amber text-charcoal px-3 py-1 rounded-full [word-spacing:0.15em]">
            Only{" "}{product.stockCount}{" "}left
          </span>
        ) : (
          <span
            className="absolute top-3 left-3 text-[10px] font-semibold tracking-[0.1em] uppercase bg-white/90 text-charcoal px-3 py-1 rounded-full backdrop-blur-sm border border-charcoal/10 [word-spacing:0.15em]"
            title={`${product.stockCount} of this piece available right now`}
          >
            {product.stockCount}{" "}in stock
          </span>
        )}

        <span className="absolute bottom-3 left-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-charcoal bg-amber px-2.5 py-1 rounded-full shadow-sm">
          {product.maker.region}, {product.maker.country}
        </span>
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1">
        <h3 className="font-heading font-semibold text-lg text-charcoal mb-1 group-hover:text-green transition-colors duration-200">
          {product.name}
        </h3>
        <p className="text-grey/80 text-sm leading-relaxed mb-3 flex-1">
          {product.tagline}
        </p>
        <div className="flex items-center justify-between mt-2">
          <span className="text-amber-dark font-heading font-semibold text-lg">
            {formatPence(product.pricePence)}
          </span>
          <span className="text-grey text-xs italic">
            Made by {product.maker.name}
          </span>
        </div>
      </div>
    </Link>
  );
}
