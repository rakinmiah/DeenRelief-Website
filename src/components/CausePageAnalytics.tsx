"use client";

import {
  useSectionViewTracking,
  useSitelinkLanding,
} from "@/lib/analytics-hooks";
import type { DonationCampaign } from "@/lib/analytics";

/**
 * Mounts the two cause-page analytics hooks (sitelink_landing on mount +
 * cause_page_section_view via IntersectionObserver) without forcing the
 * containing page to become a client component.
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
  return null;
}
