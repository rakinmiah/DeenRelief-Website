"use client";

/**
 * Template picker modal (Phase 7 redesign). Lists templates grouped by
 * category as calm, borderless cards. Preview thumbnails render from
 * template.previewPath when present; until those are pre-generated we
 * fall back to an intentional typographic placeholder (not a grey
 * void). Clicking a template inserts a new slide.
 */

import { useEffect, useState } from "react";
import type { TemplateMeta } from "@/lib/social-templates/types";
import type { TemplateGroups } from "./types";

interface Props {
  groups: TemplateGroups;
  onPick: (t: TemplateMeta) => void;
  onClose: () => void;
}

const CATEGORY_ORDER: string[] = [
  "hero",
  "fact",
  "stat",
  "response",
  "testimony",
  "tiers",
  "chapter",
  "cta",
];

const CATEGORY_LABELS: Record<string, string> = {
  hero: "Hero",
  fact: "Fact",
  stat: "Stat",
  response: "Response",
  testimony: "Testimony",
  tiers: "Donation tiers",
  chapter: "Chapter",
  cta: "Call to action",
};

export default function TemplatePicker({ groups, onPick, onClose }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const orderedCategories = CATEGORY_ORDER.filter(
    (c) => (groups[c]?.length ?? 0) > 0
  );

  return (
    <div
      className="fixed inset-0 z-50 bg-charcoal/30 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl ring-1 ring-charcoal/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-charcoal/6">
          <div>
            <h2 className="font-heading font-semibold text-[17px] text-charcoal">
              Add a slide
            </h2>
            <p className="text-[12px] text-charcoal/45 mt-0.5">
              Pick a layout — you&apos;ll fill it with content next.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-charcoal/35 hover:text-charcoal/70 p-1 -mr-1"
            aria-label="Close"
          >
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M6 6l8 8M14 6l-8 8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5 flex flex-col gap-6">
          {orderedCategories.length === 0 ? (
            <p className="text-center text-charcoal/45 py-8 text-[13px]">
              No templates available for this platform yet.
            </p>
          ) : (
            orderedCategories.map((category) => (
              <section key={category}>
                <h3 className="text-[12px] font-semibold text-charcoal/40 mb-2.5">
                  {CATEGORY_LABELS[category] ?? category}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {(groups[category] ?? []).map((meta) => (
                    <TemplateCard key={meta.id} meta={meta} onPick={onPick} />
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function TemplateCard({
  meta,
  onPick,
}: {
  meta: TemplateMeta;
  onPick: (t: TemplateMeta) => void;
}) {
  const [thumbOk, setThumbOk] = useState(true);
  return (
    <button
      type="button"
      onClick={() => onPick(meta)}
      className="group text-left rounded-xl ring-1 ring-charcoal/8 hover:ring-green/40 hover:shadow-sm bg-white transition flex gap-3 items-stretch p-2.5"
    >
      <div className="w-16 h-16 rounded-lg shrink-0 overflow-hidden bg-green/[0.06] grid place-items-center">
        {thumbOk ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={meta.previewPath}
            alt=""
            className="w-full h-full object-cover"
            onError={() => setThumbOk(false)}
          />
        ) : (
          // Intentional placeholder: the aspect glyph hints at the
          // layout family until pre-rendered thumbnails ship.
          <AspectGlyph aspect={meta.aspect} />
        )}
      </div>
      <div className="min-w-0 flex-1 py-0.5">
        <p className="font-medium text-[13.5px] text-charcoal leading-snug">
          {meta.name}
        </p>
        <p className="text-[11.5px] text-charcoal/55 mt-1 leading-snug line-clamp-2">
          {meta.description}
        </p>
      </div>
    </button>
  );
}

function AspectGlyph({ aspect }: { aspect: TemplateMeta["aspect"] }) {
  const box =
    aspect === "wide" ? "w-9 h-6" : aspect === "portrait" ? "w-5 h-8" : "w-7 h-7";
  return (
    <span
      className={`${box} rounded-sm border-2 border-green/30 group-hover:border-green/50 transition-colors`}
      aria-hidden="true"
    />
  );
}
