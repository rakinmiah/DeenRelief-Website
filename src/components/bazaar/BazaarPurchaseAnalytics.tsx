"use client";

import { useEffect, useRef } from "react";
import {
  hashEmailForEnhancedConversions,
  trackBazaarPurchase,
  type BazaarPurchaseItem,
} from "@/lib/analytics";

/**
 * Fires the GA4 `purchase` event for a paid bazaar order. Mounted on
 * the order confirmation page (`/bazaar/order/[sessionId]`), which
 * Stripe's success_url redirects to only after payment completes —
 * so the firing point matches the real conversion moment.
 *
 * Idempotent within a single mount via a ref so React Strict Mode's
 * double-mount in development doesn't fire two `purchase` events for
 * the same transaction. The `transaction_id` (the receipt number
 * a.k.a. DR-BZR-XXXXXXXX) is what GA4 dedupes on across sessions, so
 * even if a customer refreshes the page the same transaction_id +
 * dedupe at the GA4 side prevents counting the conversion twice.
 *
 * Enhanced Conversions: SHA-256 the customer email and attach it to
 * the event's user_data block. Same shape as the donation flow.
 *
 * Consent gate: trackEvent (the underlying primitive in analytics.ts)
 * hard-gates on analytics_storage, so this component is safe to
 * mount unconditionally — if the customer declined analytics, the
 * event simply no-ops.
 */
export default function BazaarPurchaseAnalytics({
  transactionId,
  valueGbp,
  shippingGbp,
  contactEmail,
  items,
}: {
  /** DR-BZR-XXXXXXXX human reference — used as GA4 transaction_id. */
  transactionId: string;
  /** Total paid in GBP. */
  valueGbp: number;
  /** Shipping cost in GBP (may be 0 for the over-£75 free rate). */
  shippingGbp: number;
  /** Customer email — hashed before being sent. */
  contactEmail: string | null;
  items: BazaarPurchaseItem[];
}) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;

    let cancelled = false;
    (async () => {
      const hashedEmail = await hashEmailForEnhancedConversions(contactEmail);
      if (cancelled) return;
      trackBazaarPurchase({
        transaction_id: transactionId,
        value: valueGbp,
        currency: "GBP",
        shipping: shippingGbp,
        items,
        ...(hashedEmail ? { hashed_email: hashedEmail } : {}),
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [transactionId, valueGbp, shippingGbp, contactEmail, items]);

  return null;
}
