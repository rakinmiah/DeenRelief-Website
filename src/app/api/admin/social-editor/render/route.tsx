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
import type {
  EditorSlide,
  Layer,
  InstanceLayer,
  LaidOutBox,
  ShapeLayer,
  ComponentRegistry,
} from "@/lib/social-editor/types";
import {
  activeMaskShapeIds,
  cornerRadiusCss,
  expandInstance,
  expandSlideLayers,
  flipTransform,
  listDisplayText,
  maskRadiusCss,
  resolveMaskShape,
  resolveSlideLayout,
  textCaseFor,
  textDecorationCss,
  textTransformCss,
} from "@/lib/social-editor/types";

/** box-shadow string from a layer shadow (export = board units, scale 1). */
function shadowCss(
  shadow: { x: number; y: number; blur: number; color: string } | null | undefined
): string | undefined {
  if (!shadow) return undefined;
  return `${shadow.x}px ${shadow.y}px ${shadow.blur}px ${shadow.color}`;
}

/** Combine a layer blur (px) with any existing CSS filter string. */
function combineFilter(base: string | undefined, blur: number | undefined): string | undefined {
  const parts: string[] = [];
  if (base && base !== "none") parts.push(base);
  if (blur && blur > 0) parts.push(`blur(${blur}px)`);
  return parts.length ? parts.join(" ") : undefined;
}

/**
 * Strip undefined-valued keys before handing a style object to Satori. next/og
 * (Satori) throws `Invalid boxShadow value: "undefined"` when it receives an
 * explicit `boxShadow: undefined` (likewise textShadow/filter) — the browser
 * DOM silently ignores such keys, Satori does not. Omitting the key entirely is
 * equivalent to "no shadow/filter", so optional effects round-trip correctly.
 */
function sx(style: CSSProperties): CSSProperties {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(style)) if (v !== undefined) out[k] = v;
  return out as CSSProperties;
}

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
  const body = (await request.json()) as {
    slide?: EditorSlide;
    /** Deck-level component registry — rides along so the route can expand
     *  any instance layer into its concrete component layers. */
    registry?: ComponentRegistry;
  };
  const slide = body.slide;
  if (!slide || !Array.isArray(slide.layers)) {
    return new Response("Missing slide.", { status: 400 });
  }
  const registry = body.registry;

  // Auto-layout overrides: members of an auto-layout group are positioned
  // by the SAME shared solver the canvas uses (pre-computed boxes,
  // absolute-positioned here) so the PNG is pixel-identical to the stage.
  const layout = resolveSlideLayout(slide);
  const boxOf = (l: Layer): LaidOutBox =>
    layout.get(l.id) ?? { x: l.x, y: l.y, w: l.w, h: l.h };

  // Flatten instances into their concrete component layers (the SAME
  // expandSlideLayers the canvas + thumbnails use) PURELY for resource
  // pre-loading — so images + fonts INSIDE a component instance get fetched.
  // Expanded children carry deterministic ids (`${inst.id}__${masterId}`) +
  // absolute board coords, so boxOf() falls back to those coords and the URI
  // map keys line up with the per-instance render pass below. The element
  // tree itself still renders instances through a clipped wrapper (mirroring
  // LayerView's InstanceBody) so instance opacity/rotation/clip match exactly.
  const flatLayers = expandSlideLayers(slide, registry);

  // Resolve image layers → filtered data URIs (parallel, fault-tolerant).
  // Hidden layers are skipped so the export matches the editor (WYSIWYG).
  const imageLayers = flatLayers.filter(
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
        // layers we letterbox the art to the (laid-out) layer box here,
        // then paint it with "cover" below (faithful — already box-sized).
        const lb = boxOf(l);
        const containBox = isContain
          ? {
              w: Math.max(1, Math.round(lb.w)),
              h: Math.max(1, Math.round(lb.h)),
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
  for (const l of flatLayers) {
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
      {renderNodes(slide.layers, boxOf, 0, 0, uris, registry)}
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

/** Render a set of SIBLING layers (the slide's top-level layers, OR one
 *  instance's expanded children) into the Satori element tree. `absBox`
 *  resolves a layer's box in absolute board coords; `originX/Y` is the frame
 *  origin to subtract so children paint LOCAL to their wrapper. This mirrors
 *  the canvas exactly: SlideCanvas maps top-level layers, and InstanceBody
 *  re-maps an instance's children in its local frame — same masks, same
 *  z-order, same per-set mask resolution → pixel parity. Mutually recursive
 *  with renderInstanceNodes (both hoisted). */
function renderNodes(
  layers: Layer[],
  absBox: (l: Layer) => LaidOutBox,
  originX: number,
  originY: number,
  uris: Map<string, string | null>,
  registry: ComponentRegistry | undefined
) {
  // Masks resolve among THIS sibling set only — matching LayerView /
  // InstanceBody (a component's masked image clips to a mask in the same
  // component, never to a slide-level shape).
  const maskShapeIds = activeMaskShapeIds(layers);
  return layers
    .filter((l) => !l.hidden)
    .map((l) => {
      const abs = absBox(l);
      const local: LaidOutBox = {
        x: abs.x - originX,
        y: abs.y - originY,
        w: abs.w,
        h: abs.h,
      };
      // Masked image → resolve its mask shape (in this sibling set) + the
      // mask's local box. Dangling / unsupported = null (renders normally).
      const mask = l.type === "image" ? resolveMaskShape(l, layers) : null;
      let maskLocal: LaidOutBox | null = null;
      if (mask) {
        const m = absBox(mask);
        maskLocal = { x: m.x - originX, y: m.y - originY, w: m.w, h: m.h };
      }
      return (
        <div key={l.id} style={wrapperStyle(l, local)}>
          {l.type === "instance"
            ? renderInstanceNodes(l, abs, uris, registry)
            : renderInner(
                l,
                uris.get(l.id) ?? null,
                local,
                mask,
                maskLocal,
                maskShapeIds.has(l.id)
              )}
        </div>
      );
    });
}

/** Paint an INSTANCE: expand its master variant into concrete children (the
 *  SAME expandInstance the canvas uses → parity), then render them in the
 *  instance's LOCAL frame inside a clip window. The instance's own
 *  rotation/opacity/flip are already applied by its wrapper (renderNodes →
 *  wrapperStyle), so children keep only their master transforms — identical
 *  to LayerView's InstanceBody. A missing/empty component paints a quiet
 *  placeholder rather than crashing. */
function renderInstanceNodes(
  inst: InstanceLayer,
  instAbs: LaidOutBox,
  uris: Map<string, string | null>,
  registry: ComponentRegistry | undefined
) {
  // Expand against the EFFECTIVE (laid-out) box so a grouped/auto-laid-out
  // instance paints at the right place + size.
  const effective: InstanceLayer = {
    ...inst,
    x: instAbs.x,
    y: instAbs.y,
    w: instAbs.w,
    h: instAbs.h,
  };
  const children = expandInstance(registry?.[inst.componentId], effective);
  if (children.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          border: "1px dashed rgba(26,26,46,0.25)",
          borderRadius: 8,
          background: "rgba(26,26,46,0.03)",
        }}
      />
    );
  }
  // Children carry absolute board coords; paint them in the instance's LOCAL
  // frame (origin = instance box) inside a clip window — mirrors InstanceBody.
  const childAbs = (c: Layer): LaidOutBox => ({ x: c.x, y: c.y, w: c.w, h: c.h });
  return (
    <div
      style={{
        display: "flex",
        position: "absolute",
        left: 0,
        top: 0,
        width: "100%",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {renderNodes(children, childAbs, instAbs.x, instAbs.y, uris, registry)}
    </div>
  );
}

function wrapperStyle(l: Layer, box: LaidOutBox): CSSProperties {
  // Geometry comes from `box` (auto-layout override or the layer's stored
  // coords); rotation/flip/opacity from the layer itself.
  return {
    position: "absolute",
    left: 0,
    top: 0,
    width: box.w,
    height: box.h,
    transform: `translate(${box.x}px, ${box.y}px) rotate(${l.rotation}deg)${flipTransform(l.flipH, l.flipV)}`,
    transformOrigin: "50% 50%",
    opacity: l.opacity,
    display: "flex",
  };
}

function renderInner(
  l: Layer,
  uri: string | null,
  box: LaidOutBox,
  mask: ShapeLayer | null,
  maskBox: LaidOutBox | null,
  maskedOut: boolean
) {
  if (l.type === "text") {
    return (
      <div
        style={sx({
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-start",
          // Cross-axis (horizontal) placement of the text block. In a flex
          // column, textAlign alone doesn't move a shrink-wrapped line, so
          // centred/right text pins left without this. "justify" stretches
          // lines edge-to-edge, so the block fills the box width.
          alignItems:
            l.align === "center"
              ? "center"
              : l.align === "right"
                ? "flex-end"
                : l.align === "justify"
                  ? "stretch"
                  : "flex-start",
          fontFamily: bareFamily(l.fontFamily),
          fontSize: l.fontSize,
          fontWeight: nearestWeight(bareFamily(l.fontFamily), l.fontWeight),
          fontStyle: l.italic ? "italic" : "normal",
          // Mirror LayerView exactly: case + underline/strikethrough +
          // list markers are derived from the SAME helpers so canvas =
          // PNG. The stored text is never mutated (list prefix is derived).
          textDecoration: textDecorationCss(l.underline, l.strikethrough),
          textTransform: textTransformCss(textCaseFor(l)),
          color: l.color,
          textAlign: l.align,
          lineHeight: l.lineHeight,
          letterSpacing: l.letterSpacing,
          whiteSpace: "pre-wrap",
          // Mirror LayerView: text gets text-shadow (Satori honours it),
          // blur via the CSS filter — keeps canvas + PNG identical.
          textShadow: shadowCss(l.shadow),
          filter: combineFilter(undefined, l.blur),
        })}
      >
        {listDisplayText(l.text, l.list)}
      </div>
    );
  }
  if (l.type === "image") {
    // ── Masked image ────────────────────────────────────────────────
    // IDENTICAL approach to LayerView: a clip window at the mask box
    // (overflow hidden + radius), with the <img> re-offset by
    // (imageBox − maskBox) so its content lands at the image's own coords.
    // Satori honours overflow:hidden + border-radius (incl. per-corner and
    // 50% for ellipse), so the PNG matches the canvas. The wrapper stays at
    // the image box (wrapperStyle), so the window sits relative to it.
    if (mask && maskBox) {
      const offX = maskBox.x - box.x;
      const offY = maskBox.y - box.y;
      return (
        <div
          style={sx({
            display: "flex",
            position: "absolute",
            left: offX,
            top: offY,
            width: maskBox.w,
            height: maskBox.h,
            borderRadius: maskRadiusCss(mask),
            overflow: "hidden",
            boxShadow: shadowCss(l.shadow),
            background: l.objectFit === "contain" ? "transparent" : "#2a3f33",
          })}
        >
          {uri ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={uri}
              alt=""
              style={sx({
                ...cropImgStyle(l.crop),
                position: "absolute",
                left: -offX,
                top: -offY,
                width: box.w,
                height: box.h,
                objectFit: "cover",
                filter: combineFilter(undefined, l.blur),
              })}
            />
          ) : null}
        </div>
      );
    }
    // ── Unmasked image (original behaviour) ─────────────────────────
    return (
      <div
        style={sx({
          display: "flex",
          width: "100%",
          height: "100%",
          borderRadius: cornerRadiusCss(l.corners, l.radius),
          overflow: "hidden",
          boxShadow: shadowCss(l.shadow),
          // Transparent for `contain` images (logos / cut-out graphics) so
          // they sit directly on the slide; loading-tint only for photos.
          background: l.objectFit === "contain" ? "transparent" : "#2a3f33",
        })}
      >
        {uri ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={uri}
            alt=""
            style={sx({
              ...cropImgStyle(l.crop),
              width: box.w,
              height: box.h,
              // Always "cover": Satori drops objectFit:"contain", so contain
              // layers are pre-letterboxed to the box (above) and shown here
              // with cover — exact box size means no crop.
              objectFit: "cover",
              // Colour filter is baked in by sharp upstream; blur is the only
              // CSS filter we add here (mirrors LayerView).
              filter: combineFilter(undefined, l.blur),
            })}
          />
        ) : (
          // DIAGNOSTIC: a failed image URI (fetch/prepare) renders magenta so
          // we can see which layer is dropping out. TEMPORARY.
          <div style={{ display: "flex", width: "100%", height: "100%", background: "#ff00ff" }} />
        )}
      </div>
    );
  }
  // Instances are expanded + rendered by renderNodes/renderInstanceNodes
  // (clipped local frame), never here — this guard just narrows the union to
  // ShapeLayer for the shape branch below.
  if (l.type === "instance") return null;
  // shape — a shape acting as an image mask paints nothing (it's just the
  // clip window); the masked image is the visible content.
  if (maskedOut) {
    return <div style={{ display: "flex", width: "100%", height: "100%" }} />;
  }
  if (l.shape === "line") {
    const sw = l.strokeWidth;
    return (
      <div style={{ display: "flex", width: "100%", height: "100%", flexDirection: "column" }}>
        <div
          style={sx({
            width: "100%",
            height: sw,
            marginTop: (box.h - sw) / 2,
            background: l.stroke,
            boxShadow: shadowCss(l.shadow),
            filter: combineFilter(undefined, l.blur),
          })}
        />
      </div>
    );
  }
  const shapeStyle: CSSProperties = {
    display: "flex",
    width: "100%",
    height: "100%",
    // fill accepts a solid colour OR a CSS gradient string (already
    // supported — SCRIM/GLOW/DUO presets render here today).
    background: l.fill,
    borderRadius: l.shape === "ellipse" ? 9999 : cornerRadiusCss(l.corners, l.radius),
    boxShadow: shadowCss(l.shadow),
    filter: combineFilter(undefined, l.blur),
  };
  // NOTE: Satori does NOT honour dashed borders — it renders any
  // border-style as solid. `strokeDash` is therefore an editor-preview-only
  // affordance; the exported PNG always shows a solid stroke. We keep
  // "solid" here so the build stays clean and the border still exports.
  if (l.strokeWidth > 0) shapeStyle.border = `${l.strokeWidth}px solid ${l.stroke}`;
  return <div style={sx(shapeStyle)} />;
}
