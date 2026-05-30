/**
 * Human-facing labels for the deck builder (Phase 7 UI redesign).
 *
 * The template system uses developer slot ids + snake_case enum
 * values (focal_point, logo_variant, top_left…). Those must NEVER
 * reach the SMM. This module is the single translation layer: slot
 * id → friendly label, choice value → friendly label, content kind →
 * label + accent. Every UI component reads labels from here so the
 * vocabulary stays consistent and we can tweak wording in one place.
 */

import type { ContentKind, SlotSpec, SlotType } from "@/lib/social-templates/types";

/* ─── Slot labels ───────────────────────────────────────────────── */

/** Friendly name for a slot. Prefers an explicit per-id label, falls
 *  back to a per-type label, then to a title-cased id as a last
 *  resort (so a new slot never shows raw snake_case). */
export function slotLabel(slot: SlotSpec): string {
  const byId = SLOT_LABELS[slot.id];
  if (byId) return byId;
  const byType = SLOT_TYPE_LABELS[slot.type];
  if (byType) return byType;
  return titleCase(slot.id);
}

const SLOT_LABELS: Record<string, string> = {
  title: "Headline",
  eyebrow: "Label",
  body: "Supporting line",
  stat: "Big number",
  source: "Source credit",
  photo: "Photo",
  quote: "Quote",
  attribution: "Attribution",
  hashtag_pair: "Hashtags",
  url: "Link",
  campaign_label: "Campaign caption",
  tier_rows: "Donation tiers",
  chapter_number: "Chapter number",
  keyword: "Comment keyword",
  focal_point: "Crop",
  logo_variant: "Logo colour",
  logo_position: "Logo position",
};

const SLOT_TYPE_LABELS: Partial<Record<SlotType, string>> = {
  "text:title": "Headline",
  "text:eyebrow": "Label",
  "text:body": "Supporting line",
  "text:quote": "Quote",
  "text:attribution": "Attribution",
  "text:source": "Source credit",
  "image:portrait": "Photo (portrait)",
  "image:landscape": "Photo (landscape)",
  "image:any": "Photo",
  "tier:rows": "Donation tiers",
  "choice:logo_variant": "Logo colour",
  "choice:focal_point": "Crop",
  "choice:logo_position": "Logo position",
};

/* ─── Choice option labels ──────────────────────────────────────── */

/** Friendly label for a choice option value (e.g. "top_left" →
 *  "Top left", "green" → "Green logo"). */
export function choiceLabel(slotType: SlotType, value: string): string {
  return CHOICE_LABELS[slotType]?.[value] ?? titleCase(value);
}

const CHOICE_LABELS: Partial<Record<SlotType, Record<string, string>>> = {
  "choice:logo_variant": {
    green: "Green logo",
    white: "White logo",
  },
  "choice:focal_point": {
    top: "Top",
    center: "Centre",
    bottom: "Bottom",
  },
  "choice:logo_position": {
    top_left: "Top left",
    top_right: "Top right",
    bottom_left: "Bottom left",
    bottom_right: "Bottom right",
  },
};

/* ─── Content kind labels + accents ─────────────────────────────── */

/** Display label for a content card kind (used as the small tag on
 *  each card + the section headers in the content column). */
export function contentKindLabel(kind: ContentKind): string {
  return CONTENT_KIND_LABELS[kind] ?? titleCase(kind);
}

/** Plural section header for a group of content cards. */
export function contentKindSection(kind: ContentKind): string {
  return CONTENT_KIND_SECTIONS[kind] ?? `${titleCase(kind)}s`;
}

const CONTENT_KIND_LABELS: Record<ContentKind, string> = {
  title: "Headline",
  eyebrow: "Label",
  body: "Body",
  fact: "Fact",
  quote: "Quote",
  hashtag: "Hashtag",
  tier_row: "Tier",
  caption_ig: "Instagram caption",
  caption_fb: "Facebook caption",
  caption_x: "X post",
  email_subject: "Email subject",
  email_body: "Email body",
  source: "Source",
};

const CONTENT_KIND_SECTIONS: Partial<Record<ContentKind, string>> = {
  title: "Headlines",
  eyebrow: "Labels",
  body: "Body lines",
  fact: "Facts",
  quote: "Quotes",
  hashtag: "Hashtags",
  tier_row: "Donation tiers",
  caption_ig: "Captions",
  caption_fb: "Captions",
  caption_x: "X posts",
  email_subject: "Email",
  email_body: "Email",
  source: "Sources",
};

/** A single accent hue per content kind, used as the card's left
 *  rule + tag colour. Kept to a small, calm set — variations of the
 *  brand greens/ambers plus a couple of neutrals — so the column
 *  reads as a family, not a rainbow. Values are CSS custom-property
 *  references resolved against globals.css @theme tokens. */
export function contentKindAccent(kind: ContentKind): string {
  return CONTENT_KIND_ACCENTS[kind] ?? "var(--color-grey)";
}

const CONTENT_KIND_ACCENTS: Record<ContentKind, string> = {
  title: "var(--color-green)",
  eyebrow: "var(--color-grey)",
  body: "var(--color-green-dark)",
  fact: "var(--color-amber-dark)",
  quote: "var(--color-green)",
  hashtag: "var(--color-amber)",
  tier_row: "var(--color-amber-dark)",
  caption_ig: "var(--color-grey)",
  caption_fb: "var(--color-grey)",
  caption_x: "var(--color-grey)",
  email_subject: "var(--color-grey)",
  email_body: "var(--color-grey)",
  source: "var(--color-grey)",
};

/* ─── helpers ───────────────────────────────────────────────────── */

function titleCase(s: string): string {
  return s
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}
