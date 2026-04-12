"use client";

import { useState } from "react";
import Image from "next/image";
import Header from "@/components/Header";
import Button from "@/components/Button";
import ProofTag from "@/components/ProofTag";
import Partners from "@/components/Partners";
import Footer from "@/components/Footer";

/* ── Donation amount data ── */
const donationAmounts = {
  monthly: [
    { value: 30, label: "£30", outcome: "Sponsors one child — education, nutrition, shelter, and healthcare", default: true },
    { value: 50, label: "£50", outcome: "Sponsors one child with enhanced support and learning materials" },
    { value: 75, label: "£75", outcome: "Sponsors one child with comprehensive family support" },
    { value: 100, label: "£100", outcome: "Sponsors one child and contributes to community development" },
  ],
  "one-time": [
    { value: 50, label: "£50", outcome: "Provides a month of education and meals for a child" },
    { value: 100, label: "£100", outcome: "Covers three months of school fees and learning materials", default: true },
    { value: 250, label: "£250", outcome: "Provides six months of comprehensive support for a child" },
    { value: 500, label: "£500", outcome: "Funds a full year of education and nutrition for a child" },
  ],
};

type Frequency = "one-time" | "monthly";

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
  },
  {
    question: "Can I sponsor more than one child?",
    answer:
      "Yes. You can set up multiple sponsorships — each at £30/month — to support additional children. Contact us at info@deenrelief.org to arrange this.",
  },
];

export default function OrphanSponsorshipPage() {
  /* ── Donation panel state ── */
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [selectedAmount, setSelectedAmount] = useState(30);
  const [customAmount, setCustomAmount] = useState("");

  const amounts = donationAmounts[frequency];
  const isCustom = !amounts.some((a) => a.value === selectedAmount);
  const currentOutcome =
    amounts.find((a) => a.value === selectedAmount)?.outcome ?? "";

  const handleFrequencyChange = (f: Frequency) => {
    setFrequency(f);
    setCustomAmount("");
    const defaultAmount = donationAmounts[f].find((a) => a.default);
    setSelectedAmount(defaultAmount?.value ?? donationAmounts[f][0].value);
  };

  /* ── FAQ accordion state ── */
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <>
      <Header />

      <main id="main-content" className="flex-1">
        {/* ─── 1. Hero ─── */}
        <section className="relative min-h-[45vh] md:min-h-[50vh] flex items-end mt-[60px] md:mt-[64px]">
          <div className="absolute inset-0 z-0">
            <Image
              src="/images/orphan-sponsorship.jpg"
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
              <h1 className="text-[1.75rem] sm:text-[2.25rem] lg:text-[2.5rem] leading-[1.18] sm:leading-[1.14] lg:leading-[1.12] text-white font-heading font-bold mb-4 tracking-[-0.02em]">
                Give a Child a Future{"\n"}for £30 a Month
              </h1>
              <p className="text-[0.875rem] sm:text-[0.9375rem] text-white/65 mb-5 leading-[1.7] max-w-[24rem]">
                Your monthly sponsorship provides education, nutrition, safe
                shelter, and healthcare for an orphaned child in Bangladesh.
              </p>
              <div className="flex flex-wrap items-center gap-2.5 mb-7 text-[11px] text-white/45 font-medium">
                <span>Charity No. 1158608</span>
                <span className="text-white/20">·</span>
                <span>Gift Aid Eligible</span>
                <span className="text-white/20">·</span>
                <span>Cancel Anytime</span>
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
              {/* Image */}
              <div className="relative rounded-2xl overflow-hidden min-h-[300px]">
                <Image
                  src="/images/children-smiling-deenrelief.webp"
                  alt="Three smiling children holding Deen Relief signs in a safe home environment"
                  fill
                  className="object-cover object-[center_40%]"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
                <ProofTag location="Bangladesh" />
              </div>

              {/* Breakdown */}
              <div>
                <span className="inline-block text-[11px] font-bold tracking-[0.1em] uppercase text-green mb-3">
                  What Your Sponsorship Provides
                </span>
                <h2 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal leading-tight mb-4">
                  Everything a Child Needs to Thrive
                </h2>
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

                <Button variant="secondary" href="#sponsor-form">
                  Sponsor a Child — £30/month
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* ─── 3. Partners ─── */}
        <Partners />

        {/* ─── 4. Donation Panel ─── */}
        <section id="sponsor-form" className="py-16 md:py-24 bg-cream">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="border border-charcoal/8 rounded-2xl p-6 sm:p-8 bg-white">
              <div className="text-center mb-8">
                <span className="inline-block text-[11px] font-bold tracking-[0.1em] uppercase text-green mb-3">
                  Sponsor Now
                </span>
                <h2 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal leading-tight mb-3">
                  Start Your Sponsorship Today
                </h2>
                <p className="text-grey text-base sm:text-[1.0625rem] leading-[1.7] mb-2">
                  £30/month. Gift Aid adds 25%. Cancel anytime.
                </p>
                <p className="text-green text-xs font-semibold">
                  Trusted by 3,200+ donors since 2013
                </p>
              </div>

              {/* Frequency Toggle — defaults to Monthly */}
              <div className="flex items-center justify-center gap-1 mb-6 bg-grey-light rounded-full p-1 w-fit mx-auto">
                <button
                  onClick={() => handleFrequencyChange("monthly")}
                  className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                    frequency === "monthly"
                      ? "bg-white text-charcoal shadow-sm"
                      : "text-charcoal/50 hover:text-charcoal/70"
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => handleFrequencyChange("one-time")}
                  className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                    frequency === "one-time"
                      ? "bg-white text-charcoal shadow-sm"
                      : "text-charcoal/50 hover:text-charcoal/70"
                  }`}
                >
                  One-time
                </button>
              </div>

              {/* Amount Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                {amounts.map((amount) => (
                  <button
                    key={amount.value}
                    onClick={() => {
                      setSelectedAmount(amount.value);
                      setCustomAmount("");
                    }}
                    className={`relative py-3.5 px-4 rounded-xl text-center font-semibold transition-all duration-200 border-2 ${
                      selectedAmount === amount.value
                        ? "border-green bg-green-light text-green"
                        : "border-grey-light bg-white text-charcoal hover:border-green/40"
                    }`}
                  >
                    {amount.label}
                    {amount.default && selectedAmount !== amount.value && (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] bg-green text-white px-1.5 py-px rounded-full">
                        {frequency === "monthly" ? "Recommended" : "Popular"}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Custom Amount */}
              <div className="relative mb-5">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-grey font-medium">
                  £
                </span>
                <input
                  type="number"
                  placeholder="Custom amount"
                  value={customAmount}
                  onChange={(e) => {
                    setCustomAmount(e.target.value);
                    setSelectedAmount(Number(e.target.value) || 0);
                  }}
                  onFocus={() => setSelectedAmount(0)}
                  className={`w-full pl-8 pr-4 py-3.5 rounded-xl border-2 text-charcoal placeholder:text-grey/50 transition-colors duration-200 focus:outline-none ${
                    isCustom
                      ? "border-green bg-green-light"
                      : "border-grey-light focus:border-green/40"
                  }`}
                  min="1"
                  aria-label="Enter a custom sponsorship amount in pounds"
                />
              </div>

              {/* Outcome Label */}
              {currentOutcome && (
                <p className="text-sm text-green font-medium mb-4 flex items-center justify-center gap-2 text-center">
                  <svg
                    className="w-4 h-4 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {currentOutcome}
                </p>
              )}

              {/* Gift Aid callout */}
              {(selectedAmount > 0 || customAmount) && (
                <p className="text-[13px] text-green/70 font-medium mb-6 flex items-center justify-center gap-1.5 text-center">
                  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                  With Gift Aid: £{Math.round((selectedAmount || Number(customAmount) || 0) * 1.25).toLocaleString()}
                  {frequency === "monthly" ? "/month" : ""} at no extra cost
                </p>
              )}

              {/* CTA */}
              <Button
                variant="primary"
                size="lg"
                href="#donate"
                className="w-full justify-center"
              >
                {frequency === "monthly"
                  ? `Sponsor a Child — £${selectedAmount || customAmount || "0"}/month`
                  : `Donate £${selectedAmount || customAmount || "0"} Now`}
              </Button>

              {/* Trust Microcopy */}
              <div className="flex flex-wrap items-center justify-center gap-2.5 mt-5 text-[11px] text-grey/60 font-medium">
                <span>100% to child support</span>
                <span className="text-grey/25">·</span>
                <span>Gift Aid adds 25% at no cost</span>
                <span className="text-grey/25">·</span>
                <span>
                  {frequency === "monthly"
                    ? "Cancel anytime"
                    : "Reg. charity 1158608"}
                </span>
              </div>
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

              {/* Image */}
              <div className="relative rounded-2xl overflow-hidden aspect-[4/3]">
                <Image
                  src="/images/zakat-family-support.jpg"
                  alt="Deen Relief worker with a child and food supplies in Bangladesh"
                  fill
                  className="object-cover object-[center_25%]"
                  sizes="(max-width: 1024px) 100vw, 50vw"
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

            {/* 3-Step Process */}
            <div className="grid sm:grid-cols-3 gap-8 max-w-4xl mx-auto mb-12">
              {[
                {
                  step: "01",
                  title: "We Identify",
                  description:
                    "Our local partners identify orphaned children in greatest need across Bangladesh, assessing each case individually.",
                },
                {
                  step: "02",
                  title: "We Support",
                  description:
                    "Your £30/month is directed to education, nutrition, shelter, and healthcare for your sponsored child.",
                },
                {
                  step: "03",
                  title: "We Report",
                  description:
                    "Annual reports and audited financial statements are published openly through the Charity Commission.",
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
              <span>100% to child support</span>
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

            <div className="divide-y divide-charcoal/5">
              {faqs.map((faq, index) => (
                <div key={index}>
                  <button
                    onClick={() =>
                      setOpenFaq(openFaq === index ? null : index)
                    }
                    className="w-full flex items-center justify-between py-5 text-left group"
                  >
                    <span className="font-heading font-semibold text-[1.0625rem] text-charcoal pr-4 group-hover:text-green transition-colors duration-200">
                      {faq.question}
                    </span>
                    <svg
                      className={`w-5 h-5 flex-shrink-0 text-charcoal/30 transition-transform duration-200 ${
                        openFaq === index ? "rotate-180" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m19.5 8.25-7.5 7.5-7.5-7.5"
                      />
                    </svg>
                  </button>
                  {openFaq === index && (
                    <div className="pb-5">
                      <p className="text-grey text-base sm:text-[1.0625rem] leading-[1.7]">
                        {faq.answer}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── 8. Final CTA ─── */}
        <section className="py-10 md:py-12 bg-green-dark">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-xl sm:text-2xl font-heading font-bold text-white mb-2">
              A Child in Bangladesh Is Waiting
            </h2>
            <p className="text-white/55 text-sm mb-6">
              £30 a month. That&apos;s all it takes to change a life.
            </p>
            <Button variant="primary" href="#sponsor-form">
              Sponsor a Child Now
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
