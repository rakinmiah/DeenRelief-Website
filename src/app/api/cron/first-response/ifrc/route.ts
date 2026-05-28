/**
 * GET /api/cron/first-response/ifrc
 *
 * Cron-driven IFRC GO ingester. Pulls recent emergencies from the
 * Red Crescent national-society operations API and feeds them
 * through ingestBatch. Auth via CRON_SECRET (same as the other
 * First Response crons).
 *
 * Cadence: every 30 min in vercel.json — IFRC GO publishes
 * situation reports, not real-time hazard alerts, so half-hourly
 * is the right tempo. Matches ReliefWeb.
 */

import { NextResponse } from "next/server";
import { requireCronAuth } from "@/lib/admin-auth";
import { ingestBatch } from "@/lib/first-response-ingest";
import { fetchIfrcEvents } from "@/lib/signal-sources/ifrc";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const auth = requireCronAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const events = await fetchIfrcEvents();
    const counts = await ingestBatch(events);
    return NextResponse.json({ ok: true, source: "ifrc", ...counts });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[cron/first-response/ifrc] failed:", err);
    return NextResponse.json({ ok: false, source: "ifrc", error: message });
  }
}
