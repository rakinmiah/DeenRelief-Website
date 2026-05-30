"use client";

import { useEffect, useState } from "react";

/**
 * Small collage of a child's first few media, used on the Photos card of the
 * hub. Fetches short-lived signed URLs for the preview ids via the sponsor
 * media endpoint (same RLS-gated path as the gallery). Purely decorative — the
 * card itself links through to the full gallery.
 */
export default function CardPhotoPreview({ ids }: { ids: string[] }) {
  const [urls, setUrls] = useState<(string | null)[]>(() => ids.map(() => null));

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      ids.map(async (id) => {
        try {
          const res = await fetch(`/api/sponsor/media/${id}`);
          if (!res.ok) return null;
          const body = await res.json();
          return (body.url as string) ?? null;
        } catch {
          return null;
        }
      })
    ).then((resolved) => {
      if (!cancelled) setUrls(resolved);
    });
    return () => {
      cancelled = true;
    };
  }, [ids]);

  if (ids.length === 0) return null;

  return (
    <div className="grid grid-cols-3 gap-0.5">
      {ids.map((id, i) => (
        <div key={id} className="aspect-[4/3] bg-charcoal/5 overflow-hidden">
          {urls[i] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={urls[i] as string} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="block w-full h-full animate-pulse bg-charcoal/5" />
          )}
        </div>
      ))}
    </div>
  );
}
