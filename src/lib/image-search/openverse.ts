/**
 * Openverse — the keyless, open-licence image aggregator (Wikimedia, Flickr
 * CC, Smithsonian, the Met, Cleveland Museum, Science Museum, …). It's the
 * "free-to-use web image search" engine: one query, reliable licence
 * metadata, no API key required.
 *
 * LICENCE POLICY: `license=cc0,pdm,by` → CC0 + Public Domain Mark + CC-BY.
 * Deliberately EXCLUDES CC-BY-SA (share-alike is legally murky on a
 * composited post), NC and ND. The only obligation on results is showing
 * the credit, which the panel surfaces.
 */

import {
  SEARCH_UA,
  buildCredit,
  classifyOrientation,
  type WebImageResult,
} from "./types";

const OPENVERSE_ENDPOINT = "https://api.openverse.org/v1/images/";

/** Pretty source labels for the common providers; falls back to Title Case. */
function sourceLabel(source: string | null | undefined): string {
  const s = (source || "").toLowerCase();
  const map: Record<string, string> = {
    flickr: "Flickr",
    wikimedia: "Wikimedia",
    smithsonian: "Smithsonian",
    met: "The Met",
    clevelandmuseum: "Cleveland Museum",
    sciencemuseum: "Science Museum",
    rawpixel: "Rawpixel",
    nasa: "NASA",
    wordpress: "Openverse",
  };
  if (map[s]) return map[s];
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "Openverse";
}

/** Human licence label from Openverse's code + version. */
function licenseLabel(code: string | null | undefined, version: string | null | undefined): string {
  const c = (code || "").toLowerCase();
  if (c === "cc0") return "CC0";
  if (c === "pdm") return "Public Domain";
  if (c === "by") return version ? `CC BY ${version}` : "CC BY";
  return (code || "").toUpperCase() || "Open licence";
}

type OpenverseResult = {
  id: string;
  title?: string | null;
  creator?: string | null;
  url?: string | null;
  thumbnail?: string | null;
  width?: number | null;
  height?: number | null;
  license?: string | null;
  license_version?: string | null;
  source?: string | null;
  foreign_landing_url?: string | null;
};

export async function searchOpenverse(
  query: string,
  page = 1,
  pageSize = 24
): Promise<WebImageResult[]> {
  const url = new URL(OPENVERSE_ENDPOINT);
  url.searchParams.set("q", query);
  // CC0 + Public Domain + CC-BY — no share-alike / NC / ND.
  url.searchParams.set("license", "cc0,pdm,by");
  url.searchParams.set("page", String(page));
  url.searchParams.set("page_size", String(pageSize));
  url.searchParams.set("mature", "false");
  // A token raises the rate limit, but anonymous works for occasional use.
  const headers: Record<string, string> = { "User-Agent": SEARCH_UA };
  if (process.env.OPENVERSE_API_TOKEN) {
    headers.Authorization = `Bearer ${process.env.OPENVERSE_API_TOKEN}`;
  }

  let json: { results?: OpenverseResult[] };
  try {
    const res = await fetch(url.toString(), {
      headers,
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) {
      console.warn(`[openverse] HTTP ${res.status}`);
      return [];
    }
    json = (await res.json()) as { results?: OpenverseResult[] };
  } catch (err) {
    console.error("[openverse] fetch failed:", err);
    return [];
  }

  const out: WebImageResult[] = [];
  for (const r of json.results ?? []) {
    if (!r.url) continue;
    const src = sourceLabel(r.source);
    const license = licenseLabel(r.license, r.license_version);
    out.push({
      id: `web:openverse:${r.id}`,
      source: "external",
      url: r.url,
      thumbnailUrl: r.thumbnail ?? null,
      width: r.width ?? null,
      height: r.height ?? null,
      orientation: classifyOrientation(r.width, r.height),
      creditText: buildCredit(r.creator, src, license),
      description: r.title ?? null,
      license,
      sourceLabel: src,
      attributionUrl: r.foreign_landing_url ?? null,
      downloadLocation: null,
    });
  }
  return out;
}
