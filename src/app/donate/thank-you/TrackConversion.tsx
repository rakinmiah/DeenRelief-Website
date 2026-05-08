"use client";

import { useEffect, useRef } from "react";
import { trackDonationPurchase } from "@/lib/analytics";
import { readConsentCookie } from "@/lib/consent";

/**
 * Forward-loaded lifetime-value assumptions for recurring campaigns.
 *
 * Smart Bidding (Max Conversion Value) uses the GA4 `purchase.value` to
 * decide how much to bid for a click. If we report only the first month
 * (£30 for orphan sponsorship), Google undervalues the campaign by 12-24x
 * versus its actual donor LTV — and under-spends against competing
 * campaigns inside the same Ads account.
 *
 * Multipliers below are deliberately conservative (24 months, not the
 * 30-36 month optimistic estimate from comparable UK Muslim charities).
 * Under-claiming is safer than over-claiming for ad platforms — once
 * we have real retention data from the donations table, we can revise.
 *
 * Add new recurring campaigns here as they launch. Campaigns NOT in this
 * lookup fall back to the actual charge amount even when frequency is
 * monthly (silent — never throws, never over-claims for unknown campaigns).
 */
const EXPECTED_RETENTION_MONTHS: Record<string, number> = {
  "orphan-sponsorship": 24,
};

/**
 * Returns the value to report to GA4 / Google Ads. For one-time donations
 * this is the actual charge amount. For monthly donations on a campaign
 * with a known retention assumption, returns amount × retention months
 * (forward-loaded LTV). For monthly donations on unknown campaigns, falls
 * back to the actual charge — safer than guessing.
 */
function calculateLtvValue(
  amountGbp: number,
  frequency: "one-time" | "monthly",
  campaignSlug: string
): number {
  if (frequency === "one-time") return amountGbp;
  const retentionMonths = EXPECTED_RETENTION_MONTHS[campaignSlug];
  if (retentionMonths === undefined) return amountGbp;
  return amountGbp * retentionMonths;
}

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
  pathway,
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
  /** Zakat-only pathway slug; surfaced on the GA4 purchase event when set. */
  pathway?: string | null;
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

      // For recurring campaigns with a known retention assumption, the
      // value reported to GA4 is the LTV proxy (e.g. £720 for a 24-month
      // £30/month orphan sponsorship). The actual charged amount rides
      // along as `single_charge_amount` so financial reporting can
      // reconcile against Stripe. One-time donations report the actual
      // amount in both fields (and `single_charge_amount` is omitted).
      const ltvValue = calculateLtvValue(value, frequency, campaignSlug);
      const isLtvForwardLoaded = ltvValue !== value;

      trackDonationPurchase({
        transaction_id: transactionId,
        value: ltvValue,
        currency,
        campaign_slug: campaignSlug,
        campaign_label: campaignLabel,
        frequency,
        gift_aid_claimed: giftAidClaimed,
        hashed_email: hashedEmail,
        pathway: pathway ?? undefined,
        ...(isLtvForwardLoaded ? { single_charge_amount: value } : {}),
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
    pathway,
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
