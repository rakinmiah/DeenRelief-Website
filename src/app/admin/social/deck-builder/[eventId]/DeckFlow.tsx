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
import { buildTemplateSlide, type BrandLogo, type SlideContent } from "@/lib/social-editor/presets";
import { useTemplateOverrides } from "../../template-lab/useOverrides";
import CanvasDeckEditor from "./editor/CanvasDeckEditor";
import type { DeckRecipeEntry } from "@/app/admin/social/posts/actions";
import {
  ModeStep,
  PlanStep,
  PlatformStep,
  PreparingStep,
  ReviewStep,
  SlideCountStep,
  SummaryStep,
} from "./DeckFlowSteps";
import SlideBuilder, { type SlideResult } from "./SlideBuilder";
import { HERO_VARIANTS } from "./heroVariants";
import { MIDDLE_VARIANTS } from "./middleVariants";
import { X_VARIANTS } from "./xVariants";
import {
  ROLES,
  autoFillPlan,
  defaultTemplateId,
  infographicFacts,
  reportSource,
  suggestPlan,
  type SlideRole,
} from "./slideRoles";
import { useSmmPrefs, recordDeckSignals } from "./useSmmPrefs";
import type { ContentBundle, ImageBundle, TemplateGroups } from "./types";

export interface EventSummary {
  id: string;
  title: string;
  summary: string | null;
  eventType: string | null;
  countryIso: string | null;
  region: string | null;
  source: string;
  /** Link to the actual news / situation report this event came from. */
  sourceUrl: string | null;
  matchedCampaigns: string[];
  detectedAtLabel: string | null;
}

type Step =
  | "preparing"
  | "summary"
  | "platform"
  | "count"
  | "plan"
  | "mode"
  | "review"
  | "slides"
  | "build";

const ORDER: Step[] = [
  "preparing",
  "summary",
  "platform",
  "count",
  "plan",
  "mode",
  "review",
  "slides",
  "build",
];

export default function DeckFlow({
  event,
  backHref,
  logo,
  logoLight,
}: {
  event: EventSummary;
  backHref: string;
  /** On-dark (white) DR brand logo, resolved server-side — the reversed
   *  fallback, used only on dark slide backgrounds. */
  logo: BrandLogo | null;
  /** On-light (green) DR brand logo — the PRIMARY mark. Presets prefer this
   *  and fall back to white only when the slide field is dark. */
  logoLight: BrandLogo | null;
}) {
  const [step, setStep] = useState<Step>("preparing");
  const [dir, setDir] = useState<1 | -1>(1);
  const [platform, setPlatform] = useState<SocialPlatform | null>(null);
  const [slideCount, setSlideCount] = useState<number | null>(null);
  // "Skip to editor" lands on a BLANK canvas with the Templates panel open,
  // rather than an auto-drafted deck.
  const [blankStart, setBlankStart] = useState(false);

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

  // Saved "official template" edits — applied to auto-built decks too.
  const overrides = useTemplateOverrides();

  // The deck builder's two learned signals: `prefs` (her taste) + `outcome`
  // (what real clicks/donations prove converts). Both bias the auto-draft's
  // deterministic choices; proven winners outrank taste. £0.
  const { prefs, outcome } = useSmmPrefs();

  // Report data points + source for the dense X news-infographics (they pack
  // several facts into one image). Derived once from the extracted report.
  const xFacts = useMemo(
    () => (content ? infographicFacts(content) : []),
    [content]
  );
  const xSource = useMemo(
    () => (content ? reportSource(content) : null),
    [content]
  );

  // Seed the canvas deck from the per-slide build results.
  const seedSlides = useMemo(() => {
    if (!images) return [];
    return results.filter(Boolean).map((r) => {
      const imageUrl = r.imageId
        ? images.images.find((i) => i.id === r.imageId)?.url ?? null
        : null;
      const c: SlideContent = { primary: r.title, secondary: r.subtext, imageUrl, eyebrow, logo, logoLight };
      // X infographics carry the whole report — inject the derived facts +
      // source so the single image is dense, not just a headline.
      if (r.templateId.startsWith("x-")) {
        c.facts = xFacts;
        c.source = xSource;
      }
      return buildTemplateSlide(r.templateId, c, overrides);
    });
  }, [results, images, eyebrow, logo, logoLight, overrides, xFacts, xSource]);

  // The deck's DESIGN recipe ({role, templateId} per slide) — captured at the
  // canvas boundary (which discards templateId/role) so "Mark as posted" can
  // attribute real clicks/donations back to these exact templates.
  const deckRecipe = useMemo<DeckRecipeEntry[]>(
    () =>
      results
        .filter(Boolean)
        .map((r) => ({ role: r.role, templateId: r.templateId })),
    [results]
  );

  // The template options for a given slide role — faithful Hero variants
  // for the hero step, the registry group otherwise. Shared by the guided
  // builder loop and the review/quick-draft template resolution.
  const templatesForRole = useMemo(() => {
    return (role: SlideRole) => {
      // X is a single landscape image — its whole catalogue is the X
      // news-infographic set, regardless of the (single) slide's role.
      if (platform === "x") return X_VARIANTS;
      const cat = ROLES[role].category;
      if (cat === "hero") return HERO_VARIANTS;
      // New type-only middles drive from a local list (no registry entries).
      return MIDDLE_VARIANTS[cat] ?? groups[cat] ?? [];
    };
  }, [groups, platform]);

  function go(next: Step) {
    setDir(ORDER.indexOf(next) > ORDER.indexOf(step) ? 1 : -1);
    setStep(next);
  }

  // Detailed mode: run the per-slide guided builder loop.
  function startGuided(p: SlideRole[]) {
    setPlan(p);
    setResults([]);
    setCurrentSlide(0);
    go("slides");
  }

  // Quick draft: auto-fill every slide (top content + matched image +
  // default template per role) and drop her on the editable review
  // outline, one screen to confirm or tweak before the canvas opens.
  function startQuick(p: SlideRole[]) {
    setPlan(p);
    if (!content || !images) return;
    const plat = platform ?? "instagram";
    const fills = autoFillPlan(p, content, images, prefs, plat);
    const seeded: SlideResult[] = fills.map((f, index) => ({
      role: f.role,
      index,
      title: f.title,
      subtext: f.subtext,
      imageId: f.imageId,
      templateId: defaultTemplateId(
        f.role,
        templatesForRole(f.role),
        !!f.imageId,
        prefs,
        outcome,
        plat
      ),
    }));
    setResults(seeded);
    setCurrentSlide(0);
    go("review");
  }

  // X quick draft: a single LANDSCAPE news-infographic. X is one image, not a
  // carousel, so we skip slide-count + planning and seed one x-* slide. The
  // hero-role fallback in defaultTemplateId hardcodes SQUARE ids, so we pick
  // the X default here directly — honouring a learned X winner/favourite if
  // one has emerged. (Called from the platform pick, where the platform-state
  // memo hasn't updated yet, so we don't rely on templatesForRole.)
  function startQuickX() {
    if (!content || !images) return;
    setPlatform("x");
    setPlan(["hero"]);
    const fills = autoFillPlan(["hero"], content, images, prefs, "x");
    const f = fills[0]!;
    const learned = [
      outcome?.winningTemplateByKey?.["x:hero"],
      prefs?.favTemplateByKey?.["x:hero"],
    ].find((id): id is string => !!id && id.startsWith("x-"));
    const templateId = learned ?? "x-photo-facts";
    setResults([
      {
        role: "hero",
        index: 0,
        title: f.title,
        subtext: f.subtext,
        imageId: f.imageId,
        templateId,
      },
    ]);
    setCurrentSlide(0);
    go("review");
  }

  // SMM shortcut (step 2 onwards): skip the remaining questions and drop
  // straight into the canvas editor on a BLANK canvas with the Templates
  // panel open, so she builds from scratch by picking templates. The event's
  // extracted content + imagery still ride along (Content panel + image
  // picker) — she just isn't handed a pre-drafted deck.
  function skipToEditor() {
    if (!content || !images) return;
    setBlankStart(true);
    go("build");
  }

  /* ── Full-bleed: the canvas editor ───────────────────────────── */
  if (step === "build" && content && images && platform) {
    return (
      <div className="fixed inset-0 z-50 bg-[#F4F4F2]">
        <CanvasDeckEditor
          initialDeck={blankStart ? [] : seedSlides}
          deckRecipe={blankStart ? undefined : deckRecipe}
          eventId={event.id}
          platform={platform}
          images={images.images}
          logo={logo}
          logoLight={logoLight}
          content={content}
          sourceUrl={event.sourceUrl}
          openTemplatesOnMount={blankStart}
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
    return (
      <SlideBuilder
        key={currentSlide}
        spec={{ role, index: currentSlide, total: plan.length }}
        content={content}
        images={images}
        templates={templatesForRole(role)}
        eyebrow={eyebrow}
        logo={logo}
        logoLight={logoLight}
        onComplete={(result) => {
          setResults((prev) => {
            const next = [...prev];
            next[currentSlide] = result;
            return next;
          });
          if (currentSlide + 1 < plan.length) setCurrentSlide((s) => s + 1);
          else go("review");
        }}
      />
    );
  }

  /* ── Full-bleed: the batch review / outline ──────────────────── */
  if (step === "review" && content && images && results.length > 0) {
    return (
      <ReviewStep
        results={results}
        content={content}
        images={images}
        eyebrow={eyebrow}
        logo={logo}
        logoLight={logoLight}
        templatesForRole={templatesForRole}
        onChange={setResults}
        onBack={() => go("mode")}
        onConfirm={() => {
          // Learn from her FINAL choices (post-edit): which template she kept
          // per slide type + how long her headlines run. Fire-and-forget, £0 —
          // the next auto-draft drifts toward this. Both the quick-draft and
          // the guided flow land here, so every finished deck feeds the loop.
          recordDeckSignals(
            results.filter(Boolean).map((r) => ({
              platform: platform ?? "instagram",
              role: r.role,
              templateId: r.templateId,
              titleLen: (r.title ?? "").trim().length,
            }))
          );
          go("build");
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
                else if (step === "mode") go("plan");
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
                  else {
                    // X is a single landscape image — no slide-count/plan, but
                    // still offer the choice: quick draft OR the step-by-step
                    // builder (same ModeStep as IG, one hero slide).
                    setPlan(["hero"]);
                    go("mode");
                  }
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
                onConfirm={() => go("mode")}
              />
            )}
            {step === "mode" && (
              <ModeStep
                slideCount={plan.length}
                singleImage={platform === "x"}
                onQuick={() =>
                  platform === "x" ? startQuickX() : startQuick(plan)
                }
                onGuided={() => startGuided(plan)}
              />
            )}
          </motion.div>

          {/* SMM shortcut — from step 2 (count) onwards, jump straight to the
              editor with a quick auto-draft instead of finishing the wizard.
              Sits just below the step's Continue button so it's easy to spot. */}
          {(step === "count" || step === "plan" || step === "mode") && ready && (
            <div className="mt-5 pt-4 border-t border-charcoal/8">
              <button
                type="button"
                onClick={skipToEditor}
                className="inline-flex items-center gap-2 text-[14px] font-semibold text-green border border-green/35 bg-green/5 hover:bg-green/10 px-5 py-2.5 rounded-xl transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.9">
                  <path d="M3 10h12M11 5l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Skip to editor
              </button>
              <p className="text-[12.5px] text-charcoal/50 mt-2">
                Jump straight into the canvas on a blank slide — pick templates from the panel and build it yourself.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
