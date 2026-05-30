"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Keeps GA4 + Contentsquare suppressed on /admin/* pages, even when the
 * trustee navigates client-side (Link / router.push) between the public
 * site and the admin in the same browser tab.
 *
 * Why this is necessary alongside the bootstrap-level guards:
 *   - ConsentBootstrap's gtag-init script catches /admin first-loads by
 *     setting `ga-disable-G-XXX = true` before gtag('config') fires.
 *   - ContentsquareBootstrap's effect bails out of injection on /admin
 *     first-loads.
 *   - But neither of those reruns on a client-side route change. A user
 *     who lands on / first (gtag injected) and then navigates via Link
 *     into /admin would have gtag still firing per-route page_views.
 *
 * This component sits in the root layout, watches usePathname(), and
 * flips the disable flag on every route change. Defence in depth.
 *
 * Behaviour:
 *   - On /admin/* :
 *       window['ga-disable-G-XXX'] = true  → all GA events suppressed
 *       _uxa.push(['setTrackerOptOut'])    → Contentsquare stops recording
 *   - Off /admin/* :
 *       window['ga-disable-G-XXX'] = false → GA events resume (subject
 *                                            to existing consent state)
 *       _uxa is NOT auto-opted-back-in here — the ContentsquareBootstrap
 *         consent listener handles that based on the donor's actual
 *         consent state, which is the right source of truth.
 *
 * No-op when NEXT_PUBLIC_GA4_MEASUREMENT_ID isn't set (returns null).
 */
export default function AdminAnalyticsExclusion() {
  const pathname = usePathname();
  const measurementId = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;

  useEffect(() => {
    if (!measurementId) return;
    // Suppress analytics on BOTH the admin tool (/admin/*) and the private
    // sponsor portal (/sponsor/*) — the sponsor account holds children's data
    // and must not be tracked by GA4 / Contentsquare.
    const isPrivate =
      pathname.startsWith("/admin") || pathname.startsWith("/sponsor");

    // Google's official opt-out flag — gtag respects it on every event.
    // Setting to false re-enables once the user leaves the private areas.
    (window as unknown as Record<string, boolean>)[
      `ga-disable-${measurementId}`
    ] = isPrivate;

    // Contentsquare: only push opt-out when entering a private area. Don't
    // auto-opt-IN on leaving — that's the consent listener's job, since
    // the donor may not have granted Contentsquare consent in the first
    // place.
    if (isPrivate) {
      const w = window as unknown as { _uxa?: unknown[] };
      if (w._uxa) {
        w._uxa.push(["setTrackerOptOut"]);
      }
    }
  }, [pathname, measurementId]);

  return null;
}
