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

/**
 * Short, campaign-specific gratitude line used in the donation receipt email.
 * Keep it one sentence, concrete about where the gift goes, and in the
 * "Proof & Proximity" voice — dignified, not inflated. No impact percentages
 * or hard guarantees (funds are directed to the cause, overheads still apply).
 */
const CAMPAIGN_RECEIPT_MESSAGE: Record<CampaignSlug, string> = {
  palestine:
    "Your gift reaches families in Gaza and across the occupied territories — food, water, and medical aid where the need is most urgent, in shā’ Allāh.",
  "cancer-care":
    "Your gift helps families facing cancer cover what treatment doesn’t — housing near hospitals, transport, and daily essentials, in shā’ Allāh.",
  "orphan-sponsorship":
    "Your gift supports an orphaned child with food, shelter, and the chance to stay in school, in shā’ Allāh.",
  "build-a-school":
    "Your gift goes toward classrooms, teachers, and learning materials for children who otherwise wouldn’t have them, in shā’ Allāh.",
  "clean-water":
    "Your gift helps bring a clean, lasting water source to a community that’s been carrying it from miles away, in shā’ Allāh.",
  "uk-homeless":
    "Your gift supports people sleeping rough here in the UK — a hot meal, warm clothes, and a route off the streets, in shā’ Allāh.",
  zakat:
    "Your Zakat reaches those eligible under the eight asnaf — delivered carefully and with full accountability, in shā’ Allāh.",
  sadaqah:
    "Your Sadaqah supports whoever needs it most — the ongoing, quiet work that rarely makes headlines, in shā’ Allāh.",
  general:
    "Your donation is directed wherever the need is greatest, in shā’ Allāh.",
};

export function getCampaignReceiptMessage(slug: string): string {
  return isValidCampaign(slug)
    ? CAMPAIGN_RECEIPT_MESSAGE[slug]
    : CAMPAIGN_RECEIPT_MESSAGE.general;
}

/** £5 minimum, £10,000 upper sanity bound (pence). */
export const MIN_AMOUNT_PENCE = 500;
export const MAX_AMOUNT_PENCE = 10_000_00;
