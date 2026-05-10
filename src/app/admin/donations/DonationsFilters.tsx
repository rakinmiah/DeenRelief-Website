"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef } from "react";

/**
 * Donations admin filter bar.
 *
 * Three widgets in one component:
 *   1. Date range — preset chips (All time / Today / This month /
 *      Last 30 days) + custom-range date pair below
 *   2. Filters popover — Status / Campaign / Frequency / Gift Aid
 *   3. Donor search — case-insensitive substring on name + email
 *
 * URL state: every change writes to search params via router.push.
 * The server component re-renders with the new filters applied.
 * Bookmarkable, shareable, survives reload.
 *
 * Donor search is debounced (300ms) so each keystroke doesn't trigger
 * a route push; only the settled query value is committed.
 */

// ── Types ────────────────────────────────────────────────────────────

interface Props {
  /** All campaign slugs that exist in the donations data, for the
   *  campaign filter dropdown. Computed server-side. */
  availableCampaigns: { slug: string; label: string }[];
}

type DatePreset =
  | "alltime"
  | "today"
  | "thismonth"
  | "last30days"
  | "custom";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "succeeded", label: "Paid" },
  { value: "pending", label: "Pending" },
  { value: "failed", label: "Failed" },
  { value: "refunded", label: "Refunded" },
];

const FREQUENCY_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Both" },
  { value: "one-time", label: "One-time" },
  { value: "monthly", label: "Monthly" },
];

const GIFT_AID_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Any" },
  { value: "true", label: "Claimed" },
  { value: "false", label: "Not claimed" },
];

// ── Helpers ──────────────────────────────────────────────────────────

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function startOfMonthIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function daysAgoIso(n: number): string {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

/** Compute the active preset from from/to params. Returns 'custom' if
 *  the dates don't match any preset's expected boundaries. */
function detectPreset(from: string, to: string): DatePreset {
  if (!from && !to) return "alltime";
  const today = todayIso();
  if (from === today && to === today) return "today";
  if (from === startOfMonthIso() && to === today) return "thismonth";
  if (from === daysAgoIso(30) && to === today) return "last30days";
  return "custom";
}

// ── Component ────────────────────────────────────────────────────────

export default function DonationsFilters({ availableCampaigns }: Props) {
  const router = useRouter();
  const params = useSearchParams();

  // Read current filter state out of search params.
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  const status = (params.get("status") ?? "")
    .split(",")
    .filter(Boolean);
  const campaign = (params.get("campaign") ?? "")
    .split(",")
    .filter(Boolean);
  const frequency = params.get("frequency") ?? "";
  const giftAid = params.get("giftAid") ?? "";
  const q = params.get("q") ?? "";

  const activePreset = detectPreset(from, to);

  // Local state for the search box — debounced into the URL.
  const [searchValue, setSearchValue] = useState(q);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    setSearchValue(q);
  }, [q]);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (searchValue === q) return;
    debounceRef.current = setTimeout(() => {
      updateParam("q", searchValue || null);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue]);

  // Local state for the popover open/close — uncontrolled <details>
  // would lose state on every router.push, so we manage explicitly.
  const [filtersOpen, setFiltersOpen] = useState(false);

  // ── URL update helpers ─────────────────────────────────────────────

  function updateParam(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString());
    if (value === null || value === "") {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    router.push(`?${next.toString()}`, { scroll: false });
  }

  function updateMany(updates: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") next.delete(key);
      else next.set(key, value);
    }
    router.push(`?${next.toString()}`, { scroll: false });
  }

  // ── Date preset handlers ───────────────────────────────────────────

  function applyPreset(preset: DatePreset) {
    if (preset === "alltime") {
      updateMany({ from: null, to: null });
      return;
    }
    if (preset === "today") {
      const t = todayIso();
      updateMany({ from: t, to: t });
      return;
    }
    if (preset === "thismonth") {
      updateMany({ from: startOfMonthIso(), to: todayIso() });
      return;
    }
    if (preset === "last30days") {
      updateMany({ from: daysAgoIso(30), to: todayIso() });
      return;
    }
    // 'custom' — don't change dates, just signal the user wants to
    // type in the inputs below.
  }

  // ── Multi-select toggle helpers ────────────────────────────────────

  function toggleInList(
    list: string[],
    value: string,
    paramKey: string
  ) {
    const next = list.includes(value)
      ? list.filter((v) => v !== value)
      : [...list, value];
    updateParam(paramKey, next.length > 0 ? next.join(",") : null);
  }

  // ── Render ─────────────────────────────────────────────────────────

  const dimensionFilterCount =
    status.length +
    campaign.length +
    (frequency ? 1 : 0) +
    (giftAid ? 1 : 0);

  return (
    <div className="space-y-3 mb-6">
      {/* Row 1 — date presets + custom range + filters popover + search */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Date presets */}
        <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal/50 mr-1">
          Date
        </span>
        {(
          [
            { key: "alltime", label: "All time" },
            { key: "today", label: "Today" },
            { key: "thismonth", label: "This month" },
            { key: "last30days", label: "Last 30 days" },
          ] as { key: DatePreset; label: string }[]
        ).map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => applyPreset(p.key)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activePreset === p.key
                ? "bg-charcoal text-white"
                : "bg-white border border-charcoal/10 text-charcoal/70 hover:bg-charcoal/5"
            }`}
          >
            {p.label}
          </button>
        ))}

        <span className="mx-2 text-charcoal/20">·</span>

        {/* Filters popover button */}
        <FiltersButton
          activeCount={dimensionFilterCount}
          isOpen={filtersOpen}
          onToggle={() => setFiltersOpen((v) => !v)}
        />

        {/* Donor search */}
        <div className="ml-auto flex items-center gap-2">
          <input
            type="search"
            placeholder="Search donor name or email…"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="px-3.5 py-1.5 rounded-full text-sm bg-white border border-charcoal/10 text-charcoal placeholder:text-charcoal/40 focus:outline-none focus:border-charcoal/30 focus:ring-2 focus:ring-charcoal/10 w-64"
          />
        </div>
      </div>

      {/* Row 2 — custom date range pair (always visible) */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal/50 mr-1">
          Custom range
        </span>
        <input
          type="date"
          value={from}
          max={to || undefined}
          onChange={(e) => updateParam("from", e.target.value || null)}
          className="px-3 py-1.5 rounded-lg bg-white border border-charcoal/10 text-charcoal text-sm"
          aria-label="From date"
        />
        <span className="text-charcoal/40">→</span>
        <input
          type="date"
          value={to}
          min={from || undefined}
          onChange={(e) => updateParam("to", e.target.value || null)}
          className="px-3 py-1.5 rounded-lg bg-white border border-charcoal/10 text-charcoal text-sm"
          aria-label="To date"
        />
        {(from || to) && (
          <button
            type="button"
            onClick={() => updateMany({ from: null, to: null })}
            className="text-[11px] text-charcoal/50 hover:text-charcoal underline transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Filters popover — Status, Campaign, Frequency, Gift Aid */}
      {filtersOpen && (
        <div className="bg-white border border-charcoal/10 rounded-2xl p-5 shadow-sm">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Status */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-2">
                Status
              </p>
              <div className="flex flex-wrap gap-1.5">
                {STATUS_OPTIONS.map((opt) => {
                  const active = status.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleInList(status, opt.value, "status")}
                      className={`px-2.5 py-1 rounded-full text-[12px] font-medium border transition-colors ${
                        active
                          ? "bg-charcoal text-white border-charcoal"
                          : "bg-white border-charcoal/10 text-charcoal/70 hover:border-charcoal/30"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Campaign */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-2">
                Campaign
              </p>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                {availableCampaigns.map((c) => {
                  const active = campaign.includes(c.slug);
                  return (
                    <button
                      key={c.slug}
                      type="button"
                      onClick={() =>
                        toggleInList(campaign, c.slug, "campaign")
                      }
                      className={`px-2.5 py-1 rounded-full text-[12px] font-medium border transition-colors ${
                        active
                          ? "bg-charcoal text-white border-charcoal"
                          : "bg-white border-charcoal/10 text-charcoal/70 hover:border-charcoal/30"
                      }`}
                    >
                      {c.label}
                    </button>
                  );
                })}
                {availableCampaigns.length === 0 && (
                  <span className="text-[11px] text-charcoal/40 italic">
                    No campaigns yet
                  </span>
                )}
              </div>
            </div>

            {/* Frequency */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-2">
                Frequency
              </p>
              <div className="flex flex-wrap gap-1.5">
                {FREQUENCY_OPTIONS.map((opt) => {
                  const active = frequency === opt.value;
                  return (
                    <button
                      key={opt.value || "all"}
                      type="button"
                      onClick={() =>
                        updateParam("frequency", opt.value || null)
                      }
                      className={`px-2.5 py-1 rounded-full text-[12px] font-medium border transition-colors ${
                        active
                          ? "bg-charcoal text-white border-charcoal"
                          : "bg-white border-charcoal/10 text-charcoal/70 hover:border-charcoal/30"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Gift Aid */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-2">
                Gift Aid
              </p>
              <div className="flex flex-wrap gap-1.5">
                {GIFT_AID_OPTIONS.map((opt) => {
                  const active = giftAid === opt.value;
                  return (
                    <button
                      key={opt.value || "any"}
                      type="button"
                      onClick={() =>
                        updateParam("giftAid", opt.value || null)
                      }
                      className={`px-2.5 py-1 rounded-full text-[12px] font-medium border transition-colors ${
                        active
                          ? "bg-charcoal text-white border-charcoal"
                          : "bg-white border-charcoal/10 text-charcoal/70 hover:border-charcoal/30"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active filter chips (shown when any filter active) */}
      {(dimensionFilterCount > 0 || from || to || q) && (
        <ActiveFilterChips
          from={from}
          to={to}
          status={status}
          campaign={campaign}
          campaignLabels={Object.fromEntries(
            availableCampaigns.map((c) => [c.slug, c.label])
          )}
          frequency={frequency}
          giftAid={giftAid}
          q={q}
          onRemove={(key, value) => {
            if (key === "from" || key === "to") {
              updateParam(key, null);
            } else if (key === "status" && value) {
              const next = status.filter((s) => s !== value);
              updateParam("status", next.length > 0 ? next.join(",") : null);
            } else if (key === "campaign" && value) {
              const next = campaign.filter((c) => c !== value);
              updateParam(
                "campaign",
                next.length > 0 ? next.join(",") : null
              );
            } else {
              updateParam(key, null);
            }
          }}
          onClearAll={() => router.push("?", { scroll: false })}
        />
      )}
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────

function FiltersButton({
  activeCount,
  isOpen,
  onToggle,
}: {
  activeCount: number;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
        isOpen || activeCount > 0
          ? "bg-charcoal text-white"
          : "bg-white border border-charcoal/10 text-charcoal/70 hover:bg-charcoal/5"
      }`}
      aria-expanded={isOpen}
      aria-controls="dimension-filters-popover"
    >
      <svg
        className="w-3.5 h-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 4.5h18M6 12h12M10 19.5h4"
        />
      </svg>
      Filters
      {activeCount > 0 && (
        <span
          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${
            isOpen || activeCount > 0
              ? "bg-amber text-charcoal"
              : "bg-charcoal/10 text-charcoal"
          }`}
        >
          {activeCount}
        </span>
      )}
    </button>
  );
}

function ActiveFilterChips({
  from,
  to,
  status,
  campaign,
  campaignLabels,
  frequency,
  giftAid,
  q,
  onRemove,
  onClearAll,
}: {
  from: string;
  to: string;
  status: string[];
  campaign: string[];
  campaignLabels: Record<string, string>;
  frequency: string;
  giftAid: string;
  q: string;
  onRemove: (key: string, value?: string) => void;
  onClearAll: () => void;
}) {
  const statusLabels: Record<string, string> = {
    succeeded: "Paid",
    pending: "Pending",
    failed: "Failed",
    refunded: "Refunded",
  };
  const frequencyLabels: Record<string, string> = {
    "one-time": "One-time",
    monthly: "Monthly",
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
      <span className="text-charcoal/50 font-medium uppercase tracking-[0.1em] mr-1">
        Active:
      </span>
      {from && (
        <Chip onRemove={() => onRemove("from")}>From {from}</Chip>
      )}
      {to && <Chip onRemove={() => onRemove("to")}>To {to}</Chip>}
      {status.map((s) => (
        <Chip key={`status-${s}`} onRemove={() => onRemove("status", s)}>
          {statusLabels[s] ?? s}
        </Chip>
      ))}
      {campaign.map((c) => (
        <Chip key={`campaign-${c}`} onRemove={() => onRemove("campaign", c)}>
          {campaignLabels[c] ?? c}
        </Chip>
      ))}
      {frequency && (
        <Chip onRemove={() => onRemove("frequency")}>
          {frequencyLabels[frequency] ?? frequency}
        </Chip>
      )}
      {giftAid && (
        <Chip onRemove={() => onRemove("giftAid")}>
          Gift Aid: {giftAid === "true" ? "claimed" : "not claimed"}
        </Chip>
      )}
      {q && (
        <Chip onRemove={() => onRemove("q")}>Search: &ldquo;{q}&rdquo;</Chip>
      )}
      <button
        type="button"
        onClick={onClearAll}
        className="ml-2 text-charcoal/50 hover:text-charcoal underline transition-colors"
      >
        Clear all
      </button>
    </div>
  );
}

function Chip({
  children,
  onRemove,
}: {
  children: React.ReactNode;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cream border border-charcoal/15 text-charcoal">
      {children}
      <button
        type="button"
        onClick={onRemove}
        className="text-charcoal/50 hover:text-charcoal transition-colors"
        aria-label="Remove filter"
      >
        ×
      </button>
    </span>
  );
}
