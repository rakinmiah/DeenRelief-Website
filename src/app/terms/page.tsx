import Header from "@/components/Header";
import Footer from "@/components/Footer";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions | Deen Relief",
  description:
    "Terms and conditions for using the Deen Relief website. Information about donations, Gift Aid, and your rights as a donor. Charity No. 1158608.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <>
      <Header />

      <main id="main-content" className="flex-1">
        {/* Page Header */}
        <section className="pt-32 md:pt-36 pb-12 md:pb-16 bg-white">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <span className="inline-block text-[11px] font-bold tracking-[0.1em] uppercase text-green mb-3">
              Legal
            </span>
            <h1 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal leading-tight mb-4">
              Terms &amp; Conditions
            </h1>
            <p className="text-grey text-base sm:text-[1.0625rem] leading-[1.7]">
              Last updated: April 2026. These terms govern your use of the
              Deen Relief website and services.
            </p>
          </div>
        </section>

        {/* Content */}
        <section className="pb-16 md:pb-24 bg-white">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="space-y-10">

              <div>
                <h2 className="text-xl font-heading font-bold text-charcoal mb-3">
                  1. About Deen Relief
                </h2>
                <p className="text-grey text-base leading-[1.7]">
                  Deen Relief is a registered charitable trust (Charity No.
                  1158608) and limited company (Company No. 08593822) in
                  England and Wales, governed by a Deed of Trust. Our
                  registered office is at 71-75 Shelton Street, London, WC2H
                  9JQ.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-heading font-bold text-charcoal mb-3">
                  2. Use of This Website
                </h2>
                <p className="text-grey text-base leading-[1.7] mb-3">
                  By accessing and using this website, you agree to these
                  terms and conditions. If you do not agree, please do not
                  use the site.
                </p>
                <ul className="text-grey text-base leading-[1.7] list-disc pl-5 space-y-1.5">
                  <li>You must use this website lawfully and not in a way that infringes the rights of others</li>
                  <li>You must not attempt to gain unauthorised access to the website or its systems</li>
                  <li>We reserve the right to modify or discontinue any part of the website without notice</li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-heading font-bold text-charcoal mb-3">
                  3. Donations
                </h2>
                <ul className="text-grey text-base leading-[1.7] list-disc pl-5 space-y-1.5">
                  <li>All donations are voluntary and non-refundable unless made in error</li>
                  <li>Donations are processed securely through our third-party payment provider</li>
                  <li>We commit to spending no more than 10% of income on administration and running costs</li>
                  <li>Zakat donations are ring-fenced and distributed only to eligible recipients</li>
                  <li>Where a specific campaign is oversubscribed, surplus funds may be redirected to where the need is greatest, unless otherwise agreed</li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-heading font-bold text-charcoal mb-3">
                  4. Gift Aid
                </h2>
                <p className="text-grey text-base leading-[1.7]">
                  If you are a UK taxpayer and make a Gift Aid declaration,
                  Deen Relief can claim an additional 25% from HMRC at no
                  cost to you. By making a Gift Aid declaration, you confirm
                  that you have paid sufficient UK Income Tax or Capital
                  Gains Tax to cover the amount claimed. It is your
                  responsibility to inform us if your taxpayer status
                  changes.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-heading font-bold text-charcoal mb-3">
                  5. Recurring Donations
                </h2>
                <p className="text-grey text-base leading-[1.7]">
                  Monthly or recurring donations can be set up through our
                  website. You may cancel a recurring donation at any time by
                  contacting us at info@deenrelief.org. Cancellations will
                  take effect before the next scheduled payment where
                  reasonable notice is given.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-heading font-bold text-charcoal mb-3">
                  6. Intellectual Property
                </h2>
                <p className="text-grey text-base leading-[1.7]">
                  All content on this website, including text, images, logos,
                  and design, is the property of Deen Relief or its content
                  suppliers and is protected by UK and international
                  copyright law. You may not reproduce, distribute, or use
                  any content without prior written permission.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-heading font-bold text-charcoal mb-3">
                  7. External Links
                </h2>
                <p className="text-grey text-base leading-[1.7]">
                  Our website may contain links to external sites. We are
                  not responsible for the content, privacy practices, or
                  availability of these external sites. Linking does not
                  imply endorsement.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-heading font-bold text-charcoal mb-3">
                  8. Limitation of Liability
                </h2>
                <p className="text-grey text-base leading-[1.7]">
                  Deen Relief makes every effort to ensure the accuracy of
                  information on this website but does not guarantee that the
                  content is error-free. We shall not be liable for any
                  direct, indirect, or consequential loss arising from the
                  use of this website, to the fullest extent permitted by
                  law.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-heading font-bold text-charcoal mb-3">
                  9. Governing Law
                </h2>
                <p className="text-grey text-base leading-[1.7]">
                  These terms are governed by the laws of England and Wales.
                  Any disputes shall be subject to the exclusive jurisdiction
                  of the courts of England and Wales.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-heading font-bold text-charcoal mb-3">
                  10. Contact
                </h2>
                <p className="text-grey text-base leading-[1.7]">
                  If you have any questions about these terms, please
                  contact us at info@deenrelief.org or write to Deen Relief,
                  71-75 Shelton Street, London, WC2H 9JQ.
                </p>
              </div>

            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
