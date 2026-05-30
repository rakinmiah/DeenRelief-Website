"use client";

/**
 * Renders ONE layer as a positioned DOM node (Phase 10a).
 *
 * Geometry is stored in board units; everything here multiplies by
 * `scale` to paint at the current zoom. The node carries data-layer-id
 * so the editor can hand it to react-moveable as a transform target.
 *
 * Transform model matches Moveable's: position via translate(), spin
 * via rotate() about the default centre origin.
 */

import type { CSSProperties } from "react";
import type { Layer } from "@/lib/social-editor/types";

export default function LayerView({
  layer,
  scale,
  selected,
  onSelect,
  nodeRef,
}: {
  layer: Layer;
  scale: number;
  selected: boolean;
  onSelect: (id: string) => void;
  nodeRef: (node: HTMLDivElement | null) => void;
}) {
  const base: CSSProperties = {
    position: "absolute",
    left: 0,
    top: 0,
    width: layer.w * scale,
    height: layer.h * scale,
    transform: `translate(${layer.x * scale}px, ${layer.y * scale}px) rotate(${layer.rotation}deg)`,
    transformOrigin: "center center",
    opacity: layer.opacity,
    cursor: layer.locked ? "default" : "move",
    userSelect: "none",
    boxSizing: "border-box",
  };

  return (
    <div
      ref={nodeRef}
      data-layer-id={layer.id}
      onMouseDown={(e) => {
        if (layer.locked) return;
        e.stopPropagation();
        onSelect(layer.id);
      }}
      className="group"
      style={base}
    >
      {layer.type === "text" && <TextBody layer={layer} scale={scale} />}
      {layer.type === "image" && <ImageBody layer={layer} scale={scale} />}
      {layer.type === "shape" && <ShapeBody layer={layer} scale={scale} />}
      {/* a faint outline on hover so empty/transparent layers are findable */}
      {!selected && !layer.locked && (
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
}: {
  layer: Extract<Layer, { type: "text" }>;
  scale: number;
}) {
  return (
    <div
      style={{
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
      }}
    >
      {layer.text}
    </div>
  );
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
        background:
          "linear-gradient(135deg, #2a3f33 0%, #4a5d4f 100%)",
      }}
    >
      {layer.src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={layer.src}
          alt=""
          draggable={false}
          style={{
            width: "100%",
            height: "100%",
            objectFit: layer.objectFit,
            display: "block",
            pointerEvents: "none",
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
        borderRadius:
          layer.shape === "ellipse" ? "50%" : layer.radius * scale,
        boxSizing: "border-box",
      }}
    />
  );
}
