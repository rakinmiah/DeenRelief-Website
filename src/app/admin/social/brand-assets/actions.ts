"use server";

/**
 * Brand assets server actions — upload + archive.
 *
 * Uploads land in dr-media/brand/<variant>-<uuid>.<ext>. Each upload
 * automatically archives any prior active asset for the same variant
 * (enforced by the unique partial index on the table). The renderer
 * picks the new asset on the next request.
 */

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/admin-session";
import { logAdminAction } from "@/lib/admin-audit";
import {
  archiveBrandAsset,
  createBrandAsset,
  isBrandVariant,
  MEDIA_BUCKET,
  type BrandAsset,
  type BrandVariant,
} from "@/lib/brand-assets";
import { getSupabaseAdmin } from "@/lib/supabase";

export type BrandActionResult<T = void> =
  | (T extends void ? { ok: true } : { ok: true; data: T })
  | { ok: false; error: string };

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB — logos are small
const ALLOWED_MIME = new Set([
  "image/png",
  "image/svg+xml",
  "image/jpeg",
  "image/webp",
]);

const EXTENSION_FOR_MIME: Record<string, string> = {
  "image/png": ".png",
  "image/svg+xml": ".svg",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
};

export interface UploadBrandAssetInput {
  variant: string;
  fileBase64: string;
  fileName: string;
  mimeType: string;
  bytes: number;
  notes?: string;
}

export async function uploadBrandAssetAction(
  input: UploadBrandAssetInput
): Promise<BrandActionResult<BrandAsset>> {
  try {
    const session = await requireAdminSession();

    if (!isBrandVariant(input.variant)) {
      return { ok: false, error: "Unknown brand variant." };
    }
    const variant: BrandVariant = input.variant;

    if (!ALLOWED_MIME.has(input.mimeType)) {
      return {
        ok: false,
        error: "Logo must be PNG, SVG, JPEG, or WebP.",
      };
    }
    if (input.bytes <= 0 || input.bytes > MAX_BYTES) {
      return {
        ok: false,
        error: `Logo must be between 1 byte and ${MAX_BYTES / 1024 / 1024} MB.`,
      };
    }

    const rawBase64 = input.fileBase64.includes(",")
      ? input.fileBase64.split(",", 2)[1] ?? ""
      : input.fileBase64;
    let buffer: Buffer;
    try {
      buffer = Buffer.from(rawBase64, "base64");
    } catch {
      return { ok: false, error: "File payload could not be decoded." };
    }
    if (buffer.length === 0) {
      return { ok: false, error: "Empty file payload." };
    }

    const ext = EXTENSION_FOR_MIME[input.mimeType] ?? "";
    const storagePath = `brand/${variant}-${randomUUID()}${ext}`;

    const supabase = getSupabaseAdmin();
    const uploadRes = await supabase.storage
      .from(MEDIA_BUCKET)
      .upload(storagePath, buffer, {
        contentType: input.mimeType,
        cacheControl: "604800",
      });
    if (uploadRes.error) {
      console.error("[brand-assets] upload failed:", uploadRes.error);
      return {
        ok: false,
        error: `Storage upload failed: ${uploadRes.error.message}`,
      };
    }

    const asset = await createBrandAsset({
      variant,
      storagePath,
      originalFilename: input.fileName,
      mimeType: input.mimeType,
      bytes: input.bytes,
      notes: input.notes?.trim() || null,
      uploadedByEmail: session.email,
    });
    if (!asset) {
      return { ok: false, error: "Could not save the brand asset row." };
    }

    await logAdminAction({
      action: "brand_asset_uploaded",
      userEmail: session.email,
      targetId: asset.id,
      metadata: {
        variant,
        mime: input.mimeType,
        bytes: input.bytes,
      },
    });

    revalidatePath("/admin/social/brand-assets");
    revalidatePath("/admin/social");
    return { ok: true, data: asset };
  } catch (err) {
    console.error("[brand-assets] upload unexpected error:", err);
    return {
      ok: false,
      error:
        err instanceof Error
          ? `Upload failed: ${err.message}`
          : "Upload failed: unknown error",
    };
  }
}

export async function archiveBrandAssetAction(
  id: string
): Promise<BrandActionResult> {
  try {
    const session = await requireAdminSession();
    const ok = await archiveBrandAsset(id);
    if (!ok) return { ok: false, error: "Could not archive the asset." };
    await logAdminAction({
      action: "brand_asset_archived",
      userEmail: session.email,
      targetId: id,
    });
    revalidatePath("/admin/social/brand-assets");
    return { ok: true };
  } catch (err) {
    console.error("[brand-assets] archive unexpected error:", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
