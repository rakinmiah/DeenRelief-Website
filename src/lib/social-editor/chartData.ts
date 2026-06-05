/**
 * Chart data model + transforms for the deck-builder Charts panel.
 *
 * One flexible `ChartBundle` feeds every chart type. The AI (lazy, on first
 * open of the Charts panel) and the deterministic fallback both produce this
 * shape; each chart builder reads the dataset KIND it needs (series / parts /
 * trend / single / ratio) and falls back to an editable brand default when the
 * report has nothing of that kind — so a chart always inserts cleanly and the
 * SMM edits the figures.
 *
 * Client-safe: pure types + transforms, no server deps.
 */

import { parseMagnitude } from "./presets";

/** A category + its verbatim figure, e.g. { label: "Gaza", value: "1.7M" }. */
export type ChartPoint = { label: string; value: string };

/** Comparable categories on one axis — bar / column / lollipop / radar / treemap. */
export type ChartSeriesData = {
  title: string;
  unit: string | null;
  source: string | null;
  points: ChartPoint[];
};

/** Part-to-whole shares summing to ~100 — pie / donut / stacked / funnel. */
export type ChartParts = {
  title: string;
  source: string | null;
  segments: { label: string; pct: number }[];
};

/** An ordered series over time — line / area. */
export type ChartTrend = {
  title: string;
  unit: string | null;
  source: string | null;
  points: ChartPoint[];
};

/** One headline figure, optionally a % of a goal — progress / gauge / KPI. */
export type ChartSingle = {
  label: string;
  value: string;
  /** 0–100 when the figure is a proportion (drives gauge / progress fill). */
  percent: number | null;
  goal: string | null;
};

/** An "X of Y" ratio — pictograph (icon array). */
export type ChartRatio = {
  filled: number;
  total: number;
  label: string;
  source: string | null;
};

export type ChartBundle = {
  series: ChartSeriesData[];
  parts: ChartParts[];
  trends: ChartTrend[];
  singles: ChartSingle[];
  ratios: ChartRatio[];
};

export const EMPTY_BUNDLE: ChartBundle = {
  series: [],
  parts: [],
  trends: [],
  singles: [],
  ratios: [],
};

/** True when the bundle has enough real data to be worth showing without an
 *  AI top-up (used to decide whether to bother with the lazy Claude call). */
export function bundleIsThin(b: ChartBundle): boolean {
  const series = b.series.filter((s) => s.points.length >= 2).length;
  const parts = b.parts.filter((p) => p.segments.length >= 2).length;
  const trends = b.trends.filter((t) => t.points.length >= 3).length;
  return series + parts + trends + b.singles.length + b.ratios.length < 2;
}

/* ─── Editable brand defaults ─────────────────────────────────────────
 * Used when the report has no dataset of a given kind. Deliberately generic
 * humanitarian figures the SMM overwrites — never presented as real data. */

export const DEFAULT_SERIES: ChartSeriesData = {
  title: "By the numbers",
  unit: null,
  source: "Add your source",
  points: [
    { label: "Food parcels", value: "12,400" },
    { label: "Medical kits", value: "8,900" },
    { label: "Shelter kits", value: "5,200" },
    { label: "Water (litres)", value: "3,100" },
  ],
};

export const DEFAULT_PARTS: ChartParts = {
  title: "Where your gift goes",
  source: "100% donation policy",
  segments: [
    { label: "Food", pct: 45 },
    { label: "Shelter", pct: 30 },
    { label: "Medical", pct: 25 },
  ],
};

export const DEFAULT_TREND: ChartTrend = {
  title: "Need over time",
  unit: null,
  source: "Add your source",
  points: [
    { label: "Jan", value: "1.1M" },
    { label: "Feb", value: "1.3M" },
    { label: "Mar", value: "1.4M" },
    { label: "Apr", value: "1.6M" },
    { label: "May", value: "1.7M" },
  ],
};

export const DEFAULT_SINGLE: ChartSingle = {
  label: "of the appeal funded",
  value: "42%",
  percent: 42,
  goal: "£1M goal",
};

export const DEFAULT_RATIO: ChartRatio = {
  filled: 9,
  total: 10,
  label: "families skip meals",
  source: "Add your source",
};

/* ─── Pickers — best dataset of a kind, else a default ─────────────── */

export function pickSeries(b: ChartBundle): ChartSeriesData {
  return b.series.find((s) => s.points.length >= 2) ?? DEFAULT_SERIES;
}

export function pickParts(b: ChartBundle): ChartParts {
  const real = b.parts.find((p) => p.segments.length >= 2);
  if (real) return real;
  const s = b.series.find((x) => x.points.length >= 2);
  if (s) {
    const derived = partsFromSeries(s);
    if (derived) return derived;
  }
  return DEFAULT_PARTS;
}

export function pickTrend(b: ChartBundle): ChartTrend {
  const real = b.trends.find((t) => t.points.length >= 3);
  if (real) return real;
  // A comparable series can stand in as a sequence if nothing better exists.
  const s = b.series.find((x) => x.points.length >= 3);
  if (s) return { title: s.title, unit: s.unit, source: s.source, points: s.points };
  return DEFAULT_TREND;
}

export function pickSingle(b: ChartBundle): ChartSingle {
  return b.singles[0] ?? DEFAULT_SINGLE;
}

export function pickRatio(b: ChartBundle): ChartRatio {
  return b.ratios[0] ?? DEFAULT_RATIO;
}

/* ─── Transforms ──────────────────────────────────────────────────── */

/** Normalise a series of verbatim figures into a comparable part-to-whole
 *  breakdown (percentages summing to ~100), so a count series can feed pie /
 *  donut / stacked. Returns null when nothing parses. */
export function partsFromSeries(s: ChartSeriesData): ChartParts | null {
  const mags = s.points.map((p) => parseMagnitude(p.value) ?? 0);
  const total = mags.reduce((a, b) => a + b, 0);
  if (total <= 0) return null;
  const segments = s.points
    .map((p, i) => ({ label: p.label, pct: Math.round((mags[i]! / total) * 100) }))
    .slice(0, 6);
  return { title: s.title, source: s.source, segments };
}

/** Comparable numeric magnitudes for bar / column scaling (0 when unparseable). */
export function magnitudes(points: ChartPoint[]): number[] {
  return points.map((p) => parseMagnitude(p.value) ?? 0);
}
