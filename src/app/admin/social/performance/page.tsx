import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminSession } from "@/lib/admin-session";
import { CAMPAIGNS, isValidCampaign, type CampaignSlug } from "@/lib/campaigns";
import {
  emptyPostSpotlightSummary,
  getSpotlightSummaryByPostIds,
  type PostSpotlightSummary,
} from "@/lib/now-spotlight";
import {
  aggregateBy,
  aggregateTotals,
  formatGbp,
  getPostStats,
  platformLabel,
  type SocialPostStats,
} from "@/lib/social-performance";
import {
  getOutcomePrefs,
  getTemplateOutcomes,
  getTopicOutcomes,
  type OutcomePrefs,
  type TemplateOutcome,
  type TopicSignal,
} from "@/lib/social-outcomes";
import SpotlightFromPostButton from "./SpotlightFromPostButton";

/** Display labels for slide roles in the design leaderboard. */
const ROLE_LABEL: Record<string, string> = {
  hero: "Hero",
  fact: "Fact",
  stat: "Stat",
  testimony: "Testimony",
  response: "Our response",
  tiers: "Donation tiers",
  beforeafter: "Before / after",
  multistat: "Multi-stat",
  cta: "Call to action",
};

export const metadata: Metadata = {
  title: "Performance | Deen Relief Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * /admin/social/performance — per-post performance dashboard.
 *
 * Reads social_post_stats (the view from migration 025) which pre-joins
 * clicks (via short_link_id) and donations (via utm_content match) into
 * one row per post. The dashboard renders:
 *
 *   • KPI strip — total posts, clicks, donations, £ raised, conversion rate
 *   • Per-platform breakdown
 *   • Per-campaign breakdown
 *   • Posts table — sortable, with per-row metrics
 *
 * Platform-native metrics (likes/views) are a future overlay once Meta
 * Graph + TikTok APIs land — the underlying column (metrics_json) is
 * already in place.
 *
 * Accessible to both 'admin' and 'social' roles. The data exposed is
 * aggregate-only (counts, sums) — never individual donor info.
 */
export default async function PerformancePage() {
  await requireAdminSession();

  const posts = await getPostStats({ limit: 200 });
  // One bulk read of spotlight history for all visible posts — feeds the
  // "Spotlight" column. Keyed by social_post_id, posts that never
  // triggered a spotlight are simply absent (the table cell falls back
  // to emptyPostSpotlightSummary() when looking up).
  const spotlightSummaryByPostId = await getSpotlightSummaryByPostIds(
    posts.map((p) => p.id)
  );
  const totals = aggregateTotals(posts);
  const byPlatform = aggregateBy(posts, (p) => p.platform);
  const byCampaign = aggregateBy(posts, (p) => p.campaignSlug ?? "(untagged)");

  // Outcome-learning leaderboards (migration 037). Degrade to empty before the
  // migration / before any provenance exists — the sections just don't render.
  const [templateOutcomes, topicOutcomes, outcomePrefs] = await Promise.all([
    getTemplateOutcomes().catch(() => [] as TemplateOutcome[]),
    getTopicOutcomes().catch(() => [] as TopicSignal[]),
    getOutcomePrefs(),
  ]);

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      {/* ─── Header ─── */}
      <div className="mb-6 md:mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link
            href="/admin/social"
            className="inline-block text-[12px] font-semibold uppercase tracking-[0.1em] text-amber-dark mb-2 hover:text-amber-darker"
          >
            ← Social tools
          </Link>
          <h1 className="text-3xl md:text-4xl font-heading font-bold text-charcoal tracking-[-0.01em]">
            Per-post performance
          </h1>
          <p className="text-charcoal/70 text-[15px] leading-relaxed mt-2 max-w-2xl">
            See which posts actually raised money, not just likes. Log a post
            with the short link you used, and its clicks and donations show up
            here.
          </p>
        </div>
        <Link
          href="/admin/social/posts/new"
          className="shrink-0 px-5 py-2.5 rounded-full bg-charcoal text-white text-sm font-semibold hover:bg-charcoal/85 transition-colors"
        >
          + Log a post
        </Link>
      </div>

      {/* ─── KPI strip ─── */}
      <section className="mb-8 grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
        <Kpi label="Posts" value={String(totals.postCount)} />
        <Kpi label="Clicks" value={totals.totalClicks.toLocaleString()} />
        <Kpi label="Donations" value={totals.totalDonations.toLocaleString()} />
        <Kpi label="£ raised" value={formatGbp(totals.totalRaisedPence)} />
        <Kpi
          label="Conversion"
          value={
            totals.conversionRate > 0
              ? `${(totals.conversionRate * 100).toFixed(1)}%`
              : "—"
          }
        />
      </section>

      {posts.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* ─── Per-platform rollup ─── */}
          {byPlatform.size > 1 && (
            <RollupSection
              title="By platform"
              rows={[...byPlatform.entries()].map(([k, t]) => ({
                key: k,
                label: platformLabel(k),
                totals: t,
              }))}
            />
          )}

          {/* ─── Per-campaign rollup ─── */}
          {byCampaign.size > 1 && (
            <RollupSection
              title="By campaign"
              rows={[...byCampaign.entries()].map(([k, t]) => ({
                key: k,
                label: isValidCampaign(k) ? CAMPAIGNS[k as CampaignSlug] : k,
                totals: t,
              }))}
            />
          )}

          {/* ─── Design leaderboard (what designs convert) ─── */}
          {templateOutcomes.length > 0 && (
            <DesignLeaderboard
              outcomes={templateOutcomes}
              prefs={outcomePrefs}
            />
          )}

          {/* ─── Topic leaderboard (what reports/campaigns convert) ─── */}
          {topicOutcomes.length > 0 && (
            <TopicLeaderboard topics={topicOutcomes} />
          )}

          {/* ─── Posts table ─── */}
          <section>
            <h2 className="text-charcoal font-heading font-semibold text-base mb-3">
              Posts
            </h2>
            <PostsTable
              posts={posts}
              spotlightSummaryByPostId={spotlightSummaryByPostId}
            />
          </section>
        </>
      )}
    </main>
  );
}

/* ─── Components ─── */

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-charcoal/10 rounded-2xl p-4 md:p-5">
      <span className="block text-[10px] font-bold tracking-[0.18em] uppercase text-charcoal/50 mb-1">
        {label}
      </span>
      <span className="block text-charcoal font-heading font-bold text-xl md:text-2xl tracking-tight">
        {value}
      </span>
    </div>
  );
}

function RollupSection({
  title,
  rows,
}: {
  title: string;
  rows: {
    key: string;
    label: string;
    totals: ReturnType<typeof aggregateTotals>;
  }[];
}) {
  const sorted = [...rows].sort(
    (a, b) => b.totals.totalRaisedPence - a.totals.totalRaisedPence
  );
  return (
    <section className="mb-8">
      <h2 className="text-charcoal font-heading font-semibold text-base mb-3">
        {title}
      </h2>
      <div className="bg-white border border-charcoal/10 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] font-bold uppercase tracking-[0.08em] text-charcoal/50 bg-charcoal/[0.02]">
              <th className="text-left px-5 py-3">{title.replace("By ", "")}</th>
              <th className="text-right px-5 py-3">Posts</th>
              <th className="text-right px-5 py-3">Clicks</th>
              <th className="text-right px-5 py-3">Donations</th>
              <th className="text-right px-5 py-3">£ raised</th>
              <th className="text-right px-5 py-3 whitespace-nowrap">Conv %</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr key={row.key} className="border-t border-charcoal/5">
                <td className="px-5 py-3 text-charcoal font-semibold">
                  {row.label}
                </td>
                <td className="px-5 py-3 text-right text-charcoal/70 font-mono">
                  {row.totals.postCount}
                </td>
                <td className="px-5 py-3 text-right text-charcoal/70 font-mono">
                  {row.totals.totalClicks.toLocaleString()}
                </td>
                <td className="px-5 py-3 text-right text-charcoal/70 font-mono">
                  {row.totals.totalDonations.toLocaleString()}
                </td>
                <td className="px-5 py-3 text-right text-charcoal font-mono font-semibold">
                  {formatGbp(row.totals.totalRaisedPence)}
                </td>
                <td className="px-5 py-3 text-right text-charcoal/70 font-mono">
                  {row.totals.conversionRate > 0
                    ? `${(row.totals.conversionRate * 100).toFixed(1)}%`
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PostsTable({
  posts,
  spotlightSummaryByPostId,
}: {
  posts: SocialPostStats[];
  spotlightSummaryByPostId: Map<string, PostSpotlightSummary>;
}) {
  // Sort by donations DESC first, then by published date — so high-£
  // posts always sit at the top regardless of recency. Donor-impact
  // ranking is the dashboard's whole point.
  const sorted = [...posts].sort((a, b) => {
    if (b.donationTotalPence !== a.donationTotalPence) {
      return b.donationTotalPence - a.donationTotalPence;
    }
    return b.publishedAt.getTime() - a.publishedAt.getTime();
  });

  return (
    <div className="bg-white border border-charcoal/10 rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] font-bold uppercase tracking-[0.08em] text-charcoal/50 bg-charcoal/[0.02]">
              <th className="text-left px-5 py-3">Post</th>
              <th className="text-left px-5 py-3 whitespace-nowrap">
                Platform
              </th>
              <th className="text-left px-5 py-3">Campaign</th>
              <th className="text-left px-5 py-3 whitespace-nowrap">
                Short link
              </th>
              <th className="text-right px-5 py-3">Clicks</th>
              <th className="text-right px-5 py-3 whitespace-nowrap">
                Donations
              </th>
              <th className="text-right px-5 py-3">£ raised</th>
              <th className="text-right px-5 py-3 whitespace-nowrap">
                Conv %
              </th>
              <th className="text-left px-5 py-3 whitespace-nowrap">
                /now spotlight
              </th>
              <th className="text-left px-5 py-3 whitespace-nowrap">
                Published
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => {
              const conv =
                p.clickCount > 0 ? p.donationCount / p.clickCount : 0;
              return (
                <tr
                  key={p.id}
                  className="border-t border-charcoal/5 hover:bg-cream/40 transition-colors"
                >
                  <td className="px-5 py-3 text-charcoal max-w-md">
                    <span className="block font-semibold leading-snug">
                      {p.externalUrl ? (
                        <a
                          href={p.externalUrl}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="hover:underline"
                        >
                          {p.title ?? "(untitled)"}
                        </a>
                      ) : (
                        (p.title ?? "(untitled)")
                      )}
                    </span>
                    {p.caption && (
                      <span className="block text-[12px] text-charcoal/50 mt-0.5 leading-snug line-clamp-2">
                        {p.caption.length > 90
                          ? p.caption.slice(0, 90) + "…"
                          : p.caption}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-charcoal/70 whitespace-nowrap">
                    {platformLabel(p.platform)}
                  </td>
                  <td className="px-5 py-3 text-charcoal/70">
                    {p.campaignSlug && isValidCampaign(p.campaignSlug)
                      ? CAMPAIGNS[p.campaignSlug as CampaignSlug]
                      : (p.campaignSlug ?? "—")}
                  </td>
                  <td className="px-5 py-3 font-mono text-[12px] text-charcoal/65 whitespace-nowrap">
                    {p.shortLinkSlug ? `/r/${p.shortLinkSlug}` : "—"}
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-charcoal/70">
                    {p.clickCount.toLocaleString()}
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-charcoal/70">
                    {p.donationCount.toLocaleString()}
                  </td>
                  <td className="px-5 py-3 text-right font-mono font-semibold text-charcoal">
                    {p.donationTotalPence > 0
                      ? formatGbp(p.donationTotalPence)
                      : "—"}
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-charcoal/70">
                    {conv > 0 ? `${(conv * 100).toFixed(1)}%` : "—"}
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap">
                    <SpotlightFromPostButton
                      postId={p.id}
                      postCampaignSlug={p.campaignSlug}
                      summary={
                        spotlightSummaryByPostId.get(p.id) ??
                        emptyPostSpotlightSummary()
                      }
                    />
                  </td>
                  <td className="px-5 py-3 text-[12px] text-charcoal/60 whitespace-nowrap">
                    {p.publishedAt.toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DesignLeaderboard({
  outcomes,
  prefs,
}: {
  outcomes: TemplateOutcome[];
  prefs: OutcomePrefs;
}) {
  // Flat, ranked by £/post — the metric the learning loop optimises. The
  // winner pill (and its basis) tells the story per slide type.
  const sorted = [...outcomes].sort(
    (a, b) => b.pencePerPost - a.pencePerPost || b.donations - a.donations
  );
  return (
    <section className="mb-8">
      <h2 className="text-charcoal font-heading font-semibold text-base mb-1">
        What designs convert
      </h2>
      <p className="text-charcoal/55 text-[13px] mb-3 max-w-2xl leading-snug">
        Which slide designs raise the most on each platform. Once one proves
        itself, we start suggesting it by default.
      </p>
      <div className="bg-white border border-charcoal/10 rounded-2xl overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] font-bold uppercase tracking-[0.08em] text-charcoal/50 bg-charcoal/[0.02]">
              <th className="text-left px-5 py-3 whitespace-nowrap">Platform</th>
              <th className="text-left px-5 py-3">Slide type</th>
              <th className="text-left px-5 py-3">Template</th>
              <th className="text-right px-5 py-3">Posts</th>
              <th className="text-right px-5 py-3">Clicks</th>
              <th className="text-right px-5 py-3">Donations</th>
              <th className="text-right px-5 py-3">£ raised</th>
              <th className="text-right px-5 py-3 whitespace-nowrap">£/post</th>
              <th className="text-right px-5 py-3 whitespace-nowrap">Conv %</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((o) => {
              const key = `${o.platform}:${o.role}`;
              const isWinner = prefs.winningTemplateByKey[key] === o.templateId;
              const basis = prefs.basisByKey[key] ?? null;
              return (
                <tr
                  key={`${o.platform}:${o.role}:${o.templateId}`}
                  className="border-t border-charcoal/5"
                >
                  <td className="px-5 py-3 text-charcoal/70 whitespace-nowrap">
                    {platformLabel(o.platform)}
                  </td>
                  <td className="px-5 py-3 text-charcoal/70 whitespace-nowrap">
                    {ROLE_LABEL[o.role] ?? o.role}
                  </td>
                  <td className="px-5 py-3 text-charcoal font-mono text-[12px]">
                    <span className="font-semibold">{o.templateId}</span>
                    {isWinner && (
                      <span className="ml-2 inline-block align-middle px-1.5 py-0.5 rounded-md bg-green/10 text-green-dark text-[10px] font-sans font-bold uppercase tracking-wide">
                        {basis === "donations" ? "Winner" : "Leading"}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right text-charcoal/70 font-mono">
                    {o.posts}
                  </td>
                  <td className="px-5 py-3 text-right text-charcoal/70 font-mono">
                    {o.clicks.toLocaleString()}
                  </td>
                  <td className="px-5 py-3 text-right text-charcoal/70 font-mono">
                    {o.donations.toLocaleString()}
                  </td>
                  <td className="px-5 py-3 text-right text-charcoal font-mono font-semibold">
                    {o.donationTotalPence > 0
                      ? formatGbp(o.donationTotalPence)
                      : "—"}
                  </td>
                  <td className="px-5 py-3 text-right text-charcoal/70 font-mono">
                    {o.pencePerPost > 0 ? formatGbp(Math.round(o.pencePerPost)) : "—"}
                  </td>
                  <td className="px-5 py-3 text-right text-charcoal/70 font-mono">
                    {o.donationRate > 0
                      ? `${(o.donationRate * 100).toFixed(1)}%`
                      : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TopicLeaderboard({ topics }: { topics: TopicSignal[] }) {
  return (
    <section className="mb-8">
      <h2 className="text-charcoal font-heading font-semibold text-base mb-1">
        What topics convert
      </h2>
      <p className="text-charcoal/55 text-[13px] mb-3 max-w-2xl leading-snug">
        Which kinds of stories raise the most — we use this to suggest what to
        post about next.
      </p>
      <div className="bg-white border border-charcoal/10 rounded-2xl overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] font-bold uppercase tracking-[0.08em] text-charcoal/50 bg-charcoal/[0.02]">
              <th className="text-left px-5 py-3">Topic / campaign</th>
              <th className="text-right px-5 py-3">Posts</th>
              <th className="text-right px-5 py-3">Clicks</th>
              <th className="text-right px-5 py-3">Donations</th>
              <th className="text-right px-5 py-3">£ raised</th>
              <th className="text-right px-5 py-3 whitespace-nowrap">Conv %</th>
            </tr>
          </thead>
          <tbody>
            {topics.map((t) => (
              <tr key={t.key} className="border-t border-charcoal/5">
                <td className="px-5 py-3 text-charcoal font-semibold">
                  {t.label}
                </td>
                <td className="px-5 py-3 text-right text-charcoal/70 font-mono">
                  {t.posts}
                </td>
                <td className="px-5 py-3 text-right text-charcoal/70 font-mono">
                  {t.clicks.toLocaleString()}
                </td>
                <td className="px-5 py-3 text-right text-charcoal/70 font-mono">
                  {t.donations.toLocaleString()}
                </td>
                <td className="px-5 py-3 text-right text-charcoal font-mono font-semibold">
                  {t.donationTotalPence > 0 ? formatGbp(t.donationTotalPence) : "—"}
                </td>
                <td className="px-5 py-3 text-right text-charcoal/70 font-mono">
                  {t.donationRate > 0
                    ? `${(t.donationRate * 100).toFixed(1)}%`
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function EmptyState() {
  return (
    <div className="bg-white border border-charcoal/10 rounded-2xl px-6 py-12 text-center">
      <p className="text-charcoal font-semibold text-[15px] mb-1">
        No posts logged yet
      </p>
      <p className="text-charcoal/60 text-[13px] max-w-md mx-auto leading-relaxed">
        Log a post above. Until you do, the dashboard has nothing to
        attribute. Pro tip: log posts as you publish them — picking the
        short link you used is what makes attribution work.
      </p>
    </div>
  );
}
