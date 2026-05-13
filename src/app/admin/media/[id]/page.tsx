import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminSession } from "@/lib/admin-session";
import {
  fetchMediaById,
  formatFileSize,
  mediaKindFromMimeType,
} from "@/lib/dr-media";
import { formatAdminDate } from "@/lib/admin-donations";
import MediaDetailClient from "./MediaDetailClient";

export const metadata: Metadata = {
  title: "Media file | Deen Relief Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Media detail page.
 *
 * Layout:
 *   - Left column: the actual media (image / <video> / doc embed)
 *   - Right column (320px wide): file info + edit metadata +
 *     copy URL + download + delete
 *
 * Video: HTML5 <video controls> with the public URL as src.
 * Works for the browser-compatible formats we accept (mp4 / webm /
 * mov). Browsers handle adaptive playback themselves.
 *
 * PDF: rendered inline via <iframe> using the browser's built-in
 * PDF viewer. Works in Chrome / Safari / Firefox without any
 * pdf.js dependency.
 *
 * Other docs (Word, Excel, text): no in-browser preview. Show a
 * file icon + filename + the "Download" button is the way to
 * inspect them.
 */
export default async function AdminMediaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminSession();
  const { id } = await params;
  const media = await fetchMediaById(id);
  if (!media) notFound();

  const kind = mediaKindFromMimeType(media.mimeType);

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link
          href="/admin/media"
          className="text-charcoal/60 hover:text-charcoal text-xs uppercase tracking-[0.1em] font-bold transition-colors"
        >
          ← All media
        </Link>
        <h1 className="text-charcoal font-heading font-semibold text-xl sm:text-2xl mt-1 break-all">
          {media.filename}
        </h1>
        <p className="text-charcoal/50 text-[12px] mt-1">
          Uploaded {formatAdminDate(media.createdAt)} by{" "}
          <span className="font-mono">{media.uploadedByEmail}</span> ·{" "}
          {formatFileSize(media.sizeBytes)} · {media.mimeType}
        </p>
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        {/* Preview pane */}
        <section className="bg-white border border-charcoal/10 rounded-2xl overflow-hidden">
          {kind === "image" && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={media.publicUrl}
              alt={media.filename}
              className="w-full h-auto block"
              loading="eager"
            />
          )}
          {kind === "video" && (
            <video
              src={media.publicUrl}
              controls
              className="w-full h-auto block bg-black"
              preload="metadata"
            >
              Your browser doesn&apos;t support inline video playback.
            </video>
          )}
          {kind === "document" && media.mimeType === "application/pdf" && (
            <iframe
              src={media.publicUrl}
              title={media.filename}
              className="w-full h-[70vh] bg-cream"
            />
          )}
          {kind === "document" && media.mimeType !== "application/pdf" && (
            <DocumentFallback filename={media.filename} />
          )}
          {kind === "other" && (
            <DocumentFallback filename={media.filename} />
          )}
        </section>

        {/* Side panel */}
        <aside>
          <MediaDetailClient
            mediaId={media.id}
            publicUrl={media.publicUrl}
            mediaKind={kind}
            initialDescription={media.description ?? ""}
            initialTags={media.tags}
          />
        </aside>
      </div>

      {media.description && (
        <section className="mt-8 max-w-3xl">
          <span className="block text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-2">
            Description
          </span>
          <p className="text-charcoal text-sm leading-[1.65] whitespace-pre-line">
            {media.description}
          </p>
        </section>
      )}

      {media.tags.length > 0 && (
        <section className="mt-6">
          <span className="block text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-2">
            Tags
          </span>
          <div className="flex flex-wrap gap-2">
            {media.tags.map((t) => (
              <Link
                key={t}
                href={`/admin/media?tag=${encodeURIComponent(t)}`}
                className="px-2.5 py-1 rounded-full text-[12px] font-medium bg-amber/10 border border-amber/30 text-amber-dark hover:bg-amber/20 transition-colors"
              >
                {t}
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function DocumentFallback({ filename }: { filename: string }) {
  return (
    <div className="p-16 text-center">
      <svg
        className="w-16 h-16 text-charcoal/30 mx-auto mb-3"
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
      <p className="text-charcoal/70 font-medium text-sm">{filename}</p>
      <p className="text-charcoal/40 text-[12px] mt-1">
        Use the Download button to open this file.
      </p>
    </div>
  );
}
