import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Our Promise | Deen Relief Bazaar",
  description:
    "What we promise — to our makers, to our customers, and about how we use the profits.",
};

/**
 * The transparency / FAQ-adjacent page. Three columns of promises,
 * with one link out to the legal/policy detail (returns, shipping,
 * privacy). Designed so a sceptical donor can satisfy themselves
 * that the model isn't smoke and mirrors.
 */
export default function OurPromisePage() {
  return (
    <>
      <section className="bg-cream py-16 md:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-block text-[11px] font-bold tracking-[0.15em] uppercase text-amber-dark mb-4">
            Our Promise
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-heading font-bold text-charcoal leading-[1.15] tracking-[-0.02em] mb-5">
            What we commit to, in writing
          </h1>
          <p className="text-grey text-base sm:text-lg leading-[1.7]">
            Three promises. To our makers, to our customers, and about
            what happens to the money.
          </p>
        </div>
      </section>

      <section className="py-14 md:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14 md:space-y-20">
          {[
            {
              kicker: "To our makers",
              title: "Fair pay, paid up front, named on every piece.",
              points: [
                "Every product is paid at 3-4× the regional commercial rate. We share the per-piece breakdown with the maker before each batch begins.",
                "Payment is made when production is complete — not when the product sells. We carry the inventory risk, not them.",
                "Every piece carries a tag with the maker's first name and region. No anonymous attribution. The story is theirs.",
                "Long-term commitments, not one-off orders. We commit to a six-month order cycle so the maker can plan their household income.",
              ],
            },
            {
              kicker: "To our customers",
              title: "Honest products, honest descriptions, honest returns.",
              points: [
                "Every product description includes materials, weight, and country of origin. No vague \"premium\" filler.",
                "If a piece arrives damaged or doesn't fit, return it within 14 days for a full refund. No restocking fee. We pay return shipping if the issue is ours.",
                "If we run out of stock, we wait until our makers can produce the next batch. We won't quietly outsource demand to anonymous factories.",
                "If you're unsure, message us before buying. Real humans answer at hello@deenrelief.org.",
              ],
            },
            {
              kicker: "About the money",
              title: "Where every pound goes, and why we tell you.",
              points: [
                "Every order is broken down into: maker payment, materials, freight, fulfilment, Stripe fees, and surplus.",
                "Surplus (typically 25-35% of the order value) is gift-aided into Deen Relief's charity programmes — orphan sponsorship in Bangladesh, cancer care in Adana, emergency relief.",
                "We publish an annual breakdown showing total revenue, total maker payments, and total surplus contributed to charity. Trustees sign off before publication.",
                "The Bazaar trades through a separate company, owned by Deen Relief Charity. Profits flow through Gift Aid back to the charity. Charity Commission compliant.",
              ],
            },
          ].map((block, i) => (
            <article key={block.title} className="grid md:grid-cols-[200px_1fr] gap-6 md:gap-12">
              <div>
                <span className="inline-block text-[11px] font-bold tracking-[0.15em] uppercase text-amber-dark mb-2">
                  0{i + 1}
                </span>
                <h2 className="text-charcoal font-heading font-semibold text-lg leading-tight">
                  {block.kicker}
                </h2>
              </div>
              <div>
                <h3 className="text-2xl md:text-3xl font-heading font-bold text-charcoal leading-tight mb-5">
                  {block.title}
                </h3>
                <ul className="space-y-4">
                  {block.points.map((point) => (
                    <li
                      key={point}
                      className="flex gap-3 text-grey text-base leading-[1.7]"
                    >
                      <svg
                        className="w-5 h-5 text-green flex-shrink-0 mt-1"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.707-9.293a1 1 0 0 0-1.414-1.414L9 10.586 7.707 9.293a1 1 0 0 0-1.414 1.414l2 2a1 1 0 0 0 1.414 0l4-4Z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Policy links */}
      <section className="py-10 bg-cream">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-charcoal font-heading font-semibold text-lg mb-4">
            The detail
          </h2>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm">
            <Link href="/bazaar/shipping" className="text-charcoal hover:text-green underline transition-colors">
              Shipping policy
            </Link>
            <Link href="/bazaar/returns" className="text-charcoal hover:text-green underline transition-colors">
              Returns policy
            </Link>
            <Link href="/privacy" className="text-charcoal hover:text-green underline transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="text-charcoal hover:text-green underline transition-colors">
              Terms
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
