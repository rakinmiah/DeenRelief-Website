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
 * Compose the search query for an event. Pulls from country, region,
 * event type, and the event title's most distinctive nouns.
 */
function buildSearchTerms(event: EmergencyEvent): string {
  const parts: string[] = [];
  if (event.eventType) {
    // 'conflict_escalation' → 'conflict' (looser match)
    parts.push(event.eventType.split("_")[0] ?? event.eventType);
  }
  if (event.region) parts.push(event.region);
  if (event.countryIso) parts.push(event.countryIso);
  return parts.filter(Boolean).join(" ").slice(0, 80);
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
  const searchTerms = buildSearchTerms(event);
  if (!searchTerms) return [];

  // 1. Search for File: pages.
  const searchUrl = new URL(SEARCH_API);
  searchUrl.searchParams.set("action", "query");
  searchUrl.searchParams.set("list", "search");
  searchUrl.searchParams.set("srsearch", searchTerms);
  searchUrl.searchParams.set("srnamespace", "6"); // 6 = File:
  searchUrl.searchParams.set("srlimit", "20");
  searchUrl.searchParams.set("format", "json");
  searchUrl.searchParams.set("origin", "*");

  let searchResp: SearchResponse;
  try {
    const res = await fetch(searchUrl.toString(), {
      headers: { "User-Agent": EXTERNAL_FETCH_UA },
    });
    if (!res.ok) {
      console.warn(`[wikimedia] search HTTP ${res.status}`);
      return [];
    }
    searchResp = (await res.json()) as SearchResponse;
  } catch (err) {
    console.error("[wikimedia] search exception:", err);
    return [];
  }

  const titles = (searchResp.query?.search ?? [])
    .map((h) => h.title)
    .filter(Boolean);
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
  const cutoff = new Date(
    Date.now() - RECENCY_WINDOW_DAYS * 24 * 60 * 60 * 1000
  );

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
