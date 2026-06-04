"use client";

/**
 * SlideBuilder — the guided sub-flow for ONE slide (Phase 9 → 11).
 *
 *   intro → primary → [secondary] → [image] → compiling → template
 *
 * Parameterised by the slide's role (hero / fact / stat / testimony /
 * response / cta): the role decides the content options offered, whether
 * a photo is asked for, and which template category is shown. The deck
 * flow runs one SlideBuilder per slide. The chosen PRIMARY text pins to
 * a constant header through the slide's steps; after the image step a
 * "Compiling templates" screen renders her content into every template
 * for the role, then a focus carousel lets her pick.
 */

import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  ImageCandidate,
  TemplateMeta,
} from "@/lib/social-templates/types";
import { presetForTemplate, type BrandLogo, type SlideContent } from "@/lib/social-editor/presets";
import type { ContentBundle, ImageBundle } from "./types";
import { ROLES, pickImageId, type SlideRole } from "./slideRoles";

/** What the guided builder hands back per slide — raw choices the deck
 *  seeder turns into a layer preset. */
export type SlideResult = {
  role: SlideRole;
  index: number;
  templateId: string;
  title: string;
  subtext: string | null;
  imageId: string | null;
};

export type SlideSpec = { role: SlideRole; index: number; total: number };

type Phase = "intro" | "primary" | "secondary" | "image" | "compiling" | "template";

type Preview = { url: string | null; failed: boolean };

export default function SlideBuilder({
  spec,
  content,
  images,
  templates,
  eyebrow,
  logo,
  logoLight,
  onComplete,
}: {
  spec: SlideSpec;
  content: ContentBundle;
  images: ImageBundle;
  templates: TemplateMeta[];
  eyebrow: string;
  /** On-dark (white) logo — reversed fallback for dark backgrounds. */
  logo: BrandLogo | null;
  /** On-light (green) logo — the primary mark presets prefer. */
  logoLight: BrandLogo | null;
  onComplete: (result: SlideResult) => void;
}) {
  const role = ROLES[spec.role];

  const primaryOptions = useMemo(() => role.primary(content), [role, content]);
  const secondaryOptions = useMemo(() => role.secondary(content), [role, content]);
  const hasImages = images.images.length > 0;

  // Only the FIRST slide plays the full role intro; later slides open
  // straight on the primary question so a long deck isn't a string of
  // identical title cards. The pinned header still names the role.
  const [phase, setPhase] = useState<Phase>(spec.index === 0 ? "intro" : "primary");
  // Pre-select the top-ranked option so "Continue" is a single tap — she
  // can still tap another option or write her own before confirming.
  const [title, setTitle] = useState<string | null>(primaryOptions[0] ?? null);
  const [subtext, setSubtext] = useState<string | null>(secondaryOptions[0] ?? null);
  // Pre-pick a sensible default photo so the image step is a one-tap
  // confirm too (she can still flick to another or choose "No photo").
  const [imageId, setImageId] = useState<string | null>(() =>
    pickImageId(spec.role, images, new Set())
  );
  const [previews, setPreviews] = useState<Record<string, Preview>>({});
  const previewUrlsRef = useRef<string[]>([]);

  // Which phase follows, given the role's needs — auto-skipping any step
  // with no real choice (no secondary options, or no imagery matched).
  const wantsSecondary = role.hasSecondary && secondaryOptions.length > 0;
  const wantsImage = role.needsImage && hasImages;
  const afterPrimary: Phase = wantsSecondary
    ? "secondary"
    : wantsImage
      ? "image"
      : "compiling";
  const afterSecondary: Phase = wantsImage ? "image" : "compiling";

  // Scroll the page to the top whenever the step changes, so the pinned
  // header (and the new question) glide into view together.
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [phase]);

  // Auto-advance the intro (snappier dwell — it only plays on slide 1).
  useEffect(() => {
    if (phase !== "intro") return;
    const t = setTimeout(() => setPhase("primary"), 1300);
    return () => clearTimeout(t);
  }, [phase]);

  // Revoke any preview object URLs on unmount.
  useEffect(() => {
    return () => {
      for (const u of previewUrlsRef.current) URL.revokeObjectURL(u);
    };
  }, []);

  // Render the SMM's content into every template for the role while the
  // "Compiling templates" screen is up.
  async function compileTemplates(): Promise<void> {
    const imageUrl = imageId
      ? images.images.find((i) => i.id === imageId)?.url ?? null
      : null;
    const sc: SlideContent = {
      primary: title ?? "",
      secondary: subtext,
      imageUrl,
      eyebrow,
      logo,
      logoLight,
    };
    const entries = await Promise.all(
      templates.map(async (meta): Promise<[string, Preview]> => {
        try {
          // Preview through the SAME layer pipeline the canvas seeds from,
          // so the card she picks is exactly what opens in the editor.
          const slide = presetForTemplate(meta.id, sc);
          const res = await fetch("/api/admin/social-editor/render", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ slide }),
          });
          if (!res.ok) throw new Error(String(res.status));
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          previewUrlsRef.current.push(url);
          return [meta.id, { url, failed: false }];
        } catch {
          return [meta.id, { url: null, failed: true }];
        }
      })
    );
    setPreviews(Object.fromEntries(entries));
  }

  /* ── Intro ── */
  if (phase === "intro") {
    return (
      <div className="min-h-[78vh] grid place-items-center px-5">
        <div className="text-center">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-[13px] font-semibold uppercase tracking-[0.2em] text-charcoal/40 mb-3"
          >
            Slide {spec.index + 1} of {spec.total}
          </motion.p>
          <motion.h1
            layoutId="slideLabel"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="font-heading font-semibold text-charcoal text-4xl md:text-5xl"
          >
            {role.label}
          </motion.h1>
        </div>
      </div>
    );
  }

  /* ── Working layout (pinned title header + current step) ── */
  return (
    <div className="max-w-5xl mx-auto px-5 py-8">
      {/* Overall deck progress — slide x of n across the whole deck. */}
      <div className="mb-6 max-w-3xl flex items-center gap-3">
        <div className="flex-1 flex items-center gap-1.5">
          {Array.from({ length: spec.total }).map((_, i) => (
            <span
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i < spec.index
                  ? "bg-green/70"
                  : i === spec.index
                    ? "bg-green"
                    : "bg-charcoal/10"
              }`}
            />
          ))}
        </div>
        <span className="text-[11px] font-medium text-charcoal/40 tabular-nums shrink-0">
          {spec.index + 1} / {spec.total}
        </span>
      </div>

      {/* Pinned header — Slide N · Role + the chosen primary text only. */}
      <div className="mb-9 max-w-3xl">
        <div className="flex items-baseline gap-2.5 mb-1">
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-charcoal/35">
            Slide {spec.index + 1}
          </span>
          <motion.span
            layoutId="slideLabel"
            className="text-[11px] font-semibold uppercase tracking-[0.16em] text-green-dark"
          >
            {role.label}
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
      </div>

      {/* Current sub-step — smoother fade/slide on every change. */}
      <motion.div
        key={phase}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      >
        {phase === "primary" && (
          <ChooseText
            heading={role.primaryHeading}
            sub={role.primarySub}
            options={primaryOptions}
            allowSkip={false}
            value={title}
            onConfirm={(v) => {
              setTitle(v);
              setPhase(afterPrimary);
            }}
          />
        )}
        {phase === "secondary" && (
          <ChooseText
            heading={role.secondaryHeading}
            sub={role.secondarySub}
            options={secondaryOptions}
            allowSkip
            value={subtext}
            onConfirm={(v) => {
              setSubtext(v);
              setPhase(afterSecondary);
            }}
          />
        )}
        {phase === "image" && (
          <ChooseImage
            images={images.images}
            value={imageId}
            onConfirm={(id) => {
              setImageId(id);
              setPhase("compiling");
            }}
          />
        )}
        {phase === "compiling" && (
          <CompilingStep
            run={compileTemplates}
            onDone={() => setPhase("template")}
          />
        )}
        {phase === "template" && (
          <TemplateCarousel
            templates={templates}
            previews={previews}
            onConfirm={(templateId) =>
              onComplete({
                role: spec.role,
                index: spec.index,
                templateId,
                title: title ?? "",
                subtext,
                imageId,
              })
            }
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
    <div className="max-w-3xl">
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

/* ─── Choose image (category carousels, broken thumbs self-hide) ─── */

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
  const [broken, setBroken] = useState<Set<string>>(new Set());
  const markBroken = (id: string) =>
    setBroken((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });

  const visible = images.filter((i) => !broken.has(i.id));
  const dr = visible.filter((i) => i.source === "dr_library");
  const ext = visible.filter((i) => i.source === "external");

  const renderCard = (img: ImageCandidate, isFocused: boolean) => {
    const isSel = selected === img.id;
    return (
      <button
        type="button"
        onClick={() => setSelected(img.id)}
        className="block w-full"
      >
        <div
          className={`relative aspect-square rounded-2xl overflow-hidden bg-charcoal/[0.04] transition-shadow ${
            isSel
              ? "ring-[3px] ring-green shadow-xl"
              : isFocused
                ? "shadow-2xl"
                : "ring-1 ring-charcoal/10"
          }`}
        >
          <Thumb src={img.thumbnailUrl ?? img.url} onError={() => markBroken(img.id)} />
          {isSel && (
            <span className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-green grid place-items-center shadow">
              <Check className="w-3.5 h-3.5 text-white" />
            </span>
          )}
        </div>
      </button>
    );
  };

  return (
    <div className="max-w-5xl">
      <h1 className="font-heading font-semibold text-charcoal text-2xl md:text-[26px] leading-tight mb-1.5">
        Choose an image
      </h1>
      <p className="text-[13.5px] text-charcoal/55">
        {visible.length} image{visible.length === 1 ? "" : "s"} matched to this
        story. Flick through and tap the one that carries it.
      </p>

      {visible.length === 0 ? (
        <p className="text-[13px] text-charcoal/45 mt-6">
          No imagery matched — you can add a photo later in the editor.
        </p>
      ) : (
        <div className="mt-12 space-y-12">
          {dr.length > 0 && (
            <section>
              <CategoryLabel>Deen Relief library</CategoryLabel>
              <FocusCarousel
                items={dr}
                slot={280}
                focusScale={1.16}
                dimScale={0.8}
                getKey={(i) => i.id}
                renderItem={renderCard}
              />
            </section>
          )}
          {ext.length > 0 && (
            <section>
              <CategoryLabel>From the web</CategoryLabel>
              <FocusCarousel
                items={ext}
                slot={280}
                focusScale={1.16}
                dimScale={0.8}
                getKey={(i) => i.id}
                renderItem={renderCard}
              />
            </section>
          )}
        </div>
      )}

      <div className="flex items-center gap-3 mt-12">
        <button
          type="button"
          disabled={!selected && visible.length > 0}
          onClick={() => onConfirm(selected ?? "")}
          className="inline-flex items-center gap-2 bg-charcoal text-white text-[14px] font-medium px-5 py-2.5 rounded-xl hover:bg-charcoal/85 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          Continue
          <Chevron />
        </button>
        {visible.length > 0 && (
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

function CategoryLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-charcoal/40 mb-4">
      {children}
    </p>
  );
}

/** Thumbnail that fades in on load — smooths the image-step entrance. */
function Thumb({ src, onError }: { src: string; onError: () => void }) {
  const [loaded, setLoaded] = useState(false);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      onLoad={() => setLoaded(true)}
      onError={onError}
      className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
        loaded ? "opacity-100" : "opacity-0"
      }`}
    />
  );
}

/* ─── Compiling templates (loading) ──────────────────────────────── */

function CompilingStep({
  run,
  onDone,
}: {
  run: () => Promise<void>;
  onDone: () => void;
}) {
  const [ready, setReady] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const startedAt = Date.now();
    run().finally(() => {
      // Keep the screen up for a calm minimum even on a fast render.
      const elapsed = Date.now() - startedAt;
      const wait = Math.max(0, 1100 - elapsed);
      setTimeout(() => setReady(true), wait);
    });
  }, [run]);

  useEffect(() => {
    if (ready) {
      const t = setTimeout(onDone, 350);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [ready, onDone]);

  return (
    <div className="min-h-[40vh] grid place-items-center">
      <div className="text-center w-full max-w-sm">
        <p className="text-[15px] font-medium text-charcoal/80 mb-5">
          Building your options…
        </p>
        <div className="h-1.5 rounded-full bg-charcoal/8 overflow-hidden">
          <motion.div
            className="h-full bg-green/70 rounded-full"
            initial={{ width: "10%" }}
            animate={{ width: ready ? "100%" : "82%" }}
            transition={{ ease: "easeOut", duration: ready ? 0.35 : 1.1 }}
          />
        </div>
        <p className="text-[12px] text-charcoal/40 mt-3">
          Putting your words and photo into each design.
        </p>
      </div>
    </div>
  );
}

/* ─── Generic focus carousel ─────────────────────────────────────── */

const GAP = 28;

/**
 * A non-auto-rotating carousel where the centred item is enlarged and
 * neighbours shrink + dim. Arrows, dots and horizontal swipe move
 * focus. Used for both the template chooser and the per-category image
 * strips. Focus state is internal; pass onFocusChange (a stable setter)
 * if the parent needs the index (e.g. for a "Use this" button).
 */
function FocusCarousel<T>({
  items,
  slot,
  focusScale,
  dimScale = 0.82,
  getKey,
  renderItem,
  onFocusChange,
}: {
  items: T[];
  slot: number;
  focusScale: number;
  dimScale?: number;
  getKey: (item: T, i: number) => string;
  renderItem: (item: T, isFocused: boolean, i: number) => React.ReactNode;
  onFocusChange?: (i: number) => void;
}) {
  const [focused, setFocused] = useState(0);
  const wheelLock = useRef(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [vw, setVw] = useState(0);

  useEffect(() => {
    const measure = () => setVw(viewportRef.current?.clientWidth ?? 0);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Clamp if the list shrinks (a broken thumb self-hides mid-carousel).
  const safe = Math.min(focused, Math.max(0, items.length - 1));
  useEffect(() => {
    onFocusChange?.(safe);
  }, [safe, onFocusChange]);

  const step = slot + GAP;
  const x = vw / 2 - (safe * step + slot / 2);

  function move(delta: number) {
    setFocused((i) => Math.min(items.length - 1, Math.max(0, i + delta)));
  }
  function onWheel(e: React.WheelEvent) {
    // Only horizontal-dominant swipes drive it — vertical wheel keeps
    // scrolling the page so she's never trapped.
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    if (Math.abs(e.deltaX) < 14 || wheelLock.current) return;
    wheelLock.current = true;
    move(e.deltaX > 0 ? 1 : -1);
    setTimeout(() => (wheelLock.current = false), 320);
  }

  if (items.length === 0) return null;

  return (
    <div>
      <div
        ref={viewportRef}
        onWheel={onWheel}
        className="relative overflow-hidden flex items-center"
        style={{ minHeight: slot * focusScale + 120 }}
      >
        <motion.div
          className="flex items-center"
          style={{ gap: GAP }}
          animate={{ x }}
          transition={{ type: "spring", stiffness: 170, damping: 30 }}
        >
          {items.map((item, i) => {
            const isFocused = i === safe;
            return (
              <motion.div
                key={getKey(item, i)}
                onClick={() => setFocused(i)}
                animate={{
                  scale: isFocused ? focusScale : dimScale,
                  opacity: isFocused ? 1 : 0.4,
                }}
                transition={{ type: "spring", stiffness: 180, damping: 28 }}
                style={{ width: slot }}
                className="shrink-0 origin-center cursor-pointer"
              >
                {renderItem(item, isFocused, i)}
              </motion.div>
            );
          })}
        </motion.div>

        {safe > 0 && <Arrow side="left" onClick={() => move(-1)} />}
        {safe < items.length - 1 && <Arrow side="right" onClick={() => move(1)} />}
      </div>

      {items.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-5">
          {items.map((item, i) => (
            <button
              key={getKey(item, i)}
              type="button"
              onClick={() => setFocused(i)}
              aria-label={`Go to item ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                i === safe ? "w-5 bg-green" : "w-1.5 bg-charcoal/20 hover:bg-charcoal/35"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Template focus carousel ────────────────────────────────────── */

function TemplateCarousel({
  templates,
  previews,
  onConfirm,
}: {
  templates: TemplateMeta[];
  previews: Record<string, Preview>;
  onConfirm: (templateId: string) => void;
}) {
  const [focused, setFocused] = useState(0);
  // X templates are landscape (1200×675) — give them a wider slot + a 16:9
  // preview box so they're not cropped into a square. (All templates in one
  // carousel share an aspect: X = wide, IG/FB = square.)
  const isWide = templates.some((t) => t.aspect === "wide");

  return (
    <div>
      <h1 className="font-heading font-semibold text-charcoal text-2xl md:text-[26px] leading-tight mb-1.5">
        Choose a template
      </h1>
      <p className="text-[13.5px] text-charcoal/55">
        Your content is already in each one. Scroll through and pick the look
        you want.
      </p>

      <div className="mt-12">
        <FocusCarousel
          items={templates}
          slot={isWide ? 580 : 400}
          focusScale={1.2}
          dimScale={0.8}
          getKey={(t) => t.id}
          onFocusChange={setFocused}
          renderItem={(meta, isFocused) => {
            const pv = previews[meta.id];
            return (
              <>
                <div
                  className={`rounded-2xl overflow-hidden bg-charcoal/[0.04] transition-shadow ${
                    isFocused ? "shadow-2xl" : "ring-1 ring-charcoal/10"
                  }`}
                >
                  <div className={`relative ${isWide ? "aspect-[16/9]" : "aspect-square"}`}>
                    {pv?.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={pv.url}
                        alt={meta.name}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : pv?.failed ? (
                      <div className="absolute inset-0 grid place-items-center text-[12px] text-charcoal/40">
                        Preview unavailable
                      </div>
                    ) : (
                      <div className="absolute inset-0 grid place-items-center">
                        <Spinner />
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-center text-[13px] font-medium text-charcoal mt-3">
                  {meta.name}
                </p>
              </>
            );
          }}
        />
      </div>

      <div className="flex justify-center mt-10">
        <button
          type="button"
          onClick={() => templates[focused] && onConfirm(templates[focused]!.id)}
          disabled={!templates[focused]}
          className="inline-flex items-center gap-2 bg-amber-dark text-white text-[14px] font-semibold px-6 py-2.5 rounded-xl hover:bg-amber-darker disabled:opacity-30 transition-colors"
        >
          Use this template
          <Chevron />
        </button>
      </div>
    </div>
  );
}

function Arrow({
  side,
  onClick,
}: {
  side: "left" | "right";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === "left" ? "Previous" : "Next"}
      className={`absolute top-1/2 -translate-y-1/2 ${
        side === "left" ? "left-2" : "right-2"
      } z-10 w-10 h-10 rounded-full bg-white ring-1 ring-charcoal/10 shadow grid place-items-center text-charcoal/60 hover:text-charcoal hover:shadow-md transition`}
    >
      <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
        {side === "left" ? (
          <path d="M12 5l-5 5 5 5" strokeLinecap="round" strokeLinejoin="round" />
        ) : (
          <path d="M8 5l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
        )}
      </svg>
    </button>
  );
}

/* ─── Helpers ────────────────────────────────────────────────────── */

function Chevron() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M8 5l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Check({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M5 10.5l3.5 3.5L15 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg className="w-6 h-6 animate-spin text-charcoal/30" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

