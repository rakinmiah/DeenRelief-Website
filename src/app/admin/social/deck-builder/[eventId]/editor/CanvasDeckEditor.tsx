"use client";

/**
 * CanvasDeckEditor — the Canva-style editor wired into the real deck
 * builder.
 *
 * Owns the whole deck: a filmstrip of EditorSlides, deck-level
 * undo/redo, zoom, the add-layer rail, a contextual top toolbar, a
 * layers panel, multi-select with align/distribute, inline text
 * editing, an image picker, and PNG export. Edits autosave to the
 * existing deck-draft store (encoded as __canvas__ slides).
 */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ImageCandidate } from "@/lib/social-templates/types";
import {
  type EditorSlide,
  type Layer,
  type ShapeKind,
  makeLayerId,
  makeGroupId,
  layerAABB,
  unionAABB,
} from "@/lib/social-editor/types";
import { googleFontsHref } from "@/lib/social-editor/fonts";
import LayerView from "./LayerView";
import SlideCanvas from "./SlideCanvas";
import { useHistory } from "./useHistory";
import { loadDeck, saveDeck } from "./deckStore";
import { exportDeck } from "./exportDeck";
import {
  ContextToolbar,
  ImagePicker,
  LayersPanel,
  AlignToolbar,
  GroupToolbar,
  type AlignKind,
} from "./editorToolbar";
import {
  ToolbarBtn,
  RailBtn,
  UndoIcon,
  ImageIcon,
  PlusIcon,
  TrashIcon,
  ChevronIcon,
  LayersIcon,
  TextIcon,
  ShapeIcon,
} from "./editorUi";

export default function CanvasDeckEditor({
  initialDeck,
  eventId,
  platform = "instagram",
  images = [],
  backHref,
  persist = false,
  forceInitial = false,
  title = "Slide editor",
}: {
  initialDeck: EditorSlide[];
  eventId?: string;
  platform?: string;
  images?: ImageCandidate[];
  backHref?: string;
  persist?: boolean;
  /** Use initialDeck as-is and skip loading any saved draft (the deck
   *  was just freshly built by the guided flow). Autosave still runs. */
  forceInitial?: boolean;
  title?: string;
}) {
  const history = useHistory<EditorSlide[]>(
    initialDeck.length ? initialDeck : [blankSlide()]
  );
  const deck = history.state;

  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [picker, setPicker] = useState<null | "add" | "replace">(null);
  const [scale, setScale] = useState(0.5);
  const [hydrated, setHydrated] = useState(!persist);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [exporting, setExporting] = useState(false);
  const [showLayers, setShowLayers] = useState(true);

  const viewportRef = useRef<HTMLDivElement>(null);
  const fitRef = useRef(0.5);
  // Space-to-pan: armed while Space is held, active while dragging.
  const [panArmed, setPanArmed] = useState(false);
  const panning = useRef(false);
  // Clipboard for copy/paste (board-space layer snapshots).
  const clipboard = useRef<Layer[]>([]);

  const ai = Math.min(activeIndex, deck.length - 1);
  const activeSlide = deck[ai]!;
  const selectedLayers = useMemo(
    () => activeSlide.layers.filter((l) => selectedIds.includes(l.id)),
    [activeSlide.layers, selectedIds]
  );
  const single = selectedLayers.length === 1 ? selectedLayers[0]! : null;

  /* ── Load the editor fonts once ──────────────────────────────── */
  useEffect(() => {
    const id = "social-editor-fonts";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = googleFontsHref();
    document.head.appendChild(link);
  }, []);

  /* ── Load saved deck (persist mode) ──────────────────────────── */
  useEffect(() => {
    if (!persist || !eventId || forceInitial) {
      setHydrated(true);
      return;
    }
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
  }, [activeSlide.width, activeSlide.height]);

  /* ── Mutation helpers ────────────────────────────────────────── */
  const setActiveLayers = useCallback(
    (layers: Layer[], commit: boolean) => {
      const next = deck.map((s, i) => (i === ai ? { ...s, layers } : s));
      if (commit) history.commit(next);
      else history.set(next);
    },
    [deck, ai, history]
  );

  // Patch every selected layer (toolbar / property edits). When exactly
  // one is selected this is a normal single edit.
  const mutateSelected = useCallback(
    (patch: Partial<Layer>) => {
      if (selectedIds.length === 0) return;
      setActiveLayers(
        activeSlide.layers.map((l) =>
          selectedIds.includes(l.id) ? ({ ...l, ...patch } as Layer) : l
        ),
        true
      );
    },
    [activeSlide.layers, selectedIds, setActiveLayers]
  );

  // Patch a SPECIFIC layer by id (layers panel: rename / hide / lock).
  const mutateLayer = useCallback(
    (id: string, patch: Partial<Layer>) => {
      setActiveLayers(
        activeSlide.layers.map((l) => (l.id === id ? ({ ...l, ...patch } as Layer) : l)),
        true
      );
    },
    [activeSlide.layers, setActiveLayers]
  );

  function commitText(id: string, text: string) {
    setActiveLayers(
      activeSlide.layers.map((l) =>
        l.id === id && l.type === "text" ? { ...l, text } : l
      ),
      true
    );
    setEditingId(null);
  }

  function addLayer(layer: Layer) {
    setActiveLayers([...activeSlide.layers, layer], true);
    setSelectedIds([layer.id]);
  }

  function deleteSelected() {
    if (selectedIds.length === 0) return;
    setActiveLayers(activeSlide.layers.filter((l) => !selectedIds.includes(l.id)), true);
    setSelectedIds([]);
  }

  // Remap groupIds in a copied batch so duplicates form their OWN groups
  // (preserving which copies were grouped together) instead of merging
  // back into the originals.
  function remapGroups(layers: Layer[]): Layer[] {
    const map = new Map<string, string>();
    return layers.map((l) => {
      if (!l.groupId) return l;
      let gid = map.get(l.groupId);
      if (!gid) {
        gid = makeGroupId();
        map.set(l.groupId, gid);
      }
      return { ...l, groupId: gid } as Layer;
    });
  }

  function duplicateSelected() {
    if (selectedLayers.length === 0) return;
    const copies = remapGroups(
      selectedLayers.map(
        (l) => ({ ...l, id: makeLayerId(), x: l.x + 24, y: l.y + 24 } as Layer)
      )
    );
    setActiveLayers([...activeSlide.layers, ...copies], true);
    setSelectedIds(copies.map((c) => c.id));
  }

  function copySelected() {
    if (selectedLayers.length === 0) return;
    clipboard.current = selectedLayers.map((l) => ({ ...l }));
  }

  function pasteClipboard() {
    if (clipboard.current.length === 0) return;
    const copies = remapGroups(
      clipboard.current.map(
        (l) => ({ ...l, id: makeLayerId(), x: l.x + 32, y: l.y + 32 } as Layer)
      )
    );
    setActiveLayers([...activeSlide.layers, ...copies], true);
    setSelectedIds(copies.map((c) => c.id));
  }

  function toggleLock() {
    if (selectedLayers.length === 0) return;
    // Mirror the first selection's state across the whole selection.
    const next = !selectedLayers[0]!.locked;
    setActiveLayers(
      activeSlide.layers.map((l) =>
        selectedIds.includes(l.id) ? ({ ...l, locked: next } as Layer) : l
      ),
      true
    );
  }

  /* ── Grouping ────────────────────────────────────────────────── */
  // Group ids currently represented in the selection.
  const selectedGroupIds = useMemo(
    () => new Set(selectedLayers.map((l) => l.groupId).filter((g): g is string => !!g)),
    [selectedLayers]
  );
  const canGroup = selectedLayers.length >= 2;
  const canUngroup = selectedGroupIds.size > 0;

  // Assign one fresh groupId to every selected layer. Grouping also pulls
  // the members together in z-order (contiguous) so the group paints as a
  // unit and later reordering keeps them adjacent.
  function groupSelected() {
    if (selectedLayers.length < 2) return;
    const gid = makeGroupId();
    const ls = activeSlide.layers;
    // Insert the grouped block where the front-most member sat, so the
    // group keeps roughly its existing depth.
    const frontIdx = ls.reduce((acc, l, i) => (selectedIds.includes(l.id) ? i : acc), 0);
    const before = ls.filter((l, i) => !selectedIds.includes(l.id) && i < frontIdx);
    const after = ls.filter((l, i) => !selectedIds.includes(l.id) && i >= frontIdx);
    const grouped = ls
      .filter((l) => selectedIds.includes(l.id))
      .map((l) => ({ ...l, groupId: gid } as Layer));
    setActiveLayers([...before, ...grouped, ...after], true);
    setSelectedIds(grouped.map((l) => l.id));
  }

  // Clear groupId on every selected layer (and any siblings sharing the
  // same group, so ungrouping a partial selection still dissolves it).
  function ungroupSelected() {
    if (selectedGroupIds.size === 0) return;
    setActiveLayers(
      activeSlide.layers.map((l) =>
        l.groupId && selectedGroupIds.has(l.groupId)
          ? ({ ...l, groupId: undefined } as Layer)
          : l
      ),
      true
    );
  }

  /* ── Z-order ─────────────────────────────────────────────────── */
  function arrange(dir: "forward" | "backward" | "front" | "back") {
    if (selectedIds.length === 0) return;
    const ls = [...activeSlide.layers];
    const sel = ls.filter((l) => selectedIds.includes(l.id));
    const rest = ls.filter((l) => !selectedIds.includes(l.id));
    if (dir === "front") {
      setActiveLayers([...rest, ...sel], true);
      return;
    }
    if (dir === "back") {
      setActiveLayers([...sel, ...rest], true);
      return;
    }
    // forward / backward: single-step shuffle of each selected item,
    // processed in an order that prevents members colliding.
    const order = dir === "forward" ? [...ls].reverse() : ls;
    const arr = [...ls];
    for (const item of order) {
      if (!selectedIds.includes(item.id)) continue;
      const i = arr.findIndex((l) => l.id === item.id);
      const j = dir === "forward" ? i + 1 : i - 1;
      if (j < 0 || j >= arr.length) continue;
      if (selectedIds.includes(arr[j]!.id)) continue; // don't swap past another selected
      [arr[i], arr[j]] = [arr[j]!, arr[i]!];
    }
    setActiveLayers(arr, true);
  }

  // Layers panel drag-drop reorder: move `id` to sit just before
  // `beforeId` in PANEL (front-first) order, i.e. just AFTER it in the
  // array's z-order.
  function reorderTo(id: string, beforeId: string | null) {
    const ls = [...activeSlide.layers];
    const from = ls.findIndex((l) => l.id === id);
    if (from < 0) return;
    const [item] = ls.splice(from, 1);
    if (beforeId == null) {
      ls.push(item!);
    } else {
      const to = ls.findIndex((l) => l.id === beforeId);
      // Panel shows front-first; dropping ONTO beforeId should place the
      // dragged layer directly in front of (above) it → array index just
      // after the target.
      ls.splice(Math.max(0, to) + 1, 0, item!);
    }
    setActiveLayers(ls, true);
  }

  /* ── Align / distribute ──────────────────────────────────────── */
  function align(kind: AlignKind) {
    if (selectedLayers.length === 0) return;
    // With one selection we align to the slide; with several, to the
    // selection's bounding box (Canva behaviour).
    const toSlide = selectedLayers.length === 1;
    const bounds = toSlide
      ? { x: 0, y: 0, w: activeSlide.width, h: activeSlide.height }
      : unionAABB(selectedLayers)!;

    if (kind === "dist-h" || kind === "dist-v") {
      distribute(kind === "dist-h" ? "h" : "v");
      return;
    }

    const patches = new Map<string, Partial<Layer>>();
    for (const l of selectedLayers) {
      const b = layerAABB(l);
      // Offset between the layer's stored top-left and its AABB top-left
      // (non-zero when rotated) — keep it so rotated boxes align by AABB.
      const offX = l.x - b.x;
      const offY = l.y - b.y;
      if (kind === "left") patches.set(l.id, { x: bounds.x + offX });
      else if (kind === "right") patches.set(l.id, { x: bounds.x + bounds.w - b.w + offX });
      else if (kind === "hcenter") patches.set(l.id, { x: bounds.x + (bounds.w - b.w) / 2 + offX });
      else if (kind === "top") patches.set(l.id, { y: bounds.y + offY });
      else if (kind === "bottom") patches.set(l.id, { y: bounds.y + bounds.h - b.h + offY });
      else if (kind === "vcenter") patches.set(l.id, { y: bounds.y + (bounds.h - b.h) / 2 + offY });
    }
    setActiveLayers(
      activeSlide.layers.map((l) => (patches.has(l.id) ? ({ ...l, ...patches.get(l.id) } as Layer) : l)),
      true
    );
  }

  function distribute(axis: "h" | "v") {
    if (selectedLayers.length < 3) return;
    const items = selectedLayers
      .map((l) => ({ l, b: layerAABB(l) }))
      .sort((a, b) => (axis === "h" ? a.b.x - b.b.x : a.b.y - b.b.y));
    const first = items[0]!;
    const last = items[items.length - 1]!;
    const startEdge = axis === "h" ? first.b.x : first.b.y;
    const endEdge = axis === "h" ? last.b.x + last.b.w : last.b.y + last.b.h;
    const totalSize = items.reduce((s, it) => s + (axis === "h" ? it.b.w : it.b.h), 0);
    const span = endEdge - startEdge;
    const gap = (span - totalSize) / (items.length - 1);
    let cursor = startEdge;
    const patches = new Map<string, Partial<Layer>>();
    for (const it of items) {
      const size = axis === "h" ? it.b.w : it.b.h;
      const off = axis === "h" ? it.l.x - it.b.x : it.l.y - it.b.y;
      patches.set(it.l.id, axis === "h" ? { x: cursor + off } : { y: cursor + off });
      cursor += size + gap;
    }
    setActiveLayers(
      activeSlide.layers.map((l) => (patches.has(l.id) ? ({ ...l, ...patches.get(l.id) } as Layer) : l)),
      true
    );
  }

  /* ── Image picker ────────────────────────────────────────────── */
  function onPickImage(img: ImageCandidate) {
    if (picker === "replace" && single && single.type === "image") {
      mutateSelected({ src: img.url, mediaId: img.id, crop: undefined, filter: undefined });
    } else {
      addLayer({
        id: makeLayerId(), type: "image",
        x: activeSlide.width / 2 - 300, y: activeSlide.height / 2 - 300, w: 600, h: 600,
        rotation: 0, opacity: 1, locked: false,
        src: img.url, mediaId: img.id, objectFit: "cover", radius: 16,
      });
    }
    setPicker(null);
  }

  /* ── Add layers ──────────────────────────────────────────────── */
  const cx = activeSlide.width / 2;
  const cy = activeSlide.height / 2;
  function addText() {
    addLayer({
      id: makeLayerId(), type: "text", x: cx - 300, y: cy - 60, w: 600, h: 120,
      rotation: 0, opacity: 1, locked: false, text: "Your text",
      fontFamily: "DM Sans", fontSize: 64, fontWeight: 700,
      italic: false, underline: false, uppercase: false, color: "#1A1A2E",
      align: "center", lineHeight: 1.1, letterSpacing: 0,
    });
  }
  function addShape(shape: ShapeKind) {
    addLayer({
      id: makeLayerId(), type: "shape", x: cx - 150, y: cy - (shape === "line" ? 4 : 150),
      w: 300, h: shape === "line" ? 8 : 300, rotation: 0, opacity: 1, locked: false,
      shape, fill: shape === "line" ? "transparent" : "#2D6A2E", stroke: "#2D6A2E",
      strokeWidth: shape === "line" ? 8 : 0, radius: shape === "rect" ? 16 : 0,
    });
  }

  /* ── Selection helpers ───────────────────────────────────────── */
  // Expand a layer id to its whole flat group (clicking any member selects
  // the group so it transforms together). Ungrouped layers map to [id].
  const groupMemberIds = useCallback(
    (id: string): string[] => {
      const l = activeSlide.layers.find((x) => x.id === id);
      if (!l || !l.groupId) return [id];
      return activeSlide.layers.filter((x) => x.groupId === l.groupId).map((x) => x.id);
    },
    [activeSlide.layers]
  );

  const selectOne = useCallback(
    (id: string | null, additive: boolean) => {
      setEditingId(null);
      if (id == null) {
        setSelectedIds([]);
        return;
      }
      const members = groupMemberIds(id);
      setSelectedIds((cur) => {
        if (!additive) return members;
        // Shift/⌘-click toggles the whole group the layer belongs to.
        const allIn = members.every((m) => cur.includes(m));
        return allIn
          ? cur.filter((x) => !members.includes(x))
          : Array.from(new Set([...cur, ...members]));
      });
    },
    [groupMemberIds]
  );

  const selectMarquee = useCallback(
    (rect: { x: number; y: number; w: number; h: number }, additive: boolean) => {
      const hit = activeSlide.layers
        .filter((l) => !l.hidden && !l.locked)
        .filter((l) => {
          const b = layerAABB(l);
          return (
            b.x < rect.x + rect.w &&
            b.x + b.w > rect.x &&
            b.y < rect.y + rect.h &&
            b.y + b.h > rect.y
          );
        })
        .map((l) => l.id);
      setSelectedIds((cur) => (additive ? Array.from(new Set([...cur, ...hit])) : hit));
    },
    [activeSlide.layers]
  );

  /* ── Slide operations ────────────────────────────────────────── */
  function addSlide() {
    const next = [...deck, blankSlide(activeSlide.width, activeSlide.height)];
    history.commit(next);
    setActiveIndex(next.length - 1);
    setSelectedIds([]);
  }
  function deleteSlide(i: number) {
    if (deck.length <= 1) return;
    const next = deck.filter((_, idx) => idx !== i);
    history.commit(next);
    setActiveIndex(Math.max(0, Math.min(i, next.length - 1)));
    setSelectedIds([]);
  }
  function duplicateSlide(i: number) {
    const src = deck[i]!;
    const clone: EditorSlide = {
      ...src,
      id: `sl_${makeLayerId().slice(3)}`,
      layers: src.layers.map((l) => ({ ...l, id: makeLayerId() } as Layer)),
    };
    const next = [...deck.slice(0, i + 1), clone, ...deck.slice(i + 1)];
    history.commit(next);
    setActiveIndex(i + 1);
    setSelectedIds([]);
  }
  function selectSlide(i: number) {
    setActiveIndex(i);
    setSelectedIds([]);
    setEditingId(null);
  }

  /* ── Export ──────────────────────────────────────────────────── */
  async function onExport() {
    setExporting(true);
    try {
      await exportDeck(deck, title);
    } finally {
      setExporting(false);
    }
  }

  /* ── Space-to-pan (arm/disarm) ───────────────────────────────── */
  // Holding Space arms panning: the viewport shows a grab cursor and a
  // drag scrolls the canvas instead of marquee-selecting. Ignored while
  // typing (inputs / contentEditable) so Space still types a space.
  useEffect(() => {
    const isTyping = (t: EventTarget | null) => {
      const el = t as HTMLElement | null;
      const tag = el?.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || !!el?.isContentEditable;
    };
    const onDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !isTyping(e.target) && !e.repeat) {
        e.preventDefault();
        setPanArmed(true);
      }
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.code === "Space") setPanArmed(false);
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, []);

  function startPan(e: React.MouseEvent) {
    const el = viewportRef.current;
    if (!el || e.button !== 0) return;
    e.preventDefault();
    panning.current = true;
    const startX = e.clientX;
    const startY = e.clientY;
    const startLeft = el.scrollLeft;
    const startTop = el.scrollTop;
    const move = (ev: MouseEvent) => {
      el.scrollLeft = startLeft - (ev.clientX - startX);
      el.scrollTop = startTop - (ev.clientY - startY);
    };
    const up = () => {
      panning.current = false;
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }

  /* ── Keyboard ────────────────────────────────────────────────── */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      const editable = (e.target as HTMLElement)?.isContentEditable;
      if (tag === "INPUT" || tag === "TEXTAREA" || editable) return;
      const mod = e.metaKey || e.ctrlKey;
      const k = e.key.toLowerCase();

      if (mod && k === "z") {
        e.preventDefault();
        if (e.shiftKey) history.redo();
        else history.undo();
        return;
      }
      if (mod && k === "y") {
        e.preventDefault();
        history.redo();
        return;
      }
      // Zoom: ⌘+ / ⌘- step, ⌘0 fits to the viewport. "=" is the
      // unshifted "+" key; "Add"/"Subtract" cover the numpad.
      if (mod && (k === "=" || k === "+" || e.key === "Add")) {
        e.preventDefault();
        setScale((s) => Math.min(4, s * 1.2));
        return;
      }
      if (mod && (k === "-" || k === "_" || e.key === "Subtract")) {
        e.preventDefault();
        setScale((s) => Math.max(0.05, s / 1.2));
        return;
      }
      if (mod && k === "0") {
        e.preventDefault();
        setScale(fitRef.current);
        return;
      }
      if (mod && k === "a") {
        e.preventDefault();
        setSelectedIds(activeSlide.layers.filter((l) => !l.hidden && !l.locked).map((l) => l.id));
        return;
      }
      if (mod && k === "c") {
        e.preventDefault();
        copySelected();
        return;
      }
      if (mod && k === "v") {
        e.preventDefault();
        pasteClipboard();
        return;
      }
      if (mod && k === "d") {
        e.preventDefault();
        duplicateSelected();
        return;
      }
      // group: Cmd+G, ungroup: Cmd+Shift+G
      if (mod && k === "g") {
        e.preventDefault();
        if (e.shiftKey) ungroupSelected();
        else groupSelected();
        return;
      }
      // z-order: Cmd+] / Cmd+[ (with shift = front/back)
      if (mod && (k === "]" || e.key === "]")) {
        e.preventDefault();
        arrange(e.shiftKey ? "front" : "forward");
        return;
      }
      if (mod && (k === "[" || e.key === "[")) {
        e.preventDefault();
        arrange(e.shiftKey ? "back" : "backward");
        return;
      }
      if (e.key === "Escape") {
        setSelectedIds([]);
        setEditingId(null);
        return;
      }
      if (selectedIds.length === 0) return;
      if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        deleteSelected();
        return;
      }
      if (k === "enter" && single && single.type === "text" && !single.locked) {
        e.preventDefault();
        setEditingId(single.id);
        return;
      }
      // Arrow nudge — skip locked-only selections.
      const movable = selectedLayers.some((l) => !l.locked);
      if (!movable) return;
      const step = e.shiftKey ? 10 : 1;
      const map: Record<string, [number, number]> = {
        ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step],
      };
      const d = map[e.key];
      if (d) {
        e.preventDefault();
        setActiveLayers(
          activeSlide.layers.map((l) =>
            selectedIds.includes(l.id) && !l.locked ? ({ ...l, x: l.x + d[0], y: l.y + d[1] } as Layer) : l
          ),
          true
        );
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds, selectedLayers, single, deck, ai]);

  const zoomPct = Math.round(scale * 100);
  const showAlign = selectedLayers.length >= 1;

  return (
    <div className="flex flex-col h-full bg-[#F4F4F2]">
      {/* Top bar */}
      <div className="bg-white border-b border-charcoal/8 shrink-0">
        <div className="flex items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-1.5 min-w-0">
            {backHref && (
              <Link href={backHref} className="flex items-center gap-1 text-[13px] text-charcoal/55 hover:text-charcoal pr-2">
                <ChevronIcon dir="left" /> Back
              </Link>
            )}
            <ToolbarBtn label="Undo" onClick={history.undo} disabled={!history.canUndo}><UndoIcon /></ToolbarBtn>
            <ToolbarBtn label="Redo" onClick={history.redo} disabled={!history.canRedo}><UndoIcon flip /></ToolbarBtn>
          </div>
          <span className="text-[13px] font-medium text-charcoal/70 truncate px-3">{title}</span>
          <div className="flex items-center gap-3">
            {persist && (
              <span className="text-[11.5px] text-charcoal/40 w-14 text-right">
                {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : ""}
              </span>
            )}
            <ToolbarBtn label="Layers" active={showLayers} onClick={() => setShowLayers((v) => !v)}><LayersIcon /></ToolbarBtn>
            <div className="flex items-center gap-1">
              <button type="button" title="Zoom out (⌘−)" onClick={() => setScale((s) => Math.max(0.05, s / 1.2))} className="w-7 h-7 grid place-items-center rounded-md hover:bg-charcoal/5 text-charcoal/60">−</button>
              <button type="button" title="Fit to screen (⌘0)" onClick={() => setScale(fitRef.current)} className="text-[12px] tabular-nums text-charcoal/60 w-11 text-center hover:text-charcoal">{zoomPct}%</button>
              <button type="button" title="Zoom in (⌘+)" onClick={() => setScale((s) => Math.min(4, s * 1.2))} className="w-7 h-7 grid place-items-center rounded-md hover:bg-charcoal/5 text-charcoal/60">+</button>
            </div>
            <button
              type="button"
              onClick={onExport}
              disabled={exporting}
              className="h-9 px-4 rounded-lg bg-green text-white text-[13px] font-semibold hover:bg-green-dark disabled:opacity-50 transition"
            >
              {exporting ? "Exporting…" : "Export"}
            </button>
          </div>
        </div>

        {/* Contextual toolbar */}
        {(single || showAlign) && !editingId && (
          <div className="flex items-center gap-2 px-4 pb-2 border-t border-charcoal/5 pt-1.5 min-h-[48px] overflow-x-auto">
            {single && (
              <ContextToolbar
                layer={single}
                onChange={mutateSelected}
                onReplaceImage={() => setPicker("replace")}
                onDuplicate={duplicateSelected}
                onDelete={deleteSelected}
                onArrange={arrange}
              />
            )}
            {selectedLayers.length > 1 && (
              <span className="text-[12.5px] text-charcoal/50 whitespace-nowrap">{selectedLayers.length} selected</span>
            )}
            {(canGroup || canUngroup) && (
              <GroupToolbar
                canGroup={canGroup}
                canUngroup={canUngroup}
                onGroup={groupSelected}
                onUngroup={ungroupSelected}
              />
            )}
            {showAlign && (
              <div className="ml-auto shrink-0">
                <AlignToolbar onAlign={align} canDistribute={selectedLayers.length >= 3} />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Left rail */}
        <div className="w-[72px] bg-white border-r border-charcoal/8 flex flex-col items-center py-3 gap-1 shrink-0">
          <RailBtn label="Text" onClick={addText}><TextIcon /></RailBtn>
          <RailBtn label="Image" onClick={() => setPicker("add")}><ImageIcon /></RailBtn>
          <RailBtn label="Rect" onClick={() => addShape("rect")}><ShapeIcon kind="rect" /></RailBtn>
          <RailBtn label="Circle" onClick={() => addShape("ellipse")}><ShapeIcon kind="ellipse" /></RailBtn>
          <RailBtn label="Line" onClick={() => addShape("line")}><ShapeIcon kind="line" /></RailBtn>
        </div>

        {/* Center: canvas + filmstrip */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div
            ref={viewportRef}
            // Capture-phase: when Space is armed, intercept the press before
            // the artboard's marquee/clear handlers and pan instead.
            onMouseDownCapture={(e) => {
              if (panArmed) {
                e.stopPropagation();
                startPan(e);
              }
            }}
            onMouseDown={() => {
              if (panArmed || panning.current) return;
              setSelectedIds([]);
              setEditingId(null);
            }}
            className="flex-1 min-h-0 overflow-auto grid place-items-center p-10"
            style={{ cursor: panArmed ? (panning.current ? "grabbing" : "grab") : undefined }}
          >
            <SlideCanvas
              key={activeSlide.id}
              slide={activeSlide}
              scale={scale}
              selectedIds={selectedIds}
              editingId={editingId}
              onSelect={selectOne}
              onStartEdit={(id) => { setSelectedIds([id]); setEditingId(id); }}
              onCommitText={commitText}
              onCheckpoint={history.checkpoint}
              onLayersCommit={(layers) => setActiveLayers(layers, false)}
              onReorder={arrange}
              onDuplicate={duplicateSelected}
              onToggleLock={toggleLock}
              onDelete={deleteSelected}
              onMarquee={selectMarquee}
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
                onDuplicate={() => duplicateSlide(i)}
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

        {/* Right: layers panel */}
        {showLayers && (
          <LayersPanel
            layers={activeSlide.layers}
            selectedIds={selectedIds}
            onSelect={selectOne}
            onToggleHidden={(id) => {
              const l = activeSlide.layers.find((x) => x.id === id);
              if (l) mutateLayer(id, { hidden: !l.hidden });
            }}
            onToggleLock={(id) => {
              const l = activeSlide.layers.find((x) => x.id === id);
              if (l) mutateLayer(id, { locked: !l.locked });
            }}
            onRename={(id, name) => mutateLayer(id, { name: name.trim() || undefined })}
            onReorder={reorderTo}
            onClose={() => setShowLayers(false)}
          />
        )}
      </div>

      {picker && (
        <ImagePicker images={images} onPick={onPickImage} onClose={() => setPicker(null)} />
      )}
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
  onDuplicate,
}: {
  slide: EditorSlide;
  index: number;
  active: boolean;
  canDelete: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
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
      <div className="absolute -top-1.5 -right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition">
        <button
          type="button"
          onClick={onDuplicate}
          aria-label="Duplicate slide"
          className="w-5 h-5 rounded-full bg-white ring-1 ring-charcoal/15 shadow grid place-items-center text-charcoal/50 hover:text-green text-[12px] leading-none"
        >
          +
        </button>
        {canDelete && (
          <button
            type="button"
            onClick={onDelete}
            aria-label="Delete slide"
            className="w-5 h-5 rounded-full bg-white ring-1 ring-charcoal/15 shadow grid place-items-center text-charcoal/50 hover:text-red-600"
          >
            <span className="block w-3 h-3"><TrashIcon /></span>
          </button>
        )}
      </div>
    </div>
  );
}

function blankSlide(w = 1080, h = 1080): EditorSlide {
  return { id: `sl_${makeLayerId().slice(3)}`, width: w, height: h, background: "#FFFFFF", layers: [] };
}
