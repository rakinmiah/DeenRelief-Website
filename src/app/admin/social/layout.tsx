import type { ReactNode } from "react";
import { requireSocialSectionAccess } from "@/lib/admin-session";

/**
 * Server guard for the whole Social section. The /admin/social/* area is
 * restricted to the single ops account (info@deenrelief.org) — any other
 * signed-in user is redirected to a safe landing before the page renders.
 * This is the real boundary; the nav-hiding in AdminShell is UX only.
 *
 * Transparent wrapper: it adds no markup, so the section's own full-bleed
 * editors / pages render exactly as before.
 */
export default async function SocialSectionLayout({ children }: { children: ReactNode }) {
  await requireSocialSectionAccess();
  return <>{children}</>;
}
