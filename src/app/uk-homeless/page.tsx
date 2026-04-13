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
    { value: 10, label: "£10", outcome: "Provides a hot meal and essentials pack for one person" },
    { value: 25, label: "£25", outcome: "Feeds five people on our weekly outreach", default: true },
    { value: 50, label: "£50", outcome: "Covers a full evening of hot meals and supplies" },
    { value: 100, label: "£100", outcome: "Funds a week of outreach including meals, clothing, and support packs" },
  ],
  monthly: [
    { value: 10, label: "£10", outcome: "Provides ongoing weekly meals for one person", default: true },
    { value: 25, label: "£25", outcome: "Feeds five people every week on our outreach" },
    { value: 50, label: "£50", outcome: "Covers a full weekly outreach evening each month" },
    { value: 100, label: "£100", outcome: "Sustains our entire weekly outreach programme" },
  ],
};

type Frequency = "one-time" | "monthly";

/* ── FAQ data ── */
const faqs = [
  {
    question: "What does my donation fund?",
    answer:
      "Your donation funds our weekly street outreach in Brighton — hot meals, warm clothing, blankets, hygiene packs, sleeping bags, and essential supplies distributed directly to people experiencing homelessness.",
  },
  {
    question: "How often does the outreach happen?",
    answer:
      "Every week, rain or shine, since 2013. Our volunteer teams go out onto Brighton's streets with meals and essentials. The outreach has never stopped — not even once — in over twelve years.",
  },
  {
    question: "Can I volunteer instead of donating?",
    answer:
      "Absolutely. We welcome volunteers for our Brighton homeless outreach and other programmes. No experience is needed — just a willingness to help. Visit our volunteer page or email info@deenrelief.org to get started.",
  },
  {
    question: "Is my donation eligible for Gift Aid?",
    answer:
      "Yes. If you are a UK taxpayer, we can claim an extra 25% on your donation at no additional cost to you. Your £25 becomes £31.25 — enough to feed five people on our weekly outreach.",
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

export default function UKHomelessPage() {
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
    setSelectedAmount(defaultAmount?.value ?? donationAmounts[f][0].value);
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
              src="/images/brighton-team.webp"
              alt="Deen Relief volunteers gathered at Brighton seafront for a community outreach event"
              fill
              className="object-cover object-[center_75%]"
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
                Supporting Our Community, Every Week
              </h1>
              <p className="text-[0.875rem] sm:text-[0.9375rem] text-white/65 mb-5 leading-[1.7] max-w-[24rem]">
                Hot meals, clothing, and essentials distributed on
                Brighton&apos;s streets every week by our volunteer teams
                since 2013.
              </p>
              <div className="flex flex-wrap items-center gap-2.5 mb-7 text-[11px] text-white/45 font-medium">
                <span>Charity No. 1158608</span>
                <span className="text-white/20">·</span>
                <span>Gift Aid Eligible</span>
                <span className="text-white/20">·</span>
                <span>Brighton, UK</span>
              </div>
              <Button variant="primary" href="#donate-form">
                Support Our Outreach
              </Button>
            </div>
          </div>

          <ProofTag location="Brighton, UK" position="bottom-right" />
        </section>

        {/* ─── 2. Donation Panel (centred, bordered) ─── */}
        <section id="donate-form" className="pt-16 md:pt-24 pb-4 md:pb-6 bg-white">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="border border-charcoal/8 rounded-2xl p-6 sm:p-8">
              <div className="text-center mb-8">
                <span className="inline-block text-[11px] font-bold tracking-[0.1em] uppercase text-green mb-3">
                  Our Community
                </span>
                <h2 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal leading-tight mb-3">
                  Help Us Feed Our Community
                </h2>
                <p className="text-grey text-base sm:text-[1.0625rem] leading-[1.7] mb-2">
                  Your donation funds weekly outreach on Brighton&apos;s
                  streets. Gift Aid adds 25%.
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
                <span>100% to community outreach</span>
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

        {/* ─── 4. Where It All Started ─── */}
        <section className="py-16 md:py-24 bg-cream">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
              {/* Text */}
              <div>
                <span className="inline-block text-[11px] font-bold tracking-[0.1em] uppercase text-green mb-3">
                  Where It All Started
                </span>
                <h2 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal leading-tight mb-4">
                  Where It All Started
                </h2>
                <p className="text-grey text-base sm:text-[1.0625rem] leading-[1.7] mb-4">
                  In 2013, founding trustee Shabek Ali began walking
                  Brighton&apos;s streets with hot meals and essentials for
                  the homeless community. No office, no website, no
                  fundraising campaigns — just a person who saw a need and
                  decided to act.
                </p>
                <p className="text-grey text-base sm:text-[1.0625rem] leading-[1.7] mb-4">
                  That weekly outreach has never stopped. Every week since
                  2013, rain or shine, our volunteer teams go out onto
                  Brighton&apos;s streets with hot meals, warm clothing,
                  hygiene packs, and a willingness to sit and listen.
                </p>
                <p className="text-grey text-base sm:text-[1.0625rem] leading-[1.7]">
                  What began on these streets grew into an international
                  charity operating across five countries. But the homeless
                  outreach that started it all continues to this day — a
                  reminder that charity begins at home.
                </p>
              </div>

              {/* Image */}
              <div className="relative rounded-2xl overflow-hidden aspect-[4/3]">
                <Image
                  src="/images/brighton-team.webp"
                  alt="Deen Relief volunteers gathered at Brighton seafront for a community outreach event"
                  fill
                  className="object-cover object-[center_65%]"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
                <ProofTag location="Brighton, UK" position="bottom-right" />
              </div>
            </div>
          </div>
        </section>

        {/* ─── 5. What We Deliver Every Week ─── */}
        <section className="py-16 md:py-24 bg-white">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <span className="inline-block text-[11px] font-bold tracking-[0.1em] uppercase text-green mb-3">
                Every Week
              </span>
              <h2 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal leading-tight mb-3">
                What Your Donation Provides
              </h2>
            </div>

            <div className="space-y-5 max-w-xl mx-auto mb-8 flex flex-col items-center">
              {[
                "Hot meals prepared and served on the streets",
                "Warm clothing and blankets during winter months",
                "Hygiene and toiletry packs",
                "Sleeping bags and essential supplies",
                "A friendly face and someone to talk to",
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
              Our volunteer teams go out every week, rain or shine.
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
                Homeless Outreach FAQs
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
              Charity Begins at Home
            </h2>
            <p className="text-white/55 text-sm mb-6">
              Every week, our volunteers are on Brighton&apos;s streets.
              Your donation keeps them going.
            </p>
            <Button variant="primary" href="#donate-form">
              Support Our Outreach
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
