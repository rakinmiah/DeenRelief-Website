# Deen Relief — Full Project Inventory (for CV synthesis)

A comprehensive, technical inventory of everything built for the DeenRelief charity website rebuild. Dense on purpose — intended to be fed to an AI to generate CV bullet points, LinkedIn summaries, portfolio copy, or interview talking points.

Project: **DeenRelief charity website rebuild** (`deenrelief.org`)
Single developer (Rakin Miah) acting as designer + full-stack engineer.
Scope: strategy → brand → design system → homepage → campaign pages → donation platform → email → analytics → ad-tech infrastructure.

---

## 0. Headline numbers

- **55 commits** landed to `main` by a single contributor
- **26 distinct pages** (campaign + marketing + legal + utility)
- **~96 dynamic prayer-times pages** (per-city SSR)
- **13 MDX blog articles** (Zakat / Sadaqah / Islamic finance)
- **24 reusable React components**
- **18 shared library modules**
- **11 API routes** (including 2 Vercel Cron handlers)
- **4 Supabase migrations** (donations + gift aid + attribution + OCI)
- **9 root-level planning / design-system / audit documents** authored
- **1 full-stack Stripe donation platform** (one-time + monthly + self-service portal)

---

## 1. Tech stack

### Runtime & framework
- **Next.js 16.2.3** App Router with React Server Components
- **React 19.2.4**, **TypeScript 5**
- **Turbopack** for dev; server components for data fetching
- `next/font` for Source Serif 4 + DM Sans with `display: swap`
- `next/image` throughout, with explicit `sizes` for responsive serving

### Styling
- **Tailwind CSS v4** (latest) with `@tailwindcss/postcss`
- Hand-built design system on top of Tailwind tokens (not a UI library)

### Backend / data
- **Supabase** (Postgres + service-role admin client) for donations, donors, Gift Aid declarations, webhook events
- **Row-Level Security** enabled on all tables (service-role only)
- Postgres **triggers** for `updated_at`, **partial indexes** for hot cron queries
- **Upstash Redis** for distributed rate limiting on donation APIs
- **Sentry** for error monitoring with env-gated DSN

### Payments
- **Stripe** (server SDK `stripe@22`, client `@stripe/react-stripe-js`, `@stripe/stripe-js@9`)
- Payment Element (card + Apple Pay + Google Pay in one form)
- **PaymentIntent** flow for one-time donations
- **SetupIntent + Customer + Subscription** flow for monthly donations
- **Webhook** signature verification (raw-body parsing)
- **Billing Portal** via signed magic-link URLs (donor self-service)

### Email
- **Resend** for transactional email
- Hand-built responsive HTML receipt + plain-text fallback
- **Inline logo attachment** via Resend `contentId` (`cid:logo`) so receipts render before DNS cutover

### Content
- **MDX** via `@next/mdx` + `next-mdx-remote` + `gray-matter` frontmatter
- 13 blog articles on Zakat/Sadaqah topics with FAQ schema per post

### Motion & UX polish
- **Framer Motion** for scroll and state transitions (used sparingly)

### Deployment & ops
- **Vercel** (App Router serverless functions + Cron)
- **Vercel Cron** schedules: nightly Swiftaid submission, 6-hourly Google Ads OCI upload
- Environment-variable-gated integrations — every third-party no-ops safely when its key is unset

---

## 2. Pages built (26 + dynamic)

### Donation campaign pages
Each has: hero with keyword-matched H1, field-evidence photography with location/date ProofTag, donation form (one-time/monthly toggle + custom amount + Gift Aid math), delivery-assurance 3-step process, FAQ with JSON-LD, final CTA.

- `/palestine` — Palestine / Gaza emergency relief
- `/cancer-care` — childhood cancer care (Gulucuk Evi centre, Turkey)
- `/orphan-sponsorship` — monthly orphan sponsorship
- `/build-a-school` — Sadaqah Jariyah school-building
- `/clean-water` — Sadaqah Jariyah water projects
- `/uk-homeless` — Brighton rough-sleeper outreach
- `/zakat` — Zakat (with 100% Zakat policy), 4 pathways
- `/sadaqah` — Sadaqah + Sadaqah Jariyah

### Marketing / information pages
- `/` — homepage (hero + GivingPathways + Impact + OurStory + CancerCareCentres + FeaturedCampaign + CampaignsGrid + Partners + Newsletter + FAQ)
- `/about` — story, team, charity regulation
- `/our-work` — portfolio of active programmes
- `/contact` — form → Resend email
- `/volunteer` — form → Resend email
- `/blog` — MDX-driven, category-filtered listing
- `/blog/[slug]` — individual article with FAQ schema, related posts
- `/prayer-times` — city directory
- `/prayer-times/[city]` — per-city SSR prayer times with schema (~96 cities)

### Donor-facing conversion flow
- `/donate` — Stripe Elements checkout with campaign/amount/frequency seeded via URL
- `/donate/thank-you` — server-side PI/SI status resolution → success/processing/failed states + conversion event firing
- `/manage` — signed-token landing; exchanges for Stripe Billing Portal session
- `/manage/done` — post-portal return state

### Legal / utility
- `/privacy`, `/terms`, `/accessibility`, `/safeguarding`
- `/auth` — site password gate (pre-launch preview protection)

### SEO infrastructure pages
- `src/app/sitemap.ts` — builds sitemap from core routes + campaigns + blog + prayer-time cities
- `src/app/robots.ts` — allow `/`, disallow `/api/`
- `src/app/manifest.ts` — PWA manifest

---

## 3. Components (24)

### Layout + navigation
- `Header` — fixed, scroll-condensing, campaign-aware Donate CTA that deep-links to the campaign's donation anchor
- `Footer` — 4-column structured links, address blocks, cookie-management link, legal
- `Button` — design-system primitive (3 variants × 3 sizes)
- `JsonLd` — injects structured-data payloads
- `BreadcrumbSchema` — BreadcrumbList JSON-LD helper
- `Skeleton` — loading primitive

### Homepage sections
- `Hero`, `Impact`, `OurStory`, `GivingPathways`, `CampaignsGrid`, `FeaturedCampaign`, `CancerCareCentres`, `Partners`, `Newsletter`, `TrustBar`

### Campaign-specific
- `ProofTag` — signature "Proof & Proximity" location/date overlay badge on photography
- `LazyVideo` — poster-first-then-play component (saves ~10 MB of hero-video weight per mobile pageview)

### Ad-tech / compliance (built in this project)
- `AttributionCapture` — reads `gclid`/`gbraid`/`wbraid`/`fbclid`/`utm_*` from URL → persists to first-party cookie with last-click-wins merge
- `ConsentBootstrap` — `beforeInteractive` `next/script` that sets `gtag('consent', 'default', ...)` to denied, restores a prior decision from the cookie, conditionally loads GA4 behind an env var
- `ConsentBanner` — ICO-compliant bottom-bar (equal-weight Accept/Reject/Customise) + granular settings modal (Essential / Analytics / Advertising toggles)
- `ManageCookiesLink` — footer button that re-opens the settings modal via a custom DOM event

### Blog
- `mdx-components` — MDX prose + FAQ-schema renderer

### Prayer times
- `PrayerTimesUI` — client-side interactivity on top of SSR data

---

## 4. Library modules (18)

- `campaigns.ts` — campaign allow-list, label map, receipt-message map, amount bounds
- `donationSchema.ts` — builds `WebPage` + `FundraisingEvent` + `DonateAction` JSON-LD per campaign (with optional geographic `Place`)
- `stripe.ts` — shared Stripe SDK instance, pence ↔ GBP conversion helpers
- `supabase.ts` — service-role admin client factory
- `donation-receipt.ts` — email template builder (HTML + plaintext), Resend dispatcher, inline logo attachment loader
- `gift-aid.ts` — 25% uplift calculator, HMRC declaration-text constants, type definitions for `this-donation-only` vs `past-4-years-and-future` scopes
- `swiftaid.ts` — Swiftaid submission API client (env-var-gated skeleton)
- `admin-auth.ts` — bearer-token check for cron + admin routes
- `rate-limit.ts` — Upstash-backed per-IP rate limiter with standard 429 response helper
- `signed-token.ts` — HMAC-signed manage-tokens for donor self-service magic links
- `attribution.ts` — cookie schema + parse/serialize + Stripe-metadata flattener for ad attribution
- `consent.ts` — Consent Mode v2 state types + cookie read/write + gtag signal mapping
- `analytics.ts` — `trackEvent` / `trackDonationPurchase` dataLayer wrapper (safe when gtag absent)
- `google-ads.ts` — plain-fetch Google Ads REST client: OAuth2 token refresh with caching, `uploadClickConversions` batcher with partial-failure handling, SHA-256 hasher for Enhanced Conversions
- `blog.ts`, `blog-faqs.ts` — MDX loader, frontmatter parser, FAQ-schema extractor
- `prayer-times.ts` — per-city prayer calculations
- `cities.ts` — 96-city metadata registry

---

## 5. API routes (11)

### Donation flow
- `POST /api/donations/create-intent` — creates PaymentIntent (one-time) or SetupIntent + Customer (monthly). Validates amount against MIN/MAX bounds + campaign allow-list. Reads attribution cookie server-side and flattens into Stripe metadata as `attr_*` keys. Upstash rate-limited.
- `POST /api/donations/confirm` — writes pending donation row + donor upsert + Gift Aid declaration (with IP + UA audit trail). Writes attribution columns + consent snapshot. Cross-validates against Stripe-retrieved intent (prevents amount tampering).

### Stripe event processing
- `POST /api/stripe/webhook` — signature-verified Stripe event handler. Events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`, `setup_intent.succeeded`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.deleted`. Idempotent via `stripe_webhook_events.stripe_event_id` unique constraint. Creates Subscription server-side on `setup_intent.succeeded`; inserts renewal rows on `invoice.paid`.

### Donor self-service
- `POST /api/auth` — password-based preview-gate auth (dev-only)
- Billing Portal session exchange via signed tokens (handled inside `/manage` page handlers)

### Form endpoints
- `POST /api/contact` — validation + Resend dispatch
- `POST /api/volunteer` — validation + Resend dispatch
- `POST /api/newsletter` — email capture + Resend

### Utility
- `GET /api/nisab` — current gold/silver-based Nisab value for the Zakat page

### Admin
- `GET /api/admin/export-gift-aid` — bearer-authed HMRC-format CSV export (6-year retention compliance)

### Scheduled jobs (Vercel Cron)
- `GET /api/cron/swiftaid-submit` — daily 02:00 UTC. Selects Gift-Aid-claimed succeeded donations not yet submitted, POSTs to Swiftaid API, marks as submitted. Env-var-gated.
- `GET /api/cron/google-ads-oci` — 6-hourly. Selects donations with `gclid + ad_storage_consent = true + not uploaded`. Batch-uploads to Google Ads Conversions API with Enhanced Conversions user identifiers (SHA-256 email, gated by `ad_user_data_consent`). Partial-failure handling per row. Idempotent. Env-var-gated.

---

## 6. Donation platform (full-stack)

**End-to-end card processing for one-time and monthly donations, plus donor self-service.**

### Checkout client
- `CheckoutClient.tsx` — state machine for amount + frequency + donor details + Gift Aid form + Stripe Payment Element
- Amount editable mid-checkout without losing form state
- Gift Aid declaration with verbatim HMRC-approved wording, donor-acknowledged
- Apple Pay / Google Pay / Card in one flow

### One-time flow
```
/donate → create-intent (PaymentIntent) → confirm (pending row + donor upsert)
         → Stripe.confirmPayment → /donate/thank-you → webhook payment_intent.succeeded
         → mark succeeded + send receipt
```

### Monthly flow
```
/donate → create-intent (Customer + SetupIntent) → confirm (pending row)
         → Stripe.confirmSetup → /donate/thank-you (processing state)
         → webhook setup_intent.succeeded → create Product + Price + Subscription
         → webhook invoice.paid (month 1 fills pending row; month 2+ insert new rows)
         → receipt per renewal
```

### Monthly subscription hardening
- Loud failure alerts via Sentry when subscription creation fails (the donor has paid; their subscription must exist)
- `customer.subscription.deleted` handler to mark cancelled subscriptions in DB
- Atomic creation: Product → Price → Subscription, with cleanup on partial failure

### Donor self-service (no account system)
- Monthly receipts include a link to `/manage?token=...`
- Token is HMAC-signed with `APP_SECRET`, embeds `customer_id` + expiry
- `/manage` verifies signature, creates a Stripe **Billing Portal** session, redirects donor in
- 90-day token TTL, effectively rolls forward with each monthly receipt

### Gift Aid pipeline (HMRC compliance)
- Declaration captured server-side with IP + User-Agent + verbatim declaration text
- Stored with scope (`this-donation-only` vs `this-and-past-4-years-and-future`) and `revoked_at` nullable
- 6-year retention (HMRC rule) — `ON DELETE RESTRICT` on donor/declaration FKs
- CSV export endpoint generates HMRC-format claim files
- Swiftaid integration scaffolded for automated claim submission

### Receipts
- Resend-dispatched HTML + plaintext
- Campaign-specific gratitude copy per donation (Palestine → "Your gift reaches families in Gaza...", Zakat → asnaf language, etc.)
- Inline logo as attachment (`cid:logo`) so receipts render before DNS cutover
- Gift Aid uplift math shown ("£100 → £125")
- Monthly receipts include a signed billing-portal link

### Rate limiting
- Upstash sliding-window rate limit on `/api/donations/create-intent` to prevent PaymentIntent flooding (a failure mode that can cost real money via Stripe's per-intent fees)

---

## 7. Analytics + ad infrastructure (built in this project)

### Cookie consent (ICO / PECR / GDPR compliant)
- Bottom-bar banner with Accept / Reject / Customise as **equal-weight** buttons (ICO non-nudge requirement)
- Granular settings modal (Essential / Analytics / Advertising) with toggle switches
- State persisted to first-party `dr_consent` cookie (6-month TTL, SameSite=Lax)
- "Manage cookies" link in footer opens the modal via custom DOM event
- Versioned consent payload — bumps invalidate old decisions so the user is re-asked after material changes

### Google Consent Mode v2
- `beforeInteractive` bootstrap sets all four signals (`ad_storage`, `analytics_storage`, `ad_user_data`, `ad_personalization`) to denied
- Prior decisions restored from cookie synchronously before hydration (no denied→granted flicker)
- `gtag('consent', 'update', ...)` fires on every user decision
- Works correctly even when GA4 is not yet loaded (satisfies the legal requirement independently)

### Env-var-gated GA4
- `NEXT_PUBLIC_GA4_MEASUREMENT_ID` controls whether the GA4 script loads at all
- When unset (current state, pre-DNS-cutover) no analytics scripts run, no data leaves the browser
- When set (post-cutover), GA4 loads, respects consent signals, fires standard `purchase` event on conversion

### Ad-click attribution pipeline
- Client-side `AttributionCapture` reads `gclid`, `gbraid`, `wbraid`, `fbclid`, and all `utm_*` params from the landing URL
- Writes to first-party `dr_attribution` cookie with 90-day TTL (matches Google's gclid window)
- Model is last-click wins; organic returns with no params don't erase earlier attribution
- `/api/donations/create-intent` reads cookie server-side, flattens into Stripe PaymentIntent metadata as `attr_*` keys
- `/api/donations/confirm` reads cookie, writes 12 attribution columns + 2 consent-snapshot columns onto the donations row

### Google Ads Offline Conversion Import
- `src/lib/google-ads.ts` — plain-fetch REST client (no SDK dependency)
- OAuth2 refresh-token flow with in-memory access-token cache
- `uploadClickConversions` batches up to 500 per call with per-row partial-failure handling
- 6-hourly Vercel Cron processes eligible donations: `status=succeeded AND gclid IS NOT NULL AND ad_storage_consent=true AND not yet uploaded`
- Marks `google_ads_uploaded_at` on success; records `google_ads_upload_error` on failure (retries next tick)
- Server-side **Enhanced Conversions** — SHA-256-hashes donor email (normalized + lowercased) and includes as `userIdentifiers` when `ad_user_data_consent=true`
- Entire stack env-var-gated — safe no-op until Google Ads developer-token approval lands

### Client-side Enhanced Conversions
- Browser-side SHA-256 of donor email via `crypto.subtle` in `TrackConversion`
- Attached as `user_data` to the purchase event only when consent permits
- Fires once per `transaction_id` via ref-guard (Strict Mode–safe)

### Purchase conversion event
- GA4-standard `purchase` event on `/donate/thank-you` success render
- Includes `transaction_id`, `value`, `currency`, `affiliation`, `items[]` with campaign slug + label
- Fires for both one-time and monthly (first-month value)

---

## 8. SEO (structured data + technical)

### Structured data (JSON-LD)
- **Root layout** emits `NGO` schema (charity number, company number, addresses, founders, social profiles, `areaServed`, `nonprofitStatus`) and `WebSite` schema with `SearchAction`
- **Per-campaign** `WebPage` + nested `FundraisingEvent` + `DonateAction` with optional geographic `Place` (Gaza, Bangladesh, Turkey, UK)
- **FAQPage** on every campaign page (6+ questions each)
- **BreadcrumbList** helper applied everywhere
- **Blog posts** get `Article` + per-post `FAQPage` extracted from MDX frontmatter
- **Prayer times** city pages get their own structured markup

### Technical SEO
- Keyword-matched H1s per page (e.g. "Donate to Gaza Emergency Relief")
- Meta titles trimmed to <60 chars, descriptions <160
- `alternates.canonical` set per page
- OpenGraph + Twitter Card tags on every public page
- `sitemap.ts` generates from core + campaigns + blog + 96 city pages
- `robots.ts` allows `/`, disallows `/api/`
- Checkout and thank-you pages `noindex` / `noindex, nofollow`
- Blog dates visible + `datePublished` / `dateModified` in schema

---

## 9. Performance engineering

- `next/font` with `display: swap` for Source Serif 4 + DM Sans (no CLS from font load)
- `next/image` with `priority` on LCP candidates, explicit `sizes` attributes throughout
- **Hero video compression** — re-encoded Gaza field video from 14.4 MB → 9.6 MB (H.264, CRF 23, audio-stripped, `+faststart` for progressive streaming), with original preserved locally
- **Poster-first `LazyVideo`** — mobile visitors pay 0 bytes for hero video unless they tap play (saves ~10 MB per mobile pageview)
- Dynamic routes use SSR (not CSR) for prayer times to keep 96 city pages indexable without client-side fetch
- Partial indexes in Postgres for cron hot-query paths so `donations` scans stay O(pending) not O(total)

---

## 10. Security & compliance

### Payment security
- All amount validation server-side (can't fabricate a £0.01 or £10M donation)
- Campaign slug validated against allow-list
- Stripe webhook signature verification with raw-body parsing (any failure drops the event)
- Cross-validation between client-submitted `paymentIntentId` and server-retrieved PI.metadata

### Auth & secrets
- Bearer-token auth on admin + cron routes (`CRON_SECRET`, `ADMIN_API_TOKEN`)
- HMAC-signed magic-link tokens for donor portal (no user-password system)
- Site-wide password gate via middleware for pre-launch preview
- Supabase service-role key server-only; client gets anon key
- `.env.example` documents every secret with generation command hints

### Rate limiting
- Upstash Redis sliding-window on `create-intent` — prevents PaymentIntent flooding
- Graceful standard-429 response with `Retry-After` header

### Data protection (UK GDPR / PECR)
- Consent Mode v2 with ICO-compliant banner (equal-weight buttons)
- Default-denied state for all four consent signals
- Versioned consent record for re-asking after material changes
- 6-year retention on Gift Aid declarations (HMRC rule) enforced via `ON DELETE RESTRICT`
- Revocation semantics (`revoked_at` nullable) rather than hard-delete
- IP + User-Agent audit trail on every Gift Aid declaration

### Operational
- Every third-party integration (Stripe, Supabase, Resend, Upstash, Sentry, Google Ads, Swiftaid) has an env-var guard — safe no-op when keys are missing
- Sentry error monitoring with source-map upload during build
- Structured logging (`console.log` tags like `[webhook]`, `[cron/google-ads-oci]`) for greppable production diagnostics

---

## 11. Design system ("Proof & Proximity")

Custom brand strategy authored in a separate planning framework (`/plan-brand`).

- **Visual thesis**: intimate crops + location/date evidence tags ("proof") + close, unstaged photography of actual field work ("proximity") — positioning against the generic aid-charity hero-image convention
- **Typography**: Source Serif 4 (display) + DM Sans (body) — contrast between editorial seriousness and functional clarity
- **Colour**: cream base, charcoal text, green emphasis, amber accent, dark-green deep states
- **Spacing philosophy**: generous vertical rhythm, editorial-magazine composition
- **Signature component**: `ProofTag` — location/date pill applied to every piece of field photography, creating visual differentiation from templated charity websites

---

## 12. Frameworks authored (Claude Agent SDK skills)

Built four orchestrated "planning frameworks" that consume each other's outputs — meta-work that produces deterministic, implementable plans before code is touched:

- **`/plan-brand`** — competitor teardowns, white-space differentiation, positioning manifested in the website
- **`/plan-design-system`** — formal design system extraction from an approved homepage build
- **`/plan-website`** — wireframes, final copy, exact tokens, asset mapping, state specs, acceptance gates
- **`/plan-seo`** — keyword research, SERP analysis, site architecture, schema recipes, metadata conventions, measurement kit

Each framework produces hand-offable artefacts consumed by the next.

---

## 13. Root-level documentation (authored)

- `README.md`
- `HOMEPAGE-REDESIGN-PLAN.md`
- `DESIGN-SYSTEM.md`
- `CAMPAIGN-PAGE-DESIGN-SYSTEM.md`
- `PROOF-AND-PROXIMITY-IMPLEMENTATION.md`
- `VISUAL-DIFFERENTIATION-STRATEGY.md`
- `STRIPE-SWIFTAID-INTEGRATION.md`
- `GA-PALESTINE-AUDIT.md` (paid-acquisition readiness audit for the Palestine landing page)
- `SHOP-PLAN.md` (post-launch Shopify Headless roadmap)

---

## 14. Notable engineering decisions

- **Env-var-gated integration shim pattern** applied consistently: Stripe, Resend, Supabase, Upstash, Sentry, Swiftaid, GA4, Google Ads OCI. Every integration ships behind an env var that, when unset, makes the feature a no-op. Production readiness decoupled from local-dev config.
- **Source-of-truth separation**: `donations` row is the permanent audit log; Stripe metadata is debug-layer convenience; consent + attribution cookies decay. Consent state is *snapshotted* onto the donations row at conversion time so downstream OCI isn't subject to cookie drift.
- **Plain-fetch Google Ads REST client** rather than the official SDK — ~6 MB dependency saved, easier to audit.
- **Signature verification before JSON parse** on Stripe webhook — raw-body handling to prevent signature drift from reformatting.
- **Two-stage donation insert**: `/confirm` writes `status=pending`; webhook flips to `succeeded`. Guarantees no phantom donations if the webhook never fires.
- **Idempotency via intent ID + unique constraint on webhook events**: double-processing impossible even under Stripe retry storms.
- **Consent-gated OCI upload**: only donations whose donor consented to `ad_storage` at conversion time are eligible for upload; Enhanced Conversions user identifiers gated separately on `ad_user_data`.
- **Poster-first video pattern**: `LazyVideo` component defers `<video>` mount until tap — mobile LCP improvement without affecting desktop atmosphere.
- **Charity-vertical policy-safe copy**: "100% pledge on emergency relief" (substantiable) rather than "100% to relief" (ambiguous) across every campaign page.

---

## 15. Third-party integrations (complete list)

- **Stripe** — payments, subscriptions, billing portal, webhooks
- **Supabase** — Postgres + admin client
- **Resend** — transactional email
- **Upstash Redis** — rate limiting
- **Sentry** — error monitoring + source maps
- **Google Ads API** — Offline Conversion Import + Enhanced Conversions
- **Google Consent Mode v2** — via gtag
- **GA4** (scaffolded, env-gated)
- **Swiftaid** — Gift Aid claim submission (scaffolded)
- **HMRC** — via Gift Aid CSV export
- **Charity Commission** — external link with linked schema identifier
- **Google for Nonprofits / TechSoup** (vetting path documented)

---

## 16. What the project demonstrates (for CV framing)

### Full-stack engineering
- Next.js 16 App Router, RSC, server actions, middleware, cron handlers
- Server-side Stripe integration end-to-end (one-time + subscriptions + self-service portal + webhooks + refund handling)
- Postgres schema design, migrations, partial indexes, RLS, triggers
- Third-party API integration without SDK bloat (Google Ads REST client written from docs)

### Product & conversion engineering
- Donation platform with live Gift Aid math, amount anchoring, outcome copy per tier
- Ad-click attribution pipeline closing the loop from landing → checkout → offline conversion import
- Mobile-first conversion design (form integrated into hero on mobile, poster-first video)
- Multi-step UX flow (one-time + async monthly via SetupIntent + webhook-born subscription)

### Compliance & governance
- UK GDPR + PECR + ICO-compliant consent (equal-weight buttons, versioned consent, granular controls)
- Google Consent Mode v2 wired correctly (defaults-denied, restored pre-hydration)
- HMRC Gift Aid compliance (verbatim declarations, IP/UA audit, 6-year retention, CSV export)
- Charity-vertical ad-policy-safe copy

### SEO & technical marketing
- Deep structured-data stack (NGO + FundraisingEvent + DonateAction + FAQPage + BreadcrumbList + Article)
- Keyword-matched H1 pattern, canonical URL discipline, sitemap automation
- 96 dynamic city-specific SSR pages for prayer-times vertical
- Performance optimisation (next/font, next/image, video compression, lazy media, partial DB indexes)

### Design & brand
- End-to-end brand strategy ("Proof & Proximity") authored, then implemented in code
- Custom design tokens (no UI library), signature `ProofTag` component establishing visual differentiation
- Editorial typography pairing (Source Serif 4 + DM Sans)

### DevOps & ops
- Vercel deployment, serverless functions, Cron scheduling
- Environment-variable discipline (every integration env-gated, `.env.example` fully documented)
- Sentry monitoring with source maps
- Structured logging conventions
- Git discipline (55 commits, one-line summaries, focused scope per commit)

### Systems thinking
- Built four interlocking planning frameworks (`/plan-brand`, `/plan-design-system`, `/plan-website`, `/plan-seo`) that consume each other's outputs — deterministic, repeatable project execution rather than ad-hoc iteration

---

*End of inventory. Feed this document to an AI alongside the instruction "Summarise into [CV bullet points / LinkedIn About section / portfolio case study / technical interview talking points] for a [role-title] position." Tailor the role-title to the job you're applying for — the same inventory supports framings as frontend engineer, full-stack engineer, product engineer, technical founder, or solo contractor.*
