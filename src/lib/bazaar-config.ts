/**
 * Bazaar configuration — single source of truth for the operational
 * details that thread through emails, the returns policy, the order
 * confirmation page, and Stripe metadata.
 *
 * Centralised here so when the client provides a real returns address
 * (post-inventory-arrival) or splits the email sender (post-launch
 * results), it's one constant change rather than search-and-replace
 * across a dozen pages.
 *
 * Architecture decision: Bazaar trades through the existing charity
 * Stripe account under HMRC's small-trading exemption (Path A). Income
 * separation between donations and bazaar orders is enforced via:
 *   1. STRIPE METADATA — every bazaar Stripe transaction carries
 *      `source: "bazaar"`. Donation transactions have no `source` key.
 *      Accountant filters Stripe Dashboard / CSV exports by metadata.
 *   2. SUPABASE TABLES — bazaar lives in `bazaar_*` tables, donations
 *      in the existing `donations` + `donors` tables. `donors` is the
 *      one shared table — same person, may donate AND buy.
 *   3. EMAIL SENDER — currently info@deenrelief.org for both, will
 *      split to bazaar@... once revenue justifies the operational
 *      separation.
 *   4. ADMIN UI — donations live at /admin/donations, bazaar at
 *      /admin/bazaar/orders, accountant reconciliation at
 *      /admin/reports/reconciliation (combined view with Type column).
 */

/**
 * Email sender for bazaar order confirmations, shipping notifications,
 * refund confirmations. Currently shared with the donation flow at
 * info@deenrelief.org; will split to a bazaar-specific sender once the
 * volume justifies the operational separation.
 */
export const BAZAAR_FROM_EMAIL = "info@deenrelief.org";

/**
 * Customer-service address — published on the returns policy, order
 * confirmation footer, and admin "contact donor" buttons. Currently the
 * same as BAZAAR_FROM_EMAIL; can split later.
 */
export const BAZAAR_SUPPORT_EMAIL = "info@deenrelief.org";

/**
 * UK returns address — printed on the returns policy page and included
 * in order confirmation emails per UK Consumer Contracts Regulations.
 *
 * Currently uses the charity's Brighton operations address as a
 * placeholder. The client will source a dedicated returns address (or
 * confirm the Brighton one is operationally workable) once the first
 * bulk inventory arrives in the UK.
 */
export const BAZAAR_RETURNS_ADDRESS = {
  /** Used in the address block. */
  lines: [
    "Deen Relief Bazaar",
    "7 Maldon Road",
    "Brighton",
    "BN1 5BD",
    "United Kingdom",
  ],
  /** Single-line version for compact contexts (email subjects etc.). */
  oneLine:
    "Deen Relief Bazaar, 7 Maldon Road, Brighton BN1 5BD, United Kingdom",
} as const;

/**
 * Stripe metadata convention.
 *
 * All bazaar Checkout Sessions and PaymentIntents MUST set:
 *   metadata: {
 *     source: "bazaar",
 *     order_id: <bazaar_orders.id>,    // for webhook routing
 *     item_count: "<n>",                // for at-a-glance reporting
 *   }
 *
 * Donation PaymentIntents intentionally do NOT set the `source` key,
 * so the absence of `metadata.source` (or `metadata.source !== "bazaar"`)
 * means "this is a donation". The Stripe webhook routes by event type
 * primarily (Checkout Sessions = bazaar; PaymentIntents/SetupIntents
 * = donations) but checks metadata as a defensive cross-check.
 *
 * Accountant filters in the Stripe Dashboard:
 *   "metadata['source'] = 'bazaar'"   → trading income
 *   "metadata['source'] != 'bazaar'"  → donation income
 *   (or just leave that filter blank for donations since they don't
 *   set source at all)
 */
export const BAZAAR_STRIPE_METADATA_KEY = "source";
export const BAZAAR_STRIPE_METADATA_VALUE = "bazaar";
