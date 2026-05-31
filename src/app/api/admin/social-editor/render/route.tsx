/**
 * POST /api/admin/social-editor/render
 *
 * Renders ONE canvas EditorSlide (layer model) to a PNG via Satori.
 * The editor calls this per slide at export time. Layers are painted
 * as absolutely-positioned divs mirroring LayerView, so what she edits
 * is what the PNG gets.
 *
 * Body: { slide: EditorSlide }
 *
 * Images are fetched server-side, colour-filtered with sharp (Satori
 * can't do CSS filters), and inlined as data URIs. Fonts are loaded
 * per used family+weight via loadGoogleFont.
 */

import { ImageResponse } from "next/og";
import type { CSSProperties } from "react";
import { requireAdminSession } from "@/lib/admin-session";
import { loadGoogleFont } from "@/lib/social-templates/fonts";
import { bareFamily, nearestWeight } from "@/lib/social-editor/fonts";
import { cropImgStyle } from "@/lib/social-editor/imageStyle";
import { prepareImage } from "@/lib/social-editor/imageFilterServer";
import type { EditorSlide, Layer } from "@/lib/social-editor/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  await requireAdminSession();
  try {
    return await render(request);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack ?? "" : "";
    console.error("[social-editor/render] failed:", msg, stack);
    return new Response(`Render failed.\n\n${msg}\n\n${stack}`, {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

async function render(request: Request): Promise<Response> {
  const body = (await request.json()) as { slide?: EditorSlide };
  const slide = body.slide;
  if (!slide || !Array.isArray(slide.layers)) {
    return new Response("Missing slide.", { status: 400 });
  }

  // Resolve image layers → filtered data URIs (parallel, fault-tolerant).
  // Hidden layers are skipped so the export matches the editor (WYSIWYG).
  const imageLayers = slide.layers.filter(
    (l): l is Extract<Layer, { type: "image" }> =>
      l.type === "image" && !!l.src && !l.hidden
  );
  const uriEntries = await Promise.all(
    imageLayers.map(async (l) => {
      try {
        const res = await fetch(l.src, {
          headers: {
            "User-Agent":
              "DeenReliefSocial/1.0 (https://deenrelief.org; tech@deenrelief.org)",
          },
        });
        if (!res.ok) return [l.id, null] as const;
        const raw = Buffer.from(await res.arrayBuffer());
        const fallbackMime = res.headers.get("content-type") ?? "image/jpeg";
        // Logos / cut-outs (contain) are small on the board — cap them
        // hard so oversized source art still rasterises; photos get a
        // generous cap.
        const isContain = l.objectFit === "contain";
        const maxDim = isContain ? 700 : 1600;
        // Satori silently drops objectFit:"contain" images. For contain
        // layers we letterbox the art to the layer box here, then paint it
        // with "cover" below (faithful — it's already exactly box-sized).
        const containBox = isContain
          ? {
              w: Math.max(1, Math.round(l.w)),
              h: Math.max(1, Math.round(l.h)),
              bg: slide.background.startsWith("#") ? slide.background : undefined,
            }
          : undefined;
        const { data, mime } = await prepareImage(raw, l.filter, maxDim, fallbackMime, containBox);
        return [l.id, `data:${mime};base64,${data.toString("base64")}`] as const;
      } catch {
        return [l.id, null] as const;
      }
    })
  );
  const uris = new Map(uriEntries);

  // Load fonts for every (family, weight, style) the text layers use.
  const fontKeys = new Map<string, { family: string; weight: number; italic: boolean }>();
  for (const l of slide.layers) {
    if (l.type !== "text") continue;
    const family = bareFamily(l.fontFamily);
    const weight = nearestWeight(family, l.fontWeight);
    const italic = l.italic;
    fontKeys.set(`${family}:${weight}:${italic}`, { family, weight, italic });
  }
  const fontResults = await Promise.allSettled(
    [...fontKeys.values()].map(async (f) => ({
      name: f.family,
      data: await loadGoogleFont(f.family, f.weight, f.italic),
      weight: f.weight as 400 | 500 | 600 | 700 | 800,
      style: (f.italic ? "italic" : "normal") as "normal" | "italic",
    }))
  );
  const fonts = fontResults
    .filter((r): r is PromiseFulfilledResult<{ name: string; data: ArrayBuffer; weight: 400 | 500 | 600 | 700 | 800; style: "normal" | "italic" }> => r.status === "fulfilled")
    .map((r) => r.value);

  const element = (
    <div
      style={{
        width: slide.width,
        height: slide.height,
        display: "flex",
        position: "relative",
        background: slide.background,
        overflow: "hidden",
      }}
    >
      {slide.layers
        .filter((l) => !l.hidden)
        .map((l) => (
          <div key={l.id} style={wrapperStyle(l)}>
            {renderInner(l, uris.get(l.id) ?? null)}
          </div>
        ))}
    </div>
  );

  // Render to a buffer INSIDE the try/catch so Satori errors surface as
  // readable text instead of a framework 500 (ImageResponse otherwise
  // throws lazily while streaming, outside our handler).
  const ir = new ImageResponse(element, {
    width: slide.width,
    height: slide.height,
    fonts: fonts.length ? fonts : undefined,
  });
  const png = await ir.arrayBuffer();
  return new Response(png, {
    headers: { "Cache-Control": "private, no-store", "Content-Type": "image/png" },
  });
}

function wrapperStyle(l: Layer): CSSProperties {
  return {
    position: "absolute",
    left: 0,
    top: 0,
    width: l.w,
    height: l.h,
    transform: `translate(${l.x}px, ${l.y}px) rotate(${l.rotation}deg)`,
    transformOrigin: "50% 50%",
    opacity: l.opacity,
    display: "flex",
  };
}

function renderInner(l: Layer, uri: string | null) {
  if (l.type === "text") {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-start",
          fontFamily: bareFamily(l.fontFamily),
          fontSize: l.fontSize,
          fontWeight: nearestWeight(bareFamily(l.fontFamily), l.fontWeight),
          fontStyle: l.italic ? "italic" : "normal",
          textDecoration: l.underline ? "underline" : "none",
          textTransform: l.uppercase ? "uppercase" : "none",
          color: l.color,
          textAlign: l.align,
          lineHeight: l.lineHeight,
          letterSpacing: l.letterSpacing,
          whiteSpace: "pre-wrap",
        }}
      >
        {l.text}
      </div>
    );
  }
  if (l.type === "image") {
    return (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          borderRadius: l.radius,
          overflow: "hidden",
          // Transparent for `contain` images (logos / cut-out graphics) so
          // they sit directly on the slide; loading-tint only for photos.
          background: l.objectFit === "contain" ? "transparent" : "#2a3f33",
        }}
      >
        {uri ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={uri}
            alt=""
            style={{
              ...cropImgStyle(l.crop),
              width: l.w,
              height: l.h,
              // Always "cover": Satori drops objectFit:"contain", so contain
              // layers are pre-letterboxed to the box (above) and shown here
              // with cover — exact box size means no crop.
              objectFit: "cover",
            }}
          />
        ) : null}
      </div>
    );
  }
  // shape
  if (l.shape === "line") {
    const sw = l.strokeWidth;
    return (
      <div style={{ display: "flex", width: "100%", height: "100%", flexDirection: "column" }}>
        <div style={{ width: "100%", height: sw, marginTop: (l.h - sw) / 2, background: l.stroke }} />
      </div>
    );
  }
  const shapeStyle: CSSProperties = {
    display: "flex",
    width: "100%",
    height: "100%",
    background: l.fill,
    borderRadius: l.shape === "ellipse" ? 9999 : l.radius,
  };
  if (l.strokeWidth > 0) shapeStyle.border = `${l.strokeWidth}px solid ${l.stroke}`;
  return <div style={shapeStyle} />;
}
