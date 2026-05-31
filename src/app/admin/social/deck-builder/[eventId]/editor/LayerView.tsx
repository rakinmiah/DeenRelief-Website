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

import { useEffect, useRef, type CSSProperties } from "react";
import type { Layer } from "@/lib/social-editor/types";
import { cropImgStyle, filterCss } from "@/lib/social-editor/imageStyle";

export default function LayerView({
  layer,
  scale,
  selected,
  multiSelected,
  editing,
  onSelect,
  onStartEdit,
  onCommitText,
  nodeRef,
  interactive = true,
}: {
  layer: Layer;
  scale: number;
  selected?: boolean;
  /** Part of a multi-selection (shows a persistent outline, no moveable). */
  multiSelected?: boolean;
  editing?: boolean;
  onSelect?: (id: string, additive: boolean) => void;
  onStartEdit?: (id: string) => void;
  onCommitText?: (id: string, text: string) => void;
  nodeRef?: (node: HTMLDivElement | null) => void;
  interactive?: boolean;
}) {
  // Hidden layers are dropped from the canvas AND the export route skips
  // them; thumbnails render them out too.
  if (layer.hidden) return null;

  const base: CSSProperties = {
    position: "absolute",
    left: 0,
    top: 0,
    width: layer.w * scale,
    height: layer.h * scale,
    transform: `translate(${layer.x * scale}px, ${layer.y * scale}px) rotate(${layer.rotation}deg)`,
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
      data-layer-id={layer.id}
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
        />
      )}
      {layer.type === "image" && <ImageBody layer={layer} scale={scale} />}
      {layer.type === "shape" && <ShapeBody layer={layer} scale={scale} />}
      {interactive && multiSelected && (
        <span aria-hidden className="pointer-events-none absolute inset-0 ring-2 ring-green" />
      )}
      {interactive && !selected && !multiSelected && !layer.locked && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 ring-2 ring-sky-400/0 transition group-hover:ring-sky-400/60"
        />
      )}
    </div>
  );
}

function TextBody({
  layer,
  scale,
  editing,
  onCommitText,
}: {
  layer: Extract<Layer, { type: "text" }>;
  scale: number;
  editing: boolean;
  onCommitText: (text: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editing && ref.current) {
      const el = ref.current;
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, [editing]);

  const style: CSSProperties = {
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-start",
    fontFamily: layer.fontFamily,
    fontSize: layer.fontSize * scale,
    fontWeight: layer.fontWeight,
    fontStyle: layer.italic ? "italic" : "normal",
    textDecoration: layer.underline ? "underline" : "none",
    textTransform: layer.uppercase ? "uppercase" : "none",
    color: layer.color,
    textAlign: layer.align,
    lineHeight: layer.lineHeight,
    letterSpacing: layer.letterSpacing * scale,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    overflow: "hidden",
    outline: editing ? "none" : undefined,
    cursor: editing ? "text" : undefined,
  };

  if (editing) {
    return (
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onMouseDown={(e) => e.stopPropagation()}
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

  return <div style={style}>{layer.text}</div>;
}

function ImageBody({
  layer,
  scale,
}: {
  layer: Extract<Layer, { type: "image" }>;
  scale: number;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        borderRadius: layer.radius * scale,
        overflow: "hidden",
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
            filter: filterCss(layer.filter),
          }}
        />
      )}
    </div>
  );
}

function ShapeBody({
  layer,
  scale,
}: {
  layer: Extract<Layer, { type: "shape" }>;
  scale: number;
}) {
  if (layer.shape === "line") {
    return (
      <div
        style={{
          width: "100%",
          height: Math.max(1, layer.strokeWidth * scale),
          marginTop: `calc(50% - ${(layer.strokeWidth * scale) / 2}px)`,
          background: layer.stroke,
        }}
      />
    );
  }
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: layer.fill,
        border:
          layer.strokeWidth > 0
            ? `${layer.strokeWidth * scale}px solid ${layer.stroke}`
            : "none",
        borderRadius: layer.shape === "ellipse" ? "50%" : layer.radius * scale,
        boxSizing: "border-box",
      }}
    />
  );
}
