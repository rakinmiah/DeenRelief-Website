"use server";

/**
 * Debug action — surfaces exactly what the launch-packet generator
 * "sees" for a given event: what country/event/campaigns drive the
 * candidate query, what candidates that query returns, and what
 * media_id (if any) Claude picked per slide in the stored packet.
 *
 * Use case: SMM sees no photos on slides despite having relevant
 * imagery in the library. This panel exposes whether the issue is
 *   (a) the candidate query found 0 matches (tagging issue in the
 *       library), or
 *   (b) Claude got candidates but chose to skip (prompt-tuning
 *       issue), or
 *   (c) selected media_id but it failed to fetch (rare).
 */

import { requireAdminSession } from "@/lib/admin-session";
import { getEmergencyEventById } from "@/lib/first-response";
import {
  LaunchPacketSchema,
  type LaunchPacket,
} from "@/lib/first-response-packet";
import { getCandidateMediaForEvent, type MediaItem } from "@/lib/media-library";

export interface EventDebugInfo {
  event: {
    id: string;
    title: string;
    countryIso: string | null;
    eventType: string | null;
    matchedCampaigns: string[];
    drPriorityScore: number | null;
  };
  candidateQuery: {
    countryIso: string | null;
    eventType: string | null;
    campaignSlugs: string[];
  };
  candidates: Array<{
    id: string;
    caption: string | null;
    countryIso: string | null;
    eventTypes: string[];
    campaignSlugs: string[];
    tone: string | null;
    useCases: string[];
    tags: string[];
    publicUrl: string;
  }>;
  packet:
    | {
        present: true;
        slides: Array<{
          index: number;
          layout: string;
          title: string;
          mediaId: string | null;
          mediaResolved: { id: string; publicUrl: string; caption: string | null } | null;
        }>;
      }
    | { present: false; reason: string };
}

export type DebugActionResult =
  | { ok: true; data: EventDebugInfo }
  | { ok: false; error: string };

export async function getEventDebugInfoAction(
  eventId: string
): Promise<DebugActionResult> {
  try {
    await requireAdminSession();
    const event = await getEmergencyEventById(eventId);
    if (!event) return { ok: false, error: "Event not found." };

    const candidateQuery = {
      countryIso: event.countryIso,
      eventType: event.eventType,
      campaignSlugs: event.matchedCampaigns,
    };
    const candidates = await getCandidateMediaForEvent({
      ...candidateQuery,
      limit: 20,
    });

    // Resolve packet + per-slide media selection.
    let packetBlock: EventDebugInfo["packet"];
    if (!event.draftPacketJson) {
      packetBlock = { present: false, reason: "No packet drafted yet." };
    } else {
      const parsed = LaunchPacketSchema.safeParse(event.draftPacketJson);
      if (!parsed.success) {
        packetBlock = {
          present: false,
          reason:
            "Stored packet doesn't match the current schema — redraft to refresh.",
        };
      } else {
        const packet: LaunchPacket = parsed.data;
        // Map media_id → candidate metadata for display.
        const byId = new Map(candidates.map((c) => [c.id, c]));
        packetBlock = {
          present: true,
          slides: packet.carousel_slides.map((slide, idx) => {
            const resolved = slide.media_id ? byId.get(slide.media_id) : null;
            return {
              index: idx + 1,
              layout: slide.layout,
              title: slide.title.slice(0, 80),
              mediaId: slide.media_id ?? null,
              mediaResolved: resolved
                ? {
                    id: resolved.id,
                    publicUrl: resolved.publicUrl,
                    caption: resolved.caption,
                  }
                : null,
            };
          }),
        };
      }
    }

    return {
      ok: true,
      data: {
        event: {
          id: event.id,
          title: event.title,
          countryIso: event.countryIso,
          eventType: event.eventType,
          matchedCampaigns: event.matchedCampaigns,
          drPriorityScore: event.drPriorityScore,
        },
        candidateQuery,
        candidates: candidates.map((c: MediaItem) => ({
          id: c.id,
          caption: c.caption,
          countryIso: c.countryIso,
          eventTypes: c.eventTypes,
          campaignSlugs: c.campaignSlugs,
          tone: c.tone,
          useCases: c.useCases,
          tags: c.tags,
          publicUrl: c.publicUrl,
        })),
        packet: packetBlock,
      },
    };
  } catch (err) {
    console.error("[debug] getEventDebugInfoAction failed:", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
