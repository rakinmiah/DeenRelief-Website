/**
 * Free-to-use web image search — fan out to every available source, merge,
 * de-dupe, and interleave so the grid mixes sources rather than showing 24
 * Openverse results then 24 Pexels. Each source is independent and
 * fault-tolerant: a slow / failing / unconfigured source just contributes
 * nothing. Openverse is keyless; Pexels + Unsplash light up when their keys
 * are set.
 */

import { searchOpenverse } from "./openverse";
import { searchPexels } from "./pexels";
import { searchUnsplash } from "./unsplash";
import type { WebImageResult } from "./types";

export type WebImageSearchResponse = {
  query: string;
  page: number;
  results: WebImageResult[];
  /** Which sources actually returned anything (for a UI hint). */
  sources: string[];
};

/** Round-robin merge of several lists into one, preserving each list's order. */
function interleave(lists: WebImageResult[][]): WebImageResult[] {
  const out: WebImageResult[] = [];
  const max = Math.max(0, ...lists.map((l) => l.length));
  for (let i = 0; i < max; i++) {
    for (const list of lists) {
      if (i < list.length) out.push(list[i]!);
    }
  }
  return out;
}

export async function searchWebImages(
  query: string,
  page = 1
): Promise<WebImageSearchResponse> {
  const q = query.trim();
  if (!q) return { query: q, page, results: [], sources: [] };

  const settled = await Promise.allSettled([
    searchOpenverse(q, page),
    searchPexels(q, page),
    searchUnsplash(q, page),
  ]);
  const labels = ["Openverse", "Pexels", "Unsplash"];
  const lists: WebImageResult[][] = [];
  const sources: string[] = [];
  settled.forEach((r, i) => {
    const v = r.status === "fulfilled" ? r.value : [];
    if (v.length) {
      lists.push(v);
      sources.push(labels[i]!);
    }
  });

  // De-dupe by image URL (different sources occasionally surface the same
  // Wikimedia/Flickr asset).
  const seen = new Set<string>();
  const merged = interleave(lists).filter((r) => {
    const key = r.url.split("?")[0]!;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return { query: q, page, results: merged, sources };
}
