"use client";

/**
 * Shared chrome for the canvas editor — the small buttons, numeric
 * inputs and the icon set used by the top bar, left rail, the layers
 * panel, the contextual toolbar and the on-canvas mini-toolbar. Kept
 * in one place so every surface stays visually in sync.
 */

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

/* ─── Anchored portal dropdown ────────────────────────────────────────
 * Renders a floating panel anchored to a trigger element, but in a PORTAL
 * to <body> with fixed positioning — so it escapes any clipping ancestor.
 * The contextual toolbar is a horizontal-scroll strip (overflow-x:auto,
 * which forces overflow-y to clip): an in-flow `absolute` dropdown would be
 * cut off there. Portalling fixes every toolbar popover/colour picker in one
 * place. Closes on outside-click (trigger + panel are both "inside") and
 * repositions on scroll/resize. */
export function AnchoredPanel({
  anchorRef,
  open,
  onClose,
  children,
  className,
}: {
  anchorRef: RefObject<HTMLElement | null>;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }
    const place = () => {
      const a = anchorRef.current?.getBoundingClientRect();
      if (!a) return;
      const pw = panelRef.current?.offsetWidth ?? 240;
      const ph = panelRef.current?.offsetHeight ?? 240;
      let left = Math.min(a.left, window.innerWidth - pw - 8);
      left = Math.max(8, left);
      let top = a.bottom + 6;
      if (top + ph > window.innerHeight - 8) {
        const above = a.top - ph - 6;
        top = above >= 8 ? above : Math.max(8, window.innerHeight - ph - 8);
      }
      setCoords({ top, left });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, anchorRef]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (anchorRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      onClose();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, anchorRef, onClose]);

  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div
      ref={panelRef}
      style={{
        position: "fixed",
        top: coords?.top ?? -9999,
        left: coords?.left ?? -9999,
        visibility: coords ? "visible" : "hidden",
      }}
      className={`z-[80] bg-white rounded-xl shadow-xl ring-1 ring-charcoal/10 ${className ?? ""}`}
    >
      {children}
    </div>,
    document.body
  );
}

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
  active = false,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  /** Selected/open state — e.g. the Templates tab while its panel is open. */
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-14 h-14 rounded-xl grid place-content-center gap-1 transition ${
        active ? "bg-green/10 text-green" : "text-charcoal/70 hover:bg-charcoal/5"
      }`}
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

/* ─── Colour field (Figma-caliber: eyedropper + brand + saved) ────────
 * A drop-in upgrade of the editor's raw colour inputs. Renders a swatch
 * button + hex input (the prior behaviour) plus a popover with the native
 * EyeDropper, the Deen Relief brand palette, and user-saved swatches that
 * persist to localStorage. Used everywhere a single colour is picked
 * (text colour, shape fill, stroke, gradient stops, shadow). */

/** Deen Relief brand palette — exact tokens reused from presets `C`. */
const BRAND_SWATCHES: { hex: string; name: string }[] = [
  { hex: "#163827", name: "Forest" },
  { hex: "#0F2A1C", name: "Forest deep" },
  { hex: "#1C432F", name: "Forest soft" },
  { hex: "#F7F3E8", name: "Cream" },
  { hex: "#D4A843", name: "Gold" },
  { hex: "#A9842B", name: "Gold deep" },
  { hex: "#1A1A2E", name: "Charcoal" },
  { hex: "#FFFFFF", name: "White" },
];

const SAVED_SWATCHES_KEY = "dr-editor-swatches";

function readSavedSwatches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SAVED_SWATCHES_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function writeSavedSwatches(list: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SAVED_SWATCHES_KEY, JSON.stringify(list));
  } catch {
    /* ignore quota / private-mode failures */
  }
}

const sameColor = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/* ─── Colour maths for the Figma-style picker ─────────────────────── */

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const clamp255 = (n: number) => Math.max(0, Math.min(255, n));

type RGBA = { r: number; g: number; b: number; a: number };
type HSV = { h: number; s: number; v: number };

/** Parse hex (#rgb / #rrggbb / #rrggbbaa), rgb()/rgba(), or "transparent". */
function parseColor(input: string): RGBA {
  const s = (input || "").trim().toLowerCase();
  if (!s || s === "transparent") return { r: 0, g: 0, b: 0, a: 0 };
  let m = /^#([0-9a-f]{3,8})$/.exec(s);
  if (m) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = h.split("").map((c) => c + c).join("");
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    const a = h.length >= 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
    return { r, g, b, a };
  }
  m = /^rgba?\(([^)]+)\)$/.exec(s);
  if (m) {
    const p = m[1].split(",").map((x) => parseFloat(x.trim()));
    return {
      r: clamp255(p[0] || 0),
      g: clamp255(p[1] || 0),
      b: clamp255(p[2] || 0),
      a: p[3] == null || Number.isNaN(p[3]) ? 1 : clamp01(p[3]),
    };
  }
  return { r: 0, g: 0, b: 0, a: 1 };
}

/** {r,g,b,a} → "#rrggbb" (opaque) or "#rrggbbaa" (with alpha). */
function rgbaToHex(r: number, g: number, b: number, a = 1): string {
  const h = (n: number) => Math.round(clamp255(n)).toString(16).padStart(2, "0");
  const base = `#${h(r)}${h(g)}${h(b)}`;
  return a >= 1 ? base : base + h(a * 255);
}

function rgbToHsv(r: number, g: number, b: number): HSV {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h = h * 60;
    if (h < 0) h += 360;
  }
  return { h, s: max === 0 ? 0 : d / max, v: max };
}

function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
  const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
}

const CHECKER =
  "conic-gradient(#ccc 25%, #fff 0 50%, #ccc 0 75%, #fff 0) 0 0 / 8px 8px";

/* ─── The picker: saturation/value square + hue + alpha (Figma-style) ─ */

function ColorPicker({
  value,
  onChange,
  allowAlpha = true,
}: {
  value: string;
  onChange: (color: string) => void;
  allowAlpha?: boolean;
}) {
  const p0 = parseColor(value);
  const hsv0 = rgbToHsv(p0.r, p0.g, p0.b);
  const [h, setH] = useState(hsv0.h);
  const [s, setS] = useState(hsv0.s);
  const [v, setV] = useState(hsv0.v);
  const [a, setA] = useState(p0.a);
  // Tracks the last hex WE emitted so an echoed-back `value` doesn't reset the
  // handles (and so greys don't wipe the hue you're dragging through).
  const lastEmit = useRef(value);

  useEffect(() => {
    if (value === lastEmit.current) return;
    const p = parseColor(value);
    const hsv = rgbToHsv(p.r, p.g, p.b);
    setH((prev) => (hsv.s === 0 || hsv.v === 0 ? prev : hsv.h));
    setS(hsv.s);
    setV(hsv.v);
    setA(p.a);
  }, [value]);

  function emit(nh: number, ns: number, nv: number, na: number) {
    const { r, g, b } = hsvToRgb(nh, ns, nv);
    const hex = rgbaToHex(r, g, b, na);
    lastEmit.current = hex;
    onChange(hex);
  }

  const cur = hsvToRgb(h, s, v);
  const curRgb = `rgb(${Math.round(cur.r)}, ${Math.round(cur.g)}, ${Math.round(cur.b)})`;

  // Generic 1-D / 2-D drag: captures the rect once on pointer-down so the
  // handle tracks even when the cursor leaves the element.
  function startDrag(
    e: ReactPointerEvent<HTMLDivElement>,
    onAt: (xRatio: number, yRatio: number) => void
  ) {
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    const rect = el.getBoundingClientRect();
    const at = (cx: number, cy: number) =>
      onAt(clamp01((cx - rect.left) / rect.width), clamp01((cy - rect.top) / rect.height));
    at(e.clientX, e.clientY);
    const move = (ev: PointerEvent) => at(ev.clientX, ev.clientY);
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  return (
    <div className="flex flex-col gap-2.5 select-none">
      {/* Saturation × Value square */}
      <div
        onPointerDown={(e) =>
          startDrag(e, (x, y) => {
            setS(x);
            setV(1 - y);
            emit(h, x, 1 - y, a);
          })
        }
        className="relative w-full h-[136px] rounded-lg cursor-crosshair touch-none"
        style={{
          background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent), hsl(${h}, 100%, 50%)`,
        }}
      >
        <span
          className="absolute w-3.5 h-3.5 rounded-full border-2 border-white shadow -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{ left: `${s * 100}%`, top: `${(1 - v) * 100}%`, background: curRgb }}
        />
      </div>

      {/* Hue */}
      <div
        onPointerDown={(e) =>
          startDrag(e, (x) => {
            const nh = x * 360;
            setH(nh);
            emit(nh, s, v, a);
          })
        }
        className="relative w-full h-3 rounded-full cursor-pointer touch-none"
        style={{
          background:
            "linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)",
        }}
      >
        <span
          className="absolute top-1/2 w-3.5 h-3.5 rounded-full border-2 border-white shadow -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{ left: `${(h / 360) * 100}%`, background: `hsl(${h}, 100%, 50%)` }}
        />
      </div>

      {/* Alpha */}
      {allowAlpha && (
        <div
          onPointerDown={(e) =>
            startDrag(e, (x) => {
              setA(x);
              emit(h, s, v, x);
            })
          }
          className="relative w-full h-3 rounded-full cursor-pointer touch-none"
          style={{ background: CHECKER }}
        >
          <div
            className="absolute inset-0 rounded-full"
            style={{ background: `linear-gradient(to right, transparent, ${curRgb})` }}
          />
          <span
            className="absolute top-1/2 w-3.5 h-3.5 rounded-full border-2 border-white shadow -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{ left: `${a * 100}%`, background: curRgb }}
          />
        </div>
      )}
    </div>
  );
}

export function ColorField({
  value,
  onChange,
  label,
  allowTransparent,
}: {
  value: string;
  onChange: (hex: string) => void;
  label?: string;
  /** Adds a "None" (transparent) chip — used by stroke/fill controls. */
  allowTransparent?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState<string[]>([]);
  const btnRef = useRef<HTMLButtonElement>(null);

  // EyeDropper is a client-only, progressively-enhanced API — feature
  // detect on mount so SSR never touches `window` and unsupported
  // browsers simply don't render the button.
  const [hasEyeDropper, setHasEyeDropper] = useState(false);
  useEffect(() => {
    setHasEyeDropper(typeof window !== "undefined" && "EyeDropper" in window);
  }, []);

  // Hydrate saved swatches once on mount (localStorage guarded).
  useEffect(() => {
    setSaved(readSavedSwatches());
  }, []);

  const transparent = !value || value === "transparent";

  async function pickWithEyeDropper() {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r = await new (window as any).EyeDropper().open();
      if (r?.sRGBHex) onChange(r.sRGBHex);
    } catch {
      /* user cancelled the eyedropper — no-op */
    }
  }

  function addCurrent() {
    if (transparent) return;
    setSaved((prev) => {
      if (prev.some((s) => sameColor(s, value))) return prev;
      const next = [value, ...prev].slice(0, 24);
      writeSavedSwatches(next);
      return next;
    });
  }

  function removeSaved(hex: string) {
    setSaved((prev) => {
      const next = prev.filter((s) => !sameColor(s, hex));
      writeSavedSwatches(next);
      return next;
    });
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="h-9 px-2 rounded-lg ring-1 ring-charcoal/10 hover:bg-charcoal/5 flex items-center gap-1.5 text-[12.5px] text-charcoal/70"
      >
        <span
          className="w-4 h-4 rounded-[5px] ring-1 ring-charcoal/15"
          style={
            transparent
              ? { background: "conic-gradient(#ccc 25%, #fff 0 50%, #ccc 0 75%, #fff 0)", backgroundSize: "8px 8px" }
              : { background: value }
          }
        />
        {label ?? ""}
      </button>
      <AnchoredPanel anchorRef={btnRef} open={open} onClose={() => setOpen(false)} className="w-60 p-3 flex flex-col gap-3">
          {/* Hex input + eyedropper */}
          <div className="flex items-center gap-2">
            <span
              className="w-7 h-7 shrink-0 rounded-full ring-1 ring-charcoal/15"
              style={
                transparent
                  ? { background: "conic-gradient(#ccc 25%, #fff 0 50%, #ccc 0 75%, #fff 0)", backgroundSize: "9px 9px" }
                  : { background: value }
              }
            />
            <input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="flex-1 min-w-0 rounded-md ring-1 ring-charcoal/10 px-2 py-1.5 text-[12px] tabular-nums focus:outline-none focus:ring-green/40"
              placeholder="#000000"
            />
            {hasEyeDropper && (
              <button
                type="button"
                onClick={pickWithEyeDropper}
                aria-label="Pick colour from screen"
                title="Pick colour from screen"
                className="w-8 h-8 shrink-0 grid place-items-center rounded-md ring-1 ring-charcoal/10 text-charcoal/65 hover:bg-charcoal/5"
              >
                <EyeDropperIcon />
              </button>
            )}
          </div>

          {/* Full colour picker — saturation/value square + hue + alpha. */}
          <ColorPicker value={value} onChange={onChange} />

          {/* Brand palette */}
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-charcoal/40 mb-1.5">Brand</p>
            <div className="flex items-center gap-1.5 flex-wrap">
              {BRAND_SWATCHES.map((s) => (
                <button
                  key={s.hex}
                  type="button"
                  title={s.name}
                  onClick={() => onChange(s.hex)}
                  className={`w-7 h-7 rounded-full ring-1 ring-charcoal/15 ${sameColor(value, s.hex) ? "outline outline-2 outline-offset-1 outline-green" : ""}`}
                  style={{ background: s.hex }}
                />
              ))}
              {allowTransparent && (
                <button
                  type="button"
                  onClick={() => onChange("transparent")}
                  title="None"
                  className={`w-7 h-7 rounded-full ring-1 ring-charcoal/15 grid place-items-center text-[10px] text-charcoal/45 ${transparent ? "outline outline-2 outline-offset-1 outline-green" : ""}`}
                  style={{ background: "conic-gradient(#ccc 25%, #fff 0 50%, #ccc 0 75%, #fff 0)", backgroundSize: "9px 9px" }}
                />
              )}
            </div>
          </div>

          {/* Saved swatches */}
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-charcoal/40 mb-1.5">Saved</p>
            <div className="flex items-center gap-1.5 flex-wrap">
              {saved.map((s) => (
                <span key={s} className="relative group/sw">
                  <button
                    type="button"
                    title={s}
                    onClick={() => onChange(s)}
                    className={`w-7 h-7 rounded-full ring-1 ring-charcoal/15 ${sameColor(value, s) ? "outline outline-2 outline-offset-1 outline-green" : ""}`}
                    style={{ background: s }}
                  />
                  <button
                    type="button"
                    aria-label={`Remove ${s}`}
                    title="Remove"
                    onClick={() => removeSaved(s)}
                    className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-charcoal text-white grid place-items-center text-[8px] leading-none opacity-0 group-hover/sw:opacity-100 transition"
                  >
                    ×
                  </button>
                </span>
              ))}
              <button
                type="button"
                aria-label="Save current colour"
                title="Save current colour"
                onClick={addCurrent}
                className="w-7 h-7 rounded-full ring-1 ring-dashed ring-charcoal/25 grid place-items-center text-charcoal/45 hover:ring-charcoal/40 hover:text-charcoal/70"
              >
                <svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M10 5v10M5 10h10" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>
      </AnchoredPanel>
    </>
  );
}

function EyeDropperIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M13.5 3.5a1.8 1.8 0 0 1 2.5 2.5l-1.4 1.4-2.5-2.5 1.4-1.4z" strokeLinejoin="round" />
      <path d="M11.4 5.6L4.8 12.2a2 2 0 0 0-.5.9l-.6 2.4a.5.5 0 0 0 .6.6l2.4-.6a2 2 0 0 0 .9-.5l6.6-6.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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
/** Flip icons — a shape mirrored across a dashed axis. `axis="h"` mirrors
 *  left↔right (vertical axis line); `axis="v"` mirrors top↔bottom. */
export function FlipIcon({ axis }: { axis: "h" | "v" }) {
  const c = "currentColor";
  if (axis === "h") {
    return (
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke={c} strokeWidth="1.4">
        <line x1="10" y1="2.5" x2="10" y2="17.5" strokeDasharray="2 2" strokeLinecap="round" />
        <path d="M8 5L3.5 10 8 15z" fill={c} stroke="none" />
        <path d="M12 5L16.5 10 12 15z" fill={c} opacity="0.4" stroke="none" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke={c} strokeWidth="1.4">
      <line x1="2.5" y1="10" x2="17.5" y2="10" strokeDasharray="2 2" strokeLinecap="round" />
      <path d="M5 8L10 3.5 15 8z" fill={c} stroke="none" />
      <path d="M5 12L10 16.5 15 12z" fill={c} opacity="0.4" stroke="none" />
    </svg>
  );
}
/** Auto-layout — a frame with two stacked bars hinting flex distribution. */
export function AutoLayoutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2.5" y="2.5" width="15" height="15" rx="2.5" />
      <rect x="5" y="5.5" width="10" height="3.2" rx="1" fill="currentColor" stroke="none" opacity="0.85" />
      <rect x="5" y="11.3" width="6.5" height="3.2" rx="1" fill="currentColor" stroke="none" opacity="0.55" />
    </svg>
  );
}
/** Mask — a photo (mountains) clipped by a circle window, hinting
 *  "use shape as mask". */
export function MaskIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2.5" y="2.5" width="15" height="15" rx="2" strokeDasharray="2.4 2.2" opacity="0.5" />
      <circle cx="10" cy="10" r="5" fill="currentColor" stroke="none" opacity="0.18" />
      <circle cx="10" cy="10" r="5" />
      <path d="M6.5 12.5l2-2.4 1.6 1.7 1.6-2 1.8 2.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
/** Component — a small diamond/marker badge (Figma-style component glyph)
 *  inside a frame, signalling a reusable instance. */
export function ComponentIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2.75" y="2.75" width="14.5" height="14.5" rx="2.5" />
      <path d="M10 5.5l2.4 2.4-2.4 2.4-2.4-2.4L10 5.5z" fill="currentColor" stroke="none" opacity="0.9" />
      <path d="M10 11.2l2.4 2.4M10 11.2L7.6 13.6" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}
/** "Detach instance" — a broken link (two chain links pulling apart). */
export function DetachIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M8.5 11.5l-2 2a2.5 2.5 0 0 1-3.5-3.5l2-2" strokeLinecap="round" />
      <path d="M11.5 8.5l2-2a2.5 2.5 0 0 1 3.5 3.5l-2 2" strokeLinecap="round" />
      <path d="M9 4.5V2.5M4.5 9H2.5M15.5 11H17.5M11 15.5V17.5" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}
/** "Edit component master" — a pencil over a frame. */
export function EditIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M11.5 4.5l4 4L8 16l-4 1 1-4 6.5-8.5z" strokeLinejoin="round" />
      <path d="M10.5 5.5l4 4" />
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
