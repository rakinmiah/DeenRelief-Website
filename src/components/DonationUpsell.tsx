"use client";

import type { UpsellChip } from "@/lib/donation-upsell";

/**
 * "Make your gift go further" nudge — a small amber card of tappable
 * "+£X · outcome" chips. Presentational only: the parent computes the chips
 * (via getUpsellChips) and decides what adding does. Renders nothing when
 * there are no chips, so callers can drop it in unconditionally.
 */
export default function DonationUpsell({
  chips,
  onAdd,
}: {
  chips: UpsellChip[];
  onAdd: (add: number) => void;
}) {
  if (chips.length === 0) return null;

  return (
    <div className="mb-5 rounded-xl border border-amber/30 bg-amber/[0.06] p-4 text-left">
      <p className="text-[11px] font-bold tracking-[0.08em] uppercase text-amber-dark mb-2.5 flex items-center gap-1.5">
        <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.368 2.447a1 1 0 00-.364 1.118l1.287 3.957c.3.922-.755 1.688-1.54 1.118l-3.367-2.447a1 1 0 00-1.176 0l-3.366 2.447c-.784.57-1.838-.196-1.539-1.118l1.286-3.957a1 1 0 00-.363-1.118L2.98 9.385c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.951-.69l1.287-3.957z" />
        </svg>
        Make your gift go further
      </p>
      <div className="space-y-2">
        {chips.map((chip) => (
          <button
            key={`${chip.add}-${chip.outcome}`}
            type="button"
            onClick={() => onAdd(chip.add)}
            className="group w-full flex items-center gap-2.5 rounded-lg border border-amber/30 bg-white px-3 py-2 text-left transition-colors duration-200 hover:border-amber hover:bg-amber/[0.06] focus:outline-none focus:ring-2 focus:ring-amber/20"
          >
            <span className="text-amber-dark font-bold text-sm whitespace-nowrap">
              +£{chip.add}
            </span>
            <span className="text-[13px] text-charcoal/80 leading-snug">
              {chip.outcome}
            </span>
            <svg
              className="ml-auto w-4 h-4 flex-shrink-0 text-amber-dark/40 group-hover:text-amber-dark transition-colors"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span className="sr-only">Add £{chip.add} to your donation for {chip.outcome}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
