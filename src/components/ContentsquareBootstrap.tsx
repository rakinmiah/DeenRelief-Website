"use client";

import { useEffect, useRef, useState } from "react";
import {
  CONSENT_UPDATE_EVENT,
  readConsentCookie,
  type ConsentState,
} from "@/lib/consent";

/**
 * Contentsquare loader.
 *
 * Why Contentsquare (in addition to GA4):
 *   - Session replay reveals where donors hesitate inside the donation
 *     form (e.g. card field abandonment, Gift Aid confusion). GA4 events
 *     tell us _that_ donors drop off; Contentsquare tells us _why_.
 *   - Heatmaps + zone-based analytics surface which sections of long
 *     cause pages get attention vs. which get scrolled past. Pairs with
 *     cause_page_section_view (which says "the section was on screen")
 *     to confirm engagement quality, not just visibility.
 *
 * Privacy posture:
 *   - Contentsquare falls under the analytics_storage consent signal —
 *     it records donor sessions, so it MUST be gated. We treat it
 *     identically to GA4 for consent purposes (no firing without
 *     explicit opt-in).
 *   - The tracking script is injected only after the donor grants
 *     analytics consent. If they later revoke consent, we push
 *     `setTrackerOptOut` via the _uxa queue so Contentsquare stops
 *     recording immediately (the script remains loaded — there is no
 *     unload API — but it ceases activity).
 *   - Form input *values* are masked at the Contentsquare workspace
 *     level (Auto-Masking enabled for password / payment / PII fields).
 *     Verify the masking config in the Contentsquare dashboard before
 *     each major template change to the donation form.
 *
 * Env var contract:
 *   - NEXT_PUBLIC_CONTENTSQUARE_TAG_ID must be set for the loader to
 *     run. Without it, this component is a no-op — safe to ship before
 *     the Contentsquare workspace is provisioned.
 *
 * Dependencies on consent flow:
 *   - Listens to CONSENT_UPDATE_EVENT from consent.ts so a donor who
 *     accepts via the banner mid-session has Contentsquare loaded for
 *     that same session, no reload needed. Inverse: if they revoke
 *     consent the same listener fires `setTrackerOptOut`.
 *
 * SPA caveat:
 *   - Internal Next.js <Link> navigations are soft client-side
 *     transitions. Contentsquare's auto pageview detection only fires
 *     on full page loads, so SPA navs across cause pages won't appear
 *     as separate sessions/pageviews in Contentsquare. The bulk of the
 *     site uses server-rendered routes and hard nav from the Header,
 *     so coverage on the primary funnel paths is fine. If finer SPA
 *     attribution is needed, push `_uxa.push(["trackPageview", url])`
 *     from a usePathname-driven effect (separate change).
 */
export default function ContentsquareBootstrap() {
  const tagId = process.env.NEXT_PUBLIC_CONTENTSQUARE_TAG_ID;
  const [hasAnalyticsConsent, setHasAnalyticsConsent] = useState(false);
  // Once we've injected the tag we never inject it twice — the script
  // tag itself shouldn't be duplicated, even though _uxa.push is
  // idempotent.
  const injectedRef = useRef(false);

  // Initialise from cookie on mount + subscribe to consent updates.
  useEffect(() => {
    if (!tagId) return;

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
  }, [tagId]);

  // Inject Contentsquare's loader the first time consent flips to granted,
  // and toggle the _uxa opt-in/out flag on every consent change after.
  useEffect(() => {
    if (!tagId) return;

    // Trustees signing into /admin/* should never have their session
    // recorded by Contentsquare. We bail out of injection entirely on
    // initial admin loads — companion AdminAnalyticsExclusion handles
    // client-side route changes via setTrackerOptOut.
    if (
      typeof location !== "undefined" &&
      location.pathname.startsWith("/admin")
    ) {
      return;
    }

    type UxaWindow = Window & { _uxa?: unknown[] };
    const w = window as UxaWindow;
    // Initialise the queue stub if it doesn't exist yet — Contentsquare's
    // own loader does this, but we may push to it BEFORE the tag itself
    // arrives over the network on the first consent grant.
    w._uxa = w._uxa || [];

    if (!hasAnalyticsConsent) {
      // Mid-session consent revocation: tell Contentsquare to stop
      // recording. The script stays in memory (no unload API) but it
      // immediately ceases tracking.
      if (injectedRef.current) {
        w._uxa.push(["setTrackerOptOut"]);
      }
      return;
    }

    // Granted: inject (once) and tell Contentsquare it has consent.
    if (injectedRef.current) {
      w._uxa.push(["setTrackerOptIn"]);
      return;
    }
    injectedRef.current = true;

    // Push the opt-in BEFORE the script loads. The queue model means
    // the loader will replay this command once it boots, so we don't
    // need to wait for an onload event.
    w._uxa.push(["setTrackerOptIn"]);

    // Inject Contentsquare's tag. Async to avoid blocking the parser;
    // first-paint is unaffected.
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://t.contentsquare.net/uxa/${tagId}.js`;
    const firstScript = document.getElementsByTagName("script")[0];
    firstScript?.parentNode?.insertBefore(script, firstScript);
  }, [tagId, hasAnalyticsConsent]);

  return null;
}
