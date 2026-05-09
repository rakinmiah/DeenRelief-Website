import Link from "next/link";
import type { Product } from "@/lib/bazaar-types";
import { formatPence } from "@/lib/bazaar-format";
import BazaarPlaceholderImage from "./BazaarPlaceholderImage";

/**
 * Catalog grid card. Mirrors the structure of CampaignsGrid card but with
 * commerce affordances: price, maker attribution, low-stock indicator.
 */
export default function ProductCard({ product }: { product: Product }) {
  const isLowStock =
    product.stockCount > 0 && product.stockCount <= product.lowStockThreshold;
  const isSoldOut = product.stockCount === 0;

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
          className="transition-transform duration-300 group-hover:scale-105"
        />
        {isSoldOut && (
          <span className="absolute top-3 left-3 text-[10px] font-bold tracking-wider uppercase bg-charcoal text-white px-3 py-1 rounded-full">
            Sold out
          </span>
        )}
        {!isSoldOut && isLowStock && (
          <span className="absolute top-3 left-3 text-[10px] font-bold tracking-wider uppercase bg-amber text-charcoal px-3 py-1 rounded-full">
            Only {product.stockCount} left
          </span>
        )}
        <span className="absolute bottom-3 left-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/85 bg-charcoal/65 backdrop-blur-sm px-2.5 py-1 rounded-full">
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
          <span className="text-charcoal font-heading font-semibold text-lg">
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
