"use client";

import { useEffect, useRef, useState } from "react";
import type { DeckSignal, LearnedPrefs } from "@/lib/smm-preferences";

/**
 * The SMM's learned taste profile — fetched once and applied to bias the
 * auto-draft's deterministic choices (default template per role, copy length).
 *
 * Zero-cost loop: GET reads the aggregated profile (plain code, no AI call);
 * `record()` POSTs a finished deck's signals so the next draft drifts toward
 * her taste. Degrades silently to `null` before migration 035 / on any error —
 * the deck builder just uses its base defaults.
 */
export function useSmmPrefs() {
  const [prefs, setPrefs] = useState<LearnedPrefs | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/social/learning", { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as { prefs?: LearnedPrefs };
        if (!cancelled && json?.prefs) setPrefs(json.prefs);
      } catch {
        /* no learned prefs — fall back to base defaults */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return prefs;
}

/**
 * Record a finished deck's signals (role + chosen template + headline length
 * per slide) so the profile drifts toward her taste. Fire-and-forget — never
 * blocks the build, never surfaces an error to the SMM.
 */
export async function recordDeckSignals(signals: DeckSignal[]): Promise<void> {
  if (!signals.length) return;
  try {
    await fetch("/api/admin/social/learning", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signals }),
      keepalive: true,
    });
  } catch {
    /* learning is best-effort — a missed signal just means one fewer sample */
  }
}
