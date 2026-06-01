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
