"use client";

/**
 * Zakat calculator — v1 (Path A: cautious-default, single-madhab).
 *
 * Replaces the previous two-input calculator with seven collapsible
 * asset categories covering cash, gold, silver, investments, business
 * assets, property, and liabilities. Inputs are summed under cautious
 * default assumptions — see the disclaimer rendered near the result.
 *
 * Madhab override, jewelry exemption, pension-type sub-selectors, and
 * stock-in-trade valuation toggles are deferred to v2 pending scholarly
 * review. See ZAKAT_PMAX_AUDIT.md §17.5 (forthcoming) and the methodology
 * page at /zakat/methodology.
 *
 * Preserved from v1 (must not break):
 *   - Live nisab via /api/nisab (XAU/XAG, 6h cache, fallback values)
 *   - Silver/Gold nisab toggle, default Silver
 *   - Donate URL contract: /donate?campaign=zakat&amount=X&frequency=one-time
 *   - GA4 purchase.value flow (handled at /donate/thank-you, unaffected by
 *     calculator changes — value is the rounded GBP amount)
 *   - Cautious below-nisab message
 *   - Manual nisab fallback when API fetch errors
 */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type WeightMode = "grams" | "gbp";
type AccordionId =
  | "cash"
  | "gold"
  | "silver"
  | "investments"
  | "business"
  | "property"
  | "liabilities";

interface NisabData {
  gold: { pricePerGram: number; nisab: number };
  silver: { pricePerGram: number; nisab: number };
  updatedAt: string | null;
  fallback?: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ZAKAT_RATE = 0.025;

/** Parse a string from a number input, returning 0 for empty/invalid/negative. */
const parseAmount = (s: string): number => {
  const n = parseFloat(s);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

const formatGbp = (n: number): string =>
  `£${n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ─── Initial state ────────────────────────────────────────────────────────────

const initialCash = { bank: "", home: "", owedToYou: "", foreign: "" };
const initialGold = { mode: "grams" as WeightMode, weight: "", value: "" };
const initialSilver = { mode: "grams" as WeightMode, weight: "", value: "" };
const initialInvestments = { stocks: "", pension: "", crypto: "" };
const initialBusiness = { stockInTrade: "", cash: "", receivables: "" };
const initialProperty = { rentalCash: "", landForSale: "" };
const initialLiabilities = { immediate: "", longTermNextPayment: "", tax: "" };

// ─── Component ────────────────────────────────────────────────────────────────

export default function ZakatCalculator() {
  // Nisab — preserved verbatim from v1
  const [nisabStandard, setNisabStandard] = useState<"silver" | "gold">("silver");
  const [nisabData, setNisabData] = useState<NisabData | null>(null);
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

  const goldPricePerGram = nisabData?.gold?.pricePerGram ?? 0;
  const silverPricePerGram = nisabData?.silver?.pricePerGram ?? 0;

  const currentNisab = nisabError
    ? parseAmount(manualNisab)
    : nisabData?.[nisabStandard]?.nisab ?? 0;

  // Inputs — one state object per category for clean reset + minimal re-renders
  const [cash, setCash] = useState(initialCash);
  const [gold, setGold] = useState(initialGold);
  const [silver, setSilver] = useState(initialSilver);
  const [investments, setInvestments] = useState(initialInvestments);
  const [business, setBusiness] = useState(initialBusiness);
  const [property, setProperty] = useState(initialProperty);
  const [liabilities, setLiabilities] = useState(initialLiabilities);

  // Accordion expansion — single-open behaviour: opening section X closes
  // any other open section. Closed sections retain their values + subtotal
  // (which surfaces in the collapsed header), so donors can review without
  // re-expanding. Set type is preserved to keep callers ergonomic.
  const [openSections, setOpenSections] = useState<Set<AccordionId>>(new Set());
  const toggleSection = (id: AccordionId) => {
    setOpenSections((prev) => (prev.has(id) ? new Set() : new Set([id])));
  };

  // ─── Calculation ────────────────────────────────────────────────────────────
  // Live recompute on every state change. No "Calculate" button — the spec
  // calls for the result section to update as donors enter values.
  const calc = useMemo(() => {
    const cashTotal =
      parseAmount(cash.bank) +
      parseAmount(cash.home) +
      parseAmount(cash.owedToYou) +
      parseAmount(cash.foreign);

    const goldTotal =
      gold.mode === "grams"
        ? parseAmount(gold.weight) * goldPricePerGram
        : parseAmount(gold.value);

    const silverTotal =
      silver.mode === "grams"
        ? parseAmount(silver.weight) * silverPricePerGram
        : parseAmount(silver.value);

    const investmentsTotal =
      parseAmount(investments.stocks) +
      parseAmount(investments.pension) +
      parseAmount(investments.crypto);

    const businessTotal =
      parseAmount(business.stockInTrade) +
      parseAmount(business.cash) +
      parseAmount(business.receivables);

    const propertyTotal =
      parseAmount(property.rentalCash) + parseAmount(property.landForSale);

    const assetsTotal =
      cashTotal +
      goldTotal +
      silverTotal +
      investmentsTotal +
      businessTotal +
      propertyTotal;

    const liabilitiesTotal =
      parseAmount(liabilities.immediate) +
      parseAmount(liabilities.longTermNextPayment) +
      parseAmount(liabilities.tax);

    // Cap liabilities at assets — Zakat owed is never negative.
    const liabilitiesEffective = Math.min(liabilitiesTotal, assetsTotal);

    const netWealth = assetsTotal - liabilitiesEffective;

    const meetsNisab = currentNisab > 0 && netWealth >= currentNisab;
    const zakat = meetsNisab
      ? Math.round(netWealth * ZAKAT_RATE * 100) / 100
      : 0;

    const hasAnyInput = assetsTotal > 0 || liabilitiesTotal > 0;

    return {
      cashTotal,
      goldTotal,
      silverTotal,
      investmentsTotal,
      businessTotal,
      propertyTotal,
      assetsTotal,
      liabilitiesTotal,
      liabilitiesEffective,
      netWealth,
      zakat,
      meetsNisab,
      hasAnyInput,
    };
  }, [
    cash,
    gold,
    silver,
    investments,
    business,
    property,
    liabilities,
    currentNisab,
    goldPricePerGram,
    silverPricePerGram,
  ]);

  // Per-section subtotals, surfaced in the collapsed accordion header.
  const sectionTotals: Record<AccordionId, number> = {
    cash: calc.cashTotal,
    gold: calc.goldTotal,
    silver: calc.silverTotal,
    investments: calc.investmentsTotal,
    business: calc.businessTotal,
    property: calc.propertyTotal,
    liabilities: calc.liabilitiesTotal,
  };

  const resetCalculator = () => {
    setCash(initialCash);
    setGold(initialGold);
    setSilver(initialSilver);
    setInvestments(initialInvestments);
    setBusiness(initialBusiness);
    setProperty(initialProperty);
    setLiabilities(initialLiabilities);
    setManualNisab("");
    setOpenSections(new Set());
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-8">
        <span className="inline-block text-[11px] font-bold tracking-[0.1em] uppercase text-green mb-3">
          Zakat Calculator
        </span>
        <h2 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal leading-tight mb-3">
          How Much Zakat Do I Owe?
        </h2>
        <p className="text-grey text-base sm:text-[1.0625rem] leading-[1.7]">
          Calculate your Zakat across cash, gold, silver, investments, business
          assets, property, and liabilities. Based on live nisab prices. Planning
          tool only — consult your scholar for specific rulings.
        </p>
      </div>

      <div className="bg-white border border-charcoal/8 rounded-2xl p-5 sm:p-7">
        {/* ── Nisab display (preserved from v1) ── */}
        <div className="mb-6 p-4 rounded-xl bg-green-light/40 border border-green/8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-charcoal/60 uppercase tracking-wide">
              Nisab Threshold
            </span>
            <div className="flex items-center gap-1 bg-white rounded-full p-0.5 border border-charcoal/8">
              <button
                type="button"
                onClick={() => setNisabStandard("silver")}
                aria-pressed={nisabStandard === "silver"}
                className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all duration-200 ${
                  nisabStandard === "silver"
                    ? "bg-green text-white"
                    : "text-charcoal/50 hover:text-charcoal/70"
                }`}
              >
                Silver
              </button>
              <button
                type="button"
                onClick={() => setNisabStandard("gold")}
                aria-pressed={nisabStandard === "gold"}
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
                Based on{" "}
                {nisabStandard === "silver" ? "612.36g of silver" : "87.48g of gold"}{" "}
                at £{nisabData?.[nisabStandard]?.pricePerGram.toFixed(2)}/g
                {nisabData?.updatedAt && <> · Updated {nisabData.updatedAt}</>}
                {nisabData?.fallback && <> · Approximate values</>}
              </p>
            </>
          )}
        </div>

        {/* ── Running-total preview — appears once any input has a value, so
              donors can track net wealth + Zakat owed without scrolling to the
              result card at the bottom of the form. ── */}
        {calc.hasAnyInput && (
          <div className="mb-4 px-4 py-2.5 rounded-lg bg-charcoal/[0.03] border border-charcoal/10 text-[13px] text-center">
            <span className="text-charcoal/55">Net wealth:</span>{" "}
            <span className="font-semibold text-charcoal tabular-nums">
              {formatGbp(calc.netWealth)}
            </span>
            <span className="text-charcoal/25 mx-2">·</span>
            {calc.meetsNisab ? (
              <>
                <span className="text-charcoal/55">Zakat:</span>{" "}
                <span className="font-semibold text-green-dark tabular-nums">
                  {formatGbp(calc.zakat)}
                </span>
              </>
            ) : (
              <span className="text-charcoal/55">Below nisab — Zakat not due</span>
            )}
          </div>
        )}

        {/* ── Asset categories — 1 col on mobile, 2 cols on lg+ so seven
              cards lay out as 2/2/2/1 rows instead of 7 single rows. Each
              card's expanded body has single-column inputs (each card is
              now half-width on desktop, so 2-col inputs would be cramped).
              align-items:start so a collapsed card next to an expanded one
              stays at the top of its row rather than stretching vertically. ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
          {/* Category 1 — Cash and savings */}
          <Section
            id="cash"
            title="Cash and savings"
            description="Bank accounts, cash at home, money owed to you"
            isOpen={openSections.has("cash")}
            onToggle={() => toggleSection("cash")}
            subtotal={sectionTotals.cash}
          >
            <MoneyInput
              label="Bank accounts"
              hint="Total across checking, savings, and any other GBP bank accounts."
              value={cash.bank}
              onChange={(v) => setCash((c) => ({ ...c, bank: v }))}
            />
            <MoneyInput
              label="Cash at home"
              hint="Physical cash held at home or carried."
              value={cash.home}
              onChange={(v) => setCash((c) => ({ ...c, home: v }))}
            />
            <MoneyInput
              label="Money owed to you"
              hint="Loans you've made that you reasonably expect to be repaid."
              value={cash.owedToYou}
              onChange={(v) => setCash((c) => ({ ...c, owedToYou: v }))}
            />
            <MoneyInput
              label="Foreign currency holdings"
              hint="Convert your foreign currency to GBP at today's rate before entering. Multi-currency input is on the v2 roadmap."
              value={cash.foreign}
              onChange={(v) => setCash((c) => ({ ...c, foreign: v }))}
            />
          </Section>

          {/* Category 2 — Gold */}
          <Section
            id="gold"
            title="Gold"
            description="Coins, bars, and jewelry — by weight or current value"
            isOpen={openSections.has("gold")}
            onToggle={() => toggleSection("gold")}
            subtotal={sectionTotals.gold}
          >
            <ModeToggle
              mode={gold.mode}
              onChange={(mode) => setGold((g) => ({ ...g, mode }))}
              labelGrams="Enter by weight"
              labelGbp="Enter by value"
            />
            {gold.mode === "grams" ? (
              <WeightInput
                label="Weight of gold"
                hint={
                  goldPricePerGram > 0
                    ? `Total weight in grams. Live spot price: £${goldPricePerGram.toFixed(2)}/g.`
                    : "Total weight in grams. Live price loading."
                }
                value={gold.weight}
                onChange={(v) => setGold((g) => ({ ...g, weight: v }))}
                computedValue={parseAmount(gold.weight) * goldPricePerGram}
              />
            ) : (
              <MoneyInput
                label="Value of gold"
                hint="Current GBP value of all gold you own."
                value={gold.value}
                onChange={(v) => setGold((g) => ({ ...g, value: v }))}
              />
            )}
          </Section>

          {/* Category 3 — Silver */}
          <Section
            id="silver"
            title="Silver"
            description="Coins, bars, and jewelry — by weight or current value"
            isOpen={openSections.has("silver")}
            onToggle={() => toggleSection("silver")}
            subtotal={sectionTotals.silver}
          >
            <ModeToggle
              mode={silver.mode}
              onChange={(mode) => setSilver((s) => ({ ...s, mode }))}
              labelGrams="Enter by weight"
              labelGbp="Enter by value"
            />
            {silver.mode === "grams" ? (
              <WeightInput
                label="Weight of silver"
                hint={
                  silverPricePerGram > 0
                    ? `Total weight in grams. Live spot price: £${silverPricePerGram.toFixed(2)}/g.`
                    : "Total weight in grams. Live price loading."
                }
                value={silver.weight}
                onChange={(v) => setSilver((s) => ({ ...s, weight: v }))}
                computedValue={parseAmount(silver.weight) * silverPricePerGram}
              />
            ) : (
              <MoneyInput
                label="Value of silver"
                hint="Current GBP value of all silver you own."
                value={silver.value}
                onChange={(v) => setSilver((s) => ({ ...s, value: v }))}
              />
            )}
          </Section>

          {/* Category 4 — Investments */}
          <Section
            id="investments"
            title="Investments"
            description="Stocks, pensions, cryptocurrency"
            isOpen={openSections.has("investments")}
            onToggle={() => toggleSection("investments")}
            subtotal={sectionTotals.investments}
          >
            <MoneyInput
              label="Stocks and shares"
              hint="Total current market value of shares held in ISA, GIA, or other accounts."
              value={investments.stocks}
              onChange={(v) =>
                setInvestments((i) => ({ ...i, stocks: v }))
              }
            />
            <MoneyInput
              label="Pension"
              hint="Total current value of your pension(s). Pension treatment varies by type and madhab; v2 will add per-type breakdown — for now enter the full value as a cautious default."
              value={investments.pension}
              onChange={(v) =>
                setInvestments((i) => ({ ...i, pension: v }))
              }
            />
            <MoneyInput
              label="Cryptocurrency"
              hint="Current GBP value of your crypto holdings. Use the value at the time you calculate."
              value={investments.crypto}
              onChange={(v) =>
                setInvestments((i) => ({ ...i, crypto: v }))
              }
            />
          </Section>

          {/* Category 5 — Business assets */}
          <Section
            id="business"
            title="Business assets"
            description="If you own or run a business"
            isOpen={openSections.has("business")}
            onToggle={() => toggleSection("business")}
            subtotal={sectionTotals.business}
          >
            <MoneyInput
              label="Stock-in-trade (inventory)"
              hint="Inventory held for sale, valued at current market value. Valuation method varies by madhab — current market value is the cautious default."
              value={business.stockInTrade}
              onChange={(v) =>
                setBusiness((b) => ({ ...b, stockInTrade: v }))
              }
            />
            <MoneyInput
              label="Business cash holdings"
              hint="Cash held in business accounts."
              value={business.cash}
              onChange={(v) =>
                setBusiness((b) => ({ ...b, cash: v }))
              }
            />
            <MoneyInput
              label="Trade receivables"
              hint="Money customers owe your business that you reasonably expect to be paid."
              value={business.receivables}
              onChange={(v) =>
                setBusiness((b) => ({ ...b, receivables: v }))
              }
            />
          </Section>

          {/* Category 6 — Property */}
          <Section
            id="property"
            title="Property"
            description="Rental income held, land for sale (primary residence is exempt)"
            isOpen={openSections.has("property")}
            onToggle={() => toggleSection("property")}
            subtotal={sectionTotals.property}
          >
            <MoneyInput
              label="Rental income held"
              hint="Cash currently held from rental income. The capital value of investment property is NOT Zakatable — only cash you've accumulated from rental income."
              value={property.rentalCash}
              onChange={(v) =>
                setProperty((p) => ({ ...p, rentalCash: v }))
              }
            />
            <MoneyInput
              label="Land held for sale"
              hint="Current market value of land you hold with intent to sell. Land held for use is not Zakatable."
              value={property.landForSale}
              onChange={(v) =>
                setProperty((p) => ({ ...p, landForSale: v }))
              }
            />
            <p className="text-[12px] text-charcoal/50 leading-[1.6] mt-2">
              Your primary residence is exempt from Zakat regardless of value.
            </p>
          </Section>

          {/* Category 7 — Liabilities (deductible) */}
          <Section
            id="liabilities"
            title="Liabilities (deductible)"
            description="Debts and obligations that reduce your Zakatable wealth"
            isOpen={openSections.has("liabilities")}
            onToggle={() => toggleSection("liabilities")}
            subtotal={sectionTotals.liabilities}
            subtotalLabel="Deductible"
          >
            <MoneyInput
              label="Immediate debts due"
              hint="Debts due now or within the next month — credit cards, due bills, personal debts."
              value={liabilities.immediate}
              onChange={(v) =>
                setLiabilities((l) => ({ ...l, immediate: v }))
              }
            />
            <MoneyInput
              label="Long-term debt — next month's payment only"
              hint="The next single monthly payment on long-term debts (mortgage, car finance, student loan, etc.). The next-month-only rule reflects one contemporary position; positions vary."
              value={liabilities.longTermNextPayment}
              onChange={(v) =>
                setLiabilities((l) => ({ ...l, longTermNextPayment: v }))
              }
            />
            <MoneyInput
              label="Tax owed"
              hint="Tax that is due but not yet paid (e.g. self-assessment liability)."
              value={liabilities.tax}
              onChange={(v) =>
                setLiabilities((l) => ({ ...l, tax: v }))
              }
            />
          </Section>
        </div>

        {/* ── Reset ── */}
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={resetCalculator}
            className="px-4 py-2 rounded-full border border-charcoal/10 text-charcoal/60 font-medium text-xs hover:border-charcoal/20 transition-colors duration-200"
          >
            Reset
          </button>
        </div>

        {/* ── Result ── */}
        <ResultCard calc={calc} currentNisab={currentNisab} />

        {/* ── Cautious-position disclaimer ── */}
        <div className="mt-5 p-4 rounded-xl bg-charcoal/[0.02] border border-charcoal/10 text-[12px] text-charcoal/65 leading-[1.65]">
          <p className="font-semibold text-charcoal/75 mb-1">
            About this calculator
          </p>
          <p>
            This calculator uses cautious default assumptions across asset
            classes. Some madhabs apply specific exemptions — for example,
            regularly-worn jewelry may be exempt under Maliki, Shafi&apos;i,
            and Hanbali positions; pension types are treated differently
            under different schools. If your madhab applies an exemption
            this calculator doesn&apos;t, consult your scholar and adjust
            your final figure.{" "}
            <Link
              href="/zakat/methodology"
              className="font-semibold text-green hover:text-green-dark underline underline-offset-2 decoration-green/30"
            >
              Read the methodology
            </Link>
            .
          </p>
        </div>

        <p className="text-[11px] text-charcoal/35 text-center mt-4">
          Planning tool only. Consult your scholar for specific rulings.
        </p>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface SectionProps {
  id: AccordionId;
  title: string;
  description: string;
  isOpen: boolean;
  onToggle: () => void;
  subtotal: number;
  subtotalLabel?: string;
  children: React.ReactNode;
}

function Section({
  id,
  title,
  description,
  isOpen,
  onToggle,
  subtotal,
  subtotalLabel,
  children,
}: SectionProps) {
  const showSubtotal = subtotal > 0;
  const sectionElementId = `zakat-section-${id}`;
  return (
    <div className="rounded-xl border border-charcoal/10 overflow-hidden bg-white">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={sectionElementId}
        className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-charcoal/[0.015] transition-colors duration-150"
      >
        <div className="min-w-0 flex-1">
          <p className="font-heading font-semibold text-[1rem] text-charcoal leading-tight">
            {title}
          </p>
          <p className="text-[12px] text-charcoal/55 leading-[1.5] mt-0.5">
            {description}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {showSubtotal && (
            <span className="text-sm font-semibold text-green-dark tabular-nums">
              {subtotalLabel ? `${subtotalLabel} ` : ""}
              {formatGbp(subtotal)}
            </span>
          )}
          <svg
            className={`w-5 h-5 text-charcoal/35 transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m19.5 8.25-7.5 7.5-7.5-7.5"
            />
          </svg>
        </div>
      </button>
      {isOpen && (
        <div
          id={sectionElementId}
          className="border-t border-charcoal/8 p-4 bg-charcoal/[0.01] space-y-4"
        >
          {children}
        </div>
      )}
    </div>
  );
}

interface MoneyInputProps {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
}

function MoneyInput({ label, hint, value, onChange }: MoneyInputProps) {
  return (
    <div>
      <label className="block text-[13px] font-medium text-charcoal mb-1">
        {label}
      </label>
      {hint && (
        <p className="text-[11.5px] text-charcoal/55 leading-[1.5] mb-1.5">
          {hint}
        </p>
      )}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-grey font-medium text-sm">
          £
        </span>
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0"
          min="0"
          className="w-full pl-7 pr-3 py-2.5 rounded-lg border border-charcoal/10 text-charcoal text-base placeholder:text-grey/40 focus:outline-none focus:border-green/40 focus:ring-2 focus:ring-green/10 transition-colors duration-150"
        />
      </div>
    </div>
  );
}

interface WeightInputProps {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  computedValue: number;
}

function WeightInput({ label, hint, value, onChange, computedValue }: WeightInputProps) {
  return (
    <div>
      <label className="block text-[13px] font-medium text-charcoal mb-1">
        {label}
      </label>
      {hint && (
        <p className="text-[11.5px] text-charcoal/55 leading-[1.5] mb-1.5">
          {hint}
        </p>
      )}
      <div className="relative">
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0"
          min="0"
          className="w-full pl-3 pr-12 py-2.5 rounded-lg border border-charcoal/10 text-charcoal text-base placeholder:text-grey/40 focus:outline-none focus:border-green/40 focus:ring-2 focus:ring-green/10 transition-colors duration-150"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-grey font-medium text-sm">
          g
        </span>
      </div>
      {computedValue > 0 && (
        <p className="text-[11.5px] text-charcoal/55 mt-1">
          ≈ {formatGbp(computedValue)} at current spot price
        </p>
      )}
    </div>
  );
}

interface ModeToggleProps {
  mode: WeightMode;
  onChange: (mode: WeightMode) => void;
  labelGrams: string;
  labelGbp: string;
}

function ModeToggle({ mode, onChange, labelGrams, labelGbp }: ModeToggleProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Input mode"
      className="inline-flex items-center gap-1 bg-white rounded-full p-0.5 border border-charcoal/10"
    >
      <button
        type="button"
        role="radio"
        aria-checked={mode === "grams"}
        onClick={() => onChange("grams")}
        className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-colors duration-150 ${
          mode === "grams"
            ? "bg-green text-white"
            : "text-charcoal/55 hover:text-charcoal/75"
        }`}
      >
        {labelGrams}
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={mode === "gbp"}
        onClick={() => onChange("gbp")}
        className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-colors duration-150 ${
          mode === "gbp"
            ? "bg-green text-white"
            : "text-charcoal/55 hover:text-charcoal/75"
        }`}
      >
        {labelGbp}
      </button>
    </div>
  );
}

interface ResultCardProps {
  calc: {
    assetsTotal: number;
    liabilitiesEffective: number;
    netWealth: number;
    zakat: number;
    meetsNisab: boolean;
    hasAnyInput: boolean;
  };
  currentNisab: number;
}

function ResultCard({ calc, currentNisab }: ResultCardProps) {
  if (!calc.hasAnyInput) {
    return (
      <div className="mt-6 p-5 rounded-xl bg-charcoal/[0.025] border border-charcoal/10 text-center">
        <p className="text-sm text-charcoal/55">
          Expand the categories above and enter your wealth to calculate your
          Zakat.
        </p>
      </div>
    );
  }

  if (!calc.meetsNisab) {
    return (
      <div className="mt-6 p-5 rounded-xl bg-charcoal/[0.025] border border-charcoal/10 text-center">
        <p className="text-sm text-charcoal/65 mb-1">
          Your net Zakatable wealth is {formatGbp(calc.netWealth)}.
        </p>
        <p className="text-sm text-charcoal/65">
          This is below the nisab threshold of{" "}
          {formatGbp(currentNisab)} — Zakat may not be due. Consult your
          scholar for guidance.
        </p>
      </div>
    );
  }

  const roundedZakat = Math.round(calc.zakat);

  return (
    <div className="mt-6 p-5 rounded-xl bg-green-light/50 border border-green/15 text-center">
      <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-green/75 mb-1">
        Your Zakat
      </p>
      <p className="text-4xl font-heading font-bold text-green-dark mb-1.5 tabular-nums">
        {formatGbp(calc.zakat)}
      </p>
      <p className="text-[12px] text-charcoal/55 mb-4">
        On {formatGbp(calc.netWealth)} of net Zakatable wealth (assets{" "}
        {formatGbp(calc.assetsTotal)} − liabilities{" "}
        {formatGbp(calc.liabilitiesEffective)})
      </p>
      <Link
        href={`/donate?campaign=zakat&amount=${roundedZakat}&frequency=one-time`}
        className="inline-flex w-full items-center justify-center px-8 py-4 rounded-full bg-amber text-charcoal hover:bg-amber-dark font-semibold shadow-sm text-base transition-colors duration-200"
      >
        Pay £{roundedZakat.toLocaleString()} Zakat
      </Link>
    </div>
  );
}
