"use client";

/**
 * MediaLibraryGrid — the library grid plus a "Select" (preselect) mode.
 *
 * Normal mode: cards link to the per-item edit page (unchanged behaviour).
 * Select mode: cards become tick-to-select; a sticky action bar then lets
 * the SMM either RETAG the whole selection (bulk-apply campaign / country /
 * tone / tags — additive for arrays, overwrite for scalars) or QUICK-DELETE
 * (archive) them. Both are £0 / 0 tokens; the AI re-tag flow stays separate.
 */

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CAMPAIGNS, isValidCampaign, type CampaignSlug } from "@/lib/campaigns";
import { MEDIA_TONES } from "@/lib/media-library";
import { bulkArchiveMediaAction, bulkRetagMediaAction } from "./actions";

export type MediaCardData = {
  id: string;
  publicUrl: string;
  caption: string | null;
  tags: string[];
  campaignSlugs: string[];
  countryIso: string | null;
  tone: string | null;
  dominantColor: string | null;
};

export default function MediaLibraryGrid({ items }: { items: MediaCardData[] }) {
  const router = useRouter();
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showRetag, setShowRetag] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const count = selected.size;
  const allSelected = count > 0 && count === items.length;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function exitSelect() {
    setSelecting(false);
    setSelected(new Set());
    setShowRetag(false);
    setError(null);
  }

  function doDelete() {
    if (count === 0) return;
    const ok = window.confirm(
      `Delete ${count} item${count === 1 ? "" : "s"} from the library?\n\n` +
        "They're archived — removed from the grid and the launch-packet generator. " +
        "(Reversible by an admin; the file stays in Storage.)"
    );
    if (!ok) return;
    setError(null);
    startTransition(async () => {
      const res = await bulkArchiveMediaAction([...selected]);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      exitSelect();
      router.refresh();
    });
  }

  function applyRetag(patch: Parameters<typeof bulkRetagMediaAction>[0]) {
    setError(null);
    startTransition(async () => {
      const res = await bulkRetagMediaAction({ ...patch, ids: [...selected] });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setShowRetag(false);
      exitSelect();
      router.refresh();
    });
  }

  return (
    <>
      {/* ─── Select-mode toolbar ─── */}
      <div className="mb-4 flex items-center gap-2 flex-wrap min-h-[34px]">
        {!selecting ? (
          <button
            type="button"
            onClick={() => setSelecting(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-charcoal/15 text-charcoal text-[13px] font-semibold hover:bg-cream transition-colors"
          >
            <CheckSquareIcon /> Select
          </button>
        ) : (
          <>
            <span className="text-[13px] font-semibold text-charcoal">
              {count} selected
            </span>
            <button
              type="button"
              onClick={() =>
                setSelected(allSelected ? new Set() : new Set(items.map((i) => i.id)))
              }
              className="px-3 py-1.5 rounded-full bg-white border border-charcoal/15 text-charcoal/80 text-[12px] font-semibold hover:bg-cream transition-colors"
            >
              {allSelected ? "Clear all" : "Select all"}
            </button>
            <button
              type="button"
              onClick={exitSelect}
              className="px-3 py-1.5 rounded-full text-charcoal/60 text-[12px] font-semibold hover:text-charcoal transition-colors"
            >
              Done
            </button>
            <span className="text-[12px] text-charcoal/45 ml-1">
              Tap photos to select, then retag or delete the batch.
            </span>
          </>
        )}
      </div>

      {/* ─── Grid ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {items.map((item) => (
          <MediaCard
            key={item.id}
            item={item}
            selecting={selecting}
            selected={selected.has(item.id)}
            onToggle={() => toggle(item.id)}
          />
        ))}
      </div>

      {/* ─── Sticky bulk action bar ─── */}
      {selecting && count > 0 && (
        <div className="dr-anim-rise fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-charcoal text-white rounded-full shadow-2xl pl-5 pr-2 py-2">
          <span className="text-[13px] font-semibold">
            {count} selected
          </span>
          <button
            type="button"
            disabled={pending}
            onClick={() => setShowRetag(true)}
            className="px-4 py-2 rounded-full bg-white/15 hover:bg-white/25 text-white text-[13px] font-semibold transition-colors disabled:opacity-50"
          >
            ↻ Retag
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={doDelete}
            className="px-4 py-2 rounded-full bg-red-500/90 hover:bg-red-500 text-white text-[13px] font-semibold transition-colors disabled:opacity-50"
          >
            {pending ? "Working…" : "Delete"}
          </button>
        </div>
      )}

      {/* ─── Error toast (outside the modal) ─── */}
      {error && !showRetag && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 bg-red-50 border border-red-200 text-red-800 text-[13px] font-medium px-4 py-2 rounded-xl shadow-lg max-w-md text-center">
          {error}
        </div>
      )}

      {/* ─── Bulk retag panel ─── */}
      {showRetag && (
        <RetagPanel
          count={count}
          pending={pending}
          error={error}
          onApply={applyRetag}
          onClose={() => {
            setShowRetag(false);
            setError(null);
          }}
        />
      )}
    </>
  );
}

/* ─── One card (link in normal mode, tickable in select mode) ─────── */

function MediaCard({
  item,
  selecting,
  selected,
  onToggle,
}: {
  item: MediaCardData;
  selecting: boolean;
  selected: boolean;
  onToggle: () => void;
}) {
  const inner = (
    <>
      <div
        className="aspect-square bg-cream relative"
        style={{ backgroundColor: item.dominantColor ?? "#F7F3E8" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.publicUrl}
          alt={item.caption ?? "Media item"}
          className={`w-full h-full object-cover transition ${selected ? "brightness-90" : ""}`}
          loading="lazy"
        />
        {selecting && (
          <span
            aria-hidden
            className={`absolute top-2 left-2 w-6 h-6 rounded-md grid place-items-center border-2 transition ${
              selected
                ? "bg-green border-green text-white"
                : "bg-white/85 border-white/90 text-transparent"
            }`}
          >
            <CheckIcon />
          </span>
        )}
      </div>
      <div className="p-3 flex flex-col gap-2 flex-1">
        <p className="text-[12px] text-charcoal/85 leading-snug line-clamp-2 min-h-[2.5em]">
          {item.caption ?? <span className="text-charcoal/40">No caption</span>}
        </p>
        <div className="flex items-center flex-wrap gap-1 mt-auto">
          {item.tone && (
            <span className="text-[10px] font-semibold tracking-[0.08em] uppercase px-1.5 py-0.5 rounded-full bg-amber-light text-amber-dark">
              {item.tone}
            </span>
          )}
          {item.countryIso && (
            <span className="text-[10px] font-semibold tracking-[0.08em] uppercase px-1.5 py-0.5 rounded-full bg-charcoal/8 text-charcoal/70">
              {item.countryIso}
            </span>
          )}
          {item.campaignSlugs.slice(0, 1).map((c) => (
            <span
              key={c}
              className="text-[10px] font-semibold tracking-[0.08em] uppercase px-1.5 py-0.5 rounded-full bg-green/10 text-green-dark"
            >
              {isValidCampaign(c) ? CAMPAIGNS[c] : c}
            </span>
          ))}
        </div>
      </div>
    </>
  );

  const frame = `group flex flex-col bg-white border rounded-2xl overflow-hidden transition-colors ${
    selected ? "border-green ring-2 ring-green" : "border-charcoal/10 hover:border-charcoal/25"
  }`;

  if (selecting) {
    return (
      <button type="button" onClick={onToggle} className={`${frame} text-left`}>
        {inner}
      </button>
    );
  }
  return (
    <Link href={`/admin/social/media-library/${item.id}`} className={frame}>
      {inner}
    </Link>
  );
}

/* ─── Bulk retag modal ───────────────────────────────────────────── */

function RetagPanel({
  count,
  pending,
  error,
  onApply,
  onClose,
}: {
  count: number;
  pending: boolean;
  error: string | null;
  onApply: (patch: Parameters<typeof bulkRetagMediaAction>[0]) => void;
  onClose: () => void;
}) {
  const [campaigns, setCampaigns] = useState<CampaignSlug[]>([]);
  const [country, setCountry] = useState("");
  const [tone, setTone] = useState("");
  const [tagsText, setTagsText] = useState("");

  const tagList = useMemo(
    () =>
      tagsText
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean),
    [tagsText]
  );

  const hasSomething =
    campaigns.length > 0 || country.trim() !== "" || tone !== "" || tagList.length > 0;

  function submit() {
    const patch: Parameters<typeof bulkRetagMediaAction>[0] = { ids: [] };
    if (campaigns.length) patch.addCampaignSlugs = campaigns;
    if (tagList.length) patch.addTags = tagList;
    if (country.trim()) patch.countryIso = country.trim().toUpperCase().slice(0, 5);
    if (tone) patch.tone = tone;
    onApply(patch);
  }

  return (
    <div
      className="dr-anim-overlay fixed inset-0 z-40 bg-charcoal/40 backdrop-blur-[2px] grid place-items-center p-4"
      onClick={onClose}
    >
      <div
        className="dr-anim-dialog bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-1">
          <h2 className="font-heading font-semibold text-charcoal text-lg">
            Retag {count} item{count === 1 ? "" : "s"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-charcoal/40 hover:text-charcoal text-[22px] leading-none"
          >
            ×
          </button>
        </div>
        <p className="text-[12.5px] text-charcoal/55 leading-relaxed mb-4">
          Campaigns and tags are <strong>added</strong> (existing ones kept).
          Country and tone <strong>overwrite</strong>. Leave a field blank to
          leave it untouched.
        </p>

        {/* Campaigns (additive) */}
        <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-charcoal/50 mb-1.5">
          Add campaigns
        </label>
        <div className="flex flex-wrap gap-2 mb-4">
          {(Object.keys(CAMPAIGNS) as CampaignSlug[]).map((slug) => {
            const on = campaigns.includes(slug);
            return (
              <button
                key={slug}
                type="button"
                onClick={() =>
                  setCampaigns((prev) =>
                    on ? prev.filter((s) => s !== slug) : [...prev, slug]
                  )
                }
                className={`px-3 py-1.5 rounded-full text-[12px] font-semibold transition-colors ${
                  on
                    ? "bg-charcoal text-white"
                    : "bg-cream border border-charcoal/15 text-charcoal/70 hover:bg-charcoal/5"
                }`}
              >
                {CAMPAIGNS[slug]}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* Country (overwrite) */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-charcoal/50 mb-1.5">
              Set country (ISO-2)
            </label>
            <input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="e.g. PS"
              maxLength={5}
              className="w-full px-3 py-2 rounded-lg bg-white border border-charcoal/15 text-charcoal text-[13px] uppercase focus:outline-none focus:ring-2 focus:ring-charcoal/10"
            />
          </div>
          {/* Tone (overwrite) */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-charcoal/50 mb-1.5">
              Set tone
            </label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white border border-charcoal/15 text-charcoal text-[13px] focus:outline-none focus:ring-2 focus:ring-charcoal/10"
            >
              <option value="">— leave as is —</option>
              {MEDIA_TONES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tags (additive) */}
        <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-charcoal/50 mb-1.5">
          Add tags (comma-separated)
        </label>
        <input
          type="text"
          value={tagsText}
          onChange={(e) => setTagsText(e.target.value)}
          placeholder="gaza, aftermath, children"
          className="w-full px-3 py-2 rounded-lg bg-white border border-charcoal/15 text-charcoal text-[13px] focus:outline-none focus:ring-2 focus:ring-charcoal/10 mb-1"
        />
        {tagList.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {tagList.map((t) => (
              <span
                key={t}
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-charcoal/8 text-charcoal/70"
              >
                {t}
              </span>
            ))}
          </div>
        )}

        {error && (
          <p className="text-[12.5px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-3">
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-2 mt-5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-full text-charcoal/60 text-[13px] font-semibold hover:text-charcoal transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!hasSomething || pending}
            onClick={submit}
            className="px-5 py-2 rounded-full bg-charcoal text-white text-[13px] font-semibold hover:bg-charcoal/85 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {pending ? "Applying…" : `Apply to ${count}`}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Icons ──────────────────────────────────────────────────────── */

function CheckSquareIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M8 12l3 3 5-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden>
      <path d="M5 12l5 5 9-11" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
