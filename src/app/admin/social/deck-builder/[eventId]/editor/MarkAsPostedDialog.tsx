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
  createTrackedLinkForEvent,
  markDeckAsPosted,
  pointBioLinkAtShortLink,
  type DeckRecipeEntry,
} from "@/app/admin/social/posts/actions";

type ShortLinkOption = {
  id: string;
  slug: string;
  campaignSlug: string | null;
  platform: string | null;
  notes: string | null;
};

type PlacementOpt = { value: string; label: string; tracked: boolean };

/**
 * Where the SMM can put a CLICKABLE tracked link, per platform. Instagram
 * captions (and IG comments) aren't clickable — so IG only offers the bio
 * link, a Story sticker, or a comment-to-DM. Facebook + X allow links in the
 * post itself.
 */
const PLACEMENTS_BY_PLATFORM: Record<string, PlacementOpt[]> = {
  instagram: [
    { value: "bio_link", label: "Link in bio (deenrelief.org/now)", tracked: true },
    { value: "story_sticker", label: "Story link sticker", tracked: true },
    { value: "dm", label: "Comment-to-DM reply", tracked: true },
    { value: "none", label: "No link yet — log for the design record only", tracked: false },
  ],
  facebook: [
    { value: "post_text", label: "In the post", tracked: true },
    { value: "first_comment", label: "First comment", tracked: true },
    { value: "bio_link", label: "Page link (deenrelief.org/now)", tracked: true },
    { value: "none", label: "No link yet — log for the design record only", tracked: false },
  ],
  x: [
    { value: "post_text", label: "In the post", tracked: true },
    { value: "none", label: "No link yet — log for the design record only", tracked: false },
  ],
};
function placementsFor(platform: string): PlacementOpt[] {
  return PLACEMENTS_BY_PLATFORM[platform] ?? PLACEMENTS_BY_PLATFORM.x!;
}

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
  const placements = placementsFor(platform);
  const [links, setLinks] = useState<ShortLinkOption[]>([]);
  const [shortLinkId, setShortLinkId] = useState("");
  const [placement, setPlacement] = useState(placements[0]!.value);
  const [externalUrl, setExternalUrl] = useState("");
  const [publishedAt, setPublishedAt] = useState(() => toLocalInput(new Date()));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [creatingLink, setCreatingLink] = useState(false);
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);
  const [createLinkError, setCreateLinkError] = useState<string | null>(null);
  // Bio-link spotlight (Instagram): point deenrelief.org/now at this post.
  const [bioPinning, setBioPinning] = useState(false);
  const [bioPinned, setBioPinned] = useState(false);
  const [bioError, setBioError] = useState<string | null>(null);

  const isIG = platform === "instagram";
  const currentPlacement = placements.find((p) => p.value === placement) ?? null;

  // Auto-make a tracked link from the news story this post was built from, and
  // select it — so she doesn't have to detour to the Short links page.
  async function autoCreateLink() {
    if (!eventId) return;
    setCreatingLink(true);
    setCreateLinkError(null);
    const res = await createTrackedLinkForEvent({ eventId, platform });
    setCreatingLink(false);
    if (!res.ok) {
      setCreateLinkError(res.error);
      return;
    }
    setLinks((prev) => [
      {
        id: res.link.id,
        slug: res.link.slug,
        campaignSlug: res.link.campaignSlug,
        platform: res.link.platform,
        notes: null,
      },
      ...prev.filter((l) => l.id !== res.link.id),
    ]);
    setShortLinkId(res.link.id);
    setCreatedSlug(res.link.slug);
  }

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

  // Re-pinning is needed if the chosen link changes after a pin.
  useEffect(() => {
    setBioPinned(false);
    setBioError(null);
  }, [shortLinkId, placement]);

  // Point the bio link (deenrelief.org/now) at THIS post's tracked link, so an
  // Instagram bio tap is logged as a click on this link and attributes a
  // resulting donation to this exact post.
  async function pinBioLink() {
    if (!selectedLink) return;
    setBioPinning(true);
    setBioError(null);
    const res = await pointBioLinkAtShortLink({
      slug: selectedLink.slug,
      campaignSlug: selectedLink.campaignSlug,
    });
    setBioPinning(false);
    if (!res.ok) {
      setBioError(res.error);
      return;
    }
    setBioPinned(true);
  }

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
      linkPlacement: placement,
    });
    setSaving(false);
    if (res.ok) setDone(true);
    else setError(res.error);
  }

  return (
    <div
      className="dr-anim-overlay fixed inset-0 z-[60] bg-charcoal/40 grid place-items-center p-6"
      onMouseDown={onClose}
    >
      <div
        className="dr-anim-dialog bg-white rounded-2xl shadow-2xl w-full max-w-md p-5"
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
              {isIG
                ? "Instagram captions aren't clickable — so pick the tracked link you'll use (bio link, Story sticker, or comment-to-DM) and tell us where. That's how we track this post's clicks and donations."
                : "Pick the tracked link you put in the post — or make one for this story in a tap — and tell us where you put it, so we can track this post's clicks and donations."}
            </p>

            <label className="block text-[12px] font-medium text-charcoal/55 mb-1.5">
              Tracked link
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

            {/* One-tap: make + select a tracked link from this news story. */}
            {eventId && !createdSlug && (
              <button
                type="button"
                onClick={autoCreateLink}
                disabled={creatingLink}
                className="mt-1.5 inline-flex items-center gap-1.5 text-[12px] font-semibold text-green-dark hover:text-green disabled:opacity-50 transition-colors"
              >
                {creatingLink
                  ? "Making a link…"
                  : "✨ Make a tracked link for this post"}
              </button>
            )}
            {createdSlug && (
              <p className="text-[11.5px] text-green-dark mt-1.5">
                Created <span className="font-mono">/r/{createdSlug}</span> and
                selected it — now choose where you&apos;ll place it below.
              </p>
            )}
            {createLinkError && (
              <p className="text-[11px] text-red-600 mt-1.5">{createLinkError}</p>
            )}

            {/* Where the (clickable) link goes — platform-aware, since an IG
                caption can't carry one. */}
            <label className="block text-[12px] font-medium text-charcoal/55 mt-3 mb-1.5">
              Where did you put the link?
            </label>
            <select
              value={placement}
              onChange={(e) => setPlacement(e.target.value)}
              className="dr-input mb-1"
            >
              {placements.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
            {currentPlacement && !currentPlacement.tracked && (
              <p className="text-[11px] text-amber-dark mt-1.5">
                No link means no click/donation tracking — logged for the design
                record only.
              </p>
            )}

            {/* Instagram bio path: point deenrelief.org/now at THIS post's
                tracked link, so a bio tap is logged + attributed to this post. */}
            {placement === "bio_link" &&
              (selectedLink ? (
                bioPinned ? (
                  <p className="text-[11.5px] text-green-dark mt-2 leading-relaxed">
                    ✓ Your bio link now sends people to this post and tracks it.
                    Your caption can just say &ldquo;link in bio&rdquo;.
                  </p>
                ) : (
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={pinBioLink}
                      disabled={bioPinning}
                      className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-green-dark hover:text-green disabled:opacity-50 transition-colors"
                    >
                      {bioPinning
                        ? "Pointing your bio link…"
                        : "🔗 Point deenrelief.org/now at this post"}
                    </button>
                    <p className="text-[11px] text-charcoal/45 mt-1 leading-relaxed">
                      Redirects your bio link to this post&apos;s tracked link, so
                      a tap from your bio counts for this exact post.
                    </p>
                    {bioError && (
                      <p className="text-[11px] text-red-600 mt-1">{bioError}</p>
                    )}
                  </div>
                )
              ) : (
                <p className="text-[11px] text-amber-dark mt-1.5">
                  Pick or make a tracked link above first — then point your bio
                  link at it.
                </p>
              ))}

            {!shortLinkId && (
              <p className="text-[11px] text-amber-dark mt-2 mb-3">
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
