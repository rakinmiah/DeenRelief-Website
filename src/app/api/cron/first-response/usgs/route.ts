/**
 * GET /api/cron/first-response/usgs
 *
 * Cron-driven ingester for USGS significant-earthquake GeoJSON feed.
 * Same auth + behaviour pattern as /api/cron/first-response/gdacs.
 */

import { NextResponse } from "next/server";
import { requireCronAuth } from "@/lib/admin-auth";
import { ingestBatch } from "@/lib/first-response-ingest";
import { fetchUsgsEvents } from "@/lib/signal-sources/usgs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const auth = requireCronAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const events = await fetchUsgsEvents();
    const counts = await ingestBatch(events);
    return NextResponse.json({
      ok: true,
      source: "usgs",
      ...counts,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[cron/first-response/usgs] failed:", err);
    return NextResponse.json({ ok: false, source: "usgs", error: message });
  }
}
