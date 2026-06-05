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
  /** Content binding for SAVED TEMPLATE OVERRIDES. When an SMM edits a
   *  template and saves it as the official version, the content-bearing
   *  layers carry a `bind` so that, when the template is later used to build
   *  a slide, the event's real content is re-injected into them (the design
   *  edits stick; the copy/photo still fill). Unset = a fixed/decorative
   *  layer that's kept verbatim. Editor + export ignore it. */
  bind?: TemplateBind;
};

/** Which SlideContent field a template layer re-injects from on use. */
export type TemplateBind = "primary" | "secondary" | "eyebrow" | "accent" | "image";

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
  /** Attribution line for a web/stock photo that legally needs crediting
   *  (CC-BY, Wikimedia, Unsplash/Pexels by their terms), e.g.
   *  "Photo: Jane Doe · Wikimedia · CC BY 4.0". Set automatically when the
   *  SMM picks an external image; rendered as a small overlay pinned to the
   *  bottom of the image in BOTH the editor preview and the export PNG so the
   *  credit travels with the photo. Absent / null for the DR library (own
   *  photos) and public-domain art → no overlay. */
  credit?: string | null;
  objectFit: "cover" | "contain";
  /** Corner radius, board units. */
  radius: number;
  /** Per-corner radius [TL, TR, BR, BL], board units. When set it wins
   *  over `radius`; null/absent falls back to the uniform `radius`. */
  corners?: [number, number, number, number] | null;
  crop?: ImageCrop;
  filter?: ImageFilter;
  /** "Use shape as mask" (Figma-style). When set to a sibling SHAPE
   *  layer's id, the image is clipped to that shape's box: the shape's
   *  geometry becomes the visible window (rect → corners, ellipse → 50%
   *  radius), and the image shows only where it overlaps that window —
   *  keeping its own position/scale (offset = imageBox − maskBox). The
   *  mask shape stops painting its own fill (it's just the window) but
   *  stays selectable/editable. Optional + additive, so older slides /
   *  presets round-trip unchanged. A maskLayerId pointing at a missing or
   *  unsupported (non-maskable) shape is IGNORED — the image renders
   *  normally — so deleting the mask cleanly releases the image. */
  maskLayerId?: string;
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

/* ─── Components + variants (Wave 2c) ─────────────────────────────────
 * A COMPONENT is a reusable, named definition built from a set of layers,
 * stored in a DECK-LEVEL registry (so it's reusable across every slide).
 * An INSTANCE is a placement layer (`type:"instance"`) that references a
 * component (+ a chosen variant) and renders the master's layers, with
 * optional per-instance overrides. Editing the master updates every
 * instance (except overridden props).
 *
 * VARIANTS are modelled as SEPARATE layer-sets: each variant carries its
 * own `layers` array (its own master). Switching an instance's variant
 * swaps which layer-set expands. "Add variant" duplicates the current
 * variant's layers under a new name. This keeps the model dead-simple and
 * predictable (no per-variant prop-delta resolution) — Canva-simple.
 *
 * The component's layers live in the component's OWN local board space
 * (origin 0,0, size width×height). At expansion time the instance's box
 * (x/y/w/h) scales + translates the master layers to fit, so one
 * definition can be placed at any size/position. Everything here is
 * additive + optional, so decks/drafts/presets without components (no
 * `instance` layers, no registry) round-trip completely unchanged. */

/** One variant of a component — its own complete layer-set (master). */
export type ComponentVariant = {
  /** Stable id (unique within the component). */
  id: string;
  /** Display name shown in the variant dropdown (e.g. "Gold", "Forest"). */
  name: string;
  /** The variant's master layers, in the component's local board space
   *  (laid out from origin 0,0 within width×height). NEVER contains
   *  another instance layer (components don't nest). */
  layers: Layer[];
  /** Optional per-group metadata (auto-layout config), keyed by groupId,
   *  captured when the source selection contained an auto-layout group.
   *  Merged into the expanded slide's `groups` (remapped to
   *  instance-scoped ids) by expandSlide so a component holding an
   *  auto-layout group reflows correctly on canvas + export. Absent ===
   *  the variant has no auto-layout groups. */
  groups?: Record<string, GroupMeta>;
};

/** A reusable component definition (lives in the deck-level registry). */
export type ComponentDef = {
  id: string;
  name: string;
  /** Intrinsic local size, board units — the design size the variants'
   *  layers were authored at. An instance box scales relative to this. */
  width: number;
  height: number;
  /** ≥1 named variant. The first is the default. */
  variants: ComponentVariant[];
};

/** Deck-level component registry, keyed by componentId. */
export type ComponentRegistry = Record<string, ComponentDef>;

/** Per-instance override of a single master layer's content. Keyed in
 *  InstanceLayer.overrides by the MASTER layer's id (stable across
 *  variants only when the layer ids line up — overrides are matched by id
 *  and silently ignored when a variant lacks that layer, so switching
 *  variants degrades gracefully). Only the Figma-core overridable props
 *  are supported: text content, image src/mediaId, and fill colour. */
export type LayerOverride = {
  text?: string;
  src?: string;
  mediaId?: string;
  /** Fill for shapes / colour for text (applied to whichever the master
   *  layer supports). */
  fill?: string;
};

/** A placement of a component on a slide. Carries its own box geometry
 *  (LayerBase x/y/w/h/rotation/opacity/…) so it transforms like any
 *  layer; at render time it EXPANDS into the master(variant)'s concrete
 *  layers, scaled into this box, with per-instance overrides applied. */
export type InstanceLayer = LayerBase & {
  type: "instance";
  /** Registry key of the referenced component. */
  componentId: string;
  /** Chosen variant id. Undefined / missing → the component's first
   *  variant (graceful fallback). */
  variant?: string;
  /** Per-master-layer overrides, keyed by the master layer's id. */
  overrides?: Record<string, LayerOverride>;
};

export type Layer = TextLayer | ImageLayer | ShapeLayer | InstanceLayer;

/* ─── Shape-as-mask ("use as mask", Figma-style) ──────────────────────
 * An image layer may carry `maskLayerId` → a sibling SHAPE that acts as
 * its clip window. We support ONLY rect (incl. rounded-rect via corners /
 * radius) and ellipse(circle) masks, because Satori reliably honours
 * `overflow:hidden` + `border-radius` (per-corner + 50%) but NOT arbitrary
 * clip-path / vector paths. Lines (and any future unsupported kind) are
 * therefore never offered as masks, guaranteeing canvas↔PNG parity. */

/** Whether a shape kind can be used as an image mask. */
export function isMaskableShapeKind(kind: ShapeKind): boolean {
  return kind === "rect" || kind === "ellipse";
}

/** Whether a layer is a shape usable as a mask (maskable kind). */
export function isMaskableShape(layer: Layer): layer is ShapeLayer {
  return layer.type === "shape" && isMaskableShapeKind(layer.shape);
}

/** Resolve the effective mask SHAPE for an image layer, or null when the
 *  image isn't masked (no maskLayerId) OR the referenced layer is missing
 *  / not a maskable shape (a dangling mask — the image then renders
 *  normally). Used by BOTH renderers so canvas = PNG. */
export function resolveMaskShape(
  image: ImageLayer,
  layers: Layer[]
): ShapeLayer | null {
  if (!image.maskLayerId) return null;
  const m = layers.find((l) => l.id === image.maskLayerId);
  if (!m || !isMaskableShape(m)) return null;
  return m;
}

/** The set of shape ids that are CURRENTLY acting as a mask for some
 *  (non-hidden) image on the slide. A masking shape paints no fill — it's
 *  just the clip window — so both renderers skip drawing it. */
export function activeMaskShapeIds(layers: Layer[]): Set<string> {
  const ids = new Set<string>();
  for (const l of layers) {
    if (l.type !== "image" || l.hidden) continue;
    const m = resolveMaskShape(l, layers);
    if (m) ids.add(m.id);
  }
  return ids;
}

/** Border-radius CSS for a mask shape's clip window, scaled to display.
 *  Ellipse → 50% (pill/circle); rect → its per-corner `corners` or uniform
 *  `radius`. Used identically by the canvas + export so the window matches. */
export function maskRadiusCss(mask: ShapeLayer, scale = 1): string | number {
  if (mask.shape === "ellipse") return "50%";
  return cornerRadiusCss(mask.corners, mask.radius, scale);
}

/* ─── Auto-layout (Figma-style flex on a group) ───────────────────────
 * A group (layers sharing a `groupId`) can opt into auto-layout: its
 * members are arranged automatically inside the group's bounding box
 * (a flex row/column) instead of holding independent absolute coords.
 * The config is stored at the GROUP level on `EditorSlide.groups` so the
 * flat groupId model is untouched — a group with no entry (or no
 * `autoLayout`) behaves exactly as before. Everything is OPTIONAL so
 * existing slides/presets round-trip unchanged. All values are board
 * units. */
export type AutoLayoutDirection = "row" | "column";
export type AutoLayoutAlign = "start" | "center" | "end" | "stretch";
export type AutoLayoutJustify = "start" | "center" | "end" | "between";

export type AutoLayout = {
  direction: AutoLayoutDirection;
  /** Space between adjacent children, board units. */
  gap: number;
  /** Horizontal padding inside the frame, board units. */
  padX: number;
  /** Vertical padding inside the frame, board units. */
  padY: number;
  /** Cross-axis placement of children. "stretch" makes children fill the
   *  cross-axis. */
  align: AutoLayoutAlign;
  /** Main-axis distribution. "between" spreads free space between
   *  children (first/last pinned to the padding edges). */
  justify: AutoLayoutJustify;
};

/** Sensible default for a freshly-enabled auto-layout group. */
export function defaultAutoLayout(): AutoLayout {
  return { direction: "column", gap: 24, padX: 0, padY: 0, align: "start", justify: "start" };
}

/** Box for a frame / laid-out child (board units). */
export type LaidOutBox = { x: number; y: number; w: number; h: number };

/** Per-group metadata, keyed by groupId. */
export type GroupMeta = {
  autoLayout?: AutoLayout;
  /** The auto-layout container box (board units). Children flow inside
   *  it. Stored explicitly (rather than re-derived from the members'
   *  union each time) so reflow is idempotent — packing children to the
   *  top-left would otherwise shrink a derived box on every pass. Seeded
   *  from the members' union AABB when auto-layout is first enabled, and
   *  updated when the frame is dragged/resized. Only meaningful when
   *  `autoLayout` is set. */
  frame?: LaidOutBox;
};

/** A single editable slide. Layers paint bottom-to-top in array order
 *  (index 0 = back). */
export type EditorSlide = {
  id: string;
  width: number;
  height: number;
  background: string;
  layers: Layer[];
  /** Optional per-group metadata (auto-layout config), keyed by groupId.
   *  Undefined/absent === all groups are plain absolute groups, so older
   *  drafts and presets round-trip unchanged. */
  groups?: Record<string, GroupMeta>;
};

/** The whole editable document: the filmstrip of slides plus the
 *  deck-level component registry. The registry is undefined/absent when
 *  no components exist, so older drafts (slides only) round-trip
 *  unchanged. Held as ONE history state so create-component, master
 *  edits, variant changes and slide edits all share undo/redo. */
export type EditorDeck = {
  slides: EditorSlide[];
  /** Reusable component definitions, keyed by componentId. Undefined ===
   *  no components yet. */
  components?: ComponentRegistry;
};

/* ─── Component / instance expansion ──────────────────────────────────
 * The SINGLE source of truth for turning instance layers into concrete
 * layers. Called identically by the live canvas, thumbnails AND the
 * Satori export route, so the PNG matches the stage exactly. */

/** Resolve the variant an instance points at, falling back to the
 *  component's first variant when the chosen one is missing (graceful —
 *  never crashes on a stale variant id). Returns null when the component
 *  itself is missing or has no variants. */
export function resolveVariant(
  def: ComponentDef | undefined,
  variantId: string | undefined
): ComponentVariant | null {
  if (!def || def.variants.length === 0) return null;
  if (variantId) {
    const v = def.variants.find((x) => x.id === variantId);
    if (v) return v;
  }
  return def.variants[0]!;
}

/** Apply a single per-instance override to a master layer (by id). Only
 *  text content, image src/mediaId and fill/colour are overridable; an
 *  override key the layer doesn't support is ignored. */
function applyOverride(layer: Layer, ov: LayerOverride | undefined): Layer {
  if (!ov) return layer;
  if (layer.type === "text") {
    const next = { ...layer };
    if (ov.text !== undefined) next.text = ov.text;
    if (ov.fill !== undefined) next.color = ov.fill;
    return next;
  }
  if (layer.type === "image") {
    const next = { ...layer };
    if (ov.src !== undefined) next.src = ov.src;
    if (ov.mediaId !== undefined) next.mediaId = ov.mediaId;
    return next;
  }
  if (layer.type === "shape") {
    const next = { ...layer };
    if (ov.fill !== undefined) next.fill = ov.fill;
    return next;
  }
  return layer;
}

/** Expand ONE instance layer into its concrete layers: the master
 *  variant's layers, transformed from the component's local space into
 *  the instance's box (scale + translate), with per-instance overrides
 *  applied and fresh ids prefixed by the instance id (so intra-instance
 *  references — group ids, mask links — stay scoped to this instance and
 *  never collide with the slide's own layers or with other instances of
 *  the same component).
 *
 *  Returns [] when the component/variant can't be resolved (missing
 *  component, empty variants) so a dangling instance renders as nothing
 *  rather than crashing — the caller composes that into the slide.
 *
 *  Geometry: master layers are authored in the component's width×height
 *  local frame; we scale by (instance.w/width, instance.h/height) and
 *  translate to the instance's top-left. Mask windows / corner radii /
 *  stroke widths are board-unit values that scale with `sx`/`sy` too.
 *
 *  The instance's OWN rotation + opacity are NOT composed here — they are
 *  applied once by the instance's wrapper (LayerView on the canvas, the
 *  per-instance wrapper in the export route), so painting matches whether
 *  the instance is rotated or faded. Each expanded child keeps only its
 *  master rotation/opacity. */
export function expandInstance(
  def: ComponentDef | undefined,
  instance: InstanceLayer
): Layer[] {
  const variant = resolveVariant(def, instance.variant);
  if (!def || !variant) return [];
  const sx = def.width ? instance.w / def.width : 1;
  const sy = def.height ? instance.h / def.height : 1;
  const overrides = instance.overrides ?? {};

  // 1) Auto-layout INSIDE the component: resolve the variant's group
  //    layout in the component's LOCAL space first (so a component holding
  //    an auto-layout group reflows), then we scale/translate the result
  //    into the instance box below. Composing with auto-layout (Wave 2a)
  //    happens HERE, before masking, so all three layer kinds compose.
  const localLayout = variant.groups
    ? resolveSlideLayout({
        id: def.id,
        width: def.width,
        height: def.height,
        background: "#fff",
        layers: variant.layers,
        groups: variant.groups,
      })
    : null;
  const localBox = (l: Layer): LaidOutBox =>
    localLayout?.get(l.id) ?? { x: l.x, y: l.y, w: l.w, h: l.h };

  // 2) Remap master layer ids → instance-scoped ids, and rewrite intra-set
  //    references (maskLayerId) through the same map.
  const idMap = new Map<string, string>();
  for (const l of variant.layers) idMap.set(l.id, `${instance.id}__${l.id}`);

  return variant.layers.map((master) => {
    const lb = localBox(master);
    const withOv = applyOverride(master, overrides[master.id]);
    const scaled: Layer = {
      ...withOv,
      id: idMap.get(master.id)!,
      x: instance.x + lb.x * sx,
      y: instance.y + lb.y * sy,
      w: lb.w * sx,
      h: lb.h * sy,
      // The expanded layers are not independently selectable on the slide
      // — the INSTANCE is the selectable unit — so mark them locked, and
      // drop the groupId (layout is already baked into the coords above,
      // so the flat output needs no group metadata).
      locked: true,
      groupId: undefined,
    };
    // Scale font size + spacing for text.
    if (scaled.type === "text") {
      const m = withOv as TextLayer;
      scaled.fontSize = m.fontSize * sy;
      scaled.letterSpacing = m.letterSpacing * sx;
    }
    // Re-link a mask reference to the instance-scoped shape id.
    if (scaled.type === "image" && scaled.maskLayerId) {
      scaled.maskLayerId = idMap.get(scaled.maskLayerId) ?? scaled.maskLayerId;
    }
    return scaled;
  });
}

/** Expand EVERY instance layer on a slide into concrete layers, in place
 *  (preserving z-order). Non-instance layers pass through untouched.
 *  Returns a plain Layer[] containing NO instance layers — ready to feed
 *  the existing layout/mask resolvers and renderers. This is THE function
 *  the canvas, thumbnails and export all call first, guaranteeing parity.
 *
 *  Auto-layout note: a component's master layers may themselves form an
 *  auto-layout group. We surface that by merging the variant's per-group
 *  metadata (remapped to instance-scoped group ids + frames placed in the
 *  instance box) — see expandSlide, which returns the merged groups too. */
export function expandSlideLayers(
  slide: EditorSlide,
  registry: ComponentRegistry | undefined
): Layer[] {
  if (!slide.layers.some((l) => l.type === "instance")) return slide.layers;
  const out: Layer[] = [];
  for (const l of slide.layers) {
    if (l.type !== "instance") {
      out.push(l);
      continue;
    }
    if (l.hidden) continue; // an expanded hidden instance contributes nothing
    out.push(...expandInstance(registry?.[l.componentId], l));
  }
  return out;
}

/** Expand a slide into a concrete EditorSlide whose layers contain no
 *  instances (via expandSlideLayers). A component's internal auto-layout
 *  is already baked into the expanded children's coordinates by
 *  expandInstance, so the slide's own `groups` pass through untouched. The
 *  result is a normal EditorSlide that resolveSlideLayout /
 *  resolveMaskShape / the renderers consume unchanged — so a component
 *  containing an auto-layout group or a masked image renders correctly on
 *  both canvas and PNG. */
export function expandSlide(
  slide: EditorSlide,
  registry: ComponentRegistry | undefined
): EditorSlide {
  if (!slide.layers.some((l) => l.type === "instance")) return slide;
  return { ...slide, layers: expandSlideLayers(slide, registry) };
}

/** Resolve the auto-layout config for a group on a slide, or null when
 *  the group is a plain absolute group (no entry / no autoLayout). */
export function autoLayoutFor(
  slide: { groups?: Record<string, GroupMeta> },
  groupId: string | undefined
): AutoLayout | null {
  if (!groupId) return null;
  return slide.groups?.[groupId]?.autoLayout ?? null;
}

/**
 * Pure auto-layout solver. Given a group's `frame` box (board units) and
 * its `children` in flow order, returns a Map<layerId, {x,y,w,h}> placing
 * each child inside the frame per the config. BOTH the live canvas and
 * the Satori export call THIS so the layout is pixel-identical.
 *
 * - The main axis follows `direction` (row = x, column = y).
 * - `gap` separates adjacent children; `padX`/`padY` inset the content.
 * - `align` places children on the cross axis; "stretch" fills it.
 * - `justify` distributes children on the main axis; "between" spreads
 *   the free space between them (first/last pinned to the inner edges).
 * Children keep their own size unless "stretch" overrides the cross axis.
 */
export function computeAutoLayout(
  config: AutoLayout,
  frame: LaidOutBox,
  children: { id: string; w: number; h: number }[]
): Map<string, LaidOutBox> {
  const out = new Map<string, LaidOutBox>();
  if (children.length === 0) return out;

  const row = config.direction === "row";
  const innerX = frame.x + config.padX;
  const innerY = frame.y + config.padY;
  const innerW = Math.max(0, frame.w - config.padX * 2);
  const innerH = Math.max(0, frame.h - config.padY * 2);

  // Main-axis extent available, and the children's total main size + gaps.
  const mainSpace = row ? innerW : innerH;
  const crossSpace = row ? innerH : innerW;
  const mainSizes = children.map((c) => (row ? c.w : c.h));
  const totalMain = mainSizes.reduce((s, v) => s + v, 0);
  const totalGap = config.gap * Math.max(0, children.length - 1);
  const free = mainSpace - totalMain - totalGap;

  // Where the first child starts on the main axis, and the gap between
  // children, per `justify`. "between" pins first/last to the edges and
  // spreads the slack; the others bias the whole block.
  let cursor = row ? innerX : innerY;
  let gap = config.gap;
  if (config.justify === "between" && children.length > 1) {
    gap = config.gap + Math.max(0, free) / (children.length - 1);
  } else if (config.justify === "center") {
    cursor += free / 2;
  } else if (config.justify === "end") {
    cursor += free;
  }

  for (let i = 0; i < children.length; i++) {
    const c = children[i]!;
    const mainSize = row ? c.w : c.h;
    let crossSize = row ? c.h : c.w;
    // Cross-axis offset within the inner box.
    let crossPos = row ? innerY : innerX;
    if (config.align === "stretch") {
      crossSize = crossSpace;
    } else if (config.align === "center") {
      crossPos += (crossSpace - crossSize) / 2;
    } else if (config.align === "end") {
      crossPos += crossSpace - crossSize;
    }
    const box: LaidOutBox = row
      ? { x: cursor, y: crossPos, w: mainSize, h: crossSize }
      : { x: crossPos, y: cursor, w: crossSize, h: mainSize };
    out.set(c.id, box);
    cursor += mainSize + gap;
  }
  return out;
}

/**
 * Resolve the laid-out boxes for EVERY auto-layout group on a slide, in
 * one pass, returning a flat Map<layerId, box> of overrides. Layers not
 * in an auto-layout group are absent (they keep their stored coords).
 *
 * Each group's container box is the stored `frame` (see GroupMeta.frame),
 * falling back to the members' union AABB when no frame is stored yet
 * (e.g. a freshly-decoded draft). Children flow inside the frame in array
 * (z) order. Used by the live canvas (via the editor), the Satori export
 * route, and thumbnails — ONE source of truth, so canvas = PNG. */
export function resolveSlideLayout(
  slide: EditorSlide
): Map<string, LaidOutBox> {
  const overrides = new Map<string, LaidOutBox>();
  const groups = slide.groups;
  if (!groups) return overrides;
  // Bucket members by groupId, preserving array (z) order as flow order.
  const byGroup = new Map<string, Layer[]>();
  for (const l of slide.layers) {
    if (!l.groupId) continue;
    if (!groups[l.groupId]?.autoLayout) continue;
    const list = byGroup.get(l.groupId) ?? [];
    list.push(l);
    byGroup.set(l.groupId, list);
  }
  for (const [gid, members] of byGroup) {
    const meta = groups[gid]!;
    const config = meta.autoLayout!;
    if (members.length === 0) continue;
    const frame = meta.frame ?? unionAABB(members)!;
    const boxes = computeAutoLayout(
      config,
      frame,
      members.map((m) => ({ id: m.id, w: m.w, h: m.h }))
    );
    for (const [id, box] of boxes) overrides.set(id, box);
  }
  return overrides;
}

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

/** Fresh id for a component definition (deck-level registry key). */
export function makeComponentId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `cmp_${crypto.randomUUID()}`;
  }
  return `cmp_${Math.random().toString(36).slice(2)}`;
}

/** Fresh id for a component variant. */
export function makeVariantId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `var_${crypto.randomUUID()}`;
  }
  return `var_${Math.random().toString(36).slice(2)}`;
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
  if (layer.type === "instance") return "Component";
  return layer.shape === "rect"
    ? "Rectangle"
    : layer.shape === "ellipse"
      ? "Ellipse"
      : "Line";
}

/** Human label for an instance layer, preferring its custom name, then
 *  the referenced component's name, falling back to "Component". */
export function instanceLabel(
  layer: InstanceLayer,
  registry: ComponentRegistry | undefined
): string {
  if (layer.name && layer.name.trim()) return layer.name.trim();
  const def = registry?.[layer.componentId];
  return def?.name?.trim() || "Component";
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
