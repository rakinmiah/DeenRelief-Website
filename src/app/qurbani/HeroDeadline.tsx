"use client";

import { useEffect, useState } from "react";

/**
 * Live ticking countdown — days / hours / minutes / seconds — for the
 * Qurbani 2026 deadline. Sits below the hero CTA, restyled as four
 * tabular-numeral blocks rather than a flash-sale banner so it reads as
 * a clock against the dark hero rather than e-commerce urgency-marketing.
 *
 * Update cadence: every 1 second. Modest CPU/battery cost on a single
 * setInterval — negligible on modern devices but worth knowing if this
 * pattern is ever reused on a more interactive page.
 *
 * Render strategy:
 *   - SSR / pre-hydration: shows static "Order by 23 May 2026" so the
 *     hero is fully populated from first paint with no layout shift.
 *   - Hydrated client: switches to the 4-block ticker, refreshes every
 *     second and on tab refocus.
 *   - After deadline: switches to "Final orders being processed".
 *
 * Deadline is Europe/London end-of-day 23 May 2026 — UK donor base.
 */

const DEADLINE = new Date("2026-05-23T23:59:59+01:00");

export default function HeroDeadline() {
  const [hydrated, setHydrated] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setHydrated(true);
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 1000);

    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  // Pre-hydration: short text in the same vertical footprint so the layout
  // doesn't shift when the ticker mounts.
  if (!hydrated) {
    return (
      <p className="mt-5 mb-7 text-[11px] font-bold tracking-[0.1em] uppercase text-white/45">
        Order by 23 May 2026
      </p>
    );
  }

  const diffMs = DEADLINE.getTime() - now;
  if (diffMs <= 0) {
    return (
      <p className="mt-5 mb-7 text-[11px] font-bold tracking-[0.1em] uppercase text-amber">
        Final orders being processed
      </p>
    );
  }

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diffMs / (1000 * 60)) % 60);
  const seconds = Math.floor((diffMs / 1000) % 60);

  return (
    <div className="mt-5 mb-7">
      <p className="text-[10px] font-bold tracking-[0.12em] uppercase text-white/45 mb-2">
        Order closes in
      </p>
      <div className="flex items-start gap-2">
        <Cell value={days} label="Days" />
        <Cell value={hours} label="Hrs" />
        <Cell value={minutes} label="Min" />
        <Cell value={seconds} label="Sec" />
      </div>
    </div>
  );
}

function Cell({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-start min-w-[44px] sm:min-w-[52px]">
      <span className="font-heading font-bold text-amber text-2xl sm:text-3xl tabular-nums leading-none">
        {value.toString().padStart(2, "0")}
      </span>
      <span className="mt-1 text-[9px] sm:text-[10px] font-semibold tracking-[0.12em] uppercase text-white/55">
        {label}
      </span>
    </div>
  );
}
