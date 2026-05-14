import type { Metadata } from "next";
import { Suspense } from "react";
import { BAZAAR_SUPPORT_EMAIL } from "@/lib/bazaar-config";
import BackToContactLink from "@/components/bazaar/BackToContactLink";
import BazaarFaqSection from "@/components/bazaar/BazaarFaqSection";
import BazaarPageOutro from "@/components/bazaar/BazaarPageOutro";
import { BAZAAR_SHIPPING_FAQS } from "@/lib/bazaar-faqs";

export const metadata: Metadata = {
  title: "Shipping | Deen Relief Bazaar",
  description:
    "Royal Mail Tracked 48 to UK addresses. Free over £75. 2-4 working days.",
};

export default function ShippingPolicyPage() {
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
        Shipping
      </span>
      <h1 className="text-3xl md:text-4xl font-heading font-bold text-charcoal leading-tight mb-7">
        How we ship
      </h1>

      <div className="prose prose-base max-w-none text-grey [&_strong]:text-charcoal [&_h2]:text-charcoal [&_h2]:font-heading [&_h2]:font-semibold [&_h2]:text-xl [&_h2]:mt-8 [&_h2]:mb-3 leading-[1.7]">
        <h2>Where we ship</h2>
        <p>
          UK addresses only at launch. We&apos;ll add international
          shipping once the volume is steady enough to justify the
          customs paperwork.
        </p>

        <h2>How long it takes</h2>
        <p>
          We pack and ship within <strong>2 working days</strong> of
          your order. From there, <strong>Royal Mail Tracked 48</strong>
          delivers in <strong>2 to 4 working days</strong>. So an order
          placed Monday afternoon typically arrives Thursday or Friday.
        </p>

        <h2>What it costs</h2>
        <ul>
          <li>
            <strong>£3.99</strong> &mdash; Royal Mail Tracked 48 to any
            UK address
          </li>
          <li>
            <strong>Free</strong> on orders <strong>£75 and over</strong>
          </li>
          <li>
            <strong>£4.99</strong> &mdash; upgrade to Tracked 24 at
            checkout (1-2 working days)
          </li>
        </ul>

        <h2>Tracking</h2>
        <p>
          When your order leaves us, you&apos;ll get an email with a
          Royal Mail tracking link. You can also see the tracking number
          in your order page if you have an account.
        </p>

        <h2>If something goes wrong</h2>
        <p>
          If your parcel hasn&apos;t arrived after <strong>10 working
          days</strong>, email us at{" "}
          <a
            href={`mailto:${BAZAAR_SUPPORT_EMAIL}`}
            className="text-green underline"
          >
            {BAZAAR_SUPPORT_EMAIL}
          </a>{" "}
          with your order number. We&apos;ll either resend or refund &mdash;
          whichever you prefer.
        </p>
      </div>
    </article>

    <BazaarFaqSection faqs={BAZAAR_SHIPPING_FAQS} page="shipping" />
    <BazaarPageOutro />
    </>
  );
}
