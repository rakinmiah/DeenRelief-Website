/**
 * USGS Earthquake signal source.
 *
 * USGS publishes a GeoJSON feed of every significant earthquake
 * worldwide, updated every minute. Free, no API key.
 *
 * We pull the "M4.5+ past day" tier rather than USGS's "significant"
 * algorithm — significant_day was returning 0 events on quiet days
 * (their algorithm requires shaking-felt reports, which are sparse for
 * quakes in remote regions where DR's beneficiaries live). M4.5 catches
 * every meaningful event without spamming us with M2/M3 nuisance
 * shakes. ~10-30 events/day globally; coverage_map filtering then
 * narrows to the few relevant to our campaigns.
 *
 * Feed: https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson
 *
 * Severity = the moment magnitude (`mag`). 5.5+ is large; 7.0+ is
 * major; 8.0+ is catastrophic. Scoring engine (Phase 3c) downweights
 * sub-5.0 quakes automatically.
 *
 * USGS reports country in `feature.properties.place` as free text
 * ("32km W of Khash, Iran"). We extract the country name and map to
 * ISO 3166-1 alpha-2 via a small lookup table covering the geographies
 * DR has coverage in (or is likely to expand into). Unknown countries
 * pass through as null country_iso — the event still ingests, just
 * won't match a coverage row.
 */

import type { EmergencyEventInput } from "../first-response-ingest";

const FEED_URL =
  "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson";

interface UsgsFeature {
  id: string;
  properties: {
    mag: number | null;
    place: string | null;
    time: number | null;
    title: string | null;
    url: string | null;
    type: string | null; // 'earthquake', 'quarry blast', etc.
  };
}

interface UsgsResponse {
  features?: UsgsFeature[];
}

/**
 * Map common country-name fragments to ISO 3166-1 alpha-2. Used to
 * extract country from USGS's free-text `place` field ("32km W of
 * Khash, Iran"). We only need entries for our coverage areas and
 * close-adjacent regions.
 */
const PLACE_COUNTRY_MAP: { needle: RegExp; iso: string }[] = [
  { needle: /\bBangladesh\b/i, iso: "BD" },
  { needle: /\bPakistan\b/i, iso: "PK" },
  { needle: /\bSyria\b/i, iso: "SY" },
  { needle: /\bIndia\b/i, iso: "IN" },
  { needle: /\b(Palestine|Gaza)\b/i, iso: "PS" },
  { needle: /\b(United Kingdom|UK|England|Scotland|Wales)\b/i, iso: "GB" },
  { needle: /\bAfghanistan\b/i, iso: "AF" },
  { needle: /\bYemen\b/i, iso: "YE" },
  { needle: /\bSudan\b/i, iso: "SD" },
  { needle: /\bSomalia\b/i, iso: "SO" },
  { needle: /\bMyanmar\b/i, iso: "MM" },
  { needle: /\bTurkey\b/i, iso: "TR" },
  { needle: /\bLebanon\b/i, iso: "LB" },
  { needle: /\bJordan\b/i, iso: "JO" },
  { needle: /\bEgypt\b/i, iso: "EG" },
  { needle: /\bIndonesia\b/i, iso: "ID" },
  { needle: /\bIraq\b/i, iso: "IQ" },
  { needle: /\bIran\b/i, iso: "IR" },
  { needle: /\bMorocco\b/i, iso: "MA" },
];

function extractCountry(place: string | null): string | null {
  if (!place) return null;
  for (const entry of PLACE_COUNTRY_MAP) {
    if (entry.needle.test(place)) return entry.iso;
  }
  return null;
}

export async function fetchUsgsEvents(): Promise<EmergencyEventInput[]> {
  const res = await fetch(FEED_URL, {
    headers: { Accept: "application/json" },
    // Don't cache — we always want the freshest data on each cron run.
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`USGS feed HTTP ${res.status}`);
  }
  const data = (await res.json()) as UsgsResponse;
  const items: EmergencyEventInput[] = [];

  for (const feature of data.features ?? []) {
    // USGS 'type' includes things like 'quarry blast', 'explosion' — only
    // ingest actual earthquakes (the most common case but worth filtering).
    if (feature.properties.type && feature.properties.type !== "earthquake") {
      continue;
    }
    const mag = feature.properties.mag;
    if (mag === null || mag === undefined) continue; // unusable without magnitude
    const place = feature.properties.place ?? null;
    const countryIso = extractCountry(place);

    items.push({
      externalId: `usgs:${feature.id}`,
      source: "usgs",
      eventType: "earthquake",
      countryIso,
      region: place,
      title:
        feature.properties.title?.trim() ??
        `M${mag.toFixed(1)} earthquake${place ? ` — ${place}` : ""}`,
      summary: place,
      severityRaw: mag,
      sourceUrl: feature.properties.url ?? null,
      rawPayload: feature,
    });
  }

  return items;
}
