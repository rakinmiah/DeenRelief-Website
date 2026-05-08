"use client";

import {
  useCrossCauseNavigation,
  useSectionViewTracking,
  useSitelinkLanding,
} from "@/lib/analytics-hooks";
import type { DonationCampaign } from "@/lib/analytics";

/**
 * Mounts the cause-page analytics hooks without forcing the containing
 * page to become a client component:
 *   - sitelink_landing on mount (when external deep-link with hash)
 *   - cause_page_section_view via IntersectionObserver
 *   - cross_cause_navigation via document-level click delegation
 *
 * Drop one of these into any cause page that has `data-track-section`
 * attributes on its sections:
 *
 *   <CausePageAnalytics causePage="palestine" />
 *
 * The hook implementations live in src/lib/analytics-hooks.ts; this is a
 * thin shell so server-rendered pages can mount them without inheriting
 * "use client".
 */
export default function CausePageAnalytics({
  causePage,
}: {
  causePage: DonationCampaign;
}) {
  useSitelinkLanding(causePage);
  useSectionViewTracking(causePage);
  useCrossCauseNavigation(causePage);
  return null;
}
