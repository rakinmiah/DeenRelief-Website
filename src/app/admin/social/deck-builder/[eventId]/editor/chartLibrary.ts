/**
 * Chart registry for the editor's Charts panel — the catalogue of brand chart
 * types (grouped like ThoughtSpot's families: comparison / composition / trend
 * / single value) plus a tiny preview thumbnail for each card.
 *
 * Also `chartBundleFromContent`: the £0 deterministic fallback that mines the
 * already-extracted content (the AI's `chart_series` + verified facts) into a
 * ChartBundle, so charts work instantly without any extra AI call. The lazy
 * Claude endpoint only tops this up when the report's cached data is too thin.
 */

import type { ContentBundle } from "../types";
import { bestChartSeries, reportSource, infographicFacts } from "../slideRoles";
import {
  type ChartBundle,
  type ChartSeriesData,
  type ChartParts,
  type ChartSingle,
  type ChartRatio,
  EMPTY_BUNDLE,
  partsFromSeries,
} from "@/lib/social-editor/chartData";
import type { ChartKind } from "@/lib/social-editor/chartBuilders";
import { parseMagnitude } from "@/lib/social-editor/presets";

export type ChartDef = {
  id: string;
  label: string;
  hint: string;
  kind: ChartKind;
  /** Inline SVG markup for the panel thumbnail (gold on the card's forest tile). */
  preview: string;
};

export type ChartGroup = { key: string; title: string; items: ChartDef[] };

const G = "#D4A843"; // gold
const Gd = "#BF9333"; // gold deep
const Gl = "#E7CD8A"; // gold light
const Cm = "#F7F3E8"; // cream

/* Compact 44×30 preview glyphs. */
const PREVIEW: Record<ChartKind, string> = {
  bar: `<svg viewBox="0 0 44 30"><rect x="4" y="5" width="26" height="4" rx="2" fill="${G}"/><rect x="4" y="13" width="34" height="4" rx="2" fill="${G}"/><rect x="4" y="21" width="18" height="4" rx="2" fill="${G}"/></svg>`,
  column: `<svg viewBox="0 0 44 30"><rect x="6" y="14" width="6" height="12" rx="2" fill="${G}"/><rect x="16" y="8" width="6" height="18" rx="2" fill="${G}"/><rect x="26" y="17" width="6" height="9" rx="2" fill="${G}"/><rect x="36" y="11" width="6" height="15" rx="2" fill="${G}"/></svg>`,
  lollipop: `<svg viewBox="0 0 44 30"><rect x="4" y="7" width="20" height="2" fill="${G}"/><circle cx="26" cy="8" r="3.5" fill="${G}"/><rect x="4" y="15" width="28" height="2" fill="${G}"/><circle cx="34" cy="16" r="3.5" fill="${G}"/><rect x="4" y="23" width="12" height="2" fill="${G}"/><circle cx="18" cy="24" r="3.5" fill="${G}"/></svg>`,
  radar: `<svg viewBox="0 0 44 30"><polygon points="22,4 38,13 32,26 12,26 6,13" fill="none" stroke="${Gd}" stroke-width="1"/><polygon points="22,10 32,15 28,23 16,22 13,15" fill="${G}" fill-opacity="0.4" stroke="${G}" stroke-width="1.4"/></svg>`,
  pie: `<svg viewBox="0 0 44 30"><circle cx="22" cy="15" r="11" fill="${Gd}"/><path d="M22 15 L22 4 A11 11 0 0 1 31.5 20.5 Z" fill="${G}"/><path d="M22 15 L31.5 20.5 A11 11 0 0 1 22 26 Z" fill="${Gl}"/></svg>`,
  donut: `<svg viewBox="0 0 44 30"><circle cx="22" cy="15" r="10" fill="none" stroke="${Gd}" stroke-width="6"/><path d="M22 5 A10 10 0 0 1 31 20" fill="none" stroke="${G}" stroke-width="6"/></svg>`,
  stacked: `<svg viewBox="0 0 44 30"><rect x="4" y="12" width="16" height="7" fill="${G}"/><rect x="20" y="12" width="12" height="7" fill="${Gd}"/><rect x="32" y="12" width="8" height="7" fill="${Gl}"/></svg>`,
  treemap: `<svg viewBox="0 0 44 30"><rect x="4" y="5" width="20" height="20" fill="${G}"/><rect x="25" y="5" width="15" height="11" fill="${Gd}"/><rect x="25" y="17" width="15" height="8" fill="${Gl}"/></svg>`,
  funnel: `<svg viewBox="0 0 44 30"><polygon points="6,5 38,5 33,12 11,12" fill="${G}"/><polygon points="12,14 32,14 28,21 16,21" fill="${Gd}"/><polygon points="17,23 27,23 24,28 20,28" fill="${Gl}"/></svg>`,
  line: `<svg viewBox="0 0 44 30"><polyline points="5,22 15,14 24,18 34,7 40,11" fill="none" stroke="${G}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg>`,
  area: `<svg viewBox="0 0 44 30"><polygon points="5,25 5,22 15,14 24,18 34,7 40,11 40,25" fill="${G}" fill-opacity="0.35"/><polyline points="5,22 15,14 24,18 34,7 40,11" fill="none" stroke="${G}" stroke-width="2" stroke-linejoin="round"/></svg>`,
  progress: `<svg viewBox="0 0 44 30"><rect x="4" y="13" width="36" height="6" rx="3" fill="${Gd}" fill-opacity="0.4"/><rect x="4" y="13" width="22" height="6" rx="3" fill="${G}"/></svg>`,
  gauge: `<svg viewBox="0 0 44 30"><path d="M9 24 A13 13 0 0 1 35 24" fill="none" stroke="${Gd}" stroke-opacity="0.4" stroke-width="4" stroke-linecap="round"/><path d="M9 24 A13 13 0 0 1 28 12.5" fill="none" stroke="${G}" stroke-width="4" stroke-linecap="round"/></svg>`,
  kpi: `<svg viewBox="0 0 44 30"><text x="22" y="20" font-family="Anton, sans-serif" font-size="17" fill="${G}" text-anchor="middle">1.7M</text></svg>`,
  pictograph: `<svg viewBox="0 0 44 30">${[0, 1, 2, 3, 4].map((i) => `<circle cx="${7 + i * 8}" cy="11" r="3" fill="${i < 4 ? G : Gd}" fill-opacity="${i < 4 ? 1 : 0.4}"/>`).join("")}${[0, 1, 2, 3, 4].map((i) => `<circle cx="${7 + i * 8}" cy="21" r="3" fill="${i < 1 ? G : Gd}" fill-opacity="${i < 1 ? 1 : 0.4}"/>`).join("")}</svg>`,
};

function def(id: string, kind: ChartKind, label: string, hint: string): ChartDef {
  return { id, kind, label, hint, preview: PREVIEW[kind] };
}

export const CHART_GROUPS: ChartGroup[] = [
  {
    key: "comparison",
    title: "Compare",
    items: [
      def("chart-bar", "bar", "Bar chart", "Ranked horizontal bars"),
      def("chart-column", "column", "Column chart", "Vertical bars"),
      def("chart-lollipop", "lollipop", "Lollipop", "Stems + dots"),
      def("chart-radar", "radar", "Radar", "Multi-metric shape"),
    ],
  },
  {
    key: "composition",
    title: "Break down",
    items: [
      def("chart-donut", "donut", "Donut", "Share of a whole"),
      def("chart-pie", "pie", "Pie chart", "Share of a whole"),
      def("chart-stacked", "stacked", "Stacked bar", "Segments of one bar"),
      def("chart-treemap", "treemap", "Treemap", "Nested shares"),
      def("chart-funnel", "funnel", "Funnel", "Narrowing stages"),
    ],
  },
  {
    key: "trend",
    title: "Over time",
    items: [
      def("chart-line", "line", "Line chart", "Trend over time"),
      def("chart-area", "area", "Area chart", "Filled trend"),
    ],
  },
  {
    key: "single",
    title: "One figure",
    items: [
      def("chart-progress", "progress", "Progress bar", "% of an appeal goal"),
      def("chart-gauge", "gauge", "Gauge", "Radial % funded"),
      def("chart-kpi", "kpi", "Big numbers", "Headline figures"),
      def("chart-pictograph", "pictograph", "Pictograph", "X in Y, as icons"),
    ],
  },
];

/* ─── Deterministic bundle from already-extracted content (£0) ─────── */

function clampPct(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function chartBundleFromContent(content: ContentBundle): ChartBundle {
  const src = reportSource(content);
  const facts = infographicFacts(content, 12); // [{ value, label }]

  // SERIES — the AI comparable series (or fact-clustered fallback).
  const series: ChartSeriesData[] = [];
  const s = bestChartSeries(content);
  if (s && s.points.length >= 2) {
    series.push({ title: s.title, unit: s.unit, source: s.source ?? src, points: s.points });
  }

  // PARTS — from percentage facts that read like shares.
  const parts: ChartParts[] = [];
  const pctFacts = facts.filter((f) => f.value && /%/.test(f.value));
  if (pctFacts.length >= 2) {
    parts.push({
      title: "By the numbers",
      source: src,
      segments: pctFacts.slice(0, 6).map((f) => ({ label: f.label, pct: clampPct(parseFloat(f.value!)) })),
    });
  }

  // SINGLES — the top figures, flagged as % when they are one.
  const singles: ChartSingle[] = facts
    .filter((f) => !!f.value)
    .slice(0, 3)
    .map((f) => ({
      label: f.label,
      value: f.value!,
      percent: /%/.test(f.value!) ? clampPct(parseFloat(f.value!)) : null,
      goal: null,
    }));

  // RATIOS — "X in Y" figures drive the pictograph.
  const ratios: ChartRatio[] = [];
  for (const f of facts) {
    const m = f.value?.match(/(\d+)\s*in\s*(\d+)/i);
    if (m) {
      ratios.push({ filled: parseInt(m[1]!, 10), total: parseInt(m[2]!, 10), label: f.label, source: src });
      if (ratios.length >= 2) break;
    }
  }

  return { series, parts, trends: [], singles, ratios };
}

/* ─── Curated stats + the stats-picker → chart bundle ─────────────────
 * The Charts panel opens a picker so the SMM chooses WHICH figures go into a
 * chart, grouped by theme (Casualties / Food / Water…). These helpers curate
 * the report's figures and turn her selection into a one-off ChartBundle. */

export type CuratedStat = {
  id: string;
  value: string; // verbatim figure, e.g. "881", "88%", "9 in 10"
  label: string; // what it measures
  category: string;
  categoryLabel: string;
};

const STAT_CATEGORIES: { key: string; label: string; re: RegExp }[] = [
  { key: "casualties", label: "Casualties", re: /\b(kill|killed|dead|death|fatalit|injur|wounded|casualt|martyr)\b/i },
  { key: "displacement", label: "Displacement & shelter", re: /\b(displac|refugee|shelter|homeless|evacuat|camp|tent|site|makeshift)\b/i },
  { key: "food", label: "Food & hunger", re: /\b(food|meal|bread|hunger|nutrition|famine|parcel|starv|kitchen|flour)\b/i },
  { key: "water", label: "Water, fuel & power", re: /\b(water|wash|sanitation|hygiene|diesel|fuel|electric|power|litre)\b/i },
  { key: "health", label: "Health", re: /\b(hospital|medic|health|disease|clinic|patient|vaccin|wash|surg)\b/i },
  { key: "children", label: "Children & education", re: /\b(child|school|education|student|infant|baby|pupil)\b/i },
  { key: "access", label: "Attacks & access", re: /\b(attack|strike|settler|demolit|access|crossing|siege|truck|bomb|shell|arson|raid)\b/i },
];

function categorize(label: string, value: string): { key: string; label: string } {
  const hay = `${label} ${value}`;
  for (const c of STAT_CATEGORIES) if (c.re.test(hay)) return { key: c.key, label: c.label };
  return { key: "other", label: "Other figures" };
}

/** Every report figure that carries a number, de-duplicated and themed. */
export function curateStats(content: ContentBundle): CuratedStat[] {
  const facts = infographicFacts(content, 30); // [{ value, label }]
  const seen = new Set<string>();
  const out: CuratedStat[] = [];
  facts.forEach((f, i) => {
    if (!f.value) return; // a chart needs a figure
    const key = `${f.value}|${f.label}`.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    const cat = categorize(f.label, f.value);
    out.push({ id: `stat-${i}`, value: f.value, label: f.label, category: cat.key, categoryLabel: cat.label });
  });
  return out;
}

export type ChartFamily = "series" | "parts" | "trend" | "single" | "kpi" | "ratio";

export function chartFamily(kind: ChartKind): ChartFamily {
  switch (kind) {
    case "bar":
    case "column":
    case "lollipop":
    case "radar":
      return "series";
    case "pie":
    case "donut":
    case "stacked":
    case "treemap":
    case "funnel":
      return "parts";
    case "line":
    case "area":
      return "trend";
    case "progress":
    case "gauge":
      return "single";
    case "kpi":
      return "kpi";
    case "pictograph":
      return "ratio";
  }
}

/** How many stats the SMM should pick for a given chart family. */
export function selectionLimits(family: ChartFamily): { min: number; max: number } {
  switch (family) {
    case "single":
    case "ratio":
      return { min: 1, max: 1 };
    case "kpi":
      return { min: 1, max: 3 };
    default:
      return { min: 2, max: 6 };
  }
}

function pctFromValue(v: string): number | null {
  const m = v.match(/(\d[\d.]*)\s*%/);
  if (m) return Math.max(0, Math.min(100, Math.round(parseFloat(m[1]!))));
  const mag = parseMagnitude(v);
  return mag != null && mag > 0 && mag <= 1 ? Math.round(mag * 100) : null;
}

function ratioFromValue(value: string, label: string, source: string | null): ChartRatio | null {
  const m = value.match(/(\d+)\s*in\s*(\d+)/i);
  if (m) return { filled: parseInt(m[1]!, 10), total: parseInt(m[2]!, 10), label, source };
  const pct = pctFromValue(value);
  if (pct != null) return { filled: Math.round(pct / 10), total: 10, label, source };
  return null;
}

/** Build a one-off bundle from the SMM's chosen stats for this chart kind. */
export function bundleFromStats(
  kind: ChartKind,
  stats: CuratedStat[],
  source: string | null
): ChartBundle {
  const fam = chartFamily(kind);
  const points = stats.map((s) => ({ label: s.label, value: s.value }));

  if (fam === "series") {
    const series: ChartSeriesData = { title: "By the numbers", unit: null, source, points };
    return { ...EMPTY_BUNDLE, series: [series] };
  }
  if (fam === "trend") {
    return { ...EMPTY_BUNDLE, trends: [{ title: "Over time", unit: null, source, points }] };
  }
  if (fam === "parts") {
    const derived = partsFromSeries({ title: "Where it goes", unit: null, source, points });
    const parts: ChartParts =
      derived ?? { title: "By the numbers", source, segments: points.map((p) => ({ label: p.label, pct: 0 })) };
    return { ...EMPTY_BUNDLE, parts: [parts] };
  }
  if (fam === "single" || fam === "kpi") {
    const singles: ChartSingle[] = stats.slice(0, fam === "single" ? 1 : 3).map((s) => ({
      label: s.label,
      value: s.value,
      percent: pctFromValue(s.value),
      goal: null,
    }));
    return { ...EMPTY_BUNDLE, singles };
  }
  // ratio (pictograph)
  const s0 = stats[0];
  const ratio = s0 ? ratioFromValue(s0.value, s0.label, source) : null;
  return { ...EMPTY_BUNDLE, ratios: ratio ? [ratio] : [] };
}

/** Source tag for picker-built charts. */
export function statsSource(content: ContentBundle): string | null {
  return reportSource(content);
}
