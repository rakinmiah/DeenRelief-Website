import type { Metadata } from "next";
import { Suspense } from "react";
import {
  BAZAAR_RETURNS_ADDRESS,
  BAZAAR_SUPPORT_EMAIL,
} from "@/lib/bazaar-config";
import BackToContactLink from "@/components/bazaar/BackToContactLink";
import BazaarFaqSection from "@/components/bazaar/BazaarFaqSection";
import BazaarPageOutro from "@/components/bazaar/BazaarPageOutro";
import { BAZAAR_RETURNS_FAQS } from "@/lib/bazaar-faqs";

export const metadata: Metadata = {
  title: "Returns | Deen Relief Bazaar",
  description:
    "14-day returns. Free if the issue is ours. Honest about what you get.",
};

export default function ReturnsPolicyPage() {
  return (
    <>
    <article className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      {/* Renders only when the visitor came via the /bazaar/contact
          deflect card (which appends ?from=contact). For direct
          visitors this is a no-op. */}
      <Suspense fallback={null}>
        <BackToContactLink />
      </Suspense>
      <span className="inline-block text-[11px] font-bold tracking-[0.15em] uppercase text-amber-dark mb-3">
        Returns
      </span>
      <h1 className="text-3xl md:text-4xl font-heading font-bold text-charcoal leading-tight mb-7">
        How returns work
      </h1>

      <div className="prose prose-base max-w-none text-grey [&_strong]:text-charcoal [&_h2]:text-charcoal [&_h2]:font-heading [&_h2]:font-semibold [&_h2]:text-xl [&_h2]:mt-8 [&_h2]:mb-3 leading-[1.7]">
        <h2>The short version</h2>
        <p>
          You have <strong>14 days from delivery</strong> to return any
          item for a full refund. The item needs to come back unworn,
          unwashed, and with any tags still attached.
        </p>

        <h2>Who pays return shipping</h2>
        <ul>
          <li>
            <strong>If the issue is ours</strong> &mdash; the item is
            damaged, defective, or we sent the wrong thing &mdash; we
            pay return shipping. Email us first; we&apos;ll send a
            prepaid Royal Mail label.
          </li>
          <li>
            <strong>If the issue is fit or preference</strong> &mdash;
            the size is wrong, the colour isn&apos;t what you hoped,
            you changed your mind &mdash; you pay return shipping. We
            recommend Royal Mail Tracked 48 (~£3.30) so the parcel is
            insured.
          </li>
        </ul>

        <h2>How to return</h2>
        <ol>
          <li>
            Email{" "}
            <a
              href={`mailto:${BAZAAR_SUPPORT_EMAIL}`}
              className="text-green underline"
            >
              {BAZAAR_SUPPORT_EMAIL}
            </a>{" "}
            with your order number and the item(s) you&apos;re returning.
          </li>
          <li>
            We&apos;ll reply within one working day with confirmation and
            (if applicable) a prepaid label. The return address is:
            <address className="not-italic mt-2 mb-3 p-3 bg-cream rounded-lg text-charcoal text-sm leading-[1.6]">
              {BAZAAR_RETURNS_ADDRESS.lines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </address>
          </li>
          <li>
            Pack the item back in its original wrapping or any clean,
            sealed parcel. Include a note with your order number.
          </li>
          <li>Drop at any Royal Mail Customer Service Point.</li>
          <li>
            Once we receive and inspect the return, your refund hits
            your card within <strong>5 working days</strong>.
          </li>
        </ol>

        <h2>What can&apos;t be returned</h2>
        <p>
          Items personalised with your name (e.g. embroidered children&apos;s
          prayer sets) are made to order and can&apos;t be returned unless
          there&apos;s a fault. Other items including sale items follow the
          standard 14-day window.
        </p>

        <h2>Faulty after the 14 days?</h2>
        <p>
          You&apos;re still covered by the UK Consumer Rights Act. If
          something fails within the first 6 months and isn&apos;t the
          result of normal wear, we&apos;ll repair, replace, or refund.
          Email{" "}
          <a
            href={`mailto:${BAZAAR_SUPPORT_EMAIL}`}
            className="text-green underline"
          >
            {BAZAAR_SUPPORT_EMAIL}
          </a>{" "}
          with photos.
        </p>

        <h2>The why behind the policy</h2>
        <p>
          Our products are made by hand by people we know. We want them
          and you to be happy with the work. If something isn&apos;t
          right, tell us &mdash; the makers want to know too. They take
          this seriously.
        </p>
      </div>
    </article>

    <BazaarFaqSection faqs={BAZAAR_RETURNS_FAQS} page="returns" />
    <BazaarPageOutro />
    </>
  );
}
