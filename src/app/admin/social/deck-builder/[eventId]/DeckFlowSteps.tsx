"use client";

/**
 * Step views for the DeckFlow wizard (Phase 8). Each is a calm,
 * centered, single-decision screen in the Typeform mould.
 */

import { motion } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";
import type { SocialPlatform } from "@/lib/social-templates/types";
import type { EventSummary } from "./DeckFlow";
import { ROLES, MIDDLE_ROLES, type SlideRole } from "./slideRoles";

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
        Step 1 of 2
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
        Step 2 of 3
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
        Step 3 of 3
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
        Start building
        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M8 5l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
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
