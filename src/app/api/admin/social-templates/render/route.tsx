/**
 * POST /api/admin/social-templates/render
 *
 * Renders a single template-based slide to PNG. The deck builder's
 * Compose page hits this endpoint on every slot change to drive the
 * live preview, and again at "Create post" time to produce final
 * exports.
 *
 * Body shape:
 *   {
 *     templateId: string,
 *     slotValues: { [slotId]: SlotValue },
 *     imageMediaIds: { [slotId]: "dr:<uuid>" | "ext:<uuid>" }
 *   }
 *
 * The endpoint:
 *   1. Looks up the template in the registry
 *   2. Resolves each image mediaId to a base64 data URI (DR library
 *      OR external imagery), fetched in parallel
 *   3. Loads brand logo data URIs (both variants)
 *   4. Loads the template font set
 *   5. Calls template.render() to get JSX
 *   6. Returns ImageResponse (PNG bytes, Cache-Control: no-store)
 *
 * No schema validation against a global packet — the contract is
 * just (templateId, slotValues). Validates only that required slots
 * have SOMETHING (returns a friendly 400 with the missing slot ids).
 */

import { ImageResponse } from "next/og";
import { requireAdminSession } from "@/lib/admin-session";
import { getLogoDataUri } from "@/lib/brand-assets";
import { getImageryById } from "@/lib/external-imagery";
import { getMediaById } from "@/lib/media-library";
import { loadTemplateFonts } from "@/lib/social-templates/fonts";
import { getTemplate } from "@/lib/social-templates/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Live preview needs to be quick. Cap at 30s — same image-fetch
// budget as the legacy slide route.
export const maxDuration = 30;

interface RenderBody {
  templateId?: string;
  slotValues?: Record<string, unknown>;
  imageMediaIds?: Record<string, string>;
}

export async function POST(request: Request) {
  // Auth runs OUTSIDE the try/catch. requireAdminSession() throws a
  // NEXT_REDIRECT control-flow signal for unauthenticated requests;
  // catching it here would turn a clean login-redirect into a 500
  // with a stack trace. Let it propagate to Next's redirect handler.
  await requireAdminSession();
  try {
    return await renderTemplate(request);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack ?? "" : "";
    console.error("[social-templates/render] failed:", msg, stack);
    return new Response(`Render failed.\n\n${msg}\n\n${stack}`, {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

async function renderTemplate(request: Request): Promise<Response> {
  let body: RenderBody;
  try {
    body = (await request.json()) as RenderBody;
  } catch {
    return new Response("Invalid JSON body.", { status: 400 });
  }

  if (!body.templateId) {
    return new Response("Missing templateId.", { status: 400 });
  }
  const template = getTemplate(body.templateId);
  if (!template) {
    return new Response(`Unknown templateId: ${body.templateId}`, {
      status: 404,
    });
  }

  const slotValues = body.slotValues ?? {};
  const imageMediaIds = body.imageMediaIds ?? {};

  // Friendly required-slot check. We don't enforce text shape rules
  // (hybrid model — SMM eyeballs fit) but missing required slots
  // would crash render(), better to return a 400 with detail.
  const missing = template.meta.slots
    .filter((s) => s.required)
    .filter((s) => {
      if (s.type.startsWith("image:")) {
        return !imageMediaIds[s.id];
      }
      const v = slotValues[s.id];
      if (!v || typeof v !== "object") return true;
      const obj = v as { type?: string };
      return !obj.type;
    })
    .map((s) => s.id);

  if (missing.length > 0) {
    return new Response(
      `Template "${template.meta.id}" is missing required slot(s): ${missing.join(
        ", "
      )}`,
      { status: 400 }
    );
  }

  // Resolve images in parallel. allSettled so a single failing fetch
  // (404, timeout) renders the slide without that image instead of
  // killing the whole request.
  const imageIdEntries = Object.entries(imageMediaIds);
  const imageResults = await Promise.allSettled(
    imageIdEntries.map(([slotId, mediaId]) =>
      resolveImage(mediaId).then((r) => ({ slotId, ...r }))
    )
  );
  const imageDataUris: Record<string, string | null> = {};
  let creditText: string | null = null;
  for (const r of imageResults) {
    if (r.status === "fulfilled") {
      imageDataUris[r.value.slotId] = r.value.dataUri;
      if (r.value.creditText && !creditText) creditText = r.value.creditText;
    }
  }
  for (const [slotId] of imageIdEntries) {
    if (!(slotId in imageDataUris)) imageDataUris[slotId] = null;
  }

  // Load logos + fonts in parallel.
  const [logoLight, logoDark, fonts] = await Promise.all([
    getLogoDataUri("logo-on-light").catch(() => null),
    getLogoDataUri("logo-on-dark").catch(() => null),
    loadTemplateFonts(),
  ]);

  const element = template.render({
    slotValues: slotValues as never,
    imageDataUris,
    logoOnLight: logoLight?.dataUri ?? null,
    logoOnDark: logoDark?.dataUri ?? null,
    creditText,
  });

  return new ImageResponse(element, {
    width: template.meta.size.w,
    height: template.meta.size.h,
    fonts,
    headers: {
      // Live preview — never cache. The Compose page hammers this
      // endpoint on every slot change; sub-second renders matter
      // more than CDN cache.
      "Cache-Control": "private, no-store",
      "Content-Type": "image/png",
    },
  });
}

/** Resolve a "dr:<uuid>" or "ext:<uuid>" mediaId to a base64 data URI
 *  plus optional credit text (non-null for external imagery — CC-BY
 *  licensing requires visible credit on display). */
async function resolveImage(
  mediaId: string
): Promise<{ dataUri: string | null; creditText: string | null }> {
  try {
    if (mediaId.startsWith("dr:")) {
      const media = await getMediaById(mediaId.slice(3));
      if (!media || media.archivedAt) return { dataUri: null, creditText: null };
      const res = await fetch(media.publicUrl);
      if (!res.ok) return { dataUri: null, creditText: null };
      const buf = await res.arrayBuffer();
      const mime =
        res.headers.get("content-type") ?? media.mimeType ?? "image/jpeg";
      return {
        dataUri: `data:${mime};base64,${Buffer.from(buf).toString("base64")}`,
        creditText: null,
      };
    }
    if (mediaId.startsWith("ext:")) {
      const ext = await getImageryById(mediaId.slice(4));
      if (!ext || ext.archivedAt) return { dataUri: null, creditText: null };
      const res = await fetch(ext.url, {
        headers: {
          "User-Agent":
            "DeenReliefSocial/1.0 (https://deenrelief.org; tech@deenrelief.org)",
        },
      });
      if (!res.ok) return { dataUri: null, creditText: ext.creditText };
      const buf = await res.arrayBuffer();
      const mime = res.headers.get("content-type") ?? "image/jpeg";
      return {
        dataUri: `data:${mime};base64,${Buffer.from(buf).toString("base64")}`,
        creditText: ext.creditText,
      };
    }
  } catch (err) {
    console.warn(
      `[render] image resolve failed for ${mediaId}:`,
      err instanceof Error ? err.message : err
    );
  }
  return { dataUri: null, creditText: null };
}
