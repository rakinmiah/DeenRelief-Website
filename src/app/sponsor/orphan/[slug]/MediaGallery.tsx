"use client";

import { useEffect, useState } from "react";

/**
 * Gallery-forward media grid for a child's page. Renders a responsive grid of
 * square tiles; each fetches its short-lived signed URL from the sponsor media
 * endpoint (photos eagerly so the grid is visual; videos lazily, on open).
 * Tapping a tile opens a lightbox to view full-size / play.
 *
 * All access stays safeguarded: every signed URL is minted server-side after
 * the RLS check, and is short-lived.
 */

export interface GalleryItem {
  id: string;
  kind: "photo" | "video";
  caption: string | null;
}

async function fetchSignedUrl(mediaId: string): Promise<string | null> {
  try {
    const res = await fetch(`/api/sponsor/media/${mediaId}`);
    if (!res.ok) return null;
    const body = await res.json();
    return (body.url as string) ?? null;
  } catch {
    return null;
  }
}

export default function MediaGallery({ items }: { items: GalleryItem[] }) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [open, setOpen] = useState<GalleryItem | null>(null);
  const [openUrl, setOpenUrl] = useState<string | null>(null);

  // Eagerly load photo thumbnails so the grid is visual on arrival.
  useEffect(() => {
    let cancelled = false;
    const photos = items.filter((i) => i.kind === "photo");
    Promise.all(
      photos.map(async (p) => {
        const url = await fetchSignedUrl(p.id);
        return [p.id, url] as const;
      })
    ).then((pairs) => {
      if (cancelled) return;
      const next: Record<string, string> = {};
      for (const [id, url] of pairs) if (url) next[id] = url;
      setUrls((prev) => ({ ...prev, ...next }));
    });
    return () => {
      cancelled = true;
    };
  }, [items]);

  async function openItem(item: GalleryItem) {
    setOpen(item);
    const existing = urls[item.id];
    if (existing) {
      setOpenUrl(existing);
      return;
    }
    setOpenUrl(null);
    const url = await fetchSignedUrl(item.id);
    if (url) {
      setUrls((prev) => ({ ...prev, [item.id]: url }));
      setOpenUrl(url);
    }
  }

  function close() {
    setOpen(null);
    setOpenUrl(null);
  }

  if (items.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {items.map((item) => {
          const url = urls[item.id];
          return (
            <button
              key={item.id}
              onClick={() => openItem(item)}
              className="group relative aspect-square rounded-xl overflow-hidden bg-charcoal/5 ring-1 ring-charcoal/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-green"
              aria-label={item.caption ?? `View ${item.kind}`}
            >
              {item.kind === "photo" && url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={url}
                  alt={item.caption ?? "Photo"}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                />
              ) : item.kind === "video" ? (
                <span className="absolute inset-0 flex items-center justify-center bg-charcoal/80">
                  <svg className="w-9 h-9 text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </span>
              ) : (
                <span className="absolute inset-0 animate-pulse bg-charcoal/5" />
              )}
            </button>
          );
        })}
      </div>

      {/* Lightbox */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={close}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="absolute top-4 right-4 flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <a
              href={`/api/sponsor/media/${open.id}/download`}
              download
              className="inline-flex items-center gap-1.5 text-white/85 hover:text-white px-3 py-2 text-sm font-medium"
              aria-label="Download"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Download
            </a>
            <button onClick={close} className="text-white/80 hover:text-white p-2" aria-label="Close">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div
            className="max-w-3xl w-full max-h-[85vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {!openUrl ? (
              <p className="text-white/80 text-sm">Loading…</p>
            ) : open.kind === "video" ? (
              <video src={openUrl} controls autoPlay playsInline className="max-h-[80vh] w-auto rounded-xl">
                Your browser can&apos;t play this video.
              </video>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={openUrl}
                alt={open.caption ?? "Photo"}
                className="max-h-[80vh] w-auto rounded-xl object-contain"
              />
            )}
            {open.caption && (
              <p className="mt-3 text-sm text-white/70 text-center">{open.caption}</p>
            )}
            <p className="mt-2 text-xs text-white/45 text-center">
              For your personal keeping — please don&apos;t share or republish.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
