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
