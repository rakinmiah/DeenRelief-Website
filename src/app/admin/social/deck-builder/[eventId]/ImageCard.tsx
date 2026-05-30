"use client";

/**
 * A single draggable image candidate in the RIGHT column.
 *
 * Shows thumbnail + source badge ("DR LIBRARY" amber / "EXTERNAL"
 * cream) + orientation tag. Hover surfaces the description (if any)
 * as a tooltip.
 */

import { useDraggable } from "@dnd-kit/core";
import type { ImageCandidate } from "@/lib/social-templates/types";
import type { DragPayload } from "./types";

export default function ImageCardItem({ image }: { image: ImageCandidate }) {
  const payload: DragPayload = { kind: "image", image };

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `image:${image.id}`,
    data: payload,
  });

  const thumb = image.thumbnailUrl ?? image.url;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`cursor-grab active:cursor-grabbing select-none rounded-xl border border-charcoal/10 overflow-hidden bg-white transition-shadow hover:shadow-md ${
        isDragging ? "opacity-40" : ""
      }`}
      title={image.description ?? undefined}
    >
      <div className="relative aspect-square bg-charcoal/5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={thumb}
          alt={image.description ?? ""}
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />
        <span
          className={`absolute top-1.5 left-1.5 text-[9px] font-bold tracking-[0.1em] uppercase px-1.5 py-0.5 rounded-sm ${
            image.source === "dr_library"
              ? "bg-amber-light text-amber-dark"
              : "bg-cream text-charcoal/80 border border-charcoal/10"
          }`}
        >
          {image.source === "dr_library" ? "DR Library" : "External"}
        </span>
        <span className="absolute bottom-1.5 right-1.5 text-[9px] font-semibold tracking-[0.06em] uppercase px-1.5 py-0.5 rounded-sm bg-charcoal/70 text-white">
          {image.orientation}
        </span>
      </div>
      {image.creditText && (
        <p className="text-[10px] text-charcoal/60 px-2 py-1.5 leading-tight">
          {image.creditText}
        </p>
      )}
    </div>
  );
}
