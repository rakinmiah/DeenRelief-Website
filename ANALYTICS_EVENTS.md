# Deen Relief — Analytics Event Catalogue

This document is the **single source of truth** for every event the
Deen Relief site sends to GA4 and Google Ads. Drift between this README
and the implementation in `src/lib/analytics.ts` becomes confusion at
analysis time, so when you add or change an event, update this file in
the same commit.

For the GA4 admin steps required to make an event count as a Conversion
or feed Smart Bidding, see [Configuring events in GA4](#configuring-events-in-ga4) at the bottom.

---

## Architecture

```
┌─────────────────────────┐
│ src/lib/analytics.ts    │   trackEvent() — low-level, hard-gated
│                         │   on analytics_storage consent
│  ├── trackDonationPurchase     (GA4 standard `purchase`)
│  ├── trackDonationFunnelStep   (custom funnel)
│  ├── trackSitelinkLanding      (custom — Ads sitelink usage)
│  └── trackCausePageSectionView (custom — engagement)
│                         │
└────────┬────────────────┘
         │
         │ called from
         ▼
┌─────────────────────────┐         ┌──────────────────────┐
│ Server-rendered cause   │  hooks  │ src/lib/             │
│ pages (palestine/qurbani│◄────────│  analytics-hooks.ts  │
│ /zakat/orphan-...)      │         │  (client-only)       │
│ — emit data-track-      │         │  ├── useSitelink-    │
│   section attributes    │         │  │    Landing        │
│                         │         │  └── useSection-     │
│                         │         │       ViewTracking   │
└─────────────────────────┘         └──────────────────────┘

┌─────────────────────────┐
│ Donate flow             │
│  ├── CheckoutClient.tsx │  fires begin_checkout, payment_method_added
│  └── thank-you/         │  fires purchase + purchase_completed
│      TrackConversion.tsx│
└─────────────────────────┘
```

### Consent gating

Events are hard-gated at the `trackEvent` layer — if the donor has not
granted analytics_storage consent, **no events fire at all**, including
the GA4 macro `purchase` event. This is stricter than Google Consent
Mode v2's "modelled conversions" pattern (which would still allow GA4
to receive cookieless aggregated events). The site policy is the
stricter one: no measurement at all without explicit opt-in.

The cookie consulted is `dr_consent`. See `src/lib/consent.ts` for the
shape and `src/components/ConsentBanner.tsx` for the UI flow.

### Naming conventions

- **Event names** — snake_case. GA4-recommended names (`purchase`,
  `view_item`, `begin_checkout`) are used where the GA4 vocabulary
  fits cleanly. Custom events use descriptive snake_case names with
  parameters carrying the variation.
  - ✅ `cause_page_section_view` + parameter `section: "what_you_get"`
  - ❌ `view_what_you_get_palestine` (variation in the event name)
- **Parameter names** — snake_case. Match GA4 reserved parameters
  exactly where they overlap (`value`, `currency`, `transaction_id`,
  `items`).

### Volume target

A typical donor session should fire **fewer than 50 events**. Each
custom event below has dedup logic (sessionStorage / mount-only effect)
to prevent runaway repeat firings during heavy scroll or React
re-renders.

---

## Phase 1 events

### `purchase` (GA4 standard)

GA4-standard ecommerce purchase event. Fires on the donation thank-you
page when a donation completes successfully. **The macro conversion**
— this is what Google Ads bids against.

| Parameter             | Type           | Notes                                                                    |
|-----------------------|----------------|--------------------------------------------------------------------------|
| `transaction_id`      | string         | Stripe payment intent ID. Used by GA4 to dedupe replays.                 |
| `value`               | number         | Conversion value in `currency`. For monthly donations may be LTV-loaded. |
| `currency`            | string (ISO)   | "GBP".                                                                   |
| `affiliation`         | string         | Always "Deen Relief".                                                    |
| `gift_aid_claimed`    | boolean        | Whether the donor ticked Gift Aid.                                       |
| `frequency`           | "one-time" \| "monthly" |                                                                  |
| `campaign_slug`       | string         | e.g. "palestine", "orphan-sponsorship".                                  |
| `pathway`             | string         | Optional. Zakat-only — the selected pathway slug.                        |
| `single_charge_amount`| number         | Optional. The actual GBP amount charged. Set when `value` is LTV-loaded. |
| `items[0]`            | object         | One item representing the campaign (`item_id`, `item_name`, ...).         |
| `user_data.sha256_email_address` | string | Optional — Enhanced Conversions hashed email. Only when `ad_user_data` consent is granted. |

**Fired by:** `trackDonationPurchase()` in `src/lib/analytics.ts`,
called from `src/app/donate/thank-you/TrackConversion.tsx`.

**GA4 admin:** mark as a Conversion (default for `purchase`). Use as the
primary Smart Bidding signal.

---

### `donation_funnel_step` (custom)

A unified funnel event covering the three drop-off boundaries of the
donation flow. Each fire point is a separate `step` parameter value.

| Parameter   | Type                      | Notes                                                           |
|-------------|---------------------------|-----------------------------------------------------------------|
| `step`      | enum (see below)          | `begin_checkout`, `payment_method_added`, `purchase_completed`. |
| `campaign`  | enum DonationCampaign     | `palestine`, `qurbani`, `zakat`, `orphan-sponsorship`, `other`. |
| `amount`    | number                    | The donation amount in GBP at the time of the event.            |
| `frequency` | "one-time" \| "monthly"   |                                                                 |
| `pathway`   | string                    | Optional. Zakat-only.                                           |

**Fire points** — DO NOT add new ones without updating this README:

| Step                    | When                                                                                                       | GA4 conversion? |
|-------------------------|------------------------------------------------------------------------------------------------------------|-----------------|
| `begin_checkout`        | Donor lands on `/donate` (any campaign).                                                                   | No (engagement) |
| `payment_method_added`  | Stripe `PaymentElement` `onChange` flips `complete: false → true` (card details fully entered, valid).      | **Yes**         |
| `purchase_completed`    | Fires alongside the GA4 `purchase` macro on `/donate/thank-you`. Same trigger as `purchase`.               | **Yes**         |

**Why a single funnel event** — keeps the funnel report in GA4 readable
(filter by `step`) without joining three separate events. Each fire
point is also configurable as its own Conversion event.

**Fired by:** `trackDonationFunnelStep()` in `src/lib/analytics.ts`.

- `begin_checkout` — `src/app/donate/CheckoutClient.tsx`, on mount.
- `payment_method_added` — `src/app/donate/CheckoutClient.tsx`, in
  the Stripe Elements `onChange` handler when transitioning to complete.
- `purchase_completed` — `src/app/donate/thank-you/TrackConversion.tsx`,
  paired with the existing `trackDonationPurchase` call.

**GA4 admin:**
- `payment_method_added` → mark as Conversion (high-intent Smart Bidding signal).
- `purchase_completed` → mark as Conversion (paired with `purchase`, segment by `campaign`).
- `begin_checkout` → leave as engagement (too high-funnel for Smart Bidding).

---

### `sitelink_landing` (custom)

Fired exactly **once on initial mount** of a cause page when the donor
arrived via a Google Ads sitelink. The detection logic in
`isExternalDeepLink()`:

1. The Performance API navigation type is `"navigate"` (a fresh page
   load, not a back/forward or SPA nav), AND
2. The URL has a hash (`#what-you-get`, `#faq-...`), AND
3. The referrer is external or empty (direct, paid traffic).

Internal SPA hash navigation does NOT trigger this — only first-paint
deep-links from external traffic.

| Parameter        | Type                  | Notes                                                                   |
|------------------|-----------------------|-------------------------------------------------------------------------|
| `target_anchor`  | string                | The hash without the `#`, e.g. `"what-you-get"`, `"faq-orphan-criteria"`.|
| `cause_page`     | enum DonationCampaign |                                                                         |
| `expanded_faq`   | boolean               | Optional. `true` when the hash matched a FAQ slug (auto-expanded).      |

**Fired by:** `useSitelinkLanding(causePage)` in
`src/lib/analytics-hooks.ts`. Mounted from each cause page.

**Why this matters** — reveals which sitelinks pull traffic vs. which
sit dormant. Drives sitelink optimisation in Google Ads.

**GA4 admin:** mark as Conversion (engagement event). Build an audience
of "donors who arrived via a high-performing sitelink" → exclude from
generic remarketing campaigns.

---

### `cause_page_section_view` (custom)

Fired when a section of a cause page enters the viewport at ≥50%
visibility. Each `(section, cause_page)` tuple fires **at most once
per session** — repeat scrolls in the same session are suppressed via
sessionStorage (key prefix `dr_section_view_`).

| Parameter      | Type                  | Notes                                                              |
|----------------|-----------------------|--------------------------------------------------------------------|
| `section`      | string                | The `data-track-section` attribute value on the section element.   |
| `cause_page`   | enum DonationCampaign |                                                                    |

**Wiring:** add `data-track-section="<name>"` to the relevant
`<section>` JSX. The `useSectionViewTracking()` hook reads those
attributes on mount and sets up an IntersectionObserver at threshold
0.5.

**Section taxonomy per cause page** (keep these stable — analysis joins
across history):

| Cause page            | Sections                                                                                  |
|-----------------------|-------------------------------------------------------------------------------------------|
| `palestine`           | `crisis_context`, `what_you_get`, `faq`                                                   |
| `qurbani`             | `what_is_qurbani`, `pricing`, `pmax_form`, `faq`                                          |
| `zakat`               | `who_is_eligible`, `pathways`, `calculator`, `methodology_link`, `faq`                    |
| `orphan-sponsorship`  | `what_30_covers`, `child_journey`, `religious_framing`, `faq`                             |

**Fired by:** `useSectionViewTracking(causePage)` in
`src/lib/analytics-hooks.ts`. Mounted from each cause page.

**GA4 admin:** leave as engagement event. Use in audiences (e.g.
"viewed FAQ but did not begin checkout" → retargeting copy).

---

## Microsoft Clarity (session replay)

Clarity is loaded conditionally by `src/components/ClarityBootstrap.tsx`
when `NEXT_PUBLIC_CLARITY_PROJECT_ID` is set AND the donor has granted
analytics_storage consent. Form fields are masked by default — card
numbers, names, emails, and addresses are never recorded.

Clarity is **not** an event source — it operates outside this
catalogue. Mentioned here for completeness because it is bound to the
same consent gate.

---

## Phase 2 events (planned, not yet shipped)

### `donation_form_abandoned`

Fired via `beforeunload` + `navigator.sendBeacon()` when the donor
leaves `/donate` without completing. Carries the deepest funnel step
they reached and the time spent on the form. Dedup'd at the
sessionStorage layer to one fire per page load.

### `cross_cause_navigation`

Fires when the donor clicks an internal `<Link>` to a different cause
page from within a cause page. Reveals which causes cross-pollinate
(e.g. donors browsing Palestine often look at Sadaqah next).

### `faq_expanded`

Fires on every `FaqAccordion` expansion with the FAQ slug as parameter.
Reveals which questions block donations.

### `calculator_engagement` (deferred until Zakat calculator analytics
spec is signed off)

---

## Phase 3 events (planned, not yet shipped)

### `engaged_session`

Fires once per session when the cumulative metrics cross
60s on-site + 2 sections viewed + 75% max scroll on any page. A higher
fidelity engagement signal than GA4's default.

### `recurring_lifecycle` (server-side)

Stripe webhook → Supabase → server-side Measurement Protocol push.
Tracks monthly donor lifecycle events (subscription renewed, cancelled,
payment failed). Deferred — separate spec.

---

## Configuring events in GA4

Once the events listed above appear in GA4's "Events" report (24-hour
delay after first fire), apply these admin settings:

1. **Mark Conversion events** — Admin → Events → toggle "Mark as
   conversion" on:
   - `purchase` (auto)
   - `donation_funnel_step` *with `step = payment_method_added` filter* (use
     a Custom event in Admin → Events → Create event to clone with that
     filter)
   - `donation_funnel_step` *with `step = purchase_completed` filter*
   - `sitelink_landing`

2. **Register custom dimensions** — Admin → Custom definitions:
   - `campaign` (event scope)
   - `frequency` (event scope)
   - `pathway` (event scope)
   - `step` (event scope)
   - `cause_page` (event scope)
   - `section` (event scope)
   - `target_anchor` (event scope)
   - `expanded_faq` (event scope)
   - `gift_aid_claimed` (event scope)
   - `single_charge_amount` (event scope, numeric)

3. **Link Google Ads** — Admin → Google Ads links → Add link, then
   import the Conversion events from GA4 into the Ads account so Smart
   Bidding picks them up.

4. **Enhanced Conversions** — Google Ads → Tools → Conversions →
   `purchase` → Enhanced Conversions → enable "From Google tag" → User-
   provided data → confirm `user_data.sha256_email_address` is the
   matching key. The site already sends this when consent allows.

5. **Microsoft Clarity** — sign up at clarity.microsoft.com, create a
   project, copy the project ID, set `NEXT_PUBLIC_CLARITY_PROJECT_ID`
   in the production environment. Until set, the Clarity loader is a
   no-op.
