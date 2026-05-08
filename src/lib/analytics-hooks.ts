"use client";

/**
 * React hooks for cause-page analytics events. Separate from analytics.ts
 * so the typed-wrapper module stays portable / server-safe; these hooks
 * are explicitly client-only.
 *
 * Two hooks live here:
 *   - useSitelinkLanding      → fire sitelink_landing on mount
 *   - useSectionViewTracking  → fire cause_page_section_view on
 *                                IntersectionObserver thresholds
 */

import { useEffect } from "react";
import {
  trackCausePageSectionView,
  trackSitelinkLanding,
  type DonationCampaign,
} from "./analytics";

/**
 * Detect "this is a fresh page load from outside the site". True when:
 *   - the page is the first navigation in this tab (not an in-app nav), AND
 *   - the referrer is external (or empty — direct nav, paid traffic
 *     usually has external or empty referrer)
 *
 * False for SPA navigations (clicking an internal Link) and false for
 * same-origin reloads.
 */
function isExternalDeepLink(): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") return false;

  // Modern Performance API navigation type
  const navEntries = performance.getEntriesByType("navigation");
  const navType = (navEntries[0] as PerformanceNavigationTiming | undefined)?.type;
  const isFreshLoad = navType === "navigate";
  if (!isFreshLoad) return false;

  // Empty referrer = direct, paid ads, or referrer-policy stripped — treat as external.
  const ref = document.referrer;
  if (!ref) return true;
  try {
    const refOrigin = new URL(ref).origin;
    return refOrigin !== window.location.origin;
  } catch {
    return true;
  }
}

/**
 * Fire sitelink_landing once on initial mount, when the URL has a hash
 * AND the page was loaded via external deep-link.
 *
 * `expandedFaq` is optional — pass `true` if the cause page's FAQ
 * accordion auto-opened a matching entry from the hash. The default
 * behaviour assumes any `#faq-*` hash that matches a known slug
 * resulted in an expansion; pass an explicit boolean to override.
 */
export function useSitelinkLanding(causePage: DonationCampaign): void {
  useEffect(() => {
    if (!isExternalDeepLink()) return;

    const hash = window.location.hash;
    if (!hash || hash.length < 2) return;

    const targetAnchor = hash.slice(1); // strip leading #
    const expandedFaq = targetAnchor.startsWith("faq-");

    trackSitelinkLanding({
      targetAnchor,
      causePage,
      expandedFaq,
    });
    // Mount-only — empty deps. The cause-page slug is stable for the
    // page's lifetime; even if React re-renders we only want the event
    // once per session-page-mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/**
 * SessionStorage key prefix used to dedupe section-view events. Each
 * (cause_page, section) tuple gets its own key so a donor scrolling
 * back over a section twice in one session only fires the event once.
 */
const SECTION_VIEW_KEY_PREFIX = "dr_section_view_";

function sectionViewKey(causePage: string, section: string): string {
  return `${SECTION_VIEW_KEY_PREFIX}${causePage}::${section}`;
}

function hasFiredSectionView(causePage: string, section: string): boolean {
  if (typeof sessionStorage === "undefined") return false;
  try {
    return sessionStorage.getItem(sectionViewKey(causePage, section)) === "1";
  } catch {
    return false;
  }
}

function markFiredSectionView(causePage: string, section: string): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(sectionViewKey(causePage, section), "1");
  } catch {
    // sessionStorage quota or privacy mode — don't fail the page.
  }
}

/**
 * Set up IntersectionObserver on every element with `data-track-section`
 * inside the page. Fires cause_page_section_view exactly once per
 * (causePage, section) per session.
 *
 * Threshold 0.5 — section is considered "viewed" when at least half of
 * it is on screen. This avoids firing for sections that scroll past at
 * the edge of the viewport without genuine attention.
 */
export function useSectionViewTracking(causePage: DonationCampaign): void {
  useEffect(() => {
    if (typeof window === "undefined" || typeof IntersectionObserver === "undefined") return;

    const elements = Array.from(
      document.querySelectorAll<HTMLElement>("[data-track-section]")
    );
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const section = (entry.target as HTMLElement).dataset.trackSection;
          if (!section) continue;
          if (hasFiredSectionView(causePage, section)) {
            // Already fired; stop observing this element.
            observer.unobserve(entry.target);
            continue;
          }
          markFiredSectionView(causePage, section);
          trackCausePageSectionView({ section, causePage });
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.5 }
    );

    for (const el of elements) observer.observe(el);

    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
