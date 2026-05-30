/**
 * Server-side image processing for catalog uploads.
 *
 * Single entry point (processCatalogImage) that takes a raw
 * upload Buffer and returns a normalised WebP Buffer ready for
 * Supabase Storage.
 *
 * Pipeline, in order:
 *   1. Auto-rotate from EXIF — phone shots come in landscape with
 *      a rotation flag; without this they'd render sideways once
 *      the metadata is stripped.
 *   2. Resize to a max dimension. Default 2000 px on the long
 *      side. Preserves aspect ratio. Smaller images pass through
 *      unchanged (we don't upscale — that'd waste bytes and add
 *      no quality).
 *   3. Convert to WebP at quality 90. Near-lossless for typical
 *      product photography; ~30% smaller than equivalent JPEG.
 *      Next.js <Image> on the frontend then generates
 *      responsive variants on demand from this single WebP
 *      source — no need to pre-generate multiple sizes.
 *   4. Strip metadata. EXIF can contain GPS coordinates from a
 *      photographer's phone; stripping protects both the maker's
 *      privacy and the photographer's.
 *
 * Sharp is loaded dynamically so that route handlers that don't
 * touch this module don't pay the ~20 MB import cost on cold
 * start.
 */

const MAX_DIMENSION_PX_DEFAULT = 2000;
const WEBP_QUALITY = 90;

export interface ProcessedImage {
  buffer: Buffer;
  contentType: "image/webp";
  width: number;
  height: number;
  byteSize: number;
}

export interface ProcessOptions {
  /** Cap on the long side. Default 2000 px. */
  maxDimension?: number;
}

export async function processCatalogImage(
  input: Buffer,
  options: ProcessOptions = {}
): Promise<ProcessedImage> {
  // Dynamic import — see file-level comment.
  const sharpModule = await import("sharp");
  const sharp = sharpModule.default;

  const maxDim = options.maxDimension ?? MAX_DIMENSION_PX_DEFAULT;

  // Read the input first to learn its dimensions; we only resize
  // when the long side exceeds the cap. This avoids the (tiny but
  // real) quality cost of running the resize filter on already-
  // appropriately-sized images.
  const meta = await sharp(input).metadata();
  const needsResize =
    (meta.width ?? 0) > maxDim || (meta.height ?? 0) > maxDim;

  let pipeline = sharp(input).rotate(); // applies EXIF orientation

  if (needsResize) {
    pipeline = pipeline.resize({
      width: maxDim,
      height: maxDim,
      fit: "inside",
      withoutEnlargement: true,
    });
  }

  const { data, info } = await pipeline
    .webp({
      quality: WEBP_QUALITY,
      // effort 4 is the default — increasing further has
      // diminishing returns and burns CPU on the Vercel function.
      effort: 4,
    })
    .toBuffer({ resolveWithObject: true });

  return {
    buffer: data,
    contentType: "image/webp",
    width: info.width,
    height: info.height,
    byteSize: info.size,
  };
}

/**
 * Watermark an image with a confidentiality label, for sponsor downloads of
 * a child's photo. Composites a semi-transparent "Confidential · Deen Relief"
 * label across the bottom so the source is visible if the image is ever
 * re-shared — a deterrent against redistribution. Auto-rotates from EXIF and
 * strips metadata (incl. any GPS). Returns a JPEG buffer for broad
 * compatibility.
 */
export async function watermarkImage(
  input: Buffer,
  label = "Confidential · Deen Relief"
): Promise<{ buffer: Buffer; contentType: "image/jpeg" }> {
  const sharpModule = await import("sharp");
  const sharp = sharpModule.default;

  const base = sharp(input).rotate(); // EXIF orientation first
  const meta = await base.metadata();
  const width = meta.width ?? 1200;
  const height = meta.height ?? 800;

  // Scale the label to the image; clamp so it stays readable but not huge.
  const fontSize = Math.max(16, Math.min(48, Math.round(width * 0.032)));
  const padY = Math.round(fontSize * 0.7);
  const bandH = fontSize + padY * 2;

  const escaped = label.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="${height - bandH}" width="${width}" height="${bandH}" fill="rgba(0,0,0,0.42)" />
    <text x="${width - fontSize * 0.6}" y="${height - padY - fontSize * 0.18}"
      text-anchor="end" font-family="Helvetica, Arial, sans-serif" font-size="${fontSize}"
      font-weight="600" fill="rgba(255,255,255,0.92)" letter-spacing="1">${escaped}</text>
  </svg>`;

  const out = await base
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .jpeg({ quality: 88 })
    .toBuffer();

  return { buffer: out, contentType: "image/jpeg" };
}

/**
 * Cheap header sniff to confirm the upload looks like an image.
 * The browser sets Content-Type on multipart uploads but it's
 * untrusted; we double-check the magic bytes match one of the
 * formats Sharp can read. Cheaper than letting Sharp throw later.
 *
 * Returns the detected format string, or null for unrecognised.
 */
export function sniffImageFormat(
  buf: Buffer
): "jpeg" | "png" | "webp" | "avif" | "gif" | "heic" | null {
  if (buf.length < 12) return null;
  // JPEG: ff d8 ff
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
  // PNG: 89 50 4e 47 0d 0a 1a 0a
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  )
    return "png";
  // WebP: RIFF ???? WEBP
  if (
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP"
  )
    return "webp";
  // AVIF/HEIC are both ISO BMFF — major brand at byte 8-12
  const brand = buf.toString("ascii", 8, 12);
  if (brand === "avif" || brand === "avis") return "avif";
  if (brand === "heic" || brand === "heix" || brand === "mif1") return "heic";
  // GIF: GIF87a / GIF89a
  if (buf.toString("ascii", 0, 6).startsWith("GIF8")) return "gif";
  return null;
}
