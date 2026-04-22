# Palestine Landing Page — Google Ads Acquisition Audit

**Page:** `/palestine` (https://deenrelief.org/palestine)
**Primary campaign goal:** paid search traffic → click → `/donate` → `/donate/thank-you`
**Audit date:** 2026-04-22
**Audit focus:** maximising acquisition efficiency (CPC, CPA, Quality Score, Landing Page Experience). CRO/conversion-rate is noted where relevant but is not the primary lens.

---

## 0. TL;DR

The landing page itself is **unusually strong** for paid acquisition — keyword-matched H1, deep structured data, on-message copy, mobile-integrated donation form, field evidence, FAQ coverage of Zakat/Gift Aid/admin/regulation.

**The funnel around it is not yet ready for paid spend.** Zero analytics are installed, there is no click-ID/UTM capture, no Consent Mode v2, and a 14 MB autoplaying video on mobile will hurt Landing Page Experience. Ad-policy-risk language ("100% to Relief", "3,200+ donors") appears in multiple places.

**Hard blockers before GA spend starts:**
1. Install GA4 + GTM + conversion tracking
2. Persist `gclid` / UTM params through the funnel → donation row
3. Install consent banner + Consent Mode v2 (EEA/UK requirement)
4. Compress the Gaza field video and lazy-load it
5. Tighten unverifiable claims to pass Google Ads charity vetting

Everything else is optimisation work after launch.

---

## 1. What's on the page

**Above the fold (hero):**
- Full-bleed background image (`palestine-relief.webp`, 168 KB) with a dark gradient overlay
- Eyebrow: "Palestine Emergency Appeal"
- **H1: "Donate to Gaza Emergency Relief"** — matches head-term paid-search queries directly
- Sub-headline (italic, serif): "A family in Gaza needs you right now."
- Supporting paragraph: food / water / medical / shelter; delivered directly by teams on the ground
- Trust strip: `Charity No. 1158608 · 100% to Relief · Gift Aid Eligible`
- Desktop: `Help a Family Now` CTA → anchor `#donate-form`
- Mobile: the full `DonationForm` component is rendered **inline inside the hero**
- `ProofTag` location pin ("Gaza", bottom-right)

**Below the fold (in order):**
1. **Donation panel** (desktop only — image left, form right with `ProofTag Gaza 2026`)
2. **Partners** — 6 logos (Islamic Relief, Bangladesh Red Crescent, Human Appeal, Food Bank, Umma Welfare Trust, Read Foundation)
3. **Where Your Donation Goes** — H2 "Direct Relief for Families in Gaza" + 4 benefit cards (Food & Clean Water, Medical Supplies, Shelter & Essentials, Prepared Aid Stocks)
4. **Field Evidence** — H2 "We Don't Send Aid From a Distance" + 1 autoplaying video + 2 photos, all with `ProofTag` date/location
5. **Delivery Assurance** — H2 "From Your Donation to a Family in Gaza" + 3-step process (Verify / Allocate / Report) + trust stats row
6. **FAQ** — 6 questions (reach, Gift Aid, Zakat eligibility, monthly, admin %, regulation)
7. **Final CTA** — green-dark section with `MiniDonationPicker` (full amount selector, not just a button)

**Global chrome:**
- Fixed `Header` with full nav (Home, Our Work, Pay Zakat, Prayer Times, About, Blog, Contact) + logo + persistent "Donate" CTA
- `Footer` rendered at bottom

---

## 2. Donation form mechanics (hero form & final CTA share state definitions)

- Frequency toggle: one-time / monthly
- Presets:
  - One-time: **£25 / £50 (Popular) / £100 / £250**
  - Monthly: **£10 / £25 (Popular) / £50 / £100**
- Each preset shows a specific outcome line ("Feeds a displaced family of five for one month")
- Custom amount input; floors to nearest tier outcome
- Minimum £5; below that the CTA is disabled with explicit messaging
- Live Gift Aid math: "With Gift Aid: £{amount × 1.25} at no extra cost"
- Payment methods noted: "Secure checkout · Apple Pay · Google Pay · Card"
- Trust microcopy: "100% to emergency relief · Reg. charity 1158608" (or "Cancel anytime" for monthly)
- Escape hatches to `/zakat` and `/sadaqah` below the CTA (good for query-intent mismatch)

**CTA URL contract (important for tracking design):**
```
/donate?campaign=palestine&amount=50&frequency=one-time
```
The `/donate` route validates the campaign against the `CAMPAIGNS` allow-list (`src/lib/campaigns.ts`), so unknown slugs fall back to "general". The state is preserved through to checkout.

---

## 3. SEO & ad-relevance signals

**Metadata (`src/app/palestine/layout.tsx`):**
- `<title>`: `Donate to Gaza Emergency Relief | Deen Relief` (49 chars)
- `<meta description>`: 128 chars, mentions donors-since-2013, food/water/medical, Gift Aid, charity number
- Canonical: `/palestine`
- OG + Twitter tags set, hero image used

**Structured data on this route:**
| Schema | Source |
|---|---|
| `NGO` (organization) | `src/app/layout.tsx` (root, site-wide) |
| `WebSite` | `src/app/layout.tsx` (root, site-wide) |
| `WebPage` + nested `FundraisingEvent` + `DonateAction` | `src/lib/donationSchema.ts` |
| `BreadcrumbList` | `src/components/BreadcrumbSchema.tsx` |
| `FAQPage` | in-file on `/palestine/page.tsx` |

The NGO schema includes: charity number (1158608), Companies House (08593822), `nonprofitStatus: LimitedByGuaranteeCharity`, two physical UK addresses, two contact points, four `areaServed` countries, socials, founding date, founder. This is **exceptional** for a charity landing page and is a meaningful Quality Score input.

**Keyword coverage on page:**
- Strong: "donate to gaza", "gaza emergency relief", "palestine appeal", "food/water/medical/shelter gaza", "gift aid donation", "zakat for gaza" (FAQ)
- Moderate: "UK Islamic charity Palestine", "monthly Palestine donation"
- Under-emphasised: brand queries ("Deen Relief"), urgency modifiers (today/now used once each)

**Sitemap / robots (`src/app/sitemap.ts`, `src/app/robots.ts`):**
- `/palestine` in sitemap at priority 0.9, weekly change frequency
- Robots allows `/`, disallows `/api/`
- `/donate` is `noindex, follow` (correct — stops checkout pages from ranking)
- `/donate/thank-you` is `noindex, nofollow` (correct)

---

## 4. Trust & credibility surface

- Charity Commission number **1158608** — visible in hero, trust strip, footer, FAQ, schema
- Companies House number **08593822** — in schema + FAQ
- "Trusted by 3,200+ donors since 2013" — form + final CTA
- "Audited annually" — trust stats row
- "100% to Relief" / "100% to emergency relief" — hero, form, trust strip (⚠ see §8.5)
- Partner logos row (unverified whether these are formal partnerships)
- Field video and photos, all tagged with `Gaza · 2026` via `ProofTag`
- FAQ links out to the Charity Commission register (external authority signal)

---

## 5. Conversion path

```
Google Ad
  └─> /palestine (LP)
        └─> /donate?campaign=palestine&amount=X&frequency=Y
              └─> CheckoutClient (Stripe Elements, 625 LOC)
                    └─> stripe.confirmPayment() / confirmSetup()
                          └─> /donate/thank-you?payment_intent=... | setup_intent=...
                                └─> Webhook lands → donation row + receipt email
```

- `/donate/thank-you` resolves PI/SI server-side via Stripe, renders Success / Processing / Failed states
- Email receipt fires from the webhook, not from the thank-you page (receipt is not a proxy for conversion-event timing)
- Monthly flow is async: SetupIntent succeeds immediately, the first invoice lands via webhook. The thank-you page reflects this with a "processing / set up" state.

---

## 6. Performance / Core Web Vitals signals

- Next.js Image used throughout; hero image has `priority` ✓
- `next/font` used for Source Serif 4 + DM Sans with `display: swap` ✓
- Hero photo: 168 KB WebP — healthy
- **Gaza field video: `/videos/gaza-field.mp4` = 14.4 MB**, `autoPlay muted loop` on both mobile and desktop layouts. This is the single biggest performance liability. It will:
  - Blow the mobile data budget of many users
  - Likely push LCP into "Poor" on 4G
  - Cost Landing Page Experience scoring in Google Ads
- No third-party tags currently present (itself a blocker — see §8.1)

---

## 7. Escape routes from the landing page

Present, working:
- Header logo → `/`
- Header nav (7 links) → away from LP
- Header "Donate" CTA → anchors to `#donate-form` (reinforces conversion — good)
- FAQ internal links to `/about`, `/zakat`, `/sadaqah`, `/blog/zakat-vs-sadaqah-difference`, external Charity Commission register
- Donation form "Paying Zakat or Sadaqah instead?" → `/zakat`, `/sadaqah`

For PPC traffic this is more escape than typical best practice. Zakat/Sadaqah side-routes are arguably *intentional* recovery (user searched for Zakat but hit Palestine page) — keep. The top-nav is the main bleed.

---

## 8. CRITICAL GAPS — things that must be resolved before spending

### 8.1 No analytics installed anywhere
Verified: no `gtag`, no `dataLayer`, no GTM script, no GA4 measurement ID, no vendor tag (Meta, LinkedIn, Hotjar, Clarity, PostHog, Mixpanel) present anywhere in the codebase or `.env.example`.

**Without this you cannot:**
- Measure CPA / ROAS / conversion rate
- Run Smart Bidding (tCPA, Max Conversions, Max Conversion Value) — these need conversion data to train
- Measure Landing Page Experience meaningfully

**Required for launch:**
- GA4 property + GTM container installed in `src/app/layout.tsx` (via `next/script`)
- Purchase-equivalent conversion event on `/donate/thank-you` when `SuccessState` renders (amount, currency, campaign, transaction ID)
- Same event on `SetupIntent` success for monthly (use amount × 12 for value, or the first month only — pick and document)
- Import GA4 conversion into Google Ads (preferred over client-side gtag event) so it rides consent mode
- **Enhanced Conversions**: hash the donor email client-side (or server-side via Google Ads API) and pass with the conversion — major lift for Smart Bidding in cookieless contexts
- **Offline Conversion Import (strongly recommended)**: capture `gclid` into the donation row (see §8.2), then batch-upload refunded/net donations via Google Ads API so Smart Bidding trains on *actual* net revenue, not gross intent

### 8.2 No click-ID / UTM persistence
Verified: zero occurrences of `gclid`, `gbraid`, `wbraid`, `fbclid`, or any `utm_` string in the codebase.

**Without this you cannot:**
- Attribute donations to campaigns / ad groups / keywords
- Do offline conversion imports (Google Ads needs the `gclid` to credit the click)
- Separate paid from organic performance

**Required for launch:**
- Client-side on `/palestine` (or a root layout component): read `gclid`, `gbraid`, `wbraid`, `utm_*` from `window.location.search`, persist to a first-party cookie (90-day TTL)
- `DonationForm` / `MiniDonationPicker` CTA: read those values and forward them in the `/donate` URL (or from cookie again on `/donate`)
- `CheckoutClient` → pass click ID + UTM into `PaymentIntent.metadata` / `SetupIntent.metadata` on `create-intent`
- Webhook → persist to `donations` row (new columns: `gclid`, `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`) — migration required
- Scheduled job (or on-webhook) → Google Ads Offline Conversions API upload

### 8.3 No cookie consent / no Consent Mode v2
Verified: no consent banner, no `gtag('consent', 'default', ...)`, nothing in `layout.tsx` or middleware.

**Regulatory reality:**
- UK PECR + UK GDPR require explicit consent for non-essential cookies (analytics, advertising)
- From March 2024 Google mandates **Consent Mode v2** for any EEA/UK traffic. Without it, Google Ads conversion measurement is throttled heavily and remarketing audiences are disabled entirely — you will overspend significantly.

**Required for launch:**
- A consent banner (Cookiebot, Osano, Iubenda, or hand-rolled) that emits the Consent Mode v2 signals: `ad_storage`, `analytics_storage`, `ad_user_data`, `ad_personalization`
- Default state: all denied (on first visit)
- Update state when user accepts
- Wire into GTM so tags fire only after consent (or fire with consent signals attached, letting Google model behavior)

### 8.4 Hero video weight
- `/videos/gaza-field.mp4` 14.4 MB, autoplaying on mobile and desktop
- Compress with ffmpeg to ~2–3 MB, ideally serve WebM + MP4 with `<source>` fallback
- On mobile specifically: consider poster-only + tap-to-play to save LCP
- OR move the video below the fold and ensure it is not a render-blocking asset (it currently is not, but autoplay still kicks off decoding immediately)

### 8.5 Ad-policy-risk language
Google Ads charity vertical has stricter scrutiny than most. Two phrases on the page risk a disapproval or manual review:

1. **"100% to Relief" / "100% to emergency relief"** — repeated 3× on the page (hero strip, form microcopy, trust stats). The FAQ acknowledges a 10% admin cap, which contradicts the hero claim. We've already pulled "100%" from the receipt email for the same reason. Options:
   - Replace hero strip line with something verifiable, e.g. `Charity No. 1158608 · Gift Aid eligible · Since 2013`
   - Replace form microcopy with `Delivered directly — audited annually`
   - Keep the 100% phrasing only where it's actually ring-fenced (if there's a 100% Zakat policy, use it there)

2. **"Trusted by 3,200+ donors since 2013"** — fine if substantiated; be ready during Google's charity vetting (via TechSoup / Ad Grants) to show the count.

### 8.6 Thank-you page has no conversion event
`/donate/thank-you` is correctly `noindex, nofollow`, correctly renders the donation summary, but **emits zero tracking events.** The conversion happens here and is invisible to everything outside Stripe/Supabase.

---

## 9. What's already ready for paid traffic

- Keyword-matched H1 and meta title — strong Quality Score input
- Rich structured data stack (NGO, WebPage, FundraisingEvent, DonateAction, FAQPage, BreadcrumbList)
- Mobile-first donation form *inside* the hero on mobile — rare and powerful
- Amount anchoring + outcome copy + live Gift Aid math
- Field photo/video evidence with location/date tags
- FAQ addresses Zakat-for-Gaza, Gift Aid, admin %, regulation
- Charity number in hero + footer + schema + FAQ
- Checkout → thank-you flow is solid (correct `noindex` postures)
- Canonical URL and sitemap entry are correct
- Zakat/Sadaqah escape links = free intent recovery

---

## 10. Optimisation opportunities (post-launch, not blockers)

- **Simplified header for paid LP** — swap the 7-link nav for a logo + donate button on `/palestine` when `?utm_source=google` (or similar). Expect +5–15% conversion lift on paid traffic; measurable once GA4 is installed.
- **Dedicated paid variants** — `/palestine?variant=zakat-intent` with FAQ promoted above the fold, for audiences arriving via Zakat-adjacent keywords
- **Sticky mobile donate bar** — especially on long scroll on mobile; repeats the CTA near the screen edge
- **Exit-intent handler** — soft one, e.g. a banner offering the £25 tier
- **A/B testing infrastructure** — pick a tool (GrowthBook, PostHog, Vercel A/B) and wire it once GA4 is in
- **Video compression pipeline** — add `ffmpeg` job to the build (or a one-off) to enforce video-asset budgets
- **Add TrustPilot or equivalent** — review volume is a well-documented QS signal in charity auctions
- **Schema addition**: `Review` / `AggregateRating` once TrustPilot is live

---

## 11. Concrete campaign-input snippets

For ad copy and extensions — pulled verbatim from the page so landing-page-to-ad consistency stays high (Quality Score likes this):

**Headlines (character counts in parens, max 30):**
- Donate to Gaza Emergency Relief (31 — trim to "Donate to Gaza Emergency" or "Gaza Emergency Donation")
- A Family in Gaza Needs You Now (30)
- 100% to Relief, Gift Aid Eligible (⚠ see §8.5 — consider re-phrasing)
- Charity No. 1158608 · Audited (30)
- Food, Water, Medical Aid in Gaza (30)
- Give £25 = Food for a Week (25)
- £100 Becomes £125 with Gift Aid (30)
- Monthly Giving from £10 (23)
- Direct Aid to Displaced Families (30)
- Teams on the Ground in Gaza (27)
- Zakat-Eligible Emergency Relief (30)
- UK Islamic Charity Since 2013 (29)

**Descriptions (max 90):**
- Food parcels, clean water, medical supplies, and shelter delivered directly by our teams.
- Every donation verified. Every pound tracked. Every family reached. Charity No. 1158608.
- Gift Aid eligible — your £100 becomes £125 at no cost to you. Secure checkout in under 2 minutes.
- Sustained monthly giving from £10. Cancel anytime. Audited annually.

**Sitelinks (from on-page FAQ):**
- How Your Donation Reaches Gaza → `/palestine#donate-form`
- Is This Zakat-Eligible? → `/zakat`
- Set Up a Monthly Donation → `/palestine?frequency=monthly`
- About Deen Relief → `/about`

**Callouts:**
- Charity No. 1158608
- Gift Aid Eligible
- Apple Pay / Google Pay / Card
- Audited Annually
- UK-Registered Since 2013
- Teams On the Ground in Gaza

**Structured snippets (Service):**
- Food parcels
- Clean water
- Medical supplies
- Shelter
- Hygiene kits
- Trauma kits

**Price extension (Donations):**
- £10 / month — ongoing clean water access
- £25 — food parcel for a family of five for a week
- £50 / month — monthly medical supplies + food for a family
- £100 — clean water and medical essentials

**Recommended match types / structure:**
- One "Gaza Emergency" ad group (exact + phrase on "donate to gaza", "gaza emergency appeal", "gaza relief donation")
- One "Palestine Donation" ad group (exact + phrase on "palestine charity uk", "donate to palestine", "palestine appeal")
- One "Zakat Gaza" ad group with a Zakat-intent RSA (heavy reliance on the FAQ answer about Zakat eligibility)
- One brand defence ad group ("deen relief", "deenrelief") — low bid, high CTR

**Negative keywords (starter list):**
- volunteer, job, jobs, internship, career, salary
- news, latest, video, documentary, history, map
- how to, what is, who is
- free (unless you want Zakat-scholarship traffic — test both)
- facebook, twitter, instagram (prefer social campaigns not search for these)

---

## 12. Readiness checklist

Before the first £ of paid spend:

- [ ] GA4 property created, GTM container in `src/app/layout.tsx`
- [ ] Purchase-equivalent GA4 event firing on `/donate/thank-you` SuccessState (one-time + monthly)
- [ ] Enhanced Conversions configured (hashed email)
- [ ] Consent banner installed, Consent Mode v2 wired, default denied
- [ ] `gclid` / UTM capture on `/palestine`, persisted in cookie, forwarded to Stripe metadata, landed in `donations` row (migration)
- [ ] Google Ads account created, linked to GA4, conversion imported
- [ ] Google Ads charity verification (TechSoup/Ad Grants) started — this takes weeks
- [ ] `/videos/gaza-field.mp4` compressed to ≤3 MB, optionally WebM + fallback
- [ ] "100%" language resolved with legal / policy posture
- [ ] Simplified header variant decided (keep vs strip for paid)
- [ ] Offline conversion import pipeline drafted (optional for v1 but high-ROI)

Post-launch, first 30 days:

- [ ] Monitor Landing Page Experience in Google Ads
- [ ] Monitor Search Terms Report daily for negative-keyword additions
- [ ] Check Quality Scores per keyword weekly — aim for 7+ on head terms
- [ ] Install TrustPilot or review aggregator, plug into schema
- [ ] Build remarketing audience (site-wide 30d) once consent + tags are live
- [ ] A/B test: header stripped vs intact; hero H1 variants; donation-tier default (£50 vs £25)

---

*End of audit. Feed this document to your campaign-planning Claude session along with the URL and any specific geo/budget constraints.*
