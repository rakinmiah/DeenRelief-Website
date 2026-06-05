"use client";

/**
 * Renders ONE layer as a positioned DOM node (Phase 10a/10c/10d).
 *
 * Geometry is stored in board units; everything here multiplies by
 * `scale` to paint at the current zoom. Image layers honour crop +
 * filter; text layers become contentEditable when `editing`.
 *
 * `interactive={false}` (filmstrip thumbnails) drops the pointer
 * handlers + hover ring so it's a pure preview.
 */

import { useCallback, useEffect, useRef, type CSSProperties } from "react";
import type {
  ComponentRegistry,
  InstanceLayer,
  Layer,
  LaidOutBox,
  ShapeLayer,
} from "@/lib/social-editor/types";
import {
  activeMaskShapeIds,
  cornerRadiusCss,
  expandInstance,
  flipTransform,
  listDisplayText,
  maskRadiusCss,
  resolveMaskShape,
  textCaseFor,
  textDecorationCss,
  textTransformCss,
} from "@/lib/social-editor/types";
import { creditBadgeMetrics, cropImgStyle, filterCss } from "@/lib/social-editor/imageStyle";

/** A small attribution pill pinned to the bottom-left of an image, scaled to
 *  display. Mirrors the export route so the credit is WYSIWYG. Renders nothing
 *  when there's no credit (DR library / public-domain art). */
function CreditOverlay({ credit, boxW, scale }: { credit: string | null | undefined; boxW: number; scale: number }) {
  if (!credit) return null;
  const m = creditBadgeMetrics(boxW);
  return (
    <span
      aria-hidden
      style={{
        position: "absolute",
        left: m.inset * scale,
        bottom: m.inset * scale,
        maxWidth: `calc(100% - ${m.inset * 2 * scale}px)`,
        padding: `${m.pad * 0.6 * scale}px ${m.pad * scale}px`,
        borderRadius: m.radius * scale,
        background: "rgba(0,0,0,0.55)",
        color: "rgba(255,255,255,0.95)",
        fontFamily: "DM Sans, sans-serif",
        fontSize: Math.max(8, m.fontSize * scale),
        lineHeight: 1.25,
        fontWeight: 500,
        whiteSpace: "normal",
        wordBreak: "break-word",
        pointerEvents: "none",
      }}
    >
      {credit}
    </span>
  );
}

/** box-shadow string from a layer shadow, scaled to display. */
function shadowCss(
  shadow: { x: number; y: number; blur: number; color: string } | null | undefined,
  scale: number
): string | undefined {
  if (!shadow) return undefined;
  return `${shadow.x * scale}px ${shadow.y * scale}px ${shadow.blur * scale}px ${shadow.color}`;
}

/** Combine a layer blur (px, board units) with any existing CSS filter
 *  (e.g. an image colour filter). Returns undefined when there's nothing
 *  to apply so we don't force a compositing layer needlessly. */
function combineFilter(base: string | undefined, blur: number | undefined, scale: number): string | undefined {
  const parts: string[] = [];
  if (base && base !== "none") parts.push(base);
  if (blur && blur > 0) parts.push(`blur(${blur * scale}px)`);
  return parts.length ? parts.join(" ") : undefined;
}

export default function LayerView({
  layer,
  scale,
  geom,
  mask,
  maskBox,
  maskedOut,
  registry,
  selected,
  multiSelected,
  editing,
  onSelect,
  onStartEdit,
  onCommitText,
  onAutoSize,
  onActivatePlaceholder,
  nodeRef,
  interactive = true,
}: {
  layer: Layer;
  scale: number;
  /** Auto-layout override: when present, the layer paints at this
   *  computed box instead of its stored x/y/w/h (the layer is a member of
   *  an auto-layout group). Geometry-only — styling reads from `layer`. */
  geom?: LaidOutBox;
  /** For a MASKED image layer: the resolved mask shape (its kind drives the
   *  clip-window radius) — see resolveMaskShape. Undefined = not masked. */
  mask?: ShapeLayer | null;
  /** The mask shape's RESOLVED box (auto-layout aware), board units. The
   *  image is clipped to this window; required when `mask` is set. */
  maskBox?: LaidOutBox | null;
  /** True when THIS layer is a shape currently acting as a mask: it paints
   *  no fill (it's just the window) but stays selectable/editable. */
  maskedOut?: boolean;
  /** Deck-level component registry — required to paint an instance layer
   *  (its master variant is expanded + rendered inside the instance box).
   *  Ignored for text/image/shape layers. */
  registry?: ComponentRegistry;
  selected?: boolean;
  /** Part of a multi-selection (shows a persistent outline, no moveable). */
  multiSelected?: boolean;
  editing?: boolean;
  onSelect?: (id: string, additive: boolean) => void;
  onStartEdit?: (id: string) => void;
  onCommitText?: (id: string, text: string) => void;
  /** Live auto-size while a text layer is edited: the box grows/shrinks in
   *  height to fit what's typed, and the font shrinks if a word is too wide
   *  for the box. Measured on the canvas + reported up so the stored size
   *  matches the export. */
  onAutoSize?: (id: string, patch: { h?: number; fontSize?: number }) => void;
  /** A placeholder (QR square or empty photo slot) was clicked — open the QR
   *  dialog / image picker to fill it. */
  onActivatePlaceholder?: (id: string, kind: "qr" | "image") => void;
  nodeRef?: (node: HTMLDivElement | null) => void;
  interactive?: boolean;
}) {
  // Hidden layers are dropped from the canvas AND the export route skips
  // them; thumbnails render them out too.
  if (layer.hidden) return null;

  // Auto-layout members paint at the computed box; everyone else at their
  // stored geometry. Rotation/flip still come from the layer itself.
  const gx = geom?.x ?? layer.x;
  const gy = geom?.y ?? layer.y;
  const gw = geom?.w ?? layer.w;
  const gh = geom?.h ?? layer.h;

  const base: CSSProperties = {
    position: "absolute",
    left: 0,
    top: 0,
    width: gw * scale,
    height: gh * scale,
    transform: `translate(${gx * scale}px, ${gy * scale}px) rotate(${layer.rotation}deg)${flipTransform(layer.flipH, layer.flipV)}`,
    transformOrigin: "center center",
    opacity: layer.opacity,
    cursor: !interactive ? "default" : layer.locked ? "default" : "move",
    userSelect: "none",
    boxSizing: "border-box",
    pointerEvents: interactive ? "auto" : "none",
  };

  return (
    <div
      ref={nodeRef}
      /* Only the interactive (canvas) copy carries the id — non-interactive
       * filmstrip thumbnails render the SAME layers, and emitting the id there
       * too produced duplicate data-layer-id nodes in the DOM (invalid, and a
       * hazard for any hit-testing/snapping that resolves layers by id). */
      data-layer-id={interactive ? layer.id : undefined}
      onMouseDown={
        interactive && !editing
          ? (e) => {
              if (layer.locked) return;
              e.stopPropagation();
              onSelect?.(layer.id, e.shiftKey || e.metaKey || e.ctrlKey);
            }
          : undefined
      }
      onDoubleClick={
        interactive && layer.type === "text" && !layer.locked
          ? (e) => {
              e.stopPropagation();
              onStartEdit?.(layer.id);
            }
          : undefined
      }
      className={interactive ? "group" : undefined}
      style={base}
    >
      {layer.type === "text" && (
        <TextBody
          layer={layer}
          scale={scale}
          editing={!!editing}
          onCommitText={(t) => onCommitText?.(layer.id, t)}
          onAutoSize={onAutoSize ? (patch) => onAutoSize(layer.id, patch) : undefined}
        />
      )}
      {layer.type === "image" && (
        <ImageBody
          layer={layer}
          scale={scale}
          imageBox={{ x: gx, y: gy, w: gw, h: gh }}
          mask={mask ?? null}
          maskBox={maskBox ?? null}
        />
      )}
      {layer.type === "shape" && <ShapeBody layer={layer} scale={scale} maskedOut={!!maskedOut} />}
      {layer.type === "instance" && (
        <InstanceBody
          layer={layer}
          box={{ x: gx, y: gy, w: gw, h: gh }}
          scale={scale}
          registry={registry}
        />
      )}
      {interactive && multiSelected && (
        <span aria-hidden className="pointer-events-none absolute inset-0 ring-2 ring-green" />
      )}
      {interactive && !selected && !multiSelected && !layer.locked && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 ring-2 ring-sky-400/0 transition group-hover:ring-sky-400/60"
        />
      )}
      {/* Placeholder fill button — QR square or empty photo slot. A centred
          pill (not full-cover) so the layer is still selectable/movable. */}
      {interactive && onActivatePlaceholder && (() => {
        const isQr = layer.type === "shape" && layer.name === "qr-placeholder";
        const isImg = layer.type === "image" && !layer.src.trim();
        if (!isQr && !isImg) return null;
        return (
          <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onActivatePlaceholder(layer.id, isQr ? "qr" : "image");
            }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 inline-flex items-center gap-1.5 rounded-full bg-charcoal/85 text-white font-semibold shadow-lg hover:bg-charcoal transition whitespace-nowrap"
            style={{ fontSize: Math.max(9, 12 * scale), padding: `${6 * scale}px ${11 * scale}px` }}
          >
            <svg width={Math.max(10, 13 * scale)} height={Math.max(10, 13 * scale)} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <path d="M8 3v10M3 8h10" strokeLinecap="round" />
            </svg>
            {isQr ? "Add QR" : "Add photo"}
          </button>
        );
      })()}
    </div>
  );
}

function TextBody({
  layer,
  scale,
  editing,
  onCommitText,
  onAutoSize,
}: {
  layer: Extract<Layer, { type: "text" }>;
  scale: number;
  editing: boolean;
  onCommitText: (text: string) => void;
  onAutoSize?: (patch: { h?: number; fontSize?: number }) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Live auto-size while editing: grow/shrink the box height to the typed
  // content (Canva-style auto-height) and shrink the font if a word is too
  // wide to wrap — so nothing clips mid-typing. Measured here, reported up as
  // a non-committing update (snapshotted on blur), and stored on the layer so
  // the Satori export matches.
  const measure = useCallback(() => {
    const el = ref.current;
    if (!el || !onAutoSize) return;
    const patch: { h?: number; fontSize?: number } = {};
    if (el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1) {
      const ratio = el.clientWidth / el.scrollWidth;
      patch.fontSize = Math.max(12, Math.floor(layer.fontSize * ratio));
    }
    // Natural content height: measure with height:auto, then restore.
    const prev = el.style.height;
    el.style.height = "auto";
    const natural = el.scrollHeight;
    el.style.height = prev;
    const boardH = Math.max(24, Math.round(natural / scale));
    if (Math.abs(boardH - layer.h) > 1) patch.h = boardH;
    if (patch.h != null || patch.fontSize != null) onAutoSize(patch);
  }, [onAutoSize, layer.fontSize, layer.h, scale]);

  useEffect(() => {
    if (editing && ref.current) {
      const el = ref.current;
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
      measure(); // fit immediately on entering edit (handles pre-existing overflow)
    }
  }, [editing, measure]);

  const style: CSSProperties = {
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-start",
    // Cross-axis placement of the text block. "justify" stretches lines
    // edge-to-edge, so the block must fill the box width.
    alignItems:
      layer.align === "center"
        ? "center"
        : layer.align === "right"
          ? "flex-end"
          : layer.align === "justify"
            ? "stretch"
            : "flex-start",
    fontFamily: layer.fontFamily,
    fontSize: layer.fontSize * scale,
    fontWeight: layer.fontWeight,
    fontStyle: layer.italic ? "italic" : "normal",
    textDecoration: textDecorationCss(layer.underline, layer.strikethrough),
    textTransform: textTransformCss(textCaseFor(layer)),
    color: layer.color,
    textAlign: layer.align,
    lineHeight: layer.lineHeight,
    letterSpacing: layer.letterSpacing * scale,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    // Glyph ink (heavy display faces, tight line-height, negative tracking)
    // bleeds slightly past the text box; the Satori export renders it in full
    // (no clip), so the canvas must match — otherwise big figures/headlines
    // look cropped in the editor but export fine. `visible` keeps canvas = PNG.
    overflow: "visible",
    outline: editing ? "none" : undefined,
    cursor: editing ? "text" : undefined,
    // Text layers use text-shadow (Satori honours it) rather than
    // box-shadow so the glow follows the glyphs, not the box.
    textShadow: shadowCss(layer.shadow, scale),
    filter: combineFilter(undefined, layer.blur, scale),
  };

  if (editing) {
    return (
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onMouseDown={(e) => e.stopPropagation()}
        onInput={measure}
        onBlur={(e) => onCommitText(e.currentTarget.innerText)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            e.currentTarget.blur();
          }
        }}
        style={style}
      >
        {layer.text}
      </div>
    );
  }

  // Non-editing: list markers are DERIVED for display (the stored text
  // stays clean). Editing shows the raw text so markers aren't editable
  // and never get committed.
  return <div style={style}>{listDisplayText(layer.text, layer.list)}</div>;
}

function ImageBody({
  layer,
  scale,
  imageBox,
  mask,
  maskBox,
}: {
  layer: Extract<Layer, { type: "image" }>;
  scale: number;
  /** The image layer's own resolved box (board units). */
  imageBox: LaidOutBox;
  /** Resolved mask shape (null = not masked). */
  mask: ShapeLayer | null;
  /** Resolved mask box (board units; null when not masked). */
  maskBox: LaidOutBox | null;
}) {
  // ── Masked image ──────────────────────────────────────────────────
  // The visible window = the mask shape's box (clip + radius); the image
  // keeps its own position/scale and shows only where it overlaps. The
  // outer LayerView wrapper stays at the IMAGE box (so selection / hover /
  // transform / pan affordance are unchanged); we render the window as a
  // child offset by (maskBox − imageBox) and re-offset the <img> by
  // (imageBox − maskBox) so its content lands at the image's own coords.
  if (mask && maskBox) {
    const offX = (maskBox.x - imageBox.x) * scale;
    const offY = (maskBox.y - imageBox.y) * scale;
    return (
      <div
        style={{
          position: "absolute",
          left: offX,
          top: offY,
          width: maskBox.w * scale,
          height: maskBox.h * scale,
          borderRadius: maskRadiusCss(mask, scale),
          overflow: "hidden",
          boxShadow: shadowCss(layer.shadow, scale),
          background:
            layer.objectFit === "contain"
              ? "transparent"
              : "linear-gradient(135deg, #2a3f33 0%, #4a5d4f 100%)",
        }}
      >
        {layer.src && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={layer.src}
            alt=""
            draggable={false}
            style={{
              ...cropImgStyle(layer.crop),
              // Re-offset the image back to its own box within the window.
              position: "absolute",
              left: -offX,
              top: -offY,
              width: imageBox.w * scale,
              height: imageBox.h * scale,
              display: "block",
              pointerEvents: "none",
              objectFit: layer.objectFit,
              filter: combineFilter(filterCss(layer.filter), layer.blur, scale),
            }}
          />
        )}
        {layer.objectFit !== "contain" && (
          <CreditOverlay credit={layer.credit} boxW={maskBox.w} scale={scale} />
        )}
      </div>
    );
  }

  // ── Unmasked image (original behaviour) ───────────────────────────
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        borderRadius: cornerRadiusCss(layer.corners, layer.radius, scale),
        overflow: "hidden",
        boxShadow: shadowCss(layer.shadow, scale),
        // Transparent for contain-fit cut-outs (logos); loading-tint for photos.
        background:
          layer.objectFit === "contain"
            ? "transparent"
            : "linear-gradient(135deg, #2a3f33 0%, #4a5d4f 100%)",
      }}
    >
      {layer.src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={layer.src}
          alt=""
          draggable={false}
          style={{
            ...cropImgStyle(layer.crop),
            display: "block",
            pointerEvents: "none",
            objectFit: layer.objectFit,
            // Compose the colour filter with any layer blur.
            filter: combineFilter(filterCss(layer.filter), layer.blur, scale),
          }}
        />
      )}
      {layer.objectFit !== "contain" && (
        <CreditOverlay credit={layer.credit} boxW={imageBox.w} scale={scale} />
      )}
    </div>
  );
}

/** Paints an INSTANCE layer: expands its master variant into concrete
 *  child layers (the SAME expandInstance the export route uses → parity),
 *  then renders them inside the instance's box. Children are translated
 *  into the instance's LOCAL frame (subtract the instance origin) so they
 *  paint relative to the wrapper, which is already positioned at the
 *  instance box. Masks among the children are resolved here so a
 *  component containing a masked image renders correctly. A missing /
 *  empty component renders a quiet placeholder rather than crashing. */
function InstanceBody({
  layer,
  box,
  scale,
  registry,
}: {
  layer: InstanceLayer;
  /** The instance's EFFECTIVE box (auto-layout override or stored coords).
   *  Children are expanded into this box so a grouped/laid-out instance
   *  paints at the right place + size. */
  box: LaidOutBox;
  scale: number;
  registry?: ComponentRegistry;
}) {
  // Expand against the effective box (so slide-level auto-layout on the
  // instance is honoured), then paint children in the LOCAL frame.
  const effective: InstanceLayer = { ...layer, x: box.x, y: box.y, w: box.w, h: box.h };
  const children = expandInstance(registry?.[layer.componentId], effective);
  if (children.length === 0) {
    // Dangling / empty component — a faint dashed placeholder so the
    // instance is still visible and selectable on the canvas.
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          border: "1px dashed rgba(26,26,46,0.25)",
          borderRadius: 8,
          background: "rgba(26,26,46,0.03)",
        }}
      />
    );
  }
  const maskShapeIds = activeMaskShapeIds(children);
  // Local frame: children carry absolute board coords; the wrapper is at
  // the instance box origin, so paint each child offset by (−box.x,
  // −box.y) via a local geom override.
  const localGeom = (l: Layer): LaidOutBox => ({
    x: l.x - box.x,
    y: l.y - box.y,
    w: l.w,
    h: l.h,
  });
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {children.map((c) => {
        const cMask =
          c.type === "image" && !c.hidden ? resolveMaskShape(c, children) : null;
        const cMaskBox = cMask ? localGeom(cMask) : null;
        return (
          <LayerView
            key={c.id}
            layer={c}
            scale={scale}
            geom={localGeom(c)}
            registry={registry}
            mask={cMask}
            maskBox={cMaskBox}
            maskedOut={maskShapeIds.has(c.id)}
            interactive={false}
          />
        );
      })}
    </div>
  );
}

function ShapeBody({
  layer,
  scale,
  maskedOut,
}: {
  layer: Extract<Layer, { type: "shape" }>;
  scale: number;
  /** When true this shape is acting as an image mask: it paints no fill
   *  (the masked image is the visible content) but stays selectable. We
   *  render an empty, transparent box so the wrapper still hit-tests. */
  maskedOut?: boolean;
}) {
  if (maskedOut) {
    return <div style={{ width: "100%", height: "100%", background: "transparent" }} />;
  }
  if (layer.shape === "line") {
    return (
      <div
        style={{
          width: "100%",
          height: Math.max(1, layer.strokeWidth * scale),
          marginTop: `calc(50% - ${(layer.strokeWidth * scale) / 2}px)`,
          background: layer.stroke,
          boxShadow: shadowCss(layer.shadow, scale),
          filter: combineFilter(undefined, layer.blur, scale),
        }}
      />
    );
  }
  const dashed = (layer.strokeDash ?? 0) > 0;
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        // fill accepts a solid colour OR a CSS gradient string.
        background: layer.fill,
        border:
          layer.strokeWidth > 0
            ? `${layer.strokeWidth * scale}px ${dashed ? "dashed" : "solid"} ${layer.stroke}`
            : "none",
        borderRadius:
          layer.shape === "ellipse"
            ? "50%"
            : cornerRadiusCss(layer.corners, layer.radius, scale),
        boxSizing: "border-box",
        boxShadow: shadowCss(layer.shadow, scale),
        filter: combineFilter(undefined, layer.blur, scale),
      }}
    />
  );
}
