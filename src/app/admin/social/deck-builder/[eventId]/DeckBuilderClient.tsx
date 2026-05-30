"use client";

/**
 * DeckBuilderClient — top-level state container for the Compose page.
 *
 * Owns:
 *   • The slides[] array (SlideDraft[]) + a stable client-uuid per
 *     slide that survives reorders.
 *   • The platform picker (Instagram = live, Facebook/X = coming soon)
 *   • The content cards + image candidates (fetched from the Phase 6b
 *     endpoints with a hardcoded MOCK fallback when 404).
 *   • The render preview cache — keyed on JSON.stringify of the slide
 *     config; values are object URLs (revoked when the cache evicts).
 *   • The drag context — handles three types of drops:
 *       · slide reorder        (sortable, dnd-kit)
 *       · content → slot       (canDropContentInSlot)
 *       · image   → slot       (canDropImageInSlot)
 *   • Auto-save (1s debounce, PUT to /api/admin/social-deck-drafts)
 *   • "Create post" export — for MVP, JSZip of all slide PNGs +
 *     captions.txt + a manifest.
 */

import {
  closestCenter,
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  ContentCard,
  ContentKind,
  ImageCandidate,
  SlotValues,
  SlotValue,
  SocialPlatform,
  TemplateMeta,
} from "@/lib/social-templates/types";
import ContentCardItem from "./ContentCard";
import Filmstrip from "./Filmstrip";
import ImageCardItem from "./ImageCard";
import SlideEditor, { type PreviewState } from "./SlideEditor";
import TemplatePicker from "./TemplatePicker";
import { contentKindSection } from "./labels";
import type {
  ContentBundle,
  DragPayload,
  ImageBundle,
  SlideDraft,
  TemplateGroups,
} from "./types";

interface Props {
  eventId: string;
  eventTitle: string;
  backHref: string;
  /** When reached via the wizard, the content + images are already
   *  fetched — pass them in to skip the re-fetch and the loading flash. */
  initialContent?: ContentBundle;
  initialImages?: ImageBundle;
  initialPlatform?: SocialPlatform;
  /** When the wizard hands off with a chosen slide count and the saved
   *  draft is empty, pre-seed an editable scaffold of this many slides
   *  (hero → … → cta). She can fully edit/reorder/swap afterwards. */
  seedSlideCount?: number;
}

const COMING_SOON_PLATFORMS: SocialPlatform[] = ["facebook", "x"];

export default function DeckBuilderClient({
  eventId,
  eventTitle,
  backHref,
  initialContent,
  initialImages,
  initialPlatform,
  seedSlideCount,
}: Props) {
  const [platform, setPlatform] = useState<SocialPlatform>(
    initialPlatform ?? "instagram"
  );
  const [slides, setSlides] = useState<SlideDraft[]>([]);
  // Which slide the big editor shows. The filmstrip selects; add/remove
  // keep this valid (see the sync effect below).
  const [selectedSlideId, setSelectedSlideId] = useState<string | null>(null);
  const [templateGroups, setTemplateGroups] = useState<TemplateGroups>({});
  const [templatesById, setTemplatesById] = useState<
    Record<string, TemplateMeta>
  >({});
  // Real data only — never seed fake "mock" content/images. When the
  // wizard pre-fetched them, seed from props and skip the loading state.
  const [content, setContent] = useState<ContentBundle>(
    initialContent ?? { cards: [] }
  );
  const [images, setImages] = useState<ImageBundle>(
    initialImages ?? { images: [] }
  );
  const [contentLoading, setContentLoading] = useState(!initialContent);
  const [imagesStatus, setImagesStatus] = useState<
    "loading" | "ready" | "error"
  >(initialImages ? "ready" : "loading");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [activeDrag, setActiveDrag] = useState<DragPayload | null>(null);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [autoSaveState, setAutoSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [exporting, setExporting] = useState(false);

  // ── Preview cache (Map<configKey, { url, state }>) ──────────────────
  // url stays alive until eviction; on unmount we revoke all of them.
  const [previewStates, setPreviewStates] = useState<
    Record<string, PreviewState>
  >({});
  const previewUrlsRef = useRef<Map<string, string>>(new Map());

  // ── Image candidates loader (also the retry handler) ────────────────
  const loadImages = useCallback(async () => {
    setImagesStatus("loading");
    try {
      const res = await fetch(
        `/api/admin/social-content/${eventId}/images`,
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as ImageBundle;
      setImages({ images: Array.isArray(json.images) ? json.images : [] });
      setImagesStatus("ready");
    } catch {
      setImagesStatus("error");
    }
  }, [eventId]);

  // ── Initial load: templates + saved draft + content/images ──────────
  useEffect(() => {
    let cancelled = false;

    async function load() {
      // Templates list — kept in a local `groups` so the draft block
      // below can scaffold without waiting on the async setState.
      let groups: TemplateGroups = {};
      try {
        const res = await fetch(
          `/api/admin/social-templates/list?platform=${platform}`,
          { cache: "no-store" }
        );
        if (res.ok && !cancelled) {
          const json = (await res.json()) as { groups: TemplateGroups };
          groups = json.groups ?? {};
          setTemplateGroups(groups);
          const flat: Record<string, TemplateMeta> = {};
          for (const list of Object.values(groups)) {
            for (const t of list) flat[t.id] = t;
          }
          setTemplatesById(flat);
        }
      } catch {
        // non-fatal — picker shows empty state
      }

      // Saved draft (if any). When empty and the wizard handed off a
      // seedSlideCount, pre-seed an editable scaffold.
      try {
        const res = await fetch(
          `/api/admin/social-deck-drafts/${eventId}?platform=${platform}`,
          { cache: "no-store" }
        );
        if (res.ok && !cancelled) {
          const json = (await res.json()) as {
            slides: SlideDraft[];
            exists: boolean;
          };
          if (json.exists && json.slides.length > 0) {
            setSlides(json.slides);
          } else if (seedSlideCount && seedSlideCount > 0) {
            const seeded = scaffoldDeck(seedSlideCount, groups);
            if (seeded.length > 0) setSlides(seeded);
          }
        }
      } catch {
        // empty deck
      } finally {
        if (!cancelled) setDraftLoaded(true);
      }

      // Content extraction — skip the fetch when the wizard pre-loaded it.
      if (!initialContent) {
        try {
          const res = await fetch(
            `/api/admin/social-content/${eventId}/extract`,
            { cache: "no-store" }
          );
          if (res.ok && !cancelled) {
            const json = (await res.json()) as ContentBundle;
            setContent({ cards: Array.isArray(json.cards) ? json.cards : [] });
          }
        } catch {
          // leave content empty — the column shows an empty state
        } finally {
          if (!cancelled) setContentLoading(false);
        }
      }

      // Images — skip when the wizard pre-loaded them.
      if (initialImages) return;
      await loadImages();
    }

    load();
    return () => {
      cancelled = true;
    };
    // platform change forces a reload of templates + draft (one draft
    // per (event, platform)); event ID never changes mid-mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platform, eventId]);

  // ── Auto-save: debounce 1s on slides change ─────────────────────────
  useEffect(() => {
    if (!draftLoaded) return; // don't save the empty initial state over a real draft
    setAutoSaveState("saving");
    const handle = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/admin/social-deck-drafts/${eventId}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ platform, slides }),
          }
        );
        setAutoSaveState(res.ok ? "saved" : "error");
      } catch {
        setAutoSaveState("error");
      }
    }, 1000);
    return () => clearTimeout(handle);
  }, [slides, platform, eventId, draftLoaded]);

  // ── Preview generation: every slide whose config-key isn't in cache
  // gets a fetch fired. Debounce 300ms per the spec — but the debounce
  // applies to RE-RENDERS of the SAME slide, not the cross-slide queue.
  // We implement it as: on every slides change, after 300ms, walk the
  // slides and kick off renders for misses.
  useEffect(() => {
    const handle = setTimeout(() => {
      slides.forEach((slide) => {
        const key = configKey(slide);
        const current = previewStates[`${slide.slideId}:${key}`];
        if (current?.state === "ready" || current?.state === "loading") return;

        // Avoid double-firing if the slide has no template (broken ref)
        if (!templatesById[slide.templateId]) return;

        // Phase 7 — render-always. We fire a render even for a slide
        // with zero filled slots so picking a template instantly shows
        // the blank branded layout (Canva/Gamma behaviour). The render
        // endpoint no longer 400s on empty required slots.

        // current was narrowed to non-ready/loading above (we returned
        // early). For previousUrl we instead peek at the LATEST ready
        // render for THIS slide (any key) so we can show a dimmed image
        // while the new render is in flight. Cheap linear scan — keys
        // are small.
        let previousUrl: string | null = null;
        for (const [k, v] of Object.entries(previewStates)) {
          if (k.startsWith(`${slide.slideId}:`) && v.state === "ready") {
            previousUrl = v.url;
            break;
          }
        }
        setPreviewStates((p) => ({
          ...p,
          [`${slide.slideId}:${key}`]: {
            state: "loading",
            previousUrl,
          },
        }));

        renderSlide(slide)
          .then((blob) => {
            const url = URL.createObjectURL(blob);
            previewUrlsRef.current.set(`${slide.slideId}:${key}`, url);
            setPreviewStates((p) => ({
              ...p,
              [`${slide.slideId}:${key}`]: { state: "ready", url },
            }));
          })
          .catch((err: Error) => {
            setPreviewStates((p) => ({
              ...p,
              [`${slide.slideId}:${key}`]: {
                state: "error",
                message: err.message,
              },
            }));
          });
      });
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slides, templatesById]);

  // ── Cleanup blob URLs on unmount ────────────────────────────────────
  useEffect(() => {
    return () => {
      for (const url of previewUrlsRef.current.values()) {
        URL.revokeObjectURL(url);
      }
      previewUrlsRef.current.clear();
    };
  }, []);

  // ── DnD handlers ────────────────────────────────────────────────────
  // Keep the selected slide valid: when a draft loads or the selected
  // slide disappears, fall back to the first slide (or none).
  useEffect(() => {
    if (slides.length === 0) {
      if (selectedSlideId !== null) setSelectedSlideId(null);
      return;
    }
    if (!selectedSlideId || !slides.some((s) => s.slideId === selectedSlideId)) {
      setSelectedSlideId(slides[0]!.slideId);
    }
  }, [slides, selectedSlideId]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  const onDragStart = useCallback((e: DragStartEvent) => {
    const payload = e.active.data.current as DragPayload | undefined;
    setActiveDrag(payload ?? null);
  }, []);

  const onDragEnd = useCallback((e: DragEndEvent) => {
    setActiveDrag(null);
    const { active, over } = e;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    // Slide reorder: both sides have "slide:" prefix
    if (activeId.startsWith("slide:") && overId.startsWith("slide:")) {
      if (activeId === overId) return;
      setSlides((prev) => {
        const from = prev.findIndex((s) => `slide:${s.slideId}` === activeId);
        const to = prev.findIndex((s) => `slide:${s.slideId}` === overId);
        if (from === -1 || to === -1) return prev;
        return arrayMove(prev, from, to);
      });
      return;
    }

    // Content/image drop onto a slot
    if (overId.startsWith("slot:")) {
      const payload = active.data.current as DragPayload | undefined;
      const dropData = over.data.current as
        | { slideId: string; slotId: string; slotType: string }
        | undefined;
      if (!payload || !dropData) return;
      const { slideId, slotId, slotType } = dropData;

      setSlides((prev) =>
        prev.map((s) => {
          if (s.slideId !== slideId) return s;
          return applyDropToSlide(s, slotId, slotType, payload);
        })
      );
    }
  }, []);

  // ── Slide CRUD ──────────────────────────────────────────────────────
  const addSlide = useCallback((meta: TemplateMeta) => {
    const slideId = makeUuid();
    const slotValues: SlotValues = {};
    // Seed choice slots with their declared defaults so the preview
    // can render without the SMM having to pick them.
    for (const slot of meta.slots) {
      if (slot.type.startsWith("choice:") && typeof slot.defaultValue === "string") {
        slotValues[slot.id] = { type: "choice", value: slot.defaultValue };
      }
    }
    setSlides((prev) => [
      ...prev,
      { slideId, templateId: meta.id, slotValues, imageMediaIds: {} },
    ]);
    setSelectedSlideId(slideId); // jump to the slide just added
    setPickerOpen(false);
  }, []);

  const removeSlide = useCallback((slideId: string) => {
    setSlides((prev) => {
      const idx = prev.findIndex((s) => s.slideId === slideId);
      const next = prev.filter((s) => s.slideId !== slideId);
      // If we removed the selected slide, select a neighbour.
      setSelectedSlideId((cur) => {
        if (cur !== slideId) return cur;
        if (next.length === 0) return null;
        return next[Math.min(idx, next.length - 1)]!.slideId;
      });
      return next;
    });
  }, []);

  const clearSlot = useCallback((slideId: string, slotId: string) => {
    setSlides((prev) =>
      prev.map((s) => {
        if (s.slideId !== slideId) return s;
        const nextValues = { ...s.slotValues };
        delete nextValues[slotId];
        const nextImages = { ...s.imageMediaIds };
        delete nextImages[slotId];
        return { ...s, slotValues: nextValues, imageMediaIds: nextImages };
      })
    );
  }, []);

  const setChoice = useCallback(
    (slideId: string, slotId: string, value: string) => {
      setSlides((prev) =>
        prev.map((s) => {
          if (s.slideId !== slideId) return s;
          const next: SlotValues = { ...s.slotValues };
          if (!value) delete next[slotId];
          else next[slotId] = { type: "choice", value };
          return { ...s, slotValues: next };
        })
      );
    },
    []
  );

  // ── Export ──────────────────────────────────────────────────────────
  const handleExport = useCallback(async () => {
    if (slides.length === 0) return;
    setExporting(true);
    try {
      // Dynamic import — keeps jszip out of the initial bundle for SMMs
      // who never click Create post.
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();

      // captions.txt — concatenate any caption_* values stored as text
      // slots, plus a manifest. For MVP we ALSO scan slide content for
      // caption-shaped slot values; the SMM may also have dragged a
      // caption_ig card into a text:body slot for use as the IG copy.
      const captions: string[] = [];
      const manifest: string[] = [];

      const renderResults = await Promise.allSettled(
        slides.map((s) => renderSlide(s).then((blob) => ({ s, blob })))
      );

      let i = 0;
      for (const result of renderResults) {
        i += 1;
        if (result.status === "fulfilled") {
          const arr = new Uint8Array(await result.value.blob.arrayBuffer());
          const filename = `slide-${String(i).padStart(2, "0")}-${result.value.s.templateId}.png`;
          zip.file(filename, arr);
          manifest.push(`${filename}  template=${result.value.s.templateId}`);
        } else {
          manifest.push(`slide-${String(i).padStart(2, "0")}  ERROR: ${result.reason}`);
        }
      }

      // Captions are typically attached to the post overall, not per
      // slide. We collect them from the deck's caption_ig cards by
      // scanning the LEFT-column content (a no-op for MVP if none was
      // dragged into a slot, but at least the cards stay available
      // for copy/paste).
      for (const c of content.cards) {
        if (
          c.card.kind === "caption_ig" ||
          c.card.kind === "caption_fb" ||
          c.card.kind === "caption_x"
        ) {
          captions.push(`# ${c.card.kind}\n${c.card.text}\n`);
        }
      }

      zip.file("captions.txt", captions.join("\n") || "(no captions)");
      zip.file("manifest.txt", manifest.join("\n"));

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `deck-${eventTitle.slice(0, 30).replace(/[^a-z0-9]+/gi, "-")}-${platform}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5_000);
    } finally {
      setExporting(false);
    }
  }, [slides, content, eventTitle, platform]);

  const comingSoon = COMING_SOON_PLATFORMS.includes(platform);

  // ── Group content by kind for column layout ─────────────────────────
  const contentByKind = useMemo(() => {
    const m = new Map<ContentKind, Array<{ id: string; card: ContentCard }>>();
    for (const c of content.cards) {
      const list = m.get(c.card.kind) ?? [];
      list.push(c);
      m.set(c.card.kind, list);
    }
    return m;
  }, [content]);

  // ── Image mediaId → thumbnail resolver (for the slot row chips) ──────
  const resolveImageThumb = useCallback(
    (mediaId: string): string | null => {
      const img = images.images.find((i) => i.id === mediaId);
      return img?.thumbnailUrl ?? img?.url ?? null;
    },
    [images]
  );

  // ── Content grouped into sentence-case sections for the left column.
  // Kinds that share a section label (the three caption variants →
  // "Captions", the two email parts → "Email") merge under one header.
  const contentSections = useMemo(() => {
    const order: ContentKind[] = [
      "title",
      "fact",
      "quote",
      "tier_row",
      "hashtag",
      "body",
      "eyebrow",
      "caption_ig",
      "caption_fb",
      "caption_x",
      "email_subject",
      "email_body",
      "source",
    ];
    const bySection = new Map<
      string,
      { label: string; cards: Array<{ id: string; card: ContentCard }> }
    >();
    for (const kind of order) {
      const cards = contentByKind.get(kind);
      if (!cards?.length) continue;
      const label = contentKindSection(kind);
      const existing = bySection.get(label);
      if (existing) existing.cards.push(...cards);
      else bySection.set(label, { label, cards: [...cards] });
    }
    return [...bySection.values()];
  }, [contentByKind]);

  // ── Filmstrip support ───────────────────────────────────────────────
  const selectedSlide = useMemo(
    () => slides.find((s) => s.slideId === selectedSlideId) ?? null,
    [slides, selectedSlideId]
  );

  // slideId → latest ready preview URL (for the filmstrip thumbnails).
  const previewBySlide = useMemo(() => {
    const m: Record<string, string | null> = {};
    for (const s of slides) {
      let url: string | null = null;
      for (const [k, v] of Object.entries(previewStates)) {
        if (k.startsWith(`${s.slideId}:`) && v.state === "ready") {
          url = v.url;
          break;
        }
      }
      m[s.slideId] = url;
    }
    return m;
  }, [slides, previewStates]);

  // slideId → has at least one required slot still empty.
  const incompleteBySlide = useMemo(() => {
    const m: Record<string, boolean> = {};
    for (const s of slides) {
      const t = templatesById[s.templateId];
      m[s.slideId] = t
        ? t.slots.some((sl) => {
            if (!sl.required) return false;
            if (sl.type.startsWith("image:")) return !s.imageMediaIds[sl.id];
            if (sl.type.startsWith("choice:")) return false;
            return s.slotValues[sl.id] === undefined;
          })
        : false;
    }
    return m;
  }, [slides, templatesById]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveDrag(null)}
    >
      {/* ── Top bar ── */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-charcoal/8 px-4 py-2.5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href={backHref}
              className="flex items-center gap-1.5 text-[13px] text-charcoal/55 hover:text-charcoal shrink-0"
            >
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 5l-5 5 5 5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Back
            </Link>
            <span className="w-px h-4 bg-charcoal/12" />
            <h1 className="font-heading font-semibold text-charcoal text-[15px] md:text-base truncate max-w-md">
              {eventTitle}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <AutoSaveBadge state={autoSaveState} />
            <span className="text-[12px] text-charcoal/40 hidden md:inline">
              {slides.length} slide{slides.length === 1 ? "" : "s"}
            </span>
            <PlatformPicker value={platform} onChange={setPlatform} />
            <button
              type="button"
              onClick={handleExport}
              disabled={slides.length === 0 || exporting || comingSoon}
              className="bg-amber-dark text-white text-[13px] font-semibold px-4 py-1.5 rounded-lg hover:bg-amber-darker disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
            >
              {exporting ? "Exporting…" : "Create post"}
            </button>
          </div>
        </div>
      </header>

      {/* ── Three-column workspace ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_280px] gap-4 p-4 max-w-[1600px] mx-auto">
        {/* LEFT: content cards, grouped into sentence-case sections */}
        <aside className="flex flex-col gap-5">
          <h2 className="text-[12px] font-semibold text-charcoal/45 px-0.5">
            Content
          </h2>
          {comingSoon ? (
            <ComingSoonBanner platform={platform} />
          ) : contentLoading ? (
            <SkeletonStack rows={5} />
          ) : contentSections.length === 0 ? (
            <p className="text-[12px] text-charcoal/45 px-0.5">
              No content extracted yet.
            </p>
          ) : (
            contentSections.map((section) => (
              <div key={section.label} className="flex flex-col gap-1.5">
                <h3 className="text-[11px] font-semibold text-charcoal/40 px-0.5">
                  {section.label}
                  <span className="ml-1.5 text-charcoal/25 font-normal">
                    {section.cards.length}
                  </span>
                </h3>
                {section.cards.map((c) => (
                  <ContentCardItem key={c.id} id={c.id} card={c.card} />
                ))}
              </div>
            ))
          )}
        </aside>

        {/* MIDDLE: selected slide editor (hero) + filmstrip */}
        <section className="flex flex-col gap-3 min-w-0">
          {slides.length === 0 ? (
            <EmptyDeckPrompt
              onAdd={() => setPickerOpen(true)}
              disabled={comingSoon}
            />
          ) : (
            <>
              {selectedSlide && (
                <SlideEditor
                  slide={selectedSlide}
                  index={slides.findIndex(
                    (s) => s.slideId === selectedSlide.slideId
                  )}
                  template={templatesById[selectedSlide.templateId] ?? null}
                  previewState={
                    previewStates[
                      `${selectedSlide.slideId}:${configKey(selectedSlide)}`
                    ] ?? { state: "idle" }
                  }
                  resolveImageThumb={resolveImageThumb}
                  onRemove={() => removeSlide(selectedSlide.slideId)}
                  onClearSlot={(slotId) =>
                    clearSlot(selectedSlide.slideId, slotId)
                  }
                  onSetChoice={(slotId, v) =>
                    setChoice(selectedSlide.slideId, slotId, v)
                  }
                />
              )}
              {!comingSoon && (
                <Filmstrip
                  slides={slides}
                  selectedId={selectedSlideId}
                  previewBySlide={previewBySlide}
                  incompleteBySlide={incompleteBySlide}
                  onSelect={setSelectedSlideId}
                  onRemove={removeSlide}
                  onAdd={() => setPickerOpen(true)}
                />
              )}
            </>
          )}
        </section>

        {/* RIGHT: image gallery */}
        <aside className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between px-0.5">
            <h2 className="text-[12px] font-semibold text-charcoal/45">Imagery</h2>
            {!comingSoon && imagesStatus === "ready" && images.images.length > 0 && (
              <span className="text-[11px] text-charcoal/30">
                {images.images.length}
              </span>
            )}
          </div>
          {comingSoon ? null : imagesStatus === "loading" ? (
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-xl bg-charcoal/[0.05] animate-pulse"
                />
              ))}
            </div>
          ) : imagesStatus === "error" ? (
            <div className="rounded-xl bg-white ring-1 ring-charcoal/8 px-3 py-4 text-center">
              <p className="text-[12px] text-charcoal/55 mb-2">
                Couldn&apos;t load imagery.
              </p>
              <button
                type="button"
                onClick={loadImages}
                className="text-[12px] font-medium text-green-dark hover:text-green underline underline-offset-2"
              >
                Retry
              </button>
            </div>
          ) : images.images.length === 0 ? (
            <p className="text-[12px] text-charcoal/45 px-0.5">
              No imagery found for this event.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {images.images.map((img) => (
                <ImageCardItem key={img.id} image={img} />
              ))}
            </div>
          )}
        </aside>
      </div>

      {/* Template picker modal */}
      {pickerOpen && (
        <TemplatePicker
          groups={templateGroups}
          onPick={addSlide}
          onClose={() => setPickerOpen(false)}
        />
      )}

      {/* Drag overlay so the card follows the cursor across columns */}
      <DragOverlay>
        {activeDrag?.kind === "content" && (
          <div className="opacity-90 scale-105 shadow-xl rounded-xl">
            <ContentCardItem id={activeDrag.cardId} card={activeDrag.card} />
          </div>
        )}
        {activeDrag?.kind === "image" && (
          <div className="opacity-90 scale-105 shadow-xl">
            <ImageCardItem image={activeDrag.image} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

/* ─── Helpers ─────────────────────────────────────────────────────── */

function makeUuid(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `s_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
}

/** Build an editable starter deck of `count` slides from the available
 *  template groups: a hero first, a CTA last, and a sensible spread of
 *  fact / stat / response / tiers / testimony in between. Choice slots
 *  get their declared defaults so each slide renders immediately. The
 *  SMM can reorder, swap templates, and fill freely afterwards — this
 *  is a scaffold, not a cage. */
function scaffoldDeck(
  count: number,
  groups: TemplateGroups
): SlideDraft[] {
  const firstOf = (cat: string): TemplateMeta | null => groups[cat]?.[0] ?? null;
  const hero = firstOf("hero");
  const cta = firstOf("cta");
  const middlePool = ["fact", "stat", "response", "tiers", "testimony", "chapter"]
    .map(firstOf)
    .filter((t): t is TemplateMeta => t != null);

  const chosen: TemplateMeta[] = [];
  if (hero) chosen.push(hero);
  const middleCount = Math.max(0, count - chosen.length - (cta ? 1 : 0));
  for (let k = 0; k < middleCount && middlePool.length > 0; k++) {
    chosen.push(middlePool[k % middlePool.length]!);
  }
  if (cta && chosen.length < count) chosen.push(cta);
  // If the registry was sparse, pad with whatever hero/first template we have.
  while (chosen.length < count && (hero || middlePool[0])) {
    chosen.push(hero ?? middlePool[0]!);
  }

  return chosen.slice(0, count).map((meta) => {
    const slotValues: SlotValues = {};
    for (const slot of meta.slots) {
      if (
        slot.type.startsWith("choice:") &&
        typeof slot.defaultValue === "string"
      ) {
        slotValues[slot.id] = { type: "choice", value: slot.defaultValue };
      }
    }
    return {
      slideId: makeUuid(),
      templateId: meta.id,
      slotValues,
      imageMediaIds: {},
    };
  });
}

/** Stable preview cache key — every change to templateId / slotValues
 *  / imageMediaIds triggers a new render. */
function configKey(s: SlideDraft): string {
  return JSON.stringify({
    t: s.templateId,
    v: s.slotValues,
    i: s.imageMediaIds,
  });
}

/** Post a slide to /render and return the PNG blob. Throws with the
 *  response text body on non-2xx (the render endpoint returns friendly
 *  text errors). */
async function renderSlide(s: SlideDraft): Promise<Blob> {
  const res = await fetch("/api/admin/social-templates/render", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      templateId: s.templateId,
      slotValues: s.slotValues,
      imageMediaIds: s.imageMediaIds,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Render failed (${res.status})`);
  }
  return await res.blob();
}

/** Apply a content/image drop to one slide and return the next slide.
 *  Pure — caller is responsible for state immutability. */
function applyDropToSlide(
  s: SlideDraft,
  slotId: string,
  slotType: string,
  payload: DragPayload
): SlideDraft {
  // Content card drop
  if (payload.kind === "content") {
    const card = payload.card;
    // tier:rows accepts tier_row cards. If the existing value is also
    // tier_rows, append; else start a fresh array.
    if (slotType === "tier:rows" && card.kind === "tier_row") {
      const existing = s.slotValues[slotId];
      const newRow = {
        amountGbp: card.amountGbp,
        shortDescription: card.shortDescription,
        longDescription: card.longDescription,
      };
      const next: SlotValue =
        existing?.type === "tier_rows"
          ? { type: "tier_rows", rows: [...existing.rows, newRow] }
          : { type: "tier_rows", rows: [newRow] };
      return {
        ...s,
        slotValues: { ...s.slotValues, [slotId]: next },
      };
    }

    // Text slots — extract the text + optional source/attribution.
    if (slotType.startsWith("text:")) {
      const extracted = textFromCard(card);
      if (!extracted) return s;
      return {
        ...s,
        slotValues: { ...s.slotValues, [slotId]: extracted },
      };
    }
    return s;
  }

  // Image drop — only valid into image:* slots.
  if (payload.kind === "image" && slotType.startsWith("image:")) {
    const mediaId = payload.image.id;
    return {
      ...s,
      slotValues: {
        ...s.slotValues,
        [slotId]: { type: "image", mediaId },
      },
      imageMediaIds: { ...s.imageMediaIds, [slotId]: mediaId },
    };
  }
  return s;
}

function textFromCard(card: ContentCard): SlotValue | null {
  if ("text" in card) {
    const value: SlotValue = { type: "text", text: card.text };
    if (card.kind === "fact" && card.source) value.source = card.source;
    if (card.kind === "quote") value.attribution = card.attribution;
    return value;
  }
  // hashtag has `tag`, not `text` — coerce. Less common drop but
  // possible for text:body slots.
  if (card.kind === "hashtag") {
    return { type: "text", text: `#${card.tag}` };
  }
  return null;
}

/* ─── Small UI atoms ──────────────────────────────────────────────── */

function PlatformPicker({
  value,
  onChange,
}: {
  value: SocialPlatform;
  onChange: (v: SocialPlatform) => void;
}) {
  return (
    <div className="inline-flex bg-cream rounded-md border border-charcoal/10 p-0.5 text-[12px] font-semibold">
      {(["instagram", "facebook", "x"] as const).map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          className={`px-3 py-1 rounded ${
            value === p
              ? "bg-white text-charcoal shadow-sm"
              : "text-charcoal/55 hover:text-charcoal"
          }`}
        >
          {p === "instagram" ? "Instagram" : p === "facebook" ? "Facebook" : "X"}
        </button>
      ))}
    </div>
  );
}

function AutoSaveBadge({
  state,
}: {
  state: "idle" | "saving" | "saved" | "error";
}) {
  const label =
    state === "saving"
      ? "Saving…"
      : state === "saved"
        ? "Saved"
        : state === "error"
          ? "Save failed"
          : "";
  if (!label) return null;
  return (
    <span
      className={`hidden sm:inline-flex items-center gap-1.5 text-[12px] ${
        state === "error" ? "text-red" : "text-charcoal/40"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          state === "error"
            ? "bg-red"
            : state === "saving"
              ? "bg-amber animate-pulse"
              : "bg-green/60"
        }`}
      />
      {label}
    </span>
  );
}

function SkeletonStack({ rows }: { rows: number }) {
  return (
    <div className="flex flex-col gap-1.5">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-12 rounded-lg bg-charcoal/[0.04] animate-pulse"
        />
      ))}
    </div>
  );
}

function ComingSoonBanner({ platform }: { platform: SocialPlatform }) {
  const label = platform === "facebook" ? "Facebook" : "X (Twitter)";
  return (
    <div className="rounded-xl bg-amber-light/40 ring-1 ring-amber/20 px-3.5 py-3 text-[12px] text-charcoal/70 leading-relaxed">
      <span className="font-semibold text-charcoal/85">{label} — coming soon.</span>{" "}
      Only Instagram is wired end-to-end for now. Switch back to Instagram to
      compose.
    </div>
  );
}

function EmptyDeckPrompt({
  onAdd,
  disabled,
}: {
  onAdd: () => void;
  disabled: boolean;
}) {
  return (
    <div className="rounded-2xl bg-white ring-1 ring-charcoal/8 px-8 py-14 text-center">
      <div className="mx-auto mb-4 w-12 h-12 rounded-xl bg-green/[0.07] grid place-items-center">
        <svg className="w-6 h-6 text-green/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <rect x="4" y="4" width="16" height="16" rx="2.5" />
          <path d="M12 9v6M9 12h6" strokeLinecap="round" />
        </svg>
      </div>
      <h2 className="font-heading font-semibold text-charcoal text-[17px] mb-1.5">
        Start your carousel
      </h2>
      <p className="text-charcoal/55 text-[13px] max-w-sm mx-auto mb-5 leading-relaxed">
        Add a slide, then drag headlines, facts and photos onto it. The preview
        updates as you go.
      </p>
      <button
        type="button"
        onClick={onAdd}
        disabled={disabled}
        className="bg-amber-dark text-white text-[13px] font-semibold px-4 py-2 rounded-lg hover:bg-amber-darker disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
      >
        Add a slide
      </button>
    </div>
  );
}
