"use client";

/**
 * Canva-style contextual toolbar, layers panel, alignment toolbar, and
 * the supporting popovers + image picker.
 *
 * The contextual toolbar swaps content controls by layer type (text /
 * image / shape) and always exposes shared property controls (opacity,
 * lock, position/size, rotation, arrange). Everything writes back
 * through onChange callbacks the editor commits to history.
 */

import { useRef, useState, type ReactNode } from "react";
import type { ImageCandidate } from "@/lib/social-templates/types";
import type {
  AutoLayout,
  AutoLayoutAlign,
  AutoLayoutDirection,
  AutoLayoutJustify,
  ComponentDef,
  ImageCrop,
  InstanceLayer,
  Layer,
  LayerOverride,
  ShapeKind,
  TextAlign,
  TextCase,
  TextList,
} from "@/lib/social-editor/types";
import { listDisplayText, resolveVariant, textCaseFor } from "@/lib/social-editor/types";
import { FONT_OPTIONS, bareFamily, nearestWeight } from "@/lib/social-editor/fonts";
import { FILTER_PRESETS } from "@/lib/social-editor/imageStyle";
import {
  AnchoredPanel,
  NumField,
  ColorField,
  AlignIcon,
  DistributeIcon,
  LayerUpIcon,
  LockIcon,
  EyeIcon,
  TrashIcon,
  DuplicateIcon,
  ShapeIcon,
  GripIcon,
  ImageIcon,
  TextIcon,
  GroupIcon,
  UngroupIcon,
  FlipIcon,
  AutoLayoutIcon,
  MaskIcon,
  ComponentIcon,
  DetachIcon,
  EditIcon,
} from "./editorUi";
import { layerLabel, instanceLabel } from "@/lib/social-editor/types";
import type { ComponentRegistry } from "@/lib/social-editor/types";

/** Cyclic accent colours for the layers-panel group indicator (left rail
 *  + chip), so distinct groups stay visually separable. */
const GROUP_ACCENTS = ["#2D6A2E", "#D4A843", "#5B6CB8", "#C0392B", "#1F8F8F"];

/* ─── Gradient fill helpers ───────────────────────────────────────────
 * A shape's `fill` is either a solid colour or a CSS gradient string.
 * The toolbar's Gradient mode produces a simple 2-stop linear-gradient
 * (`linear-gradient(<angle>deg, <c0> 0%, <c1> 100%)`) and round-trips it
 * back through this small parser so re-opening the control restores the
 * angle + stops. Anything more exotic (the brand SCRIM/GLOW/DUO presets)
 * still renders fine — it's just shown as "Gradient" and edited as a
 * fresh 2-stop when toggled. */
type Grad = { angle: number; c0: string; c1: string };

const DEFAULT_GRAD: Grad = { angle: 135, c0: "#163827", c1: "#D4A843" };

function isGradient(fill: string): boolean {
  return /gradient\s*\(/i.test(fill);
}

function gradientCss(g: Grad): string {
  return `linear-gradient(${Math.round(g.angle)}deg, ${g.c0} 0%, ${g.c1} 100%)`;
}

/** Best-effort parse of a 2-stop linear-gradient back into {angle,c0,c1}.
 *  Falls back to DEFAULT_GRAD for gradients we didn't author. */
function parseGradient(fill: string): Grad {
  const angleMatch = fill.match(/(-?\d+(?:\.\d+)?)deg/);
  const colors = fill.match(/#[0-9a-f]{3,8}|rgba?\([^)]*\)/gi) ?? [];
  return {
    angle: angleMatch ? Number(angleMatch[1]) : DEFAULT_GRAD.angle,
    c0: colors[0] ?? DEFAULT_GRAD.c0,
    c1: colors[1] ?? colors[0] ?? DEFAULT_GRAD.c1,
  };
}

export type AlignKind =
  | "left" | "hcenter" | "right"
  | "top" | "vcenter" | "bottom"
  | "dist-h" | "dist-v";

/* ─── Contextual toolbar ──────────────────────────────────────────── */

/** The two resolved brand-logo urls (green = primary/on-light,
 *  white = on-dark), so a selected "brand-logo" image layer can offer a
 *  one-tap White ⇄ Green swap. Null when an asset isn't uploaded. */
export type BrandLogos = { white: string | null; green: string | null };

export function ContextToolbar({
  layer,
  onChange,
  onReplaceImage,
  onDuplicate,
  onDelete,
  onArrange,
  brandLogos,
}: {
  layer: Layer;
  onChange: (patch: Partial<Layer>) => void;
  onReplaceImage: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onArrange: (dir: "front" | "back" | "forward" | "backward") => void;
  brandLogos?: BrandLogos;
}) {
  return (
    <div className="flex items-center gap-1.5 [&>*]:shrink-0">
      {layer.type === "text" && <TextControls layer={layer} onChange={onChange} />}
      {layer.type === "image" && (
        <ImageControls layer={layer} onChange={onChange} onReplaceImage={onReplaceImage} brandLogos={brandLogos} />
      )}
      {layer.type === "shape" && <ShapeControls layer={layer} onChange={onChange} />}

      <Divider />
      {/* Per-corner radius for shapes (rect) + images. Lines/ellipses skip. */}
      {((layer.type === "shape" && layer.shape === "rect") || layer.type === "image") && (
        <CornersPopover layer={layer} onChange={onChange} />
      )}
      <EffectsPopover layer={layer} onChange={onChange} />
      <PositionPopover layer={layer} onChange={onChange} />
      <OpacityPopover value={layer.opacity} onChange={(opacity) => onChange({ opacity })} />
      <ArrangePopover onArrange={onArrange} />

      <Divider />
      <IconBtn label="Flip horizontal" active={!!layer.flipH} onClick={() => onChange({ flipH: !layer.flipH })}>
        <FlipIcon axis="h" />
      </IconBtn>
      <IconBtn label="Flip vertical" active={!!layer.flipV} onClick={() => onChange({ flipV: !layer.flipV })}>
        <FlipIcon axis="v" />
      </IconBtn>
      <Divider />
      <IconBtn label={layer.locked ? "Unlock" : "Lock"} active={layer.locked} onClick={() => onChange({ locked: !layer.locked })}>
        <LockIcon open={!layer.locked} />
      </IconBtn>
      <IconBtn label="Duplicate" onClick={onDuplicate}><DuplicateIcon /></IconBtn>
      <IconBtn label="Delete" danger onClick={onDelete}><TrashIcon /></IconBtn>
    </div>
  );
}

function TextControls({
  layer,
  onChange,
}: {
  layer: Extract<Layer, { type: "text" }>;
  onChange: (patch: Partial<Layer>) => void;
}) {
  const fam = bareFamily(layer.fontFamily);
  const famOpt = FONT_OPTIONS.find((o) => o.family === fam);
  const famLabel = famOpt?.label ?? fam;
  const weights = famOpt?.weights ?? [400, 700];
  return (
    <>
      <Popover label={famLabel} wide>
        {(close) => (
          <div className="max-h-72 overflow-auto py-1 w-52">
            {FONT_OPTIONS.map((o) => (
              <button
                key={o.family}
                type="button"
                onClick={() => {
                  onChange({ fontFamily: o.family, fontWeight: nearestWeight(o.family, layer.fontWeight) });
                  close();
                }}
                style={{ fontFamily: o.family }}
                className={`w-full text-left px-3 py-2 text-[15px] rounded-md hover:bg-charcoal/5 ${fam === o.family ? "bg-green/10 text-green" : "text-charcoal/80"}`}
              >
                {o.label}
              </button>
            ))}
          </div>
        )}
      </Popover>

      <Stepper
        value={Math.round(layer.fontSize)}
        onChange={(v) => onChange({ fontSize: Math.max(6, Math.min(1080, v)) })}
      />

      <ColorField label="Colour" value={layer.color} onChange={(color) => onChange({ color })} />

      <Divider />

      <WeightPopover weights={weights} value={layer.fontWeight} onChange={(fontWeight) => onChange({ fontWeight })} />
      <Toggle on={layer.fontWeight >= 700} onClick={() => onChange({ fontWeight: layer.fontWeight >= 700 ? 400 : 700 })}>B</Toggle>
      <Toggle on={layer.italic} onClick={() => onChange({ italic: !layer.italic })}><span className="italic">I</span></Toggle>
      <Toggle on={layer.underline} onClick={() => onChange({ underline: !layer.underline })}><span className="underline">U</span></Toggle>
      <Toggle on={!!layer.strikethrough} onClick={() => onChange({ strikethrough: !layer.strikethrough })}><span className="line-through">S</span></Toggle>
      <CasePopover value={textCaseFor(layer)} onChange={(textCase) => onChange({ textCase, uppercase: textCase === "upper" })} />

      <Divider />

      <AlignCycle value={layer.align} onChange={(align) => onChange({ align })} />
      <ListCycle value={layer.list ?? "none"} onChange={(list) => onChange({ list })} />
      <FitBoxBtn layer={layer} onChange={onChange} />

      <Popover label="Spacing">
        {() => (
          <div className="w-56 p-3 flex flex-col gap-3">
            <Slider label={`Line height · ${layer.lineHeight.toFixed(2)}`} min={0.8} max={2} step={0.05} value={layer.lineHeight} onChange={(v) => onChange({ lineHeight: v })} />
            <Slider label={`Letter spacing · ${layer.letterSpacing}`} min={-5} max={30} step={1} value={layer.letterSpacing} onChange={(v) => onChange({ letterSpacing: v })} />
          </div>
        )}
      </Popover>
    </>
  );
}

/** Case mode dropdown: As-typed / UPPERCASE / lowercase / Title Case.
 *  Writes `textCase` (and keeps the legacy `uppercase` boolean in sync via
 *  the caller) so both renderers and older drafts agree. */
function CasePopover({ value, onChange }: { value: TextCase; onChange: (v: TextCase) => void }) {
  const OPTS: { id: TextCase; label: string; preview: string }[] = [
    { id: "none", label: "As typed", preview: "Aa" },
    { id: "upper", label: "UPPERCASE", preview: "AA" },
    { id: "lower", label: "lowercase", preview: "aa" },
    { id: "title", label: "Title Case", preview: "Aa" },
  ];
  const current = OPTS.find((o) => o.id === value) ?? OPTS[0]!;
  return (
    <Popover label={current.preview}>
      {(close) => (
        <div className="w-40 py-1">
          {OPTS.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => { onChange(o.id); close(); }}
              className={`w-full text-left px-3 py-1.5 text-[13px] hover:bg-charcoal/5 ${value === o.id ? "text-green" : "text-charcoal/75"}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </Popover>
  );
}

/** Cycle bullet / numbered / no list. The marker is derived at render
 *  time in both renderers — this only flips the `list` mode. */
function ListCycle({ value, onChange }: { value: TextList; onChange: (v: TextList) => void }) {
  const next: TextList = value === "none" ? "bullet" : value === "bullet" ? "number" : "none";
  const active = value !== "none";
  return (
    <button
      type="button"
      onClick={() => onChange(next)}
      title={`List: ${value === "none" ? "off" : value}`}
      className={`w-9 h-9 rounded-lg grid place-items-center transition ${active ? "bg-green/10 text-green" : "text-charcoal/65 hover:bg-charcoal/5"}`}
    >
      {value === "number" ? <ListNumberIcon /> : <ListBulletIcon />}
    </button>
  );
}

/** "Fit box to text" — measures the rendered text node on the canvas and
 *  resizes the layer's height (and width when the box is currently
 *  narrower than the content) to wrap it snugly. Manual (a click) so it
 *  never fights the user mid-type. Measurement is DOM-based: we clone the
 *  on-canvas text node's geometry into an off-screen measuring div using
 *  the layer's own board-unit metrics (scale-independent). */
function FitBoxBtn({
  layer,
  onChange,
}: {
  layer: Extract<Layer, { type: "text" }>;
  onChange: (patch: Partial<Layer>) => void;
}) {
  function fit() {
    const size = measureText(layer);
    if (size) {
      onChange({ w: Math.max(1, Math.ceil(size.w)), h: Math.max(1, Math.ceil(size.h)) });
      return;
    }
    // Fallback (no DOM / measurement failed): height from line count.
    const lines = listDisplayText(layer.text, layer.list).split("\n").length || 1;
    onChange({ h: Math.max(1, Math.ceil(lines * layer.fontSize * layer.lineHeight)) });
  }
  return (
    <button
      type="button"
      onClick={fit}
      title="Fit box to text"
      className="w-9 h-9 rounded-lg grid place-items-center text-charcoal/65 hover:bg-charcoal/5 transition"
    >
      <FitBoxIcon />
    </button>
  );
}

/** Measure a text layer's natural size in BOARD UNITS by rendering its
 *  displayed string into an off-screen div with the same typographic
 *  metrics. Returns board-unit {w,h}; null if the DOM isn't available.
 *  Width is measured wrapping at the current box width (so multi-line
 *  text keeps its wrap) and reads the natural content height. */
function measureText(layer: Extract<Layer, { type: "text" }>): { w: number; h: number } | null {
  if (typeof document === "undefined") return null;
  const el = document.createElement("div");
  el.style.position = "absolute";
  el.style.visibility = "hidden";
  el.style.left = "-99999px";
  el.style.top = "0";
  el.style.boxSizing = "border-box";
  // Board units == px here (the off-screen node isn't scaled), matching
  // the renderers' scale-1 export geometry.
  el.style.fontFamily = layer.fontFamily;
  el.style.fontSize = `${layer.fontSize}px`;
  el.style.fontWeight = String(layer.fontWeight);
  el.style.fontStyle = layer.italic ? "italic" : "normal";
  el.style.lineHeight = String(layer.lineHeight);
  el.style.letterSpacing = `${layer.letterSpacing}px`;
  el.style.textTransform =
    textCaseFor(layer) === "upper"
      ? "uppercase"
      : textCaseFor(layer) === "lower"
        ? "lowercase"
        : textCaseFor(layer) === "title"
          ? "capitalize"
          : "none";
  el.style.whiteSpace = "pre-wrap";
  el.style.wordBreak = "break-word";
  // Constrain to the current box width so wrapping (and the measured
  // height) matches what's on the canvas.
  el.style.width = `${Math.max(1, layer.w)}px`;
  el.textContent = listDisplayText(layer.text, layer.list) || " ";
  document.body.appendChild(el);
  // Height that snugly wraps the text at the current box width.
  const h = el.scrollHeight;
  document.body.removeChild(el);
  // Respect the user's box width; only snap the height to the content.
  return { w: layer.w, h };
}

function ImageControls({
  layer,
  onChange,
  onReplaceImage,
  brandLogos,
}: {
  layer: Extract<Layer, { type: "image" }>;
  onChange: (patch: Partial<Layer>) => void;
  onReplaceImage: () => void;
  brandLogos?: BrandLogos;
}) {
  // A brand-logo layer (seeded by a preset OR inserted from the rail) gets a
  // White ⇄ Green variant toggle so the SMM can recolour the DR mark in place
  // rather than treating it as just another swappable image. Only shown when
  // BOTH variants are uploaded and actually differ.
  const isBrandLogo =
    layer.name === "brand-logo" &&
    !!brandLogos?.white &&
    !!brandLogos?.green &&
    brandLogos.white !== brandLogos.green;
  const variant: "white" | "green" | null = isBrandLogo
    ? layer.src === brandLogos!.white
      ? "white"
      : "green"
    : null;
  return (
    <>
      {isBrandLogo ? (
        <>
          <span className="text-[11px] font-medium text-charcoal/45 pl-0.5">Logo</span>
          <div className="flex items-center rounded-lg ring-1 ring-charcoal/12 overflow-hidden">
            <button
              type="button"
              onClick={() => onChange({ src: brandLogos!.green! })}
              className={`px-2.5 py-1 text-[12px] font-medium transition ${variant === "green" ? "bg-green text-white" : "text-charcoal/65 hover:bg-charcoal/5"}`}
            >
              Green
            </button>
            <button
              type="button"
              onClick={() => onChange({ src: brandLogos!.white! })}
              className={`px-2.5 py-1 text-[12px] font-medium transition ${variant === "white" ? "bg-charcoal text-white" : "text-charcoal/65 hover:bg-charcoal/5"}`}
            >
              White
            </button>
          </div>
          <Divider />
        </>
      ) : null}
      <TextBtn onClick={onReplaceImage}>{isBrandLogo ? "Swap image" : "Replace"}</TextBtn>
      <Popover label="Crop">
        {() => (
          <div className="w-60 p-3 flex flex-col gap-3">
            <p className="text-[11px] font-medium text-charcoal/50">Drag to reposition</p>
            <FocalPad crop={layer.crop} onChange={(crop) => onChange({ crop })} />
            <Slider
              label={`Zoom · ${(layer.crop?.scale ?? 1).toFixed(1)}×`}
              min={1}
              max={3}
              step={0.1}
              value={layer.crop?.scale ?? 1}
              onChange={(scale) => onChange({ crop: { scale, ox: layer.crop?.ox ?? 0, oy: layer.crop?.oy ?? 0 } })}
            />
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => onChange({ objectFit: layer.objectFit === "cover" ? "contain" : "cover" })}
                className="text-[12px] text-charcoal/55 hover:text-charcoal/80"
              >
                Fit: {layer.objectFit === "cover" ? "Fill" : "Contain"}
              </button>
              <button type="button" onClick={() => onChange({ crop: undefined })} className="text-[12px] text-charcoal/45 hover:text-charcoal/70">Reset</button>
            </div>
          </div>
        )}
      </Popover>
      <Popover label="Filters">
        {() => (
          <div className="w-56 p-2 grid grid-cols-3 gap-1.5">
            {FILTER_PRESETS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => onChange({ filter: f.id === "none" ? undefined : f.id })}
                className={`px-1 py-2 rounded-md text-[11px] font-medium ${(layer.filter ?? "none") === f.id ? "bg-green/10 text-green ring-1 ring-green/40" : "text-charcoal/65 hover:bg-charcoal/5"}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </Popover>
      {/* Corner radius (uniform + per-corner) lives in the shared
          CornersPopover in ContextToolbar, so images get it too. */}
    </>
  );
}

function ShapeControls({
  layer,
  onChange,
}: {
  layer: Extract<Layer, { type: "shape" }>;
  onChange: (patch: Partial<Layer>) => void;
}) {
  if (layer.shape === "line") {
    return (
      <>
        <ColorField label="Colour" value={layer.stroke} onChange={(stroke) => onChange({ stroke })} />
        <Popover label="Weight">
          {() => (
            <div className="w-52 p-3">
              <Slider label={`Thickness · ${Math.round(layer.strokeWidth)}`} min={1} max={80} step={1} value={layer.strokeWidth} onChange={(strokeWidth) => onChange({ strokeWidth })} />
            </div>
          )}
        </Popover>
      </>
    );
  }
  return (
    <>
      <FillControl value={layer.fill} onChange={(fill) => onChange({ fill })} />
      <ColorField label="Stroke" value={layer.stroke} onChange={(stroke) => onChange({ stroke })} allowTransparent />
      <Popover label="Border">
        {() => (
          <div className="w-56 p-3 flex flex-col gap-3">
            <Slider label={`Stroke width · ${Math.round(layer.strokeWidth)}`} min={0} max={60} step={1} value={layer.strokeWidth} onChange={(strokeWidth) => onChange({ strokeWidth })} />
            <Checkbox
              label="Dashed"
              checked={(layer.strokeDash ?? 0) > 0}
              onChange={(on) => onChange({ strokeDash: on ? 8 : 0 })}
            />
            <p className="text-[10.5px] leading-snug text-charcoal/40">Dashed shows in the editor; the exported PNG renders a solid stroke.</p>
          </div>
        )}
      </Popover>
    </>
  );
}

/** Shape fill: a solid-colour swatch with a Gradient toggle that swaps to a
 *  simple 2-stop linear-gradient (angle + two stops). Toggling off restores a
 *  solid colour (the gradient's first stop). */
function FillControl({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const gradient = isGradient(value);
  const g = gradient ? parseGradient(value) : DEFAULT_GRAD;
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="h-9 px-2 rounded-lg ring-1 ring-charcoal/10 hover:bg-charcoal/5 flex items-center gap-1.5 text-[12.5px] text-charcoal/70"
      >
        <span className="w-4 h-4 rounded-[5px] ring-1 ring-charcoal/15" style={{ background: value }} />
        Fill
      </button>
      <AnchoredPanel anchorRef={btnRef} open={open} onClose={() => setOpen(false)} className="w-56 p-3">
          <Checkbox
            label="Gradient"
            checked={gradient}
            onChange={(on) => onChange(on ? gradientCss(g) : g.c0)}
          />
          {gradient ? (
            <div className="mt-3 flex flex-col gap-2.5">
              <span
                className="h-6 rounded-md ring-1 ring-charcoal/10"
                style={{ background: gradientCss(g) }}
              />
              <Slider
                label={`Angle · ${Math.round(g.angle)}°`}
                min={0}
                max={360}
                step={1}
                value={g.angle}
                onChange={(angle) => onChange(gradientCss({ ...g, angle }))}
              />
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium text-charcoal/50 w-12">Stop 1</span>
                <ColorField label="Stop 1" value={g.c0} onChange={(c0) => onChange(gradientCss({ ...g, c0 }))} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium text-charcoal/50 w-12">Stop 2</span>
                <ColorField label="Stop 2" value={g.c1} onChange={(c1) => onChange(gradientCss({ ...g, c1 }))} />
              </div>
            </div>
          ) : (
            <div className="mt-2">
              <ColorField label="Solid colour" value={value} onChange={onChange} allowTransparent />
            </div>
          )}
      </AnchoredPanel>
    </>
  );
}

/** Per-corner (or uniform) radius control for rects + images, plus an
 *  expander writing the per-corner `corners` tuple [TL,TR,BR,BL]. */
function CornersPopover({
  layer,
  onChange,
}: {
  layer: Extract<Layer, { type: "shape" }> | Extract<Layer, { type: "image" }>;
  onChange: (patch: Partial<Layer>) => void;
}) {
  const corners = layer.corners ?? null;
  const [perCorner, setPerCorner] = useState(!!corners);
  const c: [number, number, number, number] = corners ?? [layer.radius, layer.radius, layer.radius, layer.radius];
  const setCorner = (i: number, v: number) => {
    const next = [...c] as [number, number, number, number];
    next[i] = Math.max(0, v);
    onChange({ corners: next });
  };
  return (
    <Popover label="Corners">
      {() => (
        <div className="w-56 p-3 flex flex-col gap-3">
          <Slider
            label={`Radius · ${Math.round(corners ? Math.max(...c) : layer.radius)}`}
            min={0}
            max={400}
            step={2}
            value={corners ? Math.max(...c) : layer.radius}
            // Uniform: clears per-corner override and writes the single radius.
            onChange={(radius) => onChange({ radius, corners: null })}
          />
          <Checkbox
            label="Per-corner"
            checked={perCorner}
            onChange={(on) => {
              setPerCorner(on);
              onChange({ corners: on ? c : null });
            }}
          />
          {perCorner && (
            <div className="grid grid-cols-2 gap-2">
              <NumField label="TL" value={c[0]} min={0} onCommit={(v) => setCorner(0, v)} />
              <NumField label="TR" value={c[1]} min={0} onCommit={(v) => setCorner(1, v)} />
              <NumField label="BL" value={c[3]} min={0} onCommit={(v) => setCorner(3, v)} />
              <NumField label="BR" value={c[2]} min={0} onCommit={(v) => setCorner(2, v)} />
            </div>
          )}
        </div>
      )}
    </Popover>
  );
}

/** Drop shadow + layer blur. Shadow toggle seeds a sensible default; x/y/blur
 *  NumFields + a colour input edit it. Blur is a single board-unit NumField. */
function EffectsPopover({
  layer,
  onChange,
}: {
  layer: Layer;
  onChange: (patch: Partial<Layer>) => void;
}) {
  const shadow = layer.shadow ?? null;
  const blur = layer.blur ?? 0;
  const active = !!shadow || blur > 0;
  return (
    <Popover label="Effects">
      {() => (
        <div className="w-60 p-3 flex flex-col gap-3">
          <Checkbox
            label="Shadow"
            checked={!!shadow}
            onChange={(on) => onChange({ shadow: on ? { x: 0, y: 8, blur: 24, color: "rgba(0,0,0,0.35)" } : null })}
          />
          {shadow && (
            <div className="flex flex-col gap-2.5">
              <div className="grid grid-cols-3 gap-2">
                <NumField label="X" value={shadow.x} width={40} onCommit={(x) => onChange({ shadow: { ...shadow, x } })} />
                <NumField label="Y" value={shadow.y} width={40} onCommit={(y) => onChange({ shadow: { ...shadow, y } })} />
                <NumField label="Blur" value={shadow.blur} width={40} min={0} onCommit={(b) => onChange({ shadow: { ...shadow, blur: b } })} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium text-charcoal/50 w-12">Colour</span>
                <ColorField label="Shadow" value={shadow.color} onChange={(color) => onChange({ shadow: { ...shadow, color } })} />
              </div>
            </div>
          )}
          <span className="w-full h-px bg-charcoal/8" />
          <Slider label={`Blur · ${Math.round(blur)}`} min={0} max={80} step={1} value={blur} onChange={(v) => onChange({ blur: v })} />
          {active && (
            <button type="button" onClick={() => onChange({ shadow: null, blur: 0 })} className="text-[12px] text-charcoal/45 hover:text-charcoal/70 self-start">Clear effects</button>
          )}
        </div>
      )}
    </Popover>
  );
}

/** Small labelled checkbox matching the toolbar's quiet look. */
function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`w-4 h-4 rounded-[5px] grid place-items-center ring-1 transition ${checked ? "bg-green ring-green text-white" : "ring-charcoal/25 text-transparent hover:ring-charcoal/40"}`}
      >
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2.5 6.5L5 9l4.5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      <span className="text-[12.5px] text-charcoal/70">{label}</span>
    </label>
  );
}

/* ─── Shared property controls ────────────────────────────────────── */

function PositionPopover({
  layer,
  onChange,
}: {
  layer: Layer;
  onChange: (patch: Partial<Layer>) => void;
}) {
  return (
    <Popover label="Position">
      {() => (
        <div className="w-60 p-3 flex flex-col gap-2.5">
          <div className="grid grid-cols-2 gap-2">
            <NumField label="X" value={layer.x} onCommit={(x) => onChange({ x })} />
            <NumField label="Y" value={layer.y} onCommit={(y) => onChange({ y })} />
            <NumField label="W" value={layer.w} min={1} onCommit={(w) => onChange({ w })} />
            <NumField label="H" value={layer.h} min={1} onCommit={(h) => onChange({ h })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <NumField label="Rotation" value={layer.rotation} suffix="°" width={48} onCommit={(rotation) => onChange({ rotation: ((rotation % 360) + 360) % 360 })} />
            <NumField label="Opacity" value={Math.round(layer.opacity * 100)} suffix="%" width={44} min={0} max={100} onCommit={(v) => onChange({ opacity: Math.max(0, Math.min(1, v / 100)) })} />
          </div>
          <div className="flex items-center gap-1.5 pt-0.5">
            <button type="button" onClick={() => onChange({ rotation: 0 })} className="text-[12px] text-charcoal/50 hover:text-charcoal/80">Reset rotation</button>
          </div>
        </div>
      )}
    </Popover>
  );
}

function ArrangePopover({
  onArrange,
}: {
  onArrange: (dir: "front" | "back" | "forward" | "backward") => void;
}) {
  return (
    <Popover label="Arrange">
      {(close) => (
        <div className="w-44 p-1.5 flex flex-col">
          {([
            ["front", "Bring to front"],
            ["forward", "Bring forward"],
            ["backward", "Send backward"],
            ["back", "Send to back"],
          ] as const).map(([dir, label]) => (
            <button
              key={dir}
              type="button"
              onClick={() => { onArrange(dir); close(); }}
              className="flex items-center gap-2 px-2.5 py-2 rounded-md text-[13px] text-charcoal/75 hover:bg-charcoal/5"
            >
              <span className="text-charcoal/45"><LayerUpIcon down={dir === "back" || dir === "backward"} /></span>
              {label}
            </button>
          ))}
        </div>
      )}
    </Popover>
  );
}

/* ─── Alignment / distribute toolbar (multi & single select) ──────── */

export function AlignToolbar({
  onAlign,
  canDistribute,
}: {
  onAlign: (k: AlignKind) => void;
  canDistribute: boolean;
}) {
  return (
    <div className="flex items-center gap-0.5">
      <IconBtn label="Align left" onClick={() => onAlign("left")}><AlignIcon kind="left" /></IconBtn>
      <IconBtn label="Align centre" onClick={() => onAlign("hcenter")}><AlignIcon kind="hcenter" /></IconBtn>
      <IconBtn label="Align right" onClick={() => onAlign("right")}><AlignIcon kind="right" /></IconBtn>
      <span className="w-px h-5 bg-charcoal/10 mx-0.5" />
      <IconBtn label="Align top" onClick={() => onAlign("top")}><AlignIcon kind="top" /></IconBtn>
      <IconBtn label="Align middle" onClick={() => onAlign("vcenter")}><AlignIcon kind="vcenter" /></IconBtn>
      <IconBtn label="Align bottom" onClick={() => onAlign("bottom")}><AlignIcon kind="bottom" /></IconBtn>
      {canDistribute && (
        <>
          <span className="w-px h-5 bg-charcoal/10 mx-0.5" />
          <IconBtn label="Distribute horizontally" onClick={() => onAlign("dist-h")}><DistributeIcon axis="h" /></IconBtn>
          <IconBtn label="Distribute vertically" onClick={() => onAlign("dist-v")}><DistributeIcon axis="v" /></IconBtn>
        </>
      )}
    </div>
  );
}

/* ─── Group / ungroup (multi-select + grouped layers) ─────────────── */

export function GroupToolbar({
  canGroup,
  canUngroup,
  onGroup,
  onUngroup,
}: {
  canGroup: boolean;
  canUngroup: boolean;
  onGroup: () => void;
  onUngroup: () => void;
}) {
  return (
    <div className="flex items-center gap-0.5">
      {canGroup && (
        <IconBtn label="Group (⌘G)" onClick={onGroup}><GroupIcon /></IconBtn>
      )}
      {canUngroup && (
        <IconBtn label="Ungroup (⌘⇧G)" onClick={onUngroup}><UngroupIcon /></IconBtn>
      )}
    </div>
  );
}

/* ─── Shape-as-mask ("use shape as mask") ─────────────────────────────
 * One Canva-simple chip. "Mask with shape" shows when exactly one image +
 * one (maskable) shape are selected; "Release mask" shows when a masked
 * image or its mask shape is selected. Only one is ever active. */

export function MaskToolbar({
  canMask,
  canRelease,
  onMask,
  onRelease,
}: {
  canMask: boolean;
  canRelease: boolean;
  onMask: () => void;
  onRelease: () => void;
}) {
  if (canRelease) {
    return (
      <IconBtn label="Release mask" active onClick={onRelease}>
        <MaskIcon />
      </IconBtn>
    );
  }
  if (canMask) {
    return (
      <IconBtn label="Mask with shape" onClick={onMask}>
        <MaskIcon />
      </IconBtn>
    );
  }
  return null;
}

/* ─── Components + variants (Wave 2c) ─────────────────────────────────
 * Two surfaces:
 *  • CreateComponentButton — shown for a normal (non-instance) selection.
 *  • InstanceToolbar — shown when one instance is selected: component
 *    name, a variant dropdown, an Overrides popover (text / image-src /
 *    fill per master layer), reset-overrides, edit-master, detach, and a
 *    component menu (add variant, delete component). Matches the existing
 *    toolbar/popover look. */

export function CreateComponentButton({ onCreate }: { onCreate: () => void }) {
  return (
    <button
      type="button"
      onClick={onCreate}
      title="Create a reusable component from the selection"
      className="h-9 px-3 rounded-lg text-[13px] font-medium text-charcoal/75 hover:bg-charcoal/5 ring-1 ring-charcoal/10 flex items-center gap-1.5 whitespace-nowrap"
    >
      <ComponentIcon /> Create component
    </button>
  );
}

export function InstanceToolbar({
  instance,
  def,
  onSetVariant,
  onSetOverride,
  onResetOverrides,
  onAddVariant,
  onEdit,
  onDetach,
  onDeleteComponent,
}: {
  instance: InstanceLayer;
  /** The referenced component def, or undefined when missing (dangling). */
  def: ComponentDef | undefined;
  onSetVariant: (variantId: string) => void;
  onSetOverride: (masterId: string, patch: LayerOverride) => void;
  onResetOverrides: () => void;
  onAddVariant: () => void;
  onEdit: () => void;
  onDetach: () => void;
  onDeleteComponent: () => void;
}) {
  // Dangling instance (component was removed externally): only offer detach
  // (bakes whatever expands — nothing — / cleans it up) + delete.
  if (!def) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="flex items-center gap-1.5 text-[12.5px] text-charcoal/55 whitespace-nowrap">
          <ComponentIcon /> Missing component
        </span>
        <Divider />
        <IconBtn label="Detach instance" onClick={onDetach}><DetachIcon /></IconBtn>
      </div>
    );
  }
  const variant = resolveVariant(def, instance.variant);
  const overrides = instance.overrides ?? {};
  const hasOverrides = Object.keys(overrides).length > 0;
  // Master layers that can be overridden: text (content + colour), image
  // (src is changed via the per-layer Replace in the slide — here we expose
  // fill/colour + text), shape (fill).
  const overridable = (variant?.layers ?? []).filter(
    (l) => l.type === "text" || l.type === "shape" || l.type === "image"
  );
  return (
    <div className="flex items-center gap-1.5 [&>*]:shrink-0">
      <span className="flex items-center gap-1.5 text-[12.5px] font-medium text-charcoal/70 whitespace-nowrap">
        <span className="text-green"><ComponentIcon /></span>
        {def.name}
      </span>

      {/* Variant dropdown */}
      {def.variants.length >= 1 && (
        <Popover label={variant?.name ?? "Variant"}>
          {(close) => (
            <div className="w-44 py-1">
              {def.variants.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => { onSetVariant(v.id); close(); }}
                  className={`w-full text-left px-3 py-1.5 text-[13px] hover:bg-charcoal/5 ${
                    (instance.variant ?? def.variants[0]?.id) === v.id ? "text-green" : "text-charcoal/75"
                  }`}
                >
                  {v.name}
                </button>
              ))}
              <span className="block my-1 mx-2 h-px bg-charcoal/8" />
              <button
                type="button"
                onClick={() => { onAddVariant(); close(); }}
                className="w-full text-left px-3 py-1.5 text-[13px] text-charcoal/60 hover:bg-charcoal/5"
              >
                + Add variant (duplicate)
              </button>
            </div>
          )}
        </Popover>
      )}

      {/* Overrides */}
      {overridable.length > 0 && (
        <Popover label="Overrides">
          {() => (
            <div className="w-72 p-3 flex flex-col gap-3 max-h-80 overflow-auto">
              <p className="text-[11px] font-medium text-charcoal/50">
                Per-instance overrides — change this copy without affecting the master.
              </p>
              {overridable.map((m, i) => (
                <OverrideRow
                  key={m.id}
                  master={m}
                  index={i}
                  override={overrides[m.id]}
                  onChange={(patch) => onSetOverride(m.id, patch)}
                />
              ))}
              {hasOverrides && (
                <button
                  type="button"
                  onClick={onResetOverrides}
                  className="text-[12px] text-charcoal/45 hover:text-charcoal/70 self-start"
                >
                  Reset all overrides
                </button>
              )}
            </div>
          )}
        </Popover>
      )}

      <Divider />
      <IconBtn label="Edit component" onClick={onEdit}><EditIcon /></IconBtn>
      <IconBtn label="Detach instance" onClick={onDetach}><DetachIcon /></IconBtn>

      {/* Component menu (add variant / delete component) */}
      <Popover label="Component">
        {(close) => (
          <div className="w-52 p-1.5 flex flex-col">
            <button
              type="button"
              onClick={() => { onAddVariant(); close(); }}
              className="text-left px-2.5 py-2 rounded-md text-[13px] text-charcoal/75 hover:bg-charcoal/5"
            >
              Add variant (duplicate)
            </button>
            <button
              type="button"
              onClick={() => { onEdit(); close(); }}
              className="text-left px-2.5 py-2 rounded-md text-[13px] text-charcoal/75 hover:bg-charcoal/5"
            >
              Edit component master…
            </button>
            <span className="block my-1 mx-1 h-px bg-charcoal/8" />
            <button
              type="button"
              onClick={() => { onDeleteComponent(); close(); }}
              className="text-left px-2.5 py-2 rounded-md text-[13px] text-red-600 hover:bg-red-50"
            >
              Delete component (detaches all)
            </button>
          </div>
        )}
      </Popover>
    </div>
  );
}

/** One overridable master layer's row in the Overrides popover. Text →
 *  content textarea + colour; image → image src text field; shape →
 *  fill colour. An empty/cleared field removes that override. */
function OverrideRow({
  master,
  index,
  override,
  onChange,
}: {
  master: Layer;
  index: number;
  override: LayerOverride | undefined;
  onChange: (patch: LayerOverride) => void;
}) {
  const label = `${master.type[0]!.toUpperCase()}${master.type.slice(1)} ${index + 1}`;
  if (master.type === "text") {
    const value = override?.text ?? master.text;
    const color = override?.fill ?? master.color;
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-medium text-charcoal/50">{label}</span>
        <textarea
          value={value}
          onChange={(e) =>
            onChange({ text: e.target.value === master.text ? undefined : e.target.value })
          }
          rows={2}
          className="w-full rounded-md ring-1 ring-charcoal/10 px-2 py-1.5 text-[12.5px] focus:outline-none focus:ring-green/40 resize-none"
        />
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-charcoal/45 w-12">Colour</span>
          <ColorField
            label=""
            value={color}
            onChange={(fill) => onChange({ fill: fill === master.color ? undefined : fill })}
          />
        </div>
      </div>
    );
  }
  if (master.type === "image") {
    const value = override?.src ?? master.src;
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-medium text-charcoal/50">{label} (URL)</span>
        <input
          value={value}
          onChange={(e) =>
            onChange({ src: e.target.value === master.src ? undefined : e.target.value, mediaId: undefined })
          }
          placeholder="https://…"
          className="w-full rounded-md ring-1 ring-charcoal/10 px-2 py-1.5 text-[12px] focus:outline-none focus:ring-green/40"
        />
      </div>
    );
  }
  // shape
  const shapeFill = override?.fill ?? (master as Extract<Layer, { type: "shape" }>).fill;
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] font-medium text-charcoal/50 flex-1">{label} fill</span>
      <ColorField
        label=""
        value={shapeFill}
        onChange={(fill) =>
          onChange({ fill: fill === (master as Extract<Layer, { type: "shape" }>).fill ? undefined : fill })
        }
      />
    </div>
  );
}

/* ─── Auto-layout (group flex) ────────────────────────────────────────
 * Shown when the selection is exactly one group. A single toggle button
 * enables auto-layout; once on, a popover exposes direction, gap, padding,
 * align and justify. Canva-simple: one chip, options tucked behind it. */

export function AutoLayoutToolbar({
  config,
  onToggle,
  onChange,
}: {
  /** null = the group has no auto-layout yet (toggle is off). */
  config: AutoLayout | null;
  onToggle: () => void;
  onChange: (patch: Partial<AutoLayout>) => void;
}) {
  if (!config) {
    return (
      <IconBtn label="Auto-layout" onClick={onToggle}>
        <AutoLayoutIcon />
      </IconBtn>
    );
  }
  return (
    <div className="flex items-center gap-0.5">
      <Popover label="Auto-layout">
        {() => (
          <div className="w-64 p-3 flex flex-col gap-3">
            {/* Direction */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-medium text-charcoal/50">Direction</span>
              <SegGroup<AutoLayoutDirection>
                value={config.direction}
                options={[
                  { id: "column", label: "Vertical" },
                  { id: "row", label: "Horizontal" },
                ]}
                onChange={(direction) => onChange({ direction })}
              />
            </div>

            {/* Gap + padding */}
            <div className="grid grid-cols-3 gap-2">
              <NumField label="Gap" value={config.gap} min={0} width={36} onCommit={(gap) => onChange({ gap })} />
              <NumField label="PadX" value={config.padX} min={0} width={36} onCommit={(padX) => onChange({ padX })} />
              <NumField label="PadY" value={config.padY} min={0} width={36} onCommit={(padY) => onChange({ padY })} />
            </div>

            {/* Align (cross axis) */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-medium text-charcoal/50">Align</span>
              <SegGroup<AutoLayoutAlign>
                value={config.align}
                options={[
                  { id: "start", label: "Start" },
                  { id: "center", label: "Center" },
                  { id: "end", label: "End" },
                  { id: "stretch", label: "Stretch" },
                ]}
                onChange={(align) => onChange({ align })}
              />
            </div>

            {/* Justify (main axis) */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-medium text-charcoal/50">Distribute</span>
              <SegGroup<AutoLayoutJustify>
                value={config.justify}
                options={[
                  { id: "start", label: "Start" },
                  { id: "center", label: "Center" },
                  { id: "end", label: "End" },
                  { id: "between", label: "Space" },
                ]}
                onChange={(justify) => onChange({ justify })}
              />
            </div>

            <button
              type="button"
              onClick={onToggle}
              className="text-[12px] text-charcoal/45 hover:text-charcoal/70 self-start"
            >
              Turn off auto-layout
            </button>
          </div>
        )}
      </Popover>
    </div>
  );
}

/** Small segmented control (a row of pill buttons) for the auto-layout
 *  enum fields. Generic over the option id type. */
function SegGroup<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-charcoal/5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={`flex-1 px-2 py-1.5 rounded-md text-[12px] font-medium transition ${
            value === o.id ? "bg-white text-green shadow-sm" : "text-charcoal/55 hover:text-charcoal/80"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ─── Layers panel ────────────────────────────────────────────────── */

export function LayersPanel({
  layers,
  registry,
  selectedIds,
  onSelect,
  onToggleHidden,
  onToggleLock,
  onRename,
  onReorder,
  onClose,
}: {
  /** Top-to-bottom render order is reversed for the panel (front first). */
  layers: Layer[];
  /** Deck-level registry — used to label instance layers by component. */
  registry?: ComponentRegistry;
  selectedIds: string[];
  onSelect: (id: string, additive: boolean) => void;
  onToggleHidden: (id: string) => void;
  onToggleLock: (id: string) => void;
  onRename: (id: string, name: string) => void;
  /** Move a layer to a new visible (panel) index; converts to z-index. */
  onReorder: (id: string, beforeId: string | null) => void;
  onClose: () => void;
}) {
  // Panel shows front-most (last in array) at top.
  const ordered = [...layers].reverse();
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);

  // Stable colour per group so members read as a block; index by the
  // group's first appearance in array order.
  const groupOrder = Array.from(
    new Set(layers.map((l) => l.groupId).filter((g): g is string => !!g))
  );
  const groupAccent = (gid: string | undefined) =>
    gid ? GROUP_ACCENTS[groupOrder.indexOf(gid) % GROUP_ACCENTS.length]! : null;

  // Instance layers are labelled by their component (falling back to the
  // generic label); everything else uses the content-derived label.
  const labelOf = (l: Layer) =>
    l.type === "instance" ? instanceLabel(l, registry) : layerLabel(l);

  return (
    <div className="w-[248px] bg-white border-l border-charcoal/8 flex flex-col shrink-0">
      <div className="flex items-center justify-between px-3.5 h-11 border-b border-charcoal/8">
        <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-charcoal/45">Layers</span>
        <button type="button" onClick={onClose} aria-label="Close layers" className="text-charcoal/35 hover:text-charcoal/70 text-[18px] leading-none">×</button>
      </div>
      <div className="flex-1 overflow-auto py-1.5">
        {ordered.length === 0 && (
          <p className="text-[12px] text-charcoal/40 px-4 py-6 text-center">No layers yet.</p>
        )}
        {ordered.map((l) => {
          const selected = selectedIds.includes(l.id);
          const isOver = overId === l.id && dragId && dragId !== l.id;
          const accent = groupAccent(l.groupId);
          return (
            <div
              key={l.id}
              draggable={renaming !== l.id}
              onDragStart={() => setDragId(l.id)}
              onDragOver={(e) => { e.preventDefault(); setOverId(l.id); }}
              onDragEnd={() => { setDragId(null); setOverId(null); }}
              onDrop={(e) => {
                e.preventDefault();
                if (dragId && dragId !== l.id) onReorder(dragId, l.id);
                setDragId(null);
                setOverId(null);
              }}
              onMouseDown={(e) => {
                if (renaming === l.id) return;
                onSelect(l.id, e.shiftKey || e.metaKey || e.ctrlKey);
              }}
              className={`group relative mx-1.5 flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer select-none ${
                accent ? "pl-3.5" : ""
              } ${
                selected ? "bg-green/10 ring-1 ring-green/40" : "hover:bg-charcoal/4"
              } ${isOver ? "outline-dashed outline-1 outline-green/60" : ""}`}
            >
              {accent && (
                <span
                  aria-hidden
                  title="Grouped"
                  className="absolute left-1 top-1.5 bottom-1.5 w-1 rounded-full"
                  style={{ background: accent }}
                />
              )}
              <span className="text-charcoal/25 cursor-grab shrink-0"><GripIcon /></span>
              <span className={`shrink-0 ${selected ? "text-green" : "text-charcoal/45"}`}><LayerTypeIcon layer={l} /></span>
              {renaming === l.id ? (
                <input
                  autoFocus
                  defaultValue={labelOf(l)}
                  onMouseDown={(e) => e.stopPropagation()}
                  onBlur={(e) => { onRename(l.id, e.target.value); setRenaming(null); }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                    if (e.key === "Escape") { setRenaming(null); }
                  }}
                  className="flex-1 min-w-0 text-[12.5px] bg-white rounded ring-1 ring-green/40 px-1 py-0.5 focus:outline-none"
                />
              ) : (
                <span
                  onDoubleClick={(e) => { e.stopPropagation(); setRenaming(l.id); }}
                  className={`flex-1 min-w-0 truncate text-[12.5px] ${l.hidden ? "text-charcoal/30 line-through" : selected ? "text-charcoal/90" : "text-charcoal/70"}`}
                >
                  {labelOf(l)}
                </span>
              )}
              <button
                type="button"
                aria-label={l.locked ? "Unlock" : "Lock"}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => onToggleLock(l.id)}
                className={`shrink-0 w-6 h-6 grid place-items-center rounded transition ${l.locked ? "text-green opacity-100" : "text-charcoal/40 opacity-0 group-hover:opacity-100 hover:text-charcoal/70"}`}
              >
                <LockIcon open={!l.locked} />
              </button>
              <button
                type="button"
                aria-label={l.hidden ? "Show" : "Hide"}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => onToggleHidden(l.id)}
                className={`shrink-0 w-6 h-6 grid place-items-center rounded transition ${l.hidden ? "text-charcoal/55 opacity-100" : "text-charcoal/40 opacity-0 group-hover:opacity-100 hover:text-charcoal/70"}`}
              >
                <EyeIcon off={l.hidden} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LayerTypeIcon({ layer }: { layer: Layer }) {
  if (layer.type === "text") return <TextIcon />;
  if (layer.type === "image") return <ImageIcon />;
  if (layer.type === "instance") return <ComponentIcon />;
  return <ShapeIcon kind={(layer as Extract<Layer, { type: "shape" }>).shape as ShapeKind} />;
}

/* ─── Image picker (DR library + web) ─────────────────────────────── */

export function ImagePicker({
  images,
  onPick,
  onClose,
}: {
  images: ImageCandidate[];
  onPick: (img: ImageCandidate) => void;
  onClose: () => void;
}) {
  const dr = images.filter((i) => i.source === "dr_library");
  const ext = images.filter((i) => i.source === "external");

  // "View entire library" mode — same popup, but the DR section transitions
  // into the WHOLE Deen Relief library (fetched on demand) instead of just
  // the images suggested for this event.
  const [allMode, setAllMode] = useState(false);
  const [all, setAll] = useState<ImageCandidate[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");

  async function openLibrary() {
    setAllMode(true);
    if (all) return; // already loaded this session
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/media/library?limit=500", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as { images?: ImageCandidate[] };
      setAll(Array.isArray(json.images) ? json.images : []);
    } catch {
      setError("Couldn’t load the library. Try again.");
      setAll([]);
    } finally {
      setLoading(false);
    }
  }

  const needle = q.trim().toLowerCase();
  const allFiltered = (all ?? []).filter(
    (i) => !needle || (i.description ?? "").toLowerCase().includes(needle)
  );

  return (
    <div className="fixed inset-0 z-[60] bg-charcoal/40 grid place-items-center p-6" onMouseDown={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-auto p-5" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading font-semibold text-charcoal text-lg">
            {allMode ? "Deen Relief library" : "Choose an image"}
          </h2>
          <button type="button" onClick={onClose} className="text-charcoal/40 hover:text-charcoal text-[20px] leading-none">×</button>
        </div>

        {allMode ? (
          /* ── Entire library view ── */
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setAllMode(false)}
                className="text-[12px] font-medium text-green hover:text-green-dark shrink-0"
              >
                ← Suggested for this event
              </button>
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search the library…"
                className="dr-input ml-auto max-w-[220px] !py-1.5 !text-[13px]"
              />
            </div>
            {loading ? (
              <p className="text-[13px] text-charcoal/45 py-10 text-center">Loading the library…</p>
            ) : error ? (
              <p className="text-[13px] text-red-600/80 py-10 text-center">{error}</p>
            ) : allFiltered.length === 0 ? (
              <p className="text-[13px] text-charcoal/45 py-10 text-center">
                {needle ? "No images match that search." : "The library is empty."}
              </p>
            ) : (
              <ImageGrid items={allFiltered} onPick={onPick} />
            )}
          </div>
        ) : images.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <p className="text-[13px] text-charcoal/45 text-center">No imagery suggested for this event.</p>
            <button
              type="button"
              onClick={openLibrary}
              className="text-[12.5px] font-semibold text-green hover:text-green-dark"
            >
              View entire library →
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {dr.length > 0 && (
              <PickerSection
                label="Deen Relief library"
                items={dr}
                onPick={onPick}
                action={
                  <button
                    type="button"
                    onClick={openLibrary}
                    className="text-[11.5px] font-semibold text-green hover:text-green-dark normal-case tracking-normal"
                  >
                    View entire library →
                  </button>
                }
              />
            )}
            {ext.length > 0 && <PickerSection label="From the web" items={ext} onPick={onPick} />}
            {dr.length === 0 && (
              <button
                type="button"
                onClick={openLibrary}
                className="self-start text-[12.5px] font-semibold text-green hover:text-green-dark"
              >
                View entire Deen Relief library →
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function PickerSection({
  label,
  items,
  onPick,
  action,
}: {
  label: string;
  items: ImageCandidate[];
  onPick: (i: ImageCandidate) => void;
  /** Optional right-aligned control on the section's label row (e.g. the
   *  "View entire library" button aligned with the "Deen Relief library"
   *  heading). */
  action?: ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal/40">{label}</p>
        {action}
      </div>
      <ImageGrid items={items} onPick={onPick} />
    </div>
  );
}

function ImageGrid({ items, onPick }: { items: ImageCandidate[]; onPick: (i: ImageCandidate) => void }) {
  return (
    <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
      {items.map((img) => (
        <button
          key={img.id}
          type="button"
          onClick={() => onPick(img)}
          title={img.description ?? undefined}
          className="relative aspect-square rounded-lg overflow-hidden ring-1 ring-charcoal/10 hover:ring-green/60 transition"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img.thumbnailUrl ?? img.url} alt="" className="absolute inset-0 w-full h-full object-cover" />
        </button>
      ))}
    </div>
  );
}

/* ─── Primitives ──────────────────────────────────────────────────── */

function Popover({
  label,
  wide,
  children,
}: {
  label: string;
  wide?: boolean;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`h-9 px-2.5 rounded-lg text-[13px] text-charcoal/75 hover:bg-charcoal/5 flex items-center gap-1 ${open ? "bg-charcoal/5" : ""} ${wide ? "min-w-[120px] justify-between ring-1 ring-charcoal/10" : ""}`}
      >
        <span className="truncate">{label}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" className="text-charcoal/40"><path d="M3 4.5L6 7.5 9 4.5" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      <AnchoredPanel anchorRef={btnRef} open={open} onClose={() => setOpen(false)}>
        {children(() => setOpen(false))}
      </AnchoredPanel>
    </>
  );
}

function OpacityPopover({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <Popover label={`${Math.round(value * 100)}%`}>
      {() => (
        <div className="w-52 p-3">
          <Slider label={`Opacity · ${Math.round(value * 100)}%`} min={0} max={1} step={0.01} value={value} onChange={onChange} />
        </div>
      )}
    </Popover>
  );
}

function WeightPopover({ weights, value, onChange }: { weights: number[]; value: number; onChange: (v: number) => void }) {
  const NAMES: Record<number, string> = { 400: "Regular", 500: "Medium", 600: "Semibold", 700: "Bold", 800: "Heavy" };
  if (weights.length <= 1) return null;
  return (
    <Popover label={NAMES[value] ?? String(value)}>
      {(close) => (
        <div className="w-36 py-1">
          {weights.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => { onChange(w); close(); }}
              style={{ fontWeight: w }}
              className={`w-full text-left px-3 py-1.5 text-[13px] hover:bg-charcoal/5 ${value === w ? "text-green" : "text-charcoal/75"}`}
            >
              {NAMES[w] ?? w}
            </button>
          ))}
        </div>
      )}
    </Popover>
  );
}

function Stepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  // Free-typing numeric field: while focused we hold a local string draft so
  // the caller's clamp (min 6) can't fight a half-typed number — the value is
  // only committed on blur / Enter. The ± buttons + arrow keys step live.
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? String(value);
  const commit = (raw: string) => {
    const n = parseInt(raw, 10);
    if (Number.isFinite(n)) onChange(n);
    setDraft(null);
  };
  return (
    <div className="flex items-center h-9 rounded-lg ring-1 ring-charcoal/10">
      <button type="button" onClick={() => onChange(value - 2)} className="w-7 h-full grid place-items-center text-charcoal/60 hover:bg-charcoal/5 rounded-l-lg">−</button>
      <input
        type="text"
        inputMode="numeric"
        value={shown}
        onChange={(e) => setDraft(e.target.value.replace(/[^\d]/g, ""))}
        onFocus={(e) => {
          setDraft(String(value));
          e.currentTarget.select();
        }}
        onBlur={(e) => commit(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.currentTarget.blur();
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            onChange(value + 1);
          } else if (e.key === "ArrowDown") {
            e.preventDefault();
            onChange(value - 1);
          }
        }}
        className="w-11 text-center text-[13px] tabular-nums bg-transparent focus:outline-none"
      />
      <button type="button" onClick={() => onChange(value + 2)} className="w-7 h-full grid place-items-center text-charcoal/60 hover:bg-charcoal/5 rounded-r-lg">+</button>
    </div>
  );
}

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={`w-9 h-9 rounded-lg text-[14px] font-semibold transition ${on ? "bg-green text-white" : "text-charcoal/70 hover:bg-charcoal/5"}`}>
      {children}
    </button>
  );
}

function IconBtn({ label, onClick, children, danger, active }: { label: string; onClick: () => void; children: ReactNode; danger?: boolean; active?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`w-9 h-9 grid place-items-center rounded-lg transition ${
        danger ? "text-charcoal/60 hover:bg-red-50 hover:text-red-600" : active ? "bg-green/10 text-green" : "text-charcoal/65 hover:bg-charcoal/5"
      }`}
    >
      {children}
    </button>
  );
}

function TextBtn({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="h-9 px-3 rounded-lg text-[13px] text-charcoal/75 hover:bg-charcoal/5 ring-1 ring-charcoal/10">
      {children}
    </button>
  );
}

function AlignCycle({ value, onChange }: { value: TextAlign; onChange: (v: TextAlign) => void }) {
  // Cycle left → center → right → justify → left.
  const next: TextAlign =
    value === "left" ? "center" : value === "center" ? "right" : value === "right" ? "justify" : "left";
  // Middle rule: justify shows a full-width line (block look); others
  // shrink/offset to hint the alignment.
  const mid =
    value === "justify"
      ? { x1: 2, x2: 14 }
      : value === "right"
        ? { x1: 5, x2: 14 }
        : value === "left"
          ? { x1: 2, x2: 11 }
          : { x1: 4, x2: 12 };
  return (
    <button type="button" onClick={() => onChange(next)} title={`Text align: ${value}`} className="w-9 h-9 rounded-lg grid place-items-center text-charcoal/65 hover:bg-charcoal/5">
      <svg width="16" height="16" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.5">
        <line x1="2" y1="4" x2="14" y2="4" strokeLinecap="round" />
        <line x1={mid.x1} y1="8" x2={mid.x2} y2="8" strokeLinecap="round" />
        <line x1="2" y1="12" x2={value === "justify" ? 14 : 12} y2="12" strokeLinecap="round" />
      </svg>
    </button>
  );
}

function ListBulletIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.5">
      <circle cx="3" cy="4" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="3" cy="8" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="3" cy="12" r="1.1" fill="currentColor" stroke="none" />
      <line x1="6.5" y1="4" x2="14" y2="4" strokeLinecap="round" />
      <line x1="6.5" y1="8" x2="14" y2="8" strokeLinecap="round" />
      <line x1="6.5" y1="12" x2="14" y2="12" strokeLinecap="round" />
    </svg>
  );
}

function ListNumberIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.4">
      <text x="1.5" y="5.5" fontSize="5" fill="currentColor" stroke="none" fontFamily="sans-serif">1</text>
      <text x="1.5" y="10" fontSize="5" fill="currentColor" stroke="none" fontFamily="sans-serif">2</text>
      <text x="1.5" y="14.5" fontSize="5" fill="currentColor" stroke="none" fontFamily="sans-serif">3</text>
      <line x1="6.5" y1="4" x2="14" y2="4" strokeLinecap="round" />
      <line x1="6.5" y1="8.5" x2="14" y2="8.5" strokeLinecap="round" />
      <line x1="6.5" y1="13" x2="14" y2="13" strokeLinecap="round" />
    </svg>
  );
}

/** "Fit box to text" — square with a downward double-arrow snapping to a
 *  baseline. */
function FitBoxIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="14" height="14" rx="2" opacity="0.4" />
      <path d="M10 6.5v5M7.8 9.5L10 11.7l2.2-2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Slider({ label, min, max, step, value, onChange }: { label: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium text-charcoal/50">{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-green" />
    </label>
  );
}

function Divider() {
  return <span className="w-px h-6 bg-charcoal/10 mx-0.5" />;
}

/** Draggable focal point for crop reposition. */
function FocalPad({ crop, onChange }: { crop?: ImageCrop; onChange: (c: ImageCrop) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const ox = crop?.ox ?? 0;
  const oy = crop?.oy ?? 0;
  const scale = crop?.scale ?? 1;

  function setFromEvent(e: React.MouseEvent | MouseEvent) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = ((e as MouseEvent).clientX - r.left) / r.width;
    const py = ((e as MouseEvent).clientY - r.top) / r.height;
    const nx = Math.max(-50, Math.min(50, (px - 0.5) * 100));
    const ny = Math.max(-50, Math.min(50, (py - 0.5) * 100));
    onChange({ scale, ox: nx, oy: ny });
  }

  return (
    <div
      ref={ref}
      onMouseDown={(e) => {
        setFromEvent(e);
        const move = (ev: MouseEvent) => setFromEvent(ev);
        const up = () => {
          window.removeEventListener("mousemove", move);
          window.removeEventListener("mouseup", up);
        };
        window.addEventListener("mousemove", move);
        window.addEventListener("mouseup", up);
      }}
      className="relative w-full h-28 rounded-lg bg-charcoal/5 ring-1 ring-charcoal/10 cursor-crosshair overflow-hidden"
    >
      <span
        className="absolute w-4 h-4 rounded-full bg-green ring-2 ring-white shadow -translate-x-1/2 -translate-y-1/2"
        style={{ left: `${50 + ox}%`, top: `${50 + oy}%` }}
      />
    </div>
  );
}
