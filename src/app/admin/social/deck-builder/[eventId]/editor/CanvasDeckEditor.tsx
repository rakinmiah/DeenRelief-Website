"use client";

/**
 * CanvasDeckEditor — the Canva-style editor wired into the real deck
 * builder (Phase 10 wiring).
 *
 * Owns the whole deck: a filmstrip of EditorSlides, deck-level
 * undo/redo, zoom, the add-layer rail, and the per-layer property
 * panel. The active slide renders in a SlideCanvas. Edits autosave to
 * the existing deck-draft store (encoded as __canvas__ slides).
 */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type EditorSlide,
  type Layer,
  type ShapeKind,
  makeLayerId,
} from "@/lib/social-editor/types";
import LayerView from "./LayerView";
import SlideCanvas from "./SlideCanvas";
import { useHistory } from "./useHistory";
import { loadDeck, saveDeck } from "./deckStore";
import {
  SelectionPanel,
  ToolbarBtn,
  RailBtn,
  UndoIcon,
  ImageIcon,
  PlusIcon,
  TrashIcon,
  ChevronIcon,
} from "./editorUi";

export default function CanvasDeckEditor({
  initialDeck,
  eventId,
  platform = "instagram",
  backHref,
  persist = false,
  title = "Slide editor",
}: {
  initialDeck: EditorSlide[];
  eventId?: string;
  platform?: string;
  backHref?: string;
  persist?: boolean;
  title?: string;
}) {
  const history = useHistory<EditorSlide[]>(
    initialDeck.length ? initialDeck : [blankSlide()]
  );
  const deck = history.state;

  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scale, setScale] = useState(0.5);
  const [hydrated, setHydrated] = useState(!persist);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");

  const viewportRef = useRef<HTMLDivElement>(null);
  const fitRef = useRef(0.5);

  const ai = Math.min(activeIndex, deck.length - 1);
  const activeSlide = deck[ai]!;

  /* ── Load saved deck (persist mode) ──────────────────────────── */
  useEffect(() => {
    if (!persist || !eventId) return;
    let cancelled = false;
    (async () => {
      const loaded = await loadDeck(eventId, platform);
      if (cancelled) return;
      if (loaded && loaded.length) history.reset(loaded);
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persist, eventId, platform]);

  /* ── Autosave (debounced) ────────────────────────────────────── */
  useEffect(() => {
    if (!persist || !eventId || !hydrated) return;
    setSaveState("saving");
    const t = setTimeout(async () => {
      const ok = await saveDeck(eventId, platform, deck);
      setSaveState(ok ? "saved" : "idle");
    }, 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deck, hydrated]);

  /* ── Fit-to-viewport ─────────────────────────────────────────── */
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const measure = () => {
      const pad = 88;
      const fit = Math.min(
        (el.clientWidth - pad) / activeSlide.width,
        (el.clientHeight - pad) / activeSlide.height
      );
      fitRef.current = Math.max(0.05, fit);
    };
    measure();
    setScale(fitRef.current);
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSlide.width, activeSlide.height]);

  /* ── Deck/slide mutation helpers ─────────────────────────────── */
  const setActiveLayers = useCallback(
    (layers: Layer[], commit: boolean) => {
      const next = deck.map((s, i) => (i === ai ? { ...s, layers } : s));
      if (commit) history.commit(next);
      else history.set(next);
    },
    [deck, ai, history]
  );

  const selected = activeSlide.layers.find((l) => l.id === selectedId) ?? null;

  function mutateSelected(patch: Partial<Layer>) {
    if (!selected) return;
    history.commit(
      deck.map((s, i) =>
        i === ai
          ? {
              ...s,
              layers: s.layers.map((l) =>
                l.id === selected.id ? ({ ...l, ...patch } as Layer) : l
              ),
            }
          : s
      )
    );
  }

  function addLayer(layer: Layer) {
    setActiveLayers([...activeSlide.layers, layer], true);
    setSelectedId(layer.id);
  }

  function deleteSelected() {
    if (!selectedId) return;
    setActiveLayers(
      activeSlide.layers.filter((l) => l.id !== selectedId),
      true
    );
    setSelectedId(null);
  }

  function duplicateSelected() {
    if (!selected) return;
    const copy = { ...selected, id: makeLayerId(), x: selected.x + 24, y: selected.y + 24 } as Layer;
    setActiveLayers([...activeSlide.layers, copy], true);
    setSelectedId(copy.id);
  }

  function toggleLock() {
    if (!selected) return;
    mutateSelected({ locked: !selected.locked });
  }

  function reorderLayer(dir: "forward" | "backward") {
    if (!selectedId) return;
    const ls = [...activeSlide.layers];
    const i = ls.findIndex((l) => l.id === selectedId);
    if (i < 0) return;
    const j = dir === "forward" ? Math.min(ls.length - 1, i + 1) : Math.max(0, i - 1);
    if (i === j) return;
    const [item] = ls.splice(i, 1);
    ls.splice(j, 0, item!);
    setActiveLayers(ls, true);
  }

  /* ── Add new layers ──────────────────────────────────────────── */
  const cx = activeSlide.width / 2;
  const cy = activeSlide.height / 2;
  function addText() {
    addLayer({
      id: makeLayerId(), type: "text", x: cx - 300, y: cy - 60, w: 600, h: 120,
      rotation: 0, opacity: 1, locked: false, text: "Your text",
      fontFamily: '"DM Sans", sans-serif', fontSize: 64, fontWeight: 700,
      italic: false, underline: false, uppercase: false, color: "#1A1A2E",
      align: "center", lineHeight: 1.1, letterSpacing: 0,
    });
  }
  function addShape(shape: ShapeKind) {
    addLayer({
      id: makeLayerId(), type: "shape", x: cx - 150, y: cy - (shape === "line" ? 0 : 150),
      w: 300, h: shape === "line" ? 8 : 300, rotation: 0, opacity: 1, locked: false,
      shape, fill: shape === "line" ? "transparent" : "#2D6A2E", stroke: "#2D6A2E",
      strokeWidth: shape === "line" ? 8 : 0, radius: shape === "rect" ? 16 : 0,
    });
  }
  function addImage() {
    addLayer({
      id: makeLayerId(), type: "image", x: cx - 300, y: cy - 300, w: 600, h: 600,
      rotation: 0, opacity: 1, locked: false, src: "", objectFit: "cover", radius: 16,
    });
  }

  /* ── Slide operations ────────────────────────────────────────── */
  function addSlide() {
    const next = [...deck, blankSlide(activeSlide.width, activeSlide.height)];
    history.commit(next);
    setActiveIndex(next.length - 1);
    setSelectedId(null);
  }
  function deleteSlide(i: number) {
    if (deck.length <= 1) return;
    const next = deck.filter((_, idx) => idx !== i);
    history.commit(next);
    setActiveIndex(Math.max(0, Math.min(i, next.length - 1)));
    setSelectedId(null);
  }
  function selectSlide(i: number) {
    setActiveIndex(i);
    setSelectedId(null);
  }

  /* ── Keyboard ────────────────────────────────────────────────── */
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
      const map: Record<string, [number, number]> = {
        ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step],
      };
      const d = map[e.key];
      if (d) {
        e.preventDefault();
        mutateSelected({ x: selected.x + d[0], y: selected.y + d[1] });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, deck, ai]);

  const zoomPct = Math.round(scale * 100);

  return (
    <div className="flex flex-col h-full bg-[#F4F4F2]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-charcoal/8 shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          {backHref && (
            <Link href={backHref} className="flex items-center gap-1 text-[13px] text-charcoal/55 hover:text-charcoal pr-2">
              <ChevronIcon dir="left" /> Back
            </Link>
          )}
          <ToolbarBtn label="Undo" onClick={history.undo} disabled={!history.canUndo}>
            <UndoIcon />
          </ToolbarBtn>
          <ToolbarBtn label="Redo" onClick={history.redo} disabled={!history.canRedo}>
            <UndoIcon flip />
          </ToolbarBtn>
        </div>
        <span className="text-[13px] font-medium text-charcoal/70 truncate">{title}</span>
        <div className="flex items-center gap-3">
          {persist && (
            <span className="text-[11.5px] text-charcoal/40 w-14 text-right">
              {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : ""}
            </span>
          )}
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setScale((s) => Math.max(0.05, s / 1.2))} className="w-7 h-7 grid place-items-center rounded-md hover:bg-charcoal/5 text-charcoal/60">−</button>
            <button type="button" onClick={() => setScale(fitRef.current)} className="text-[12px] tabular-nums text-charcoal/60 w-11 text-center hover:text-charcoal">{zoomPct}%</button>
            <button type="button" onClick={() => setScale((s) => Math.min(4, s * 1.2))} className="w-7 h-7 grid place-items-center rounded-md hover:bg-charcoal/5 text-charcoal/60">+</button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Left rail */}
        <div className="w-[72px] bg-white border-r border-charcoal/8 flex flex-col items-center py-3 gap-1 shrink-0">
          <RailBtn label="Text" onClick={addText}><span className="text-[19px] font-bold">T</span></RailBtn>
          <RailBtn label="Image" onClick={addImage}><ImageIcon /></RailBtn>
          <RailBtn label="Rect" onClick={() => addShape("rect")}><span className="block w-5 h-5 rounded-[4px] border-2 border-current" /></RailBtn>
          <RailBtn label="Circle" onClick={() => addShape("ellipse")}><span className="block w-5 h-5 rounded-full border-2 border-current" /></RailBtn>
          <RailBtn label="Line" onClick={() => addShape("line")}><span className="block w-5 h-0.5 bg-current" /></RailBtn>
        </div>

        {/* Center: canvas + filmstrip */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div
            ref={viewportRef}
            onMouseDown={() => setSelectedId(null)}
            className="flex-1 min-h-0 overflow-auto grid place-items-center p-10"
          >
            <SlideCanvas
              key={activeSlide.id}
              slide={activeSlide}
              scale={scale}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onCheckpoint={history.checkpoint}
              onLayersCommit={(layers) => setActiveLayers(layers, false)}
              onReorder={reorderLayer}
              onDuplicate={duplicateSelected}
              onToggleLock={toggleLock}
              onDelete={deleteSelected}
            />
          </div>

          {/* Filmstrip */}
          <div className="h-[120px] bg-white border-t border-charcoal/8 flex items-center gap-3 px-4 overflow-x-auto shrink-0">
            {deck.map((s, i) => (
              <SlideThumb
                key={s.id}
                slide={s}
                index={i}
                active={i === ai}
                canDelete={deck.length > 1}
                onSelect={() => selectSlide(i)}
                onDelete={() => deleteSlide(i)}
              />
            ))}
            <button
              type="button"
              onClick={addSlide}
              className="shrink-0 w-[84px] h-[84px] rounded-lg border-2 border-dashed border-charcoal/15 grid place-items-center text-charcoal/40 hover:border-green/50 hover:text-green transition"
              aria-label="Add slide"
            >
              <PlusIcon />
            </button>
          </div>
        </div>

        {/* Right rail */}
        <div className="w-[240px] bg-white border-l border-charcoal/8 p-4 shrink-0 overflow-auto">
          {selected ? (
            <SelectionPanel layer={selected} onChange={mutateSelected} />
          ) : (
            <p className="text-[12.5px] text-charcoal/40 leading-relaxed">
              Select a layer to edit it, or add one from the left. Drag to move,
              corners to resize, the bottom handle to rotate.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Filmstrip thumbnail ─────────────────────────────────────────── */
function SlideThumb({
  slide,
  index,
  active,
  canDelete,
  onSelect,
  onDelete,
}: {
  slide: EditorSlide;
  index: number;
  active: boolean;
  canDelete: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const size = 84;
  const s = size / slide.width;
  return (
    <div className="relative shrink-0 group">
      <button
        type="button"
        onClick={onSelect}
        className={`relative block rounded-lg overflow-hidden transition ${active ? "ring-2 ring-green" : "ring-1 ring-charcoal/10 hover:ring-charcoal/30"}`}
        style={{ width: size, height: (size / slide.width) * slide.height, background: slide.background }}
      >
        {slide.layers.map((l) => (
          <LayerView key={l.id} layer={l} scale={s} interactive={false} />
        ))}
      </button>
      <span className="absolute -bottom-0.5 left-1 text-[10px] font-semibold text-charcoal/40">{index + 1}</span>
      {canDelete && (
        <button
          type="button"
          onClick={onDelete}
          aria-label="Delete slide"
          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white ring-1 ring-charcoal/15 shadow grid place-items-center text-charcoal/50 opacity-0 group-hover:opacity-100 hover:text-red-600 transition"
        >
          <span className="block w-3 h-3"><TrashIcon /></span>
        </button>
      )}
    </div>
  );
}

function blankSlide(w = 1080, h = 1080): EditorSlide {
  return { id: `sl_${makeLayerId().slice(3)}`, width: w, height: h, background: "#FFFFFF", layers: [] };
}
