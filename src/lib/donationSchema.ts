/**
 * Structured-data helper for Deen Relief donation/campaign pages.
 *
 * Produces a single WebPage JSON-LD block that nests:
 *   - FundraisingEvent  →  describes the appeal, with optional location + organizer
 *   - DonateAction      →  the canonical "how to donate" action, pointing at /donate
 *
 * This signals to Google (and other consumers) that the page is a donation
 * landing page for a specific cause, run by a UK-registered NGO. It feeds both
 * ad Quality Score and organic rich-result eligibility.
 */

const SITE_URL = "https://deenrelief.org";
const ORG_ID = `${SITE_URL}/#organization`;
const ORG_NAME = "Deen Relief";
const CHARITY_NO = "1158608";
const DEFAULT_CURRENCY = "GBP";

export interface DonationLocation {
  /** Human-readable name shown to users/SERPs, e.g. "Gaza" or "Brighton". */
  name: string;
  /** Optional administrative region, e.g. "Gaza Strip" or "East Sussex". */
  region?: string;
  /** ISO 3166-1 alpha-2 country code, e.g. "PS", "BD", "TR", "GB". */
  country: string;
}

export interface DonationPageConfig {
  /** URL slug — used as the campaign identifier in the donate link. */
  slug: string;
  /** Canonical path starting with "/", e.g. "/palestine". */
  canonicalPath: string;
  /** The page's <title>, reused as schema.name. */
  pageName: string;
  /** The page's meta description, reused as schema.description. */
  pageDescription: string;
  /** Short name of the fundraising appeal, e.g. "Palestine Emergency Appeal". */
  fundraisingName: string;
  /** One-sentence description of what the fundraising does. */
  fundraisingDescription: string;
  /**
   * Optional location. Omit for non-geographic causes (Zakat, Sadaqah).
   */
  location?: DonationLocation;
  /** Minimum donation in the currency below. Default 1. */
  minPrice?: number;
  /** ISO-4217 currency. Default "GBP". */
  currency?: string;
  /** ISO-8601 date string (YYYY-MM-DD) for the last meaningful content update.
   *  Google uses this as a freshness signal. Defaults to today's date at build time. */
  dateModified?: string;
}

export function buildDonationPageSchema(config: DonationPageConfig) {
  const {
    slug,
    canonicalPath,
    pageName,
    pageDescription,
    fundraisingName,
    fundraisingDescription,
    location,
    minPrice = 1,
    currency = DEFAULT_CURRENCY,
    dateModified = new Date().toISOString().split("T")[0],
  } = config;

  const pageUrl = `${SITE_URL}${canonicalPath}`;

  const organizer = {
    "@type": "NGO",
    "@id": ORG_ID,
    name: ORG_NAME,
    url: SITE_URL,
    identifier: CHARITY_NO,
    logo: `${SITE_URL}/images/logo.webp`,
    address: {
      "@type": "PostalAddress",
      addressCountry: "GB",
    },
  } as const;

  const fundraisingEvent: Record<string, unknown> = {
    "@type": "FundraisingEvent",
    name: fundraisingName,
    description: fundraisingDescription,
    organizer,
  };

  if (location) {
    fundraisingEvent.location = {
      "@type": "Place",
      name: location.name,
      address: {
        "@type": "PostalAddress",
        ...(location.region ? { addressRegion: location.region } : {}),
        addressCountry: location.country,
      },
    };
  }

  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${pageUrl}#webpage`,
    url: pageUrl,
    name: pageName,
    description: pageDescription,
    dateModified,
    inLanguage: "en-GB",
    isPartOf: {
      "@type": "WebSite",
      name: ORG_NAME,
      url: SITE_URL,
    },
    about: fundraisingEvent,
    potentialAction: {
      "@type": "DonateAction",
      name: `Donate to ${fundraisingName}`,
      description: fundraisingDescription,
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/donate?campaign=${slug}&amount={amount}&frequency={frequency}`,
        actionPlatform: [
          "http://schema.org/DesktopWebPlatform",
          "http://schema.org/MobileWebPlatform",
        ],
      },
      "query-input": [
        {
          "@type": "PropertyValueSpecification",
          valueName: "amount",
          valueRequired: false,
        },
        {
          "@type": "PropertyValueSpecification",
          valueName: "frequency",
          valueRequired: false,
        },
      ],
      recipient: {
        "@type": "NGO",
        "@id": ORG_ID,
        name: ORG_NAME,
        url: SITE_URL,
        identifier: CHARITY_NO,
      },
      priceSpecification: {
        "@type": "PriceSpecification",
        priceCurrency: currency,
        minPrice,
      },
    },
  };
}
