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
    { value: 50, label: "£50", outcome: "Covers a week of nutritious meals for a child in treatment" },
    { value: 100, label: "£100", outcome: "Funds medical supplies for a child's ongoing care", default: true },
    { value: 250, label: "£250", outcome: "Provides a month of family housing near the hospital" },
    { value: 500, label: "£500", outcome: "Covers comprehensive monthly support for a child and their family" },
  ],
  monthly: [
    { value: 25, label: "£25", outcome: "Provides ongoing nutritious meals for a child in treatment" },
    { value: 50, label: "£50", outcome: "Covers monthly medical supplies and nutrition", default: true },
    { value: 100, label: "£100", outcome: "Funds ongoing family housing and medical support" },
    { value: 250, label: "£250", outcome: "Sustains comprehensive care for a child through treatment" },
  ],
};

type Frequency = "one-time" | "monthly";

/* ── FAQ data ── */
const faqs = [
  {
    question: "What is Gulucuk Evi?",
    answer:
      "Gulucuk Evi — the House of Smiles — is Deen Relief's dedicated care centre in Adana, Turkey. It provides free family housing, medical financial aid, nutrition programmes, and emotional support for Syrian and Gazan refugee children undergoing cancer treatment.",
  },
  {
    question: "What types of cancer are treated?",
    answer:
      "Children at our partner hospitals receive treatment for a range of cancers including acute lymphoblastic leukaemia, acute myeloid leukaemia, brain and CNS tumours, lymphomas, and solid tumours including neuroblastoma, Wilms tumour, and retinoblastoma.",
  },
  {
    question: "Is my donation eligible for Gift Aid?",
    answer:
      "Yes. If you are a UK taxpayer, we can claim an extra 25% on your donation at no additional cost to you. Your £100 becomes £125.",
  },
  {
    question: "How does my donation reach children?",
    answer:
      "Our trustees oversee every allocation. We work in direct partnership with Adana City Hospital and Çukurova University Balcalı Hospital. Your donation funds housing, medical costs, nutrition, and support services delivered by our on-the-ground team.",
  },
  {
    question: "How is Deen Relief regulated?",
    answer:
      "Deen Relief is registered with the Charity Commission (No. 1158608) and Companies House (No. 08593822). Our accounts are publicly audited and filed annually.",
  },
];

export default function CancerCarePage() {
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
              src="/images/gulucuk-team.webp"
              alt="Deen Relief team members with children at the Gulucuk Evi care centre in Adana, Turkey"
              fill
              className="object-cover object-center"
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
                A Home for Children{"\n"}Fighting Cancer
              </h1>
              <p className="text-[0.875rem] sm:text-[0.9375rem] text-white/65 mb-5 leading-[1.7] max-w-[24rem]">
                In Adana, Turkey, we operate Gulucuk Evi — the House of
                Smiles — providing housing, medical support, and care for
                Syrian and Gazan refugee children undergoing cancer
                treatment.
              </p>
              <div className="flex flex-wrap items-center gap-2.5 mb-7 text-[11px] text-white/45 font-medium">
                <span>Charity No. 1158608</span>
                <span className="text-white/20">·</span>
                <span>Gift Aid Eligible</span>
                <span className="text-white/20">·</span>
                <span>Adana, Turkey</span>
              </div>
              <Button variant="primary" href="#donate-form">
                Support Our Care Centres
              </Button>
            </div>
          </div>

          <ProofTag location="Adana, Turkey" position="bottom-right" />
        </section>

        {/* ─── 2. Donation Panel (two-column with image) ─── */}
        <section id="donate-form" className="pt-16 md:pt-24 pb-4 md:pb-6 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-10 lg:gap-12 items-center">
              {/* Image */}
              <div className="relative rounded-2xl overflow-hidden aspect-[5/4]">
                <Image
                  src="/images/cancer-children-worker.webp"
                  alt="Deen Relief worker sitting with four children at the cancer care centre in Adana, Turkey"
                  fill
                  className="object-cover object-[center_40%]"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
                <ProofTag location="Adana, Turkey" />
              </div>

              {/* Donation Form */}
              <div>
                <span className="inline-block text-[11px] font-bold tracking-[0.1em] uppercase text-green mb-3">
                  Support Our Centres
                </span>
                <h2 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal leading-tight mb-3">
                  Help a Child Through Treatment
                </h2>
                <p className="text-grey text-base sm:text-[1.0625rem] leading-[1.7] mb-1">
                  Your donation funds housing, medical care, and family
                  support. Gift Aid adds 25%.
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
                  Donate £{selectedAmount || customAmount || "0"}
                  {frequency === "monthly" ? "/month" : ""} Now
                </Button>

                {/* Trust Microcopy */}
                <div className="flex flex-wrap items-center gap-2.5 mt-5 text-[11px] text-grey/60 font-medium">
                  <span>100% to cancer care</span>
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

        {/* ─── 4. What Gulucuk Evi Provides ─── */}
        <section className="py-16 md:py-24 bg-cream">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <span className="inline-block text-[11px] font-bold tracking-[0.1em] uppercase text-green mb-3">
                What We Provide
              </span>
              <h2 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal leading-tight mb-3">
                Comprehensive Care for Children and Families
              </h2>
              <p className="text-grey text-base sm:text-[1.0625rem] leading-[1.7]">
                Gulucuk Evi supports every aspect of a child&apos;s cancer
                treatment journey — from housing to healing.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                {
                  title: "Family Housing",
                  description: "Free accommodation near hospitals so families can stay close throughout their child's treatment.",
                  icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>,
                },
                {
                  title: "Medical Financial Aid",
                  description: "Covering treatment costs, emergency medical expenses, and ongoing care for children with cancer.",
                  icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>,
                },
                {
                  title: "Nutrition Programme",
                  description: "Culturally appropriate meals designed specifically for children undergoing cancer treatment.",
                  icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.871c1.355 0 2.697.056 4.024.166C17.155 8.51 18 9.473 18 10.608v2.513M15 8.25v-1.5m-6 1.5v-1.5m12 9.75-1.5.75a3.354 3.354 0 0 1-3 0 3.354 3.354 0 0 0-3 0 3.354 3.354 0 0 1-3 0 3.354 3.354 0 0 0-3 0 3.354 3.354 0 0 1-3 0L3 16.5m15-3.379a48.474 48.474 0 0 0-6-.371c-2.032 0-4.034.126-6 .371m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.169c0 .621-.504 1.125-1.125 1.125H4.125A1.125 1.125 0 0 1 3 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 0 1 6 13.12M12.265 3.11a.375.375 0 1 1-.53 0L12 2.845l.265.265Z" /></svg>,
                },
                {
                  title: "Case Management",
                  description: "Coordinating hospital appointments, medical visas, interpreters, and administrative requirements.",
                  icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" /></svg>,
                },
                {
                  title: "Spiritual Support",
                  description: "Islamic counselling and emotional care for children and families throughout the treatment journey.",
                  icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" /></svg>,
                },
                {
                  title: "Educational Continuity",
                  description: "Keeping children learning during treatment so they don't fall behind — supporting their future beyond cancer.",
                  icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" /></svg>,
                },
              ].map((service) => (
                <div
                  key={service.title}
                  className="bg-white border border-charcoal/5 rounded-2xl p-6 text-center"
                >
                  <div className="w-12 h-12 rounded-xl bg-green/10 text-green flex items-center justify-center mx-auto mb-4">
                    {service.icon}
                  </div>
                  <h3 className="font-heading font-bold text-[1.0625rem] text-charcoal mb-2">
                    {service.title}
                  </h3>
                  <p className="text-grey/80 text-[0.8125rem] leading-[1.6]">
                    {service.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── 5. Partner Hospitals ─── */}
        <section className="py-16 md:py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <span className="inline-block text-[11px] font-bold tracking-[0.1em] uppercase text-green mb-3">
                Our Medical Partners
              </span>
              <h2 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal leading-tight mb-3">
                World-Class Treatment in Adana
              </h2>
              <p className="text-grey text-base sm:text-[1.0625rem] leading-[1.7]">
                We work in direct partnership with two leading hospitals in
                Adana to ensure children receive the best possible care.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <div className="bg-cream border border-charcoal/5 rounded-2xl p-7">
                <div className="w-12 h-12 rounded-xl bg-green/10 text-green flex items-center justify-center mb-4">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                  </svg>
                </div>
                <h3 className="font-heading font-bold text-lg text-charcoal mb-2">
                  Adana City Hospital
                </h3>
                <p className="text-grey/80 text-[0.8125rem] leading-[1.6]">
                  One of Turkey&apos;s largest integrated healthcare
                  campuses. Provides comprehensive paediatric oncology
                  including chemotherapy, radiotherapy, surgical oncology,
                  and bone marrow transplantation services.
                </p>
              </div>

              <div className="bg-cream border border-charcoal/5 rounded-2xl p-7">
                <div className="w-12 h-12 rounded-xl bg-green/10 text-green flex items-center justify-center mb-4">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
                  </svg>
                </div>
                <h3 className="font-heading font-bold text-lg text-charcoal mb-2">
                  Çukurova University Balcalı Hospital
                </h3>
                <p className="text-grey/80 text-[0.8125rem] leading-[1.6]">
                  Teaching hospital with a specialist paediatric haematology
                  and oncology department. Offers clinical trials, novel
                  treatment approaches, and humanitarian programmes for
                  refugee families.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ─── 6. Field Evidence ─── */}
        <section className="py-16 md:py-24 bg-cream">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <span className="inline-block text-[11px] font-bold tracking-[0.1em] uppercase text-green mb-3">
                On the Ground
              </span>
              <h2 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal leading-tight mb-3">
                We Are in the Room
              </h2>
              <p className="text-grey text-base sm:text-[1.0625rem] leading-[1.7]">
                Our team visits every family personally. We sit with them,
                eat with them, and walk alongside them through every stage
                of their child&apos;s care.
              </p>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div className="relative rounded-2xl overflow-hidden aspect-[3/4]">
                <Image
                  src="/images/cancer-care-selfie.webp"
                  alt="Deen Relief worker taking a selfie with a child undergoing cancer treatment in Adana"
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, 33vw"
                />
                <ProofTag location="Adana, Turkey" />
              </div>
              <div className="relative rounded-2xl overflow-hidden aspect-[3/4]">
                <Image
                  src="/images/cancer-care-family.png"
                  alt="Deen Relief worker with a child and his mother at the care centre in Adana"
                  fill
                  className="object-cover object-[60%_30%]"
                  sizes="(max-width: 640px) 100vw, 33vw"
                />
                <ProofTag location="Adana, Turkey" position="bottom-right" />
              </div>
              <div className="relative rounded-2xl overflow-hidden aspect-[3/4]">
                <Image
                  src="/images/cancer-care-housing.webp"
                  alt="Deen Relief worker sitting with a child in the family housing programme in Adana"
                  fill
                  className="object-cover object-[center_35%]"
                  sizes="(max-width: 640px) 100vw, 33vw"
                />
                <ProofTag location="Adana, Turkey" />
              </div>
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
                Cancer Care FAQs
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
              Every Child Deserves a Chance to Heal
            </h2>
            <p className="text-white/55 text-sm mb-6">
              Your donation keeps Gulucuk Evi open for families who have
              nowhere else to turn.
            </p>
            <Button variant="primary" href="#donate-form">
              Support Our Care Centres
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
