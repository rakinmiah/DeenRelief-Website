"use client";

/**
 * Canva-style contextual top toolbar + its popovers, image picker and
 * crop/filter panels (Phase 10c/10d). The toolbar swaps controls based
 * on the selected layer's type; everything writes back through
 * onChange (which the editor commits to history).
 */

import { useEffect, useRef, useState } from "react";
import type { ImageCandidate } from "@/lib/social-templates/types";
import type { ImageCrop, ImageFilter, Layer } from "@/lib/social-editor/types";
import { FONT_OPTIONS, bareFamily, nearestWeight } from "@/lib/social-editor/fonts";
import { FILTER_PRESETS } from "@/lib/social-editor/imageStyle";

const SWATCHES = ["#163827", "#2D6A2E", "#D4A843", "#F7F3E8", "#1A1A2E", "#FFFFFF", "#C0392B", "#000000"];

/* ─── Contextual toolbar ──────────────────────────────────────────── */

export function ContextToolbar({
  layer,
  onChange,
  onReplaceImage,
}: {
  layer: Layer;
  onChange: (patch: Partial<Layer>) => void;
  onReplaceImage: () => void;
}) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {layer.type === "text" && (
        <TextControls layer={layer} onChange={onChange} />
      )}
      {layer.type === "image" && (
        <ImageControls layer={layer} onChange={onChange} onReplaceImage={onReplaceImage} />
      )}
      {layer.type === "shape" && (
        <ShapeControls layer={layer} onChange={onChange} />
      )}
      <Divider />
      <OpacityPopover value={layer.opacity} onChange={(opacity) => onChange({ opacity })} />
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
  const famLabel = FONT_OPTIONS.find((o) => o.family === fam)?.label ?? fam;
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

      <Toggle on={layer.fontWeight >= 700} onClick={() => onChange({ fontWeight: layer.fontWeight >= 700 ? 400 : 700 })}>B</Toggle>
      <Toggle on={layer.italic} onClick={() => onChange({ italic: !layer.italic })}><span className="italic">I</span></Toggle>
      <Toggle on={layer.underline} onClick={() => onChange({ underline: !layer.underline })}><span className="underline">U</span></Toggle>
      <Toggle on={layer.uppercase} onClick={() => onChange({ uppercase: !layer.uppercase })}>AA</Toggle>

      <Divider />

      <AlignControl value={layer.align} onChange={(align) => onChange({ align })} />

      <Popover label="Spacing">
        {() => (
          <div className="w-52 p-3 flex flex-col gap-3">
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
            <button type="button" onClick={() => onChange({ crop: undefined })} className="text-[12px] text-charcoal/45 hover:text-charcoal/70 self-start">Reset crop</button>
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
    return <ColorPopover label="Colour" value={layer.stroke} onChange={(stroke) => onChange({ stroke })} />;
  }
  return <ColorPopover label="Fill" value={layer.fill} onChange={(fill) => onChange({ fill })} />;
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
  children: (close: () => void) => React.ReactNode;
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
      {() => (
        <div className="w-48 p-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            {SWATCHES.map((s) => (
              <button key={s} type="button" onClick={() => onChange(s)} className={`w-7 h-7 rounded-full ring-1 ring-charcoal/15 ${value.toLowerCase() === s.toLowerCase() ? "outline outline-2 outline-offset-1 outline-green" : ""}`} style={{ background: s }} />
            ))}
            <input type="color" value={value.startsWith("#") ? value : "#000000"} onChange={(e) => onChange(e.target.value)} className="w-7 h-7 rounded-full overflow-hidden cursor-pointer bg-transparent border-0 p-0" />
          </div>
        </div>
      )}
    </Popover>
  );
}

// A standalone trigger so the colour swatch shows the current colour.
function ColorButton({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <ColorPopover value={value} onChange={onChange} />;
}
void ColorButton;

function OpacityPopover({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <Popover label={`${Math.round(value * 100)}%`}>
      {() => (
        <div className="w-48 p-3">
          <Slider label="Opacity" min={0} max={1} step={0.01} value={value} onChange={onChange} />
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

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={`w-9 h-9 rounded-lg text-[14px] font-semibold transition ${on ? "bg-green text-white" : "text-charcoal/70 hover:bg-charcoal/5"}`}>
      {children}
    </button>
  );
}

function TextBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="h-9 px-3 rounded-lg text-[13px] text-charcoal/75 hover:bg-charcoal/5 ring-1 ring-charcoal/10">
      {children}
    </button>
  );
}

function AlignControl({ value, onChange }: { value: "left" | "center" | "right"; onChange: (v: "left" | "center" | "right") => void }) {
  const next = value === "left" ? "center" : value === "center" ? "right" : "left";
  return (
    <button type="button" onClick={() => onChange(next)} title={`Align: ${value}`} className="w-9 h-9 rounded-lg grid place-items-center text-charcoal/65 hover:bg-charcoal/5">
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
