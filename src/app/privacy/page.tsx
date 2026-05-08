import Header from "@/components/Header";
import Footer from "@/components/Footer";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Deen Relief",
  description:
    "How Deen Relief collects, uses, and protects your personal information. Our commitment to data privacy and GDPR compliance. Charity No. 1158608.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
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
              Privacy Policy
            </h1>
            <p className="text-grey text-base sm:text-[1.0625rem] leading-[1.7]">
              Last updated: April 2026. This policy explains how Deen Relief
              collects, uses, and protects your personal information.
            </p>
          </div>
        </section>

        {/* Content */}
        <section className="pb-16 md:pb-24 bg-white">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 prose-charcoal">
            <div className="space-y-10">

              <div>
                <h2 className="text-xl font-heading font-bold text-charcoal mb-3">
                  1. Who We Are
                </h2>
                <p className="text-grey text-base leading-[1.7] mb-3">
                  Deen Relief is a UK-registered charity (No. 1158608) and
                  limited company (No. 08593822) registered in England and
                  Wales. Our registered office is at 71-75 Shelton Street,
                  London, WC2H 9JQ.
                </p>
                <p className="text-grey text-base leading-[1.7]">
                  Website: deenrelief.org. For any privacy-related queries,
                  contact us at info@deenrelief.org.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-heading font-bold text-charcoal mb-3">
                  2. Information We Collect
                </h2>
                <p className="text-grey text-base leading-[1.7] mb-3">
                  We may collect the following personal information:
                </p>
                <ul className="text-grey text-base leading-[1.7] list-disc pl-5 space-y-1.5">
                  <li>Name, email address, and phone number when you make a donation, subscribe to our newsletter, or contact us</li>
                  <li>Postal address if required for Gift Aid declarations</li>
                  <li>Payment information processed securely through our payment provider (we do not store card details)</li>
                  <li>Gift Aid declarations including confirmation of UK taxpayer status</li>
                  <li>Communication preferences</li>
                  <li>Technical data such as IP address, browser type, and device information when you visit our website</li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-heading font-bold text-charcoal mb-3">
                  3. How We Use Your Information
                </h2>
                <ul className="text-grey text-base leading-[1.7] list-disc pl-5 space-y-1.5">
                  <li>To process your donations and issue receipts</li>
                  <li>To claim Gift Aid on eligible donations</li>
                  <li>To send you updates about our work (only with your consent)</li>
                  <li>To respond to your enquiries</li>
                  <li>To comply with legal and regulatory obligations</li>
                  <li>To improve our website and services</li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-heading font-bold text-charcoal mb-3">
                  4. Legal Basis for Processing
                </h2>
                <p className="text-grey text-base leading-[1.7] mb-3">
                  We process your personal data on the following legal bases:
                </p>
                <ul className="text-grey text-base leading-[1.7] list-disc pl-5 space-y-1.5">
                  <li><strong>Consent:</strong> When you subscribe to communications or opt in to marketing</li>
                  <li><strong>Contractual necessity:</strong> To process donations and fulfil our obligations</li>
                  <li><strong>Legal obligation:</strong> To comply with charity law, Gift Aid requirements, and financial regulations</li>
                  <li><strong>Legitimate interest:</strong> To improve our services and communicate with supporters</li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-heading font-bold text-charcoal mb-3">
                  5. Cookies & Analytics
                </h2>
                <p className="text-grey text-base leading-[1.7] mb-3">
                  Our website uses essential cookies to keep core features
                  working — including remembering your cookie choice itself,
                  rate-limiting against abuse, and processing donations
                  securely. These run regardless of consent because the site
                  cannot function without them.
                </p>
                <p className="text-grey text-base leading-[1.7] mb-3">
                  With your consent (the &ldquo;Analytics&rdquo; toggle in our
                  cookie banner), we use the following tools to understand
                  how visitors interact with our site so we can improve it:
                </p>
                <ul className="text-grey text-base leading-[1.7] list-disc pl-5 space-y-1.5 mb-3">
                  <li>
                    <strong>Google Analytics 4</strong> — measures aggregate
                    page views, donation funnel progress, and which campaign
                    pages bring donors. IP addresses are anonymised.
                  </li>
                  <li>
                    <strong>Microsoft Clarity</strong> — records anonymised
                    session replays and heatmaps so we can see where the
                    donation form confuses people. Form fields (card number,
                    name, email, address) are masked by default and never
                    recorded. We use this purely for usability research.
                  </li>
                </ul>
                <p className="text-grey text-base leading-[1.7] mb-3">
                  With your consent (the &ldquo;Advertising&rdquo; toggle), we
                  also use Google Ads conversion tracking so we can measure
                  whether our donation campaigns are reaching the right
                  audiences. We use Google&apos;s Enhanced Conversions feature
                  with hashed (one-way encrypted) email addresses for
                  measurement only — we never share your raw email with
                  Google.
                </p>
                <p className="text-grey text-base leading-[1.7] mb-3">
                  You can change your choices any time by clicking
                  &ldquo;Manage cookies&rdquo; in our footer. Declining
                  analytics or advertising cookies does not affect your
                  ability to donate or use any part of the site.
                </p>
                <p className="text-grey text-base leading-[1.7]">
                  Embedded content from external services (such as videos)
                  may set their own cookies. We have no control over these
                  third-party cookies.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-heading font-bold text-charcoal mb-3">
                  6. Data Sharing
                </h2>
                <p className="text-grey text-base leading-[1.7] mb-3">
                  We do not sell or rent your personal information. We may
                  share data with:
                </p>
                <ul className="text-grey text-base leading-[1.7] list-disc pl-5 space-y-1.5">
                  <li>Payment processors to securely handle transactions</li>
                  <li>HMRC for Gift Aid claims</li>
                  <li>The Charity Commission as required by law</li>
                  <li>Trusted partners who help us deliver our charitable programmes, under strict data protection agreements</li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-heading font-bold text-charcoal mb-3">
                  7. Data Retention
                </h2>
                <p className="text-grey text-base leading-[1.7]">
                  We retain personal data only for as long as necessary to
                  fulfil the purposes for which it was collected. Donation
                  records and Gift Aid declarations are retained for a
                  minimum of six years as required by HMRC. You may request
                  deletion of your data at any time, subject to our legal
                  obligations.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-heading font-bold text-charcoal mb-3">
                  8. Your Rights
                </h2>
                <p className="text-grey text-base leading-[1.7] mb-3">
                  Under UK data protection law, you have the right to:
                </p>
                <ul className="text-grey text-base leading-[1.7] list-disc pl-5 space-y-1.5">
                  <li>Access the personal data we hold about you</li>
                  <li>Request correction of inaccurate data</li>
                  <li>Request deletion of your data</li>
                  <li>Object to or restrict processing of your data</li>
                  <li>Request a portable copy of your data</li>
                  <li>Withdraw consent at any time</li>
                </ul>
                <p className="text-grey text-base leading-[1.7] mt-3">
                  To exercise any of these rights, contact us at
                  info@deenrelief.org.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-heading font-bold text-charcoal mb-3">
                  9. Contact
                </h2>
                <p className="text-grey text-base leading-[1.7]">
                  If you have any questions about this privacy policy or wish
                  to make a complaint, please contact us at
                  info@deenrelief.org or write to Deen Relief, 71-75 Shelton
                  Street, London, WC2H 9JQ. You also have the right to lodge
                  a complaint with the Information Commissioner&apos;s Office
                  (ICO) at ico.org.uk.
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
