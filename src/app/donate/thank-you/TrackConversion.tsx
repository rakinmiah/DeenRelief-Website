"use client";

import { useEffect, useRef } from "react";
import { trackDonationPurchase } from "@/lib/analytics";

/**
 * Fires a GA4 `purchase` event on the donor's thank-you page view, exactly
 * once per transaction. React 18 Strict Mode double-mounts in dev, so we
 * key off the transaction_id in a ref to guarantee a single fire.
 *
 * Lives next to the page because the success state is the only place this
 * data is all in one place; shipping it in useEffect means it only runs
 * when the success UI actually renders (processing / failed states don't
 * fire a conversion).
 */
export default function TrackConversion({
  transactionId,
  value,
  currency,
  campaignSlug,
  campaignLabel,
  frequency,
  giftAidClaimed,
}: {
  transactionId: string;
  value: number;
  currency: string;
  campaignSlug: string;
  campaignLabel: string;
  frequency: "one-time" | "monthly";
  giftAidClaimed: boolean;
}) {
  const firedFor = useRef<string | null>(null);

  useEffect(() => {
    if (firedFor.current === transactionId) return;
    firedFor.current = transactionId;
    trackDonationPurchase({
      transaction_id: transactionId,
      value,
      currency,
      campaign_slug: campaignSlug,
      campaign_label: campaignLabel,
      frequency,
      gift_aid_claimed: giftAidClaimed,
    });
  }, [transactionId, value, currency, campaignSlug, campaignLabel, frequency, giftAidClaimed]);

  return null;
}
