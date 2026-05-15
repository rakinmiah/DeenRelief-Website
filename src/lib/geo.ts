/**
 * Donor geo + currency context.
 *
 * Used by the donate flow to (a) hide UK-only affordances (Gift Aid)
 * from international visitors and (b) show a friendly local-currency
 * hint alongside the GBP amount so donors who think in $/€/etc. don't
 * have to do FX math in their head.
 *
 * Source of truth for country: Vercel's `x-vercel-ip-country` header,
 * populated by the edge for every request. Falls back to "GB" when
 * the header is missing (local dev, non-Vercel hosts) so the donate
 * page renders the UK experience by default — that's the safest
 * default since the UK affordances are a superset of the
 * international ones.
 *
 * Currency rates are STATIC and meant for display only. We never
 * transact in these currencies — Stripe still charges in GBP. The
 * stale-by-a-percent-or-two rate doesn't matter when the customer-
 * facing text says "~$25" and the actual charge is the GBP amount.
 * If a rate drifts beyond ±5% from market for a couple of months
 * (e.g. major FX shock), update the table here.
 *
 * Rate last reviewed: Q2 2026. Re-check at least quarterly.
 */

export type CountryCode = string; // ISO 3166-1 alpha-2

export interface CurrencyInfo {
  /** ISO 4217 code (USD, EUR, etc.) */
  code: string;
  /** Symbol used in display strings ("$", "€", "kr", etc.) */
  symbol: string;
  /** Multiplier from GBP. £1 × ratePerGbp = local-currency amount. */
  ratePerGbp: number;
  /** When to round to whole units (true for currencies that don't
   *  use decimals in casual display, e.g. PKR/JPY/INR). */
  roundToWhole: boolean;
}

// ─── Country → currency mapping ──────────────────────────────────
//
// We don't need every country on earth — only the ones we expect
// material donor volume from. Countries not in this map default to
// USD (the global lingua-franca currency for donations from
// "anywhere else"). Adding a row here is the right move when
// analytics shows a country we don't currently target.

const COUNTRY_CURRENCY: Record<CountryCode, string> = {
  // English-speaking
  US: "USD",
  CA: "CAD",
  AU: "AUD",
  NZ: "NZD",
  IE: "EUR",

  // Eurozone (manually enumerated — Set is faster than checking a
  // huge OR-chain in code paths that the donate page hits)
  AT: "EUR",
  BE: "EUR",
  HR: "EUR",
  CY: "EUR",
  EE: "EUR",
  FI: "EUR",
  FR: "EUR",
  DE: "EUR",
  GR: "EUR",
  IT: "EUR",
  LV: "EUR",
  LT: "EUR",
  LU: "EUR",
  MT: "EUR",
  NL: "EUR",
  PT: "EUR",
  SK: "EUR",
  SI: "EUR",
  ES: "EUR",

  // Nordic non-Euro
  NO: "NOK",
  SE: "SEK",
  DK: "DKK",
  CH: "CHF",

  // Muslim-majority donor regions (highest likely volume for an
  // Islamic charity)
  AE: "AED",
  SA: "SAR",
  QA: "QAR",
  KW: "KWD",
  BH: "BHD",
  OM: "OMR",
  TR: "TRY",
  PK: "PKR",
  BD: "BDT",
  ID: "IDR",
  MY: "MYR",
  EG: "EGP",
  MA: "MAD",
  NG: "NGN",

  // South Asia + Africa diaspora
  IN: "INR",
  LK: "LKR",
  ZA: "ZAR",
  KE: "KES",

  // Other notable
  JP: "JPY",
  SG: "SGD",
  HK: "HKD",
};

// ─── Currency info (rate per GBP + display metadata) ─────────────

const CURRENCIES: Record<string, CurrencyInfo> = {
  USD: { code: "USD", symbol: "$", ratePerGbp: 1.27, roundToWhole: false },
  EUR: { code: "EUR", symbol: "€", ratePerGbp: 1.18, roundToWhole: false },
  CAD: { code: "CAD", symbol: "CA$", ratePerGbp: 1.73, roundToWhole: false },
  AUD: { code: "AUD", symbol: "A$", ratePerGbp: 1.92, roundToWhole: false },
  NZD: { code: "NZD", symbol: "NZ$", ratePerGbp: 2.1, roundToWhole: false },
  CHF: { code: "CHF", symbol: "CHF ", ratePerGbp: 1.13, roundToWhole: false },
  NOK: { code: "NOK", symbol: "kr ", ratePerGbp: 13.8, roundToWhole: true },
  SEK: { code: "SEK", symbol: "kr ", ratePerGbp: 13.5, roundToWhole: true },
  DKK: { code: "DKK", symbol: "kr ", ratePerGbp: 8.8, roundToWhole: true },

  AED: { code: "AED", symbol: "AED ", ratePerGbp: 4.66, roundToWhole: false },
  SAR: { code: "SAR", symbol: "SAR ", ratePerGbp: 4.76, roundToWhole: false },
  QAR: { code: "QAR", symbol: "QAR ", ratePerGbp: 4.62, roundToWhole: false },
  KWD: { code: "KWD", symbol: "KD ", ratePerGbp: 0.39, roundToWhole: false },
  BHD: { code: "BHD", symbol: "BD ", ratePerGbp: 0.48, roundToWhole: false },
  OMR: { code: "OMR", symbol: "OMR ", ratePerGbp: 0.49, roundToWhole: false },
  TRY: { code: "TRY", symbol: "₺", ratePerGbp: 41, roundToWhole: true },
  EGP: { code: "EGP", symbol: "E£", ratePerGbp: 62, roundToWhole: true },
  MAD: { code: "MAD", symbol: "MAD ", ratePerGbp: 12.7, roundToWhole: false },
  NGN: { code: "NGN", symbol: "₦", ratePerGbp: 2100, roundToWhole: true },

  PKR: { code: "PKR", symbol: "₨", ratePerGbp: 355, roundToWhole: true },
  BDT: { code: "BDT", symbol: "৳", ratePerGbp: 150, roundToWhole: true },
  IDR: { code: "IDR", symbol: "Rp ", ratePerGbp: 20500, roundToWhole: true },
  MYR: { code: "MYR", symbol: "RM ", ratePerGbp: 5.97, roundToWhole: false },
  INR: { code: "INR", symbol: "₹", ratePerGbp: 105, roundToWhole: true },
  LKR: { code: "LKR", symbol: "LKR ", ratePerGbp: 380, roundToWhole: true },
  ZAR: { code: "ZAR", symbol: "R", ratePerGbp: 23.5, roundToWhole: false },
  KES: { code: "KES", symbol: "KSh ", ratePerGbp: 165, roundToWhole: true },

  JPY: { code: "JPY", symbol: "¥", ratePerGbp: 195, roundToWhole: true },
  SGD: { code: "SGD", symbol: "S$", ratePerGbp: 1.7, roundToWhole: false },
  HKD: { code: "HKD", symbol: "HK$", ratePerGbp: 9.9, roundToWhole: false },
};

// ─── Public API ──────────────────────────────────────────────────

/**
 * True when the request's detected country is the UK. UK-only
 * affordances (Gift Aid) should be gated behind this.
 *
 * Returns true for "GB" or when country is null/empty. Treating
 * "unknown" as UK is the safest default because the UK donate
 * experience is a strict superset of the international one — a
 * UK donor with a flaky VPN gets the right experience; a US donor
 * in an edge-case where geo fails gets a slightly-wrong (Gift-Aid
 * checkbox shown) experience but can still complete the donation
 * (Gift Aid is opt-in, they just don't tick it).
 */
export function isUKDonor(country: CountryCode | null | undefined): boolean {
  if (!country) return true;
  return country.toUpperCase() === "GB";
}

/**
 * Resolve the donor's likely local currency. Returns the GBP info
 * for UK and unknown donors. Always returns a real CurrencyInfo —
 * never null — so callers don't need to branch on absence.
 */
export function currencyForCountry(
  country: CountryCode | null | undefined
): CurrencyInfo {
  if (!country || isUKDonor(country)) {
    return GBP_INFO;
  }
  const code =
    COUNTRY_CURRENCY[country.toUpperCase()] ?? "USD"; // fallback
  return CURRENCIES[code] ?? CURRENCIES.USD;
}

/**
 * Format a GBP amount as a local-currency string for display
 * alongside the canonical £ amount. Examples:
 *   convertGbpForDisplay(50, "US")  → "~$64"
 *   convertGbpForDisplay(50, "AE")  → "~AED 233"
 *   convertGbpForDisplay(50, "PK")  → "~₨ 17,750"
 *   convertGbpForDisplay(50, "GB")  → null  (no hint needed)
 *
 * Returns null when the country is UK or unknown so callers can
 * conditionally render the hint without a separate isUK branch.
 */
export function convertGbpForDisplay(
  gbp: number,
  country: CountryCode | null | undefined
): string | null {
  if (isUKDonor(country)) return null;
  const currency = currencyForCountry(country);
  if (currency.code === "GBP") return null;
  const local = gbp * currency.ratePerGbp;
  const rounded = currency.roundToWhole ? Math.round(local) : local;
  // Use Intl.NumberFormat for thousands separators, dropping
  // decimals for round-to-whole currencies so PKR doesn't render
  // as "₨ 17,750.00".
  const formatted = new Intl.NumberFormat("en-GB", {
    minimumFractionDigits: currency.roundToWhole ? 0 : 0,
    maximumFractionDigits: currency.roundToWhole ? 0 : 2,
  }).format(rounded);
  return `~${currency.symbol}${formatted}`;
}

// Internal GBP "info" record — returned for UK/unknown donors so
// the API never has to return null and force a branch at every call
// site. Public callers should use isUKDonor() to decide whether to
// render anything at all.
const GBP_INFO: CurrencyInfo = {
  code: "GBP",
  symbol: "£",
  ratePerGbp: 1,
  roundToWhole: false,
};
