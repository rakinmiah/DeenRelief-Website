import JsonLd from "@/components/JsonLd";
import BazaarFaqAccordion from "@/components/bazaar/BazaarFaqAccordion";
import {
  buildBazaarFaqSchema,
  type BazaarFaq,
  type BazaarFaqPage,
} from "@/lib/bazaar-faqs";

/**
 * Full FAQ block for a bazaar page — pairs the JSON-LD FAQPage
 * schema with the visible accordion in one ready-to-drop section.
 *
 * Server component (the JSON-LD must be in the SSR HTML for Google
 * to read it), with the interactive accordion as a client child.
 *
 * Renders nothing when given an empty array — useful for the
 * product detail page where the FAQ builder may return zero
 * questions on simple products without variants.
 *
 * Visual: cream background, max-width 3xl (narrower than the rest
 * of the page) so the question text isn't a single long line. The
 * kicker + heading match the brand voice of the rest of the
 * bazaar copy ("Common questions" not "FAQ").
 */
export default function BazaarFaqSection({
  faqs,
  page,
  kicker = "Common questions",
  heading,
}: {
  faqs: BazaarFaq[];
  page: BazaarFaqPage;
  kicker?: string;
  /** Optional override. Defaults vary per page below. */
  heading?: string;
}) {
  if (faqs.length === 0) return null;

  const resolvedHeading =
    heading ??
    (page === "product"
      ? "Questions about this piece"
      : page === "makers"
        ? "About the makers"
        : page === "promise"
          ? "About the model"
          : page === "returns"
            ? "More on returns"
            : page === "shipping"
              ? "More on shipping"
              : "Frequently asked");

  return (
    <section className="bg-cream py-14 md:py-20">
      <JsonLd data={buildBazaarFaqSchema(faqs)} />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 text-center">
          <span className="block text-[11px] font-bold tracking-[0.15em] uppercase text-amber-dark mb-2">
            {kicker}
          </span>
          <h2 className="text-charcoal font-heading font-bold text-2xl sm:text-3xl leading-tight">
            {resolvedHeading}
          </h2>
        </div>
        <div className="bg-white rounded-2xl px-5 sm:px-7 border border-charcoal/10">
          <BazaarFaqAccordion faqs={faqs} page={page} />
        </div>
      </div>
    </section>
  );
}
