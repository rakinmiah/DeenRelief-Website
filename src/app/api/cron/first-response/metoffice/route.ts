/**
 * GET /api/cron/first-response/metoffice
 *
 * Cron-driven UK severe-weather ingester via MeteoAlarm's Atom feed.
 * Filters to Brighton-relevant regions only (SE England, Sussex,
 * Kent, London) so we don't flood the dashboard with Scotland +
 * Wales warnings DR has no operational reach for.
 *
 * Cadence: every 60 min in vercel.json — Met Office warnings update
 * a few times per day, hourly polling is appropriate.
 */

import { NextResponse } from "next/server";
import { requireCronAuth } from "@/lib/admin-auth";
import { ingestBatch } from "@/lib/first-response-ingest";
import { fetchMeteoOfficeEvents } from "@/lib/signal-sources/metoffice";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const auth = requireCronAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const events = await fetchMeteoOfficeEvents();
    const counts = await ingestBatch(events);
    return NextResponse.json({ ok: true, source: "metoffice", ...counts });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[cron/first-response/metoffice] failed:", err);
    return NextResponse.json({ ok: false, source: "metoffice", error: message });
  }
}
