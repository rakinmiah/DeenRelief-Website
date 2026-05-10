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
