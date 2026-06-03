import type { TemplateMeta } from "@/lib/social-templates/types";

/**
 * The landscape X (Twitter) news-infographic layouts (1200×675). X posts are
 * single images that read like a newswire graphic, not a square poster — so
 * these are a distinct, platform-only set. Ids match the `presetForTemplate`
 * routing (`buildXSlide`, all `x-*`) and the catalogue entries in
 * template-lab/templateData.ts. Both the picker preview and the canvas seed
 * render through the same layer/Satori pipeline, so the card she picks is
 * exactly what opens in the editor. `slots`/`previewPath` are unused here.
 */
export const X_VARIANTS: TemplateMeta[] = [
  {
    id: "x-headline",
    name: "Headline — photo + panel",
    description: "Field photo left, headline + source in a forest panel right. The workhorse news graphic.",
    platforms: ["x"],
    category: "hero",
    aspect: "wide",
    size: { w: 1200, h: 675 },
    slots: [],
    previewPath: "",
  },
  {
    id: "x-headline-type",
    name: "Headline — editorial type",
    description: "Type-only landscape cover on forest, gold accent on the key phrase. No photo.",
    platforms: ["x"],
    category: "hero",
    aspect: "wide",
    size: { w: 1200, h: 675 },
    slots: [],
    previewPath: "",
  },
  {
    id: "x-photo-banner",
    name: "Photo banner",
    description: "Full-bleed photo with the headline anchored lower-left over a gradient — breaking-news look.",
    platforms: ["x"],
    category: "hero",
    aspect: "wide",
    size: { w: 1200, h: 675 },
    slots: [],
    previewPath: "",
  },
  {
    id: "x-stat",
    name: "Key stat",
    description: "One colossal figure left, the supporting beat right. For a single hard number.",
    platforms: ["x"],
    category: "stat",
    aspect: "wide",
    size: { w: 1200, h: 675 },
    slots: [],
    previewPath: "",
  },
  {
    id: "x-multistat",
    name: "By the numbers",
    description: "Three figures across — the classic data infographic.",
    platforms: ["x"],
    category: "stat",
    aspect: "wide",
    size: { w: 1200, h: 675 },
    slots: [],
    previewPath: "",
  },
  {
    id: "x-beforeafter",
    name: "Before / after",
    description: "Two figures split by a centre rule — a then-and-now contrast.",
    platforms: ["x"],
    category: "stat",
    aspect: "wide",
    size: { w: 1200, h: 675 },
    slots: [],
    previewPath: "",
  },
  {
    id: "x-quote",
    name: "Testimony",
    description: "Portrait left, attributed quote right (type-led when there's no photo).",
    platforms: ["x"],
    category: "testimony",
    aspect: "wide",
    size: { w: 1200, h: 675 },
    slots: [],
    previewPath: "",
  },
  {
    id: "x-response",
    name: "Our response",
    description: "DR field photo left, what we're delivering + a reach stat right.",
    platforms: ["x"],
    category: "response",
    aspect: "wide",
    size: { w: 1200, h: 675 },
    slots: [],
    previewPath: "",
  },
  {
    id: "x-cta",
    name: "Donate CTA",
    description: "The closing ask + a scan-to-give QR — landscape.",
    platforms: ["x"],
    category: "cta",
    aspect: "wide",
    size: { w: 1200, h: 675 },
    slots: [],
    previewPath: "",
  },
];
