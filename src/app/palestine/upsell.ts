import type { UpsellConfig } from "@/lib/donation-upsell";

/**
 * Palestine / Gaza emergency relief upsell ladder.
 *
 * Figures use charity-stated "your £X provides" pricing (NOT war-inflated
 * local market prices) so the claims stay defensible. Sources reviewed:
 *
 *   - A hot meal: World Central Kitchen states £250 = 250 hot meals → ~£1/meal.
 *   - A week of meals for one person: World Food Programme states $10 (~£8) =
 *     a week of meals for a single person. → £10 covers it conservatively.
 *   - Clean water for a family for a month: British Red Cross / Muslim Charity
 *     state £150 = clean water for 10 families for a month → ~£15/family.
 *   - A week's food parcel for a family of five: Deen Relief's own published
 *     Palestine outcome is £25.
 *   - A full month of food for a family: corroborated at £50 across multiple
 *     charities (MATW, IDRF) and Deen Relief's own £50 outcome.
 *
 * Note: a week of food for a *family* is ~£25 (the parcel price), so the £10
 * tier is deliberately scoped to "one person" to avoid overstating reach.
 */
export const PALESTINE_UPSELL: UpsellConfig = {
  ladder: [
    { add: 10, outcome: "a week of hot, nutritious meals for one person" },
    { add: 15, outcome: "clean drinking water for a family for a month" },
    { add: 25, outcome: "a week's food parcel for a family of five" },
    { add: 50, outcome: "a full month of food for a family" },
  ],
  // A family fed for a month ≈ £50. Threshold raised to £100 so £50–99 gifts
  // still see the varied ladder rather than a single month-of-food chip.
  scaleUnit: {
    gbp: 50,
    singular: "a full month of food for a family",
    plural: (n) => `a month of food for ${n} families`,
  },
  largeThreshold: 100,
};
