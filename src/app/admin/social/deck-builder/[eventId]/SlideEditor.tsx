"use client";

/**
 * SlideEditor — one slide in the deck timeline (Phase 7 redesign).
 *
 * Layout: the rendered PREVIEW is the hero (left, large, always shows
 * something — a partial/blank branded slide, never a red error). A
 * quiet panel of Linear-style property rows sits on the right: each
 * slot is a friendly-labelled row (drop target for content/images),
 * choice slots are inline selects with human option labels. No caps,
 * no raw slot ids, no boxes-on-everything.
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
import { choiceLabel, slotLabel } from "./labels";
import type { DragPayload, SlideDraft } from "./types";

interface Props {
  slide: SlideDraft;
  template: TemplateMeta | null;
  index: number;
  previewState: PreviewState;
  /** Resolve a slot's image mediaId → a thumbnail URL for the chip. */
  resolveImageThumb: (mediaId: string) => string | null;
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
  resolveImageThumb,
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

  // Slots that are required but still empty — drives the quiet
  // "incomplete" hint, not a render error.
  const incompleteCount = template
    ? template.slots.filter((s) => s.required && !slotFilled(s, slide)).length
    : 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group/slide rounded-2xl bg-white ring-1 ring-charcoal/8 hover:ring-charcoal/15 transition-shadow"
    >
      {/* ── Header ── */}
      <div className="flex items-center gap-2.5 px-4 pt-3 pb-2">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-charcoal/25 hover:text-charcoal/55 -ml-1 p-0.5 transition-colors"
          aria-label="Drag to reorder"
        >
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <circle cx="7" cy="5" r="1.4" />
            <circle cx="13" cy="5" r="1.4" />
            <circle cx="7" cy="10" r="1.4" />
            <circle cx="13" cy="10" r="1.4" />
            <circle cx="7" cy="15" r="1.4" />
            <circle cx="13" cy="15" r="1.4" />
          </svg>
        </button>
        <span className="grid place-items-center w-5 h-5 rounded-md bg-charcoal/5 text-[11px] font-semibold text-charcoal/60 shrink-0">
          {index + 1}
        </span>
        <span className="text-[13px] font-medium text-charcoal truncate">
          {template?.name ?? slide.templateId}
        </span>
        {incompleteCount > 0 && (
          <span
            className="ml-1 inline-flex items-center gap-1 text-[11px] text-amber-dark"
            title={`${incompleteCount} field${incompleteCount === 1 ? "" : "s"} still empty`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber" />
            {incompleteCount} to fill
          </span>
        )}
        <button
          type="button"
          onClick={onRemove}
          className="ml-auto text-[12px] text-charcoal/35 hover:text-red opacity-0 group-hover/slide:opacity-100 transition-opacity px-1.5 py-0.5"
          aria-label={`Remove slide ${index + 1}`}
        >
          Remove
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_248px] gap-4 p-4 pt-1">
        {/* ── Preview (hero) ── */}
        <PreviewBox state={previewState} />

        {/* ── Slot rows ── */}
        <div className="flex flex-col">
          {template ? (
            <div className="flex flex-col divide-y divide-charcoal/6">
              {template.slots.map((slot) => (
                <SlotRow
                  key={slot.id}
                  slideId={slide.slideId}
                  slot={slot}
                  value={slide.slotValues[slot.id]}
                  imageMediaId={slide.imageMediaIds[slot.id]}
                  thumb={
                    slide.imageMediaIds[slot.id]
                      ? resolveImageThumb(slide.imageMediaIds[slot.id]!)
                      : null
                  }
                  onClear={() => onClearSlot(slot.id)}
                  onSetChoice={(v) => onSetChoice(slot.id, v)}
                />
              ))}
            </div>
          ) : (
            <p className="text-[12px] text-red/80">
              This template is no longer available.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Preview ────────────────────────────────────────────────────── */

function PreviewBox({ state }: { state: PreviewState }) {
  // Always a square frame. The render-always endpoint means we almost
  // never hit the error branch; when we do it's quiet, not a red wall.
  return (
    <div className="relative aspect-square rounded-xl overflow-hidden bg-charcoal/[0.04] ring-1 ring-charcoal/5">
      {state.state === "ready" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={state.url}
          alt="Slide preview"
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
      {state.state === "loading" && (
        <>
          {state.previousUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={state.previousUrl}
              alt="Slide preview (refreshing)"
              className="absolute inset-0 w-full h-full object-cover opacity-40"
            />
          )}
          <div className="absolute inset-0 grid place-items-center">
            <Spinner />
          </div>
        </>
      )}
      {state.state === "idle" && (
        <div className="absolute inset-0 grid place-items-center px-6 text-center">
          <p className="text-[12px] text-charcoal/40 leading-relaxed">
            Drag content and a photo
            <br />
            to build this slide
          </p>
        </div>
      )}
      {state.state === "error" && (
        <div className="absolute inset-0 grid place-items-center px-6 text-center">
          <p className="text-[12px] text-charcoal/45 leading-relaxed">
            Couldn&apos;t render this slide.
            <br />
            <span className="text-charcoal/30">Adjust a field to retry.</span>
          </p>
        </div>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin w-5 h-5 text-charcoal/40" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path
        d="M22 12a10 10 0 0 1-10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ─── Slot row (Linear-style) ────────────────────────────────────── */

function SlotRow({
  slideId,
  slot,
  value,
  imageMediaId,
  thumb,
  onClear,
  onSetChoice,
}: {
  slideId: string;
  slot: SlotSpec;
  value: SlotValue | undefined;
  imageMediaId: string | undefined;
  thumb: string | null;
  onClear: () => void;
  onSetChoice: (value: string) => void;
}) {
  const dnd = useDndContext();
  const active = dnd.active?.data?.current as DragPayload | undefined;

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

  const filled = value !== undefined || imageMediaId !== undefined;

  return (
    <div
      ref={setNodeRef}
      className={`group/row relative flex items-center gap-2.5 py-2 px-1.5 -mx-1.5 rounded-lg transition-colors ${
        isCompatibleDrop
          ? isOver
            ? "bg-green-light ring-1 ring-green/50"
            : "bg-green-light/40"
          : active && !isChoice
            ? "opacity-50"
            : ""
      }`}
    >
      {/* Status dot: amber if required+empty, faint green if filled */}
      <span
        className={`mt-0.5 w-1.5 h-1.5 rounded-full shrink-0 ${
          filled ? "bg-green/60" : slot.required ? "bg-amber" : "bg-charcoal/15"
        }`}
      />

      <div className="min-w-0 flex-1">
        <div className="text-[12px] font-medium text-charcoal/80 leading-none">
          {slotLabel(slot)}
        </div>
        {isChoice ? (
          <ChoiceSelect slot={slot} value={value} onSet={onSetChoice} />
        ) : (
          <SlotValueView
            slot={slot}
            value={value}
            thumb={thumb}
          />
        )}
      </div>

      {filled && !isChoice && (
        <button
          type="button"
          onClick={onClear}
          className="shrink-0 text-charcoal/30 hover:text-charcoal/70 opacity-0 group-hover/row:opacity-100 transition-opacity"
          aria-label={`Clear ${slotLabel(slot)}`}
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 6l8 8M14 6l-8 8" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  );
}

function SlotValueView({
  slot,
  value,
  thumb,
}: {
  slot: SlotSpec;
  value: SlotValue | undefined;
  thumb: string | null;
}) {
  if (slot.type.startsWith("image:")) {
    return thumb ? (
      <div className="mt-1 flex items-center gap-1.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={thumb}
          alt=""
          className="w-7 h-7 rounded object-cover ring-1 ring-charcoal/10"
        />
        <span className="text-[11px] text-charcoal/45">Photo set</span>
      </div>
    ) : (
      <Placeholder>Drop a photo</Placeholder>
    );
  }
  if (slot.type === "tier:rows") {
    return value?.type === "tier_rows" ? (
      <p className="text-[11.5px] text-charcoal/55 mt-0.5">
        {value.rows.length} tier{value.rows.length === 1 ? "" : "s"}
      </p>
    ) : (
      <Placeholder>Drop donation tiers</Placeholder>
    );
  }
  if (value?.type === "text") {
    return (
      <p className="text-[11.5px] text-charcoal/55 mt-0.5 line-clamp-1">
        {value.text}
      </p>
    );
  }
  return <Placeholder>{slot.hint ?? "Drop content here"}</Placeholder>;
}

function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11.5px] text-charcoal/35 mt-0.5 line-clamp-1">{children}</p>
  );
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
  const current =
    value?.type === "choice"
      ? value.value
      : (slot.defaultValue as string | undefined) ?? "";
  return (
    <select
      className="mt-0.5 -ml-0.5 w-full bg-transparent text-[11.5px] text-charcoal/70 hover:text-charcoal rounded px-0.5 py-0 focus:outline-none focus:ring-1 focus:ring-green/40 cursor-pointer"
      value={current}
      onChange={(e) => onSet(e.target.value)}
    >
      {opts.map((o) => (
        <option key={o} value={o}>
          {choiceLabel(slot.type, o)}
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

function slotFilled(slot: SlotSpec, slide: SlideDraft): boolean {
  if (slot.type.startsWith("image:")) return !!slide.imageMediaIds[slot.id];
  if (slot.type.startsWith("choice:")) return true; // always has a default
  return slide.slotValues[slot.id] !== undefined;
}
