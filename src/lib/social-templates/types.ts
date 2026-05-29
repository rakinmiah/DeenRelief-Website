/**
 * Type system for the deck-builder template registry (Phase 6a).
 *
 * The deck builder shifts the social-app architecture from
 * "Claude designs slides" to "SMM composes slides from templates +
 * content blocks". This file defines the contract:
 *
 *   • CONTENT CARDS — typed bits of content extracted from a news
 *     event (titles, facts, quotes, hashtags, captions, images).
 *     Each card has a `kind` so the UI can colour-code it and the
 *     drag-and-drop layer can validate drop targets.
 *
 *   • TEMPLATES — TSX modules in social-templates/templates/<id>.tsx
 *     that declare metadata + slots + a render() function. Each
 *     template handles a specific composition (e.g. magazine cover
 *     hero with portrait photo + amber accent rule). The SMM picks
 *     a template per slide; the renderer turns templateId + slot
 *     values into a Satori-rendered PNG.
 *
 *   • SLOTS — typed placeholders inside a template. Each slot has
 *     a type (text:title, image:portrait, tier:rows, etc.) and a
 *     required flag. Hybrid compatibility model (per the Phase 6
 *     scoping): SLOT TYPE-STRICT, content rules LOOSE. A text slot
 *     accepts any text content card; UI doesn't enforce max-char
 *     because the SMM eyeballs fit, but the type system still
 *     prevents dropping a photo card into a text slot.
 */

import type React from "react";

/* ─── Content cards (left column of Compose page) ───────────────── */

/** What kind of content this card holds. Drives card colour in the
 *  drag-and-drop UI and matches against slot types when dropping. */
export type ContentKind =
  | "title" /* short editorial beat, ≤ 30 chars typically */
  | "eyebrow" /* small caps tag — date / location / section */
  | "body" /* supporting prose, ~ 150 chars */
  | "fact" /* verified, sourced single-statement fact */
  | "quote" /* attributed testimony — has attribution field */
  | "hashtag" /* single hashtag without the # */
  | "tier_row" /* price + impact pair */
  | "caption_ig" /* full IG caption */
  | "caption_fb" /* full FB caption (often identical to IG) */
  | "caption_x" /* full X (Twitter) post, ≤ 280 chars */
  | "email_subject" /* email subject line candidate */
  | "email_body" /* email body */
  | "source" /* source attribution string */;

/** Discriminated union — the actual content card the SMM drags. */
export type ContentCard =
  | { kind: "title"; text: string; charCount: number }
  | { kind: "eyebrow"; text: string }
  | { kind: "body"; text: string; charCount: number }
  | { kind: "fact"; text: string; source: string | null }
  | { kind: "quote"; text: string; attribution: string }
  | { kind: "hashtag"; tag: string /* no leading # */ }
  | {
      kind: "tier_row";
      amountGbp: number;
      shortDescription: string;
      longDescription: string | null;
    }
  | { kind: "caption_ig"; text: string }
  | { kind: "caption_fb"; text: string }
  | { kind: "caption_x"; text: string }
  | { kind: "email_subject"; text: string }
  | { kind: "email_body"; text: string }
  | { kind: "source"; text: string };

/* ─── Image candidates (right column of Compose page) ───────────── */

/** Image orientation — used for slot compatibility. Portrait fits in
 *  portrait slots, landscape in landscape, "square" accepts both. */
export type ImageOrientation = "portrait" | "landscape" | "square";

export type ImageCandidate = {
  id: string; // "dr:<uuid>" or "ext:<uuid>"
  source: "dr_library" | "external";
  url: string; // public, browser-fetchable
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
  orientation: ImageOrientation;
  creditText: string | null; // non-null for external — must display
  /** Optional caption / description Claude or the curator wrote.
   *  Surfaced in the UI as a hover tooltip. */
  description: string | null;
};

/* ─── Slots ─────────────────────────────────────────────────────── */

/** Slot type — a short tag the UI and validation layer use to match
 *  content cards to slots. Hybrid model (Phase 6 scoping): only the
 *  TYPE matters for snap compatibility, not constraints. */
export type SlotType =
  /* text slots — accept any text content card */
  | "text:title"
  | "text:eyebrow"
  | "text:body"
  | "text:quote"
  | "text:attribution"
  | "text:source"
  /* image slots — accept image candidates of matching orientation */
  | "image:portrait"
  | "image:landscape"
  | "image:any"
  /* structured slots — only matching card kinds fit */
  | "tier:rows" /* accepts ARRAY of tier_row cards */
  /* choice slots — SMM picks from a fixed set, not drag-and-drop */
  | "choice:logo_variant" /* "green" | "white" */
  | "choice:focal_point" /* "top" | "center" | "bottom" */
  | "choice:logo_position"; /* top_left | top_right | bottom_left | bottom_right */

export type SlotSpec = {
  id: string; // slot key inside the template
  type: SlotType;
  required: boolean;
  /** Shown next to the slot in Compose UI — what content fits here.
   *  e.g. "A short editorial beat (≤ 30 chars works best)" */
  hint?: string;
  /** Optional default. For choice slots: the default option. */
  defaultValue?: unknown;
};

/* ─── Slot values (what gets passed to render()) ────────────────── */

/** What a populated slot looks like at render time. The shape depends
 *  on the slot's type. */
export type SlotValue =
  | { type: "text"; text: string; source?: string; attribution?: string }
  | { type: "image"; mediaId: string /* "dr:..." or "ext:..." */ }
  | {
      type: "tier_rows";
      rows: Array<{
        amountGbp: number;
        shortDescription: string;
        longDescription: string | null;
      }>;
    }
  | { type: "choice"; value: string };

export type SlotValues = Record<string, SlotValue>;

/* ─── Template metadata ─────────────────────────────────────────── */

export type SocialPlatform = "instagram" | "facebook" | "x";

export type TemplateCategory =
  | "hero" /* slide 1 — first impression */
  | "fact" /* one hard sourced fact, typography-led */
  | "stat" /* huge stat + tiny supporting beat */
  | "response" /* what DR is doing — usually with a field photo */
  | "testimony" /* quote-led, attributed */
  | "tiers" /* price ladder */
  | "chapter" /* manifesto chapter — "We believe X. That means Y." */
  | "cta" /* final slide — donate / witness / engage */;

export type TemplateAspect = "square" | "wide" | "portrait";

export type TemplateMeta = {
  /** Stable kebab-case ID. Used as PNG filename + DB reference. */
  id: string;
  /** Human-readable name shown in the template gallery. */
  name: string;
  /** Short description — surfaced as a tooltip in the gallery. */
  description: string;
  /** Which platforms this template's aspect fits. IG carousel + FB
   *  carousel both use 1080×1080, so the same template ships to both
   *  per Phase 5c. X gets 1200×675 templates. */
  platforms: SocialPlatform[];
  category: TemplateCategory;
  aspect: TemplateAspect;
  /** Output dimensions in pixels. */
  size: { w: number; h: number };
  slots: SlotSpec[];
  /** Path under /public to the pre-rendered preview thumbnail.
   *  Generated by the preview-builder script (Phase 6a follow-up). */
  previewPath: string;
};

/* ─── Render contract ───────────────────────────────────────────── */

/** Input to a template's render() function. */
export type RenderInput = {
  slotValues: SlotValues;
  /** Resolved image data URIs keyed by slot id. The render
   *  endpoint resolves mediaIds to base64 data URIs before
   *  calling render() so the template doesn't need to touch
   *  Supabase or the external imagery store. */
  imageDataUris: Record<string, string | null>;
  /** Logo data URIs — both variants always loaded so the template
   *  can pick based on the logo_variant choice slot. */
  logoOnLight: string | null; /* green logo, for light backgrounds */
  logoOnDark: string | null; /* white logo, for dark backgrounds */
  /** Optional credit text — passed in when the template's image
   *  slot resolved to an external (CC-BY) source. */
  creditText: string | null;
};

export type Template = {
  meta: TemplateMeta;
  /** Pure render — returns Satori-compatible JSX. The route handler
   *  wraps this in an ImageResponse and provides fonts. */
  render: (input: RenderInput) => React.ReactElement;
};

/* ─── Helpers ───────────────────────────────────────────────────── */

/** Type guard: does this content kind fit a given slot type? Used by
 *  the dnd-kit layer to highlight drop zones. Hybrid model — text:*
 *  accepts any text-shaped content card; image:* matches by
 *  orientation. */
export function canDropContentInSlot(
  kind: ContentKind,
  slotType: SlotType
): boolean {
  // text:* slot accepts any text content card
  if (slotType.startsWith("text:")) {
    return ["title", "eyebrow", "body", "fact", "quote", "source"].includes(
      kind
    );
  }
  // image:* slot does NOT accept content cards (only image candidates).
  // tier:rows accepts tier_row cards.
  if (slotType === "tier:rows") return kind === "tier_row";
  return false;
}

/** Type guard: does an image candidate fit a given image slot? */
export function canDropImageInSlot(
  orientation: ImageOrientation,
  slotType: SlotType
): boolean {
  if (slotType === "image:any") return true;
  if (slotType === "image:portrait")
    return orientation === "portrait" || orientation === "square";
  if (slotType === "image:landscape")
    return orientation === "landscape" || orientation === "square";
  return false;
}
