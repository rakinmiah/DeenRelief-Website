import Header from "@/components/Header";
import Footer from "@/components/Footer";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Safeguarding Policy | Deen Relief",
  description:
    "How Deen Relief safeguards children and vulnerable adults across all our programmes. Our policies, procedures, and reporting process.",
  alternates: { canonical: "/safeguarding" },
};

export default function SafeguardingPage() {
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
              Safeguarding Policy
            </h1>
            <p className="text-grey text-base sm:text-[1.0625rem] leading-[1.7]">
              Deen Relief is committed to safeguarding and protecting children
              and vulnerable adults in all areas of our work.
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
                  Deen Relief believes that all people, especially children
                  and vulnerable adults, have the right to be protected from
                  harm, abuse, neglect, and exploitation. We are committed to
                  creating and maintaining a safe environment for all
                  beneficiaries, staff, volunteers, and partners involved in
                  our programmes.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-heading font-bold text-charcoal mb-3">
                  Scope
                </h2>
                <p className="text-grey text-base leading-[1.7]">
                  This policy applies to all trustees, staff, volunteers,
                  consultants, and partners working on behalf of Deen Relief,
                  both in the UK and internationally. It covers all
                  activities and programmes delivered or funded by Deen
                  Relief.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-heading font-bold text-charcoal mb-3">
                  Key Principles
                </h2>
                <ul className="text-grey text-base leading-[1.7] list-disc pl-5 space-y-1.5">
                  <li>The welfare of children and vulnerable adults is paramount</li>
                  <li>All people have the right to be treated with dignity and respect, regardless of age, disability, gender, race, religion, or sexual orientation</li>
                  <li>We will take all reasonable steps to prevent harm and respond appropriately to safeguarding concerns</li>
                  <li>We will work in partnership with children, families, and communities to promote their safety and wellbeing</li>
                  <li>We will ensure confidentiality is maintained appropriately throughout any safeguarding process</li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-heading font-bold text-charcoal mb-3">
                  Prevention
                </h2>
                <ul className="text-grey text-base leading-[1.7] list-disc pl-5 space-y-1.5">
                  <li>All staff and volunteers working with children or vulnerable adults undergo appropriate vetting and checks</li>
                  <li>Safeguarding training is provided to all relevant personnel</li>
                  <li>Clear codes of conduct are established for all representatives of Deen Relief</li>
                  <li>Risk assessments are carried out for all programmes involving children or vulnerable adults</li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-heading font-bold text-charcoal mb-3">
                  Reporting Concerns
                </h2>
                <p className="text-grey text-base leading-[1.7] mb-3">
                  If you have any safeguarding concerns about a child or
                  vulnerable adult connected to Deen Relief&apos;s work,
                  please report them immediately to:
                </p>
                <ul className="text-grey text-base leading-[1.7] list-disc pl-5 space-y-1.5">
                  <li>Email: info@deenrelief.org (marked &ldquo;Safeguarding&rdquo;)</li>
                  <li>Phone: +44 (0) 300 365 8899</li>
                  <li>Post: Safeguarding Lead, Deen Relief, 71-75 Shelton Street, London, WC2H 9JQ</li>
                </ul>
                <p className="text-grey text-base leading-[1.7] mt-3">
                  All concerns will be treated seriously, investigated
                  promptly, and handled with appropriate confidentiality. We
                  will cooperate fully with any statutory investigation by
                  relevant authorities.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-heading font-bold text-charcoal mb-3">
                  Use of Images
                </h2>
                <p className="text-grey text-base leading-[1.7]">
                  Deen Relief takes care to ensure that all images and
                  stories used in our communications portray beneficiaries
                  with dignity. We obtain appropriate consent before using
                  images of children or vulnerable adults, and we do not
                  publish identifying information that could put any
                  individual at risk.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-heading font-bold text-charcoal mb-3">
                  Review
                </h2>
                <p className="text-grey text-base leading-[1.7]">
                  This policy is reviewed annually by the Board of Trustees
                  and updated as necessary to reflect best practice and any
                  changes in legislation. The most recent review was
                  conducted in April 2026.
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
