import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { logAdminAction } from "@/lib/admin-audit";
import { aiFillFromImage } from "@/lib/bazaar-ai-fill";

export const dynamic = "force-dynamic";
// gpt-4o vision typically responds in ~3-6 s; allow headroom for
// model retries / image fetch latency.
export const maxDuration = 30;

/**
 * POST /api/admin/bazaar/catalog/analyze-image
 *
 * Accepts EITHER:
 *   - JSON body { imageUrl: string }    — preferred when the
 *     image is already in Supabase Storage (saves a round-trip,
 *     OpenAI's CDN fetches it directly).
 *   - multipart/form-data with "image"  — for inline analysis
 *     before / without persisting (e.g. while the upload is
 *     in flight).
 *
 * Returns { ok, fields: { name, tagline, description, category,
 * materials, careInstructions } } — the admin form prefills
 * those state slots for the user to review and edit.
 *
 * Errors surface as { ok: false, error } so the admin UI can
 * show a "couldn't analyze — fill the fields manually" warning
 * without blocking the upload (upload and analyze are
 * independent concerns).
 */

const MAX_INLINE_BYTES = 6 * 1024 * 1024;

export async function POST(request: Request) {
  const auth = requireAdminAuth(request);
  if (!auth.ok) return auth.response;

  const contentType = request.headers.get("content-type") ?? "";

  try {
    let result;
    if (contentType.startsWith("application/json")) {
      const body = (await request.json().catch(() => ({}))) as {
        imageUrl?: string;
      };
      if (!body.imageUrl || typeof body.imageUrl !== "string") {
        return NextResponse.json(
          { ok: false, error: "Missing imageUrl in JSON body." },
          { status: 400 }
        );
      }
      result = await aiFillFromImage({ imageUrl: body.imageUrl });
      await logAdminAction({
        action: "ai_analyze_bazaar_image",
        userEmail: auth.email,
        request,
        metadata: {
          mode: "url",
          imageUrl: body.imageUrl,
          inferredCategory: result.category,
        },
      });
    } else if (contentType.startsWith("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("image");
      if (!(file instanceof Blob)) {
        return NextResponse.json(
          { ok: false, error: "No image file received." },
          { status: 400 }
        );
      }
      if (file.size > MAX_INLINE_BYTES) {
        return NextResponse.json(
          {
            ok: false,
            error: `Image too large for inline analyze (${(file.size / 1024 / 1024).toFixed(1)} MB). Upload first, then call with imageUrl.`,
          },
          { status: 413 }
        );
      }
      const buf = Buffer.from(await file.arrayBuffer());
      result = await aiFillFromImage({
        imageBuffer: buf,
        imageContentType: file.type || "image/jpeg",
      });
      await logAdminAction({
        action: "ai_analyze_bazaar_image",
        userEmail: auth.email,
        request,
        metadata: {
          mode: "inline",
          bytes: buf.byteLength,
          inferredCategory: result.category,
        },
      });
    } else {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Send either JSON {imageUrl} or multipart/form-data with an image field.",
        },
        { status: 415 }
      );
    }

    return NextResponse.json({ ok: true, fields: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[analyze-image] failed:", err);
    return NextResponse.json(
      { ok: false, error: message },
      { status: 502 }
    );
  }
}
