import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { requireSponsorshipAccess } from "@/lib/admin-session";
import { logAdminAction } from "@/lib/admin-audit";
import { buildOrphanMediaPath, uploadOrphanMedia } from "@/lib/orphan-media";
import { sniffImageFormat, processCatalogImage } from "@/lib/image-processing";
import {
  getOrphanById,
  getUpdateById,
  createUpdateMediaRow,
} from "@/lib/sponsorship-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Cheap check that a buffer is an ISO-BMFF video container (MP4/MOV). */
function looksLikeVideo(buf: Buffer): boolean {
  if (buf.length < 12) return false;
  const box = buf.toString("ascii", 4, 8);
  return ["ftyp", "moov", "mdat", "free", "skip", "wide"].includes(box);
}

/**
 * Upload a child photo/video to the PRIVATE orphan-media bucket and attach
 * it to an update.
 *
 * Auth: requireSponsorshipAccess (admin OR sponsorship coordinator). The
 * actual write uses the service-role Storage client.
 *
 * The bucket is private — there is no public URL. Sponsors fetch a
 * short-lived signed URL at view time via /api/sponsor/media/[mediaId].
 */

const ALLOWED_MIME_TYPES = new Set<string>([
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/quicktime",
]);

const MAX_UPLOAD_BYTES = 500 * 1024 * 1024; // 500 MB

export async function POST(req: Request) {
  const session = await requireSponsorshipAccess();

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Couldn't parse the upload." }, { status: 400 });
  }

  const file = formData.get("file");
  const updateId = String(formData.get("updateId") ?? "");
  const orphanId = String(formData.get("orphanId") ?? "");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file in upload." }, { status: 400 });
  }
  if (!updateId || !orphanId) {
    return NextResponse.json(
      { error: "Missing update or orphan reference." },
      { status: 400 }
    );
  }
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: `Type "${file.type || "unknown"}" isn't allowed. JPEG/PNG/WebP images and MP4/MOV videos only.` },
      { status: 415 }
    );
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "File is empty." }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `File is too large (${Math.round(file.size / 1_000_000)} MB). Maximum is 500 MB.` },
      { status: 413 }
    );
  }

  // Validate the references exist and are consistent — never trust the
  // client-supplied IDs blindly.
  const [orphan, update] = await Promise.all([
    getOrphanById(orphanId),
    getUpdateById(updateId),
  ]);
  if (!orphan || !update || update.orphanId !== orphanId) {
    return NextResponse.json(
      { error: "That update doesn't belong to that child." },
      { status: 400 }
    );
  }

  // Validate the actual bytes (don't trust the client MIME). Images are
  // re-encoded to strip EXIF/GPS — children's photos must not carry location
  // at rest. Videos are confirmed to be a real container, then stored as-is.
  const inputBuf = Buffer.from(await file.arrayBuffer());
  const isImage = file.type.startsWith("image/");
  let uploadBuf: Buffer;
  let uploadType: string;
  let storageName: string;
  let kind: "photo" | "video";

  if (isImage) {
    if (!sniffImageFormat(inputBuf)) {
      return NextResponse.json(
        { error: "That file doesn't look like a real image." },
        { status: 415 }
      );
    }
    try {
      const processed = await processCatalogImage(inputBuf);
      uploadBuf = processed.buffer;
      uploadType = processed.contentType;
    } catch {
      return NextResponse.json({ error: "Couldn't process that image." }, { status: 502 });
    }
    storageName = "photo.webp";
    kind = "photo";
  } else {
    if (!looksLikeVideo(inputBuf)) {
      return NextResponse.json(
        { error: "That file doesn't look like a real video." },
        { status: 415 }
      );
    }
    uploadBuf = inputBuf;
    uploadType = file.type;
    storageName = file.name;
    kind = "video";
  }

  const storagePath = buildOrphanMediaPath(orphanId, storageName);
  try {
    await uploadOrphanMedia(storagePath, uploadBuf, uploadType);
  } catch (err) {
    const raw = err instanceof Error ? err.message : "Storage upload failed.";
    const lower = raw.toLowerCase();
    const friendly =
      lower.includes("bucket not found") || lower.includes("bucket_not_found")
        ? "Storage bucket `orphan-media` doesn't exist yet. Run migration 031 on Supabase, then try again."
        : lower.includes("exceeded") || lower.includes("payload too large")
        ? `File is too big for this Supabase plan tier (${Math.round(file.size / 1_000_000)} MB).`
        : `Couldn't upload: ${raw}.`;
    return NextResponse.json({ error: friendly }, { status: 502 });
  }

  const created = await createUpdateMediaRow({
    updateId,
    orphanId,
    kind,
    storagePath,
    mimeType: uploadType,
    sizeBytes: uploadBuf.length,
  });
  if ("error" in created) {
    return NextResponse.json(
      { error: "Upload succeeded but the record write failed." },
      { status: 500 }
    );
  }

  const h = await headers();
  const fauxRequest = new Request("http://api-route.local", {
    headers: {
      "user-agent": h.get("user-agent") ?? "",
      "x-forwarded-for": h.get("x-forwarded-for") ?? "",
    },
  });
  await logAdminAction({
    action: "orphan_media_uploaded",
    userEmail: session.email,
    targetId: created.id,
    request: fauxRequest,
    metadata: { orphanId, updateId, mimeType: uploadType, sizeBytes: uploadBuf.length },
  });

  // Return the new media row in the shape the client maps over.
  return NextResponse.json({
    media: {
      id: created.id,
      updateId,
      orphanId,
      kind,
      storagePath,
      mimeType: uploadType,
      sizeBytes: uploadBuf.length,
      caption: null,
      sortOrder: 0,
      createdAt: new Date().toISOString(),
    },
  });
}
