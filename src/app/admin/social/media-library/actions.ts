"use server";

/**
 * Media library server actions — upload, suggest, save, edit, archive.
 *
 * Upload flow:
 *   1. Client uploads file → uploadMediaAction returns the public URL
 *      + suggested tags (Claude Vision sees the URL, returns metadata).
 *   2. Client renders the form pre-filled with suggestions.
 *   3. SMM edits + clicks Save → saveMediaAction creates the
 *      media_library row.
 *
 * Step (1) and (2) are separate so the upload feels instantaneous —
 * the SMM sees her photo immediately, the suggestions stream in,
 * she can start editing before the AI even finishes.
 *
 * Failure isolation: if Claude Vision errors, we still return the
 * upload URL with empty suggestions — the SMM can tag manually.
 */

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/admin-session";
import { logAdminAction } from "@/lib/admin-audit";
import {
  archiveMedia,
  createMedia,
  getAllKnownStoragePaths,
  listAllStorageFiles,
  MEDIA_BUCKET,
  publicUrlForPath,
  updateMedia,
  type MediaItem,
} from "@/lib/media-library";
import {
  suggestMediaTags,
  type MediaTagSuggestions,
} from "@/lib/media-library-vision";
import { getSupabaseAdmin } from "@/lib/supabase";

export type MediaActionResult<T = void> =
  | (T extends void ? { ok: true } : { ok: true; data: T })
  | { ok: false; error: string };

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

export interface UploadMediaInput {
  /** base64-encoded file bytes (data URI or raw base64). */
  fileBase64: string;
  fileName: string;
  mimeType: string;
  bytes: number;
}

export interface UploadMediaResult {
  storagePath: string;
  publicUrl: string;
  suggestions: MediaTagSuggestions | null;
  suggestionsError: string | null;
  aiTagging: {
    model: string;
    inputTokens: number;
    outputTokens: number;
  } | null;
}

/**
 * Receive an uploaded image, push to Supabase Storage, kick off
 * Claude Vision for tag suggestions, return everything the client
 * needs to render the editable form.
 *
 * Whole body is wrapped in try/catch so any uncaught exception comes
 * back as `{ ok: false, error: <real-message> }` rather than letting
 * Next.js scrub it to a generic "An unexpected error occurred". The
 * client's queue UI surfaces the real text — critical for diagnosing
 * sporadic failures (rate limits, network blips, etc.) without
 * digging into Vercel logs.
 */
export async function uploadMediaAction(
  input: UploadMediaInput
): Promise<MediaActionResult<UploadMediaResult>> {
  try {
    const session = await requireAdminSession();

    if (!ALLOWED_MIME.has(input.mimeType)) {
      return {
        ok: false,
        error: "Only JPEG, PNG, or WebP images are supported.",
      };
    }
    if (input.bytes <= 0 || input.bytes > MAX_BYTES) {
      return {
        ok: false,
        error: `Image must be between 1 byte and ${MAX_BYTES / 1024 / 1024} MB.`,
      };
    }

    // Decode base64 — accept data URIs too ("data:image/jpeg;base64,...").
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

    // Path inside bucket — uuid prefix avoids collisions, retains the
    // original extension for browser content-type sniffing.
    const ext = extensionFor(input.mimeType);
    const storagePath = `${new Date().toISOString().slice(0, 7)}/${randomUUID()}${ext}`;

    const supabase = getSupabaseAdmin();
    const uploadRes = await supabase.storage
      .from(MEDIA_BUCKET)
      .upload(storagePath, buffer, {
        contentType: input.mimeType,
        cacheControl: "604800", // 7 days — images don't change once uploaded
      });
    if (uploadRes.error) {
      console.error("[media-library] upload failed:", uploadRes.error);
      return {
        ok: false,
        error: `Storage upload failed: ${uploadRes.error.message}`,
      };
    }

    const publicUrl = publicUrlForPath(storagePath);

    // Fire Claude Vision for tag suggestions. Failure is non-fatal —
    // the upload is already on disk, the SMM can tag manually.
    let suggestions: MediaTagSuggestions | null = null;
    let aiTagging: UploadMediaResult["aiTagging"] = null;
    let suggestionsError: string | null = null;
    try {
      const result = await suggestMediaTags({ imageUrl: publicUrl });
      suggestions = result.suggestions;
      aiTagging = {
        model: result.model,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
      };
    } catch (err) {
      suggestionsError =
        err instanceof Error ? err.message : "Tag suggestion failed.";
      console.error("[media-library] vision tagging failed:", err);
    }

    await logAdminAction({
      action: "media_uploaded",
      userEmail: session.email,
      targetId: storagePath,
      metadata: { mime: input.mimeType, bytes: input.bytes },
    });

    return {
      ok: true,
      data: {
        storagePath,
        publicUrl,
        suggestions,
        suggestionsError,
        aiTagging,
      },
    };
  } catch (err) {
    // Catch-all so the real error reaches the client UI rather than
    // being scrubbed by the server-actions wire format.
    console.error("[media-library] uploadMediaAction unexpected error:", err);
    return {
      ok: false,
      error:
        err instanceof Error
          ? `Upload failed: ${err.message}`
          : "Upload failed: unknown error",
    };
  }
}

/* ─── Save (finalise after upload) ───────────────────────────────── */

export interface SaveMediaInput {
  storagePath: string;
  caption: string;
  tags: string[];
  campaignSlugs: string[];
  countryIso: string | null;
  eventTypes: string[];
  tone: string | null;
  useCases: string[];
  peopleVisible: boolean;
  identifiableMinors: boolean;
  width?: number;
  height?: number;
  bytes?: number;
  mimeType?: string;
  aiTagging?: {
    model: string;
    inputTokens: number;
    outputTokens: number;
  };
}

export async function saveMediaAction(
  input: SaveMediaInput
): Promise<MediaActionResult<MediaItem>> {
  try {
    const session = await requireAdminSession();
    const item = await createMedia({
      storagePath: input.storagePath,
      caption: input.caption?.trim() || null,
      tags: input.tags,
      campaignSlugs: input.campaignSlugs,
      countryIso: input.countryIso,
      eventTypes: input.eventTypes,
      tone: input.tone,
      useCases: input.useCases,
      peopleVisible: input.peopleVisible,
      identifiableMinors: input.identifiableMinors,
      uploadedByEmail: session.email,
      width: input.width ?? null,
      height: input.height ?? null,
      bytes: input.bytes ?? null,
      mimeType: input.mimeType ?? null,
      aiTagged: input.aiTagging,
    });
    if (!item) return { ok: false, error: "Could not save the media row." };

    await logAdminAction({
      action: "media_saved_to_library",
      userEmail: session.email,
      targetId: item.id,
      metadata: {
        campaignSlugs: input.campaignSlugs,
        countryIso: input.countryIso,
        eventTypes: input.eventTypes,
      },
    });

    revalidatePath("/admin/social/media-library");
    return { ok: true, data: item };
  } catch (err) {
    console.error("[media-library] saveMediaAction unexpected error:", err);
    return {
      ok: false,
      error:
        err instanceof Error
          ? `Save failed: ${err.message}`
          : "Save failed: unknown error",
    };
  }
}

/* ─── Edit / archive ─────────────────────────────────────────────── */

export interface EditMediaInput {
  id: string;
  caption?: string;
  tags?: string[];
  campaignSlugs?: string[];
  countryIso?: string | null;
  eventTypes?: string[];
  tone?: string | null;
  useCases?: string[];
  peopleVisible?: boolean;
  identifiableMinors?: boolean;
}

export async function editMediaAction(
  input: EditMediaInput
): Promise<MediaActionResult<MediaItem>> {
  const session = await requireAdminSession();
  const item = await updateMedia(input.id, {
    caption: input.caption,
    tags: input.tags,
    campaignSlugs: input.campaignSlugs,
    countryIso: input.countryIso,
    eventTypes: input.eventTypes,
    tone: input.tone,
    useCases: input.useCases,
    peopleVisible: input.peopleVisible,
    identifiableMinors: input.identifiableMinors,
  });
  if (!item) return { ok: false, error: "Could not update the media row." };

  await logAdminAction({
    action: "media_edited",
    userEmail: session.email,
    targetId: input.id,
  });
  revalidatePath("/admin/social/media-library");
  return { ok: true, data: item };
}

/* ─── Vision-grounded re-tag ─────────────────────────────────────
 *
 * Used by the batch re-tag tool at /admin/social/media-library/re-tag.
 * The SMM eyeballs library items that look mis-categorised (after
 * spotting them in the First Response debug panel or by browsing the
 * library), clicks 'Re-tag', and Claude Vision proposes fresh metadata
 * for the SMM to accept/reject as a diff.
 *
 * Separated from the upload flow's suggestMediaTags wrapper so the
 * caller surface is purpose-built — propose returns the suggestions
 * + the current item's metadata so the client can render a diff.
 */

export interface RetagProposal {
  item: MediaItem;
  proposed: import("@/lib/media-library-vision").MediaTagSuggestions;
}

export async function proposeRetagAction(
  id: string
): Promise<MediaActionResult<RetagProposal>> {
  const session = await requireAdminSession();
  const { getMediaById } = await import("@/lib/media-library");
  const item = await getMediaById(id);
  if (!item) return { ok: false, error: "Media item not found." };

  try {
    const result = await suggestMediaTags({ imageUrl: item.publicUrl });
    await logAdminAction({
      action: "media_retag_proposed",
      userEmail: session.email,
      targetId: id,
    });
    return { ok: true, data: { item, proposed: result.suggestions } };
  } catch (err) {
    console.error("[media-library] re-tag propose failed:", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Vision tagger failed.",
    };
  }
}

export async function archiveMediaAction(
  id: string
): Promise<MediaActionResult> {
  const session = await requireAdminSession();
  const ok = await archiveMedia(id);
  if (!ok) return { ok: false, error: "Could not archive the media row." };

  await logAdminAction({
    action: "media_archived_from_library",
    userEmail: session.email,
    targetId: id,
  });
  revalidatePath("/admin/social/media-library");
  return { ok: true };
}

/* ─── Bulk-import: scan Storage + auto-tag orphans ──────────────── */

export interface ScanResult {
  totalInStorage: number;
  alreadyInLibrary: number;
  orphansFound: number;
  orphansProcessed: number;
  tagged: number;
  taggingFailed: number;
  errors: string[];
  /** True when there are more orphans than the batch limit allowed — SMM clicks again. */
  moreToProcess: boolean;
}

/** Hard ceiling per scan call. ~5s per Vision call × 20 = ~100s (Vercel maxDuration is 60s on Hobby; we use a generous safety margin). */
const SCAN_BATCH_LIMIT = 20;

/**
 * Scan dr-media bucket for files that have no media_library row,
 * run Claude Vision on each orphan, and create rows with the auto-tagged
 * metadata. Batch-limited so the action fits under Vercel function
 * timeouts.
 *
 * Workflow target: SMM bulk-uploads via the Supabase Dashboard (fast,
 * familiar UI for moving many files), then clicks this button in DR
 * Social. Each scan eats ~20 orphans; she clicks again until
 * moreToProcess is false.
 *
 * Failure isolation: if Vision fails on a specific image, we still
 * create the row with empty tag fields — the file appears in the
 * library so the SMM can tag it manually via the edit form. Better
 * than leaving an orphan in Storage indefinitely.
 */
export async function scanStorageOrphansAction(): Promise<
  MediaActionResult<ScanResult>
> {
  const session = await requireAdminSession();

  // 1. List everything in the bucket.
  const allStorageFiles = await listAllStorageFiles();
  const totalInStorage = allStorageFiles.length;

  // 2. Subtract files we already have rows for.
  const knownPaths = await getAllKnownStoragePaths();
  const orphans = allStorageFiles.filter((f) => !knownPaths.has(f.path));

  // 3. Process up to SCAN_BATCH_LIMIT of them.
  const batch = orphans.slice(0, SCAN_BATCH_LIMIT);
  let tagged = 0;
  let taggingFailed = 0;
  const errors: string[] = [];

  for (const file of batch) {
    try {
      // Skip non-image files defensively (someone might have dropped a
      // PDF into the bucket by accident).
      if (file.mimeType && !file.mimeType.startsWith("image/")) {
        errors.push(`${file.path}: skipped non-image (${file.mimeType})`);
        continue;
      }

      const publicUrl = publicUrlForPath(file.path);
      let suggestions: MediaTagSuggestions | null = null;
      let aiTagging: {
        model: string;
        inputTokens: number;
        outputTokens: number;
      } | null = null;

      try {
        const result = await suggestMediaTags({ imageUrl: publicUrl });
        suggestions = result.suggestions;
        aiTagging = {
          model: result.model,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
        };
        tagged += 1;
      } catch (err) {
        taggingFailed += 1;
        errors.push(
          `${file.path}: vision tagging failed — ${err instanceof Error ? err.message : "unknown"}`
        );
        // Continue — we'll still create the row below with empty tags.
      }

      // Create the row whether or not Vision succeeded. An empty-tags
      // row is better than an orphan: the file shows up in the library
      // and the SMM can fill the form manually.
      const created = await createMedia({
        storagePath: file.path,
        caption: suggestions?.caption ?? null,
        tags: suggestions?.tags ?? [],
        campaignSlugs: suggestions?.campaign_slugs ?? [],
        countryIso: suggestions?.country_iso ?? null,
        eventTypes: suggestions?.event_types ?? [],
        tone: suggestions?.tone ?? null,
        useCases: suggestions?.use_cases ?? [],
        peopleVisible: suggestions?.people_visible ?? false,
        identifiableMinors: suggestions?.identifiable_minors ?? false,
        uploadedByEmail: session.email,
        bytes: file.size > 0 ? file.size : null,
        mimeType: file.mimeType,
        aiTagged: aiTagging ?? undefined,
      });

      if (!created) {
        errors.push(`${file.path}: row creation failed`);
      }
    } catch (err) {
      errors.push(
        `${file.path}: unexpected error — ${err instanceof Error ? err.message : "unknown"}`
      );
    }
  }

  await logAdminAction({
    action: "media_storage_scan",
    userEmail: session.email,
    metadata: {
      totalInStorage,
      alreadyInLibrary: knownPaths.size,
      orphansFound: orphans.length,
      orphansProcessed: batch.length,
      tagged,
      taggingFailed,
    },
  });

  revalidatePath("/admin/social/media-library");

  return {
    ok: true,
    data: {
      totalInStorage,
      alreadyInLibrary: knownPaths.size,
      orphansFound: orphans.length,
      orphansProcessed: batch.length,
      tagged,
      taggingFailed,
      errors: errors.slice(0, 10), // truncate so the JSON response stays compact
      moreToProcess: orphans.length > batch.length,
    },
  };
}

/* ─── Helpers ────────────────────────────────────────────────────── */

function extensionFor(mime: string): string {
  switch (mime) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    default:
      return "";
  }
}
