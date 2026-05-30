/**
 * MOCK content + imagery for the Compose page MVP.
 *
 * Used as a fallback when the Phase 6b extraction endpoint
 * (POST /api/admin/social-content/[eventId]/extract,
 *  GET /api/admin/social-content/[eventId]/images) returns 404. Once
 * the extraction endpoint ships, this file becomes dead code and can
 * be deleted.
 *
 * Counts (matches the spec):
 *   title × 3, body × 2, fact × 3, quote × 1, hashtag × 4,
 *   tier_row × 3, caption_ig × 1
 *   images × 6 (3 DR library + 3 external with credit text)
 */

import type { ContentBundle, ImageBundle } from "./types";

export const MOCK_CONTENT: ContentBundle = {
  cards: [
    // ── Titles ───────────────────────────────────────────────
    {
      id: "mock-title-1",
      card: {
        kind: "title",
        text: "Before dawn, the water arrives",
        charCount: 30,
      },
    },
    {
      id: "mock-title-2",
      card: {
        kind: "title",
        text: "A floodplain swallowed in 48 hours",
        charCount: 34,
      },
    },
    {
      id: "mock-title-3",
      card: {
        kind: "title",
        text: "Three districts. One response.",
        charCount: 30,
      },
    },

    // ── Body ─────────────────────────────────────────────────
    {
      id: "mock-body-1",
      card: {
        kind: "body",
        text:
          "Deen Relief teams are on the ground in the affected districts, distributing emergency food parcels and hygiene kits to families who lost everything.",
        charCount: 159,
      },
    },
    {
      id: "mock-body-2",
      card: {
        kind: "body",
        text:
          "Local Red Crescent partners report shelters are at capacity. Cash assistance to displaced households remains the fastest, most dignified way to help.",
        charCount: 155,
      },
    },

    // ── Facts ────────────────────────────────────────────────
    {
      id: "mock-fact-1",
      card: {
        kind: "fact",
        text: "Over 60,000 people displaced in 72 hours.",
        source: "ReliefWeb situation report, 27 May 2026",
      },
    },
    {
      id: "mock-fact-2",
      card: {
        kind: "fact",
        text: "Flood waters are now receding in three districts.",
        source: "IFRC operations update",
      },
    },
    {
      id: "mock-fact-3",
      card: {
        kind: "fact",
        text: "Damage to crops exceeds last year's combined total.",
        source: "GDACS flood bulletin",
      },
    },

    // ── Quote ────────────────────────────────────────────────
    {
      id: "mock-quote-1",
      card: {
        kind: "quote",
        text:
          "The water came in the night. We had ten minutes to leave with the children.",
        attribution: "Amina, displaced mother of four",
      },
    },

    // ── Hashtags ─────────────────────────────────────────────
    { id: "mock-hashtag-1", card: { kind: "hashtag", tag: "DeenRelief" } },
    {
      id: "mock-hashtag-2",
      card: { kind: "hashtag", tag: "EmergencyAppeal" },
    },
    { id: "mock-hashtag-3", card: { kind: "hashtag", tag: "Sadaqah" } },
    {
      id: "mock-hashtag-4",
      card: { kind: "hashtag", tag: "MuslimCharity" },
    },

    // ── Tier rows ────────────────────────────────────────────
    {
      id: "mock-tier-1",
      card: {
        kind: "tier_row",
        amountGbp: 25,
        shortDescription: "feeds a family for a week",
        longDescription:
          "One emergency food parcel covers a family of five with staples for 7 days.",
      },
    },
    {
      id: "mock-tier-2",
      card: {
        kind: "tier_row",
        amountGbp: 75,
        shortDescription: "shelter kit for a household",
        longDescription:
          "Tarpaulin, blankets, cooking set — everything to start again with dignity.",
      },
    },
    {
      id: "mock-tier-3",
      card: {
        kind: "tier_row",
        amountGbp: 150,
        shortDescription: "full restart bundle",
        longDescription:
          "Cash assistance + shelter + hygiene kit — a complete household package.",
      },
    },

    // ── Caption IG ───────────────────────────────────────────
    {
      id: "mock-caption-ig-1",
      card: {
        kind: "caption_ig",
        text:
          "When the water rises before dawn, every minute matters. Deen Relief teams are on the ground right now — distributing food, shelter and clean water to families who lost everything in 48 hours.\n\n£25 feeds a family for a week.\nLink in bio to give.\n\n#DeenRelief #EmergencyAppeal",
      },
    },
  ],
};

export const MOCK_IMAGES: ImageBundle = {
  images: [
    // ── DR library (no credit required) ──────────────────────
    {
      id: "dr:mock-portrait-1",
      source: "dr_library",
      url: "https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=1080",
      thumbnailUrl:
        "https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=320",
      width: 1080,
      height: 1350,
      orientation: "portrait",
      creditText: null,
      description: "Portrait — child carrying water, soft morning light",
    },
    {
      id: "dr:mock-landscape-1",
      source: "dr_library",
      url: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=1280",
      thumbnailUrl:
        "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=320",
      width: 1280,
      height: 853,
      orientation: "landscape",
      creditText: null,
      description: "Landscape — field distribution site at dusk",
    },
    {
      id: "dr:mock-square-1",
      source: "dr_library",
      url: "https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=1080",
      thumbnailUrl:
        "https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=320",
      width: 1080,
      height: 1080,
      orientation: "square",
      creditText: null,
      description: "Square — close-up of food parcel hand-off",
    },

    // ── External (with credit) ───────────────────────────────
    {
      id: "ext:mock-portrait-1",
      source: "external",
      url: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PIA17563-MarsCuriosityRover-AfterCrossingDingoGapSanddune-20140209.jpg/600px-PIA17563-MarsCuriosityRover-AfterCrossingDingoGapSanddune-20140209.jpg",
      thumbnailUrl:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PIA17563-MarsCuriosityRover-AfterCrossingDingoGapSanddune-20140209.jpg/200px-PIA17563-MarsCuriosityRover-AfterCrossingDingoGapSanddune-20140209.jpg",
      width: 600,
      height: 800,
      orientation: "portrait",
      creditText: "Photo: ReliefWeb · CC-BY 4.0",
      description: "Portrait — Wikimedia placeholder for displaced family",
    },
    {
      id: "ext:mock-landscape-1",
      source: "external",
      url: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/GoldenGateBridge-001.jpg/640px-GoldenGateBridge-001.jpg",
      thumbnailUrl:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/GoldenGateBridge-001.jpg/200px-GoldenGateBridge-001.jpg",
      width: 640,
      height: 426,
      orientation: "landscape",
      creditText: "Photo: Wikimedia Commons · CC-BY-SA 4.0",
      description: "Landscape — Wikimedia placeholder for flood damage",
    },
    {
      id: "ext:mock-square-1",
      source: "external",
      url: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c6/HMS_Belfast_-_panoramio.jpg/600px-HMS_Belfast_-_panoramio.jpg",
      thumbnailUrl:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c6/HMS_Belfast_-_panoramio.jpg/200px-HMS_Belfast_-_panoramio.jpg",
      width: 600,
      height: 600,
      orientation: "square",
      creditText: "Photo: IFRC GO · CC-BY 4.0",
      description: "Square — Wikimedia placeholder for aid distribution",
    },
  ],
};
