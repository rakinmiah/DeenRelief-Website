"use client";

/**
 * Chart sandbox — DEV ONLY (the page 404s in production). Renders every chart
 * type with both a realistic dataset and an adversarial one (long labels,
 * mixed units, raw floats) so layout bugs are visible at a glance, with no
 * auth-gated content. Used to verify the chart renderers headlessly.
 */

import LayerView from "@/app/admin/social/deck-builder/[eventId]/editor/LayerView";
import { buildChart, type ChartKind } from "@/lib/social-editor/chartBuilders";
import type { ChartBundle } from "@/lib/social-editor/chartData";

const REALISTIC: ChartBundle = {
  series: [
    {
      title: "Casualties since the ceasefire",
      unit: "people",
      source: "Gaza MoH · 25 May 2026",
      points: [
        { label: "Killed", value: "881" },
        { label: "Injured", value: "2,621" },
        { label: "Children", value: "312" },
        { label: "Medics", value: "47" },
      ],
    },
  ],
  parts: [
    {
      title: "Where your gift goes",
      source: "100% donation policy",
      segments: [
        { label: "Food", pct: 45 },
        { label: "Shelter", pct: 30 },
        { label: "Medical", pct: 25 },
      ],
    },
  ],
  trends: [
    {
      title: "Aid trucks per day",
      unit: "trucks",
      source: "OCHA · May 2026",
      points: [
        { label: "Jan", value: "120" },
        { label: "Feb", value: "95" },
        { label: "Mar", value: "70" },
        { label: "Apr", value: "55" },
        { label: "May", value: "40" },
      ],
    },
  ],
  singles: [
    { label: "of the appeal funded", value: "42%", percent: 42, goal: "£1M goal" },
    { label: "people displaced", value: "1.7M", percent: null, goal: null },
    { label: "sites makeshift", value: "88%", percent: 88, goal: null },
  ],
  ratios: [{ filled: 9, total: 10, label: "families skip meals", source: "WFP" }],
};

const ADVERSARIAL: ChartBundle = {
  series: [
    {
      title: "Gaza food & water coverage (daily)",
      unit: null,
      source: "OCHA · 25 May 2026",
      points: [
        { label: "Bread production meets only of estimated need; 300 metr", value: "36%" },
        { label: "Cooked meals distributed per day across Gaza", value: "1,000,000" },
        { label: "Water delivered in cubic metres per day", value: "24,000" },
        { label: "Food parcel recipients across the strip", value: "440,000" },
        { label: "Households relying on water deliveries", value: "74%" },
      ],
    },
  ],
  parts: [
    {
      title: "Two unrelated percentages",
      source: "OCHA",
      segments: [
        { label: "Bread production meets only of estimated need", pct: 36 },
        { label: "of Gaza households rely on water deliveries; 24,000 cub", pct: 74 },
      ],
    },
  ],
  trends: [
    {
      title: "Mixed-magnitude sequence",
      unit: null,
      source: "OCHA",
      points: [
        { label: "Reporting period one", value: "1,000,000" },
        { label: "Reporting period two", value: "440,000" },
        { label: "Reporting period three", value: "24,000" },
      ],
    },
  ],
  singles: [
    { label: "of Gaza households rely on water deliveries; 24,000 cub metres", value: "67.272727%", percent: 67, goal: null },
    { label: "bread production meets only of estimated need; 300 metric tons", value: "36%", percent: 36, goal: null },
  ],
  ratios: [{ filled: 74, total: 100, label: "of Gaza households rely on water deliveries; 24,000 cub", source: "OCHA" }],
};

const KINDS: ChartKind[] = [
  "bar", "column", "lollipop", "radar",
  "donut", "pie", "stacked", "treemap", "funnel",
  "line", "area",
  "progress", "gauge", "kpi", "pictograph",
];

function Board({ kind, bundle, w, h, scale }: { kind: ChartKind; bundle: ChartBundle; w: number; h: number; scale: number }) {
  let layers;
  try {
    layers = buildChart(kind, { board: { w, h } }, bundle);
  } catch (err) {
    return (
      <div style={{ width: w * scale, height: h * scale }} className="grid place-items-center bg-red-100 text-red-700 text-xs rounded">
        threw: {String(err)}
      </div>
    );
  }
  return (
    <div
      className="relative overflow-hidden rounded-md ring-1 ring-black/10"
      style={{ width: w * scale, height: h * scale, background: "#EFEDE6" }}
    >
      {layers.map((l) => (
        <LayerView key={l.id} layer={l} scale={scale} interactive={false} />
      ))}
    </div>
  );
}

export default function ChartSandbox() {
  const square = { w: 1080, h: 1080, scale: 0.31 };
  const land = { w: 1200, h: 675, scale: 0.31 };
  return (
    <div className="min-h-screen bg-neutral-100 p-6 font-sans">
      <h1 className="text-xl font-bold mb-1">Chart sandbox (dev only)</h1>
      <p className="text-sm text-neutral-500 mb-6">
        Left column = realistic data · right column = adversarial (long labels, mixed units, raw floats). Square 1080 +
        landscape 1200×675.
      </p>
      <div className="flex flex-col gap-8">
        {KINDS.map((kind) => (
          <div key={kind}>
            <h2 className="text-[13px] font-bold uppercase tracking-wide text-neutral-700 mb-2">{kind}</h2>
            <div className="flex flex-wrap gap-4 items-start">
              <Figure label="realistic · square"><Board kind={kind} bundle={REALISTIC} {...square} /></Figure>
              <Figure label="adversarial · square"><Board kind={kind} bundle={ADVERSARIAL} {...square} /></Figure>
              <Figure label="realistic · landscape"><Board kind={kind} bundle={REALISTIC} {...land} /></Figure>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Figure({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      {children}
      <span className="text-[10px] text-neutral-400">{label}</span>
    </div>
  );
}
