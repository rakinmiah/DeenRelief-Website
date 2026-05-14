"use client";

import { useEffect, useRef } from "react";
import {
  trackBazaarViewItem,
  type BazaarPurchaseItem,
} from "@/lib/analytics";

/**
 * Tiny client mount that fires the GA4 `view_item` event once per
 * product-page load. Refs dedupe React Strict Mode double-mounts in
 * dev, and the [item.item_id] dep array means navigating to a
 * different product (Next.js client-side route swap) re-fires for
 * the new product correctly.
 *
 * Consent-gated through trackEvent — safe to mount unconditionally.
 */
export default function BazaarViewItemAnalytics({
  item,
}: {
  item: BazaarPurchaseItem;
}) {
  const lastFiredFor = useRef<string | null>(null);

  useEffect(() => {
    if (lastFiredFor.current === item.item_id) return;
    lastFiredFor.current = item.item_id;
    trackBazaarViewItem({ item });
  }, [item]);

  return null;
}
