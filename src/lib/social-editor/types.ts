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
  /** Layers sharing a non-empty groupId form a FLAT, Canva-style group
   *  (no nesting). Selecting any member selects the whole group so it
   *  moves/transforms together; the layers panel tags grouped members.
   *  Editor-only — the export route ignores it. Undefined === ungrouped,
   *  so older drafts round-trip unchanged. */
  groupId?: string;
  /** Optional custom label shown in the layers panel. When unset the
   *  panel derives a label from the layer's content/type. Editor-only;
   *  the export route ignores it. */
  name?: string;
  /** Hidden layers are skipped on the canvas, the layers panel marks
   *  them, and the export route should SKIP them. Defaults to visible
   *  (undefined === false), so older drafts round-trip unchanged. */
  hidden?: boolean;
  /** Drop shadow, board units. Applied as a CSS box-shadow on the
   *  layer's visual element (text layers also get a matching
   *  text-shadow). null/undefined = no shadow. Both Satori box-shadow
   *  and text-shadow are honoured, so canvas + export match. */
  shadow?: { x: number; y: number; blur: number; color: string } | null;
  /** Layer blur radius, board units. 0/undefined = sharp. Composed into
   *  the CSS `filter` (combined with any image colour filter). */
  blur?: number;
  /** Mirror the layer horizontally (scaleX(-1)) about its centre. The
   *  flip composes with rotation in the transform; geometry (x/y/w/h) is
   *  unchanged. Honoured identically by the live canvas (LayerView) and
   *  the Satori export route. undefined === false (older drafts unchanged). */
  flipH?: boolean;
  /** Mirror the layer vertically (scaleY(-1)) about its centre. */
  flipV?: boolean;
};

export type TextAlign = "left" | "center" | "right" | "justify";

/** Letter-case treatment, applied via CSS textTransform in BOTH
 *  renderers. "none" = as-typed. Generalises the older `uppercase`
 *  boolean (which still works for back-compat — see textCaseFor). */
export type TextCase = "none" | "upper" | "lower" | "title";

/** Bullet / numbered list mode. The stored `text` is NEVER mutated —
 *  the marker prefix is DERIVED at render time (see listDisplayText) so
 *  the canvas and the Satori export show identical markers. */
export type TextList = "none" | "bullet" | "number";

export type TextLayer = LayerBase & {
  type: "text";
  text: string;
  fontFamily: string;
  /** Board-unit font size. */
  fontSize: number;
  fontWeight: number;
  italic: boolean;
  underline: boolean;
  /** Legacy UPPERCASE flag. Kept for back-compat with older drafts and
   *  the preset library; `textCase` (when set) wins. Resolve with
   *  textCaseFor(). */
  uppercase: boolean;
  /** Generalised case mode. Undefined falls back to `uppercase`. */
  textCase?: TextCase;
  /** Line-through decoration, composed with `underline`. */
  strikethrough?: boolean;
  /** Bullet / numbered list mode. undefined === "none". */
  list?: TextList;
  color: string;
  align: TextAlign;
  /** Multiplier (1.2 = 120%). */
  lineHeight: number;
  /** Board-unit tracking. */
  letterSpacing: number;
};

/** Resolve a text layer's effective case mode, honouring the legacy
 *  `uppercase` boolean when the newer `textCase` is unset. Used by BOTH
 *  renderers so canvas + export stay in sync. */
export function textCaseFor(layer: {
  textCase?: TextCase;
  uppercase: boolean;
}): TextCase {
  if (layer.textCase) return layer.textCase;
  return layer.uppercase ? "upper" : "none";
}

/** CSS `textTransform` value for a resolved case mode. */
export function textTransformCss(c: TextCase): CSSTextTransform {
  return c === "upper"
    ? "uppercase"
    : c === "lower"
      ? "lowercase"
      : c === "title"
        ? "capitalize"
        : "none";
}

type CSSTextTransform = "uppercase" | "lowercase" | "capitalize" | "none";

/** CSS `textDecorationLine` for the underline + strikethrough combo.
 *  Returns "none", "underline", "line-through", or both, so the two
 *  decorations compose. Honoured identically in canvas + export. */
export function textDecorationCss(
  underline: boolean,
  strikethrough: boolean | undefined
): string {
  const parts: string[] = [];
  if (underline) parts.push("underline");
  if (strikethrough) parts.push("line-through");
  return parts.length ? parts.join(" ") : "none";
}

/** Derive the DISPLAYED text for a list mode by prefixing each non-empty
 *  line with a marker ("•  " for bullets, "1.  ", "2.  "… for numbers).
 *  The stored `text` is never mutated. Blank lines are passed through
 *  un-numbered so spacing survives. Used identically by LayerView and
 *  the Satori export route so the marker placement matches the PNG. */
export function listDisplayText(
  text: string,
  list: TextList | undefined
): string {
  if (!list || list === "none") return text;
  let n = 0;
  return text
    .split("\n")
    .map((line) => {
      if (!line.trim()) return line;
      if (list === "bullet") return `•  ${line}`;
      n += 1;
      return `${n}.  ${line}`;
    })
    .join("\n");
}

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
  /** Per-corner radius [TL, TR, BR, BL], board units. When set it wins
   *  over `radius`; null/absent falls back to the uniform `radius`. */
  corners?: [number, number, number, number] | null;
  crop?: ImageCrop;
  filter?: ImageFilter;
};

export type ShapeKind = "rect" | "ellipse" | "line";

export type ShapeLayer = LayerBase & {
  type: "shape";
  shape: ShapeKind;
  /** Solid colour OR a CSS gradient string (e.g. a linear-gradient). */
  fill: string;
  stroke: string;
  strokeWidth: number;
  /** Corner radius for rects, board units. */
  radius: number;
  /** Per-corner radius [TL, TR, BR, BL] for rects, board units. When set
   *  it wins over `radius`; null/absent falls back to uniform `radius`. */
  corners?: [number, number, number, number] | null;
  /** Dash length in board units for the stroke. 0/undefined = solid.
   *  >0 = dashed border. (Editor-preview only — see render route note;
   *  Satori does not honour dashed borders.) */
  strokeDash?: number;
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

/** Fresh shared id for a flat group (see LayerBase.groupId). */
export function makeGroupId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `gp_${crypto.randomUUID()}`;
  }
  return `gp_${Math.random().toString(36).slice(2)}`;
}

export const DEFAULT_BOARD = 1080;

/** Trailing `scaleX(-1) scaleY(-1)` fragment for a layer's flip flags,
 *  or "" when neither is set. Appended AFTER translate+rotate (with a
 *  centre transform-origin) so the mirror happens about the layer's own
 *  centre in its rotated frame — position/size unchanged. Used identically
 *  by the live canvas (LayerView) and the Satori export route so previews
 *  match the PNG. */
export function flipTransform(
  flipH: boolean | undefined,
  flipV: boolean | undefined
): string {
  const parts: string[] = [];
  if (flipH) parts.push("scaleX(-1)");
  if (flipV) parts.push("scaleY(-1)");
  return parts.length ? ` ${parts.join(" ")}` : "";
}

/** Resolve a layer's effective border-radius CSS value, scaled to the
 *  display (scale=1 at export). Per-corner `corners` wins over the
 *  uniform `radius`. Returns a `borderRadius` string/number ready to
 *  drop into a style object — used identically by the live canvas
 *  (LayerView) and the Satori export route so previews match the PNG. */
export function cornerRadiusCss(
  corners: [number, number, number, number] | null | undefined,
  radius: number,
  scale = 1
): string | number {
  if (corners && corners.length === 4) {
    const [tl, tr, br, bl] = corners;
    return `${tl * scale}px ${tr * scale}px ${br * scale}px ${bl * scale}px`;
  }
  return radius * scale;
}

/** Human label for a layer in the layers panel / mini-toolbar. Uses a
 *  custom `name` when set, otherwise derives one from the content. */
export function layerLabel(layer: Layer): string {
  if (layer.name && layer.name.trim()) return layer.name.trim();
  if (layer.type === "text") {
    const t = layer.text.replace(/\s+/g, " ").trim();
    return t ? (t.length > 24 ? `${t.slice(0, 24)}…` : t) : "Text";
  }
  if (layer.type === "image") return "Image";
  return layer.shape === "rect"
    ? "Rectangle"
    : layer.shape === "ellipse"
      ? "Ellipse"
      : "Line";
}

/** Axis-aligned bounding box of a layer accounting for rotation about
 *  its centre. Returns board-unit min/max corners — used for align /
 *  distribute and multi-select bounds. */
export function layerAABB(l: LayerBase): {
  x: number;
  y: number;
  w: number;
  h: number;
  cx: number;
  cy: number;
} {
  const cx = l.x + l.w / 2;
  const cy = l.y + l.h / 2;
  if (!l.rotation) {
    return { x: l.x, y: l.y, w: l.w, h: l.h, cx, cy };
  }
  const rad = (l.rotation * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  const bw = l.w * cos + l.h * sin;
  const bh = l.w * sin + l.h * cos;
  return { x: cx - bw / 2, y: cy - bh / 2, w: bw, h: bh, cx, cy };
}

/** Combined AABB of several layers (board units). */
export function unionAABB(layers: LayerBase[]): {
  x: number;
  y: number;
  w: number;
  h: number;
} | null {
  if (layers.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const l of layers) {
    const b = layerAABB(l);
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.w);
    maxY = Math.max(maxY, b.y + b.h);
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}
