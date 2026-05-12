import Link from "next/link";

/**
 * The bottom-of-page block for bazaar browsing surfaces.
 *
 * Two components, one visual unit, intentionally paired:
 *
 *   1. Donation pivot — catches readers who scrolled all the way
 *      down without adding to cart. The brand framing is
 *      "Bazaar is ONE way to support; direct donations are
 *      another", NOT "didn't buy? please donate instead". Same
 *      tone the rest of the Bazaar copy uses — commerce as
 *      charity, not the reverse.
 *
 *   2. Trust ribbon — four single-line trust signals (free
 *      delivery threshold, returns window, charity model,
 *      Charity Commission number). Sits flush above the global
 *      <Footer />. Reinforces the brand contract at the very
 *      end of every commerce page.
 *
 * Used by /bazaar, /bazaar/[slug], /bazaar/about-our-makers,
 * /bazaar/our-promise, /bazaar/returns, /bazaar/shipping —
 * rendered immediately after the per-page <BazaarFaqSection />.
 *
 * NOT rendered on /bazaar/cart (the cart already pushes toward
 * checkout) or /bazaar/order/[sessionId] (post-purchase — a
 * donation pivot right after they paid would read as upselling).
 */
export default function BazaarPageOutro() {
  return (
    <>
      {/* Donation pivot. Every child sits in a flex column with
          items-center so the kicker, heading, paragraph, and CTA
          all share the same centre line — defensive against any
          inherited text-alignment quirks. */}
      <section className="bg-white py-12 md:py-16 border-t border-charcoal/8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center">
          <span className="block text-[11px] font-bold tracking-[0.15em] uppercase text-amber-dark mb-3">
            Another way to support
          </span>
          <h2 className="text-charcoal font-heading font-bold text-2xl sm:text-3xl leading-tight mb-4">
            The Bazaar is one way to help us.
            <br className="hidden sm:block" /> A direct donation is
            another.
          </h2>
          <p className="text-grey text-base sm:text-lg leading-[1.7] mb-7 max-w-2xl">
            Both fund the same programmes &mdash; orphan sponsorship in
            Bangladesh, cancer care in Adana, emergency relief
            wherever it&apos;s needed. If a piece isn&apos;t quite
            right for you today, a donation goes just as far.
          </p>
          <Link
            href="/#donate"
            className="inline-flex items-center justify-center px-7 py-3.5 rounded-full bg-green text-white font-semibold hover:bg-green-dark transition-colors shadow-sm"
          >
            Donate to Deen Relief
          </Link>
        </div>
      </section>

      {/* Trust ribbon — sits flush above the global Footer. */}
      <section className="py-7 md:py-8 bg-green-dark">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-white/65 text-[12px] font-medium">
            <span>Free UK delivery over £75</span>
            <span className="text-white/20">|</span>
            <span>14-day returns</span>
            <span className="text-white/20">|</span>
            <span>Profits gift-aided to Deen Relief</span>
            <span className="text-white/20">|</span>
            <span>Charity No. 1158608</span>
          </div>
        </div>
      </section>
    </>
  );
}
