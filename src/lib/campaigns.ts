/**
 * Campaign allow-list and human-readable labels.
 *
 * Used by:
 *   - /donate page to display the selected campaign
 *   - /api/donations/create-intent to validate the campaign slug
 *   - donations.campaign + donations.campaign_label written on every row
 *
 * Adding a new campaign? Register it here first, then create the page under
 * src/app/<slug>/page.tsx. Any campaign slug not in this map is rejected by
 * the API route.
 */

export const CAMPAIGNS = {
  palestine: "Palestine Emergency Relief",
  "cancer-care": "Cancer Care",
  "orphan-sponsorship": "Orphan Sponsorship",
  "build-a-school": "Build a School",
  "clean-water": "Clean Water",
  "uk-homeless": "UK Homeless",
  zakat: "Zakat",
  sadaqah: "Sadaqah",
  general: "General Donation",
} as const;

export type CampaignSlug = keyof typeof CAMPAIGNS;

export function isValidCampaign(slug: string): slug is CampaignSlug {
  return slug in CAMPAIGNS;
}

export function getCampaignLabel(slug: string): string {
  return isValidCampaign(slug) ? CAMPAIGNS[slug] : CAMPAIGNS.general;
}

/** £5 minimum, £10,000 upper sanity bound (pence). */
export const MIN_AMOUNT_PENCE = 500;
export const MAX_AMOUNT_PENCE = 10_000_00;
