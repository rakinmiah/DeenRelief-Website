import Link from "next/link";
import { CAMPAIGNS } from "@/lib/campaigns";
import { getCampaignReceiptMessage } from "@/lib/campaigns";
import { CAMPAIGN_LANDING_PATHS } from "@/lib/short-links";
import { getFeaturedCampaign } from "@/lib/site-config";

/**
 * Small horizontal callout strip on the homepage surfacing the
 * currently-featured campaign chosen by the SMM in /admin/social/featured.
 *
 * Renders nothing when no featured campaign is set — homepage looks
 * exactly as it does today. When set, slots a clean strip above the
 * existing FeaturedCampaign (Palestine-specific) block telling donors
 * "this is what we're actively pushing this week" with a single
 * tap-through to the campaign's landing page.
 *
 * The campaign's short blurb comes from CAMPAIGN_RECEIPT_MESSAGE
 * (already maintained in src/lib/campaigns.ts for the receipt email)
 * — single source of truth for the per-campaign one-line description.
 */
export default async function FeaturedCampaignCallout() {
  const slug = await getFeaturedCampaign();
  if (!slug) return null;

  const label = CAMPAIGNS[slug];
  const destination = CAMPAIGN_LANDING_PATHS[slug];
  // Trim the receipt-style trailing ", in shā' Allāh." for cleaner
  // marketing copy on the homepage. The receipt message is full
  // prayer-form; the callout is a confidence beat.
  const blurb = getCampaignReceiptMessage(slug).replace(
    /,?\s*in shā[’']\s*All[āa]h\.?$/,
    "."
  );

  return (
    <section className="bg-cream py-6 md:py-7">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative bg-white border border-charcoal/10 rounded-2xl px-5 md:px-7 py-5 md:py-6 flex items-center justify-between gap-4 md:gap-6 flex-wrap shadow-sm">
          <div className="flex-1 min-w-0">
            <span className="block text-[10px] font-bold tracking-[0.18em] uppercase text-amber-dark mb-1.5">
              Featured this week
            </span>
            <h2 className="text-xl md:text-2xl font-heading font-bold text-charcoal leading-tight">
              {label}
            </h2>
            <p className="text-charcoal/70 text-sm md:text-[15px] mt-1.5 leading-relaxed">
              {blurb}
            </p>
          </div>
          <Link
            href={`${destination}?utm_source=homepage&utm_medium=featured_callout&utm_campaign=${slug}`}
            className="shrink-0 inline-flex items-center gap-1.5 px-5 py-3 rounded-full bg-charcoal text-white text-sm font-semibold hover:bg-charcoal/85 transition-colors"
          >
            Donate now
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
