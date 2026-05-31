import type { TemplateMeta } from "@/lib/social-templates/types";

/**
 * The five faithful Hero layouts (ported 1:1 from the Claude Design
 * library). These drive the picker for the hero role. Both the picker
 * preview and the canvas seed render via `presetForTemplate(id)`, so the
 * card the SMM picks is exactly what opens in the editor. The ids match
 * the `presetForTemplate` routing (`id.includes("hero-a"…)`).
 *
 * Kept local to the deck-builder (rather than the cross-repo template
 * registry) because these render through the layer/Satori pipeline, not
 * the legacy slot renderer — so `slots`/`previewPath` are unused here.
 */
export const HERO_VARIANTS: TemplateMeta[] = [
  {
    id: "hero-a",
    name: "Photo-led",
    description: "Full-bleed field photo, headline anchored bottom-left over a gradient.",
    platforms: ["instagram", "facebook"],
    category: "hero",
    aspect: "square",
    size: { w: 1080, h: 1080 },
    slots: [],
    previewPath: "",
  },
  {
    id: "hero-b",
    name: "Typography cover",
    description: "Type-only cover on forest, with a gold accent on the key phrase.",
    platforms: ["instagram", "facebook"],
    category: "hero",
    aspect: "square",
    size: { w: 1080, h: 1080 },
    slots: [],
    previewPath: "",
  },
  {
    id: "hero-c",
    name: "Top photo / panel",
    description: "Photo up top; headline and a line of context on a forest panel below.",
    platforms: ["instagram", "facebook"],
    category: "hero",
    aspect: "square",
    size: { w: 1080, h: 1080 },
    slots: [],
    previewPath: "",
  },
  {
    id: "hero-d",
    name: "Centered crest",
    description: "Symmetrical, crest-style cover — quiet and authoritative.",
    platforms: ["instagram", "facebook"],
    category: "hero",
    aspect: "square",
    size: { w: 1080, h: 1080 },
    slots: [],
    previewPath: "",
  },
  {
    id: "hero-e",
    name: "Documentary caption",
    description: "Full-bleed photo with a documentary caption bar at the foot.",
    platforms: ["instagram", "facebook"],
    category: "hero",
    aspect: "square",
    size: { w: 1080, h: 1080 },
    slots: [],
    previewPath: "",
  },
  {
    id: "hero-f",
    name: "Brand logo cover",
    description: "The real Deen Relief logo, large and centered on forest — a branded opener or closing card.",
    platforms: ["instagram", "facebook"],
    category: "hero",
    aspect: "square",
    size: { w: 1080, h: 1080 },
    slots: [],
    previewPath: "",
  },
  {
    id: "hero-g",
    name: "Side rail",
    description: "Asymmetric forest-soft left rail with a gold spine; headline set off to the right.",
    platforms: ["instagram", "facebook"],
    category: "hero",
    aspect: "square",
    size: { w: 1080, h: 1080 },
    slots: [],
    previewPath: "",
  },
  {
    id: "hero-h",
    name: "Stat-led",
    description: "One oversized figure as the headline, with a supporting beat beneath the gold rule.",
    platforms: ["instagram", "facebook"],
    category: "hero",
    aspect: "square",
    size: { w: 1080, h: 1080 },
    slots: [],
    previewPath: "",
  },
  {
    id: "hero-i",
    name: "Quote-led",
    description: "Testimony cover — an oversized gold quotation mark over the quote, with attribution.",
    platforms: ["instagram", "facebook"],
    category: "hero",
    aspect: "square",
    size: { w: 1080, h: 1080 },
    slots: [],
    previewPath: "",
  },
  {
    id: "hero-j",
    name: "Corner card",
    description: "Full-bleed photo with a framed forest corner card holding the eyebrow and headline.",
    platforms: ["instagram", "facebook"],
    category: "hero",
    aspect: "square",
    size: { w: 1080, h: 1080 },
    slots: [],
    previewPath: "",
  },
];
