/**
 * Resolve the active DR brand logo into a `BrandLogo` ready for the
 * layer presets — a public URL plus its true aspect ratio so a preset
 * can size the logo box to the artwork (no distortion / centring gap).
 *
 * Older brand-asset rows may have null width/height (the upload didn't
 * record them), so when they're missing we probe the bytes with sharp.
 * Server-only (uses the Supabase admin client + sharp).
 */

import {
  getActiveBrandAsset,
  type BrandVariant,
} from "@/lib/brand-assets";
import type { BrandLogo } from "@/lib/social-editor/presets";

export async function resolveBrandLogo(
  variant: BrandVariant
): Promise<{ logo: BrandLogo | null; uploaded: boolean }> {
  const asset = await getActiveBrandAsset(variant);
  if (!asset) return { logo: null, uploaded: false };

  let w = asset.width ?? null;
  let h = asset.height ?? null;

  if (!w || !h) {
    try {
      const res = await fetch(asset.publicUrl, {
        headers: {
          "User-Agent":
            "DeenReliefSocial/1.0 (https://deenrelief.org; tech@deenrelief.org)",
        },
      });
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        const sharp = (await import("sharp")).default;
        const meta = await sharp(buf).metadata();
        w = meta.width ?? null;
        h = meta.height ?? null;
      }
    } catch (err) {
      console.warn("[logo] dimension probe failed:", err);
    }
  }

  const logo: BrandLogo | null =
    w && h ? { url: asset.publicUrl, aspect: w / h } : null;
  return { logo, uploaded: true };
}
