"use client";

import { useEffect, useRef } from "react";
import { trackEngagedSession } from "@/lib/analytics";

/**
 * Engagement threshold constants. All three must cross for the event to fire.
 *
 * Why these specific numbers:
 *   - 60 seconds is the GA4 community consensus for "real" engagement
 *     (the platform default is 10s, which is too lenient — skim-readers
 *     and bots regularly hit it).
 *   - 2 sections viewed means the donor read past the hero AND past one
 *     more meaningful section. Pairs with cause_page_section_view's
 *     0.5-visibility threshold.
 *   - 75% scroll depth means the donor scrolled most of the way through
 *     a page on this site, on any single page. Donors who reached the
 *     FAQ but didn't go further still hit this. Donors who bounced at
 *     the hero do not.
 */
const ENGAGED_SECONDS_THRESHOLD = 60;
const ENGAGED_SECTIONS_THRESHOLD = 2;
const ENGAGED_SCROLL_PCT_THRESHOLD = 75;

/**
 * SessionStorage keys. Scoped to the session so a returning donor next week
 * has a fresh engagement budget.
 */
const SS_KEY_TIME_MS = "dr_session_engaged_time_ms";
const SS_KEY_MAX_SCROLL = "dr_session_engaged_max_scroll";
const SS_KEY_FIRED = "dr_session_engaged_fired";
const SS_PREFIX_SECTION_VIEW = "dr_section_view_";

/**
 * Tracker for the `engaged_session` event.
 *
 * Mounted globally in app/layout.tsx so the metrics accumulate across page
 * navigations within a session — not per-page state. The component renders
 * null and only attaches three listeners:
 *
 *   1. A 1Hz interval that bumps cumulative time (and persists every 5s).
 *      Pauses when the tab is hidden — visibility-aware, so backgrounded
 *      tabs don't inflate the score.
 *   2. A throttled scroll listener that updates the max scroll % seen on
 *      any page in this session.
 *   3. After every metric update, a check: if all three thresholds cross
 *      AND the fired flag is not set, fire the event + set the flag.
 *
 * Section count is read from the existing `dr_section_view_*` keys
 * written by useSectionViewTracking — no new bookkeeping for that
 * dimension.
 */
export default function EngagedSessionTracker() {
  // Local in-memory cache of the cumulative time so the 1Hz tick doesn't
  // touch sessionStorage every second (touching it would needlessly serialise
  // JSON on every tick).
  const cumulativeMsRef = useRef<number>(0);
  const maxScrollRef = useRef<number>(0);

  useEffect(() => {
    if (typeof window === "undefined" || typeof sessionStorage === "undefined") return;

    // Already fired this session? Skip all instrumentation.
    if (sessionStorage.getItem(SS_KEY_FIRED) === "1") return;

    // Initialise from sessionStorage (cumulative across page navigations).
    cumulativeMsRef.current = parseInt(sessionStorage.getItem(SS_KEY_TIME_MS) ?? "0", 10) || 0;
    maxScrollRef.current = parseInt(sessionStorage.getItem(SS_KEY_MAX_SCROLL) ?? "0", 10) || 0;

    const countSectionsViewed = (): number => {
      let n = 0;
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (k && k.startsWith(SS_PREFIX_SECTION_VIEW)) n++;
      }
      return n;
    };

    const checkAndFire = () => {
      if (sessionStorage.getItem(SS_KEY_FIRED) === "1") return;
      const seconds = Math.floor(cumulativeMsRef.current / 1000);
      const sectionsViewed = countSectionsViewed();
      const maxScrollPct = maxScrollRef.current;
      if (
        seconds >= ENGAGED_SECONDS_THRESHOLD &&
        sectionsViewed >= ENGAGED_SECTIONS_THRESHOLD &&
        maxScrollPct >= ENGAGED_SCROLL_PCT_THRESHOLD
      ) {
        sessionStorage.setItem(SS_KEY_FIRED, "1");
        trackEngagedSession({
          cumulativeSeconds: seconds,
          sectionsViewed,
          maxScrollPct,
        });
      }
    };

    // ── 1. Cumulative time tick ──────────────────────────────────────────────
    // 1Hz bumps in memory; persist every 5s to bound sessionStorage I/O.
    let lastTickAt = Date.now();
    let lastPersistAt = Date.now();
    const tickInterval = window.setInterval(() => {
      // Only count time when the tab is foregrounded. Backgrounded tabs
      // shouldn't accumulate engagement — that's how bots inflate metrics.
      if (document.visibilityState !== "visible") {
        lastTickAt = Date.now();
        return;
      }
      const now = Date.now();
      const delta = now - lastTickAt;
      lastTickAt = now;
      // Cap any single tick at 2× the interval so a long sleep / freeze
      // doesn't dump 30s into the counter at once.
      cumulativeMsRef.current += Math.min(delta, 2000);
      if (now - lastPersistAt >= 5000) {
        sessionStorage.setItem(SS_KEY_TIME_MS, String(cumulativeMsRef.current));
        lastPersistAt = now;
      }
      checkAndFire();
    }, 1000);

    // ── 2. Throttled scroll listener ─────────────────────────────────────────
    // Rate-limited to ~5Hz (every 200ms) so scroll-jacking doesn't burn CPU.
    let scrollScheduled = false;
    const onScroll = () => {
      if (scrollScheduled) return;
      scrollScheduled = true;
      window.requestAnimationFrame(() => {
        scrollScheduled = false;
        const scrollY = window.scrollY || window.pageYOffset || 0;
        const viewport = window.innerHeight || 0;
        const pageHeight = document.documentElement.scrollHeight || 1;
        // Scroll % = how far through the page the BOTTOM of the viewport is.
        // (Bottom-of-viewport heuristic — matches GA4's scroll_depth.)
        const pct = Math.min(
          100,
          Math.round(((scrollY + viewport) / pageHeight) * 100)
        );
        if (pct > maxScrollRef.current) {
          maxScrollRef.current = pct;
          sessionStorage.setItem(SS_KEY_MAX_SCROLL, String(pct));
          checkAndFire();
        }
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    // ── 3. Persist on visibility change / pagehide ───────────────────────────
    // Catch the cumulative time before tab switch / unload so it survives.
    const flush = () => {
      sessionStorage.setItem(SS_KEY_TIME_MS, String(cumulativeMsRef.current));
      sessionStorage.setItem(SS_KEY_MAX_SCROLL, String(maxScrollRef.current));
    };
    document.addEventListener("visibilitychange", flush);
    window.addEventListener("pagehide", flush);

    // Run an initial check in case the donor hits the threshold immediately
    // (e.g. on the second page of the session, time and sections may already
    // be over the bar — only scroll on this page is missing).
    checkAndFire();

    return () => {
      window.clearInterval(tickInterval);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", flush);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, []);

  return null;
}
