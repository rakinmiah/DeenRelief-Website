import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { requireAdminAuth } from "@/lib/admin-auth";
import { logAdminAction } from "@/lib/admin-audit";
import { getSupabaseAdmin } from "@/lib/supabase";
import {
  processCatalogImage,
  sniffImageFormat,
} from "@/lib/image-processing";

export const dynamic = "force-dynamic";
// Generous timeout — Sharp resize + WebP encode on a 2000px image
// takes a couple of seconds on a cold Vercel function.
export const maxDuration = 30;

/**
 * POST /api/admin/bazaar/catalog/upload-image
 *
 * Accepts a multipart upload with an "image" field and an
 * optional "folder" field ("products" | "makers" — defaults to
 * "products"). Runs the image through Sharp (auto-rotate,
 * resize to max 2000px, convert to WebP q=90, strip metadata)
 * and uploads to Supabase Storage at:
 *
 *   bazaar-products/<folder>/<uuid>.webp
 *
 * Returns { url, width, height, byteSize }. The admin form
 * stores the URL in primary_image / gallery_images / photo_url.
 *
 * Body size: relies on Vercel's default 4.5 MB serverless limit.
 * The client component compresses oversized files before upload
 * where it can (canvas downscale at the browser); for the rare
 * case where it can't, the error message tells the admin to
 * pre-shrink.
 */

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB hard cap inside the route
const ALLOWED_FOLDERS = new Set(["products", "makers"]);
const BUCKET = "bazaar-products";

export async function POST(request: Request) {
  const auth = requireAdminAuth(request);
  if (!auth.ok) return auth.response;

  // Log the Content-Type and length up front — the most common
  // cause of formData() throwing is a request that arrived
  // without the proper multipart boundary (broken proxy, dev-
  // server quirk) or one that's larger than the platform's body
  // limit (Vercel serverless = 4.5 MB).
  const incomingCT = request.headers.get("content-type") ?? "(missing)";
  const incomingCL = request.headers.get("content-length") ?? "(unknown)";
  console.log(
    `[upload-image] incoming — content-type: ${incomingCT}, content-length: ${incomingCL}`
  );

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[upload-image] formData parse failed:", err);
    // Surface the underlying error so the admin knows whether it's
    // a size issue ("body exceeded ...") vs a malformed request.
    return NextResponse.json(
      {
        error: `Could not parse upload (${message}). If the file is over ~4 MB, try a smaller version — production caps multipart bodies at 4.5 MB. Otherwise the file may be corrupt.`,
      },
      { status: 400 }
    );
  }

  const file = formData.get("image");
  const folderRaw = String(formData.get("folder") ?? "products");
  const folder = ALLOWED_FOLDERS.has(folderRaw) ? folderRaw : "products";

  if (!(file instanceof Blob)) {
    return NextResponse.json(
      { error: "No image file received." },
      { status: 400 }
    );
  }
  if (file.size === 0) {
    return NextResponse.json(
      { error: "Image file is empty." },
      { status: 400 }
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      {
        error: `Image too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max ${MAX_BYTES / 1024 / 1024} MB.`,
      },
      { status: 413 }
    );
  }

  const rawBuffer = Buffer.from(await file.arrayBuffer());
  const format = sniffImageFormat(rawBuffer);
  if (!format) {
    return NextResponse.json(
      {
        error:
          "Unrecognised image format. Upload a JPEG, PNG, WebP, AVIF, or HEIC.",
      },
      { status: 415 }
    );
  }

  // Sharp pipeline. Throws on corrupt input — surface as 400 so
  // the admin re-uploads rather than retrying the same bad file.
  let processed;
  try {
    processed = await processCatalogImage(rawBuffer);
  } catch (err) {
    console.error("[upload-image] Sharp processing failed:", err);
    return NextResponse.json(
      { error: "Could not process the image. Try a different file." },
      { status: 400 }
    );
  }

  // Upload to Supabase Storage. Object key: <folder>/<uuid>.webp
  // so collisions are essentially impossible and we can serve the
  // public URL straight from Supabase's CDN.
  const supabase = getSupabaseAdmin();
  const objectKey = `${folder}/${randomUUID()}.webp`;
  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(objectKey, processed.buffer, {
      contentType: processed.contentType,
      // Cache for a year — the file is content-addressed by UUID,
      // so we'll only ever write each key once.
      cacheControl: "public, max-age=31536000, immutable",
      upsert: false,
    });
  if (uploadErr) {
    console.error("[upload-image] Supabase Storage upload failed:", uploadErr);
    return NextResponse.json(
      { error: `Storage upload failed: ${uploadErr.message}` },
      { status: 502 }
    );
  }

  const { data: publicData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(objectKey);
  const publicUrl = publicData.publicUrl;

  await logAdminAction({
    action: "upload_bazaar_image",
    userEmail: auth.email,
    request,
    metadata: {
      folder,
      objectKey,
      originalFormat: format,
      originalBytes: rawBuffer.byteLength,
      processedBytes: processed.byteSize,
      width: processed.width,
      height: processed.height,
    },
  });

  return NextResponse.json({
    ok: true,
    url: publicUrl,
    width: processed.width,
    height: processed.height,
    byteSize: processed.byteSize,
  });
}
