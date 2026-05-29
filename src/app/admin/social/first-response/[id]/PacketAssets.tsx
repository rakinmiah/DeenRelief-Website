"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

/**
 * Click-to-zoom asset viewer for the packet's images.
 *
 * Replaces the previous server-rendered CarouselGrid + SocialImagePreview
 * with one client component that wires a shared lightbox across every
 * generated PNG — carousel slides + the 1200×675 social image.
 *
 * Behaviour:
 *   • Click any thumbnail → fullscreen lightbox.
 *   • Arrow keys / on-screen buttons cycle through every asset in the
 *     packet, not just within the section that was clicked.
 *   • Escape OR click outside the image closes.
 *   • Download button inside the lightbox saves the currently shown
 *     PNG with a sensible filename.
 *
 * The download buttons on the thumbnail cards stay so the SMM can
 * grab a file without going through the lightbox.
 */

interface Asset {
  src: string;
  label: string;
  /** Alt text + filename hint. */
  alt: string;
  /** What gets written to the user's filesystem on download. */
  downloadName: string;
  /** Aspect ratio for layout — square for carousel, 16:9 for social. */
  aspect: "square" | "wide";
}

export default function PacketAssets({
  eventId,
  carouselCount,
  draftStamp,
}: {
  eventId: string;
  carouselCount: number;
  draftStamp: number;
}) {
  // Build the full asset list once per render; pure derivation from props.
  // draftStamp is the cache-buster so a redraft / brand-asset upload
  // refreshes every PNG in lockstep.
  const assets: Asset[] = useMemo(() => {
    const carousel: Asset[] = Array.from(
      { length: carouselCount },
      (_, i) => ({
        src: `/api/admin/first-response/${eventId}/slide/${i}?v=${draftStamp}`,
        label: `Slide ${i + 1}`,
        alt: `Carousel slide ${i + 1}`,
        downloadName: `deenrelief-slide-${i + 1}.png`,
        aspect: "square" as const,
      })
    );
    const social: Asset = {
      src: `/api/admin/first-response/${eventId}/social-image?v=${draftStamp}`,
      label: "Single-image post · 1200×675",
      alt: "Single-image post for X (Twitter)",
      downloadName: "deenrelief-social-post.png",
      aspect: "wide" as const,
    };
    return [...carousel, social];
  }, [eventId, carouselCount, draftStamp]);

  // Index of the asset currently shown in the lightbox; null = closed.
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const close = useCallback(() => setActiveIndex(null), []);
  const next = useCallback(() => {
    setActiveIndex((i) => (i == null ? null : (i + 1) % assets.length));
  }, [assets.length]);
  const prev = useCallback(() => {
    setActiveIndex((i) =>
      i == null ? null : (i - 1 + assets.length) % assets.length
    );
  }, [assets.length]);

  // Keyboard handlers — only attached when the lightbox is open so we
  // don't capture Escape / arrows from forms elsewhere on the page.
  useEffect(() => {
    if (activeIndex == null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeIndex, close, next, prev]);

  // Lock body scroll while the lightbox is open so the page behind
  // doesn't jump around when the user wheel-scrolls.
  useEffect(() => {
    if (activeIndex == null) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [activeIndex]);

  // Split for layout — carousel slides go in the grid, social image
  // gets its own larger card below.
  const carousel = assets.filter((a) => a.aspect === "square");
  const social = assets.find((a) => a.aspect === "wide")!;

  return (
    <>
      {/* ── Carousel slides ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {carousel.map((a, i) => (
          <Thumbnail
            key={i}
            asset={a}
            onClick={() => setActiveIndex(i)}
          />
        ))}
      </div>

      {/* ── Single-image (X / Twitter) — rendered below the carousel.
            Phase 5c relabel: the carousel above is for Instagram +
            Facebook (FB supports carousels natively), so the only
            platform that genuinely needs a single image is X. ── */}
      <div className="mt-8">
        <div className="text-[11px] font-bold tracking-[0.1em] uppercase text-charcoal/55 mb-3">
          Single-image post for X (Twitter)
        </div>
        <Thumbnail
          asset={social}
          onClick={() => setActiveIndex(carousel.length)}
          variant="wide"
        />
      </div>

      {/* ── Lightbox ── */}
      {activeIndex != null && (
        <Lightbox
          asset={assets[activeIndex]!}
          index={activeIndex}
          total={assets.length}
          onClose={close}
          onNext={next}
          onPrev={prev}
        />
      )}
    </>
  );
}

/* ─── Thumbnail card ────────────────────────────────────────────── */

function Thumbnail({
  asset,
  onClick,
  variant = "square",
}: {
  asset: Asset;
  onClick: () => void;
  variant?: "square" | "wide";
}) {
  return (
    <div
      className={`flex flex-col gap-2 bg-cream/30 rounded-xl p-3 ${
        variant === "wide" ? "max-w-2xl" : ""
      }`}
    >
      <button
        type="button"
        onClick={onClick}
        aria-label={`Preview ${asset.label}`}
        className={`group relative w-full overflow-hidden rounded-lg border border-charcoal/10 bg-white cursor-zoom-in transition-transform hover:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-charcoal/40 ${
          variant === "wide" ? "aspect-[16/9]" : "aspect-square"
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={asset.src}
          alt={asset.alt}
          width={variant === "wide" ? 1200 : 1080}
          height={variant === "wide" ? 675 : 1080}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {/* Subtle hover hint — appears in the corner on hover. */}
        <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-charcoal/80 text-cream text-[10px] font-bold tracking-[0.1em] uppercase opacity-0 group-hover:opacity-100 transition-opacity">
          Click to zoom
        </span>
      </button>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold tracking-[0.1em] uppercase text-charcoal/55">
          {asset.label}
        </span>
        <a
          href={asset.src}
          download={asset.downloadName}
          className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-charcoal text-white hover:bg-charcoal/85 transition-colors"
        >
          Download
        </a>
      </div>
    </div>
  );
}

/* ─── Lightbox overlay ──────────────────────────────────────────── */

function Lightbox({
  asset,
  index,
  total,
  onClose,
  onNext,
  onPrev,
}: {
  asset: Asset;
  index: number;
  total: number;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/85 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Asset preview · ${asset.label}`}
    >
      {/* ── Top toolbar ── */}
      <div
        className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-cream/95 backdrop-blur rounded-full px-4 py-2 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-[11px] font-bold tracking-[0.12em] uppercase text-charcoal/70">
          {asset.label}
        </span>
        <span className="text-[10px] text-charcoal/40 font-mono">
          {index + 1} / {total}
        </span>
        <a
          href={asset.src}
          download={asset.downloadName}
          className="text-[11px] font-semibold px-3 py-1.5 rounded-full bg-charcoal text-cream hover:bg-charcoal/85 transition-colors"
        >
          ↓ Download
        </a>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close preview"
          className="text-[11px] font-semibold px-3 py-1.5 rounded-full bg-charcoal/10 text-charcoal hover:bg-charcoal/20 transition-colors"
        >
          ✕ Close
        </button>
      </div>

      {/* ── Image (stop click-through so the backdrop doesn't close) ── */}
      <div
        className="max-w-[90vw] max-h-[85vh] flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={asset.src}
          alt={asset.alt}
          className={`rounded-lg shadow-2xl bg-white object-contain ${
            asset.aspect === "wide"
              ? "max-h-[85vh] w-auto"
              : "max-h-[85vh] max-w-[85vh]"
          }`}
        />
      </div>

      {/* ── Prev / next ── */}
      {total > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPrev();
            }}
            aria-label="Previous asset"
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-cream/95 text-charcoal text-2xl font-bold flex items-center justify-center shadow-lg hover:bg-cream transition-colors"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onNext();
            }}
            aria-label="Next asset"
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-cream/95 text-charcoal text-2xl font-bold flex items-center justify-center shadow-lg hover:bg-cream transition-colors"
          >
            ›
          </button>
        </>
      )}

      {/* ── Hint footer ── */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] text-cream/60 font-mono tracking-wider">
        ESC to close · ← → to navigate
      </div>
    </div>
  );
}
