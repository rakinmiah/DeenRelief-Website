import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import JsonLd from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "Deen Relief | UK Islamic Charity — Cancer Care, Gaza Relief, Zakat & Sadaqah",
  description:
    "UK Islamic charity trusted by 3,200+ donors since 2013. Cancer care for refugee children, emergency Gaza relief, orphan sponsorship. Donate Zakat & Sadaqah. Charity No. 1158608.",
  other: { "article:modified_time": new Date().toISOString().split("T")[0] },
};
import Hero from "@/components/Hero";
import TrustBar from "@/components/TrustBar";
import FeaturedCampaign from "@/components/FeaturedCampaign";
import CancerCareCentres from "@/components/CancerCareCentres";
import GivingPathways from "@/components/GivingPathways";
import CampaignsGrid from "@/components/CampaignsGrid";
import Impact from "@/components/Impact";
import OurStory from "@/components/OurStory";
import Partners from "@/components/Partners";
import Newsletter from "@/components/Newsletter";
import Footer from "@/components/Footer";

/* ── Homepage FAQ data ── */
const faqs = [
  {
    question: "What is Deen Relief?",
    answer:
      "Deen Relief is a UK-registered Islamic charity (No. 1158608) that has been operating since 2013. We run cancer care centres for refugee children in Turkey, deliver emergency relief in Gaza, sponsor orphans in Bangladesh, fund schools and clean water projects, and support Brighton's homeless community every week.",
  },
  {
    question: "Is Deen Relief a registered charity?",
    answer:
      "Yes. Deen Relief is registered with the Charity Commission for England and Wales (No. 1158608) and Companies House (No. 08593822). Our accounts are publicly audited and filed annually.",
  },
  {
    question: "How can I donate to Deen Relief?",
    answer:
      "You can donate through any of our campaign pages — Palestine Emergency Relief, Cancer Care, Orphan Sponsorship, Build a School, Clean Water, UK Homeless Aid, or through our dedicated Zakat and Sadaqah pages. All donations are Gift Aid eligible if you are a UK taxpayer.",
  },
  {
    question: "Can I pay my Zakat through Deen Relief?",
    answer:
      "Yes. We operate a strict 100% Zakat policy — every penny of your Zakat reaches eligible recipients. Our trustees verify each case before funds are released. Visit our Zakat page to pay your Zakat with confidence.",
  },
  {
    question: "Where does Deen Relief operate?",
    answer:
      "We operate across five countries: Palestine (emergency relief in Gaza), Turkey (cancer care centres in Adana), Bangladesh (orphan sponsorship, schools, clean water), and the United Kingdom (weekly homeless outreach in Brighton).",
  },
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.answer,
    },
  })),
};

export default function Home() {
  return (
    <>
      <JsonLd data={faqSchema} />
      <Header />

      <main id="main-content" className="flex-1">
        <Hero />
        <Partners background="cream" />
        <FeaturedCampaign />
        <CancerCareCentres />
        <GivingPathways />
        <TrustBar />
        <CampaignsGrid />
        <Impact />
        <OurStory />

        {/* ─── Homepage FAQ — captures branded searches + People Also Ask ─── */}
        <section className="py-16 md:py-24 bg-white">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <span className="inline-block text-[11px] font-bold tracking-[0.1em] uppercase text-green mb-3">
                About Our Islamic Charity
              </span>
              <h2 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal leading-tight">
                Frequently Asked Questions
              </h2>
            </div>

            <div className="divide-y divide-charcoal/8">
              {faqs.map((faq, i) => (
                <details key={i} className="group py-4">
                  <summary className="flex items-center justify-between cursor-pointer list-none font-heading font-semibold text-[1.0625rem] text-charcoal pr-4 hover:text-green transition-colors duration-200">
                    {faq.question}
                    <svg
                      className="w-5 h-5 flex-shrink-0 text-charcoal/30 transition-transform duration-200 group-open:rotate-180"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                    </svg>
                  </summary>
                  <p className="mt-3 text-grey text-base sm:text-[1.0625rem] leading-[1.7]">
                    {faq.answer}
                  </p>
                  {/* Contextual links for specific FAQs */}
                  {faq.question.includes("Zakat") && (
                    <div className="mt-3">
                      <Link
                        href="/zakat"
                        className="inline-flex items-center gap-1 text-[0.9375rem] font-semibold text-green hover:text-green-dark transition-colors duration-200"
                      >
                        Pay Zakat
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                        </svg>
                      </Link>
                    </div>
                  )}
                  {faq.question.includes("registered charity") && (
                    <div className="mt-3">
                      <Link
                        href="https://register-of-charities.charitycommission.gov.uk/charity-details/?regid=1158608&subid=0"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[0.9375rem] font-semibold text-green hover:text-green-dark transition-colors duration-200"
                      >
                        Charity Commission register
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                        </svg>
                      </Link>
                    </div>
                  )}
                </details>
              ))}
            </div>
          </div>
        </section>

        <Newsletter />
      </main>

      <Footer />
    </>
  );
}
