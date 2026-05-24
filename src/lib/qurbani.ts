/**
 * Single source of truth for the Qurbani 2026 campaign window.
 *
 * Used by:
 *   - src/app/qurbani/HeroDeadline.tsx — drives the live ticking countdown
 *   - src/components/Header.tsx        — auto-hides the "Qurbani" nav link
 *                                        once the deadline passes
 *
 * After the deadline, any new request will SSR without the Qurbani nav
 * entry; the homepage countdown switches to "Final orders being processed".
 *
 * To run a future Qurbani campaign, update this date — both places follow.
 *
 * Date is Europe/London end-of-day 25 May 2026 (UK donor base).
 */
export const QURBANI_DEADLINE = new Date("2026-05-25T23:59:59+01:00");

/**
 * Returns true while the Qurbani campaign is still accepting orders.
 * Pass an explicit `now` for testing; defaults to wall-clock time.
 */
export function isQurbaniLive(now: number = Date.now()): boolean {
  return now < QURBANI_DEADLINE.getTime();
}

export interface QurbaniProduct {
  /** Country the Qurbani is performed in. */
  country: string;
  /** Animal label, matching the wording on the donate form. */
  animal: string;
  /**
   * Islamic share count. A sheep or goat = 1 share (cannot be subdivided).
   * A cow can be performed in the names of up to 7 people. A half cow gets
   * 3 (rounded down from 3.5). Doubles as the cap on how many names a donor
   * may attach (one name per share).
   */
  shares: number;
}

/**
 * Canonical Qurbani product catalogue — single source of truth for the
 * country / animal / share count behind each product id. The product id
 * encodes `{country}-{animal}` (e.g. "bd-cow" = Bangladesh cow).
 *
 * Mirror any new products in src/app/qurbani/DonationForm.tsx (which holds
 * the donor-facing prices + marketing copy). Animal wording here matches
 * that form so the admin shows donors exactly what they selected.
 */
const QURBANI_PRODUCTS: Record<string, QurbaniProduct> = {
  "bd-sheep": { country: "Bangladesh", animal: "Sheep", shares: 1 },
  "bd-half-cow": { country: "Bangladesh", animal: "Half Cow", shares: 3 },
  "bd-cow": { country: "Bangladesh", animal: "Cow", shares: 7 },
  "pk-sheep": { country: "Pakistan", animal: "Sheep", shares: 1 },
  "pk-half-cow": { country: "Pakistan", animal: "Half Cow", shares: 3 },
  "pk-cow": { country: "Pakistan", animal: "Cow", shares: 7 },
  "sy-sheep": { country: "Syria", animal: "Sheep", shares: 1 },
  "sy-half-cow": { country: "Syria", animal: "Half Cow", shares: 3 },
  "sy-cow": { country: "Syria", animal: "Cow", shares: 7 },
  "in-goat": { country: "India", animal: "Goat", shares: 1 },
};

/** Decode a product id into its country / animal / share count, or null. */
export function describeQurbaniProduct(
  productId: string
): QurbaniProduct | null {
  return QURBANI_PRODUCTS[productId] ?? null;
}

/** Returns the max number of names for a Qurbani product, or null if id unknown. */
export function getQurbaniShareCount(productId: string): number | null {
  return QURBANI_PRODUCTS[productId]?.shares ?? null;
}

/** Whitelist of valid Qurbani product ids. */
export const VALID_QURBANI_PRODUCT_IDS = Object.keys(QURBANI_PRODUCTS);

/** Max name length per share (defensive cap; UI shows shorter guidance). */
export const QURBANI_NAME_MAX_LENGTH = 100;
