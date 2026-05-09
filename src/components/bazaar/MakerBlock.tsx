import type { Maker } from "@/lib/bazaar-types";
import BazaarPlaceholderImage from "./BazaarPlaceholderImage";

/**
 * The "Made by..." block on the product detail page. This is the brand
 * moat — it carries more visual weight than the price card. The maker's
 * name, photograph, region, story, and (optional) direct quote are all
 * present.
 *
 * The story comes through in three layers:
 *   1. Photograph — the maker, in their workspace, at work.
 *   2. Story — 60-100 words of context: who they are, where they live,
 *      what changed for them through this work.
 *   3. Quote — optional pull-quote in their own words, translated.
 *
 * Layout: image left, story right on desktop; stacked on mobile.
 */
export default function MakerBlock({ maker }: { maker: Maker }) {
  return (
    <section className="bg-cream rounded-2xl overflow-hidden">
      <div className="grid md:grid-cols-2 gap-0">
        {/* Maker portrait */}
        <div className="relative aspect-[4/5] md:aspect-auto md:min-h-[28rem]">
          <BazaarPlaceholderImage
            label={maker.name}
            variant="maker"
          />
          <span className="absolute bottom-4 left-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/85 bg-charcoal/70 backdrop-blur-sm px-3 py-1.5 rounded-full">
            {maker.region}, {maker.country}
          </span>
        </div>

        {/* Story */}
        <div className="p-7 md:p-10 lg:p-12 flex flex-col justify-center">
          <span className="text-[11px] font-bold tracking-[0.15em] uppercase text-amber-dark mb-3">
            Made by hand
          </span>
          <h3 className="font-heading font-bold text-2xl md:text-3xl text-charcoal mb-4 leading-tight">
            {maker.name}
          </h3>
          <p className="text-grey text-base leading-[1.7] mb-5">
            {maker.story}
          </p>
          {maker.quote && (
            <blockquote className="border-l-2 border-amber pl-4 my-2 text-charcoal/80 text-base italic leading-relaxed">
              &ldquo;{maker.quote}&rdquo;
            </blockquote>
          )}
          <div className="mt-6 pt-6 border-t border-charcoal/10">
            <p className="text-[12px] text-grey leading-relaxed">
              Every Deen Relief Bazaar purchase pays the maker directly.
              Profits beyond the maker payment fund our charity work —
              orphan sponsorship in Bangladesh, cancer care in Adana,
              emergency relief where it&apos;s needed most.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
