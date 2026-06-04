/**
 * Static "add a one-off gift" cards for the confirm step of a ONE-TIME
 * UK homeless (Brighton outreach) checkout. Figures reuse the UK
 * homeless-charity pricing documented in ./upsell.ts (Focus4Hope £5 hot meal;
 * SHARE £10 essentials pack; ~£13 wholesale sleeping bag; Clock Tower Sanctuary
 * £27 rough-sleeper kit; £50 a full outreach evening).
 *
 * `image` is an optional real, consented photo under /public/upsell/; until
 * supplied each card falls back to an on-brand illustration keyed by `icon`.
 */
import type { UpsellCard } from "@/lib/donation-upsell";

export const UK_HOMELESS_UPSELL_CARDS: UpsellCard[] = [
  {
    id: "hot-meal",
    add: 5,
    title: "A hot meal",
    description: "A hot meal for someone sleeping rough.",
    icon: "meal",
  },
  {
    id: "essentials-pack",
    add: 10,
    title: "A hygiene & essentials pack",
    description: "Toiletries, socks and hand warmers.",
    icon: "kit",
  },
  {
    id: "sleeping-bag",
    add: 15,
    title: "A warm sleeping bag",
    description: "A warm, waterproof sleeping bag.",
    icon: "blanket",
  },
  {
    id: "winter-kit",
    add: 25,
    title: "A full winter kit",
    description: "Warm clothes, a sleeping bag and shoes.",
    icon: "kit",
  },
  {
    id: "outreach-evening",
    add: 50,
    title: "A full outreach evening",
    description: "Hot meals and supplies for an evening on the streets.",
    icon: "meal",
  },
];
