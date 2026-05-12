import type { Metadata } from "next";
import Link from "next/link";
import { BAZAAR_SUPPORT_EMAIL } from "@/lib/bazaar-config";
import BazaarFaqSection from "@/components/bazaar/BazaarFaqSection";
import BazaarPageOutro from "@/components/bazaar/BazaarPageOutro";
import BazaarPlaceholderImage from "@/components/bazaar/BazaarPlaceholderImage";
import { BAZAAR_OUR_PROMISE_FAQS } from "@/lib/bazaar-faqs";
import { fetchActiveMakers } from "@/lib/bazaar-catalog";

export const metadata: Metadata = {
  title: "Our Promise | Deen Relief Bazaar",
  description:
    "What we promise — to our makers, to our customers, and about how we use the profits.",
};

export const dynamic = "force-dynamic";

/**
 * The transparency / FAQ-adjacent page. Three pillars of promises
 * with link-outs to the legal/policy detail. Designed so a sceptical
 * donor can satisfy themselves the model isn't smoke and mirrors.
 *
 * Visual design notes:
 *
 *   - Each of the three pillars gets a distinct layout so the page
 *     doesn't read as three identical blocks stacked. P1 is editorial
 *     (200px rail + oversized numeral + prose), P2 is a compact
 *     horizontal strip (chip-led mini-blocks), P3 is full-width
 *     with the policy footer folded in as its coda.
 *
 *   - Green checkmark bullets are replaced with thin amber vertical
 *     bars — echoes the blockquote treatment on /bazaar/about-our-
 *     makers and reads as editorial rather than charity-template.
 *
 *   - Cream/white alternates strictly section-by-section so the
 *     page has rhythm: cream hero → white P1 → cream P2 → white P3
 *     (with policy footer) → cream FAQ → outro. The previous flat
 *     cream-policy-cream-FAQ adjacency is gone.
 *
 *   - A small row of maker portrait circles sits inside P1 (the
 *     pillar that's *about* the makers) — reuses the existing
 *     /bazaar/about-our-makers photos so the abstract policy ties
 *     to faces the reader has met (or can meet via the link out).
 */
export default async function OurPromisePage() {
  // Pulled for the maker portrait row in Pillar 1. Same call the
  // makers page uses — deduped, sorted, capped to what we want to
  // show. We only need 4–5 for the decorative row; slice in case
  // the table ever grows past visual capacity.
  const makers = (await fetchActiveMakers()).slice(0, 5);

  return (
    <>
      {/* ─── Hero ─── */}
      <section className="bg-cream py-16 md:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-block text-[11px] font-bold tracking-[0.15em] uppercase text-amber-dark mb-4">
            Our Promise
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-heading font-bold text-charcoal leading-[1.15] tracking-[-0.02em] mb-5">
            What we commit to, in writing
          </h1>
          {/* Thin amber underline — small visual anchor under the
              hero headline. The page is otherwise text-heavy so the
              line gives the eye something to land on before the
              body copy. */}
          <span
            className="block w-12 h-px bg-amber mx-auto mb-5"
            aria-hidden="true"
          />
          <p className="text-grey text-base sm:text-lg leading-[1.7]">
            Three promises. To our makers, to our customers, and about
            what happens to the money.
          </p>
        </div>
      </section>

      {/* ─── Pillar 1: To our makers ─── */}
      {/* Same horizontal numeral · kicker · title scaffold as P2/P3
          so the three pillars share a consistent header pattern.
          The variance between pillars now lives in the *body*
          layout, not the heading: P1 has a single-column prose
          body (preceded by a maker portrait row), P2 has a 4-col
          chip-card grid, P3 has a 2-col amber-bar grid. */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-baseline gap-4 mb-3">
            <span
              className="font-heading font-bold text-5xl md:text-6xl leading-none text-amber-dark/30 select-none"
              aria-hidden="true"
            >
              01
            </span>
            <span className="text-[11px] font-bold tracking-[0.15em] uppercase text-amber-dark">
              To our makers
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-heading font-bold text-charcoal leading-tight mb-8 max-w-3xl">
            Fair pay, paid up front, named on every piece.
          </h2>

          {/* Portrait recap row — these are the people the pillar
              is about. Decorative only; the link points to the
              makers page where the full stories live. */}
          {makers.length > 0 && (
            <div className="flex items-center gap-3 mb-8 pb-8 border-b border-charcoal/10">
              <div className="flex -space-x-2">
                {makers.map((m) => (
                  <div
                    key={`p1-${m.name}`}
                    className="relative w-9 h-9 rounded-full overflow-hidden ring-2 ring-white"
                  >
                    <BazaarPlaceholderImage
                      label={m.name}
                      variant="maker"
                      src={m.photoUrl}
                      sizes="36px"
                    />
                  </div>
                ))}
              </div>
              <Link
                href="/bazaar/about-our-makers"
                className="text-[12px] font-semibold text-charcoal/70 hover:text-charcoal transition-colors"
              >
                Meet the makers these promises are about →
              </Link>
            </div>
          )}

          <ul className="space-y-5 max-w-3xl">
            {[
              "Every product is paid at 3-4× the regional commercial rate. We share the per-piece breakdown with the maker before each batch begins.",
              "Payment is made when production is complete — not when the product sells. We carry the inventory risk, not them.",
              "Every piece carries a tag with the maker's first name and region. No anonymous attribution. The story is theirs.",
              "Long-term commitments, not one-off orders. We commit to a six-month order cycle so the maker can plan their household income.",
            ].map((point) => (
              <li
                key={point}
                className="border-l-2 border-amber pl-4 text-grey text-base leading-[1.7]"
              >
                {point}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ─── Pillar 2: To our customers ─── */}
      {/* Compact horizontal strip on a cream background — visual
          reset mid-page. Centred kicker/title, then a 4-column
          grid of mini-blocks where each block leads with a chip-
          style label and a short body. Same content as before,
          rendered as scannable cards instead of vertical prose. */}
      <section className="py-16 md:py-24 bg-cream">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-baseline gap-4 mb-3">
            <span
              className="font-heading font-bold text-5xl md:text-6xl leading-none text-amber-dark/30 select-none"
              aria-hidden="true"
            >
              02
            </span>
            <span className="text-[11px] font-bold tracking-[0.15em] uppercase text-amber-dark">
              To our customers
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-heading font-bold text-charcoal leading-tight mb-10 max-w-2xl">
            Honest products, honest descriptions, honest returns.
          </h2>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
            {[
              {
                chip: "Honest spec sheets",
                body:
                  "Every product description includes materials, weight, and country of origin. No vague “premium” filler.",
              },
              {
                chip: "14-day free returns",
                body:
                  "Damaged or wrong fit? Return for a full refund within 14 days. No restocking fee. We pay shipping if the issue is ours.",
              },
              {
                chip: "No anonymous fulfilment",
                body:
                  "If we run out of stock, we wait until the next maker batch. We won't quietly outsource demand to factories.",
              },
              {
                chip: "Real humans reply",
                body: `Unsure before buying? Message us. Real humans answer at ${BAZAAR_SUPPORT_EMAIL}.`,
              },
            ].map((item) => (
              <div
                key={item.chip}
                className="bg-white rounded-2xl p-5 md:p-6"
              >
                <span className="inline-flex items-center text-[11px] font-semibold text-charcoal/70 bg-charcoal/[0.06] px-2.5 py-1 rounded-full mb-3">
                  {item.chip}
                </span>
                <p className="text-grey text-[13px] sm:text-sm leading-[1.65]">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pillar 3: About the money ─── */}
      {/* Full-width layout — kicker + oversized 03 + title at top,
          then a 2-column grid for the body points so the eye has
          to traverse horizontally as well as vertically (yet
          another rhythm break vs P1's single-column prose). The
          policy footer is folded in here as the pillar's coda
          since "money + accountability + legal" is one thematic
          family. */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-baseline gap-4 mb-3">
            <span
              className="font-heading font-bold text-5xl md:text-6xl leading-none text-amber-dark/30 select-none"
              aria-hidden="true"
            >
              03
            </span>
            <span className="text-[11px] font-bold tracking-[0.15em] uppercase text-amber-dark">
              About the money
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-heading font-bold text-charcoal leading-tight mb-10 max-w-3xl">
            Where every pound goes, and why we tell you.
          </h2>

          <ul className="grid md:grid-cols-2 gap-x-10 gap-y-6 mb-14">
            {[
              "Every order is broken down into: maker payment, materials, freight, fulfilment, Stripe fees, and surplus.",
              "Surplus (typically 25-35% of the order value) goes directly into Deen Relief's charity programmes — orphan sponsorship in Bangladesh, cancer care in Adana, emergency relief.",
              "We publish an annual breakdown showing total revenue, total maker payments, and total surplus contributed to charity. Trustees sign off before publication.",
              "The Bazaar trades directly through Deen Relief Charity under HMRC's small-trading exemption for charities. Income is recorded and reported separately to our Charity Commission filings, fully ring-fenced from donation income.",
            ].map((point) => (
              <li
                key={point}
                className="border-l-2 border-amber pl-4 text-grey text-base leading-[1.7]"
              >
                {point}
              </li>
            ))}
          </ul>

          {/* Policy footer (folded in). Shipping + Returns get
              feature-card treatment since they're customer-facing;
              Privacy + Terms drop to a small text line beneath.
              Promotes the two policies people actually read,
              demotes the ones that exist for compliance. */}
          <div className="pt-10 border-t border-charcoal/10">
            <span className="block text-[11px] font-bold tracking-[0.15em] uppercase text-charcoal/50 mb-4">
              The fine print
            </span>
            <div className="grid sm:grid-cols-2 gap-3 mb-5">
              <Link
                href="/bazaar/shipping"
                className="block p-4 rounded-xl border border-charcoal/10 hover:border-charcoal/25 hover:bg-cream/40 transition-colors group"
              >
                <p className="text-[11px] font-bold tracking-[0.1em] uppercase text-charcoal/50 mb-1.5">
                  How we ship
                </p>
                <p className="text-charcoal text-sm font-semibold group-hover:text-green-dark transition-colors">
                  Shipping policy →
                </p>
              </Link>
              <Link
                href="/bazaar/returns"
                className="block p-4 rounded-xl border border-charcoal/10 hover:border-charcoal/25 hover:bg-cream/40 transition-colors group"
              >
                <p className="text-[11px] font-bold tracking-[0.1em] uppercase text-charcoal/50 mb-1.5">
                  If you change your mind
                </p>
                <p className="text-charcoal text-sm font-semibold group-hover:text-green-dark transition-colors">
                  Returns policy →
                </p>
              </Link>
            </div>
            <p className="text-xs text-charcoal/40">
              See also our{" "}
              <Link
                href="/privacy"
                className="underline decoration-charcoal/20 hover:text-charcoal/70 hover:decoration-charcoal/50 transition-colors"
              >
                Privacy
              </Link>{" "}
              and{" "}
              <Link
                href="/terms"
                className="underline decoration-charcoal/20 hover:text-charcoal/70 hover:decoration-charcoal/50 transition-colors"
              >
                Terms
              </Link>{" "}
              pages for the legal detail.
            </p>
          </div>
        </div>
      </section>

      <BazaarFaqSection faqs={BAZAAR_OUR_PROMISE_FAQS} page="promise" />
      <BazaarPageOutro />
    </>
  );
}
