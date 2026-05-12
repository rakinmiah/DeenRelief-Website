import type { Metadata } from "next";
import Link from "next/link";
import ProductCard from "@/components/bazaar/ProductCard";
import BazaarPlaceholderImage from "@/components/bazaar/BazaarPlaceholderImage";
import ProcessSteps from "@/components/ProcessSteps";
import BazaarFaqSection from "@/components/bazaar/BazaarFaqSection";
import BazaarPageOutro from "@/components/bazaar/BazaarPageOutro";
import { fetchActiveProducts } from "@/lib/bazaar-catalog";
import { BAZAAR_LANDING_FAQS } from "@/lib/bazaar-faqs";

export const metadata: Metadata = {
  title: "Deen Relief Bazaar — Goods made by hand, with dignity",
  description:
    "A small collection of Islamic clothing and goods, hand-made by people in Bangladesh and Turkey we work with directly. Every purchase pays the maker fairly and funds our charity work.",
};

// Catalog is dynamic — admin edits should reflect immediately. We
// trade a tiny bit of SSR speed for an always-fresh public catalog.
// A 60-second `revalidate` could be added later if traffic warrants.
export const dynamic = "force-dynamic";

/**
 * Bazaar catalog landing.
 *
 * Three-act structure:
 *   1. Hero — establishes the brand premise (commerce as charity, not the
 *      reverse) before the donor sees a single product.
 *   2. The Promise — three-up trust strip: who made it, where it came
 *      from, what happens to the profit.
 *   3. Catalog — 6 products in a 3-up grid (2-up on tablet, 1-up on
 *      mobile). Story-led copy under each: maker's name, region.
 *
 * The order matters. We don't show products first and contextualise
 * after — the context IS the product. A donor-customer who buys without
 * understanding the supply chain isn't paying premium for premium's sake.
 */
export default async function BazaarPage() {
  const products = await fetchActiveProducts();
  return (
    <>
      {/* ─── Hero ─── */}
      <section className="relative bg-cream py-16 md:py-24 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(circle at 30% 20%, #1A1A2E 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
        </div>
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-block text-[11px] font-bold tracking-[0.15em] uppercase text-amber-dark mb-4">
            Deen Relief Bazaar
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem] font-heading font-bold text-charcoal leading-[1.15] tracking-[-0.02em] mb-5 max-w-3xl mx-auto">
            Goods made by hand,
            <br />
            <span className="italic font-medium">with dignity.</span>
          </h1>
          <p className="text-grey text-base sm:text-lg leading-[1.7] max-w-2xl mx-auto mb-8">
            Six pieces, made by people we work with directly in Sylhet
            and Adana. Every purchase pays the maker fairly &mdash; and
            the profits beyond that fund our charity work in the same
            communities.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a
              href="#catalog"
              className="px-7 py-3.5 rounded-full bg-amber text-charcoal font-semibold hover:bg-amber-dark hover:text-white transition-colors shadow-sm"
            >
              Shop the collection
            </a>
            <Link
              href="/bazaar/about-our-makers"
              className="px-7 py-3.5 rounded-full bg-white border border-charcoal/15 text-charcoal font-semibold hover:bg-cream hover:border-charcoal/30 transition-colors"
            >
              Meet our makers
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Featured maker preview (tease the story page) ─── */}
      <section className="py-14 md:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8 md:gap-14 items-center">
            <div className="relative aspect-[4/5] md:aspect-[5/6] rounded-2xl overflow-hidden">
              <BazaarPlaceholderImage
                label="Khadija R. — Sylhet"
                variant="maker"
              />
            </div>
            <div>
              <span className="inline-block text-[11px] font-bold tracking-[0.15em] uppercase text-amber-dark mb-3">
                A maker&apos;s story
              </span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-heading font-bold text-charcoal leading-tight mb-5">
                &ldquo;I sew them like I sew for my own family.&rdquo;
              </h2>
              <p className="text-grey text-base sm:text-lg leading-[1.7] mb-6">
                Khadija lives with her three children in a two-room flat
                in Sylhet. She earns four times what she did before, doing
                the work she&apos;s done for over a decade — but now with
                her name on every piece. Her daughter is back in school.
              </p>
              <Link
                href="/bazaar/about-our-makers"
                className="inline-flex items-center gap-2 text-charcoal font-semibold hover:text-green transition-colors"
              >
                Read the full story
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                  />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Catalog grid ─── */}
      <section id="catalog" className="py-16 md:py-24 bg-cream scroll-mt-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10 max-w-2xl">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-heading font-bold text-charcoal leading-tight mb-3">
              The collection
            </h2>
            <p className="text-grey text-base sm:text-[1.0625rem] leading-[1.7]">
              Six pieces, restocked slowly. When something sells out,
              we wait until the makers have made the next batch — we
              don&apos;t outsource demand spikes to anonymous factories.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* ─── The Promise ─── */}
      {/* Moved below the catalog so the page leads with product +
          maker story (the moat) and uses the commitments strip as the
          closing reassurance before the trust bar. Same structure as
          /zakat's "Trusted Zakat Charity" strip — centered intro
          followed by the shared ProcessSteps animation. */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="inline-block text-[11px] font-bold tracking-[0.15em] uppercase text-amber-dark mb-3">
              Our Commitments
            </span>
            <h2 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal leading-tight mb-3">
              Three promises behind every piece
            </h2>
            <p className="text-grey text-base sm:text-[1.0625rem] leading-[1.7]">
              When you buy from the Bazaar, here&apos;s what you&apos;re
              paying for &mdash; and what we promise our makers.
            </p>
          </div>

          <ProcessSteps
            steps={[
              {
                n: "01",
                title: "Made by named people",
                body: "Every product carries a tag with the maker's name and where they live. No anonymous factories, no opaque supply chains — just real people, doing skilled work.",
              },
              {
                n: "02",
                title: "Fair pay, paid up front",
                body: "Makers are paid for each piece at three to four times the regional commercial rate. We pay before the inventory ships, not after it sells.",
              },
              {
                n: "03",
                title: "Profit funds our charity work",
                body: "What's left after maker pay, materials, freight and fulfilment is gift-aided into Deen Relief's charity programmes — orphan sponsorship, cancer care, emergency relief.",
              },
            ]}
            className="max-w-4xl mx-auto"
          />
        </div>
      </section>

      <BazaarFaqSection
        faqs={BAZAAR_LANDING_FAQS}
        page="landing"
        heading="Questions about the Bazaar"
      />
      <BazaarPageOutro />
    </>
  );
}
