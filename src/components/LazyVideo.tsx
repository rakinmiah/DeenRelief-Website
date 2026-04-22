"use client";

import Image, { type StaticImageData } from "next/image";
import { useState } from "react";

/**
 * Poster-first video. Renders a static poster + a play button until the
 * user taps it; only then does the <video> element mount and start
 * downloading bytes.
 *
 * Why: the Gaza field video is ~14 MB. On mobile, autoplay-muted
 * triggers the browser to download the full file on every page view —
 * crushing LCP on 4G and costing Landing Page Experience in Google Ads.
 * Poster-first means mobile visitors save the full 14 MB unless they
 * choose to watch.
 *
 * Use <LazyVideo> inside a `relative` wrapper with a defined aspect
 * ratio — this component fills its container via absolute inset-0.
 */
export default function LazyVideo({
  src,
  poster,
  alt,
  videoClassName = "w-full h-full object-cover",
  posterClassName = "object-cover",
  posterSizes = "100vw",
  posterObjectPosition,
}: {
  src: string;
  poster: string | StaticImageData;
  alt: string;
  videoClassName?: string;
  posterClassName?: string;
  posterSizes?: string;
  posterObjectPosition?: string;
}) {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <video
        className={videoClassName}
        src={src}
        poster={typeof poster === "string" ? poster : poster.src}
        playsInline
        autoPlay
        controls
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      aria-label="Play video"
      className="absolute inset-0 w-full h-full group focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-white"
    >
      <Image
        src={poster}
        alt={alt}
        fill
        sizes={posterSizes}
        className={posterClassName}
        style={posterObjectPosition ? { objectPosition: posterObjectPosition } : undefined}
      />
      {/* Subtle darkening so the play button stands out across any poster */}
      <div className="absolute inset-0 bg-black/15 group-hover:bg-black/25 transition-colors duration-200" />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/95 flex items-center justify-center shadow-2xl group-hover:scale-105 transition-transform duration-200">
          <svg
            className="w-7 h-7 sm:w-8 sm:h-8 text-charcoal ml-1"
            fill="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>
    </button>
  );
}
