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
  const style: CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition: `${fx}% ${fy}%`,
  };
  // Satori rejects `transform: undefined`, so only set it when zoomed.
  if (scale !== 1) {
    style.transform = `scale(${scale})`;
    style.transformOrigin = `${fx}% ${fy}%`;
  }
  return style;
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

/**
 * Photo-credit overlay geometry, in BOARD units, scaled to the image box so a
 * full-bleed hero and a small inset both get a legible-but-unobtrusive credit.
 * Shared by the editor preview (LayerView, multiplied by zoom) and the Satori
 * export route (board units) so the credit is WYSIWYG. `pad`/`gap`/`radius`
 * are board units too; the caller multiplies all of them by its scale.
 */
export function creditBadgeMetrics(boxW: number): {
  fontSize: number;
  pad: number;
  radius: number;
  inset: number;
} {
  const fontSize = Math.max(15, Math.min(boxW * 0.024, 24));
  return {
    fontSize,
    pad: Math.round(fontSize * 0.45),
    radius: Math.round(fontSize * 0.35),
    inset: Math.round(fontSize * 0.6),
  };
}

export const FILTER_PRESETS: Array<{ id: ImageFilter; label: string }> = [
  { id: "none", label: "Original" },
  { id: "mono", label: "Mono" },
  { id: "warm", label: "Warm" },
  { id: "cool", label: "Cool" },
  { id: "bright", label: "Bright" },
  { id: "faded", label: "Faded" },
];
