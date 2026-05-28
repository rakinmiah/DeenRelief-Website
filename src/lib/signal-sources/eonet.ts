/**
 * NASA EONET (Earth Observatory Natural Event Tracker) signal source.
 *
 * EONET is NASA's curated feed of significant natural events —
 * wildfires, severe storms, landslides, volcanic activity, drought.
 * Curated means much lower volume than raw satellite feeds (FIRMS,
 * MODIS) while still catching events that GDACS sometimes misses or
 * lags on. Good supplementary signal, not primary.
 *
 * API: https://eonet.gsfc.nasa.gov/api/v3/events
 *
 * Free, no API key, no auth.
 *
 * Country resolution: EONET events include lat/lng coordinates but
 * not country codes. We bounding-box-match against DR's coverage
 * countries + adjacent diaspora geographies. Events outside these
 * bboxes get country_iso=null (no coverage match → score 0 →
 * filtered out by dashboard).
 */

import type { EmergencyEventInput } from "../first-response-ingest";

const API_URL =
  "https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=50&days=14";

/**
 * EONET category ID/title mapped to our event-type vocabulary.
 * Anything not mapped passes through as null event_type.
 */
const CATEGORY_MAP: Record<string, string> = {
  wildfires: "wildfire",
  severeStorms: "cyclone",
  volcanoes: "volcano",
  drought: "drought",
  landslides: "landslide",
  floods: "flood",
  earthquakes: "earthquake", // overlaps with USGS — dedupe via external_id prefix
  snow: "cold_snap",
  tempExtremes: "heatwave",
  seaLakeIce: "cold_snap",
};

/**
 * Coarse country bounding boxes for DR coverage + diaspora-adjacent
 * geographies. NOT precise borders — meant for "this event is roughly
 * in country X" classification. Overlaps (Israel/Palestine, India/
 * Pakistan border zones) resolve in array order, so more-specific
 * boxes come first.
 *
 * Format: { iso, bounds: [minLat, maxLat, minLng, maxLng] }
 */
const COUNTRY_BBOXES: { iso: string; bounds: [number, number, number, number] }[] = [
  // Order matters — more specific first.
  { iso: "PS", bounds: [31.2, 32.6, 34.2, 35.7] }, // Palestine + Gaza
  { iso: "LB", bounds: [33.0, 34.7, 35.1, 36.7] },
  { iso: "SY", bounds: [32.3, 37.4, 35.7, 42.4] },
  { iso: "JO", bounds: [29.2, 33.4, 34.9, 39.3] },
  { iso: "IQ", bounds: [29.0, 37.4, 38.8, 48.8] },
  { iso: "IR", bounds: [25.0, 39.8, 44.0, 63.3] },
  { iso: "AF", bounds: [29.4, 38.5, 60.5, 74.9] },
  { iso: "PK", bounds: [23.6, 37.1, 60.9, 77.0] },
  { iso: "BD", bounds: [20.5, 26.7, 88.0, 92.7] },
  { iso: "MM", bounds: [9.5, 28.6, 92.2, 101.2] },
  { iso: "IN", bounds: [6.7, 35.7, 68.1, 97.4] },
  { iso: "YE", bounds: [12.0, 19.0, 42.5, 54.6] },
  { iso: "SD", bounds: [9.0, 22.0, 21.8, 38.7] },
  { iso: "SO", bounds: [-1.7, 12.0, 40.9, 51.6] },
  { iso: "EG", bounds: [22.0, 31.7, 24.7, 36.9] },
  { iso: "TR", bounds: [35.8, 42.1, 25.7, 44.8] },
  { iso: "ID", bounds: [-11.0, 6.1, 95.0, 141.0] },
  { iso: "MA", bounds: [27.7, 35.9, -13.2, -1.0] },
  { iso: "GB", bounds: [49.9, 60.9, -8.2, 1.8] },
];

function bboxLookup(lat: number, lng: number): string | null {
  for (const c of COUNTRY_BBOXES) {
    if (
      lat >= c.bounds[0] &&
      lat <= c.bounds[1] &&
      lng >= c.bounds[2] &&
      lng <= c.bounds[3]
    ) {
      return c.iso;
    }
  }
  return null;
}

interface EonetGeometry {
  date?: string;
  type?: string;
  coordinates?: number[] | number[][] | number[][][];
}

interface EonetCategory {
  id?: string;
  title?: string;
}

interface EonetSource {
  id?: string;
  url?: string;
}

interface EonetEvent {
  id: string;
  title: string;
  description?: string | null;
  link?: string | null;
  closed?: string | null;
  categories?: EonetCategory[];
  sources?: EonetSource[];
  geometry?: EonetGeometry[];
}

interface EonetResponse {
  events?: EonetEvent[];
}

/**
 * Extract a representative [lat, lng] from EONET geometry. EONET
 * uses GeoJSON, so coordinates can be Point [lng, lat], LineString,
 * Polygon, etc. We take the FIRST point we can find — events with
 * track geometry (cyclones, wildfires that have moved) use the
 * most recent position which is what we want.
 */
function extractFirstPoint(
  geometry: EonetGeometry[] | undefined
): [number, number] | null {
  if (!geometry || geometry.length === 0) return null;
  // Most recent geometry entry is typically last in the array.
  const latest = geometry[geometry.length - 1];
  if (!latest?.coordinates) return null;
  const c = latest.coordinates;
  // Point: [lng, lat]
  if (typeof c[0] === "number" && typeof c[1] === "number") {
    return [c[1] as number, c[0] as number];
  }
  // Polygon or MultiPolygon: drill in to find a Point.
  const flat: number[] = [];
  function collect(node: unknown) {
    if (Array.isArray(node)) {
      if (node.length === 2 && typeof node[0] === "number" && typeof node[1] === "number") {
        flat.push(node[1] as number, node[0] as number);
      } else {
        for (const child of node) collect(child);
      }
    }
  }
  collect(c);
  if (flat.length >= 2) return [flat[0]!, flat[1]!];
  return null;
}

export async function fetchEonetEvents(): Promise<EmergencyEventInput[]> {
  const res = await fetch(API_URL, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`EONET API HTTP ${res.status}`);
  }
  const data = (await res.json()) as EonetResponse;
  const items: EmergencyEventInput[] = [];

  for (const event of data.events ?? []) {
    if (!event.title) continue;
    // Skip events that have been marked closed by NASA — historical
    // entries, no longer ongoing.
    if (event.closed) continue;

    const categoryId = event.categories?.[0]?.id ?? "";
    const eventType = CATEGORY_MAP[categoryId] ?? null;

    const point = extractFirstPoint(event.geometry);
    const countryIso = point ? bboxLookup(point[0], point[1]) : null;
    const region = point
      ? `${point[0].toFixed(2)},${point[1].toFixed(2)}`
      : null;

    // EONET doesn't carry severity numerically — wildfires don't have
    // magnitude, severeStorms don't have a fixed scale. Use a fixed
    // baseline of 2 (matching ReliefWeb) — the scoring engine
    // multiplies by coverage_weight + diaspora + Muslim multipliers,
    // so events in DR-covered countries still score appropriately.
    const severityRaw = 2;

    items.push({
      externalId: `eonet:${event.id}`,
      source: "eonet",
      eventType,
      countryIso,
      region,
      title: event.title.trim(),
      summary:
        event.description?.replace(/\s+/g, " ").trim().slice(0, 280) ?? null,
      severityRaw,
      sourceUrl: event.link ?? event.sources?.[0]?.url ?? null,
      rawPayload: event,
    });
  }

  return items;
}
