import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminSession } from "@/lib/admin-session";
import {
  fetchAllMediaTags,
  fetchMediaList,
  formatFileSize,
  mediaKindFromMimeType,
  type DrMediaRow,
  type MediaKind,
} from "@/lib/dr-media";
import { formatAdminDate } from "@/lib/admin-donations";
import MediaUploaderClient from "./MediaUploaderClient";
import MediaDeleteButton from "./MediaDeleteButton";

export const metadata: Metadata = {
  title: "Media | Deen Relief Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * The media library landing page.
 *
 * Three things live here:
 *   1. Drag-and-drop uploader (client component) at the top
 *   2. Filter chips by kind + tag
 *   3. Grid of media tiles — click through to detail page
 *
 * The grid uses CSS columns rather than CSS grid because mixed
 * aspect ratios (portrait photos, landscape videos, square PDFs)
 * pack better in a masonry-style layout than in fixed-row cells.
 * Phase 1 keeps it simple: 2-3-4 columns at sm/lg/xl.
 */
export default async function AdminMediaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminSession();
  const sp = await searchParams;

  const kind = parseKindFilter(sp.kind);
  const tag = typeof sp.tag === "string" ? sp.tag : undefined;
  const search = typeof sp.q === "string" ? sp.q : undefined;
  const justDeleted = sp.deleted === "1";

  const [media, tags] = await Promise.all([
    fetchMediaList({ kind: kind ?? undefined, tag, search, limit: 500 }),
    fetchAllMediaTags(),
  ]);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {justDeleted && (
        <p className="mb-6 px-4 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          File deleted. Audit log keeps a permanent record of what was removed.
        </p>
      )}

      <div className="mb-8">
        <span className="block text-[11px] font-bold tracking-[0.15em] uppercase text-amber-dark mb-1">
          Assets
        </span>
        <h1 className="text-charcoal font-heading font-bold text-2xl sm:text-3xl">
          Media library
        </h1>
        <p className="text-grey text-sm mt-2 max-w-2xl">
          Photos, videos, and documents uploaded by the team. Public
          URLs — paste them anywhere. Drop new files below.
        </p>
      </div>

      <div className="mb-8">
        <MediaUploaderClient />
      </div>

      {/* Filter chips. URL-driven so back/forward navigation works
          and the filter state is sharable. */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <KindChip current={kind} target={null} label="All" />
        <KindChip current={kind} target="image" label="Images" />
        <KindChip current={kind} target="video" label="Videos" />
        <KindChip current={kind} target="document" label="Documents" />
        {tags.length > 0 && (
          <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal/40 ml-3">
            Tags:
          </span>
        )}
        {tags.slice(0, 12).map((t) => (
          <TagChip key={t} current={tag} target={t} />
        ))}
        {tag && (
          <Link
            href={buildFilterHref(kind, undefined)}
            className="text-[12px] text-charcoal/50 hover:text-charcoal underline"
          >
            Clear tag
          </Link>
        )}
      </div>

      {media.length === 0 ? (
        <div className="bg-white border border-charcoal/10 rounded-2xl p-12 text-center text-charcoal/60 text-sm">
          {search || tag || kind
            ? "No files match those filters."
            : "No files yet. Drop the first one above."}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {media.map((m) => (
            <MediaTile key={m.id} media={m} />
          ))}
        </div>
      )}

      <p className="mt-6 text-[11px] text-charcoal/40">
        {media.length} {media.length === 1 ? "file" : "files"} shown.
      </p>
    </main>
  );
}

function parseKindFilter(
  raw: string | string[] | undefined
): MediaKind | null {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (v === "image" || v === "video" || v === "document") return v;
  return null;
}

function buildFilterHref(
  kind: MediaKind | null,
  tag: string | undefined
): string {
  const params = new URLSearchParams();
  if (kind) params.set("kind", kind);
  if (tag) params.set("tag", tag);
  const query = params.toString();
  return query ? `/admin/media?${query}` : "/admin/media";
}

function KindChip({
  current,
  target,
  label,
}: {
  current: MediaKind | null;
  target: MediaKind | null;
  label: string;
}) {
  const isActive = current === target;
  const href = buildFilterHref(target, undefined);
  return (
    <Link
      href={href}
      className={`px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-colors ${
        isActive
          ? "bg-charcoal text-white border-charcoal"
          : "bg-white border-charcoal/15 text-charcoal/70 hover:border-charcoal/40 hover:text-charcoal"
      }`}
    >
      {label}
    </Link>
  );
}

function TagChip({
  current,
  target,
}: {
  current: string | undefined;
  target: string;
}) {
  const isActive = current === target;
  return (
    <Link
      href={buildFilterHref(null, target)}
      className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
        isActive
          ? "bg-amber text-charcoal border-amber"
          : "bg-amber/10 border-amber/30 text-amber-dark hover:bg-amber/20"
      }`}
    >
      {target}
    </Link>
  );
}

function MediaTile({ media }: { media: DrMediaRow }) {
  const kind = mediaKindFromMimeType(media.mimeType);
  return (
    // Wrapper div is the `group` for both hover state + as the
    // positioning context for the absolutely-placed delete button.
    // Link + delete button are SIBLINGS (not nested) so the button
    // remains a valid <button> element a11y-wise.
    <div className="relative group">
      <Link
        href={`/admin/media/${media.id}`}
        className="block bg-white border border-charcoal/10 rounded-2xl overflow-hidden hover:border-charcoal/25 hover:shadow-md transition-all"
      >
        <div className="relative aspect-square bg-cream flex items-center justify-center overflow-hidden">
          {kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={media.publicUrl}
              alt={media.filename}
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : kind === "video" ? (
            <VideoPlaceholder />
          ) : kind === "document" ? (
            <DocumentPlaceholder />
          ) : (
            <FilePlaceholder />
          )}
          <span className="absolute top-2 right-2 inline-block px-2 py-0.5 rounded-full bg-white/90 backdrop-blur-sm text-[10px] font-semibold uppercase tracking-wider text-charcoal/70 border border-charcoal/10">
            {kind}
          </span>
        </div>
        <div className="p-3">
          <p className="text-charcoal text-[13px] font-medium truncate group-hover:text-green-dark transition-colors">
            {media.filename}
          </p>
          <p className="text-[11px] text-charcoal/50 mt-0.5 flex items-center justify-between gap-2">
            <span>{formatFileSize(media.sizeBytes)}</span>
            <span>{formatAdminDate(media.createdAt)}</span>
          </p>
        </div>
      </Link>
      <MediaDeleteButton mediaId={media.id} filename={media.filename} />
    </div>
  );
}

function VideoPlaceholder() {
  return (
    <div className="flex flex-col items-center text-charcoal/40">
      <svg
        className="w-12 h-12"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z"
        />
      </svg>
      <span className="text-[10px] uppercase tracking-wider mt-1">Video</span>
    </div>
  );
}

function DocumentPlaceholder() {
  return (
    <div className="flex flex-col items-center text-charcoal/40">
      <svg
        className="w-12 h-12"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
        />
      </svg>
      <span className="text-[10px] uppercase tracking-wider mt-1">Doc</span>
    </div>
  );
}

function FilePlaceholder() {
  return (
    <div className="flex flex-col items-center text-charcoal/40">
      <svg
        className="w-12 h-12"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m6 13.5V17.25m0 0V9.75a3.75 3.75 0 1 1 7.5 0v6a4.5 4.5 0 0 1-9 0V5.625a1.125 1.125 0 0 1 1.125-1.125h4.5"
        />
      </svg>
    </div>
  );
}
