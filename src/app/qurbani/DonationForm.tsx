"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Button from "@/components/Button";

/**
 * Qurbani has a structured product catalogue (animal × country = fixed
 * price), unlike the abstract amount tiers used on other campaign pages.
 * This form surfaces every option upfront so an older audience — much of
 * the paid traffic for this page — can read all prices before committing.
 *
 * Deviations from the standard campaign DonationForm pattern:
 *   - No frequency toggle (Qurbani is annual; "save monthly" framings
 *     felt forced and added a decision the donor doesn't need)
 *   - No generic amount tiles (the products themselves carry the prices)
 *   - No custom amount input (Qurbani prices are fixed by livestock cost;
 *     a custom amount has no concrete meaning here)
 *
 * Everything else from the standard form is preserved: trust line, outcome
 * confirmation after selection, Gift Aid callout, dynamic CTA, payment
 * methods row, Islamic-compliance microcopy, Zakat/Sadaqah recovery links.
 *
 * Layout: fully centered to mirror the Zakat panel's treatment.
 */

interface QurbaniOption {
  /** Stable id used for selection state and as React key. */
  id: string;
  animal: string;
  /** GBP integer; passed straight to the /donate URL. */
  amount: number;
  /** Sentence shown after the donor selects this option. */
  outcome: string;
}

interface CountryGroup {
  country: string;
  options: QurbaniOption[];
}

// Order: Bangladesh / Pakistan / Syria first (each has 3 options and
// fills its grid), India last (single option, centered standalone tile —
// keeping it at the bottom avoids breaking the visual rhythm of the rows
// above).
const COUNTRIES: CountryGroup[] = [
  {
    country: "Bangladesh",
    options: [
      {
        id: "bd-sheep",
        animal: "Sheep",
        amount: 50,
        outcome: "Your Qurbani sheep — performed in rural Bangladesh, distributed to a family in need.",
      },
      {
        id: "bd-half-cow",
        animal: "Half Cow",
        amount: 240,
        outcome: "Your half cow share — feeds multiple families in rural Bangladesh on Eid.",
      },
      {
        id: "bd-cow",
        animal: "Cow",
        amount: 480,
        outcome: "A full cow Qurbani in Bangladesh — meat distributed to up to seven households.",
      },
    ],
  },
  {
    country: "Pakistan",
    options: [
      {
        id: "pk-sheep",
        animal: "Sheep",
        amount: 70,
        outcome: "Your Qurbani sheep — performed locally in Pakistan, distributed to a family in need.",
      },
      {
        id: "pk-half-cow",
        animal: "Half Cow",
        amount: 240,
        outcome: "Your half cow share in Pakistan — feeds multiple families on Eid.",
      },
      {
        id: "pk-cow",
        animal: "Cow",
        amount: 480,
        outcome: "A full cow Qurbani in Pakistan — meat distributed to up to seven households.",
      },
    ],
  },
  {
    country: "Syria",
    options: [
      {
        id: "sy-sheep",
        animal: "Sheep",
        amount: 250,
        outcome: "Your Qurbani sheep in Syria — distributed in conflict-affected regions where need is high.",
      },
      {
        id: "sy-half-cow",
        animal: "Half Cow",
        amount: 650,
        outcome: "Your half cow share in Syria — feeds multiple families in conflict-affected areas.",
      },
      {
        id: "sy-cow",
        animal: "Cow",
        amount: 1300,
        outcome: "A full cow Qurbani in Syria — meat distributed to up to seven households in great need.",
      },
    ],
  },
  {
    country: "India",
    options: [
      {
        id: "in-goat",
        animal: "Goat",
        amount: 120,
        outcome: "Your Qurbani goat — distributed to families through our partners in India.",
      },
    ],
  },
];

/** Default — Bangladesh sheep is the entry-level, most-affordable option. */
const DEFAULT_ID = "bd-sheep";

/**
 * Whitelist of valid `?preselect=` values, derived from COUNTRIES so it
 * stays in sync with the catalogue automatically.
 */
const VALID_IDS = new Set(COUNTRIES.flatMap((c) => c.options.map((o) => o.id)));

export default function DonationForm() {
  const [selectedId, setSelectedId] = useState<string>(DEFAULT_ID);

  // Inbound deep-link from Google Ads sitelinks (e.g.
  // /qurbani?preselect=sy-cow#donate-form). Read window.location.search
  // post-mount instead of useSearchParams() to keep the page statically
  // prerenderable — useSearchParams forces a Suspense boundary at build
  // time. Bad/unknown values fall through silently to DEFAULT_ID.
  useEffect(() => {
    const preselect = new URLSearchParams(window.location.search).get("preselect");
    if (preselect && VALID_IDS.has(preselect)) {
      setSelectedId(preselect);
    }
  }, []);

  const allOptions = COUNTRIES.flatMap((c) =>
    c.options.map((o) => ({ ...o, country: c.country }))
  );
  const selected = allOptions.find((o) => o.id === selectedId) ?? allOptions[0];

  return (
    <div className="text-center">
      <span className="inline-block text-[11px] font-bold tracking-[0.1em] uppercase text-green mb-3">
        Eid al-Adha 2026
      </span>
      <h2 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal leading-tight mb-3">
        Choose Your Qurbani
      </h2>
      <p className="text-grey text-base sm:text-[1.0625rem] leading-[1.7] mb-1">
        Select your animal and country. Each Qurbani is performed locally
        and the meat is distributed to families in need.
      </p>
      <p className="text-green text-xs font-semibold mb-7">
        Trusted by 3,200+ donors since 2013 · Order by 23 May 2026
      </p>

      {/* Country-grouped product picker */}
      <div className="space-y-6 mb-6">
        {COUNTRIES.map((c) => {
          const isSingle = c.options.length === 1;
          return (
            <div key={c.country}>
              <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-charcoal/55 mb-2.5">
                {c.country}
              </p>
              <div
                className={
                  isSingle
                    ? "flex justify-center"
                    : "grid grid-cols-2 sm:grid-cols-3 gap-2.5"
                }
              >
                {c.options.map((o) => {
                  const isSelected = selectedId === o.id;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => setSelectedId(o.id)}
                      aria-pressed={isSelected}
                      // Orphan-row centering for the 3rd tile in 3-option
                      // countries: at mobile (grid-cols-2) the third tile
                      // would otherwise sit alone in the leftmost cell of
                      // row 2. The `last:` rules below give it col-span-2
                      // + a half-width max-width + mx-auto so it sits
                      // centered with the same width as a single column
                      // tile above. At sm+ (grid-cols-3) the rules reset.
                      className={`flex flex-col items-center justify-center gap-1 py-4 px-3 rounded-xl border-2 transition-all duration-200 text-center ${
                        isSingle
                          ? "min-w-[160px]"
                          : "last:col-span-2 last:w-[calc(50%-5px)] last:mx-auto sm:last:col-span-1 sm:last:w-auto sm:last:mx-0"
                      } ${
                        isSelected
                          ? "border-green bg-green-light"
                          : "border-grey-light bg-white hover:border-green/40"
                      }`}
                    >
                      <span
                        className={`font-heading font-semibold text-[1rem] ${
                          isSelected ? "text-green-dark" : "text-charcoal"
                        }`}
                      >
                        {o.animal}
                      </span>
                      <span
                        className={`font-heading font-bold text-xl tabular-nums ${
                          isSelected ? "text-green" : "text-charcoal/70"
                        }`}
                      >
                        £{o.amount.toLocaleString()}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected confirmation — restructured for centered context: icon
          inline with the bold confirmation line, outcome sentence below. */}
      <div className="mb-5 p-4 rounded-xl bg-green-light/50 border border-green/15">
        <div className="flex items-center justify-center gap-2 mb-1">
          <svg
            className="w-4 h-4 flex-shrink-0 text-green"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          <p className="text-sm font-semibold text-green-dark">
            You&apos;re paying for: {selected.animal} — {selected.country}
          </p>
        </div>
        <p className="text-[0.875rem] leading-[1.55] text-green-dark/80">
          {selected.outcome}
        </p>
      </div>

      {/* Gift Aid callout */}
      <p className="text-[13px] text-green/75 font-medium mb-5 flex items-center justify-center gap-1.5">
        <svg
          className="w-3.5 h-3.5 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
          />
        </svg>
        With Gift Aid: £{Math.round(selected.amount * 1.25).toLocaleString()} at no extra cost
      </p>

      <Button
        variant="primary"
        size="lg"
        href={`/donate?campaign=qurbani&amount=${selected.amount}&frequency=one-time`}
        className="w-full justify-center"
      >
        Pay £{selected.amount.toLocaleString()} Qurbani Now
      </Button>

      <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-grey/60 font-medium">
        <svg
          className="w-3 h-3 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
          />
        </svg>
        <span>Secure checkout · Apple Pay · Google Pay · Card</span>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2.5 mt-3 text-[11px] text-grey/60 font-medium">
        <span>Performed in accordance with Islamic guidelines</span>
        <span className="text-grey/25">·</span>
        <span>Reg. charity 1158608</span>
      </div>

      <p className="mt-4 pt-4 border-t border-grey-light/70 text-[12px] text-grey/70">
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
