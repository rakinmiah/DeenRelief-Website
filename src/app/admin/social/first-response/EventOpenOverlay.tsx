"use client";

/**
 * EventOpenOverlay — the full-card click target on a First Response row.
 * Instead of jumping straight to the deck builder, tapping a report opens a
 * small, smoothly-animated popup asking what she wants to do: build a post from
 * it, or read the original article. Sits at z-0 beneath the row's other
 * interactive controls (source link, delete) so those still work.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function EventOpenOverlay({
  eventId,
  title,
  sourceUrl,
}: {
  eventId: string;
  title: string;
  sourceUrl: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [going, setGoing] = useState(false);

  function build() {
    setGoing(true);
    router.push(`/admin/social/deck-builder/${eventId}`);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Open: ${title}`}
        className="absolute inset-0 z-0"
      />

      {open && (
        <div
          className="dr-anim-overlay fixed inset-0 z-[60] bg-charcoal/40 grid place-items-center p-6"
          onMouseDown={() => !going && setOpen(false)}
        >
          <div
            className="dr-anim-dialog bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal/35 mb-1.5">
              Emergency report
            </p>
            <h2 className="font-heading font-semibold text-charcoal text-[17px] leading-snug mb-1">
              What would you like to do?
            </h2>
            <p className="text-[12.5px] text-charcoal/50 leading-snug mb-5 line-clamp-2">{title}</p>

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={build}
                disabled={going}
                className="group flex items-center gap-3 rounded-xl bg-green text-white px-4 py-3 text-left hover:bg-green-dark disabled:opacity-75 transition-colors"
              >
                <span className="shrink-0 w-9 h-9 rounded-lg bg-white/15 grid place-items-center">
                  {going ? (
                    <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                      <rect x="3" y="3" width="7" height="9" rx="1.5" />
                      <rect x="14" y="3" width="7" height="5" rx="1.5" />
                      <rect x="14" y="12" width="7" height="9" rx="1.5" />
                      <rect x="3" y="16" width="7" height="5" rx="1.5" />
                    </svg>
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold text-[14px]">{going ? "Opening builder…" : "Build a post"}</span>
                  <span className="block text-[12px] text-white/75 leading-snug">Turn this report into social slides</span>
                </span>
              </button>

              {sourceUrl && (
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  onClick={() => setOpen(false)}
                  className="group flex items-center gap-3 rounded-xl ring-1 ring-charcoal/12 px-4 py-3 text-left hover:ring-charcoal/30 hover:bg-charcoal/[0.02] transition"
                >
                  <span className="shrink-0 w-9 h-9 rounded-lg bg-charcoal/5 grid place-items-center text-charcoal/60">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                      <path d="M4 5h11a2 2 0 0 1 2 2v12M4 5v14h13M4 5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M7 9h7M7 13h5" strokeLinecap="round" />
                    </svg>
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold text-[14px] text-charcoal">Read the article</span>
                    <span className="block text-[12px] text-charcoal/50 leading-snug">Open the original source ↗</span>
                  </span>
                </a>
              )}
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-4 w-full text-center text-[12.5px] text-charcoal/45 hover:text-charcoal transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}
