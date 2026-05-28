import type { Metadata } from "next";
import Link from "next/link";
import { Fragment } from "react";
import { requireAdminSession } from "@/lib/admin-session";
import { CAMPAIGNS, isValidCampaign, type CampaignSlug } from "@/lib/campaigns";
import {
  getCoverageMap,
  getEmergencyEvents,
  type CoverageEntry,
} from "@/lib/first-response";

export const metadata: Metadata = {
  title: "First Response | Deen Relief Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * /admin/social/first-response — crisis intelligence dashboard.
 *
 * Phase 3a (this page in its current form): displays the seeded
 * coverage_map so the SMM + trustees can see, in one screen, which
 * campaigns are wired to which geographies + event types. Surfaces
 * any emergency_events that have been detected (currently zero —
 * Phase 3b ingesters haven't been built).
 *
 * Phases that will fill this in:
 *   - Phase 3b: signal source ingesters (GDACS, USGS, news, etc.)
 *               populate emergency_events
 *   - Phase 3c: scoring engine fires dr_priority_score + push alerts
 *   - Phase 4:  launch packet generator + emergency launch button
 *
 * Accessible to both 'admin' and 'social' roles.
 */
export default async function FirstResponsePage() {
  await requireAdminSession();
  const [coverage, events] = await Promise.all([
    getCoverageMap(),
    getEmergencyEvents({ limit: 20 }),
  ]);

  // Strategic / partner / catch-all tiers driven by weight.
  const strategic = coverage.filter((c) => c.weight >= 3);
  const partner = coverage.filter((c) => c.weight === 2);
  const catchAll = coverage.filter((c) => c.isCatchAll);
  const evergreen = coverage.filter(
    (c) => c.weight > 0 && c.weight < 2 && !c.isCatchAll
  );

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <div className="mb-6 md:mb-8">
        <Link
          href="/admin/social"
          className="inline-block text-[12px] font-semibold uppercase tracking-[0.1em] text-amber-dark mb-2 hover:text-amber-darker"
        >
          ← Social tools
        </Link>
        <h1 className="text-3xl md:text-4xl font-heading font-bold text-charcoal tracking-[-0.01em]">
          First Response
        </h1>
        <p className="text-charcoal/70 text-[15px] leading-relaxed mt-2 max-w-2xl">
          Crisis intelligence tailored to Deen Relief&apos;s actual campaigns
          and field regions. When a humanitarian crisis hits a geography we
          can convert on, alerts land here ranked by revenue potential — so
          the SMM and trustees can launch a coordinated appeal in minutes,
          not days.
        </p>
      </div>

      {/* ─── Status banner ─── */}
      <div className="mb-8 bg-green-light/40 border border-green/30 rounded-2xl px-5 md:px-6 py-4 flex items-start gap-3">
        <span className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-full bg-green/20 text-green-dark mt-0.5">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.5 12.75l6 6 9-13.5"
            />
          </svg>
        </span>
        <div>
          <p className="text-charcoal font-semibold text-[14px]">
            Signal monitoring is live — Tier 1 sources active, multi-factor
            scoring + push alerts wired.
          </p>
          <p className="text-charcoal/70 text-[13px] mt-0.5 leading-relaxed">
            Ingesting from six authoritative sources:{" "}
            <span className="font-semibold text-charcoal">GDACS</span> (15 min),{" "}
            <span className="font-semibold text-charcoal">USGS earthquakes</span>{" "}
            (15 min),{" "}
            <span className="font-semibold text-charcoal">ReliefWeb</span> (30 min),{" "}
            <span className="font-semibold text-charcoal">IFRC GO</span>{" "}
            (Red Crescent national societies, 30 min),{" "}
            <span className="font-semibold text-charcoal">UK Met Office</span>{" "}
            (severe weather warnings, hourly, Brighton-region filtered), and{" "}
            <span className="font-semibold text-charcoal">NASA EONET</span>{" "}
            (curated natural events, hourly). Each event is scored by{" "}
            <span className="font-semibold text-charcoal">
              severity × coverage weight × UK Muslim diaspora × Muslim-majority
            </span>{" "}
            and pushed to your DR Admin bell when the score crosses 10 (amber)
            or 20 (critical, audible). Every source is filtered at ingest
            to DR&apos;s coverage + diaspora-adjacent geographies — events
            from regions outside that set never reach the database. Click
            any alert to draft a Claude-written launch packet + one-click
            emergency launch.
          </p>
        </div>
      </div>

      {/* ─── Detected events (currently empty) ─── */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-charcoal font-heading font-semibold text-xl">
            Active alerts
          </h2>
          <span className="text-[12px] text-charcoal/50 font-medium">
            {events.length} total
          </span>
        </div>
        <div className="bg-white border border-charcoal/10 rounded-2xl">
          {events.length === 0 ? (
            <div className="px-6 py-10 text-center text-charcoal/50 text-sm">
              No events detected yet. The first cron run will populate this
              within a few minutes of deployment — ranked by severity, with
              matched campaigns alongside each entry.
            </div>
          ) : (
            <ul className="divide-y divide-charcoal/5">
              {events.map((ev) => (
                <li
                  key={ev.id}
                  className="relative px-5 py-4 hover:bg-cream/40 transition-colors"
                >
                  {/* Stretched link — the actual click target for the
                      whole row. position:absolute + inset-0 makes the
                      entire <li> clickable via CSS without nesting
                      anchors. The source ↗ link below gets z-10 +
                      relative to sit above this and remain
                      independently clickable. */}
                  <Link
                    href={`/admin/social/first-response/${ev.id}`}
                    className="absolute inset-0 z-0"
                    aria-label={`Open event: ${ev.title}`}
                  />
                  <div className="relative flex items-start justify-between gap-3 flex-wrap pointer-events-none">
                    <div className="flex-1 min-w-0">
                      <p className="text-charcoal font-semibold text-[14px] leading-snug">
                        <span className="hover:underline">{ev.title}</span>
                        {ev.sourceUrl && (
                          <Fragment>
                            {" "}
                            <a
                              href={ev.sourceUrl}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="pointer-events-auto relative z-10 text-[12px] text-charcoal/40 font-normal hover:text-charcoal/70"
                            >
                              (source ↗)
                            </a>
                          </Fragment>
                        )}
                      </p>
                      <p className="text-charcoal/60 text-[12px] mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="uppercase font-bold tracking-[0.08em]">
                          {ev.source}
                        </span>
                        {ev.eventType && (
                          <>
                            <span className="text-charcoal/20">·</span>
                            <span className="capitalize">
                              {ev.eventType.replace(/_/g, " ")}
                            </span>
                          </>
                        )}
                        {ev.countryIso && (
                          <>
                            <span className="text-charcoal/20">·</span>
                            <span>{ev.countryIso}</span>
                          </>
                        )}
                        {ev.region && (
                          <>
                            <span className="text-charcoal/20">·</span>
                            <span className="truncate">{ev.region}</span>
                          </>
                        )}
                        <span className="text-charcoal/20">·</span>
                        <span>{formatRelative(ev.detectedAt)}</span>
                      </p>
                      {ev.matchedCampaigns.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {ev.matchedCampaigns.map((slug) => (
                            <span
                              key={slug}
                              className="inline-block text-[11px] font-semibold text-charcoal/80 bg-charcoal/5 px-2 py-0.5 rounded-full"
                            >
                              {isValidCampaign(slug)
                                ? CAMPAIGNS[slug as CampaignSlug]
                                : slug}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {ev.drPriorityScore !== null && (
                        <span
                          className={`text-[11px] font-bold uppercase tracking-[0.08em] px-2 py-1 rounded-full ${scoreClasses(
                            ev.drPriorityScore
                          )}`}
                          title={
                            ev.severityRaw !== null
                              ? `Raw severity ${ev.severityRaw.toFixed(1)} × coverage × diaspora × Muslim-majority`
                              : "DR priority score"
                          }
                        >
                          Score {ev.drPriorityScore.toFixed(1)}
                        </span>
                      )}
                      <span className="text-[10px] font-bold tracking-[0.08em] uppercase text-charcoal/40">
                        {ev.status}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* ─── Coverage map ─── */}
      <section>
        <h2 className="text-charcoal font-heading font-semibold text-xl mb-3">
          Active Campaign Coverage Map
        </h2>
        <p className="text-charcoal/70 text-[14px] mb-5 max-w-2xl leading-relaxed">
          Which campaigns can respond to which crises, ranked by strategic
          importance. Edit this map as DR&apos;s operational reach grows —
          adding Pakistan or Sudan capability simply means adding/updating
          rows.
        </p>

        <CoverageGroup
          title="Strategic — field presence"
          subtitle="DR is on-the-ground in these geographies. First-mover advantage on these events."
          accent="text-green-dark"
          rows={strategic}
        />
        <CoverageGroup
          title="Partner network"
          subtitle="Important secondary capability via partners or close-adjacent programmes."
          accent="text-charcoal/70"
          rows={partner}
        />
        <CoverageGroup
          title="Catch-all routing"
          subtitle="Religious-giving channels that flexibly route to any humanitarian crisis when no geography-specific row matches."
          accent="text-amber-dark"
          rows={catchAll}
        />
        {evergreen.length > 0 && (
          <CoverageGroup
            title="Evergreen / seasonal"
            subtitle="Not news-triggered. Excluded from event matching."
            accent="text-charcoal/50"
            rows={evergreen}
          />
        )}
      </section>
    </main>
  );
}

/**
 * Score colour pill. Aligned to the push-tier thresholds in
 * src/lib/first-response-scoring.ts:
 *   ≥ 20 → CRITICAL (red — fires an immediate push)
 *   ≥ 10 → HIGH     (amber — bell-only push)
 *   <  10 → standard (charcoal — dashboard only)
 */
function scoreClasses(score: number): string {
  if (score >= 20) return "bg-red-100 text-red-800";
  if (score >= 10) return "bg-amber-light text-amber-dark";
  return "bg-charcoal/8 text-charcoal/70";
}

function formatRelative(d: Date): string {
  const diffMs = Date.now() - d.getTime();
  const mins = Math.round(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

function CoverageGroup({
  title,
  subtitle,
  accent,
  rows,
}: {
  title: string;
  subtitle: string;
  accent: string;
  rows: CoverageEntry[];
}) {
  if (rows.length === 0) return null;
  return (
    <div className="mb-6">
      <h3 className={`text-[11px] font-bold tracking-[0.18em] uppercase mb-1 ${accent}`}>
        {title}
      </h3>
      <p className="text-charcoal/60 text-[12px] mb-3 leading-relaxed">
        {subtitle}
      </p>
      <div className="bg-white border border-charcoal/10 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] font-bold uppercase tracking-[0.08em] text-charcoal/50 bg-charcoal/[0.02]">
              <th className="text-left px-5 py-3">Campaign</th>
              <th className="text-left px-5 py-3">Geographies</th>
              <th className="text-left px-5 py-3">Event types</th>
              <th className="text-left px-5 py-3 whitespace-nowrap">
                Readiness
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.campaignSlug} className="border-t border-charcoal/5">
                <td className="px-5 py-3">
                  <span className="block text-charcoal font-semibold">
                    {isValidCampaign(row.campaignSlug)
                      ? CAMPAIGNS[row.campaignSlug as CampaignSlug]
                      : row.campaignSlug}
                  </span>
                  {row.notes && (
                    <span className="block text-charcoal/55 text-[12px] mt-0.5 leading-snug max-w-md">
                      {row.notes}
                    </span>
                  )}
                </td>
                <td className="px-5 py-3 text-charcoal/70 text-[13px]">
                  {row.isCatchAll
                    ? "Any (catch-all)"
                    : row.geographies.length > 0
                      ? row.geographies.join(", ")
                      : "—"}
                </td>
                <td className="px-5 py-3 text-charcoal/70 text-[13px]">
                  {row.triggerEventTypes.length > 0
                    ? row.triggerEventTypes
                        .map((t) => t.replace(/_/g, " "))
                        .join(", ")
                    : "—"}
                </td>
                <td className="px-5 py-3 text-charcoal/70 text-[12px] whitespace-nowrap">
                  {row.launchReadiness ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

