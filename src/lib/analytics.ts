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
 * Hash an email for Enhanced Conversions for Web (Google Ads).
 *
 * Normalisation matches Google's published spec exactly:
 *   1. Trim leading/trailing whitespace.
 *   2. Lowercase the entire string.
 *   3. SHA-256 the bytes of the resulting UTF-8 string.
 *   4. Hex-encode (lowercase, 64 chars).
 *
 * Privacy property: the plaintext email never leaves the browser. Only
 * the hex digest is attached to the GA4 purchase event's `user_data`
 * block, which Google Ads then uses to match the conversion against
 * signed-in Google identities for cross-device / cross-session lift.
 *
 * Behaviour contract — the call site must NOT need a try/catch:
 *   - Empty / whitespace-only / nullish input → `undefined`. (We never
 *     hash an empty string. Without this guard, SubtleCrypto happily
 *     returns the SHA-256 of "" — a fingerprint of "no email" — which
 *     Google Ads would treat as a real user_data identifier.)
 *   - Already-hashed-looking input (lowercase 64-char hex) → returned
 *     as-is. Defensive: if some upstream caller hands us a value that
 *     was already hashed (e.g. by a server-side step that pre-hashes
 *     for storage), double-hashing would silently destroy attribution.
 *     Real emails contain `@` and so cannot match this pattern.
 *   - SubtleCrypto unavailable / any thrown error → `undefined`. The
 *     caller drops the user_data field from the purchase event; the
 *     base conversion still records, just without EC lift.
 *
 * Async because SubtleCrypto.digest returns a Promise.
 */
export async function hashEmailForEnhancedConversions(
  rawEmail: string | null | undefined
): Promise<string | undefined> {
  if (!rawEmail) return undefined;
  const normalised = rawEmail.trim().toLowerCase();
  if (!normalised) return undefined;

  // Idempotency guard. /^[0-9a-f]{64}$/ never matches a real email
  // (every email contains "@") so this only fires on already-hashed
  // input. Cheaper than re-hashing and prevents double-hash bugs.
  if (/^[0-9a-f]{64}$/.test(normalised)) return normalised;

  try {
    const subtle = globalThis.crypto?.subtle;
    if (!subtle) return undefined;
    const buf = new TextEncoder().encode(normalised);
    const digest = await subtle.digest("SHA-256", buf);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return undefined;
  }
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

/** Donation funnel campaign vocabulary. "other" buckets all non-priority
 *  flows (cancer-care, clean-water, build-a-school, uk-homeless, sadaqah,
 *  general donate) so the four primary cause pages stay segmentable in
 *  GA4 while the long tail rolls up cleanly. */
export type DonationCampaign =
  | "palestine"
  | "qurbani"
  | "zakat"
  | "orphan-sponsorship"
  | "other";

/**
 * Map any CampaignSlug-ish string (including "general", "cancer-care",
 * etc.) to the DonationCampaign vocabulary used in funnel events.
 *
 * Why a narrow vocabulary: GA4 explorations get unwieldy when every
 * campaign is its own value. The four cause pages with paid acquisition
 * + dedicated audit docs stay segmentable; everything else rolls up to
 * "other" and is broken down at the campaign_slug parameter level if
 * needed (which the GA4 `purchase` event already carries).
 */
export function toDonationCampaign(slug: string): DonationCampaign {
  switch (slug) {
    case "palestine":
    case "qurbani":
    case "zakat":
    case "orphan-sponsorship":
      return slug;
    default:
      return "other";
  }
}

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
 * Fire a donation_form_abandoned event.
 *
 * Fired on `pagehide` (or `beforeunload` fallback) when the donor leaves
 * /donate without completing — i.e. without the redirect to thank-you.
 * The `transport: 'beacon'` flag tells gtag to use navigator.sendBeacon
 * under the hood, which is the only reliable transport during page
 * unload (XHR / fetch are torn down before they flush).
 *
 * `deepestStep` is the furthest funnel step the donor reached during
 * this checkout mount. `secondsOnForm` is the time elapsed from
 * begin_checkout to the unload — a coarse engagement signal.
 *
 * Configured as Engagement event in GA4. Pairs with the funnel report
 * to surface "donors who reached payment_method_added but didn't
 * complete" — the highest-leverage retargeting cohort.
 */
export function trackDonationFormAbandoned(opts: {
  campaign: DonationCampaign;
  amount: number;
  frequency: DonationFrequency;
  deepestStep: DonationFunnelStep;
  secondsOnForm: number;
  pathway?: string;
}): void {
  trackEvent("donation_form_abandoned", {
    campaign: opts.campaign,
    amount: opts.amount,
    frequency: opts.frequency,
    deepest_step: opts.deepestStep,
    seconds_on_form: opts.secondsOnForm,
    ...(opts.pathway ? { pathway: opts.pathway } : {}),
    // Beacon transport is the only one that survives page unload —
    // gtag forwards this to navigator.sendBeacon when set.
    transport: "beacon",
  });
}

/**
 * Fire a cross_cause_navigation event.
 *
 * Fired when a donor clicks an internal Link from one cause page to
 * another (e.g. Palestine FAQ → Zakat page). Reveals which causes
 * cross-pollinate and informs internal cross-link placement.
 *
 * Configured as Engagement event in GA4.
 */
export function trackCrossCauseNavigation(opts: {
  fromCausePage: DonationCampaign;
  toCausePage: DonationCampaign;
  context: string;
}): void {
  trackEvent("cross_cause_navigation", {
    from_cause_page: opts.fromCausePage,
    to_cause_page: opts.toCausePage,
    context: opts.context,
  });
}

/**
 * Fire a faq_expanded event.
 *
 * Fired on every FAQ accordion open. Reveals which questions block
 * donations (and conversely, which copy isn't being read). Configured
 * as Engagement event in GA4.
 *
 * `faqSlug` is the stable slug attribute when the FAQ has one
 * (configured via FAQ data). Falls back to the question's index in the
 * list when no slug is available — combine with `cause_page` for a
 * unique identifier.
 */
export function trackFaqExpanded(opts: {
  causePage: DonationCampaign;
  faqSlug?: string;
  faqIndex: number;
}): void {
  trackEvent("faq_expanded", {
    cause_page: opts.causePage,
    faq_index: opts.faqIndex,
    ...(opts.faqSlug ? { faq_slug: opts.faqSlug } : {}),
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

/**
 * Fire an engaged_session event.
 *
 * Fired exactly ONCE per session when the donor crosses ALL THREE
 * engagement thresholds:
 *   - 60 seconds cumulative on-site (across pages, foreground only)
 *   - 2 distinct (cause_page, section) tuples viewed
 *   - 75% scroll depth reached on any single page
 *
 * Higher-fidelity than GA4's default 10-second engagement signal —
 * filters out skim-readers and bot traffic. Used in audiences for
 * remarketing (donors who genuinely engaged but didn't convert).
 *
 * Configured as Engagement event in GA4.
 */
export function trackEngagedSession(opts: {
  cumulativeSeconds: number;
  sectionsViewed: number;
  maxScrollPct: number;
}): void {
  trackEvent("engaged_session", {
    cumulative_seconds: opts.cumulativeSeconds,
    sections_viewed: opts.sectionsViewed,
    max_scroll_pct: opts.maxScrollPct,
  });
}
