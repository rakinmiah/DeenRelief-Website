/**
 * Canva-style slide editor — the layer data model (Phase 10a).
 *
 * This replaces the slot-based slide model for the freeform editor: a
 * slide is a stacked list of LAYERS, each an independent object with
 * its own geometry (position, size, rotation), styling and content.
 * Everything in the editor — selection, transform, the contextual
 * toolbars, and the eventual Satori PNG export — reads and writes this
 * shape.
 *
 * Coordinates are in ARTBOARD UNITS (px on the 1080×1080 board), NOT
 * screen pixels. The canvas renders them at a display scale; geometry
 * is always stored board-space so a slide renders identically at any
 * zoom and exports 1:1 to PNG.
 */

/** Geometry + flags shared by every layer. */
export type LayerBase = {
  id: string;
  /** Top-left corner, board units. */
  x: number;
  y: number;
  /** Box size, board units. */
  w: number;
  h: number;
  /** Clockwise degrees about the box centre. */
  rotation: number;
  /** 0–1. */
  opacity: number;
  /** Locked layers can't be selected/transformed on the canvas. */
  locked: boolean;
};

export type TextAlign = "left" | "center" | "right";

export type TextLayer = LayerBase & {
  type: "text";
  text: string;
  fontFamily: string;
  /** Board-unit font size. */
  fontSize: number;
  fontWeight: number;
  italic: boolean;
  underline: boolean;
  uppercase: boolean;
  color: string;
  align: TextAlign;
  /** Multiplier (1.2 = 120%). */
  lineHeight: number;
  /** Board-unit tracking. */
  letterSpacing: number;
};

/** Named colour treatments — applied as CSS filters in the editor and
 *  reproduced with sharp at export so they survive to the PNG. */
export type ImageFilter =
  | "none"
  | "mono"
  | "warm"
  | "cool"
  | "bright"
  | "faded";

/** Zoom + reposition WITHIN the layer frame (Canva-style crop).
 *  scale ≥ 1; ox/oy are focal offsets in percent (−50…50). */
export type ImageCrop = { scale: number; ox: number; oy: number };

export type ImageLayer = LayerBase & {
  type: "image";
  /** Browser-loadable URL (remote, data URI, or /public path). The
   *  mediaId → URL resolution is the export layer's job. */
  src: string;
  /** Optional media id to resolve server-side at export time. */
  mediaId?: string;
  objectFit: "cover" | "contain";
  /** Corner radius, board units. */
  radius: number;
  crop?: ImageCrop;
  filter?: ImageFilter;
};

export type ShapeKind = "rect" | "ellipse" | "line";

export type ShapeLayer = LayerBase & {
  type: "shape";
  shape: ShapeKind;
  fill: string;
  stroke: string;
  strokeWidth: number;
  /** Corner radius for rects, board units. */
  radius: number;
};

export type Layer = TextLayer | ImageLayer | ShapeLayer;

/** A single editable slide. Layers paint bottom-to-top in array order
 *  (index 0 = back). */
export type EditorSlide = {
  id: string;
  width: number;
  height: number;
  background: string;
  layers: Layer[];
};

/* ─── Helpers ─────────────────────────────────────────────────────── */

export function makeLayerId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `ly_${crypto.randomUUID()}`;
  }
  return `ly_${Math.random().toString(36).slice(2)}`;
}

export const DEFAULT_BOARD = 1080;
