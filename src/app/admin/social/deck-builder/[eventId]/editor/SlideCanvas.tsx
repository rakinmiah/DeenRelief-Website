"use client";

/**
 * SlideCanvas — the editable stage for ONE slide (extracted in the
 * Phase 10 wiring so the deck editor can reuse it per slide).
 *
 * Fully controlled: it renders `slide.layers` at `scale`, runs
 * react-moveable on the selected layer, and reports geometry changes
 * back up. History lives in the parent — this component just signals
 * onCheckpoint at gesture start and onLayersCommit at gesture end.
 */

import Moveable from "react-moveable";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { EditorSlide, Layer } from "@/lib/social-editor/types";
import LayerView from "./LayerView";
import { MiniBtn, DuplicateIcon, LayerUpIcon, LockIcon, TrashIcon } from "./editorUi";

export default function SlideCanvas({
  slide,
  scale,
  selectedId,
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
}: {
  slide: EditorSlide;
  scale: number;
  selectedId: string | null;
  editingId: string | null;
  onSelect: (id: string | null) => void;
  onStartEdit: (id: string) => void;
  onCommitText: (id: string, text: string) => void;
  onCheckpoint: () => void;
  onLayersCommit: (layers: Layer[]) => void;
  onReorder: (dir: "forward" | "backward") => void;
  onDuplicate: () => void;
  onToggleLock: () => void;
  onDelete: () => void;
}) {
  const layers = slide.layers;
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const moveableRef = useRef<Moveable>(null);
  const nodes = useRef<Map<string, HTMLElement>>(new Map());

  const selected = layers.find((l) => l.id === selectedId) ?? null;

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

  function commitGeom(id: string, patch: Partial<Layer>) {
    onLayersCommit(
      layers.map((l) => (l.id === id ? ({ ...l, ...patch } as Layer) : l))
    );
  }

  const vGuides = useMemo(
    () => [0, (slide.width * scale) / 2, slide.width * scale],
    [slide.width, scale]
  );
  const hGuides = useMemo(
    () => [0, (slide.height * scale) / 2, slide.height * scale],
    [slide.height, scale]
  );
  const elementGuidelines = useMemo(
    () =>
      layers
        .filter((l) => l.id !== selectedId)
        .map((l) => nodes.current.get(l.id))
        .filter((n): n is HTMLElement => !!n),
    [layers, selectedId]
  );

  const stageW = slide.width * scale;
  const stageH = slide.height * scale;

  return (
    <div className="relative shrink-0" style={{ width: stageW, height: stageH }}>
      {/* Artboard */}
      <div
        onMouseDown={(e) => {
          if (e.currentTarget === e.target) onSelect(null);
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
            selected={l.id === selectedId}
            editing={l.id === editingId}
            onSelect={onSelect}
            onStartEdit={onStartEdit}
            onCommitText={onCommitText}
            nodeRef={registerNode(l.id)}
          />
        ))}
      </div>

      {/* Floating mini-toolbar above the selection */}
      {selected && !editingId && (
        <div
          className="absolute z-20 flex items-center gap-0.5 bg-white rounded-lg shadow-lg ring-1 ring-charcoal/10 px-1 py-1"
          style={{
            left: (selected.x + selected.w / 2) * scale,
            top: selected.y * scale,
            transform: "translate(-50%, calc(-100% - 16px))",
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <MiniBtn label="Forward" onClick={() => onReorder("forward")}>
            <LayerUpIcon />
          </MiniBtn>
          <MiniBtn label="Backward" onClick={() => onReorder("backward")}>
            <LayerUpIcon down />
          </MiniBtn>
          <MiniBtn label="Duplicate" onClick={onDuplicate}>
            <DuplicateIcon />
          </MiniBtn>
          <MiniBtn label={selected.locked ? "Unlock" : "Lock"} onClick={onToggleLock} active={selected.locked}>
            <LockIcon open={!selected.locked} />
          </MiniBtn>
          <MiniBtn label="Delete" onClick={onDelete} danger>
            <TrashIcon />
          </MiniBtn>
        </div>
      )}

      {/* Transform controls */}
      {target && selected && !selected.locked && !editingId && (
        <Moveable
          ref={moveableRef}
          target={target}
          draggable
          resizable
          rotatable
          rotationPosition="bottom"
          origin={false}
          throttleDrag={0}
          throttleResize={0}
          throttleRotate={0}
          snappable
          snapThreshold={6}
          snapDirections={{ top: true, left: true, bottom: true, right: true, center: true, middle: true }}
          elementSnapDirections={{ top: true, left: true, bottom: true, right: true, center: true, middle: true }}
          verticalGuidelines={vGuides}
          horizontalGuidelines={hGuides}
          elementGuidelines={elementGuidelines}
          onDragStart={onCheckpoint}
          onDrag={({ target: t, transform }) => {
            (t as HTMLElement).style.transform = transform;
          }}
          onDragEnd={({ lastEvent }) => {
            if (!lastEvent || !selectedId) return;
            const [tx, ty] = lastEvent.beforeTranslate;
            commitGeom(selectedId, { x: tx / scale, y: ty / scale });
          }}
          onResizeStart={onCheckpoint}
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
          onRotateStart={onCheckpoint}
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
  );
}
