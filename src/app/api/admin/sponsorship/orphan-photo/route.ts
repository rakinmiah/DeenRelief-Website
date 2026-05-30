import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { requireSponsorshipAccess } from "@/lib/admin-session";
import { logAdminAction } from "@/lib/admin-audit";
import {
  buildOrphanMediaPath,
  uploadOrphanMedia,
  deleteOrphanMedia,
  createSignedOrphanMediaUrl,
} from "@/lib/orphan-media";
import { getOrphanById, setOrphanProfilePhoto } from "@/lib/sponsorship-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Set a child's PROFILE photo (the hero image on the sponsor portal).
 * Uploads to the private orphan-media bucket and points
 * orphans.profile_photo_path at it. Images only. Replaces (and deletes) any
 * previous profile photo. Returns a fresh signed URL so the admin editor can
 * preview it immediately.
 */
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

export async function POST(req: Request) {
  const session = await requireSponsorshipAccess();

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Couldn't parse the upload." }, { status: 400 });
  }

  const file = formData.get("file");
  const orphanId = String(formData.get("orphanId") ?? "");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file in upload." }, { status: 400 });
  }
  if (!orphanId) {
    return NextResponse.json({ error: "Missing child reference." }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json(
      { error: `Type "${file.type || "unknown"}" isn't allowed. JPEG, PNG, or WebP only.` },
      { status: 415 }
    );
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "File is empty." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `Image is too large (${Math.round(file.size / 1_000_000)} MB). Max 25 MB.` },
      { status: 413 }
    );
  }

  const orphan = await getOrphanById(orphanId);
  if (!orphan) {
    return NextResponse.json({ error: "Child not found." }, { status: 404 });
  }

  const storagePath = buildOrphanMediaPath(orphanId, `profile-${file.name}`);
  try {
    await uploadOrphanMedia(storagePath, file, file.type);
  } catch (err) {
    const raw = err instanceof Error ? err.message : "Storage upload failed.";
    const friendly = raw.toLowerCase().includes("bucket not found")
      ? "Storage bucket `orphan-media` doesn't exist yet. Run migration 031, then try again."
      : `Couldn't upload: ${raw}.`;
    return NextResponse.json({ error: friendly }, { status: 502 });
  }

  const previous = orphan.profilePhotoPath;
  const set = await setOrphanProfilePhoto(orphanId, storagePath);
  if (!set.ok) {
    return NextResponse.json(
      { error: "Uploaded, but couldn't save it to the profile." },
      { status: 500 }
    );
  }
  // Best-effort cleanup of the old photo.
  if (previous && previous !== storagePath) await deleteOrphanMedia(previous);

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
    targetId: orphanId,
    request: fauxRequest,
    metadata: { kind: "profile_photo", mimeType: file.type, sizeBytes: file.size },
  });

  const url = await createSignedOrphanMediaUrl(storagePath);
  return NextResponse.json({ ok: true, url });
}
