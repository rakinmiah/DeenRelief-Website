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
    { value: 100, label: "£100", outcome: "Funds a month of teacher salary in a rural school" },
    { value: 250, label: "£250", outcome: "Provides learning materials for an entire classroom", default: true },
    { value: 500, label: "£500", outcome: "Funds construction materials for a classroom" },
    { value: 1000, label: "£1,000", outcome: "Builds a complete classroom for a rural school" },
  ],
  monthly: [
    { value: 25, label: "£25", outcome: "Contributes monthly to classroom construction" },
    { value: 50, label: "£50", outcome: "Covers ongoing teacher salary support", default: true },
    { value: 100, label: "£100", outcome: "Funds monthly learning materials and school maintenance" },
    { value: 250, label: "£250", outcome: "Sustains comprehensive school development each month" },
  ],
};

type Frequency = "one-time" | "monthly";

export default function BuildASchoolPage() {
  /* ── Donation panel state ── */
  const [frequency, setFrequency] = useState<Frequency>("one-time");
  const [selectedAmount, setSelectedAmount] = useState(250);
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
              <h1 className="text-[1.75rem] sm:text-[2.25rem] lg:text-[2.5rem] leading-[1.18] sm:leading-[1.14] lg:leading-[1.12] text-white font-heading font-bold mb-4 tracking-[-0.02em]">
                Build a School,{"\n"}Change Generations
              </h1>
              <p className="text-[0.875rem] sm:text-[0.9375rem] text-white/65 mb-5 leading-[1.7] max-w-[24rem]">
                Fund classroom construction and teacher salaries to give
                children in rural Bangladesh access to primary education — a
                lasting Sadaqah Jariyah.
              </p>
              <div className="flex flex-wrap items-center gap-2.5 mb-7 text-[11px] text-white/45 font-medium">
                <span>Charity No. 1158608</span>
                <span className="text-white/20">·</span>
                <span>Gift Aid Eligible</span>
                <span className="text-white/20">·</span>
                <span>Sadaqah Jariyah</span>
              </div>
              <Button variant="primary" href="#donate-form">
                Fund a Classroom
              </Button>
            </div>
          </div>

          <ProofTag location="Bangladesh" position="bottom-right" />
        </section>

        {/* ─── 2. Donation Panel (centred, bordered) ─── */}
        <section id="donate-form" className="pt-16 md:pt-24 pb-4 md:pb-6 bg-white">
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
              <div className="text-center mb-8">
                <span className="inline-block text-[11px] font-bold tracking-[0.1em] uppercase text-green mb-3">
                  Build a School
                </span>
                <h2 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal leading-tight mb-3">
                  Invest in a Child&apos;s Education
                </h2>
                <p className="text-grey text-base sm:text-[1.0625rem] leading-[1.7] mb-2">
                  Your donation funds classrooms and teachers. Gift Aid adds
                  25%.
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
                  aria-label="Enter a custom donation amount in pounds"
                />
              </div>

              {/* Outcome Label */}
              {currentOutcome && (
                <p className="text-sm text-green font-medium mb-4 flex items-center justify-center gap-2 text-center">
                  <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
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
                Donate £{selectedAmount || customAmount || "0"}
                {frequency === "monthly" ? "/month" : ""} Now
              </Button>

              {/* Trust Microcopy */}
              <div className="flex flex-wrap items-center justify-center gap-2.5 mt-5 text-[11px] text-grey/60 font-medium">
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

              {/* Image */}
              <div className="relative rounded-2xl overflow-hidden aspect-[4/3]">
                <Image
                  src="/images/hero-bangladesh-community.webp"
                  alt="Deen Relief team with a large group of smiling children in Bangladesh"
                  fill
                  className="object-cover object-center"
                  sizes="(max-width: 1024px) 100vw, 50vw"
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

            <div className="space-y-5 max-w-xl mx-auto mb-8">
              {[
                "Classroom construction in underserved rural areas",
                "Teacher recruitment and salary funding",
                "Learning materials — books, stationery, and supplies",
                "Safe, clean learning environments for children",
                "Access to primary education for children who had none",
              ].map((item) => (
                <div key={item} className="flex gap-3 items-center">
                  <svg className="w-5 h-5 text-green flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
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

        {/* ─── 6. Final CTA ─── */}
        <section className="py-10 md:py-12 bg-green-dark">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-xl sm:text-2xl font-heading font-bold text-white mb-2">
              Give the Gift of Education
            </h2>
            <p className="text-white/55 text-sm mb-6">
              A classroom built today changes lives for generations to come.
            </p>
            <Button variant="primary" href="#donate-form">
              Fund a Classroom Now
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
