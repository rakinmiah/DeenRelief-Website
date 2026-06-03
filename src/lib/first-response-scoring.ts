/**
 * First Response priority scoring.
 *
 * Combines multiple signals into a single `dr_priority_score` per
 * detected emergency event so the dashboard can rank events by
 * "actual revenue potential for Deen Relief" rather than raw
 * severity. The same score gates push notifications.
 *
 *   dr_priority_score = humanitarian_severity      (source-normalised)
 *                     × coverage_weight            (0–3)
 *                     × diaspora_multiplier        (1.0–2.0)
 *                     × muslim_multiplier          (1.0 or 1.5)
 *                     × conversion_multiplier      (0.85–1.4, default 1.0)
 *
 * Why these factors:
 *   - humanitarian_severity: raw severity transformed to reflect
 *     real-world humanitarian impact. USGS magnitudes get shifted
 *     so M4.5 contributes 0 (barely felt) and the scale climbs
 *     non-trivially from M5.5 upwards — better matches the actual
 *     damage curve. GDACS / ReliefWeb pass through unchanged
 *     (already calibrated).
 *   - coverage_weight: the MAX strategic-importance weight across
 *     matched coverage_map rows. Strategic field-presence (Palestine,
 *     Orphan Sponsorship in Bangladesh) = 3; partner = 2.
 *   - diaspora_multiplier: how much the UK Muslim diaspora cares
 *     about events in this country. Bangladesh / Pakistan diaspora
 *     in the UK is huge (multi-hundred-thousand each).
 *   - muslim_multiplier: Muslim-majority countries are higher-priority
 *     for an Islamic charity's donor base by default.
 *
 * Signals deliberately NOT scored yet (tracked as Phase 3d/3e):
 *   - Media velocity (event-frequency tracker over time)
 *   - Competitor activity (Tier 4 signal source)
 *
 * Phase 3f (historical conversion) IS now wired: `conversion_multiplier` is a
 * gated, capped nudge (default 1.0) derived from real donation outcomes per
 * topic — see conversionMultiplierFor() in src/lib/social-outcomes.ts. It only
 * augments revenue-likelihood (already a designed factor here), never overrides
 * humanitarian severity, and is 1.0 until a topic has earned a verdict.
 *
 * Push tier thresholds:
 *   ≥ 20 → CRITICAL — immediate audible push (urgent)
 *   ≥ 10 → HIGH     — silent push in the bell (warning)
 *   < 10 → none     — dashboard only (or hidden if no coverage match)
 *
 * Calibration examples (post-sharpening, no Zakat/Sadaqah catch-all):
 *   - M7.5 BD quake matched to orphan-sponsorship:
 *       3 × 3 × 2.0 × 1.5 = 27 → CRITICAL
 *   - M6.5 BD quake:
 *       2 × 3 × 2.0 × 1.5 = 18 → HIGH
 *   - M5.5 BD quake:
 *       1 × 3 × 2.0 × 1.5 = 9 → dashboard only (correct — minor quake)
 *   - M4.5 BD quake:
 *       0 × 3 × 2.0 × 1.5 = 0 → hidden (correct — barely felt)
 *   - GDACS Red BD flood:
 *       3 × 3 × 2.0 × 1.5 = 27 → CRITICAL
 *   - GDACS Orange BD flood:
 *       2 × 3 × 2.0 × 1.5 = 18 → HIGH
 *   - ReliefWeb Gaza conflict update:
 *       2 × 3 × 1.5 × 1.5 = 13.5 → HIGH
 *   - Anything in Pakistan/Syria/Indonesia/etc. with NO coverage row:
 *       score 0 → hidden from dashboard (no field presence to action)
 */

import type { CoverageEntry } from "./first-response";

export type PushTier = "critical" | "high" | "none";

export const CRITICAL_THRESHOLD = 20;
export const HIGH_THRESHOLD = 10;

/**
 * UK Muslim diaspora multiplier per country. Tuned to the actual UK
 * census + community-size data — Bangladesh + Pakistan are the
 * largest UK Muslim diasporas by a wide margin.
 *
 * ×2.0 = top-tier diaspora connection (>500k UK community)
 * ×1.5 = significant diaspora or strong cultural-religious tie
 * ×1.0 = default (no significant diaspora boost)
 */
const DIASPORA_MULTIPLIER: Record<string, number> = {
  BD: 2.0, // Bangladeshi UK community ~650k
  PK: 2.0, // Pakistani UK community ~1.6M
  IN: 1.5, // Indian UK Muslim diaspora is substantial
  PS: 1.5, // Palestinian solidarity in UK Muslim community is strong
  SY: 1.5, // Syrian refugees + UK Muslim solidarity
  AF: 1.5, // Afghan diaspora + post-2021 resettlement
  SO: 1.5, // Somali UK community ~100k+
  YE: 1.5, // Yemeni UK community (esp. Sheffield, Cardiff)
  TR: 1.5,
  IR: 1.5,
  EG: 1.5,
  IQ: 1.5,
  SD: 1.5, // Sudanese UK community + growing post-2023 crisis
  MA: 1.5,
};

/**
 * Muslim-majority countries (≥50% Muslim population) — relevance boost
 * for an Islamic charity. Curated to the regions we monitor (DR coverage
 * + adjacent expansion). Sources: Pew Research, WPR demographic data.
 */
const MUSLIM_MAJORITY = new Set([
  "AF", "AL", "AZ", "BH", "BD", "BN", "BF", "DJ", "EG", "GM",
  "GN", "ID", "IR", "IQ", "JO", "KZ", "KW", "KG", "LB", "LY",
  "MY", "ML", "MR", "MV", "MA", "NE", "OM", "PK", "PS", "QA",
  "SA", "SN", "SD", "SO", "SY", "TJ", "TR", "TM", "UZ", "YE",
]);

export function diasporaMultiplierFor(countryIso: string | null): number {
  if (!countryIso) return 1.0;
  // Strip subdivision suffix ('GB-BRT' → 'GB') before lookup.
  const base = countryIso.split("-")[0]?.toUpperCase() ?? "";
  return DIASPORA_MULTIPLIER[base] ?? 1.0;
}

export function muslimMultiplierFor(countryIso: string | null): number {
  if (!countryIso) return 1.0;
  const base = countryIso.split("-")[0]?.toUpperCase() ?? "";
  return MUSLIM_MAJORITY.has(base) ? 1.5 : 1.0;
}

/**
 * Maximum coverage weight across the matched coverage entries.
 * Strategic (3) > Partner (2) > Catch-all (1). Returns 0 when no
 * campaigns matched — score will then be 0, so the event sinks to
 * the bottom of the dashboard (or filtered out entirely if we ever
 * choose to).
 */
export function maxCoverageWeight(
  matchedCoverage: CoverageEntry[]
): number {
  if (matchedCoverage.length === 0) return 0;
  return Math.max(...matchedCoverage.map((c) => c.weight));
}

/**
 * Source-aware severity normalisation. Different signal sources
 * express severity on incomparable scales — USGS magnitudes 4.5–9.0
 * are logarithmic (each whole unit = ~32× more energy), GDACS
 * Green/Orange/Red is a calibrated 1/2/3 step, ReliefWeb is a
 * qualitative baseline of 2. Multiplying these directly distorts
 * comparisons (M4.5 quake ranking above GDACS Red flood).
 *
 * Transform per source:
 *
 *   • usgs (earthquakes): max(0, magnitude - 4.5)
 *       M4.5 → 0   (barely felt — humanitarian impact ~zero)
 *       M5.0 → 0.5 (small quake — felt but rarely damaging)
 *       M5.5 → 1   (moderate — local damage)
 *       M6.5 → 2   (strong — significant damage)
 *       M7.5 → 3   (major — widespread destruction)
 *       M8.5 → 4   (great — catastrophic)
 *     The 4.5 baseline matches the USGS feed cutoff we ingest from.
 *
 *   • gdacs: pass-through (already calibrated 1/2/3)
 *
 *   • reliefweb: pass-through (qualitative baseline of 2)
 *
 *   • anything else: pass-through (no transform applied)
 */
export function normaliseSeverity(
  severityRaw: number,
  source: string
): number {
  if (source === "usgs") {
    return Math.max(0, severityRaw - 4.5);
  }
  return severityRaw;
}

export interface ScoreInputs {
  severityRaw: number | null;
  matchedCoverage: CoverageEntry[];
  countryIso: string | null;
  /** Signal source — drives severity normalisation. */
  source: string;
  /** Gated historical-conversion nudge (Phase 3f), default 1.0 (no effect).
   *  Clamped to [0.85, 1.4] by its producer (conversionMultiplierFor). */
  conversionMultiplier?: number;
}

/**
 * Compute the priority score. Returns null when severity is unknown —
 * a null score sorts to the bottom of the dashboard (via NULLS LAST
 * in the index) and is gated out of push notifications. Score 0
 * means severity normalised to nothing OR no coverage match — both
 * lead to dashboard exclusion via the Active alerts filter.
 */
export function computeDrPriorityScore(input: ScoreInputs): number | null {
  if (input.severityRaw === null || input.severityRaw === undefined) {
    return null;
  }
  const weight = maxCoverageWeight(input.matchedCoverage);
  if (weight === 0) return 0;
  const severity = normaliseSeverity(input.severityRaw, input.source);
  if (severity === 0) return 0;
  const diaspora = diasporaMultiplierFor(input.countryIso);
  const muslim = muslimMultiplierFor(input.countryIso);
  // Gated, capped historical-conversion nudge (Phase 3f). Default 1.0 — no
  // effect until a topic has earned a verdict, so pre-existing scores are
  // unchanged.
  const conversion = input.conversionMultiplier ?? 1.0;
  // Round to 1dp for compact display.
  return Math.round(severity * weight * diaspora * muslim * conversion * 10) / 10;
}

export function getPushTier(score: number | null): PushTier {
  if (score === null) return "none";
  if (score >= CRITICAL_THRESHOLD) return "critical";
  if (score >= HIGH_THRESHOLD) return "high";
  return "none";
}
