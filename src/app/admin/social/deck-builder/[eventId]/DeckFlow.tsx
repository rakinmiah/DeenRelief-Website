"use client";

/**
 * DeckFlow — the guided wizard on-ramp to the deck builder (Phase 8).
 *
 * A Typeform-style step machine: one calm decision per screen with
 * smooth Framer-Motion transitions.
 *
 *   preparing → summary → platform → (count, if IG/FB) → build
 *
 * "preparing" fires the real content-extraction + image fetches and
 * shows scripted progress stages, but only advances once the real work
 * is done (scripted-but-gated). Every later step pre-fills Claude's
 * suggestion as a default the SMM can override — the wizard guides,
 * never locks. The final step hands the already-fetched data + her
 * choices to the composer.
 */

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import type { SocialPlatform } from "@/lib/social-templates/types";
import DeckBuilderClient from "./DeckBuilderClient";
import { PlatformStep, PreparingStep, SlideCountStep, SummaryStep } from "./DeckFlowSteps";
import type { ContentBundle, ImageBundle } from "./types";

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

type Step = "preparing" | "summary" | "platform" | "count" | "build";

const ORDER: Step[] = ["preparing", "summary", "platform", "count", "build"];

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
  const [ready, setReady] = useState(false);
  const startedRef = useRef(false);

  // Kick off the real work once.
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    let cancelled = false;
    (async () => {
      const [cRes, iRes] = await Promise.allSettled([
        fetch(`/api/admin/social-content/${event.id}/extract`, {
          cache: "no-store",
        }),
        fetch(`/api/admin/social-content/${event.id}/images`, {
          cache: "no-store",
        }),
      ]);
      if (cancelled) return;
      if (cRes.status === "fulfilled" && cRes.value.ok) {
        try {
          const json = (await cRes.value.json()) as ContentBundle;
          setContent({ cards: Array.isArray(json.cards) ? json.cards : [] });
        } catch {
          setContent({ cards: [] });
        }
      } else {
        setContent({ cards: [] });
      }
      if (iRes.status === "fulfilled" && iRes.value.ok) {
        try {
          const json = (await iRes.value.json()) as ImageBundle;
          setImages({ images: Array.isArray(json.images) ? json.images : [] });
        } catch {
          setImages({ images: [] });
        }
      } else {
        setImages({ images: [] });
      }
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [event.id]);

  // Suggested slide count — Claude-informed via how much content was
  // extracted (hero + up to 3 facts + a quote + a tiers + the ask),
  // clamped 3–8. A real Claude-reasoned field is a later upgrade.
  const suggestedSlideCount = useMemo(() => {
    if (!content) return 6;
    const kinds = content.cards.map((c) => c.card.kind);
    const facts = kinds.filter((k) => k === "fact").length;
    const hasQuote = kinds.includes("quote");
    const hasTiers = kinds.includes("tier_row");
    const count = 1 + Math.min(facts, 3) + (hasQuote ? 1 : 0) + (hasTiers ? 1 : 0) + 1;
    return Math.max(3, Math.min(8, count));
  }, [content]);

  function go(next: Step) {
    setDir(ORDER.indexOf(next) > ORDER.indexOf(step) ? 1 : -1);
    setStep(next);
  }

  // The build step is full-bleed (the composer owns the whole canvas),
  // so we render it outside the centered wizard chrome.
  if (step === "build" && content && images && platform) {
    return (
      <DeckBuilderClient
        eventId={event.id}
        eventTitle={event.title}
        backHref={backHref}
        initialContent={content}
        initialImages={images}
        initialPlatform={platform}
        seedSlideCount={
          platform === "instagram" || platform === "facebook"
            ? slideCount ?? suggestedSlideCount
            : 1
        }
      />
    );
  }

  const stepIndex = ORDER.indexOf(step);
  const progress =
    step === "preparing" ? 0 : (stepIndex - 1) / (ORDER.length - 2);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Slim progress + back */}
      <div className="sticky top-0 z-10 px-5 pt-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          {step !== "preparing" && (
            <button
              type="button"
              onClick={() => {
                if (step === "summary") return; // can't go back into loading
                if (step === "platform") go("summary");
                else if (step === "count") go("platform");
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

      {/* Step canvas */}
      <div className="flex-1 grid place-items-center px-5 py-8">
        <div className="w-full max-w-2xl">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={step}
              custom={dir}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            >
              {step === "preparing" && (
                <PreparingStep
                  eventTitle={event.title}
                  ready={ready}
                  onDone={() => go("summary")}
                />
              )}
              {step === "summary" && (
                <SummaryStep
                  event={event}
                  facts={
                    content?.cards
                      .filter((c) => c.card.kind === "fact")
                      .map((c) =>
                        c.card.kind === "fact" ? c.card.text : ""
                      ) ?? []
                  }
                  onContinue={() => go("platform")}
                />
              )}
              {step === "platform" && (
                <PlatformStep
                  onPick={(p) => {
                    setPlatform(p);
                    if (p === "instagram" || p === "facebook") go("count");
                    else go("build");
                  }}
                />
              )}
              {step === "count" && (
                <SlideCountStep
                  suggested={suggestedSlideCount}
                  value={slideCount ?? suggestedSlideCount}
                  onChange={setSlideCount}
                  onConfirm={() => {
                    if (slideCount == null) setSlideCount(suggestedSlideCount);
                    go("build");
                  }}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

const stepVariants = {
  enter: (d: 1 | -1) => ({ opacity: 0, x: d * 28 }),
  center: { opacity: 1, x: 0 },
  exit: (d: 1 | -1) => ({ opacity: 0, x: d * -28 }),
};
