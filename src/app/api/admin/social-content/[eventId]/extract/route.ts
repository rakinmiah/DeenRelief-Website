/**
 * POST /api/admin/social-content/:eventId/extract
 *
 * Phase 6b — single-stage content extraction endpoint.
 *
 * Looks up the emergency event by id, runs the Phase 6b content-block
 * extraction (with the per-event cache on emergency_events.draft_content_blocks
 * — see migration 030), and returns the typed ContentBlocks JSON for the
 * deck-builder UI to consume.
 *
 * Replaces the legacy 3-stage launch-packet generator
 * (src/lib/first-response-packet.ts + its slide / social-image / pptx
 * routes). The legacy code stays untouched for now — downstream consumers
 * (the slide-render pipeline, the pptx export) still depend on
 * LaunchPacketSchema. They need to migrate to ContentBlocks before the
 * legacy file can be deleted.
 *
 * Auth: standard requireAdminSession() pattern, same as every other
 * /api/admin/* route in the project.
 */

import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-session";
import { getEmergencyEventById } from "@/lib/first-response";
import { extractContentBlocksWithDefaultClient } from "@/lib/social-content-extraction";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Single Claude call with effort:"high" — typical wall time 15–30s on a
// cold cache, ~1s on a hash hit. 60s gives plenty of headroom on
// Vercel Pro for the rare slow-cold-start case.
export const maxDuration = 60;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  await requireAdminSession();
  const { eventId } = await params;

  const event = await getEmergencyEventById(eventId);
  if (!event) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  try {
    const { blocks, inputTokens, outputTokens } =
      await extractContentBlocksWithDefaultClient(event);

    return NextResponse.json({
      eventId,
      blocks,
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
