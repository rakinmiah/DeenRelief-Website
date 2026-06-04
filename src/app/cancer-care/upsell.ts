import type { UpsellConfig } from "@/lib/donation-upsell";

/**
 * Cancer care (refugee children, Gülçük Evi care centre, Adana, Turkey)
 * upsell ladder.
 *
 * The most defensible anchor here is Deen Relief's OWN published cancer-care
 * outcomes, which are charity-vetted and far below private rates:
 *
 *   - Family housing near the hospital: the page states £250 = a month of
 *     family housing → ~£8.30/night. (For reference, Bookimed lists ~$100/night
 *     for private accompanying-person accommodation in Turkey, so a charity
 *     guesthouse night at ~£8–10 is conservative.) → £10 = one night.
 *   - Nutritious meals for a child in treatment: the page states £50 = a week
 *     of meals → ~£7.10/day. → £15 ≈ two days, £50 = a full week.
 *
 * Every tier below is covered by these per-unit costs with margin to spare,
 * so nothing is overstated.
 */
export const CANCER_CARE_UPSELL: UpsellConfig = {
  ladder: [
    { add: 10, outcome: "a night of family housing near the hospital" },
    { add: 15, outcome: "two days of nutritious meals for a child in treatment" },
    { add: 25, outcome: "three nights of family housing near the hospital" },
    { add: 50, outcome: "a full week of nutritious meals for a child" },
  ],
  // ~£8.30/night → £10 comfortably covers a night's family housing.
  scaleUnit: {
    gbp: 10,
    singular: "a night of family housing near the hospital",
    plural: (n) => `${n} nights of family housing near the hospital`,
  },
  // Defaults here are high (£50/£100), so keep the varied meals+housing ladder
  // for those and only switch to night-multiples for genuinely large gifts.
  largeThreshold: 120,
};
