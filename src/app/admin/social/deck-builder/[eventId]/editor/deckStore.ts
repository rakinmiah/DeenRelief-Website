"use client";

/**
 * Server persistence for the canvas deck (Phase 10 wiring + Wave 2c
 * components).
 *
 * Reuses the existing /api/admin/social-deck-drafts store with ZERO
 * migration: each EditorSlide is encoded as a "__canvas__" SlideDraft
 * — the whole slide rides inside slotValues.canvas, which the store's
 * zod accepts (slotValues is an arbitrary record). On load we detect
 * the "__canvas__" marker and decode back to EditorSlides; a legacy
 * (slot-based) draft or no draft decodes to null so the caller seeds
 * fresh.
 *
 * Components (Wave 2c): the DECK-LEVEL component registry is encoded as
 * ONE extra SlideDraft with templateId "__components__", carrying the
 * registry in slotValues.components. It's prepended to the encoded array
 * and stripped back out on decode. A deck with no components emits no
 * such draft, so older drafts round-trip byte-for-byte. The transient
 * "edit master" slide (id prefix "__editmaster__") is never persisted.
 */

import type { EditorSlide, EditorDeck, ComponentRegistry } from "@/lib/social-editor/types";

const MARKER = "__canvas__";
const COMPONENTS_MARKER = "__components__";
const EDIT_MASTER_PREFIX = "__editmaster__";

type StoredDraft = {
  slideId: string;
  templateId: string;
  slotValues: Record<string, unknown>;
  imageMediaIds: Record<string, string>;
};

export function encodeDeck(deck: EditorDeck): StoredDraft[] {
  const out: StoredDraft[] = [];
  // Registry first (when present) so a reader sees it before the slides.
  if (deck.components && Object.keys(deck.components).length) {
    out.push({
      slideId: COMPONENTS_MARKER,
      templateId: COMPONENTS_MARKER,
      slotValues: { components: deck.components },
      imageMediaIds: {},
    });
  }
  for (const s of deck.slides) {
    // Never persist the transient edit-master slide.
    if (s.id.startsWith(EDIT_MASTER_PREFIX)) continue;
    out.push({
      slideId: s.id,
      templateId: MARKER,
      slotValues: { canvas: s },
      imageMediaIds: {},
    });
  }
  return out;
}

export function decodeDeck(raw: unknown): EditorDeck | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const slides: EditorSlide[] = [];
  let components: ComponentRegistry | undefined;
  for (const item of raw) {
    if (!item || typeof item !== "object") return null;
    const draft = item as StoredDraft;
    if (draft.templateId === COMPONENTS_MARKER) {
      const c = draft.slotValues?.components;
      if (c && typeof c === "object") components = c as ComponentRegistry;
      continue;
    }
    if (draft.templateId !== MARKER) {
      return null; // not a canvas deck (legacy or unknown)
    }
    const canvas = draft.slotValues?.canvas as EditorSlide | undefined;
    if (!canvas || !Array.isArray(canvas.layers)) return null;
    slides.push(canvas);
  }
  if (slides.length === 0) return null;
  return { slides, components };
}

export async function loadDeck(
  eventId: string,
  platform: string
): Promise<EditorDeck | null> {
  try {
    const res = await fetch(
      `/api/admin/social-deck-drafts/${eventId}?platform=${platform}`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { slides?: unknown };
    return decodeDeck(json.slides);
  } catch {
    return null;
  }
}

export async function saveDeck(
  eventId: string,
  platform: string,
  deck: EditorDeck
): Promise<boolean> {
  try {
    const res = await fetch(`/api/admin/social-deck-drafts/${eventId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform, slides: encodeDeck(deck) }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
