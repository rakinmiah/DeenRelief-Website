import Image from "next/image";
import Header from "@/components/Header";
import Button from "@/components/Button";
import LazyVideo from "@/components/LazyVideo";
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
    question: "How does my donation reach families in Gaza?",
    answer:
      "Our field teams work with verified local partners to identify the most vulnerable families. Aid is distributed directly — food parcels, clean water, medical supplies, and shelter materials are delivered hand-to-hand to families in displacement camps and affected areas.",
    links: [{ href: "/about", label: "About our team" }],
  },
  {
    question: "Is my donation eligible for Gift Aid?",
    answer:
      "Yes. If you are a UK taxpayer, we can claim an extra 25% on your donation at no additional cost to you. Simply check the Gift Aid box during checkout — your £100 becomes £125.",
  },
  {
    question: "Can I pay my Zakat here, or give Sadaqah instead?",
    answer:
      "Yes. Emergency relief for displaced Gaza families is considered Zakat-eligible under mainstream scholarly opinion covering the wayfarer (ibn al-sabil) and those displaced by conflict. If you prefer a dedicated Zakat donation experience with our strict 100% Zakat policy, visit our Zakat page. For general charitable giving, Sadaqah and Sadaqah Jariyah are accepted year-round.",
    links: [
      { href: "/zakat", label: "Pay Zakat" },
      { href: "/sadaqah", label: "Give Sadaqah" },
      { href: "/blog/zakat-vs-sadaqah-difference", label: "Zakat vs Sadaqah explained" },
    ],
  },
  {
    question: "Can I set up a monthly donation?",
    answer:
      "Yes. Monthly donations provide sustained, predictable support for families in Gaza. You can cancel anytime by contacting us at info@deenrelief.org.",
  },
  {
    question: "How much goes to administration?",
    answer:
      "We commit to spending no more than 10% of income on administration and running costs. 100% of emergency relief donations go directly to supporting families on the ground.",
    links: [{ href: "/about", label: "About Deen Relief" }],
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

export default function PalestinePage() {
  return (
    <>
      <BreadcrumbSchema items={[{ name: "Palestine Relief", href: "/palestine" }]} />
      <JsonLd data={faqSchema} />
      <Header />

      <main id="main-content" className="flex-1">
        {/* ─── 1. Hero ─── */}
        <section className="relative md:min-h-[50vh] md:flex md:items-end mt-[60px] md:mt-[64px]">
          <div className="absolute inset-0 z-0">
            <Image
              src="/images/palestine-relief.webp"
              alt="Deen Relief worker distributing aid to a family in a Gaza displacement camp"
              fill
              className="object-cover object-[center_37%]"
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
                Palestine Emergency Appeal
              </span>
              {/* Keyword-matched H1 for ad Quality Score — scanned by Google Ads */}
              <h1 className="text-[1.75rem] sm:text-[2.25rem] lg:text-[2.5rem] leading-[1.18] sm:leading-[1.14] lg:leading-[1.12] text-white font-heading font-bold mb-3 tracking-[-0.02em]">
                Donate to Gaza Emergency Relief
              </h1>
              {/* Emotional sub-headline — preserves conversion intent of the original H1 */}
              <p className="text-[1.0625rem] sm:text-[1.1875rem] lg:text-[1.25rem] text-white/90 font-heading italic leading-[1.35] mb-4">
                A family in Gaza needs you right now.
              </p>
              <p className="text-[0.875rem] sm:text-[0.9375rem] text-white/65 mb-5 leading-[1.7] max-w-[24rem]">
                Displaced families urgently need food, clean water, medical
                supplies, and shelter. Your donation is delivered directly by
                our teams on the ground.
              </p>
              <div className="flex flex-wrap items-center gap-2.5 mb-7 text-[11px] text-white/45 font-medium">
                <span>Charity No. 1158608</span>
                <span className="text-white/20">·</span>
                <span>100% pledge on emergency relief</span>
                <span className="text-white/20">·</span>
                <span>Gift Aid Eligible</span>
              </div>
              {/* Desktop-only CTA — on mobile the form sits directly below */}
              <div className="hidden lg:block">
                <Button variant="primary" href="#donate-form">
                  Help a Family Now
                </Button>
              </div>
            </div>

            {/* Mobile-only donation form card, integrated into hero */}
            <div
              id="donate-form-mobile"
              className="lg:hidden mt-8 bg-white rounded-2xl shadow-2xl ring-1 ring-black/5 p-6 sm:p-7 scroll-mt-20"
            >
              <DonationForm />
            </div>
          </div>

          <ProofTag location="Gaza" position="bottom-right" />
        </section>

        {/* ─── 2. Donation Panel (desktop only — mobile has it integrated into hero) ─── */}
        <section id="donate-form" className="hidden lg:block pt-16 md:pt-24 pb-4 md:pb-6 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-10 lg:gap-12 items-center">
              {/* Image */}
              <div className="relative rounded-2xl overflow-hidden aspect-[5/4]">
                <Image
                  src="/images/gaza-aid-distribution-2.webp"
                  alt="Deen Relief worker delivering aid to a child in a Gaza displacement camp"
                  fill
                  className="object-cover object-[center_45%]"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
                <ProofTag location="Gaza" date="2026" />
              </div>

              {/* Donation Form */}
              <DonationForm />
            </div>
          </div>
        </section>

        {/* ─── 3. Partners ─── */}
        <Partners />

        {/* ─── 4. What Your Donation Funds (image + text) ─── */}
        <section className="py-16 md:py-24 bg-cream">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-stretch">
              {/* Content */}
              <div>
                <span className="inline-block text-[11px] font-bold tracking-[0.1em] uppercase text-green mb-3">
                  Where Your Donation Goes
                </span>
                <h2 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal leading-tight mb-4">
                  Direct Relief for Families in Gaza
                </h2>

                {/* Mobile-only inline image — restores photographic proof after the hero-integrated donation panel */}
                <div className="lg:hidden relative rounded-2xl overflow-hidden aspect-[4/3] mb-6">
                  <Image
                    src="/images/palestine-relief.webp"
                    alt="Deen Relief worker distributing aid to a family in a Gaza displacement camp"
                    fill
                    className="object-cover object-[center_37%]"
                    sizes="100vw"
                  />
                  <ProofTag location="Gaza" />
                </div>

                <p className="text-grey text-base sm:text-[1.0625rem] leading-[1.7] mb-6">
                  When families are displaced by conflict, they lose
                  everything. Your donation provides the essentials they need
                  to survive — delivered directly by our teams on the ground.
                </p>

                <div className="space-y-4">
                  {[
                    { title: "Food & Clean Water", description: "Hot meals, nutrition packs, and safe drinking water for displaced families" },
                    { title: "Medical Supplies", description: "Urgent care supplies, trauma kits, and medication for injured and vulnerable families" },
                    { title: "Shelter & Essentials", description: "Blankets, hygiene kits, and household basics for families with nothing" },
                    { title: "Prepared Aid Stocks", description: "Pre-packed family kits ready for rapid distribution when crisis escalates" },
                  ].map((item) => (
                    <div key={item.title} className="flex gap-3 items-start">
                      <svg className="w-5 h-5 text-green flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
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
              </div>

              {/* Image — desktop only; mobile has an inline copy above, directly after the H2 */}
              <div className="hidden lg:block relative rounded-2xl overflow-hidden min-h-[300px]">
                <Image
                  src="/images/palestine-relief.webp"
                  alt="Deen Relief worker distributing aid to a family in a Gaza displacement camp"
                  fill
                  className="object-cover object-[center_37%]"
                  sizes="50vw"
                />
                <ProofTag location="Gaza" />
              </div>
            </div>
          </div>
        </section>

        {/* ─── 5. Field Evidence ─── */}
        <section className="py-16 md:py-24 bg-white">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <span className="inline-block text-[11px] font-bold tracking-[0.1em] uppercase text-green mb-3">
                On the Ground
              </span>
              <h2 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal leading-tight mb-3">
                We Don&apos;t Send Aid From a Distance
              </h2>
              <p className="text-grey text-base sm:text-[1.0625rem] leading-[1.7]">
                Our teams are physically present in Gaza, distributing aid
                directly to families in displacement camps.
              </p>
            </div>

            {/* ── Mobile layout: video, then 2 images stacked ── */}
            <div className="grid gap-3 lg:hidden">
              {/* Poster-first on mobile: the 9.6 MB field video only
                  downloads if the user taps play. Saves every mobile
                  visitor the whole weight otherwise. */}
              <div className="relative rounded-2xl overflow-hidden aspect-[4/5] bg-charcoal">
                <LazyVideo
                  src="/videos/gaza-field.mp4"
                  poster="/images/gaza-aid-handover.jpeg"
                  alt="Deen Relief field team distributing aid in Gaza"
                  posterSizes="100vw"
                  posterObjectPosition="center 30%"
                />
                <ProofTag location="Gaza" />
              </div>
              <div className="relative rounded-2xl overflow-hidden aspect-[3/4]">
                <Image
                  src="/images/gaza-aid-packing.webp"
                  alt="Deen Relief worker packing aid supplies in front of Deen Relief Palestine Relief Campaign banner"
                  fill
                  className="object-cover object-[center_30%]"
                  sizes="100vw"
                />
                <ProofTag location="Gaza" />
              </div>
              <div className="relative rounded-2xl overflow-hidden aspect-[3/4]">
                <Image
                  src="/images/gaza-aid-distribution-3.webp"
                  alt="Deen Relief Palestine Relief Campaign worker distributing aid to a woman"
                  fill
                  className="object-cover object-[center_30%]"
                  sizes="100vw"
                />
                <ProofTag location="Gaza" date="2026" position="bottom-right" />
              </div>
            </div>

            {/* ── Desktop layout: video square left (50%), 2 images stacked right (50%) ── */}
            <div className="hidden lg:grid lg:grid-cols-2 gap-4">
              {/* Left column — video, square aspect, full height of section */}
              <div className="relative rounded-2xl overflow-hidden aspect-square bg-charcoal">
                <video
                  className="w-full h-full object-cover"
                  src="/videos/gaza-field.mp4"
                  poster="/images/gaza-aid-handover.jpeg"
                  preload="metadata"
                  playsInline
                  muted
                  loop
                  autoPlay
                  controls
                />
                <ProofTag location="Gaza" />
              </div>

              {/* Right column — 2 images stacked, each filling half the video's height */}
              <div className="grid grid-rows-2 gap-4">
                <div className="relative rounded-2xl overflow-hidden">
                  <Image
                    src="/images/gaza-aid-distribution-3.webp"
                    alt="Deen Relief Palestine Relief Campaign worker distributing aid to a woman"
                    fill
                    className="object-cover object-[center_30%]"
                    sizes="50vw"
                  />
                  <ProofTag location="Gaza" date="2026" position="bottom-right" />
                </div>
                <div className="relative rounded-2xl overflow-hidden">
                  <Image
                    src="/images/gaza-aid-packing.webp"
                    alt="Deen Relief worker packing aid supplies in front of Deen Relief Palestine Relief Campaign banner"
                    fill
                    className="object-cover object-[center_30%]"
                    sizes="50vw"
                  />
                  <ProofTag location="Gaza" />
                </div>
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
                From Your Donation to a Family in Gaza
              </h2>
              <p className="text-grey text-base sm:text-[1.0625rem] leading-[1.7]">
                Your donation is not just sent — it is verified, allocated,
                and reported with full transparency.
              </p>
            </div>

            {/* 3-Step Process */}
            <div className="grid sm:grid-cols-3 gap-8 max-w-4xl mx-auto mb-12">
              {[
                {
                  step: "01",
                  title: "We Verify",
                  description:
                    "Our field teams identify urgent household needs on the ground in Gaza, prioritising the most vulnerable families.",
                },
                {
                  step: "02",
                  title: "We Allocate",
                  description:
                    "Funds are directed where pressure is highest. Every pound goes to the families who need it most.",
                },
                {
                  step: "03",
                  title: "We Report",
                  description:
                    "Audited reports published through the Charity Commission. Full transparency, always.",
                },
              ].map((item) => (
                <div key={item.step} className="text-center">
                  <span className="inline-block text-3xl font-heading font-bold text-green/20 mb-3">
                    {item.step}
                  </span>
                  <h3 className="font-heading font-bold text-lg text-charcoal mb-2">
                    {item.title}
                  </h3>
                  <p className="text-grey/80 text-[0.8125rem] leading-[1.6]">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>

            {/* Trust Stats Row */}
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12px] text-charcoal/40 font-medium">
              <span>Charity No. 1158608</span>
              <span className="text-charcoal/15">|</span>
              <span>100% pledge on emergency relief</span>
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
                Common Questions About Palestine Relief
              </h2>
            </div>

            <FaqAccordion faqs={faqs} />
          </div>
        </section>

        {/* ─── 8. Final CTA — integrated mini donation picker ─── */}
        <section className="py-12 md:py-16 bg-green-dark">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-xl sm:text-2xl font-heading font-bold text-white mb-2">
              A Family in Gaza Needs Your Help Today
            </h2>
            <p className="text-white/55 text-sm mb-5">
              Every donation verified. Every pound tracked. Every family
              reached.
            </p>
            <MiniDonationPicker />
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
