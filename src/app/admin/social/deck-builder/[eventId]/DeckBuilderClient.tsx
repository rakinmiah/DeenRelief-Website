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
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
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
import ImageCardItem from "./ImageCard";
import SlideEditor, { type PreviewState } from "./SlideEditor";
import TemplatePicker from "./TemplatePicker";
import { contentKindSection } from "./labels";
import { MOCK_CONTENT, MOCK_IMAGES } from "./mock-data";
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
}

const COMING_SOON_PLATFORMS: SocialPlatform[] = ["facebook", "x"];

export default function DeckBuilderClient({
  eventId,
  eventTitle,
  backHref,
}: Props) {
  const [platform, setPlatform] = useState<SocialPlatform>("instagram");
  const [slides, setSlides] = useState<SlideDraft[]>([]);
  const [templateGroups, setTemplateGroups] = useState<TemplateGroups>({});
  const [templatesById, setTemplatesById] = useState<
    Record<string, TemplateMeta>
  >({});
  const [content, setContent] = useState<ContentBundle>(MOCK_CONTENT);
  const [images, setImages] = useState<ImageBundle>(MOCK_IMAGES);
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

  // ── Initial load: templates + saved draft + content/images ──────────
  useEffect(() => {
    let cancelled = false;

    async function load() {
      // Templates list
      try {
        const res = await fetch(
          `/api/admin/social-templates/list?platform=${platform}`,
          { cache: "no-store" }
        );
        if (res.ok && !cancelled) {
          const json = (await res.json()) as { groups: TemplateGroups };
          setTemplateGroups(json.groups ?? {});
          const flat: Record<string, TemplateMeta> = {};
          for (const list of Object.values(json.groups ?? {})) {
            for (const t of list) flat[t.id] = t;
          }
          setTemplatesById(flat);
        }
      } catch {
        // non-fatal — picker shows empty state
      }

      // Saved draft (if any)
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
          if (json.exists) setSlides(json.slides);
        }
      } catch {
        // empty deck
      } finally {
        if (!cancelled) setDraftLoaded(true);
      }

      // Content extraction (with MOCK fallback on 404)
      try {
        const res = await fetch(
          `/api/admin/social-content/${eventId}/extract`,
          { cache: "no-store" }
        );
        if (res.ok && !cancelled) {
          const json = (await res.json()) as ContentBundle;
          if (Array.isArray(json.cards) && json.cards.length > 0) {
            setContent(json);
          }
        }
        // 404 → keep MOCK
      } catch {
        // keep MOCK
      }

      // Images
      try {
        const res = await fetch(
          `/api/admin/social-content/${eventId}/images`,
          { cache: "no-store" }
        );
        if (res.ok && !cancelled) {
          const json = (await res.json()) as ImageBundle;
          if (Array.isArray(json.images) && json.images.length > 0) {
            setImages(json);
          }
        }
      } catch {
        // keep MOCK
      }
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
    setPickerOpen(false);
  }, []);

  const removeSlide = useCallback((slideId: string) => {
    setSlides((prev) => prev.filter((s) => s.slideId !== slideId));
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

        {/* MIDDLE: slide timeline */}
        <section className="flex flex-col gap-4 min-w-0">
          {slides.length === 0 ? (
            <EmptyDeckPrompt
              onAdd={() => setPickerOpen(true)}
              disabled={comingSoon}
            />
          ) : (
            <SortableContext
              items={slides.map((s) => `slide:${s.slideId}`)}
              strategy={verticalListSortingStrategy}
            >
              <div className="flex flex-col gap-3">
                {slides.map((s, i) => (
                  <SlideEditor
                    key={s.slideId}
                    slide={s}
                    index={i}
                    template={templatesById[s.templateId] ?? null}
                    previewState={
                      previewStates[`${s.slideId}:${configKey(s)}`] ?? {
                        state: "idle",
                      }
                    }
                    resolveImageThumb={resolveImageThumb}
                    onRemove={() => removeSlide(s.slideId)}
                    onClearSlot={(slotId) => clearSlot(s.slideId, slotId)}
                    onSetChoice={(slotId, v) => setChoice(s.slideId, slotId, v)}
                  />
                ))}
              </div>
            </SortableContext>
          )}
          {slides.length > 0 && !comingSoon && (
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="w-full border-2 border-dashed border-charcoal/15 hover:border-amber/40 hover:bg-amber-light/30 text-charcoal/65 hover:text-charcoal text-[13px] font-semibold py-3 rounded-xl transition-colors"
            >
              + Add slide
            </button>
          )}
        </section>

        {/* RIGHT: image gallery */}
        <aside className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between px-0.5">
            <h2 className="text-[12px] font-semibold text-charcoal/45">Imagery</h2>
            {!comingSoon && images.images.length > 0 && (
              <span className="text-[11px] text-charcoal/30">
                {images.images.length}
              </span>
            )}
          </div>
          {comingSoon ? null : (
            <div className="grid grid-cols-2 gap-2">
              {images.images.map((img) => (
                <ImageCardItem key={img.id} image={img} />
              ))}
              {images.images.length === 0 && (
                <p className="text-[12px] text-charcoal/45 col-span-2 px-0.5">
                  No imagery yet.
                </p>
              )}
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

function ComingSoonBanner({ platform }: { platform: SocialPlatform }) {
  const label = platform === "facebook" ? "Facebook" : "X (Twitter)";
  return (
    <div className="bg-amber-light/50 border border-amber/30 rounded-xl px-3 py-3 text-[12px] text-charcoal/75 leading-snug">
      <span className="font-bold">{label} — coming soon.</span> Only Instagram
      is wired end-to-end for the MVP. Switch back to Instagram to compose.
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
    <div className="border-2 border-dashed border-charcoal/15 rounded-2xl p-10 text-center bg-white">
      <h2 className="font-heading font-bold text-charcoal text-lg mb-2">
        Empty deck
      </h2>
      <p className="text-charcoal/65 text-[13px] max-w-md mx-auto mb-4 leading-relaxed">
        Pick a template to add your first slide. Drag content from the left
        column into the slide&apos;s slots — the preview re-renders as you go.
      </p>
      <button
        type="button"
        onClick={onAdd}
        disabled={disabled}
        className="bg-amber-dark text-white text-[12.5px] font-bold uppercase tracking-[0.06em] px-4 py-2 rounded-md hover:bg-amber-darker disabled:opacity-40 disabled:cursor-not-allowed"
      >
        + Add slide
      </button>
    </div>
  );
}
