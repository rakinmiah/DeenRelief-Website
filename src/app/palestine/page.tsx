"use client";

import { useState } from "react";
import Image from "next/image";
import Header from "@/components/Header";
import Button from "@/components/Button";
import ProofTag from "@/components/ProofTag";
import Partners from "@/components/Partners";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";

/* ── Donation amount data ── */
const donationAmounts = {
  "one-time": [
    { value: 25, label: "£25", outcome: "Provides a food parcel for a family of five for one week" },
    { value: 50, label: "£50", outcome: "Feeds a displaced family of five in Gaza for one month", default: true },
    { value: 100, label: "£100", outcome: "Supplies clean water and medical essentials for a family of five" },
    { value: 250, label: "£250", outcome: "Provides shelter, blankets, and household basics for a displaced family" },
  ],
  monthly: [
    { value: 10, label: "£10", outcome: "Provides ongoing clean water access for a family of five" },
    { value: 25, label: "£25", outcome: "Feeds a displaced family of five every month", default: true },
    { value: 50, label: "£50", outcome: "Covers monthly medical supplies and food for a family of five" },
    { value: 100, label: "£100", outcome: "Sustains comprehensive monthly support for a family of five" },
  ],
};

type Frequency = "one-time" | "monthly";

/* ── FAQ data ── */
const faqs = [
  {
    question: "How does my donation reach families in Gaza?",
    answer:
      "Our field teams work with verified local partners to identify the most vulnerable families. Aid is distributed directly — food parcels, clean water, medical supplies, and shelter materials are delivered hand-to-hand to families in displacement camps and affected areas.",
  },
  {
    question: "Is my donation eligible for Gift Aid?",
    answer:
      "Yes. If you are a UK taxpayer, we can claim an extra 25% on your donation at no additional cost to you. Simply check the Gift Aid box during checkout — your £100 becomes £125.",
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
  },
  {
    question: "How is Deen Relief regulated?",
    answer:
      "Deen Relief is registered with the Charity Commission (No. 1158608) and Companies House (No. 08593822). Our accounts are publicly audited and filed annually.",
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
  /* ── Donation panel state ── */
  const [frequency, setFrequency] = useState<Frequency>("one-time");
  const [selectedAmount, setSelectedAmount] = useState(50);
  const [customAmount, setCustomAmount] = useState("");

  const amounts = donationAmounts[frequency];
  const isCustom = !amounts.some((a) => a.value === selectedAmount);
  const currentOutcome =
    amounts.find((a) => a.value === selectedAmount)?.outcome ?? "";

  const handleFrequencyChange = (f: Frequency) => {
    setFrequency(f);
    setCustomAmount("");
    const defaultAmount = donationAmounts[f].find((a) => a.default);
    setSelectedAmount(defaultAmount?.value ?? donationAmounts[f][1].value);
  };

  /* ── FAQ accordion state ── */
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <>
      <JsonLd data={faqSchema} />
      <Header />

      <main id="main-content" className="flex-1">
        {/* ─── 1. Hero ─── */}
        <section className="relative min-h-[45vh] md:min-h-[50vh] flex items-end mt-[60px] md:mt-[64px]">
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
              <h1 className="text-[1.75rem] sm:text-[2.25rem] lg:text-[2.5rem] leading-[1.18] sm:leading-[1.14] lg:leading-[1.12] text-white font-heading font-bold mb-4 tracking-[-0.02em]">
                A Family in Gaza Needs You Right Now
              </h1>
              <p className="text-[0.875rem] sm:text-[0.9375rem] text-white/65 mb-5 leading-[1.7] max-w-[24rem]">
                Displaced families in Gaza urgently need food, clean water,
                medical supplies, and shelter. Your donation is delivered
                directly by our teams on the ground.
              </p>
              <div className="flex flex-wrap items-center gap-2.5 mb-7 text-[11px] text-white/45 font-medium">
                <span>Charity No. 1158608</span>
                <span className="text-white/20">·</span>
                <span>100% to Relief</span>
                <span className="text-white/20">·</span>
                <span>Gift Aid Eligible</span>
              </div>
              <Button variant="primary" href="#donate-form">
                Help a Family Now
              </Button>
            </div>
          </div>

          <ProofTag location="Gaza" position="bottom-right" />
        </section>

        {/* ─── 2. Donation Panel (two-column with image) ─── */}
        <section id="donate-form" className="pt-16 md:pt-24 pb-4 md:pb-6 bg-white">
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
              <div>
                <span className="inline-block text-[11px] font-bold tracking-[0.1em] uppercase text-green mb-3">
                  Urgent Appeal
                </span>
                <h2 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal leading-tight mb-3">
                  Help a Family Survive Today
                </h2>
                <p className="text-grey text-base sm:text-[1.0625rem] leading-[1.7] mb-1">
                  Takes under 2 minutes. Your £100 becomes £125 with Gift Aid.
                </p>
                <p className="text-green text-xs font-semibold mb-6">
                  Trusted by 3,200+ donors since 2013
                </p>

                {/* Frequency Toggle */}
                <div className="flex items-center gap-1 mb-5 bg-grey-light rounded-full p-1 w-fit">
                  <button
                    onClick={() => handleFrequencyChange("one-time")}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                      frequency === "one-time"
                        ? "bg-white text-charcoal shadow-sm"
                        : "text-charcoal/50 hover:text-charcoal/70"
                    }`}
                  >
                    One-time
                  </button>
                  <button
                    onClick={() => handleFrequencyChange("monthly")}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                      frequency === "monthly"
                        ? "bg-white text-charcoal shadow-sm"
                        : "text-charcoal/50 hover:text-charcoal/70"
                    }`}
                  >
                    Monthly
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
                      className={`relative py-3 px-4 rounded-xl text-center font-semibold transition-all duration-200 border-2 ${
                        selectedAmount === amount.value
                          ? "border-green bg-green-light text-green"
                          : "border-grey-light bg-white text-charcoal hover:border-green/40"
                      }`}
                    >
                      {amount.label}
                      {amount.default && selectedAmount !== amount.value && (
                        <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] bg-green text-white px-1.5 py-px rounded-full">
                          Popular
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Custom Amount */}
                <div className="relative mb-4">
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
                    className={`w-full pl-8 pr-4 py-3 rounded-xl border-2 text-charcoal placeholder:text-grey/50 transition-colors duration-200 focus:outline-none ${
                      isCustom
                        ? "border-green bg-green-light"
                        : "border-grey-light focus:border-green/40"
                    }`}
                    min="1"
                    aria-label="Enter a custom donation amount in pounds"
                  />
                </div>

                {/* Outcome Label */}
                {currentOutcome && (
                  <p className="text-sm text-green font-medium mb-3 flex items-center gap-2">
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
                  <p className="text-[13px] text-green/70 font-medium mb-5 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                    With Gift Aid: £{Math.round((selectedAmount || Number(customAmount) || 0) * 1.25).toLocaleString()} at no extra cost
                  </p>
                )}

                {/* CTA */}
                <Button
                  variant="primary"
                  size="lg"
                  href="#donate"
                  className="w-full sm:w-auto"
                >
                  Donate £{selectedAmount || customAmount || "0"}
                  {frequency === "monthly" ? "/month" : ""} Now
                </Button>

                {/* Trust Microcopy */}
                <div className="flex flex-wrap items-center gap-2.5 mt-5 text-[11px] text-grey/60 font-medium">
                  <span>100% to emergency relief</span>
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

              {/* Image */}
              <div className="relative rounded-2xl overflow-hidden min-h-[300px]">
                <Image
                  src="/images/gaza-aid-distribution-3.webp"
                  alt="Deen Relief worker with Palestine Relief Campaign branding distributing aid to a woman"
                  fill
                  className="object-cover object-[center_30%]"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
                <ProofTag location="Gaza" date="2026" position="bottom-right" />
              </div>
            </div>
          </div>
        </section>

        {/* ─── 5. Field Evidence ─── */}
        <section className="py-16 md:py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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

            {/* Photo Grid */}
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="relative rounded-2xl overflow-hidden aspect-[3/4]">
                <Image
                  src="/images/gaza-aid-distribution-1.webp"
                  alt="Deen Relief worker handing aid supplies to a family in Gaza"
                  fill
                  className="object-cover object-[center_25%]"
                  sizes="(max-width: 640px) 100vw, 33vw"
                />
                <ProofTag location="Gaza" />
              </div>
              <div className="relative rounded-2xl overflow-hidden aspect-[3/4]">
                <Image
                  src="/images/gaza-aid-distribution-3.webp"
                  alt="Deen Relief Palestine Relief Campaign worker distributing aid to a woman"
                  fill
                  className="object-cover object-[center_30%]"
                  sizes="(max-width: 640px) 100vw, 33vw"
                />
                <ProofTag location="Gaza" date="2026" position="bottom-right" />
              </div>
              <div className="relative rounded-2xl overflow-hidden aspect-[3/4]">
                <Image
                  src="/images/gaza-aid-packing.webp"
                  alt="Deen Relief worker packing aid supplies in front of Deen Relief Palestine Relief Campaign banner"
                  fill
                  className="object-cover object-[center_30%]"
                  sizes="(max-width: 640px) 100vw, 33vw"
                />
                <ProofTag location="Gaza" />
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
              <span>100% to relief</span>
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
              A Family in Gaza Needs Your Help Today
            </h2>
            <p className="text-white/55 text-sm mb-6">
              Every donation verified. Every pound tracked. Every family
              reached.
            </p>
            <Button variant="primary" href="#donate-form">
              Help a Family Now
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
