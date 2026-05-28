/**
 * GET /api/cron/first-response/eonet
 *
 * Cron-driven NASA EONET ingester. Pulls curated natural-event
 * entries (wildfires, severe storms, landslides, volcanoes, drought)
 * from EONET's open-events feed.
 *
 * Cadence: every 60 min in vercel.json — EONET events change slowly,
 * usually multiple times per day at most. Hourly polling is the
 * right tempo.
 */

import { NextResponse } from "next/server";
import { requireCronAuth } from "@/lib/admin-auth";
import { ingestBatch } from "@/lib/first-response-ingest";
import { fetchEonetEvents } from "@/lib/signal-sources/eonet";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const auth = requireCronAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const events = await fetchEonetEvents();
    const counts = await ingestBatch(events);
    return NextResponse.json({ ok: true, source: "eonet", ...counts });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[cron/first-response/eonet] failed:", err);
    return NextResponse.json({ ok: false, source: "eonet", error: message });
  }
}
