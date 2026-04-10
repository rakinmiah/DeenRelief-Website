"use client";

import { useState } from "react";
import Image from "next/image";
import Button from "./Button";

const donationAmounts = [
  { value: 25, label: "£25", outcome: "Provides emergency food for a family" },
  { value: 50, label: "£50", outcome: "Feeds a family for one week", default: true },
  { value: 100, label: "£100", outcome: "Supplies clean water for a community" },
  { value: 250, label: "£250", outcome: "Provides shelter materials for a displaced family" },
];

export default function FeaturedCampaign() {
  const [selectedAmount, setSelectedAmount] = useState(50);
  const [customAmount, setCustomAmount] = useState("");
  const isCustom = !donationAmounts.some((a) => a.value === selectedAmount);

  const currentOutcome =
    donationAmounts.find((a) => a.value === selectedAmount)?.outcome ?? "";

  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section label */}
        <div className="mb-3">
          <span className="inline-block text-xs font-semibold tracking-widest uppercase text-amber-dark bg-amber-light px-3 py-1 rounded-full">
            Urgent Appeal
          </span>
        </div>

        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Image */}
          <div className="relative rounded-2xl overflow-hidden aspect-[4/3]">
            <Image
              src="/images/palestine-relief.jpg"
              alt="Deen Relief worker distributing aid to a woman in a Palestine displacement camp"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>

          {/* Content */}
          <div>
            <h2 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal mb-4 leading-tight">
              Palestine Emergency Relief
            </h2>
            <p className="text-grey text-lg mb-8 leading-relaxed">
              Families in Gaza are facing unimaginable hardship. Your donation
              delivers emergency food, clean water, shelter, and medical aid
              directly to displaced families through our on-the-ground teams.
            </p>

            {/* Donation Amount Selector */}
            <div className="mb-6">
              <p className="text-sm font-medium text-charcoal mb-3">
                Choose an amount
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                {donationAmounts.map((amount) => (
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
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[10px] bg-green text-white px-2 py-0.5 rounded-full">
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
              Donate £{selectedAmount || customAmount || "0"} Now
            </Button>

            <p className="text-xs text-grey mt-4">
              100% of your donation goes to emergency relief. UK taxpayers can
              add 25% at no cost via Gift Aid.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
