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
  toDonationCampaign,
  trackCausePageSectionView,
  trackCrossCauseNavigation,
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
 * Set of all known cause-page slug roots — anchors pointing into any of
 * these (and only these) trigger cross_cause_navigation. Kept in sync with
 * src/lib/campaigns.ts; the mapping to the narrow DonationCampaign
 * vocabulary happens via toDonationCampaign().
 *
 * Why a static set instead of importing CAMPAIGNS: this module is loaded
 * on every cause page that mounts CausePageAnalytics, and pulling the
 * full campaign metadata (labels, receipt copy) just to check membership
 * would bloat the client bundle.
 */
const CAUSE_PAGE_PATHS: ReadonlySet<string> = new Set([
  "palestine",
  "qurbani",
  "zakat",
  "orphan-sponsorship",
  "cancer-care",
  "clean-water",
  "build-a-school",
  "uk-homeless",
  "sadaqah",
]);

/**
 * Document-level click delegation: when a donor on this cause page clicks
 * any anchor whose pathname starts with another cause-page slug, fire
 * cross_cause_navigation.
 *
 * Why delegation instead of per-Link instrumentation: cause pages have
 * many internal links (FAQ links, body copy, footer). Wrapping each in
 * a tracked component would be invasive and easy to miss. Listening at
 * the document level with a closure over the current causePage covers
 * 100% of clicks with zero per-link surface area.
 *
 * Excludes self-navigation (e.g. /qurbani → /qurbani#section). Only
 * fires when from ≠ to AND both are recognised cause pages.
 */
export function useCrossCauseNavigation(currentCausePage: DonationCampaign): void {
  useEffect(() => {
    if (typeof document === "undefined") return;

    const handler = (ev: MouseEvent) => {
      // Walk up from the click target to find the nearest anchor. Anchors
      // wrapping rich content (e.g. <Link><div>...</div></Link>) would
      // otherwise land their click on the inner element.
      const target = ev.target as Element | null;
      if (!target) return;
      const anchor = target.closest?.("a") as HTMLAnchorElement | null;
      if (!anchor) return;

      // Only same-origin internal links. External + new-tab clicks aren't
      // cross-cause navigation in any meaningful sense.
      if (anchor.origin !== window.location.origin) return;

      const path = anchor.pathname;
      // Strip leading /, take the first path segment.
      const firstSegment = path.replace(/^\/+/, "").split("/")[0];
      if (!CAUSE_PAGE_PATHS.has(firstSegment)) return;

      const toCausePage = toDonationCampaign(firstSegment);
      // Skip self-navigation (in-page anchor link or accidental same-page link).
      if (toCausePage === currentCausePage) return;

      // Determine the click context — the nearest data-track-section
      // ancestor, or "body" / "header" / "footer" semantic tag, or "other".
      const sectionEl = anchor.closest("[data-track-section]") as HTMLElement | null;
      let context = "body";
      if (sectionEl?.dataset.trackSection) {
        context = `${sectionEl.dataset.trackSection}_link`;
      } else if (anchor.closest("header")) {
        context = "header";
      } else if (anchor.closest("footer")) {
        context = "footer";
      }

      trackCrossCauseNavigation({
        fromCausePage: currentCausePage,
        toCausePage,
        context,
      });
    };

    document.addEventListener("click", handler, { capture: true });
    return () => document.removeEventListener("click", handler, { capture: true });
  }, [currentCausePage]);
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
