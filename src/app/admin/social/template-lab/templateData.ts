/**
 * Shared template-library data — the single source of truth for the
 * 95-template catalogue used by BOTH the Template Lab grid (HeroLab) and the
 * PowerPoint-style "View templates" browser (TemplateSorter).
 *
 * Each entry carries sample copy + (where relevant) a sample photo. The brand
 * logo is NOT baked in here — it's injected at render time by the consumer
 * (`{ ...v.c, logo }`) so this stays a static, logo-agnostic catalogue.
 */
import type { SlideContent } from "@/lib/social-editor/presets";

export type Variant = { id: string; label: string; c: SlideContent };

export const SAMPLE_IMG = "https://picsum.photos/id/1015/1080/1080";

/** Slide types in review order. Cards group by their id prefix (hero-, fact-…). */
export const CATS: { key: string; title: string; sub: string }[] = [
  { key: "hero", title: "Hero", sub: "Opening / cover slides — 15 directions" },
  { key: "fact", title: "Key Fact", sub: "A single sourced fact" },
  { key: "stat", title: "Big Stat", sub: "One giant figure + label" },
  { key: "multistat", title: "Multi-stat", sub: "Three figures — by the numbers" },
  { key: "beforeafter", title: "Before / After", sub: "A then-and-now contrast" },
  { key: "tiers", title: "Donation Tiers", sub: "The impact ladder — what each gift gives" },
  { key: "testimony", title: "Testimony", sub: "An attributed quote" },
  { key: "response", title: "Our Response", sub: "What Deen Relief is doing on the ground" },
  { key: "cta", title: "Call to Action", sub: "The closing donate ask" },
  // X (Twitter) — landscape news-infographics (1200×675). Single-image format,
  // shown only when the deck's platform is X (see X_VARIANT_IDS).
  { key: "x", title: "X · News infographics", sub: "Landscape 16:9 — a single newswire graphic" },
];

/** The catalogue ids that are landscape X templates — used to filter the
 *  Templates panel by platform (X shows these; IG/FB hide them). */
export const X_VARIANT_IDS = new Set<string>([
  "x-photo-facts",
  "x-split-facts",
  "x-top-photo-stats",
  "x-photo-card",
  "x-hero-stat",
  "x-ledger",
  "x-grid",
  "x-overlay-list",
  "x-right-photo",
  "x-cta-facts",
  "x-impact",
  "x-appeal-tiers",
]);

/** Sample report payload for the X infographic previews — a disaster photo,
 *  a headline, several data points + a source. The real flow fills these from
 *  the news report. */
const X_SAMPLE = {
  primary: "881 killed since the ceasefire.",
  eyebrow: "From Gaza · 25 May 2026",
  imageUrl: SAMPLE_IMG,
  source: "Gaza Health Ministry · May 2026",
  facts: [
    { value: "2.1M", label: "now depend on humanitarian aid" },
    { value: "9 in 10", label: "families skip meals every day" },
    { value: "90%", label: "of water is unsafe to drink" },
    { value: "1.9M", label: "displaced from their homes" },
  ],
};

/** Is this a landscape X (Twitter) template? */
export function isXVariant(id: string): boolean {
  return id.startsWith("x-");
}

/** All 95 templates with sample content (logo injected at render time). */
export const VARIANTS: Variant[] = [
  {
    id: "hero-a",
    label: "A · Photo-led full-bleed",
    c: {
      primary: "881 killed since the\nceasefire.",
      secondary:
        "Gaza's Health Ministry reports strikes have continued across the Strip since the January truce.",
      imageUrl: SAMPLE_IMG,
      eyebrow: "From Gaza · 25 May 2026",
    },
  },
  {
    id: "hero-b",
    label: "B · Typography-only cover",
    c: {
      primary: "Gaza, after",
      accent: "the ceasefire.",
      secondary: "Four months after the truce, the bombardment has not stopped.",
      imageUrl: null,
      eyebrow: "Emergency Appeal · Palestine",
    },
  },
  {
    id: "hero-c",
    label: "C · Top photo / bottom panel",
    c: {
      primary: "A winter without\nshelter.",
      secondary:
        "Tens of thousands of families face the cold months in tents and the rubble of their homes.",
      imageUrl: SAMPLE_IMG,
      eyebrow: "From Gaza · 25 May 2026",
    },
  },
  {
    id: "hero-d",
    label: "D · Centered crest",
    c: {
      primary: "The need has\nnot eased.",
      secondary: null,
      imageUrl: null,
      eyebrow: "Emergency Appeal · Palestine",
    },
  },
  {
    id: "hero-e",
    label: "E · Documentary caption bar",
    c: {
      primary: "Families return to rubble.",
      secondary: null,
      imageUrl: SAMPLE_IMG,
      eyebrow: "Rafah · 24 May 2026",
    },
  },
  {
    id: "hero-f",
    label: "F · Brand cover",
    c: {
      primary: "Stand with",
      accent: "Gaza.",
      secondary: null,
      imageUrl: null,
      eyebrow: "Emergency Appeal · Palestine",
    },
  },
  {
    id: "hero-g",
    label: "G · Editorial dispatch",
    c: {
      primary: "No safe place",
      accent: "to shelter.",
      secondary: "Across the Strip, families are sleeping in tents as winter sets in.",
      imageUrl: null,
      eyebrow: "From Gaza · 25 May 2026",
    },
  },
  {
    id: "hero-h",
    label: "H · Stat-led",
    c: {
      primary: "2.1m",
      accent: "in need.",
      secondary: "Now depend on humanitarian aid.",
      imageUrl: null,
      eyebrow: "By the numbers · Gaza",
    },
  },
  {
    id: "hero-i",
    label: "I · Quote-led",
    c: {
      primary:
        "We rebuild what we can with our hands, and we wait for the world to remember us.",
      secondary: "Aid worker, Khan Younis",
      imageUrl: null,
      eyebrow: "In their words",
    },
  },
  {
    id: "hero-j",
    label: "J · Framed two-tone",
    c: {
      primary: "A winter without\nshelter.",
      secondary:
        "Tens of thousands face the cold in tents and the rubble of their homes.",
      imageUrl: SAMPLE_IMG,
      eyebrow: "From Gaza · 25 May 2026",
    },
  },
  {
    id: "hero-k",
    label: "K · Split diptych",
    c: {
      primary: "Aid is running out.",
      secondary:
        "Stocks of food, fuel and clean water are nearly gone across the Strip.",
      imageUrl: SAMPLE_IMG,
      eyebrow: "From Gaza · 25 May 2026",
    },
  },
  {
    id: "hero-l",
    label: "L · Lower-third broadcast",
    c: {
      primary: "No safe place",
      accent: "to shelter.",
      secondary: null,
      imageUrl: SAMPLE_IMG,
      eyebrow: "Gaza City · 25 May 2026",
    },
  },
  {
    id: "hero-m",
    label: "M · Inset card",
    c: {
      primary: "Aid is running out.",
      secondary:
        "Stocks of food, fuel and clean water are nearly gone across the Strip.",
      imageUrl: SAMPLE_IMG,
      eyebrow: "From Gaza · 25 May 2026",
    },
  },
  {
    id: "hero-n",
    label: "N · Window crop",
    c: {
      primary: "One family among millions.",
      secondary: null,
      imageUrl: SAMPLE_IMG,
      eyebrow: "Rafah · 24 May 2026",
    },
  },
  {
    id: "hero-o",
    label: "O · Duotone poster",
    c: {
      primary: "Stand with",
      accent: "Gaza.",
      secondary: null,
      imageUrl: SAMPLE_IMG,
      eyebrow: "Emergency Appeal · Palestine",
    },
  },
  {
    id: "tiers-a",
    label: "Donation tiers · Impact ladder",
    c: { primary: "Where your gift goes", secondary: null, imageUrl: null, eyebrow: "Palestine Appeal" },
  },
  {
    id: "beforeafter-a",
    label: "Before / After · Then & now",
    c: { primary: "Healthcare in collapse", secondary: "Source: WHO · May 2026", imageUrl: null, eyebrow: "Palestine Appeal" },
  },
  {
    id: "multistat-a",
    label: "Multi-stat · By the numbers",
    c: { primary: "Gaza today", secondary: null, imageUrl: null, eyebrow: "By the numbers" },
  },
  {
    id: "tiers-b",
    label: "Tiers B · Over photo",
    c: { primary: "Where your gift goes", eyebrow: "Palestine Appeal", secondary: null, imageUrl: SAMPLE_IMG },
  },
  {
    id: "tiers-c",
    label: "Tiers C · Gold inverted",
    c: { primary: "Where your gift goes", eyebrow: "Palestine Appeal", secondary: null, imageUrl: SAMPLE_IMG },
  },
  {
    id: "tiers-d",
    label: "Tiers D · Single hero tier",
    c: { primary: "Where your gift goes", eyebrow: "Palestine Appeal", secondary: null, imageUrl: SAMPLE_IMG },
  },
  {
    id: "tiers-e",
    label: "Tiers E · Split",
    c: { primary: "Where your gift goes", eyebrow: "Palestine Appeal", secondary: null, imageUrl: SAMPLE_IMG },
  },
  {
    id: "tiers-f",
    label: "Tiers F · With total ask",
    c: { primary: "Where your gift goes", eyebrow: "Palestine Appeal", secondary: null, imageUrl: SAMPLE_IMG },
  },
  {
    id: "tiers-g",
    label: "Tiers G · Zakat-framed",
    c: { primary: "Where your gift goes", eyebrow: "Palestine Appeal", secondary: null, imageUrl: SAMPLE_IMG },
  },
  {
    id: "tiers-h",
    label: "Tiers H · Two-tone",
    c: { primary: "Where your gift goes", eyebrow: "Palestine Appeal", secondary: null, imageUrl: SAMPLE_IMG },
  },
  {
    id: "tiers-i",
    label: "Tiers I · Keyline card",
    c: { primary: "Where your gift goes", eyebrow: "Palestine Appeal", secondary: null, imageUrl: SAMPLE_IMG },
  },
  {
    id: "tiers-j",
    label: "Tiers J · Scan to give",
    c: { primary: "Where your gift goes", eyebrow: "Palestine Appeal", secondary: null, imageUrl: SAMPLE_IMG },
  },
  {
    id: "beforeafter-b",
    label: "Before/After B · Vertical stack",
    c: { primary: "Healthcare in collapse", secondary: "Source: WHO · May 2026", imageUrl: SAMPLE_IMG, eyebrow: "Palestine Appeal" },
  },
  {
    id: "beforeafter-c",
    label: "Before/After C · Two photos",
    c: { primary: "Healthcare in collapse", secondary: "Source: WHO · May 2026", imageUrl: SAMPLE_IMG, eyebrow: "Palestine Appeal" },
  },
  {
    id: "beforeafter-d",
    label: "Before/After D · Connecting arrow",
    c: { primary: "Healthcare in collapse", secondary: "Source: WHO · May 2026", imageUrl: SAMPLE_IMG, eyebrow: "Palestine Appeal" },
  },
  {
    id: "beforeafter-e",
    label: "Before/After E · Small then, big now",
    c: { primary: "Healthcare in collapse", secondary: "Source: WHO · May 2026", imageUrl: SAMPLE_IMG, eyebrow: "Palestine Appeal" },
  },
  {
    id: "beforeafter-f",
    label: "Before/After F · Two-tone",
    c: { primary: "Healthcare in collapse", secondary: "Source: WHO · May 2026", imageUrl: SAMPLE_IMG, eyebrow: "Palestine Appeal" },
  },
  {
    id: "beforeafter-g",
    label: "Before/After G · Over photo",
    c: { primary: "Healthcare in collapse", secondary: "Source: WHO · May 2026", imageUrl: SAMPLE_IMG, eyebrow: "Palestine Appeal" },
  },
  {
    id: "beforeafter-h",
    label: "Before/After H · Timeline",
    c: { primary: "Healthcare in collapse", secondary: "Source: WHO · May 2026", imageUrl: SAMPLE_IMG, eyebrow: "Palestine Appeal" },
  },
  {
    id: "beforeafter-i",
    label: "Before/After I · Card-framed",
    c: { primary: "Healthcare in collapse", secondary: "Source: WHO · May 2026", imageUrl: SAMPLE_IMG, eyebrow: "Palestine Appeal" },
  },
  {
    id: "beforeafter-j",
    label: "Before/After J · % change",
    c: { primary: "Healthcare in collapse", secondary: "Source: WHO · May 2026", imageUrl: SAMPLE_IMG, eyebrow: "Palestine Appeal" },
  },
  {
    id: "multistat-b",
    label: "Multi-stat B · Single row",
    c: { primary: "Gaza today", eyebrow: "By the numbers", secondary: null, imageUrl: SAMPLE_IMG },
  },
  {
    id: "multistat-c",
    label: "Multi-stat C · Hero + supporting",
    c: { primary: "Gaza today", eyebrow: "By the numbers", secondary: null, imageUrl: SAMPLE_IMG },
  },
  {
    id: "multistat-d",
    label: "Multi-stat D · Grid",
    c: { primary: "Gaza today", eyebrow: "By the numbers", secondary: null, imageUrl: SAMPLE_IMG },
  },
  {
    id: "multistat-e",
    label: "Multi-stat E · Over photo",
    c: { primary: "Gaza today", eyebrow: "By the numbers", secondary: null, imageUrl: SAMPLE_IMG },
  },
  {
    id: "multistat-f",
    label: "Multi-stat F · Two-tone",
    c: { primary: "Gaza today", eyebrow: "By the numbers", secondary: null, imageUrl: SAMPLE_IMG },
  },
  {
    id: "multistat-g",
    label: "Multi-stat G · Gold-ruled beats",
    c: { primary: "Gaza today", eyebrow: "By the numbers", secondary: null, imageUrl: SAMPLE_IMG },
  },
  {
    id: "multistat-h",
    label: "Multi-stat H · Centred crest",
    c: { primary: "Gaza today", eyebrow: "By the numbers", secondary: null, imageUrl: SAMPLE_IMG },
  },
  {
    id: "multistat-i",
    label: "Multi-stat I · Connecting timeline",
    c: { primary: "Gaza today", eyebrow: "By the numbers", secondary: null, imageUrl: SAMPLE_IMG },
  },
  {
    id: "multistat-j",
    label: "Multi-stat J · Ledger",
    c: { primary: "Gaza today", eyebrow: "By the numbers", secondary: null, imageUrl: SAMPLE_IMG },
  },
  {
    id: "cta-a",
    label: "CTA A · Type-led",
    c: { primary: "Stand with them today.", secondary: "2.1M", imageUrl: SAMPLE_IMG, eyebrow: "Palestine Appeal" },
  },
  {
    id: "cta-b",
    label: "CTA B · Gold inverted",
    c: { primary: "Stand with them today.", secondary: "2.1M", imageUrl: SAMPLE_IMG, eyebrow: "Palestine Appeal" },
  },
  {
    id: "cta-c",
    label: "CTA C · Photo lower-third",
    c: { primary: "Stand with them today.", secondary: "2.1M", imageUrl: SAMPLE_IMG, eyebrow: "Palestine Appeal" },
  },
  {
    id: "cta-d",
    label: "CTA D · Crest",
    c: { primary: "Stand with them today.", secondary: "2.1M", imageUrl: SAMPLE_IMG, eyebrow: "Palestine Appeal" },
  },
  {
    id: "cta-e",
    label: "CTA E · Split",
    c: { primary: "Stand with them today.", secondary: "2.1M", imageUrl: SAMPLE_IMG, eyebrow: "Palestine Appeal" },
  },
  {
    id: "cta-f",
    label: "CTA F · Stat-led",
    c: { primary: "Stand with them today.", secondary: "2.1M", imageUrl: SAMPLE_IMG, eyebrow: "Palestine Appeal" },
  },
  {
    id: "cta-g",
    label: "CTA G · Quote-led",
    c: { primary: "Stand with them today.", secondary: "2.1M", imageUrl: SAMPLE_IMG, eyebrow: "Palestine Appeal" },
  },
  {
    id: "cta-h",
    label: "CTA H · Urgency",
    c: { primary: "Stand with them today.", secondary: "2.1M", imageUrl: SAMPLE_IMG, eyebrow: "Palestine Appeal" },
  },
  {
    id: "cta-i",
    label: "CTA I · Scan to give",
    c: { primary: "Stand with them today.", secondary: "2.1M", imageUrl: SAMPLE_IMG, eyebrow: "Palestine Appeal" },
  },
  {
    id: "cta-j",
    label: "CTA J · Wordmark card",
    c: { primary: "Stand with them today.", secondary: "2.1M", imageUrl: SAMPLE_IMG, eyebrow: "Palestine Appeal" },
  },
  {
    id: "stat-a",
    label: "Stat A · Colossal",
    c: { primary: "2.1M", secondary: "now depend on humanitarian aid", imageUrl: SAMPLE_IMG, eyebrow: "By the numbers · Gaza" },
  },
  {
    id: "stat-b",
    label: "Stat B · With context",
    c: { primary: "2.1M", secondary: "now depend on humanitarian aid", imageUrl: SAMPLE_IMG, eyebrow: "By the numbers · Gaza" },
  },
  {
    id: "stat-c",
    label: "Stat C · Bleeding numeral",
    c: { primary: "2.1M", secondary: "now depend on humanitarian aid", imageUrl: SAMPLE_IMG, eyebrow: "By the numbers · Gaza" },
  },
  {
    id: "stat-d",
    label: "Stat D · Over photo",
    c: { primary: "2.1M", secondary: "now depend on humanitarian aid", imageUrl: SAMPLE_IMG, eyebrow: "By the numbers · Gaza" },
  },
  {
    id: "stat-e",
    label: "Stat E · With unit",
    c: { primary: "2.1M", secondary: "now depend on humanitarian aid", imageUrl: SAMPLE_IMG, eyebrow: "By the numbers · Gaza" },
  },
  {
    id: "stat-f",
    label: "Stat F · Gold inverted",
    c: { primary: "2.1M", secondary: "now depend on humanitarian aid", imageUrl: SAMPLE_IMG, eyebrow: "By the numbers · Gaza" },
  },
  {
    id: "stat-g",
    label: "Stat G · Split",
    c: { primary: "2.1M", secondary: "now depend on humanitarian aid", imageUrl: SAMPLE_IMG, eyebrow: "By the numbers · Gaza" },
  },
  {
    id: "stat-h",
    label: "Stat H · Crest",
    c: { primary: "2.1M", secondary: "now depend on humanitarian aid", imageUrl: SAMPLE_IMG, eyebrow: "By the numbers · Gaza" },
  },
  {
    id: "stat-i",
    label: "Stat I · Comparison",
    c: { primary: "2.1M", secondary: "now depend on humanitarian aid", imageUrl: SAMPLE_IMG, eyebrow: "By the numbers · Gaza" },
  },
  {
    id: "stat-j",
    label: "Stat J · With beat",
    c: { primary: "2.1M", secondary: "now depend on humanitarian aid", imageUrl: SAMPLE_IMG, eyebrow: "By the numbers · Gaza" },
  },
  {
    id: "fact-a",
    label: "Fact A · Photo lower-third",
    c: { primary: "9 in 10 families now skip meals every day.", secondary: "Source: IPC · April 2026", imageUrl: SAMPLE_IMG, eyebrow: "Food security · Gaza" },
  },
  {
    id: "fact-b",
    label: "Fact B · Type-led",
    c: { primary: "9 in 10 families now skip meals every day.", secondary: "Source: IPC · April 2026", imageUrl: SAMPLE_IMG, eyebrow: "Food security · Gaza" },
  },
  {
    id: "fact-c",
    label: "Fact C · Top photo + panel",
    c: { primary: "9 in 10 families now skip meals every day.", secondary: "Source: IPC · April 2026", imageUrl: SAMPLE_IMG, eyebrow: "Food security · Gaza" },
  },
  {
    id: "fact-d",
    label: "Fact D · Split",
    c: { primary: "9 in 10 families now skip meals every day.", secondary: "Source: IPC · April 2026", imageUrl: SAMPLE_IMG, eyebrow: "Food security · Gaza" },
  },
  {
    id: "fact-e",
    label: "Fact E · Keyline card",
    c: { primary: "9 in 10 families now skip meals every day.", secondary: "Source: IPC · April 2026", imageUrl: SAMPLE_IMG, eyebrow: "Food security · Gaza" },
  },
  {
    id: "fact-f",
    label: "Fact F · Lead-in detail",
    c: { primary: "9 in 10 families now skip meals every day.", secondary: "Source: IPC · April 2026", imageUrl: SAMPLE_IMG, eyebrow: "Food security · Gaza" },
  },
  {
    id: "fact-g",
    label: "Fact G · Caption bar",
    c: { primary: "9 in 10 families now skip meals every day.", secondary: "Source: IPC · April 2026", imageUrl: SAMPLE_IMG, eyebrow: "Food security · Gaza" },
  },
  {
    id: "fact-h",
    label: "Fact H · Inset card",
    c: { primary: "9 in 10 families now skip meals every day.", secondary: "Source: IPC · April 2026", imageUrl: SAMPLE_IMG, eyebrow: "Food security · Gaza" },
  },
  {
    id: "fact-i",
    label: "Fact I · Crest",
    c: { primary: "9 in 10 families now skip meals every day.", secondary: "Source: IPC · April 2026", imageUrl: SAMPLE_IMG, eyebrow: "Food security · Gaza" },
  },
  {
    id: "fact-j",
    label: "Fact J · Two-tone",
    c: { primary: "9 in 10 families now skip meals every day.", secondary: "Source: IPC · April 2026", imageUrl: SAMPLE_IMG, eyebrow: "Food security · Gaza" },
  },
  {
    id: "testimony-a",
    label: "Testimony A · Open-quote",
    c: { primary: "We do not need pity. We need the world to act before there is no one left to save.", accent: "the world to act", secondary: "Dr. Layla K. · Surgeon, Khan Younis", imageUrl: SAMPLE_IMG, eyebrow: "In their words" },
  },
  {
    id: "testimony-b",
    label: "Testimony B · Portrait lower-third",
    c: { primary: "We do not need pity. We need the world to act before there is no one left to save.", accent: "the world to act", secondary: "Dr. Layla K. · Surgeon, Khan Younis", imageUrl: SAMPLE_IMG, eyebrow: "In their words" },
  },
  {
    id: "testimony-c",
    label: "Testimony C · Split",
    c: { primary: "We do not need pity. We need the world to act before there is no one left to save.", accent: "the world to act", secondary: "Dr. Layla K. · Surgeon, Khan Younis", imageUrl: SAMPLE_IMG, eyebrow: "In their words" },
  },
  {
    id: "testimony-d",
    label: "Testimony D · Portrait chip",
    c: { primary: "We do not need pity. We need the world to act before there is no one left to save.", accent: "the world to act", secondary: "Dr. Layla K. · Surgeon, Khan Younis", imageUrl: SAMPLE_IMG, eyebrow: "In their words" },
  },
  {
    id: "testimony-e",
    label: "Testimony E · Crest",
    c: { primary: "We do not need pity. We need the world to act before there is no one left to save.", accent: "the world to act", secondary: "Dr. Layla K. · Surgeon, Khan Younis", imageUrl: SAMPLE_IMG, eyebrow: "In their words" },
  },
  {
    id: "testimony-f",
    label: "Testimony F · Gold emphasis",
    c: { primary: "We do not need pity. We need the world to act before there is no one left to save.", accent: "the world to act", secondary: "Dr. Layla K. · Surgeon, Khan Younis", imageUrl: SAMPLE_IMG, eyebrow: "In their words" },
  },
  {
    id: "testimony-g",
    label: "Testimony G · Top portrait",
    c: { primary: "We do not need pity. We need the world to act before there is no one left to save.", accent: "the world to act", secondary: "Dr. Layla K. · Surgeon, Khan Younis", imageUrl: SAMPLE_IMG, eyebrow: "In their words" },
  },
  {
    id: "testimony-h",
    label: "Testimony H · Two-tone",
    c: { primary: "We do not need pity. We need the world to act before there is no one left to save.", accent: "the world to act", secondary: "Dr. Layla K. · Surgeon, Khan Younis", imageUrl: SAMPLE_IMG, eyebrow: "In their words" },
  },
  {
    id: "testimony-i",
    label: "Testimony I · Keyline card",
    c: { primary: "We do not need pity. We need the world to act before there is no one left to save.", accent: "the world to act", secondary: "Dr. Layla K. · Surgeon, Khan Younis", imageUrl: SAMPLE_IMG, eyebrow: "In their words" },
  },
  {
    id: "testimony-j",
    label: "Testimony J · Caption bar",
    c: { primary: "We do not need pity. We need the world to act before there is no one left to save.", accent: "the world to act", secondary: "Dr. Layla K. · Surgeon, Khan Younis", imageUrl: SAMPLE_IMG, eyebrow: "In their words" },
  },
  {
    id: "response-a",
    label: "Response A · Photo lower-third",
    c: { primary: "Our teams are distributing food, water and medical aid across Gaza.", secondary: "12,000 families reached this week.", imageUrl: SAMPLE_IMG, eyebrow: "Our response" },
  },
  {
    id: "response-b",
    label: "Response B · Top photo + panel",
    c: { primary: "Our teams are distributing food, water and medical aid across Gaza.", secondary: "12,000 families reached this week.", imageUrl: SAMPLE_IMG, eyebrow: "Our response" },
  },
  {
    id: "response-c",
    label: "Response C · Split",
    c: { primary: "Our teams are distributing food, water and medical aid across Gaza.", secondary: "12,000 families reached this week.", imageUrl: SAMPLE_IMG, eyebrow: "Our response" },
  },
  {
    id: "response-d",
    label: "Response D · Inset card",
    c: { primary: "Our teams are distributing food, water and medical aid across Gaza.", secondary: "12,000 families reached this week.", imageUrl: SAMPLE_IMG, eyebrow: "Our response" },
  },
  {
    id: "response-e",
    label: "Response E · Stat-backed",
    c: { primary: "Our teams are distributing food, water and medical aid across Gaza.", secondary: "12,000 families reached", imageUrl: SAMPLE_IMG, eyebrow: "Our response" },
  },
  {
    id: "response-f",
    label: "Response F · Window crop",
    c: { primary: "Our teams are distributing food, water and medical aid across Gaza.", secondary: "12,000 families reached this week.", imageUrl: SAMPLE_IMG, eyebrow: "Our response" },
  },
  {
    id: "response-g",
    label: "Response G · Checklist",
    c: { primary: "What we're delivering", secondary: "12,000 families reached this week.", imageUrl: SAMPLE_IMG, eyebrow: "Our response" },
  },
  {
    id: "response-h",
    label: "Response H · Two-tone",
    c: { primary: "Our teams are distributing food, water and medical aid across Gaza.", secondary: "12,000 families reached this week.", imageUrl: SAMPLE_IMG, eyebrow: "Our response" },
  },
  {
    id: "response-i",
    label: "Response I · Caption bar",
    c: { primary: "Our teams are distributing food, water and medical aid across Gaza.", secondary: "12,000 families reached this week.", imageUrl: SAMPLE_IMG, eyebrow: "Our response" },
  },
  {
    id: "response-j",
    label: "Response J · How your gift helps",
    c: { primary: "Our teams are distributing food, water and medical aid across Gaza.", secondary: "12,000 families reached this week.", imageUrl: SAMPLE_IMG, eyebrow: "Our response" },
  },

  /* ─── X (Twitter) · landscape 1200×675 single-image news-infographics ──
   * Each is ONE dense graphic: a disaster photo + the headline + several
   * report data points + a source. They differ in LAYOUT, not content. The
   * real flow fills `c` from the news report; X_SAMPLE keeps previews dense. */
  {
    id: "x-photo-facts",
    label: "X · Photo + fact ribbon",
    c: { ...X_SAMPLE, secondary: null },
  },
  {
    id: "x-split-facts",
    label: "X · Photo + fact list",
    c: { ...X_SAMPLE, secondary: null },
  },
  {
    id: "x-top-photo-stats",
    label: "X · Photo top + stat row",
    c: { ...X_SAMPLE, secondary: null },
  },
  {
    id: "x-photo-card",
    label: "X · Photo + story card",
    c: { ...X_SAMPLE, secondary: null },
  },
  {
    id: "x-hero-stat",
    label: "X · Photo + big stat",
    c: { ...X_SAMPLE, secondary: null },
  },
  {
    id: "x-ledger",
    label: "X · Numbered ledger",
    c: { ...X_SAMPLE, primary: "Gaza today", secondary: null },
  },
  {
    id: "x-grid",
    label: "X · Photo + 2×2 grid",
    c: { ...X_SAMPLE, primary: "Gaza today", secondary: null },
  },
  {
    id: "x-overlay-list",
    label: "X · Darkened photo + list",
    c: { ...X_SAMPLE, secondary: null },
  },
  {
    id: "x-right-photo",
    label: "X · Facts + photo right",
    c: { ...X_SAMPLE, secondary: null },
  },
  {
    id: "x-cta-facts",
    label: "X · Photo + facts + donate",
    c: { ...X_SAMPLE, primary: "Stand with Gaza today.", secondary: null, facts: X_SAMPLE.facts.slice(0, 2) },
  },
  {
    id: "x-impact",
    label: "X · Impact words",
    c: { ...X_SAMPLE, primary: "Gaza, after the ceasefire.", secondary: null },
  },
  {
    id: "x-appeal-tiers",
    label: "X · Emergency appeal + tiers",
    c: { ...X_SAMPLE, primary: "Help families survive Gaza.", secondary: null },
  },
];

/** Templates whose id prefix matches a category key, in catalogue order. */
export function variantsByCat(key: string): Variant[] {
  return VARIANTS.filter((v) => v.id.split("-")[0] === key);
}
