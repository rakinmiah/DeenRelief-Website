"use client";

/**
 * ChartStatsPicker — opens when the SMM taps a chart type. It lays out every
 * figure we curated from the report, grouped by theme (Casualties / Food /
 * Water…) in collapsible sections, and lets her tick exactly which stats go
 * into the chart. On insert it builds a one-off ChartBundle from her picks and
 * hands the editor a layer-builder. No tokens — pure selection over data we
 * already have.
 */

import { useMemo, useState } from "react";
import type { Layer } from "@/lib/social-editor/types";
import type { ContentBundle } from "../types";
import { buildChart, type ChartCtx } from "@/lib/social-editor/chartBuilders";
import {
  type ChartDef,
  type CuratedStat,
  bundleFromStats,
  chartFamily,
  curateStats,
  selectionLimits,
  statsSource,
} from "./chartLibrary";

function groupByCategory(stats: CuratedStat[]): { key: string; label: string; items: CuratedStat[] }[] {
  const map = new Map<string, { key: string; label: string; items: CuratedStat[] }>();
  for (const s of stats) {
    let g = map.get(s.category);
    if (!g) {
      g = { key: s.category, label: s.categoryLabel, items: [] };
      map.set(s.category, g);
    }
    g.items.push(s);
  }
  // "Other figures" always last.
  return [...map.values()].sort((a, b) => (a.key === "other" ? 1 : b.key === "other" ? -1 : 0));
}

export default function ChartStatsPicker({
  chart,
  content,
  onInsert,
  onClose,
}: {
  chart: ChartDef;
  content: ContentBundle;
  onInsert: (build: (ctx: ChartCtx) => Layer[]) => void;
  onClose: () => void;
}) {
  const stats = useMemo(() => curateStats(content), [content]);
  const groups = useMemo(() => groupByCategory(stats), [stats]);
  const family = chartFamily(chart.kind);
  const limits = selectionLimits(family);
  const single = limits.max === 1;

  // Pre-tick a sensible default so she can one-tap insert.
  const [sel, setSel] = useState<string[]>(() => stats.slice(0, Math.max(limits.min, single ? 1 : Math.min(3, limits.max))).map((s) => s.id));

  function toggle(id: string) {
    setSel((prev) => {
      if (prev.includes(id)) return single ? prev : prev.filter((x) => x !== id);
      if (single) return [id];
      if (prev.length >= limits.max) return prev;
      return [...prev, id];
    });
  }

  const chosen = stats.filter((s) => sel.includes(s.id));
  const canInsert = chosen.length >= limits.min;

  function insert() {
    if (!canInsert) return;
    const bundle = bundleFromStats(chart.kind, chosen, statsSource(content));
    onInsert((ctx) => buildChart(chart.kind, ctx, bundle));
    onClose();
  }

  return (
    <div className="dr-anim-overlay fixed inset-0 z-[70] bg-charcoal/40 grid place-items-center p-6" onMouseDown={onClose}>
      <div
        className="dr-anim-dialog bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[82vh] flex flex-col"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-3 px-5 pt-5 pb-3 border-b border-charcoal/8">
          <span
            className="mt-0.5 w-9 h-9 rounded-lg bg-[#163827] grid place-items-center shrink-0 [&>svg]:w-5 [&>svg]:h-5"
            dangerouslySetInnerHTML={{ __html: chart.preview }}
          />
          <div className="min-w-0 flex-1">
            <h2 className="font-heading font-semibold text-charcoal text-[16px] leading-tight">
              {chart.label} — pick the figures
            </h2>
            <p className="text-[12.5px] text-charcoal/55 leading-snug mt-0.5">
              {single
                ? "Choose one figure for this chart."
                : `Choose ${limits.min}–${limits.max} figures. They auto-fill the chart.`}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="-mt-1 text-charcoal/35 hover:text-charcoal text-[22px] leading-none">
            ×
          </button>
        </div>

        {/* Categorised stats */}
        <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3">
          {groups.length === 0 ? (
            <p className="text-[13px] text-charcoal/45 text-center py-10 px-4">
              No figures were curated from this report — the chart will drop in editable sample data instead.
            </p>
          ) : (
            groups.map((g, gi) => (
              <details key={g.key} open={gi < 2} className="group mb-1.5 rounded-lg ring-1 ring-charcoal/8 overflow-hidden">
                <summary className="cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden px-3 py-2 flex items-center gap-2 bg-charcoal/[0.02] hover:bg-charcoal/[0.04]">
                  <span className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-charcoal/55">{g.label}</span>
                  <span className="text-[10px] font-medium text-charcoal/30 tabular-nums">{g.items.length}</span>
                  <span className="ml-auto text-charcoal/30 transition-transform group-open:rotate-90 text-[11px]">▸</span>
                </summary>
                <ul className="px-2 py-1.5 flex flex-col gap-1">
                  {g.items.map((s) => {
                    const on = sel.includes(s.id);
                    const atCap = !on && !single && sel.length >= limits.max;
                    return (
                      <li key={s.id}>
                        <button
                          type="button"
                          disabled={atCap}
                          onClick={() => toggle(s.id)}
                          className={`w-full text-left flex items-start gap-2.5 rounded-md px-2.5 py-1.5 transition ${
                            on ? "bg-green/8 ring-1 ring-green/35" : atCap ? "opacity-40 cursor-not-allowed" : "hover:bg-charcoal/[0.04]"
                          }`}
                        >
                          <span
                            className={`mt-0.5 shrink-0 w-4 h-4 grid place-items-center ${single ? "rounded-full" : "rounded"} ${
                              on ? "bg-green text-white" : "ring-1 ring-charcoal/25"
                            }`}
                          >
                            {on && (
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden>
                                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </span>
                          <span className="min-w-0">
                            <span className="font-mono font-semibold text-[13px] text-charcoal">{s.value}</span>{" "}
                            <span className="text-[12.5px] text-charcoal/60 leading-snug">{s.label}</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </details>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-t border-charcoal/8">
          <span className="text-[12px] text-charcoal/50">
            {chosen.length} selected{!single && ` · max ${limits.max}`}
          </span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="px-3.5 py-2 rounded-lg text-[13px] font-medium text-charcoal/55 hover:bg-charcoal/5 transition">
              Cancel
            </button>
            <button
              type="button"
              onClick={insert}
              disabled={!canInsert}
              className="px-4 py-2 rounded-lg bg-green text-white text-[13px] font-semibold hover:bg-green-dark disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Insert chart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
