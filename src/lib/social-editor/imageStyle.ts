/**
 * Image crop + filter rendering helpers (Phase 10d).
 *
 * Crop geometry is expressed as CSS the SAME way in the editor and in
 * the Satori export (objectFit cover + objectPosition + transform
 * scale), so what she sees is what the PNG gets. Colour FILTERS render
 * as CSS in the editor but are baked with sharp at export (Satori
 * ignores the `filter` property), so `filterCss` here is editor-only.
 */

import type { CSSProperties } from "react";
import type { ImageCrop, ImageFilter } from "./types";

/** Inner-<img> style for a (possibly cropped) image filling its frame. */
export function cropImgStyle(crop?: ImageCrop): CSSProperties {
  const scale = crop?.scale ?? 1;
  const fx = 50 + (crop?.ox ?? 0);
  const fy = 50 + (crop?.oy ?? 0);
  return {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition: `${fx}% ${fy}%`,
    transform: scale !== 1 ? `scale(${scale})` : undefined,
    transformOrigin: `${fx}% ${fy}%`,
  };
}

/** CSS filter string for the editor preview (null = no filter). */
export function filterCss(f?: ImageFilter): string | undefined {
  switch (f) {
    case "mono":
      return "grayscale(1) contrast(1.05)";
    case "warm":
      return "saturate(1.18) sepia(0.16) brightness(1.03)";
    case "cool":
      return "saturate(1.1) hue-rotate(-12deg) brightness(1.02)";
    case "bright":
      return "brightness(1.12) contrast(1.05) saturate(1.12)";
    case "faded":
      return "contrast(0.9) saturate(0.78) brightness(1.06)";
    default:
      return undefined;
  }
}

export const FILTER_PRESETS: Array<{ id: ImageFilter; label: string }> = [
  { id: "none", label: "Original" },
  { id: "mono", label: "Mono" },
  { id: "warm", label: "Warm" },
  { id: "cool", label: "Cool" },
  { id: "bright", label: "Bright" },
  { id: "faded", label: "Faded" },
];
