/**
 * Slide roles for the guided multi-slide flow (Phase 11).
 *
 * After she picks a slide count she plans the deck: slide 1 is always
 * the Hero and the last slide is always the CTA (locked); the middle
 * slides each get a role she chooses. Each role drives the per-slide
 * builder — which content options to offer, whether to ask for a photo,
 * and which template category to show.
 */

import type { ContentBundle } from "./types";

export type SlideRole = "hero" | "fact" | "stat" | "testimony" | "response" | "cta";

export type RoleConfig = {
  label: string;
  short: string;
  description: string;
  /** Template registry category this role pulls templates from. */
  category: string;
  needsImage: boolean;
  hasSecondary: boolean;
  primaryHeading: string;
  primarySub: string;
  secondaryHeading: string;
  secondarySub: string;
  /** Main-text options from the extracted content. */
  primary: (c: ContentBundle) => string[];
  /** Supporting-text options. */
  secondary: (c: ContentBundle) => string[];
};

/* ─── Content selectors ───────────────────────────────────────────── */
const titles = (c: ContentBundle) =>
  c.cards.filter((x) => x.card.kind === "title").map((x) => (x.card.kind === "title" ? x.card.text : "")).filter(Boolean).slice(0, 6);
const facts = (c: ContentBundle) =>
  c.cards.filter((x) => x.card.kind === "fact").map((x) => (x.card.kind === "fact" ? x.card.text : "")).filter(Boolean).slice(0, 6);
const bodies = (c: ContentBundle) =>
  c.cards.filter((x) => x.card.kind === "body" || x.card.kind === "fact").map((x) => (x.card.kind === "body" || x.card.kind === "fact" ? x.card.text : "")).filter(Boolean).slice(0, 6);
const quotes = (c: ContentBundle) =>
  c.cards.filter((x) => x.card.kind === "quote").map((x) => (x.card.kind === "quote" ? x.card.text : "")).filter(Boolean).slice(0, 6);
const attributions = (c: ContentBundle) =>
  c.cards.filter((x) => x.card.kind === "quote").map((x) => (x.card.kind === "quote" ? x.card.attribution : "")).filter(Boolean).slice(0, 6);

const CTA_HEADLINES = [
  "Your support can't wait.",
  "Stand with them today.",
  "Every hour counts.",
  "Be their witness.",
  "Help reaches the frontline.",
];

export const ROLES: Record<SlideRole, RoleConfig> = {
  hero: {
    label: "Hero", short: "Hero", description: "The opening slide — sets the story.",
    category: "hero", needsImage: true, hasSecondary: true,
    primaryHeading: "Choose your hero title", primarySub: "The headline that opens the post. Pick one or write your own.",
    secondaryHeading: "Add a supporting line", secondarySub: "One short line under the headline — or skip it.",
    primary: titles, secondary: bodies,
  },
  fact: {
    label: "Key fact", short: "Fact", description: "One hard, sourced fact.",
    category: "fact", needsImage: true, hasSecondary: false,
    primaryHeading: "Choose the fact", primarySub: "The single fact this slide drives home.",
    secondaryHeading: "Add context", secondarySub: "Optional supporting line.",
    primary: facts, secondary: bodies,
  },
  stat: {
    label: "Statistic", short: "Stat", description: "A big number with a short beat.",
    category: "stat", needsImage: false, hasSecondary: true,
    primaryHeading: "Choose the statistic", primarySub: "The number this slide centres on.",
    secondaryHeading: "Add a supporting beat", secondarySub: "One short line of context — or skip it.",
    primary: facts, secondary: bodies,
  },
  testimony: {
    label: "Testimony", short: "Quote", description: "An attributed quote.",
    category: "testimony", needsImage: true, hasSecondary: true,
    primaryHeading: "Choose the quote", primarySub: "The testimony this slide carries.",
    secondaryHeading: "Who said it?", secondarySub: "Attribution — or skip it.",
    primary: quotes, secondary: attributions,
  },
  response: {
    label: "What we're doing", short: "Response", description: "Deen Relief's response.",
    category: "response", needsImage: true, hasSecondary: true,
    primaryHeading: "What are we doing?", primarySub: "The response line for this slide.",
    secondaryHeading: "Add a supporting line", secondarySub: "Optional second line.",
    primary: bodies, secondary: bodies,
  },
  cta: {
    label: "Call to action", short: "CTA", description: "The closing ask.",
    category: "cta", needsImage: false, hasSecondary: false,
    primaryHeading: "Choose your closing line", primarySub: "The ask that ends the post.",
    secondaryHeading: "", secondarySub: "",
    primary: () => CTA_HEADLINES, secondary: () => [],
  },
};

/** Roles she can assign to the middle slides. */
export const MIDDLE_ROLES: SlideRole[] = ["fact", "stat", "testimony", "response"];

/** A sensible default plan given the count + what content exists. */
export function suggestPlan(count: number, content: ContentBundle): SlideRole[] {
  const n = Math.max(2, count);
  const plan: SlideRole[] = ["hero"];
  const middleCount = n - 2;
  const hasQuotes = quotes(content).length > 0;
  // Rotate through fact → stat → (testimony if available) → response.
  const rotation: SlideRole[] = ["fact", "stat", hasQuotes ? "testimony" : "fact", "response"];
  for (let i = 0; i < middleCount; i++) {
    plan.push(rotation[i % rotation.length]!);
  }
  if (n >= 2) plan.push("cta");
  return plan.slice(0, n);
}
