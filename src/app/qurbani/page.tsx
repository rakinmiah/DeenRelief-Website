import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";

/**
 * /qurbani — campaign taken down post-Eid 2026.
 *
 * The donor-facing Qurbani page has been retired for the 2026 cycle.
 * This stub serves only to gracefully redirect any inbound traffic
 * (cached social posts, ad URLs, Google search results, donor
 * bookmarks) to the homepage rather than 404. SEO equity is
 * preserved via the permanent redirect.
 *
 * To bring Qurbani back for Eid 2027:
 *   • Restore the supporting components from git history
 *     (DonationForm.tsx, HeroDeadline.tsx, MiniDonationPicker.tsx,
 *     FaqAccordion.tsx, layout.tsx — last present at commit eaefc62
 *     on main, or 6167699 on claude/strange-pike-9309d5).
 *   • Update QURBANI_DEADLINE in src/lib/qurbani.ts.
 *   • Restore the page.tsx content from the same commit.
 *   • Restore the Qurbani entry in src/components/Header.tsx + the
 *     sitemap.ts route list.
 *
 * Everything else (campaign registry, products, admin display,
 * donation processing for past Qurbani records) is intentionally
 * untouched — past donors still get correct receipts on resend,
 * admin still surfaces Qurbani details on historical donations.
 */

export const metadata: Metadata = {
  title: "Deen Relief",
  robots: { index: false, follow: true },
};

export default function QurbaniPage(): never {
  permanentRedirect("/");
}
