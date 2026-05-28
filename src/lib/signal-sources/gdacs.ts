/**
 * GDACS (Global Disaster Alert and Coordination System) signal source.
 *
 * GDACS publishes a public RSS feed of natural-disaster events with
 * an alert level (Green/Orange/Red). Free, no API key, refreshed every
 * ~15 min. The richest open humanitarian-disaster feed available.
 *
 * Feed: https://www.gdacs.org/xml/rss.xml
 *
 * We extract custom <gdacs:*> namespace fields via rss-parser's
 * customFields config, then map alert level → numeric severity:
 *
 *   Green  → 1  (advisory only; we ingest but score low)
 *   Orange → 2  (significant — usually worth a launch decision)
 *   Red    → 3  (major — first-mover advantage matters)
 *
 * GDACS event types map cleanly to our vocabulary:
 *   EQ  → 'earthquake'
 *   TC  → 'cyclone'        (tropical cyclone)
 *   FL  → 'flood'
 *   VO  → 'volcano'
 *   DR  → 'drought'
 *   WF  → 'wildfire'
 *
 * Anything else passes through as the raw GDACS code so we don't lose
 * data — it just won't match any coverage_map row until we extend the
 * vocabulary.
 */

import Parser from "rss-parser";
import type { EmergencyEventInput } from "../first-response-ingest";

const FEED_URL = "https://www.gdacs.org/xml/rss.xml";

const ALERT_LEVEL_SEVERITY: Record<string, number> = {
  Green: 1,
  Orange: 2,
  Red: 3,
};

const EVENT_TYPE_MAP: Record<string, string> = {
  EQ: "earthquake",
  TC: "cyclone",
  FL: "flood",
  VO: "volcano",
  DR: "drought",
  WF: "wildfire",
};

interface GdacsItem {
  title?: string;
  link?: string;
  contentSnippet?: string;
  isoDate?: string;
  "gdacs:eventid"?: string;
  "gdacs:eventtype"?: string;
  "gdacs:alertlevel"?: string;
  "gdacs:country"?: string;
  "gdacs:iso3"?: string;
}

const parser = new Parser<unknown, GdacsItem>({
  customFields: {
    item: [
      ["gdacs:eventid", "gdacs:eventid"],
      ["gdacs:eventtype", "gdacs:eventtype"],
      ["gdacs:alertlevel", "gdacs:alertlevel"],
      ["gdacs:country", "gdacs:country"],
      ["gdacs:iso3", "gdacs:iso3"],
    ],
  },
});

/**
 * Convert an ISO 3166-1 alpha-3 country code (GDACS uses these) to
 * the alpha-2 code we store in country_iso. Hand-rolled minimal map
 * for the countries DR has any coverage in — others pass through as
 * the raw alpha-3, which won't match the coverage_map but stays
 * visible in the raw_payload for forensic look-ups.
 */
const ISO3_TO_ISO2: Record<string, string> = {
  BGD: "BD",
  PAK: "PK",
  SYR: "SY",
  IND: "IN",
  PSE: "PS",
  GBR: "GB",
  // Common adjacent geographies we may eventually expand coverage to.
  AFG: "AF",
  YEM: "YE",
  SDN: "SD",
  SOM: "SO",
  MMR: "MM",
  TUR: "TR",
  LBN: "LB",
  JOR: "JO",
  EGY: "EG",
  IDN: "ID",
  IRQ: "IQ",
  IRN: "IR",
};

function normaliseCountry(iso3: string | undefined): string | null {
  if (!iso3) return null;
  const trimmed = iso3.trim().toUpperCase();
  // GDACS sometimes returns multi-country events with semicolon-
  // separated codes. We pick the first one — usually the primary
  // affected country.
  const first = trimmed.split(/[;,]/)[0]?.trim();
  if (!first) return null;
  return ISO3_TO_ISO2[first] ?? first;
}

export async function fetchGdacsEvents(): Promise<EmergencyEventInput[]> {
  const feed = await parser.parseURL(FEED_URL);
  const items: EmergencyEventInput[] = [];

  for (const item of feed.items ?? []) {
    const eventId = item["gdacs:eventid"];
    if (!eventId) continue; // skip malformed items

    const alertLevel = item["gdacs:alertlevel"] ?? "Green";
    const severityRaw = ALERT_LEVEL_SEVERITY[alertLevel] ?? 1;

    const rawType = (item["gdacs:eventtype"] ?? "").toUpperCase();
    const eventType = EVENT_TYPE_MAP[rawType] ?? null;

    const countryIso = normaliseCountry(item["gdacs:iso3"]);
    const region = item["gdacs:country"]?.split(/[;,]/)[0]?.trim() ?? null;

    items.push({
      externalId: `gdacs:${eventId}`,
      source: "gdacs",
      eventType,
      countryIso,
      region,
      title: item.title?.trim() ?? "Untitled GDACS event",
      summary: item.contentSnippet?.trim() ?? null,
      severityRaw,
      sourceUrl: item.link ?? null,
      rawPayload: item,
    });
  }

  return items;
}
