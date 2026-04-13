import Header from "@/components/Header";
import Footer from "@/components/Footer";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Accessibility | Deen Relief",
  description:
    "Our commitment to making the Deen Relief website accessible to everyone. Accessibility standards, features, and how to contact us for support.",
  alternates: { canonical: "/accessibility" },
};

export default function AccessibilityPage() {
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
              Accessibility
            </h1>
            <p className="text-grey text-base sm:text-[1.0625rem] leading-[1.7]">
              Deen Relief is committed to ensuring our website is accessible
              to all users, regardless of ability or technology.
            </p>
          </div>
        </section>

        {/* Content */}
        <section className="pb-16 md:pb-24 bg-white">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="space-y-10">

              <div>
                <h2 className="text-xl font-heading font-bold text-charcoal mb-3">
                  Our Commitment
                </h2>
                <p className="text-grey text-base leading-[1.7]">
                  We aim to conform to the Web Content Accessibility
                  Guidelines (WCAG) 2.1 at Level AA. We are continually
                  working to improve the accessibility and usability of our
                  website for all visitors.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-heading font-bold text-charcoal mb-3">
                  What We Do
                </h2>
                <ul className="text-grey text-base leading-[1.7] list-disc pl-5 space-y-1.5">
                  <li>Use semantic HTML to ensure proper document structure</li>
                  <li>Provide descriptive alt text for all meaningful images</li>
                  <li>Ensure sufficient colour contrast between text and backgrounds</li>
                  <li>Support keyboard navigation throughout the site</li>
                  <li>Provide visible focus indicators for interactive elements</li>
                  <li>Use clear, readable fonts at appropriate sizes</li>
                  <li>Design responsive layouts that work across devices and screen sizes</li>
                  <li>Include ARIA labels where necessary for assistive technologies</li>
                  <li>Respect user preferences for reduced motion</li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-heading font-bold text-charcoal mb-3">
                  Known Limitations
                </h2>
                <p className="text-grey text-base leading-[1.7]">
                  While we strive for full accessibility, some areas of the
                  site may not yet meet all WCAG 2.1 AA criteria. We are
                  actively working to identify and resolve any remaining
                  issues. If you encounter any accessibility barriers, please
                  let us know.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-heading font-bold text-charcoal mb-3">
                  Assistive Technology
                </h2>
                <p className="text-grey text-base leading-[1.7]">
                  This website has been designed to be compatible with
                  common assistive technologies including screen readers,
                  keyboard-only navigation, and browser zoom functionality.
                  The site is tested across modern browsers including
                  Chrome, Firefox, Safari, and Edge.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-heading font-bold text-charcoal mb-3">
                  Feedback
                </h2>
                <p className="text-grey text-base leading-[1.7]">
                  We welcome your feedback on the accessibility of this
                  website. If you experience any difficulty accessing content
                  or have suggestions for improvement, please contact us at
                  info@deenrelief.org or call +44 (0) 300 365 8899. We will
                  make every reasonable effort to address your concerns
                  promptly.
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
