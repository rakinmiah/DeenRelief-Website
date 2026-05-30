"use client";

import { useEffect, useState } from "react";

/**
 * Renders a single private photo/video by fetching a short-lived signed URL
 * from /api/sponsor/media/[mediaId] at view time. The URL is never stored or
 * rendered into the server HTML — it's minted per view, expires in minutes,
 * and the fetch itself is recorded in the safeguarding access log server-side.
 *
 * Photos load their signed URL on mount; videos wait for an explicit click so
 * we don't issue a signed URL (or log an access) for media the sponsor never
 * actually watches.
 */
export default function MediaPlayer({
  mediaId,
  kind,
  caption,
}: {
  mediaId: string;
  kind: "photo" | "video";
  caption: string | null;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [requested, setRequested] = useState(kind === "photo");
  // Derived rather than stored, so the fetch effect never calls setState
  // synchronously (it only does so inside async callbacks).
  const loading = requested && !url && !error;

  useEffect(() => {
    if (!requested || url) return;
    let cancelled = false;
    fetch(`/api/sponsor/media/${mediaId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("denied"))))
      .then((body) => {
        if (!cancelled) setUrl(body.url as string);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [requested, url, mediaId]);

  return (
    <figure className="rounded-2xl overflow-hidden border border-charcoal/5 bg-charcoal/5 shadow-sm">
      {error ? (
        <div className="aspect-video flex items-center justify-center text-sm text-grey">
          Couldn&apos;t load this media. Try refreshing.
        </div>
      ) : kind === "photo" ? (
        url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={caption ?? "Photo update"}
            className="w-full h-auto block"
          />
        ) : (
          <div className="aspect-video flex items-center justify-center text-sm text-grey">
            {loading ? "Loading photo…" : ""}
          </div>
        )
      ) : url ? (
        <video src={url} controls playsInline className="w-full h-auto block">
          Your browser can&apos;t play this video.
        </video>
      ) : (
        <button
          onClick={() => setRequested(true)}
          disabled={loading}
          className="aspect-video w-full flex items-center justify-center gap-2 text-sm font-medium text-charcoal hover:bg-charcoal/10 transition-colors"
        >
          {loading ? (
            "Loading video…"
          ) : (
            <>
              <svg
                className="w-6 h-6"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden
              >
                <path d="M8 5v14l11-7z" />
              </svg>
              Play video
            </>
          )}
        </button>
      )}
      {caption && (
        <figcaption className="px-3 py-2 text-xs text-grey bg-white">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
