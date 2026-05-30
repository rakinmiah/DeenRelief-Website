/**
 * Static "add a one-off gift" cards for the confirm step of a ONE-TIME
 * Palestine / Gaza checkout. Figures reuse the charity-stated pricing
 * documented in ./upsell.ts (WFP ~£10/week/person meals; British Red Cross
 * ~£15/family/month water; ~£15 winter blanket; £25 family food parcel; £50 a
 * month of family food). Kept conservative so nothing is overstated.
 *
 * `image` is an optional real, consented photo under /public/upsell/; until
 * supplied each card falls back to an on-brand illustration keyed by `icon`.
 */
import type { UpsellCard } from "@/lib/donation-upsell";

export const PALESTINE_UPSELL_CARDS: UpsellCard[] = [
  {
    id: "meals-week",
    add: 10,
    title: "A week of hot meals",
    description: "Nutritious meals for one person for a week.",
    icon: "meal",
  },
  {
    id: "clean-water",
    add: 15,
    title: "Clean water for a family",
    description: "Safe drinking water for a family for a month.",
    icon: "water",
  },
  {
    id: "winter-blanket",
    add: 20,
    title: "A warm blanket & essentials",
    description: "Keep a displaced family warm through winter.",
    icon: "blanket",
  },
  {
    id: "food-parcel",
    add: 25,
    title: "A family food parcel",
    description: "A week's food parcel for a family of five.",
    icon: "parcel",
  },
  {
    id: "food-month",
    add: 50,
    title: "A month of family food",
    description: "A full month of food for a displaced family.",
    icon: "parcel",
  },
];
