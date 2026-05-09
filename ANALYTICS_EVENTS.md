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

**Enhanced Conversions for Web — hashing contract:**

The `user_data.sha256_email_address` field is produced by
`hashEmailForEnhancedConversions()` in `src/lib/analytics.ts`. The
function follows Google's published normalisation spec:

1. Trim leading/trailing whitespace.
2. Lowercase the entire string.
3. SHA-256 the UTF-8 bytes.
4. Hex-encode (lowercase, 64 chars).

Defensive guarantees the call site relies on:

- **Empty / nullish input → `undefined`.** No empty-string fingerprint
  is ever sent to Google. (Without this guard, SubtleCrypto would
  return the SHA-256 of `""` — `e3b0c44...` — which Google Ads would
  treat as a real identifier and pollute attribution.)
- **Already-hashed input → returned as-is.** A lowercase 64-char hex
  string is treated as already hashed (real emails contain `@` and so
  cannot match) and not re-hashed. Prevents double-hashing if some
  upstream caller hands the function pre-hashed data.
- **Never throws.** Any SubtleCrypto failure (unavailable, exception)
  returns `undefined`; the caller drops the user_data block from the
  purchase event but the base conversion still records.

**Consent boundary (Consent Mode v2):**

The hash is computed and attached *only* when `ad_user_data === true`
in the donor's consent state. The "Advertising" category in the
banner toggles `ad_storage`, `ad_user_data`, and `ad_personalization`
together (see `categoriesToState()` in `src/lib/consent.ts`). A donor
who accepts Analytics but declines Advertising still triggers the
base `purchase` event for measurement; only the user_data block is
omitted.

| State | analytics_storage | ad_user_data | purchase fires? | user_data attached? |
|---|---|---|---|---|
| Accept all | granted | granted | yes | yes |
| Analytics only | granted | denied | yes | no |
| Reject all | denied | denied | no | n/a |

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
| `palestine`           | `what_you_get`, `crisis_context`, `faq`                                                   |
| `qurbani`             | `pmax_form`, `pricing`, `delivery_assurance`, `faq`                                       |
| `zakat`               | `pathways`, `field_evidence`, `calculator`, `faq`                                         |
| `orphan-sponsorship`  | `religious_framing`, `what_30_covers`, `child_journey`, `faq`                             |

**Fired by:** `useSectionViewTracking(causePage)` in
`src/lib/analytics-hooks.ts`. Mounted from each cause page.

**GA4 admin:** leave as engagement event. Use in audiences (e.g.
"viewed FAQ but did not begin checkout" → retargeting copy).

---

## Contentsquare (session replay + heatmaps)

Contentsquare is loaded conditionally by
`src/components/ContentsquareBootstrap.tsx` when
`NEXT_PUBLIC_CONTENTSQUARE_TAG_ID` is set AND the donor has granted
analytics_storage consent. Sensitive form fields (card number, name,
email, address) are masked at the workspace level via Contentsquare's
Auto-Masking config — verify masking selectors in the Contentsquare
dashboard whenever the donation form template changes.

Mid-session consent flips:
- Grant → inject the tag (once) and push `_uxa.push(["setTrackerOptIn"])`.
- Revoke → push `_uxa.push(["setTrackerOptOut"])`. Tag stays in memory
  (no unload API) but tracking ceases immediately.

SPA caveat: internal Next.js `<Link>` navigations are soft client-side
transitions. Contentsquare's auto pageview detection only fires on full
page loads, so SPA navs across cause pages don't appear as separate
sessions. Most cross-cause navigation on this site is server-rendered
hard nav (Header / footer), so the primary funnel paths are covered.
For finer SPA attribution, push `_uxa.push(["trackPageview", url])`
from a `usePathname`-driven effect (separate change).

Contentsquare is **not** an event source — it operates outside this
catalogue. Mentioned here for completeness because it is bound to the
same consent gate.

---

## Phase 2 events

### `donation_form_abandoned` (custom)

Fired when the donor leaves `/donate` without completing. The unload
handler in `CheckoutClient.tsx` fires on `pagehide` (mobile-reliable)
with `beforeunload` as a desktop fallback — both are wired so legit
exits are captured on iOS Safari and Chrome alike. The handler is
idempotent (one event per mount).

Suppression: a `intentionalNavigationRef` flips to `true` immediately
before `stripe.confirm{Payment,Setup}` so the success-redirect-driven
unload doesn't fire abandonment. If Stripe surfaces an inline error
(no redirect happened), the ref is cleared so a subsequent retry-then-
bail still records. Anything else — back button, tab close, internal
link — IS abandonment.

| Parameter         | Type                      | Notes                                                                           |
|-------------------|---------------------------|---------------------------------------------------------------------------------|
| `campaign`        | enum DonationCampaign     |                                                                                 |
| `amount`          | number                    | Latest amount visible to the donor at unload (donor may have edited it).        |
| `frequency`       | "one-time" \| "monthly"   |                                                                                 |
| `deepest_step`    | enum DonationFunnelStep   | Furthest step reached: `begin_checkout` or `payment_method_added`.              |
| `seconds_on_form` | number                    | Wall-clock seconds from begin_checkout to unload.                               |
| `pathway`         | string                    | Optional. Zakat-only.                                                           |
| `transport`       | "beacon"                  | Tells gtag to use navigator.sendBeacon — only transport that survives unload.   |

**Fired by:** `trackDonationFormAbandoned()` in `src/lib/analytics.ts`,
called from the unload effect in `src/app/donate/CheckoutClient.tsx`.

**GA4 admin:** mark as Engagement event. Build an audience of "donors
who reached `payment_method_added` but then abandoned" (`deepest_step
= payment_method_added` AND fired `donation_form_abandoned`) → highest-
leverage retargeting cohort.

---

### `cross_cause_navigation` (custom)

Fired when the donor clicks an internal anchor to a different cause
page from within a cause page. Reveals which causes cross-pollinate
(e.g. donors browsing Palestine often look at Sadaqah next).

| Parameter          | Type                  | Notes                                                                |
|--------------------|-----------------------|----------------------------------------------------------------------|
| `from_cause_page`  | enum DonationCampaign | The page the donor is leaving.                                       |
| `to_cause_page`    | enum DonationCampaign | The page the donor is going to.                                      |
| `context`          | string                | Where on the page the click happened — `"faq_link"`, `"body"`, etc.  |

**Fired by:** `trackCrossCauseNavigation()` in `src/lib/analytics.ts`.
Wired via document-level click delegation inside `CausePageAnalytics`
so server-rendered cause pages don't need per-link instrumentation.

---

### `faq_expanded` (custom)

Fires on every FAQ accordion open. Reveals which questions block
donations (and conversely, which copy isn't being read).

| Parameter      | Type                  | Notes                                                                  |
|----------------|-----------------------|------------------------------------------------------------------------|
| `cause_page`   | enum DonationCampaign |                                                                        |
| `faq_index`    | number                | Position of the FAQ in the list — always present.                      |
| `faq_slug`     | string                | Stable slug, when the FAQ data has one (qurbani, zakat, orphan have).  |

**Fired by:** `trackFaqExpanded()` in `src/lib/analytics.ts`, called
from the toggle handler in each cause-page FaqAccordion component.

---

### `calculator_engagement` (deferred until Zakat calculator analytics
spec is signed off)

---

## Phase 3 events

### `engaged_session` (custom)

Fires exactly **once per session** when the donor crosses ALL THREE
engagement thresholds:

- **60 seconds** cumulative on-site (foreground only — backgrounded
  tabs don't accumulate time).
- **2 distinct** `(cause_page, section)` tuples viewed via
  IntersectionObserver.
- **75% scroll depth** reached on any single page (bottom-of-viewport
  heuristic — matches GA4's `scroll_depth`).

| Parameter            | Type   | Notes                                                                |
|----------------------|--------|----------------------------------------------------------------------|
| `cumulative_seconds` | number | Total foreground seconds across pages in this session.               |
| `sections_viewed`    | number | Count of unique `(cause_page, section)` tuples in `dr_section_view_*`.|
| `max_scroll_pct`     | number | Highest scroll % reached on any page in this session (0–100).        |

Higher fidelity than GA4's default 10-second engagement signal —
filters out skim-readers and bot traffic. The thresholds are deliberate
trade-offs: too lenient and the audience fills with bounces, too
strict and the audience is too small for meaningful remarketing.

**Fired by:** `trackEngagedSession()` in `src/lib/analytics.ts`.
Driven by `EngagedSessionTracker` mounted globally in
`src/app/layout.tsx` so metrics persist across page navigations via
sessionStorage:

- `dr_session_engaged_time_ms` — cumulative foreground time.
- `dr_session_engaged_max_scroll` — max scroll % reached.
- `dr_session_engaged_fired` — `"1"` once event has fired (idempotent).
- `dr_section_view_*` — reused from `useSectionViewTracking`; the
  count of these keys is the `sections_viewed` dimension.

**GA4 admin:** mark as Engagement event. Build an audience of "donors
who hit `engaged_session` but didn't hit `purchase`" → primary
remarketing cohort for high-quality donors who browsed-but-didn't-buy.

---

### `recurring_lifecycle` (server-side, deferred)

> **Status:** schema documented here; implementation deferred. Belongs
> to the Stripe webhook → Supabase → GA4 Measurement Protocol path
> (server-side, not browser), so it lives outside the
> `src/lib/analytics.ts` client surface.

Tracks monthly donor lifecycle events that originate from Stripe
webhooks rather than donor browser actions. Browser-side analytics
can't see these because the donor is no longer on the site when the
events happen.

| Parameter        | Type                      | Notes                                                               |
|------------------|---------------------------|---------------------------------------------------------------------|
| `lifecycle_step` | enum (see below)          | Which lifecycle event fired.                                        |
| `subscription_id`| string                    | Stripe subscription ID. Used as the GA4 dedup key.                  |
| `campaign_slug`  | string                    | The originating campaign (e.g. `"orphan-sponsorship"`).              |
| `value`          | number                    | The actual GBP charged for this lifecycle event.                    |
| `currency`       | string                    | "GBP".                                                              |
| `month_index`    | number                    | 1-based number of the donor's lifetime months on this subscription. |
| `client_id`      | string                    | The GA4 client_id captured at subscription creation, persisted on   |
|                  |                           | the donations row, replayed here so server events join browser ones. |

`lifecycle_step` values:

| Value                  | Source webhook                   | When                                                                                  |
|------------------------|----------------------------------|---------------------------------------------------------------------------------------|
| `renewal_succeeded`    | `invoice.payment_succeeded`      | Each successful monthly charge after the first (the first IS the GA4 `purchase`).      |
| `renewal_failed`       | `invoice.payment_failed`         | Stripe Smart Retries didn't recover. Donor gets a retention email; track for cohorting.|
| `subscription_canceled`| `customer.subscription.deleted`  | Donor canceled or churned out via dunning. Cancel reason forwarded as a parameter.     |
| `subscription_paused`  | `customer.subscription.paused`   | Optional pause flow if/when the manage page exposes it.                               |

**Implementation outline (when scheduled):**

1. Stripe webhooks already exist; extend the handler to write a row
   to a `recurring_lifecycle_events` table on each of the four hooks.
2. A Vercel cron / Supabase function reads from that table and POSTs
   to GA4 Measurement Protocol with `client_id` from the donations row.
3. Add `recurring_lifecycle` to GA4's custom event allow-list with the
   custom dimensions registered.

**Why server-side, not browser:**
- The donor is not on the site when these events happen.
- Server-side events have stable client identity (no consent flicker).
- One source of truth (Stripe webhooks) — no double-counting risk.

**GA4 admin (when shipped):**
- `renewal_succeeded` → Conversion event. Smart Bidding optimises for
  long-term value — knowing renewals continue is critical for the
  LTV-loaded `purchase.value` to be defensible.
- `renewal_failed` → Engagement (audience: "at-risk recurring donors").
- `subscription_canceled` → Engagement (cohort analysis).

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

5. **Contentsquare** — sign up / log in at contentsquare.com, create a
   workspace, copy the tag ID from the install snippet (the path
   segment in `https://t.contentsquare.net/uxa/<TAG_ID>.js`), set
   `NEXT_PUBLIC_CONTENTSQUARE_TAG_ID` in the production environment.
   Until set, the Contentsquare loader is a no-op. Verify the
   workspace's Auto-Masking config covers card / name / email /
   address selectors before sessions go live.
