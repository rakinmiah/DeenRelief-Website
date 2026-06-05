"use client";

/**
 * PostCompleteDialog — the "what now?" moment.
 *
 * Shown right after the SMM exports a finished post. Exporting downloads the
 * images, but the tracking + learning loop only starts if she (a) posts with a
 * tracked short link in the caption and (b) comes back to "Mark as posted".
 * Most people don't know that — so this lays out the three steps in plain
 * language and gives her a one-tap path into Mark as posted.
 *
 * Only rendered for real event-backed posts (the sandbox has nothing to track).
 */

import { useState, type ReactNode } from "react";

const PLATFORM_LABEL: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  x: "X",
};

export default function PostCompleteDialog({
  platform,
  credits = [],
  onMarkPosted,
  onClose,
}: {
  platform: string;
  /** Photo credits used in the deck — shown so she can add them to the
   *  caption / first comment (each is already baked onto its image). */
  credits?: string[];
  /** Open the Mark-as-posted dialog. */
  onMarkPosted: () => void;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const creditsBlock = credits.length
    ? `Image credits:\n${credits.join("\n")}`
    : "";
  async function copyCredits() {
    try {
      await navigator.clipboard.writeText(creditsBlock);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — the text is visible to copy by hand */
    }
  }
  const isIG = platform === "instagram";
  const isFB = platform === "facebook";
  const platformLabel = PLATFORM_LABEL[platform] ?? "your channel";

  const step1Body: ReactNode = isIG ? (
    <>
      Upload the images you just downloaded. Instagram captions aren&apos;t
      clickable — so put your{" "}
      <strong className="font-semibold text-charcoal/80">tracked link</strong>{" "}
      where people can tap it: set your bio link to{" "}
      <span className="font-mono text-[12px]">deenrelief.org/now</span> and point
      it at this post (next screen), or add it as a Story link sticker. That link
      is what we measure.
    </>
  ) : isFB ? (
    <>
      Upload the images you just downloaded. Put your{" "}
      <strong className="font-semibold text-charcoal/80">tracked link</strong> (
      <span className="font-mono text-[12px]">deenrelief.org/r/…</span>) in the
      post — or the first comment, since Facebook shows link posts to fewer
      people. That link is what we measure.
    </>
  ) : (
    <>
      Upload the image you just downloaded. Put your{" "}
      <strong className="font-semibold text-charcoal/80">tracked link</strong> (
      <span className="font-mono text-[12px]">deenrelief.org/r/…</span>) in the
      post text — that link is what we measure.
    </>
  );

  const steps: { title: string; body: ReactNode }[] = [
    {
      title: `Post it on ${platformLabel}`,
      body: step1Body,
    },
    {
      title: "Come back and Mark as posted",
      body: (
        <>
          Click <strong className="font-semibold text-charcoal/80">Mark as
          posted</strong>, pick that same short link, and paste the live post
          URL. That ties this post to its design and news story.
        </>
      ),
    },
    {
      title: "It gets smarter from here",
      body: (
        <>
          Every click and donation through the link flows back to this exact
          layout and topic. The builder learns which designs and stories raise
          the most — and your next draft starts ahead.
        </>
      ),
    },
  ];

  return (
    <div
      className="dr-anim-overlay fixed inset-0 z-[60] bg-charcoal/40 grid place-items-center p-6"
      onMouseDown={onClose}
    >
      <div
        className="dr-anim-dialog bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-3 mb-1">
          <span className="mt-0.5 w-9 h-9 rounded-full bg-green/12 text-green grid place-items-center shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <div className="min-w-0">
            <h2 className="font-heading font-semibold text-charcoal text-lg leading-tight">
              Post exported
            </h2>
            <p className="text-[13px] text-charcoal/55 leading-snug mt-0.5">
              Three quick steps to start tracking + teaching the builder.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="ml-auto -mt-1 text-charcoal/35 hover:text-charcoal text-[22px] leading-none"
          >
            ×
          </button>
        </div>

        {/* Steps */}
        <ol className="mt-4 space-y-3.5">
          {steps.map((s, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-0.5 w-6 h-6 rounded-full bg-charcoal text-white text-[12px] font-bold grid place-items-center shrink-0 tabular-nums">
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-charcoal leading-snug">
                  {s.title}
                </p>
                <p className="text-[13px] text-charcoal/60 leading-relaxed mt-0.5">
                  {s.body}
                </p>
              </div>
            </li>
          ))}
        </ol>

        {/* Photo credits — already baked onto each image, offered here so she
            can also drop them in the caption / first comment. */}
        {credits.length > 0 && (
          <div className="mt-4 rounded-lg ring-1 ring-charcoal/10 bg-charcoal/[0.02] px-3 py-2.5">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <p className="text-[12px] font-semibold text-charcoal/70 flex items-center gap-1.5">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <circle cx="8.5" cy="10" r="1.5" />
                  <path d="M21 16l-5-5L5 19" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Photo credit{credits.length === 1 ? "" : "s"}
              </p>
              <button
                type="button"
                onClick={copyCredits}
                className="text-[11.5px] font-semibold text-green-dark hover:underline shrink-0"
              >
                {copied ? "Copied ✓" : "Copy"}
              </button>
            </div>
            <ul className="space-y-0.5">
              {credits.map((c, i) => (
                <li key={i} className="text-[11.5px] text-charcoal/55 leading-snug font-mono">
                  {c}
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-charcoal/40 leading-snug mt-1.5">
              Already shown on each image — add to your caption or first comment too, to be safe.
            </p>
          </div>
        )}

        {/* Footnote */}
        <p className="text-[12px] text-charcoal/45 leading-relaxed mt-4 rounded-lg bg-charcoal/[0.03] ring-1 ring-charcoal/8 px-3 py-2">
          No short link yet? Create one under{" "}
          <a
            href="/admin/social/links"
            target="_blank"
            rel="opener"
            className="font-semibold text-green-dark hover:underline"
          >
            Short links
          </a>{" "}
          — it&apos;s the trackable address you share where people can tap it.
        </p>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 mt-5">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-lg text-[13px] font-medium text-charcoal/55 hover:bg-charcoal/5 transition-colors"
          >
            I&apos;ll do it later
          </button>
          <button
            type="button"
            onClick={onMarkPosted}
            className="px-4 py-2 rounded-lg bg-green text-white text-[13px] font-semibold hover:bg-green-dark transition-colors"
          >
            Mark as posted now
          </button>
        </div>
      </div>
    </div>
  );
}
