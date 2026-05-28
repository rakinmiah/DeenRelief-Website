/**
 * ReliefWeb signal source.
 *
 * ReliefWeb is OCHA's (UN humanitarian affairs) open data platform —
 * the authoritative feed of humanitarian situation reports, appeals,
 * and assessments. Free, no API key required for basic usage.
 *
 * API: https://api.reliefweb.int/v1/reports
 *
 * We query for the most recent reports tagged as alerts or appeals
 * affecting our coverage countries (and adjacent regions we might
 * expand into). Each report becomes one emergency_event row.
 *
 * Severity here is harder to derive than GDACS/USGS — ReliefWeb
 * reports are qualitative situation updates, not numeric incidents.
 * We use a fixed baseline of 2 (mid-priority) so they appear in the
 * dashboard but below GDACS Red / USGS major earthquake alerts. The
 * scoring engine in Phase 3c will refine using report recency,
 * country coverage_map weight, and title keyword analysis.
 *
 * Report types we ingest:
 *   - "Situation Report"          → ongoing crisis updates
 *   - "Humanitarian Snapshot"     → periodic overview
 *   - "Appeal"                    → formal appeal published
 *   - "Flash Update"              → urgent fast-breaking
 */

import type { EmergencyEventInput } from "../first-response-ingest";

/**
 * The countries we monitor. Mix of DR's coverage areas and adjacent
 * regions where capability could plausibly be added — capability_gaps
 * detection (pending Pre-flight #2) reads from the same set.
 */
const MONITORED_COUNTRIES_ISO3 = [
  "BGD", // Bangladesh
  "PAK", // Pakistan
  "SYR", // Syria
  "IND", // India
  "PSE", // Palestine
  "AFG", // Afghanistan
  "YEM", // Yemen
  "SDN", // Sudan
  "SOM", // Somalia
  "MMR", // Myanmar
  "TUR", // Turkey
  "LBN", // Lebanon
  "EGY", // Egypt
];

const RELEVANT_REPORT_TYPES = [
  "Situation Report",
  "Humanitarian Snapshot",
  "Appeal",
  "Flash Update",
];

const ISO3_TO_ISO2: Record<string, string> = {
  BGD: "BD",
  PAK: "PK",
  SYR: "SY",
  IND: "IN",
  PSE: "PS",
  AFG: "AF",
  YEM: "YE",
  SDN: "SD",
  SOM: "SO",
  MMR: "MM",
  TUR: "TR",
  LBN: "LB",
  EGY: "EG",
};

interface ReliefWebReport {
  id: string;
  fields: {
    title?: string;
    url?: string;
    date?: { created?: string; original?: string };
    country?: { iso3?: string; name?: string }[];
    format?: { name?: string }[];
    body?: string;
  };
}

interface ReliefWebResponse {
  data?: ReliefWebReport[];
}

const API_URL = "https://api.reliefweb.int/v1/reports";

/**
 * Build a POST body asking ReliefWeb for the 50 most recent reports
 * of relevant types affecting our monitored countries. We use POST
 * (per their docs) so the query payload can be JSON.
 */
function buildQuery() {
  return {
    appname: "deenrelief.org",
    limit: 50,
    sort: ["date.created:desc"],
    fields: {
      include: ["title", "url", "date.created", "country.iso3", "country.name", "format.name", "body"],
    },
    filter: {
      operator: "AND",
      conditions: [
        {
          field: "country.iso3",
          value: MONITORED_COUNTRIES_ISO3,
          operator: "OR",
        },
        {
          field: "format.name",
          value: RELEVANT_REPORT_TYPES,
          operator: "OR",
        },
      ],
    },
  };
}

/**
 * Crude keyword → event_type classifier for ReliefWeb titles.
 * ReliefWeb doesn't expose a structured event-type field, so we map
 * by title keywords. Misclassifications are non-fatal — they just
 * widen the matched_campaigns set in computeMatchedCampaigns.
 */
function classifyEventType(title: string): string | null {
  const t = title.toLowerCase();
  if (/\b(flood|monsoon|inundation)\b/.test(t)) return "flood";
  if (/\b(cyclone|typhoon|hurricane|storm)\b/.test(t)) return "cyclone";
  if (/\b(earthquake|tremor|seismic)\b/.test(t)) return "earthquake";
  if (/\b(drought|water shortage)\b/.test(t)) return "drought";
  if (/\b(conflict|fighting|airstrike|hostilities|escalation)\b/.test(t)) {
    return "conflict_escalation";
  }
  if (/\b(displaced|displacement|refugee|fleeing)\b/.test(t)) return "displacement";
  if (/\b(outbreak|cholera|disease|epidemic|measles)\b/.test(t)) return "outbreak";
  if (/\b(blockade|siege)\b/.test(t)) return "blockade";
  return null;
}

export async function fetchReliefWebEvents(): Promise<EmergencyEventInput[]> {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(buildQuery()),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`ReliefWeb API HTTP ${res.status}`);
  }
  const data = (await res.json()) as ReliefWebResponse;
  const items: EmergencyEventInput[] = [];

  for (const report of data.data ?? []) {
    const f = report.fields;
    if (!f.title) continue;
    const primaryCountryIso3 = f.country?.[0]?.iso3 ?? null;
    const countryIso =
      primaryCountryIso3 && ISO3_TO_ISO2[primaryCountryIso3]
        ? ISO3_TO_ISO2[primaryCountryIso3]
        : primaryCountryIso3;
    const region = f.country?.[0]?.name ?? null;
    const eventType = classifyEventType(f.title);

    // ReliefWeb bodies are long markdown. Take the first ~280 chars as
    // a summary — enough to convey "what's happening" in the dashboard
    // without bloating the row.
    const summary = f.body
      ? f.body.replace(/\s+/g, " ").trim().slice(0, 280)
      : null;

    items.push({
      externalId: `reliefweb:${report.id}`,
      source: "reliefweb",
      eventType,
      countryIso,
      region,
      title: f.title.trim(),
      summary,
      // Fixed mid-priority severity baseline; see file header.
      severityRaw: 2,
      sourceUrl: f.url ?? null,
      rawPayload: report,
    });
  }

  return items;
}
