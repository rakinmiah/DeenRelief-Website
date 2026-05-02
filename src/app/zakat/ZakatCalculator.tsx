"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

export default function ZakatCalculator() {
  const [assets, setAssets] = useState("");
  const [liabilities, setLiabilities] = useState("");
  const [zakatResult, setZakatResult] = useState<number | null>(null);
  const [nisabStandard, setNisabStandard] = useState<"silver" | "gold">("silver");
  const [nisabData, setNisabData] = useState<{
    gold: { pricePerGram: number; nisab: number };
    silver: { pricePerGram: number; nisab: number };
    updatedAt: string | null;
    fallback?: boolean;
  } | null>(null);
  const [nisabLoading, setNisabLoading] = useState(true);
  const [nisabError, setNisabError] = useState(false);
  const [manualNisab, setManualNisab] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/nisab");
        const data = await res.json();
        setNisabData(data);
      } catch {
        setNisabError(true);
      } finally {
        setNisabLoading(false);
      }
    })();
  }, []);

  const currentNisab = nisabError
    ? parseFloat(manualNisab) || 0
    : nisabData?.[nisabStandard]?.nisab ?? 0;

  const calculateZakat = () => {
    const netWealth = (parseFloat(assets) || 0) - (parseFloat(liabilities) || 0);
    if (netWealth > currentNisab && currentNisab > 0) {
      setZakatResult(Math.round(netWealth * 0.025 * 100) / 100);
    } else {
      setZakatResult(0);
    }
  };

  const resetCalculator = () => {
    setAssets("");
    setLiabilities("");
    setManualNisab("");
    setZakatResult(null);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-8">
        <span className="inline-block text-[11px] font-bold tracking-[0.1em] uppercase text-green mb-3">
          Zakat Calculator
        </span>
        <h2 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal leading-tight mb-3">
          How Much Zakat Do I Owe?
        </h2>
        <p className="text-grey text-base sm:text-[1.0625rem] leading-[1.7]">
          Use our free zakat calculator to estimate how much zakat you owe. Based
          on live gold and silver nisab prices. Planning tool only — consult a
          scholar for specific rulings.
        </p>
      </div>

      <div className="bg-white rounded-2xl p-6 sm:p-8">
        {/* Nisab display */}
        <div className="mb-6 p-4 rounded-xl bg-green-light/40 border border-green/8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-charcoal/60 uppercase tracking-wide">
              Nisab Threshold
            </span>
            <div className="flex items-center gap-1 bg-white rounded-full p-0.5 border border-charcoal/8">
              <button
                onClick={() => setNisabStandard("silver")}
                className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all duration-200 ${
                  nisabStandard === "silver"
                    ? "bg-green text-white"
                    : "text-charcoal/50 hover:text-charcoal/70"
                }`}
              >
                Silver
              </button>
              <button
                onClick={() => setNisabStandard("gold")}
                className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all duration-200 ${
                  nisabStandard === "gold"
                    ? "bg-green text-white"
                    : "text-charcoal/50 hover:text-charcoal/70"
                }`}
              >
                Gold
              </button>
            </div>
          </div>

          {nisabLoading ? (
            <div className="animate-pulse flex items-baseline gap-2">
              <div className="h-7 w-24 bg-green/10 rounded" />
              <div className="h-3 w-32 bg-green/10 rounded" />
            </div>
          ) : nisabError ? (
            <div>
              <p className="text-xs text-charcoal/50 mb-2">
                Unable to fetch live prices. Enter nisab manually:
              </p>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-grey font-medium text-sm">
                  £
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={manualNisab}
                  onChange={(e) => setManualNisab(e.target.value)}
                  placeholder="Enter current nisab in GBP"
                  className="w-full pl-7 pr-4 py-2 rounded-lg border border-charcoal/10 text-charcoal text-base placeholder:text-grey/40 focus:outline-none focus:border-green/40"
                />
              </div>
            </div>
          ) : (
            <>
              <p className="text-2xl font-heading font-bold text-green-dark">
                £{currentNisab.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-charcoal/40 mt-1">
                Based on {nisabStandard === "silver" ? "612.36g of silver" : "87.48g of gold"} at
                {" £"}
                {nisabData?.[nisabStandard]?.pricePerGram.toFixed(2)}/g
                {nisabData?.updatedAt && <> · Updated {nisabData.updatedAt}</>}
                {nisabData?.fallback && <> · Approximate values</>}
              </p>
            </>
          )}
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label htmlFor="zakat-assets" className="block text-sm font-medium text-charcoal mb-1.5">
              Eligible assets
            </label>
            <p className="text-[0.75rem] text-grey/60 mb-2">
              Cash, savings, gold/silver, trade goods, eligible investments
            </p>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-grey font-medium">£</span>
              <input
                id="zakat-assets"
                type="number"
                inputMode="decimal"
                value={assets}
                onChange={(e) => setAssets(e.target.value)}
                placeholder="0"
                className="w-full pl-8 pr-4 py-3 rounded-xl border-2 border-grey-light text-charcoal placeholder:text-grey/40 focus:outline-none focus:border-green/40 transition-colors duration-200"
              />
            </div>
          </div>

          <div>
            <label htmlFor="zakat-liabilities" className="block text-sm font-medium text-charcoal mb-1.5">
              Immediate liabilities
            </label>
            <p className="text-[0.75rem] text-grey/60 mb-2">
              Debts and obligations due now
            </p>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-grey font-medium">£</span>
              <input
                id="zakat-liabilities"
                type="number"
                inputMode="decimal"
                value={liabilities}
                onChange={(e) => setLiabilities(e.target.value)}
                placeholder="0"
                className="w-full pl-8 pr-4 py-3 rounded-xl border-2 border-grey-light text-charcoal placeholder:text-grey/40 focus:outline-none focus:border-green/40 transition-colors duration-200"
              />
            </div>
          </div>
        </div>

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

        {zakatResult !== null && (
          <div className="mt-6 p-5 rounded-xl bg-green-light/50 border border-green/10 text-center">
            {zakatResult > 0 ? (
              <>
                <p className="text-sm text-charcoal/60 mb-1">Your estimated Zakat is</p>
                <p className="text-3xl font-heading font-bold text-green-dark mb-4">
                  £{zakatResult.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                </p>
                <Link
                  href={`/donate?campaign=zakat&amount=${Math.round(zakatResult)}&frequency=one-time`}
                  className="inline-flex w-full items-center justify-center px-8 py-4 rounded-full bg-amber text-charcoal hover:bg-amber-dark font-semibold shadow-sm text-base transition-colors duration-200"
                >
                  Pay £{Math.round(zakatResult).toLocaleString()} Now
                </Link>
              </>
            ) : (
              <p className="text-sm text-charcoal/60">
                Your net wealth is below the nisab threshold. Zakat may not be
                due. Consult a scholar for guidance.
              </p>
            )}
          </div>
        )}

        <p className="text-[11px] text-charcoal/35 text-center mt-4">
          This is a planning tool only. Consult a scholar for specific rulings on
          your situation.
        </p>
      </div>
    </div>
  );
}
