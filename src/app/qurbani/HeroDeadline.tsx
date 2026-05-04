"use client";

import { useEffect, useState } from "react";

/**
 * Live deadline counter, rendered as a single inline `<span>` styled to
 * sit inside the hero's trust row alongside "Charity No. ..." and "Gift
 * Aid Eligible". Subtly elevated via `text-amber font-semibold` against
 * the surrounding `text-white/45` siblings — visible without shouting.
 *
 * Render strategy:
 *   - SSR / pre-hydration: shows static "Order by 23 May 2026" so the
 *     trust row is fully populated from first paint with no layout shift.
 *   - Hydrated client: switches to "X days left to order", refreshes
 *     every minute and on tab refocus.
 *   - After deadline: switches to "Final orders being processed", never
 *     disappears.
 *
 * Tone: matter-of-fact, not high-pressure ("19 days left to order" rather
 * than "ONLY 19 DAYS LEFT"). Sits in the trust row, not above it, so it
 * reads as a trust signal rather than a marketing pop.
 *
 * Deadline is Europe/London end-of-day 23 May 2026 — UK donor base.
 */

const DEADLINE = new Date("2026-05-23T23:59:59+01:00");

const STYLE = "text-amber font-semibold";

export default function HeroDeadline() {
  const [hydrated, setHydrated] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setHydrated(true);
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 60_000);

    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  if (!hydrated) {
    return <span className={STYLE}>Order by 23 May 2026</span>;
  }

  const diffMs = DEADLINE.getTime() - now;
  if (diffMs <= 0) {
    return <span className={STYLE}>Final orders being processed</span>;
  }

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);

  const label =
    days >= 1
      ? `${days} ${days === 1 ? "day" : "days"} left to order`
      : `${hours} ${hours === 1 ? "hour" : "hours"} left to order`;

  return <span className={STYLE}>{label}</span>;
}
