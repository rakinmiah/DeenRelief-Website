import { getFeaturedCampaign } from "@/lib/site-config";
import { getCampaignHero, DEFAULT_HERO } from "@/lib/campaign-hero";
import FeaturedCampaign from "./FeaturedCampaign";

/**
 * Server wrapper that resolves the SMM-chosen featured campaign
 * (/admin/social/featured) into the homepage donation hero.
 *
 * Resolution:
 *   - featured campaign with hero content  → that campaign's hero
 *   - featured campaign WITHOUT hero content (e.g. retired Qurbani)
 *       → DEFAULT_HERO (Palestine); FeaturedCampaignCallout surfaces
 *         the choice as a strip instead
 *   - nothing featured                      → DEFAULT_HERO (Palestine)
 *
 * Reads the featured slug from site_config (same source the callout
 * and /donate pre-select already use).
 */
export default async function FeaturedCampaignSection() {
  const slug = await getFeaturedCampaign();
  const hero = getCampaignHero(slug) ?? DEFAULT_HERO;
  return <FeaturedCampaign hero={hero} />;
}
