"use client";

import { useState } from "react";
import MediaGallery, { type GalleryItem } from "./MediaGallery";
import { formatMonthYear, formatFullDate } from "./format";

interface TimelineUpdate {
  id: string;
  title: string;
  bodyHtml: string;
  periodLabel: string | null;
  publishedAt: string | null;
  media: GalleryItem[];
}

function snippet(html: string, max = 140): string {
  const t = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max).trimEnd()}…` : t;
}

function mediaSummary(media: GalleryItem[]): string {
  const photos = media.filter((m) => m.kind === "photo").length;
  const videos = media.length - photos;
  const parts: string[] = [];
  if (photos) parts.push(`${photos} photo${photos === 1 ? "" : "s"}`);
  if (videos) parts.push(`${videos} video${videos === 1 ? "" : "s"}`);
  return parts.join(" · ");
}

/**
 * A vertical journey timeline of expandable update cards. Each card is compact
 * by default (date · title · snippet · media count) and expands in place to
 * reveal the full text and that update's media (in context). The newest update
 * starts expanded so there's something to read on arrival.
 */
export default function UpdatesTimeline({
  updates,
}: {
  updates: TimelineUpdate[];
}) {
  const [open, setOpen] = useState<Set<string>>(
    () => new Set(updates[0] ? [updates[0].id] : [])
  );

  function toggle(id: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (updates.length === 0) {
    return (
      <p className="text-grey py-6">
        No updates yet — we&apos;ll post the first one soon.
      </p>
    );
  }

  return (
    <ol className="relative border-l border-charcoal/12 ml-2 sm:ml-3 space-y-5">
      {updates.map((u) => {
        const isOpen = open.has(u.id);
        return (
          <li key={u.id} className="relative pl-5 sm:pl-7">
            {/* timeline node */}
            <span
              className={`absolute -left-[6.5px] top-5 w-3 h-3 rounded-full ring-4 ring-white transition-colors ${
                isOpen ? "bg-green" : "bg-charcoal/25"
              }`}
              aria-hidden
            />

            <div className="rounded-2xl border border-charcoal/8 bg-white shadow-sm overflow-hidden">
              <button
                onClick={() => toggle(u.id)}
                aria-expanded={isOpen}
                className="w-full text-left px-4 sm:px-5 py-4 flex items-start gap-3 hover:bg-cream/60 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-green">
                      {u.periodLabel || formatMonthYear(u.publishedAt)}
                    </span>
                    {u.publishedAt && (
                      <span className="text-xs text-grey/50">
                        {formatFullDate(u.publishedAt)}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-heading font-bold text-charcoal leading-snug mt-1">
                    {u.title || "Update"}
                  </h3>
                  {!isOpen && (
                    <>
                      <p className="text-sm text-grey/90 mt-1 line-clamp-2">
                        {snippet(u.bodyHtml)}
                      </p>
                      {u.media.length > 0 && (
                        <span className="inline-flex items-center gap-1.5 mt-2 text-xs font-medium text-charcoal/60">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Z" />
                          </svg>
                          {mediaSummary(u.media)}
                        </span>
                      )}
                    </>
                  )}
                </div>
                <svg
                  className={`w-5 h-5 text-charcoal/30 shrink-0 mt-1 transition-transform duration-200 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isOpen && (
                <div className="px-4 sm:px-5 pb-5">
                  {u.media.length > 0 && (
                    <div className="mb-4">
                      <MediaGallery items={u.media} />
                    </div>
                  )}
                  {u.bodyHtml ? (
                    <div className="dr-prose" dangerouslySetInnerHTML={{ __html: u.bodyHtml }} />
                  ) : null}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
