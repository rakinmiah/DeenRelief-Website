import type { TemplateMeta } from "@/lib/social-templates/types";

/**
 * Variant lists for the new type-only middle slides (Donation tiers,
 * Before/After, Multi-stat). The template registry has no entries for these
 * categories yet, so — like HERO_VARIANTS — we drive their picker from a
 * local list that renders through `presetForTemplate(id)`. v1 ships one
 * variant each; Phase 2 (the Claude Design build) expands every type to ten.
 */
function meta(id: string, name: string, description: string): TemplateMeta {
  return {
    id,
    name,
    description,
    platforms: ["instagram", "facebook"],
    category: id.split("-")[0]!,
    aspect: "square",
    size: { w: 1080, h: 1080 },
    slots: [],
    previewPath: "",
  } as TemplateMeta;
}

export const MIDDLE_VARIANTS: Record<string, TemplateMeta[]> = {
  tiers: [
    meta("tiers-a", "Impact ladder", "A heading over a £30 / £100 / £250 impact ladder — what each gift provides."),
  ],
  beforeafter: [
    meta("beforeafter-a", "Then & now", "Two figures split by a gold divider — a before/after contrast with a source line."),
  ],
  multistat: [
    meta("multistat-a", "By the numbers", "Three numbered figures stacked on forest — the scale of the crisis at a glance."),
  ],
  fact: [
    meta("fact-a", "Photo lower-third", "Full-bleed photo with the sourced fact, a gold rule and a source tag in the lower third."),
    meta("fact-b", "Type-led", "Type-only on forest — an eyebrow, a big Anton fact, a gold rule and a gold source tag."),
    meta("fact-c", "Top photo + panel", "Photo across the top with a forest panel below carrying the fact and its source."),
    meta("fact-d", "Split", "Photo left, a forest panel right carrying the fact and source — a vertical 50/50."),
    meta("fact-e", "Keyline card", "The fact framed in a gold keyline card on forest, with eyebrow, fact and source."),
    meta("fact-f", "Lead-in detail", "A lead-in eyebrow, the fact, one pulled supporting detail line and a source."),
    meta("fact-g", "Caption bar", "Full-bleed photo with a solid forest caption bar carrying the fact and its source."),
    meta("fact-h", "Inset card", "Full-bleed photo with a gold-bordered forest card floated low holding the fact and source."),
    meta("fact-i", "Crest", "A quiet centred crest — diamond emblem, centred Anton fact, a gold rule and source meta."),
    meta("fact-j", "Two-tone", "A gold-bordered card — a forest panel carries the fact, a cream band holds the source."),
  ],
  stat: [
    meta("stat-a", "Colossal", "A colossal centred Anton numeral with an eyebrow above and a short label beneath."),
    meta("stat-b", "With context", "A big numeral in the upper area with a context sentence and a source line beneath."),
    meta("stat-c", "Bleeding numeral", "An oversized numeral bleeding off the edge as a graphic, the label set against it."),
    meta("stat-d", "Over photo", "Full-bleed photo with the stat and label in the lower third over a strong scrim."),
    meta("stat-e", "With unit", "A big numeral with a gold unit word beside it, a label and a source line."),
    meta("stat-f", "Gold inverted", "A full gold field with a colossal forest numeral and label — the loud stat."),
    meta("stat-g", "Split", "Photo left, a forest panel right carrying the stat, label and source."),
    meta("stat-h", "Crest", "A centred gold keyline frame around a big numeral, a gold rule and the label."),
    meta("stat-i", "Comparison", "A big numeral with a one-line ‘that's like…’ comparison giving it human scale."),
    meta("stat-j", "With beat", "The stat and label plus one small supporting footnote beat at the foot."),
  ],
  cta: [
    meta("cta-a", "Type-led", "Forest field, a big Anton ask, a gold rule and a DONATE NOW pill — the typographic close."),
    meta("cta-b", "Gold inverted", "A full gold field with forest ink and a forest DONATE pill — the loud, high-contrast close."),
    meta("cta-c", "Photo lower-third", "Full-bleed photo with the ask, a gold rule and a DONATE pill in the lower third."),
    meta("cta-d", "Crest", "Centred gold emblem, the ask, a gold rule and a centred DONATE pill inside a keyline frame."),
    meta("cta-e", "Split", "Photo left, a forest panel right carrying the ask and a DONATE pill."),
    meta("cta-f", "Stat-led", "A giant numeral + ‘need you now’, the ask and a centred DONATE pill."),
    meta("cta-g", "Quote-led", "A short testimony with attribution, then the ask and a DONATE pill."),
    meta("cta-h", "Urgency", "A gold ‘every hour counts’ chip, a big ask, a proximity tag and a DONATE pill."),
    meta("cta-i", "Scan to give", "A SCAN TO GIVE heading, a QR placeholder, the ask and a DONATE pill."),
    meta("cta-j", "Wordmark card", "A clean closing brand card — the DEEN RELIEF wordmark, a closing line and a DONATE pill."),
  ],
};
