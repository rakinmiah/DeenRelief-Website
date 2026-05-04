"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Scroll-coupled progressive process strip — circular numbered nodes
 * connected by a track that fills in lockstep with scroll progress through
 * the section. As the user scrolls past the row, each node fades from
 * inactive (white, faint ring) to active (green, white numeral, soft
 * shadow), and the track fills L→R from node 1 toward node N.
 *
 * Activation is tied to overall section progress, NOT each node's own Y
 * position. Reason: at lg+ all nodes sit at the same vertical position;
 * a per-node Y trigger would activate them simultaneously, defeating the
 * staggered "bar travelling through nodes" effect.
 *
 * Connector renders only at lg+ where the row is horizontal. Below lg the
 * cards stack (sm:grid-cols-2 by default); the per-node opacity fade
 * carries the effect on its own.
 *
 * Accessibility: `prefers-reduced-motion: reduce` skips scroll tracking
 * and shows every node fully active on mount.
 */

export interface ProcessStep {
  /** The badge label, typically "01", "02", etc. */
  n: string;
  /** The step heading. */
  title: string;
  /** Step description body. */
  body: string;
}

interface Props {
  steps: ProcessStep[];
  /** Container width / margin classes — e.g. "max-w-4xl mx-auto mb-12". */
  className?: string;
}

/** Map step count to the lg-breakpoint grid class. Tailwind sees these
 *  literal strings during build so they survive purging. Add more entries
 *  here if a section needs 5+ steps. */
const LG_GRID_COLS: Record<number, string> = {
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
  5: "lg:grid-cols-5",
};

export default function ProcessSteps({ steps, className = "" }: Props) {
  const N = steps.length;
  // 0 = row is below the bottom of the viewport; 1 = past the top.
  const [progress, setProgress] = useState(0);
  const olRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reduce) {
      setProgress(1);
      return;
    }

    let raf = 0;
    const update = () => {
      raf = 0;
      if (!olRef.current) return;
      const rect = olRef.current.getBoundingClientRect();
      const vh = window.innerHeight;
      // 70% of vh window — center at 85% (entering) → 15% (leaving). Wide
      // enough to keep the activation gradual even on a quick scroll.
      const center = rect.top + rect.height / 2;
      const startY = vh * 0.85;
      const endY = vh * 0.15;
      const p = Math.max(0, Math.min(1, (startY - center) / (startY - endY)));
      setProgress((prev) => (Math.abs(prev - p) < 0.003 ? prev : p));
    };

    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // Each card activates over its own 1/N slice of progress, sequentially.
  const activations = steps.map((_, i) => {
    const start = i / N;
    const end = (i + 1) / N;
    return Math.max(0, Math.min(1, (progress - start) / (end - start)));
  });

  // Bar fill maps progress [1/N, 1] → [0%, 100%]. Empty until card 0 is
  // fully active; reaches 100% exactly when card N-1 is fully active.
  const fillPercent = Math.max(
    0,
    Math.min(100, ((progress - 1 / N) / (1 - 1 / N)) * 100)
  );

  // Track endpoints align with the centers of the first and last nodes.
  // For N evenly-spaced columns the centers sit at (1/(2N)) and
  // (1 - 1/(2N)) of the row width, so the inset on each side is 100/(2N) %.
  const trackInset = `${100 / (2 * N)}%`;

  const lgGridClass = LG_GRID_COLS[N] ?? "lg:grid-cols-4";

  return (
    <div className={`relative ${className}`}>
      {/* Desktop horizontal track — runs from center of node 1 to center of node N. */}
      <div
        aria-hidden
        className="hidden lg:block absolute top-6 h-px bg-charcoal/15 pointer-events-none"
        style={{ left: trackInset, right: trackInset }}
      >
        <div
          className="h-full bg-green"
          style={{
            width: `${fillPercent}%`,
            willChange: "width",
          }}
        />
      </div>

      <ol
        ref={olRef}
        className={`grid sm:grid-cols-2 ${lgGridClass} gap-10 sm:gap-8 lg:gap-6 relative`}
      >
        {steps.map((step, i) => {
          const a = activations[i] ?? 0;
          return (
            <li key={`${step.n}-${i}`} className="text-center">
              {/* Two-layer badge: inactive base + opacity-faded active overlay.
                  No CSS transitions — the value already changes smoothly with
                  scroll, so a transition would only add lag. */}
              <span className="relative z-10 mx-auto mb-4 inline-flex w-12 h-12">
                {/* Inactive base */}
                <span className="absolute inset-0 inline-flex items-center justify-center rounded-full bg-white ring-2 ring-charcoal/15 font-heading font-bold text-base text-charcoal/40">
                  {step.n}
                </span>
                {/* Active overlay */}
                <span
                  className="absolute inset-0 inline-flex items-center justify-center rounded-full bg-green ring-2 ring-green shadow-md shadow-green/25 font-heading font-bold text-base text-white"
                  style={{
                    opacity: a,
                    transform: `scale(${1 + a * 0.06})`,
                    willChange: "opacity, transform",
                  }}
                >
                  {step.n}
                </span>
              </span>
              <h3
                className="font-heading font-bold text-lg mb-2 text-charcoal"
                style={{ opacity: 0.55 + a * 0.45 }}
              >
                {step.title}
              </h3>
              <p
                className="text-[0.875rem] leading-[1.6] text-grey"
                style={{ opacity: 0.55 + a * 0.45 }}
              >
                {step.body}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
