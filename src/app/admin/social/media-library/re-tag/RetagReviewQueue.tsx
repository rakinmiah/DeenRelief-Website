"use client";

import { useState, useTransition } from "react";
import { CAMPAIGNS, isValidCampaign, type CampaignSlug } from "@/lib/campaigns";
import { type MediaItem, type MediaUseCase } from "@/lib/media-library";
import type { MediaTagSuggestions } from "@/lib/media-library-vision";
import { editMediaAction, proposeRetagAction } from "../actions";

/**
 * Batch re-tag review queue.
 *
 * Each card shows the current row + a 'Re-tag' button. Clicking
 * Re-tag calls Claude Vision via the server action, then renders the
 * proposed metadata alongside the current values as a coloured diff
 * (unchanged = neutral, changed = highlighted in amber/green).
 *
 * The SMM applies the whole proposal in one click (most common case
 * after a quick read), or discards if Claude's suggestion is worse
 * than what's already there.
 *
 * 'Re-tag all' iterates the queue with concurrency 3 so the SMM can
 * walk away and come back to a queue of ready proposals. Each Vision
 * call is ~5s, so 60 photos = ~100s wall-clock at concurrency 3.
 */

type CardState =
  | { phase: "idle" }
  | { phase: "proposing" }
  | { phase: "proposed"; proposed: MediaTagSuggestions }
  | { phase: "applying" }
  | { phase: "applied" }
  | { phase: "error"; message: string };

export default function RetagReviewQueue({ items }: { items: MediaItem[] }) {
  const [states, setStates] = useState<Record<string, CardState>>(
    () => Object.fromEntries(items.map((m) => [m.id, { phase: "idle" }]))
  );

  function setCard(id: string, next: CardState) {
    setStates((s) => ({ ...s, [id]: next }));
  }

  // 'Re-tag all' iterates with bounded concurrency so we don't fan
  // 60 Vision calls in parallel + rate-limit ourselves.
  const [batchPending, setBatchPending] = useState(false);
  async function handleRetagAll() {
    if (batchPending) return;
    setBatchPending(true);
    const queue = items.filter((m) => states[m.id]?.phase === "idle");
    const CONCURRENCY = 3;
    let cursor = 0;
    async function worker() {
      while (cursor < queue.length) {
        const next = queue[cursor++];
        if (!next) continue;
        setCard(next.id, { phase: "proposing" });
        try {
          const result = await proposeRetagAction(next.id);
          if (result.ok) {
            setCard(next.id, { phase: "proposed", proposed: result.data.proposed });
          } else {
            setCard(next.id, { phase: "error", message: result.error });
          }
        } catch (err) {
          setCard(next.id, {
            phase: "error",
            message: err instanceof Error ? err.message : "Unknown error",
          });
        }
      }
    }
    await Promise.all(
      Array.from({ length: CONCURRENCY }, () => worker())
    );
    setBatchPending(false);
  }

  const proposedCount = items.filter(
    (m) => states[m.id]?.phase === "proposed"
  ).length;
  const appliedCount = items.filter(
    (m) => states[m.id]?.phase === "applied"
  ).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div className="text-[13px] text-charcoal/70">
          <span className="font-bold text-charcoal">{appliedCount}</span> applied
          {" · "}
          <span className="font-bold text-charcoal">{proposedCount}</span>{" "}
          awaiting review
          {" · "}
          {items.length} total
        </div>
        <button
          type="button"
          onClick={handleRetagAll}
          disabled={batchPending}
          className="px-5 py-2.5 bg-charcoal text-cream rounded-full text-[13px] font-bold tracking-[0.08em] uppercase hover:bg-charcoal/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {batchPending ? "Re-tagging…" : "Auto re-tag all"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {items.map((item) => (
          <Card
            key={item.id}
            item={item}
            state={states[item.id] ?? { phase: "idle" }}
            setState={(s) => setCard(item.id, s)}
          />
        ))}
      </div>
    </div>
  );
}

/* ─── Card ─────────────────────────────────────────────────────── */

function Card({
  item,
  state,
  setState,
}: {
  item: MediaItem;
  state: CardState;
  setState: (s: CardState) => void;
}) {
  const [pending, startTransition] = useTransition();

  async function handlePropose() {
    setState({ phase: "proposing" });
    const result = await proposeRetagAction(item.id);
    if (result.ok) {
      setState({ phase: "proposed", proposed: result.data.proposed });
    } else {
      setState({ phase: "error", message: result.error });
    }
  }

  function handleApply(proposed: MediaTagSuggestions) {
    setState({ phase: "applying" });
    startTransition(async () => {
      // Whitelist proposed campaign slugs against the live registry —
      // matches the upload-flow's defensive validation.
      const validCampaigns = proposed.campaign_slugs.filter((c) =>
        isValidCampaign(c)
      ) as CampaignSlug[];
      const validUseCases = proposed.use_cases as MediaUseCase[];
      const result = await editMediaAction({
        id: item.id,
        caption: proposed.caption,
        tags: proposed.tags.map((t) => t.toLowerCase()),
        campaignSlugs: validCampaigns,
        countryIso: proposed.country_iso,
        eventTypes: proposed.event_types.map((t) => t.toLowerCase()),
        tone: proposed.tone,
        useCases: validUseCases,
        peopleVisible: proposed.people_visible,
        identifiableMinors: proposed.identifiable_minors,
      });
      if (result.ok) {
        setState({ phase: "applied" });
      } else {
        setState({ phase: "error", message: result.error });
      }
    });
  }

  return (
    <div className="bg-white border border-charcoal/12 rounded-2xl p-4 flex gap-4">
      {/* Thumbnail + identity */}
      <div className="flex flex-col gap-2 w-32 shrink-0">
        <div
          className="aspect-square rounded-xl overflow-hidden border border-charcoal/10"
          style={{ backgroundColor: item.dominantColor ?? "#F7F3E8" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.publicUrl}
            alt={item.caption ?? ""}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="font-mono text-[10px] text-charcoal/45 break-all leading-tight">
          {item.id.slice(0, 12)}…
        </div>
      </div>

      {/* Right column — state machine */}
      <div className="flex-1 min-w-0 flex flex-col">
        {state.phase === "idle" && (
          <IdleState item={item} onPropose={handlePropose} />
        )}
        {state.phase === "proposing" && (
          <div className="flex items-center text-[13px] text-charcoal/65 italic">
            Reading the photo…
          </div>
        )}
        {state.phase === "proposed" && (
          <DiffView
            item={item}
            proposed={state.proposed}
            onApply={() => handleApply(state.proposed)}
            onDiscard={() => setState({ phase: "idle" })}
            pending={pending}
          />
        )}
        {state.phase === "applying" && (
          <div className="flex items-center text-[13px] text-charcoal/65 italic">
            Saving…
          </div>
        )}
        {state.phase === "applied" && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-[13px] text-green-dark font-bold">
              ✓ Updated
            </div>
            <button
              type="button"
              onClick={handlePropose}
              className="self-start text-[11px] font-bold tracking-[0.12em] uppercase text-charcoal/55 hover:text-charcoal/80"
            >
              Re-tag again
            </button>
          </div>
        )}
        {state.phase === "error" && (
          <div className="flex flex-col gap-2">
            <div className="text-[12px] text-red-700">
              Error: {state.message}
            </div>
            <button
              type="button"
              onClick={handlePropose}
              className="self-start px-3 py-1.5 bg-charcoal text-cream rounded-full text-[11px] font-bold tracking-[0.08em] uppercase"
            >
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Idle (pre-propose) ─────────────────────────────────────── */

function IdleState({
  item,
  onPropose,
}: {
  item: MediaItem;
  onPropose: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="text-[13px] text-charcoal/85 mb-1 line-clamp-2">
        {item.caption ?? (
          <span className="text-charcoal/40 italic">(no caption)</span>
        )}
      </div>
      <div className="flex flex-wrap gap-1 mb-3">
        {item.countryIso && (
          <Tag value={`country=${item.countryIso}`} />
        )}
        {item.eventTypes.slice(0, 3).map((e) => (
          <Tag key={e} value={`event=${e}`} />
        ))}
        {item.campaignSlugs.slice(0, 3).map((c) => (
          <Tag key={c} value={`campaign=${c}`} />
        ))}
        {item.tone && <Tag value={`tone=${item.tone}`} />}
      </div>
      <button
        type="button"
        onClick={onPropose}
        className="self-start px-4 py-2 bg-charcoal text-cream rounded-full text-[12px] font-bold tracking-[0.08em] uppercase hover:bg-charcoal/90"
      >
        Auto re-tag
      </button>
    </div>
  );
}

/* ─── Diff ───────────────────────────────────────────────────── */

function DiffView({
  item,
  proposed,
  onApply,
  onDiscard,
  pending,
}: {
  item: MediaItem;
  proposed: MediaTagSuggestions;
  onApply: () => void;
  onDiscard: () => void;
  pending: boolean;
}) {
  // Pair-by-pair diff. Most rows show "X (was: Y)" where X is the
  // proposal. When nothing changes for a field we show it neutrally.
  return (
    <div className="flex flex-col gap-2.5 text-[12px]">
      <DiffField
        label="caption"
        current={item.caption}
        proposed={proposed.caption}
      />
      <DiffField
        label="country"
        current={item.countryIso}
        proposed={proposed.country_iso}
      />
      <DiffArrayField
        label="events"
        current={item.eventTypes}
        proposed={proposed.event_types}
      />
      <DiffArrayField
        label="campaigns"
        current={item.campaignSlugs}
        proposed={proposed.campaign_slugs}
      />
      <DiffField
        label="tone"
        current={item.tone}
        proposed={proposed.tone}
      />
      <DiffArrayField
        label="use cases"
        current={item.useCases}
        proposed={proposed.use_cases}
      />
      <DiffArrayField
        label="tags"
        current={item.tags}
        proposed={proposed.tags}
      />
      <DiffBoolField
        label="people visible"
        current={item.peopleVisible}
        proposed={proposed.people_visible}
      />
      <DiffBoolField
        label="minors identifiable"
        current={item.identifiableMinors}
        proposed={proposed.identifiable_minors}
      />

      <div className="flex gap-2 pt-2 mt-1 border-t border-charcoal/10">
        <button
          type="button"
          onClick={onApply}
          disabled={pending}
          className="px-4 py-1.5 bg-green text-cream rounded-full text-[11px] font-bold tracking-[0.1em] uppercase hover:bg-green-dark disabled:opacity-50"
        >
          {pending ? "Applying…" : "Apply proposal"}
        </button>
        <button
          type="button"
          onClick={onDiscard}
          disabled={pending}
          className="px-4 py-1.5 bg-cream-soft text-charcoal/75 border border-charcoal/15 rounded-full text-[11px] font-bold tracking-[0.1em] uppercase hover:bg-cream disabled:opacity-50"
        >
          Discard
        </button>
      </div>
    </div>
  );
}

function DiffField({
  label,
  current,
  proposed,
}: {
  label: string;
  current: string | null;
  proposed: string | null;
}) {
  const changed = (current ?? "") !== (proposed ?? "");
  return (
    <div className="grid grid-cols-[80px_1fr] gap-2 items-baseline">
      <div className="text-[10px] font-bold tracking-[0.12em] uppercase text-charcoal/45">
        {label}
      </div>
      <div>
        <span
          className={
            changed
              ? "text-charcoal bg-amber/20 px-1.5 py-0.5 rounded"
              : "text-charcoal/70"
          }
        >
          {proposed ?? <span className="text-charcoal/35 italic">(none)</span>}
        </span>
        {changed && (
          <span className="ml-2 text-[10px] text-charcoal/45 line-through">
            was: {current ?? "(none)"}
          </span>
        )}
      </div>
    </div>
  );
}

function DiffArrayField({
  label,
  current,
  proposed,
}: {
  label: string;
  current: readonly string[];
  proposed: readonly string[];
}) {
  const currentSet = new Set(current);
  const proposedSet = new Set(proposed);
  const added = proposed.filter((p) => !currentSet.has(p));
  const removed = current.filter((c) => !proposedSet.has(c));
  const changed = added.length > 0 || removed.length > 0;
  return (
    <div className="grid grid-cols-[80px_1fr] gap-2 items-baseline">
      <div className="text-[10px] font-bold tracking-[0.12em] uppercase text-charcoal/45">
        {label}
      </div>
      <div className="flex flex-wrap gap-1">
        {proposed.length === 0 && !changed && (
          <span className="text-charcoal/35 italic">(none)</span>
        )}
        {proposed.map((p) => {
          const isAdded = added.includes(p);
          return (
            <span
              key={p}
              className={`px-1.5 py-0.5 rounded text-[11px] font-mono ${
                isAdded
                  ? "bg-green/15 text-green-dark"
                  : "bg-charcoal/5 text-charcoal/75"
              }`}
            >
              {p}
            </span>
          );
        })}
        {removed.map((r) => (
          <span
            key={r}
            className="px-1.5 py-0.5 rounded text-[11px] font-mono bg-red-50 text-red-700 line-through"
          >
            {r}
          </span>
        ))}
      </div>
    </div>
  );
}

function DiffBoolField({
  label,
  current,
  proposed,
}: {
  label: string;
  current: boolean;
  proposed: boolean;
}) {
  const changed = current !== proposed;
  return (
    <div className="grid grid-cols-[80px_1fr] gap-2 items-baseline">
      <div className="text-[10px] font-bold tracking-[0.12em] uppercase text-charcoal/45">
        {label}
      </div>
      <div>
        <span
          className={
            changed
              ? "text-charcoal bg-amber/20 px-1.5 py-0.5 rounded font-mono"
              : "text-charcoal/70 font-mono"
          }
        >
          {proposed ? "true" : "false"}
        </span>
        {changed && (
          <span className="ml-2 text-[10px] text-charcoal/45 line-through font-mono">
            was: {current ? "true" : "false"}
          </span>
        )}
      </div>
    </div>
  );
}

function Tag({ value }: { value: string }) {
  return (
    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-charcoal/5 text-charcoal/65">
      {value}
    </span>
  );
}
