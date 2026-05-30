import { NextResponse } from "next/server";
import { headers } from "next/headers";
import {
  createServerSupabase,
  getSponsorUser,
  sponsorNeedsMfaChallenge,
} from "@/lib/supabase-server";
import {
  downloadOrphanMediaBytes,
  createSignedDownloadUrl,
  logChildMediaAccess,
} from "@/lib/orphan-media";
import { watermarkImage } from "@/lib/image-processing";
import { clientIpFromRequest } from "@/lib/admin-audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Download one of a child's media items for personal keeping.
 *
 * SECURITY mirrors the view endpoint: identify the sponsor (401), block
 * un-stepped-up MFA sessions (403), then load the media row through the
 * sponsor's RLS-scoped client (404 if not linked). Every download is recorded
 * in the safeguarding access log.
 *
 * Photos are WATERMARKED ("Confidential · Deen Relief") server-side before
 * sending — a deterrent against re-sharing children's images. Videos can't be
 * watermarked on the fly, so they're delivered via a short-lived
 * download-disposition signed URL (still gated + logged).
 */
function extFromMime(mime: string): string {
  if (mime === "video/quicktime") return "mov";
  if (mime === "video/mp4") return "mp4";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ mediaId: string }> }
) {
  const { mediaId } = await params;

  const user = await getSponsorUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (await sponsorNeedsMfaChallenge()) {
    return NextResponse.json({ error: "Verification required." }, { status: 403 });
  }

  const supabase = await createServerSupabase();
  const { data: row } = await supabase
    .from("orphan_update_media")
    .select("id, orphan_id, kind, storage_path, mime_type")
    .eq("id", mediaId)
    .maybeSingle();
  if (!row) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const h = await headers();
  const fauxReq = new Request("http://server.local", {
    headers: {
      "user-agent": h.get("user-agent") ?? "",
      "x-forwarded-for": h.get("x-forwarded-for") ?? "",
    },
  });
  await logChildMediaAccess({
    sponsorId: user.id,
    orphanId: row.orphan_id as string,
    mediaId: row.id as string,
    action: "downloaded",
    ip: clientIpFromRequest(fauxReq),
    userAgent: h.get("user-agent"),
  });

  const shortId = (row.id as string).slice(0, 8);

  // ── Video: download-disposition signed URL (no watermark possible) ──
  if (row.kind === "video") {
    const filename = `deenrelief-video-${shortId}.${extFromMime(row.mime_type as string)}`;
    const url = await createSignedDownloadUrl(row.storage_path as string, filename);
    if (!url) return NextResponse.json({ error: "Couldn't prepare the download." }, { status: 500 });
    return NextResponse.redirect(url);
  }

  // ── Photo: watermark, then stream as an attachment ──
  const bytes = await downloadOrphanMediaBytes(row.storage_path as string);
  if (!bytes) return NextResponse.json({ error: "Couldn't prepare the download." }, { status: 500 });

  try {
    const { buffer, contentType } = await watermarkImage(bytes);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="deenrelief-photo-${shortId}.jpg"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[sponsor/media/download] watermark failed:", err);
    return NextResponse.json({ error: "Couldn't prepare the download." }, { status: 500 });
  }
}
