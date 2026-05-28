/**
 * IFRC GO signal source.
 *
 * IFRC GO (Global Operations) is the International Federation of Red
 * Cross and Red Crescent's public operations platform. National
 * societies (Bangladesh Red Crescent, Palestinian Red Crescent,
 * Syrian Arab Red Crescent, Pakistan Red Crescent, etc.) publish
 * situation reports + emergency operations here — exactly the kind
 * of ongoing humanitarian signal that complements GDACS/USGS
 * (which only catch hazard events at moment-of-onset).
 *
 * API: https://goadmin.ifrc.org/api/v2/event/
 *
 * Free, no API key, no auth. Rate limit ~60 req/min — fine for a
 * 30-minute cron.
 *
 * Each IFRC event includes ifrc_severity_level (0=Awareness,
 * 1=Yellow/Slow, 2=Orange/Medium, 3=Red/Major, 4=Extreme/Catastrophic)
 * which we use as severityRaw — aligned with GDACS Green/Orange/Red
 * (1/2/3) so cross-source scoring stays comparable.
 */

import type { EmergencyEventInput } from "../first-response-ingest";

const API_URL =
  "https://goadmin.ifrc.org/api/v2/event/?ordering=-created_at&limit=50";

/**
 * IFRC disaster type names (from event.dtype.name) mapped to our
 * vocabulary (used by coverage_map.trigger_event_types).
 *
 * IFRC's taxonomy is broader than ours — anything not mapped passes
 * through as the raw IFRC name, which won't match coverage_map but
 * stays visible in raw_payload for inspection.
 */
const DTYPE_MAP: Record<string, string> = {
  Flood: "flood",
  "Flash Flood": "flood",
  Cyclone: "cyclone",
  "Tropical Cyclone": "cyclone",
  Storm: "severe_weather",
  "Storm Surge": "severe_weather",
  Earthquake: "earthquake",
  Tsunami: "earthquake",
  Drought: "drought",
  "Food Insecurity": "drought",
  Epidemic: "outbreak",
  "Biological Emergency": "outbreak",
  "Cold Wave": "cold_snap",
  "Heat Wave": "heatwave",
  "Civil Unrest": "conflict_escalation",
  "Complex Emergency": "displacement",
  "Population Movement": "displacement",
  Fire: "wildfire",
  "Forest Fire": "wildfire",
  Volcano: "volcano",
  "Volcanic Eruption": "volcano",
  Landslide: "landslide",
};

interface IfrcCountry {
  iso?: string | null;
  iso3?: string | null;
  name?: string | null;
}

interface IfrcDtype {
  id?: number;
  name?: string;
}

interface IfrcEvent {
  id: number;
  name: string;
  summary?: string | null;
  countries?: IfrcCountry[];
  dtype?: IfrcDtype | null;
  disaster_start_date?: string | null;
  ifrc_severity_level?: number | null;
  auto_generated_source?: string | null;
}

interface IfrcResponse {
  results?: IfrcEvent[];
}

export async function fetchIfrcEvents(): Promise<EmergencyEventInput[]> {
  const res = await fetch(API_URL, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`IFRC GO API HTTP ${res.status}`);
  }
  const data = (await res.json()) as IfrcResponse;
  const items: EmergencyEventInput[] = [];

  for (const event of data.results ?? []) {
    if (!event.name) continue;

    // Primary country — IFRC events can span multiple countries
    // (regional appeals). Take the first; the others ride along in
    // raw_payload for forensics.
    const primary = event.countries?.[0];
    const countryIso = primary?.iso ? primary.iso.toUpperCase() : null;
    const region = primary?.name ?? null;

    const rawType = event.dtype?.name ?? "";
    const eventType = DTYPE_MAP[rawType] ?? null;

    // Severity: 1-3 maps cleanly to our existing GDACS scale.
    // 0 (Awareness only) → 1 (treat as Green-equivalent).
    // 4 (Extreme/Catastrophic) → 4 (above GDACS Red).
    const severityRaw =
      event.ifrc_severity_level === null ||
      event.ifrc_severity_level === undefined
        ? 1
        : Math.max(1, event.ifrc_severity_level);

    const summary = event.summary
      ? event.summary.replace(/\s+/g, " ").trim().slice(0, 280)
      : null;

    items.push({
      externalId: `ifrc:${event.id}`,
      source: "ifrc",
      eventType,
      countryIso,
      region,
      title: event.name.trim(),
      summary,
      severityRaw,
      sourceUrl: `https://go.ifrc.org/emergencies/${event.id}`,
      rawPayload: event,
    });
  }

  return items;
}
