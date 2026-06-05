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
import { fetchExternalImageryForEvent } from "@/lib/external-imagery-fetch";
import { getEmergencyEventById } from "@/lib/first-response";
import { getCandidateMediaForEvent } from "@/lib/media-library";
import type {
  ImageCandidate,
  ImageOrientation,
} from "@/lib/social-templates/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// The lazy first-open imagery fetch fans out to several sources, so give it room.
export const maxDuration = 60;

/** Words in an external image's title/description that mark it as a
 *  NON-photograph — a diagram, map, chart, infographic, illustration, etc.
 *  Slide backgrounds must be real photography; data-visual treatments come
 *  later. High-precision list (word-boundary matched) so we exclude the
 *  isometric "perimeter fence" diagrams without dropping genuine aftermath
 *  photos. */
const NON_PHOTO_RE =
  /\b(diagram|schematic|map|maps|chart|charts|graph|graphs|graphic|graphics|infographic|infographics|illustration|illustrated|isometric|vector|blueprint|flowchart|cartoon|clip-?art|render(?:ing|ed)?|3d)\b/i;

/** True when an external candidate is (probably) a real photograph. No
 *  textual signal → assume photo (don't over-filter); an .svg URL is always
 *  a vector, never a photo. */
function isLikelyPhotograph(
  title: string | null,
  description: string | null,
  url: string
): boolean {
  if (/\.svg(\?|#|$)/i.test(url)) return false;
  const hay = `${title ?? ""} ${description ?? ""}`.trim();
  if (!hay) return true;
  return !NON_PHOTO_RE.test(hay);
}

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
  const [drCandidates, existingExt] = await Promise.all([
    getCandidateMediaForEvent({
      countryIso: event.countryIso,
      eventType: event.eventType,
      campaignSlugs: event.matchedCampaigns,
      limit: 40,
    }),
    listImageryForEvent(eventId),
  ]);

  // Third-party web imagery (Wikimedia / EONET / ReliefWeb / IFRC) used to be
  // fetched ONLY during launch-packet generation, so an event taken straight to
  // the deck builder had an empty external pool (DR media only). Populate it
  // lazily on first open — idempotent upsert, fully fault-isolated, never
  // throws — then re-opens read the stored rows for free.
  let extCandidates = existingExt;
  if (extCandidates.length === 0) {
    try {
      extCandidates = await fetchExternalImageryForEvent(event);
    } catch (err) {
      console.warn(`[social-content/images] lazy imagery fetch failed for ${eventId}:`, err);
    }
  }

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

  let droppedNonPhoto = 0;
  for (const e of extCandidates) {
    if (e.archivedAt) continue;
    // Backgrounds must be real photographs — skip diagrams / maps / charts /
    // infographics / illustrations that slipped into the imagery pool.
    if (!isLikelyPhotograph(e.title, e.description, e.url)) {
      droppedNonPhoto++;
      continue;
    }
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
    // How many external assets were excluded as non-photographic (diagrams,
    // maps, charts) — surfaced for debugging the imagery pool.
    droppedNonPhoto,
    // Both field names are populated so consumers can use either.
    // `images` matches the deck-builder Compose UI's ImageBundle
    // shape; `candidates` is the original Phase 6c contract.
    images: candidates,
    candidates,
  });
}
