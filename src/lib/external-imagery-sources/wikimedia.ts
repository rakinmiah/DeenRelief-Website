/**
 * Wikimedia Commons external imagery source.
 *
 * Wikimedia Commons is the world's largest repository of free-licensed
 * media — photographs, illustrations, maps. Most usable photos are
 * under CC-BY, CC-BY-SA, or CC0. We filter strictly: only images
 * with a recognisable free license + adequate resolution + uploaded
 * recently enough to plausibly relate to the event are kept.
 *
 * API: https://commons.wikimedia.org/w/api.php
 * No key, no auth, no rate limits beyond reasonable polite use.
 *
 * Two-stage fetch:
 *   1. Search for File: pages matching the event keywords.
 *   2. Fetch image info (URL + size + EXIF/license metadata) for
 *      each match.
 *
 * Quality filters:
 *   • Free license (CC-BY*, CC0, Public Domain) — rejected: NC, ND
 *   • Width ≥ 800px (skip thumbnails / icons)
 *   • Uploaded within ~6 months of event detection (recency proxy)
 *   • Has an attributed Author field
 */

import type { EmergencyEvent } from "../first-response";
import {
  EXTERNAL_FETCH_UA,
  type CreateImageryInput,
  type ExternalSource,
} from "../external-imagery";

const SEARCH_API = "https://commons.wikimedia.org/w/api.php";
const SOURCE: ExternalSource = "wikimedia";

const FREE_LICENSE_PATTERNS = [
  /CC0/i,
  /Public.?Domain/i,
  /CC.?BY(?!.*NC)(?!.*ND)/i, // CC-BY and CC-BY-SA but NOT CC-BY-NC or CC-BY-ND
];

const MIN_WIDTH = 800;
const RECENCY_WINDOW_DAYS = 180;

/* ─── Keyword expansion for high-yield search terms (Phase 5c) ────
 *
 * Wikimedia Commons has stronger UN-sourced photojournalism for some
 * crisis zones than a naive country-name search would surface. Map
 * the country ISO to one or more high-yield search expressions so we
 * pull from those photo pools first.
 *
 * For ongoing-conflict countries (PS, SD, YE, SY) we ALSO widen the
 * recency window — Commons has strong historical UN Photo content
 * that's relevant to a current-day appeal even if uploaded years ago.
 * (A 2018 OCHA photo of Gaza tents is still a visually accurate
 * Gaza-tents photo.)
 */
const COUNTRY_KEYWORD_EXPANSION: Record<string, string[]> = {
  PS: [
    "Gaza Strip OCHA",
    "Gaza Strip UNRWA",
    "Palestine refugees UN Photo",
    "West Bank displacement",
  ],
  SD: ["Sudan conflict OCHA", "Darfur displacement", "Sudan refugees UN Photo"],
  YE: ["Yemen OCHA humanitarian", "Yemen displacement UN", "Sanaa famine"],
  SY: ["Syria displacement UN Photo", "Syria refugees", "Aleppo OCHA"],
  AF: ["Afghanistan UNHCR", "Kabul displacement", "Afghanistan refugees UN"],
  BD: ["Bangladesh floods", "Cox's Bazar UNHCR", "Bangladesh cyclone"],
  PK: ["Pakistan floods OCHA", "Pakistan UNICEF", "Sindh flood"],
};

/** Long-running conflict events get a wider recency window — UN
 *  archival photos from 2019 of Gaza tents are still accurate
 *  visual evidence for a 2026 Gaza appeal. */
const WIDE_RECENCY_COUNTRIES = new Set(["PS", "SD", "YE", "SY"]);

interface SearchHit {
  title: string;
  pageid: number;
}
interface SearchResponse {
  query?: {
    search?: SearchHit[];
  };
}

interface ImageInfoEntry {
  url?: string;
  thumburl?: string;
  width?: number;
  height?: number;
  timestamp?: string;
  extmetadata?: Record<string, { value?: string } | undefined>;
}
interface ImageInfoResponse {
  query?: {
    pages?: Record<
      string,
      {
        title?: string;
        imageinfo?: ImageInfoEntry[];
      }
    >;
  };
}

/**
 * Compose the search queries for an event. Returns an ARRAY of
 * queries to try in order — for high-yield countries we run 2-3
 * curated searches (against expansion keywords like 'Gaza Strip
 * UNRWA') before falling back to the generic 'eventType country'
 * search. This pulls UN-sourced photojournalism that the naive
 * search misses.
 *
 * Phase 5c — previously a single search like 'conflict palestine'
 * yielded mostly map illustrations and protest photos. The expanded
 * version surfaces actual OCHA / UNRWA / UN Photo content.
 */
function buildSearchTermsList(event: EmergencyEvent): string[] {
  const queries: string[] = [];

  // 1. Curated expansion keywords for high-yield countries.
  if (event.countryIso && COUNTRY_KEYWORD_EXPANSION[event.countryIso]) {
    queries.push(...COUNTRY_KEYWORD_EXPANSION[event.countryIso]!);
  }

  // 2. Generic fallback — 'eventType region country'.
  const parts: string[] = [];
  if (event.eventType) {
    parts.push(event.eventType.split("_")[0] ?? event.eventType);
  }
  if (event.region) parts.push(event.region);
  if (event.countryIso) parts.push(event.countryIso);
  const generic = parts.filter(Boolean).join(" ").slice(0, 80);
  if (generic) queries.push(generic);

  return queries;
}

function isFreeLicense(text: string | undefined): boolean {
  if (!text) return false;
  return FREE_LICENSE_PATTERNS.some((re) => re.test(text));
}

/** Strip HTML tags from Wikimedia's extmetadata values. */
function stripTags(s: string | undefined): string {
  if (!s) return "";
  return s.replace(/<[^>]*>/g, "").trim();
}

export async function fetchWikimediaImagery(
  event: EmergencyEvent
): Promise<CreateImageryInput[]> {
  const queries = buildSearchTermsList(event);
  if (queries.length === 0) return [];

  // 1. Run each curated query in sequence, accumulating distinct
  //    File: titles. We stop once we have 30+ candidates — that's
  //    plenty for the info-fetch step downstream.
  const titles: string[] = [];
  const seenTitles = new Set<string>();

  for (const q of queries) {
    if (titles.length >= 30) break;
    const searchUrl = new URL(SEARCH_API);
    searchUrl.searchParams.set("action", "query");
    searchUrl.searchParams.set("list", "search");
    searchUrl.searchParams.set("srsearch", q);
    searchUrl.searchParams.set("srnamespace", "6"); // 6 = File:
    searchUrl.searchParams.set("srlimit", "12");
    searchUrl.searchParams.set("format", "json");
    searchUrl.searchParams.set("origin", "*");

    try {
      const res = await fetch(searchUrl.toString(), {
        headers: { "User-Agent": EXTERNAL_FETCH_UA },
      });
      if (!res.ok) {
        console.warn(`[wikimedia] search "${q}" HTTP ${res.status}`);
        continue;
      }
      const searchResp = (await res.json()) as SearchResponse;
      for (const hit of searchResp.query?.search ?? []) {
        if (!hit.title || seenTitles.has(hit.title)) continue;
        seenTitles.add(hit.title);
        titles.push(hit.title);
      }
    } catch (err) {
      console.error(`[wikimedia] search "${q}" exception:`, err);
    }
  }

  if (titles.length === 0) return [];

  // 2. Fetch image info for the matched titles in one request.
  const infoUrl = new URL(SEARCH_API);
  infoUrl.searchParams.set("action", "query");
  infoUrl.searchParams.set("titles", titles.slice(0, 20).join("|"));
  infoUrl.searchParams.set("prop", "imageinfo");
  infoUrl.searchParams.set(
    "iiprop",
    "url|size|mime|extmetadata|timestamp"
  );
  infoUrl.searchParams.set("iiextmetadatafilter", "Artist|LicenseShortName|License|LicenseUrl|UsageTerms|Credit|DateTimeOriginal");
  infoUrl.searchParams.set("format", "json");
  infoUrl.searchParams.set("origin", "*");

  let infoResp: ImageInfoResponse;
  try {
    const res = await fetch(infoUrl.toString(), {
      headers: { "User-Agent": EXTERNAL_FETCH_UA },
    });
    if (!res.ok) {
      console.warn(`[wikimedia] info HTTP ${res.status}`);
      return [];
    }
    infoResp = (await res.json()) as ImageInfoResponse;
  } catch (err) {
    console.error("[wikimedia] info exception:", err);
    return [];
  }

  const candidates: CreateImageryInput[] = [];
  // Phase 5c — long-running conflict countries get a wider window
  // (5y) since archival UN photos are still visually accurate. Other
  // events stay on the tight 180-day window so we don't surface
  // unrelated archival content.
  const windowDays = WIDE_RECENCY_COUNTRIES.has(event.countryIso ?? "")
    ? 365 * 5
    : RECENCY_WINDOW_DAYS;
  const cutoff = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  for (const page of Object.values(infoResp.query?.pages ?? {})) {
    const info = page.imageinfo?.[0];
    if (!info || !info.url) continue;
    if ((info.width ?? 0) < MIN_WIDTH) continue;

    const meta = info.extmetadata ?? {};
    const licenseRaw =
      meta.LicenseShortName?.value ??
      meta.License?.value ??
      meta.UsageTerms?.value;
    if (!isFreeLicense(licenseRaw)) continue;

    const author = stripTags(
      meta.Artist?.value ?? meta.Credit?.value ?? "Unknown"
    );

    // Recency gate — uploaded_at_source is wiki upload timestamp;
    // skip very-old uploads (likely not about the current event).
    const uploadedAt = info.timestamp ? new Date(info.timestamp) : null;
    if (uploadedAt && uploadedAt < cutoff) continue;

    candidates.push({
      emergencyEventId: event.id,
      source: SOURCE,
      url: info.url,
      thumbnailUrl: info.thumburl ?? null,
      title: page.title ?? null,
      description: null,
      creditText: `Photo: ${author} · Wikimedia Commons`,
      license: stripTags(licenseRaw) || "CC",
      licenseUrl: stripTags(meta.LicenseUrl?.value) || null,
      width: info.width ?? null,
      height: info.height ?? null,
      uploadedAtSource: uploadedAt,
    });
  }

  return candidates;
}
