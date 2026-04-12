"use client";

import { useState } from "react";
import Image from "next/image";
import Button from "./Button";
import ProofTag from "./ProofTag";

const donationAmounts = {
  "one-time": [
    { value: 25, label: "£25", outcome: "Provides emergency food for a family in Gaza" },
    { value: 50, label: "£50", outcome: "Feeds a displaced family in Gaza for one week", default: true },
    { value: 100, label: "£100", outcome: "Supplies clean water for a community in Gaza" },
    { value: 250, label: "£250", outcome: "Provides shelter materials for a displaced family in Gaza" },
  ],
  monthly: [
    { value: 10, label: "£10", outcome: "Provides ongoing food support for a child in Gaza" },
    { value: 25, label: "£25", outcome: "Feeds a displaced family in Gaza every month" },
    { value: 50, label: "£50", outcome: "Sustains clean water access for a community in Gaza", default: true },
    { value: 100, label: "£100", outcome: "Covers monthly medical supplies for a family in Gaza" },
  ],
};

type Frequency = "one-time" | "monthly";

export default function FeaturedCampaign() {
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

  return (
    <section id="donate" className="py-16 md:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-12 items-center">
          {/* Image */}
          <div className="relative rounded-2xl overflow-hidden aspect-[5/4]">
              <Image
                src="/images/palestine-relief.jpg"
                alt="Deen Relief worker distributing aid to a woman in a Palestine displacement camp"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
              {/* Urgent Appeal badge */}
              <span className="absolute top-3 left-3 z-10 inline-block text-[10px] font-bold tracking-[0.08em] uppercase text-amber-dark bg-amber-light px-3 py-1 rounded-md">
                Urgent Appeal
              </span>
              <ProofTag location="Gaza" date="2026" />
          </div>

          {/* Content */}
          <div>
            <h2 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal mb-4 leading-tight">
              Palestine Emergency Relief
            </h2>
            <p className="text-grey text-base sm:text-[1.0625rem] mb-8 leading-[1.7]">
              Displaced families in Gaza urgently need food, clean water,
              shelter, and medical supplies. Your donation is delivered
              directly through our on-the-ground teams.
            </p>

            {/* Donation Amount Selector */}
            <div className="mb-6">
              {/* Frequency Toggle */}
              <div className="flex items-center gap-1 mb-4 bg-grey-light rounded-full p-1 w-fit">
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

              <p className="text-sm font-medium text-charcoal mb-3">
                Choose an amount
              </p>
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
              <div className="relative">
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
            </div>

            {/* Outcome Label */}
            {currentOutcome && (
              <p className="text-sm text-green font-medium mb-6 flex items-center gap-2">
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

            {/* CTA */}
            <Button variant="primary" size="lg" href="#donate" className="w-full sm:w-auto">
              Donate £{selectedAmount || customAmount || "0"}
              {frequency === "monthly" ? "/month" : ""} Now
            </Button>

            {/* Trust microcopy */}
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
  );
}
