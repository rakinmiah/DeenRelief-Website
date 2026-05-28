import type { Metadata } from "next";
import Link from "next/link";
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
      <div className="mb-8 bg-amber-light/60 border border-amber/30 rounded-2xl px-5 md:px-6 py-4 flex items-start gap-3">
        <span className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber/20 text-amber-dark mt-0.5">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
            />
          </svg>
        </span>
        <div>
          <p className="text-charcoal font-semibold text-[14px]">
            Signal monitoring is not yet active.
          </p>
          <p className="text-charcoal/70 text-[13px] mt-0.5 leading-relaxed">
            The coverage map below is in place and seeded with all 10 campaigns.
            Phase 3b adds the signal ingesters (GDACS / USGS / news / competitor
            scrapers / site search spikes). Phase 3c adds the scoring engine
            and push alerts. Phase 4 adds the launch-packet generator and
            emergency-launch button.
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
              No detected events yet. Once signal ingestion is live, ranked
              alerts will appear here.
            </div>
          ) : (
            <ul className="divide-y divide-charcoal/5">
              {events.map((ev) => (
                <li key={ev.id} className="px-5 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-charcoal font-semibold text-[14px]">
                        {ev.title}
                      </p>
                      <p className="text-charcoal/60 text-[12px] mt-0.5">
                        {ev.source}
                        {ev.countryIso ? ` · ${ev.countryIso}` : ""}
                        {ev.region ? ` · ${ev.region}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-[11px] font-bold uppercase tracking-[0.08em] text-charcoal/60 bg-charcoal/5 px-2 py-1 rounded-full">
                      {ev.status}
                    </span>
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

