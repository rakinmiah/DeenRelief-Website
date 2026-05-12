/**
 * Money formatting utilities for the Bazaar.
 *
 * Lives in its own server-safe module (no "use client" directive) so both
 * server-rendered product pages and client cart UI can import the same
 * helper. Source-of-truth for "£X.XX" rendering across the shop.
 */

/** Format pence as "£X.XX". */
export function formatPence(pence: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(pence / 100);
}

/**
 * Map the chosen shipping amount (from the Stripe Checkout Session)
 * to the Royal Mail service the customer selected.
 *
 * Why amount-matching: at checkout time we expose a fixed set of
 * shipping_options (see /api/bazaar/checkout). The customer picks
 * one; Stripe echoes back only the chosen amount in
 * session.shipping_cost.amount_total. We could expand the
 * shipping_rate to read its metadata, but the amounts are
 * configured by us and won't drift mid-session, so a direct map
 * is robust enough.
 *
 * Keep the amounts in sync with TRACKED_48_PENCE /
 * TRACKED_24_UPGRADE_PENCE in the checkout route.
 *
 * Returns null for any amount that doesn't match a known rate —
 * the caller decides how to display the unknown case (typically
 * "Standard" or a dash).
 */
export type BazaarShippingService =
  | "tracked-48"
  | "tracked-24"
  | "special-delivery";

const TRACKED_48_PENCE = 399;
const TRACKED_24_UPGRADE_PENCE = 499;

export function deriveServiceFromShippingPence(
  shippingPence: number
): BazaarShippingService | null {
  // Free shipping is the over-£75 Tracked 48 offer — same service,
  // zero charge to the customer.
  if (shippingPence === 0) return "tracked-48";
  if (shippingPence === TRACKED_48_PENCE) return "tracked-48";
  if (shippingPence === TRACKED_24_UPGRADE_PENCE) return "tracked-24";
  return null;
}

/** Short human label for the order list table. */
export const BAZAAR_SERVICE_SHORT_LABEL: Record<BazaarShippingService, string> =
  {
    "tracked-48": "Tracked 48",
    "tracked-24": "Tracked 24",
    "special-delivery": "Special Delivery",
  };

/** Long-form label used on the detail page + mark-shipped form. */
export const BAZAAR_SERVICE_FULL_LABEL: Record<BazaarShippingService, string> =
  {
    "tracked-48": "Royal Mail Tracked 48",
    "tracked-24": "Royal Mail Tracked 24",
    "special-delivery": "Royal Mail Special Delivery",
  };
