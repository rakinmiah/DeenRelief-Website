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
  type EditorDeck,
  type Layer,
  type InstanceLayer,
  type LaidOutBox,
  type ShapeKind,
  type AutoLayout,
  type GroupMeta,
  type ComponentDef,
  type ComponentRegistry,
  type LayerOverride,
  makeLayerId,
  makeGroupId,
  makeComponentId,
  makeVariantId,
  layerAABB,
  unionAABB,
  defaultAutoLayout,
  autoLayoutFor,
  resolveSlideLayout,
  resolveMaskShape,
  activeMaskShapeIds,
  isMaskableShape,
  resolveVariant,
  expandInstance,
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
  AutoLayoutToolbar,
  MaskToolbar,
  CreateComponentButton,
  InstanceToolbar,
  type AlignKind,
  type BrandLogos,
} from "./editorToolbar";
import type { BrandLogo } from "@/lib/social-editor/presets";
import type { ContentBundle } from "../types";
import TemplatesPanel from "./TemplatesPanel";
import ContentPanel from "./ContentPanel";
import QrDialog from "./QrDialog";
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
  ComponentIcon,
} from "./editorUi";

/** Sentinel id prefix for the temporary "edit master" slide injected
 *  while editing a component's layers. Such a slide is NOT persisted (the
 *  deck store strips it) and is filtered out of export. */
const EDIT_MASTER_PREFIX = "__editmaster__";

export default function CanvasDeckEditor({
  initialDeck,
  eventId,
  platform = "instagram",
  images = [],
  logo = null,
  logoLight = null,
  content = null,
  sourceUrl = null,
  openTemplatesOnMount = false,
  backHref,
  persist = false,
  forceInitial = false,
  title = "Slide editor",
}: {
  initialDeck: EditorSlide[];
  eventId?: string;
  platform?: string;
  images?: ImageCandidate[];
  /** On-dark (white) DR logo — the reversed variant. */
  logo?: BrandLogo | null;
  /** On-light (green) DR logo — the primary mark. */
  logoLight?: BrandLogo | null;
  /** Extracted news-report content — powers the Content panel's snippets. */
  content?: ContentBundle | null;
  /** Link to the originating news report — surfaced as "Open source" in the
   *  Content panel header. */
  sourceUrl?: string | null;
  /** Open the Templates flyout on mount (used by "Skip to editor", which
   *  lands on a blank canvas so she builds from templates). */
  openTemplatesOnMount?: boolean;
  backHref?: string;
  persist?: boolean;
  /** Use initialDeck as-is and skip loading any saved draft (the deck
   *  was just freshly built by the guided flow). Autosave still runs. */
  forceInitial?: boolean;
  title?: string;
}) {
  // The whole document — slides + the deck-level component registry — is
  // ONE history state so create-component, master edits, variant swaps and
  // ordinary slide edits all share undo/redo. `deck` aliases the slides
  // array (so the bulk of the editor reads/writes it unchanged); `registry`
  // aliases the component map.
  const history = useHistory<EditorDeck>({
    slides: initialDeck.length ? initialDeck : [blankSlide()],
    components: undefined,
  });
  const deck = history.state.slides;
  const registry = history.state.components;

  // Commit/set a new SLIDES array, preserving the current registry.
  const commitSlides = useCallback(
    (slides: EditorSlide[], commit = true) => {
      const next: EditorDeck = { ...history.state, slides };
      if (commit) history.commit(next);
      else history.set(next);
    },
    [history]
  );

  // Commit a new full deck (slides + registry) in one history entry.
  const commitDeck = useCallback(
    (next: EditorDeck) => history.commit(next),
    [history]
  );

  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [picker, setPicker] = useState<null | "add" | "replace">(null);
  const [showQr, setShowQr] = useState(false);
  const [scale, setScale] = useState(0.5);
  const [hydrated, setHydrated] = useState(!persist);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [exporting, setExporting] = useState(false);
  const [showLayers, setShowLayers] = useState(true);
  // One left flyout open at a time: the template browser or the content picker.
  const [leftPanel, setLeftPanel] = useState<null | "templates" | "content">(
    openTemplatesOnMount ? "templates" : null
  );
  // Component "edit master" mode: when set, the editor is editing the
  // layers of this {componentId, variant} on a temporary edit slide; on
  // exit the edited layers are written back into the component definition
  // and every instance re-derives. null = not editing a master.
  const [editingComponent, setEditingComponent] = useState<
    null | { componentId: string; variant: string; returnIndex: number }
  >(null);
  // Template-import handoff from the "View templates" browser (other tab),
  // delivered via localStorage. While set, the filmstrip is in "placement"
  // mode: click a slide to REPLACE it, or press + to ADD it as a new slide.
  const [pendingImport, setPendingImport] = useState<
    null | { slide: EditorSlide; name: string }
  >(null);

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
      if (loaded && loaded.slides.length) history.reset(loaded);
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
      const ok = await saveDeck(eventId, platform, history.state);
      setSaveState(ok ? "saved" : "idle");
    }, 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history.state, hydrated]);

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
      commitSlides(deck.map((s, i) => (i === ai ? { ...s, layers } : s)), commit);
    },
    [deck, ai, commitSlides]
  );

  // Patch the active slide directly (for group-level metadata that lives
  // on the slide, e.g. auto-layout config). Always commits to history.
  const patchActiveSlide = useCallback(
    (patch: Partial<EditorSlide>) => {
      commitSlides(deck.map((s, i) => (i === ai ? { ...s, ...patch } : s)));
    },
    [deck, ai, commitSlides]
  );

  // Merge metadata for one group into slide.groups (creating the record
  // if needed). Passing `meta: null` removes the group's entry entirely.
  const setGroupMeta = useCallback(
    (groupId: string, meta: Partial<GroupMeta> | null) => {
      const cur = activeSlide.groups ?? {};
      const nextGroups: Record<string, GroupMeta> = { ...cur };
      if (meta === null) {
        delete nextGroups[groupId];
      } else {
        nextGroups[groupId] = { ...cur[groupId], ...meta };
      }
      patchActiveSlide({
        groups: Object.keys(nextGroups).length ? nextGroups : undefined,
      });
    },
    [activeSlide.groups, patchActiveSlide]
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
    // Deleting a shape that's used as an image mask releases that image
    // (clear the dangling maskLayerId so it renders normally and can't
    // silently re-attach to a future layer that reuses the id).
    const deletedIds = new Set(selectedIds);
    setActiveLayers(
      activeSlide.layers
        .filter((l) => !deletedIds.has(l.id))
        .map((l) =>
          l.type === "image" && l.maskLayerId && deletedIds.has(l.maskLayerId)
            ? ({ ...l, maskLayerId: undefined } as Layer)
            : l
        ),
      true
    );
    setSelectedIds([]);
  }

  // Remap groupIds in a copied batch so duplicates form their OWN groups
  // (preserving which copies were grouped together) instead of merging
  // back into the originals. Returns the remapped layers AND the old→new
  // groupId map so callers can clone the matching auto-layout metadata.
  function remapGroups(layers: Layer[]): { layers: Layer[]; map: Map<string, string> } {
    const map = new Map<string, string>();
    const out = layers.map((l) => {
      if (!l.groupId) return l;
      let gid = map.get(l.groupId);
      if (!gid) {
        gid = makeGroupId();
        map.set(l.groupId, gid);
      }
      return { ...l, groupId: gid } as Layer;
    });
    return { layers: out, map };
  }

  // Clone group metadata for a remapped batch, offsetting auto-layout
  // frames by (dx, dy) so the copy's frame sits over the copied layers.
  function clonedGroups(map: Map<string, string>, dx: number, dy: number): Record<string, GroupMeta> {
    const src = activeSlide.groups ?? {};
    const next: Record<string, GroupMeta> = { ...src };
    for (const [oldId, newId] of map) {
      const meta = src[oldId];
      if (!meta) continue;
      next[newId] = {
        ...meta,
        frame: meta.frame ? { ...meta.frame, x: meta.frame.x + dx, y: meta.frame.y + dy } : undefined,
      };
    }
    return next;
  }

  // Re-link maskLayerId within a copied batch: when a masked image AND its
  // mask shape are BOTH copied together, the copy should mask into the
  // COPIED shape, not the original. `idMap` is old→new layer id. A copy
  // whose mask wasn't in the batch keeps pointing at the original shape
  // (still valid — both images then share that one window).
  function relinkMasks(layers: Layer[], idMap: Map<string, string>): Layer[] {
    return layers.map((l) => {
      if (l.type !== "image" || !l.maskLayerId) return l;
      const remapped = idMap.get(l.maskLayerId);
      return remapped ? ({ ...l, maskLayerId: remapped } as Layer) : l;
    });
  }

  // Copy a batch of source layers (with ORIGINAL ids): assign fresh ids,
  // offset by (dx,dy), remap groups + mask links, clone group meta, and
  // append in one commit. Selects the copies.
  function appendCopies(source: Layer[], dx: number, dy: number) {
    const idMap = new Map<string, string>();
    const withIds = source.map((l) => {
      const id = makeLayerId();
      idMap.set(l.id, id);
      return { ...l, id, x: l.x + dx, y: l.y + dy } as Layer;
    });
    const { layers: regrouped, map } = remapGroups(withIds);
    const copies = relinkMasks(regrouped, idMap);
    const nextGroups = clonedGroups(map, dx, dy);
    commitSlides(
      deck.map((s, i) =>
        i === ai
          ? {
              ...s,
              layers: [...s.layers, ...copies],
              groups: Object.keys(nextGroups).length ? nextGroups : undefined,
            }
          : s
      )
    );
    setSelectedIds(copies.map((c) => c.id));
  }

  function duplicateSelected() {
    if (selectedLayers.length === 0) return;
    appendCopies(selectedLayers, 24, 24);
  }

  function copySelected() {
    if (selectedLayers.length === 0) return;
    clipboard.current = selectedLayers.map((l) => ({ ...l }));
  }

  function pasteClipboard() {
    if (clipboard.current.length === 0) return;
    appendCopies(clipboard.current, 32, 32);
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
  // Also drop any auto-layout metadata for the dissolved groups so the
  // children fall back to their (now-absolute) stored coords cleanly.
  function ungroupSelected() {
    if (selectedGroupIds.size === 0) return;
    // Bake the current laid-out positions into the freed layers' stored
    // coords, so an auto-layout group doesn't visually jump on ungroup.
    const layout = resolveSlideLayout(activeSlide);
    const nextGroups = { ...(activeSlide.groups ?? {}) };
    for (const gid of selectedGroupIds) delete nextGroups[gid];
    commitSlides(
      deck.map((s, i) =>
        i === ai
          ? {
              ...s,
              layers: s.layers.map((l) => {
                if (!l.groupId || !selectedGroupIds.has(l.groupId)) return l;
                const box = layout.get(l.id);
                return {
                  ...l,
                  groupId: undefined,
                  ...(box ? { x: box.x, y: box.y, w: box.w, h: box.h } : {}),
                } as Layer;
              }),
              groups: Object.keys(nextGroups).length ? nextGroups : undefined,
            }
          : s
      )
    );
  }

  /* ── Auto-layout (group flex) ─────────────────────────────────── */
  // The single group eligible for an auto-layout control: a selection
  // that's exactly one group's members (≥2). null otherwise.
  const autoLayoutGroupId = useMemo(() => {
    if (selectedLayers.length < 2) return null;
    const gid = selectedLayers[0]!.groupId;
    if (!gid) return null;
    if (!selectedLayers.every((l) => l.groupId === gid)) return null;
    const memberCount = activeSlide.layers.filter((l) => l.groupId === gid).length;
    return memberCount === selectedLayers.length ? gid : null;
  }, [selectedLayers, activeSlide.layers]);

  const activeAutoLayout = autoLayoutFor(activeSlide, autoLayoutGroupId ?? undefined);

  // Toggle auto-layout on the selected group. Enabling seeds the frame
  // from the members' current union AABB so the first reflow keeps their
  // place; disabling bakes the laid-out positions back into the members'
  // stored coords (so they don't jump) and clears the metadata.
  function toggleAutoLayout() {
    if (!autoLayoutGroupId) return;
    if (activeAutoLayout) {
      const layout = resolveSlideLayout(activeSlide);
      commitSlides(
        deck.map((s, i) => {
          if (i !== ai) return s;
          const nextGroups = { ...(s.groups ?? {}) };
          delete nextGroups[autoLayoutGroupId];
          return {
            ...s,
            layers: s.layers.map((l) => {
              if (l.groupId !== autoLayoutGroupId) return l;
              const box = layout.get(l.id);
              return box ? ({ ...l, x: box.x, y: box.y, w: box.w, h: box.h } as Layer) : l;
            }),
            groups: Object.keys(nextGroups).length ? nextGroups : undefined,
          };
        })
      );
    } else {
      const members = activeSlide.layers.filter((l) => l.groupId === autoLayoutGroupId);
      const frame = unionAABB(members) ?? { x: 0, y: 0, w: 0, h: 0 };
      setGroupMeta(autoLayoutGroupId, { autoLayout: defaultAutoLayout(), frame });
    }
  }

  // Update the auto-layout config of the selected group.
  function updateAutoLayout(patch: Partial<AutoLayout>) {
    if (!autoLayoutGroupId || !activeAutoLayout) return;
    setGroupMeta(autoLayoutGroupId, { autoLayout: { ...activeAutoLayout, ...patch } });
  }

  // Translate a group's stored frame box (whole-frame drag on the canvas).
  function translateFrame(groupId: string, dx: number, dy: number) {
    const meta = activeSlide.groups?.[groupId];
    if (!meta?.frame) return;
    setGroupMeta(groupId, {
      frame: { ...meta.frame, x: meta.frame.x + dx, y: meta.frame.y + dy },
    });
  }

  /* ── Shape-as-mask ("use shape as mask") ──────────────────────────
   * Figma model: select exactly one IMAGE + one (maskable) SHAPE →
   * "Mask with shape" clips the image into the shape's box. Selecting a
   * masked image OR its mask shape → "Release mask" undoes it. Only
   * rect/rounded-rect/ellipse shapes are maskable (Satori parity). */

  // The two selected layers as {image, shape} when the selection is
  // exactly one image + one maskable shape AND the image isn't already
  // masked; null otherwise. Drives the "Mask with shape" affordance.
  const maskPair = useMemo(() => {
    if (selectedLayers.length !== 2) return null;
    const img = selectedLayers.find((l) => l.type === "image") as
      | Extract<Layer, { type: "image" }>
      | undefined;
    const shp = selectedLayers.find((l) => isMaskableShape(l)) as
      | Extract<Layer, { type: "shape" }>
      | undefined;
    if (!img || !shp || img.maskLayerId) return null;
    return { image: img, shape: shp };
  }, [selectedLayers]);

  // The masked image whose mask the current selection represents — either
  // the masked image itself, or the shape acting as its mask. null when
  // nothing in the selection is part of an active mask. Drives "Release".
  const releasableImage = useMemo(() => {
    for (const l of selectedLayers) {
      if (l.type === "image" && resolveMaskShape(l, activeSlide.layers)) return l;
    }
    // Selecting just the mask shape should also offer Release.
    for (const l of selectedLayers) {
      if (l.type !== "shape") continue;
      const owner = activeSlide.layers.find(
        (x): x is Extract<Layer, { type: "image" }> =>
          x.type === "image" && x.maskLayerId === l.id && !!resolveMaskShape(x, activeSlide.layers)
      );
      if (owner) return owner;
    }
    return null;
  }, [selectedLayers, activeSlide.layers]);

  // Mask the image with the shape: link them and keep BOTH selected so the
  // user can immediately tweak either the window (shape) or the pan (image).
  function maskWithShape() {
    if (!maskPair) return;
    const { image, shape } = maskPair;
    setActiveLayers(
      activeSlide.layers.map((l) =>
        l.id === image.id ? ({ ...l, maskLayerId: shape.id } as Layer) : l
      ),
      true
    );
  }

  // Release the mask: clear the image's maskLayerId. Both layers return to
  // normal (the shape paints its fill again, the image its own box).
  function releaseMask() {
    if (!releasableImage) return;
    setActiveLayers(
      activeSlide.layers.map((l) =>
        l.id === releasableImage.id ? ({ ...l, maskLayerId: undefined } as Layer) : l
      ),
      true
    );
  }

  /* ── Components + variants (Wave 2c) ──────────────────────────────────
   * A component is a reusable, named layer-set stored in the DECK-LEVEL
   * registry (history.state.components). An instance (type:"instance")
   * references {componentId, variant, overrides} and expands at render
   * time via expandInstance — the SAME helper the export route uses, so
   * canvas = PNG. */

  // The single selected instance layer (drives the instance toolbar). null
  // when the selection isn't exactly one instance.
  const selectedInstance =
    single && single.type === "instance" ? (single as InstanceLayer) : null;
  const selectedComponentDef = selectedInstance
    ? registry?.[selectedInstance.componentId]
    : undefined;

  // "Create component" is offered when the selection is ≥1 layer and none
  // of them is already an instance (no nesting).
  const canCreateComponent =
    selectedLayers.length >= 1 && selectedLayers.every((l) => l.type !== "instance");

  // Create a component from the current selection: snap the selected layers
  // into the component's LOCAL space (origin at the selection's top-left),
  // capture any auto-layout group metadata for those layers, store a
  // ComponentDef in the deck-level registry, and replace the selection with
  // a single instance placed at the selection's bounding box.
  function createComponentFromSelection() {
    if (!canCreateComponent) return;
    const sel = selectedLayers;
    const bounds = unionAABB(sel);
    if (!bounds) return;
    const { x: ox, y: oy, w, h } = bounds;
    // Master layers in local space (offset by −origin). Keep their own
    // group ids; capture matching group metadata.
    const masterLayers: Layer[] = sel.map(
      (l) => ({ ...l, x: l.x - ox, y: l.y - oy } as Layer)
    );
    const groupIds = new Set(
      sel.map((l) => l.groupId).filter((g): g is string => !!g)
    );
    let variantGroups: Record<string, GroupMeta> | undefined;
    const srcGroups = activeSlide.groups ?? {};
    for (const gid of groupIds) {
      const meta = srcGroups[gid];
      if (!meta) continue;
      variantGroups = {
        ...(variantGroups ?? {}),
        [gid]: meta.frame
          ? { ...meta, frame: { ...meta.frame, x: meta.frame.x - ox, y: meta.frame.y - oy } }
          : meta,
      };
    }
    const componentId = makeComponentId();
    const variantId = makeVariantId();
    const compCount = registry ? Object.keys(registry).length : 0;
    const def: ComponentDef = {
      id: componentId,
      name: `Component ${compCount + 1}`,
      width: Math.max(1, w),
      height: Math.max(1, h),
      variants: [{ id: variantId, name: "Default", layers: masterLayers, groups: variantGroups }],
    };
    const instance: InstanceLayer = {
      id: makeLayerId(),
      type: "instance",
      x: ox,
      y: oy,
      w: Math.max(1, w),
      h: Math.max(1, h),
      rotation: 0,
      opacity: 1,
      locked: false,
      componentId,
      variant: variantId,
    };
    // Replace the selected layers with the instance (at the front-most
    // member's slot), and drop the now-captured group metadata for them.
    const selIds = new Set(sel.map((l) => l.id));
    const frontIdx = activeSlide.layers.reduce(
      (acc, l, i) => (selIds.has(l.id) ? i : acc),
      0
    );
    const before = activeSlide.layers.filter((l, i) => !selIds.has(l.id) && i < frontIdx);
    const after = activeSlide.layers.filter((l, i) => !selIds.has(l.id) && i >= frontIdx);
    const nextGroups = { ...srcGroups };
    for (const gid of groupIds) delete nextGroups[gid];
    const nextSlides = deck.map((s, i) =>
      i === ai
        ? {
            ...s,
            layers: [...before, instance, ...after],
            groups: Object.keys(nextGroups).length ? nextGroups : undefined,
          }
        : s
    );
    commitDeck({
      slides: nextSlides,
      components: { ...(registry ?? {}), [componentId]: def },
    });
    setSelectedIds([instance.id]);
  }

  // Patch the selected instance layer (variant swap, override edits, etc.).
  function mutateInstance(patch: Partial<InstanceLayer>) {
    if (!selectedInstance) return;
    setActiveLayers(
      activeSlide.layers.map((l) =>
        l.id === selectedInstance.id ? ({ ...l, ...patch } as Layer) : l
      ),
      true
    );
  }

  // Switch the selected instance's variant.
  function setInstanceVariant(variantId: string) {
    mutateInstance({ variant: variantId });
  }

  // Set/clear ONE per-instance override (keyed by master layer id). A
  // value of undefined removes that field; an empty override object is
  // pruned so "reset" round-trips cleanly.
  function setInstanceOverride(masterId: string, patch: LayerOverride) {
    if (!selectedInstance) return;
    const cur = selectedInstance.overrides ?? {};
    const merged: LayerOverride = { ...cur[masterId], ...patch };
    // Prune undefined keys.
    (Object.keys(merged) as (keyof LayerOverride)[]).forEach((k) => {
      if (merged[k] === undefined) delete merged[k];
    });
    const nextOv: Record<string, LayerOverride> = { ...cur };
    if (Object.keys(merged).length) nextOv[masterId] = merged;
    else delete nextOv[masterId];
    mutateInstance({ overrides: Object.keys(nextOv).length ? nextOv : undefined });
  }

  // Clear all per-instance overrides (back to the master values).
  function resetInstanceOverrides() {
    mutateInstance({ overrides: undefined });
  }

  // Detach the instance: bake the expanded layers back into plain,
  // editable layers on the slide (fresh ids, unlocked, ungrouped) and drop
  // the instance. The result is no longer linked to the component.
  function detachInstance() {
    if (!selectedInstance) return;
    const def = registry?.[selectedInstance.componentId];
    const box = resolveSlideLayout(activeSlide).get(selectedInstance.id);
    const eff: InstanceLayer = box
      ? { ...selectedInstance, x: box.x, y: box.y, w: box.w, h: box.h }
      : selectedInstance;
    const baked = expandInstance(def, eff).map(
      (l) => ({ ...l, id: makeLayerId(), locked: false } as Layer)
    );
    const idx = activeSlide.layers.findIndex((l) => l.id === selectedInstance.id);
    const nextLayers = [
      ...activeSlide.layers.slice(0, idx),
      ...baked,
      ...activeSlide.layers.slice(idx + 1),
    ];
    setActiveLayers(nextLayers, true);
    setSelectedIds(baked.map((l) => l.id));
  }

  // Enter "edit master" mode: inject a temporary edit slide holding the
  // component variant's layers (in local space), switch to it. Editing it
  // uses all the normal layer machinery; "Done" writes the layers back.
  function editComponent(componentId: string, variantId: string) {
    const def = registry?.[componentId];
    const variant = resolveVariant(def, variantId);
    if (!def || !variant) return;
    const editSlide: EditorSlide = {
      id: `${EDIT_MASTER_PREFIX}${componentId}`,
      width: def.width,
      height: def.height,
      background: "#FFFFFF",
      layers: variant.layers.map((l) => ({ ...l })),
      groups: variant.groups,
    };
    commitSlides([...deck, editSlide]);
    setEditingComponent({ componentId, variant: variant.id, returnIndex: ai });
    setActiveIndex(deck.length);
    setSelectedIds([]);
  }

  function editSelectedComponent() {
    if (!selectedInstance) return;
    const variant = resolveVariant(
      registry?.[selectedInstance.componentId],
      selectedInstance.variant
    );
    if (!variant) return;
    editComponent(selectedInstance.componentId, variant.id);
  }

  // Exit "edit master" mode: write the edit slide's layers (+ groups) back
  // into the component variant, pop the edit slide, and return. Every
  // instance re-derives from the updated master automatically.
  function finishEditComponent() {
    if (!editingComponent) return;
    const editIdx = deck.findIndex(
      (s) => s.id === `${EDIT_MASTER_PREFIX}${editingComponent.componentId}`
    );
    const def = registry?.[editingComponent.componentId];
    if (editIdx < 0 || !def) {
      setEditingComponent(null);
      return;
    }
    const editSlide = deck[editIdx]!;
    // New intrinsic size = the edited content's bounding box (so resized
    // masters keep instances proportional). Fall back to the slide size.
    const bounds = unionAABB(editSlide.layers);
    const width = bounds ? Math.max(1, bounds.w) : def.width;
    const height = bounds ? Math.max(1, bounds.h) : def.height;
    const ox = bounds ? bounds.x : 0;
    const oy = bounds ? bounds.y : 0;
    const masterLayers = editSlide.layers.map(
      (l) => ({ ...l, x: l.x - ox, y: l.y - oy } as Layer)
    );
    const groups = editSlide.groups
      ? Object.fromEntries(
          Object.entries(editSlide.groups).map(([gid, meta]) => [
            gid,
            meta.frame
              ? { ...meta, frame: { ...meta.frame, x: meta.frame.x - ox, y: meta.frame.y - oy } }
              : meta,
          ])
        )
      : undefined;
    const nextDef: ComponentDef = {
      ...def,
      width,
      height,
      variants: def.variants.map((v) =>
        v.id === editingComponent.variant ? { ...v, layers: masterLayers, groups } : v
      ),
    };
    const nextSlides = deck.filter((_, i) => i !== editIdx);
    commitDeck({ slides: nextSlides, components: { ...(registry ?? {}), [def.id]: nextDef } });
    setEditingComponent(null);
    setActiveIndex(Math.min(editingComponent.returnIndex, nextSlides.length - 1));
    setSelectedIds([]);
  }

  // Add a variant to the selected instance's component: duplicate the
  // current variant's layers under a new name, and point the instance at
  // it. Switching variants later swaps which layer-set expands.
  function addVariantToSelected() {
    if (!selectedInstance || !selectedComponentDef) return;
    const cur =
      resolveVariant(selectedComponentDef, selectedInstance.variant) ??
      selectedComponentDef.variants[0]!;
    const newVariantId = makeVariantId();
    const newVariant = {
      id: newVariantId,
      name: `Variant ${selectedComponentDef.variants.length + 1}`,
      layers: cur.layers.map((l) => ({ ...l })),
      groups: cur.groups,
    };
    const nextDef: ComponentDef = {
      ...selectedComponentDef,
      variants: [...selectedComponentDef.variants, newVariant],
    };
    commitDeck({
      slides: deck.map((s, i) =>
        i === ai
          ? {
              ...s,
              layers: s.layers.map((l) =>
                l.id === selectedInstance.id
                  ? ({ ...l, variant: newVariantId } as Layer)
                  : l
              ),
            }
          : s
      ),
      components: { ...(registry ?? {}), [selectedComponentDef.id]: nextDef },
    });
  }

  // Delete a component definition. SAFE behaviour: auto-DETACH every
  // instance of it across the whole deck first (baking each into plain
  // editable layers), THEN drop the def — so no instance is ever left
  // dangling. (Chosen over blocking the delete so the user is never stuck
  // with an un-deletable component.)
  function deleteComponentDef(componentId: string) {
    const def = registry?.[componentId];
    if (!def) return;
    const nextSlides = deck.map((s) => {
      if (!s.layers.some((l) => l.type === "instance" && l.componentId === componentId)) {
        return s;
      }
      const layout = resolveSlideLayout(s);
      const nextLayers: Layer[] = [];
      for (const l of s.layers) {
        if (l.type === "instance" && l.componentId === componentId) {
          const box = layout.get(l.id);
          const eff: InstanceLayer = box ? { ...l, x: box.x, y: box.y, w: box.w, h: box.h } : l;
          for (const baked of expandInstance(def, eff)) {
            nextLayers.push({ ...baked, id: makeLayerId(), locked: false } as Layer);
          }
        } else {
          nextLayers.push(l);
        }
      }
      return { ...s, layers: nextLayers };
    });
    const nextComponents = { ...(registry ?? {}) };
    delete nextComponents[componentId];
    commitDeck({
      slides: nextSlides,
      components: Object.keys(nextComponents).length ? nextComponents : undefined,
    });
    setSelectedIds([]);
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
  // The DR brand mark as a first-class component (not just an image): inserted
  // green-first (the primary colour) with name "brand-logo", which unlocks the
  // White ⇄ Green toggle in the toolbar. Only offered when an asset exists.
  const brandLogos: BrandLogos = {
    white: logo?.url ?? null,
    green: logoLight?.url ?? null,
  };
  const hasBrandLogo = !!(logo || logoLight);
  const hasContent = !!content && content.cards.length > 0;
  function addBrandLogo() {
    const bl = logoLight ?? logo; // green is the primary mark
    if (!bl) return;
    const h = 150;
    const w = Math.max(1, Math.round(h * bl.aspect));
    addLayer({
      id: makeLayerId(), type: "image", name: "brand-logo",
      x: Math.round(cx - w / 2), y: Math.round(cy - h / 2), w, h,
      rotation: 0, opacity: 1, locked: false,
      src: bl.url, objectFit: "contain", radius: 0,
    });
  }
  // Insert a generated donate QR (a PNG data URL) as an image layer, dropped
  // bottom-right where a "scan to donate" code usually sits.
  function addQrLayer(dataUrl: string, label: string) {
    const s = 260;
    const pad = 80;
    addLayer({
      id: makeLayerId(), type: "image", name: label,
      x: Math.round(activeSlide.width - s - pad),
      y: Math.round(activeSlide.height - s - pad),
      w: s, h: s,
      rotation: 0, opacity: 1, locked: false,
      src: dataUrl, objectFit: "contain", radius: 0,
    });
    setShowQr(false);
  }
  // Drop a snippet from the Content panel onto the current slide as a new text
  // block. Ink auto-contrasts the slide background so it's legible the instant
  // it lands; a gentle cascade keeps repeated adds from stacking exactly.
  function addTextBlock(text: string) {
    const w = 760;
    const off = (activeSlide.layers.length % 5) * 24;
    addLayer({
      id: makeLayerId(), type: "text",
      x: Math.round(cx - w / 2 + off), y: Math.round(cy - 70 + off), w, h: 150,
      rotation: 0, opacity: 1, locked: false,
      text: text || "Text",
      fontFamily: "DM Sans", fontSize: 44, fontWeight: 600,
      italic: false, underline: false, uppercase: false,
      color: inkForBackground(activeSlide.background),
      align: "left", lineHeight: 1.2, letterSpacing: 0,
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
    commitSlides(next);
    setActiveIndex(next.length - 1);
    setSelectedIds([]);
  }
  // Drop a template chosen from the in-editor Templates panel in as a new
  // slide (fresh layer ids), then jump to it. The panel stays open so she can
  // keep browsing/adding, Canva-style.
  function insertTemplateSlide(slide: EditorSlide) {
    const fresh = cloneSlideFresh(slide);
    // On a fresh blank canvas (a single empty slide), the first template
    // REPLACES that blank so there's no leftover empty page; after that we
    // append, Canva-style.
    const onlyBlank = deck.length === 1 && (deck[0]?.layers.length ?? 0) === 0;
    const next = onlyBlank ? [fresh] : [...deck, fresh];
    commitSlides(next);
    setActiveIndex(next.length - 1);
    setSelectedIds([]);
    setEditingId(null);
  }

  /* ── Template import (from the "View templates" browser) ──────────────
   * The browser tab writes the chosen template's slide to localStorage; we
   * pick it up here (immediately via the cross-tab `storage` event, and on
   * mount/focus as a fallback) and AUTO-INSERT it as a new slide — no
   * placement step. The handoff is consumed on read so a refocus/replay can't
   * double-insert; the second effect does the actual append (it needs the
   * current `deck`, which the mount-only reader can't close over). */
  const IMPORT_KEY = "dr-template-import";
  useEffect(() => {
    const read = () => {
      try {
        const raw = localStorage.getItem(IMPORT_KEY);
        if (!raw) return;
        const data = JSON.parse(raw) as { slide?: EditorSlide; name?: string; ts?: number };
        if (!data?.slide || !Array.isArray(data.slide.layers)) return;
        // Consume immediately (drop stale >10-min handoffs too) so mount /
        // focus / storage replays never re-insert the same template.
        localStorage.removeItem(IMPORT_KEY);
        if (data.ts && Date.now() - data.ts > 600_000) return;
        setPendingImport({ slide: data.slide, name: data.name ?? "Template" });
      } catch {
        /* ignore malformed handoff */
      }
    };
    read();
    const onStorage = (e: StorageEvent) => {
      if (e.key === IMPORT_KEY && e.newValue) read();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", read);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", read);
    };
  }, []);

  // Auto-insert the handed-off template as a new slide, then make it active.
  useEffect(() => {
    if (!pendingImport) return;
    const slide = cloneSlideFresh(pendingImport.slide);
    const next = [...deck, slide];
    commitSlides(next);
    setActiveIndex(next.length - 1);
    setSelectedIds([]);
    setPendingImport(null);
  }, [pendingImport, deck, commitSlides]);
  function deleteSlide(i: number) {
    if (deck.length <= 1) return;
    const next = deck.filter((_, idx) => idx !== i);
    commitSlides(next);
    setActiveIndex(Math.max(0, Math.min(i, next.length - 1)));
    setSelectedIds([]);
  }
  function duplicateSlide(i: number) {
    const src = deck[i]!;
    // Re-id every layer, tracking old→new so intra-slide references
    // (mask links) point at the CLONE's layers, not the originals'.
    const idMap = new Map<string, string>();
    const layers = src.layers.map((l) => {
      const id = makeLayerId();
      idMap.set(l.id, id);
      return { ...l, id } as Layer;
    });
    const clone: EditorSlide = {
      ...src,
      id: `sl_${makeLayerId().slice(3)}`,
      layers: layers.map((l) =>
        l.type === "image" && l.maskLayerId
          ? ({ ...l, maskLayerId: idMap.get(l.maskLayerId) ?? l.maskLayerId } as Layer)
          : l
      ),
    };
    const next = [...deck.slice(0, i + 1), clone, ...deck.slice(i + 1)];
    commitSlides(next);
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
      await exportDeck(deck, title, registry);
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
            <a
              href="/admin/social/template-lab/view"
              target="_blank"
              rel="opener"
              title="Browse all 95 templates (opens in a new tab)"
              className="hidden sm:flex items-center gap-1.5 h-9 px-3 rounded-lg border border-charcoal/12 text-[13px] font-medium text-charcoal/65 hover:text-charcoal hover:border-charcoal/30 transition"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                <rect x="1.5" y="1.5" width="5" height="5" rx="1" />
                <rect x="9.5" y="1.5" width="5" height="5" rx="1" />
                <rect x="1.5" y="9.5" width="5" height="5" rx="1" />
                <rect x="9.5" y="9.5" width="5" height="5" rx="1" />
              </svg>
              View templates
            </a>
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

        {/* Edit-master banner — shown while editing a component's layers. */}
        {editingComponent && (
          <div className="flex items-center justify-between gap-3 px-4 pb-2 border-t border-green/20 pt-2 bg-green/5">
            <span className="text-[12.5px] font-medium text-green flex items-center gap-1.5">
              <ComponentIcon /> Editing component master — changes apply to every instance.
            </span>
            <button
              type="button"
              onClick={finishEditComponent}
              className="h-8 px-3.5 rounded-lg bg-green text-white text-[12.5px] font-semibold hover:bg-green-dark transition"
            >
              Done editing
            </button>
          </div>
        )}

        {/* Contextual toolbar */}
        {(single || showAlign) && !editingId && (
          <div className="flex items-center gap-2 px-4 pb-2 border-t border-charcoal/5 pt-1.5 min-h-[48px] overflow-x-auto [&>*]:shrink-0">
            {selectedInstance ? (
              <InstanceToolbar
                instance={selectedInstance}
                def={selectedComponentDef}
                onSetVariant={setInstanceVariant}
                onSetOverride={setInstanceOverride}
                onResetOverrides={resetInstanceOverrides}
                onAddVariant={addVariantToSelected}
                onEdit={editSelectedComponent}
                onDetach={detachInstance}
                onDeleteComponent={() => deleteComponentDef(selectedInstance.componentId)}
              />
            ) : (
              single && (
                <ContextToolbar
                  layer={single}
                  onChange={mutateSelected}
                  onReplaceImage={() => setPicker("replace")}
                  onDuplicate={duplicateSelected}
                  onDelete={deleteSelected}
                  onArrange={arrange}
                  brandLogos={brandLogos}
                />
              )
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
            {autoLayoutGroupId && (
              <AutoLayoutToolbar
                config={activeAutoLayout}
                onToggle={toggleAutoLayout}
                onChange={updateAutoLayout}
              />
            )}
            <MaskToolbar
              canMask={!!maskPair}
              canRelease={!!releasableImage}
              onMask={maskWithShape}
              onRelease={releaseMask}
            />
            {canCreateComponent && !editingComponent && (
              <CreateComponentButton onCreate={createComponentFromSelection} />
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
          <RailBtn
            label="Templates"
            active={leftPanel === "templates"}
            onClick={() => setLeftPanel((p) => (p === "templates" ? null : "templates"))}
          >
            <TemplatesIcon />
          </RailBtn>
          {hasContent && (
            <RailBtn
              label="Content"
              active={leftPanel === "content"}
              onClick={() => setLeftPanel((p) => (p === "content" ? null : "content"))}
            >
              <ContentIcon />
            </RailBtn>
          )}
          <div className="w-8 h-px bg-charcoal/10 my-1" />
          <RailBtn label="Text" onClick={addText}><TextIcon /></RailBtn>
          <RailBtn label="Image" onClick={() => setPicker("add")}><ImageIcon /></RailBtn>
          {hasBrandLogo && (
            <RailBtn label="Logo" onClick={addBrandLogo}><BrandLogoIcon /></RailBtn>
          )}
          <RailBtn label="QR code" onClick={() => setShowQr(true)}><QrIcon /></RailBtn>
          <RailBtn label="Rect" onClick={() => addShape("rect")}><ShapeIcon kind="rect" /></RailBtn>
          <RailBtn label="Circle" onClick={() => addShape("ellipse")}><ShapeIcon kind="ellipse" /></RailBtn>
          <RailBtn label="Line" onClick={() => addShape("line")}><ShapeIcon kind="line" /></RailBtn>
        </div>

        {/* Templates flyout — scroll the whole catalogue, click to add a slide */}
        {leftPanel === "templates" && (
          <TemplatesPanel
            logo={logo}
            logoLight={logoLight}
            onPick={insertTemplateSlide}
            onClose={() => setLeftPanel(null)}
          />
        )}

        {/* Content flyout — report snippets, click to add a text block */}
        {leftPanel === "content" && content && (
          <ContentPanel
            content={content}
            sourceUrl={sourceUrl}
            onPick={addTextBlock}
            onClose={() => setLeftPanel(null)}
          />
        )}

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
              registry={registry}
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
              onFrameTranslate={translateFrame}
            />
          </div>

          {/* Filmstrip */}
          <div className="h-[120px] bg-white border-t border-charcoal/8 flex items-center gap-3 px-4 overflow-x-auto shrink-0">
            {deck.map((s, i) => (
              <SlideThumb
                key={s.id}
                slide={s}
                registry={registry}
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
            registry={registry}
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

      {showQr && <QrDialog onInsert={addQrLayer} onClose={() => setShowQr(false)} />}
    </div>
  );
}

/** Pick legible ink for a solid slide background: charcoal on light fields,
 *  cream on dark (forest/photo-flat) fields. Gradients/unknown → charcoal. */
function inkForBackground(bg: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec((bg ?? "").trim());
  if (!m) return "#1A1A2E";
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return lum > 0.5 ? "#1A1A2E" : "#F7F3E8";
}

/** Rail icon for the Templates panel — a 2×2 grid of layout cards. */
function TemplatesIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <rect x="2.5" y="2.5" width="6" height="6" rx="1.4" stroke="currentColor" strokeWidth="1.6" />
      <rect x="11.5" y="2.5" width="6" height="6" rx="1.4" stroke="currentColor" strokeWidth="1.6" />
      <rect x="2.5" y="11.5" width="6" height="6" rx="1.4" stroke="currentColor" strokeWidth="1.6" />
      <rect x="11.5" y="11.5" width="6" height="6" rx="1.4" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

/** Rail icon for the Content panel — lines of text / a document. */
function ContentIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <rect x="3.5" y="2.5" width="13" height="15" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M6.5 6.5h7M6.5 9.5h7M6.5 12.5h4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/** Rail icon for the QR-code generator. */
function QrIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <rect x="2.5" y="2.5" width="6" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.6" />
      <rect x="11.5" y="2.5" width="6" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.6" />
      <rect x="2.5" y="11.5" width="6" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M11.5 11.5h2.5v2.5M17.5 11.5v6M11.5 17.5h2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Rail icon for "insert brand logo" — the DR diamond emblem. */
function BrandLogoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <rect x="3.5" y="3.5" width="9.19" height="9.19" rx="1.2" transform="rotate(45 10 10)" stroke="currentColor" strokeWidth="1.6" />
      <rect x="7.2" y="7.2" width="5.6" height="5.6" rx="0.8" transform="rotate(45 10 10)" fill="currentColor" />
    </svg>
  );
}

/* ─── Filmstrip thumbnail ─────────────────────────────────────────── */
function SlideThumb({
  slide,
  registry,
  index,
  active,
  canDelete,
  onSelect,
  onDelete,
  onDuplicate,
}: {
  slide: EditorSlide;
  registry?: ComponentRegistry;
  index: number;
  active: boolean;
  canDelete: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const size = 84;
  const s = size / slide.width;
  // Apply the same auto-layout solver so thumbnails match the stage.
  const layout = resolveSlideLayout(slide);
  const boxOf = (l: Layer): LaidOutBox =>
    layout.get(l.id) ?? { x: l.x, y: l.y, w: l.w, h: l.h };
  // Mirror the stage's shape-as-mask rendering in thumbnails for parity.
  const maskShapeIds = activeMaskShapeIds(slide.layers);
  return (
    <div className="relative shrink-0 group">
      <button
        type="button"
        onClick={onSelect}
        className={`relative block rounded-lg overflow-hidden transition ${active ? "ring-2 ring-green" : "ring-1 ring-charcoal/10 hover:ring-charcoal/30"}`}
        style={{ width: size, height: (size / slide.width) * slide.height, background: slide.background }}
      >
        {slide.layers.map((l) => {
          const mask =
            l.type === "image" && !l.hidden ? resolveMaskShape(l, slide.layers) : null;
          return (
            <LayerView
              key={l.id}
              layer={l}
              scale={s}
              geom={layout.get(l.id)}
              registry={registry}
              mask={mask}
              maskBox={mask ? boxOf(mask) : null}
              maskedOut={maskShapeIds.has(l.id)}
              interactive={false}
            />
          );
        })}
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

/** Deep-clone a slide with fresh slide + layer ids (and re-linked mask
 *  references), so an imported/duplicated slide never collides with the
 *  deck's existing layer ids. Mirrors duplicateSlide's re-id logic. */
function cloneSlideFresh(src: EditorSlide): EditorSlide {
  const idMap = new Map<string, string>();
  const layers = src.layers.map((l) => {
    const id = makeLayerId();
    idMap.set(l.id, id);
    return { ...l, id } as Layer;
  });
  return {
    ...src,
    id: `sl_${makeLayerId().slice(3)}`,
    layers: layers.map((l) =>
      l.type === "image" && l.maskLayerId
        ? ({ ...l, maskLayerId: idMap.get(l.maskLayerId) ?? l.maskLayerId } as Layer)
        : l
    ),
  };
}

function blankSlide(w = 1080, h = 1080): EditorSlide {
  return { id: `sl_${makeLayerId().slice(3)}`, width: w, height: h, background: "#FFFFFF", layers: [] };
}
