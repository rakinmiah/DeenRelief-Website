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
  DraftingStep,
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
  bestChartSeries,
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
  | "drafting"
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
  "drafting",
  "slides",
  "build",
];

/** A saved deck draft for this event, summarised for the resume screen. */
type DraftSummary = { platform: SocialPlatform; slideCount: number; updatedAt: string };

const PLATFORM_LABEL: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  x: "X",
};

function relTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

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
  // Non-null when content extraction itself FAILED (vs. legitimately returned
  // no facts) — so the SMM sees the real reason instead of a silent empty deck.
  const [contentError, setContentError] = useState<string | null>(null);
  const [images, setImages] = useState<ImageBundle | null>(null);
  const [groups, setGroups] = useState<TemplateGroups>({});
  const [ready, setReady] = useState(false);
  const startedRef = useRef(false);

  // The plan (one role per slide) + the per-slide build results.
  const [plan, setPlan] = useState<SlideRole[]>([]);
  const [results, setResults] = useState<SlideResult[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Resume gate — before any extraction runs we check for existing saved drafts
  // for this event. If found, the SMM sees them with "continue editing" /
  // "start a new post"; choosing either flips `entry` to "go" and the normal
  // work begins. No drafts (or the check fails) → straight to "go" (unchanged).
  const [entry, setEntry] = useState<"checking" | "resume" | "go">("checking");
  const [drafts, setDrafts] = useState<DraftSummary[]>([]);
  // Non-null when CONTINUING a saved draft: skip the wizard, load the draft.
  const [resumePlatform, setResumePlatform] = useState<SocialPlatform | null>(null);
  const checkedRef = useRef(false);

  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;
    (async () => {
      try {
        const res = await fetch(`/api/admin/social-deck-drafts/${event.id}`, { cache: "no-store" });
        const json = (await res.json()) as { drafts?: DraftSummary[] };
        const found = Array.isArray(json.drafts) ? json.drafts : [];
        if (found.length > 0) {
          setDrafts(found);
          setEntry("resume");
          return;
        }
      } catch {
        /* fall through to the normal flow */
      }
      setEntry("go");
    })();
  }, [event.id]);

  // Kick off the real work once the resume gate clears (entry === "go").
  useEffect(() => {
    if (startedRef.current || entry !== "go") return;
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
          setContent({
            cards: Array.isArray(json.cards) ? json.cards : [],
            chartSeries: Array.isArray(json.chartSeries)
              ? json.chartSeries
              : undefined,
            enrichmentSources: Array.isArray(json.enrichmentSources)
              ? json.enrichmentSources
              : undefined,
          });
        } catch {
          setContent({ cards: [] });
        }
      } else {
        // Extraction FAILED (not "no facts") — capture the server's reason so
        // the SMM isn't left thinking the report was empty. The endpoint
        // returns { error, detail } on a 500.
        let reason = "Content extraction failed.";
        if (cRes.status === "fulfilled") {
          try {
            const body = (await cRes.value.json()) as { error?: string; detail?: string };
            reason = body.detail || body.error || `Extraction request failed (HTTP ${cRes.value.status}).`;
          } catch {
            reason = `Extraction request failed (HTTP ${cRes.value.status}).`;
          }
        } else {
          reason = "Couldn't reach the extraction service.";
        }
        setContentError(reason);
        setContent({ cards: [] });
      }
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
  }, [event.id, entry]);

  // Continuing a saved draft: once content + images are loaded (cache hit, £0),
  // skip the whole wizard and drop straight into the editor, which loads the
  // saved deck for this platform.
  useEffect(() => {
    if (resumePlatform && content && images && step !== "build") {
      setStep("build");
    }
  }, [resumePlatform, content, images, step]);

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
  // The best COMPARABLE series for a bar chart (AI-extracted, else a
  // conservative cluster of the report's numbers, else null → sample data).
  const chartSeries = useMemo(
    () => (content ? bestChartSeries(content) : null),
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
      const tid = r.templateId;
      // Only the ranked BAR chart auto-fills from the comparable series; the
      // donut / line / stacked / progress charts carry their own data.
      const isBarChart =
        tid.includes("chart") &&
        !tid.includes("chart-progress") &&
        !tid.includes("chart-stacked") &&
        !tid.includes("chart-donut") &&
        !tid.includes("chart-line");
      if (tid.startsWith("x-")) {
        // X infographics pack ALL the report's data points (no shared axis).
        c.facts = xFacts;
        c.source = xSource;
      } else if (isBarChart && chartSeries) {
        // Bar chart fills from a COMPARABLE series so bars don't collapse;
        // the series title describes what it shows. No series → the preset's
        // editable sample data shows instead of a misleading mix.
        c.facts = chartSeries.points;
        c.source = chartSeries.source ?? xSource;
        if (chartSeries.title) c.primary = chartSeries.title;
      }
      return buildTemplateSlide(r.templateId, c, overrides);
    });
  }, [results, images, eyebrow, logo, logoLight, overrides, xFacts, xSource, chartSeries]);

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
    go("drafting");
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
    go("drafting");
  }

  // Quick-draft hand-off. The post is already seeded into `results`; after the
  // brief "Drafting your post…" screen, record the taste signal (exactly as the
  // review screen does) and drop her straight into the editor — no review step.
  function finishDrafting() {
    recordDeckSignals(
      results.filter(Boolean).map((r) => ({
        platform: platform ?? "instagram",
        role: r.role,
        templateId: r.templateId,
        titleLen: (r.title ?? "").trim().length,
      }))
    );
    go("build");
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

  /* ── Resume gate: still checking for saved drafts ────────────── */
  if (entry === "checking") {
    return <FullLoader label="Loading…" />;
  }

  /* ── Resume gate: saved drafts exist — offer continue / start new ── */
  if (entry === "resume") {
    return (
      <ResumeStep
        eventTitle={event.title}
        drafts={drafts}
        backHref={backHref}
        onContinue={(p) => {
          setPlatform(p);
          setResumePlatform(p);
          setEntry("go"); // loads content + images (cache hit, £0), then → editor
        }}
        onStartNew={() => setEntry("go")}
      />
    );
  }

  /* ── Continuing a saved draft — loading it back into the editor ── */
  if (resumePlatform && step !== "build") {
    return <FullLoader label="Loading your draft…" />;
  }

  /* ── Full-bleed: quick-draft loading hand-off ────────────────── */
  if (step === "drafting") {
    return <DraftingStep onDone={finishDrafting} />;
  }

  /* ── Full-bleed: the canvas editor ───────────────────────────── */
  if (step === "build" && content && images && platform) {
    return (
      <div className="fixed inset-0 z-50 bg-[#F4F4F2]">
        <CanvasDeckEditor
          // Continuing a saved draft: hand the editor nothing and DON'T force
          // the initial deck, so its persist-mode load restores the autosaved
          // slides. A fresh build forces the wizard's seed slides as before.
          initialDeck={resumePlatform ? [] : blankStart ? [] : seedSlides}
          deckRecipe={resumePlatform || blankStart ? undefined : deckRecipe}
          eventId={event.id}
          platform={platform}
          images={images.images}
          logo={logo}
          logoLight={logoLight}
          content={content}
          sourceUrl={event.sourceUrl}
          openTemplatesOnMount={!resumePlatform && blankStart}
          backHref={backHref}
          persist
          forceInitial={!resumePlatform}
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
          {contentError && (
            <div className="mb-5 rounded-xl bg-red-50 ring-1 ring-red-200 px-4 py-3">
              <p className="text-[13.5px] font-semibold text-red-800 flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 8v5M12 16.5v.5" strokeLinecap="round" />
                </svg>
                Couldn&rsquo;t read the report
              </p>
              <p className="text-[12.5px] text-red-700/90 leading-relaxed mt-1">
                The AI extraction failed, so no facts or stats were pulled — this isn&rsquo;t
                &ldquo;the report had nothing.&rdquo; Reason: <span className="font-mono">{contentError}</span>
              </p>
              <p className="text-[12px] text-red-700/70 leading-relaxed mt-1.5">
                If this mentions the API key or credits, check <span className="font-mono">ANTHROPIC_API_KEY</span> and
                the Anthropic account in the production environment, then retry.
              </p>
            </div>
          )}
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
            {step === "plan" && content && (
              <PlanStep
                plan={plan}
                content={content}
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

/* ─── Resume gate UI ──────────────────────────────────────────────── */

/** Full-screen, gently fading loader — shared by the resume check and the
 *  "loading your draft" hand-off so the transitions read as one smooth flow. */
function FullLoader({ label }: { label: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="min-h-screen grid place-items-center"
    >
      <div className="flex flex-col items-center gap-4">
        <span className="w-9 h-9 rounded-full border-[3px] border-charcoal/12 border-t-green animate-spin" />
        <motion.p
          key={label}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="text-[13.5px] font-medium text-charcoal/55"
        >
          {label}
        </motion.p>
      </div>
    </motion.div>
  );
}

function ResumeStep({
  eventTitle,
  drafts,
  backHref,
  onContinue,
  onStartNew,
}: {
  eventTitle: string;
  drafts: DraftSummary[];
  backHref: string;
  onContinue: (p: SocialPlatform) => void;
  onStartNew: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
      className="min-h-screen flex flex-col">
      <div className="sticky top-0 z-10 px-5 pt-4">
        <div className="max-w-2xl mx-auto">
          <a href={backHref} className="text-charcoal/45 hover:text-charcoal text-[13px] inline-flex items-center gap-1">
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 5l-5 5 5 5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back
          </a>
        </div>
      </div>
      <div className="flex-1 grid place-items-center px-5 py-8">
        <div className="w-full max-w-2xl">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-charcoal/35 mb-2">
            Pick up where you left off
          </p>
          <h1 className="font-heading font-semibold text-charcoal text-2xl md:text-[26px] leading-tight mb-1">
            You have {drafts.length === 1 ? "a saved draft" : `${drafts.length} saved drafts`}
          </h1>
          <p className="text-[13.5px] text-charcoal/55 mb-6 max-w-lg truncate">for &ldquo;{eventTitle}&rdquo;</p>

          <div className="flex flex-col gap-2.5 mb-7">
            {drafts.map((d) => (
              <button
                key={d.platform}
                type="button"
                onClick={() => onContinue(d.platform)}
                className="group text-left rounded-2xl bg-white ring-1 ring-charcoal/8 hover:ring-green/45 hover:shadow-sm px-5 py-4 transition flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="font-heading font-semibold text-charcoal text-[15px]">
                    {PLATFORM_LABEL[d.platform] ?? d.platform} draft
                  </p>
                  <p className="text-[12.5px] text-charcoal/50 mt-0.5">
                    {d.slideCount} {d.slideCount === 1 ? "slide" : "slides"} · edited {relTime(d.updatedAt)}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-green shrink-0">
                  Continue editing
                  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M8 5l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onStartNew}
            className="inline-flex items-center gap-2 bg-charcoal text-white text-[14px] font-medium px-5 py-2.5 rounded-xl hover:bg-charcoal/85 transition-colors"
          >
            Start building a new post
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M10 4v12M4 10h12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <p className="text-[12px] text-charcoal/45 mt-2.5 max-w-lg">
            Continuing reopens your draft exactly as you left it — no AI is re-run.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
