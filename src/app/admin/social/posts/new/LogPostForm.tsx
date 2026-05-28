"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CAMPAIGNS, type CampaignSlug } from "@/lib/campaigns";
import {
  SOCIAL_PLATFORMS,
  platformLabel,
  type SocialPlatform,
} from "@/lib/social-performance";
import { logSocialPost } from "../actions";

export interface ShortLinkOption {
  id: string;
  slug: string;
  campaignSlug: string | null;
  platform: string | null;
  notes: string | null;
}

/**
 * Form to register a published social post. Optional short-link
 * association is the attribution glue — when set, the dashboard joins
 * clicks + donations to this post automatically.
 *
 * Auto-suggestions:
 *   - Picking a short link auto-fills campaignSlug + platform if not
 *     already set, so the SMM doesn't have to repeat herself.
 *   - "Published at" defaults to now; she can backdate when logging
 *     older posts retroactively.
 */
export default function LogPostForm({
  shortLinks,
}: {
  shortLinks: ShortLinkOption[];
}) {
  const router = useRouter();
  const [platform, setPlatform] = useState<SocialPlatform>("instagram");
  const [shortLinkId, setShortLinkId] = useState<string>("");
  const [externalUrl, setExternalUrl] = useState("");
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [campaignSlug, setCampaignSlug] = useState<string>("");
  const [captionKeyword, setCaptionKeyword] = useState("");
  const [publishedAt, setPublishedAt] = useState<string>(() =>
    toLocalDateTimeInputValue(new Date())
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleShortLinkChange(id: string) {
    setShortLinkId(id);
    const sl = shortLinks.find((s) => s.id === id);
    if (sl) {
      if (sl.campaignSlug && !campaignSlug) setCampaignSlug(sl.campaignSlug);
      if (sl.platform && sl.platform !== "other") {
        // Only auto-set platform if it's one of our SocialPlatform values.
        const platforms = SOCIAL_PLATFORMS as readonly string[];
        if (platforms.includes(sl.platform)) {
          setPlatform(sl.platform as SocialPlatform);
        }
      }
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const publishedAtIso = publishedAt
      ? new Date(publishedAt).toISOString()
      : new Date().toISOString();

    startTransition(async () => {
      const result = await logSocialPost({
        platform,
        externalUrl: externalUrl.trim() || undefined,
        title: title.trim() || undefined,
        caption: caption.trim() || undefined,
        shortLinkId: shortLinkId || undefined,
        campaignSlug: campaignSlug || undefined,
        captionKeyword: captionKeyword.trim() || undefined,
        publishedAtIso,
      });
      if (result.ok) {
        router.push("/admin/social/performance");
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border border-charcoal/10 rounded-2xl p-5 md:p-6 space-y-5"
    >
      {error && (
        <div
          role="alert"
          className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm"
        >
          {error}
        </div>
      )}

      {/* Platform + Published-at */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="platform"
            className="block text-xs font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-1.5"
          >
            Platform
          </label>
          <select
            id="platform"
            value={platform}
            onChange={(e) => setPlatform(e.target.value as SocialPlatform)}
            className="w-full px-3 py-3 rounded-xl bg-cream border border-charcoal/10 focus:border-charcoal/30 focus:outline-none focus:ring-2 focus:ring-charcoal/10 text-charcoal text-sm"
          >
            {SOCIAL_PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {platformLabel(p)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="publishedAt"
            className="block text-xs font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-1.5"
          >
            Published at
          </label>
          <input
            id="publishedAt"
            type="datetime-local"
            value={publishedAt}
            onChange={(e) => setPublishedAt(e.target.value)}
            required
            className="w-full px-3 py-3 rounded-xl bg-cream border border-charcoal/10 focus:border-charcoal/30 focus:outline-none focus:ring-2 focus:ring-charcoal/10 text-charcoal text-sm"
          />
        </div>
      </div>

      {/* Short link — the attribution glue */}
      <div>
        <label
          htmlFor="shortLink"
          className="block text-xs font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-1.5"
        >
          Short link this post promoted
        </label>
        <select
          id="shortLink"
          value={shortLinkId}
          onChange={(e) => handleShortLinkChange(e.target.value)}
          className="w-full px-3 py-3 rounded-xl bg-cream border border-charcoal/10 focus:border-charcoal/30 focus:outline-none focus:ring-2 focus:ring-charcoal/10 text-charcoal text-sm"
        >
          <option value="">— none (post had no trackable link) —</option>
          {shortLinks.map((sl) => (
            <option key={sl.id} value={sl.id}>
              /r/{sl.slug}
              {sl.campaignSlug ? ` · ${sl.campaignSlug}` : ""}
              {sl.notes ? ` — ${sl.notes.slice(0, 40)}` : ""}
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-[12px] text-charcoal/50 leading-snug">
          Pick the short link you put in the post (bio, voiceover, DM
          reply, QR). Without this, the dashboard can&apos;t attribute
          clicks or donations to this post.
        </p>
      </div>

      {/* External URL + Campaign */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="externalUrl"
            className="block text-xs font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-1.5"
          >
            Post URL{" "}
            <span className="text-charcoal/40 normal-case font-normal">
              (optional)
            </span>
          </label>
          <input
            id="externalUrl"
            type="url"
            value={externalUrl}
            onChange={(e) => setExternalUrl(e.target.value)}
            placeholder="https://www.instagram.com/p/…"
            className="w-full px-3 py-3 rounded-xl bg-cream border border-charcoal/10 focus:border-charcoal/30 focus:outline-none focus:ring-2 focus:ring-charcoal/10 text-charcoal text-sm font-mono"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <div>
          <label
            htmlFor="campaignSlug"
            className="block text-xs font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-1.5"
          >
            Campaign{" "}
            <span className="text-charcoal/40 normal-case font-normal">
              (optional)
            </span>
          </label>
          <select
            id="campaignSlug"
            value={campaignSlug}
            onChange={(e) => setCampaignSlug(e.target.value)}
            className="w-full px-3 py-3 rounded-xl bg-cream border border-charcoal/10 focus:border-charcoal/30 focus:outline-none focus:ring-2 focus:ring-charcoal/10 text-charcoal text-sm"
          >
            <option value="">— none —</option>
            {(Object.keys(CAMPAIGNS) as CampaignSlug[]).map((slug) => (
              <option key={slug} value={slug}>
                {CAMPAIGNS[slug]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Title */}
      <div>
        <label
          htmlFor="title"
          className="block text-xs font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-1.5"
        >
          Title{" "}
          <span className="text-charcoal/40 normal-case font-normal">
            (optional — auto-derived from caption first line)
          </span>
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Qurbani Reel — May 14"
          maxLength={120}
          className="w-full px-3 py-3 rounded-xl bg-cream border border-charcoal/10 focus:border-charcoal/30 focus:outline-none focus:ring-2 focus:ring-charcoal/10 text-charcoal text-sm"
        />
      </div>

      {/* Caption */}
      <div>
        <label
          htmlFor="caption"
          className="block text-xs font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-1.5"
        >
          Caption text{" "}
          <span className="text-charcoal/40 normal-case font-normal">
            (optional)
          </span>
        </label>
        <textarea
          id="caption"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={4}
          placeholder="The exact caption you posted…"
          className="w-full px-3 py-3 rounded-xl bg-cream border border-charcoal/10 focus:border-charcoal/30 focus:outline-none focus:ring-2 focus:ring-charcoal/10 text-charcoal text-sm resize-y"
        />
      </div>

      {/* Comment keyword (Phase 2 hook) */}
      <div>
        <label
          htmlFor="captionKeyword"
          className="block text-xs font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-1.5"
        >
          Comment-to-DM keyword{" "}
          <span className="text-charcoal/40 normal-case font-normal">
            (optional)
          </span>
        </label>
        <input
          id="captionKeyword"
          type="text"
          value={captionKeyword}
          onChange={(e) => setCaptionKeyword(e.target.value)}
          placeholder="QURBANI"
          maxLength={40}
          className="w-full px-3 py-3 rounded-xl bg-cream border border-charcoal/10 focus:border-charcoal/30 focus:outline-none focus:ring-2 focus:ring-charcoal/10 text-charcoal text-sm font-mono uppercase"
        />
        <p className="mt-1.5 text-[12px] text-charcoal/50 leading-snug">
          If you asked donors to comment a keyword for a DM link, record
          it here. Used by the future auto-DM responder once Meta
          verification clears.
        </p>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2 border-t border-charcoal/5">
        <button
          type="submit"
          disabled={pending}
          className="px-5 py-2.5 rounded-full bg-charcoal text-white text-sm font-semibold hover:bg-charcoal/85 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {pending ? "Logging…" : "Log post"}
        </button>
      </div>
    </form>
  );
}

/** Convert a Date to the `YYYY-MM-DDTHH:mm` format that <input type=datetime-local> expects, in local time. */
function toLocalDateTimeInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
