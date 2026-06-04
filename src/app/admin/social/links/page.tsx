import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminSession } from "@/lib/admin-session";
import { getSupabaseAdmin } from "@/lib/supabase";
import { buildShortLinkUrl } from "@/lib/short-links";
import { CAMPAIGNS, type CampaignSlug, isValidCampaign } from "@/lib/campaigns";
import CreateLinkForm from "./CreateLinkForm";
import LinkRowActions from "./LinkRowActions";

export const metadata: Metadata = {
  title: "Short links | Deen Relief Admin",
  robots: { index: false, follow: false },
};

interface LinkRow {
  id: string;
  slug: string;
  destination_url: string;
  campaign_slug: string | null;
  platform: string | null;
  notes: string | null;
  created_by_email: string | null;
  created_at: string;
  archived_at: string | null;
}

interface ClickCounts {
  short_link_id: string;
  all_time: number;
  last_7d: number;
}

/**
 * /admin/social/links — list + create short links.
 *
 * Accessible to BOTH 'admin' and 'social' roles via
 * requireAdminSession. The list shows active links by default, with
 * a toggle to surface archived ones for restore. Click counts are
 * computed by two parallel COUNT queries (all-time + last 7 days).
 *
 * Search params:
 *   ?archived=1 → show archived links instead of active
 */
export default async function ShortLinksPage({
  searchParams,
}: {
  searchParams: Promise<{ archived?: string }>;
}) {
  await requireAdminSession();
  const params = await searchParams;
  const showArchived = params.archived === "1";

  const supabase = getSupabaseAdmin();

  // Fetch the list (active OR archived per the toggle).
  const query = supabase
    .from("short_links")
    .select(
      "id, slug, destination_url, campaign_slug, platform, notes, created_by_email, created_at, archived_at"
    )
    .order("created_at", { ascending: false })
    .limit(200);

  const { data: links, error: linksErr } = showArchived
    ? await query.not("archived_at", "is", null)
    : await query.is("archived_at", null);

  if (linksErr) {
    console.error("[short-links/page] list query failed:", linksErr);
  }

  // Fetch click counts in two batches. Using a single query with a
  // groupBy would be nicer but Supabase's JS client doesn't expose
  // GROUP BY directly — easier to fetch all clicks for our link ids
  // and aggregate in memory. For Deen Relief's scale (hundreds of
  // clicks per day) this is fast and avoids a custom SQL function.
  const linkIds = (links ?? []).map((l) => l.id);
  const clickCounts: Map<string, ClickCounts> = new Map();

  if (linkIds.length > 0) {
    const sevenDaysAgo = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000
    ).toISOString();

    const [allTimeRes, last7dRes] = await Promise.all([
      supabase
        .from("short_link_clicks")
        .select("short_link_id", { count: "exact", head: false })
        .in("short_link_id", linkIds),
      supabase
        .from("short_link_clicks")
        .select("short_link_id")
        .in("short_link_id", linkIds)
        .gte("clicked_at", sevenDaysAgo),
    ]);

    // Aggregate by short_link_id in memory.
    for (const id of linkIds) {
      clickCounts.set(id, { short_link_id: id, all_time: 0, last_7d: 0 });
    }
    for (const row of allTimeRes.data ?? []) {
      const c = clickCounts.get(row.short_link_id);
      if (c) c.all_time += 1;
    }
    for (const row of last7dRes.data ?? []) {
      const c = clickCounts.get(row.short_link_id);
      if (c) c.last_7d += 1;
    }
  }

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <div className="mb-6 md:mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link
            href="/admin/social"
            className="inline-block text-[12px] font-semibold uppercase tracking-[0.1em] text-amber-dark mb-2 hover:text-amber-darker"
          >
            ← Social tools
          </Link>
          <h1 className="text-3xl md:text-4xl font-heading font-bold text-charcoal tracking-[-0.01em]">
            Short links
          </h1>
          <p className="text-charcoal/70 text-[15px] leading-relaxed mt-2 max-w-2xl">
            Short, branded links (like deenrelief.org/r/abc) that send people to
            the right page — and let you see clicks and donations from each one.
          </p>
        </div>
        <Link
          href={
            showArchived
              ? "/admin/social/links"
              : "/admin/social/links?archived=1"
          }
          className="px-4 py-2 rounded-full text-sm font-medium text-charcoal/70 hover:text-charcoal hover:bg-charcoal/5 transition-colors border border-charcoal/10"
        >
          {showArchived ? "Show active" : "Show archived"}
        </Link>
      </div>

      {!showArchived && <CreateLinkForm />}

      {/* ─── List ─── */}
      <div className="bg-white border border-charcoal/10 rounded-2xl overflow-hidden">
        <div className="px-5 md:px-6 py-4 border-b border-charcoal/10 flex items-center justify-between">
          <h2 className="text-charcoal font-heading font-semibold text-base">
            {showArchived ? "Archived links" : "Active links"}
          </h2>
          <span className="text-[12px] text-charcoal/50 font-medium">
            {(links ?? []).length} total
          </span>
        </div>

        {(links ?? []).length === 0 ? (
          <div className="px-6 py-12 text-center text-charcoal/50 text-sm">
            {showArchived
              ? "No archived links."
              : "No short links yet. Create the first one above."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] font-bold uppercase tracking-[0.08em] text-charcoal/50 bg-charcoal/[0.02]">
                  <th className="text-left px-5 py-3 font-bold">Slug</th>
                  <th className="text-left px-5 py-3 font-bold">Destination</th>
                  <th className="text-left px-5 py-3 font-bold">Campaign</th>
                  <th className="text-left px-5 py-3 font-bold">Platform</th>
                  <th className="text-right px-5 py-3 font-bold whitespace-nowrap">
                    7d / All
                  </th>
                  <th className="text-left px-5 py-3 font-bold">Created</th>
                  <th className="text-right px-5 py-3 font-bold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(links ?? []).map((link: LinkRow) => {
                  const counts = clickCounts.get(link.id);
                  const shortUrl = buildShortLinkUrl(link.slug);
                  const campaignLabel =
                    link.campaign_slug && isValidCampaign(link.campaign_slug)
                      ? CAMPAIGNS[link.campaign_slug as CampaignSlug]
                      : link.campaign_slug ?? "—";
                  return (
                    <tr
                      key={link.id}
                      className="border-t border-charcoal/5 hover:bg-cream/40 transition-colors"
                    >
                      <td className="px-5 py-3 font-mono text-[13px] text-charcoal whitespace-nowrap">
                        <span className="text-charcoal/40">/r/</span>
                        <span className="font-semibold">{link.slug}</span>
                        {link.notes && (
                          <span
                            className="block text-[11px] text-charcoal/50 font-sans mt-0.5"
                            title={link.notes}
                          >
                            {link.notes.length > 50
                              ? link.notes.slice(0, 50) + "…"
                              : link.notes}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 font-mono text-[12px] text-charcoal/70 max-w-[260px] truncate">
                        {link.destination_url}
                      </td>
                      <td className="px-5 py-3 text-charcoal/70">
                        {campaignLabel}
                      </td>
                      <td className="px-5 py-3 text-charcoal/70">
                        {link.platform ?? "—"}
                      </td>
                      <td className="px-5 py-3 text-right whitespace-nowrap font-mono">
                        <span className="text-charcoal font-semibold">
                          {counts?.last_7d ?? 0}
                        </span>
                        <span className="text-charcoal/30 mx-1">/</span>
                        <span className="text-charcoal/70">
                          {counts?.all_time ?? 0}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-[12px] text-charcoal/60 whitespace-nowrap">
                        {formatRelative(link.created_at)}
                      </td>
                      <td className="px-5 py-3">
                        <LinkRowActions
                          id={link.id}
                          shortUrl={shortUrl}
                          archived={!!link.archived_at}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}

/**
 * Lightweight relative-time formatter — "2 hours ago", "3 days ago".
 * Falls back to a short locale date for anything older than 30 days.
 */
function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffMs = now - then;
  const mins = Math.round(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
