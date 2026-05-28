"use client";

import { useState, useTransition } from "react";
import { CAMPAIGNS, type CampaignSlug } from "@/lib/campaigns";
import { CAMPAIGN_LANDING_PATHS } from "@/lib/short-links";
import { setFeaturedCampaignAction } from "./actions";

export default function FeaturedPicker({
  initial,
}: {
  initial: CampaignSlug | null;
}) {
  const [selected, setSelected] = useState<CampaignSlug | "">(initial ?? "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  function save(next: CampaignSlug | "") {
    setError(null);
    setSuccess(false);
    setSelected(next);
    startTransition(async () => {
      const result = await setFeaturedCampaignAction(next === "" ? null : next);
      if (result.ok) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 4000);
      } else {
        setError(result.error);
        setSelected(initial ?? ""); // revert local state on error
      }
    });
  }

  return (
    <div className="space-y-5">
      {success && (
        <div className="px-4 py-3 rounded-lg bg-green-light/40 border border-green/30 text-green-dark text-sm">
          Saved.
        </div>
      )}
      {error && (
        <div
          role="alert"
          className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm"
        >
          {error}
        </div>
      )}

      <div className="bg-white border border-charcoal/10 rounded-2xl p-5">
        <div className="flex items-center justify-between gap-3 mb-4 pb-4 border-b border-charcoal/10">
          <div>
            <h3 className="text-charcoal font-semibold text-[15px]">
              Currently featured
            </h3>
            <p className="text-charcoal/60 text-[13px] mt-0.5">
              {selected ? (
                <>
                  <span className="font-semibold text-charcoal">
                    {CAMPAIGNS[selected]}
                  </span>{" "}
                  <span className="font-mono text-[12px] text-charcoal/50">
                    ({CAMPAIGN_LANDING_PATHS[selected]})
                  </span>
                </>
              ) : (
                "Nothing featured — default homepage tiles render normally."
              )}
            </p>
          </div>
          {selected && (
            <button
              type="button"
              onClick={() => save("")}
              disabled={pending}
              className="px-3 py-1.5 rounded-full text-[13px] font-medium text-charcoal/70 hover:text-charcoal hover:bg-charcoal/5 transition-colors disabled:opacity-50"
            >
              Clear
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
          {(Object.keys(CAMPAIGNS) as CampaignSlug[]).map((slug) => {
            const isActive = selected === slug;
            return (
              <button
                key={slug}
                type="button"
                onClick={() => save(slug)}
                disabled={pending}
                className={`text-left px-4 py-3 rounded-xl text-[13px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  isActive
                    ? "bg-charcoal text-white"
                    : "bg-cream text-charcoal/80 hover:bg-charcoal/5"
                }`}
              >
                <span className="block font-semibold leading-tight">
                  {CAMPAIGNS[slug]}
                </span>
                <span
                  className={`block text-[11px] font-mono mt-0.5 ${
                    isActive ? "text-white/60" : "text-charcoal/50"
                  }`}
                >
                  {CAMPAIGN_LANDING_PATHS[slug]}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
