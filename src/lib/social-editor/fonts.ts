/**
 * Curated font set for the canvas editor (Phase 10c).
 *
 * The SAME families render three places, so they must stay in sync:
 *   • the editor canvas (loaded via a Google Fonts <link>)
 *   • the font picker in the contextual toolbar
 *   • the Satori export (loadGoogleFont per used family+weight)
 *
 * Keeping the list here means a font added once works everywhere.
 */

export type FontCategory = "sans" | "serif" | "display";

export type FontOption = {
  /** Short label shown in the picker. */
  label: string;
  /** Exact Google Fonts family name (also the CSS font-family). */
  family: string;
  /** Weights we load + offer. */
  weights: number[];
  category: FontCategory;
};

export const FONT_OPTIONS: FontOption[] = [
  { label: "DM Sans", family: "DM Sans", weights: [400, 500, 700], category: "sans" },
  { label: "Source Serif", family: "Source Serif 4", weights: [400, 600, 700], category: "serif" },
  { label: "Bowlby One SC", family: "Bowlby One SC", weights: [400], category: "display" },
  { label: "Anton", family: "Anton", weights: [400], category: "display" },
  { label: "Barlow", family: "Barlow", weights: [400, 500, 600, 700], category: "sans" },
  { label: "Bebas Neue", family: "Bebas Neue", weights: [400], category: "display" },
  { label: "Oswald", family: "Oswald", weights: [400, 600], category: "display" },
  { label: "Poppins", family: "Poppins", weights: [400, 600, 700], category: "sans" },
  { label: "Montserrat", family: "Montserrat", weights: [400, 600, 800], category: "sans" },
  { label: "Playfair Display", family: "Playfair Display", weights: [400, 700], category: "serif" },
  { label: "Lora", family: "Lora", weights: [400, 600], category: "serif" },
];

const FAMILY_SET = new Set(FONT_OPTIONS.map((o) => o.family));

/** The single <link> href that loads every editor font. */
export function googleFontsHref(): string {
  const families = FONT_OPTIONS.map(
    (o) => `family=${o.family.replace(/ /g, "+")}:wght@${o.weights.join(";")}`
  ).join("&");
  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}

/** Closest weight a family actually ships (so we never request a
 *  missing weight from Google — single-weight display fonts otherwise
 *  404). */
export function nearestWeight(family: string, weight: number): number {
  const opt = FONT_OPTIONS.find((o) => o.family === family);
  if (!opt || opt.weights.length === 0) return weight;
  return opt.weights.reduce(
    (best, w) => (Math.abs(w - weight) < Math.abs(best - weight) ? w : best),
    opt.weights[0]!
  );
}

/** A font-family string may be a literal Google family or a CSS stack
 *  like '"DM Sans", sans-serif' (older seeds). Pull the bare family. */
export function bareFamily(fontFamily: string): string {
  const first = fontFamily.split(",")[0]!.trim().replace(/^["']|["']$/g, "");
  return FAMILY_SET.has(first) ? first : "DM Sans";
}
