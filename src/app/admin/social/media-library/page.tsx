import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminSession } from "@/lib/admin-session";
import { CAMPAIGNS, isValidCampaign, type CampaignSlug } from "@/lib/campaigns";
import { listMedia } from "@/lib/media-library";
import ScanStorageButton from "./ScanStorageButton";
import MediaLibraryGrid, { type MediaCardData } from "./MediaLibraryGrid";

export const metadata: Metadata = {
  title: "Media library | Deen Relief Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";
// The scan-Storage server action invoked from this page can take up
// to ~100s for a full batch (20 photos × ~5s Vision call each). Pro
// plan allows up to 300s — 180s is a sensible cap with safety margin.
export const maxDuration = 180;

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
        <div className="shrink-0 flex flex-col sm:flex-row gap-2">
          <Link
            href="/admin/social/media-library/re-tag"
            className="px-5 py-2.5 rounded-full bg-cream-soft border border-charcoal/15 text-charcoal text-sm font-semibold hover:bg-cream transition-colors"
          >
            ↻ Re-tag with AI
          </Link>
          <Link
            href="/admin/social/media-library/new"
            className="px-5 py-2.5 rounded-full bg-charcoal text-white text-sm font-semibold hover:bg-charcoal/85 transition-colors"
          >
            + Upload media
          </Link>
        </div>
      </div>

      {/* ─── Bulk-import scanner ─── */}
      <ScanStorageButton />

      {/* ─── Filter strip ─── */}
      <form
        action="/admin/social/media-library"
        method="get"
        className="mb-6 flex flex-col sm:flex-row items-start gap-3"
      >
        <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
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
        </div>
        <input
          type="text"
          name="q"
          defaultValue={params.q ?? ""}
          placeholder="Search captions…"
          className="w-full sm:w-[220px] shrink-0 px-3 py-1.5 rounded-full bg-white border border-charcoal/15 text-charcoal text-[13px] focus:outline-none focus:ring-2 focus:ring-charcoal/10"
        />
        {campaign && <input type="hidden" name="campaign" value={campaign} />}
      </form>

      {/* ─── Grid (with preselect mode: bulk retag / quick delete) ─── */}
      {items.length === 0 ? (
        <EmptyState />
      ) : (
        <MediaLibraryGrid items={items.map(toCardData)} />
      )}
    </main>
  );
}

/** Trim a full MediaItem down to the serialisable shape the client grid
 *  needs (no Date fields cross the server→client boundary). */
function toCardData(
  item: Awaited<ReturnType<typeof listMedia>>[number]
): MediaCardData {
  return {
    id: item.id,
    publicUrl: item.publicUrl,
    caption: item.caption,
    tags: item.tags,
    campaignSlugs: item.campaignSlugs,
    countryIso: item.countryIso,
    tone: item.tone,
    dominantColor: item.dominantColor,
  };
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
