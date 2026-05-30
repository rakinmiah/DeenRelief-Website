"use client";

/**
 * DeckFlow — the guided wizard on-ramp to the deck builder (Phase 8 → 11).
 *
 *   preparing → summary → platform → count → plan → slides → build
 *
 * "preparing" fires the real content-extraction + image fetches and
 * shows scripted-but-gated progress. "plan" lets her assign a role to
 * each middle slide (hero + CTA locked). "slides" runs the guided
 * SlideBuilder once per slide. "build" opens the Canva-style canvas
 * seeded with every slide she planned.
 */

import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import type { SocialPlatform } from "@/lib/social-templates/types";
import { presetForTemplate, type SlideContent } from "@/lib/social-editor/presets";
import CanvasDeckEditor from "./editor/CanvasDeckEditor";
import {
  PlanStep,
  PlatformStep,
  PreparingStep,
  SlideCountStep,
  SummaryStep,
} from "./DeckFlowSteps";
import SlideBuilder, { type SlideResult } from "./SlideBuilder";
import { ROLES, suggestPlan, type SlideRole } from "./slideRoles";
import type { ContentBundle, ImageBundle, TemplateGroups } from "./types";

export interface EventSummary {
  id: string;
  title: string;
  summary: string | null;
  eventType: string | null;
  countryIso: string | null;
  region: string | null;
  source: string;
  matchedCampaigns: string[];
  detectedAtLabel: string | null;
}

type Step = "preparing" | "summary" | "platform" | "count" | "plan" | "slides" | "build";

const ORDER: Step[] = ["preparing", "summary", "platform", "count", "plan", "slides", "build"];

export default function DeckFlow({
  event,
  backHref,
}: {
  event: EventSummary;
  backHref: string;
}) {
  const [step, setStep] = useState<Step>("preparing");
  const [dir, setDir] = useState<1 | -1>(1);
  const [platform, setPlatform] = useState<SocialPlatform | null>(null);
  const [slideCount, setSlideCount] = useState<number | null>(null);

  // Data fetched during "preparing".
  const [content, setContent] = useState<ContentBundle | null>(null);
  const [images, setImages] = useState<ImageBundle | null>(null);
  const [groups, setGroups] = useState<TemplateGroups>({});
  const [ready, setReady] = useState(false);
  const startedRef = useRef(false);

  // The plan (one role per slide) + the per-slide build results.
  const [plan, setPlan] = useState<SlideRole[]>([]);
  const [results, setResults] = useState<SlideResult[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Kick off the real work once.
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    let cancelled = false;
    (async () => {
      const [cRes, iRes, tRes] = await Promise.allSettled([
        fetch(`/api/admin/social-content/${event.id}/extract`, { cache: "no-store" }),
        fetch(`/api/admin/social-content/${event.id}/images`, { cache: "no-store" }),
        fetch(`/api/admin/social-templates/list?platform=instagram`, { cache: "no-store" }),
      ]);
      if (cancelled) return;
      if (cRes.status === "fulfilled" && cRes.value.ok) {
        try {
          const json = (await cRes.value.json()) as ContentBundle;
          setContent({ cards: Array.isArray(json.cards) ? json.cards : [] });
        } catch {
          setContent({ cards: [] });
        }
      } else setContent({ cards: [] });
      if (iRes.status === "fulfilled" && iRes.value.ok) {
        try {
          const json = (await iRes.value.json()) as ImageBundle;
          setImages({ images: Array.isArray(json.images) ? json.images : [] });
        } catch {
          setImages({ images: [] });
        }
      } else setImages({ images: [] });
      if (tRes.status === "fulfilled" && tRes.value.ok) {
        try {
          const json = (await tRes.value.json()) as { groups: TemplateGroups };
          setGroups(json.groups ?? {});
        } catch {
          /* builders fall back to write-own + an empty template step */
        }
      }
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [event.id]);

  const suggestedSlideCount = useMemo(() => {
    if (!content) return 6;
    const kinds = content.cards.map((c) => c.card.kind);
    const facts = kinds.filter((k) => k === "fact").length;
    const hasQuote = kinds.includes("quote");
    const hasTiers = kinds.includes("tier_row");
    const count = 1 + Math.min(facts, 3) + (hasQuote ? 1 : 0) + (hasTiers ? 1 : 0) + 1;
    return Math.max(3, Math.min(8, count));
  }, [content]);

  // A short eyebrow shared by every seeded slide.
  const eyebrow = useMemo(() => {
    const region = (event.region || event.countryIso || "")
      .toString()
      .split(/[+(/]/)[0]!
      .trim()
      .slice(0, 24);
    return (
      [region, event.detectedAtLabel].filter(Boolean).join(" · ").toUpperCase() ||
      "FROM THE FIELD"
    );
  }, [event]);

  // Seed the canvas deck from the per-slide build results.
  const seedSlides = useMemo(() => {
    if (!images) return [];
    return results.filter(Boolean).map((r) => {
      const imageUrl = r.imageId
        ? images.images.find((i) => i.id === r.imageId)?.url ?? null
        : null;
      const c: SlideContent = { primary: r.title, secondary: r.subtext, imageUrl, eyebrow };
      return presetForTemplate(r.templateId, c);
    });
  }, [results, images, eyebrow]);

  function go(next: Step) {
    setDir(ORDER.indexOf(next) > ORDER.indexOf(step) ? 1 : -1);
    setStep(next);
  }

  function startBuilding(p: SlideRole[]) {
    setPlan(p);
    setResults([]);
    setCurrentSlide(0);
    go("slides");
  }

  /* ── Full-bleed: the canvas editor ───────────────────────────── */
  if (step === "build" && content && images && platform) {
    return (
      <div className="fixed inset-0 z-50 bg-[#F4F4F2]">
        <CanvasDeckEditor
          initialDeck={seedSlides}
          eventId={event.id}
          platform={platform}
          images={images.images}
          backHref={backHref}
          persist
          forceInitial
          title={event.title}
        />
      </div>
    );
  }

  /* ── Full-bleed: the per-slide guided builder loop ───────────── */
  if (step === "slides" && content && images && plan.length > 0) {
    const role = plan[currentSlide]!;
    const templates = groups[ROLES[role].category] ?? [];
    return (
      <SlideBuilder
        key={currentSlide}
        spec={{ role, index: currentSlide, total: plan.length }}
        content={content}
        images={images}
        templates={templates}
        onComplete={(result) => {
          setResults((prev) => {
            const next = [...prev];
            next[currentSlide] = result;
            return next;
          });
          if (currentSlide + 1 < plan.length) setCurrentSlide((s) => s + 1);
          else go("build");
        }}
      />
    );
  }

  const stepIndex = ORDER.indexOf(step);
  const progress = step === "preparing" ? 0 : (stepIndex - 1) / (ORDER.length - 2);

  return (
    <div className="min-h-screen flex flex-col">
      <div className="sticky top-0 z-10 px-5 pt-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          {step !== "preparing" && (
            <button
              type="button"
              onClick={() => {
                if (step === "summary") return;
                if (step === "platform") go("summary");
                else if (step === "count") go("platform");
                else if (step === "plan") go("count");
              }}
              className="text-charcoal/45 hover:text-charcoal text-[13px] flex items-center gap-1"
            >
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 5l-5 5 5 5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Back
            </button>
          )}
          <div className="flex-1 h-1 rounded-full bg-charcoal/8 overflow-hidden">
            <motion.div
              className="h-full bg-green/70 rounded-full"
              initial={false}
              animate={{ width: `${Math.max(0.06, progress) * 100}%` }}
              transition={{ type: "spring", stiffness: 120, damping: 20 }}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 grid place-items-center px-5 py-8">
        <div className="w-full max-w-2xl">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: dir * 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
          >
            {step === "preparing" && (
              <PreparingStep eventTitle={event.title} ready={ready} onDone={() => go("summary")} />
            )}
            {step === "summary" && (
              <SummaryStep
                event={event}
                facts={
                  content?.cards
                    .filter((c) => c.card.kind === "fact")
                    .map((c) => (c.card.kind === "fact" ? c.card.text : "")) ?? []
                }
                onContinue={() => go("platform")}
              />
            )}
            {step === "platform" && (
              <PlatformStep
                onPick={(p) => {
                  setPlatform(p);
                  if (p === "instagram" || p === "facebook") go("count");
                  else startBuilding(["hero"]); // X = single image
                }}
              />
            )}
            {step === "count" && (
              <SlideCountStep
                suggested={suggestedSlideCount}
                value={slideCount ?? suggestedSlideCount}
                onChange={setSlideCount}
                onConfirm={() => {
                  const c = slideCount ?? suggestedSlideCount;
                  setSlideCount(c);
                  if (content) setPlan(suggestPlan(c, content));
                  go("plan");
                }}
              />
            )}
            {step === "plan" && (
              <PlanStep
                plan={plan}
                onChange={setPlan}
                onConfirm={() => startBuilding(plan)}
              />
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
