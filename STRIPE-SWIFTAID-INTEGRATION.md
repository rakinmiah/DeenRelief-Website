# Stripe + Swiftaid Integration Spec

> Implementation plan for wiring the `/donate` checkout on DeenRelief.org. Pairs **Stripe Payment Element** (Apple Pay, Google Pay, card) with **Swiftaid** for automated HMRC Gift Aid claim submission.
>
> **Status:** Spec only — nothing in this doc is wired up yet. The `/donate` page currently routes donors to `donate@deenrelief.org` until this is implemented.

---

## 1. Why this stack

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| JustGiving / Enthuse hosted widget | Zero dev, Gift Aid automated | Donor leaves the site, 3–5% fees, generic UX | ❌ Loses the custom Palestine flow |
| Stripe + manual HMRC filing | Lowest fees | Quarterly admin burden on staff, easy to make mistakes | ❌ Ops risk |
| **Stripe + Swiftaid** | Custom UX, Apple Pay, low fees, auto HMRC, ~5p per claim | Two vendor integrations | ✅ **Recommended** |
| DIY HMRC Charities Online API | Full control | Over-engineering for a small charity | ❌ Don't |

**Total cost per £50 donation:**
- Stripe: ~£0.90 (1.4% + 20p)
- Swiftaid: ~£0.05 per Gift Aid claim
- **Net to charity: £49.05, plus £12.48 Gift Aid reclaim = £61.53**

---

## 2. Architecture overview

```
┌─────────────────┐     amount         ┌──────────────┐
│  /palestine     │ ────────────────→  │  /donate      │
│  DonationForm   │  ?campaign=...     │  (checkout)   │
└─────────────────┘                    └──────┬────────┘
                                              │
                              user submits    │ POST /api/donations/create-intent
                              Gift Aid form   ▼
                                       ┌──────────────┐       ┌──────────────┐
                                       │  Next.js     │──────→│   Stripe      │
                                       │  API Route   │       │  PaymentIntent│
                                       └──────┬───────┘       └──────┬───────┘
                                              │                      │
                                              │ Stripe.js mounts     │ client_secret
                                              │ Payment Element      │
                                              ▼                      │
                                       ┌──────────────┐               │
                                       │  Checkout    │ ←─────────────┘
                                       │  form        │
                                       │  + Gift Aid  │
                                       └──────┬───────┘
                                              │ user confirms payment
                                              ▼
                                       ┌──────────────┐     webhook      ┌──────────────┐
                                       │   Stripe     │────────────────→ │ /api/stripe/ │
                                       │              │  payment_intent. │  webhook      │
                                       │              │  succeeded       │               │
                                       └──────────────┘                  └──────┬────────┘
                                                                                │
                                                         ┌──────────────────────┼──────────────────┐
                                                         ▼                      ▼                  ▼
                                                  ┌──────────┐          ┌──────────────┐    ┌──────────┐
                                                  │ Database │          │  Swiftaid    │    │  Resend  │
                                                  │ write    │          │  API         │    │  receipt │
                                                  │ donation │          │  (Gift Aid)  │    │  email   │
                                                  └──────────┘          └──────────────┘    └──────────┘
                                                                                │
                                                                                ▼ (automated, weekly)
                                                                         ┌──────────────┐
                                                                         │ HMRC claim   │
                                                                         │ via Swiftaid │
                                                                         └──────────────┘
```

---

## 3. Vendor accounts you need to create

These require human action — I can't create them for you.

1. **Stripe** — [stripe.com](https://dashboard.stripe.com/register)
   - Activate account, verify charity status (Stripe offers fee discounts for UK charities)
   - Enable Apple Pay and Google Pay in Dashboard → Settings → Payment methods
   - Create a webhook endpoint pointing to `https://deenrelief.org/api/stripe/webhook`
   - Copy the **publishable key**, **secret key**, and **webhook signing secret**

2. **Swiftaid** — [swiftaid.co.uk](https://www.swiftaid.co.uk/)
   - Register as a charity using Charity Commission No. 1158608
   - Swiftaid matches donations to their database of existing Gift Aid donors; for new donors, you pass the declaration via their API
   - Get your **Swiftaid API key**

3. **Database** — you need persistent storage for donations + declarations.
   - **Recommended: Supabase** (free tier is enough to start, Postgres, simple to integrate with Next.js)
   - Alternative: Vercel Postgres, Neon, PlanetScale, or a traditional managed Postgres

4. **Resend** — already in your `.env.example` (`RESEND_API_KEY`). Reuse for donation receipts.

---

## 4. Environment variables

Add to `.env.local` (and document in `.env.example`):

```bash
# Stripe — get from https://dashboard.stripe.com/apikeys
STRIPE_SECRET_KEY=sk_live_xxxxx                    # server-only, never expose
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx   # safe in client bundle
STRIPE_WEBHOOK_SECRET=whsec_xxxxx                  # for verifying webhooks

# Swiftaid — get from your Swiftaid dashboard
SWIFTAID_API_KEY=sa_xxxxx
SWIFTAID_API_URL=https://api.swiftaid.co.uk/v1    # confirm with Swiftaid docs

# Supabase — get from https://supabase.com/dashboard
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxxxx                # server-only, never expose

# Already present — re-used for receipts
RESEND_API_KEY=re_xxxxxxxxxxxx
```

---

## 5. Database schema (Supabase / Postgres)

```sql
-- Donors: one row per unique email. Gift Aid declarations live with the
-- donor record so a single declaration covers multiple donations.
CREATE TABLE donors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  full_name text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  address_line1 text NOT NULL,        -- house number + street (HMRC requires at minimum house # + postcode)
  address_line2 text,
  city text,
  postcode text NOT NULL,
  country text NOT NULL DEFAULT 'GB',
  phone text,
  marketing_consent boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Gift Aid declarations. HMRC requires retention for 6 years after the
-- last donation claimed. Store one declaration per donor; a single
-- declaration can cover "this donation, past 4 years, all future".
CREATE TABLE gift_aid_declarations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id uuid NOT NULL REFERENCES donors(id) ON DELETE RESTRICT,
  declared_at timestamptz NOT NULL DEFAULT now(),
  scope text NOT NULL CHECK (scope IN ('this-donation-only', 'this-and-past-4-years-and-future')),
  declaration_text text NOT NULL,     -- verbatim HMRC-approved wording shown to donor
  ip_address inet,                    -- audit trail for HMRC
  user_agent text,                    -- audit trail
  revoked_at timestamptz,             -- if donor later withdraws consent
  created_at timestamptz NOT NULL DEFAULT now()
);

-- One row per completed donation. This is the source of truth for Gift Aid
-- claim submission — Swiftaid reads from here.
CREATE TABLE donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id uuid NOT NULL REFERENCES donors(id) ON DELETE RESTRICT,
  gift_aid_declaration_id uuid REFERENCES gift_aid_declarations(id),

  -- Campaign routing (from the /donate?campaign=... query param)
  campaign text NOT NULL,             -- 'palestine', 'zakat', 'orphan-sponsorship', etc.
  campaign_label text NOT NULL,       -- human-readable, e.g. 'Palestine Emergency Appeal'

  -- Money
  amount_pence integer NOT NULL CHECK (amount_pence >= 500),  -- £5 minimum
  currency text NOT NULL DEFAULT 'GBP',
  frequency text NOT NULL CHECK (frequency IN ('one-time', 'monthly')),

  -- Gift Aid
  gift_aid_claimed boolean NOT NULL DEFAULT false,
  gift_aid_amount_pence integer GENERATED ALWAYS AS (
    CASE WHEN gift_aid_claimed THEN amount_pence / 4 ELSE 0 END
  ) STORED,

  -- Stripe
  stripe_payment_intent_id text UNIQUE,
  stripe_customer_id text,
  stripe_subscription_id text,        -- null for one-time
  status text NOT NULL CHECK (status IN (
    'pending', 'processing', 'succeeded', 'failed', 'refunded', 'disputed'
  )),

  -- Swiftaid tracking
  swiftaid_submission_id text,
  swiftaid_submitted_at timestamptz,
  swiftaid_hmrc_claim_status text,    -- 'pending', 'claimed', 'rejected'

  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_donations_donor ON donations(donor_id);
CREATE INDEX idx_donations_campaign ON donations(campaign);
CREATE INDEX idx_donations_status ON donations(status);
CREATE INDEX idx_donations_gift_aid_unclaimed ON donations(gift_aid_claimed, swiftaid_submission_id)
  WHERE gift_aid_claimed = true AND swiftaid_submission_id IS NULL;

-- Optional: webhook event log for debugging + replay protection
CREATE TABLE stripe_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  processed boolean NOT NULL DEFAULT false,
  processed_at timestamptz,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

**Retention:** Gift Aid declarations must be kept **6 years after the last donation claimed under them** (HMRC rule). Don't hard-delete donor records — use `donors.revoked_at` or similar if you add unsubscribe functionality.

---

## 6. API routes to build

All routes live under `src/app/api/`. Next.js 15 App Router conventions.

### 6.1 `POST /api/donations/create-intent`

Creates a Stripe PaymentIntent and returns the `client_secret` for the Payment Element.

**Request body:**
```ts
{
  campaign: string;        // 'palestine', etc.
  amount: number;          // in pence (server-side validation)
  frequency: 'one-time' | 'monthly';
}
```

**Behavior:**
1. Validate campaign slug against allow-list
2. Validate amount: `>= 500` pence (£5), reasonable upper bound (e.g. `<= 10_000_00` pence = £10,000) to catch typos
3. For **one-time**: create `PaymentIntent` with:
   ```ts
   stripe.paymentIntents.create({
     amount,
     currency: 'gbp',
     automatic_payment_methods: { enabled: true }, // enables Apple Pay / Google Pay
     metadata: { campaign, frequency: 'one-time' },
   })
   ```
4. For **monthly**: create a Stripe `Customer` first, then use `SetupIntent` instead of `PaymentIntent`. The subscription is created later in the webhook handler once payment details are confirmed. Return `setup_intent.client_secret`.
5. Return `{ clientSecret, mode: 'payment' | 'setup' }`

**File:** `src/app/api/donations/create-intent/route.ts`

### 6.2 `POST /api/donations/confirm`

Called client-side after `stripe.confirmPayment()` returns successfully. Stores donor details + Gift Aid declaration in your database. Note: the actual `donations.status = 'succeeded'` transition happens in the webhook, not here, to avoid race conditions and client spoofing.

**Request body:**
```ts
{
  paymentIntentId: string;       // or setupIntentId for monthly
  donor: {
    firstName: string;
    lastName: string;
    email: string;
    addressLine1: string;        // house + street
    addressLine2?: string;
    city?: string;
    postcode: string;            // validate UK postcode format
    phone?: string;
  };
  giftAid: {
    enabled: boolean;
    scope?: 'this-donation-only' | 'this-and-past-4-years-and-future';
    declarationText: string;     // the text actually shown to the donor
  };
  marketingConsent: boolean;
}
```

**Behavior:**
1. Upsert `donors` table by email (update address if newer)
2. If `giftAid.enabled`, insert `gift_aid_declarations` row
3. Insert `donations` row with `status = 'pending'` — webhook will flip to `'succeeded'`
4. Return 200 `{ ok: true }`

**File:** `src/app/api/donations/confirm/route.ts`

### 6.3 `POST /api/stripe/webhook`

Receives `payment_intent.succeeded`, `invoice.paid` (for subscriptions), `charge.refunded`, `charge.dispute.created` events from Stripe.

**Critical:**
- Must use **raw body** for signature verification (Next.js Route Handlers support this via `request.text()` before parsing)
- Must verify `stripe-signature` header against `STRIPE_WEBHOOK_SECRET`
- Must be **idempotent** — Stripe retries on failures; check `stripe_webhook_events.stripe_event_id` unique constraint

**Handlers:**

```ts
payment_intent.succeeded:
  1. Look up donation by stripe_payment_intent_id
  2. Update status = 'succeeded', completed_at = now
  3. If gift_aid_claimed, enqueue Swiftaid submission (async, not in webhook response)
  4. Send receipt email via Resend
  5. Return 200 within 30s (Stripe timeout)

invoice.paid:  (monthly subscription renewal)
  1. Look up donor by stripe_customer_id
  2. Create a new donations row for this period
  3. Reuse the existing gift_aid_declaration_id if present
  4. Submit to Swiftaid, send receipt

charge.refunded:
  1. Update donation status = 'refunded'
  2. Notify Swiftaid to void the Gift Aid claim
  3. Don't email the donor — Stripe handles refund receipts

charge.dispute.created:
  1. Flag for manual review
  2. Email staff
```

**File:** `src/app/api/stripe/webhook/route.ts`

### 6.4 `POST /api/swiftaid/submit` (internal, called by webhook handler)

Sends a Gift Aid claim to Swiftaid's API.

**Swiftaid API reference:** confirm the exact endpoint and payload format with their docs when you sign up — the shape below is a best-guess template.

```ts
POST https://api.swiftaid.co.uk/v1/claims
Authorization: Bearer ${SWIFTAID_API_KEY}

{
  "charity_reference": "1158608",
  "donor": {
    "title": "Mr",   // optional
    "first_name": "...",
    "last_name": "...",
    "house_number": "...",
    "postcode": "..."
  },
  "donation": {
    "amount_pence": 5000,
    "donated_at": "2026-04-15T12:00:00Z",
    "reference": "<donation.id from your db>"
  },
  "declaration": {
    "text": "...",
    "declared_at": "2026-04-15T12:00:00Z",
    "scope": "this-and-past-4-years-and-future"
  }
}
```

On success: update `donations.swiftaid_submission_id`, `donations.swiftaid_submitted_at`.
On failure: log error, retry with exponential backoff (max 3 attempts), alert staff if all fail.

**File:** `src/app/api/swiftaid/submit/route.ts` (or a lib function called directly from the webhook, no HTTP hop needed)

---

## 7. Checkout page UI (`src/app/donate/page.tsx`)

Rewrite the current stub. Must be a **client component** because Stripe.js needs to mount the Payment Element into the DOM.

### Form structure

```
┌─────────────────────────────────────────┐
│  Complete your donation                 │
│                                         │
│  [Palestine Emergency Relief]           │
│  £50 one-time                           │
│  With Gift Aid: £62.50                  │
│                                         │
│  ── Your details ──                     │
│  First name *       Last name *         │
│  Email *                                │
│  ── Address (required for Gift Aid) ──  │
│  House / street *                       │
│  City                                   │
│  Postcode *                             │
│                                         │
│  ── Gift Aid ──                         │
│  ☑ I am a UK taxpayer and want to      │
│    Gift Aid this donation and all      │
│    future donations to Deen Relief.    │
│    [+ show HMRC declaration]            │
│                                         │
│  ── Payment ──                          │
│  [ Stripe Payment Element ]             │
│  (Apple Pay / Google Pay / Card)        │
│                                         │
│  [  Donate £50 (£62.50 with Gift Aid) ] │
│                                         │
│  🔒 Secure checkout · Reg charity 1158608│
└─────────────────────────────────────────┘
```

### HMRC-approved Gift Aid declaration wording

**Use this exact text** (source: [HMRC Chapter 3 guidance](https://www.gov.uk/government/publications/charities-detailed-guidance-notes/chapter-3-gift-aid)):

> Boost your donation by 25p of Gift Aid for every £1 you donate.
>
> Gift Aid is reclaimed by the charity from the tax you pay for the current tax year. Your address is needed to identify you as a current UK taxpayer.
>
> In order to Gift Aid your donation you must tick the box below:
>
> ☐ I want to Gift Aid my donation of **£[AMOUNT]** and any donations I make in the future or have made in the past 4 years to **Deen Relief**.
>
> I am a UK taxpayer and understand that if I pay less Income Tax and/or Capital Gains Tax than the amount of Gift Aid claimed on all my donations in that tax year it is my responsibility to pay any difference.

**⚠️ Legal note:** show this wording to your trustees or a charity-specialist accountant before going live. HMRC may update the template; always check [gov.uk/claim-gift-aid/gift-aid-declarations](https://www.gov.uk/claim-gift-aid/gift-aid-declarations) for the latest.

### Client-side flow (in `/donate/page.tsx`)

```ts
'use client';

import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

// 1. On mount, call /api/donations/create-intent to get clientSecret
// 2. Render <Elements stripe={stripePromise} options={{ clientSecret }}>
// 3. Inside, render <CheckoutForm /> which uses <PaymentElement />
// 4. On submit:
//    a. Validate donor details + Gift Aid checkbox
//    b. POST /api/donations/confirm with donor details
//    c. Call stripe.confirmPayment({ elements, confirmParams: { return_url } })
//    d. Stripe redirects to return_url on success
// 5. return_url = /donate/thank-you?payment_intent=pi_xxx
```

### Thank-you page (`/donate/thank-you`)

- Reads `?payment_intent=...` from URL
- Calls Stripe `paymentIntents.retrieve()` on the server to verify status
- Shows donation summary + Gift Aid status + receipt email confirmation
- `metadata: { robots: noindex }` (don't index thank-you URLs)

---

## 8. Wiring the existing donation form

The `DonationForm` and `MiniDonationPicker` already route to `/donate?campaign=palestine&amount=X&frequency=Y` — **no change needed**. The new `/donate` page parses these params and seeds the checkout.

**Optional enhancement:** preserve the donor's URL params across the checkout flow so if they hit back from Stripe, they return to the same amount.

---

## 9. Security checklist

- [ ] `STRIPE_SECRET_KEY` and `SWIFTAID_API_KEY` are **server-only**, never in `NEXT_PUBLIC_*`
- [ ] Webhook signature verification on every Stripe event (reject unsigned requests)
- [ ] CSRF protection on the confirm endpoint (Next.js defaults to same-origin for POST; no extra config if form lives on same domain)
- [ ] Rate limit `/api/donations/create-intent` to prevent PaymentIntent spam (e.g. 10/min per IP via Upstash Redis or Vercel KV)
- [ ] Don't log full donor PII in server logs (email is OK for debugging, address is not)
- [ ] Use Supabase row-level security to prevent client-side access to `donations` table — all writes go through API routes with the service role key
- [ ] Set `Content-Security-Policy` header to include `https://js.stripe.com` and Stripe's domains
- [ ] Use a **webhook endpoint secret** that's different from the API key — regenerable if leaked
- [ ] Validate UK postcodes before storing (regex: `^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$`i)
- [ ] Retention: Gift Aid data must persist for **6 years after last donation claimed** — don't auto-prune
- [ ] GDPR: lawful basis for Gift Aid data storage is "compliance with legal obligation" (HMRC requirement). Marketing consent is separate and opt-in only.

---

## 10. Testing plan

### Stripe test mode
Use `sk_test_...` keys and test card `4242 4242 4242 4242` (any future expiry, any CVC). Stripe has specific test cards for declined payments, 3DS authentication, etc. — see [stripe.com/docs/testing](https://stripe.com/docs/testing).

### Webhook testing locally
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```
Stripe CLI prints a webhook secret to use in `.env.local`. Without this, webhooks won't reach your dev server.

### Test cases
1. **One-time £50 donation, Gift Aid enabled** — donation row created, declaration stored, Swiftaid submission queued, receipt email sent
2. **One-time £50, Gift Aid disabled** — same as above but no declaration, no Swiftaid submission
3. **Monthly £25, Gift Aid enabled** — Stripe subscription created, first payment succeeds, future `invoice.paid` webhooks create new donation rows
4. **Apple Pay / Google Pay flow** — test on a real device, can't fully test in dev
5. **Card declined** — donor sees error, no donation row flipped to succeeded
6. **Refund** — donation status updated, Swiftaid claim voided
7. **Webhook replay** — same `stripe_event_id` delivered twice → second one is a no-op
8. **Invalid postcode** — form rejects before PaymentIntent creation
9. **Amount below £5** — rejected server-side
10. **Missing Gift Aid address** — rejected if Gift Aid checkbox is ticked

---

## 11. Go-live checklist

In order:

1. [ ] Stripe account activated, charity status verified
2. [ ] Swiftaid account created with Charity Commission No. 1158608
3. [ ] Supabase project + tables created (run SQL from §5)
4. [ ] Env vars set in Vercel (production) and `.env.local` (dev)
5. [ ] `/donate` page rewritten with Stripe Elements
6. [ ] API routes: create-intent, confirm, webhook
7. [ ] Webhook endpoint registered in Stripe Dashboard
8. [ ] HMRC declaration wording reviewed by trustee / accountant
9. [ ] Resend template created for donation receipts
10. [ ] Test mode: complete 5+ test donations covering all cases in §10
11. [ ] Swiftaid test submission accepted
12. [ ] Flip Stripe to live mode, update env vars
13. [ ] Submit one real £5 donation from a trustee, verify Gift Aid flow end-to-end
14. [ ] Monitor Stripe Dashboard + Supabase for 48h before announcing launch
15. [ ] Update `/palestine` FAQ to remove any "coming soon" Gift Aid caveats once live
16. [ ] Remove or restyle the `donate@deenrelief.org` fallback in the current stub page

---

## 12. What I (Claude) can build vs what you need to do

| Task | Who | Notes |
|---|---|---|
| Vendor account creation (Stripe, Swiftaid, Supabase) | **You** | Requires verification, banking details, trustee approval |
| Env var configuration | **You** | Paste keys into Vercel + `.env.local` |
| HMRC declaration wording review | **You + trustee/accountant** | Legal review, not code |
| Database schema migration | Claude | Run SQL via Supabase dashboard or CLI |
| API routes (`create-intent`, `confirm`, `webhook`) | Claude | Full TypeScript, tested against Stripe test mode |
| `/donate` page rewrite with Stripe Elements | Claude | Client component, form validation, error handling |
| Thank-you page | Claude | Server component reading PaymentIntent status |
| Resend receipt email template | Claude | HTML + plain-text email with donation details |
| Swiftaid API wiring | Claude | Requires final API reference from Swiftaid docs |
| Test plan execution | You + Claude | I can drive the test cases; you verify in Stripe Dashboard |

---

## 13. Effort estimate

- **Vendor setup:** 2–4 hours (you)
- **Schema + API routes:** 4–6 hours (Claude)
- **`/donate` page + thank-you:** 3–4 hours (Claude)
- **Receipt email + Swiftaid wiring:** 2–3 hours (Claude)
- **Testing + fixes:** 2–4 hours (together)
- **Trustee/accountant review of Gift Aid wording:** async, depends on trustee availability

**Realistic total: 2–3 working days** end to end, assuming no surprises from Swiftaid's API or Stripe charity verification.

---

## 14. Open questions for you

Before implementation, confirm:

1. **Database choice** — Supabase OK, or do you prefer Vercel Postgres / Neon / something else?
2. **Marketing consent field** — keep it on the checkout form or skip it entirely? (GDPR-safer to skip unless you actually plan to email donors for fundraising.)
3. **Recurring donations** — start with one-time only and add monthly later, or ship both at once? Monthly is ~30% more dev work but ~3× donor lifetime value.
4. **Multi-currency** — GBP only, or also USD/EUR for diaspora donors? (Multi-currency doubles the complexity of Gift Aid since HMRC only works on GBP.)
5. **Corporate matching** — any plan to support matched giving? (Affects data model.)
6. **Team / trustee receipts** — do staff need admin access to view donation history? (Needs a protected `/admin/donations` page.)
7. **Blank-check on Swiftaid's exact API shape** — I've templated the payload in §6.4, but the real shape comes from their current docs when you sign up. Ping me the docs and I'll finalize.
