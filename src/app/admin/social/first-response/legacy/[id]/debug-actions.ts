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
import {
  listImageryForEvent,
  externalSourceLabel,
  type ExternalImagery,
} from "@/lib/external-imagery";
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
  /** Third-party verified imagery (Wikimedia / NASA EONET / etc.)
   *  attached to this event. Surfaced as a parallel candidate pool so
   *  the SMM can see exactly which external sources Claude had to
   *  choose from on top of DR's own library. */
  externalCandidates: Array<{
    id: string;
    source: string;
    sourceLabel: string;
    url: string;
    title: string | null;
    creditText: string;
    license: string;
    selected: boolean;
  }>;
  packet:
    | {
        present: true;
        slides: Array<{
          index: number;
          layout: string;
          title: string;
          mediaId: string | null;
          /** Where the media_id resolved to. Branched so the UI can
           *  show different metadata per source (DR caption vs.
           *  external credit/license). */
          mediaResolved:
            | { kind: "dr"; id: string; publicUrl: string; caption: string | null }
            | { kind: "ext"; id: string; url: string; sourceLabel: string; creditText: string }
            | null;
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
    // Fetch BOTH candidate pools in parallel — same shape the launch
    // packet generator passes to Claude. The debug panel needs both
    // so it can correctly resolve 'dr:' AND 'ext:' prefixed media_ids
    // (without the second list, every ext: ID looks orphaned).
    const [candidates, externalCandidates] = await Promise.all([
      getCandidateMediaForEvent({
        ...candidateQuery,
        limit: 20,
      }),
      listImageryForEvent(event.id),
    ]);

    // Build prefix-keyed lookup maps that mirror what
    // src/lib/first-response-packet.ts builds when sanitising
    // Claude's media_id choices. Without these prefixes the lookup
    // misses every ID (since the packet schema requires 'dr:<uuid>' /
    // 'ext:<uuid>' format).
    const drById = new Map(candidates.map((c) => [`dr:${c.id}`, c]));
    const extById = new Map(
      externalCandidates.map((e) => [`ext:${e.id}`, e])
    );

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
        type Resolved =
          | { kind: "dr"; id: string; publicUrl: string; caption: string | null }
          | { kind: "ext"; id: string; url: string; sourceLabel: string; creditText: string }
          | null;
        packetBlock = {
          present: true,
          slides: packet.carousel_slides.map((slide, idx) => {
            const mediaId = slide.media_id ?? null;
            let resolved: Resolved = null;
            if (mediaId) {
              const dr = drById.get(mediaId);
              if (dr) {
                resolved = {
                  kind: "dr",
                  id: dr.id,
                  publicUrl: dr.publicUrl,
                  caption: dr.caption,
                };
              } else {
                const ext = extById.get(mediaId);
                if (ext) {
                  resolved = {
                    kind: "ext",
                    id: ext.id,
                    url: ext.url,
                    sourceLabel: externalSourceLabel(ext.source),
                    creditText: ext.creditText,
                  };
                }
              }
            }
            return {
              index: idx + 1,
              layout: slide.layout,
              title: slide.title.slice(0, 80),
              mediaId,
              mediaResolved: resolved,
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
        externalCandidates: externalCandidates.map((e: ExternalImagery) => ({
          id: e.id,
          source: e.source,
          sourceLabel: externalSourceLabel(e.source),
          url: e.url,
          title: e.title,
          creditText: e.creditText,
          license: e.license,
          selected: e.selected,
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
