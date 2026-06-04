/**
 * Pexels — high-quality modern stock. The Pexels Licence is free for
 * commercial use with no attribution required (we still show a credit as
 * good practice). Key-gated: returns [] when PEXELS_API_KEY isn't set, so
 * the search degrades to the other sources until the key is added.
 */

import {
  SEARCH_UA,
  classifyOrientation,
  type WebImageResult,
} from "./types";

type PexelsPhoto = {
  id: number;
  width?: number | null;
  height?: number | null;
  url?: string | null;
  alt?: string | null;
  photographer?: string | null;
  src?: {
    original?: string;
    large2x?: string;
    large?: string;
    medium?: string;
    small?: string;
    tiny?: string;
  };
};

export async function searchPexels(
  query: string,
  page = 1,
  perPage = 24
): Promise<WebImageResult[]> {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return [];

  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(
    query
  )}&per_page=${perPage}&page=${page}`;

  let json: { photos?: PexelsPhoto[] };
  try {
    const res = await fetch(url, {
      headers: { Authorization: key, "User-Agent": SEARCH_UA },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) {
      console.warn(`[pexels] HTTP ${res.status}`);
      return [];
    }
    json = (await res.json()) as { photos?: PexelsPhoto[] };
  } catch (err) {
    console.error("[pexels] fetch failed:", err);
    return [];
  }

  const out: WebImageResult[] = [];
  for (const p of json.photos ?? []) {
    const full = p.src?.large2x ?? p.src?.large ?? p.src?.original;
    if (!full) continue;
    out.push({
      id: `web:pexels:${p.id}`,
      source: "external",
      url: full,
      thumbnailUrl: p.src?.medium ?? p.src?.small ?? p.src?.tiny ?? null,
      width: p.width ?? null,
      height: p.height ?? null,
      orientation: classifyOrientation(p.width, p.height),
      creditText: `Photo: ${(p.photographer || "Unknown").trim()} · Pexels`,
      description: p.alt || null,
      license: "Pexels",
      sourceLabel: "Pexels",
      attributionUrl: p.url ?? null,
      downloadLocation: null,
    });
  }
  return out;
}
