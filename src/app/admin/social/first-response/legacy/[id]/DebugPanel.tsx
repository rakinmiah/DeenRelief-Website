"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  getEventDebugInfoAction,
  type EventDebugInfo,
} from "./debug-actions";

/**
 * "Debug: image selection" panel — collapsed by default.
 *
 * Click to expand → fetches a structured view of:
 *   • What event metadata drives the candidate query
 *   • What candidates that query returned (with all their tags)
 *   • What the stored packet picked per slide (resolved to caption + URL)
 *
 * Lets the SMM see exactly why a slide does or doesn't have imagery —
 * is the candidate set empty (tagging issue), did Claude skip a
 * relevant match (prompt issue), or did Claude pick a candidate that
 * just isn't surfacing for some reason?
 */
export default function DebugPanel({ eventId }: { eventId: string }) {
  const [data, setData] = useState<EventDebugInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleExpand() {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setExpanded(true);
    if (data) return; // already loaded
    setError(null);
    startTransition(async () => {
      const result = await getEventDebugInfoAction(eventId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setData(result.data);
    });
  }

  return (
    <section className="mt-8">
      <button
        type="button"
        onClick={handleExpand}
        className="text-[11px] font-bold tracking-[0.18em] uppercase text-charcoal/50 hover:text-charcoal/80 transition-colors"
      >
        {expanded ? "▾ Hide image-selection debug" : "▸ Debug: image selection"}
      </button>

      {expanded && (
        <div className="mt-3 bg-charcoal/[0.03] border border-charcoal/15 rounded-2xl p-4 md:p-5">
          {pending && !data && (
            <p className="text-[13px] text-charcoal/60">Loading…</p>
          )}
          {error && (
            <p className="text-[13px] text-red-700">{error}</p>
          )}
          {data && <DebugView info={data} />}
        </div>
      )}
    </section>
  );
}

function DebugView({ info }: { info: EventDebugInfo }) {
  return (
    <div className="space-y-5 text-[13px]">
      {/* ─── Section 1: candidate query inputs ─── */}
      <div>
        <h3 className="text-[11px] font-bold tracking-[0.1em] uppercase text-charcoal/55 mb-2">
          1. Candidate query inputs
        </h3>
        <div className="bg-white border border-charcoal/10 rounded-xl p-3 font-mono text-[12px] leading-relaxed">
          <div>
            <span className="text-charcoal/55">country_iso:</span>{" "}
            <span className="text-charcoal">
              {info.candidateQuery.countryIso ?? "(null)"}
            </span>
          </div>
          <div>
            <span className="text-charcoal/55">event_type:</span>{" "}
            <span className="text-charcoal">
              {info.candidateQuery.eventType ?? "(null)"}
            </span>
          </div>
          <div>
            <span className="text-charcoal/55">campaign_slugs:</span>{" "}
            <span className="text-charcoal">
              [{info.candidateQuery.campaignSlugs.join(", ")}]
            </span>
          </div>
        </div>
        <p className="text-[11px] text-charcoal/55 mt-1.5 leading-relaxed">
          Query is{" "}
          <span className="font-mono">OR</span> across these — a photo is a
          candidate if country, ANY event_type, or ANY campaign_slug matches.
        </p>
      </div>

      {/* ─── Section 2: candidates returned ─── */}
      <div>
        <h3 className="text-[11px] font-bold tracking-[0.1em] uppercase text-charcoal/55 mb-2">
          2. Candidates returned ({info.candidates.length})
        </h3>
        {info.candidates.length === 0 ? (
          <div className="bg-amber-light/40 border border-amber/25 rounded-xl p-3 text-charcoal/85">
            <p className="font-semibold mb-1">No candidates matched.</p>
            <p className="text-[12px] leading-relaxed">
              This means none of your library photos are tagged with{" "}
              <span className="font-mono">country_iso=
                {info.candidateQuery.countryIso ?? "?"}</span>, event_type=
              <span className="font-mono">
                {info.candidateQuery.eventType ?? "?"}
              </span>, or campaign_slugs containing{" "}
              <span className="font-mono">
                [{info.candidateQuery.campaignSlugs.join(", ")}]
              </span>
              . Edit your photos at{" "}
              <Link
                href="/admin/social/media-library"
                className="text-amber-dark underline underline-offset-2"
              >
                /admin/social/media-library
              </Link>{" "}
              to add the missing tags, then redraft the packet.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {info.candidates.map((c) => (
              <div
                key={c.id}
                className="bg-white border border-charcoal/10 rounded-xl p-3 flex items-start gap-3"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={c.publicUrl}
                  alt={c.caption ?? ""}
                  className="w-16 h-16 object-cover rounded-lg flex-shrink-0 bg-cream"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-charcoal text-[12px] leading-snug line-clamp-2 mb-1">
                    {c.caption ?? (
                      <span className="text-charcoal/40">(no caption)</span>
                    )}
                  </p>
                  <div className="flex flex-wrap gap-1 font-mono text-[10px]">
                    <Tag
                      label="country"
                      value={c.countryIso ?? "—"}
                      good={!!c.countryIso}
                    />
                    {c.eventTypes.length > 0 ? (
                      c.eventTypes.map((e) => (
                        <Tag key={e} label="event" value={e} good />
                      ))
                    ) : (
                      <Tag label="events" value="—" good={false} />
                    )}
                    {c.campaignSlugs.length > 0 ? (
                      c.campaignSlugs.map((cs) => (
                        <Tag key={cs} label="campaign" value={cs} good />
                      ))
                    ) : (
                      <Tag label="campaigns" value="—" good={false} />
                    )}
                    {c.tone && <Tag label="tone" value={c.tone} good />}
                    {c.useCases.length > 0 ? (
                      c.useCases.map((u) => (
                        <Tag key={u} label="use" value={u} good />
                      ))
                    ) : (
                      <Tag label="use_cases" value="—" good={false} />
                    )}
                  </div>
                  <p className="font-mono text-[10px] text-charcoal/45 mt-1">
                    id: {c.id}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Section 3: external verified imagery ─── */}
      <div>
        <h3 className="text-[11px] font-bold tracking-[0.1em] uppercase text-charcoal/55 mb-2">
          3. External verified imagery ({info.externalCandidates.length})
        </h3>
        {info.externalCandidates.length === 0 ? (
          <div className="bg-white border border-charcoal/10 rounded-xl p-3 text-[12px] text-charcoal/65 leading-relaxed">
            No third-party imagery fetched for this event yet. Wikimedia
            + NASA EONET run when the packet is drafted — if you haven't
            generated one, drafts the packet to populate. (ReliefWeb +
            IFRC are stubs pending API approval.)
          </div>
        ) : (
          <div className="space-y-2">
            {info.externalCandidates.map((e) => (
              <div
                key={e.id}
                className="bg-white border border-charcoal/10 rounded-xl p-3 flex items-start gap-3"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={e.url}
                  alt={e.title ?? ""}
                  className="w-16 h-16 object-cover rounded-lg flex-shrink-0 bg-cream"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-charcoal text-[12px] leading-snug line-clamp-2 mb-1">
                    {e.title ?? (
                      <span className="text-charcoal/40">(no title)</span>
                    )}
                  </p>
                  <div className="flex flex-wrap gap-1 font-mono text-[10px]">
                    <Tag label="source" value={e.sourceLabel} good />
                    <Tag label="license" value={e.license} good />
                    {e.selected && <Tag label="selected" value="✓" good />}
                  </div>
                  <p className="text-[10px] text-charcoal/55 mt-1 italic line-clamp-1">
                    {e.creditText}
                  </p>
                  <p className="font-mono text-[10px] text-charcoal/45 mt-0.5">
                    id: ext:{e.id}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Section 4: per-slide selection ─── */}
      <div>
        <h3 className="text-[11px] font-bold tracking-[0.1em] uppercase text-charcoal/55 mb-2">
          4. Per-slide selection
        </h3>
        {info.packet.present ? (
          <div className="bg-white border border-charcoal/10 rounded-xl divide-y divide-charcoal/5">
            {info.packet.slides.map((s) => {
              const shouldHavePhoto = s.layout === "hero" || s.layout === "response";
              const resolved = s.mediaResolved;
              return (
                <div
                  key={s.index}
                  className="px-3 py-2.5 flex items-start gap-3"
                >
                  <span className="text-[11px] font-bold text-charcoal/55 w-12 flex-shrink-0">
                    {s.index} · {s.layout}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-charcoal text-[12px] line-clamp-1">
                      {s.title}
                    </p>
                    {resolved ? (
                      resolved.kind === "dr" ? (
                        <p className="text-[11px] text-green-dark mt-0.5">
                          ✓ DR library: {resolved.caption ?? "(no caption)"}{" "}
                          <span className="font-mono text-charcoal/50">
                            [{s.mediaId}]
                          </span>
                        </p>
                      ) : (
                        <p className="text-[11px] text-green-dark mt-0.5">
                          ✓ External ({resolved.sourceLabel}):{" "}
                          <span className="italic text-charcoal/70">
                            {resolved.creditText}
                          </span>{" "}
                          <span className="font-mono text-charcoal/50">
                            [{s.mediaId}]
                          </span>
                        </p>
                      )
                    ) : shouldHavePhoto ? (
                      <p className="text-[11px] text-red-700 mt-0.5">
                        ✗ No image picked
                        {s.mediaId
                          ? ` (the draft returned id ${s.mediaId} which isn't in either candidate pool — likely an archived/stale row or a stale draft predating this code)`
                          : info.candidates.length === 0 &&
                              info.externalCandidates.length === 0
                            ? " (no candidates available from either pool)"
                            : " (candidates were available but none was chosen — try redrafting)"}
                      </p>
                    ) : (
                      <p className="text-[11px] text-charcoal/45 mt-0.5">
                        Typography-only by design.
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-charcoal/[0.04] border border-charcoal/10 rounded-xl p-3 text-charcoal/70">
            {info.packet.reason}
          </div>
        )}
      </div>
    </div>
  );
}

function Tag({
  label,
  value,
  good,
}: {
  label: string;
  value: string;
  good: boolean;
}) {
  return (
    <span
      className={`inline-block px-1.5 py-0.5 rounded ${
        good
          ? "bg-green/10 text-green-dark"
          : "bg-red-50 text-red-700"
      }`}
    >
      {label}={value}
    </span>
  );
}
