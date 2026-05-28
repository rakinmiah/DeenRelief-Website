"use client";

import { useState, useTransition } from "react";
import { CAMPAIGNS, type CampaignSlug } from "@/lib/campaigns";
import {
  SPOTLIGHT_DEFAULT_DAYS,
  SPOTLIGHT_MAX_DAYS,
  SPOTLIGHT_MIN_DAYS,
} from "@/lib/now-spotlight";
import { CAMPAIGN_LANDING_PATHS } from "@/lib/short-links";
import {
  clearSpotlightAction,
  createSpotlightAction,
  extendSpotlightAction,
} from "./actions";

/**
 * Inline controls for the /now spotlight management page.
 *
 *   - "Active spotlight" panel (top): Extend / Reset buttons + status.
 *   - "Pick a campaign" grid: one card per campaign with a primary
 *     "Spotlight on /now" action.
 *
 * Duration is a single shared state — picked once, applies to whichever
 * spotlight is being created. Default 3 days, configurable 1–30.
 */
export default function SpotlightControls({
  hasActive,
}: {
  hasActive: boolean;
}) {
  const [duration, setDuration] = useState<number>(SPOTLIGHT_DEFAULT_DAYS);
  const [error, setError] = useState<string | null>(null);
  const [pendingCampaign, setPendingCampaign] = useState<string | null>(null);
  const [otherPending, startOther] = useTransition();

  function handleSpotlight(slug: CampaignSlug) {
    setError(null);
    setPendingCampaign(slug);
    startOther(async () => {
      const result = await createSpotlightAction({
        campaignSlug: slug,
        durationDays: duration,
      });
      setPendingCampaign(null);
      if (!result.ok) setError(result.error);
    });
  }

  function handleExtend() {
    setError(null);
    startOther(async () => {
      const result = await extendSpotlightAction(duration);
      if (!result.ok) setError(result.error);
    });
  }

  function handleReset() {
    setError(null);
    startOther(async () => {
      const result = await clearSpotlightAction();
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div className="space-y-6">
      {error && (
        <div
          role="alert"
          className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm"
        >
          {error}
        </div>
      )}

      {/* ─── Duration picker (shared) ─── */}
      <div className="bg-white border border-charcoal/10 rounded-2xl p-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-charcoal font-semibold text-[15px]">
              Duration
            </h3>
            <p className="text-charcoal/60 text-[13px] mt-0.5">
              How long /now should point at the chosen campaign before resetting.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {[1, 3, 7, 14, 30].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDuration(d)}
                className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                  duration === d
                    ? "bg-charcoal text-white"
                    : "bg-cream text-charcoal/70 hover:text-charcoal hover:bg-charcoal/10"
                }`}
              >
                {d}d
              </button>
            ))}
            <label className="ml-2 flex items-center gap-2 text-sm text-charcoal/70">
              <span>Custom</span>
              <input
                type="number"
                min={SPOTLIGHT_MIN_DAYS}
                max={SPOTLIGHT_MAX_DAYS}
                value={duration}
                onChange={(e) => {
                  const v = Math.round(Number(e.target.value) || 0);
                  setDuration(
                    Math.min(
                      SPOTLIGHT_MAX_DAYS,
                      Math.max(SPOTLIGHT_MIN_DAYS, v || SPOTLIGHT_DEFAULT_DAYS)
                    )
                  );
                }}
                className="w-16 px-2 py-1 rounded-md bg-cream border border-charcoal/10 focus:border-charcoal/30 focus:outline-none text-sm text-center"
              />
            </label>
          </div>
        </div>
      </div>

      {/* ─── Active-spotlight controls ─── */}
      {hasActive && (
        <div className="bg-green-light/30 border border-green/20 rounded-2xl p-5 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-green-dark font-semibold text-[15px]">
              Adjust the active spotlight
            </h3>
            <p className="text-green-dark/70 text-[13px] mt-0.5">
              Extend by your chosen duration, or reset /now to the homepage.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExtend}
              disabled={otherPending}
              className="px-4 py-2 rounded-full bg-green text-white text-sm font-semibold hover:bg-green/85 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {otherPending ? "Working…" : `Extend by ${duration}d`}
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={otherPending}
              className="px-4 py-2 rounded-full bg-white border border-charcoal/15 text-charcoal text-sm font-semibold hover:bg-cream disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Reset to homepage
            </button>
          </div>
        </div>
      )}

      {/* ─── Campaign grid ─── */}
      <div>
        <h3 className="text-charcoal font-heading font-semibold text-[15px] mb-3">
          Pick a campaign to spotlight
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {(Object.keys(CAMPAIGNS) as CampaignSlug[]).map((slug) => {
            const isPending = pendingCampaign === slug;
            return (
              <div
                key={slug}
                className="bg-white border border-charcoal/10 rounded-xl p-4 flex flex-col gap-3"
              >
                <div>
                  <div className="text-charcoal font-semibold text-[14px] leading-tight">
                    {CAMPAIGNS[slug]}
                  </div>
                  <div className="text-charcoal/50 text-[11px] font-mono mt-1">
                    {CAMPAIGN_LANDING_PATHS[slug]}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleSpotlight(slug)}
                  disabled={otherPending}
                  className="px-3 py-2 rounded-full bg-charcoal text-white text-[13px] font-semibold hover:bg-charcoal/85 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isPending ? "Setting…" : `Spotlight (${duration}d)`}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
