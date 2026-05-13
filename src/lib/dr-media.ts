/**
 * Data layer for the Deen Relief admin media library.
 *
 * Two-part architecture:
 *   - Binaries → Supabase Storage bucket `dr-media` (public read)
 *   - Metadata → `dr_media` table in Postgres
 *
 * Public URLs are stable and embed-anywhere — they're not signed.
 * The trustee can paste them into social posts, partner emails,
 * volunteer newsletters, etc. without us needing to mint a token
 * each time.
 */

import { getSupabaseAdmin } from "@/lib/supabase";

export const DR_MEDIA_BUCKET = "dr-media";

export type MediaKind = "image" | "video" | "document" | "other";

export interface DrMediaRow {
  id: string;
  createdAt: string;
  filename: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  uploadedByEmail: string;
  description: string | null;
  tags: string[];
  /** Resolved public URL — computed at fetch time so a bucket
   *  rename or CDN swap doesn't require a data migration. */
  publicUrl: string;
}

// ─────────────────────────────────────────────────────────────────
// Type classification
// ─────────────────────────────────────────────────────────────────

/**
 * Classify mime type into a UI-relevant kind. The grid renders
 * thumbnails for images, a video icon for videos, a doc icon for
 * everything else. Keep in sync with the bucket's
 * allowed_mime_types from migration 017.
 */
export function mediaKindFromMimeType(mime: string): MediaKind {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (
    mime === "application/pdf" ||
    mime === "application/msword" ||
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mime === "application/vnd.ms-excel" ||
    mime === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mime === "text/plain"
  )
    return "document";
  return "other";
}

// ─────────────────────────────────────────────────────────────────
// Storage path helpers
// ─────────────────────────────────────────────────────────────────

/**
 * Build a deterministic storage path for a new upload. Format:
 *   {yyyy}/{mm}/{uuid}-{slug}.{ext}
 *
 * The yyyy/mm prefix groups uploads by month so the bucket's
 * Storage UI stays browseable. The uuid prefix prevents
 * collisions when two trustees upload "photo.jpg" the same day.
 */
export function buildStoragePath(filename: string): string {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const uuid = crypto.randomUUID();
  const slug = slugifyFilename(filename);
  return `${yyyy}/${mm}/${uuid}-${slug}`;
}

function slugifyFilename(filename: string): string {
  // Normalise → strip non-ascii → replace whitespace+special with
  // hyphens → collapse runs of hyphens → trim. Preserves extension.
  const lastDot = filename.lastIndexOf(".");
  const base = lastDot > 0 ? filename.slice(0, lastDot) : filename;
  const ext = lastDot > 0 ? filename.slice(lastDot) : "";
  const cleanBase = base
    .normalize("NFKD")
    .replace(/[^\w\s.-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 80);
  const cleanExt = ext
    .toLowerCase()
    .replace(/[^a-z0-9.]/g, "");
  return `${cleanBase || "file"}${cleanExt}`;
}

// ─────────────────────────────────────────────────────────────────
// Public URL resolution
// ─────────────────────────────────────────────────────────────────

/**
 * Resolve a stored object's path into its public URL via the
 * service-role client. Cheap — no network call, just URL synthesis.
 */
export function getMediaPublicUrl(storagePath: string): string {
  const supabase = getSupabaseAdmin();
  const { data } = supabase.storage
    .from(DR_MEDIA_BUCKET)
    .getPublicUrl(storagePath);
  return data.publicUrl;
}

// ─────────────────────────────────────────────────────────────────
// Storage operations
// ─────────────────────────────────────────────────────────────────

/**
 * Upload a binary to Storage. The caller (the API route) is
 * responsible for streaming the body — we just hand it off.
 * Returns the storage path on success or throws on failure.
 */
export async function uploadMediaBinary(
  storagePath: string,
  body: ArrayBuffer | Blob | File,
  mimeType: string
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.storage
    .from(DR_MEDIA_BUCKET)
    .upload(storagePath, body, {
      contentType: mimeType,
      upsert: false,
    });
  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }
}

/**
 * Remove a file from Storage. Called by deleteMediaWithFile after
 * the row is removed. Failure here is logged but doesn't surface
 * — orphan objects in Storage are harmless and a future cleanup
 * job can sweep them.
 */
export async function deleteMediaBinary(
  storagePath: string
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.storage
    .from(DR_MEDIA_BUCKET)
    .remove([storagePath]);
  if (error) {
    console.error("[dr-media] storage remove failed:", error);
  }
}

// ─────────────────────────────────────────────────────────────────
// Metadata table operations
// ─────────────────────────────────────────────────────────────────

export interface CreateMediaRowInput {
  filename: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  uploadedByEmail: string;
  description?: string | null;
  tags?: string[];
}

export async function createMediaRow(
  input: CreateMediaRowInput
): Promise<DrMediaRow | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("dr_media")
    .insert({
      filename: input.filename,
      storage_path: input.storagePath,
      mime_type: input.mimeType,
      size_bytes: input.sizeBytes,
      uploaded_by_email: input.uploadedByEmail,
      description: input.description ?? null,
      tags: input.tags ?? [],
    })
    .select(
      "id, created_at, filename, storage_path, mime_type, size_bytes, uploaded_by_email, description, tags"
    )
    .single();
  if (error || !data) {
    console.error("[dr-media] createMediaRow failed:", error);
    return null;
  }
  return mapRow(data);
}

export interface FetchMediaOptions {
  /** Filter by classified kind. Omit for all. */
  kind?: MediaKind;
  /** Filter by tag (single tag match). Omit for all. */
  tag?: string;
  /** Free-text match against filename (case-insensitive contains). */
  search?: string;
  /** Soft cap on rows returned. Default 200. */
  limit?: number;
}

export async function fetchMediaList(
  opts: FetchMediaOptions = {}
): Promise<DrMediaRow[]> {
  const supabase = getSupabaseAdmin();
  let q = supabase
    .from("dr_media")
    .select(
      "id, created_at, filename, storage_path, mime_type, size_bytes, uploaded_by_email, description, tags"
    )
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 200);

  // Kind filter uses mime_type prefix — simpler than maintaining
  // a separate enum column.
  if (opts.kind === "image") q = q.like("mime_type", "image/%");
  else if (opts.kind === "video") q = q.like("mime_type", "video/%");
  else if (opts.kind === "document") {
    q = q.not("mime_type", "like", "image/%").not("mime_type", "like", "video/%");
  }

  if (opts.tag) {
    q = q.contains("tags", [opts.tag]);
  }

  if (opts.search) {
    q = q.ilike("filename", `%${opts.search}%`);
  }

  const { data, error } = await q;
  if (error) {
    console.error("[dr-media] fetchMediaList failed:", error);
    return [];
  }
  return (data ?? []).map(mapRow);
}

export async function fetchMediaById(
  id: string
): Promise<DrMediaRow | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("dr_media")
    .select(
      "id, created_at, filename, storage_path, mime_type, size_bytes, uploaded_by_email, description, tags"
    )
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("[dr-media] fetchMediaById failed:", error);
    return null;
  }
  return data ? mapRow(data) : null;
}

export interface UpdateMediaMetadataInput {
  description?: string | null;
  tags?: string[];
}

export async function updateMediaMetadata(
  id: string,
  input: UpdateMediaMetadataInput
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const update: Record<string, unknown> = {};
  if (input.description !== undefined) update.description = input.description;
  if (input.tags !== undefined) update.tags = input.tags;
  const { error } = await supabase
    .from("dr_media")
    .update(update)
    .eq("id", id);
  if (error) {
    throw new Error(`updateMediaMetadata failed: ${error.message}`);
  }
}

/**
 * Delete the metadata row AND its underlying Storage object. Row
 * first (DB is authoritative); binary deletion best-effort
 * (failure leaves an orphan object — harmless).
 */
export async function deleteMediaWithFile(id: string): Promise<DrMediaRow> {
  const media = await fetchMediaById(id);
  if (!media) throw new Error(`deleteMediaWithFile: ${id} not found`);

  const supabase = getSupabaseAdmin();
  const { error: rowError } = await supabase
    .from("dr_media")
    .delete()
    .eq("id", id);
  if (rowError) {
    throw new Error(`deleteMediaWithFile row delete failed: ${rowError.message}`);
  }

  await deleteMediaBinary(media.storagePath);
  return media;
}

/**
 * Fetch the distinct tags currently in use, sorted alphabetically.
 * Powers the tag filter chips on the list page.
 */
export async function fetchAllMediaTags(): Promise<string[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("dr_media")
    .select("tags");
  if (error) {
    console.error("[dr-media] fetchAllMediaTags failed:", error);
    return [];
  }
  const tagSet = new Set<string>();
  for (const row of data ?? []) {
    const tags = (row as { tags: string[] | null }).tags;
    if (tags) for (const tag of tags) tagSet.add(tag);
  }
  return Array.from(tagSet).sort();
}

// ─────────────────────────────────────────────────────────────────
// Row mapper
// ─────────────────────────────────────────────────────────────────

interface RawRow {
  id: string;
  created_at: string;
  filename: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  uploaded_by_email: string;
  description: string | null;
  tags: string[] | null;
}

function mapRow(r: RawRow): DrMediaRow {
  return {
    id: r.id,
    createdAt: r.created_at,
    filename: r.filename,
    storagePath: r.storage_path,
    mimeType: r.mime_type,
    sizeBytes: r.size_bytes,
    uploadedByEmail: r.uploaded_by_email,
    description: r.description,
    tags: r.tags ?? [],
    publicUrl: getMediaPublicUrl(r.storage_path),
  };
}

// ─────────────────────────────────────────────────────────────────
// Display helpers
// ─────────────────────────────────────────────────────────────────

/**
 * Pretty file-size formatter. Used in the grid + detail UI.
 * KB / MB / GB with one decimal. We don't bother with kibi-bytes
 * (1024) — the UI says "MB" so users expect base-1000.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1000) return `${bytes} B`;
  if (bytes < 1_000_000) return `${(bytes / 1000).toFixed(0)} KB`;
  if (bytes < 1_000_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  return `${(bytes / 1_000_000_000).toFixed(2)} GB`;
}
