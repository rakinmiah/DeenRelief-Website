import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-session";
import {
  downloadMediaBinary,
  fetchMediaById,
  mediaKindFromMimeType,
} from "@/lib/dr-media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Force-download a media file through the server, optionally
 * re-encoded + resized via Sharp.
 *
 * Why a server route at all? Supabase Storage public URLs serve the
 * binary with `Content-Disposition: inline`, so clicking a regular
 * <a href> just opens the image in a new tab. We need to set
 * `attachment; filename="..."` ourselves to trigger a real download.
 *
 * Query params (images only):
 *   - format: "original" | "webp" | "jpeg" | "png" | "avif"
 *   - width:  integer px (long-side cap, applied as `fit: inside`)
 *
 * If either param is provided AND the file is an image, we run the
 * bytes through a Sharp pipeline and re-encode. Otherwise we stream
 * the original Storage object straight through.
 *
 * Videos / PDFs / Office docs always come back as their original
 * binary — re-encoding a video server-side would be a multi-minute
 * ffmpeg job and not in scope for the library.
 *
 * Auth: requireAdminSession at entry. The actual Storage fetch is
 * via service-role (bypasses RLS).
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  await requireAdminSession();

  const { id } = await ctx.params;
  const media = await fetchMediaById(id);
  if (!media) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const url = new URL(req.url);
  const formatParam = url.searchParams.get("format");
  const widthParam = url.searchParams.get("width");

  const kind = mediaKindFromMimeType(media.mimeType);
  const wantsTransform =
    kind === "image" &&
    ((formatParam && formatParam !== "original") ||
      (widthParam && widthParam !== "original"));

  // ─── Original passthrough ────────────────────────────────────
  // Pull binary, attach as filename. The browser then downloads
  // rather than opens-in-tab, regardless of mime type.
  if (!wantsTransform) {
    let buffer: ArrayBuffer;
    try {
      buffer = await downloadMediaBinary(media.storagePath);
    } catch (err) {
      console.error("[media/download] storage fetch failed:", err);
      return NextResponse.json(
        { error: "Couldn't fetch the file from storage." },
        { status: 502 }
      );
    }

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "content-type": media.mimeType,
        "content-disposition": `attachment; filename="${asciiFilename(media.filename)}"`,
        "content-length": String(buffer.byteLength),
        // Browser cache off — re-downloading should always re-fetch
        // (the trustee may have edited the original).
        "cache-control": "no-store",
      },
    });
  }

  // ─── Sharp pipeline (images only) ────────────────────────────
  // We re-encode + optionally resize. Sharp is dynamically imported
  // so the rest of the admin routes don't pay the ~20 MB cold-start
  // cost.
  let inputBuffer: ArrayBuffer;
  try {
    inputBuffer = await downloadMediaBinary(media.storagePath);
  } catch (err) {
    console.error("[media/download] storage fetch failed:", err);
    return NextResponse.json(
      { error: "Couldn't fetch the file from storage." },
      { status: 502 }
    );
  }

  const sharpModule = await import("sharp");
  const sharp = sharpModule.default;

  let pipeline = sharp(Buffer.from(inputBuffer)).rotate(); // applies EXIF

  const width = parseWidth(widthParam);
  if (width) {
    pipeline = pipeline.resize({
      width,
      height: width,
      fit: "inside",
      withoutEnlargement: true,
    });
  }

  let outMime: string;
  let outExt: string;
  switch (formatParam) {
    case "webp":
      pipeline = pipeline.webp({ quality: 90 });
      outMime = "image/webp";
      outExt = "webp";
      break;
    case "jpeg":
      pipeline = pipeline.jpeg({ quality: 90, mozjpeg: true });
      outMime = "image/jpeg";
      outExt = "jpg";
      break;
    case "png":
      pipeline = pipeline.png({ compressionLevel: 9 });
      outMime = "image/png";
      outExt = "png";
      break;
    case "avif":
      pipeline = pipeline.avif({ quality: 70 });
      outMime = "image/avif";
      outExt = "avif";
      break;
    case "original":
    case null:
    default:
      // No format change requested but width was — keep the source
      // format. Sharp will infer from input when we don't call
      // an encoder explicitly; we read the metadata to set the
      // right Content-Type / extension.
      outMime = media.mimeType;
      outExt = extFromMime(media.mimeType) ?? "img";
      break;
  }

  let outBuffer: Buffer;
  try {
    outBuffer = await pipeline.toBuffer();
  } catch (err) {
    console.error("[media/download] sharp pipeline failed:", err);
    return NextResponse.json(
      { error: "Couldn't re-encode the image. Try a different format." },
      { status: 500 }
    );
  }

  const downloadFilename = buildDownloadFilename(
    media.filename,
    outExt,
    width
  );

  return new NextResponse(new Uint8Array(outBuffer), {
    status: 200,
    headers: {
      "content-type": outMime,
      "content-disposition": `attachment; filename="${asciiFilename(downloadFilename)}"`,
      "content-length": String(outBuffer.byteLength),
      "cache-control": "no-store",
    },
  });
}

// ─── Helpers ────────────────────────────────────────────────────

/**
 * Whitelist width values — anything from 64–6000 px. We don't want
 * a hostile client requesting `?width=999999999` and OOM-ing the
 * function.
 */
function parseWidth(raw: string | null): number | null {
  if (!raw || raw === "original") return null;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n)) return null;
  if (n < 64 || n > 6000) return null;
  return n;
}

/**
 * Build a download filename that reflects the chosen format + size.
 * Example: `sylhet-clinic.jpg` resized to 800 px and converted to
 * webp → `sylhet-clinic-800w.webp`.
 */
function buildDownloadFilename(
  original: string,
  ext: string,
  width: number | null
): string {
  const lastDot = original.lastIndexOf(".");
  const base = lastDot > 0 ? original.slice(0, lastDot) : original;
  const suffix = width ? `-${width}w` : "";
  return `${base}${suffix}.${ext}`;
}

/**
 * Sanitise a filename for the Content-Disposition header. RFC 5987
 * encoding for unicode is overkill here — admins upload roughly
 * ASCII names. We strip quotes and control chars to prevent header
 * injection, and replace non-ascii with `_` so curl + browsers
 * don't choke.
 */
function asciiFilename(name: string): string {
  return name.replace(/[\x00-\x1f"\\]/g, "_").replace(/[^\x20-\x7e]/g, "_");
}

function extFromMime(mime: string): string | null {
  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/avif":
      return "avif";
    case "image/gif":
      return "gif";
    case "video/mp4":
      return "mp4";
    case "video/webm":
      return "webm";
    case "video/quicktime":
      return "mov";
    case "application/pdf":
      return "pdf";
    case "application/msword":
      return "doc";
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return "docx";
    case "application/vnd.ms-excel":
      return "xls";
    case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      return "xlsx";
    case "text/plain":
      return "txt";
    default:
      return null;
  }
}
