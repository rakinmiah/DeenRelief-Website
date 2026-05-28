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
 */
export async function uploadMediaAction(
  input: UploadMediaInput
): Promise<MediaActionResult<UploadMediaResult>> {
  const session = await requireAdminSession();

  if (!ALLOWED_MIME.has(input.mimeType)) {
    return { ok: false, error: "Only JPEG, PNG, or WebP images are supported." };
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
