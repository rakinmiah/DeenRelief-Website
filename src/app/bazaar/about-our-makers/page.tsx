import type { Metadata } from "next";
import Link from "next/link";
import BazaarPlaceholderImage from "@/components/bazaar/BazaarPlaceholderImage";
import BazaarFaqSection from "@/components/bazaar/BazaarFaqSection";
import BazaarPageOutro from "@/components/bazaar/BazaarPageOutro";
import { fetchActiveMakers } from "@/lib/bazaar-catalog";
import { BAZAAR_MAKERS_FAQS } from "@/lib/bazaar-faqs";

export const metadata: Metadata = {
  title: "Our Makers | Deen Relief Bazaar",
  description:
    "Meet the people who make every piece of Deen Relief Bazaar — by hand, in Sylhet, Adana, and Dhaka. Their names. Their stories. Their workshops.",
};

export const dynamic = "force-dynamic";

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
export default async function AboutOurMakersPage() {
  // Already deduped at the DB level — one row per maker. Sorted
  // country → region so the page reads geographically.
  const uniqueMakers = await fetchActiveMakers();

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
      {/* Each profile is its own <section> so the page background
          can alternate band-by-band. The hero is cream, so the
          first maker reads as white, the next as cream, etc — the
          whole page now alternates strictly per section. The image
          / text column flip every other maker stays orthogonal to
          the background flip so the visual rhythm doesn't compound. */}
      {uniqueMakers.map((maker, i) => {
        const imageRightSide = i % 2 === 0; // image on left for evens
        const bgClass = i % 2 === 0 ? "bg-white" : "bg-cream";
        return (
          <section
            key={maker.name}
            className={`${bgClass} py-12 md:py-16`}
          >
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
              <article className="grid md:grid-cols-2 gap-8 md:gap-14 items-center">
                <div
                  className={`relative aspect-[4/5] rounded-2xl overflow-hidden ${!imageRightSide ? "md:order-2" : ""}`}
                >
                  <BazaarPlaceholderImage
                    label={maker.name}
                    variant="maker"
                    src={maker.photoUrl}
                    sizes="(min-width: 768px) 50vw, 100vw"
                  />
                  <span className="absolute bottom-4 left-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-charcoal bg-amber px-3 py-1.5 rounded-full shadow-sm">
                    {maker.region}, {maker.country}
                  </span>
                </div>
                <div>
                  <span className="block text-[11px] font-bold tracking-[0.15em] uppercase text-amber-dark mb-3">
                    {maker.region}, {maker.country}
                  </span>
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-heading font-bold text-charcoal leading-tight mb-4">
                    {maker.name}
                  </h2>
                  {/* Fact-row chips. The same three claims appear
                      under every maker by design — repetition turns
                      an abstract policy ("we pay above wholesale,
                      up-front, with named attribution") into a
                      visible promise that's reinforced once per
                      person. Quiet styling so they read as facts
                      sitting next to the prose, not as a CTA
                      competing with it. */}
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 mb-5">
                    <span className="inline-flex items-center text-[11px] font-semibold text-charcoal/70 bg-charcoal/[0.06] px-2.5 py-1 rounded-full whitespace-nowrap">
                      Paid 3&ndash;4&times; regional wholesale
                    </span>
                    <span className="inline-flex items-center text-[11px] font-semibold text-charcoal/70 bg-charcoal/[0.06] px-2.5 py-1 rounded-full whitespace-nowrap">
                      Paid up front, not on sale
                    </span>
                    <span className="inline-flex items-center text-[11px] font-semibold text-charcoal/70 bg-charcoal/[0.06] px-2.5 py-1 rounded-full whitespace-nowrap">
                      Named on the parcel tag
                    </span>
                  </div>
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
            </div>
          </section>
        );
      })}

      {/* The standalone "What changes" stat section was removed —
          its three relevant proof points (paid above wholesale,
          paid up-front, named on tag) now sit as chips inside
          each maker block, where they're tied to a specific
          person rather than floating as abstract policy. */}

      {/* ─── CTA ─── */}
      {/* Recap-style CTA: the page just walked the reader through
          named people in specific places, then asked them to act.
          A generic "Browse the collection" button squanders that.
          We surface the makers again as small portrait thumbs
          above the button so the action carries the faces with
          it — the reader clicks "browse" remembering Khadija and
          Tahir, not an anonymous catalog. The thumbs are visual
          memory aids, not nav (no per-maker links since we don't
          have catalog-by-maker filtering yet). */}
      <section className="py-14 md:py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="block text-[11px] font-bold tracking-[0.15em] uppercase text-amber-dark mb-3">
            Their work, in your hands
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-heading font-bold text-charcoal leading-tight mb-3 max-w-2xl mx-auto">
            Meet them again on the products they made.
          </h2>
          <p className="text-grey text-base sm:text-[1.0625rem] leading-[1.7] max-w-xl mx-auto mb-9">
            Every piece in the Bazaar names its maker and where it
            was made. Shop with the person, not just the product.
          </p>

          {/* Portrait recap row. Circles instead of the editorial
              4:5 used above so the thumbs read clearly as identity
              chips, not miniature versions of the maker blocks. */}
          <div className="flex justify-center flex-wrap gap-5 sm:gap-7 mb-10">
            {uniqueMakers.map((maker) => (
              <div
                key={`recap-${maker.name}`}
                className="flex flex-col items-center text-center w-[72px] sm:w-[84px]"
              >
                <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden mb-2 ring-1 ring-charcoal/10">
                  <BazaarPlaceholderImage
                    label={maker.name}
                    variant="maker"
                    src={maker.photoUrl}
                    sizes="64px"
                  />
                </div>
                <span className="block text-[12px] font-semibold text-charcoal leading-tight">
                  {maker.name.split(" ")[0]}
                </span>
                <span className="block text-[10px] text-charcoal/50 leading-tight mt-0.5">
                  {maker.country}
                </span>
              </div>
            ))}
          </div>

          <Link
            href="/bazaar#catalog"
            className="inline-flex items-center justify-center px-7 py-3.5 rounded-full bg-amber text-charcoal font-semibold hover:bg-amber-dark hover:text-white transition-colors shadow-sm"
          >
            Browse the collection
          </Link>
        </div>
      </section>

      <BazaarFaqSection faqs={BAZAAR_MAKERS_FAQS} page="makers" />
      <BazaarPageOutro />
    </>
  );
}
