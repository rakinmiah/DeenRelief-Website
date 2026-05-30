"use client";

/**
 * HeroBuilder — the guided sub-flow for slide 1 (Phase 9).
 *
 * After the wizard, the SMM builds the hero slide one decision at a
 * time, with her choices accumulating in a pinned header:
 *
 *   intro → title → subtext → image → template
 *
 * Intro: "Slide 1" then the category ("Hero") glide to the top via a
 * shared layoutId, then the question + options spawn below. The chosen
 * title (then subtext, then image) stay pinned through every step. The
 * template step renders each hero template LIVE with her actual content
 * composed in, via the render endpoint. On confirm, the finished hero
 * SlideDraft is handed back to the flow.
 */

import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  ImageCandidate,
  SlotValues,
  TemplateMeta,
} from "@/lib/social-templates/types";
import type { ContentBundle, ImageBundle, SlideDraft } from "./types";

type Phase = "intro" | "title" | "subtext" | "image" | "template";

export interface HeroChoice {
  title: string;
  subtext: string | null;
  imageId: string | null;
  templateId: string;
}

export default function HeroBuilder({
  content,
  images,
  heroTemplates,
  onComplete,
}: {
  content: ContentBundle;
  images: ImageBundle;
  heroTemplates: TemplateMeta[];
  onComplete: (slide: SlideDraft) => void;
}) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [title, setTitle] = useState<string | null>(null);
  const [subtext, setSubtext] = useState<string | null>(null);
  const [imageId, setImageId] = useState<string | null>(null);

  // Auto-advance the intro.
  useEffect(() => {
    if (phase !== "intro") return;
    const t = setTimeout(() => setPhase("title"), 1900);
    return () => clearTimeout(t);
  }, [phase]);

  const titleOptions = useMemo(
    () =>
      content.cards
        .filter((c) => c.card.kind === "title")
        .map((c) => (c.card.kind === "title" ? c.card.text : ""))
        .slice(0, 5),
    [content]
  );
  const bodyOptions = useMemo(
    () =>
      content.cards
        .filter((c) => c.card.kind === "body" || c.card.kind === "fact")
        .map((c) =>
          c.card.kind === "body" || c.card.kind === "fact" ? c.card.text : ""
        )
        .slice(0, 5),
    [content]
  );

  function buildHeroSlide(templateId: string): SlideDraft {
    const meta = heroTemplates.find((t) => t.id === templateId)!;
    const { slotValues, imageMediaIds } = composeFor(meta, {
      title: title ?? "",
      subtext,
      imageId,
    });
    return { slideId: makeUuid(), templateId, slotValues, imageMediaIds };
  }

  /* ── Intro ── */
  if (phase === "intro") {
    return (
      <div className="min-h-[70vh] grid place-items-center px-5">
        <div className="text-center">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-[13px] font-semibold uppercase tracking-[0.2em] text-charcoal/40 mb-3"
          >
            Slide 1
          </motion.p>
          <motion.h1
            layoutId="heroLabel"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="font-heading font-semibold text-charcoal text-4xl md:text-5xl"
          >
            Hero
          </motion.h1>
        </div>
      </div>
    );
  }

  /* ── Working layout (pinned header + current step) ── */
  return (
    <div className="max-w-3xl mx-auto px-5 py-6">
      {/* Pinned, accumulating header */}
      <div className="mb-8">
        <div className="flex items-baseline gap-2.5 mb-1">
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-charcoal/35">
            Slide 1
          </span>
          <motion.span
            layoutId="heroLabel"
            className="text-[11px] font-semibold uppercase tracking-[0.16em] text-green-dark"
          >
            Hero
          </motion.span>
        </div>
        {title && (
          <motion.h2
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-heading font-semibold text-charcoal text-2xl leading-tight"
          >
            {title}
          </motion.h2>
        )}
        {subtext && (
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[14px] text-charcoal/65 mt-1.5 max-w-xl"
          >
            {subtext}
          </motion.p>
        )}
        {imageId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-3 inline-flex items-center gap-2 text-[12px] text-charcoal/45"
          >
            <ImageThumb imageId={imageId} images={images.images} />
            Photo selected
          </motion.div>
        )}
      </div>

      {/* Current sub-step */}
      <motion.div
        key={phase}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      >
        {phase === "title" && (
          <ChooseText
            heading="Choose your hero title"
            sub="The headline that opens the post. Pick one or write your own."
            options={titleOptions}
            allowSkip={false}
            value={title}
            onConfirm={(v) => {
              setTitle(v);
              setPhase("subtext");
            }}
          />
        )}
        {phase === "subtext" && (
          <ChooseText
            heading="Add a supporting line"
            sub="One short line under the headline — or skip it."
            options={bodyOptions}
            allowSkip
            value={subtext}
            onConfirm={(v) => {
              setSubtext(v);
              setPhase("image");
            }}
          />
        )}
        {phase === "image" && (
          <ChooseImage
            images={images.images}
            value={imageId}
            onConfirm={(id) => {
              setImageId(id);
              setPhase("template");
            }}
          />
        )}
        {phase === "template" && (
          <ChooseTemplate
            templates={heroTemplates}
            title={title ?? ""}
            subtext={subtext}
            imageId={imageId}
            onConfirm={(templateId) => onComplete(buildHeroSlide(templateId))}
          />
        )}
      </motion.div>
    </div>
  );
}

/* ─── Choose text (title / subtext) ──────────────────────────────── */

function ChooseText({
  heading,
  sub,
  options,
  allowSkip,
  value,
  onConfirm,
}: {
  heading: string;
  sub: string;
  options: string[];
  allowSkip: boolean;
  value: string | null;
  onConfirm: (v: string | null) => void;
}) {
  const [selected, setSelected] = useState<string | null>(value);
  const [own, setOwn] = useState("");
  const [writing, setWriting] = useState(false);

  const effective = writing ? own.trim() || null : selected;

  return (
    <div>
      <h1 className="font-heading font-semibold text-charcoal text-2xl md:text-[26px] leading-tight mb-1.5">
        {heading}
      </h1>
      <p className="text-[13.5px] text-charcoal/55 mb-5">{sub}</p>

      <div className="flex flex-col gap-2 mb-4">
        {options.map((opt, i) => {
          const isSel = !writing && selected === opt;
          return (
            <button
              key={i}
              type="button"
              onClick={() => {
                setSelected(opt);
                setWriting(false);
              }}
              className={`text-left rounded-xl px-4 py-3 text-[14px] leading-snug transition ${
                isSel
                  ? "bg-green/[0.08] ring-2 ring-green/50 text-charcoal"
                  : "bg-white ring-1 ring-charcoal/8 hover:ring-charcoal/25 text-charcoal/80"
              }`}
            >
              {opt}
            </button>
          );
        })}

        {/* Write your own */}
        <button
          type="button"
          onClick={() => setWriting(true)}
          className={`text-left rounded-xl px-4 py-3 transition ${
            writing
              ? "bg-white ring-2 ring-green/50"
              : "bg-white ring-1 ring-charcoal/8 hover:ring-charcoal/25"
          }`}
        >
          {writing ? (
            <input
              autoFocus
              value={own}
              onChange={(e) => setOwn(e.target.value)}
              placeholder="Write your own…"
              className="w-full bg-transparent text-[14px] text-charcoal placeholder:text-charcoal/35 focus:outline-none"
            />
          ) : (
            <span className="text-[14px] text-charcoal/55">+ Write my own</span>
          )}
        </button>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={!effective}
          onClick={() => onConfirm(effective)}
          className="inline-flex items-center gap-2 bg-charcoal text-white text-[14px] font-medium px-5 py-2.5 rounded-xl hover:bg-charcoal/85 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          Continue
          <Chevron />
        </button>
        {allowSkip && (
          <button
            type="button"
            onClick={() => onConfirm(null)}
            className="text-[13.5px] text-charcoal/45 hover:text-charcoal/70"
          >
            Skip
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Choose image ───────────────────────────────────────────────── */

function ChooseImage({
  images,
  value,
  onConfirm,
}: {
  images: ImageCandidate[];
  value: string | null;
  onConfirm: (id: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(value);
  return (
    <div>
      <h1 className="font-heading font-semibold text-charcoal text-2xl md:text-[26px] leading-tight mb-1.5">
        Choose your hero image
      </h1>
      <p className="text-[13.5px] text-charcoal/55 mb-5">
        {images.length} image{images.length === 1 ? "" : "s"} matched to this
        story. Pick the one that carries it.
      </p>

      {images.length === 0 ? (
        <p className="text-[13px] text-charcoal/45 mb-5">
          No imagery matched — you can add a photo later in the editor.
        </p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 mb-5">
          {images.map((img) => {
            const isSel = selected === img.id;
            return (
              <button
                key={img.id}
                type="button"
                onClick={() => setSelected(img.id)}
                className={`relative aspect-square rounded-xl overflow-hidden transition ${
                  isSel ? "ring-[3px] ring-green" : "ring-1 ring-charcoal/10 hover:ring-charcoal/30"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.thumbnailUrl ?? img.url}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                />
                {isSel && (
                  <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-green grid place-items-center">
                    <svg className="w-3 h-3 text-white" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M5 10.5l3.5 3.5L15 6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={!selected && images.length > 0}
          onClick={() => selected && onConfirm(selected)}
          className="inline-flex items-center gap-2 bg-charcoal text-white text-[14px] font-medium px-5 py-2.5 rounded-xl hover:bg-charcoal/85 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          Continue
          <Chevron />
        </button>
        {images.length > 0 && (
          <button
            type="button"
            onClick={() => onConfirm("")}
            className="text-[13.5px] text-charcoal/45 hover:text-charcoal/70"
          >
            No photo
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Choose template (live previews) ────────────────────────────── */

function ChooseTemplate({
  templates,
  title,
  subtext,
  imageId,
  onConfirm,
}: {
  templates: TemplateMeta[];
  title: string;
  subtext: string | null;
  imageId: string | null;
  onConfirm: (templateId: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <div>
      <h1 className="font-heading font-semibold text-charcoal text-2xl md:text-[26px] leading-tight mb-1.5">
        Choose your hero template
      </h1>
      <p className="text-[13.5px] text-charcoal/55 mb-5">
        Your title, line and photo are already dropped into each one — pick the
        look you want.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {templates.map((meta) => (
          <TemplatePreviewCard
            key={meta.id}
            meta={meta}
            title={title}
            subtext={subtext}
            imageId={imageId}
            selected={selected === meta.id}
            onSelect={() => setSelected(meta.id)}
          />
        ))}
      </div>

      <button
        type="button"
        disabled={!selected}
        onClick={() => selected && onConfirm(selected)}
        className="inline-flex items-center gap-2 bg-amber-dark text-white text-[14px] font-semibold px-5 py-2.5 rounded-xl hover:bg-amber-darker disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        Use this template
        <Chevron />
      </button>
    </div>
  );
}

function TemplatePreviewCard({
  meta,
  title,
  subtext,
  imageId,
  selected,
  onSelect,
}: {
  meta: TemplateMeta;
  title: string;
  subtext: string | null;
  imageId: string | null;
  selected: boolean;
  onSelect: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    (async () => {
      try {
        const { slotValues, imageMediaIds } = composeFor(meta, {
          title,
          subtext,
          imageId,
        });
        const res = await fetch("/api/admin/social-templates/render", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ templateId: meta.id, slotValues, imageMediaIds }),
        });
        if (!res.ok) throw new Error(String(res.status));
        const blob = await res.blob();
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [meta, title, subtext, imageId]);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group text-left rounded-2xl overflow-hidden transition ${
        selected
          ? "ring-[3px] ring-green"
          : "ring-1 ring-charcoal/10 hover:ring-charcoal/30"
      }`}
    >
      <div className="relative aspect-square bg-charcoal/[0.04]">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={meta.name} className="absolute inset-0 w-full h-full object-cover" />
        ) : failed ? (
          <div className="absolute inset-0 grid place-items-center text-[12px] text-charcoal/40">
            Preview unavailable
          </div>
        ) : (
          <div className="absolute inset-0 grid place-items-center">
            <svg className="w-6 h-6 animate-spin text-charcoal/30" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
              <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>
        )}
        {selected && (
          <span className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-green grid place-items-center shadow">
            <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 10.5l3.5 3.5L15 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        )}
      </div>
      <div className="px-3 py-2.5 bg-white">
        <p className="text-[13px] font-medium text-charcoal">{meta.name}</p>
        <p className="text-[11.5px] text-charcoal/50 leading-snug line-clamp-1 mt-0.5">
          {meta.description}
        </p>
      </div>
    </button>
  );
}

/* ─── Helpers ────────────────────────────────────────────────────── */

/** Map the SMM's hero choices into a template's slots by TYPE: her
 *  title → the first text:title slot, her subtext → the first text:body
 *  slot, her image → the first image slot. Choice slots get defaults so
 *  the preview renders cleanly. */
function composeFor(
  meta: TemplateMeta,
  choice: { title: string; subtext: string | null; imageId: string | null }
): { slotValues: SlotValues; imageMediaIds: Record<string, string> } {
  const slotValues: SlotValues = {};
  const imageMediaIds: Record<string, string> = {};
  let titleSet = false;
  let bodySet = false;
  let imgSet = false;
  for (const slot of meta.slots) {
    if (slot.type.startsWith("choice:") && typeof slot.defaultValue === "string") {
      slotValues[slot.id] = { type: "choice", value: slot.defaultValue };
    } else if (!titleSet && slot.type === "text:title") {
      slotValues[slot.id] = { type: "text", text: choice.title };
      titleSet = true;
    } else if (!bodySet && choice.subtext && slot.type === "text:body") {
      slotValues[slot.id] = { type: "text", text: choice.subtext };
      bodySet = true;
    } else if (!imgSet && choice.imageId && slot.type.startsWith("image:")) {
      imageMediaIds[slot.id] = choice.imageId;
      imgSet = true;
    }
  }
  return { slotValues, imageMediaIds };
}

function ImageThumb({
  imageId,
  images,
}: {
  imageId: string;
  images: ImageCandidate[];
}) {
  const img = images.find((i) => i.id === imageId);
  if (!img) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={img.thumbnailUrl ?? img.url}
      alt=""
      className="w-6 h-6 rounded object-cover ring-1 ring-charcoal/10"
    />
  );
}

function Chevron() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M8 5l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function makeUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `s_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
}
