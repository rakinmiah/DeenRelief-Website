/**
 * Brand assets — data layer.
 *
 * Backs migration 028. Separate from media_library because logos are
 * looked up by deterministic name ('logo-on-light' / 'logo-on-dark')
 * rather than by AI selection, and don't need captions/tags.
 *
 * Storage: bytes live in the dr-media bucket under a brand/ prefix.
 * The same MEDIA_BUCKET constant is reused so the public-URL helper
 * works without duplication.
 */

import { MEDIA_BUCKET, publicUrlForPath } from "./media-library";
import { getSupabaseAdmin } from "./supabase";

export { MEDIA_BUCKET };

/* ─── Variants ────────────────────────────────────────────────────── */

export const BRAND_VARIANTS = [
  "logo-on-light",
  "logo-on-dark",
  "logo-amber",
] as const;

export type BrandVariant = (typeof BRAND_VARIANTS)[number];

export function isBrandVariant(value: unknown): value is BrandVariant {
  return (
    typeof value === "string" &&
    (BRAND_VARIANTS as readonly string[]).includes(value)
  );
}

/** Human-readable label per variant — used in the upload picker. */
export function brandVariantLabel(variant: string): string {
  switch (variant) {
    case "logo-on-light":
      return "Logo (for light backgrounds)";
    case "logo-on-dark":
      return "Logo (for dark / green backgrounds)";
    case "logo-amber":
      return "Logo (amber accent)";
    default:
      return variant;
  }
}

/** When-to-use guidance text per variant — shown in the upload UI. */
export function brandVariantHint(variant: string): string {
  switch (variant) {
    case "logo-on-light":
      return "Typically a forest-green or dark version of the DR logo. Used inside the brand chip on cream-coloured slides and on the photo half of photo slides.";
    case "logo-on-dark":
      return "Typically a white or cream version of the DR logo. Used when the renderer prefers a logo directly on a dark background (no chip).";
    case "logo-amber":
      return "Optional. Accent variant for amber-coloured contexts. Rarely needed for First Response output.";
    default:
      return "";
  }
}

/* ─── Types ──────────────────────────────────────────────────────── */

export interface BrandAsset {
  id: string;
  variant: string;
  storagePath: string;
  publicUrl: string;
  originalFilename: string | null;
  mimeType: string;
  width: number | null;
  height: number | null;
  bytes: number | null;
  notes: string | null;
  uploadedByEmail: string | null;
  uploadedAt: Date;
  archivedAt: Date | null;
}

interface BrandAssetRow {
  id: string;
  variant: string;
  storage_path: string;
  original_filename: string | null;
  mime_type: string;
  width: number | null;
  height: number | null;
  bytes: number | null;
  notes: string | null;
  uploaded_by_email: string | null;
  uploaded_at: string;
  archived_at: string | null;
}

function rowToAsset(row: BrandAssetRow): BrandAsset {
  return {
    id: row.id,
    variant: row.variant,
    storagePath: row.storage_path,
    publicUrl: publicUrlForPath(row.storage_path),
    originalFilename: row.original_filename,
    mimeType: row.mime_type,
    width: row.width,
    height: row.height,
    bytes: row.bytes,
    notes: row.notes,
    uploadedByEmail: row.uploaded_by_email,
    uploadedAt: new Date(row.uploaded_at),
    archivedAt: row.archived_at ? new Date(row.archived_at) : null,
  };
}

const BRAND_SELECT_COLS =
  "id, variant, storage_path, original_filename, mime_type, width, height, bytes, notes, uploaded_by_email, uploaded_at, archived_at";

/* ─── Reads ──────────────────────────────────────────────────────── */

/** Return the active (non-archived) asset for a variant, or null. */
export async function getActiveBrandAsset(
  variant: BrandVariant
): Promise<BrandAsset | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("brand_assets")
    .select(BRAND_SELECT_COLS)
    .eq("variant", variant)
    .is("archived_at", null)
    .maybeSingle<BrandAssetRow>();
  if (error) {
    console.error("[brand-assets] active read failed:", error);
    return null;
  }
  return data ? rowToAsset(data) : null;
}

/**
 * Bulk-fetch the active asset for every recognised variant. Used by
 * the admin browse page so we render one row per variant with either
 * "uploaded ✓" or "not yet uploaded" state.
 */
export async function listActiveBrandAssets(): Promise<
  Record<BrandVariant, BrandAsset | null>
> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("brand_assets")
    .select(BRAND_SELECT_COLS)
    .is("archived_at", null)
    .returns<BrandAssetRow[]>();

  const result: Record<BrandVariant, BrandAsset | null> = {
    "logo-on-light": null,
    "logo-on-dark": null,
    "logo-amber": null,
  };
  if (error) {
    console.error("[brand-assets] list active failed:", error);
    return result;
  }
  for (const row of data ?? []) {
    if (isBrandVariant(row.variant)) {
      result[row.variant] = rowToAsset(row);
    }
  }
  return result;
}

/** History of past + current assets per variant (archived included). */
export async function listAllBrandAssets(
  variant?: BrandVariant
): Promise<BrandAsset[]> {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("brand_assets")
    .select(BRAND_SELECT_COLS)
    .order("uploaded_at", { ascending: false })
    .limit(50);
  if (variant) query = query.eq("variant", variant);
  const { data, error } = await query.returns<BrandAssetRow[]>();
  if (error) {
    console.error("[brand-assets] list all failed:", error);
    return [];
  }
  return (data ?? []).map(rowToAsset);
}

/* ─── Writes ─────────────────────────────────────────────────────── */

export interface CreateBrandAssetInput {
  variant: BrandVariant;
  storagePath: string;
  originalFilename?: string | null;
  mimeType: string;
  width?: number | null;
  height?: number | null;
  bytes?: number | null;
  notes?: string | null;
  uploadedByEmail: string;
}

/**
 * Insert a new brand asset row. Archives any existing active asset
 * for the same variant first — the unique partial index would
 * otherwise reject the insert. One active per variant.
 */
export async function createBrandAsset(
  input: CreateBrandAssetInput
): Promise<BrandAsset | null> {
  const supabase = getSupabaseAdmin();

  // Archive existing active for this variant.
  await supabase
    .from("brand_assets")
    .update({ archived_at: new Date().toISOString() })
    .eq("variant", input.variant)
    .is("archived_at", null);

  const { data, error } = await supabase
    .from("brand_assets")
    .insert({
      variant: input.variant,
      storage_path: input.storagePath,
      original_filename: input.originalFilename ?? null,
      mime_type: input.mimeType,
      width: input.width ?? null,
      height: input.height ?? null,
      bytes: input.bytes ?? null,
      notes: input.notes ?? null,
      uploaded_by_email: input.uploadedByEmail,
    })
    .select(BRAND_SELECT_COLS)
    .maybeSingle<BrandAssetRow>();
  if (error || !data) {
    console.error("[brand-assets] insert failed:", error);
    return null;
  }
  return rowToAsset(data);
}

export async function archiveBrandAsset(id: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("brand_assets")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id)
    .is("archived_at", null);
  if (error) {
    console.error("[brand-assets] archive failed:", error);
    return false;
  }
  return true;
}

/* ─── Renderer helper: fetch + inline a logo ─────────────────────── */

/**
 * Fetch the active brand asset for the given variant and return it
 * as a data URI ready to drop into a Satori <img src=...>. Returns
 * null when no asset is uploaded (renderer falls back to the inline
 * SVG approximation).
 *
 * Mirrors the pattern used for content images in the slide route —
 * inlining bytes server-side avoids any Satori fetch quirks.
 */
export async function getLogoDataUri(
  variant: BrandVariant
): Promise<{ dataUri: string; mimeType: string } | null> {
  const asset = await getActiveBrandAsset(variant);
  if (!asset) return null;
  try {
    const res = await fetch(asset.publicUrl);
    if (!res.ok) {
      console.warn(
        `[brand-assets] fetch failed (${res.status}) for ${asset.publicUrl}`
      );
      return null;
    }
    const buf = await res.arrayBuffer();
    const mimeType =
      res.headers.get("content-type") ?? asset.mimeType ?? "image/png";
    const base64 = Buffer.from(buf).toString("base64");
    return {
      dataUri: `data:${mimeType};base64,${base64}`,
      mimeType,
    };
  } catch (err) {
    console.error(
      `[brand-assets] fetch exception for ${asset.publicUrl}:`,
      err
    );
    return null;
  }
}
