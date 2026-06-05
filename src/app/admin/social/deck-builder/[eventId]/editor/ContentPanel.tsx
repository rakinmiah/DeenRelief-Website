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
  sourceUrl,
  onPick,
  onClose,
}: {
  content: ContentBundle;
  /** Link to the originating news report — shown as "Open source". */
  sourceUrl?: string | null;
  /** A snippet was chosen — drop this exact text into a new block. */
  onPick: (text: string) => void;
  onClose: () => void;
}) {
  const sections = useMemo(() => buildSections(content), [content]);
  const total = sections.reduce((n, s) => n + s.items.length, 0);

  // ReliefWeb reports the AI researched this crisis from (transparency).
  const enrich = content.enrichmentSources ?? [];
  const agencies = [
    ...new Set(
      enrich
        .flatMap((s) => s.source.split(",").map((x) => x.trim()))
        .filter(Boolean)
    ),
  ];

  return (
    <aside className="dr-anim-panel w-[300px] shrink-0 bg-white border-r border-charcoal/8 flex flex-col min-h-0">
      <div className="flex items-center justify-between px-3.5 py-3 border-b border-charcoal/8 shrink-0">
        <div className="min-w-0">
          <p className="font-heading font-semibold text-charcoal text-[14px] leading-tight">Content</p>
          {sourceUrl ? (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1 text-[11px] font-medium text-green hover:text-green-dark"
            >
              Open source
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
                <path d="M4.5 2.5H9.5V7.5M9.5 2.5L4 8M2.5 4v5.5H8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          ) : (
            <p className="text-[11px] text-charcoal/45">From the report · tap to add text</p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close content"
          className="text-charcoal/40 hover:text-charcoal text-[20px] leading-none px-1 shrink-0"
        >
          ×
        </button>
      </div>

      {/* "Researched from" — the related ReliefWeb reports the AI mined for
          this crisis (collapsed; expand to see + open each). */}
      {enrich.length > 0 && (
        <details className="group border-b border-charcoal/8 shrink-0">
          <summary className="cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden px-3.5 py-2 flex items-center gap-1.5 text-[11px] text-charcoal/55 hover:text-charcoal/80 transition-colors">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0" aria-hidden>
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
            </svg>
            <span className="font-medium shrink-0">
              Researched from {enrich.length} {enrich.length === 1 ? "report" : "reports"}
            </span>
            {agencies.length > 0 && (
              <span className="text-charcoal/35 truncate">· {agencies.slice(0, 3).join(" · ")}</span>
            )}
            <span className="ml-auto text-charcoal/30 transition-transform group-open:rotate-90 shrink-0">▸</span>
          </summary>
          <ul className="px-3.5 pb-2.5 flex flex-col gap-1.5">
            {enrich.map((s, i) => (
              <li key={`${s.url}-${i}`} className="text-[11px] leading-snug">
                <a
                  href={s.url || undefined}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-green hover:text-green-dark hover:underline"
                >
                  {s.title}
                </a>
                <span className="text-charcoal/40">
                  {" "}
                  — {s.source}
                  {s.date ? ` · ${s.date}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto px-3 pt-1 pb-5">
        {total === 0 ? (
          <p className="text-[12.5px] text-charcoal/45 py-10 text-center px-2">
            No extracted content for this event yet.
          </p>
        ) : (
          sections.map((sec) => {
            const isHeadline = sec.key === "title";
            return (
              <section key={sec.key} className="mb-4">
                <div className="sticky top-0 z-10 -mx-3 px-3 py-1.5 bg-white border-b border-charcoal/[0.07] flex items-baseline justify-between gap-2">
                  <span className="text-[10.5px] font-semibold uppercase tracking-[0.13em] text-charcoal/50 truncate">
                    {sec.title}
                  </span>
                  <span className="text-[10px] font-medium text-charcoal/30 tabular-nums shrink-0">
                    {sec.items.length}
                  </span>
                </div>
                {sec.wrap ? (
                  <div className="flex flex-wrap gap-1.5 mt-2">
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
                  <div className="flex flex-col gap-1.5 mt-2">
                    {sec.items.map((it) => (
                      <button
                        key={it.id}
                        type="button"
                        onClick={() => onPick(it.text)}
                        className="group text-left rounded-lg px-3 py-2 bg-white ring-1 ring-charcoal/[0.09] hover:ring-green/50 hover:bg-green/[0.03] transition"
                      >
                        <span
                          className={`block leading-snug ${
                            isHeadline ? "text-[13px] font-semibold text-charcoal" : "text-[12.5px] text-charcoal/80"
                          }`}
                        >
                          {it.text}
                        </span>
                        {it.meta && (
                          <span className="block mt-1 text-[9.5px] font-medium uppercase tracking-[0.08em] text-charcoal/35 truncate">
                            {it.meta}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </section>
            );
          })
        )}
      </div>
    </aside>
  );
}
