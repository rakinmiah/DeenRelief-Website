"use client";

/**
 * Step views for the DeckFlow wizard (Phase 8). Each is a calm,
 * centered, single-decision screen in the Typeform mould.
 */

import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type {
  ImageCandidate,
  SocialPlatform,
  TemplateMeta,
} from "@/lib/social-templates/types";
import { presetForTemplate, type BrandLogo, type SlideContent } from "@/lib/social-editor/presets";
import type { EventSummary } from "./DeckFlow";
import { ROLES, MIDDLE_ROLES, type SlideRole } from "./slideRoles";
import type { SlideResult } from "./SlideBuilder";
import type { ContentBundle, ImageBundle } from "./types";

/* ─── Quick-draft loading hand-off ───────────────────────────────── */

/**
 * Full-bleed "Drafting your post…" screen shown after Quick draft, while the
 * editor mounts behind it — so the SMM goes straight from the choice into the
 * canvas without the in-between review/outline screen. Calls onDone once after
 * a short minimum dwell (ref-held so a changing onDone identity can't reset it).
 */
export function DraftingStep({ onDone }: { onDone: () => void }) {
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  useEffect(() => {
    const t = setTimeout(() => doneRef.current(), 1300);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-[#F4F4F2] grid place-items-center px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="text-center w-full max-w-sm"
      >
        <span className="inline-block w-9 h-9 mb-6 rounded-full border-[3px] border-charcoal/15 border-t-green animate-spin" />
        <h1 className="font-heading font-semibold text-charcoal text-2xl md:text-[26px] leading-tight">
          Drafting your post…
        </h1>
        <p className="text-[13.5px] text-charcoal/50 mt-2">
          Picking the best layout, words and photo.
        </p>
        <div className="mt-7 h-1.5 w-full rounded-full bg-charcoal/10 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-green"
            initial={{ width: "8%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 1.25, ease: "easeInOut" }}
          />
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Step 1 · Preparing ─────────────────────────────────────────── */

const STAGES = [
  "Reading the situation report",
  "Pulling the key facts",
  "Drafting headline options",
  "Writing captions & hashtags",
  "Finding imagery",
];

export function PreparingStep({
  eventTitle,
  ready,
  onDone,
}: {
  eventTitle: string;
  ready: boolean;
  onDone: () => void;
}) {
  const [i, setI] = useState(0);
  const onLast = i >= STAGES.length - 1;
  const done = onLast && ready;

  useEffect(() => {
    if (!onLast) {
      const t = setTimeout(() => setI((v) => v + 1), 620);
      return () => clearTimeout(t);
    }
    if (ready) {
      const t = setTimeout(onDone, 650);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [i, onLast, ready, onDone]);

  const progress = done ? 1 : (i + (ready ? 1 : 0.4)) / STAGES.length;

  return (
    <div className="text-center">
      <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-charcoal/35 mb-3">
        Preparing your post
      </p>
      <h1 className="font-heading font-semibold text-charcoal text-xl md:text-2xl leading-snug max-w-xl mx-auto mb-8">
        {eventTitle}
      </h1>

      <div className="max-w-sm mx-auto text-left flex flex-col gap-2.5 mb-8">
        {STAGES.map((s, idx) => {
          const complete = idx < i || done;
          const current = idx === i && !done;
          return (
            <div
              key={s}
              className={`flex items-center gap-2.5 text-[13.5px] transition-opacity ${
                idx <= i ? "opacity-100" : "opacity-30"
              }`}
            >
              <span className="w-4 h-4 grid place-items-center shrink-0">
                {complete ? (
                  <svg className="w-4 h-4 text-green" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M5 10.5l3.5 3.5L15 6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : current ? (
                  <svg className="w-3.5 h-3.5 animate-spin text-charcoal/40" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                    <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-charcoal/25" />
                )}
              </span>
              <span className={complete ? "text-charcoal/70" : "text-charcoal"}>
                {s}
                {current ? "…" : ""}
              </span>
            </div>
          );
        })}
      </div>

      <div className="max-w-sm mx-auto h-1 rounded-full bg-charcoal/8 overflow-hidden">
        <motion.div
          className="h-full bg-green/70 rounded-full"
          initial={{ width: "8%" }}
          animate={{ width: `${Math.max(8, progress * 100)}%` }}
          transition={{ ease: "easeOut", duration: 0.5 }}
        />
      </div>
    </div>
  );
}

/* ─── Step 2 · Summary ───────────────────────────────────────────── */

export function SummaryStep({
  event,
  facts,
  onContinue,
}: {
  event: EventSummary;
  facts: string[];
  onContinue: () => void;
}) {
  const metaBits = [
    event.region || event.countryIso,
    event.eventType?.replace(/_/g, " "),
  ].filter(Boolean);

  return (
    <div>
      <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-charcoal/35 mb-2">
        Here&apos;s what we found
      </p>
      <h1 className="font-heading font-semibold text-charcoal text-2xl md:text-[28px] leading-tight mb-3">
        {event.title}
      </h1>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-charcoal/50 mb-5">
        <span className="font-medium text-charcoal/65">{event.source}</span>
        {metaBits.map((m) => (
          <span key={m as string} className="flex items-center gap-2">
            <span className="text-charcoal/25">·</span>
            <span className="capitalize">{m}</span>
          </span>
        ))}
        {event.detectedAtLabel && (
          <span className="flex items-center gap-2">
            <span className="text-charcoal/25">·</span>
            <span>{event.detectedAtLabel}</span>
          </span>
        )}
      </div>

      {event.summary && (
        <p className="text-[15px] text-charcoal/80 leading-relaxed mb-6 max-w-xl">
          {event.summary.length > 360
            ? event.summary.slice(0, 359).trimEnd() + "…"
            : event.summary}
        </p>
      )}

      {facts.length > 0 && (
        <div className="flex flex-col gap-2 mb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-charcoal/35">
            Key facts
          </p>
          {facts.slice(0, 4).map((f, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2.5 rounded-lg bg-white ring-1 ring-charcoal/6 px-3.5 py-2.5"
            >
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber shrink-0" />
              <span className="text-[13.5px] text-charcoal/80 leading-snug">{f}</span>
            </div>
          ))}
        </div>
      )}

      {event.matchedCampaigns.length > 0 && (
        <p className="text-[12.5px] text-charcoal/55 mb-7">
          Relevant to{" "}
          <span className="font-medium text-green-dark">
            {event.matchedCampaigns[0]}
          </span>
          .
        </p>
      )}

      <button
        type="button"
        onClick={onContinue}
        className="inline-flex items-center gap-2 bg-charcoal text-white text-[14px] font-medium px-5 py-2.5 rounded-xl hover:bg-charcoal/85 transition-colors"
      >
        Continue
        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M8 5l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}

/* ─── Step 3 · Platform ──────────────────────────────────────────── */

const PLATFORMS: Array<{
  id: SocialPlatform;
  name: string;
  note: string;
  icon: ReactNode;
}> = [
  {
    id: "instagram",
    name: "Instagram",
    note: "Carousel — up to 10 slides",
    icon: <InstagramGlyph />,
  },
  {
    id: "facebook",
    name: "Facebook",
    note: "Carousel — same slides as Instagram",
    icon: <FacebookGlyph />,
  },
  {
    id: "x",
    name: "X",
    note: "Single image + caption",
    icon: <XGlyph />,
  },
];

export function PlatformStep({
  onPick,
}: {
  onPick: (p: SocialPlatform) => void;
}) {
  return (
    <div>
      <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-charcoal/35 mb-2">
        Step 1 of 4
      </p>
      <h1 className="font-heading font-semibold text-charcoal text-2xl md:text-[26px] leading-tight mb-6">
        Where are you posting this?
      </h1>
      <div className="flex flex-col gap-2.5">
        {PLATFORMS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onPick(p.id)}
            className="group flex items-center gap-4 rounded-xl bg-white ring-1 ring-charcoal/8 hover:ring-green/40 hover:shadow-sm px-4 py-3.5 text-left transition"
          >
            <span className="w-10 h-10 rounded-lg bg-charcoal/[0.05] grid place-items-center text-charcoal/70 group-hover:bg-green/[0.08] group-hover:text-green-dark transition-colors">
              {p.icon}
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-[15px] font-medium text-charcoal">
                {p.name}
              </span>
              <span className="block text-[12.5px] text-charcoal/50">
                {p.note}
              </span>
            </span>
            <svg className="w-5 h-5 text-charcoal/25 group-hover:text-green/70 transition-colors" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M8 5l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Step 3b · Slide count ──────────────────────────────────────── */

export function SlideCountStep({
  suggested,
  value,
  onChange,
  onConfirm,
}: {
  suggested: number;
  value: number;
  onChange: (n: number) => void;
  onConfirm: () => void;
}) {
  const options = [3, 4, 5, 6, 7, 8, 9, 10];
  return (
    <div>
      <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-charcoal/35 mb-2">
        Step 2 of 4
      </p>
      <h1 className="font-heading font-semibold text-charcoal text-2xl md:text-[26px] leading-tight mb-2">
        How many slides?
      </h1>
      <p className="text-[13.5px] text-charcoal/55 mb-6 max-w-md">
        We suggest{" "}
        <span className="font-medium text-charcoal/80">{suggested}</span> — a
        hero, a few facts, and the ask. You can change this any time.
      </p>

      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 mb-7">
        {options.map((n) => {
          const selected = n === value;
          const isSuggested = n === suggested;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className={`relative aspect-square rounded-xl text-[16px] font-semibold transition ${
                selected
                  ? "bg-green text-white ring-2 ring-green"
                  : "bg-white text-charcoal/70 ring-1 ring-charcoal/8 hover:ring-charcoal/25"
              }`}
            >
              {n}
              {isSuggested && !selected && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber" />
              )}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onConfirm}
        className="inline-flex items-center gap-2 bg-charcoal text-white text-[14px] font-medium px-5 py-2.5 rounded-xl hover:bg-charcoal/85 transition-colors"
      >
        Continue
        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M8 5l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}

/* ─── Step 3 · Plan the deck ─────────────────────────────────────── */

export function PlanStep({
  plan,
  onChange,
  onConfirm,
}: {
  plan: SlideRole[];
  onChange: (p: SlideRole[]) => void;
  onConfirm: () => void;
}) {
  const n = plan.length;
  return (
    <div>
      <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-charcoal/35 mb-2">
        Step 3 of 4
      </p>
      <h1 className="font-heading font-semibold text-charcoal text-2xl md:text-[26px] leading-tight mb-2">
        Plan your slides
      </h1>
      <p className="text-[13.5px] text-charcoal/55 mb-6 max-w-lg">
        Slide 1 is your hero and the last is the call to action. Pick what each
        middle slide covers — here&rsquo;s a starting plan.
      </p>

      <div className="flex flex-col gap-2 mb-7">
        {plan.map((role, i) => {
          const locked = i === 0 || i === n - 1;
          return (
            <div
              key={i}
              className="flex items-center gap-3 rounded-xl bg-white ring-1 ring-charcoal/8 px-3 py-2.5"
            >
              <span className="shrink-0 w-7 h-7 rounded-lg bg-charcoal/5 grid place-items-center text-[12px] font-semibold text-charcoal/50">
                {i + 1}
              </span>
              {locked ? (
                <span className="flex items-center gap-1.5 text-[14px] font-medium text-charcoal">
                  {ROLES[role].label}
                  <svg className="w-3.5 h-3.5 text-charcoal/30" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <rect x="5" y="9" width="10" height="7" rx="1.5" />
                    <path d="M7 9V6.5a3 3 0 0 1 6 0V9" strokeLinecap="round" />
                  </svg>
                </span>
              ) : (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {MIDDLE_ROLES.map((r) => {
                    const on = role === r;
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => {
                          const next = [...plan];
                          next[i] = r;
                          onChange(next);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition ${
                          on
                            ? "bg-green text-white"
                            : "bg-charcoal/[0.04] text-charcoal/60 hover:bg-charcoal/[0.08]"
                        }`}
                      >
                        {ROLES[r].short}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onConfirm}
        className="inline-flex items-center gap-2 bg-charcoal text-white text-[14px] font-medium px-5 py-2.5 rounded-xl hover:bg-charcoal/85 transition-colors"
      >
        Continue
        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M8 5l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}

/* ─── Step 4 · Mode (quick draft vs build each slide) ────────────── */

export function ModeStep({
  slideCount,
  singleImage = false,
  onQuick,
  onGuided,
}: {
  slideCount: number;
  /** X is a single landscape image (no slide count) — adapts the copy. */
  singleImage?: boolean;
  onQuick: () => void;
  onGuided: () => void;
}) {
  return (
    <div>
      <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-charcoal/35 mb-2">
        {singleImage ? "Last step" : "Step 4 of 4"}
      </p>
      <h1 className="font-heading font-semibold text-charcoal text-2xl md:text-[26px] leading-tight mb-2">
        How do you want to build it?
      </h1>
      <p className="text-[13.5px] text-charcoal/55 mb-6 max-w-lg">
        {singleImage
          ? "Both land in the editor, where you can change anything. Quick draft picks the layout, headline and photo for you — you just fine-tune."
          : `Both land in the editor, where you can change anything. Quick draft fills all ${slideCount} slides for you so you only fine-tune.`}
      </p>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={onQuick}
          className="group relative text-left rounded-2xl bg-white ring-1 ring-charcoal/8 hover:ring-green/45 hover:shadow-sm px-5 py-4 transition"
        >
          <span className="absolute top-4 right-4 inline-flex items-center gap-1 rounded-full bg-green/10 text-green-dark text-[10.5px] font-semibold uppercase tracking-[0.1em] px-2 py-0.5">
            Recommended
          </span>
          <span className="flex items-center gap-3.5">
            <span className="w-11 h-11 rounded-xl bg-green/[0.08] text-green-dark grid place-items-center shrink-0">
              <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M11 2 3 11h5l-1 7 8-9h-5l1-7Z" strokeLinejoin="round" strokeLinecap="round" />
              </svg>
            </span>
            <span className="min-w-0">
              <span className="block text-[15.5px] font-semibold text-charcoal">
                Quick draft
              </span>
              <span className="block text-[13px] text-charcoal/55 leading-snug mt-0.5">
                {singleImage
                  ? "We pick the best layout, headline and photo for your post. Review it, then refine in the editor."
                  : "We pick the best line, photo and layout for every slide. Review them all on one screen, then refine in the editor."}
              </span>
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={onGuided}
          className="group text-left rounded-2xl bg-white ring-1 ring-charcoal/8 hover:ring-charcoal/25 hover:shadow-sm px-5 py-4 transition"
        >
          <span className="flex items-center gap-3.5">
            <span className="w-11 h-11 rounded-xl bg-charcoal/[0.05] text-charcoal/70 grid place-items-center shrink-0">
              <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7">
                <rect x="3" y="3" width="14" height="14" rx="3" />
                <path d="M7 8h6M7 11h4" strokeLinecap="round" />
              </svg>
            </span>
            <span className="min-w-0">
              <span className="block text-[15.5px] font-semibold text-charcoal">
                {singleImage ? "Build it step by step" : "Build each slide"}
              </span>
              <span className="block text-[13px] text-charcoal/55 leading-snug mt-0.5">
                {singleImage
                  ? "Choose the headline, photo and template yourself, one step at a time. The most control."
                  : "Go slide by slide, choosing the line, photo and template yourself. The most control."}
              </span>
            </span>
          </span>
        </button>
      </div>
    </div>
  );
}

/* ─── Platform glyphs ────────────────────────────────────────────── */

function InstagramGlyph() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
function FacebookGlyph() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M14 9h2.5l.5-3H14V4.5c0-.9.3-1.5 1.6-1.5H17V.3C16.7.2 15.7 0 14.5 0 12 0 10.3 1.5 10.3 4.2V6H8v3h2.3v9H14V9z" />
    </svg>
  );
}
function XGlyph() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M13.7 10.6 20.4 3h-1.6l-5.8 6.6L8.3 3H3l7 10.1L3 21h1.6l6.1-7 4.9 7H21l-7.3-10.4zm-2.2 2.5-.7-1L5.2 4.2h2.4l4.5 6.5.7 1 5.9 8.4h-2.4l-4.8-6.9z" />
    </svg>
  );
}

/* ─── Step 5 · Batch review / outline ────────────────────────────── *
 *
 * The condensed, all-at-once overview every slide flows into — quick
 * draft auto-fills it, the guided builder hands its per-slide results
 * to it. Each row shows a LIVE layer-rendered thumbnail (same pipeline
 * the canvas seeds from) plus inline pickers for the line, photo and
 * layout, so she confirms or tweaks the whole deck on one screen rather
 * than re-entering deep per-slide funnels. "Open in editor" hands the
 * results straight to the canvas.
 */

export function ReviewStep({
  results,
  content,
  images,
  eyebrow,
  logo,
  logoLight,
  templatesForRole,
  onChange,
  onBack,
  onConfirm,
}: {
  results: SlideResult[];
  content: ContentBundle;
  images: ImageBundle;
  eyebrow: string;
  /** On-dark (white) logo — reversed fallback for dark backgrounds. */
  logo: BrandLogo | null;
  /** On-light (green) logo — the primary mark presets prefer. */
  logoLight: BrandLogo | null;
  templatesForRole: (role: SlideRole) => TemplateMeta[];
  onChange: (next: SlideResult[]) => void;
  onBack: () => void;
  onConfirm: () => void;
}) {
  const [expanded, setExpanded] = useState<number | null>(null);

  function patch(index: number, fields: Partial<SlideResult>) {
    onChange(results.map((r, i) => (i === index ? { ...r, ...fields } : r)));
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#F4F4F2] flex flex-col">
      {/* Header */}
      <div className="shrink-0 border-b border-charcoal/8 bg-[#F4F4F2]/90 backdrop-blur px-5 py-3.5">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="text-charcoal/45 hover:text-charcoal text-[13px] flex items-center gap-1 shrink-0"
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 5l-5 5 5 5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal/35">
              Review your draft
            </p>
            <p className="text-[14px] font-medium text-charcoal leading-tight">
              {results.length} slide{results.length === 1 ? "" : "s"} ready · tap
              any to tweak
            </p>
          </div>
          <button
            type="button"
            onClick={onConfirm}
            className="shrink-0 inline-flex items-center gap-2 bg-amber-dark text-white text-[13.5px] font-semibold px-4 py-2 rounded-xl hover:bg-amber-darker transition-colors"
          >
            Open in editor
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M8 5l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* Slide list */}
      <div className="flex-1 overflow-y-auto px-5 py-6">
        <div className="max-w-3xl mx-auto flex flex-col gap-3">
          {results.map((r, i) => (
            <SlideReviewCard
              key={i}
              result={r}
              content={content}
              images={images}
              eyebrow={eyebrow}
              logo={logo}
              logoLight={logoLight}
              templates={templatesForRole(r.role)}
              open={expanded === i}
              onToggle={() => setExpanded((e) => (e === i ? null : i))}
              onPatch={(fields) => patch(i, fields)}
            />
          ))}
        </div>
        <div className="h-6" />
      </div>
    </div>
  );
}

/** A single reviewable slide — live thumbnail + expandable inline pickers. */
function SlideReviewCard({
  result,
  content,
  images,
  eyebrow,
  logo,
  logoLight,
  templates,
  open,
  onToggle,
  onPatch,
}: {
  result: SlideResult;
  content: ContentBundle;
  images: ImageBundle;
  eyebrow: string;
  logo: BrandLogo | null;
  logoLight: BrandLogo | null;
  templates: TemplateMeta[];
  open: boolean;
  onToggle: () => void;
  onPatch: (fields: Partial<SlideResult>) => void;
}) {
  const role = ROLES[result.role];
  const primaryOptions = useMemo(() => role.primary(content), [role, content]);
  const secondaryOptions = useMemo(() => role.secondary(content), [role, content]);
  const imageUrl = result.imageId
    ? images.images.find((im) => im.id === result.imageId)?.url ?? null
    : null;

  const sc: SlideContent = {
    primary: result.title,
    secondary: result.subtext,
    imageUrl,
    eyebrow,
    logo,
    logoLight,
  };
  const thumb = useLayerPreview(result.templateId, sc);

  return (
    <div className="rounded-2xl bg-white ring-1 ring-charcoal/8 overflow-hidden">
      {/* Collapsed summary row */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3.5 p-3 text-left hover:bg-charcoal/[0.015] transition-colors"
      >
        <span className="relative w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-charcoal/[0.05] grid place-items-center">
          {thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumb} alt="" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <Spinner />
          )}
        </span>
        <span className="flex-1 min-w-0">
          <span className="flex items-center gap-2">
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-green-dark">
              {role.label}
            </span>
          </span>
          <span className="block text-[13.5px] text-charcoal font-medium leading-snug line-clamp-2 mt-0.5">
            {result.title || <span className="text-charcoal/40">No line yet</span>}
          </span>
        </span>
        <svg
          className={`w-5 h-5 text-charcoal/30 shrink-0 transition-transform ${open ? "rotate-90" : ""}`}
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M8 5l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Expanded inline editor */}
      {open && (
        <motion.div
          key="editor"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="border-t border-charcoal/8 px-3.5 py-4"
        >
          <div className="flex flex-col gap-4">
            {/* Primary line */}
            <InlineField label={role.short + " line"}>
              <OptionChips
                options={primaryOptions}
                value={result.title}
                allowEmpty={false}
                onPick={(v) => onPatch({ title: v ?? "" })}
              />
            </InlineField>

            {/* Secondary line */}
            {role.hasSecondary && (
              <InlineField label="Supporting line">
                <OptionChips
                  options={secondaryOptions}
                  value={result.subtext}
                  allowEmpty
                  onPick={(v) => onPatch({ subtext: v })}
                />
              </InlineField>
            )}

            {/* Image */}
            {role.needsImage && (
              <InlineField label="Photo">
                <ImageStrip
                  images={images.images}
                  value={result.imageId}
                  onPick={(id) => onPatch({ imageId: id })}
                />
              </InlineField>
            )}

            {/* Template */}
            {templates.length > 1 && (
              <InlineField label="Layout">
                <div className="flex flex-wrap gap-1.5">
                  {templates.map((t) => {
                    const on = t.id === result.templateId;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => onPatch({ templateId: t.id })}
                        className={`px-3 py-1.5 rounded-lg text-[12.5px] font-medium transition ${
                          on
                            ? "bg-green text-white"
                            : "bg-charcoal/[0.04] text-charcoal/60 hover:bg-charcoal/[0.08]"
                        }`}
                      >
                        {t.name}
                      </button>
                    );
                  })}
                </div>
              </InlineField>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}

function InlineField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-charcoal/40 mb-2">
        {label}
      </p>
      {children}
    </div>
  );
}

/** Tappable option chips + an inline write-your-own. */
function OptionChips({
  options,
  value,
  allowEmpty,
  onPick,
}: {
  options: string[];
  value: string | null;
  allowEmpty: boolean;
  onPick: (v: string | null) => void;
}) {
  const [writing, setWriting] = useState(false);
  const [own, setOwn] = useState("");
  // A value that isn't one of the options is treated as custom text.
  const isCustom = !!value && !options.includes(value);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-1.5">
        {options.map((opt, i) => {
          const on = !writing && value === opt;
          return (
            <button
              key={i}
              type="button"
              onClick={() => {
                setWriting(false);
                onPick(opt);
              }}
              className={`text-left rounded-lg px-3 py-2 text-[13px] leading-snug transition ${
                on
                  ? "bg-green/[0.08] ring-2 ring-green/50 text-charcoal"
                  : "bg-charcoal/[0.03] ring-1 ring-transparent hover:ring-charcoal/15 text-charcoal/80"
              }`}
            >
              {opt}
            </button>
          );
        })}

        {/* Write-your-own / custom value */}
        {writing || isCustom ? (
          <input
            autoFocus={writing}
            value={writing ? own : value ?? ""}
            onFocus={() => {
              if (!writing) {
                setOwn(value ?? "");
                setWriting(true);
              }
            }}
            onChange={(e) => {
              setOwn(e.target.value);
              onPick(e.target.value.trim() || (allowEmpty ? null : ""));
            }}
            placeholder="Write your own…"
            className="rounded-lg px-3 py-2 text-[13px] text-charcoal bg-white ring-2 ring-green/50 placeholder:text-charcoal/35 focus:outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setOwn("");
              setWriting(true);
              onPick("");
            }}
            className="text-left rounded-lg px-3 py-2 text-[13px] text-charcoal/50 bg-charcoal/[0.03] ring-1 ring-transparent hover:ring-charcoal/15 transition"
          >
            + Write my own
          </button>
        )}
      </div>

      {allowEmpty && (
        <button
          type="button"
          onClick={() => {
            setWriting(false);
            onPick(null);
          }}
          className={`self-start text-[12px] transition ${
            value === null
              ? "text-green-dark font-medium"
              : "text-charcoal/45 hover:text-charcoal/70"
          }`}
        >
          No supporting line
        </button>
      )}
    </div>
  );
}

/** A compact horizontal photo strip with a "no photo" option. */
function ImageStrip({
  images,
  value,
  onPick,
}: {
  images: ImageCandidate[];
  value: string | null;
  onPick: (id: string | null) => void;
}) {
  const [broken, setBroken] = useState<Set<string>>(new Set());
  const visible = images.filter((im) => !broken.has(im.id));

  if (visible.length === 0) {
    return (
      <p className="text-[12.5px] text-charcoal/45">
        No imagery matched — add a photo later in the editor.
      </p>
    );
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-0.5 px-0.5">
      <button
        type="button"
        onClick={() => onPick(null)}
        className={`shrink-0 w-16 h-16 rounded-lg grid place-items-center text-[10.5px] font-medium transition ${
          value === null
            ? "bg-green text-white ring-2 ring-green"
            : "bg-charcoal/[0.04] text-charcoal/50 ring-1 ring-charcoal/10 hover:ring-charcoal/25"
        }`}
      >
        No photo
      </button>
      {visible.map((im) => {
        const on = value === im.id;
        return (
          <button
            key={im.id}
            type="button"
            onClick={() => onPick(im.id)}
            className={`relative shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-charcoal/[0.05] transition ${
              on ? "ring-2 ring-green" : "ring-1 ring-charcoal/10 hover:ring-charcoal/25"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={im.thumbnailUrl ?? im.url}
              alt=""
              onError={() =>
                setBroken((prev) => {
                  const next = new Set(prev);
                  next.add(im.id);
                  return next;
                })
              }
              className="absolute inset-0 w-full h-full object-cover"
            />
            {on && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-green grid place-items-center shadow">
                <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M5 10.5l3.5 3.5L15 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Render a slide's content into a thumbnail through the SAME layer
 * pipeline the canvas seeds from, debounced and de-duped on the content
 * signature so rapid inline edits don't thrash the render route. Returns
 * an object URL (revoked on change/unmount) or null while pending.
 */
function useLayerPreview(templateId: string, content: SlideContent): string | null {
  const [url, setUrl] = useState<string | null>(null);
  const sig = `${templateId}|${content.primary}|${content.secondary ?? ""}|${content.imageUrl ?? ""}|${content.eyebrow}`;
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const slide = presetForTemplate(templateId, content);
        const res = await fetch("/api/admin/social-editor/render", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slide }),
        });
        if (!res.ok) throw new Error(String(res.status));
        const blob = await res.blob();
        if (cancelled) return;
        const next = URL.createObjectURL(blob);
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        urlRef.current = next;
        setUrl(next);
      } catch {
        if (!cancelled) setUrl((u) => u); // keep last good thumbnail
      }
    }, 280);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  // Revoke the final URL on unmount.
  useEffect(() => {
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);

  return url;
}

function Spinner() {
  return (
    <svg className="w-5 h-5 animate-spin text-charcoal/30" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
