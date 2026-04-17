"use client";

import Link from "next/link";
import { useState } from "react";
import { donationAmounts, MIN_AMOUNT, type Frequency } from "./DonationForm";

export default function MiniDonationPicker() {
  const [frequency, setFrequency] = useState<Frequency>("one-time");
  const [selectedAmount, setSelectedAmount] = useState(100);
  const [customAmount, setCustomAmount] = useState("");

  const amounts = donationAmounts[frequency];
  const isCustom = !amounts.some((a) => a.value === selectedAmount);
  const amountForUrl = selectedAmount || Number(customAmount) || 0;
  const isAmountValid = amountForUrl >= MIN_AMOUNT;

  const handleFrequencyChange = (f: Frequency) => {
    setFrequency(f);
    setCustomAmount("");
    const defaultAmount = donationAmounts[f].find((a) => a.default);
    setSelectedAmount(defaultAmount?.value ?? donationAmounts[f][1].value);
  };

  return (
    <div className="max-w-lg mx-auto">
      <p className="text-amber text-xs font-semibold mb-5">Trusted by 3,200+ donors since 2013</p>
      <div role="group" aria-label="Donation frequency" className="flex items-center gap-1 mb-5 bg-white/10 backdrop-blur-sm rounded-full p-1 w-fit mx-auto">
        <button type="button" onClick={() => handleFrequencyChange("one-time")} aria-pressed={frequency === "one-time"} className={`px-5 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${frequency === "one-time" ? "bg-cream text-charcoal shadow-sm" : "text-white/70 hover:text-white"}`}>One-time</button>
        <button type="button" onClick={() => handleFrequencyChange("monthly")} aria-pressed={frequency === "monthly"} className={`px-5 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${frequency === "monthly" ? "bg-cream text-charcoal shadow-sm" : "text-white/70 hover:text-white"}`}>Monthly</button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3">
        {amounts.map((amount) => (
          <button key={amount.value} type="button" onClick={() => { setSelectedAmount(amount.value); setCustomAmount(""); }} className={`relative py-3 px-3 rounded-xl text-center font-semibold transition-all duration-200 border-2 ${selectedAmount === amount.value ? "border-amber bg-cream text-charcoal" : "border-white/25 bg-white/5 text-white hover:border-white/50 hover:bg-white/10"}`}>
            {amount.label}
            {amount.default && (<span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] bg-amber text-charcoal px-1.5 py-px rounded-full font-bold">Popular</span>)}
          </button>
        ))}
      </div>
      <div className="relative mb-4">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60 font-medium">£</span>
        <input type="number" inputMode="numeric" placeholder="Custom amount" value={customAmount} onChange={(e) => { setCustomAmount(e.target.value); setSelectedAmount(Number(e.target.value) || 0); }} onFocus={() => setSelectedAmount(0)} className={`w-full pl-8 pr-4 py-3 rounded-xl border-2 text-white placeholder:text-white/40 bg-white/5 backdrop-blur-sm text-center transition-colors duration-200 focus:outline-none ${isCustom ? "border-amber" : "border-white/25 focus:border-white/50"}`} min={MIN_AMOUNT} aria-label="Enter a custom Zakat amount in pounds" />
      </div>
      {amountForUrl >= MIN_AMOUNT && (
        <p className="mb-3 text-[13px] text-white/60 font-medium flex items-center justify-center gap-1.5">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
          With Gift Aid: £{Math.round(amountForUrl * 1.25).toLocaleString()}{frequency === "monthly" ? "/month" : ""} at no extra cost
        </p>
      )}
      {isAmountValid ? (
        <Link href={`/donate?campaign=zakat&amount=${amountForUrl}&frequency=${frequency}`} className="inline-flex items-center justify-center px-8 py-4 rounded-full bg-amber text-charcoal hover:bg-amber-dark font-semibold shadow-sm text-base transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
          Pay Zakat £{amountForUrl.toLocaleString()}{frequency === "monthly" ? "/month" : ""} Now
        </Link>
      ) : (
        <button type="button" disabled aria-disabled="true" className="inline-flex items-center justify-center px-8 py-4 rounded-full bg-white/10 text-white/40 font-semibold text-base cursor-not-allowed">Enter £{MIN_AMOUNT} or more to continue</button>
      )}
      <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-white/45 font-medium">
        <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
        <span>Secure checkout · Apple Pay · Google Pay · Card</span>
      </div>
    </div>
  );
}
