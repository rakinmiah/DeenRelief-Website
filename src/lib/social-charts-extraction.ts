/**
 * Lazy chart-data extraction.
 *
 * Powers the deck-builder Charts panel. The panel first fills charts from the
 * already-extracted content (facts + chart_series) for £0; it only hits this
 * module when that cached data is too thin. So Claude runs at most ONCE per
 * event, and only if the SMM actually opens Charts on a data-poor report.
 *
 * The result is cached inside the existing `draft_content_blocks` jsonb under a
 * `_charts` sibling (+ `_charts_hash`), keyed on a SHA-256 of raw_payload — so
 * re-opens are free and NO migration is needed. The content-extraction reader
 * (`ContentBlocksSchema.safeParse`) ignores the sibling, so the two coexist.
 *
 * Strict no-fabrication: every figure is verbatim from raw_payload; a kind with
 * no honest data is returned as an empty array.
 */

import { createHash } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

import type { EmergencyEvent } from "./first-response";
import { getSupabaseAdmin } from "./supabase";
import { type ChartBundle, EMPTY_BUNDLE } from "./social-editor/chartData";

const MODEL = "claude-sonnet-4-6";

/* ─── Schema (mirrors ChartBundle) ────────────────────────────────── */

const pointSchema = z.object({
  label: z.string().max(40).describe("Category / period label, e.g. 'Gaza', 'May'."),
  value: z.string().max(16).describe("The figure VERBATIM from raw_payload, e.g. '1.7M', '45%', '£0.40'."),
});

const ChartBundleSchema = z
  .object({
    series: z
      .array(
        z.object({
          title: z.string().max(60),
          unit: z.string().max(24).nullable(),
          source: z.string().max(48).nullable().describe("'AGENCY · DD MMM YYYY' or null."),
          points: z.array(pointSchema).min(2).max(8),
        })
      )
      .max(3)
      .default([])
      .describe("Comparable categories on ONE axis/unit — bar/column. e.g. displaced by region. [] if none."),
    parts: z
      .array(
        z.object({
          title: z.string().max(60),
          source: z.string().max(48).nullable(),
          segments: z
            .array(z.object({ label: z.string().max(40), pct: z.number().min(0).max(100) }))
            .min(2)
            .max(6),
        })
      )
      .max(2)
      .default([])
      .describe("Part-to-whole shares summing to ~100 — pie/donut/stacked. [] if the report has no real breakdown."),
    trends: z
      .array(
        z.object({
          title: z.string().max(60),
          unit: z.string().max(24).nullable(),
          source: z.string().max(48).nullable(),
          points: z.array(pointSchema).min(3).max(10),
        })
      )
      .max(2)
      .default([])
      .describe("An ORDERED series over time (dated periods) — line/area. [] unless raw_payload gives a real time sequence."),
    singles: z
      .array(
        z.object({
          label: z.string().max(60),
          value: z.string().max(16),
          percent: z.number().min(0).max(100).nullable().describe("0–100 when the figure is a proportion, else null."),
          goal: z.string().max(40).nullable(),
        })
      )
      .max(4)
      .default([])
      .describe("Standalone headline figures — KPI/gauge/progress. The most striking numbers."),
    ratios: z
      .array(
        z.object({
          filled: z.number().min(0).max(1000),
          total: z.number().min(1).max(1000),
          label: z.string().max(60),
          source: z.string().max(48).nullable(),
        })
      )
      .max(3)
      .default([])
      .describe("'X in/of Y' ratios for a pictograph, e.g. 9 in 10 families. [] if none."),
  })
  .describe("Chart-ready datasets mined VERBATIM from raw_payload. No fabrication — empty arrays where the report lacks that kind.");

const SYSTEM = `You turn a humanitarian emergency's raw source data into CHART-READY datasets for a charity's social infographics.

HARD RULES
• Every figure is VERBATIM from raw_payload — never invent, round, or extrapolate a number.
• Anchor to THIS event only (its country + crisis). Ignore unrelated incidents.
• A dataset kind you cannot fill honestly is an EMPTY array — that is correct and expected, not a failure.
• series/trends: only group points that share ONE unit and are genuinely comparable (no '1.7M' beside '88%').
• parts: only when the report gives a real breakdown whose shares make sense together; pct are whole numbers ~summing to 100.
• Prefer the most striking, decision-relevant numbers a donor would care about.

Return the structured ChartBundle.`;

/* ─── Client ──────────────────────────────────────────────────────── */

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (_client) return _client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set.");
  _client = new Anthropic({ apiKey });
  return _client;
}

function hashPayload(payload: unknown): string {
  let s: string;
  try {
    s = JSON.stringify(payload ?? null);
  } catch {
    s = String(payload);
  }
  return createHash("sha256").update(s).digest("hex");
}

/* ─── Cache (shared draft_content_blocks jsonb, `_charts` sibling) ── */

async function fetchChartCache(eventId: string): Promise<{
  rawPayload: unknown;
  fullBlocks: Record<string, unknown> | null;
  cached: ChartBundle | null;
  cachedHash: string | null;
} | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("emergency_events")
    .select("raw_payload, draft_content_blocks")
    .eq("id", eventId)
    .maybeSingle();
  if (error || !data) return null;

  const full = (data.draft_content_blocks ?? null) as Record<string, unknown> | null;
  let cached: ChartBundle | null = null;
  let cachedHash: string | null = null;
  if (full && full._charts) {
    const parsed = ChartBundleSchema.safeParse(full._charts);
    if (parsed.success) cached = parsed.data as ChartBundle;
    if (typeof full._charts_hash === "string") cachedHash = full._charts_hash;
  }
  return { rawPayload: data.raw_payload, fullBlocks: full, cached, cachedHash };
}

async function persistCharts(
  eventId: string,
  fullBlocks: Record<string, unknown> | null,
  bundle: ChartBundle,
  hash: string
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const base = fullBlocks && typeof fullBlocks === "object" ? fullBlocks : {};
  const stored = { ...base, _charts: bundle, _charts_hash: hash };
  const { error } = await supabase
    .from("emergency_events")
    .update({ draft_content_blocks: stored })
    .eq("id", eventId);
  if (error) {
    console.warn(`[social-charts] persist failed for event ${eventId}:`, error.message);
  }
}

/* ─── Brief ───────────────────────────────────────────────────────── */

function buildBrief(event: EmergencyEvent, rawPayload: unknown): string {
  let payloadJson = "";
  try {
    payloadJson = JSON.stringify(rawPayload ?? {}, null, 0).slice(0, 14000);
  } catch {
    payloadJson = String(rawPayload);
  }
  return `EVENT
Title: ${event.title}
Type: ${event.eventType ?? "—"}
Country: ${event.countryIso ?? "—"}
Region: ${event.region ?? "—"}

RAW SOURCE PAYLOAD (the ONLY source of figures — verbatim, no invention):
${payloadJson || "(no raw_payload available)"}

Extract the ChartBundle now. Empty arrays where the report has no honest data of that kind.`;
}

/* ─── Public ──────────────────────────────────────────────────────── */

export type ExtractChartsResult = { bundle: ChartBundle; cached: boolean };

export async function extractChartsForEvent(event: EmergencyEvent): Promise<ExtractChartsResult> {
  const cache = await fetchChartCache(event.id);
  if (!cache) return { bundle: EMPTY_BUNDLE, cached: false };

  const hash = hashPayload(cache.rawPayload);
  if (cache.cached && cache.cachedHash === hash) {
    return { bundle: cache.cached, cached: true };
  }

  const response = await getClient().messages.parse({
    model: MODEL,
    max_tokens: 2200,
    output_config: {
      format: zodOutputFormat(ChartBundleSchema),
      effort: "high" as const,
    },
    system: [{ type: "text" as const, text: SYSTEM, cache_control: { type: "ephemeral" as const } }],
    messages: [{ role: "user", content: [{ type: "text" as const, text: buildBrief(event, cache.rawPayload) }] }],
  });

  const bundle = (response.parsed_output ?? EMPTY_BUNDLE) as ChartBundle;
  await persistCharts(event.id, cache.fullBlocks, bundle, hash);
  return { bundle, cached: false };
}
