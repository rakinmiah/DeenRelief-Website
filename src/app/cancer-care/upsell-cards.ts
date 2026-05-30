/**
 * Static "add a one-off gift" cards for the confirm step of a ONE-TIME
 * cancer-care checkout (refugee children, Gülçük Evi, Adana). Figures are
 * anchored to the charity's own published outcomes (documented in ./upsell.ts):
 * £250/month family housing → ~£8.30/night; £50/week meals → ~£7.10/day. Every
 * card is covered by those per-unit costs with margin, so nothing is overstated.
 *
 * `image` is an optional real, consented photo under /public/upsell/; until
 * supplied each card falls back to an on-brand illustration keyed by `icon`.
 */
import type { UpsellCard } from "@/lib/donation-upsell";

export const CANCER_CARE_UPSELL_CARDS: UpsellCard[] = [
  {
    id: "housing-night",
    add: 10,
    title: "A night of family housing",
    description: "A night's stay near the hospital for a family.",
    icon: "home",
  },
  {
    id: "meals-2day",
    add: 15,
    title: "Two days of meals",
    description: "Nutritious meals for a child in treatment.",
    icon: "meal",
  },
  {
    id: "housing-3night",
    add: 25,
    title: "Three nights of housing",
    description: "Three nights near the hospital for a family.",
    icon: "home",
  },
  {
    id: "housing-5night",
    add: 40,
    title: "Five nights of housing",
    description: "Family housing near the hospital for five nights.",
    icon: "home",
  },
  {
    id: "meals-week",
    add: 50,
    title: "A week of nutritious meals",
    description: "A full week of meals for a child in treatment.",
    icon: "meal",
  },
];
