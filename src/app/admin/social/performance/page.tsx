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
import SpotlightFromPostButton from "./SpotlightFromPostButton";

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
            Which posts actually raised money — not just likes. Click counts
            from short-link redirects, donations attributed via UTMs,
            conversion rate per post. Log a post first; once a donor
            converts through its short link, it appears here.
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
