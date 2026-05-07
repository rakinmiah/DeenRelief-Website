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
  qurbani: "Qurbani 2026",
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
  qurbani:
    "Your Qurbani is performed in accordance with Islamic guidelines, with the meat distributed locally to families in need, in shā’ Allāh.",
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

/**
 * Zakat-only pathway selector. Lets Google Ads PMax sitelinks deep-link
 * donors to /donate with a pre-selected distribution pathway, so the
 * donor lands at checkout knowing which programme their Zakat will fund.
 *
 * Pathways are informational on the /zakat page itself (see Section 4 of
 * src/app/zakat/page.tsx); URL-driven selection is the only mechanism by
 * which a donor can express a pathway preference. Non-Zakat campaigns
 * silently ignore the pathway parameter.
 */
export const ZAKAT_PATHWAYS = {
  "emergency-relief": "Emergency Relief",
  "medical-support": "Medical Support",
  "family-essentials": "Family Essentials",
  "recovery-stability": "Recovery & Stability",
} as const;

export type ZakatPathwaySlug = keyof typeof ZAKAT_PATHWAYS;

export function isValidZakatPathway(slug: string): slug is ZakatPathwaySlug {
  return slug in ZAKAT_PATHWAYS;
}

export function getZakatPathwayLabel(slug: string): string | null {
  return isValidZakatPathway(slug) ? ZAKAT_PATHWAYS[slug] : null;
}

/**
 * Resolve a pathway against the active campaign. Pathways only apply to
 * the `zakat` campaign; for everything else this returns null even if a
 * pathway slug is provided — silent fallback.
 */
export function resolvePathway(
  campaign: string | undefined,
  pathway: string | undefined
): { slug: ZakatPathwaySlug; label: string } | null {
  if (campaign !== "zakat" || !pathway) return null;
  if (!isValidZakatPathway(pathway)) return null;
  return { slug: pathway, label: ZAKAT_PATHWAYS[pathway] };
}
