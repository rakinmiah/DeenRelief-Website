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
import type { ComponentRegistry, EditorSlide, Layer, LaidOutBox } from "@/lib/social-editor/types";
import { resolveSlideLayout, resolveMaskShape, activeMaskShapeIds, flipTransform } from "@/lib/social-editor/types";
import LayerView from "./LayerView";
import { MiniBtn, DuplicateIcon, LayerUpIcon, LockIcon, TrashIcon } from "./editorUi";

/** Floor on the group scale factor so a corner-drag past the pivot never
 *  collapses or flips the chart. */
const MIN_GROUP_SCALE = 0.12;

/**
 * Proportionally scale ONE layer about a board-space pivot by factor `s`.
 *
 * This is what lets a multi-layer composite (a chart, a logo lock-up, any
 * group) resize as a single unit like an image: every geometry value AND
 * the size-bearing style props scale together, so the chart keeps its
 * proportions and stays crisp. Mirrors the scaling math in
 * `expandInstance` (types.ts) so canvas + Satori export stay in parity —
 * the scaled values are committed to the layer data, which the export
 * route renders verbatim.
 */
function scaleLayerAbout(l: Layer, px: number, py: number, s: number): Layer {
  const geom = {
    x: px + (l.x - px) * s,
    y: py + (l.y - py) * s,
    w: Math.max(1, l.w * s),
    h: Math.max(1, l.h * s),
    shadow: l.shadow
      ? { ...l.shadow, x: l.shadow.x * s, y: l.shadow.y * s, blur: l.shadow.blur * s }
      : l.shadow,
    blur: typeof l.blur === "number" ? l.blur * s : l.blur,
  };
  if (l.type === "text") {
    return { ...l, ...geom, fontSize: l.fontSize * s, letterSpacing: l.letterSpacing * s };
  }
  if (l.type === "shape") {
    return {
      ...l,
      ...geom,
      strokeWidth: l.strokeWidth * s,
      radius: l.radius * s,
      corners: l.corners
        ? (l.corners.map((c) => c * s) as [number, number, number, number])
        : l.corners,
      strokeDash: l.strokeDash ? l.strokeDash * s : l.strokeDash,
    };
  }
  if (l.type === "image") {
    return {
      ...l,
      ...geom,
      radius: l.radius * s,
      corners: l.corners
        ? (l.corners.map((c) => c * s) as [number, number, number, number])
        : l.corners,
    };
  }
  // instance: scaling its box is enough — expandInstance re-scales the
  // inner master layers into the new box.
  return { ...l, ...geom };
}

export default function SlideCanvas({
  slide,
  scale,
  registry,
  selectedIds,
  editingId,
  onSelect,
  onStartEdit,
  onCommitText,
  onAutoSize,
  onActivatePlaceholder,
  onCheckpoint,
  onLayersCommit,
  onReorder,
  onDuplicate,
  onToggleLock,
  onDelete,
  onMarquee,
  onFrameTranslate,
}: {
  slide: EditorSlide;
  scale: number;
  /** Deck-level component registry, forwarded to LayerView so instance
   *  layers expand + paint from their master variant. */
  registry?: ComponentRegistry;
  selectedIds: string[];
  editingId: string | null;
  onSelect: (id: string | null, additive: boolean) => void;
  onStartEdit: (id: string) => void;
  onCommitText: (id: string, text: string) => void;
  /** Live auto-size (height grow + width font-shrink) of the text layer
   *  being edited. Non-committing; the editor snapshots it on blur. */
  onAutoSize: (id: string, patch: { h?: number; fontSize?: number }) => void;
  /** A QR/photo placeholder was clicked — open the QR dialog / image picker. */
  onActivatePlaceholder: (id: string, kind: "qr" | "image") => void;
  onCheckpoint: () => void;
  onLayersCommit: (layers: Layer[]) => void;
  onReorder: (dir: "forward" | "backward" | "front" | "back") => void;
  onDuplicate: () => void;
  onToggleLock: () => void;
  onDelete: () => void;
  /** Box-select rectangle finished (board-unit rect). */
  onMarquee: (rect: { x: number; y: number; w: number; h: number }, additive: boolean) => void;
  /** A whole auto-layout group was dragged: translate its stored frame
   *  box by (dx, dy) board units (children reflow inside it). */
  onFrameTranslate: (groupId: string, dx: number, dy: number) => void;
}) {
  const layers = slide.layers;
  // Auto-layout overrides: members of an auto-layout group paint at these
  // computed boxes instead of their stored coords. ONE shared solver
  // (resolveSlideLayout) drives the canvas, thumbnails AND the export, so
  // they stay pixel-identical.
  const layout = useMemo(() => resolveSlideLayout(slide), [slide]);
  // Effective box for a layer (override when laid out, else stored).
  const boxOf = useCallback(
    (l: Layer): LaidOutBox => layout.get(l.id) ?? { x: l.x, y: l.y, w: l.w, h: l.h },
    [layout]
  );
  // Shapes currently acting as an image mask paint NO fill — they're just
  // the clip window — so the masked image is the visible content. Same
  // resolver the export route uses, so canvas = PNG.
  const maskShapeIds = useMemo(() => activeMaskShapeIds(layers), [layers]);
  const moveableRef = useRef<Moveable>(null);
  const nodes = useRef<Map<string, HTMLElement>>(new Map());
  const [targets, setTargets] = useState<HTMLElement[]>([]);
  const [elementGuidelines, setElementGuidelines] = useState<HTMLElement[]>([]);
  // Hold Shift to lock aspect ratio while resizing (Figma/Canva behaviour).
  const [shiftRatio, setShiftRatio] = useState(false);

  const selectedLayers = layers.filter((l) => selectedIds.includes(l.id));
  const single = selectedLayers.length === 1 ? selectedLayers[0]! : null;
  const isGroup = selectedLayers.length > 1;

  // When the selection is EXACTLY all members of one auto-layout group, a
  // group drag should move the frame (not set per-child coords, which the
  // layout would override). Detect that group id here.
  const autoDragGroupId = useMemo(() => {
    if (selectedLayers.length < 2) return null;
    const gid = selectedLayers[0]!.groupId;
    if (!gid || !slide.groups?.[gid]?.autoLayout) return null;
    if (!selectedLayers.every((l) => l.groupId === gid)) return null;
    const allMembers = layers.filter((l) => l.groupId === gid).map((l) => l.id);
    if (allMembers.length !== selectedLayers.length) return null;
    return gid;
  }, [selectedLayers, layers, slide.groups]);

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

  /* Custom GROUP drag. react-moveable's multi-target group drag never binds its
     drag gesture to the control area in this setup, so a group "drag" just
     deselected. We drive group movement directly instead: live DOM transforms
     during the gesture, one board-unit commit at the end — frame-translate for
     an auto-layout group (children reflow inside it), per-child otherwise. Same
     commit paths the moveable group handlers used, just a reliable trigger. */
  function startGroupDrag(e: React.MouseEvent) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    onCheckpoint();
    const startX = e.clientX;
    const startY = e.clientY;
    const starts = selectedLayers.map((l) => {
      const b = boxOf(l);
      return { id: l.id, x: b.x, y: b.y, rotation: l.rotation, flipH: l.flipH, flipV: l.flipV };
    });
    const paint = (dx: number, dy: number) => {
      starts.forEach((s) => {
        const node = nodes.current.get(s.id);
        if (node) {
          node.style.transform = `translate(${(s.x + dx) * scale}px, ${(s.y + dy) * scale}px) rotate(${s.rotation}deg)${flipTransform(s.flipH, s.flipV)}`;
        }
      });
    };
    const move = (ev: MouseEvent) => {
      paint((ev.clientX - startX) / scale, (ev.clientY - startY) / scale);
    };
    const up = (ev: MouseEvent) => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      const dx = (ev.clientX - startX) / scale;
      const dy = (ev.clientY - startY) / scale;
      // A click, not a drag → restore exact transforms and keep the selection.
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) {
        paint(0, 0);
        return;
      }
      if (autoDragGroupId) {
        onFrameTranslate(autoDragGroupId, dx, dy);
        return;
      }
      const patches: Record<string, Partial<Layer>> = {};
      starts.forEach((s) => {
        patches[s.id] = { x: s.x + dx, y: s.y + dy };
      });
      commitGeom(patches);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }

  /* Custom GROUP resize. Dragging a corner handle proportionally scales
     every selected layer about the OPPOSITE corner, so a chart (or any
     group) resizes as one unit like an image — geometry + font sizes +
     stroke/radius all scale together. Aspect ratio is locked (charts
     distort if stretched). One history checkpoint at the start; live
     preview via onLayersCommit (rAF-throttled). Excluded for auto-layout
     groups, whose geometry is solver-driven (see the render gate). */
  function startGroupResize(corner: "nw" | "ne" | "se" | "sw", e: React.MouseEvent) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    onCheckpoint();
    const boxes = selectedLayers.map(boxOf);
    const minX = Math.min(...boxes.map((b) => b.x));
    const minY = Math.min(...boxes.map((b) => b.y));
    const maxX = Math.max(...boxes.map((b) => b.x + b.w));
    const maxY = Math.max(...boxes.map((b) => b.y + b.h));
    // Pivot = the corner OPPOSITE the grabbed one (stays fixed); far =
    // the grabbed corner that follows the pointer.
    const pivotX = corner === "nw" || corner === "sw" ? maxX : minX;
    const pivotY = corner === "nw" || corner === "ne" ? maxY : minY;
    const farX = corner === "nw" || corner === "sw" ? minX : maxX;
    const farY = corner === "nw" || corner === "ne" ? minY : maxY;
    const spanX = farX - pivotX || 1;
    const spanY = farY - pivotY || 1;
    const startX = e.clientX;
    const startY = e.clientY;
    const original = layers; // pristine snapshot (state is immutable)
    const selSet = new Set(selectedIds);

    let raf = 0;
    let pending: Layer[] | null = null;
    const flush = () => {
      raf = 0;
      if (pending) {
        onLayersCommit(pending);
        pending = null;
      }
    };
    const move = (ev: MouseEvent) => {
      const dx = (ev.clientX - startX) / scale;
      const dy = (ev.clientY - startY) / scale;
      const sxr = (spanX + dx) / spanX;
      const syr = (spanY + dy) / spanY;
      // Keep ratio: follow whichever axis the pointer pulled FURTHEST from
      // the start (in either direction) so a single-axis drag both grows
      // and shrinks naturally.
      const s = Math.max(
        MIN_GROUP_SCALE,
        Math.abs(sxr - 1) >= Math.abs(syr - 1) ? sxr : syr
      );
      pending = original.map((l) =>
        selSet.has(l.id) ? scaleLayerAbout(l, pivotX, pivotY, s) : l
      );
      if (!raf) raf = requestAnimationFrame(flush);
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      if (raf) {
        cancelAnimationFrame(raf);
        flush();
      }
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
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
        {layers.map((l) => {
          // Masked image → resolve its mask shape + the mask's effective
          // box (auto-layout aware). Dangling/unsupported masks resolve to
          // null, so the image renders normally.
          const mask =
            l.type === "image" && !l.hidden ? resolveMaskShape(l, layers) : null;
          return (
            <LayerView
              key={l.id}
              layer={l}
              scale={scale}
              geom={layout.get(l.id)}
              registry={registry}
              mask={mask}
              maskBox={mask ? boxOf(mask) : null}
              maskedOut={maskShapeIds.has(l.id)}
              selected={l.id === single?.id}
              multiSelected={isGroup && selectedIds.includes(l.id)}
              editing={l.id === editingId}
              onSelect={onSelect}
              onStartEdit={onStartEdit}
              onCommitText={onCommitText}
              onAutoSize={onAutoSize}
              onActivatePlaceholder={onActivatePlaceholder}
              nodeRef={registerNode(l.id)}
            />
          );
        })}

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
            left: (boxOf(single).x + boxOf(single).w / 2) * scale,
            top: boxOf(single).y * scale,
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

      {/* Group drag handle — a transparent overlay over the multi-selection's
          bounding box. react-moveable's group area never engages its drag here,
          so this drives group movement instead (the per-layer green rings from
          LayerView's multiSelected show what's selected). A plain click keeps
          the selection; a drag moves the whole group. */}
      {isGroup && !editingId && (() => {
        const boxes = selectedLayers.map(boxOf);
        const minX = Math.min(...boxes.map((b) => b.x));
        const minY = Math.min(...boxes.map((b) => b.y));
        const maxX = Math.max(...boxes.map((b) => b.x + b.w));
        const maxY = Math.max(...boxes.map((b) => b.y + b.h));
        const left = minX * scale;
        const top = minY * scale;
        const width = (maxX - minX) * scale;
        const height = (maxY - minY) * scale;
        // Auto-layout members are positioned by the solver (boxOf ≠ stored),
        // so scaling their stored coords wouldn't stick — they keep
        // drag-only. Everything else (charts, logo lock-ups, ad-hoc
        // selections) gets proportional corner resize.
        const resizable =
          !autoDragGroupId &&
          !selectedLayers.some(
            (l) => l.locked || (l.groupId && slide.groups?.[l.groupId]?.autoLayout)
          );
        const handles: Array<["nw" | "ne" | "se" | "sw", number, number, string]> = [
          ["nw", left, top, "nwse"],
          ["ne", left + width, top, "nesw"],
          ["se", left + width, top + height, "nwse"],
          ["sw", left, top + height, "nesw"],
        ];
        return (
          <>
            {/* Drag area — moves the whole group. */}
            <div
              className="absolute z-10 cursor-move"
              style={{ left, top, width, height }}
              onMouseDown={startGroupDrag}
            />
            {resizable && (
              <>
                {/* Selection frame (non-interactive). */}
                <div
                  className="absolute z-20 pointer-events-none border border-green/70"
                  style={{ left, top, width, height }}
                />
                {/* Proportional corner resize handles. */}
                {handles.map(([corner, cx, cy, cur]) => (
                  <div
                    key={corner}
                    className="absolute z-20 bg-white border border-green rounded-[2px] shadow-sm"
                    style={{ left: cx - 5, top: cy - 5, width: 10, height: 10, cursor: `${cur}-resize` }}
                    onMouseDown={(e) => startGroupResize(corner, e)}
                  />
                ))}
              </>
            )}
          </>
        );
      })()}

      {/* Transform controls — SINGLE selection only. (Group movement is the
          overlay above; group resize/rotate was never enabled here.) */}
      {single && !single.locked && !editingId && targets.length > 0 && (
        <Moveable
          ref={moveableRef}
          target={targets[0]!}
          draggable
          resizable
          rotatable
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
          /* Show the px distance labels on the red guides + equal-gap
           * markers (Figma behaviour), rounded to whole numbers. */
          isDisplaySnapDigit
          isDisplayInnerSnapDigit
          snapDigit={0}
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
            // Auto-layout group: the children are positioned by the
            // solver, so committing per-child coords wouldn't stick. Move
            // the stored FRAME by the (uniform) drag delta instead; the
            // children reflow inside it on the next render.
            if (autoDragGroupId) {
              const ev = events.find((e) => e.lastEvent);
              if (ev) {
                const id = (ev.target as HTMLElement).dataset.layerId;
                const member = id ? layers.find((l) => l.id === id) : null;
                if (member) {
                  const [tx, ty] = ev.lastEvent!.beforeTranslate;
                  const cur = boxOf(member);
                  onFrameTranslate(autoDragGroupId, tx / scale - cur.x, ty / scale - cur.y);
                }
              }
              return;
            }
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
