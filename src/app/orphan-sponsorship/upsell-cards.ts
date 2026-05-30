/**
 * Static "add a one-off gift" cards shown at the confirm step of a ONE-TIME
 * orphan-sponsorship checkout (see UpsellInterstitial + CheckoutClient).
 *
 * Unlike the donation-panel upsell (which adapts to the amount), this is a
 * fixed set of five image-led, one-off add-ons. Figures reuse the same
 * researched Bangladesh costs documented in ./upsell.ts — kept conservative so
 * nothing is overstated.
 *
 * `image` is an optional path to a real, consented field photo under
 * /public/upsell/. Per the orphan-media safeguarding rules (migration 031)
 * these must be pseudonymous and non-identifying (no town/address/GPS). Until
 * such photos are supplied, each card falls back to an on-brand illustration
 * keyed by `icon`.
 */
export type UpsellCardIcon = "blanket" | "book" | "meal" | "schoolkit" | "child";

export interface UpsellCard {
  /** Stable id — written to PaymentIntent metadata for take-rate reporting. */
  id: string;
  /** One-off amount added to today's gift, in GBP. */
  add: number;
  /** Short card title. */
  title: string;
  /** One-line supporting description. */
  description: string;
  /** Illustration key used when no `image` is set. */
  icon: UpsellCardIcon;
  /** Optional real photo path under /public (overrides the illustration). */
  image?: string;
}

export const ORPHAN_UPSELL_CARDS: UpsellCard[] = [
  {
    id: "blankets",
    add: 10,
    title: "Two warm blankets",
    description: "Keep a child warm through the cold season.",
    icon: "blanket",
  },
  {
    id: "lessons",
    add: 15,
    title: "A month of lessons",
    description: "Lessons and learning support for a month.",
    icon: "book",
  },
  {
    id: "food",
    add: 20,
    title: "A month of nutritious food",
    description: "A full month of meals for a child.",
    icon: "meal",
  },
  {
    id: "school-kit",
    add: 25,
    title: "A complete school kit",
    description: "Uniform, books and a bag to start school.",
    icon: "schoolkit",
  },
  {
    id: "another-child",
    add: 30,
    title: "A month for another child",
    description: "A full month of care for a second child.",
    icon: "child",
  },
];
