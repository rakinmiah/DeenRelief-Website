"use client";

/**
 * MarkAsPostedDialog — record a finished deck as a published post, carrying
 * its provenance so the outcome-learning loop can close.
 *
 * The canvas already knows the two things the loop needs — the news report
 * (eventId) and the per-slide design recipe (deckRecipe) — but it CAN'T know
 * the live post URL or which short link the SMM actually put in the caption.
 * Those are the only things this dialog asks for. The short link is the
 * attribution anchor: choosing it is what makes real clicks + donations flow
 * back against these exact templates + topic.
 */

import { useEffect, useMemo, useState } from "react";
import {
  markDeckAsPosted,
  type DeckRecipeEntry,
} from "@/app/admin/social/posts/actions";

type ShortLinkOption = {
  id: string;
  slug: string;
  campaignSlug: string | null;
  platform: string | null;
  notes: string | null;
};

/** A Date → the value a <input type="datetime-local"> expects (local time). */
function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export default function MarkAsPostedDialog({
  platform,
  eventId,
  deckRecipe,
  defaultTitle,
  onClose,
}: {
  platform: string;
  eventId?: string;
  deckRecipe?: DeckRecipeEntry[];
  defaultTitle?: string;
  onClose: () => void;
}) {
  const [links, setLinks] = useState<ShortLinkOption[]>([]);
  const [shortLinkId, setShortLinkId] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [publishedAt, setPublishedAt] = useState(() => toLocalInput(new Date()));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/social/short-links", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { links: [] }))
      .then((j: { links?: ShortLinkOption[] }) => {
        if (!cancelled) setLinks(j.links ?? []);
      })
      .catch(() => {
        /* dropdown just stays empty — she can still record the post */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedLink = useMemo(
    () => links.find((l) => l.id === shortLinkId) ?? null,
    [links, shortLinkId]
  );

  const recipeSummary = useMemo(() => {
    if (!deckRecipe || deckRecipe.length === 0) return null;
    const roles = deckRecipe.map((r) => r.role);
    const shown = roles.slice(0, 4).join(", ");
    return `${deckRecipe.length} slide${deckRecipe.length === 1 ? "" : "s"} · ${shown}${
      roles.length > 4 ? "…" : ""
    }`;
  }, [deckRecipe]);

  async function submit() {
    setSaving(true);
    setError(null);
    const res = await markDeckAsPosted({
      platform,
      eventId,
      deckRecipe,
      externalUrl: externalUrl.trim() || undefined,
      shortLinkId: shortLinkId || undefined,
      campaignSlug: selectedLink?.campaignSlug || undefined,
      title: defaultTitle,
      publishedAtIso: new Date(publishedAt).toISOString(),
    });
    setSaving(false);
    if (res.ok) setDone(true);
    else setError(res.error);
  }

  return (
    <div
      className="fixed inset-0 z-[60] bg-charcoal/40 grid place-items-center p-6"
      onMouseDown={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-heading font-semibold text-charcoal text-lg">
            Mark as posted
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-charcoal/40 hover:text-charcoal text-[20px] leading-none"
          >
            ×
          </button>
        </div>

        {done ? (
          <div className="pt-3">
            <p className="text-[14px] text-charcoal/80 leading-relaxed mb-4">
              Saved. This post is now tracked — clicks and donations through
              its short link will teach the builder which designs and topics
              raise the most over time.
            </p>
            <div className="flex items-center justify-end gap-2">
              <a
                href="/admin/social/performance"
                target="_blank"
                rel="opener"
                className="px-3.5 py-2 rounded-lg text-[13px] font-medium text-charcoal/60 hover:bg-charcoal/5"
              >
                View performance
              </a>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-green text-white text-[13px] font-semibold hover:bg-green-dark transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-[12.5px] text-charcoal/55 leading-relaxed mb-4">
              Records this deck against its news report and template designs.
              Pick the short link you put in the caption so clicks and donations
              attribute back to it.
            </p>

            <label className="block text-[12px] font-medium text-charcoal/55 mb-1.5">
              Short link in the post
            </label>
            <select
              value={shortLinkId}
              onChange={(e) => setShortLinkId(e.target.value)}
              className="dr-input mb-1"
            >
              <option value="">No short link (won&apos;t be tracked)</option>
              {links.map((l) => (
                <option key={l.id} value={l.id}>
                  /r/{l.slug}
                  {l.campaignSlug ? ` · ${l.campaignSlug}` : ""}
                  {l.platform ? ` · ${l.platform}` : ""}
                </option>
              ))}
            </select>
            {!shortLinkId && (
              <p className="text-[11px] text-amber-dark mb-3">
                Without a short link there&apos;s no click/donation tracking —
                the post is logged for the design record only.
              </p>
            )}
            {shortLinkId && <div className="mb-3" />}

            <label className="block text-[12px] font-medium text-charcoal/55 mb-1.5">
              Live post URL <span className="text-charcoal/35">(optional)</span>
            </label>
            <input
              type="url"
              inputMode="url"
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              placeholder="https://instagram.com/p/…"
              className="dr-input mb-3"
            />

            <label className="block text-[12px] font-medium text-charcoal/55 mb-1.5">
              Published
            </label>
            <input
              type="datetime-local"
              value={publishedAt}
              onChange={(e) => setPublishedAt(e.target.value)}
              className="dr-input mb-3"
            />

            <div className="rounded-lg bg-charcoal/[0.03] ring-1 ring-charcoal/8 px-3 py-2 mb-4">
              <p className="text-[11px] text-charcoal/45">
                {recipeSummary ? (
                  <>
                    Design recipe captured · <span className="tabular-nums">{recipeSummary}</span>
                  </>
                ) : (
                  "No design recipe (blank/edited canvas) — logged for the topic record only."
                )}
              </p>
            </div>

            {error && (
              <p className="text-[12px] text-red-600 mb-3" role="alert">
                {error}
              </p>
            )}

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-lg text-[13px] font-medium text-charcoal/60 hover:bg-charcoal/5"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={submit}
                className="px-4 py-2 rounded-lg bg-green text-white text-[13px] font-semibold hover:bg-green-dark disabled:opacity-50 transition-colors"
              >
                {saving ? "Saving…" : "Mark as posted"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
