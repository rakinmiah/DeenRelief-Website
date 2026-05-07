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
 * Date is Europe/London end-of-day 23 May 2026 (UK donor base).
 */
export const QURBANI_DEADLINE = new Date("2026-05-23T23:59:59+01:00");

/**
 * Returns true while the Qurbani campaign is still accepting orders.
 * Pass an explicit `now` for testing; defaults to wall-clock time.
 */
export function isQurbaniLive(now: number = Date.now()): boolean {
  return now < QURBANI_DEADLINE.getTime();
}

/**
 * Per-product Islamic share count. A sheep or goat = 1 share (cannot be
 * subdivided). A cow can be performed in the names of up to 7 people.
 * A half cow gets 3 (rounded down from 3.5).
 *
 * The share count caps the number of names a donor can attach to a Qurbani
 * at checkout (one name per share). Used by the donate page UI and by
 * /api/donations/confirm for server-side validation. Mirror any new
 * products in src/app/qurbani/DonationForm.tsx.
 */
const QURBANI_PRODUCT_SHARES: Record<string, number> = {
  "bd-sheep": 1, "pk-sheep": 1, "sy-sheep": 1, "in-goat": 1,
  "bd-half-cow": 3, "pk-half-cow": 3, "sy-half-cow": 3,
  "bd-cow": 7, "pk-cow": 7, "sy-cow": 7,
};

/** Returns the max number of names for a Qurbani product, or null if id unknown. */
export function getQurbaniShareCount(productId: string): number | null {
  return QURBANI_PRODUCT_SHARES[productId] ?? null;
}

/** Whitelist of valid Qurbani product ids. */
export const VALID_QURBANI_PRODUCT_IDS = Object.keys(QURBANI_PRODUCT_SHARES);

/** Max name length per share (defensive cap; UI shows shorter guidance). */
export const QURBANI_NAME_MAX_LENGTH = 100;
