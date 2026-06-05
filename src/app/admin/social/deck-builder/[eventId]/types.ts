/**
 * Local types for the Phase 6e Compose page.
 *
 * The SlideDraft / DeckDraft shapes live ONLY in the deck-builder
 * client (and the matching persistence endpoint at
 * /api/admin/social-deck-drafts/[eventId]). Slot semantics and content
 * shapes live in src/lib/social-templates/types.ts — that's the
 * cross-cutting source of truth used by templates + render endpoint.
 */

import type {
  ContentCard,
  ImageCandidate,
  SlotValues,
  TemplateMeta,
} from "@/lib/social-templates/types";

/** A single composed slide in the deck. */
export type SlideDraft = {
  /** Stable client UUID. Survives reordering. */
  slideId: string;
  templateId: string;
  slotValues: SlotValues;
  /** Mirrors image:* slot values so the render endpoint can resolve
   *  mediaIds → data URIs without re-deriving them from slotValues. */
  imageMediaIds: Record<string, string>;
};

export type DeckDraft = {
  eventId: string;
  platform: "instagram" | "facebook" | "x";
  slides: SlideDraft[];
};

/** Drag-data discriminator. dnd-kit passes whatever we put on the
 *  draggable's `data` prop through to the drop handler — we use this
 *  union to know whether to treat the drop as a content card or an
 *  image candidate. */
export type DragPayload =
  | { kind: "content"; card: ContentCard; cardId: string }
  | { kind: "image"; image: ImageCandidate };

/** A COMPARABLE data series for charts — 2–6 points that share one unit /
 *  dimension and belong on a single axis (e.g. displacement by region). The
 *  extractor emits these so a bar chart auto-fills with numbers that are
 *  actually comparable, instead of a mix of '1.7M' and '88%'. */
export type ChartSeriesPoint = { label: string; value: string };
export type ChartSeries = {
  title: string;
  unit: string | null;
  source: string | null;
  points: ChartSeriesPoint[];
};

/** Shape returned by the Phase 6b extraction endpoint (and matched by
 *  MOCK_CONTENT for fallback). Each card carries a stable id so the UI
 *  can key the list and detect re-renders. */
/** A ReliefWeb report whose content fed the AI extraction (citation only). */
export type EnrichmentSource = {
  title: string;
  source: string; // agency shortname(s), e.g. "OCHA", "UNRWA"
  date: string; // YYYY-MM-DD
  url: string;
};

export type ContentBundle = {
  cards: Array<{ id: string; card: ContentCard }>;
  /** Comparable data series for charts (0–3). May be absent on legacy /
   *  cached extractions made before this field existed. */
  chartSeries?: ChartSeries[];
  /** ReliefWeb reports the AI researched this crisis from (transparency).
   *  Absent on legacy / cached extractions made before enrichment existed. */
  enrichmentSources?: EnrichmentSource[];
};

export type ImageBundle = {
  images: ImageCandidate[];
};

/** Group of templates by category — matches the API response shape
 *  from /api/admin/social-templates/list. */
export type TemplateGroups = Record<string, TemplateMeta[]>;
