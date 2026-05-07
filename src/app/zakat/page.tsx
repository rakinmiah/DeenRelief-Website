import Image from "next/image";
import Header from "@/components/Header";
import Button from "@/components/Button";
import ProofTag from "@/components/ProofTag";
import Partners from "@/components/Partners";
import ProcessSteps from "@/components/ProcessSteps";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import BreadcrumbSchema from "@/components/BreadcrumbSchema";
import DonationForm from "./DonationForm";
import FaqAccordion from "./FaqAccordion";
import MiniDonationPicker from "./MiniDonationPicker";
import ZakatCalculator from "./ZakatCalculator";

/* ── FAQ data ── */
// Slugs are stable anchor identifiers (rendered as `id="faq-<slug>"` by
// FaqAccordion) so Google Ads sitelinks can deep-link to a specific FAQ
// via /zakat#faq-<slug>. Don't rename without updating outbound links.
const faqs = [
  {
    slug: "gift-aid",
    question: "Is my Zakat eligible for Gift Aid?",
    answer:
      "Yes. If you are a UK taxpayer, we can claim an extra 25% on your Zakat at no additional cost to you. Simply check the Gift Aid box during checkout — your £100 becomes £125.",
    links: [{ href: "/blog/can-you-pay-zakat-with-a-credit-card", label: "Can you pay Zakat with a credit card?" }],
  },
  {
    slug: "eligible-recipients",
    question: "How do you ensure Zakat reaches eligible recipients?",
    answer:
      "Our trustees assess every case against established eligibility criteria before funds are released. We work with verified local partners to deliver support directly to those in need.",
    links: [{ href: "/about", label: "About our team" }],
  },
  {
    slug: "pathway-choice",
    question: "Can I specify where my Zakat goes?",
    answer:
      "Yes. You can choose from four pathways: Emergency Relief, Medical Support, Family Essentials, or Recovery & Stability. If you prefer, unrestricted donations are directed to where the need is greatest.",
  },
  {
    slug: "100-policy",
    question: "Do you have a 100% donation policy?",
    answer:
      "Yes. Your Zakat is ring-fenced for eligible recipients only. Administrative costs are covered separately, ensuring every penny of your Zakat reaches those who need it.",
    links: [{ href: "/blog/zakat-vs-sadaqah-difference", label: "Zakat vs Sadaqah explained" }],
  },
  {
    slug: "regulated",
    question: "How is Deen Relief regulated?",
    answer:
      "Deen Relief is registered with the Charity Commission (No. 1158608) and Companies House (No. 08593822). Our accounts are publicly audited and filed annually.",
    links: [
      {
        href: "https://register-of-charities.charitycommission.gov.uk/charity-details/?regid=1158608&subid=0",
        label: "Charity Commission register",
      },
    ],
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

export default function ZakatPage() {
  return (
    <>
      <BreadcrumbSchema items={[{ name: "Pay Zakat", href: "/zakat" }]} />
      <JsonLd data={faqSchema} />
      <Header />

      <main id="main-content" className="flex-1">
        {/* ─── 1. Hero ─── */}
        <section className="relative md:min-h-[50vh] md:flex md:items-end mt-[60px] md:mt-[64px]">
          <div className="absolute inset-0 z-0">
            <Image
              src="/images/cancer-care-housing.webp"
              alt="Deen Relief worker sitting with a child in the family housing programme in Adana, Turkey"
              fill
              className="object-cover object-center"
              priority
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to right, rgba(26,26,46,0.93) 0%, rgba(26,26,46,0.88) 35%, rgba(26,26,46,0.62) 52%, rgba(26,26,46,0.20) 75%, rgba(26,26,46,0.06) 100%)",
              }}
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to top, rgba(26,26,46,0.45) 0%, transparent 45%)",
              }}
            />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-12 md:py-16 lg:py-20">
            <div className="max-w-[22rem] sm:max-w-[26rem] md:max-w-[28rem]">
              <span className="inline-block text-[11px] font-bold tracking-[0.12em] uppercase text-amber mb-3">
                Pay Your Zakat
              </span>
              <h1 className="text-[1.75rem] sm:text-[2.25rem] lg:text-[2.5rem] leading-[1.18] sm:leading-[1.14] lg:leading-[1.12] text-white font-heading font-bold mb-3 tracking-[-0.02em]">
                Pay Your Zakat With Confidence
              </h1>
              <p className="text-[1.0625rem] sm:text-[1.1875rem] lg:text-[1.25rem] text-white/90 font-heading italic leading-[1.35] mb-4">
                100% of your Zakat reaches those who need it most.
              </p>
              <p className="text-[0.875rem] sm:text-[0.9375rem] text-white/65 mb-5 leading-[1.7] max-w-[24rem]">
                100% Zakat policy. Every penny reaches eligible recipients.
                Trustee-verified before funds are released.
              </p>
              <div className="flex flex-wrap items-center gap-2.5 mb-7 text-[11px] text-white/45 font-medium">
                <span>Charity No. 1158608</span>
                <span className="text-white/20">·</span>
                <span>100% Zakat Policy</span>
                <span className="text-white/20">·</span>
                <span>Gift Aid Eligible</span>
              </div>
              <Button variant="primary" href="#zakat-form">
                Pay Zakat Now
              </Button>
            </div>
          </div>
        </section>

        {/* ─── 2. Donation Panel (centred, bordered) ─── */}
        <section id="zakat-form" className="pt-16 md:pt-24 pb-4 md:pb-6 bg-white scroll-mt-20">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
            <blockquote className="text-center mb-8 max-w-lg mx-auto">
              <p className="text-charcoal/40 text-sm italic leading-relaxed font-heading">
                &ldquo;Whoever pays the Zakat on his wealth will have its
                evil removed from him.&rdquo;
              </p>
              <cite className="text-charcoal/25 text-xs not-italic mt-1 block">
                — Ibn Khuzaimah &amp; At-Tabarani
              </cite>
            </blockquote>

            <div className="border border-charcoal/8 rounded-2xl p-6 sm:p-8">
              <DonationForm />
            </div>
          </div>
        </section>

        {/* ─── 3. Partners ─── */}
        <Partners />

        {/* ─── 4. Zakat Pathways ─── */}
        <section className="py-16 md:py-24 bg-cream">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <span className="inline-block text-[11px] font-bold tracking-[0.1em] uppercase text-green mb-3">
                Zakat Distribution
              </span>
              <h2 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal leading-tight mb-3">
                Four Pathways Your Zakat Can Take
              </h2>
              <p className="text-grey text-base sm:text-[1.0625rem] leading-[1.7]">
                Choose a specific pathway or let us direct your Zakat where
                the need is greatest.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                {
                  title: "Emergency Relief",
                  description: "Rapid deployment to disaster zones — food, water, shelter for displaced families in Gaza and beyond.",
                  icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>,
                },
                {
                  title: "Medical Support",
                  description: "Cancer care for refugee children at Gulucuk Evi and medical assistance for vulnerable communities.",
                  icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" /></svg>,
                },
                {
                  title: "Family Essentials",
                  description: "Meals, shelter, and daily basics for families who have lost everything to conflict or crisis.",
                  icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>,
                },
                {
                  title: "Recovery & Stability",
                  description: "Long-term programmes for sustained recovery, education, and self-sufficiency.",
                  icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" /></svg>,
                },
              ].map((pathway) => (
                <div key={pathway.title} className="bg-white border border-charcoal/5 rounded-2xl p-6 text-center">
                  <div className="w-12 h-12 rounded-xl bg-green/10 text-green flex items-center justify-center mx-auto mb-4">
                    {pathway.icon}
                  </div>
                  <h3 className="font-heading font-bold text-[1.0625rem] text-charcoal mb-2">{pathway.title}</h3>
                  <p className="text-grey/80 text-[0.8125rem] leading-[1.6]">{pathway.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── 5. Zakat Assurance ─── */}
        <section className="py-16 md:py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="inline-block text-[11px] font-bold tracking-[0.1em] uppercase text-green mb-3">
                Trusted Zakat Charity
              </span>
              <h2 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal leading-tight mb-3">
                How We Distribute Your Zakat
              </h2>
              <p className="text-grey text-base sm:text-[1.0625rem] leading-[1.7]">
                Your donation is a sacred trust. Here is exactly how we steward it.
              </p>
            </div>

            <ProcessSteps
              steps={[
                { n: "01", title: "We Assess", body: "Every case is reviewed by our trustees before funds are released. We verify eligibility against established Islamic criteria." },
                { n: "02", title: "We Allocate", body: "Project-specific donations go directly to your chosen pathway. Unrestricted Zakat is directed where the need is greatest." },
                { n: "03", title: "We Report", body: "Annual reports and audited financial statements are published openly on the Charity Commission website." },
              ]}
              className="max-w-4xl mx-auto mb-12"
            />

            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12px] text-charcoal/40 font-medium">
              <span>Charity No. 1158608</span>
              <span className="text-charcoal/15">|</span>
              <span>Max 10% admin costs</span>
              <span className="text-charcoal/15">|</span>
              <span>Financial year-end: 31 July</span>
              <span className="text-charcoal/15">|</span>
              <span>Public annual reporting</span>
            </div>
          </div>
        </section>

        {/* ─── 6. Field Evidence ─── */}
        <section className="py-16 md:py-24 bg-cream">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <span className="inline-block text-[11px] font-bold tracking-[0.1em] uppercase text-green mb-3">
                Your Zakat at Work
              </span>
              <h2 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal leading-tight mb-3">
                Real Families, Real Impact
              </h2>
              <p className="text-grey text-base sm:text-[1.0625rem] leading-[1.7]">
                Your Zakat reaches eligible recipients across multiple
                countries — from housing in Bangladesh to emergency relief in Gaza.
              </p>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="relative rounded-2xl overflow-hidden aspect-[5/6]">
                <Image src="/images/zakat-bangladesh-family.webp" alt="A family standing in front of their Deen Relief housing project in Bangladesh" fill className="object-cover object-[center_20%]" sizes="(max-width: 640px) 100vw, 33vw" />
                <ProofTag location="Bangladesh" />
              </div>
              <div className="relative rounded-2xl overflow-hidden aspect-[5/6]">
                <Image src="/images/zakat-family-support.webp" alt="Deen Relief worker with a child and food supplies in Bangladesh" fill className="object-cover object-[center_30%]" sizes="(max-width: 640px) 100vw, 33vw" />
                <ProofTag location="Bangladesh" position="bottom-right" />
              </div>
              <div className="relative rounded-2xl overflow-hidden aspect-[5/6]">
                <Image src="/images/cancer-care-housing.webp" alt="Deen Relief worker sitting with a child in the family housing programme in Adana, Turkey" fill className="object-cover object-[center_35%]" sizes="(max-width: 640px) 100vw, 33vw" />
                <ProofTag location="Adana, Turkey" />
              </div>
            </div>
          </div>
        </section>

        {/* ─── 7. Zakat Calculator ─── */}
        <section className="py-16 md:py-24 bg-white">
          <ZakatCalculator />
        </section>

        {/* ─── 8. FAQ ─── */}
        <section className="py-16 md:py-24 bg-cream">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <span className="inline-block text-[11px] font-bold tracking-[0.1em] uppercase text-green mb-3">
                Common Questions
              </span>
              <h2 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal leading-tight">
                Zakat FAQs
              </h2>
            </div>

            <FaqAccordion faqs={faqs} />
          </div>
        </section>

        {/* ─── 9. Final CTA — integrated mini donation picker ─── */}
        <section className="py-12 md:py-16 bg-green-dark">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-xl sm:text-2xl font-heading font-bold text-white mb-2">
              Your Zakat Can Change Lives Today
            </h2>
            <p className="text-white/55 text-sm mb-5">
              Every case verified. Every donation tracked. Every outcome reported.
            </p>
            <MiniDonationPicker />
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
