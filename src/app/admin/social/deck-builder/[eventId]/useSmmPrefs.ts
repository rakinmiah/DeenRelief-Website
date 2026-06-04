"use client";

import { useEffect, useState } from "react";
import type { DeckSignal, LearnedPrefs } from "@/lib/smm-preferences";
import type { OutcomePrefs } from "@/lib/social-outcomes";

/**
 * The deck builder's two learned signals, fetched once:
 *   - `prefs`   — the SMM's taste profile (templates she keeps, copy length)
 *   - `outcome` — what real clicks + donations prove converts (gated)
 * Both bias the auto-draft's deterministic choices. The outcome signal is what
 * makes the builder compound — proven winners outrank taste in defaultTemplateId.
 *
 * Zero-cost loop: GET reads aggregated profiles (no AI call). Degrades silently
 * to `null`/empty before migrations 035/037 or on any error — the deck builder
 * just uses its base defaults.
 */
export function useSmmPrefs() {
  const [prefs, setPrefs] = useState<LearnedPrefs | null>(null);
  const [outcome, setOutcome] = useState<OutcomePrefs | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/social/learning", { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as {
          prefs?: LearnedPrefs;
          outcome?: OutcomePrefs;
        };
        if (cancelled) return;
        if (json?.prefs) setPrefs(json.prefs);
        if (json?.outcome) setOutcome(json.outcome);
      } catch {
        /* no learned signals — fall back to base defaults */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { prefs, outcome };
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
