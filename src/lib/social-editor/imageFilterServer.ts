/**
 * Server-side reproduction of the editor's image filters (Phase 10f).
 *
 * Satori ignores the CSS `filter` property, so to make filtered images
 * survive to the exported PNG we bake the same treatments with sharp.
 * These approximate the CSS filters in imageStyle.ts — close enough
 * that the editor preview matches the export.
 *
 * SERVER ONLY — import from the render route, never from client code.
 */

import sharp from "sharp";
import type { ImageFilter } from "./types";

export async function applyFilter(
  buf: Buffer,
  filter: ImageFilter | undefined
): Promise<Buffer> {
  if (!filter || filter === "none") return buf;
  let s = sharp(buf);
  switch (filter) {
    case "mono":
      s = s.grayscale().linear(1.05, -6);
      break;
    case "warm":
      s = s.modulate({ saturation: 1.18, brightness: 1.03, hue: -8 });
      break;
    case "cool":
      s = s.modulate({ saturation: 1.1, brightness: 1.02, hue: 12 });
      break;
    case "bright":
      s = s.modulate({ brightness: 1.12, saturation: 1.12 }).linear(1.05, -6);
      break;
    case "faded":
      s = s.modulate({ saturation: 0.78, brightness: 1.06 }).linear(0.9, 12);
      break;
  }
  return s.png().toBuffer();
}
