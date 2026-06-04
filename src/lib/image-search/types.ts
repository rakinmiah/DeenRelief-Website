/**
 * Free-to-use web image search — shared types + helpers.
 *
 * Results normalise to the SAME `ImageCandidate` shape the deck-builder
 * image panel already renders (DR library + news imagery), so the search
 * grid is a drop-in. We extend it with the licensing fields a charity must
 * respect: every result carries a human credit + the licence + a link back
 * to the source page. Licence policy (set in openverse.ts): CC0 / Public
 * Domain + CC-BY only — never share-alike (CC-BY-SA), NC or ND — so the
 * only obligation is showing the credit.
 */

import type { ImageCandidate, ImageOrientation } from "@/lib/social-templates/types";

export type WebImageResult = ImageCandidate & {
  /** Human licence label, e.g. "CC0", "Public Domain", "CC BY 4.0",
   *  "Pexels", "Unsplash". */
  license: string | null;
  /** Where it came from, e.g. "Wikimedia", "Flickr", "Pexels", "Unsplash". */
  sourceLabel: string;
  /** Link to the image's source page (for the credit link). */
  attributionUrl: string | null;
  /** Unsplash only — the API requires we ping this when an image is used. */
  downloadLocation: string | null;
};

/** Polite identifier for the image-search APIs. */
export const SEARCH_UA =
  "DeenReliefSocial/1.0 (https://deenrelief.org; tech@deenrelief.org)";

/** Classify orientation from width/height (square-ish tolerance) — matches
 *  the social-content images endpoint so slots stay compatible. */
export function classifyOrientation(
  width: number | null | undefined,
  height: number | null | undefined
): ImageOrientation {
  if (!width || !height) return "square";
  const ratio = width / height;
  if (ratio > 1.15) return "landscape";
  if (ratio < 0.87) return "portrait";
  return "square";
}

/** Build the standard credit line shown on every web result. */
export function buildCredit(
  creator: string | null | undefined,
  sourceLabel: string,
  license: string | null
): string {
  const who = (creator || "Unknown").trim();
  const lic = license ? ` · ${license}` : "";
  return `Photo: ${who} · ${sourceLabel}${lic}`;
}
