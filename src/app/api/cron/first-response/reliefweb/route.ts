/**
 * GET /api/cron/first-response/reliefweb
 *
 * Cron-driven ingester for ReliefWeb humanitarian situation reports.
 * Same auth + behaviour pattern as /api/cron/first-response/gdacs.
 */

import { NextResponse } from "next/server";
import { requireCronAuth } from "@/lib/admin-auth";
import { ingestBatch } from "@/lib/first-response-ingest";
import { fetchReliefWebEvents } from "@/lib/signal-sources/reliefweb";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const auth = requireCronAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const events = await fetchReliefWebEvents();
    const counts = await ingestBatch(events);
    return NextResponse.json({
      ok: true,
      source: "reliefweb",
      ...counts,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[cron/first-response/reliefweb] failed:", err);
    return NextResponse.json({ ok: false, source: "reliefweb", error: message });
  }
}
