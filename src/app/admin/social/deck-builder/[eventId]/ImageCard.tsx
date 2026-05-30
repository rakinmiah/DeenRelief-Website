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
      className={`group cursor-grab active:cursor-grabbing select-none rounded-xl ring-1 ring-charcoal/8 hover:ring-charcoal/20 overflow-hidden bg-white transition ${
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
        {/* Source dot — quiet, top-left. Amber = DR's own, grey = external. */}
        <span
          className={`absolute top-1.5 left-1.5 flex items-center gap-1 rounded-full bg-white/85 backdrop-blur-sm pl-1 pr-1.5 py-0.5 text-[10px] font-medium text-charcoal/70 shadow-sm ${
            image.source === "dr_library" ? "" : ""
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              image.source === "dr_library" ? "bg-amber" : "bg-charcoal/35"
            }`}
          />
          {image.source === "dr_library" ? "DR" : "Web"}
        </span>
        {/* Orientation — tiny, only on hover. */}
        <span className="absolute bottom-1.5 right-1.5 rounded-full bg-charcoal/55 px-1.5 py-0.5 text-[9.5px] font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity">
          {orientationLabel(image.orientation)}
        </span>
      </div>
      {image.creditText && (
        <p className="text-[10px] text-charcoal/50 px-2 py-1 leading-tight line-clamp-1">
          {image.creditText}
        </p>
      )}
    </div>
  );
}

function orientationLabel(o: ImageCandidate["orientation"]): string {
  return o === "portrait" ? "Portrait" : o === "landscape" ? "Landscape" : "Square";
}
