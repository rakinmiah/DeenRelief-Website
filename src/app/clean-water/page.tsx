import Image from "next/image";
import Header from "@/components/Header";
import Button from "@/components/Button";
import ProofTag from "@/components/ProofTag";
import Partners from "@/components/Partners";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import BreadcrumbSchema from "@/components/BreadcrumbSchema";
import DonationForm from "./DonationForm";
import FaqAccordion from "./FaqAccordion";
import MiniDonationPicker from "./MiniDonationPicker";

/* ── FAQ data ── */
const faqs = [
  {
    question: "What does my donation fund?",
    answer:
      "Your donation funds the construction of tube wells and filtration systems in rural Bangladesh. This includes materials, installation, and initial maintenance to ensure communities have reliable access to safe drinking water.",
    links: [{ href: "/about", label: "About Deen Relief" }],
  },
  {
    question: "Is this Sadaqah Jariyah?",
    answer:
      "Yes. A water well is one of the most recognised forms of Sadaqah Jariyah (ongoing charity) in Islam. The well continues to provide clean water for years, and you continue to earn reward for as long as people benefit from it.",
    links: [{ href: "/blog/what-is-sadaqah-jariyah", label: "What is Sadaqah Jariyah?" }],
  },
  {
    question: "Is my donation eligible for Gift Aid?",
    answer:
      "Yes. If you are a UK taxpayer, we can claim an extra 25% on your donation at no additional cost to you. Your £150 becomes £187.50 — enough to fund a complete tube well.",
  },
  {
    question: "How long does a tube well last?",
    answer:
      "A properly constructed tube well provides clean water for many years with basic maintenance. Our local partners oversee ongoing maintenance to ensure long-term functionality.",
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

export default function CleanWaterPage() {
  return (
    <>
      <BreadcrumbSchema items={[{ name: "Clean Water", href: "/clean-water" }]} />
      <JsonLd data={faqSchema} />
      <Header />

      <main id="main-content" className="flex-1">
        {/* ─── 1. Hero ─── */}
        <section className="relative md:min-h-[50vh] md:flex md:items-end mt-[60px] md:mt-[64px]">
          <div className="absolute inset-0 z-0">
            <Image
              src="/images/bangladesh-community-children.webp"
              alt="Deen Relief workers with a large group of smiling children in a Bangladesh community"
              fill
              className="object-cover object-[center_30%]"
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
                Sadaqah Jariyah — Clean Water Appeal
              </span>
              <h1 className="text-[1.75rem] sm:text-[2.25rem] lg:text-[2.5rem] leading-[1.18] sm:leading-[1.14] lg:leading-[1.12] text-white font-heading font-bold mb-3 tracking-[-0.02em]">
                Fund Clean Water in Bangladesh
              </h1>
              <p className="text-[1.0625rem] sm:text-[1.1875rem] lg:text-[1.25rem] text-white/90 font-heading italic leading-[1.35] mb-4">
                A single well provides safe water for an entire community.
              </p>
              <p className="text-[0.875rem] sm:text-[0.9375rem] text-white/65 mb-5 leading-[1.7] max-w-[24rem]">
                Fund a tube well in rural Bangladesh. Provide clean
                drinking water for an entire community — a lasting
                Sadaqah Jariyah.
              </p>
              <div className="flex flex-wrap items-center gap-2.5 mb-7 text-[11px] text-white/45 font-medium">
                <span>Charity No. 1158608</span>
                <span className="text-white/20">·</span>
                <span>100% pledge on clean water</span>
                <span className="text-white/20">·</span>
                <span>Gift Aid Eligible</span>
              </div>
              <Button variant="primary" href="#donate-form">
                Fund a Well
              </Button>
            </div>
          </div>

          <ProofTag location="Bangladesh" position="bottom-right" />
        </section>

        {/* ─── 2. Donation Panel (two-column with image) ─── */}
        <section id="donate-form" className="pt-16 md:pt-24 pb-4 md:pb-6 bg-white scroll-mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-10 lg:gap-12 items-center">
              {/* Image */}
              <div className="relative rounded-2xl overflow-hidden aspect-[5/4]">
                <Image
                  src="/images/bangladesh-community-children.webp"
                  alt="Deen Relief workers with a large group of smiling children in a Bangladesh community"
                  fill
                  className="object-cover object-center"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
                <ProofTag location="Bangladesh" />
              </div>

              {/* Form column with Hadith */}
              <div>
                <blockquote className="mb-6 max-w-lg">
                  <p className="text-charcoal/40 text-sm italic leading-relaxed font-heading">
                    &ldquo;When a person dies, their deeds end except for
                    three: ongoing charity, beneficial knowledge, or a
                    righteous child who prays for them.&rdquo;
                  </p>
                  <cite className="text-charcoal/25 text-xs not-italic mt-1 block">
                    — Sahih Muslim
                  </cite>
                </blockquote>

                <DonationForm />
              </div>
            </div>
          </div>
        </section>

        {/* ─── 3. Partners ─── */}
        <Partners />

        {/* ─── 4. How a Well Changes a Community ─── */}
        <section className="py-16 md:py-24 bg-cream">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
              {/* Text */}
              <div>
                <span className="inline-block text-[11px] font-bold tracking-[0.1em] uppercase text-green mb-3">
                  Lasting Impact
                </span>
                <h2 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal leading-tight mb-4">
                  How a Well Changes a Community
                </h2>

                {/* Mobile-only inline image */}
                <div className="lg:hidden relative rounded-2xl overflow-hidden aspect-[4/3] mb-6">
                  <Image
                    src="/images/zakat-bangladesh-family.webp"
                    alt="A family standing in front of their Deen Relief housing project in Bangladesh"
                    fill
                    className="object-cover object-[center_20%]"
                    sizes="100vw"
                  />
                  <ProofTag location="Bangladesh" position="bottom-right" />
                </div>

                <p className="text-grey text-base sm:text-[1.0625rem] leading-[1.7] mb-4">
                  In rural Bangladesh, millions of people lack access to safe
                  drinking water. Families — often children — walk miles each
                  day to collect water from sources contaminated with
                  bacteria and arsenic. Waterborne diseases are a leading
                  cause of illness and child mortality.
                </p>
                <p className="text-grey text-base sm:text-[1.0625rem] leading-[1.7] mb-4">
                  When a tube well is installed, the change is immediate.
                  Clean water flows within metres of homes. Children who
                  spent hours walking now spend that time in school. Families
                  cook with safe water. Illness drops. The community begins
                  to grow.
                </p>
                <p className="text-grey text-base sm:text-[1.0625rem] leading-[1.7]">
                  A single well serves an entire community for years. It is
                  one of the most powerful forms of Sadaqah Jariyah — a
                  lasting charity that continues to benefit people, and
                  continues to earn you reward, long after the donation is
                  made.
                </p>
              </div>

              {/* Desktop image */}
              <div className="hidden lg:block relative rounded-2xl overflow-hidden aspect-[4/3]">
                <Image
                  src="/images/zakat-bangladesh-family.webp"
                  alt="A family standing in front of their Deen Relief housing project in Bangladesh"
                  fill
                  className="object-cover object-[center_20%]"
                  sizes="50vw"
                />
                <ProofTag location="Bangladesh" position="bottom-right" />
              </div>
            </div>
          </div>
        </section>

        {/* ─── 5. What Clean Water Provides (3 impact cards) ─── */}
        <section className="py-16 md:py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <span className="inline-block text-[11px] font-bold tracking-[0.1em] uppercase text-green mb-3">
                The Ripple Effect
              </span>
              <h2 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal leading-tight mb-3">
                More Than Just Water
              </h2>
              <p className="text-grey text-base sm:text-[1.0625rem] leading-[1.7]">
                Clean water transforms every aspect of community life.
              </p>
            </div>

            {/* Mobile: horizontal scroll-snap carousel (saves ~350px of
                vertical scroll versus three stacked impact cards). Desktop:
                3-col grid as before, max-w-4xl mx-auto centring preserved
                via sm: prefixes. */}
            <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 -mx-4 px-4 pb-2 sm:overflow-visible sm:px-0 sm:pb-0 sm:grid sm:grid-cols-3 sm:gap-6 sm:max-w-4xl sm:mx-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {[
                {
                  title: "Health",
                  description:
                    "Reduced waterborne disease, fewer hospital visits, and healthier children who can grow and thrive.",
                  icon: (
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
                    </svg>
                  ),
                },
                {
                  title: "Education",
                  description:
                    "Children spend time in school instead of walking miles to collect water each day.",
                  icon: (
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
                    </svg>
                  ),
                },
                {
                  title: "Community Growth",
                  description:
                    "Reliable water enables farming, cooking, and economic activity that lifts the whole community.",
                  icon: (
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
                    </svg>
                  ),
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="snap-center flex-shrink-0 w-[78%] sm:w-auto sm:flex-shrink bg-cream border border-charcoal/5 rounded-2xl p-6 text-center"
                >
                  <div className="w-12 h-12 rounded-xl bg-green/10 text-green flex items-center justify-center mx-auto mb-4">
                    {item.icon}
                  </div>
                  <h3 className="font-heading font-bold text-[1.0625rem] text-charcoal mb-2">
                    {item.title}
                  </h3>
                  <p className="text-grey/80 text-[0.8125rem] leading-[1.6]">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── 6. FAQ ─── */}
        <section className="py-16 md:py-24 bg-cream">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <span className="inline-block text-[11px] font-bold tracking-[0.1em] uppercase text-green mb-3">
                Common Questions
              </span>
              <h2 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal leading-tight">
                Clean Water FAQs
              </h2>
            </div>

            <FaqAccordion faqs={faqs} />
          </div>
        </section>

        {/* ─── 7. Final CTA — integrated mini donation picker ─── */}
        <section className="py-12 md:py-16 bg-green-dark">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-xl sm:text-2xl font-heading font-bold text-white mb-2">
              Give the Gift of Clean Water
            </h2>
            <p className="text-white/55 text-sm mb-5">
              A well built today provides water for years to come.
            </p>
            <MiniDonationPicker />
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
