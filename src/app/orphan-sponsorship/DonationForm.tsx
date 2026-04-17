"use client";

import Link from "next/link";
import { useState } from "react";
import Button from "@/components/Button";

export const donationAmounts = {
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

export type Frequency = "one-time" | "monthly";

export const MIN_AMOUNT = 5;

export default function DonationForm() {
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [selectedAmount, setSelectedAmount] = useState(30);
  const [customAmount, setCustomAmount] = useState("");

  const amounts = donationAmounts[frequency];
  const isCustom = !amounts.some((a) => a.value === selectedAmount);

  const currentOutcome = (() => {
    const amount = selectedAmount || Number(customAmount) || 0;
    if (amount < MIN_AMOUNT) return "";
    const exact = amounts.find((a) => a.value === amount);
    if (exact) return exact.outcome;
    const floor = [...amounts]
      .sort((a, b) => b.value - a.value)
      .find((a) => a.value <= amount);
    return floor?.outcome ?? "";
  })();

  const customAmountError = (() => {
    if (!customAmount) return null;
    const num = Number(customAmount);
    if (Number.isNaN(num) || num <= 0) return null;
    if (num < MIN_AMOUNT) return `Minimum £${MIN_AMOUNT}`;
    return null;
  })();

  const amountForUrl = selectedAmount || Number(customAmount) || 0;
  const isAmountValid = amountForUrl >= MIN_AMOUNT;

  const handleFrequencyChange = (f: Frequency) => {
    setFrequency(f);
    setCustomAmount("");
    const defaultAmount = donationAmounts[f].find((a) => a.default);
    setSelectedAmount(defaultAmount?.value ?? donationAmounts[f][0].value);
  };

  return (
    <div className="text-center">
      <span className="inline-block text-[11px] font-bold tracking-[0.1em] uppercase text-green mb-3">
        Sponsor Now
      </span>
      <h2 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal leading-tight mb-3">
        Start Your Sponsorship Today
      </h2>
      <p className="text-grey text-base sm:text-[1.0625rem] leading-[1.7] mb-2">
        £30/month. Gift Aid adds 25%. Cancel anytime.
      </p>
      <p className="text-green text-xs font-semibold mb-6">
        Trusted by 3,200+ donors since 2013
      </p>

      {/* Frequency Toggle — Monthly listed first */}
      <div
        role="group"
        aria-label="Donation frequency"
        className="flex items-center justify-center gap-1 mb-6 bg-grey-light rounded-full p-1 w-fit mx-auto"
      >
        <button
          type="button"
          onClick={() => handleFrequencyChange("monthly")}
          aria-pressed={frequency === "monthly"}
          className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
            frequency === "monthly"
              ? "bg-white text-charcoal shadow-sm"
              : "text-charcoal/50 hover:text-charcoal/70"
          }`}
        >
          Monthly
        </button>
        <button
          type="button"
          onClick={() => handleFrequencyChange("one-time")}
          aria-pressed={frequency === "one-time"}
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
            {amount.default && (
              <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] bg-green text-white px-1.5 py-px rounded-full">
                {frequency === "monthly" ? "Recommended" : "Popular"}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Custom Amount */}
      <div className="mb-5">
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-grey font-medium">
            £
          </span>
          <input
            type="number"
            inputMode="numeric"
            placeholder="Custom amount"
            value={customAmount}
            onChange={(e) => {
              setCustomAmount(e.target.value);
              setSelectedAmount(Number(e.target.value) || 0);
            }}
            onFocus={() => setSelectedAmount(0)}
            className={`w-full pl-8 pr-4 py-3.5 rounded-xl border-2 text-charcoal placeholder:text-grey/50 transition-colors duration-200 focus:outline-none ${
              customAmountError
                ? "border-red-500 bg-red-50"
                : isCustom
                ? "border-green bg-green-light"
                : "border-grey-light focus:border-green/40"
            }`}
            min={MIN_AMOUNT}
            aria-label="Enter a custom sponsorship amount in pounds"
            aria-invalid={!!customAmountError}
            aria-describedby={customAmountError ? "custom-amount-error" : undefined}
          />
        </div>
        {customAmountError && (
          <p
            id="custom-amount-error"
            className="text-[12px] text-red-600 font-medium mt-1.5"
            role="alert"
          >
            {customAmountError}
          </p>
        )}
      </div>

      {/* Outcome Label */}
      {currentOutcome && (
        <p className="text-sm text-green font-medium mb-4 flex items-center justify-center gap-2">
          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          {currentOutcome}
        </p>
      )}

      {/* Gift Aid callout */}
      {amountForUrl > 0 && isAmountValid && (
        <p className="text-[13px] text-green/70 font-medium mb-6 flex items-center justify-center gap-1.5">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          With Gift Aid: £{Math.round(amountForUrl * 1.25).toLocaleString()}
          {frequency === "monthly" ? "/month" : ""} at no extra cost
        </p>
      )}

      {/* CTA */}
      {isAmountValid ? (
        <Button
          variant="primary"
          size="lg"
          href={`/donate?campaign=orphan-sponsorship&amount=${amountForUrl}&frequency=${frequency}`}
          className="w-full justify-center"
        >
          {frequency === "monthly"
            ? `Sponsor a Child — £${amountForUrl}/month`
            : `Donate £${amountForUrl.toLocaleString()} Now`}
        </Button>
      ) : (
        <button
          type="button"
          disabled
          aria-disabled="true"
          className="inline-flex w-full items-center justify-center px-8 py-4 rounded-full bg-grey-light text-charcoal/40 font-semibold text-lg cursor-not-allowed"
        >
          Enter £{MIN_AMOUNT} or more to continue
        </button>
      )}

      {/* Accepted payment methods */}
      <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-grey/60 font-medium">
        <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
        <span>Secure checkout · Apple Pay · Google Pay · Card</span>
      </div>

      {/* Trust Microcopy */}
      <div className="flex flex-wrap items-center justify-center gap-2.5 mt-3 text-[11px] text-grey/60 font-medium">
        <span>100% to child support</span>
        <span className="text-grey/25">·</span>
        <span>
          {frequency === "monthly" ? "Cancel anytime" : "Reg. charity 1158608"}
        </span>
      </div>

      {/* Alternative giving routes */}
      <p className="mt-3 pt-3 border-t border-grey-light/70 text-[12px] text-grey/70">
        Paying Zakat or Sadaqah instead?{" "}
        <Link
          href="/zakat"
          className="font-semibold text-green hover:text-green-dark underline underline-offset-2 decoration-green/30 hover:decoration-green"
        >
          Pay Zakat
        </Link>{" "}
        ·{" "}
        <Link
          href="/sadaqah"
          className="font-semibold text-green hover:text-green-dark underline underline-offset-2 decoration-green/30 hover:decoration-green"
        >
          Give Sadaqah
        </Link>
      </p>
    </div>
  );
}
