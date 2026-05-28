import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminSession } from "@/lib/admin-session";
import { CAMPAIGNS, isValidCampaign, type CampaignSlug } from "@/lib/campaigns";
import { listMedia } from "@/lib/media-library";

export const metadata: Metadata = {
  title: "Media library | Deen Relief Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * /admin/social/media-library — the sorted DR image inventory.
 *
 * Grid view of every non-archived media row, surfaced for quick visual
 * recognition. Tag chips below each thumbnail let the SMM see at a
 * glance what's tagged where without opening edit forms.
 *
 * Filtering is intentionally minimal in v1 — campaign chip filter
 * + free-text search. Per-event auto-selection by Claude (Phase 4e
 * integration with packet generator) is the primary read path; this
 * page is mostly for human inventory + edits.
 */
export default async function MediaLibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ campaign?: string; q?: string }>;
}) {
  await requireAdminSession();
  const params = await searchParams;
  const campaign =
    params.campaign && isValidCampaign(params.campaign)
      ? (params.campaign as CampaignSlug)
      : undefined;

  const items = await listMedia({
    campaignSlug: campaign,
    query: params.q?.trim() || undefined,
    limit: 200,
  });

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <div className="mb-6 md:mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link
            href="/admin/social"
            className="inline-block text-[12px] font-semibold uppercase tracking-[0.1em] text-amber-dark mb-2 hover:text-amber-darker"
          >
            ← Social tools
          </Link>
          <h1 className="text-3xl md:text-4xl font-heading font-bold text-charcoal tracking-[-0.01em]">
            Media library
          </h1>
          <p className="text-charcoal/70 text-[15px] leading-relaxed mt-2 max-w-2xl">
            DR&apos;s sorted photo inventory. Upload once, tag once — the launch-
            packet generator queries this library and Claude auto-selects
            imagery for emergency carousel slides based on country, event
            type, and campaign match.
          </p>
        </div>
        <Link
          href="/admin/social/media-library/new"
          className="shrink-0 px-5 py-2.5 rounded-full bg-charcoal text-white text-sm font-semibold hover:bg-charcoal/85 transition-colors"
        >
          + Upload media
        </Link>
      </div>

      {/* ─── Filter strip ─── */}
      <form
        action="/admin/social/media-library"
        method="get"
        className="mb-6 flex items-center gap-2 flex-wrap"
      >
        <Link
          href="/admin/social/media-library"
          className={`px-3 py-1.5 rounded-full text-[12px] font-semibold transition-colors ${
            !campaign
              ? "bg-charcoal text-white"
              : "bg-white border border-charcoal/15 text-charcoal/80 hover:bg-cream"
          }`}
        >
          All campaigns
        </Link>
        {(Object.keys(CAMPAIGNS) as CampaignSlug[]).map((slug) => (
          <Link
            key={slug}
            href={`/admin/social/media-library?campaign=${slug}`}
            className={`px-3 py-1.5 rounded-full text-[12px] font-semibold transition-colors ${
              campaign === slug
                ? "bg-charcoal text-white"
                : "bg-white border border-charcoal/15 text-charcoal/80 hover:bg-cream"
            }`}
          >
            {CAMPAIGNS[slug]}
          </Link>
        ))}
        <input
          type="text"
          name="q"
          defaultValue={params.q ?? ""}
          placeholder="Search captions…"
          className="ml-auto px-3 py-1.5 rounded-full bg-white border border-charcoal/15 text-charcoal text-[13px] focus:outline-none focus:ring-2 focus:ring-charcoal/10 min-w-[200px]"
        />
        {campaign && <input type="hidden" name="campaign" value={campaign} />}
      </form>

      {/* ─── Grid ─── */}
      {items.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {items.map((item) => (
            <MediaCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </main>
  );
}

function MediaCard({
  item,
}: {
  item: Awaited<ReturnType<typeof listMedia>>[number];
}) {
  return (
    <Link
      href={`/admin/social/media-library/${item.id}`}
      className="group flex flex-col bg-white border border-charcoal/10 rounded-2xl overflow-hidden hover:border-charcoal/25 transition-colors"
    >
      <div
        className="aspect-square bg-cream"
        style={{
          backgroundColor: item.dominantColor ?? "#F7F3E8",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.publicUrl}
          alt={item.caption ?? "Media item"}
          className="w-full h-full object-cover"
          loading="lazy"
        />
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
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="bg-white border border-charcoal/10 rounded-2xl px-6 py-12 text-center">
      <p className="text-charcoal font-semibold text-[15px] mb-1">
        No media uploaded yet
      </p>
      <p className="text-charcoal/60 text-[13px] max-w-md mx-auto leading-relaxed mb-4">
        Upload photos from DR field operations, event coverage, and
        programme imagery. Claude will auto-suggest tags on each upload —
        you review, edit, and save. The launch-packet generator then pulls
        from this library when drafting emergency carousels.
      </p>
      <Link
        href="/admin/social/media-library/new"
        className="inline-block px-5 py-2.5 rounded-full bg-charcoal text-white text-sm font-semibold hover:bg-charcoal/85 transition-colors"
      >
        + Upload your first photo
      </Link>
    </div>
  );
}
