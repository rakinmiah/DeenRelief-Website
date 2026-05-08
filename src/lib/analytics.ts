/**
 * Client-side analytics wrappers over gtag / dataLayer.
 *
 * Architecture:
 *   - `trackEvent` is the low-level primitive. All higher-level event
 *     wrappers below call it. It is hard-gated on the analytics_storage
 *     consent signal — if the donor declined analytics, no events fire,
 *     including the purchase macro conversion.
 *   - Higher-level wrappers (trackDonationFunnelStep, trackSitelinkLanding,
 *     trackCausePageSectionView, etc.) provide typed, schema-enforced
 *     entry points so call sites don't drift from the documented event
 *     schema. See ANALYTICS_EVENTS.md for the full event catalogue.
 *
 * The consent gate is stricter than Google Consent Mode v2's "modelled
 * conversions" pattern — Consent Mode would still let GA4 receive
 * cookieless aggregated events when analytics_storage is denied. The
 * spec for this site explicitly requires the stricter "no-op when
 * declined" behaviour, so this module hard-gates at the trackEvent
 * layer rather than relying on Google's server-side throttling.
 *
 * GA4 recommended events (purchase, view_item, begin_checkout) are used
 * where the GA4 vocabulary fits cleanly. Custom events use snake_case
 * descriptive names with parameters carrying the variation (e.g.
 * cause_page_section_view + parameter section, NOT view_palestine_form).
 */

import { readConsentCookie } from "./consent";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Has the donor granted analytics consent? Reads the dr_consent cookie
 * at call time so we always reflect the current state — donors who
 * change their mind via the "Manage cookies" footer link see the gate
 * flip immediately without a page refresh.
 */
function hasAnalyticsConsent(): boolean {
  if (typeof window === "undefined") return false;
  const c = readConsentCookie();
  return c?.analytics_storage === true;
}

/**
 * Push a named event to GA4. Hard-gated on analytics consent — no-ops
 * silently when consent is missing or declined. Logs to the browser
 * console in development for debugging; production builds skip the log.
 */
export function trackEvent(
  name: string,
  params: Record<string, unknown> = {}
): void {
  if (typeof window === "undefined") return;
  if (!hasAnalyticsConsent()) {
    if (process.env.NODE_ENV === "development") {
      console.debug(`[analytics] skipped ${name} — analytics consent not granted`, params);
    }
    return;
  }
  if (process.env.NODE_ENV === "development") {
    console.debug(`[analytics] ${name}`, params);
  }
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
  /**
   * The conversion value reported to GA4 / Google Ads. For one-time
   * donations this is the actual charge amount. For recurring donations
   * (e.g. orphan sponsorship), the caller may forward-load lifetime
   * value here so Smart Bidding doesn't underbid the campaign — see
   * `single_charge_amount` for the actual transaction amount in that case.
   */
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
  /**
   * Zakat-only distribution pathway slug (e.g. "emergency-relief"). Lets
   * the campaign team segment Zakat donations by pathway in GA4. Undefined
   * for non-Zakat donations or when no pathway was selected.
   */
  pathway?: string;
  /**
   * The actual GBP amount charged on this transaction. Diverges from
   * `value` when the caller forward-loads LTV for a recurring product.
   * Reported as a top-level event field so financial reporting can
   * reconcile against Stripe without unpacking the LTV proxy. Omit when
   * `value` already equals the actual charge (one-time donations).
   */
  single_charge_amount?: number;
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
    // Zakat pathway, if specified. Reported as a top-level event field so
    // GA4 audiences / explorations can segment without unpacking the items
    // array. Omitted entirely when no pathway was selected.
    ...(p.pathway ? { pathway: p.pathway } : {}),
    // Actual single-transaction charge amount. Set by the caller when
    // `value` has been forward-loaded with LTV (recurring products) so
    // financial reporting can reconcile against Stripe. Omitted on
    // one-time donations where `value` already equals the actual charge.
    ...(p.single_charge_amount !== undefined
      ? { single_charge_amount: p.single_charge_amount }
      : {}),
    // Enhanced Conversions: Google Ads picks this up automatically from the
    // purchase event's user_data block and uses it to match the conversion
    // back to the click even when cookies are unavailable.
    ...(p.hashed_email
      ? { user_data: { sha256_email_address: p.hashed_email } }
      : {}),
  });
}

// ─── Custom event wrappers ────────────────────────────────────────────────────
//
// Each wrapper enforces the parameter schema documented in
// ANALYTICS_EVENTS.md. Drift between the spec and the implementation
// becomes confusion at analysis time, so these are the single source of
// truth for what each event carries.

/** Donation funnel campaign vocabulary. "other" catches /palestine etc.
 *  general flows that aren't cause-tagged in the spec's funnel. */
export type DonationCampaign =
  | "palestine"
  | "qurbani"
  | "zakat"
  | "orphan-sponsorship"
  | "other";

export type DonationFrequency = "one-time" | "monthly";

/**
 * Step inside the donation funnel. `purchase_completed` fires alongside
 * the GA4 `purchase` macro — both come from the same trigger, but
 * `purchase_completed` carries the funnel-step parameter so the funnel
 * report reads cleanly end-to-end without joining two separate events.
 */
export type DonationFunnelStep =
  | "begin_checkout"
  | "payment_method_added"
  | "purchase_completed";

/**
 * Fire a donation_funnel_step event.
 *
 * Fire points (do NOT add new ones without updating ANALYTICS_EVENTS.md):
 *   begin_checkout       — donor lands on /donate (any campaign).
 *                          Engagement event in GA4 (analysis only,
 *                          NOT a Smart Bidding signal — too high-funnel).
 *   payment_method_added — Stripe Elements onChange transitions
 *                          complete: false → true. Conversion event
 *                          in GA4 (high-intent Smart Bidding signal —
 *                          card details fully entered).
 *   purchase_completed   — fired alongside the existing GA4 `purchase`
 *                          macro on /donate/thank-you. Conversion event
 *                          in GA4. Does NOT replace `purchase` — both
 *                          fire from the same trigger; purchase remains
 *                          the macro.
 */
export function trackDonationFunnelStep(opts: {
  step: DonationFunnelStep;
  campaign: DonationCampaign;
  amount: number;
  frequency: DonationFrequency;
  pathway?: string;
}): void {
  trackEvent("donation_funnel_step", {
    step: opts.step,
    campaign: opts.campaign,
    amount: opts.amount,
    frequency: opts.frequency,
    ...(opts.pathway ? { pathway: opts.pathway } : {}),
  });
}

/**
 * Fire a sitelink_landing event.
 *
 * Fired exactly once on the initial mount of a cause page when the donor
 * arrived via a Google Ads sitelink (URL contains a hash AND the page
 * is fresh-loaded AND the referrer is external). Internal SPA hash
 * navigation does NOT trigger this — only first-paint deep-links from
 * external traffic.
 *
 * Configured as Engagement event in GA4. Reveals which sitelinks are
 * pulling traffic vs which sit dormant — informs sitelink optimisation.
 */
export function trackSitelinkLanding(opts: {
  targetAnchor: string;
  causePage: DonationCampaign;
  expandedFaq?: boolean;
}): void {
  trackEvent("sitelink_landing", {
    target_anchor: opts.targetAnchor,
    cause_page: opts.causePage,
    ...(opts.expandedFaq !== undefined ? { expanded_faq: opts.expandedFaq } : {}),
  });
}

/**
 * Fire a cause_page_section_view event.
 *
 * Fired when a section of a cause page enters the viewport at ≥50%
 * visibility. Each (section, causePage) tuple fires at most ONCE per
 * session — repeat scrolls are suppressed via sessionStorage. Sections
 * are wired by adding `data-track-section="<name>"` to the JSX of the
 * relevant <section>. The hook in `useSectionViewTracking()` reads
 * those attributes and sets up the IntersectionObserver.
 *
 * Configured as Engagement event in GA4.
 */
export function trackCausePageSectionView(opts: {
  section: string;
  causePage: DonationCampaign;
}): void {
  trackEvent("cause_page_section_view", {
    section: opts.section,
    cause_page: opts.causePage,
  });
}
