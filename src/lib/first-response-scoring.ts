/**
 * First Response priority scoring.
 *
 * Combines multiple signals into a single `dr_priority_score` per
 * detected emergency event so the dashboard can rank events by
 * "actual revenue potential for Deen Relief" rather than raw
 * severity. The same score gates push notifications.
 *
 *   dr_priority_score = severity_raw
 *                     × coverage_weight       (0–3)
 *                     × diaspora_multiplier   (1.0–2.0)
 *                     × muslim_multiplier     (1.0 or 1.5)
 *
 * Why these factors:
 *   - severity_raw: how big the event is (USGS magnitude, GDACS
 *     alert level, ReliefWeb baseline 2 for qualitative reports).
 *   - coverage_weight: the MAX strategic-importance weight across
 *     matched coverage_map rows. Strategic field-presence (Palestine,
 *     Orphan Sponsorship in Bangladesh) = 3; partner = 2; catch-all = 1.
 *   - diaspora_multiplier: how much the UK Muslim diaspora cares
 *     about events in this country. Bangladesh / Pakistan diaspora
 *     in the UK is huge (multi-hundred-thousand each) — events there
 *     move donations disproportionately.
 *   - muslim_multiplier: Muslim-majority countries are higher-priority
 *     for an Islamic charity's donor base by default.
 *
 * Three signals deliberately NOT scored yet (Phase 3c v1):
 *   - Media velocity (would need an event-frequency tracker over
 *     time; trivial to add later)
 *   - Competitor activity (needs the Tier 4 scraper from Task #11)
 *   - Historical pattern match (needs comparable-event archive)
 *
 * Push tier thresholds:
 *   ≥ 20 → CRITICAL — immediate audible push (urgent)
 *   ≥ 10 → HIGH     — silent push in the bell (warning)
 *   < 10 → none     — dashboard only
 *
 * Calibration examples:
 *   - M6.5 BD quake matched to orphan-sponsorship:
 *       6.5 × 3 × 2.0 × 1.5 = 58.5 → CRITICAL
 *   - GDACS Red BD flood matched to orphan-sponsorship:
 *       3 × 3 × 2.0 × 1.5 = 27 → CRITICAL
 *   - GDACS Orange BD flood:
 *       2 × 3 × 2.0 × 1.5 = 18 → HIGH
 *   - GDACS Red PK flood (partner network):
 *       3 × 2 × 2.0 × 1.5 = 18 → HIGH
 *   - ReliefWeb Gaza conflict update:
 *       2 × 3 × 1.5 × 1.5 = 13.5 → HIGH
 *   - M5.5 Sudan quake matched to Zakat (catch-all):
 *       5.5 × 2 × 1.5 × 1.5 = 24.75 → CRITICAL
 *   - M5.5 UK quake matched to Zakat (catch-all):
 *       5.5 × 2 × 1.0 × 1.0 = 11 → HIGH (SMM can dismiss)
 *   - M4.0 random event matched to catch-all:
 *       4 × 2 × 1.0 × 1.0 = 8 → none (silent, dashboard only)
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

export interface ScoreInputs {
  severityRaw: number | null;
  matchedCoverage: CoverageEntry[];
  countryIso: string | null;
}

/**
 * Compute the priority score. Returns null when severity is unknown —
 * a null score sorts to the bottom of the dashboard (via NULLS LAST
 * in the index) and is gated out of push notifications.
 */
export function computeDrPriorityScore(input: ScoreInputs): number | null {
  if (input.severityRaw === null || input.severityRaw === undefined) {
    return null;
  }
  const weight = maxCoverageWeight(input.matchedCoverage);
  if (weight === 0) return 0;
  const diaspora = diasporaMultiplierFor(input.countryIso);
  const muslim = muslimMultiplierFor(input.countryIso);
  // Round to 1dp for compact display.
  return (
    Math.round(input.severityRaw * weight * diaspora * muslim * 10) / 10
  );
}

export function getPushTier(score: number | null): PushTier {
  if (score === null) return "none";
  if (score >= CRITICAL_THRESHOLD) return "critical";
  if (score >= HIGH_THRESHOLD) return "high";
  return "none";
}
