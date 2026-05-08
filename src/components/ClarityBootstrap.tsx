"use client";

import { useEffect, useRef, useState } from "react";
import {
  CONSENT_UPDATE_EVENT,
  readConsentCookie,
  type ConsentState,
} from "@/lib/consent";

/**
 * Microsoft Clarity loader.
 *
 * Why Clarity (in addition to GA4):
 *   - Session replay reveals where donors hesitate inside the donation
 *     form (e.g. card field abandonment, Gift Aid confusion). GA4 events
 *     tell us _that_ donors drop off; Clarity tells us _why_.
 *   - Heatmaps surface which sections of long cause pages get attention
 *     vs. which get scrolled past. Pairs with cause_page_section_view
 *     (which says "the section was on screen") to confirm engagement.
 *
 * Privacy posture:
 *   - Clarity falls under the analytics_storage consent signal — it
 *     records donor sessions, so it MUST be gated. We treat it identically
 *     to GA4 for consent purposes (no firing without explicit opt-in).
 *   - The script is injected only after the donor grants analytics
 *     consent. If they later revoke, we can't unload the script (no API
 *     for that), but Clarity's own cookies are deleted by their consent
 *     API call below, and the next page load won't re-inject.
 *   - Clarity's "Mask sensitive content" default is left on. Form inputs
 *     (card numbers, names, emails, addresses) are masked by Clarity by
 *     default — we don't override.
 *
 * Env var contract:
 *   - NEXT_PUBLIC_CLARITY_PROJECT_ID must be set for the loader to run.
 *     Without it, this component is a no-op — safe to ship before the
 *     Clarity workspace is provisioned.
 *
 * Dependencies on consent flow:
 *   - Listens to CONSENT_UPDATE_EVENT from consent.ts so a donor who
 *     accepts via the banner mid-session has Clarity loaded for that
 *     same session, no reload needed.
 */
export default function ClarityBootstrap() {
  const projectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;
  const [hasAnalyticsConsent, setHasAnalyticsConsent] = useState(false);
  // Once we've injected the loader script we don't ever inject it twice
  // — Clarity's loader is idempotent at the snippet level but the script
  // tag itself shouldn't be duplicated.
  const injectedRef = useRef(false);

  // Initialise from cookie on mount + subscribe to consent updates.
  useEffect(() => {
    if (!projectId) return;

    const refresh = (state?: ConsentState | null) => {
      const c = state ?? readConsentCookie();
      setHasAnalyticsConsent(!!c?.analytics_storage);
    };
    refresh();

    const handler = (ev: Event) => {
      const state = (ev as CustomEvent<ConsentState>).detail ?? null;
      refresh(state);
    };
    window.addEventListener(CONSENT_UPDATE_EVENT, handler);
    return () => window.removeEventListener(CONSENT_UPDATE_EVENT, handler);
  }, [projectId]);

  // Inject Clarity's loader the first time consent flips to granted.
  useEffect(() => {
    if (!projectId) return;
    if (!hasAnalyticsConsent) {
      // If a donor revokes consent mid-session, tell Clarity to flush its
      // cookies. The script remains in memory (no API to unload) but
      // future events / replays are suppressed.
      const w = window as unknown as { clarity?: (cmd: string, ...rest: unknown[]) => void };
      if (typeof w.clarity === "function") {
        w.clarity("consent", false);
      }
      return;
    }

    // Granted: inject (once) or just notify the existing tag.
    const w = window as unknown as { clarity?: (cmd: string, ...rest: unknown[]) => void };
    if (injectedRef.current) {
      if (typeof w.clarity === "function") w.clarity("consent");
      return;
    }
    injectedRef.current = true;

    // Standard Microsoft Clarity loader snippet, lightly typed.
    // https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-setup
    (function (
      win: Window & { clarity?: (...args: unknown[]) => void },
      doc: Document,
      id: string,
    ) {
      const c = win as unknown as Record<string, unknown>;
      c["clarity"] = c["clarity"] || function (...args: unknown[]) {
        (c["clarity"] as { q?: unknown[] }).q = (c["clarity"] as { q?: unknown[] }).q || [];
        ((c["clarity"] as { q?: unknown[] }).q as unknown[]).push(args);
      };
      const t = doc.createElement("script");
      t.async = true;
      t.src = `https://www.clarity.ms/tag/${id}`;
      const s = doc.getElementsByTagName("script")[0];
      s.parentNode?.insertBefore(t, s);
    })(window as Window & { clarity?: (...args: unknown[]) => void }, document, projectId);

    // Tell Clarity it has consent (its own opt-in API, separate from
    // gtag consent mode — Clarity is not a Google product).
    if (typeof w.clarity === "function") w.clarity("consent");
  }, [projectId, hasAnalyticsConsent]);

  return null;
}
