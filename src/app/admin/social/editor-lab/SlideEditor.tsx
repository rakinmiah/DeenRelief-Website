"use client";

/**
 * SlideEditor — the Canva-style canvas (Phase 10a/10b).
 *
 * Renders an EditorSlide as positioned DOM layers and wires up
 * react-moveable for select / drag / resize / rotate / snap. Geometry
 * lives in board units; the canvas paints at a fit-to-viewport scale
 * (zoomable). All edits route through a three-stack history so the
 * whole thing is undo/redo-able.
 *
 * Gesture model: during a drag/resize/rotate Moveable writes the live
 * transform straight to the DOM node (no React churn); on gesture end
 * we convert screen px → board units and commit one history step.
 */

import Moveable from "react-moveable";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type EditorSlide,
  type Layer,
  type ShapeKind,
  makeLayerId,
} from "@/lib/social-editor/types";
import LayerView from "./LayerView";
import { useHistory } from "./useHistory";

export default function SlideEditor({ slide }: { slide: EditorSlide }) {
  const board = { width: slide.width, height: slide.height };
  const history = useHistory<Layer[]>(slide.layers);
  const layers = history.state;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scale, setScale] = useState(0.5);
  const [target, setTarget] = useState<HTMLElement | null>(null);

  const viewportRef = useRef<HTMLDivElement>(null);
  const moveableRef = useRef<Moveable>(null);
  const nodes = useRef<Map<string, HTMLElement>>(new Map());
  const fitRef = useRef(0.5);

  const selected = layers.find((l) => l.id === selectedId) ?? null;

  /* ── Fit-to-viewport ──────────────────────────────────────────── */
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const measure = () => {
      const pad = 96;
      const fit = Math.min(
        (el.clientWidth - pad) / board.width,
        (el.clientHeight - pad) / board.height
      );
      fitRef.current = Math.max(0.05, fit);
    };
    measure();
    setScale(fitRef.current);
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
    // board dims are static for a slide
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Keep Moveable's target + rect in sync ────────────────────── */
  useEffect(() => {
    setTarget(selectedId ? nodes.current.get(selectedId) ?? null : null);
  }, [selectedId, layers]);

  useEffect(() => {
    moveableRef.current?.updateRect();
  }, [scale, layers, target]);

  const registerNode = useCallback(
    (id: string) => (node: HTMLDivElement | null) => {
      if (node) nodes.current.set(id, node);
      else nodes.current.delete(id);
    },
    []
  );

  /* ── Layer mutation helpers ───────────────────────────────────── */
  function replaceLayer(id: string, patch: Partial<Layer>) {
    history.set(
      layers.map((l) => (l.id === id ? ({ ...l, ...patch } as Layer) : l))
    );
  }

  function addLayer(layer: Layer) {
    history.commit([...layers, layer]);
    setSelectedId(layer.id);
  }

  function deleteSelected() {
    if (!selectedId) return;
    history.commit(layers.filter((l) => l.id !== selectedId));
    setSelectedId(null);
  }

  function duplicateSelected() {
    if (!selected) return;
    const copy = {
      ...selected,
      id: makeLayerId(),
      x: selected.x + 24,
      y: selected.y + 24,
    } as Layer;
    history.commit([...layers, copy]);
    setSelectedId(copy.id);
  }

  function toggleLock() {
    if (!selected) return;
    history.commit(
      layers.map((l) =>
        l.id === selected.id ? ({ ...l, locked: !l.locked } as Layer) : l
      )
    );
  }

  function reorder(dir: "front" | "back" | "forward" | "backward") {
    if (!selectedId) return;
    const i = layers.findIndex((l) => l.id === selectedId);
    if (i < 0) return;
    const next = [...layers];
    const [item] = next.splice(i, 1);
    if (!item) return;
    if (dir === "front") next.push(item);
    else if (dir === "back") next.unshift(item);
    else if (dir === "forward") next.splice(Math.min(next.length, i + 1), 0, item);
    else next.splice(Math.max(0, i - 1), 0, item);
    history.commit(next);
  }

  /* ── Add new layers ───────────────────────────────────────────── */
  function addText() {
    addLayer({
      id: makeLayerId(),
      type: "text",
      x: board.width / 2 - 300,
      y: board.height / 2 - 60,
      w: 600,
      h: 120,
      rotation: 0,
      opacity: 1,
      locked: false,
      text: "Your text",
      fontFamily: '"DM Sans", sans-serif',
      fontSize: 64,
      fontWeight: 700,
      italic: false,
      underline: false,
      uppercase: false,
      color: "#1A1A2E",
      align: "center",
      lineHeight: 1.1,
      letterSpacing: 0,
    });
  }

  function addShape(shape: ShapeKind) {
    addLayer({
      id: makeLayerId(),
      type: "shape",
      x: board.width / 2 - 150,
      y: board.height / 2 - (shape === "line" ? 0 : 150),
      w: 300,
      h: shape === "line" ? 8 : 300,
      rotation: 0,
      opacity: 1,
      locked: false,
      shape,
      fill: shape === "line" ? "transparent" : "#2D6A2E",
      stroke: "#2D6A2E",
      strokeWidth: shape === "line" ? 8 : 0,
      radius: shape === "rect" ? 16 : 0,
    });
  }

  function addImage() {
    addLayer({
      id: makeLayerId(),
      type: "image",
      x: board.width / 2 - 300,
      y: board.height / 2 - 300,
      w: 600,
      h: 600,
      rotation: 0,
      opacity: 1,
      locked: false,
      src: "",
      objectFit: "cover",
      radius: 16,
    });
  }

  /* ── Gesture → board-unit commits ─────────────────────────────── */
  function commitGeom(id: string, patch: Partial<Layer>) {
    // checkpoint() already ran at gesture start; this is the final set.
    history.set(
      layers.map((l) => (l.id === id ? ({ ...l, ...patch } as Layer) : l))
    );
  }

  /* ── Keyboard ─────────────────────────────────────────────────── */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) history.redo();
        else history.undo();
        return;
      }
      if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        history.redo();
        return;
      }
      if (!selected || selected.locked) return;
      if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        deleteSelected();
        return;
      }
      const step = e.shiftKey ? 10 : 1;
      const nudges: Record<string, [number, number]> = {
        ArrowLeft: [-step, 0],
        ArrowRight: [step, 0],
        ArrowUp: [0, -step],
        ArrowDown: [0, step],
      };
      const d = nudges[e.key];
      if (d) {
        e.preventDefault();
        history.commit(
          layers.map((l) =>
            l.id === selected.id
              ? ({ ...l, x: l.x + d[0], y: l.y + d[1] } as Layer)
              : l
          )
        );
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, layers, history]);

  /* ── Snapping guidelines (board centre + edges, in display px) ─── */
  const vGuides = useMemo(
    () => [0, (board.width * scale) / 2, board.width * scale],
    [board.width, scale]
  );
  const hGuides = useMemo(
    () => [0, (board.height * scale) / 2, board.height * scale],
    [board.height, scale]
  );
  const elementGuidelines = useMemo(
    () =>
      layers
        .filter((l) => l.id !== selectedId)
        .map((l) => nodes.current.get(l.id))
        .filter((n): n is HTMLElement => !!n),
    [layers, selectedId]
  );

  const stageW = board.width * scale;
  const stageH = board.height * scale;

  return (
    <div className="flex flex-col h-full bg-[#F4F4F2]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 h-13 py-2.5 bg-white border-b border-charcoal/8 shrink-0">
        <div className="flex items-center gap-1">
          <ToolbarBtn label="Undo" onClick={history.undo} disabled={!history.canUndo}>
            <UndoIcon />
          </ToolbarBtn>
          <ToolbarBtn label="Redo" onClick={history.redo} disabled={!history.canRedo}>
            <UndoIcon flip />
          </ToolbarBtn>
        </div>
        <span className="text-[13px] font-medium text-charcoal/70">
          Slide editor
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setScale((s) => Math.max(0.05, s / 1.2))}
            className="w-7 h-7 grid place-items-center rounded-md hover:bg-charcoal/5 text-charcoal/60"
          >
            −
          </button>
          <button
            type="button"
            onClick={() => setScale(fitRef.current)}
            className="text-[12px] tabular-nums text-charcoal/60 w-12 text-center hover:text-charcoal"
          >
            {Math.round(scale * 100)}%
          </button>
          <button
            type="button"
            onClick={() => setScale((s) => Math.min(4, s * 1.2))}
            className="w-7 h-7 grid place-items-center rounded-md hover:bg-charcoal/5 text-charcoal/60"
          >
            +
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Left rail — add layers */}
        <div className="w-[72px] bg-white border-r border-charcoal/8 flex flex-col items-center py-3 gap-1 shrink-0">
          <RailBtn label="Text" onClick={addText}>
            <span className="text-[19px] font-bold">T</span>
          </RailBtn>
          <RailBtn label="Image" onClick={addImage}>
            <ImageIcon />
          </RailBtn>
          <RailBtn label="Rect" onClick={() => addShape("rect")}>
            <span className="block w-5 h-5 rounded-[4px] border-2 border-current" />
          </RailBtn>
          <RailBtn label="Circle" onClick={() => addShape("ellipse")}>
            <span className="block w-5 h-5 rounded-full border-2 border-current" />
          </RailBtn>
          <RailBtn label="Line" onClick={() => addShape("line")}>
            <span className="block w-5 h-0.5 bg-current" />
          </RailBtn>
        </div>

        {/* Canvas viewport */}
        <div
          ref={viewportRef}
          onMouseDown={() => setSelectedId(null)}
          className="flex-1 min-w-0 overflow-auto grid place-items-center p-12 relative"
        >
          <div
            className="relative shrink-0"
            style={{ width: stageW, height: stageH }}
          >
            {/* Artboard */}
            <div
              onMouseDown={(e) => {
                if (e.currentTarget === e.target) setSelectedId(null);
                e.stopPropagation();
              }}
              className="absolute inset-0 shadow-[0_8px_40px_rgba(0,0,0,0.10)]"
              style={{ background: slide.background, overflow: "visible" }}
            >
              {layers.map((l) => (
                <LayerView
                  key={l.id}
                  layer={l}
                  scale={scale}
                  selected={l.id === selectedId}
                  onSelect={setSelectedId}
                  nodeRef={registerNode(l.id)}
                />
              ))}
            </div>

            {/* Floating mini-toolbar above the selection */}
            {selected && (
              <div
                className="absolute z-20 flex items-center gap-0.5 bg-white rounded-lg shadow-lg ring-1 ring-charcoal/10 px-1 py-1"
                style={{
                  left: (selected.x + selected.w / 2) * scale,
                  top: selected.y * scale,
                  transform: "translate(-50%, calc(-100% - 10px))",
                }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <MiniBtn label="Forward" onClick={() => reorder("forward")}>
                  <LayerUpIcon />
                </MiniBtn>
                <MiniBtn label="Backward" onClick={() => reorder("backward")}>
                  <LayerUpIcon down />
                </MiniBtn>
                <MiniBtn label="Duplicate" onClick={duplicateSelected}>
                  <DuplicateIcon />
                </MiniBtn>
                <MiniBtn
                  label={selected.locked ? "Unlock" : "Lock"}
                  onClick={toggleLock}
                  active={selected.locked}
                >
                  <LockIcon open={!selected.locked} />
                </MiniBtn>
                <MiniBtn label="Delete" onClick={deleteSelected} danger>
                  <TrashIcon />
                </MiniBtn>
              </div>
            )}

            {/* Transform controls */}
            {target && selected && !selected.locked && (
              <Moveable
                ref={moveableRef}
                target={target}
                draggable
                resizable
                rotatable
                origin={false}
                throttleDrag={0}
                throttleResize={0}
                throttleRotate={0}
                snappable
                snapThreshold={6}
                snapDirections={{
                  top: true,
                  left: true,
                  bottom: true,
                  right: true,
                  center: true,
                  middle: true,
                }}
                elementSnapDirections={{
                  top: true,
                  left: true,
                  bottom: true,
                  right: true,
                  center: true,
                  middle: true,
                }}
                verticalGuidelines={vGuides}
                horizontalGuidelines={hGuides}
                elementGuidelines={elementGuidelines}
                onDragStart={history.checkpoint}
                onDrag={({ target: t, transform }) => {
                  (t as HTMLElement).style.transform = transform;
                }}
                onDragEnd={({ lastEvent }) => {
                  if (!lastEvent || !selectedId) return;
                  const [tx, ty] = lastEvent.beforeTranslate;
                  commitGeom(selectedId, { x: tx / scale, y: ty / scale });
                }}
                onResizeStart={history.checkpoint}
                onResize={({ target: t, width, height, drag }) => {
                  const el = t as HTMLElement;
                  el.style.width = `${width}px`;
                  el.style.height = `${height}px`;
                  el.style.transform = drag.transform;
                }}
                onResizeEnd={({ lastEvent }) => {
                  if (!lastEvent || !selectedId) return;
                  const [tx, ty] = lastEvent.drag.beforeTranslate;
                  commitGeom(selectedId, {
                    w: lastEvent.width / scale,
                    h: lastEvent.height / scale,
                    x: tx / scale,
                    y: ty / scale,
                  });
                }}
                onRotateStart={history.checkpoint}
                onRotate={({ target: t, transform }) => {
                  (t as HTMLElement).style.transform = transform;
                }}
                onRotateEnd={({ lastEvent }) => {
                  if (!lastEvent || !selectedId) return;
                  commitGeom(selectedId, { rotation: lastEvent.rotation });
                }}
              />
            )}
          </div>
        </div>

        {/* Right rail — quick properties for the selection */}
        <div className="w-[240px] bg-white border-l border-charcoal/8 p-4 shrink-0 overflow-auto">
          {selected ? (
            <SelectionPanel
              layer={selected}
              onChange={(patch) => {
                history.checkpoint();
                replaceLayer(selected.id, patch);
              }}
            />
          ) : (
            <p className="text-[12.5px] text-charcoal/40 leading-relaxed">
              Select a layer to edit it, or add one from the left. Drag to
              move, corners to resize, the top handle to rotate.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Right-rail quick properties (interim — full toolbars land in 10c/10d) ─ */

function SelectionPanel({
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
              max={200}
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
          </div>
        </>
      )}

      {layer.type === "shape" && (
        <Field label="Fill">
          <ColorRow value={layer.fill} onChange={(fill) => onChange({ fill })} />
        </Field>
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

/* ─── Buttons + icons ─────────────────────────────────────────────── */

function ToolbarBtn({
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

function RailBtn({
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

function MiniBtn({
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

function UndoIcon({ flip }: { flip?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" style={flip ? { transform: "scaleX(-1)" } : undefined}>
      <path d="M7 8H12.5a3.5 3.5 0 0 1 0 7H8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.5 5.5L6.5 8l3 2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ImageIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.5" />
      <path d="M21 16l-5-5L5 20" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function LayerUpIcon({ down }: { down?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" style={down ? { transform: "scaleY(-1)" } : undefined}>
      <path d="M10 4l4 4H6l4-4z" fill="currentColor" stroke="none" />
      <rect x="4.5" y="11" width="11" height="5" rx="1" />
    </svg>
  );
}
function DuplicateIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="7" y="7" width="9" height="9" rx="2" />
      <path d="M13 7V5.5A1.5 1.5 0 0 0 11.5 4H5.5A1.5 1.5 0 0 0 4 5.5v6A1.5 1.5 0 0 0 5.5 13H7" />
    </svg>
  );
}
function LockIcon({ open }: { open?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="5" y="9" width="10" height="7" rx="1.5" />
      <path d={open ? "M7 9V6.5a3 3 0 0 1 5.8-1" : "M7 9V6.5a3 3 0 0 1 6 0V9"} strokeLinecap="round" />
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M5 6h10M8 6V4.5h4V6M6.5 6l.6 9h5.8l.6-9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
