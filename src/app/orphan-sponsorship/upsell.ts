/**
 * Donation upsell ("make your gift go further") logic for orphan sponsorship.
 *
 * The figures below are deliberately conservative and grounded in real,
 * publicly-stated costs of relief work in Bangladesh (mid-2020s, ~£1 ≈ 140 BDT)
 * so the on-site claims don't overstate impact. Sources reviewed:
 *
 *   - Nutritious meals: UK/BD charities price a single hot/iftar meal at
 *     ~75–100 BDT (£0.50–0.70); a month of a child's food lands around £15–20.
 *     A full family food pack runs ~4,500 BDT / £32. → food-month ≈ £20.
 *   - Winter blankets: ~600 BDT (£4–5) per thick blanket; £10 = two blankets.
 *   - Winter clothing (hoodie + wool cap + sweater): ~850–1,150 BDT → ~£7–8.
 *   - Eid gift (new clothes + treats for a child): UK charities price £15–35.
 *   - School / education kit (2 uniforms, books, bag, stationery): ~£20.
 *     Year-round education sponsorship is widely sold at £25/month.
 *   - Full child care for a month (food + shelter + schooling + healthcare):
 *     the sector benchmark — and Deen Relief's own price — is ~£30/month.
 *
 * These map to a single "food-month" unit of £20 (one child fed for a month),
 * which we scale into truthful integer multiples for larger gifts.
 */

export interface UpsellChip {
  /** How much to add to the current gift, in GBP. */
  add: number;
  /** Short, concrete outcome the added amount funds. */
  outcome: string;
}

/** £ that feeds one child a month of nutritious meals (see header note). */
const FOOD_MONTH_GBP = 20;

/**
 * Curated ladder of small, varied, real outcomes for typical gift sizes.
 * Ascending by `add`. Each entry is independently sourced (see header).
 */
const UPSELL_UNITS: UpsellChip[] = [
  { add: 5, outcome: "a week of hot, nutritious meals" },
  { add: 8, outcome: "a warm winter clothing set" },
  { add: 10, outcome: "two thick blankets for the cold season" },
  { add: 15, outcome: "new clothes and a gift for Eid" },
  { add: 20, outcome: "a full month of nutritious food" },
  { add: 25, outcome: "a complete school kit — uniform, books & bag" },
  { add: 30, outcome: "a full month of care for another child" },
];

/** Round to the nearest £20 (a whole food-month), with a £20 floor. */
function roundToFoodMonth(gbp: number): number {
  return Math.max(FOOD_MONTH_GBP, Math.round(gbp / FOOD_MONTH_GBP) * FOOD_MONTH_GBP);
}

/** Pick up to `n` evenly-spread items from an ascending list (keeps variety). */
function pickSpread(items: UpsellChip[], n: number): UpsellChip[] {
  if (items.length <= n) return items;
  const out: UpsellChip[] = [];
  for (let i = 0; i < n; i++) {
    out.push(items[Math.round((i * (items.length - 1)) / (n - 1))]);
  }
  // Dedupe in case rounding picks the same index twice.
  return out.filter((chip, i) => out.indexOf(chip) === i);
}

/**
 * Suggested "boost" chips for the donor's current gift. Adaptive:
 *   - Small/typical gifts (< £50) get a spread of concrete, varied add-ons,
 *     skipping any that are trivially small relative to what they're giving.
 *   - Larger gifts get proportionate, truthful food-month multiples (e.g.
 *     "+£60 · a month of nutritious food for 3 children") so the nudge stays
 *     meaningful without ever overstating impact.
 *
 * Pure function of `amount` — safe to call on every render.
 */
export function getUpsellChips(amount: number): UpsellChip[] {
  if (!Number.isFinite(amount) || amount <= 0) return [];

  if (amount < 50) {
    // Ignore add-ons smaller than ~20% of the current gift so a £40 donor
    // isn't nudged to add £5.
    const floor = Math.max(5, Math.round(amount * 0.2));
    const inWindow = UPSELL_UNITS.filter((u) => u.add >= floor);
    const pool = inWindow.length >= 3 ? inWindow : UPSELL_UNITS;
    return pickSpread(pool, 3);
  }

  // Large gifts: 25% / 50% / 100% top-ups, each snapped to a whole food-month
  // so the child count is always exact and honest.
  const adds = [amount * 0.25, amount * 0.5, amount].map(roundToFoodMonth);
  const unique = [...new Set(adds)];
  return unique.slice(0, 3).map((add) => {
    const children = add / FOOD_MONTH_GBP;
    return {
      add,
      outcome:
        children === 1
          ? "a full month of nutritious food for a child"
          : `a month of nutritious food for ${children} children`,
    };
  });
}
