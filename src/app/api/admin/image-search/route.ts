/**
 * GET /api/admin/image-search?q=<query>&page=<n>
 *
 * Free-to-use web image search for the deck-builder editor. Aggregates
 * Openverse (keyless, CC0/PD/CC-BY) + Pexels + Unsplash (when keyed) and
 * returns results in the ImageCandidate shape the image panel already
 * renders — plus per-result licence + credit.
 */

import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-session";
import { searchWebImages } from "@/lib/image-search";
import { SEARCH_UA } from "@/lib/image-search/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(request: Request) {
  await requireAdminSession();
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  const page = Math.max(1, Math.min(20, Number(searchParams.get("page") ?? "1") || 1));

  // Temporary diagnostic: ?debug=1 reports exactly what Openverse returns
  // from this (Vercel) IP + which keys are configured.
  if (searchParams.get("debug") === "1") {
    const url = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(
      q || "gaza"
    )}&license=cc0,pdm,by&page_size=3&mature=false`;
    let openverse: unknown;
    try {
      const r = await fetch(url, {
        headers: { "User-Agent": SEARCH_UA },
        signal: AbortSignal.timeout(12000),
      });
      const text = await r.text();
      openverse = { status: r.status, bodyHead: text.slice(0, 500) };
    } catch (e) {
      openverse = { error: e instanceof Error ? e.message : String(e) };
    }
    return NextResponse.json({
      openverse,
      keys: {
        pexels: !!process.env.PEXELS_API_KEY,
        unsplash: !!process.env.UNSPLASH_ACCESS_KEY,
        openverseToken: !!process.env.OPENVERSE_API_TOKEN,
      },
    });
  }

  if (!q) {
    return NextResponse.json({ query: "", page, results: [], sources: [] });
  }

  try {
    const data = await searchWebImages(q, page);
    return NextResponse.json(data, {
      headers: { "Cache-Control": "private, max-age=120" },
    });
  } catch (err) {
    console.error("[image-search] failed:", err);
    return NextResponse.json(
      { error: "Image search failed.", results: [], sources: [] },
      { status: 500 }
    );
  }
}
