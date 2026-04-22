"use client";

import { useEffect, useRef } from "react";
import { trackDonationPurchase } from "@/lib/analytics";
import { readConsentCookie } from "@/lib/consent";

/**
 * Fires a GA4 `purchase` event on the donor's thank-you page view, exactly
 * once per transaction. React 18 Strict Mode double-mounts in dev, so we
 * key off the transaction_id in a ref to guarantee a single fire.
 *
 * Enhanced Conversions:
 *   When the donor granted ad_user_data consent AND we have their email,
 *   hash it client-side with SubtleCrypto (SHA-256) and include as
 *   user_data on the purchase event. Google Ads uses this to match the
 *   conversion back to the click even when third-party cookies are
 *   unavailable. Consent-denied → skip hashing, skip user_data; the base
 *   purchase event still fires for aggregate measurement.
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
  email,
}: {
  transactionId: string;
  value: number;
  currency: string;
  campaignSlug: string;
  campaignLabel: string;
  frequency: "one-time" | "monthly";
  giftAidClaimed: boolean;
  /** Donor email for Enhanced Conversions. Hashed client-side before send. */
  email?: string | null;
}) {
  const firedFor = useRef<string | null>(null);

  useEffect(() => {
    if (firedFor.current === transactionId) return;
    firedFor.current = transactionId;

    (async () => {
      // Only hash + pass user_data when the donor explicitly granted
      // ad_user_data. Without consent the base event still fires.
      const consent = readConsentCookie();
      const canUseEnhancedConversions = consent?.ad_user_data === true;
      let hashedEmail: string | undefined;
      if (canUseEnhancedConversions && email) {
        hashedEmail = await sha256Hex(email.trim().toLowerCase());
      }

      trackDonationPurchase({
        transaction_id: transactionId,
        value,
        currency,
        campaign_slug: campaignSlug,
        campaign_label: campaignLabel,
        frequency,
        gift_aid_claimed: giftAidClaimed,
        hashed_email: hashedEmail,
      });
    })();
  }, [
    transactionId,
    value,
    currency,
    campaignSlug,
    campaignLabel,
    frequency,
    giftAidClaimed,
    email,
  ]);

  return null;
}

/** Hex-encoded SHA-256. Returns undefined if SubtleCrypto is unavailable. */
async function sha256Hex(input: string): Promise<string | undefined> {
  try {
    const buf = new TextEncoder().encode(input);
    const digest = await crypto.subtle.digest("SHA-256", buf);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return undefined;
  }
}
