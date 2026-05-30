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
          <button
            onClick={close}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-2"
            aria-label="Close"
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
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
          </div>
        </div>
      )}
    </>
  );
}
