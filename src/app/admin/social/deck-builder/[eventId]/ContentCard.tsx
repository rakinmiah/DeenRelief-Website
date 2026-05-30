"use client";

/**
 * A single draggable content card in the LEFT column.
 *
 * Color coded by kind per the Phase 6e spec:
 *   title      → amber tint
 *   body       → cream
 *   fact       → forest green (with source line)
 *   quote      → Lora italic, ornament treatment
 *   hashtag    → small pill
 *   tier_row   → structured card with £ and description
 *   caption_ig → mono-ish treatment, scrolled overflow
 *   others     → neutral
 *
 * Dragging is wired through dnd-kit's useDraggable. The `data` payload
 * tells the drop handler which content kind to expect — see
 * DragPayload in ./types.
 */

import { useDraggable } from "@dnd-kit/core";
import type { ContentCard as ContentCardT } from "@/lib/social-templates/types";
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
      className={`cursor-grab active:cursor-grabbing select-none ${cardClasses(card)} ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <span className="text-[10px] font-bold tracking-[0.12em] uppercase">
          {kindLabel(card.kind)}
        </span>
        <DragHandle />
      </div>
      <Body card={card} />
    </div>
  );
}

function cardClasses(card: ContentCardT): string {
  const base =
    "rounded-xl border p-3 text-[12.5px] leading-snug transition-shadow hover:shadow-sm";
  switch (card.kind) {
    case "title":
      return `${base} bg-amber-light/60 border-amber/40 text-charcoal`;
    case "eyebrow":
      return `${base} bg-cream border-charcoal/10 text-charcoal/80 uppercase tracking-[0.1em] text-[11px]`;
    case "body":
      return `${base} bg-cream border-charcoal/10 text-charcoal/85`;
    case "fact":
      return `${base} bg-green-light/40 border-green/30 text-charcoal`;
    case "quote":
      return `${base} bg-white border-charcoal/15 text-charcoal italic font-serif`;
    case "hashtag":
      return `${base} bg-charcoal/5 border-charcoal/10 text-charcoal/80 inline-flex items-center w-fit !rounded-full !px-2.5 !py-1 !text-[12px]`;
    case "tier_row":
      return `${base} bg-white border-amber/40 text-charcoal`;
    case "caption_ig":
    case "caption_fb":
    case "caption_x":
      return `${base} bg-white border-charcoal/15 text-charcoal/80 font-mono text-[11.5px] max-h-28 overflow-hidden`;
    case "email_subject":
    case "email_body":
      return `${base} bg-white border-charcoal/10 text-charcoal/80`;
    case "source":
      return `${base} bg-white border-charcoal/10 text-charcoal/60 text-[11px]`;
    default:
      return `${base} bg-white border-charcoal/10 text-charcoal/80`;
  }
}

function kindLabel(kind: ContentCardT["kind"]): string {
  switch (kind) {
    case "caption_ig":
      return "Caption · IG";
    case "caption_fb":
      return "Caption · FB";
    case "caption_x":
      return "Caption · X";
    case "tier_row":
      return "Tier";
    case "email_subject":
      return "Email subject";
    case "email_body":
      return "Email body";
    default:
      return kind;
  }
}

function Body({ card }: { card: ContentCardT }) {
  switch (card.kind) {
    case "hashtag":
      return <span>#{card.tag}</span>;
    case "tier_row":
      return (
        <div>
          <div className="flex items-baseline gap-2">
            <span className="font-heading font-bold text-[16px] text-amber-dark">
              £{card.amountGbp}
            </span>
            <span className="font-semibold text-[12.5px]">
              {card.shortDescription}
            </span>
          </div>
          {card.longDescription && (
            <p className="text-charcoal/65 text-[11.5px] mt-1 leading-snug">
              {card.longDescription}
            </p>
          )}
        </div>
      );
    case "quote":
      return (
        <div>
          <p className="leading-snug">&ldquo;{truncate(card.text, 140)}&rdquo;</p>
          <p className="not-italic font-sans text-[11px] text-charcoal/60 mt-1">
            — {card.attribution}
          </p>
        </div>
      );
    case "fact":
      return (
        <div>
          <p className="leading-snug font-semibold">
            {truncate(card.text, 140)}
          </p>
          {card.source && (
            <p className="text-[10.5px] text-charcoal/55 mt-1 uppercase tracking-[0.06em]">
              {card.source}
            </p>
          )}
        </div>
      );
    case "title":
    case "body":
    case "eyebrow":
    case "caption_ig":
    case "caption_fb":
    case "caption_x":
    case "email_subject":
    case "email_body":
    case "source":
      return <p className="whitespace-pre-line">{truncate(card.text, 220)}</p>;
    default:
      return null;
  }
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1).trimEnd() + "…";
}

function DragHandle() {
  return (
    <svg
      className="w-3.5 h-3.5 text-charcoal/30 shrink-0 mt-0.5"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <circle cx="6" cy="5" r="1.5" />
      <circle cx="14" cy="5" r="1.5" />
      <circle cx="6" cy="10" r="1.5" />
      <circle cx="14" cy="10" r="1.5" />
      <circle cx="6" cy="15" r="1.5" />
      <circle cx="14" cy="15" r="1.5" />
    </svg>
  );
}
