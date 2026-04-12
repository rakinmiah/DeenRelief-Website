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
    { value: 10, label: "£10", outcome: "Provides a meal for a family in need" },
    { value: 25, label: "£25", outcome: "Supplies essential items for a vulnerable child", default: true },
    { value: 50, label: "£50", outcome: "Funds emergency support for a family" },
    { value: 100, label: "£100", outcome: "Provides comprehensive support where it's needed most" },
  ],
  monthly: [
    { value: 5, label: "£5", outcome: "Provides ongoing meals for someone in need each month" },
    { value: 10, label: "£10", outcome: "Supplies monthly essentials for a vulnerable child", default: true },
    { value: 25, label: "£25", outcome: "Funds ongoing family support every month" },
    { value: 50, label: "£50", outcome: "Sustains comprehensive monthly aid — a lasting Sadaqah Jariyah" },
  ],
};

type Frequency = "one-time" | "monthly";

export default function SadaqahPage() {
  /* ── Donation panel state ── */
  const [frequency, setFrequency] = useState<Frequency>("one-time");
  const [selectedAmount, setSelectedAmount] = useState(25);
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
              src="/images/orphan-sponsorship.jpg"
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
              <h1 className="text-[1.75rem] sm:text-[2.25rem] lg:text-[2.5rem] leading-[1.18] sm:leading-[1.14] lg:leading-[1.12] text-white font-heading font-bold mb-4 tracking-[-0.02em]">
                Give Sadaqah,{"\n"}Earn Reward
              </h1>
              <p className="text-[0.875rem] sm:text-[0.9375rem] text-white/65 mb-5 leading-[1.7] max-w-[24rem]">
                Voluntary charity given freely, at any time, in any amount.
                Every act of generosity is rewarded.
              </p>
              <div className="flex flex-wrap items-center gap-2.5 mb-7 text-[11px] text-white/45 font-medium">
                <span>Charity No. 1158608</span>
                <span className="text-white/20">·</span>
                <span>Gift Aid Eligible</span>
                <span className="text-white/20">·</span>
                <span>Any Amount Counts</span>
              </div>
              <Button variant="primary" href="#donate-form">
                Give Sadaqah Now
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
                  src="/images/cancer-care-housing.webp"
                  alt="Deen Relief worker sitting with a child in the family housing programme"
                  fill
                  className="object-cover object-[center_35%]"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
                <ProofTag location="Adana, Turkey" />
              </div>

              {/* Donation Form */}
              <div>
                {/* Hadith */}
                <blockquote className="mb-6 max-w-lg">
                  <p className="text-charcoal/40 text-sm italic leading-relaxed font-heading">
                    &ldquo;Charity does not decrease wealth.&rdquo;
                  </p>
                  <cite className="text-charcoal/25 text-xs not-italic mt-1 block">
                    — Sahih Muslim
                  </cite>
                </blockquote>

                <span className="inline-block text-[11px] font-bold tracking-[0.1em] uppercase text-green mb-3">
                  Give Sadaqah
                </span>
                <h2 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal leading-tight mb-3">
                  Every Penny Counts
                </h2>
                <p className="text-grey text-base sm:text-[1.0625rem] leading-[1.7] mb-1">
                  No minimum, no calculation. Just generosity. Gift Aid adds
                  25%.
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
                    aria-label="Enter a custom Sadaqah amount in pounds"
                  />
                </div>

                {/* Outcome Label */}
                {currentOutcome && (
                  <p className="text-sm text-green font-medium mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
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
                  {frequency === "monthly"
                    ? `Give £${selectedAmount || customAmount || "0"}/month`
                    : `Give Sadaqah — £${selectedAmount || customAmount || "0"}`}
                </Button>

                {/* Trust Microcopy */}
                <div className="flex flex-wrap items-center gap-2.5 mt-5 text-[11px] text-grey/60 font-medium">
                  <span>100% to those in need</span>
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

        {/* ─── 4. Many Ways to Give Sadaqah ─── */}
        <section className="py-16 md:py-24 bg-cream">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-10">
                <span className="inline-block text-[11px] font-bold tracking-[0.1em] uppercase text-green mb-3">
                  More Than Money
                </span>
                <h2 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal leading-tight mb-4">
                  Many Ways to Give Sadaqah
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
                    <svg className="w-5 h-5 text-green flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <p className="text-charcoal text-base sm:text-[1.0625rem] leading-[1.7]">
                      {item}
                    </p>
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

        {/* ─── 5. Where Your Sadaqah Goes ─── */}
        <section className="py-16 md:py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <span className="inline-block text-[11px] font-bold tracking-[0.1em] uppercase text-green mb-3">
                Your Impact
              </span>
              <h2 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal leading-tight mb-3">
                Where Your Sadaqah Is Needed Most
              </h2>
            </div>

            <div className="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {[
                {
                  title: "Emergency Relief",
                  description: "Food, water, and shelter for displaced families in Gaza and crisis zones worldwide.",
                  icon: (
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                    </svg>
                  ),
                },
                {
                  title: "Children's Care",
                  description: "Education, nutrition, and safe housing for vulnerable children in Bangladesh and Turkey.",
                  icon: (
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
                    </svg>
                  ),
                },
                {
                  title: "Community Support",
                  description: "Weekly outreach and essential services for homeless communities in Brighton and across the UK.",
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

        {/* ─── 6. Final CTA ─── */}
        <section className="py-10 md:py-12 bg-green-dark">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-xl sm:text-2xl font-heading font-bold text-white mb-2">
              No Amount Is Too Small
            </h2>
            <p className="text-white/55 text-sm mb-6 italic font-heading">
              &ldquo;Protect yourself from Hellfire even with half a
              date.&rdquo;
            </p>
            <Button variant="primary" href="#donate-form">
              Give Sadaqah Now
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
