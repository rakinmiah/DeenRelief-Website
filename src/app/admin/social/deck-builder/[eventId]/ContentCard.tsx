"use client";

/**
 * A single draggable content card in the LEFT column (Phase 7 redesign).
 *
 * Calm + borderless: a quiet white surface with a thin left accent
 * rule keyed to the content kind, the content itself, and a drag
 * handle that appears on hover. The card carries NO kind tag — the
 * column groups cards under sentence-case section headers, so a
 * per-card label would be redundant noise.
 */

import { useDraggable } from "@dnd-kit/core";
import type { ContentCard as ContentCardT } from "@/lib/social-templates/types";
import { contentKindAccent } from "./labels";
import type { DragPayload } from "./types";

export default function ContentCardItem({
  id,
  card,
}: {
  id: string;
  card: ContentCardT;
}) {
  const payload: DragPayload = { kind: "content", card, cardId: id };

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `content:${id}`,
    data: payload,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`group relative cursor-grab active:cursor-grabbing select-none rounded-lg bg-white pl-3.5 pr-6 py-2 ring-1 ring-charcoal/6 hover:ring-charcoal/14 hover:shadow-sm transition ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      <span
        className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full opacity-70"
        style={{ background: contentKindAccent(card.kind) }}
        aria-hidden="true"
      />
      <Body card={card} />
      <DragHandle />
    </div>
  );
}

function Body({ card }: { card: ContentCardT }) {
  switch (card.kind) {
    case "hashtag":
      return (
        <span className="text-[12.5px] font-medium text-charcoal/75">
          #{card.tag}
        </span>
      );
    case "tier_row":
      return (
        <div className="flex items-baseline gap-2">
          <span className="font-heading font-bold text-[15px] text-amber-dark shrink-0">
            £{card.amountGbp}
          </span>
          <span className="text-[12.5px] text-charcoal/80 leading-snug">
            {card.shortDescription}
          </span>
        </div>
      );
    case "quote":
      return (
        <div>
          <p className="text-[12.5px] italic font-serif text-charcoal/85 leading-snug">
            &ldquo;{truncate(card.text, 130)}&rdquo;
          </p>
          <p className="text-[11px] text-charcoal/50 mt-1">— {card.attribution}</p>
        </div>
      );
    case "fact":
      return (
        <div>
          <p className="text-[12.5px] text-charcoal/85 leading-snug">
            {truncate(card.text, 140)}
          </p>
          {card.source && (
            <p className="text-[10.5px] text-charcoal/45 mt-1">{card.source}</p>
          )}
        </div>
      );
    default:
      return (
        <p className="text-[12.5px] text-charcoal/80 leading-snug whitespace-pre-line line-clamp-4">
          {truncate(card.text, 200)}
        </p>
      );
  }
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1).trimEnd() + "…";
}

function DragHandle() {
  return (
    <svg
      className="absolute top-2 right-1.5 w-3.5 h-3.5 text-charcoal/25 opacity-0 group-hover:opacity-100 transition-opacity"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <circle cx="7" cy="5" r="1.4" />
      <circle cx="13" cy="5" r="1.4" />
      <circle cx="7" cy="10" r="1.4" />
      <circle cx="13" cy="10" r="1.4" />
      <circle cx="7" cy="15" r="1.4" />
      <circle cx="13" cy="15" r="1.4" />
    </svg>
  );
}
