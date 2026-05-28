import { getBannerConfig } from "@/lib/site-config";
import SiteBannerClient from "./SiteBannerClient";

/**
 * Server-rendered site-wide banner.
 *
 * Renders nothing when the banner is configured off — keeps DOM clean
 * and SEO unaffected. When active, hands off to a small client wrapper
 * that handles:
 *   - Hiding the banner on /admin/* paths (so trustees aren't shouted
 *     at by their own message)
 *   - 24h dismiss memory (localStorage)
 *
 * Banner config is read from site_config (set via /admin/social/banner).
 * Revalidation: setBannerConfig calls revalidatePath('/', 'layout') so
 * the next request re-renders this component with the latest state.
 */
export default async function SiteBanner() {
  const banner = await getBannerConfig();
  if (!banner.active || !banner.message) return null;
  return <SiteBannerClient config={banner} />;
}
