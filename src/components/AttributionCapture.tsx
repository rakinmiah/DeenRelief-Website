"use client";

import { useEffect } from "react";
import {
  ATTRIBUTION_COOKIE,
  ATTRIBUTION_MAX_AGE_SECONDS,
  attributionFromSearchParams,
  hasAnyClickOrUtm,
  parseAttribution,
  serializeAttribution,
  type AttributionData,
} from "@/lib/attribution";

/**
 * Captures ad-click attribution into a first-party cookie on mount.
 *
 * Model: **last-click wins**. If the current URL has any gclid/gbraid/
 * wbraid/fbclid/utm_* param, we overwrite the cookie with the new visit's
 * values. If the URL has none, we leave an existing cookie alone — so
 * organic returns don't erase an earlier ad click within the 90-day
 * window.
 *
 * Why client-side (not middleware):
 *   - Middleware would set the cookie on every request, including ones
 *     that never paint (prefetches, bots). Running it in a useEffect
 *     guarantees we only attribute real human visits.
 *   - We also want document.referrer, which is only available client-side.
 *
 * Runs exactly once per mount. Zero render output.
 */
export default function AttributionCapture() {
  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const incoming = attributionFromSearchParams(sp);

      // If no click/UTM params in the URL, respect an existing cookie.
      if (!hasAnyClickOrUtm(incoming)) return;

      const existingRaw = readCookie(ATTRIBUTION_COOKIE);
      const existing = parseAttribution(existingRaw);

      const next: AttributionData = {
        ...existing,
        ...incoming,
        landing_page: `${window.location.pathname}${window.location.search}`,
        landing_referrer: document.referrer || undefined,
        landing_at: new Date().toISOString(),
      };

      writeCookie(ATTRIBUTION_COOKIE, serializeAttribution(next), ATTRIBUTION_MAX_AGE_SECONDS);
    } catch {
      // Never block the page for an attribution error — swallow.
    }
  }, []);

  return null;
}

function readCookie(name: string): string | null {
  const prefix = `${name}=`;
  const parts = document.cookie ? document.cookie.split("; ") : [];
  for (const part of parts) {
    if (part.startsWith(prefix)) return part.slice(prefix.length);
  }
  return null;
}

function writeCookie(name: string, value: string, maxAgeSeconds: number) {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie =
    `${name}=${value}` +
    `; Path=/` +
    `; Max-Age=${maxAgeSeconds}` +
    `; SameSite=Lax${secure}`;
}
