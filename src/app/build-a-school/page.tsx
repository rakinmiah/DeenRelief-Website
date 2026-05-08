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
      "Your donation funds classroom construction, teacher recruitment and salaries, learning materials (books, stationery, and supplies), and the creation of safe, clean learning environments for children in rural Bangladesh.",
    links: [{ href: "/about", label: "About Deen Relief" }],
  },
  {
    question: "Is this Sadaqah Jariyah?",
    answer:
      "Yes. Building a school is one of the most powerful forms of Sadaqah Jariyah (ongoing charity) in Islam. The Prophet (peace be upon him) taught that beneficial knowledge is one of three things that continue to benefit a person after they pass. A school built today educates children for generations.",
    links: [{ href: "/blog/what-is-sadaqah-jariyah", label: "What is Sadaqah Jariyah?" }],
  },
  {
    question: "Where are the schools built?",
    answer:
      "Our schools are built in underserved rural communities in Bangladesh where children have little or no access to primary education. Each location is assessed by our local partners to ensure the greatest need and impact.",
  },
  {
    question: "Is my donation eligible for Gift Aid?",
    answer:
      "Yes. If you are a UK taxpayer, we can claim an extra 25% on your donation at no additional cost to you. Your £250 becomes £312.50 — enough to provide learning materials for an entire classroom.",
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

export default function BuildASchoolPage() {
  return (
    <>
      <BreadcrumbSchema items={[{ name: "Build a School", href: "/build-a-school" }]} />
      <JsonLd data={faqSchema} />
      <Header />

      <main id="main-content" className="flex-1">
        {/* ─── 1. Hero ─── */}
        <section className="relative md:min-h-[50vh] md:flex md:items-end mt-[60px] md:mt-[64px]">
          <div className="absolute inset-0 z-0">
            <Image
              src="/images/bangladesh-school-v2.webp"
              alt="Children holding papers in front of a Deen Relief school in rural Bangladesh"
              fill
              className="object-cover object-[center_40%]"
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
                Sadaqah Jariyah — Education Appeal
              </span>
              <h1 className="text-[1.75rem] sm:text-[2.25rem] lg:text-[2.5rem] leading-[1.18] sm:leading-[1.14] lg:leading-[1.12] text-white font-heading font-bold mb-3 tracking-[-0.02em]">
                Build a School in Rural Bangladesh
              </h1>
              <p className="text-[1.0625rem] sm:text-[1.1875rem] lg:text-[1.25rem] text-white/90 font-heading italic leading-[1.35] mb-4">
                A classroom built today educates children for generations.
              </p>
              <p className="text-[0.875rem] sm:text-[0.9375rem] text-white/65 mb-5 leading-[1.7] max-w-[24rem]">
                Fund classroom construction and teacher salaries in rural
                Bangladesh — a lasting Sadaqah Jariyah that gives children
                access to education.
              </p>
              <div className="flex flex-wrap items-center gap-2.5 mb-7 text-[11px] text-white/45 font-medium">
                <span>Charity No. 1158608</span>
                <span className="text-white/20">·</span>
                <span>100% pledge on schools programme</span>
                <span className="text-white/20">·</span>
                <span>Gift Aid Eligible</span>
              </div>
              <Button variant="primary" href="#donate-form">
                Fund a Classroom
              </Button>
            </div>
          </div>

          <ProofTag location="Bangladesh" position="bottom-right" />
        </section>

        {/* ─── 2. Donation Panel (centred, bordered) ─── */}
        <section id="donate-form" className="pt-16 md:pt-24 pb-4 md:pb-6 bg-white scroll-mt-20">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Hadith */}
            <blockquote className="text-center mb-8 max-w-lg mx-auto">
              <p className="text-charcoal/40 text-sm italic leading-relaxed font-heading">
                &ldquo;Whoever teaches something beneficial will have the
                reward of those who act upon it, without diminishing their
                reward in the slightest.&rdquo;
              </p>
              <cite className="text-charcoal/25 text-xs not-italic mt-1 block">
                — Sahih Muslim
              </cite>
            </blockquote>

            <div className="border border-charcoal/8 rounded-2xl p-6 sm:p-8">
              <DonationForm />
            </div>
          </div>
        </section>

        {/* ─── 3. Partners ─── */}
        <Partners />

        {/* ─── 4. What a School Means ─── */}
        <section className="py-16 md:py-24 bg-cream">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
              {/* Text */}
              <div>
                <span className="inline-block text-[11px] font-bold tracking-[0.1em] uppercase text-green mb-3">
                  Lasting Impact
                </span>
                <h2 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal leading-tight mb-4">
                  What a School Means for a Community
                </h2>

                {/* Mobile-only inline image */}
                <div className="lg:hidden relative rounded-2xl overflow-hidden aspect-[4/3] mb-6">
                  <Image
                    src="/images/bangladesh-classroom-children.webp"
                    alt="A Deen Relief team member with a large group of children in a Bangladeshi classroom"
                    fill
                    className="object-cover object-[center_30%]"
                    sizes="100vw"
                  />
                  <ProofTag location="Bangladesh" position="bottom-right" />
                </div>

                <p className="text-grey text-base sm:text-[1.0625rem] leading-[1.7] mb-4">
                  In rural Bangladesh, many children have no access to
                  primary education. The nearest school may be miles away,
                  or simply doesn&apos;t exist. Without education, children
                  have no path out of poverty — and the cycle continues for
                  another generation.
                </p>
                <p className="text-grey text-base sm:text-[1.0625rem] leading-[1.7] mb-4">
                  When a school is built, the impact is immediate and
                  lasting. Children who were working in fields are now in
                  classrooms. Girls who were kept at home now have access to
                  learning. Literacy rates rise. Families begin to see a
                  future.
                </p>
                <p className="text-grey text-base sm:text-[1.0625rem] leading-[1.7]">
                  A school doesn&apos;t just educate one child — it
                  transforms an entire community across generations. It is
                  one of the most powerful forms of Sadaqah Jariyah:
                  beneficial knowledge that continues to earn reward for as
                  long as people learn from it.
                </p>
              </div>

              {/* Desktop image */}
              <div className="hidden lg:block relative rounded-2xl overflow-hidden aspect-[4/3]">
                <Image
                  src="/images/bangladesh-classroom-children.webp"
                  alt="A Deen Relief team member with a large group of children in a Bangladeshi classroom"
                  fill
                  className="object-cover object-[center_30%]"
                  sizes="50vw"
                />
                <ProofTag location="Bangladesh" position="bottom-right" />
              </div>
            </div>
          </div>
        </section>

        {/* ─── 5. What Your Donation Builds ─── */}
        <section className="py-16 md:py-24 bg-white">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <span className="inline-block text-[11px] font-bold tracking-[0.1em] uppercase text-green mb-3">
                Your Impact
              </span>
              <h2 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal leading-tight mb-3">
                What Your Donation Builds
              </h2>
            </div>

            <div className="space-y-5 max-w-xl mx-auto mb-8 flex flex-col items-center">
              {[
                "Classroom construction in underserved rural areas",
                "Teacher recruitment and salary funding",
                "Learning materials — books, stationery, and supplies",
                "Safe, clean learning environments for children",
                "Access to primary education for children who had none",
              ].map((item) => (
                <div key={item} className="flex gap-3 items-center">
                  <svg className="w-5 h-5 text-green flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <p className="text-charcoal text-base sm:text-[1.0625rem] font-medium">
                    {item}
                  </p>
                </div>
              ))}
            </div>

            <p className="text-center text-grey/60 text-sm italic">
              A school built today educates children for generations.
            </p>
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
                Education Programme FAQs
              </h2>
            </div>

            <FaqAccordion faqs={faqs} />
          </div>
        </section>

        {/* ─── 7. Final CTA — integrated mini donation picker ─── */}
        <section className="py-12 md:py-16 bg-green-dark">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-xl sm:text-2xl font-heading font-bold text-white mb-2">
              Give the Gift of Education
            </h2>
            <p className="text-white/55 text-sm mb-5">
              A classroom built today changes lives for generations to come.
            </p>
            <MiniDonationPicker />
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
