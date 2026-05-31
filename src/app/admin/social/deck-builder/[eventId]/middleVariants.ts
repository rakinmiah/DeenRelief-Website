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
};
