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

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { ImageCandidate } from "@/lib/social-templates/types";
import type {
  ImageCrop,
  Layer,
  ShapeKind,
} from "@/lib/social-editor/types";
import { FONT_OPTIONS, bareFamily, nearestWeight } from "@/lib/social-editor/fonts";
import { FILTER_PRESETS } from "@/lib/social-editor/imageStyle";
import {
  NumField,
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
} from "./editorUi";
import { layerLabel } from "@/lib/social-editor/types";

const SWATCHES = ["#163827", "#2D6A2E", "#D4A843", "#F7F3E8", "#1A1A2E", "#FFFFFF", "#C0392B", "#000000"];

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

export function ContextToolbar({
  layer,
  onChange,
  onReplaceImage,
  onDuplicate,
  onDelete,
  onArrange,
}: {
  layer: Layer;
  onChange: (patch: Partial<Layer>) => void;
  onReplaceImage: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onArrange: (dir: "front" | "back" | "forward" | "backward") => void;
}) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap w-full">
      {layer.type === "text" && <TextControls layer={layer} onChange={onChange} />}
      {layer.type === "image" && (
        <ImageControls layer={layer} onChange={onChange} onReplaceImage={onReplaceImage} />
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
        onChange={(v) => onChange({ fontSize: Math.max(6, Math.min(400, v)) })}
      />

      <ColorPopover value={layer.color} onChange={(color) => onChange({ color })} />

      <Divider />

      <WeightPopover weights={weights} value={layer.fontWeight} onChange={(fontWeight) => onChange({ fontWeight })} />
      <Toggle on={layer.fontWeight >= 700} onClick={() => onChange({ fontWeight: layer.fontWeight >= 700 ? 400 : 700 })}>B</Toggle>
      <Toggle on={layer.italic} onClick={() => onChange({ italic: !layer.italic })}><span className="italic">I</span></Toggle>
      <Toggle on={layer.underline} onClick={() => onChange({ underline: !layer.underline })}><span className="underline">U</span></Toggle>
      <Toggle on={layer.uppercase} onClick={() => onChange({ uppercase: !layer.uppercase })}>AA</Toggle>

      <Divider />

      <AlignCycle value={layer.align} onChange={(align) => onChange({ align })} />

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

function ImageControls({
  layer,
  onChange,
  onReplaceImage,
}: {
  layer: Extract<Layer, { type: "image" }>;
  onChange: (patch: Partial<Layer>) => void;
  onReplaceImage: () => void;
}) {
  return (
    <>
      <TextBtn onClick={onReplaceImage}>Replace</TextBtn>
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
        <ColorPopover label="Colour" value={layer.stroke} onChange={(stroke) => onChange({ stroke })} />
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
      <SwatchTrigger label="Stroke" value={layer.stroke} onChange={(stroke) => onChange({ stroke })} />
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
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="h-9 px-2 rounded-lg ring-1 ring-charcoal/10 hover:bg-charcoal/5 flex items-center gap-1.5 text-[12.5px] text-charcoal/70"
      >
        <span className="w-4 h-4 rounded-[5px] ring-1 ring-charcoal/15" style={{ background: value }} />
        Fill
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1.5 bg-white rounded-xl shadow-xl ring-1 ring-charcoal/10 z-50 w-56 p-3">
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
                <input type="color" value={g.c0.startsWith("#") ? g.c0 : "#000000"} onChange={(e) => onChange(gradientCss({ ...g, c0: e.target.value }))} className="w-7 h-7 rounded-full overflow-hidden cursor-pointer bg-transparent border-0 p-0" />
                <input value={g.c0} onChange={(e) => onChange(gradientCss({ ...g, c0: e.target.value }))} className="flex-1 min-w-0 rounded-md ring-1 ring-charcoal/10 px-2 py-1 text-[12px] tabular-nums focus:outline-none focus:ring-green/40" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium text-charcoal/50 w-12">Stop 2</span>
                <input type="color" value={g.c1.startsWith("#") ? g.c1 : "#000000"} onChange={(e) => onChange(gradientCss({ ...g, c1: e.target.value }))} className="w-7 h-7 rounded-full overflow-hidden cursor-pointer bg-transparent border-0 p-0" />
                <input value={g.c1} onChange={(e) => onChange(gradientCss({ ...g, c1: e.target.value }))} className="flex-1 min-w-0 rounded-md ring-1 ring-charcoal/10 px-2 py-1 text-[12px] tabular-nums focus:outline-none focus:ring-green/40" />
              </div>
            </div>
          ) : (
            <div className="mt-2">
              <ColorPalette value={value} onChange={onChange} allowTransparent />
            </div>
          )}
        </div>
      )}
    </div>
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
                <input type="color" value={shadow.color.startsWith("#") ? shadow.color : "#000000"} onChange={(e) => onChange({ shadow: { ...shadow, color: e.target.value } })} className="w-7 h-7 rounded-full overflow-hidden cursor-pointer bg-transparent border-0 p-0" />
                <input value={shadow.color} onChange={(e) => onChange({ shadow: { ...shadow, color: e.target.value } })} className="flex-1 min-w-0 rounded-md ring-1 ring-charcoal/10 px-2 py-1 text-[12px] tabular-nums focus:outline-none focus:ring-green/40" />
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
          <NumField label="Rotation" value={layer.rotation} suffix="°" width={64} onCommit={(rotation) => onChange({ rotation: ((rotation % 360) + 360) % 360 })} />
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

/* ─── Layers panel ────────────────────────────────────────────────── */

export function LayersPanel({
  layers,
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
              className={`group mx-1.5 flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer select-none ${
                selected ? "bg-green/10 ring-1 ring-green/40" : "hover:bg-charcoal/4"
              } ${isOver ? "outline-dashed outline-1 outline-green/60" : ""}`}
            >
              <span className="text-charcoal/25 cursor-grab shrink-0"><GripIcon /></span>
              <span className={`shrink-0 ${selected ? "text-green" : "text-charcoal/45"}`}><LayerTypeIcon layer={l} /></span>
              {renaming === l.id ? (
                <input
                  autoFocus
                  defaultValue={layerLabel(l)}
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
                  {layerLabel(l)}
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
  return (
    <div className="fixed inset-0 z-[60] bg-charcoal/40 grid place-items-center p-6" onMouseDown={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-auto p-5" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading font-semibold text-charcoal text-lg">Choose an image</h2>
          <button type="button" onClick={onClose} className="text-charcoal/40 hover:text-charcoal text-[20px] leading-none">×</button>
        </div>
        {images.length === 0 ? (
          <p className="text-[13px] text-charcoal/45 py-8 text-center">No imagery available for this event.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {dr.length > 0 && <PickerSection label="Deen Relief library" items={dr} onPick={onPick} />}
            {ext.length > 0 && <PickerSection label="From the web" items={ext} onPick={onPick} />}
          </div>
        )}
      </div>
    </div>
  );
}

function PickerSection({ label, items, onPick }: { label: string; items: ImageCandidate[]; onPick: (i: ImageCandidate) => void }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal/40 mb-2">{label}</p>
      <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
        {items.map((img) => (
          <button key={img.id} type="button" onClick={() => onPick(img)} className="relative aspect-square rounded-lg overflow-hidden ring-1 ring-charcoal/10 hover:ring-green/60 transition">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.thumbnailUrl ?? img.url} alt="" className="absolute inset-0 w-full h-full object-cover" />
          </button>
        ))}
      </div>
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
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`h-9 px-2.5 rounded-lg text-[13px] text-charcoal/75 hover:bg-charcoal/5 flex items-center gap-1 ${open ? "bg-charcoal/5" : ""} ${wide ? "min-w-[120px] justify-between ring-1 ring-charcoal/10" : ""}`}
      >
        <span className="truncate">{label}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" className="text-charcoal/40"><path d="M3 4.5L6 7.5 9 4.5" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1.5 bg-white rounded-xl shadow-xl ring-1 ring-charcoal/10 z-50">
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

function ColorPopover({ value, onChange, label }: { value: string; onChange: (v: string) => void; label?: string }) {
  return (
    <Popover label={label ?? ""}>
      {() => <ColorPalette value={value} onChange={onChange} />}
    </Popover>
  );
}

/** A swatch-faced trigger that shows the current colour as a chip. */
function SwatchTrigger({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);
  const transparent = !value || value === "transparent";
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="h-9 px-2 rounded-lg ring-1 ring-charcoal/10 hover:bg-charcoal/5 flex items-center gap-1.5 text-[12.5px] text-charcoal/70"
      >
        <span
          className="w-4 h-4 rounded-[5px] ring-1 ring-charcoal/15"
          style={transparent ? { background: "conic-gradient(#ccc 25%, #fff 0 50%, #ccc 0 75%, #fff 0)", backgroundSize: "8px 8px" } : { background: value }}
        />
        {label}
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1.5 bg-white rounded-xl shadow-xl ring-1 ring-charcoal/10 z-50">
          <ColorPalette value={value} onChange={onChange} allowTransparent />
        </div>
      )}
    </div>
  );
}

function ColorPalette({ value, onChange, allowTransparent }: { value: string; onChange: (v: string) => void; allowTransparent?: boolean }) {
  return (
    <div className="w-52 p-3">
      <div className="flex items-center gap-1.5 flex-wrap">
        {SWATCHES.map((s) => (
          <button key={s} type="button" onClick={() => onChange(s)} className={`w-7 h-7 rounded-full ring-1 ring-charcoal/15 ${value.toLowerCase() === s.toLowerCase() ? "outline outline-2 outline-offset-1 outline-green" : ""}`} style={{ background: s }} />
        ))}
        <input type="color" value={value.startsWith("#") ? value : "#000000"} onChange={(e) => onChange(e.target.value)} className="w-7 h-7 rounded-full overflow-hidden cursor-pointer bg-transparent border-0 p-0" />
        {allowTransparent && (
          <button
            type="button"
            onClick={() => onChange("transparent")}
            className={`w-7 h-7 rounded-full ring-1 ring-charcoal/15 grid place-items-center text-[10px] text-charcoal/45 ${value === "transparent" ? "outline outline-2 outline-offset-1 outline-green" : ""}`}
            style={{ background: "conic-gradient(#ccc 25%, #fff 0 50%, #ccc 0 75%, #fff 0)", backgroundSize: "9px 9px" }}
            title="None"
          />
        )}
      </div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2.5 w-full rounded-md ring-1 ring-charcoal/10 px-2 py-1 text-[12px] tabular-nums focus:outline-none focus:ring-green/40"
        placeholder="#000000"
      />
    </div>
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
  return (
    <div className="flex items-center h-9 rounded-lg ring-1 ring-charcoal/10">
      <button type="button" onClick={() => onChange(value - 2)} className="w-7 h-full grid place-items-center text-charcoal/60 hover:bg-charcoal/5 rounded-l-lg">−</button>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || value)}
        className="w-10 text-center text-[13px] tabular-nums bg-transparent focus:outline-none"
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

function AlignCycle({ value, onChange }: { value: "left" | "center" | "right"; onChange: (v: "left" | "center" | "right") => void }) {
  const next = value === "left" ? "center" : value === "center" ? "right" : "left";
  return (
    <button type="button" onClick={() => onChange(next)} title={`Text align: ${value}`} className="w-9 h-9 rounded-lg grid place-items-center text-charcoal/65 hover:bg-charcoal/5">
      <svg width="16" height="16" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.5">
        <line x1="2" y1="4" x2="14" y2="4" strokeLinecap="round" />
        <line x1={value === "right" ? 5 : 2} y1="8" x2={value === "left" ? 11 : 14} y2="8" strokeLinecap="round" />
        <line x1="2" y1="12" x2="14" y2="12" strokeLinecap="round" />
      </svg>
    </button>
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
