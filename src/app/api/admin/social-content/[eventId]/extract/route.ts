/**
 * /api/admin/social-content/:eventId/extract
 *
 * Phase 6b — single-stage content extraction. Phase 6e integration
 * adds a GET variant that returns the flattened `cards` array the
 * deck-builder Compose UI consumes directly.
 *
 *   GET  → { eventId, cards: Array<{id, card: ContentCard}>, usage }
 *          Used by the Compose page on load.
 *   POST → same shape as GET. Kept for callers that prefer the
 *          POST verb for "extract" (it's a write-through cache).
 *
 * Both paths call the same extractContentBlocksWithDefaultClient
 * function under the hood. The per-event SHA-256 cache on
 * emergency_events.draft_content_blocks means a Compose-page reload
 * costs zero Claude tokens.
 */

import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-session";
import { getEmergencyEventById } from "@/lib/first-response";
import {
  extractContentBlocksWithDefaultClient,
  flattenBlocksToCards,
} from "@/lib/social-content-extraction";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function run(eventId: string) {
  await requireAdminSession();
  const event = await getEmergencyEventById(eventId);
  if (!event) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }
  try {
    const { blocks, inputTokens, outputTokens } =
      await extractContentBlocksWithDefaultClient(event);
    const cards = flattenBlocksToCards(blocks);
    return NextResponse.json({
      eventId,
      blocks,
      cards,
      // Comparable data series for charts (0–3). Absent on legacy cached
      // extractions → []. The deck builder falls back to fact-clustering.
      chartSeries: blocks.chart_series ?? [],
      usage: { inputTokens, outputTokens },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[social-content/extract] failed for event ${eventId}:`,
      message
    );
    return NextResponse.json(
      { error: "Content extraction failed.", detail: message },
      { status: 500 }
    );
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  return run(eventId);
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  return run(eventId);
}
