"use client";

/**
 * ChartsPanel — a left flyout (twin of ElementsPanel) offering brand-styled
 * data charts the SMM can drop onto a slide. Each card inserts a self-contained,
 * fully-editable chart group pre-filled with the crisis's real figures.
 *
 * Cost discipline (the whole point of lazy-loading this):
 *   • On open we build a ChartBundle from the ALREADY-extracted content
 *     (the AI's chart_series + verified facts) — instant, £0, no Claude call.
 *   • Only if that cached data is too thin AND we have an eventId do we hit the
 *     lazy /charts endpoint, which calls Claude ONCE and caches the result. So
 *     the AI only runs if she actually opens Charts on a data-poor report.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import type { Layer } from "@/lib/social-editor/types";
import type { ContentBundle } from "../types";
import {
  type ChartBundle,
  EMPTY_BUNDLE,
  bundleIsThin,
} from "@/lib/social-editor/chartData";
import { buildChart, type ChartCtx } from "@/lib/social-editor/chartBuilders";
import { CHART_GROUPS, chartBundleFromContent, curateStats, type ChartDef } from "./chartLibrary";
import ChartStatsPicker from "./ChartStatsPicker";

function mergeBundles(det: ChartBundle, ai: ChartBundle): ChartBundle {
  // AI wins per-field when it actually produced data; else keep deterministic.
  return {
    series: ai.series.length ? ai.series : det.series,
    parts: ai.parts.length ? ai.parts : det.parts,
    trends: ai.trends.length ? ai.trends : det.trends,
    singles: ai.singles.length ? ai.singles : det.singles,
    ratios: ai.ratios.length ? ai.ratios : det.ratios,
  };
}

export default function ChartsPanel({
  content,
  eventId,
  onPick,
  onClose,
}: {
  content: ContentBundle | null;
  /** Event id → enables the lazy AI top-up. Absent in the sandbox. */
  eventId?: string;
  /** A chart was chosen — insert these layers (bundle pre-bound). */
  onPick: (build: (ctx: ChartCtx) => Layer[]) => void;
  onClose: () => void;
}) {
  // Instant deterministic bundle from cached content (£0).
  const deterministic = useMemo<ChartBundle>(
    () => (content ? chartBundleFromContent(content) : EMPTY_BUNDLE),
    [content]
  );
  const [bundle, setBundle] = useState<ChartBundle>(deterministic);
  const [loading, setLoading] = useState(false);
  const [enriched, setEnriched] = useState(false);
  const askedRef = useRef(false);
  // The chart whose stats-picker is open. Tapping a chart opens the picker so
  // the SMM chooses which figures go in; with no curated figures we skip
  // straight to inserting sample data.
  const [picking, setPicking] = useState<ChartDef | null>(null);

  function openChart(def: ChartDef) {
    const stats = content ? curateStats(content) : [];
    if (stats.length === 0) {
      onPick((ctx) => buildChart(def.kind, ctx, bundle));
      return;
    }
    setPicking(def);
  }

  useEffect(() => {
    setBundle(deterministic);
  }, [deterministic]);

  // Lazy AI top-up: only when the cached data is thin, we have an event, and
  // we haven't already asked this session.
  useEffect(() => {
    if (!eventId || askedRef.current) return;
    if (!bundleIsThin(deterministic)) return;
    askedRef.current = true;
    let alive = true;
    setLoading(true);
    fetch(`/api/admin/social-content/${eventId}/charts`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((json: { bundle?: ChartBundle } | null) => {
        if (!alive || !json?.bundle) return;
        setBundle((cur) => mergeBundles(cur, json.bundle!));
        setEnriched(true);
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [eventId, deterministic]);

  return (
    <aside className="dr-anim-panel w-[300px] shrink-0 bg-white border-r border-charcoal/8 flex flex-col min-h-0">
      <div className="flex items-center justify-between px-3.5 py-3 border-b border-charcoal/8 shrink-0">
        <div className="min-w-0">
          <p className="font-heading font-semibold text-charcoal text-[14px] leading-tight">Charts</p>
          <p className="text-[11px] text-charcoal/45">
            {loading ? "Reading your figures…" : enriched ? "Filled from your sources · tap to add" : "Filled from your sources · tap to add"}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close charts"
          className="text-charcoal/40 hover:text-charcoal text-[20px] leading-none px-1 shrink-0"
        >
          ×
        </button>
      </div>

      {loading && (
        <div className="px-3.5 py-2 border-b border-charcoal/8 shrink-0 flex items-center gap-2 text-[11px] text-charcoal/55">
          <span className="w-3 h-3 rounded-full border-2 border-charcoal/20 border-t-green animate-spin" />
          Researching more numbers for richer charts…
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3">
        {CHART_GROUPS.map((group) => {
          const cards = (
            <div className="grid grid-cols-2 gap-2 mt-2.5">
              {group.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openChart(item)}
                  className="text-left rounded-lg overflow-hidden ring-1 ring-charcoal/8 hover:ring-green/50 hover:shadow-sm transition group"
                  title={`Insert ${item.label}`}
                >
                  <div
                    className="h-[58px] bg-[#163827] grid place-items-center overflow-hidden px-3 [&>svg]:w-full [&>svg]:h-full [&>svg]:max-h-[40px]"
                    dangerouslySetInnerHTML={{ __html: item.preview }}
                  />
                  <div className="px-2 py-1.5 bg-white">
                    <span className="block text-[11px] font-semibold text-charcoal leading-tight truncate">
                      {item.label}
                    </span>
                    <span className="block text-[9.5px] text-charcoal/40 leading-tight truncate">{item.hint}</span>
                  </div>
                </button>
              ))}
            </div>
          );
          if (group.advanced) {
            return (
              <details key={group.key} className="group/adv mb-5">
                <summary className="cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden -mx-3 px-3 py-1.5 bg-white border-b border-charcoal/[0.07] flex items-center gap-2">
                  <span className="text-[10.5px] font-semibold uppercase tracking-[0.13em] text-charcoal/50">{group.title}</span>
                  <span className="text-[9.5px] text-charcoal/35">· rarely the right fit</span>
                  <span className="ml-auto text-charcoal/30 transition-transform group-open/adv:rotate-90 text-[11px]">▸</span>
                </summary>
                {cards}
              </details>
            );
          }
          return (
            <section key={group.key} className="mb-5">
              <div className="sticky top-0 z-10 -mx-3 px-3 py-1.5 bg-white border-b border-charcoal/[0.07]">
                <span className="text-[10.5px] font-semibold uppercase tracking-[0.13em] text-charcoal/50">
                  {group.title}
                </span>
              </div>
              {cards}
            </section>
          );
        })}
        <p className="text-[10.5px] text-charcoal/40 leading-relaxed px-1 mt-1">
          Charts auto-fill with this crisis&rsquo;s figures where we have them — otherwise
          editable sample data drops in. Every value, label and bar is editable on the canvas.
        </p>
      </div>

      {picking && content && (
        <ChartStatsPicker
          chart={picking}
          content={content}
          onInsert={(build) => {
            onPick(build);
            setPicking(null);
          }}
          onClose={() => setPicking(null)}
        />
      )}
    </aside>
  );
}
