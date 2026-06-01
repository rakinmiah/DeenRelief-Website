"use client";

/**
 * Shared chrome for the canvas editor — the small buttons, numeric
 * inputs and the icon set used by the top bar, left rail, the layers
 * panel, the contextual toolbar and the on-canvas mini-toolbar. Kept
 * in one place so every surface stays visually in sync.
 */

import type { ReactNode } from "react";

/* ─── Buttons ─────────────────────────────────────────────────────── */

export function ToolbarBtn({
  label,
  onClick,
  disabled,
  active,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`w-8 h-8 grid place-items-center rounded-md disabled:opacity-25 disabled:hover:bg-transparent transition ${
        active ? "bg-green/10 text-green" : "text-charcoal/65 hover:bg-charcoal/5"
      }`}
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
  children: ReactNode;
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
  disabled,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  danger?: boolean;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`w-8 h-8 grid place-items-center rounded-md transition disabled:opacity-25 ${
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

/** Compact labelled numeric input used by the property toolbar
 *  (position / size / rotation). Commits on blur and Enter. */
export function NumField({
  label,
  value,
  onCommit,
  width = 56,
  min,
  max,
  suffix,
}: {
  label: string;
  value: number;
  onCommit: (v: number) => void;
  width?: number;
  min?: number;
  max?: number;
  suffix?: string;
}) {
  return (
    <label className="flex items-center gap-1 h-9 px-1.5 rounded-lg ring-1 ring-charcoal/10">
      <span className="text-[11px] font-semibold text-charcoal/40 select-none">{label}</span>
      <input
        type="number"
        defaultValue={Math.round(value)}
        key={Math.round(value)}
        min={min}
        max={max}
        onBlur={(e) => commit(e.target, value, onCommit, min, max)}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        style={{ width }}
        className="text-[12.5px] tabular-nums bg-transparent text-charcoal/85 focus:outline-none text-right"
      />
      {suffix && <span className="text-[11px] text-charcoal/35 select-none">{suffix}</span>}
    </label>
  );
}

function commit(
  el: HTMLInputElement,
  fallback: number,
  onCommit: (v: number) => void,
  min?: number,
  max?: number
) {
  let v = Number(el.value);
  if (!Number.isFinite(v)) v = fallback;
  if (min != null) v = Math.max(min, v);
  if (max != null) v = Math.min(max, v);
  onCommit(v);
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
export function ChevronIcon({ dir = "right" }: { dir?: "right" | "left" | "up" | "down" }) {
  const rot = dir === "left" ? 180 : dir === "up" ? -90 : dir === "down" ? 90 : 0;
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ transform: `rotate(${rot}deg)` }}>
      <path d="M8 5l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
export function EyeIcon({ off }: { off?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2 10s3-5 8-5 8 5 8 5-3 5-8 5-8-5-8-5z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="10" cy="10" r="2.4" />
      {off && <path d="M3 3l14 14" strokeLinecap="round" />}
    </svg>
  );
}
export function TextIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 6V4.5h12V6M10 4.5v11M7.5 15.5h5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
export function ShapeIcon({ kind }: { kind: "rect" | "ellipse" | "line" }) {
  if (kind === "ellipse") {
    return (
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="10" cy="10" r="6" />
      </svg>
    );
  }
  if (kind === "line") {
    return (
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 14L16 6" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="4" y="5" width="12" height="10" rx="1.5" />
    </svg>
  );
}
/** Two overlapping boxes bound by a dashed frame — "group". */
export function GroupIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2.5" y="2.5" width="15" height="15" rx="2" strokeDasharray="2.4 2.2" opacity="0.55" />
      <rect x="5" y="5" width="6" height="6" rx="1.2" fill="currentColor" stroke="none" opacity="0.85" />
      <rect x="9" y="9" width="6" height="6" rx="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}
/** Same boxes, broken frame — "ungroup". */
export function UngroupIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2.5 6V3.5a1 1 0 0 1 1-1H6M14 2.5h2.5a1 1 0 0 1 1 1V6M17.5 14v2.5a1 1 0 0 1-1 1H14M6 17.5H3.5a1 1 0 0 1-1-1V14" strokeLinecap="round" opacity="0.55" />
      <rect x="5" y="5" width="6" height="6" rx="1.2" fill="currentColor" stroke="none" opacity="0.85" />
      <rect x="9" y="9" width="6" height="6" rx="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}
export function LayersIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M10 3l7 4-7 4-7-4 7-4z" strokeLinejoin="round" />
      <path d="M3 11l7 4 7-4" strokeLinejoin="round" />
    </svg>
  );
}
export function GripIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
      <circle cx="7" cy="5" r="1.3" /><circle cx="13" cy="5" r="1.3" />
      <circle cx="7" cy="10" r="1.3" /><circle cx="13" cy="10" r="1.3" />
      <circle cx="7" cy="15" r="1.3" /><circle cx="13" cy="15" r="1.3" />
    </svg>
  );
}

/** Align icons. `axis` = which edge/line we align to. */
export function AlignIcon({ kind }: { kind: "left" | "hcenter" | "right" | "top" | "vcenter" | "bottom" }) {
  // A bar + two boxes snapped to it.
  const c = "currentColor";
  switch (kind) {
    case "left":
      return <svg width="16" height="16" viewBox="0 0 20 20"><rect x="3" y="3" width="1.4" height="14" fill={c} /><rect x="6" y="5" width="9" height="3.5" rx="1" fill={c} opacity="0.85" /><rect x="6" y="11.5" width="6" height="3.5" rx="1" fill={c} opacity="0.55" /></svg>;
    case "right":
      return <svg width="16" height="16" viewBox="0 0 20 20"><rect x="15.6" y="3" width="1.4" height="14" fill={c} /><rect x="5" y="5" width="9" height="3.5" rx="1" fill={c} opacity="0.85" /><rect x="8" y="11.5" width="6" height="3.5" rx="1" fill={c} opacity="0.55" /></svg>;
    case "hcenter":
      return <svg width="16" height="16" viewBox="0 0 20 20"><rect x="9.3" y="3" width="1.4" height="14" fill={c} /><rect x="3.5" y="5" width="13" height="3.5" rx="1" fill={c} opacity="0.85" /><rect x="6" y="11.5" width="8" height="3.5" rx="1" fill={c} opacity="0.55" /></svg>;
    case "top":
      return <svg width="16" height="16" viewBox="0 0 20 20"><rect x="3" y="3" width="14" height="1.4" fill={c} /><rect x="5" y="6" width="3.5" height="9" rx="1" fill={c} opacity="0.85" /><rect x="11.5" y="6" width="3.5" height="6" rx="1" fill={c} opacity="0.55" /></svg>;
    case "bottom":
      return <svg width="16" height="16" viewBox="0 0 20 20"><rect x="3" y="15.6" width="14" height="1.4" fill={c} /><rect x="5" y="5" width="3.5" height="9" rx="1" fill={c} opacity="0.85" /><rect x="11.5" y="8" width="3.5" height="6" rx="1" fill={c} opacity="0.55" /></svg>;
    case "vcenter":
      return <svg width="16" height="16" viewBox="0 0 20 20"><rect x="3" y="9.3" width="14" height="1.4" fill={c} /><rect x="5" y="3.5" width="3.5" height="13" rx="1" fill={c} opacity="0.85" /><rect x="11.5" y="6" width="3.5" height="8" rx="1" fill={c} opacity="0.55" /></svg>;
  }
}
export function DistributeIcon({ axis }: { axis: "h" | "v" }) {
  const c = "currentColor";
  if (axis === "h") {
    return <svg width="16" height="16" viewBox="0 0 20 20"><rect x="2.5" y="6" width="2.5" height="8" rx="1" fill={c} /><rect x="8.75" y="6" width="2.5" height="8" rx="1" fill={c} /><rect x="15" y="6" width="2.5" height="8" rx="1" fill={c} /></svg>;
  }
  return <svg width="16" height="16" viewBox="0 0 20 20"><rect x="6" y="2.5" width="8" height="2.5" rx="1" fill={c} /><rect x="6" y="8.75" width="8" height="2.5" rx="1" fill={c} /><rect x="6" y="15" width="8" height="2.5" rx="1" fill={c} /></svg>;
}
