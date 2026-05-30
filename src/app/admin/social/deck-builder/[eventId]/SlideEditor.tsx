"use client";

/**
 * SlideEditor — one slide in the middle column timeline.
 *
 * Responsibilities:
 *   • Sortable (dnd-kit useSortable) so the SMM can reorder slides
 *   • Per-slot drop targets — highlight compatible slots in green when
 *     a content/image card is being dragged using canDropContentInSlot
 *     / canDropImageInSlot
 *   • Live preview <img> bound to a render-result URL passed in from
 *     the parent (the parent owns the preview cache)
 *   • Slot list sidebar: shows slot id + hint + current value, with
 *     clear/edit affordances. Choice slots get a select dropdown.
 *   • Remove button
 */

import { useDndContext, useDroppable } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  canDropContentInSlot,
  canDropImageInSlot,
  type SlotSpec,
  type SlotType,
  type SlotValue,
  type TemplateMeta,
} from "@/lib/social-templates/types";
import type { DragPayload, SlideDraft } from "./types";

interface Props {
  slide: SlideDraft;
  template: TemplateMeta | null;
  index: number;
  previewState: PreviewState;
  onRemove: () => void;
  onClearSlot: (slotId: string) => void;
  onSetChoice: (slotId: string, value: string) => void;
}

export type PreviewState =
  | { state: "idle" }
  | { state: "loading"; previousUrl: string | null }
  | { state: "ready"; url: string }
  | { state: "error"; message: string };

export default function SlideEditor({
  slide,
  template,
  index,
  previewState,
  onRemove,
  onClearSlot,
  onSetChoice,
}: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: `slide:${slide.slideId}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white border border-charcoal/15 rounded-2xl overflow-hidden shadow-sm"
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-charcoal/8 bg-cream/50">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-charcoal/40 hover:text-charcoal/70 p-0.5"
            aria-label="Drag to reorder"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
              <circle cx="6" cy="5" r="1.5" />
              <circle cx="14" cy="5" r="1.5" />
              <circle cx="6" cy="10" r="1.5" />
              <circle cx="14" cy="10" r="1.5" />
              <circle cx="6" cy="15" r="1.5" />
              <circle cx="14" cy="15" r="1.5" />
            </svg>
          </button>
          <span className="text-[10px] font-bold tracking-[0.12em] uppercase text-charcoal/50">
            Slide {index + 1}
          </span>
          <span className="text-[12px] font-semibold text-charcoal truncate">
            {template?.name ?? slide.templateId}
          </span>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="text-[11px] text-charcoal/50 hover:text-red font-medium px-2 py-0.5"
          aria-label={`Remove slide ${index + 1}`}
        >
          × Remove
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_240px]">
        {/* ── Preview column ── */}
        <div className="p-4 border-r border-charcoal/8">
          <PreviewBox state={previewState} />
        </div>

        {/* ── Slot list column ── */}
        <div className="p-3 bg-cream/20">
          <h3 className="text-[10px] font-bold tracking-[0.12em] uppercase text-charcoal/50 mb-2 px-1">
            Slots
          </h3>
          <div className="flex flex-col gap-1.5">
            {template ? (
              template.slots.map((slot) => (
                <SlotRow
                  key={slot.id}
                  slideId={slide.slideId}
                  slot={slot}
                  value={slide.slotValues[slot.id]}
                  imageMediaId={slide.imageMediaIds[slot.id]}
                  onClear={() => onClearSlot(slot.id)}
                  onSetChoice={(v) => onSetChoice(slot.id, v)}
                />
              ))
            ) : (
              <p className="text-[11px] text-red px-1">
                Unknown template <code>{slide.templateId}</code>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewBox({ state }: { state: PreviewState }) {
  if (state.state === "idle") {
    return (
      <div className="aspect-square bg-charcoal/5 rounded-lg flex items-center justify-center text-[12px] text-charcoal/50">
        Drop content into slots to preview
      </div>
    );
  }
  if (state.state === "loading") {
    return (
      <div className="relative aspect-square bg-charcoal/5 rounded-lg overflow-hidden">
        {state.previousUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={state.previousUrl}
            alt="Slide preview (refreshing)"
            className="absolute inset-0 w-full h-full object-cover opacity-50"
          />
        )}
        <div className="absolute inset-0 flex items-center justify-center">
          <Spinner />
        </div>
      </div>
    );
  }
  if (state.state === "error") {
    return (
      <div className="aspect-square bg-red-50 border border-red-200 rounded-lg p-4 overflow-auto text-[11px] text-red-800 whitespace-pre-wrap">
        {state.message}
      </div>
    );
  }
  return (
    <div className="aspect-square rounded-lg overflow-hidden bg-charcoal/5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={state.url}
        alt="Slide preview"
        className="w-full h-full object-cover"
      />
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="animate-spin w-6 h-6 text-charcoal/50"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        opacity="0.25"
      />
      <path
        d="M22 12a10 10 0 0 1-10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** A single slot row in the slide sidebar. Becomes a drop target for
 *  the active drag and renders a compact value preview. Choice slots
 *  render an inline <select>. */
function SlotRow({
  slideId,
  slot,
  value,
  imageMediaId,
  onClear,
  onSetChoice,
}: {
  slideId: string;
  slot: SlotSpec;
  value: SlotValue | undefined;
  imageMediaId: string | undefined;
  onClear: () => void;
  onSetChoice: (value: string) => void;
}) {
  const dnd = useDndContext();
  const active = dnd.active?.data?.current as DragPayload | undefined;

  // Compatibility from the type guards. Choice slots are never dnd
  // targets — they're handled inline.
  const isChoice = slot.type.startsWith("choice:");
  const isCompatibleDrop = active
    ? active.kind === "content"
      ? canDropContentInSlot(active.card.kind, slot.type)
      : canDropImageInSlot(active.image.orientation, slot.type)
    : false;

  const { setNodeRef, isOver } = useDroppable({
    id: `slot:${slideId}:${slot.id}`,
    data: { slideId, slotId: slot.id, slotType: slot.type },
    disabled: isChoice,
  });

  const hasValue = value !== undefined || imageMediaId !== undefined;

  return (
    <div
      ref={setNodeRef}
      className={`rounded-md border px-2 py-1.5 transition-colors text-[11.5px] ${
        isChoice
          ? "bg-white border-charcoal/10"
          : isCompatibleDrop
            ? isOver
              ? "bg-green-light/80 border-green ring-2 ring-green/40"
              : "bg-green-light/30 border-green/50"
            : active
              ? "bg-charcoal/3 border-charcoal/10 opacity-60"
              : "bg-white border-charcoal/10"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold tracking-[0.08em] uppercase text-charcoal/55 truncate">
          {slot.id}
          {slot.required && <span className="text-red ml-0.5">*</span>}
        </span>
        {hasValue && !isChoice && (
          <button
            type="button"
            onClick={onClear}
            className="text-[10px] text-charcoal/40 hover:text-red"
            aria-label={`Clear ${slot.id}`}
          >
            clear
          </button>
        )}
      </div>
      {isChoice ? (
        <ChoiceSelect slot={slot} value={value} onSet={onSetChoice} />
      ) : (
        <SlotValueView
          slot={slot}
          value={value}
          imageMediaId={imageMediaId}
        />
      )}
      {!hasValue && slot.hint && (
        <p className="text-[10px] text-charcoal/45 mt-0.5 leading-tight">
          {slot.hint}
        </p>
      )}
    </div>
  );
}

function SlotValueView({
  slot,
  value,
  imageMediaId,
}: {
  slot: SlotSpec;
  value: SlotValue | undefined;
  imageMediaId: string | undefined;
}) {
  if (slot.type.startsWith("image:")) {
    return imageMediaId ? (
      <p className="text-[11px] text-charcoal mt-0.5 truncate font-mono">
        {imageMediaId}
      </p>
    ) : (
      <p className="text-[10.5px] text-charcoal/40 mt-0.5">(empty)</p>
    );
  }
  if (slot.type === "tier:rows") {
    if (value?.type === "tier_rows") {
      return (
        <p className="text-[10.5px] text-charcoal mt-0.5">
          {value.rows.length} row{value.rows.length === 1 ? "" : "s"}
        </p>
      );
    }
    return (
      <p className="text-[10.5px] text-charcoal/40 mt-0.5">(empty)</p>
    );
  }
  if (value?.type === "text") {
    return (
      <p className="text-[11px] text-charcoal mt-0.5 line-clamp-2">
        {value.text}
      </p>
    );
  }
  return <p className="text-[10.5px] text-charcoal/40 mt-0.5">(empty)</p>;
}

function ChoiceSelect({
  slot,
  value,
  onSet,
}: {
  slot: SlotSpec;
  value: SlotValue | undefined;
  onSet: (v: string) => void;
}) {
  const opts = choiceOptions(slot.type);
  const current = value?.type === "choice" ? value.value : "";
  return (
    <select
      className="w-full mt-1 text-[11px] bg-white border border-charcoal/15 rounded px-1.5 py-1 text-charcoal"
      value={current}
      onChange={(e) => onSet(e.target.value)}
    >
      <option value="">— pick —</option>
      {opts.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function choiceOptions(slotType: SlotType): string[] {
  switch (slotType) {
    case "choice:logo_variant":
      return ["green", "white"];
    case "choice:focal_point":
      return ["top", "center", "bottom"];
    case "choice:logo_position":
      return ["top_left", "top_right", "bottom_left", "bottom_right"];
    default:
      return [];
  }
}
