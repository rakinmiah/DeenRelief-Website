/**
 * UK severe weather warnings via MeteoAlarm.
 *
 * The UK Met Office publishes its Yellow/Amber/Red warnings to the
 * EU MeteoAlarm aggregator, which exposes a free Atom feed per
 * country. No API key, no auth, ~hourly update cadence.
 *
 * Feed: https://feeds.meteoalarm.org/feeds/meteoalarm-legacy-atom-united-kingdom
 *
 * Why this source: DR's uk-homeless campaign (Brighton seafront
 * outreach) intensifies during severe-weather events — cold snaps,
 * heatwaves, storms make rough-sleeping life-threatening. The SMM
 * needs warnings tagged to Brighton's region so she can launch
 * "outreach intensification" appeals at the right moment.
 *
 * Region filter: we only ingest warnings affecting south-east England
 * (Brighton's catchment) — Sussex, London, South East England,
 * Kent regions. UK-wide warnings (which name multiple regions) are
 * also kept. Scotland/Wales/Northern Ireland warnings are dropped
 * — DR has no operational reach there.
 *
 * Severity (from MeteoAlarm awareness_level):
 *   Yellow → 1
 *   Amber  → 2
 *   Red    → 3
 */

import Parser from "rss-parser";
import type { EmergencyEventInput } from "../first-response-ingest";

const FEED_URL =
  "https://feeds.meteoalarm.org/feeds/meteoalarm-legacy-atom-united-kingdom";

interface MeteoItem {
  title?: string;
  link?: string;
  contentSnippet?: string;
  content?: string;
  isoDate?: string;
  guid?: string;
}

const parser = new Parser<unknown, MeteoItem>({
  headers: {
    Accept: "application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
    "User-Agent":
      "DeenRelief-FirstResponse/1.0 (+https://deenrelief.org)",
  },
});

/**
 * Severity inference from warning title — MeteoAlarm titles follow
 * the pattern "Yellow Warning of Wind in <region>" / "Amber..." /
 * "Red...". Case-insensitive match.
 */
function inferSeverity(title: string): number {
  const lower = title.toLowerCase();
  if (lower.includes("red")) return 3;
  if (lower.includes("amber") || lower.includes("orange")) return 2;
  if (lower.includes("yellow")) return 1;
  return 1;
}

/**
 * Map weather hazard keywords in the title to our event_type
 * vocabulary. coverage_map.uk-homeless triggers on cold_snap,
 * heatwave, severe_weather.
 */
function inferEventType(title: string): string | null {
  const lower = title.toLowerCase();
  if (/\b(snow|ice|frost|cold|freezing)\b/.test(lower)) return "cold_snap";
  if (/\b(heat|hot)\b/.test(lower)) return "heatwave";
  if (
    /\b(wind|gale|storm|rain|thunder|lightning|fog|blizzard)\b/.test(lower)
  ) {
    return "severe_weather";
  }
  if (/\b(flood)\b/.test(lower)) return "flood";
  return null;
}

/**
 * Brighton-relevance filter. Drops warnings that don't affect DR's
 * uk-homeless catchment. South East England + London + Sussex + Kent
 * are kept; UK-wide warnings (which list multiple regions) usually
 * include South East England in their text so the keyword catches.
 */
const RELEVANT_REGION_KEYWORDS = [
  "south east england",
  "south-east england",
  "south east",
  "sussex",
  "brighton",
  "kent",
  "london",
];

function isRelevantRegion(text: string): boolean {
  const lower = text.toLowerCase();
  return RELEVANT_REGION_KEYWORDS.some((k) => lower.includes(k));
}

export async function fetchMeteoOfficeEvents(): Promise<
  EmergencyEventInput[]
> {
  const feed = await parser.parseURL(FEED_URL);
  const items: EmergencyEventInput[] = [];

  for (const item of feed.items ?? []) {
    const title = item.title?.trim();
    if (!title) continue;

    // Skip "no warnings in force" placeholder entries that MeteoAlarm
    // sometimes emits when nothing is active.
    if (/no\s+(active\s+)?warnings/i.test(title)) continue;

    const description =
      (item.contentSnippet ?? item.content ?? "").trim();
    const haystack = `${title} ${description}`;
    if (!isRelevantRegion(haystack)) continue;

    const severityRaw = inferSeverity(title);
    const eventType = inferEventType(title);

    // Tag with GB-BRT so coverage_map.uk-homeless matches via the
    // subdivision-prefix logic in matchesEvent().
    const countryIso = "GB-BRT";

    // Try to extract the named region for context. MeteoAlarm titles
    // typically include " in <region>" or " for <region>".
    const regionMatch = title.match(/(?:in|for|across)\s+([^,]+?)(?:$|,)/i);
    const region = regionMatch?.[1]?.trim() ?? "South East England";

    items.push({
      externalId: `metoffice:${item.guid ?? item.link ?? title}`,
      source: "metoffice",
      eventType,
      countryIso,
      region,
      title,
      summary: description.slice(0, 280) || null,
      severityRaw,
      sourceUrl: item.link ?? null,
      rawPayload: item,
    });
  }

  return items;
}
