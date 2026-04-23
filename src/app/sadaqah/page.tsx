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

/* ── FAQ data (NEW — this page had no FAQ previously) ── */
const faqs = [
  {
    question: "What is Sadaqah Jariyah?",
    answer:
      "Sadaqah Jariyah is ongoing charity — a gift that continues to benefit people long after the initial donation. Examples include building a well, funding a school, or planting a tree. The Prophet (peace be upon him) taught that the reward for Sadaqah Jariyah continues even after a person passes away.",
    links: [{ href: "/blog/what-is-sadaqah-jariyah", label: "7 examples of Sadaqah Jariyah" }],
  },
  {
    question: "When is the best time to give Sadaqah?",
    answer:
      "Sadaqah can be given at any time — there is no wrong moment. However, certain times carry greater reward: during Ramadan, on Fridays, in times of hardship for others, and when you are in good health. The best Sadaqah is that which is given consistently, even if small.",
    links: [{ href: "/blog/best-time-to-give-sadaqah", label: "Best times to give Sadaqah" }],
  },
  {
    question: "Can I give Sadaqah on behalf of someone who has passed away?",
    answer:
      "Yes. Giving Sadaqah on behalf of a deceased loved one is one of the most beautiful acts in Islam. The reward reaches them and benefits those who receive it. Many donors give Sadaqah Jariyah — such as funding a well or school — as an ongoing gift for a parent or family member who has passed.",
    links: [{ href: "/blog/giving-sadaqah-for-the-deceased", label: "Sadaqah for the deceased" }],
  },
  {
    question: "Is my donation eligible for Gift Aid?",
    answer:
      "Yes. If you are a UK taxpayer, we can claim an extra 25% on your donation at no additional cost to you. Your £25 becomes £31.25.",
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

export default function SadaqahPage() {
  return (
    <>
      <BreadcrumbSchema items={[{ name: "Give Sadaqah", href: "/sadaqah" }]} />
      <JsonLd data={faqSchema} />
      <Header />

      <main id="main-content" className="flex-1">
        {/* ─── 1. Hero ─── */}
        <section className="relative md:min-h-[50vh] md:flex md:items-end mt-[60px] md:mt-[64px]">
          <div className="absolute inset-0 z-0">
            <Image
              src="/images/orphan-sponsorship.webp"
              alt="Deen Relief worker with a child and food supplies in Bangladesh"
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
                Give Sadaqah
              </span>
              <h1 className="text-[1.75rem] sm:text-[2.25rem] lg:text-[2.5rem] leading-[1.18] sm:leading-[1.14] lg:leading-[1.12] text-white font-heading font-bold mb-3 tracking-[-0.02em]">
                Give Sadaqah and Sadaqah Jariyah
              </h1>
              <p className="text-[1.0625rem] sm:text-[1.1875rem] lg:text-[1.25rem] text-white/90 font-heading italic leading-[1.35] mb-4">
                Every act of generosity is rewarded.
              </p>
              <p className="text-[0.875rem] sm:text-[0.9375rem] text-white/65 mb-5 leading-[1.7] max-w-[24rem]">
                Give Sadaqah freely, at any time, in any amount. Your
                voluntary charity through a trusted UK Islamic charity
                reaches those who need it most.
              </p>
              <div className="flex flex-wrap items-center gap-2.5 mb-7 text-[11px] text-white/45 font-medium">
                <span>Charity No. 1158608</span>
                <span className="text-white/20">·</span>
                <span>100% pledge on direct aid</span>
                <span className="text-white/20">·</span>
                <span>Gift Aid Eligible</span>
              </div>
              <Button variant="primary" href="#donate-form">
                Give Sadaqah Now
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
                  src="/images/cancer-care-housing.webp"
                  alt="Deen Relief worker sitting with a child in the family housing programme"
                  fill
                  className="object-cover object-[center_35%]"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
                <ProofTag location="Adana, Turkey" />
              </div>

              {/* Form column with Hadith */}
              <div>
                <blockquote className="mb-6 max-w-lg">
                  <p className="text-charcoal/40 text-sm italic leading-relaxed font-heading">
                    &ldquo;Charity does not decrease wealth.&rdquo;
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

        {/* ─── 4. Sadaqah Is More Than Money ─── */}
        <section className="py-16 md:py-24 bg-cream">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-10">
                <span className="inline-block text-[11px] font-bold tracking-[0.1em] uppercase text-green mb-3">
                  More Than Money
                </span>
                <h2 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal leading-tight mb-4">
                  Sadaqah Is More Than Money
                </h2>
                <p className="text-grey text-base sm:text-[1.0625rem] leading-[1.7]">
                  The Prophet (peace be upon him) taught that Sadaqah is not
                  limited to money. A smile, a kind word, helping someone in
                  need, removing harm from a path — all are forms of
                  Sadaqah.
                </p>
              </div>

              <div className="space-y-5 mb-8">
                {[
                  "A financial gift — however small — to those in need",
                  "Ongoing charity (Sadaqah Jariyah) — wells, schools, knowledge that benefits for years",
                  "Sharing your time — volunteering, helping neighbours, community service",
                  "A kind word, a smile, or removing harm from someone's path",
                ].map((item) => (
                  <div key={item} className="flex gap-3 items-start">
                    <svg className="w-5 h-5 text-green flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <p className="text-charcoal text-base sm:text-[1.0625rem] leading-[1.7]">{item}</p>
                  </div>
                ))}
              </div>

              <p className="text-grey text-base sm:text-[1.0625rem] leading-[1.7] text-center">
                Your financial Sadaqah through Deen Relief is directed where
                the need is greatest — from emergency relief in Gaza to
                orphan care in Bangladesh.
              </p>
            </div>
          </div>
        </section>

        {/* ─── 5. Where Your Sadaqah Goes (3 impact cards) ─── */}
        <section className="py-16 md:py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <span className="inline-block text-[11px] font-bold tracking-[0.1em] uppercase text-green mb-3">
                Your Impact
              </span>
              <h2 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal leading-tight mb-3">
                Where Your Generosity Goes
              </h2>
            </div>

            <div className="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {[
                {
                  title: "Emergency Relief",
                  description: "Food, water, and shelter for displaced families in Gaza and crisis zones worldwide.",
                  icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>,
                },
                {
                  title: "Children's Care",
                  description: "Education, nutrition, and safe housing for vulnerable children in Bangladesh and Turkey.",
                  icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" /></svg>,
                },
                {
                  title: "Community Support",
                  description: "Weekly outreach and essential services for homeless communities in Brighton and across the UK.",
                  icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" /></svg>,
                },
              ].map((item) => (
                <div key={item.title} className="bg-cream border border-charcoal/5 rounded-2xl p-6 text-center">
                  <div className="w-12 h-12 rounded-xl bg-green/10 text-green flex items-center justify-center mx-auto mb-4">{item.icon}</div>
                  <h3 className="font-heading font-bold text-[1.0625rem] text-charcoal mb-2">{item.title}</h3>
                  <p className="text-grey/80 text-[0.8125rem] leading-[1.6]">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── 6. FAQ (NEW — this page previously had no FAQ) ─── */}
        <section className="py-16 md:py-24 bg-cream">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <span className="inline-block text-[11px] font-bold tracking-[0.1em] uppercase text-green mb-3">
                Common Questions
              </span>
              <h2 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal leading-tight">
                Sadaqah FAQs
              </h2>
            </div>

            <FaqAccordion faqs={faqs} />
          </div>
        </section>

        {/* ─── 7. Final CTA — integrated mini donation picker ─── */}
        <section className="py-12 md:py-16 bg-green-dark">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-xl sm:text-2xl font-heading font-bold text-white mb-2">
              No Amount Is Too Small
            </h2>
            <p className="text-white/55 text-sm italic font-heading mb-5">
              &ldquo;Protect yourself from Hellfire even with half a
              date.&rdquo;
            </p>
            <MiniDonationPicker />
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
