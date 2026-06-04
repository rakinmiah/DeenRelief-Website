import type { UpsellConfig } from "@/lib/donation-upsell";

/**
 * UK homeless (Brighton street outreach) upsell ladder.
 *
 * Figures are grounded in UK homeless-charity pricing. Sources reviewed:
 *
 *   - A hot meal: Focus4Hope state £5 for a community hot meal. (Deen Relief's
 *     own outreach outcome of £25 = "feeds five" implies the same ~£5/person.)
 *   - A hygiene / essentials pack: SHARE sell an emergency pack at £10;
 *     Focus4Hope price an underwear + hand-warmers pack at £10.
 *   - A warm, waterproof sleeping bag: charity wholesalers (Bags in Bulk UK)
 *     list cold-weather sleeping bags from ~£13. → £15 covers it.
 *   - A full winter / rough-sleeper kit (warm clothes, sleeping bag, shoes):
 *     Clock Tower Sanctuary sell their Rough Sleepers Kit at £27. → £25 is
 *     a conservative round figure for the same idea.
 *   - A full evening of hot meals & supplies: Deen Relief's own £50 outcome.
 */
export const UK_HOMELESS_UPSELL: UpsellConfig = {
  ladder: [
    { add: 5, outcome: "a hot meal for someone sleeping rough" },
    { add: 10, outcome: "a hygiene & essentials pack" },
    { add: 15, outcome: "a warm, waterproof sleeping bag" },
    { add: 25, outcome: "a full winter kit — warm clothes, sleeping bag & shoes" },
    { add: 50, outcome: "a full evening of hot meals & supplies on outreach" },
  ],
  // ~£5 puts a hot meal in someone's hands (Focus4Hope; £25 = feeds five).
  scaleUnit: {
    gbp: 5,
    singular: "a hot meal for one more person",
    plural: (n) => `hot meals for ${n} people on our outreach`,
  },
};
