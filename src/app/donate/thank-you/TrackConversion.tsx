"use client";

import { useEffect, useRef } from "react";
import {
  toDonationCampaign,
  trackDonationFunnelStep,
  trackDonationPurchase,
} from "@/lib/analytics";
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

export type DonorDetails = {
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  addressLine1?: string | null;
  city?: string | null;
  postcode?: string | null;
  /** ISO 3166-1 alpha-2. Defaults to GB. */
  country?: string | null;
};

const GA4_ID = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID?.trim() || undefined;

/* ── Once-per-payment guard ──────────────────────────────────────────────
 * localStorage (survives tab close, so a donor returning to the page days
 * later doesn't count twice) with a sessionStorage fallback for browsers
 * that block localStorage. GA4 also de-dupes on transaction_id; this is the
 * belt to that braces. */
const SENT_PREFIX = "dr_purchase_sent:";

function alreadySent(id: string): boolean {
  try {
    if (window.localStorage.getItem(SENT_PREFIX + id)) return true;
  } catch {}
  try {
    if (window.sessionStorage.getItem(SENT_PREFIX + id)) return true;
  } catch {}
  return false;
}

function markSent(id: string): void {
  const stamp = String(Date.now());
  try {
    window.localStorage.setItem(SENT_PREFIX + id, stamp);
  } catch {}
  try {
    window.sessionStorage.setItem(SENT_PREFIX + id, stamp);
  } catch {}
}

/* ── Enhanced Conversions user_data ──────────────────────────────────── */

/** UK-first E.164 normalisation; undefined when we can't be confident. */
function toE164(raw: string | null | undefined, country: string): string | undefined {
  if (!raw) return undefined;
  let p = raw.replace(/[^\d+]/g, "");
  if (p.startsWith("00")) p = "+" + p.slice(2);
  if (!p.startsWith("+") && country === "GB" && p.startsWith("0")) {
    p = "+44" + p.slice(1);
  }
  if (p.startsWith("+440")) p = "+44" + p.slice(4); // "+44 (0)7…"
  return /^\+[1-9]\d{7,14}$/.test(p) ? p : undefined;
}

function clean(v: string | null | undefined): string | undefined {
  const t = v?.trim();
  return t ? t : undefined;
}

/**
 * Plain (unhashed) values in Google's user_data shape. gtag normalises and
 * SHA-256 hashes them in the browser before anything is sent, and only sends
 * them when ad_user_data consent is granted.
 */
function buildUserData(d: DonorDetails): Record<string, unknown> | null {
  const country = clean(d.country)?.toUpperCase() || "GB";
  const userData: Record<string, unknown> = {};
  const email = clean(d.email)?.toLowerCase();
  const phone = toE164(d.phone, country);
  if (email) userData.email = email;
  if (phone) userData.phone_number = phone;
  const first_name = clean(d.firstName);
  const last_name = clean(d.lastName);
  const postal_code = clean(d.postcode);
  // Address matching needs first + last name + postcode + country at minimum.
  if (first_name && last_name && postal_code) {
    const street = clean(d.addressLine1);
    const city = clean(d.city);
    userData.address = {
      first_name,
      last_name,
      ...(street ? { street } : {}),
      ...(city ? { city } : {}),
      postal_code,
      country,
    };
  }
  return Object.keys(userData).length ? userData : null;
}

/* ── Wait for the GA4 page_view ──────────────────────────────────────────
 * ConsentBootstrap's gtag-init is a next/script `afterInteractive`, injected
 * AFTER hydration — but this component's effect runs DURING hydration. So
 * without waiting, `purchase` was queued before gtag('js') / gtag('config')
 * and reached GA4 ahead of (or without) the session's page_view, which is
 * why most donation revenue showed "(not set)" as landing page.
 *
 * Resolve once the GA4 config is queued AND gtag.js has processed the queue
 * up to it (a 'get' callback only runs after that). Fallback timeout so an
 * ad blocker or slow network never loses the event entirely. */
function whenGtagReady(measurementId: string | undefined, timeoutMs = 5000): Promise<void> {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        resolve();
      }
    };
    if (!measurementId) return finish();
    const started = Date.now();
    const poll = () => {
      const dl = window.dataLayer;
      const configured =
        Array.isArray(dl) &&
        dl.some((entry) => {
          const a = entry as ArrayLike<unknown> | null;
          return !!a && a[0] === "config" && a[1] === measurementId;
        });
      if (configured && typeof window.gtag === "function") {
        window.gtag("get", measurementId, "session_id", finish);
        setTimeout(finish, Math.max(0, timeoutMs - (Date.now() - started)));
        return;
      }
      if (Date.now() - started >= timeoutMs) return finish();
      setTimeout(poll, 100);
    };
    poll();
  });
}

/**
 * Fires the GA4 `purchase` event on the donor's thank-you page, exactly once
 * per transaction — across Strict Mode double-mounts (ref), refreshes and
 * later revisits (storage guard).
 *
 * Only rendered by page.tsx when the server-retrieved intent status is
 * `succeeded` — processing / failed states never fire a conversion.
 *
 * Ordering: waits for gtag-init + GA4 page_view (see whenGtagReady), then
 * sets Enhanced Conversions user_data (consent-gated on ad_user_data), then
 * fires purchase.
 */
export default function TrackConversion({
  transactionId,
  value,
  currency,
  campaignSlug,
  campaignLabel,
  frequency,
  giftAidClaimed,
  donor,
  pathway,
}: {
  transactionId: string;
  value: number;
  currency: string;
  campaignSlug: string;
  campaignLabel: string;
  frequency: "one-time" | "monthly";
  giftAidClaimed: boolean;
  /** Donor details for Enhanced Conversions. Hashed by gtag before send. */
  donor?: DonorDetails | null;
  /** Zakat-only pathway slug; surfaced on the GA4 purchase event when set. */
  pathway?: string | null;
}) {
  const firedFor = useRef<string | null>(null);

  useEffect(() => {
    if (firedFor.current === transactionId) return;
    firedFor.current = transactionId;
    if (alreadySent(transactionId)) return;

    void whenGtagReady(GA4_ID).then(() => {
      // Re-check: another tab may have sent it while we waited.
      if (alreadySent(transactionId)) return;
      markSent(transactionId);

      // Enhanced Conversions only with explicit ad_user_data consent. gtag
      // itself also withholds user_data while ad_user_data is denied.
      const consent = readConsentCookie();
      if (consent?.ad_user_data === true && donor) {
        const userData = buildUserData(donor);
        if (userData && typeof window.gtag === "function") {
          window.gtag("set", "user_data", userData);
        }
      }

      // For recurring campaigns with a known retention assumption, the
      // value reported to GA4 is the LTV proxy (e.g. £720 for a 24-month
      // £30/month orphan sponsorship). The actual charged amount rides
      // along as `single_charge_amount` so financial reporting can
      // reconcile against Stripe.
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
        pathway: pathway ?? undefined,
        ...(isLtvForwardLoaded ? { single_charge_amount: value } : {}),
      });

      // Funnel terminator. `amount` is the actual charge (not the LTV proxy)
      // because the funnel report is about donor behaviour, not bid signals.
      trackDonationFunnelStep({
        step: "purchase_completed",
        campaign: toDonationCampaign(campaignSlug),
        amount: value,
        frequency,
        ...(pathway ? { pathway } : {}),
      });
    });
    // Keyed on transactionId: one fire per payment. Other props are derived
    // from the same server-side lookup and don't change for a given id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactionId]);

  return null;
}
