/**
 * Shared "make your gift go further" upsell logic.
 *
 * One adaptive algorithm, many campaigns. Each campaign supplies its own
 * UpsellConfig (a curated ladder of real, costed outcomes + an optional
 * "unit" to scale large gifts by) and this module turns the donor's current
 * amount into up to three suggestion chips:
 *
 *   - Small / typical gifts → a varied spread from the ladder, skipping any
 *     add-on that's trivially small relative to what they're already giving.
 *   - Larger gifts (>= largeThreshold) → proportionate multiples of the
 *     campaign's scale unit, snapped to whole units so quantities are always
 *     exact and never overstated (e.g. "+£60 · a month of food for 3 kids").
 *
 * The figures live in each campaign's own upsell config (with sourcing notes)
 * so the costed claims stay close to the cause copy they describe. This file
 * only owns the selection maths — it never invents numbers.
 */

export interface UpsellChip {
  /** How much to add to the current gift, in GBP. */
  add: number;
  /** Short, concrete outcome the added amount funds. */
  outcome: string;
}

export interface UpsellScaleUnit {
  /** £ value of one repeatable unit (e.g. a month of food, a night's stay). */
  gbp: number;
  /** Outcome text when the add equals exactly one unit. */
  singular: string;
  /** Outcome text for N (>1) units. */
  plural: (count: number) => string;
}

export interface UpsellConfig {
  /** Curated real outcomes, ascending by `add`. Each independently costed. */
  ladder: UpsellChip[];
  /** Optional unit used to scale gifts at/above `largeThreshold`. */
  scaleUnit?: UpsellScaleUnit;
  /** Gift size at which we switch from the ladder to scaled multiples (£50). */
  largeThreshold?: number;
}

/** Pick up to `n` evenly-spread items from an ascending list (keeps variety). */
function pickSpread(items: UpsellChip[], n: number): UpsellChip[] {
  if (items.length <= n) return items;
  const out: UpsellChip[] = [];
  for (let i = 0; i < n; i++) {
    out.push(items[Math.round((i * (items.length - 1)) / (n - 1))]);
  }
  return out.filter((chip, i) => out.indexOf(chip) === i);
}

/**
 * Suggested "boost" chips for the donor's current gift. Pure function of
 * `amount` + the campaign config — safe to call on every render.
 */
export function getUpsellChips(amount: number, config: UpsellConfig): UpsellChip[] {
  const { ladder, scaleUnit, largeThreshold = 50 } = config;
  if (!Number.isFinite(amount) || amount <= 0 || ladder.length === 0) return [];

  const minAdd = ladder[0].add;

  // Small / typical gifts, or campaigns with no scale unit: spread the ladder.
  if (!scaleUnit || amount < largeThreshold) {
    const floor = Math.max(minAdd, Math.round(amount * 0.2));
    const inWindow = ladder.filter((u) => u.add >= floor);
    const pool = inWindow.length >= 3 ? inWindow : ladder;
    return pickSpread(pool, 3);
  }

  // Larger gifts: 25% / 50% / 100% top-ups, each snapped to a whole unit so
  // the quantity (and the claim) is always exact.
  const snap = (gbp: number) =>
    Math.max(scaleUnit.gbp, Math.round(gbp / scaleUnit.gbp) * scaleUnit.gbp);
  const adds = [amount * 0.25, amount * 0.5, amount].map(snap);
  const unique = [...new Set(adds)];
  return unique.slice(0, 3).map((add) => {
    const units = add / scaleUnit.gbp;
    return {
      add,
      outcome: units === 1 ? scaleUnit.singular : scaleUnit.plural(units),
    };
  });
}
