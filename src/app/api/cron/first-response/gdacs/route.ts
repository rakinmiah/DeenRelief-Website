/**
 * GET /api/cron/first-response/gdacs
 *
 * Cron-driven ingester for the GDACS RSS feed. Vercel Cron triggers
 * this on the schedule defined in vercel.json. Auth via CRON_SECRET
 * bearer token (same pattern as the existing /api/cron/* routes).
 *
 * Behaviour:
 *   - Fetches the latest GDACS RSS (≤50 items per Vercel timeout).
 *   - For each item: dedupe via external_id, otherwise insert into
 *     emergency_events with matched_campaigns pre-computed.
 *   - Returns JSON aggregate counts for cron-log inspection.
 *
 * Failure modes:
 *   - GDACS feed down → 503-ish HTTP from the fetch. We return 200
 *     with an error message so Vercel doesn't retry-spam (Vercel
 *     does NOT auto-retry cron jobs, but this keeps the dashboard
 *     clean either way).
 *   - Individual item parse errors are caught per-item inside the
 *     batch helper; one bad event doesn't kill the whole run.
 */

import { NextResponse } from "next/server";
import { requireCronAuth } from "@/lib/admin-auth";
import { ingestBatch } from "@/lib/first-response-ingest";
import { fetchGdacsEvents } from "@/lib/signal-sources/gdacs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const auth = requireCronAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const events = await fetchGdacsEvents();
    const counts = await ingestBatch(events);
    return NextResponse.json({
      ok: true,
      source: "gdacs",
      ...counts,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[cron/first-response/gdacs] failed:", err);
    return NextResponse.json({ ok: false, source: "gdacs", error: message });
  }
}
