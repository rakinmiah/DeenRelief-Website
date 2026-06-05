/**
 * Chart layer-builders for the deck-builder Charts panel.
 *
 * Each builder turns a dataset (from chartData) into a self-contained, brand-
 * styled GROUP of editable canvas layers, dropped onto the current slide like
 * an Element. Rectilinear charts (bar / column / stacked / lollipop / treemap /
 * progress / pictograph / KPI) are composed entirely from rect + text layers,
 * so the SMM can tweak any bar, value or label. Curved charts (pie / donut /
 * line / area / gauge / radar / funnel) bake an SVG into a `data:` URI on an
 * image layer — the SAME technique the chart templates use, so canvas and the
 * Satori PNG export stay identical — with editable text labels alongside.
 *
 * A forest backing panel sits behind every chart so it reads on any slide
 * background. Client-only (uses btoa at build-time of each chart).
 */

import {
  type Layer,
  type TextLayer,
  type ShapeLayer,
  type ImageLayer,
  makeLayerId,
} from "@/lib/social-editor/types";
import {
  type ChartBundle,
  pickSeries,
  pickParts,
  pickTrend,
  pickSingle,
  pickRatio,
  magnitudes,
} from "@/lib/social-editor/chartData";
import { parseMagnitude } from "@/lib/social-editor/presets";

export type ChartKind =
  | "bar"
  | "column"
  | "lollipop"
  | "stacked"
  | "pie"
  | "donut"
  | "treemap"
  | "line"
  | "area"
  | "progress"
  | "gauge"
  | "kpi"
  | "pictograph"
  | "radar"
  | "funnel";

export type ChartCtx = { board: { w: number; h: number } };

/* ─── Brand tokens ────────────────────────────────────────────────── */
const FOREST = "#163827";
const PANEL = "#0F2A1C"; // backing panel — a touch deeper than a forest slide
const CREAM = "#F7F3E8";
const CREAM_DIM = "rgba(247,243,232,0.72)";
const TRACK = "rgba(247,243,232,0.13)"; // bar tracks / gridlines
const GOLD = "#D4A843";
const ANTON = "Anton";
const BARLOW = "Barlow";
// Monochrome gold ramp for multi-segment charts — no rainbow chartjunk.
const RAMP = ["#D4A843", "#E7CD8A", "#BF9333", "#F2E3B6", "#9C7726", "#7E5F1E"];

const r0 = (n: number) => Math.round(n);

/* ─── Layer factories (mirror elementLibrary / presets) ───────────── */
function mkText(
  x: number, y: number, w: number, h: number, text: string,
  fontFamily: string, fontSize: number, o: Partial<TextLayer> = {}
): TextLayer {
  return {
    id: makeLayerId(), type: "text", x, y, w, h, rotation: 0, opacity: 1, locked: false,
    text, fontFamily, fontSize, fontWeight: 400, italic: false, underline: false,
    uppercase: false, color: CREAM, align: "left", lineHeight: 1.1, letterSpacing: 0, ...o,
  };
}
function mkRect(
  x: number, y: number, w: number, h: number, fill: string, radius = 0, o: Partial<ShapeLayer> = {}
): ShapeLayer {
  return {
    id: makeLayerId(), type: "shape", x, y, w, h, rotation: 0, opacity: 1, locked: false,
    shape: "rect", fill, stroke: fill, strokeWidth: 0, radius, ...o,
  };
}
function mkImg(x: number, y: number, w: number, h: number, src: string): ImageLayer {
  return {
    id: makeLayerId(), type: "image", x, y, w, h, rotation: 0, opacity: 1, locked: false,
    src, objectFit: "contain", radius: 0,
  };
}

function svgToDataUri(svg: string): string {
  // Client-only module — btoa is always present. SVGs here are ASCII.
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

type Box = { x: number; y: number; w: number; h: number };

/** Backing panel + title + (optional) source line; returns the inner plot box. */
function chrome(board: { w: number; h: number }, title: string, source: string | null) {
  const px = r0(board.w * 0.05);
  const py = r0(board.h * 0.1);
  const pw = r0(board.w * 0.9);
  const ph = r0(board.h * 0.8);
  const pad = r0(board.w * 0.045);
  const layers: Layer[] = [
    mkRect(px, py, pw, ph, PANEL, 36),
    mkText(px + pad, py + pad, pw - 2 * pad, 70, title, ANTON, 42, {
      uppercase: true, lineHeight: 1.0, letterSpacing: -0.5,
    }),
  ];
  const sourceH = source ? 40 : 0;
  if (source) {
    layers.push(
      mkText(px + pad, py + ph - pad - 22, pw - 2 * pad, 30, source, BARLOW, 18, {
        uppercase: true, color: CREAM_DIM, fontWeight: 600, letterSpacing: 2,
      })
    );
  }
  const plot: Box = {
    x: px + pad,
    y: py + pad + 92,
    w: pw - 2 * pad,
    h: ph - 2 * pad - 92 - sourceH,
  };
  return { layers, plot };
}

/* ─── Comparison ──────────────────────────────────────────────────── */

function barChart(board: { w: number; h: number }, b: ChartBundle): Layer[] {
  const s = pickSeries(b);
  const { layers, plot } = chrome(board, s.title, s.source);
  const pts = s.points.slice(0, 6);
  const mags = magnitudes(pts);
  const max = Math.max(...mags, 1);
  const labelW = r0(plot.w * 0.3);
  const valueW = 140;
  const trackX = plot.x + labelW + 16;
  const trackW = plot.w - labelW - valueW - 32;
  const rowH = plot.h / pts.length;
  const barH = Math.min(48, rowH * 0.46);
  pts.forEach((p, i) => {
    const top = plot.y + i * rowH + (rowH - barH) / 2;
    const ratio = max > 0 ? mags[i]! / max : 0;
    layers.push(
      mkText(plot.x, top + barH / 2 - 16, labelW, 32, p.label, BARLOW, 23, { fontWeight: 600, lineHeight: 1.0 }),
      mkRect(trackX, top, trackW, barH, TRACK, barH / 2),
      mkRect(trackX, top, Math.max(barH, trackW * ratio), barH, GOLD, barH / 2),
      mkText(trackX + trackW + 12, top + barH / 2 - 17, valueW, 34, p.value, ANTON, 30, { align: "right", lineHeight: 1.0 })
    );
  });
  return layers;
}

function columnChart(board: { w: number; h: number }, b: ChartBundle): Layer[] {
  const s = pickSeries(b);
  const { layers, plot } = chrome(board, s.title, s.source);
  const pts = s.points.slice(0, 6);
  const mags = magnitudes(pts);
  const max = Math.max(...mags, 1);
  const n = pts.length;
  const slot = plot.w / n;
  const barW = Math.min(120, slot * 0.56);
  const labelH = 64;
  const valueH = 40;
  const colArea = plot.h - labelH - valueH;
  pts.forEach((p, i) => {
    const cx = plot.x + i * slot + slot / 2;
    const ratio = max > 0 ? mags[i]! / max : 0;
    const barH = Math.max(8, colArea * ratio);
    const top = plot.y + valueH + (colArea - barH);
    layers.push(
      mkText(cx - slot / 2, top - valueH + 4, slot, valueH - 6, p.value, ANTON, 28, { align: "center", lineHeight: 1.0 }),
      mkRect(cx - barW / 2, top, barW, barH, GOLD, 10),
      mkText(cx - slot / 2, plot.y + plot.h - labelH + 6, slot, labelH - 6, p.label, BARLOW, 20, { align: "center", fontWeight: 600, color: CREAM_DIM, lineHeight: 1.05 })
    );
  });
  return layers;
}

function lollipopChart(board: { w: number; h: number }, b: ChartBundle): Layer[] {
  const s = pickSeries(b);
  const { layers, plot } = chrome(board, s.title, s.source);
  const pts = s.points.slice(0, 6);
  const mags = magnitudes(pts);
  const max = Math.max(...mags, 1);
  const labelW = r0(plot.w * 0.3);
  const valueW = 130;
  const trackX = plot.x + labelW + 16;
  const trackW = plot.w - labelW - valueW - 32;
  const rowH = plot.h / pts.length;
  const dot = 30;
  pts.forEach((p, i) => {
    const cy = plot.y + i * rowH + rowH / 2;
    const ratio = max > 0 ? mags[i]! / max : 0;
    const stickW = Math.max(dot, trackW * ratio);
    layers.push(
      mkText(plot.x, cy - 16, labelW, 32, p.label, BARLOW, 23, { fontWeight: 600, lineHeight: 1.0 }),
      mkRect(trackX, cy - 3, stickW - dot / 2, 6, GOLD, 3),
      mkRect(trackX + stickW - dot, cy - dot / 2, dot, dot, GOLD, dot / 2, { stroke: GOLD }),
      mkText(trackX + trackW + 12, cy - 17, valueW, 34, p.value, ANTON, 28, { align: "right", lineHeight: 1.0 })
    );
  });
  return layers;
}

/* ─── Composition ─────────────────────────────────────────────────── */

function stackedChart(board: { w: number; h: number }, b: ChartBundle): Layer[] {
  const parts = pickParts(b);
  const { layers, plot } = chrome(board, parts.title, parts.source);
  const segs = parts.segments.slice(0, 6);
  const total = Math.max(1, segs.reduce((a, s) => a + s.pct, 0));
  const barY = plot.y + 8;
  const barH = Math.min(96, plot.h * 0.26);
  let x = plot.x;
  segs.forEach((s, i) => {
    const w = (plot.w * s.pct) / total;
    layers.push(mkRect(x, barY, Math.max(2, w), barH, RAMP[i % RAMP.length]!, 0));
    x += w;
  });
  // round the outer corners by capping the first/last via overlay-free radius
  // (kept square inside for clean butts). Legend below.
  const legY = barY + barH + 40;
  const colW = plot.w / Math.min(3, segs.length || 1);
  segs.forEach((s, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const lx = plot.x + col * colW;
    const ly = legY + row * 92;
    layers.push(
      mkRect(lx, ly + 6, 30, 30, RAMP[i % RAMP.length]!, 6),
      mkText(lx + 44, ly, colW - 50, 34, s.label, BARLOW, 23, { fontWeight: 600, lineHeight: 1.0 }),
      mkText(lx + 44, ly + 36, colW - 50, 40, `${s.pct}%`, ANTON, 32, { color: GOLD, lineHeight: 1.0 })
    );
  });
  return layers;
}

function pieChart(board: { w: number; h: number }, b: ChartBundle): Layer[] {
  const parts = pickParts(b);
  const { layers, plot } = chrome(board, parts.title, parts.source);
  const segs = normalizeSegs(parts.segments);
  const size = Math.min(plot.h, plot.w * 0.5);
  const uri = svgToDataUri(pieSvg(segs.map((s, i) => ({ pct: s.pct, color: RAMP[i % RAMP.length]! }))));
  layers.push(mkImg(plot.x, plot.y + (plot.h - size) / 2, size, size, uri));
  legend(layers, segs, plot.x + size + 40, plot.y + 20, plot.w - size - 40);
  return layers;
}

function donutChart(board: { w: number; h: number }, b: ChartBundle): Layer[] {
  const parts = pickParts(b);
  const { layers, plot } = chrome(board, parts.title, parts.source);
  const segs = normalizeSegs(parts.segments);
  const size = Math.min(plot.h, plot.w * 0.5);
  const uri = svgToDataUri(donutSvg(segs.map((s, i) => ({ pct: s.pct, color: RAMP[i % RAMP.length]! }))));
  const dx = plot.x;
  const dy = plot.y + (plot.h - size) / 2;
  layers.push(mkImg(dx, dy, size, size, uri));
  // Centre label: the leading share.
  const lead = segs[0];
  if (lead) {
    layers.push(
      mkText(dx, dy + size / 2 - 44, size, 60, `${Math.round(lead.pct)}%`, ANTON, 58, { align: "center", lineHeight: 1.0 }),
      mkText(dx, dy + size / 2 + 20, size, 30, lead.label, BARLOW, 20, { align: "center", color: CREAM_DIM, fontWeight: 600, lineHeight: 1.0 })
    );
  }
  legend(layers, segs, plot.x + size + 40, plot.y + 20, plot.w - size - 40);
  return layers;
}

function treemapChart(board: { w: number; h: number }, b: ChartBundle): Layer[] {
  const parts = pickParts(b);
  const { layers, plot } = chrome(board, parts.title, parts.source);
  const segs = normalizeSegs(parts.segments).slice(0, 6);
  if (segs.length === 0) return layers; // nothing to tile — just the chrome
  // Simple row-based squarified-ish layout: largest as a tall left block, the
  // rest stacked on the right. Good enough for ≤6 shares; the SMM nudges.
  const sorted = [...segs].sort((a, s) => s.pct - a.pct);
  const gap = 10;
  const leftW = r0(plot.w * 0.5);
  const lead = sorted[0]!;
  layers.push(...tile(plot.x, plot.y, leftW - gap / 2, plot.h, lead, RAMP[0]!));
  const rest = sorted.slice(1);
  const rightX = plot.x + leftW + gap / 2;
  const rightW = plot.w - leftW - gap / 2;
  const restTotal = Math.max(1, rest.reduce((a, s) => a + s.pct, 0));
  let y = plot.y;
  rest.forEach((s, i) => {
    const h = (plot.h - gap * (rest.length - 1)) * (s.pct / restTotal);
    layers.push(...tile(rightX, y, rightW, h, s, RAMP[(i + 1) % RAMP.length]!));
    y += h + gap;
  });
  return layers;
}

function tile(x: number, y: number, w: number, h: number, s: { label: string; pct: number }, fill: string): Layer[] {
  return [
    mkRect(x, y, w, h, fill, 14),
    mkText(x + 18, y + 16, w - 36, 36, s.label, BARLOW, 22, { fontWeight: 700, color: FOREST, lineHeight: 1.0 }),
    mkText(x + 18, y + 52, w - 36, 44, `${s.pct}%`, ANTON, 34, { color: FOREST, lineHeight: 1.0 }),
  ];
}

/* ─── Trend ───────────────────────────────────────────────────────── */

function lineChart(board: { w: number; h: number }, b: ChartBundle): Layer[] {
  return trendChart(board, b, false);
}
function areaChart(board: { w: number; h: number }, b: ChartBundle): Layer[] {
  return trendChart(board, b, true);
}
function trendChart(board: { w: number; h: number }, b: ChartBundle, area: boolean): Layer[] {
  const t = pickTrend(b);
  const { layers, plot } = chrome(board, t.title, t.source);
  const pts = t.points.slice(0, 8);
  const vals = pts.map((p) => parseMagnitude(p.value) ?? 0);
  const labelH = 44;
  const gH = plot.h - labelH;
  const uri = svgToDataUri((area ? areaSvg : lineSvg)(vals, plot.w, gH));
  layers.push(mkImg(plot.x, plot.y, plot.w, gH, uri));
  const n = Math.max(1, pts.length - 1);
  pts.forEach((p, i) => {
    const px = plot.x + (i * plot.w) / n;
    const lw = 120;
    const lx = Math.max(plot.x, Math.min(plot.x + plot.w - lw, px - lw / 2));
    layers.push(mkText(lx, plot.y + gH + 8, lw, 32, p.label, BARLOW, 19, { align: "center", color: CREAM_DIM, fontWeight: 600, lineHeight: 1.0 }));
  });
  return layers;
}

/* ─── Single value ────────────────────────────────────────────────── */

function progressChart(board: { w: number; h: number }, b: ChartBundle): Layer[] {
  const s = pickSingle(b);
  const { layers, plot } = chrome(board, "Appeal progress", s.goal);
  const pct = clampPct(s.percent ?? parseFromValue(s.value));
  const barH = Math.min(70, plot.h * 0.22);
  const barY = plot.y + plot.h * 0.42;
  layers.push(
    mkText(plot.x, plot.y + plot.h * 0.06, plot.w, 130, s.value, ANTON, 116, { lineHeight: 0.9 }),
    mkText(plot.x, plot.y + plot.h * 0.06 + 132, plot.w, 40, s.label, BARLOW, 26, { color: CREAM_DIM, fontWeight: 600, lineHeight: 1.0 }),
    mkRect(plot.x, barY, plot.w, barH, TRACK, barH / 2),
    mkRect(plot.x, barY, Math.max(barH, (plot.w * pct) / 100), barH, GOLD, barH / 2)
  );
  return layers;
}

function gaugeChart(board: { w: number; h: number }, b: ChartBundle): Layer[] {
  const s = pickSingle(b);
  const { layers, plot } = chrome(board, "Appeal progress", s.goal);
  const pct = clampPct(s.percent ?? parseFromValue(s.value));
  const size = Math.min(plot.h, plot.w);
  const gx = plot.x + (plot.w - size) / 2;
  const gy = plot.y + (plot.h - size) / 2;
  const uri = svgToDataUri(radialSvg(pct, 560));
  layers.push(
    mkImg(gx, gy, size, size, uri),
    mkText(gx, gy + size / 2 - 60, size, 96, s.value, ANTON, 92, { align: "center", lineHeight: 0.9 }),
    mkText(gx, gy + size / 2 + 36, size, 36, s.label, BARLOW, 22, { align: "center", color: CREAM_DIM, fontWeight: 600, lineHeight: 1.05 })
  );
  return layers;
}

function kpiChart(board: { w: number; h: number }, b: ChartBundle): Layer[] {
  // Up to three headline figures, side by side or stacked.
  const singles = b.singles.length ? b.singles.slice(0, 3) : [pickSingle(b)];
  const { layers, plot } = chrome(board, "By the numbers", null);
  const n = singles.length;
  const rowH = plot.h / n;
  singles.forEach((s, i) => {
    const y = plot.y + i * rowH;
    layers.push(
      mkText(plot.x, y + rowH * 0.12, plot.w, rowH * 0.6, s.value, ANTON, Math.min(132, r0(rowH * 0.62)), { lineHeight: 0.9 }),
      mkText(plot.x, y + rowH * 0.72, plot.w, rowH * 0.26, s.label, BARLOW, 26, { color: CREAM_DIM, fontWeight: 600, lineHeight: 1.05 })
    );
  });
  return layers;
}

function pictographChart(board: { w: number; h: number }, b: ChartBundle): Layer[] {
  const ratio = pickRatio(b);
  const { layers, plot } = chrome(board, `${ratio.filled} in ${ratio.total}`, ratio.source);
  const total = Math.max(1, Math.min(20, ratio.total));
  const filled = Math.max(0, Math.min(total, ratio.filled));
  const perRow = total <= 10 ? total : Math.ceil(total / 2);
  const rows = Math.ceil(total / perRow);
  const cell = Math.min(r0(plot.w / perRow), r0((plot.h - 60) / rows));
  const icon = r0(cell * 0.62);
  const gridW = perRow * cell;
  const startX = plot.x + (plot.w - gridW) / 2;
  for (let i = 0; i < total; i++) {
    const col = i % perRow;
    const row = Math.floor(i / perRow);
    const cx = startX + col * cell + (cell - icon) / 2;
    const cy = plot.y + row * cell + (cell - icon) / 2;
    layers.push(mkRect(cx, cy, icon, icon, i < filled ? GOLD : TRACK, icon / 2));
  }
  layers.push(
    mkText(plot.x, plot.y + rows * cell + 6, plot.w, 40, ratio.label, BARLOW, 24, { align: "center", color: CREAM_DIM, fontWeight: 600, lineHeight: 1.05 })
  );
  return layers;
}

function radarChart(board: { w: number; h: number }, b: ChartBundle): Layer[] {
  const s = pickSeries(b);
  const { layers, plot } = chrome(board, s.title, s.source);
  const pts = s.points.slice(0, 6);
  const mags = magnitudes(pts);
  const max = Math.max(...mags, 1);
  const v01 = mags.map((m) => (max > 0 ? m / max : 0));
  const size = Math.min(plot.h, plot.w) * 0.92;
  const cx = plot.x + plot.w / 2;
  const cy = plot.y + plot.h / 2;
  const gx = cx - size / 2;
  const gy = cy - size / 2;
  const uri = svgToDataUri(radarSvg(v01, 560));
  layers.push(mkImg(gx, gy, size, size, uri));
  // Axis labels around the polygon.
  const r = size / 2;
  pts.forEach((p, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / pts.length;
    const lx = cx + (r + 16) * Math.cos(a) - 70;
    const ly = cy + (r + 16) * Math.sin(a) - 14;
    layers.push(mkText(lx, ly, 140, 30, p.label, BARLOW, 18, { align: "center", color: CREAM_DIM, fontWeight: 600, lineHeight: 1.0 }));
  });
  return layers;
}

function funnelChart(board: { w: number; h: number }, b: ChartBundle): Layer[] {
  const parts = pickParts(b);
  const { layers, plot } = chrome(board, parts.title, parts.source);
  const segs = parts.segments.slice(0, 6);
  const vals = segs.map((s) => s.pct);
  const fW = r0(plot.w * 0.62);
  const uri = svgToDataUri(funnelSvg(vals, 820, 560, RAMP));
  layers.push(mkImg(plot.x, plot.y, fW, plot.h, uri));
  // Labels to the right, one per band.
  const n = segs.length;
  const segH = plot.h / n;
  segs.forEach((s, i) => {
    const ly = plot.y + i * segH + segH / 2 - 28;
    layers.push(
      mkRect(plot.x + fW + 24, ly + 8, 26, 26, RAMP[i % RAMP.length]!, 5),
      mkText(plot.x + fW + 60, ly, plot.w - fW - 70, 32, s.label, BARLOW, 22, { fontWeight: 600, lineHeight: 1.0 }),
      mkText(plot.x + fW + 60, ly + 32, plot.w - fW - 70, 38, `${s.pct}%`, ANTON, 30, { color: GOLD, lineHeight: 1.0 })
    );
  });
  return layers;
}

/* ─── Shared helpers ──────────────────────────────────────────────── */

function normalizeSegs(segs: { label: string; pct: number }[]): { label: string; pct: number }[] {
  const clean = segs.filter((s) => s.pct > 0).slice(0, 6);
  const total = clean.reduce((a, s) => a + s.pct, 0);
  if (total <= 0) return clean;
  // Rescale to sum 100 so the ring/pie closes.
  return clean.map((s) => ({ label: s.label, pct: (s.pct / total) * 100 }));
}

function legend(layers: Layer[], segs: { label: string; pct: number }[], x: number, y: number, w: number): void {
  segs.forEach((s, i) => {
    const ly = y + i * 78;
    layers.push(
      mkRect(x, ly + 6, 30, 30, RAMP[i % RAMP.length]!, 6),
      mkText(x + 44, ly, w - 50, 34, s.label, BARLOW, 23, { fontWeight: 600, lineHeight: 1.0 }),
      mkText(x + 44, ly + 36, w - 50, 40, `${Math.round(s.pct)}%`, ANTON, 30, { color: GOLD, lineHeight: 1.0 })
    );
  });
}

function clampPct(n: number): number {
  return Math.max(0, Math.min(100, n));
}
function parseFromValue(v: string): number {
  const m = v.match(/(\d[\d.]*)\s*%/);
  if (m) return parseFloat(m[1]!);
  const mag = parseMagnitude(v);
  return mag != null && mag <= 1 ? mag * 100 : 42;
}

/* ─── SVG generators (ASCII; btoa-safe) ───────────────────────────── */

function pieSvg(segs: { pct: number; color: string }[], size = 600): string {
  const cx = size / 2, cy = size / 2, r = size / 2 - 4;
  // A lone (or empty) slice can't be drawn as an arc — paint a full disc.
  if (segs.length <= 1) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${cx}" cy="${cy}" r="${r}" fill="${segs[0]?.color ?? GOLD}"/></svg>`;
  }
  let a = -Math.PI / 2;
  const paths = segs
    .map((s) => {
      const slice = (s.pct / 100) * 2 * Math.PI;
      const x1 = cx + r * Math.cos(a), y1 = cy + r * Math.sin(a);
      a += slice;
      const x2 = cx + r * Math.cos(a), y2 = cy + r * Math.sin(a);
      const large = slice > Math.PI ? 1 : 0;
      return `<path d="M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z" fill="${s.color}"/>`;
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${paths}</svg>`;
}

function donutSvg(segs: { pct: number; color: string }[], size = 600, stroke = 124): string {
  const r = (size - stroke) / 2;
  const c = size / 2;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  const rings = segs
    .map((s) => {
      const len = (circ * s.pct) / 100;
      const el = `<circle cx="${c}" cy="${c}" r="${r.toFixed(2)}" fill="none" stroke="${s.color}" stroke-width="${stroke}" stroke-dasharray="${len.toFixed(2)} ${(circ - len).toFixed(2)}" stroke-dashoffset="${(-offset).toFixed(2)}"/>`;
      offset += len;
      return el;
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><g transform="rotate(-90 ${c} ${c})">${rings}</g></svg>`;
}

function lineSvg(values: number[], w = 920, h = 360, color = GOLD): string {
  const pad = 16;
  const max = Math.max(...values, 1), min = Math.min(...values, 0);
  const span = max - min || 1;
  const n = Math.max(1, values.length - 1);
  const xy = values.map((v, i) => {
    const x = pad + (i * (w - 2 * pad)) / n;
    const y = h - pad - ((v - min) / span) * (h - 2 * pad);
    return [x, y] as const;
  });
  const dots = xy.map(([x, y]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="9" fill="${color}"/>`).join("");
  const poly = xy.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const baseline = `<line x1="${pad}" y1="${h - pad}" x2="${w - pad}" y2="${h - pad}" stroke="${TRACK}" stroke-width="2"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${baseline}<polyline points="${poly}" fill="none" stroke="${color}" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"/>${dots}</svg>`;
}

function areaSvg(values: number[], w = 920, h = 360, color = GOLD): string {
  const pad = 16;
  const max = Math.max(...values, 1), min = Math.min(...values, 0);
  const span = max - min || 1;
  const n = Math.max(1, values.length - 1);
  const xy = values.map((v, i) => {
    const x = pad + (i * (w - 2 * pad)) / n;
    const y = h - pad - ((v - min) / span) * (h - 2 * pad);
    return [x, y] as const;
  });
  const poly = xy.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const fill = `${pad},${h - pad} ${poly} ${w - pad},${h - pad}`;
  const dots = xy.map(([x, y]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7" fill="${color}"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><polygon points="${fill}" fill="${color}" fill-opacity="0.22"/><polyline points="${poly}" fill="none" stroke="${color}" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"/>${dots}</svg>`;
}

function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const s = (startDeg * Math.PI) / 180, e = (endDeg * Math.PI) / 180;
  const x1 = cx + r * Math.cos(s), y1 = cy + r * Math.sin(s);
  const x2 = cx + r * Math.cos(e), y2 = cy + r * Math.sin(e);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r.toFixed(2)} ${r.toFixed(2)} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}
function radialSvg(pct: number, size = 560, color = GOLD): string {
  const cx = size / 2, cy = size / 2, sw = r0(size * 0.13), r = (size - sw) / 2 - 4;
  const start = 135, sweep = 270;
  const valEnd = start + sweep * (clampPct(pct) / 100);
  const track = `<path d="${arcPath(cx, cy, r, start, start + sweep)}" fill="none" stroke="${TRACK}" stroke-width="${sw}" stroke-linecap="round"/>`;
  const val = `<path d="${arcPath(cx, cy, r, start, valEnd)}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${track}${val}</svg>`;
}

function radarSvg(v01: number[], size = 560, color = GOLD): string {
  const cx = size / 2, cy = size / 2, r = size / 2 - 36;
  const n = Math.max(3, v01.length);
  const ang = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  let grid = "";
  for (let g = 1; g <= 4; g++) {
    const rr = (r * g) / 4;
    const pts = Array.from({ length: n }, (_, i) => `${(cx + rr * Math.cos(ang(i))).toFixed(1)},${(cy + rr * Math.sin(ang(i))).toFixed(1)}`).join(" ");
    grid += `<polygon points="${pts}" fill="none" stroke="${TRACK}" stroke-width="2"/>`;
  }
  for (let i = 0; i < n; i++) {
    grid += `<line x1="${cx}" y1="${cy}" x2="${(cx + r * Math.cos(ang(i))).toFixed(1)}" y2="${(cy + r * Math.sin(ang(i))).toFixed(1)}" stroke="${TRACK}" stroke-width="2"/>`;
  }
  const vpts = v01.map((v, i) => {
    const rr = r * Math.max(0.04, Math.min(1, v));
    return `${(cx + rr * Math.cos(ang(i))).toFixed(1)},${(cy + rr * Math.sin(ang(i))).toFixed(1)}`;
  }).join(" ");
  const dots = v01.map((v, i) => {
    const rr = r * Math.max(0.04, Math.min(1, v));
    return `<circle cx="${(cx + rr * Math.cos(ang(i))).toFixed(1)}" cy="${(cy + rr * Math.sin(ang(i))).toFixed(1)}" r="6" fill="${color}"/>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${grid}<polygon points="${vpts}" fill="${color}" fill-opacity="0.3" stroke="${color}" stroke-width="4"/>${dots}</svg>`;
}

function funnelSvg(vals: number[], w = 820, h = 560, ramp = RAMP): string {
  const max = Math.max(...vals, 1);
  const n = Math.max(1, vals.length);
  const gap = 12;
  const segH = (h - gap * (n - 1)) / n;
  const widths = vals.map((v) => Math.max(0.14, v / max) * w);
  let y = 0;
  let out = "";
  for (let i = 0; i < n; i++) {
    const wTop = widths[i]!;
    const wBot = i < n - 1 ? widths[i + 1]! : widths[i]! * 0.82;
    const xTop = (w - wTop) / 2, xBot = (w - wBot) / 2;
    const col = ramp[i % ramp.length]!;
    out += `<polygon points="${xTop.toFixed(1)},${y.toFixed(1)} ${(xTop + wTop).toFixed(1)},${y.toFixed(1)} ${(xBot + wBot).toFixed(1)},${(y + segH).toFixed(1)} ${xBot.toFixed(1)},${(y + segH).toFixed(1)}" fill="${col}"/>`;
    y += segH + gap;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${out}</svg>`;
}

/* ─── Dispatch ────────────────────────────────────────────────────── */

const BUILDERS: Record<ChartKind, (board: { w: number; h: number }, b: ChartBundle) => Layer[]> = {
  bar: barChart,
  column: columnChart,
  lollipop: lollipopChart,
  stacked: stackedChart,
  pie: pieChart,
  donut: donutChart,
  treemap: treemapChart,
  line: lineChart,
  area: areaChart,
  progress: progressChart,
  gauge: gaugeChart,
  kpi: kpiChart,
  pictograph: pictographChart,
  radar: radarChart,
  funnel: funnelChart,
};

/** Build one chart's layer group, ready for addLayers (grouped on insert). */
export function buildChart(kind: ChartKind, ctx: ChartCtx, bundle: ChartBundle): Layer[] {
  return BUILDERS[kind](ctx.board, bundle);
}
