/**
 * Unsplash — high-quality modern stock. The Unsplash Licence is free for
 * commercial use, no permission needed (we still show a credit). Key-gated:
 * returns [] without UNSPLASH_ACCESS_KEY.
 *
 * API ToS: when an image is actually USED, the app must ping its
 * `download_location`. We carry that on the result and the panel fires it on
 * pick (see /api/admin/image-search/track).
 */

import {
  SEARCH_UA,
  classifyOrientation,
  type WebImageResult,
} from "./types";

type UnsplashPhoto = {
  id: string;
  width?: number | null;
  height?: number | null;
  description?: string | null;
  alt_description?: string | null;
  urls?: { full?: string; regular?: string; small?: string; thumb?: string };
  links?: { html?: string; download_location?: string };
  user?: { name?: string | null; links?: { html?: string } };
};

export async function searchUnsplash(
  query: string,
  page = 1,
  perPage = 24
): Promise<WebImageResult[]> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return [];

  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(
    query
  )}&per_page=${perPage}&page=${page}&content_filter=high`;

  let json: { results?: UnsplashPhoto[] };
  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Client-ID ${key}`,
        "Accept-Version": "v1",
        "User-Agent": SEARCH_UA,
      },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) {
      console.warn(`[unsplash] HTTP ${res.status}`);
      return [];
    }
    json = (await res.json()) as { results?: UnsplashPhoto[] };
  } catch (err) {
    console.error("[unsplash] fetch failed:", err);
    return [];
  }

  const out: WebImageResult[] = [];
  for (const p of json.results ?? []) {
    const full = p.urls?.regular ?? p.urls?.full;
    if (!full) continue;
    out.push({
      id: `web:unsplash:${p.id}`,
      source: "external",
      url: full,
      thumbnailUrl: p.urls?.small ?? p.urls?.thumb ?? null,
      width: p.width ?? null,
      height: p.height ?? null,
      orientation: classifyOrientation(p.width, p.height),
      creditText: `Photo: ${(p.user?.name || "Unknown").trim()} · Unsplash`,
      description: p.alt_description || p.description || null,
      license: "Unsplash",
      sourceLabel: "Unsplash",
      attributionUrl: p.links?.html ?? null,
      downloadLocation: p.links?.download_location ?? null,
    });
  }
  return out;
}

/** ToS compliance: ping an Unsplash download_location when an image is used. */
export async function trackUnsplashDownload(downloadLocation: string): Promise<void> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key || !downloadLocation.startsWith("https://api.unsplash.com/")) return;
  try {
    await fetch(downloadLocation, {
      headers: {
        Authorization: `Client-ID ${key}`,
        "Accept-Version": "v1",
        "User-Agent": SEARCH_UA,
      },
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    /* analytics ping — non-fatal */
  }
}
