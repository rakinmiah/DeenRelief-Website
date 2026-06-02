"use client";

/**
 * ContentPanel — a left flyout (twin of TemplatesPanel) that surfaces the
 * extracted news-report content as clickable snippets, grouped by kind
 * (headlines, key facts, context, quotes, date/location tags, donation
 * tiers, hashtags). Clicking a snippet drops a new text block onto the slide
 * the SMM is currently on, so she can assemble copy from the report without
 * retyping. Source/attribution is shown under the snippet for context but the
 * inserted text is just the line itself.
 */

import { useMemo } from "react";
import type { ContentBundle } from "../types";

type Snippet = { id: string; text: string; meta?: string };
type Section = { key: string; title: string; items: Snippet[]; wrap?: boolean };

function buildSections(content: ContentBundle): Section[] {
  const cards = content.cards ?? [];
  const pick = <T,>(fn: (c: (typeof cards)[number]["card"], id: string) => T | null): T[] =>
    cards.map((c) => fn(c.card, c.id)).filter((x): x is T => x !== null);

  const titles = pick<Snippet>((c, id) => (c.kind === "title" ? { id, text: c.text } : null));
  const facts = pick<Snippet>((c, id) =>
    c.kind === "fact" ? { id, text: c.text, meta: c.source ?? undefined } : null
  );
  const bodies = pick<Snippet>((c, id) => (c.kind === "body" ? { id, text: c.text } : null));
  const quotes = pick<Snippet>((c, id) =>
    c.kind === "quote" ? { id, text: c.text, meta: c.attribution || undefined } : null
  );
  const eyebrows = pick<Snippet>((c, id) => (c.kind === "eyebrow" ? { id, text: c.text } : null));
  const tiers = pick<Snippet>((c, id) =>
    c.kind === "tier_row" ? { id, text: `£${c.amountGbp} — ${c.shortDescription}` } : null
  );
  const hashtags = pick<Snippet>((c, id) => (c.kind === "hashtag" ? { id, text: `#${c.tag}` } : null));

  return [
    { key: "title", title: "Headlines", items: titles },
    { key: "fact", title: "Key facts", items: facts },
    { key: "body", title: "Context", items: bodies },
    { key: "quote", title: "Quotes", items: quotes },
    { key: "eyebrow", title: "Date / location tags", items: eyebrows },
    { key: "tier_row", title: "Donation tiers", items: tiers },
    { key: "hashtag", title: "Hashtags", items: hashtags, wrap: true },
  ].filter((s) => s.items.length > 0);
}

export default function ContentPanel({
  content,
  onPick,
  onClose,
}: {
  content: ContentBundle;
  /** A snippet was chosen — drop this exact text into a new block. */
  onPick: (text: string) => void;
  onClose: () => void;
}) {
  const sections = useMemo(() => buildSections(content), [content]);
  const total = sections.reduce((n, s) => n + s.items.length, 0);

  return (
    <aside className="w-[300px] shrink-0 bg-white border-r border-charcoal/8 flex flex-col min-h-0">
      <div className="flex items-center justify-between px-3.5 py-3 border-b border-charcoal/8 shrink-0">
        <div>
          <p className="font-heading font-semibold text-charcoal text-[14px] leading-tight">Content</p>
          <p className="text-[11px] text-charcoal/45">From the report · tap to add text</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close content"
          className="text-charcoal/40 hover:text-charcoal text-[20px] leading-none px-1"
        >
          ×
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3">
        {total === 0 ? (
          <p className="text-[12.5px] text-charcoal/45 py-10 text-center px-2">
            No extracted content for this event yet.
          </p>
        ) : (
          sections.map((sec) => (
            <section key={sec.key} className="mb-5">
              <div className="sticky top-0 z-10 -mx-3 px-3 py-2 bg-white/95 backdrop-blur border-b border-charcoal/8 flex items-baseline justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal/55 truncate">
                  {sec.title}
                </span>
                <span className="text-[10.5px] font-medium text-charcoal/35 tabular-nums shrink-0">
                  {sec.items.length}
                </span>
              </div>
              {sec.wrap ? (
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {sec.items.map((it) => (
                    <button
                      key={it.id}
                      type="button"
                      onClick={() => onPick(it.text)}
                      className="px-2.5 py-1 rounded-full text-[12px] font-medium bg-charcoal/[0.04] text-charcoal/70 ring-1 ring-charcoal/8 hover:bg-green/10 hover:text-green hover:ring-green/30 transition"
                    >
                      {it.text}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-2 mt-2.5">
                  {sec.items.map((it) => (
                    <button
                      key={it.id}
                      type="button"
                      onClick={() => onPick(it.text)}
                      className="group text-left rounded-lg px-3 py-2.5 bg-white ring-1 ring-charcoal/10 hover:ring-green/50 hover:bg-green/[0.03] transition"
                    >
                      <span className="block text-[12.5px] leading-snug text-charcoal/85">{it.text}</span>
                      {it.meta && (
                        <span className="block mt-1 text-[10.5px] text-charcoal/40 truncate">{it.meta}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </section>
          ))
        )}
      </div>
    </aside>
  );
}
