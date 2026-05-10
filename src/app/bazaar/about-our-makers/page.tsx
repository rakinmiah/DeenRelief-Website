import type { Metadata } from "next";
import Link from "next/link";
import BazaarPlaceholderImage from "@/components/bazaar/BazaarPlaceholderImage";
import { PLACEHOLDER_PRODUCTS } from "@/lib/bazaar-placeholder";

export const metadata: Metadata = {
  title: "Our Makers | Deen Relief Bazaar",
  description:
    "Meet the people who make every piece of Deen Relief Bazaar — by hand, in Sylhet, Adana, and Dhaka. Their names. Their stories. Their workshops.",
};

/**
 * The brand-story page. Distinct from the product pages because it tells
 * the story of *the makers themselves*, not the products. Donors arrive
 * here to understand who they're supporting before they buy — or after,
 * to send the page to friends.
 *
 * Structure:
 *   1. Hero — the thesis statement.
 *   2. Maker portraits — one block per maker/team. The key visual.
 *   3. The economic case — what changes for them, in plain numbers.
 *   4. The work — how products are made (process photo essay).
 *   5. CTA — back to the catalog.
 */
export default function AboutOurMakersPage() {
  // Deduplicate makers by name (some makers contribute to multiple SKUs).
  const uniqueMakers = Array.from(
    new Map(PLACEHOLDER_PRODUCTS.map((p) => [p.maker.name, p.maker])).values()
  );

  return (
    <>
      {/* ─── Hero ─── */}
      <section className="bg-cream py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-block text-[11px] font-bold tracking-[0.15em] uppercase text-amber-dark mb-4">
            Our Makers
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-heading font-bold text-charcoal leading-[1.15] tracking-[-0.02em] mb-5">
            The people whose hands made every piece
          </h1>
          <p className="text-grey text-base sm:text-lg leading-[1.7] max-w-2xl mx-auto">
            We don&apos;t hide our supply chain &mdash; it&apos;s the whole
            point. Every product in the Bazaar is made by someone we work
            with directly. Here&apos;s who they are.
          </p>
        </div>
      </section>

      {/* ─── Maker profiles ─── */}
      <section className="py-12 md:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16 md:space-y-24">
          {uniqueMakers.map((maker, i) => {
            const isEven = i % 2 === 0;
            return (
              <article
                key={maker.name}
                className="grid md:grid-cols-2 gap-8 md:gap-14 items-center"
              >
                <div
                  className={`relative aspect-[4/5] rounded-2xl overflow-hidden ${!isEven ? "md:order-2" : ""}`}
                >
                  <BazaarPlaceholderImage
                    label={maker.name}
                    variant="maker"
                  />
                  <span className="absolute bottom-4 left-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/85 bg-charcoal/70 backdrop-blur-sm px-3 py-1.5 rounded-full">
                    {maker.region}, {maker.country}
                  </span>
                </div>
                <div>
                  <span className="block text-[11px] font-bold tracking-[0.15em] uppercase text-amber-dark mb-3">
                    {maker.region}, {maker.country}
                  </span>
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-heading font-bold text-charcoal leading-tight mb-5">
                    {maker.name}
                  </h2>
                  <p className="text-grey text-base sm:text-[1.0625rem] leading-[1.7] mb-5">
                    {maker.story}
                  </p>
                  {maker.quote && (
                    <blockquote className="border-l-2 border-amber pl-4 text-charcoal/80 text-base italic leading-relaxed">
                      &ldquo;{maker.quote}&rdquo;
                    </blockquote>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* ─── The economic case ─── */}
      <section className="py-14 md:py-20 bg-cream">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <span className="inline-block text-[11px] font-bold tracking-[0.15em] uppercase text-amber-dark mb-3">
            What changes
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-heading font-bold text-charcoal leading-tight mb-7 max-w-2xl">
            What fair pay actually looks like
          </h2>
          <div className="grid sm:grid-cols-2 gap-6 md:gap-10">
            {[
              {
                stat: "3-4×",
                label: "Above commercial rates",
                body: "Every piece is paid at three to four times what the same work earns through commercial wholesalers in the region.",
              },
              {
                stat: "Up front",
                label: "Paid before the inventory ships",
                body: "Makers receive payment when production is complete, not when the products sell. We absorb the cash-flow risk, not them.",
              },
              {
                stat: "100%",
                label: "Profit gift-aided to the charity",
                body: "Whatever's left after maker pay, materials, freight, fulfilment and Stripe fees flows to Deen Relief's programme work.",
              },
              {
                stat: "Named",
                label: "On every parcel tag",
                body: "Each product carries a tag with the maker's first name and region. No anonymous attribution.",
              },
            ].map((item) => (
              <div key={item.label} className="bg-white rounded-2xl p-6 md:p-7">
                <p className="text-3xl md:text-4xl font-heading font-bold text-charcoal mb-2">
                  {item.stat}
                </p>
                <p className="text-charcoal text-sm font-semibold mb-2">
                  {item.label}
                </p>
                <p className="text-grey text-sm leading-[1.7]">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-12 md:py-16 bg-green-dark">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-heading font-bold text-white mb-4">
            Ready to support our makers?
          </h2>
          <p className="text-white/70 text-base mb-7">
            Six pieces in the collection, restocked slowly when each one
            sells out.
          </p>
          <Link
            href="/bazaar"
            className="inline-block px-7 py-3.5 rounded-full bg-amber text-charcoal font-semibold hover:bg-amber-dark transition-colors shadow-sm"
          >
            Browse the collection
          </Link>
        </div>
      </section>
    </>
  );
}
