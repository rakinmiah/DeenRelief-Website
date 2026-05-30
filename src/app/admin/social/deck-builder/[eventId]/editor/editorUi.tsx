"use client";

/**
 * Shared chrome for the canvas editor (Phase 10e wiring) — the
 * right-rail property panel + the small buttons/icons used by the
 * top bar, left rail and the on-canvas mini-toolbar. Kept in one
 * place so SlideCanvas and CanvasDeckEditor stay in sync.
 */

import type { Layer } from "@/lib/social-editor/types";

/* ─── Right-rail quick properties ─────────────────────────────────── */

export function SelectionPanel({
  layer,
  onChange,
}: {
  layer: Layer;
  onChange: (patch: Partial<Layer>) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal/40">
        {layer.type}
      </p>

      {layer.type === "text" && (
        <>
          <Field label="Text">
            <textarea
              value={layer.text}
              onChange={(e) => onChange({ text: e.target.value })}
              rows={3}
              className="w-full rounded-lg ring-1 ring-charcoal/10 px-2.5 py-2 text-[13px] resize-none focus:outline-none focus:ring-green/50"
            />
          </Field>
          <Field label={`Size · ${Math.round(layer.fontSize)}`}>
            <input
              type="range"
              min={12}
              max={220}
              value={layer.fontSize}
              onChange={(e) => onChange({ fontSize: Number(e.target.value) })}
              className="w-full accent-green"
            />
          </Field>
          <Field label="Colour">
            <ColorRow value={layer.color} onChange={(color) => onChange({ color })} />
          </Field>
          <div className="flex gap-1.5">
            <Toggle on={layer.fontWeight >= 700} onClick={() => onChange({ fontWeight: layer.fontWeight >= 700 ? 400 : 700 })}>B</Toggle>
            <Toggle on={layer.italic} onClick={() => onChange({ italic: !layer.italic })}><span className="italic">I</span></Toggle>
            <Toggle on={layer.uppercase} onClick={() => onChange({ uppercase: !layer.uppercase })}>AA</Toggle>
            <div className="flex-1" />
            <Align value={layer.align} onChange={(align) => onChange({ align })} />
          </div>
        </>
      )}

      {layer.type === "shape" && (
        <>
          <Field label="Fill">
            <ColorRow value={layer.fill} onChange={(fill) => onChange({ fill })} />
          </Field>
          {layer.shape === "line" && (
            <Field label="Colour">
              <ColorRow value={layer.stroke} onChange={(stroke) => onChange({ stroke })} />
            </Field>
          )}
        </>
      )}

      {layer.type === "image" && (
        <Field label="Image URL">
          <input
            value={layer.src}
            onChange={(e) => onChange({ src: e.target.value })}
            placeholder="https://…"
            className="w-full rounded-lg ring-1 ring-charcoal/10 px-2.5 py-2 text-[12px] focus:outline-none focus:ring-green/50"
          />
        </Field>
      )}

      <Field label={`Opacity · ${Math.round(layer.opacity * 100)}%`}>
        <input
          type="range"
          min={0}
          max={100}
          value={layer.opacity * 100}
          onChange={(e) => onChange({ opacity: Number(e.target.value) / 100 })}
          className="w-full accent-green"
        />
      </Field>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium text-charcoal/50">{label}</span>
      {children}
    </label>
  );
}

function ColorRow({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const swatches = ["#163827", "#2D6A2E", "#D4A843", "#F7F3E8", "#1A1A2E", "#FFFFFF", "#C0392B"];
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {swatches.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          className={`w-6 h-6 rounded-full ring-1 ring-charcoal/15 ${value.toLowerCase() === s.toLowerCase() ? "outline outline-2 outline-offset-1 outline-green" : ""}`}
          style={{ background: s }}
        />
      ))}
      <input
        type="color"
        value={value.startsWith("#") ? value : "#000000"}
        onChange={(e) => onChange(e.target.value)}
        className="w-6 h-6 rounded-full overflow-hidden cursor-pointer bg-transparent border-0 p-0"
      />
    </div>
  );
}

function Toggle({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-9 h-8 rounded-md text-[13px] font-semibold transition ${on ? "bg-green text-white" : "ring-1 ring-charcoal/10 text-charcoal/70 hover:ring-charcoal/30"}`}
    >
      {children}
    </button>
  );
}

function Align({
  value,
  onChange,
}: {
  value: "left" | "center" | "right";
  onChange: (v: "left" | "center" | "right") => void;
}) {
  const opts: Array<"left" | "center" | "right"> = ["left", "center", "right"];
  return (
    <div className="flex gap-0.5">
      {opts.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={`w-8 h-8 grid place-items-center rounded-md ${value === o ? "bg-green/10 text-green" : "text-charcoal/55 hover:bg-charcoal/5"}`}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.4">
            <line x1="2" y1="4" x2="14" y2="4" strokeLinecap="round" />
            <line x1="2" y1="8" x2={o === "left" ? 10 : o === "center" ? 13 : 14} y2="8" strokeLinecap="round" transform={o === "center" ? "translate(-1.5 0)" : o === "right" ? "translate(0 0)" : ""} />
            <line x1="2" y1="12" x2="11" y2="12" strokeLinecap="round" />
          </svg>
        </button>
      ))}
    </div>
  );
}

/* ─── Buttons ─────────────────────────────────────────────────────── */

export function ToolbarBtn({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="w-8 h-8 grid place-items-center rounded-md text-charcoal/65 hover:bg-charcoal/5 disabled:opacity-25 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}

export function RailBtn({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-14 h-14 rounded-xl grid place-content-center gap-1 text-charcoal/70 hover:bg-charcoal/5 transition"
    >
      <span className="grid place-items-center h-5">{children}</span>
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

export function MiniBtn({
  label,
  onClick,
  children,
  danger,
  active,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  danger?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`w-8 h-8 grid place-items-center rounded-md transition ${
        danger
          ? "text-charcoal/60 hover:bg-red-50 hover:text-red-600"
          : active
            ? "bg-green/10 text-green"
            : "text-charcoal/65 hover:bg-charcoal/5"
      }`}
    >
      {children}
    </button>
  );
}

/* ─── Icons ───────────────────────────────────────────────────────── */

export function UndoIcon({ flip }: { flip?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" style={flip ? { transform: "scaleX(-1)" } : undefined}>
      <path d="M7 8H12.5a3.5 3.5 0 0 1 0 7H8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.5 5.5L6.5 8l3 2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
export function ImageIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.5" />
      <path d="M21 16l-5-5L5 20" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
export function LayerUpIcon({ down }: { down?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" style={down ? { transform: "scaleY(-1)" } : undefined}>
      <path d="M10 4l4 4H6l4-4z" fill="currentColor" stroke="none" />
      <rect x="4.5" y="11" width="11" height="5" rx="1" />
    </svg>
  );
}
export function DuplicateIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="7" y="7" width="9" height="9" rx="2" />
      <path d="M13 7V5.5A1.5 1.5 0 0 0 11.5 4H5.5A1.5 1.5 0 0 0 4 5.5v6A1.5 1.5 0 0 0 5.5 13H7" />
    </svg>
  );
}
export function LockIcon({ open }: { open?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="5" y="9" width="10" height="7" rx="1.5" />
      <path d={open ? "M7 9V6.5a3 3 0 0 1 5.8-1" : "M7 9V6.5a3 3 0 0 1 6 0V9"} strokeLinecap="round" />
    </svg>
  );
}
export function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M5 6h10M8 6V4.5h4V6M6.5 6l.6 9h5.8l.6-9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
export function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M10 5v10M5 10h10" strokeLinecap="round" />
    </svg>
  );
}
export function ChevronIcon({ dir = "right" }: { dir?: "right" | "left" }) {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" style={dir === "left" ? { transform: "scaleX(-1)" } : undefined}>
      <path d="M8 5l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
