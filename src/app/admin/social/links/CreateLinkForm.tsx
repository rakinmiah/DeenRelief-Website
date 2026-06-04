"use client";

import { useState, useTransition } from "react";
import {
  CAMPAIGN_LANDING_PATHS,
  SHORT_LINK_PLATFORMS,
  describeSlugError,
} from "@/lib/short-links";
import { CAMPAIGNS, type CampaignSlug } from "@/lib/campaigns";
import { createShortLink } from "./actions";

/**
 * Create-short-link form.
 *
 * UX choices:
 *   - "Destination" is a dropdown of real campaign pages by default
 *     so the SMM doesn't have to type URLs. A "Custom path / URL"
 *     option reveals a free-text input for blog posts or external
 *     destinations.
 *   - Slug input shows live validation feedback (single-letter slugs
 *     are encouraged for voiceover-friendly URLs).
 *   - Campaign + Platform are optional but help the per-post
 *     performance dashboard group clicks meaningfully — defaults are
 *     auto-suggested when the destination is a known campaign page.
 *   - Notes is free-text — for the SMM's own memory ("printed on
 *     mosque poster", "voice CTA on Reel May 25").
 */
export default function CreateLinkForm() {
  const [slug, setSlug] = useState("");
  const [destinationMode, setDestinationMode] = useState<"campaign" | "custom">(
    "campaign"
  );
  const [destinationCampaign, setDestinationCampaign] = useState<CampaignSlug>(
    "qurbani"
  );
  const [customDestination, setCustomDestination] = useState("");
  const [campaignTag, setCampaignTag] = useState<string>(""); // "" = none
  const [platform, setPlatform] = useState<string>(""); // "" = none
  const [notes, setNotes] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const slugLive = slug.trim().toLowerCase();
  const slugErrorLive = slugLive ? describeSlugError(slugLive) : null;

  // Suggest a sensible campaign tag automatically when the user picks
  // a campaign page as the destination — saves a click for the most
  // common case.
  function handleDestinationCampaignChange(next: CampaignSlug) {
    setDestinationCampaign(next);
    if (next !== "general") setCampaignTag(next);
  }

  function reset() {
    setSlug("");
    setDestinationMode("campaign");
    setDestinationCampaign("qurbani");
    setCustomDestination("");
    setCampaignTag("");
    setPlatform("");
    setNotes("");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const destinationUrl =
      destinationMode === "campaign"
        ? CAMPAIGN_LANDING_PATHS[destinationCampaign]
        : customDestination.trim();

    startTransition(async () => {
      const result = await createShortLink({
        slug,
        destinationUrl,
        campaignSlug: campaignTag || undefined,
        platform: platform || undefined,
        notes: notes || undefined,
      });
      if (result.ok) {
        setSuccess(`Created /r/${result.slug}`);
        reset();
        // Clear the success banner after a moment.
        setTimeout(() => setSuccess(null), 4000);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border border-charcoal/10 rounded-2xl p-5 md:p-6 mb-8"
    >
      <h2 className="text-charcoal font-heading font-semibold text-lg mb-5">
        Create a short link
      </h2>

      {success && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-green-light/40 border border-green/30 text-green-dark text-sm">
          {success}
        </div>
      )}
      {error && (
        <div
          role="alert"
          className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm"
        >
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ─── Slug ─── */}
        <div>
          <label
            htmlFor="slug"
            className="block text-xs font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-1.5"
          >
            Slug
          </label>
          <div className="flex items-stretch rounded-xl bg-cream border border-charcoal/10 focus-within:border-charcoal/30 focus-within:ring-2 focus-within:ring-charcoal/10 overflow-hidden">
            <span className="px-3 py-3 text-charcoal/50 text-sm font-mono bg-charcoal/[0.03] border-r border-charcoal/10">
              /r/
            </span>
            <input
              id="slug"
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase())}
              placeholder="q"
              required
              className="flex-1 px-3 py-3 bg-transparent focus:outline-none text-charcoal text-sm font-mono"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          {slugLive && slugErrorLive ? (
            <p className="mt-1.5 text-[12px] text-red-600 leading-snug">
              {slugErrorLive}
            </p>
          ) : (
            <p className="mt-1.5 text-[12px] text-charcoal/50 leading-snug">
              Lowercase letters, numbers, hyphens. Short slugs like{" "}
              <code className="text-[11px]">q</code> or{" "}
              <code className="text-[11px]">sudan</code> work great in
              voiceovers.
            </p>
          )}
        </div>

        {/* ─── Destination ─── */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-1.5">
            Destination
          </label>
          <div className="flex gap-2 mb-2">
            <button
              type="button"
              onClick={() => setDestinationMode("campaign")}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                destinationMode === "campaign"
                  ? "bg-charcoal text-white"
                  : "bg-cream text-charcoal/70 hover:text-charcoal"
              }`}
            >
              Campaign page
            </button>
            <button
              type="button"
              onClick={() => setDestinationMode("custom")}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                destinationMode === "custom"
                  ? "bg-charcoal text-white"
                  : "bg-cream text-charcoal/70 hover:text-charcoal"
              }`}
            >
              Custom URL
            </button>
          </div>
          {destinationMode === "campaign" ? (
            <select
              value={destinationCampaign}
              onChange={(e) =>
                handleDestinationCampaignChange(e.target.value as CampaignSlug)
              }
              className="w-full px-3 py-3 rounded-xl bg-cream border border-charcoal/10 focus:border-charcoal/30 focus:outline-none focus:ring-2 focus:ring-charcoal/10 text-charcoal text-sm"
            >
              {(Object.keys(CAMPAIGN_LANDING_PATHS) as CampaignSlug[]).map(
                (slug) => (
                  <option key={slug} value={slug}>
                    {CAMPAIGNS[slug]} — {CAMPAIGN_LANDING_PATHS[slug]}
                  </option>
                )
              )}
            </select>
          ) : (
            <input
              type="text"
              value={customDestination}
              onChange={(e) => setCustomDestination(e.target.value)}
              placeholder="/blog/post-slug or https://…"
              required
              className="w-full px-3 py-3 rounded-xl bg-cream border border-charcoal/10 focus:border-charcoal/30 focus:outline-none focus:ring-2 focus:ring-charcoal/10 text-charcoal text-sm font-mono"
              autoComplete="off"
              spellCheck={false}
            />
          )}
        </div>

        {/* ─── Campaign tag ─── */}
        <div>
          <label
            htmlFor="campaignTag"
            className="block text-xs font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-1.5"
          >
            Campaign tag <span className="text-charcoal/40 normal-case font-normal">(optional)</span>
          </label>
          <select
            id="campaignTag"
            value={campaignTag}
            onChange={(e) => setCampaignTag(e.target.value)}
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

        {/* ─── Platform ─── */}
        <div>
          <label
            htmlFor="platform"
            className="block text-xs font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-1.5"
          >
            Platform <span className="text-charcoal/40 normal-case font-normal">(optional)</span>
          </label>
          <select
            id="platform"
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="w-full px-3 py-3 rounded-xl bg-cream border border-charcoal/10 focus:border-charcoal/30 focus:outline-none focus:ring-2 focus:ring-charcoal/10 text-charcoal text-sm"
          >
            <option value="">— none —</option>
            {SHORT_LINK_PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        {/* ─── Notes ─── */}
        <div className="md:col-span-2">
          <label
            htmlFor="notes"
            className="block text-xs font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-1.5"
          >
            Notes <span className="text-charcoal/40 normal-case font-normal">(optional)</span>
          </label>
          <input
            id="notes"
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Voice CTA on Reel — May 25"
            className="w-full px-3 py-3 rounded-xl bg-cream border border-charcoal/10 focus:border-charcoal/30 focus:outline-none focus:ring-2 focus:ring-charcoal/10 text-charcoal text-sm"
            maxLength={300}
          />
        </div>
      </div>

      <div className="mt-5 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={reset}
          className="px-4 py-2 rounded-full text-sm font-medium text-charcoal/70 hover:text-charcoal hover:bg-charcoal/5 transition-colors"
        >
          Reset
        </button>
        <button
          type="submit"
          disabled={pending || !!slugErrorLive || !slugLive}
          className="px-5 py-2.5 rounded-full bg-charcoal text-white text-sm font-semibold hover:bg-charcoal/85 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {pending ? "Creating…" : "Create link"}
        </button>
      </div>
    </form>
  );
}
