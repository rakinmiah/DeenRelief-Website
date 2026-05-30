"use client";

/**
 * Server persistence for the canvas deck (Phase 10 wiring).
 *
 * Reuses the existing /api/admin/social-deck-drafts store with ZERO
 * migration: each EditorSlide is encoded as a "__canvas__" SlideDraft
 * — the whole slide rides inside slotValues.canvas, which the store's
 * zod accepts (slotValues is an arbitrary record). On load we detect
 * the "__canvas__" marker and decode back to EditorSlides; a legacy
 * (slot-based) draft or no draft decodes to null so the caller seeds
 * fresh.
 */

import type { EditorSlide } from "@/lib/social-editor/types";

const MARKER = "__canvas__";

type StoredDraft = {
  slideId: string;
  templateId: string;
  slotValues: Record<string, unknown>;
  imageMediaIds: Record<string, string>;
};

export function encodeDeck(slides: EditorSlide[]): StoredDraft[] {
  return slides.map((s) => ({
    slideId: s.id,
    templateId: MARKER,
    slotValues: { canvas: s },
    imageMediaIds: {},
  }));
}

export function decodeDeck(raw: unknown): EditorSlide[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const out: EditorSlide[] = [];
  for (const item of raw) {
    if (
      !item ||
      typeof item !== "object" ||
      (item as StoredDraft).templateId !== MARKER
    ) {
      return null; // not a canvas deck (legacy or unknown)
    }
    const canvas = (item as StoredDraft).slotValues?.canvas as
      | EditorSlide
      | undefined;
    if (!canvas || !Array.isArray(canvas.layers)) return null;
    out.push(canvas);
  }
  return out;
}

export async function loadDeck(
  eventId: string,
  platform: string
): Promise<EditorSlide[] | null> {
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
  slides: EditorSlide[]
): Promise<boolean> {
  try {
    const res = await fetch(`/api/admin/social-deck-drafts/${eventId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform, slides: encodeDeck(slides) }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
