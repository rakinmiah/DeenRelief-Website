/**
 * /api/admin/social-content/:eventId/charts
 *
 * Lazy chart-data endpoint for the deck-builder Charts panel. Only hit when the
 * panel's deterministic (cached) data is too thin — so Claude runs at most once
 * per event, and only if the SMM opens Charts on a data-poor report. The result
 * is cached in the event's draft_content_blocks jsonb (`_charts` sibling), so
 * re-opens cost zero tokens.
 *
 *   GET/POST → { eventId, bundle: ChartBundle, cached: boolean }
 */

import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-session";
import { getEmergencyEventById } from "@/lib/first-response";
import { extractChartsForEvent } from "@/lib/social-charts-extraction";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function run(eventId: string): Promise<NextResponse> {
  await requireAdminSession();
  const event = await getEmergencyEventById(eventId);
  if (!event) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }
  try {
    const { bundle, cached } = await extractChartsForEvent(event);
    return NextResponse.json({ eventId, bundle, cached });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[social-content/charts] failed for event ${eventId}:`, message);
    // Soft-fail: the panel keeps its deterministic data, so 200 with an empty
    // bundle is friendlier than a 500 that would surface an error toast.
    return NextResponse.json({
      eventId,
      bundle: { series: [], parts: [], trends: [], singles: [], ratios: [] },
      cached: false,
      error: "Chart extraction failed.",
      detail: message,
    });
  }
}

export async function GET(_request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  return run(eventId);
}

export async function POST(_request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  return run(eventId);
}
