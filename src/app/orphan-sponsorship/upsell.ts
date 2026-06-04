import type { UpsellConfig } from "@/lib/donation-upsell";

/**
 * Orphan sponsorship upsell ladder (Bangladesh).
 *
 * Figures are deliberately conservative and grounded in real, publicly-stated
 * costs of relief work in Bangladesh (mid-2020s, ~£1 ≈ 140 BDT) so the on-site
 * claims don't overstate impact. Sources reviewed:
 *
 *   - Nutritious meals: a single hot/iftar meal is priced at ~75–100 BDT
 *     (£0.50–0.70); a month of a child's food lands around £15–20. A full
 *     family food pack runs ~4,500 BDT / £32. → food-month ≈ £20.
 *   - School supplies: UK charities sell a complete school stationery pack
 *     (exercise books, pencils, ruler) at ~£6; Bangladesh retail puts
 *     notebooks at 50–300 BDT and pencils/erasers at 10–100 BDT.
 *   - Winter blankets: ~600 BDT (£4–5) per thick blanket; £10 = two blankets.
 *   - A month of schooling (lessons + learning support): year-round education
 *     sponsorship is widely sold at ~£25/month ($1/day), so £15 is conservative.
 *   - School / education kit (2 uniforms, books, bag, stationery): ~£20.
 *   - Full child care for a month (food + shelter + schooling + healthcare):
 *     the sector benchmark — and Deen Relief's own price — is ~£30/month.
 */
export const ORPHAN_UPSELL: UpsellConfig = {
  ladder: [
    { add: 5, outcome: "a week of hot, nutritious meals" },
    { add: 6, outcome: "a school supplies pack — exercise books, pencils & ruler" },
    { add: 10, outcome: "two thick blankets for the cold season" },
    { add: 15, outcome: "a month of lessons and learning support" },
    { add: 20, outcome: "a full month of nutritious food" },
    { add: 25, outcome: "a complete school kit — uniform, books & bag" },
    { add: 30, outcome: "a full month of care for another child" },
  ],
  // One child fed for a month ≈ £20 (see note above).
  scaleUnit: {
    gbp: 20,
    singular: "a full month of nutritious food for a child",
    plural: (n) => `a month of nutritious food for ${n} children`,
  },
};
