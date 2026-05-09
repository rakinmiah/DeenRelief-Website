import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  PLACEHOLDER_PRODUCTS,
  findProductBySlug,
} from "@/lib/bazaar-placeholder";
import { formatPence } from "@/lib/bazaar-format";
import BazaarPlaceholderImage from "@/components/bazaar/BazaarPlaceholderImage";
import MakerBlock from "@/components/bazaar/MakerBlock";
import AddToCartButton from "@/components/bazaar/AddToCartButton";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return PLACEHOLDER_PRODUCTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: RouteParams): Promise<Metadata> {
  const { slug } = await params;
  const product = findProductBySlug(slug);
  if (!product) return { title: "Not found | Deen Relief Bazaar" };
  return {
    title: `${product.name} | Deen Relief Bazaar`,
    description: product.tagline,
  };
}

/**
 * Product detail page.
 *
 * Layout strategy:
 *   1. Gallery + price/CTA card on first paint (above the fold) — the
 *      donor needs to see what they're buying and how much it costs
 *      before the story.
 *   2. Maker block — full-width, deliberately bold. This is the moat.
 *   3. Materials, sizing, care — practical information donors need to
 *      decide. Not hidden behind tabs (donors hate clicking to read).
 *   4. Cross-sell — three other products from the same maker or category.
 *   5. Trust bar.
 *
 * SEO: prerendered statically (generateStaticParams + no dynamic data
 * outside placeholder fixtures).
 */
export default async function ProductPage({ params }: RouteParams) {
  const { slug } = await params;
  const product = findProductBySlug(slug);
  if (!product) notFound();

  const otherProducts = PLACEHOLDER_PRODUCTS.filter(
    (p) => p.id !== product.id
  ).slice(0, 3);

  return (
    <>
      {/* Breadcrumb */}
      <div className="bg-cream">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <nav className="text-xs text-charcoal/60" aria-label="Breadcrumb">
            <Link href="/bazaar" className="hover:text-charcoal transition-colors">
              Bazaar
            </Link>
            <span className="mx-2 text-charcoal/30">/</span>
            <span className="text-charcoal/80">{product.name}</span>
          </nav>
        </div>
      </div>

      {/* ─── Above-the-fold: gallery + buy card ─── */}
      <section className="py-10 md:py-14 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-14">
            {/* Gallery */}
            <div className="space-y-4">
              <div className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-cream">
                <BazaarPlaceholderImage
                  label={product.name}
                  variant="product"
                />
              </div>
              {product.galleryImages.length > 1 && (
                <div className="grid grid-cols-3 gap-3">
                  {product.galleryImages.slice(0, 3).map((_, i) => (
                    <div
                      key={i}
                      className="relative aspect-square rounded-xl overflow-hidden bg-cream"
                    >
                      <BazaarPlaceholderImage
                        label={`${product.name} — view ${i + 1}`}
                        variant="product"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Buy card */}
            <div className="lg:pt-2">
              <span className="inline-block text-[11px] font-bold tracking-[0.15em] uppercase text-amber-dark mb-3">
                {product.maker.region}, {product.maker.country}
              </span>
              <h1 className="text-3xl md:text-4xl lg:text-[2.5rem] font-heading font-bold text-charcoal leading-tight mb-3">
                {product.name}
              </h1>
              <p className="text-grey text-lg leading-relaxed mb-6">
                {product.tagline}
              </p>
              <p className="text-charcoal text-3xl font-heading font-semibold mb-7">
                {formatPence(product.pricePence)}
              </p>

              <AddToCartButton product={product} />

              {/* Description */}
              <div className="mt-9 pt-7 border-t border-charcoal/10 prose prose-sm max-w-none">
                <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-3">
                  About this piece
                </h2>
                {product.description.split("\n\n").map((para, i) => (
                  <p key={i} className="text-grey leading-[1.7] mb-3">
                    {para}
                  </p>
                ))}
              </div>

              {/* Materials & care */}
              <div className="mt-7 grid sm:grid-cols-2 gap-5">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-2">
                    Materials
                  </h3>
                  <p className="text-grey text-sm leading-relaxed">
                    {product.materials}
                  </p>
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-2">
                    Care
                  </h3>
                  <ul className="text-grey text-sm leading-relaxed space-y-1">
                    {product.careInstructions.map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Sizing guide */}
              {product.sizingGuide && (
                <details className="mt-6 border-t border-charcoal/10 pt-5">
                  <summary className="cursor-pointer text-sm font-semibold text-charcoal hover:text-green transition-colors">
                    Sizing guide
                  </summary>
                  <div
                    className="mt-3 prose prose-sm max-w-none text-grey [&_strong]:text-charcoal"
                    dangerouslySetInnerHTML={{ __html: product.sizingGuide }}
                  />
                </details>
              )}

              {/* Trust micro-bar */}
              <div className="mt-7 pt-5 border-t border-charcoal/10 flex flex-wrap gap-x-5 gap-y-2 text-xs text-grey">
                <span className="inline-flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-green" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.707-9.293a1 1 0 0 0-1.414-1.414L9 10.586 7.707 9.293a1 1 0 0 0-1.414 1.414l2 2a1 1 0 0 0 1.414 0l4-4Z" clipRule="evenodd" />
                  </svg>
                  Free UK delivery over £75
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-green" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.707-9.293a1 1 0 0 0-1.414-1.414L9 10.586 7.707 9.293a1 1 0 0 0-1.414 1.414l2 2a1 1 0 0 0 1.414 0l4-4Z" clipRule="evenodd" />
                  </svg>
                  14-day returns
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-green" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.707-9.293a1 1 0 0 0-1.414-1.414L9 10.586 7.707 9.293a1 1 0 0 0-1.414 1.414l2 2a1 1 0 0 0 1.414 0l4-4Z" clipRule="evenodd" />
                  </svg>
                  Profits to Deen Relief
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Maker block (the moat) ─── */}
      <section className="py-12 md:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <MakerBlock maker={product.maker} />
        </div>
      </section>

      {/* ─── Cross-sell ─── */}
      <section className="py-14 md:py-20 bg-cream">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-heading font-bold text-charcoal mb-8">
            Other pieces from the collection
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {otherProducts.map((p) => (
              <Link
                key={p.id}
                href={`/bazaar/${p.slug}`}
                className="group flex flex-col bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200"
              >
                <div className="relative aspect-[4/5]">
                  <BazaarPlaceholderImage label={p.name} variant="product" />
                </div>
                <div className="p-4">
                  <h3 className="font-heading font-semibold text-base text-charcoal group-hover:text-green transition-colors">
                    {p.name}
                  </h3>
                  <p className="text-grey/80 text-xs mt-1 mb-2 line-clamp-2">
                    {p.tagline}
                  </p>
                  <span className="text-charcoal font-heading font-semibold text-sm">
                    {formatPence(p.pricePence)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
