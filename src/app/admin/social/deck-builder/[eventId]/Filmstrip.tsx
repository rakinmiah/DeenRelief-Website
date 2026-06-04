"use client";

/**
 * Filmstrip — a horizontal strip of slide thumbnails beneath the big
 * editor (Phase 7). Canva-style: each slide is a small preview thumb;
 * clicking selects it (the big editor above shows the selected slide),
 * dragging reorders (dnd-kit horizontal sortable, same `slide:{id}`
 * ids the parent's onDragEnd already understands). An add button sits
 * at the end. Scales gracefully past 3–4 slides where the old vertical
 * stack of full editors did not.
 */

import { useSortable } from "@dnd-kit/sortable";
import {
  SortableContext,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { SlideDraft } from "./types";

interface Props {
  slides: SlideDraft[];
  selectedId: string | null;
  /** slideId → latest ready preview URL (null while empty/loading). */
  previewBySlide: Record<string, string | null>;
  /** slideId → has a required slot still empty. */
  incompleteBySlide: Record<string, boolean>;
  onSelect: (slideId: string) => void;
  onRemove: (slideId: string) => void;
  onAdd: () => void;
}

export default function Filmstrip({
  slides,
  selectedId,
  previewBySlide,
  incompleteBySlide,
  onSelect,
  onRemove,
  onAdd,
}: Props) {
  return (
    <div className="rounded-xl bg-white ring-1 ring-charcoal/8 p-2.5">
      <div className="flex items-stretch gap-2 overflow-x-auto pb-0.5">
        <SortableContext
          items={slides.map((s) => `slide:${s.slideId}`)}
          strategy={horizontalListSortingStrategy}
        >
          {slides.map((s, i) => (
            <FilmstripThumb
              key={s.slideId}
              slideId={s.slideId}
              index={i}
              selected={s.slideId === selectedId}
              previewUrl={previewBySlide[s.slideId] ?? null}
              incomplete={incompleteBySlide[s.slideId] ?? false}
              onSelect={() => onSelect(s.slideId)}
              onRemove={() => onRemove(s.slideId)}
            />
          ))}
        </SortableContext>
        <AddThumb onClick={onAdd} />
      </div>
    </div>
  );
}

function FilmstripThumb({
  slideId,
  index,
  selected,
  previewUrl,
  incomplete,
  onSelect,
  onRemove,
}: {
  slideId: string;
  index: number;
  selected: boolean;
  previewUrl: string | null;
  incomplete: boolean;
  onSelect: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: `slide:${slideId}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="group/thumb relative shrink-0">
      <button
        type="button"
        {...attributes}
        {...listeners}
        onClick={onSelect}
        className={`relative block w-[72px] h-[72px] rounded-lg overflow-hidden bg-charcoal/[0.04] ring-2 transition cursor-pointer ${
          selected
            ? "ring-green"
            : "ring-transparent hover:ring-charcoal/20"
        }`}
        aria-label={`Slide ${index + 1}${selected ? " (selected)" : ""}`}
        aria-pressed={selected}
      >
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt=""
            className="w-full h-full object-cover pointer-events-none"
          />
        ) : (
          <span className="absolute inset-0 grid place-items-center text-[13px] font-semibold text-charcoal/30">
            {index + 1}
          </span>
        )}
        {/* Number chip */}
        <span className="absolute bottom-0.5 left-0.5 grid place-items-center min-w-[15px] h-[15px] px-1 rounded bg-charcoal/65 text-white text-[9.5px] font-semibold leading-none">
          {index + 1}
        </span>
        {incomplete && (
          <span
            className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber ring-1 ring-white"
            title="Has empty fields"
          />
        )}
      </button>
      {/* Remove — appears on hover, sits above the drag listeners */}
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="absolute -top-1.5 -right-1.5 grid place-items-center w-4 h-4 rounded-full bg-white ring-1 ring-charcoal/15 text-charcoal/50 hover:text-red hover:ring-red/30 opacity-0 group-hover/thumb:opacity-100 transition"
        aria-label={`Remove slide ${index + 1}`}
      >
        <svg className="w-2.5 h-2.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M6 6l8 8M14 6l-8 8" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

function AddThumb({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 w-[72px] h-[72px] rounded-lg border border-dashed border-charcoal/15 hover:border-green/40 hover:bg-green/[0.03] grid place-items-center text-charcoal/35 hover:text-green/70 transition"
      aria-label="Add a slide"
    >
      <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M10 5v10M5 10h10" strokeLinecap="round" />
      </svg>
    </button>
  );
}
