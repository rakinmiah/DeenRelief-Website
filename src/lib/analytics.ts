/**
 * Thin client-side wrapper over gtag / dataLayer.
 *
 * `trackEvent` is safe to call regardless of whether GA4 is actually
 * loaded — it always pushes to window.dataLayer. When GA4 is loaded and
 * consent is granted, GA4 consumes the event. When it isn't, the event
 * sits harmlessly in the dataLayer array. That way feature code doesn't
 * need to know the state of the GA4 install.
 *
 * We use the GA4 `purchase` event for donations so the new property
 * auto-recognises it as a conversion with minimal config — `value`,
 * `currency`, `transaction_id`, `items[]` are the standard fields.
 */

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/** Push a named event to the dataLayer with typed params. */
export function trackEvent(
  name: string,
  params: Record<string, unknown> = {}
): void {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: name, ...params });
  // Also call gtag directly if present — GA4 prefers gtag('event', ...)
  // over dataLayer.push for attribution parity.
  if (typeof window.gtag === "function") {
    window.gtag("event", name, params);
  }
}

export interface PurchaseItem {
  item_id: string;
  item_name: string;
  item_category?: string;
  price?: number;
  quantity?: number;
}

export interface DonationPurchaseParams {
  transaction_id: string;
  value: number;
  currency: string;
  campaign_slug: string;
  campaign_label: string;
  frequency: "one-time" | "monthly";
  gift_aid_claimed: boolean;
  /**
   * Hashed donor email (SHA-256 hex of lowercased/trimmed email) for
   * Enhanced Conversions. Only include when the donor has granted
   * ad_user_data consent. Undefined when absent or consent missing.
   */
  hashed_email?: string;
}

/**
 * Fire a GA4-standard `purchase` event for a completed donation. Uses one
 * `item` representing the campaign so Google Ads can segment by campaign.
 * For monthly donations, `value` is the first-month amount — LTV logic
 * belongs to whatever reports on the donations table, not the pixel.
 */
export function trackDonationPurchase(p: DonationPurchaseParams): void {
  const item: PurchaseItem = {
    item_id: p.campaign_slug,
    item_name: p.campaign_label,
    item_category: p.frequency === "monthly" ? "Monthly donation" : "One-time donation",
    price: p.value,
    quantity: 1,
  };
  trackEvent("purchase", {
    transaction_id: p.transaction_id,
    value: p.value,
    currency: p.currency,
    affiliation: "Deen Relief",
    gift_aid_claimed: p.gift_aid_claimed,
    frequency: p.frequency,
    campaign_slug: p.campaign_slug,
    items: [item],
    // Enhanced Conversions: Google Ads picks this up automatically from the
    // purchase event's user_data block and uses it to match the conversion
    // back to the click even when cookies are unavailable.
    ...(p.hashed_email
      ? { user_data: { sha256_email_address: p.hashed_email } }
      : {}),
  });
}
