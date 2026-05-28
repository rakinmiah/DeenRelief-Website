"use client";

import { useEffect, useState, useTransition } from "react";
import {
  SPOTLIGHT_DEFAULT_DAYS,
  type PostSpotlightSummary,
} from "@/lib/now-spotlight";
import { spotlightFromPostAction } from "./actions";

/**
 * Inline action button rendered in the performance dashboard's
 * "Spotlight" column. Three states drive the UI:
 *
 *   • Active spotlight for this post → green pill with countdown, no
 *     button (avoid double-launching from the same post).
 *   • Past spotlight for this post → grey "Spotlighted Nx" text +
 *     "Spotlight again" link button.
 *   • Never spotlighted from this post → "Spotlight on /now" primary
 *     button.
 *
 * Posts without a campaign_slug are disabled with an explanatory tooltip
 * — the action server-side will reject them anyway, but disabling here
 * keeps the UI honest.
 *
 * Duration defaults to SPOTLIGHT_DEFAULT_DAYS (3); for fine-grained
 * control the SMM uses the dedicated /admin/social/spotlight page.
 */
export default function SpotlightFromPostButton({
  postId,
  postCampaignSlug,
  summary,
}: {
  postId: string;
  postCampaignSlug: string | null;
  summary: PostSpotlightSummary;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const hasCampaign = !!postCampaignSlug;
  const disabled = pending || !hasCampaign;

  function handleSpotlight() {
    if (!hasCampaign) {
      setError(
        "Tag a campaign on this post before spotlighting (use the post detail to edit)."
      );
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await spotlightFromPostAction({
        postId,
        durationDays: SPOTLIGHT_DEFAULT_DAYS,
      });
      if (!result.ok) setError(result.error);
    });
  }

  // Active spotlight wins — show a live pill, no action.
  if (summary.status === "active" && summary.latestExpiresAt) {
    return <ActiveSpotlightPill expiresAt={summary.latestExpiresAt} />;
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleSpotlight}
        disabled={disabled}
        title={
          hasCampaign
            ? `Point /now at this post's campaign for ${SPOTLIGHT_DEFAULT_DAYS} days`
            : "Tag a campaign on this post before spotlighting"
        }
        className={`px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-tight transition-colors ${
          summary.status === "ended"
            ? "bg-white border border-charcoal/20 text-charcoal/80 hover:border-charcoal/40 hover:bg-cream"
            : "bg-charcoal text-white hover:bg-charcoal/85"
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {pending
          ? "Setting…"
          : summary.status === "ended"
            ? `Spotlight again (${SPOTLIGHT_DEFAULT_DAYS}d)`
            : `Spotlight on /now (${SPOTLIGHT_DEFAULT_DAYS}d)`}
      </button>
      {summary.status === "ended" && summary.totalCount > 0 && (
        <span className="text-[10px] text-charcoal/50 tracking-tight">
          Past: {summary.totalCount}×
        </span>
      )}
      {error && (
        <span className="text-[10px] text-red-700 max-w-[180px] leading-snug">
          {error}
        </span>
      )}
    </div>
  );
}

/**
 * Live-updating pill for an active spotlight. Split out so we can use
 * `Date.now()` inside `useEffect` / `useState` initializer rather than
 * during render — keeps React 19's purity rules happy. Re-evaluates
 * every 30s so the countdown stays roughly current without thrashing.
 */
function ActiveSpotlightPill({ expiresAt }: { expiresAt: Date }) {
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  const msLeft = expiresAt.getTime() - now;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-[0.08em] uppercase bg-green-light text-green-dark"
      title={`Spotlight expires ${expiresAt.toLocaleString("en-GB")}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-green-dark animate-pulse" />
      Live · {formatShortRemaining(msLeft)}
    </span>
  );
}

/** "2d 4h" / "3h 12m" / "5m" — short remaining-time label for the pill. */
function formatShortRemaining(msRemaining: number): string {
  if (msRemaining <= 0) return "—";
  const secs = Math.floor(msRemaining / 1000);
  const days = Math.floor(secs / 86_400);
  const hours = Math.floor((secs % 86_400) / 3_600);
  const mins = Math.floor((secs % 3_600) / 60);
  if (days > 0) return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  if (hours > 0) return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  return `${Math.max(mins, 1)}m`;
}
