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
    { value: 50, label: "£50", outcome: "Provides emergency food for a family for one month" },
    { value: 100, label: "£100", outcome: "Covers medical supplies for a child's treatment", default: true },
    { value: 250, label: "£250", outcome: "Funds shelter materials for a displaced family" },
    { value: 500, label: "£500", outcome: "Supports a family through three months of cancer care" },
  ],
  monthly: [
    { value: 25, label: "£25", outcome: "Provides ongoing food support for a family each month" },
    { value: 50, label: "£50", outcome: "Covers monthly medical supplies for a child in care", default: true },
    { value: 100, label: "£100", outcome: "Sustains a family through ongoing cancer treatment" },
    { value: 250, label: "£250", outcome: "Funds comprehensive monthly support for a displaced family" },
  ],
};

type Frequency = "one-time" | "monthly";

/* ── FAQ data ── */
const faqs = [
  {
    question: "Is my Zakat eligible for Gift Aid?",
    answer:
      "Yes. If you are a UK taxpayer, we can claim an extra 25% on your Zakat at no additional cost to you. Simply check the Gift Aid box during checkout — your £100 becomes £125.",
  },
  {
    question: "How do you ensure Zakat reaches eligible recipients?",
    answer:
      "Our trustees assess every case against established eligibility criteria before funds are released. We work with verified local partners to deliver support directly to those in need.",
  },
  {
    question: "Can I specify where my Zakat goes?",
    answer:
      "Yes. You can choose from four pathways: Emergency Relief, Medical Support, Family Essentials, or Recovery & Stability. If you prefer, unrestricted donations are directed to where the need is greatest.",
  },
  {
    question: "Do you have a 100% donation policy?",
    answer:
      "Yes. Your Zakat is ring-fenced for eligible recipients only. Administrative costs are covered separately, ensuring every penny of your Zakat reaches those who need it.",
  },
  {
    question: "How is Deen Relief regulated?",
    answer:
      "Deen Relief is registered with the Charity Commission (No. 1158608) and Companies House (No. 08593822). Our accounts are publicly audited and filed annually.",
  },
];

export default function ZakatPage() {
  /* ── Donation panel state ── */
  const [frequency, setFrequency] = useState<Frequency>("one-time");
  const [selectedAmount, setSelectedAmount] = useState(100);
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

  /* ── Zakat calculator state ── */
  const [assets, setAssets] = useState("");
  const [liabilities, setLiabilities] = useState("");
  const [nisab, setNisab] = useState("");
  const [zakatResult, setZakatResult] = useState<number | null>(null);

  const calculateZakat = () => {
    const netWealth = (parseFloat(assets) || 0) - (parseFloat(liabilities) || 0);
    const nisabValue = parseFloat(nisab) || 0;
    if (netWealth > nisabValue && nisabValue > 0) {
      setZakatResult(Math.round(netWealth * 0.025 * 100) / 100);
    } else {
      setZakatResult(0);
    }
  };

  const resetCalculator = () => {
    setAssets("");
    setLiabilities("");
    setNisab("");
    setZakatResult(null);
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
              src="/images/palestine-relief.jpg"
              alt="Deen Relief worker distributing aid to a family in Gaza"
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
                Fulfil Your Zakat{"\n"}With Confidence
              </h1>
              <p className="text-[0.875rem] sm:text-[0.9375rem] text-white/65 mb-5 leading-[1.7] max-w-[24rem]">
                100% Zakat policy. Every penny reaches eligible recipients.
                Trustee-verified before funds are released.
              </p>
              <div className="flex flex-wrap items-center gap-2.5 mb-7 text-[11px] text-white/45 font-medium">
                <span>Charity No. 1158608</span>
                <span className="text-white/20">·</span>
                <span>Gift Aid Eligible</span>
                <span className="text-white/20">·</span>
                <span>100% Zakat Policy</span>
              </div>
              <Button variant="primary" href="#zakat-form">
                Pay Zakat Now
              </Button>
            </div>
          </div>

          <ProofTag location="Gaza" position="bottom-right" />
        </section>

        {/* ─── 2. Donation Panel ─── */}
        <section id="zakat-form" className="pt-16 md:pt-24 pb-6 md:pb-8 bg-white">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Hadith */}
            <blockquote className="text-center mb-8 max-w-lg mx-auto">
              <p className="text-charcoal/40 text-sm italic leading-relaxed font-heading">
                &ldquo;Whoever pays the Zakat on his wealth will have its
                evil removed from him.&rdquo;
              </p>
              <cite className="text-charcoal/25 text-xs not-italic mt-1 block">
                — Ibn Khuzaimah &amp; At-Tabarani
              </cite>
            </blockquote>

            {/* Bordered form container */}
            <div className="border border-charcoal/8 rounded-2xl p-6 sm:p-8">
              <div className="text-center mb-8">
                <span className="inline-block text-[11px] font-bold tracking-[0.1em] uppercase text-green mb-3">
                  Pay Your Zakat
                </span>
                <h2 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal leading-tight mb-3">
                  Your Zakat, Delivered With Trust
                </h2>
                <p className="text-grey text-base sm:text-[1.0625rem] leading-[1.7] mb-2">
                  Takes under 2 minutes. Your £100 becomes £125 with Gift Aid.
                </p>
                <p className="text-green text-xs font-semibold">
                  Trusted by 3,200+ donors since 2013
                </p>
              </div>

              {/* Frequency Toggle */}
              <div className="flex items-center justify-center gap-1 mb-6 bg-grey-light rounded-full p-1 w-fit mx-auto">
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
                        Popular
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
                  aria-label="Enter a custom Zakat amount in pounds"
                />
              </div>

              {/* Outcome Label */}
              {currentOutcome && (
                <p className="text-sm text-green font-medium mb-6 flex items-center justify-center gap-2 text-center">
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
                  With Gift Aid: £{Math.round((selectedAmount || Number(customAmount) || 0) * 1.25).toLocaleString()} at no extra cost to you
                </p>
              )}

              {/* CTA */}
              <Button
                variant="primary"
                size="lg"
                href="#donate"
                className="w-full justify-center"
              >
                Pay Zakat £{selectedAmount || customAmount || "0"}
                {frequency === "monthly" ? "/month" : ""} Now
              </Button>

              {/* Trust Microcopy */}
              <div className="flex flex-wrap items-center justify-center gap-2.5 mt-5 text-[11px] text-grey/60 font-medium">
                <span>100% Zakat policy</span>
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

        {/* ─── Partners ─── */}
        <Partners />

        {/* ─── 3. Zakat Pathways ─── */}
        <section className="py-16 md:py-24 bg-cream">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <span className="inline-block text-[11px] font-bold tracking-[0.1em] uppercase text-green mb-3">
                Where Your Zakat Goes
              </span>
              <h2 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal leading-tight mb-3">
                Four Pathways of Impact
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
                  description:
                    "Rapid deployment to disaster zones — food, water, shelter for displaced families in Gaza and beyond.",
                  icon: (
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                    </svg>
                  ),
                },
                {
                  title: "Medical Support",
                  description:
                    "Cancer care for refugee children at Gulucuk Evi and medical assistance for vulnerable communities.",
                  icon: (
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
                    </svg>
                  ),
                },
                {
                  title: "Family Essentials",
                  description:
                    "Meals, shelter, and daily basics for families who have lost everything to conflict or crisis.",
                  icon: (
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                    </svg>
                  ),
                },
                {
                  title: "Recovery & Stability",
                  description:
                    "Long-term programmes for sustained recovery, education, and self-sufficiency.",
                  icon: (
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" />
                    </svg>
                  ),
                },
              ].map((pathway) => (
                <div
                  key={pathway.title}
                  className="bg-white border border-charcoal/5 rounded-2xl p-6 text-center"
                >
                  <div className="w-12 h-12 rounded-xl bg-green/10 text-green flex items-center justify-center mx-auto mb-4">
                    {pathway.icon}
                  </div>
                  <h3 className="font-heading font-bold text-[1.0625rem] text-charcoal mb-2">
                    {pathway.title}
                  </h3>
                  <p className="text-grey/80 text-[0.8125rem] leading-[1.6]">
                    {pathway.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── 4. Zakat Assurance ─── */}
        <section className="py-16 md:py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="inline-block text-[11px] font-bold tracking-[0.1em] uppercase text-green mb-3">
                Your Zakat Is An Amanah
              </span>
              <h2 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal leading-tight mb-3">
                How We Handle Your Zakat
              </h2>
              <p className="text-grey text-base sm:text-[1.0625rem] leading-[1.7]">
                Your donation is a sacred trust. Here is exactly how we
                steward it.
              </p>
            </div>

            {/* 3-Step Process */}
            <div className="grid sm:grid-cols-3 gap-8 max-w-4xl mx-auto mb-12">
              {[
                {
                  step: "01",
                  title: "We Assess",
                  description:
                    "Every case is reviewed by our trustees before funds are released. We verify eligibility against established Islamic criteria.",
                },
                {
                  step: "02",
                  title: "We Allocate",
                  description:
                    "Project-specific donations go directly to your chosen pathway. Unrestricted Zakat is directed where the need is greatest.",
                },
                {
                  step: "03",
                  title: "We Report",
                  description:
                    "Annual reports and audited financial statements are published openly on the Charity Commission website.",
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
              <span>Max 10% admin costs</span>
              <span className="text-charcoal/15">|</span>
              <span>Financial year-end: 31 July</span>
              <span className="text-charcoal/15">|</span>
              <span>Public annual reporting</span>
            </div>
          </div>
        </section>

        {/* ─── Field Evidence ─── */}
        <section className="py-16 md:py-24 bg-cream">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <span className="inline-block text-[11px] font-bold tracking-[0.1em] uppercase text-green mb-3">
                Your Zakat at Work
              </span>
              <h2 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal leading-tight mb-3">
                Real Families, Real Impact
              </h2>
              <p className="text-grey text-base sm:text-[1.0625rem] leading-[1.7]">
                Your Zakat reaches eligible recipients across multiple
                countries — from housing in Bangladesh to emergency relief
                in Gaza.
              </p>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="relative rounded-2xl overflow-hidden aspect-[5/6]">
                <Image
                  src="/images/zakat-bangladesh-family.webp"
                  alt="A family standing in front of their Deen Relief housing project in Bangladesh"
                  fill
                  className="object-cover object-[center_20%]"
                  sizes="(max-width: 640px) 100vw, 33vw"
                />
                <ProofTag location="Bangladesh" />
              </div>
              <div className="relative rounded-2xl overflow-hidden aspect-[5/6]">
                <Image
                  src="/images/zakat-family-support.jpg"
                  alt="Deen Relief worker with a child and food supplies in Bangladesh"
                  fill
                  className="object-cover object-[center_30%]"
                  sizes="(max-width: 640px) 100vw, 33vw"
                />
                <ProofTag location="Bangladesh" position="bottom-right" />
              </div>
              <div className="relative rounded-2xl overflow-hidden aspect-[5/6]">
                <Image
                  src="/images/cancer-care-housing.webp"
                  alt="Deen Relief worker sitting with a child in the family housing programme in Adana, Turkey"
                  fill
                  className="object-cover object-[center_35%]"
                  sizes="(max-width: 640px) 100vw, 33vw"
                />
                <ProofTag location="Adana, Turkey" />
              </div>
            </div>
          </div>
        </section>

        {/* ─── 5. Zakat Calculator ─── */}
        <section className="py-16 md:py-24 bg-white">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8">
              <span className="inline-block text-[11px] font-bold tracking-[0.1em] uppercase text-green mb-3">
                Zakat Calculator
              </span>
              <h2 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal leading-tight mb-3">
                Estimate Your Zakat
              </h2>
              <p className="text-grey text-base sm:text-[1.0625rem] leading-[1.7]">
                Planning tool only. Final Zakat may vary by scholarly
                opinion.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 sm:p-8">
              <div className="space-y-4 mb-6">
                {/* Assets */}
                <div>
                  <label
                    htmlFor="zakat-assets"
                    className="block text-sm font-medium text-charcoal mb-1.5"
                  >
                    Eligible assets
                  </label>
                  <p className="text-[0.75rem] text-grey/60 mb-2">
                    Cash, savings, gold/silver, trade goods, eligible
                    investments
                  </p>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-grey font-medium">
                      £
                    </span>
                    <input
                      id="zakat-assets"
                      type="number"
                      value={assets}
                      onChange={(e) => setAssets(e.target.value)}
                      placeholder="0"
                      className="w-full pl-8 pr-4 py-3 rounded-xl border-2 border-grey-light text-charcoal placeholder:text-grey/40 focus:outline-none focus:border-green/40 transition-colors duration-200"
                    />
                  </div>
                </div>

                {/* Liabilities */}
                <div>
                  <label
                    htmlFor="zakat-liabilities"
                    className="block text-sm font-medium text-charcoal mb-1.5"
                  >
                    Immediate liabilities
                  </label>
                  <p className="text-[0.75rem] text-grey/60 mb-2">
                    Debts and obligations due now
                  </p>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-grey font-medium">
                      £
                    </span>
                    <input
                      id="zakat-liabilities"
                      type="number"
                      value={liabilities}
                      onChange={(e) => setLiabilities(e.target.value)}
                      placeholder="0"
                      className="w-full pl-8 pr-4 py-3 rounded-xl border-2 border-grey-light text-charcoal placeholder:text-grey/40 focus:outline-none focus:border-green/40 transition-colors duration-200"
                    />
                  </div>
                </div>

                {/* Nisab */}
                <div>
                  <label
                    htmlFor="zakat-nisab"
                    className="block text-sm font-medium text-charcoal mb-1.5"
                  >
                    Nisab threshold
                  </label>
                  <p className="text-[0.75rem] text-grey/60 mb-2">
                    Current nisab value in GBP (changes with market prices)
                  </p>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-grey font-medium">
                      £
                    </span>
                    <input
                      id="zakat-nisab"
                      type="number"
                      value={nisab}
                      onChange={(e) => setNisab(e.target.value)}
                      placeholder="0"
                      className="w-full pl-8 pr-4 py-3 rounded-xl border-2 border-grey-light text-charcoal placeholder:text-grey/40 focus:outline-none focus:border-green/40 transition-colors duration-200"
                    />
                  </div>
                </div>
              </div>

              {/* Calculator Actions */}
              <div className="flex gap-3">
                <button
                  onClick={calculateZakat}
                  className="flex-1 py-3 rounded-full bg-green text-white font-semibold text-sm hover:bg-green-dark transition-colors duration-200 shadow-sm"
                >
                  Calculate Zakat
                </button>
                <button
                  onClick={resetCalculator}
                  className="px-5 py-3 rounded-full border border-charcoal/10 text-charcoal/60 font-medium text-sm hover:border-charcoal/20 transition-colors duration-200"
                >
                  Reset
                </button>
              </div>

              {/* Result */}
              {zakatResult !== null && (
                <div className="mt-6 p-5 rounded-xl bg-green-light/50 border border-green/10 text-center">
                  {zakatResult > 0 ? (
                    <>
                      <p className="text-sm text-charcoal/60 mb-1">
                        Your estimated Zakat is
                      </p>
                      <p className="text-3xl font-heading font-bold text-green-dark mb-4">
                        £{zakatResult.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                      </p>
                      <Button
                        variant="primary"
                        href="#zakat-form"
                        className="w-full justify-center"
                        onClick={() => {
                          setSelectedAmount(0);
                          setCustomAmount(String(Math.round(zakatResult)));
                        }}
                      >
                        Pay £{Math.round(zakatResult).toLocaleString()} Now
                      </Button>
                    </>
                  ) : (
                    <p className="text-sm text-charcoal/60">
                      Your net wealth is below the nisab threshold. Zakat
                      may not be due. Consult a scholar for guidance.
                    </p>
                  )}
                </div>
              )}

              <p className="text-[11px] text-charcoal/35 text-center mt-4">
                This is a planning tool only. Consult a scholar for specific
                rulings on your situation.
              </p>
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
                Zakat FAQs
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
              Your Zakat Can Change Lives Today
            </h2>
            <p className="text-white/55 text-sm mb-6">
              Every case verified. Every donation tracked. Every outcome
              reported.
            </p>
            <Button variant="primary" href="#zakat-form">
              Pay Your Zakat Now
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
