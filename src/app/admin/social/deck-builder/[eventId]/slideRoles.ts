/**
 * Slide roles for the guided multi-slide flow (Phase 11).
 *
 * After she picks a slide count she plans the deck: slide 1 is always
 * the Hero and the last slide is always the CTA (locked); the middle
 * slides each get a role she chooses. Each role drives the per-slide
 * builder — which content options to offer, whether to ask for a photo,
 * and which template category to show.
 */

import type { ChartSeries, ContentBundle, ImageBundle } from "./types";
import type { ImageCandidate } from "@/lib/social-templates/types";
import type { LearnedPrefs } from "@/lib/smm-preferences";
import type { OutcomePrefs } from "@/lib/social-outcomes";
import { parseMagnitude, type InfographicFact } from "@/lib/social-editor/presets";

export type SlideRole =
  | "hero"
  | "fact"
  | "stat"
  | "testimony"
  | "response"
  | "tiers"
  | "beforeafter"
  | "multistat"
  | "cta";

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
  c.cards.filter((x) => x.card.kind === "title").map((x) => (x.card.kind === "title" ? x.card.text : "")).filter(Boolean).slice(0, 12);
const facts = (c: ContentBundle) =>
  c.cards.filter((x) => x.card.kind === "fact").map((x) => (x.card.kind === "fact" ? x.card.text : "")).filter(Boolean).slice(0, 12);
const bodies = (c: ContentBundle) =>
  c.cards.filter((x) => x.card.kind === "body" || x.card.kind === "fact").map((x) => (x.card.kind === "body" || x.card.kind === "fact" ? x.card.text : "")).filter(Boolean).slice(0, 12);
const quotes = (c: ContentBundle) =>
  c.cards.filter((x) => x.card.kind === "quote").map((x) => (x.card.kind === "quote" ? x.card.text : "")).filter(Boolean).slice(0, 12);
const attributions = (c: ContentBundle) =>
  c.cards.filter((x) => x.card.kind === "quote").map((x) => (x.card.kind === "quote" ? x.card.attribution : "")).filter(Boolean).slice(0, 12);

/* ─── X infographic data points ───────────────────────────────────── */

/** Split a fact sentence into a punchy figure + what it measures, for the X
 *  news-infographics. "881 killed since the ceasefire" → {value:"881",
 *  label:"killed since the ceasefire"}; "9 in 10 families skip meals" →
 *  {value:"9 in 10", label:"families skip meals"}. Falls back to {label:<whole
 *  sentence>} when no figure stands out. Deterministic, £0. */
function splitStat(text: string): InfographicFact {
  const t = text.trim().replace(/\s+/g, " ");
  // "9 in 10" first; else a number with an optional unit. The unit branch
  // lists the WORD units (million/billion/…) before the single letters m/k
  // and ends with (?![a-z]) so the "m" in "million" is never grabbed on its
  // own (which used to yield value "1.7 m" + label "illion…"). A bare number
  // is the final fallback so a plain count ("2,621") still matches.
  const m = t.match(
    /(\d+\s+in\s+\d+|\d[\d,.]*\s?(?:%|million|billion|thousand|bn|[mk])(?![a-z])|\d[\d,.]*)/i
  );
  if (m && m.index !== undefined) {
    const value = m[0].trim();
    let label = (t.slice(0, m.index) + t.slice(m.index + m[0].length))
      .replace(/\s+/g, " ")
      .replace(/^[\s,.:;–—-]+|[\s,.:;–—-]+$/g, "")
      .trim();
    if (!label || label.length < 3) label = t;
    if (label.length > 58) label = label.slice(0, 55).trimEnd() + "…";
    return { value, label };
  }
  return { value: null, label: t.length > 64 ? t.slice(0, 61).trimEnd() + "…" : t };
}

/** Up to `max` report data points for the X news-infographics, derived from
 *  the extracted fact cards. */
export function infographicFacts(content: ContentBundle, max = 4): InfographicFact[] {
  return facts(content).map(splitStat).slice(0, max);
}

/** Short magnitude tokens for a STAT slide's giant figure — the NUMBER is
 *  the slide, never a whole sentence. Derived from the fact cards with the
 *  same splitter the X infographics use; facts with no figure are dropped
 *  (if the story has no number she should pick a different role). This is
 *  what stops "881 Palestinians killed since the ceasefire…" landing in a
 *  400px display slot and overflowing the board. Deterministic, £0. */
/** How "headline-worthy" a stat figure is — a giant magnitude ("1.7 million",
 *  "88%") earns the big slot over a small bare count ("5"), so the stat slide
 *  leads with the most striking number AND tends to diverge from the literal
 *  fact a Key-fact slide is already using. */
function statStrength(v: string): number {
  const s = v.toLowerCase();
  if (/\b(million|billion|bn)\b|\d\s?m\b/.test(s)) return 6;
  if (/\b(thousand)\b|\d\s?k\b/.test(s)) return 5;
  if (/%/.test(s)) return 4;
  if (/\bin\b/.test(s)) return 4; // "9 in 10"
  const n = parseFloat(s.replace(/[, ]/g, ""));
  if (!Number.isNaN(n)) {
    if (n >= 1000) return 5;
    if (n >= 100) return 3;
    if (n >= 10) return 2;
    return 1;
  }
  return 1;
}
/** Stat figure + its explaining beat, de-duplicated and ranked strongest
 *  first — so `statValues` and `statBeats` stay index-aligned (value[0] ↔
 *  beat[0]) while the most striking magnitude leads the slot. */
function statPairs(c: ContentBundle): InfographicFact[] {
  const seen = new Set<string>();
  const out: InfographicFact[] = [];
  for (const t of facts(c)) {
    const s = splitStat(t);
    if (s.value && !seen.has(s.value.toLowerCase())) {
      seen.add(s.value.toLowerCase());
      out.push(s);
    }
  }
  // Stable sort (ties keep report order) by descending headline strength.
  return out
    .map((p, i) => ({ p, i }))
    .sort((a, b) => statStrength(b.p.value || "") - statStrength(a.p.value || "") || a.i - b.i)
    .map((x) => x.p)
    .slice(0, 12);
}
const statValues = (c: ContentBundle) =>
  statPairs(c).map((p) => p.value).filter((v): v is string => !!v);
/** The beat that explains the stat figure — the label half of the split
 *  ("killed since the ceasefire"), aligned to statValues' order. */
const statBeats = (c: ContentBundle) =>
  statPairs(c).map((p) => p.label).filter(Boolean);

/** Trim a fact to one punchy line for the Key-fact slide — never a
 *  paragraph. Cuts at the first sentence end in range, else the last word
 *  boundary before the cap, so the slide reads as a single hard beat
 *  instead of a wall of text. Deterministic, £0. */
const FACT_DISPLAY_MAX = 100;
function shortenFact(raw: string): string {
  const s = raw.trim().replace(/\s+/g, " ");
  if (s.length <= FACT_DISPLAY_MAX) return s;
  const stop = s.search(/[.!?](\s|$)/);
  if (stop >= 32 && stop <= FACT_DISPLAY_MAX) return s.slice(0, stop + 1);
  const cut = s.slice(0, FACT_DISPLAY_MAX);
  const sp = cut.lastIndexOf(" ");
  return (sp >= 32 ? cut.slice(0, sp) : cut).replace(/[\s,;:–—-]+$/, "") + "…";
}
const shortFacts = (c: ContentBundle) =>
  facts(c).map(shortenFact).filter(Boolean).slice(0, 12);

/* ─── Comparable data series for charts ───────────────────────────── */

/**
 * Cluster the report's numeric facts into ONE comparable series so a bar
 * chart's bars don't collapse. The dimension can't be inferred from a number
 * alone, so this is deliberately conservative: it prefers a clean percentage
 * set, else keeps only counts within ~50× of the largest (dropping tiny
 * outliers that would otherwise vanish), and bails (returns null) unless ≥3
 * comparable points survive. Labels are the fact's descriptive half — rough,
 * but the SMM edits. Deterministic, £0.
 */
function comparableSeriesFromFacts(content: ContentBundle): ChartSeries | null {
  const pairs: { value: string; label: string; m: number }[] = [];
  for (const t of facts(content)) {
    const s = splitStat(t);
    if (!s.value) continue;
    const m = parseMagnitude(s.value);
    if (m == null || m <= 0) continue;
    pairs.push({ value: s.value, label: s.label, m });
  }
  if (pairs.length < 3) return null;
  const pct = pairs.filter((x) => x.value.includes("%"));
  const base = pct.length >= 3 ? pct : pairs.filter((x) => !x.value.includes("%"));
  if (base.length < 3) return null;
  const max = Math.max(...base.map((x) => x.m));
  const kept = base.filter((x) => x.m >= max / 50).slice(0, 6);
  if (kept.length < 3) return null;
  return {
    title: "By the numbers",
    unit: pct.length >= 3 ? "%" : null,
    source: reportSource(content),
    points: kept.map((x) => ({ label: x.label, value: x.value })),
  };
}

/**
 * The best comparable series for a bar chart: the AI-extracted series if the
 * extractor found one (real categories, one unit), else a conservative
 * cluster of the report's comparable numbers, else null — in which case the
 * chart preset shows editable sample data rather than a misleading mix.
 */
export function bestChartSeries(content: ContentBundle): ChartSeries | null {
  const ai = content.chartSeries?.find((s) => s.points.length >= 2) ?? null;
  if (ai) return ai;
  return comparableSeriesFromFacts(content);
}

/** The first source attribution found among the report's fact/source cards. */
export function reportSource(content: ContentBundle): string | null {
  for (const x of content.cards) {
    if (x.card.kind === "fact" && x.card.source) return x.card.source;
    if (x.card.kind === "source" && x.card.text) return x.card.text;
  }
  return null;
}

const CTA_HEADLINES = [
  "Your support can't wait.",
  "Stand with them today.",
  "Every hour counts.",
  "Be their witness.",
  "Help reaches the frontline.",
];
// Headings for the new type-only middle slides (the structured rows live in
// the preset as editable defaults; these set the line above them).
const TIER_HEADINGS = ["Where your gift goes", "Where your zakat goes", "What your support provides"];
const BEFOREAFTER_HEADINGS = ["Then and now", "What has changed", "Before. After."];
const MULTISTAT_HEADINGS = ["By the numbers", "The scale of need", "What the data shows"];

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
    primaryHeading: "Choose the fact", primarySub: "The single fact this slide drives home — kept short and sharp.",
    secondaryHeading: "Add context", secondarySub: "Optional supporting line.",
    primary: shortFacts, secondary: bodies,
  },
  stat: {
    label: "Statistic", short: "Stat", description: "A big number with a short beat.",
    category: "stat", needsImage: false, hasSecondary: true,
    primaryHeading: "Choose the statistic", primarySub: "The number this slide centres on — just the figure, the beat goes below.",
    secondaryHeading: "Add a supporting beat", secondarySub: "One short line of context — or skip it.",
    primary: statValues, secondary: statBeats,
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
  tiers: {
    label: "What your gift does", short: "Tiers", description: "The donation impact ladder.",
    category: "tiers", needsImage: false, hasSecondary: false,
    primaryHeading: "Heading for the ladder", primarySub: "The line above the £30 / £100 / £250 tiers.",
    secondaryHeading: "", secondarySub: "",
    primary: () => TIER_HEADINGS, secondary: () => [],
  },
  beforeafter: {
    label: "Before / after", short: "Before/After", description: "A then-and-now contrast.",
    category: "beforeafter", needsImage: false, hasSecondary: true,
    primaryHeading: "Choose the contrast headline", primarySub: "The line that frames the change.",
    secondaryHeading: "Add a source", secondarySub: "Where the figures come from — or skip.",
    primary: () => BEFOREAFTER_HEADINGS, secondary: bodies,
  },
  multistat: {
    label: "By the numbers", short: "Multi-stat", description: "Three figures on one slide.",
    category: "multistat", needsImage: false, hasSecondary: false,
    primaryHeading: "Choose the heading", primarySub: "The line above the three figures.",
    secondaryHeading: "", secondarySub: "",
    primary: () => MULTISTAT_HEADINGS, secondary: () => [],
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
export const MIDDLE_ROLES: SlideRole[] = ["fact", "stat", "testimony", "response", "tiers", "beforeafter", "multistat"];

/* ─── Smart defaults (quick-draft + skip-friendly detailed mode) ───── */

/**
 * A fallback template id per role that `presetForTemplate` recognises by
 * `includes()`. Used when the registry returned no templates for a role's
 * category, or to seed a sensible default before any real template list
 * is known. The hero default points at the photo-led variant when a photo
 * exists, falling back to the typography cover when it doesn't (handled by
 * `defaultTemplateId`).
 */
const ROLE_FALLBACK_TEMPLATE: Record<SlideRole, string> = {
  hero: "hero-a",
  fact: "fact-photo",
  stat: "stat",
  testimony: "testimony-portrait",
  response: "response",
  tiers: "tiers-a",
  beforeafter: "beforeafter-a",
  multistat: "multistat-a",
  cta: "cta",
};

/**
 * Pick the default template id for a role given the available registry
 * templates and whether the slide will carry a photo. Prefers the first
 * registry template (the curated lead option); else a preset-routable
 * fallback. For the hero/photo-bearing roles with no image, prefers a
 * type-led variant so the slide isn't a photo frame with no photo.
 */
/** Does a template's photo expectation match this slide's image state? Used to
 *  stop a learned pick from forcing a photo layout onto an image-less slide (or
 *  a typography layout when there's a good photo to use). */
function fitsPhotoState(templateId: string, hasImage: boolean): boolean {
  const wantsPhoto = /photo|image|portrait|cover|hero-(a|c|e)\b/i.test(templateId);
  const isTypeLed = /typograph|text|crest|hero-(b|d)\b/i.test(templateId);
  return hasImage ? !isTypeLed || wantsPhoto : !wantsPhoto;
}

export function defaultTemplateId(
  role: SlideRole,
  templates: { id: string }[],
  hasImage: boolean,
  prefs?: LearnedPrefs | null,
  outcome?: OutcomePrefs | null,
  platform: string = "instagram"
): string {
  const inSet = (id: string | undefined | null): id is string =>
    !!id && templates.some((t) => t.id === id);
  // Learning is bucketed per (platform, slide type) so each platform applies
  // its OWN winner/favourite.
  const key = `${platform}:${role}`;

  // 1. PROVEN WINNER — the template that has actually raised the most for this
  // slide type ON THIS PLATFORM (gated: ≥3 posts + real donations, or a
  // high-volume click proxy). Real outcomes outrank taste; this is what makes
  // the builder compound. Empty/ungated ⇒ skipped, so behaviour is unchanged
  // until a design earns it.
  const winner = outcome?.winningTemplateByKey?.[key];
  if (inSet(winner) && fitsPhotoState(winner, hasImage)) return winner;

  // 2. LEARNED TASTE — if she reliably keeps one template for this slide type on
  // this platform (count ≥ 2), lead with it. Won't chase one-off picks.
  const fav = prefs?.favTemplateByKey?.[key];
  if (inSet(fav) && fitsPhotoState(fav, hasImage)) return fav;

  // 3. BASE DEFAULTS.
  if (role === "hero") {
    // hero-b (typography cover) and hero-d (crest) need no photo.
    if (!hasImage) {
      const typeLed = templates.find((t) => /hero-b|hero-d|typography|crest|cover/i.test(t.id));
      if (typeLed) return typeLed.id;
      return "hero-b";
    }
    return templates[0]?.id ?? ROLE_FALLBACK_TEMPLATE.hero;
  }
  if (role === "fact" && !hasImage) {
    // Prefer the typography fact layout when there's no photo.
    const typeLed = templates.find((t) => /typograph|text/i.test(t.id) && !/photo/i.test(t.id));
    if (typeLed) return typeLed.id;
    return "fact-typography";
  }
  return templates[0]?.id ?? ROLE_FALLBACK_TEMPLATE[role];
}

/**
 * The top primary option for a role, or "" if none. When the learned profile
 * knows her typical headline length, we rank the candidate copy by closeness to
 * that length (stable tie-break to the original order) so the auto-draft drifts
 * toward how long she actually writes — without changing the wording itself.
 */
export function topPrimary(
  role: SlideRole,
  content: ContentBundle,
  prefs?: LearnedPrefs | null,
  platform: string = "instagram",
  /** Copy already placed on earlier slides — skipped so two slides never
   *  show the same line. Falls back to the full list if everything's used. */
  used?: Set<string>
): string {
  const all = ROLES[role].primary(content);
  const fresh = used ? all.filter((o) => !used.has(normContent(o))) : all;
  const opts = fresh.length ? fresh : all;
  if (opts.length === 0) return "";
  const target = prefs?.avgTitleLenByPlatform?.[platform] ?? null;
  if (target == null) return opts[0]!;
  let best = opts[0]!;
  let bestGap = Math.abs(best.length - target);
  for (let i = 1; i < opts.length; i++) {
    const gap = Math.abs(opts[i]!.length - target);
    if (gap < bestGap) {
      bestGap = gap;
      best = opts[i]!;
    }
  }
  return best;
}

/** The top secondary option for a role (only when the role uses one),
 *  skipping any line already used elsewhere in the deck. */
export function topSecondary(
  role: SlideRole,
  content: ContentBundle,
  used?: Set<string>
): string | null {
  if (!ROLES[role].hasSecondary) return null;
  const all = ROLES[role].secondary(content);
  const fresh = used ? all.filter((o) => !used.has(normContent(o))) : all;
  return (fresh.length ? fresh : all)[0] ?? null;
}

/** Normalise a copy string for repeat-detection (case/space-insensitive). */
function normContent(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Roles that REPORT the situation — what happened and the human toll. For
 * these we lean to third-party, verified aftermath/news imagery: it's more
 * ethical and more credible than fronting Deen Relief's own brand photos on a
 * tragedy we're reporting (not yet responding to). Deen Relief's OWN library
 * belongs on the ACTION slides — "our response", "what we do", the ask —
 * which is where showing our people/work is appropriate.
 */
const REPORTING_ROLES = new Set<SlideRole>([
  "hero",
  "fact",
  "stat",
  "testimony",
  "beforeafter",
  "multistat",
]);

/** Crude content-match score: how many 4+ letter words of the slide's copy
 *  appear in the candidate's caption/description. Lets a "homes destroyed"
 *  fact pull the external photo whose caption mentions damage/strikes. */
function imageRelevance(description: string | null, query: string | null | undefined): number {
  if (!description || !query) return 0;
  const terms = new Set(query.toLowerCase().match(/[a-z]{4,}/g) ?? []);
  if (!terms.size) return 0;
  const d = description.toLowerCase();
  let score = 0;
  for (const t of terms) if (d.includes(t)) score += 1;
  return score;
}

/**
 * Choose a sensible default image for a role from the candidate pool.
 *
 * Reporting slides prefer third-party aftermath/situation imagery; action
 * slides prefer the Deen Relief library (see REPORTING_ROLES). Within the
 * preferred source we pick the candidate whose caption best matches the
 * slide's copy, and skip images already used earlier in the deck so the draft
 * isn't repetitive. Falls back to the other source when the preferred one has
 * nothing. Returns null when the role takes no photo or no imagery matched.
 */
export function pickImageId(
  role: SlideRole,
  images: ImageBundle,
  used: Set<string>,
  query?: string | null
): string | null {
  if (!ROLES[role].needsImage) return null;
  const pool = images.images;
  if (pool.length === 0) return null;
  const preferExternal = REPORTING_ROLES.has(role);
  // 0 = preferred bucket, 1 = the other (used only as a fallback).
  const sourcePref = (i: ImageCandidate) => {
    const isDr = i.source === "dr_library";
    return preferExternal ? (isDr ? 1 : 0) : isDr ? 0 : 1;
  };
  const ranked = pool
    .map((i) => ({ i, isUsed: used.has(i.id), pref: sourcePref(i), rel: imageRelevance(i.description, query) }))
    .sort(
      (a, b) =>
        Number(a.isUsed) - Number(b.isUsed) || // unused first — no repeats
        a.pref - b.pref || // then the role-appropriate source
        b.rel - a.rel // then the best content match
    );
  return ranked[0]?.i.id ?? null;
}

/** One fully auto-filled slide result-shape (sans index/template wiring). */
export type SlideDraftFill = {
  role: SlideRole;
  title: string;
  subtext: string | null;
  imageId: string | null;
};

/**
 * Auto-fill every slide of a plan with the top content + a matched image,
 * de-duplicating image use across slides. Templates are resolved
 * separately (they depend on the per-role registry list, which the deck
 * flow holds). Powers QUICK DRAFT and seeds the editable review outline.
 */
export function autoFillPlan(
  plan: SlideRole[],
  content: ContentBundle,
  images: ImageBundle,
  prefs?: LearnedPrefs | null,
  platform: string = "instagram"
): SlideDraftFill[] {
  const usedImg = new Set<string>();
  // Copy already placed — so two slides never restate the same fact / line.
  const usedTitle = new Set<string>();
  const usedSub = new Set<string>();
  return plan.map((role) => {
    const title = topPrimary(role, content, prefs, platform, usedTitle);
    if (title) usedTitle.add(normContent(title));
    const subtext = topSecondary(role, content, usedSub);
    if (subtext) usedSub.add(normContent(subtext));
    // Match imagery to the slide's actual copy (title + supporting line) so a
    // reporting slide pulls the aftermath photo that fits the fact.
    const imageId = pickImageId(role, images, usedImg, `${title} ${subtext ?? ""}`);
    if (imageId) usedImg.add(imageId);
    return { role, title, subtext, imageId };
  });
}

/** A sensible default plan given the count + what content exists. Builds the
 *  middle from DISTINCT roles, each gated on whether the report actually has
 *  the content to fill it — so we don't seed two identical fact slides when a
 *  stat / quote / response / multi-stat would add variety. A role only repeats
 *  once every distinct role is spent (and even then the auto-fill dedups the
 *  copy so the two slides read differently). */
export function suggestPlan(count: number, content: ContentBundle): SlideRole[] {
  const n = Math.max(2, count);
  const plan: SlideRole[] = ["hero"];
  const middleCount = n - 2;
  const factN = facts(content).length;
  const statN = statValues(content).length;
  const quoteN = quotes(content).length;

  // Editorial priority, each gated on available content.
  const rotation: SlideRole[] = [];
  if (factN >= 1) rotation.push("fact");
  if (statN >= 1) rotation.push("stat");
  if (quoteN >= 1) rotation.push("testimony");
  rotation.push("response");
  if (factN >= 3) rotation.push("multistat");
  if (factN >= 4) rotation.push("fact"); // a second, distinct fact only when deep
  if (rotation.length === 0) rotation.push("fact");

  for (let i = 0; i < middleCount; i++) {
    plan.push(rotation[i % rotation.length]!);
  }
  if (n >= 2) plan.push("cta");
  return plan.slice(0, n);
}
