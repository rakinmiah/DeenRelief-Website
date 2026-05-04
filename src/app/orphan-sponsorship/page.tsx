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

/* ── FAQ data ── */
const faqs = [
  {
    question: "What does £30/month cover?",
    answer:
      "Your £30 monthly sponsorship covers education (school fees, uniforms, and materials), daily nutrition, safe shelter in a caring environment, and healthcare including medical check-ups and vaccinations.",
  },
  {
    question: "Can I cancel my sponsorship?",
    answer:
      "Yes. You can cancel your monthly sponsorship at any time by contacting us at info@deenrelief.org. There are no contracts or penalties.",
  },
  {
    question: "Is my sponsorship eligible for Gift Aid?",
    answer:
      "Yes. If you are a UK taxpayer, we can claim an extra 25% on your sponsorship at no additional cost to you. Your £30 becomes £37.50 every month.",
  },
  {
    question: "How do I know my sponsorship reaches a child?",
    answer:
      "Our trustees oversee every sponsorship. We work with verified local partners in Bangladesh who deliver support directly. Our accounts are publicly audited and filed annually with the Charity Commission.",
    links: [{ href: "/about", label: "About our team" }],
  },
  {
    question: "Can I sponsor more than one child?",
    answer:
      "Yes. You can set up multiple sponsorships — each at £30/month — to support additional children. Contact us at info@deenrelief.org to arrange this.",
  },
  {
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

export default function OrphanSponsorshipPage() {
  return (
    <>
      <BreadcrumbSchema items={[{ name: "Orphan Sponsorship", href: "/orphan-sponsorship" }]} />
      <JsonLd data={faqSchema} />
      <Header />

      <main id="main-content" className="flex-1">
        {/* ─── 1. Hero ─── */}
        <section className="relative md:min-h-[50vh] md:flex md:items-end mt-[60px] md:mt-[64px]">
          <div className="absolute inset-0 z-0">
            <Image
              src="/images/orphan-sponsorship.webp"
              alt="Deen Relief worker with a sponsored child and food supplies in Bangladesh"
              fill
              className="object-cover object-[center_25%]"
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
                Orphan Sponsorship Programme
              </span>
              <h1 className="text-[1.75rem] sm:text-[2.25rem] lg:text-[2.5rem] leading-[1.18] sm:leading-[1.14] lg:leading-[1.12] text-white font-heading font-bold mb-3 tracking-[-0.02em]">
                Sponsor an Orphan in Bangladesh
              </h1>
              <p className="text-[1.0625rem] sm:text-[1.1875rem] lg:text-[1.25rem] text-white/90 font-heading italic leading-[1.35] mb-4">
                Every child deserves a chance to grow up safe.
              </p>
              <p className="text-[0.875rem] sm:text-[0.9375rem] text-white/65 mb-5 leading-[1.7] max-w-[24rem]">
                Your monthly sponsorship provides education, nutrition,
                safe shelter, and healthcare for an orphaned child in
                Bangladesh.
              </p>
              <div className="flex flex-wrap items-center gap-2.5 mb-7 text-[11px] text-white/45 font-medium">
                <span>Charity No. 1158608</span>
                <span className="text-white/20">·</span>
                <span>100% pledge on orphan care</span>
                <span className="text-white/20">·</span>
                <span>Gift Aid Eligible</span>
              </div>
              <Button variant="primary" href="#sponsor-form">
                Sponsor a Child
              </Button>
            </div>
          </div>

          <ProofTag location="Bangladesh" position="bottom-right" />
        </section>

        {/* ─── 2. What £30 Covers ─── */}
        <section className="pt-16 md:pt-24 pb-8 md:pb-10 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-stretch">
              {/* Desktop image — left column */}
              <div className="hidden lg:block relative rounded-2xl overflow-hidden min-h-[300px]">
                <Image
                  src="/images/children-smiling-deenrelief.webp"
                  alt="Three smiling children holding Deen Relief signs in a safe home environment"
                  fill
                  className="object-cover object-[center_40%]"
                  sizes="50vw"
                />
                <ProofTag location="Bangladesh" />
              </div>

              {/* Content */}
              <div>
                <span className="inline-block text-[11px] font-bold tracking-[0.1em] uppercase text-green mb-3">
                  Orphan Sponsorship
                </span>
                <h2 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal leading-tight mb-4">
                  Everything a Child Needs to Thrive
                </h2>

                {/* Mobile-only inline image */}
                <div className="lg:hidden relative rounded-2xl overflow-hidden aspect-[4/3] mb-6">
                  <Image
                    src="/images/children-smiling-deenrelief.webp"
                    alt="Three smiling children holding Deen Relief signs in a safe home environment"
                    fill
                    className="object-cover object-[center_40%]"
                    sizes="100vw"
                  />
                  <ProofTag location="Bangladesh" />
                </div>

                <p className="text-grey text-base sm:text-[1.0625rem] leading-[1.7] mb-6">
                  For just £30 a month, you provide an orphaned child with
                  the foundations they need to grow into a self-sufficient
                  adult who contributes positively to their community.
                </p>

                <div className="space-y-5 mb-8">
                  {[
                    { title: "Education", description: "School fees, uniforms, and learning materials so they can build a future" },
                    { title: "Nutrition", description: "Daily meals and clean drinking water for healthy growth" },
                    { title: "Safe Shelter", description: "Secure housing in a caring, stable environment" },
                    { title: "Healthcare", description: "Medical check-ups, treatment, and vaccinations" },
                  ].map((item) => (
                    <div key={item.title} className="flex gap-3 items-start">
                      <svg className="w-5 h-5 text-green flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <div>
                        <p className="font-heading font-semibold text-[0.9375rem] text-charcoal">
                          {item.title}
                        </p>
                        <p className="text-grey text-[0.8125rem] leading-[1.6]">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <Button variant="secondary" href="#sponsor-form">
                  Sponsor a Child — £30/month
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* ─── 3. Partners ─── */}
        <Partners />

        {/* ─── 4. Donation Panel (centered card) ─── */}
        <section id="sponsor-form" className="pt-16 md:pt-24 pb-4 md:pb-6 bg-cream scroll-mt-20">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="border border-charcoal/8 rounded-2xl p-6 sm:p-8 bg-white">
              <DonationForm />
            </div>
          </div>
        </section>

        {/* ─── 5. A Child's Journey ─── */}
        <section className="py-16 md:py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
              {/* Text */}
              <div>
                <span className="inline-block text-[11px] font-bold tracking-[0.1em] uppercase text-green mb-3">
                  A Child&apos;s Journey
                </span>
                <h2 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal leading-tight mb-4">
                  From Hardship to Hope
                </h2>

                {/* Mobile-only inline image */}
                <div className="lg:hidden relative rounded-2xl overflow-hidden aspect-[4/3] mb-6">
                  <Image
                    src="/images/zakat-family-support.webp"
                    alt="Deen Relief worker with a child and food supplies in Bangladesh"
                    fill
                    className="object-cover object-[center_25%]"
                    sizes="100vw"
                  />
                  <ProofTag location="Bangladesh" position="bottom-right" />
                </div>

                <p className="text-grey text-base sm:text-[1.0625rem] leading-[1.7] mb-4">
                  In rural Bangladesh, millions of orphaned children face
                  daily struggles. Without access to education, proper
                  nutrition, or safe shelter, their futures are uncertain
                  before they begin.
                </p>
                <p className="text-grey text-base sm:text-[1.0625rem] leading-[1.7] mb-4">
                  With a sponsor, everything changes. A child who was
                  missing school is now in a classroom. A child who went
                  hungry now eats every day. A child who slept in unsafe
                  conditions now has a stable home.
                </p>
                <p className="text-grey text-base sm:text-[1.0625rem] leading-[1.7]">
                  Children who receive this support are far more likely to
                  become self-sufficient adults who contribute positively to
                  their communities. Your £30 a month doesn&apos;t just help
                  a child survive — it gives them the chance to thrive.
                </p>
              </div>

              {/* Desktop image */}
              <div className="hidden lg:block relative rounded-2xl overflow-hidden aspect-[4/3]">
                <Image
                  src="/images/zakat-family-support.webp"
                  alt="Deen Relief worker with a child and food supplies in Bangladesh"
                  fill
                  className="object-cover object-[center_25%]"
                  sizes="50vw"
                />
                <ProofTag location="Bangladesh" position="bottom-right" />
              </div>
            </div>
          </div>
        </section>

        {/* ─── 6. Delivery Assurance ─── */}
        <section className="py-16 md:py-24 bg-cream">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="inline-block text-[11px] font-bold tracking-[0.1em] uppercase text-green mb-3">
                How We Deliver
              </span>
              <h2 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal leading-tight mb-3">
                Your Sponsorship, Accounted For
              </h2>
              <p className="text-grey text-base sm:text-[1.0625rem] leading-[1.7]">
                Every pound of your sponsorship is tracked and reported with
                full transparency.
              </p>
            </div>

            <ProcessSteps
              steps={[
                {
                  n: "01",
                  title: "We Identify",
                  body: "Our local partners identify orphaned children in greatest need across Bangladesh, assessing each case individually.",
                },
                {
                  n: "02",
                  title: "We Support",
                  body: "Your £30/month is directed to education, nutrition, shelter, and healthcare for your sponsored child.",
                },
                {
                  n: "03",
                  title: "We Report",
                  body: "Annual reports and audited financial statements are published openly through the Charity Commission.",
                },
              ]}
              className="max-w-4xl mx-auto mb-12"
            />

            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12px] text-charcoal/40 font-medium">
              <span>Charity No. 1158608</span>
              <span className="text-charcoal/15">|</span>
              <span>100% pledge on orphan care</span>
              <span className="text-charcoal/15">|</span>
              <span>Audited annually</span>
              <span className="text-charcoal/15">|</span>
              <span>Gift Aid eligible</span>
            </div>
          </div>
        </section>

        {/* ─── 7. FAQ ─── */}
        <section className="py-16 md:py-24 bg-white">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <span className="inline-block text-[11px] font-bold tracking-[0.1em] uppercase text-green mb-3">
                Common Questions
              </span>
              <h2 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal leading-tight">
                Sponsorship FAQs
              </h2>
            </div>

            <FaqAccordion faqs={faqs} />
          </div>
        </section>

        {/* ─── 8. Final CTA — integrated mini donation picker ─── */}
        <section className="py-12 md:py-16 bg-green-dark">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-xl sm:text-2xl font-heading font-bold text-white mb-2">
              A Child Is Waiting for You
            </h2>
            <p className="text-white/55 text-sm mb-5">
              £30 a month. That&apos;s all it takes to change a life.
            </p>
            <MiniDonationPicker />
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
