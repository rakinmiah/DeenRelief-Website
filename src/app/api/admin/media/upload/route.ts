import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { requireAdminSession } from "@/lib/admin-session";
import { logAdminAction } from "@/lib/admin-audit";
import {
  buildStoragePath,
  createMediaRow,
  uploadMediaBinary,
} from "@/lib/dr-media";

export const runtime = "nodejs";
// Disable the default body parsing — we read the multipart stream
// ourselves via request.formData() so large file uploads don't get
// buffered into a 4 MB body limit.
export const dynamic = "force-dynamic";

/**
 * Allow-list of mime types we'll accept on upload. Mirrors the
 * Storage bucket's allowed_mime_types from migration 017 — the
 * bucket is the ultimate gate, but rejecting early here gives the
 * trustee a faster error response and avoids burning bandwidth.
 */
const ALLOWED_MIME_TYPES = new Set<string>([
  // Images
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
  // Videos
  "video/mp4",
  "video/webm",
  "video/quicktime",
  // Documents
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
]);

/**
 * Soft cap enforced server-side. Hard cap is set per-plan by
 * Supabase Storage itself (50 MB on free, 5 GB on Pro). This
 * value is just for early-rejection of obviously-too-big
 * uploads — actual Storage error fallback is below.
 */
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB

/**
 * Single-file upload to the media library.
 *
 * Accepts multipart/form-data with a `file` field. Returns the
 * new media row (id + public URL) so the client can immediately
 * render the uploaded asset.
 *
 * Auth: requireAdminSession at entry. Service-role Storage client
 * does the actual write (bypasses RLS).
 *
 * Audit: every successful upload writes an upload_media row to
 * admin_audit_log with filename / size / mime / id.
 */
export async function POST(req: Request) {
  const session = await requireAdminSession();

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch (err) {
    console.error("[media/upload] formData parse failed:", err);
    return NextResponse.json(
      { error: "Couldn't parse the upload." },
      { status: 400 }
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "No file in upload." },
      { status: 400 }
    );
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return NextResponse.json(
      {
        error: `Type "${file.type || "unknown"}" isn't allowed. Images, videos, PDFs, and Office docs are accepted.`,
      },
      { status: 415 }
    );
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      {
        error: `File is too large (${Math.round(file.size / 1_000_000)} MB). Maximum is 5 GB.`,
      },
      { status: 413 }
    );
  }

  if (file.size === 0) {
    return NextResponse.json(
      { error: "File is empty." },
      { status: 400 }
    );
  }

  // Build a unique storage path + try the upload. Most likely
  // failure modes: Supabase per-plan size limit (e.g. 50 MB on
  // free, regardless of our MAX_UPLOAD_BYTES). Surface the raw
  // error so the trustee can see "Payload too large" vs. some
  // other reason.
  const storagePath = buildStoragePath(file.name);
  try {
    await uploadMediaBinary(storagePath, file, file.type);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Storage upload failed.";
    console.error("[media/upload] storage upload failed:", err);
    return NextResponse.json(
      {
        error: `Couldn't upload: ${message}. Check the file size — Supabase free tier caps uploads at 50 MB per file.`,
      },
      { status: 502 }
    );
  }

  const created = await createMediaRow({
    filename: file.name,
    storagePath,
    mimeType: file.type,
    sizeBytes: file.size,
    uploadedByEmail: session.email,
  });

  if (!created) {
    // The binary went up but the metadata write failed — log
    // loudly but don't try to delete the orphan, an admin can
    // clean it up via the Storage UI if needed.
    return NextResponse.json(
      {
        error:
          "Upload succeeded but metadata write failed. The file may exist in Storage but won't show in the library.",
      },
      { status: 500 }
    );
  }

  // Audit the upload after the row is committed.
  const h = await headers();
  const fauxRequest = new Request("http://api-route.local", {
    headers: {
      "user-agent": h.get("user-agent") ?? "",
      "x-forwarded-for": h.get("x-forwarded-for") ?? "",
    },
  });
  await logAdminAction({
    action: "upload_media",
    userEmail: session.email,
    targetId: created.id,
    request: fauxRequest,
    metadata: {
      filename: created.filename,
      mimeType: created.mimeType,
      sizeBytes: created.sizeBytes,
    },
  });

  return NextResponse.json({ media: created });
}
