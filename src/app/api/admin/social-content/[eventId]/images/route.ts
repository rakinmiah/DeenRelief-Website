/**
 * GET /api/admin/social-content/:eventId/images
 *
 * Phase 6c — image candidate gallery feed for the deck-builder
 * Compose page (right column). Combines DR's curated media library
 * with the third-party external imagery the news pipeline pulled
 * for this event, classifies each by orientation (portrait /
 * landscape / square), and returns a flat array of ImageCandidates
 * the UI can render as draggable cards.
 *
 * No Claude scoring — the SMM scrubs the gallery visually and picks
 * what fits. This is the key pivot: image selection moves from
 * Claude to the SMM. (Previously the legacy 3-stage packet generator
 * did vision-grounded scoring at Stage 2; that work is dropped.)
 */

import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-session";
import { listImageryForEvent } from "@/lib/external-imagery";
import { getEmergencyEventById } from "@/lib/first-response";
import { getCandidateMediaForEvent } from "@/lib/media-library";
import type {
  ImageCandidate,
  ImageOrientation,
} from "@/lib/social-templates/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Classify orientation from width/height with a small "square-ish"
 *  tolerance — IG square crops (1080×1080) and ones close to it should
 *  count as `square` so they fit both portrait and landscape slots. */
function classifyOrientation(
  width: number | null,
  height: number | null
): ImageOrientation {
  if (!width || !height) return "square";
  const ratio = width / height;
  if (ratio > 1.15) return "landscape";
  if (ratio < 0.87) return "portrait";
  return "square";
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  await requireAdminSession();
  const { eventId } = await params;

  const event = await getEmergencyEventById(eventId);
  if (!event) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  // Parallel fetch — both pools are independent.
  const [drCandidates, extCandidates] = await Promise.all([
    getCandidateMediaForEvent({
      countryIso: event.countryIso,
      eventType: event.eventType,
      campaignSlugs: event.matchedCampaigns,
      limit: 40,
    }),
    listImageryForEvent(eventId),
  ]);

  const candidates: ImageCandidate[] = [];

  for (const m of drCandidates) {
    candidates.push({
      id: `dr:${m.id}`,
      source: "dr_library",
      url: m.publicUrl,
      thumbnailUrl: null, // DR library has no separate thumbnail URL
      width: m.width,
      height: m.height,
      orientation: classifyOrientation(m.width, m.height),
      creditText: null, // own imagery — no third-party credit
      description: m.caption ?? null,
    });
  }

  for (const e of extCandidates) {
    if (e.archivedAt) continue;
    candidates.push({
      id: `ext:${e.id}`,
      source: "external",
      url: e.url,
      thumbnailUrl: e.thumbnailUrl,
      width: e.width,
      height: e.height,
      orientation: classifyOrientation(e.width, e.height),
      creditText: e.creditText,
      description: e.title ?? e.description ?? null,
    });
  }

  return NextResponse.json({
    eventId,
    total: candidates.length,
    drCount: drCandidates.length,
    externalCount: candidates.length - drCandidates.length,
    candidates,
  });
}
