import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  fetchActiveProducts,
  fetchProductBySlug,
} from "@/lib/bazaar-catalog";
import { formatPence } from "@/lib/bazaar-format";
import { fromPence } from "@/lib/stripe";
import BazaarPlaceholderImage from "@/components/bazaar/BazaarPlaceholderImage";
import MakerBlock from "@/components/bazaar/MakerBlock";
import AddToCartButton from "@/components/bazaar/AddToCartButton";
import BazaarViewItemAnalytics from "@/components/bazaar/BazaarViewItemAnalytics";
import BazaarFaqSection from "@/components/bazaar/BazaarFaqSection";
import BazaarPageOutro from "@/components/bazaar/BazaarPageOutro";
import { buildBazaarProductFaqs } from "@/lib/bazaar-faqs";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

// generateStaticParams removed — the catalog is now DB-backed and
// fully dynamic, so we'd be defeating the point by pre-rendering a
// fixed snapshot. force-dynamic keeps the SSR fresh per request.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: RouteParams): Promise<Metadata> {
  const { slug } = await params;
  const product = await fetchProductBySlug(slug);
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
 * Catalog is read from Supabase via the anon client (RLS-restricted
 * to active rows).
 */
export default async function ProductPage({ params }: RouteParams) {
  const { slug } = await params;
  const product = await fetchProductBySlug(slug);
  if (!product) notFound();

  // Cross-sell: three other active products. Fetched fresh per
  // request — cheap (one query) and survives catalog edits.
  const allActive = await fetchActiveProducts();
  const otherProducts = allActive.filter((p) => p.id !== product.id).slice(0, 3);

  return (
    <>
      {/* GA4 view_item event — fires once per product mount, consent-gated. */}
      <BazaarViewItemAnalytics
        item={{
          item_id: product.id,
          item_name: product.name,
          item_category: "Bazaar",
          item_brand: product.maker.name,
          price: fromPence(product.pricePence),
          quantity: 1,
        }}
      />

      {/* The cream breadcrumb strip that used to sit here was
          removed — it read as a second nav row underneath the
          bazaar header and added visual noise without doing much
          work. The bazaar header's "Shop" link already gives
          back-to-catalog access. If we want breadcrumbs for SEO
          later, add a BreadcrumbList JSON-LD block (no visual
          UI needed) so Google picks them up without re-cluttering
          the page chrome. */}

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
                  src={product.primaryImage}
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  priority
                />
              </div>
              {product.galleryImages.length > 1 && (
                <div className="grid grid-cols-3 gap-3">
                  {product.galleryImages.slice(0, 3).map((galleryUrl, i) => (
                    <div
                      key={i}
                      className="relative aspect-square rounded-xl overflow-hidden bg-cream"
                    >
                      <BazaarPlaceholderImage
                        label={`${product.name} — view ${i + 1}`}
                        variant="product"
                        src={galleryUrl}
                        sizes="(min-width: 1024px) 16vw, 33vw"
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

              {/* Find your size — only for clothing categories with
                  size-driven variants. Deep-links into the sizing
                  guide pre-selected to this garment type so the
                  recommender opens on the right chart. */}
              {(product.category === "abaya" ||
                product.category === "thobe") && (
                <div className="mt-4">
                  <Link
                    href={`/bazaar/sizing-guide?garment=${product.category}`}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-charcoal hover:text-green transition-colors group"
                  >
                    <svg
                      className="w-4 h-4 text-amber-dark"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 6h18M3 12h18M3 18h18"
                      />
                    </svg>
                    Find your size with our 60-second recommender
                    <svg
                      className="w-3.5 h-3.5 text-charcoal/40 group-hover:text-charcoal/70 transition-colors"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                      />
                    </svg>
                  </Link>
                </div>
              )}

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

              {/* Materials & care — collapsed by default so the
                  trust micro-bar below sits within the buyer's
                  immediate scroll area. Implemented with native
                  HTML <details>/<summary> rather than a React
                  accordion so the whole page stays server-
                  rendered, screen-reader semantics come for free,
                  and Google still sees the content in the source
                  for SEO. The default disclosure triangle is
                  hidden in both Chromium (::marker) and Safari
                  (::-webkit-details-marker); a custom chevron
                  inside the summary rotates 180° when the
                  details is open via Tailwind's group-open
                  variant. */}
              <div className="mt-7 border-t border-charcoal/10">
                <details className="group border-b border-charcoal/10">
                  <summary className="flex items-center justify-between py-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                    <h3 className="text-xs font-bold uppercase tracking-[0.1em] text-charcoal/60">
                      Materials
                    </h3>
                    <svg
                      className="w-4 h-4 text-charcoal/40 transition-transform duration-200 group-open:rotate-180"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m19.5 8.25-7.5 7.5-7.5-7.5"
                      />
                    </svg>
                  </summary>
                  <p className="text-grey text-sm leading-relaxed pb-4">
                    {product.materials}
                  </p>
                </details>
                {/* Care gets its own border-b too so the two
                    accordion rows feel like equal-sized boxes
                    (without it, Care visually bleeds into the
                    mt-7 whitespace below and feels taller than
                    Materials). The trust micro-bar below drops
                    its border-t in exchange to avoid doubling. */}
                <details className="group border-b border-charcoal/10">
                  <summary className="flex items-center justify-between py-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                    <h3 className="text-xs font-bold uppercase tracking-[0.1em] text-charcoal/60">
                      Care
                    </h3>
                    <svg
                      className="w-4 h-4 text-charcoal/40 transition-transform duration-200 group-open:rotate-180"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m19.5 8.25-7.5 7.5-7.5-7.5"
                      />
                    </svg>
                  </summary>
                  <ul className="text-grey text-sm leading-relaxed space-y-1 pb-4">
                    {product.careInstructions.map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                </details>
              </div>

              {/* Sizing — full guide + recommender lives at
                  /bazaar/sizing-guide, reached via the "Find your
                  size" link above the description. The per-product
                  sizingGuide HTML on bazaar_products.sizing_guide_html
                  is now used by the admin only as an internal note
                  (or for the rare product with bespoke sizing
                  quirks — render here in future if needed). */}

              {/* Trust micro-bar — relies on Care's border-b
                  above as its top boundary, so no border-t here
                  (would otherwise double the line). */}
              <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-grey">
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
                  <BazaarPlaceholderImage
                    label={p.name}
                    variant="product"
                    src={p.primaryImage}
                    sizes="(min-width: 1024px) 25vw, 50vw"
                  />
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

      {/* Product-specific FAQs — sizing, shrinkage, restock,
          shipping, returns. Section renders nothing on rare
          products with no applicable questions. */}
      <BazaarFaqSection
        faqs={buildBazaarProductFaqs(product)}
        page="product"
      />
      <BazaarPageOutro />
    </>
  );
}
