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
  "one-time": [
    { value: 50, label: "£50", outcome: "Contributes to a community tube well in rural Bangladesh" },
    { value: 150, label: "£150", outcome: "Funds a tube well providing safe water for a rural village", default: true },
    { value: 300, label: "£300", outcome: "Funds a deep tube well with filtration system" },
    { value: 500, label: "£500", outcome: "Funds a comprehensive water point serving multiple families" },
  ],
  monthly: [
    { value: 10, label: "£10", outcome: "Supports ongoing water programme maintenance" },
    { value: 25, label: "£25", outcome: "Contributes monthly to new well construction", default: true },
    { value: 50, label: "£50", outcome: "Funds ongoing clean water access for a community each month" },
    { value: 100, label: "£100", outcome: "Sustains comprehensive water infrastructure development" },
  ],
};

type Frequency = "one-time" | "monthly";

/* ── FAQ data ── */
const faqs = [
  {
    question: "What does my donation fund?",
    answer:
      "Your donation funds the construction of tube wells and filtration systems in rural Bangladesh. This includes materials, installation, and initial maintenance to ensure communities have reliable access to safe drinking water.",
  },
  {
    question: "Is this Sadaqah Jariyah?",
    answer:
      "Yes. A water well is one of the most recognised forms of Sadaqah Jariyah (ongoing charity) in Islam. The well continues to provide clean water for years, and you continue to earn reward for as long as people benefit from it.",
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
  },
];

export default function CleanWaterPage() {
  /* ── Donation panel state ── */
  const [frequency, setFrequency] = useState<Frequency>("one-time");
  const [selectedAmount, setSelectedAmount] = useState(150);
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
      <Header />

      <main id="main-content" className="flex-1">
        {/* ─── 1. Hero ─── */}
        <section className="relative min-h-[45vh] md:min-h-[50vh] flex items-end mt-[60px] md:mt-[64px]">
          <div className="absolute inset-0 z-0">
            <Image
              src="/images/bangladesh-school-v2.webp"
              alt="Children holding papers in front of a Deen Relief school in rural Bangladesh"
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
              <h1 className="text-[1.75rem] sm:text-[2.25rem] lg:text-[2.5rem] leading-[1.18] sm:leading-[1.14] lg:leading-[1.12] text-white font-heading font-bold mb-4 tracking-[-0.02em]">
                Clean Water for{"\n"}Communities That Have None
              </h1>
              <p className="text-[0.875rem] sm:text-[0.9375rem] text-white/65 mb-5 leading-[1.7] max-w-[24rem]">
                Fund a tube well in rural Bangladesh. Provide safe drinking
                water for an entire community — a lasting Sadaqah Jariyah.
              </p>
              <div className="flex flex-wrap items-center gap-2.5 mb-7 text-[11px] text-white/45 font-medium">
                <span>Charity No. 1158608</span>
                <span className="text-white/20">·</span>
                <span>Gift Aid Eligible</span>
                <span className="text-white/20">·</span>
                <span>Sadaqah Jariyah</span>
              </div>
              <Button variant="primary" href="#donate-form">
                Fund a Well
              </Button>
            </div>
          </div>

          <ProofTag location="Bangladesh" position="bottom-right" />
        </section>

        {/* ─── 2. Donation Panel (two-column with image) ─── */}
        <section id="donate-form" className="pt-16 md:pt-24 pb-4 md:pb-6 bg-white">
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

              {/* Donation Form */}
              <div>
                {/* Hadith */}
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

                <span className="inline-block text-[11px] font-bold tracking-[0.1em] uppercase text-green mb-3">
                  Fund a Well
                </span>
                <h2 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal leading-tight mb-3">
                  Provide Water That Lasts
                </h2>
                <p className="text-grey text-base sm:text-[1.0625rem] leading-[1.7] mb-1">
                  Your donation builds permanent water infrastructure. Gift
                  Aid adds 25%.
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
                    With Gift Aid: £{Math.round((selectedAmount || Number(customAmount) || 0) * 1.25).toLocaleString()}
                    {frequency === "monthly" ? "/month" : ""} at no extra cost
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
                  <span>Sadaqah Jariyah</span>
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

              {/* Image */}
              <div className="relative rounded-2xl overflow-hidden aspect-[4/3]">
                <Image
                  src="/images/zakat-bangladesh-family.webp"
                  alt="A family standing in front of their Deen Relief housing project in Bangladesh"
                  fill
                  className="object-cover object-[center_20%]"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
                <ProofTag location="Bangladesh" position="bottom-right" />
              </div>
            </div>
          </div>
        </section>

        {/* ─── 5. What Clean Water Provides ─── */}
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

            <div className="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
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
                  className="bg-cream border border-charcoal/5 rounded-2xl p-6 text-center"
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

        {/* ─── 7. Final CTA ─── */}
        <section className="py-10 md:py-12 bg-green-dark">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-xl sm:text-2xl font-heading font-bold text-white mb-2">
              Give the Gift of Clean Water
            </h2>
            <p className="text-white/55 text-sm mb-6">
              A well built today provides water for years to come.
            </p>
            <Button variant="primary" href="#donate-form">
              Fund a Well Now
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
