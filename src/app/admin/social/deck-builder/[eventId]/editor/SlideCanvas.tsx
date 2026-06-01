"use client";

/**
 * SlideCanvas — the editable stage for ONE slide.
 *
 * Fully controlled: it renders `slide.layers` at `scale`, runs
 * react-moveable on the current selection (single OR a group of
 * targets), and reports geometry changes back up. History lives in the
 * parent — this component signals onCheckpoint at gesture start and
 * onLayersCommit at gesture end.
 *
 * Snapping: vertical/horizontal slide guidelines (edges + centre) plus
 * element guidelines (other layers' edges/centres) drive smart-guide
 * snapping while dragging/resizing.
 */

import Moveable from "react-moveable";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { EditorSlide, Layer } from "@/lib/social-editor/types";
import LayerView from "./LayerView";
import { MiniBtn, DuplicateIcon, LayerUpIcon, LockIcon, TrashIcon } from "./editorUi";

export default function SlideCanvas({
  slide,
  scale,
  selectedIds,
  editingId,
  onSelect,
  onStartEdit,
  onCommitText,
  onCheckpoint,
  onLayersCommit,
  onReorder,
  onDuplicate,
  onToggleLock,
  onDelete,
  onMarquee,
}: {
  slide: EditorSlide;
  scale: number;
  selectedIds: string[];
  editingId: string | null;
  onSelect: (id: string | null, additive: boolean) => void;
  onStartEdit: (id: string) => void;
  onCommitText: (id: string, text: string) => void;
  onCheckpoint: () => void;
  onLayersCommit: (layers: Layer[]) => void;
  onReorder: (dir: "forward" | "backward" | "front" | "back") => void;
  onDuplicate: () => void;
  onToggleLock: () => void;
  onDelete: () => void;
  /** Box-select rectangle finished (board-unit rect). */
  onMarquee: (rect: { x: number; y: number; w: number; h: number }, additive: boolean) => void;
}) {
  const layers = slide.layers;
  const moveableRef = useRef<Moveable>(null);
  const nodes = useRef<Map<string, HTMLElement>>(new Map());
  const [targets, setTargets] = useState<HTMLElement[]>([]);
  const [elementGuidelines, setElementGuidelines] = useState<HTMLElement[]>([]);
  // Hold Shift to lock aspect ratio while resizing (Figma/Canva behaviour).
  const [shiftRatio, setShiftRatio] = useState(false);

  const selectedLayers = layers.filter((l) => selectedIds.includes(l.id));
  const single = selectedLayers.length === 1 ? selectedLayers[0]! : null;
  const isGroup = selectedLayers.length > 1;

  // Resolve selection ids → live DOM nodes whenever the selection or the
  // layer list changes; likewise the snap guideline elements (every
  // other visible, unselected layer's node). Done in an effect so the
  // ref map is read AFTER paint, never during render.
  useEffect(() => {
    setTargets(
      selectedIds
        .map((id) => nodes.current.get(id))
        .filter((n): n is HTMLElement => !!n)
    );
    setElementGuidelines(
      layers
        .filter((l) => !l.hidden && !selectedIds.includes(l.id))
        .map((l) => nodes.current.get(l.id))
        .filter((n): n is HTMLElement => !!n)
    );
  }, [selectedIds, layers]);

  useEffect(() => {
    moveableRef.current?.updateRect();
  }, [scale, layers, targets]);

  // Track the Shift key globally so a resize gesture can lock aspect
  // ratio (keepRatio) the instant Shift is held — even mid-drag.
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => { if (e.key === "Shift") setShiftRatio(true); };
    const onUp = (e: KeyboardEvent) => { if (e.key === "Shift") setShiftRatio(false); };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, []);

  const registerNode = useCallback(
    (id: string) => (node: HTMLDivElement | null) => {
      if (node) nodes.current.set(id, node);
      else nodes.current.delete(id);
    },
    []
  );

  function commitGeom(patches: Record<string, Partial<Layer>>) {
    onLayersCommit(
      layers.map((l) => (patches[l.id] ? ({ ...l, ...patches[l.id] } as Layer) : l))
    );
  }

  /* ── Snap guidelines (slide edges + centre) ──────────────────── */
  const vGuides = useMemo(
    () => [0, (slide.width * scale) / 2, slide.width * scale],
    [slide.width, scale]
  );
  const hGuides = useMemo(
    () => [0, (slide.height * scale) / 2, slide.height * scale],
    [slide.height, scale]
  );

  const stageW = slide.width * scale;
  const stageH = slide.height * scale;

  /* ── Marquee (box) selection over empty artboard ─────────────── */
  const stageRef = useRef<HTMLDivElement>(null);
  const [marquee, setMarquee] = useState<null | { x0: number; y0: number; x1: number; y1: number; additive: boolean }>(null);

  function startMarquee(e: React.MouseEvent) {
    if (e.button !== 0) return;
    const host = stageRef.current;
    if (!host) return;
    const r = host.getBoundingClientRect();
    const x0 = e.clientX - r.left;
    const y0 = e.clientY - r.top;
    const additive = e.shiftKey || e.metaKey || e.ctrlKey;
    if (!additive) onSelect(null, false);
    setMarquee({ x0, y0, x1: x0, y1: y0, additive });
    const move = (ev: MouseEvent) => {
      setMarquee((m) => (m ? { ...m, x1: ev.clientX - r.left, y1: ev.clientY - r.top } : m));
    };
    const up = (ev: MouseEvent) => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      const ex = ev.clientX - r.left;
      const ey = ev.clientY - r.top;
      const bx = Math.min(x0, ex) / scale;
      const by = Math.min(y0, ey) / scale;
      const bw = Math.abs(ex - x0) / scale;
      const bh = Math.abs(ey - y0) / scale;
      setMarquee(null);
      if (bw > 3 || bh > 3) onMarquee({ x: bx, y: by, w: bw, h: bh }, additive);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }

  return (
    <div className="relative shrink-0" style={{ width: stageW, height: stageH }}>
      {/* Artboard */}
      <div
        ref={stageRef}
        onMouseDown={(e) => {
          if (e.currentTarget === e.target) startMarquee(e);
          e.stopPropagation();
        }}
        className="absolute inset-0 shadow-[0_8px_40px_rgba(0,0,0,0.10)]"
        style={{ background: slide.background, overflow: "hidden" }}
      >
        {layers.map((l) => (
          <LayerView
            key={l.id}
            layer={l}
            scale={scale}
            selected={l.id === single?.id}
            multiSelected={isGroup && selectedIds.includes(l.id)}
            editing={l.id === editingId}
            onSelect={onSelect}
            onStartEdit={onStartEdit}
            onCommitText={onCommitText}
            nodeRef={registerNode(l.id)}
          />
        ))}

        {/* Marquee rectangle */}
        {marquee && (
          <div
            className="absolute border border-green/70 bg-green/10 pointer-events-none"
            style={{
              left: Math.min(marquee.x0, marquee.x1),
              top: Math.min(marquee.y0, marquee.y1),
              width: Math.abs(marquee.x1 - marquee.x0),
              height: Math.abs(marquee.y1 - marquee.y0),
            }}
          />
        )}
      </div>

      {/* Floating mini-toolbar above a single selection */}
      {single && !editingId && (
        <div
          className="absolute z-20 flex items-center gap-0.5 bg-white rounded-lg shadow-lg ring-1 ring-charcoal/10 px-1 py-1"
          style={{
            left: (single.x + single.w / 2) * scale,
            top: single.y * scale,
            transform: "translate(-50%, calc(-100% - 16px))",
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <MiniBtn label="Bring forward" onClick={() => onReorder("forward")}>
            <LayerUpIcon />
          </MiniBtn>
          <MiniBtn label="Send backward" onClick={() => onReorder("backward")}>
            <LayerUpIcon down />
          </MiniBtn>
          <MiniBtn label="Duplicate" onClick={onDuplicate}>
            <DuplicateIcon />
          </MiniBtn>
          <MiniBtn label={single.locked ? "Unlock" : "Lock"} onClick={onToggleLock} active={single.locked}>
            <LockIcon open={!single.locked} />
          </MiniBtn>
          <MiniBtn label="Delete" onClick={onDelete} danger>
            <TrashIcon />
          </MiniBtn>
        </div>
      )}

      {/* Transform controls (single OR group) */}
      {targets.length > 0 && !editingId && (single ? !single.locked : true) && (
        <Moveable
          ref={moveableRef}
          target={isGroup ? targets : targets[0]!}
          draggable
          resizable={!isGroup}
          rotatable={!isGroup}
          rotationPosition="bottom"
          origin={false}
          throttleDrag={0}
          throttleResize={0}
          throttleRotate={0}
          keepRatio={shiftRatio}
          snappable
          snapThreshold={6}
          snapDirections={{ top: true, left: true, bottom: true, right: true, center: true, middle: true }}
          elementSnapDirections={{ top: true, left: true, bottom: true, right: true, center: true, middle: true }}
          snapGap
          verticalGuidelines={vGuides}
          horizontalGuidelines={hGuides}
          elementGuidelines={elementGuidelines}
          /* ── Single drag ── */
          onDragStart={onCheckpoint}
          onDrag={({ target: t, transform }) => {
            (t as HTMLElement).style.transform = transform;
          }}
          onDragEnd={({ lastEvent }) => {
            if (!lastEvent || !single) return;
            const [tx, ty] = lastEvent.beforeTranslate;
            commitGeom({ [single.id]: { x: tx / scale, y: ty / scale } });
          }}
          /* ── Group drag ── */
          onDragGroupStart={onCheckpoint}
          onDragGroup={({ events }) => {
            events.forEach((ev) => {
              (ev.target as HTMLElement).style.transform = ev.transform;
            });
          }}
          onDragGroupEnd={({ events }) => {
            const patches: Record<string, Partial<Layer>> = {};
            events.forEach((ev) => {
              const last = ev.lastEvent;
              if (!last) return;
              const id = (ev.target as HTMLElement).dataset.layerId;
              if (!id) return;
              const [tx, ty] = last.beforeTranslate;
              patches[id] = { x: tx / scale, y: ty / scale };
            });
            if (Object.keys(patches).length) commitGeom(patches);
          }}
          /* ── Resize ── */
          onResizeStart={onCheckpoint}
          onResize={({ target: t, width, height, drag }) => {
            const el = t as HTMLElement;
            el.style.width = `${width}px`;
            el.style.height = `${height}px`;
            el.style.transform = drag.transform;
          }}
          onResizeEnd={({ lastEvent }) => {
            if (!lastEvent || !single) return;
            const [tx, ty] = lastEvent.drag.beforeTranslate;
            commitGeom({
              [single.id]: {
                w: lastEvent.width / scale,
                h: lastEvent.height / scale,
                x: tx / scale,
                y: ty / scale,
              },
            });
          }}
          /* ── Rotate ── */
          onRotateStart={onCheckpoint}
          onRotate={({ target: t, transform }) => {
            (t as HTMLElement).style.transform = transform;
          }}
          onRotateEnd={({ lastEvent }) => {
            if (!lastEvent || !single) return;
            commitGeom({ [single.id]: { rotation: lastEvent.rotation } });
          }}
        />
      )}
    </div>
  );
}
