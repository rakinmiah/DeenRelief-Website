import "server-only";

/**
 * Private-media data layer for the orphan sponsorship programme.
 *
 * Counterpart to src/lib/dr-media.ts, but for CHILDREN'S media — and so
 * the security posture is the opposite:
 *
 *   dr-media       → PUBLIC bucket, stable public URLs, embed anywhere.
 *   orphan-media   → PRIVATE bucket (migration 031), NO public URLs. Bytes
 *                    are reachable only through short-lived signed URLs
 *                    minted here, server-side, AFTER an RLS-backed
 *                    authorisation check has confirmed the requesting
 *                    sponsor is linked to that child.
 *
 * `server-only` makes a build fail loudly if this ever leaks into a client
 * bundle (it would expose the service-role client). All operations use the
 * service-role client (getSupabaseAdmin) — uploads, deletes, and signed-URL
 * minting all bypass RLS, which is why the CALLER must authorise first.
 */

import { getSupabaseAdmin } from "@/lib/supabase";

export const ORPHAN_MEDIA_BUCKET = "orphan-media";

/** Default signed-URL lifetime. Short so a leaked URL expires fast. */
export const DEFAULT_SIGNED_URL_TTL_SECONDS = (() => {
  const raw = Number(process.env.SPONSOR_MEDIA_SIGNED_URL_TTL_SECONDS);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 300; // 5 min
})();

export type OrphanMediaKind = "photo" | "video";

// ─────────────────────────────────────────────────────────────────
// Storage path helpers
// ─────────────────────────────────────────────────────────────────

/**
 * Deterministic, collision-resistant object key for a child-media upload:
 *   orphans/{orphanId}/{yyyy}/{mm}/{uuid}-{slug}
 *
 * Grouping by orphanId then year/month keeps the private bucket browseable
 * for safeguarding review and makes per-child purges straightforward.
 */
export function buildOrphanMediaPath(
  orphanId: string,
  filename: string
): string {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const uuid = crypto.randomUUID();
  return `orphans/${orphanId}/${yyyy}/${mm}/${uuid}-${slugifyFilename(filename)}`;
}

function slugifyFilename(filename: string): string {
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
  const cleanExt = ext.toLowerCase().replace(/[^a-z0-9.]/g, "");
  return `${cleanBase || "file"}${cleanExt}`;
}

export function orphanMediaKindFromMime(mime: string): OrphanMediaKind {
  return mime.startsWith("video/") ? "video" : "photo";
}

// ─────────────────────────────────────────────────────────────────
// Storage operations (service-role)
// ─────────────────────────────────────────────────────────────────

/** Upload a binary to the PRIVATE bucket. Throws on failure. */
export async function uploadOrphanMedia(
  storagePath: string,
  body: ArrayBuffer | Blob | File,
  mimeType: string
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.storage
    .from(ORPHAN_MEDIA_BUCKET)
    .upload(storagePath, body, { contentType: mimeType, upsert: false });
  if (error) {
    throw new Error(`Orphan media upload failed: ${error.message}`);
  }
}

/**
 * Mint a short-lived signed URL for a private object.
 *
 * SECURITY: this bypasses RLS (service-role). The caller MUST have already
 * confirmed the requesting sponsor is authorised to see this object — e.g.
 * by loading the orphan_update_media row through the sponsor's RLS-scoped
 * client first (see /api/sponsor/media/[mediaId]). Minting must happen
 * AFTER that check, never before.
 *
 * Returns null on failure rather than throwing — the route maps that to a
 * 404/500 without leaking detail.
 */
export async function createSignedOrphanMediaUrl(
  storagePath: string,
  ttlSeconds: number = DEFAULT_SIGNED_URL_TTL_SECONDS
): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage
    .from(ORPHAN_MEDIA_BUCKET)
    .createSignedUrl(storagePath, ttlSeconds);
  if (error || !data?.signedUrl) {
    console.error("[orphan-media] createSignedUrl failed:", error?.message);
    return null;
  }
  return data.signedUrl;
}

/**
 * Download the raw bytes of a private object (service-role). Used by the
 * sponsor download endpoint to watermark photos before sending them.
 */
export async function downloadOrphanMediaBytes(
  storagePath: string
): Promise<Buffer | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage
    .from(ORPHAN_MEDIA_BUCKET)
    .download(storagePath);
  if (error || !data) {
    console.error("[orphan-media] download failed:", error?.message);
    return null;
  }
  return Buffer.from(await data.arrayBuffer());
}

/**
 * Signed URL that forces a download (Content-Disposition: attachment) with the
 * given filename. Used for videos, which we can't watermark on the fly.
 */
export async function createSignedDownloadUrl(
  storagePath: string,
  filename: string,
  ttlSeconds: number = DEFAULT_SIGNED_URL_TTL_SECONDS
): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage
    .from(ORPHAN_MEDIA_BUCKET)
    .createSignedUrl(storagePath, ttlSeconds, { download: filename });
  if (error || !data?.signedUrl) {
    console.error("[orphan-media] createSignedDownloadUrl failed:", error?.message);
    return null;
  }
  return data.signedUrl;
}

/**
 * Remove an object from the private bucket. Best-effort: logs on failure
 * but doesn't throw (an orphaned object is harmless and sweepable).
 */
export async function deleteOrphanMedia(storagePath: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.storage
    .from(ORPHAN_MEDIA_BUCKET)
    .remove([storagePath]);
  if (error) {
    console.error("[orphan-media] storage remove failed:", error.message);
  }
}

// ─────────────────────────────────────────────────────────────────
// Safeguarding access log (service-role; sponsors cannot read/forge it)
// ─────────────────────────────────────────────────────────────────

/**
 * Record a sponsor's access to a child's profile or media. Fire-and-forget:
 * a logging failure must never block the sponsor's legitimate access, but we
 * keep this trail for safeguarding accountability (who saw which child's
 * media, when).
 */
export async function logChildMediaAccess(input: {
  sponsorId: string;
  orphanId: string;
  mediaId?: string | null;
  action: "view_profile" | "signed_url_issued" | "downloaded";
  ip?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    await supabase.from("child_media_access_log").insert({
      sponsor_id: input.sponsorId,
      orphan_id: input.orphanId,
      media_id: input.mediaId ?? null,
      action: input.action,
      ip: input.ip ?? null,
      user_agent: input.userAgent ?? null,
    });
  } catch (err) {
    console.error("[orphan-media] access log write failed:", err);
  }
}
