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

import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import type { SocialPlatform, TemplateMeta } from "@/lib/social-templates/types";
import { heroFor, seedDeck, type SeedHero } from "@/lib/social-editor/presets";
import CanvasDeckEditor from "./editor/CanvasDeckEditor";
import { PlatformStep, PreparingStep, SlideCountStep, SummaryStep } from "./DeckFlowSteps";
import HeroBuilder, { type HeroResult } from "./HeroBuilder";
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

type Step = "preparing" | "summary" | "platform" | "count" | "hero" | "build";

const ORDER: Step[] = [
  "preparing",
  "summary",
  "platform",
  "count",
  "hero",
  "build",
];

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
  const [heroTemplates, setHeroTemplates] = useState<TemplateMeta[]>([]);
  const [ready, setReady] = useState(false);
  const startedRef = useRef(false);

  // The guided hero builder's raw choices, used to seed the canvas deck.
  const [heroResult, setHeroResult] = useState<HeroResult | null>(null);

  // Kick off the real work once.
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    let cancelled = false;
    (async () => {
      const [cRes, iRes, tRes] = await Promise.allSettled([
        fetch(`/api/admin/social-content/${event.id}/extract`, {
          cache: "no-store",
        }),
        fetch(`/api/admin/social-content/${event.id}/images`, {
          cache: "no-store",
        }),
        fetch(`/api/admin/social-templates/list?platform=instagram`, {
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
      if (tRes.status === "fulfilled" && tRes.value.ok) {
        try {
          const json = (await tRes.value.json()) as { groups: TemplateGroups };
          setHeroTemplates(json.groups?.hero ?? []);
        } catch {
          /* hero builder will show an empty template step */
        }
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

  // Seed the canvas deck from the event's content + the guided hero
  // choices. Layer presets (not the old slot templates) — once seeded,
  // every element is freely editable on the canvas.
  const seedSlides = useMemo(() => {
    if (!content || !images || !platform) return [];
    const region = (event.region || event.countryIso || "").toString().slice(0, 48);
    const eyebrowLine =
      [region, event.detectedAtLabel].filter(Boolean).join(" · ").toUpperCase() ||
      "FROM THE FIELD";
    const titleCard = content.cards.find((c) => c.card.kind === "title")?.card;
    const titleText = titleCard && titleCard.kind === "title" ? titleCard.text : event.title;
    const facts = content.cards
      .filter((c) => c.card.kind === "fact")
      .map((c) => (c.card.kind === "fact" ? c.card.text : ""))
      .filter(Boolean)
      .slice(0, 4);
    const heroImageUrl = heroResult?.imageId
      ? images.images.find((i) => i.id === heroResult.imageId)?.url ?? null
      : images.images[0]?.url ?? null;
    const hero: SeedHero = {
      templateId: heroResult?.templateId ?? "ig-hero-magazine-cover",
      title: heroResult?.title || titleText,
      subtext: heroResult?.subtext ?? null,
      imageUrl: heroImageUrl,
      eyebrow: eyebrowLine,
    };
    if (platform === "x") return [heroFor(hero)];
    return seedDeck(
      { eyebrow: eyebrowLine, hero, facts, ctaHeadline: "Your support can't wait." },
      slideCount ?? suggestedSlideCount
    );
  }, [content, images, platform, heroResult, slideCount, suggestedSlideCount, event]);

  function go(next: Step) {
    setDir(ORDER.indexOf(next) > ORDER.indexOf(step) ? 1 : -1);
    setStep(next);
  }

  // The build step is the full-bleed Canva-style canvas editor, seeded
  // from the event's content + the guided hero choices.
  if (step === "build" && content && images && platform) {
    return (
      <div className="h-screen w-full">
        <CanvasDeckEditor
          initialDeck={seedSlides}
          eventId={event.id}
          platform={platform}
          backHref={backHref}
          persist
          title={event.title}
        />
      </div>
    );
  }

  // The guided hero builder — also full-bleed (its own pinned header).
  if (step === "hero" && content && images) {
    return (
      <HeroBuilder
        content={content}
        images={images}
        heroTemplates={heroTemplates}
        onComplete={(result) => {
          setHeroResult(result);
          go("build");
        }}
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
          {/* Keyed remount: each step unmounts the last and fades/slides
              in on mount. Simpler + more reliable than AnimatePresence
              exit/enter, which left swapped-in steps stuck at opacity 0. */}
          <motion.div
            key={step}
            initial={{ opacity: 0, x: dir * 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
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
                    go("hero");
                  }}
                />
              )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

