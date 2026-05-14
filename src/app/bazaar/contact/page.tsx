import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import BazaarFaqSection from "@/components/bazaar/BazaarFaqSection";
import BazaarPageOutro from "@/components/bazaar/BazaarPageOutro";
import { BAZAAR_CONTACT_FAQS } from "@/lib/bazaar-faqs";
import { BAZAAR_SUPPORT_EMAIL } from "@/lib/bazaar-config";
import BazaarContactForm from "./BazaarContactForm";

export const metadata: Metadata = {
  title: "Contact | Deen Relief Bazaar",
  description:
    "Questions about your order, returns, sizing, or wholesale? Message the Bazaar team — most replies within one working day.",
};

/**
 * Bazaar-specific contact page.
 *
 * This is intentionally separate from /contact even though both
 * route to the same info@ inbox. The case for the split:
 *   1. Buyers don't think "charity contact" — they think
 *      "where's my parcel, how do I return, does this fit?".
 *      Showing them the donor-shaped /contact page invites the
 *      wrong question.
 *   2. The form has an order-number field auto-prefilled from
 *      links in the order confirmation email
 *      (/bazaar/contact?order=DRB-1234), so triage is faster
 *      with no extra step from the customer.
 *   3. The reason dropdown stamps the subject line — the inbox
 *      gets "[Bazaar] Contact: Returns & refunds" instead of a
 *      generic "Contact: General enquiry", so the trustee
 *      scanning subjects can prioritise without opening.
 *
 * Page composition mirrors the rest of /bazaar/*:
 *   - Article-style intro (matches /bazaar/returns,
 *     /bazaar/shipping)
 *   - FAQ section with FAQPage JSON-LD (deflect common
 *     questions before the form fills)
 *   - BazaarPageOutro (donation pivot + trust ribbon)
 *
 * No <LocalBusiness> schema here — that's the main charity
 * /contact page's role; doubling up would compete in search.
 * No physical address block either — buyers don't post returns
 * here (the returns page has the proper return address).
 */
export default function BazaarContactPage() {
  return (
    <>
      <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <span className="inline-block text-[11px] font-bold tracking-[0.15em] uppercase text-amber-dark mb-3">
          Contact
        </span>
        <h1 className="text-3xl md:text-4xl font-heading font-bold text-charcoal leading-tight mb-4">
          Got a question about your order?
        </h1>
        <p className="text-grey text-base sm:text-lg leading-[1.7] mb-8 max-w-2xl">
          We&apos;re a small team, so messages reach a real person
          (not a ticket queue). Most replies go out within one
          working day. For anything urgent about an order in
          flight, mention the order number and we&apos;ll
          prioritise it.
        </p>

        {/* Quick deflects — most customers' questions are answered
            on the existing policy pages. Linking them above the
            form is faster for the customer AND keeps the inbox
            lighter. */}
        <div className="grid sm:grid-cols-3 gap-3 mb-10">
          <Link
            href="/bazaar/shipping?from=contact"
            className="block p-4 rounded-xl border border-charcoal/10 hover:border-charcoal/25 hover:bg-cream/40 transition-colors group"
          >
            <p className="text-[11px] font-bold tracking-[0.1em] uppercase text-charcoal/50 mb-1.5">
              Where&apos;s my order?
            </p>
            <p className="text-charcoal text-sm font-semibold group-hover:text-green-dark transition-colors">
              Shipping & tracking →
            </p>
          </Link>
          <Link
            href="/bazaar/returns?from=contact"
            className="block p-4 rounded-xl border border-charcoal/10 hover:border-charcoal/25 hover:bg-cream/40 transition-colors group"
          >
            <p className="text-[11px] font-bold tracking-[0.1em] uppercase text-charcoal/50 mb-1.5">
              Need to send it back?
            </p>
            <p className="text-charcoal text-sm font-semibold group-hover:text-green-dark transition-colors">
              Returns policy →
            </p>
          </Link>
          <Link
            href="/bazaar/sizing-guide?from=contact"
            className="block p-4 rounded-xl border border-charcoal/10 hover:border-charcoal/25 hover:bg-cream/40 transition-colors group"
          >
            <p className="text-[11px] font-bold tracking-[0.1em] uppercase text-charcoal/50 mb-1.5">
              Not sure what size?
            </p>
            <p className="text-charcoal text-sm font-semibold group-hover:text-green-dark transition-colors">
              Sizing guide →
            </p>
          </Link>
        </div>

        {/* Form. Wrapped in Suspense because BazaarContactForm
            calls useSearchParams(), which Next requires inside a
            Suspense boundary on prerendered pages. */}
        <Suspense
          fallback={
            <div className="bg-cream rounded-2xl p-6 sm:p-8 min-h-[420px]" />
          }
        >
          <BazaarContactForm />
        </Suspense>

        {/* Direct email option for folks who prefer it over a
            web form (older buyers in particular). Same inbox,
            same SLA. */}
        <p className="mt-6 text-center text-sm text-charcoal/60">
          Prefer email? Write to{" "}
          <a
            href={`mailto:${BAZAAR_SUPPORT_EMAIL}`}
            className="text-green-dark font-semibold underline"
          >
            {BAZAAR_SUPPORT_EMAIL}
          </a>{" "}
          and include your order number if relevant.
        </p>

        {/* Compact trust block — replaces the LocalBusiness +
            two-office card of the main contact page. The buyer
            needs to know "yes this is a real registered charity",
            not the full address footprint. */}
        <div className="mt-12 pt-8 border-t border-charcoal/10 text-center">
          <p className="text-charcoal/50 text-xs leading-relaxed max-w-xl mx-auto">
            The Bazaar is operated directly by Deen Relief
            &mdash; registered charity in England &amp; Wales,
            No. 1158608 &mdash; under HMRC&apos;s small-trading
            exemption. Every surplus penny funds our programmes.
          </p>
        </div>
      </article>

      <BazaarFaqSection
        faqs={BAZAAR_CONTACT_FAQS}
        page="contact"
        kicker="Before you message us"
        heading="The quick answers"
      />
      <BazaarPageOutro />
    </>
  );
}
