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

import type { ImageFilter } from "./types";

export async function applyFilter(
  buf: Buffer,
  filter: ImageFilter | undefined
): Promise<Buffer> {
  if (!filter || filter === "none") return buf;
  // Lazy import so a sharp init problem can't crash the route module.
  const sharp = (await import("sharp")).default;
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

/**
 * Prepare an image for Satori export: downscale anything larger than
 * `maxDim` on its longest side (resvg/Satori choke on very large art —
 * e.g. a 2085px logo renders blank) and bake the colour filter. Small,
 * unfiltered images pass straight through untouched. Re-encoding also
 * normalises odd PNG encodings to a clean baseline.
 *
 * Returns the bytes + the mime to inline. Transparent art stays PNG;
 * opaque art becomes JPEG (smaller).
 */
export async function prepareImage(
  buf: Buffer,
  filter: ImageFilter | undefined,
  maxDim: number,
  fallbackMime: string,
  /** For `contain`-fit layers: letterbox the art to this exact box (px)
   *  so the render route can paint it with objectFit:"cover". Satori's
   *  objectFit:"contain" silently drops the image; "cover" of a
   *  pre-letterboxed, box-sized image is faithful (no crop). `bg` (solid
   *  hex) fills the letterbox bars + makes it an opaque JPEG; omit it to
   *  keep transparency. */
  containBox?: { w: number; h: number; bg?: string }
): Promise<{ data: Buffer; mime: string }> {
  const hasFilter = !!filter && filter !== "none";
  // `working` is the bytes we'll ultimately hand to Satori. We downscale
  // oversized art into it as a SEPARATE materialised pass (below) so that
  // (a) Satori/resvg never receives a very large source — it renders e.g. the
  // 2085px DR logo BLANK — and (b) we never chain two .resize() calls on one
  // sharp pipeline (unreliable). If a later step throws, the catch returns
  // `working`, which is already small — never the huge original.
  let working = buf;
  let workingMime = fallbackMime;
  try {
    const sharp = (await import("sharp")).default;
    const meta = await sharp(buf, { failOn: "none" }).metadata();
    const longest = Math.max(meta.width ?? 0, meta.height ?? 0);
    const tooBig = longest > maxDim;
    if (!tooBig && !hasFilter && !containBox) {
      return { data: buf, mime: fallbackMime };
    }
    if (tooBig) {
      working = await sharp(buf, { failOn: "none" })
        .resize({ width: maxDim, height: maxDim, fit: "inside", withoutEnlargement: true })
        .png()
        .toBuffer();
      workingMime = "image/png";
    }
    let img = sharp(working, { failOn: "none" });
    switch (filter) {
      case "mono": img = img.grayscale().linear(1.05, -6); break;
      case "warm": img = img.modulate({ saturation: 1.18, brightness: 1.03, hue: -8 }); break;
      case "cool": img = img.modulate({ saturation: 1.1, brightness: 1.02, hue: 12 }); break;
      case "bright": img = img.modulate({ brightness: 1.12, saturation: 1.12 }).linear(1.05, -6); break;
      case "faded": img = img.modulate({ saturation: 0.78, brightness: 1.06 }).linear(0.9, 12); break;
      default: break;
    }
    if (containBox) {
      img = img.resize({
        width: containBox.w,
        height: containBox.h,
        fit: "contain",
        background: containBox.bg ?? { r: 0, g: 0, b: 0, alpha: 0 },
      });
      if (containBox.bg) {
        return { data: await img.jpeg({ quality: 92 }).toBuffer(), mime: "image/jpeg" };
      }
      return { data: await img.png().toBuffer(), mime: "image/png" };
    }
    const hasAlpha = meta.hasAlpha ?? false;
    if (hasAlpha) {
      return { data: await img.png().toBuffer(), mime: "image/png" };
    }
    return { data: await img.jpeg({ quality: 86 }).toBuffer(), mime: "image/jpeg" };
  } catch {
    // Return the (already-downscaled) working bytes — NEVER the huge original.
    return { data: working, mime: workingMime };
  }
}
