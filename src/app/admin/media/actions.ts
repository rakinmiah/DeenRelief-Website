"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { requireAdminSession } from "@/lib/admin-session";
import { logAdminAction } from "@/lib/admin-audit";
import {
  deleteMediaWithFile,
  fetchMediaById,
  updateMediaMetadata,
} from "@/lib/dr-media";

/**
 * Server actions for the media library detail page.
 *
 * Upload is a separate REST route at /api/admin/media/upload —
 * server actions can't accept FormData with File objects cleanly
 * for large bodies, and the upload needs a real streaming
 * multipart endpoint.
 */

async function audit(
  action:
    | "delete_media"
    | "update_media_metadata",
  targetId: string,
  metadata: Record<string, unknown>
) {
  const session = await requireAdminSession();
  const h = await headers();
  const fauxRequest = new Request("http://server-action.local", {
    headers: {
      "user-agent": h.get("user-agent") ?? "",
      "x-forwarded-for": h.get("x-forwarded-for") ?? "",
    },
  });
  await logAdminAction({
    action,
    userEmail: session.email,
    targetId,
    request: fauxRequest,
    metadata,
  });
}

export interface UpdateMediaResult {
  ok: boolean;
  error?: string;
}

export async function updateMediaMetadataAction(
  mediaId: string,
  description: string,
  tagsRaw: string
): Promise<UpdateMediaResult> {
  await requireAdminSession();

  // Tags input is a comma- or newline-separated string from the
  // form. Split, trim, dedupe, drop empties. The DB column is
  // text[] so we send a clean array.
  const tags = Array.from(
    new Set(
      tagsRaw
        .split(/[,\n]+/)
        .map((t) => t.trim())
        .filter((t) => t.length > 0 && t.length <= 50)
    )
  );

  try {
    await updateMediaMetadata(mediaId, {
      description: description.trim() || null,
      tags,
    });
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error ? err.message : "Couldn't update metadata.",
    };
  }

  await audit("update_media_metadata", mediaId, {
    descriptionLength: description.trim().length,
    tagsCount: tags.length,
  });

  revalidatePath(`/admin/media/${mediaId}`);
  revalidatePath("/admin/media");
  return { ok: true };
}

/**
 * Hard-delete a media row + its underlying Storage object.
 * Snapshots the row's identifying fields to the audit log first
 * so we keep a permanent record of what was removed and by whom.
 *
 * Redirects to /admin/media on success — the detail page would
 * 404 immediately after deletion.
 */
export async function deleteMediaAction(mediaId: string): Promise<void> {
  await requireAdminSession();

  const media = await fetchMediaById(mediaId);
  if (!media) {
    throw new Error("Media not found.");
  }

  const auditSnapshot = {
    filename: media.filename,
    mimeType: media.mimeType,
    sizeBytes: media.sizeBytes,
    storagePath: media.storagePath,
    uploadedByEmail: media.uploadedByEmail,
    description: media.description,
    tags: media.tags,
  };

  await deleteMediaWithFile(mediaId);

  await audit("delete_media", mediaId, auditSnapshot);

  revalidatePath("/admin/media");
  redirect("/admin/media?deleted=1");
}
