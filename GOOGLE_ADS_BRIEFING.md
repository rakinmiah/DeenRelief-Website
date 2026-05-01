# Google Ad Grant Campaign Briefing — Deen Relief

**For:** paid search strategist building Ad Grants campaigns from scratch ($10k/mo, ~£8k, search + maps only, UK-targeted)
**Production URL (current):** `https://deen-relief-website.vercel.app`
**Target URL (post-cutover):** `https://deenrelief.org` (currently still WordPress; DNS not yet flipped)
**Audit basis:** full repository walk + `next build` (147 routes, all green)
**Audit date:** 2026-05-01
**Codebase:** Next.js 16.2.3 (App Router, Turbopack), React 19.2.4, Tailwind CSS v4, TypeScript 5
**Charity:** Deen Relief — UK Charity Commission No. 1158608, Companies House No. 08593822

---

## TL;DR — what blocks Ad Grants launch today

Cleared blockers (already shipped):
- ✅ GA4 + Consent Mode v2 scaffolded (env-gated; activates on `NEXT_PUBLIC_GA4_MEASUREMENT_ID`)
- ✅ `gclid` / UTM persistence into Stripe + Supabase
- ✅ ICO-compliant cookie banner
- ✅ `purchase` event on `/donate/thank-you` with `transaction_id` + `value` + `currency` + `items[]`
- ✅ Server-side Google Ads Offline Conversion Import + Enhanced Conversions cron (env-gated)
- ✅ Deep structured-data stack (NGO + WebPage + FundraisingEvent + DonateAction + FAQPage + BreadcrumbList)

Live blockers (must fix before spend starts):
1. **No GA4 property created yet.** `NEXT_PUBLIC_GA4_MEASUREMENT_ID` is empty. Without it, the `purchase` event fires into a `dataLayer` array no one reads.
2. **No Google Ads account / conversion action ID.** Even with GA4, Google Ads needs an imported conversion to bid on.
3. **No Qurbani 2026 page** — Eid al-Adha 27 May 2026, **27 days away**. There is no `/qurbani` route, no Qurbani product, no animal selector, no booking-deadline logic. This is the single biggest content gap given the calendar.
4. **No Yemen / Sudan / Fidya / Kaffarah / Fitrana pages.** None exist.
5. **No Fundraising Regulator badge** anywhere on the site.
6. **No Google Business Profile** referenced or linked — required for Maps inventory in Ad Grants PMax.
7. **No square or landscape images.** All hero photography is portrait (3:4 or 9:16). PMax needs 1:1 and 1.91:1; logo has no square variant.
8. **`deenrelief.org` still serves WordPress.** Until DNS cuts over, ad clicks would land on the new Vercel URL — strategist must align account-level final URL accordingly.

---

# Section 1 — Site Architecture & Routing

Stack: **Next.js 16.2.3 App Router** with `pageExtensions: ["ts","tsx","md","mdx"]`. All routing lives under `src/app/`. No legacy Pages Router.

`next build` output confirms **147 routes** generated. Static-by-default; only payment/admin routes are dynamic.

## 1.1 Full route inventory

| Route | File | Type | Purpose | Audience |
|---|---|---|---|---|
| `/` | `src/app/page.tsx` | Static | Homepage — Hero (Gulucuk Evi children), Partners, FeaturedCampaign, CancerCareCentres, GivingPathways, TrustBar, CampaignsGrid, Impact, OurStory, Newsletter, FAQ | All visitors |
| `/about` | `src/app/about/page.tsx` | Static | Charity story, founder, regulation | Researchers, due-diligence |
| `/our-work` | `src/app/our-work/page.tsx` | Static | Programme overview across countries | Researchers, donors comparing causes |
| `/contact` | `src/app/contact/page.tsx` | Static | Contact form + addresses + phone | Anyone |
| `/volunteer` | `src/app/volunteer/page.tsx` | Static | Volunteer form | Volunteer leads |
| `/blog` | `src/app/blog/page.tsx` | Static | Blog listing (13 MDX articles, Zakat/Sadaqah focus) | SEO discovery |
| `/blog/[slug]` | `src/app/blog/[slug]/page.tsx` | SSG | 13 prerendered Islamic-finance articles | SEO discovery |
| `/prayer-times` | `src/app/prayer-times/page.tsx` | ISR (1h) | UK prayer times city directory | Local SEO |
| `/prayer-times/[city]` | `src/app/prayer-times/[city]/page.tsx` | SSG (1h ISR) | 96 prerendered city prayer-time pages | Local SEO |
| **`/palestine`** | `src/app/palestine/page.tsx` | **Static, donation LP** | Gaza emergency relief | Donors searching Gaza/Palestine |
| **`/cancer-care`** | `src/app/cancer-care/page.tsx` | **Static, donation LP** | Cancer care for refugee children (Gulucuk Evi, Adana) | Donors searching cancer/children |
| **`/orphan-sponsorship`** | `src/app/orphan-sponsorship/page.tsx` | **Static, donation LP** | Orphan sponsorship in Bangladesh (£30/mo default) | Donors searching orphan sponsorship |
| **`/build-a-school`** | `src/app/build-a-school/page.tsx` | **Static, donation LP** | Sadaqah Jariyah, Bangladesh schools | Donors searching Sadaqah Jariyah/education |
| **`/clean-water`** | `src/app/clean-water/page.tsx` | **Static, donation LP** | Sadaqah Jariyah, Bangladesh water wells | Donors searching water wells |
| **`/uk-homeless`** | `src/app/uk-homeless/page.tsx` | **Static, donation LP** | Brighton homeless outreach | UK donors searching local impact |
| **`/sadaqah`** | `src/app/sadaqah/page.tsx` | **Static, donation LP** | Sadaqah + Sadaqah Jariyah | Donors searching Sadaqah |
| **`/zakat`** | `src/app/zakat/page.tsx` | **Static, donation LP** | Zakat (with calculator) | Donors searching Zakat / paying Zakat |
| `/donate` | `src/app/donate/page.tsx` | **Dynamic system** | Stripe Elements checkout | Mid-funnel |
| `/donate/thank-you` | `src/app/donate/thank-you/page.tsx` | **Dynamic system, conversion fire** | Donation confirmation, fires `purchase` event | Conversion-page |
| `/manage` | `src/app/manage/page.tsx` | Dynamic | Donor self-service portal entry (signed token → Stripe Billing Portal) | Existing monthly donors |
| `/manage/done` | `src/app/manage/done/page.tsx` | Static | Post-portal return page | Existing monthly donors |
| `/auth` | `src/app/auth/page.tsx` | Static | Site-password gate (pre-launch only, gated by `SITE_PASSWORD` env) | Internal |
| `/privacy` | `src/app/privacy/page.tsx` | Static | Privacy policy | Trust / compliance |
| `/terms` | `src/app/terms/page.tsx` | Static | Terms of service | Trust / compliance |
| `/accessibility` | `src/app/accessibility/page.tsx` | Static | Accessibility statement | Trust / compliance |
| `/safeguarding` | `src/app/safeguarding/page.tsx` | Static | Safeguarding policy | Trust / compliance |
| `/sitemap.xml` | `src/app/sitemap.ts` | Static | Generated XML sitemap | Bots |
| `/robots.txt` | `src/app/robots.ts` | Static | Robots directive | Bots |
| `/manifest.webmanifest` | `src/app/manifest.ts` | Static | PWA manifest | Browsers |

### API routes (server-only, all `ƒ` Dynamic except `/api/nisab`)

| Route | Purpose |
|---|---|
| `/api/donations/create-intent` | Stripe PaymentIntent (one-time) or SetupIntent + Customer (monthly) |
| `/api/donations/confirm` | Persists donor + pending donation + Gift Aid declaration; reads attribution + consent cookies |
| `/api/stripe/webhook` | Stripe event handler (`payment_intent.succeeded`, `invoice.paid`, `setup_intent.succeeded`, etc.) |
| `/api/cron/swiftaid-submit` | Daily 02:00 UTC Vercel Cron — Gift Aid claim submission |
| `/api/cron/google-ads-oci` | 6-hourly Vercel Cron — Offline Conversion Import |
| `/api/admin/export-gift-aid` | Bearer-authed HMRC CSV export |
| `/api/auth` | Site-password gate auth |
| `/api/contact` | Contact form → Resend |
| `/api/volunteer` | Volunteer form → Resend |
| `/api/newsletter` | Newsletter capture → Resend |
| `/api/nisab` | Live gold/silver Nisab values (cached 6h) — feeds the Zakat calculator |

### Donation landing pages vs informational vs system

- **Donation LPs (8):** `/palestine`, `/cancer-care`, `/orphan-sponsorship`, `/build-a-school`, `/clean-water`, `/uk-homeless`, `/sadaqah`, `/zakat`
- **Informational:** `/`, `/about`, `/our-work`, `/contact`, `/volunteer`, `/blog`, `/blog/[slug]`, `/prayer-times`, `/prayer-times/[city]`
- **System:** `/donate`, `/donate/thank-you`, `/manage`, `/manage/done`, `/auth`
- **Legal/compliance:** `/privacy`, `/terms`, `/accessibility`, `/safeguarding`

## 1.2 Redirects

**`next.config.ts`:** No `redirects()` block. Only `headers()` for security (X-Frame-Options, HSTS, Permissions-Policy, etc.). No redirects defined.

**`src/middleware.ts`:** Gated rewrite to `/auth?redirect=...` when `SITE_PASSWORD` env var is set (pre-launch preview protection). Skips API, `_next`, `images`, `auth`, `favicon`, `sitemap.xml`, `robots.txt`. **In production this should be unset, otherwise the site is uncrawlable.**

**`vercel.json`:** No `redirects` array. Contains only `crons` (2 entries: Swiftaid daily, Google Ads OCI 6-hourly).

> **Action item for paid:** No `vercel.app → deenrelief.org` redirect plan exists in code. At DNS cutover the strategist needs to either (a) set ad-account-level final URL to `deenrelief.org` and add a 301 from `deen-relief-website.vercel.app/*` → `deenrelief.org/$1`, or (b) launch ads pointing at `deenrelief.org` only after DNS is live.

## 1.3 Canonical domain strategy

Every canonical-relevant constant is hard-coded to **`https://deenrelief.org`**:

| File | Constant |
|---|---|
| `src/app/sitemap.ts:5` | `BASE_URL = "https://deenrelief.org"` |
| `src/app/robots.ts:10` | `sitemap: "https://deenrelief.org/sitemap.xml"` |
| `src/app/layout.tsx:6` | `SITE_URL = "https://deenrelief.org"` |
| `src/app/layout.tsx:169` | `metadataBase: new URL("https://deenrelief.org")` |
| `src/lib/donationSchema.ts:13` | `SITE_URL = "https://deenrelief.org"` |
| `src/lib/donation-receipt.ts` | `siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://deenrelief.org"` |

**Implications:**
- Every `<link rel="canonical">` and every JSON-LD `url` field points at `deenrelief.org`. **If ads run before DNS cutover, all canonical signals will tell Google the live site is `deenrelief.org`** — which currently 404s our content (it serves the old WordPress site).
- No www / non-www handling: canonicals are bare `deenrelief.org`. Strategist should configure Google Ads + GSC to match.
- No trailing-slash policy enforced; Next.js default is no trailing slash.
- `metadataBase` = `https://deenrelief.org`. OG and Twitter image URLs resolve absolute against this.

---

# Section 2 — SEO Metadata Inventory

## 2.1 Per-page metadata (every public page)

| Route | Title | Meta description | Canonical | OG image | Robots |
|---|---|---|---|---|---|
| `/` | `Deen Relief \| UK Islamic Charity — Cancer Care, Gaza Relief, Zakat & Sadaqah` | `UK Islamic charity trusted by 3,200+ donors since 2013. Cancer care for refugee children, emergency Gaza relief, orphan sponsorship. Donate Zakat & Sadaqah. Charity No. 1158608.` | `/` | `/images/hero-gulucuk-evi.webp` (966×722) | default (index, follow) |
| `/palestine` | `Donate to Gaza Emergency Relief \| Deen Relief` | `Helping 3,200+ donors since 2013 deliver food, water, and medical aid to Gaza families. Gift Aid eligible. Charity No. 1158608.` | `/palestine` | `/images/palestine-relief.webp` (1200×1600) | default |
| `/cancer-care` | `Support Cancer Care for Refugee Children \| Deen Relief` | `Support Gulucuk Evi in Adana — housing and care for Syrian and Gazan refugee children with cancer. 3,200+ donors since 2013. Charity No. 1158608.` | `/cancer-care` | `/images/cancer-children-worker.webp` (746×395) | default |
| `/orphan-sponsorship` | `Sponsor an Orphan in Bangladesh \| Deen Relief` | `Sponsor an orphan in Bangladesh — £30/month, £37.50 with Gift Aid. 3,200+ donors since 2013. Education, shelter, healthcare. Charity No. 1158608.` | `/orphan-sponsorship` | `/images/children-smiling-deenrelief.webp` (1200×1600) | default |
| `/build-a-school` | `Build a School in Bangladesh \| Deen Relief` | `Fund classrooms and teacher salaries in rural Bangladesh — a lasting Sadaqah Jariyah. 3,200+ donors since 2013. Gift Aid eligible. Charity No. 1158608.` | `/build-a-school` | `/images/bangladesh-school-v2.webp` (746×320) | default |
| `/clean-water` | `Fund Clean Water in Bangladesh \| Deen Relief` | `Fund a tube well in rural Bangladesh — safe drinking water for an entire community, a lasting Sadaqah Jariyah. 3,200+ donors since 2013. Charity No. 1158608.` | `/clean-water` | `/images/bangladesh-community-children.webp` (746×395) | default |
| `/uk-homeless` | `Support Brighton's Homeless Community \| Deen Relief` | `Hot meals and essentials for Brighton's homeless every week since 2013 — 12+ years without missing one. 3,200+ donors. Charity No. 1158608.` | `/uk-homeless` | `/images/brighton-team.webp` (1084×812) | default |
| `/sadaqah` | `Give Sadaqah and Sadaqah Jariyah \| Deen Relief` | `Give Sadaqah and Sadaqah Jariyah through a trusted UK Islamic charity. 3,200+ donors since 2013, no minimum, delivered directly to those in need. Charity No. 1158608.` | `/sadaqah` | `/images/orphan-sponsorship.webp` (1200×1600) | default |
| `/zakat` | `Pay Your Zakat With Confidence \| Deen Relief` | `3,200+ donors since 2013 trust Deen Relief's 100% Zakat policy — every penny reaches eligible recipients. Gift Aid eligible. Charity No. 1158608.` | `/zakat` | `/images/palestine-relief.webp` (1200×1600) | default |
| `/our-work` | `Our Work — Campaigns & Programmes \| Deen Relief` | `See where your donations go. Emergency relief in Gaza, cancer care in Turkey, orphan sponsorship in Bangladesh, and community support across the UK.` | `/our-work` | `/images/hero-gulucuk-evi.webp` | default |
| `/about` | inherits root | inherits root | **NOT SET** ⚠ | inherits root | default |
| `/contact` | `Contact Us \| Deen Relief` | `Get in touch with Deen Relief. Phone: +44 (0) 300 365 8899. Email: info@deenrelief.org. Offices in London and Brighton. Charity No. 1158608.` | `/contact` | `/images/brighton-team.webp` | default |
| `/volunteer` | `Volunteer \| Deen Relief` | `Join our volunteer team across the UK and abroad. Brighton outreach, Bangladesh housing, clean water projects, and more. No experience needed.` | `/volunteer` | `/images/brighton-team.webp` | default |
| `/blog` | `Islamic Knowledge & Charity Blog \| Deen Relief` | `13 practical guides on Zakat, Sadaqah, and Islamic giving for UK Muslims. Calculate your Zakat, understand Sadaqah Jariyah, and give with confidence.` | `/blog` | `/images/hero-gulucuk-evi.webp` | default |
| `/blog/[slug]` | per-post | per-post | per-post | per-post | default |
| `/prayer-times` | `Prayer Times UK Today — Salah Times \| Deen Relief` | `Accurate prayer times for 96+ UK cities including London, Birmingham, Manchester, and Brighton. Fajr, Dhuhr, Asr, Maghrib, Isha updated daily.` | `/prayer-times` | `/images/hero-gulucuk-evi.webp` | default |
| `/prayer-times/[city]` | per-city | per-city | per-city | per-city | default |
| `/donate` | `Donate \| Deen Relief` | `Complete your donation to Deen Relief. Secure checkout, Gift Aid eligible. Charity No. 1158608.` | `/donate` | inherits root | **noindex, follow** ✓ |
| `/donate/thank-you` | `Thank You \| Deen Relief` | (none) | (none) | inherits root | **noindex, nofollow** ✓ |
| `/privacy`, `/terms`, `/accessibility`, `/safeguarding` | inline metadata in each page | inline | inline | inherits root | default |
| `/auth`, `/manage`, `/manage/done` | inline | inline | inline | inherits root | various |

### H1 inventory (paid-search relevance)

| Route | H1 |
|---|---|
| `/` | `UK Islamic Charity Helping Children Globally` |
| `/palestine` | `Donate to Gaza Emergency Relief` |
| `/cancer-care` | `Support Cancer Care for Refugee Children` |
| `/orphan-sponsorship` | `Sponsor an Orphan in Bangladesh` |
| `/build-a-school` | `Build a School in Rural Bangladesh` |
| `/clean-water` | `Fund Clean Water in Bangladesh` |
| `/uk-homeless` | `Support Brighton's Homeless Community` |
| `/sadaqah` | `Give Sadaqah and Sadaqah Jariyah` |
| `/zakat` | `Pay Your Zakat With Confidence` |

All H1s are **keyword-matched and intent-aligned** for paid search. This is unusually well-disciplined for a charity site and is a Quality Score asset.

### Flagged metadata issues

| Page | Issue |
|---|---|
| `/about` | **No layout file = no `<title>` / `<meta description>` overriding root.** Inherits homepage metadata, which means Google sees a duplicate `<title>` for /about and /. Fix: add `src/app/about/layout.tsx`. |
| `/privacy`, `/terms`, `/accessibility`, `/safeguarding` | Layouts not present; metadata is inline on each `page.tsx`. Verify each has unique title + canonical (build succeeded so they exist; not exhaustively read in this audit). |
| `3,200+ donors since 2013` recurs in **9 meta descriptions** | Distinctive for trust, but if Google flags duplicate copy, this is the line to vary. |
| `/donate` | Correctly `noindex, follow` ✓ |
| `/donate/thank-you` | Correctly `noindex, nofollow` ✓ — important: this hides the conversion page from organic search, which is what we want. |
| `hreflang` | **Not implemented.** No `alternates.languages`. Site is en-GB only. Acceptable for UK Ad Grants. |

## 2.2 Sitemap

**Source:** `src/app/sitemap.ts` (Next.js App Router built-in metadata route).
**Live URL:** `https://deenrelief.org/sitemap.xml`
**Generation:** runtime, on request. No `next-sitemap` package — pure Next API.

```ts
export default function sitemap(): MetadataRoute.Sitemap {
  // Core: /, /our-work (0.9), /about (0.8), /contact (0.7)
  // Campaigns: 8 entries at priority 0.9, weekly
  // Prayer cities: 96 entries at priority 0.7, daily
  // Blog listing + 13 posts at priority 0.7-0.8
  // Utility: /prayer-times, /volunteer
  // Legal: /privacy, /terms, /accessibility, /safeguarding at 0.3
}
```

Total entries at build time: **~131** sitemap URLs (4 core + 8 campaigns + 96 cities + 14 blog + 2 utility + 4 legal + ~3 dynamic).

## 2.3 robots.txt

**Source:** `src/app/robots.ts`

```ts
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/"] },
    sitemap: "https://deenrelief.org/sitemap.xml",
  };
}
```

Allows everything except `/api/*`. Sitemap URL points at `deenrelief.org`. **No Ad Grants–specific rules needed.**

## 2.4 Structured data (JSON-LD)

This site has an **unusually deep structured-data stack** for a charity site — a real Quality Score asset.

### Site-wide (in `src/app/layout.tsx`)

**`NGO` schema** (full payload):

```json
{
  "@context": "https://schema.org",
  "@type": "NGO",
  "@id": "https://deenrelief.org/#organization",
  "name": "Deen Relief",
  "alternateName": "Deen Relief UK",
  "legalName": "Deen Relief",
  "url": "https://deenrelief.org",
  "logo": "https://deenrelief.org/images/logo.webp",
  "image": "https://deenrelief.org/images/logo.webp",
  "slogan": "Helping poor, vulnerable and disabled children globally",
  "description": "UK-registered Islamic charity providing cancer care for refugee children, emergency relief in Gaza, orphan sponsorship, Zakat and Sadaqah distribution, clean water projects, and community support worldwide.",
  "foundingDate": "2013",
  "foundingLocation": { "@type": "Place", "address": { "@type": "PostalAddress", "addressCountry": "GB" } },
  "founder": { "@type": "Person", "name": "Shabek Ali" },
  "address": [
    { "@type": "PostalAddress", "streetAddress": "71-75 Shelton Street", "addressLocality": "London", "postalCode": "WC2H 9JQ", "addressCountry": "GB" },
    { "@type": "PostalAddress", "streetAddress": "7 Maldon Road", "addressLocality": "Brighton", "postalCode": "BN1 5BD", "addressCountry": "GB" }
  ],
  "contactPoint": [
    { "@type": "ContactPoint", "contactType": "customer service", "telephone": "+44-300-365-8899", "email": "info@deenrelief.org", "areaServed": "GB", "availableLanguage": ["English"] },
    { "@type": "ContactPoint", "contactType": "donations", "email": "donate@deenrelief.org", "areaServed": "GB", "availableLanguage": ["English"] }
  ],
  "telephone": "+44-300-365-8899",
  "email": "info@deenrelief.org",
  "sameAs": [
    "https://www.facebook.com/DeenRelief/",
    "https://www.instagram.com/deenrelief",
    "https://twitter.com/deenrelief/",
    "https://www.youtube.com/@deenrelief9734"
  ],
  "nonprofitStatus": "https://schema.org/LimitedByGuaranteeCharity",
  "identifier": [
    { "@type": "PropertyValue", "name": "Charity Commission for England and Wales", "propertyID": "charity-number", "value": "1158608" },
    { "@type": "PropertyValue", "name": "Companies House", "propertyID": "company-number", "value": "08593822" }
  ],
  "areaServed": [
    { "@type": "Country", "name": "Palestine" },
    { "@type": "Country", "name": "Bangladesh" },
    { "@type": "Country", "name": "Turkey" },
    { "@type": "Country", "name": "United Kingdom" }
  ],
  "knowsAbout": [
    "Emergency humanitarian aid",
    "Childhood cancer care",
    "Orphan sponsorship",
    "Zakat distribution",
    "Sadaqah and Sadaqah Jariyah",
    "Clean water projects",
    "Education funding",
    "Homelessness outreach",
    "Refugee support"
  ],
  "potentialAction": {
    "@type": "DonateAction",
    "name": "Donate to Deen Relief",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": "https://deenrelief.org/donate",
      "actionPlatform": ["http://schema.org/DesktopWebPlatform", "http://schema.org/MobileWebPlatform"]
    },
    "recipient": { "@id": "https://deenrelief.org/#organization" }
  }
}
```

**`WebSite` schema** with `SearchAction`:

```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": "https://deenrelief.org/#website",
  "name": "Deen Relief",
  "url": "https://deenrelief.org",
  "inLanguage": "en-GB",
  "publisher": { "@id": "https://deenrelief.org/#organization" },
  "potentialAction": {
    "@type": "SearchAction",
    "target": { "@type": "EntryPoint", "urlTemplate": "https://deenrelief.org/blog?q={search_term_string}" },
    "query-input": "required name=search_term_string"
  }
}
```

### Per-campaign (via `src/lib/donationSchema.ts → buildDonationPageSchema(...)`)

Each campaign layout emits a nested `WebPage > FundraisingEvent > DonateAction` payload. Example for `/palestine`:

```json
{
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": "https://deenrelief.org/palestine#webpage",
  "url": "https://deenrelief.org/palestine",
  "name": "Donate to Gaza Emergency Relief | Deen Relief",
  "description": "Helping 3,200+ donors since 2013 deliver food, water, and medical aid to Gaza families. Gift Aid eligible. Charity No. 1158608.",
  "dateModified": "2026-05-01",
  "inLanguage": "en-GB",
  "isPartOf": { "@type": "WebSite", "name": "Deen Relief", "url": "https://deenrelief.org" },
  "about": {
    "@type": "FundraisingEvent",
    "name": "Palestine Emergency Appeal",
    "description": "Ongoing emergency fundraising to deliver food, clean water, medical supplies, and shelter to displaced families in Gaza.",
    "organizer": { "@type": "NGO", "@id": "https://deenrelief.org/#organization", ... },
    "location": { "@type": "Place", "name": "Gaza", "address": { "@type": "PostalAddress", "addressRegion": "Gaza Strip", "addressCountry": "PS" } }
  },
  "potentialAction": {
    "@type": "DonateAction",
    "name": "Donate to Palestine Emergency Appeal",
    "target": { "@type": "EntryPoint", "urlTemplate": "https://deenrelief.org/donate?campaign=palestine&amount={amount}&frequency={frequency}" },
    "recipient": { "@type": "NGO", "@id": "https://deenrelief.org/#organization", "identifier": "1158608" },
    "priceSpecification": { "@type": "PriceSpecification", "priceCurrency": "GBP", "minPrice": 1 }
  }
}
```

### FAQ schema

Every campaign page renders **`FAQPage`** JSON-LD inline with 6+ Q&As. Homepage too (5 Qs). Blog posts emit per-post FAQ.

### Breadcrumbs

`src/components/BreadcrumbSchema.tsx` emits `BreadcrumbList` on every internal page.

> **For paid:** when ad copy mentions "Charity No. 1158608" or "100% Zakat policy", the schema substantiates it. Useful in policy reviews.

---

# Section 3 — Donation & Conversion Infrastructure

## 3.1 Donation flow (click-by-click)

### One-time donation

1. Visitor lands on a campaign page (e.g. `/palestine`)
2. Sees `DonationForm` (and on the Final CTA section, `MiniDonationPicker`)
3. Selects frequency (one-time / monthly), amount tile or custom amount
4. Clicks "Donate £X Now" → routes to `/donate?campaign=palestine&amount=50&frequency=one-time`
5. `/donate` (server component) validates the campaign slug against `CAMPAIGNS` allow-list, falls back to `general` if invalid
6. Hands off to `<CheckoutClient>` (client component) which:
   - Calls `POST /api/donations/create-intent` with `{campaign, amount, frequency}` → returns `{clientSecret, paymentIntentId}` from Stripe
   - Renders Stripe Payment Element (card + Apple Pay + Google Pay in one form)
   - Collects donor details (name, email, address, postcode, phone) + Gift Aid declaration toggle
   - On submit: `POST /api/donations/confirm` (writes pending donation row + donor + Gift Aid declaration with IP/UA)
   - Calls `stripe.confirmPayment()` with `return_url=/donate/thank-you?payment_intent={PI_ID}`
7. **Stripe Payment Element redirects** the browser to `/donate/thank-you?payment_intent=pi_xxx` once the charge clears
8. `/donate/thank-you` (server component) calls `stripe.paymentIntents.retrieve(piId)`, reads metadata (campaign, amount, etc.), renders Success/Processing/Failed state
9. **`<TrackConversion>` client component** mounts on success → fires `purchase` GA4 event with `transaction_id`, `value`, `currency`, `items[]`
10. Webhook `payment_intent.succeeded` flips DB status to `succeeded` and Resend dispatches the receipt email

### Monthly donation (more complex — async via webhook)

1. Same form, frequency = `monthly`
2. `/api/donations/create-intent` returns `{clientSecret, setupIntentId, customerId}` (creates a Stripe Customer + SetupIntent)
3. `stripe.confirmSetup()` → redirects to `/donate/thank-you?setup_intent=seti_xxx`
4. Thank-you page shows "Monthly donation set up — first charge processing"
5. Webhook `setup_intent.succeeded` creates Stripe Product + Price + Subscription server-side
6. Webhook `invoice.paid` fills the pending donation row; subsequent monthly renewals INSERT new rows
7. Each renewal triggers a receipt email with a signed-token "Manage your donation" link to `/manage`

### Critical for tracking

- ✅ **All donations complete on-site.** Payment Element is embedded — no off-site redirect to a Stripe-hosted Checkout.
- ✅ **Unique thank-you URL exists at `/donate/thank-you`.** Conversions can fire here.
- ✅ Thank-you URL contains `payment_intent` or `setup_intent` query param — useful as a transaction ID.
- ✅ Conversion event already implemented (see Section 4).

## 3.2 Payment provider

**Stripe** (`stripe@22.0.2`, `@stripe/react-stripe-js@6.2.0`, `@stripe/stripe-js@9.2.0`).

- Embedded Payment Element (no iframe redirect, no popup)
- Supports card + Apple Pay + Google Pay automatically via `automatic_payment_methods: { enabled: true }`
- Webhook signature verification via raw-body parsing in `src/app/api/stripe/webhook/route.ts`
- Idempotent on `stripe_webhook_events.stripe_event_id` UNIQUE constraint
- Server-side amount validation (£5 min, £10,000 max) — clients can't fabricate amounts

## 3.3 Donation products / appeals — full inventory

**Source of truth:** `src/lib/campaigns.ts → CAMPAIGNS` map. This is the allow-list every API route validates against.

| Slug | Label | URL | One-time tiers (default ★) | Monthly tiers (default ★) | Recurring? | Outcome copy example |
|---|---|---|---|---|---|---|
| `palestine` | Palestine Emergency Relief | `/palestine` | £25, **£50★**, £100, £250 | £10, **£25★**, £50, £100 | ✓ | "Feeds a displaced family of five in Gaza for one month" (£50 one-time) |
| `cancer-care` | Cancer Care | `/cancer-care` | £50, **£100★**, £250, £500 | £25, **£50★**, £100, £250 | ✓ | "Provides a month of family housing near the hospital" (£250) |
| `orphan-sponsorship` | Orphan Sponsorship | `/orphan-sponsorship` | **£30★**, £50, £75, £100 | £50, **£100★**, £250, £500 | ✓ | "Sponsors one child — education, nutrition, shelter, and healthcare" (£30/mo) |
| `build-a-school` | Build a School | `/build-a-school` | £100, **£250★**, £500, £1,000 | £25, **£50★**, £100, £250 | ✓ | "Builds a complete classroom for a rural school" (£1,000) |
| `clean-water` | Clean Water | `/clean-water` | £50, **£150★**, £300, £500 | £10, **£25★**, £50, £100 | ✓ | "Funds a tube well providing safe water for a rural village" (£150) |
| `uk-homeless` | UK Homeless | `/uk-homeless` | £10, **£25★**, £50, £100 | **£10★**, £25, £50, £100 | ✓ | "Feeds five people on our weekly outreach" (£25) |
| `zakat` | Zakat | `/zakat` | £50, **£100★**, £250, £500 | £25, **£50★**, £100, £250 | ✓ | "Provides emergency food for a family for one month" (£50) |
| `sadaqah` | Sadaqah | `/sadaqah` | £10, **£25★**, £50, £100 | £5, **£10★**, £25, £50 | ✓ | "Sustains comprehensive monthly aid — a lasting Sadaqah Jariyah" (£50/mo) |
| `general` | General Donation | (no dedicated page) | (uses `/donate` directly) | – | – | Catch-all for ads pointing at `/donate` without a campaign param |

**Minimum amount:** £5 (`MIN_AMOUNT_PENCE = 500`) — server-validated.
**Maximum amount:** £10,000 (`MAX_AMOUNT_PENCE = 10_000_00`) — server-validated.
**Currency:** **GBP only.** No multi-currency support anywhere in the codebase. UK-targeted only.

### Missing appeal pages (BLOCKERS for full Ad Grants coverage)

- ❌ **Qurbani** — no `/qurbani` route, no animal selector (cow/sheep/goat), no per-country pricing, no booking deadline (Eid al-Adha 27 May 2026 — **27 days away**)
- ❌ **Yemen** — no dedicated page (Yemen is also not in `areaServed` schema)
- ❌ **Sudan** — no dedicated page
- ❌ **Fidya** — not in `CAMPAIGNS`
- ❌ **Kaffarah** — not in `CAMPAIGNS`
- ❌ **Fitrana / Zakat al-Fitr** — not in `CAMPAIGNS`. (There is a blog post "Zakat al-Fitr vs Zakat al-Mal" but no donation page)
- ❌ **Ramadan / Iftar** — no seasonal page
- ❌ **Day of Arafah / Dhul Hijjah scheduled-giving** — no page
- ❌ **DEC / Disasters Emergency Committee** — no membership or co-branded appeals
- ❌ **Masjid construction** — no dedicated page

## 3.4 Zakat calculator

**Status:** ✅ **Implemented**, on `/zakat`.

- Component: `src/app/zakat/ZakatCalculator.tsx`
- Live Nisab from `/api/nisab` route (cached 6h, ISR)
- Source: `cdn.jsdelivr.net/npm/@fawazahmed0/currency-api` for live gold (XAU/GBP) + silver (XAG/GBP) prices
- Nisab formulas: Gold 87.48g, Silver 612.36g
- Toggle between gold / silver standard
- Cash + savings + gold + silver + investments + business assets - debts → 2.5% calculation
- Output routes the donor into `/donate?campaign=zakat&amount={calculated}` (one-click flow)

## 3.5 Recurring donation flow

Built end-to-end. SetupIntent + Customer + Subscription. Donor self-service via signed magic-link to Stripe Billing Portal. See Section 1 routes `/manage` and `/manage/done`.

## 3.6 Currency

**GBP only.** Hard-coded in `/api/donations/create-intent` and elsewhere. Acceptable for UK Ad Grants; no work needed.

## 3.7 Gift Aid

✅ Fully implemented to HMRC standards.

- Opt-in checkbox in CheckoutClient
- Verbatim HMRC-approved declaration text (in `src/lib/gift-aid.ts`)
- Two scopes: `this-donation-only` or `this-and-past-4-years-and-future`
- Audit trail: IP address + User-Agent stored on `gift_aid_declarations` table
- 6-year retention enforced via `ON DELETE RESTRICT`
- Live UI math: "£100 → £125" preview before submission
- Receipt email shows reclaimed amount inline
- Swiftaid cron (`/api/cron/swiftaid-submit`) auto-submits to HMRC daily at 02:00 UTC (env-gated)
- HMRC CSV export endpoint for manual filing fallback

**Gift Aid status flows into Stripe metadata** via `donations.gift_aid_claimed` boolean. This makes it queryable from Stripe Dashboard for ops, and feeds the `gift_aid_claimed` parameter into the GA4 `purchase` event for reporting.

## 3.8 Form quirks affecting tracking

- **Amount in URL** ✓ — `?campaign=palestine&amount=50&frequency=one-time` — preserved through to `/donate` and used as default.
- **No new tab opens** — all in-flow.
- **No postMessage / iframe.**
- **`gclid` and UTMs persist** through the funnel via `dr_attribution` cookie + Stripe metadata + donations row (see Section 4.4).
- **Stripe redirect:** the only "redirect" is Stripe's `confirmPayment()` `return_url` to `/donate/thank-you`. This is a client-side `window.location` change after Stripe has confirmed the payment. The donor stays in the same tab.

---

# Section 4 — Tracking, Analytics & Tag Setup

## 4.1 Currently installed tracking scripts

| Tool | Status | Where | ID env var | Notes |
|---|---|---|---|---|
| **GA4** | Scaffolded, **inactive (env-gated)** | `src/components/ConsentBootstrap.tsx` | `NEXT_PUBLIC_GA4_MEASUREMENT_ID` (currently empty) | Loads `https://www.googletagmanager.com/gtag/js?id=...` only when set. No measurement ID exists yet. |
| **Google Tag Manager** | Not installed | – | – | Direct gtag, no GTM container. |
| **Google Ads global tag** | Not installed (separately from GA4) | – | – | Conversion linking expected via GA4 → Google Ads import (preferred) plus offline OCI uploads. |
| **Meta Pixel** | Not installed | – | – | No `fbq()` calls anywhere. |
| **TikTok Pixel** | Not installed | – | – | – |
| **Microsoft UET** | Not installed | – | – | – |
| **Sentry** | ✅ Active when `NEXT_PUBLIC_SENTRY_DSN` set | `next.config.ts` | `NEXT_PUBLIC_SENTRY_DSN` | Error monitoring only. |

**Bottom line: no actual tracking IDs are baked into the code.** Everything is env-gated.

## 4.2 Loading method

`src/components/ConsentBootstrap.tsx` uses `next/script`:

- **`gtag-consent-default`** → `strategy="beforeInteractive"` — runs before hydration. Sets all four Consent Mode v2 signals to `denied`, then restores the donor's saved decision from the `dr_consent` cookie.
- **`gtag-src`** → `strategy="afterInteractive"` — loads `googletagmanager.com/gtag/js?id={GA4_ID}` only when `NEXT_PUBLIC_GA4_MEASUREMENT_ID` is set.
- **`gtag-init`** → `strategy="afterInteractive"` — calls `gtag('js', new Date())` and `gtag('config', GA4_ID, { anonymize_ip: true })`.

No Partytown. No GTM container. No third-party tag manager — direct gtag only.

## 4.3 Custom events (every gtag/dataLayer call in the codebase)

**Helper:** `src/lib/analytics.ts → trackEvent(name, params)` — pushes to `window.dataLayer` AND calls `window.gtag('event', name, params)` if present. Safe to call when GA4 isn't loaded (events queue in `dataLayer` harmlessly).

**Donation conversion event** — fires from `src/app/donate/thank-you/TrackConversion.tsx`:

```ts
gtag('event', 'purchase', {
  transaction_id: 'pi_xxx' | 'seti_xxx',  // Stripe PI or SI ID
  value: 50.00,                            // GBP, donor's amount
  currency: 'GBP',
  affiliation: 'Deen Relief',
  gift_aid_claimed: true|false,
  frequency: 'one-time' | 'monthly',
  campaign_slug: 'palestine',
  items: [
    {
      item_id: 'palestine',
      item_name: 'Palestine Emergency Relief',
      item_category: 'One-time donation' | 'Monthly donation',
      price: 50.00,
      quantity: 1
    }
  ],
  // Enhanced Conversions — only when ad_user_data consent granted:
  user_data: { sha256_email_address: '<sha256-hex>' }
});
```

**Strict-Mode guard:** ref keyed on `transactionId` ensures a single fire per transaction even under React 18 Strict Mode double-mount.

### Events currently NOT fired (recommended to add)

| Event | Where it should fire | Status |
|---|---|---|
| `view_item` | Campaign page mount | **Not implemented** |
| `select_item` | Amount tile selected | **Not implemented** |
| `begin_checkout` | User reaches `/donate` (CheckoutClient mount) | **Not implemented** |
| `add_payment_info` | Stripe Payment Element submitted | **Not implemented** |
| `purchase` | Thank-you success | ✅ **Implemented** |

These four upper-funnel events would significantly improve Smart Bidding's learning curve. Smart Bidding can use `begin_checkout` and `add_payment_info` as conversion-stage signals when conversion volume is thin.

## 4.4 UTM persistence (full pipeline)

✅ **Fully implemented end-to-end.**

1. `src/components/AttributionCapture.tsx` (mounted in root layout) — runs on first paint of every page. Reads from `window.location.search`:
   - `gclid`, `gbraid`, `wbraid`, `fbclid`
   - `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`
   - Plus `landing_page`, `landing_referrer`, `landing_at`
2. Writes to first-party cookie `dr_attribution` (90-day Max-Age, SameSite=Lax). **Last-click-wins merge** — a new visit with click params replaces; an organic return preserves earlier attribution.
3. `/api/donations/create-intent` reads cookie via `next/headers` `cookies()` and flattens into Stripe PaymentIntent metadata as `attr_*` keys (audit-friendly in Stripe Dashboard).
4. `/api/donations/confirm` reads the same cookie and writes 12 attribution columns + 2 consent-snapshot columns onto the `donations` row.

### Attribution columns on `donations` table

```sql
gclid              text,
gbraid             text,
wbraid             text,
fbclid             text,
utm_source         text,
utm_medium         text,
utm_campaign       text,
utm_term           text,
utm_content        text,
landing_page       text,
landing_referrer   text,
landing_at         timestamptz,
ad_storage_consent     boolean,
ad_user_data_consent   boolean
```

This means **every donation row knows the click that led to it**. This is the foundation for Offline Conversion Import.

## 4.5 Server-side tracking

### Google Ads Offline Conversion Import (✅ implemented)

**Cron:** `/api/cron/google-ads-oci` (every 6 hours via Vercel Cron in `vercel.json`).

**Filter:** donations where `status='succeeded' AND gclid IS NOT NULL AND ad_storage_consent=true AND google_ads_uploaded_at IS NULL`.

**Per row, builds a `ClickConversion`:**

```ts
{
  gclid: row.gclid,
  conversionAction: `customers/${CUSTOMER_ID}/conversionActions/${CONVERSION_ACTION_ID}`,
  conversionDateTime: 'YYYY-MM-DD HH:MM:SS+00:00',  // Google's required format
  conversionValue: <GBP from pence>,
  currencyCode: 'GBP',
  orderId: pi_xxx | seti_xxx,                       // server-side de-dupe
  userIdentifiers: [{ hashedEmail: '<sha256-hex>' }] // EC, when ad_user_data consent
}
```

Uploads via `POST https://googleads.googleapis.com/v18/customers/{CUSTOMER_ID}:uploadClickConversions` with partial-failure handling. Marks `google_ads_uploaded_at` on success, persists `google_ads_upload_error` on failure for retry.

**Env-gated:** Requires `GOOGLE_ADS_DEVELOPER_TOKEN`, `GOOGLE_ADS_CUSTOMER_ID`, `GOOGLE_ADS_CONVERSION_ACTION_ID`, `GOOGLE_ADS_CLIENT_ID`, `GOOGLE_ADS_CLIENT_SECRET`, `GOOGLE_ADS_REFRESH_TOKEN`. Without all six, cron logs `skipped: true`.

> **Strategist action:** Google Ads developer token approval takes 1–3 weeks. Apply now: https://developers.google.com/google-ads/api/docs/first-call/dev-token

### GA4 Measurement Protocol

❌ **Not implemented.** Pure client-side gtag only. If/when needed for cross-device or refund-handling stitching, would live in webhook `payment_intent.succeeded` handler.

## 4.6 Cookie consent

✅ **ICO/PECR/GDPR-compliant.** Implementation in `src/components/ConsentBanner.tsx`.

- Bottom-bar banner with **equal-weight Accept / Reject / Customise** buttons (ICO non-nudge requirement)
- Granular settings modal: Essential (always on), Analytics, Advertising
- Maps to four Consent Mode v2 signals: `analytics_storage`, `ad_storage`, `ad_user_data`, `ad_personalization`
- Persists to `dr_consent` cookie (6-month TTL, SameSite=Lax, versioned)
- "Manage cookies" footer link reopens the modal via custom DOM event
- Default state on first paint: **all four denied**

**Tag firing is gated by Consent Mode v2.** When the user accepts, `gtag('consent', 'update', ...)` updates Google's signals, and GA4 + Google Ads start measuring with the user's permission.

## 4.7 Enhanced Conversions for Web

✅ **Implemented client-side AND server-side.**

- **Client-side:** `TrackConversion.tsx` calls `crypto.subtle.digest('SHA-256', ...)` on the donor email, attaches `user_data: { sha256_email_address }` to the `purchase` event. **Only when `ad_user_data` consent granted.**
- **Server-side:** OCI cron passes `userIdentifiers: [{ hashedEmail }]` in the `uploadClickConversions` request. **Only when `ad_user_data_consent=true` on the donation row.**

The two paths are independent — if cookies are blocked client-side, server-side EC still works because the donor's email is in our database.

---

# Section 5 — Image & Creative Asset Audit

## 5.1 Logo

| File | Path | Dimensions | Format | Notes |
|---|---|---|---|---|
| Primary logo | `/images/logo.webp` | **2085 × 349** | WebP, transparent | Landscape only. **No square variant.** |

**Brand colours** (`src/app/globals.css`):

```
--color-green:        #2D6A2E    (primary)
--color-green-dark:   #1B4D1C
--color-green-light:  #E8F5E9
--color-amber:        #D4A843    (accent)
--color-amber-dark:   #B8912E
--color-amber-light:  #FDF3DC
--color-charcoal:     #1A1A2E    (text)
--color-grey:         #6B7280
--color-grey-light:   #F3F4F6
--color-cream:        #FDF8F0    (background)
```

**Fonts:** `Source Serif 4` (display, weights 400/600/700) + `DM Sans` (body, weights 400/500/600/700), both via `next/font` with `display: swap`.

## 5.2 Imagery inventory (every file in `public/images/`)

| File | Dimensions | Aspect | Subject | Used on |
|---|---|---|---|---|
| `palestine-relief.webp` | 1200×1600 | 3:4 portrait | Field aid distribution to a Gaza family | Palestine hero, OG, /zakat OG |
| `gaza-aid-distribution-1.webp` | 900×1600 | 9:16 portrait | Field worker with Palestine campaign badge in displacement camp | Palestine video poster |
| `gaza-aid-distribution-2.webp` | 900×1600 | 9:16 portrait | Worker delivering aid to a child | Palestine donation panel |
| `gaza-aid-distribution-3.webp` | 1200×1600 | 3:4 portrait | Worker distributing aid to a woman | Palestine field evidence |
| `gaza-aid-handover.jpeg` | 900×1600 | 9:16 portrait | Aid handover (previously video poster) | Currently unused |
| `gaza-aid-packing.webp` | 720×1280 | 9:16 portrait | Worker packing aid + DR signage | Palestine field evidence |
| `cancer-children.webp` | 1200×1600 | 3:4 portrait | Children at Gulucuk Evi | Cancer-care |
| `cancer-children-signs.webp` | 1200×1600 | 3:4 portrait | Children + signage | Cancer-care |
| `cancer-children-worker.webp` | 746×395 | 1.89:1 landscape | Worker with children | Cancer-care OG |
| `cancer-care-family.webp` | 972×648 | 3:2 landscape | Family at care centre | Cancer-care |
| `cancer-care-housing.webp` | 1114×830 | 4:3 landscape | Housing | Cancer-care |
| `cancer-care-selfie.webp` | 972×1296 | 3:4 portrait | Worker selfie with child | Cancer-care |
| `cancer-care-visit.webp` | 1114×830 | 4:3 landscape | Visit | Cancer-care |
| `centre-child.webp` | 602×802 | 3:4 portrait | Centre child | Cancer-care |
| `gulucuk-team.webp` | 968×726 | 4:3 landscape | Gulucuk team | Cancer-care |
| `hero-gulucuk-evi.webp` | 966×722 | 4:3 landscape | Children at Adana centre | Homepage hero, blog OG, prayer-times OG |
| `bangladesh-community-children.webp` | 746×395 | 1.89:1 landscape | Community kids | Clean-water OG |
| `bangladesh-housing.webp` | 600×544 | 1.1:1 nearly square | Housing | Bangladesh general |
| `bangladesh-school-children.webp` | 746×265 | 2.81:1 landscape | School scene (very wide) | Bangladesh schools |
| `bangladesh-school-v2.webp` | 746×320 | 2.33:1 landscape | School | Build-a-school OG |
| `hero-bangladesh-community.webp` | 746×395 | 1.89:1 landscape | Community | Bangladesh general |
| `children-smiling-deenrelief.webp` | 1200×1600 | 3:4 portrait | Smiling kids | Orphan-sponsorship OG |
| `orphan-care-worker.webp` | 274×530 | 1:1.93 portrait | Worker with orphan | Orphan-sponsorship |
| `orphan-sponsorship.webp` | 1200×1600 | 3:4 portrait | Orphan sponsorship hero | Orphan-sponsorship hero, /sadaqah OG |
| `zakat-bangladesh-family.webp` | 600×544 | 1.1:1 | Family | Zakat |
| `zakat-family-support.webp` | 1200×1600 | 3:4 portrait | Family support | Zakat |
| `brighton-team.webp` | 1084×812 | 4:3 landscape | Brighton volunteers | UK-homeless OG, /contact, /volunteer |
| `hero-our-work.webp` | 746×395 | 1.89:1 landscape | Our work hero | /our-work |

### PMax dimension gap analysis

| PMax requirement | Min size | Existing assets that fit |
|---|---|---|
| **Square 1:1** (1200×1200, min 300×300) | 1200×1200 | **None.** `bangladesh-housing.webp` (600×544) and `zakat-bangladesh-family.webp` (600×544) are nearly square but below min size. |
| **Landscape 1.91:1** (1200×628) | 600×314 | `cancer-children-worker.webp` (746×395), `bangladesh-community-children.webp` (746×395), `hero-bangladesh-community.webp` (746×395), `hero-our-work.webp` (746×395) all near 1.89:1 but **below 1200×628 min**. `brighton-team.webp` (1084×812) is 4:3 not 1.91:1. |
| **Portrait 4:5** (960×1200) | 480×600 | `cancer-care-selfie.webp` (972×1296) is close to 3:4 — needs a tight crop. Most "portraits" in the library are 3:4 or 9:16, not 4:5. |
| **Logo square** (1200×1200) | 128×128 | **None.** Logo is 2085×349 landscape only. |
| **Logo landscape** (1200×300) | 512×128 | `logo.webp` (2085×349) ✓ scales down cleanly. |

**Storage:** all imagery in repo `public/images/` (no Cloudinary, Sanity, Contentful, Vercel Blob). Served via `next/image` optimisation.

**Embedded text overlays:** Several Gaza images have a visible Deen Relief banner/sticker in-frame ("Palestine Relief Campaign") — minor but technically text-on-image. PMax's text-overlay check looks for marketing text; logo banners may pass, but flag for review.

## 5.3 Video assets

| File | Size | Resolution | Use |
|---|---|---|---|
| `/videos/gaza-field.mp4` | 9.6 MB | (not extracted in this audit) | Palestine field evidence — poster-first, tap-to-play. Re-encoded from a 14.4 MB original. |

> **Ad Grants note:** video isn't eligible for Ad Grants PMax. Useful only for landing page experience, not as a creative asset.

## 5.4 Image rights

No EXIF / licensing notes found in the codebase or README. All images appear to be Deen Relief's own field photography (the DR signage, worker vests, and Palestine Campaign banner are visible in many frames). **Strategist should confirm rights with the charity before using in PMax to avoid takedown risk.**

---

# Section 6 — Content & Copy Inventory

## 6.1 Per-campaign copy (raw source material for ads)

### `/palestine` — Palestine Emergency Relief

- **Eyebrow:** Palestine Emergency Appeal
- **H1:** Donate to Gaza Emergency Relief
- **Sub-headline (italic serif):** A family in Gaza needs you right now.
- **Supporting:** Displaced families urgently need food, clean water, medical supplies, and shelter. Your donation is delivered directly by our teams on the ground.
- **Trust strip:** Charity No. 1158608 · 100% pledge on emergency relief · Gift Aid Eligible
- **Section H2s:** Direct Relief for Families in Gaza · We Don't Send Aid From a Distance · From Your Donation to a Family in Gaza · Common Questions About Palestine Relief · A Family in Gaza Needs Your Help Today
- **Benefit cards:** Food & Clean Water · Medical Supplies · Shelter & Essentials · Prepared Aid Stocks
- **Delivery process:** We Verify → We Allocate → We Report
- **Outcome lines (one-time):**
  - £25 — Provides a food parcel for a family of five for one week
  - £50 ★ — Feeds a displaced family of five in Gaza for one month
  - £100 — Supplies clean water and medical essentials for a family of five
  - £250 — Provides shelter, blankets, and household basics for a displaced family
- **Country/region:** Gaza, Gaza Strip (PS)

### `/cancer-care` — Cancer Care for Refugee Children

- **H1:** Support Cancer Care for Refugee Children
- **Outcome lines:**
  - £50 — Covers a week of nutritious meals for a child in treatment
  - £100 ★ — Funds medical supplies for a child's ongoing care
  - £250 — Provides a month of family housing near the hospital
  - £500 — Covers comprehensive monthly support for a child and their family
- **Country/region:** Adana Province, Turkey (Gulucuk Evi). Children are Syrian + Gazan refugees.

### `/orphan-sponsorship` — Sponsor an Orphan in Bangladesh

- **H1:** Sponsor an Orphan in Bangladesh
- **Outcome lines:**
  - £30 ★ — Sponsors one child — education, nutrition, shelter, and healthcare
  - £50 — Sponsors one child with enhanced support and learning materials
  - £75 — Sponsors one child with comprehensive family support
  - £100 — Sponsors one child and contributes to community development
- **Headline number:** £30/month, £37.50 with Gift Aid (in meta description)
- **Country:** Bangladesh

### `/build-a-school` — Build a School (Sadaqah Jariyah)

- **H1:** Build a School in Rural Bangladesh
- **Outcome lines:**
  - £100 — Funds a month of teacher salary in a rural school
  - £250 ★ — Provides learning materials for an entire classroom
  - £500 — Funds construction materials for a classroom
  - £1,000 — Builds a complete classroom for a rural school
- **Framing:** Sadaqah Jariyah (lasting charity)
- **Country:** Bangladesh

### `/clean-water` — Fund Clean Water (Sadaqah Jariyah)

- **H1:** Fund Clean Water in Bangladesh
- **Outcome lines:**
  - £50 — Contributes to a community tube well in rural Bangladesh
  - £150 ★ — Funds a tube well providing safe water for a rural village
  - £300 — Funds a deep tube well with filtration system
  - £500 — Funds a comprehensive water point serving multiple families
- **Framing:** Sadaqah Jariyah
- **Country:** Bangladesh

### `/uk-homeless` — Brighton Homeless Outreach

- **H1:** Support Brighton's Homeless Community
- **Hero claim:** Hot meals and essentials for Brighton's homeless every week since 2013 — 12+ years without missing one.
- **Outcome lines:**
  - £10 — Provides a hot meal and essentials pack for one person
  - £25 ★ — Feeds five people on our weekly outreach
  - £50 — Covers a full evening of hot meals and supplies
  - £100 — Funds a week of outreach including meals, clothing, and support packs
- **Country:** Brighton, East Sussex (UK)

### `/zakat` — Zakat (with Calculator)

- **H1:** Pay Your Zakat With Confidence
- **Headline trust claim:** strict 100% Zakat policy — every penny reaches eligible recipients
- **Calculator:** present, with live gold/silver Nisab feed
- **Outcome lines:**
  - £50 — Provides emergency food for a family for one month
  - £100 ★ — Covers medical supplies for a child's treatment
  - £250 — Funds shelter materials for a displaced family
  - £500 — Supports a family through three months of cancer care

### `/sadaqah` — Sadaqah & Sadaqah Jariyah

- **H1:** Give Sadaqah and Sadaqah Jariyah
- **Outcome lines:**
  - £10 — Provides a meal for a family in need
  - £25 ★ — Supplies essential items for a vulnerable child
  - £50 — Funds emergency support for a family
  - £100 — Provides comprehensive support where it's needed most

## 6.2 Trust claims used across campaigns

Recurring proof points (use sparingly — do not repeat verbatim across multiple ad headlines per Google's text-uniqueness preference):

- "Charity No. 1158608"
- "3,200+ donors since 2013"
- "Audited annually"
- "Gift Aid Eligible" / "£100 → £125 with Gift Aid"
- "100% pledge on emergency relief" (Palestine + others) — Level-2 substantiable phrasing for Google charity policy
- "100% Zakat policy" (Zakat only)
- "Teams on the ground in Gaza"
- "12+ years without missing one" (Brighton)
- "Operating since 2013"

## 6.3 Seasonal / Islamic content gaps

Looking at the calendar from 1 May 2026:

| Event | Date | Site coverage | Gap |
|---|---|---|---|
| **Eid al-Adha / Qurbani 2026** | **27 May 2026** (27 days) | **None** | Critical — no `/qurbani` page, no products, no booking deadline UI |
| Day of Arafah | 26 May 2026 | None | No scheduled-giving page |
| Dhul Hijjah first 10 days | 17–26 May 2026 | None | No multi-day giving / "best 10 days" content |
| Muharram 1448 | ~17 June 2026 | None | No page |
| Ashura | ~26 June 2026 | None | No page |
| Ramadan 2027 | mid-Feb 2027 | None | No /ramadan / iftar appeals |
| Laylatul Qadr | last 10 nights of Ramadan | None | No page |

**Blog coverage** (existing `/blog/[slug]` MDX posts, useful as inbound for Search ad sitelinks):

```
best-time-to-give-sadaqah
can-you-pay-zakat-with-a-credit-card
can-zakat-be-given-to-family-members
giving-sadaqah-for-the-deceased
how-to-calculate-zakat-on-gold-and-silver
how-to-calculate-zakat-on-savings
is-zakat-due-on-property
is-zakat-due-on-student-loans-uk
sadaqah-for-parents-who-passed-away
what-is-sadaqah-jariyah
zakat-al-fitr-vs-zakat-al-mal
zakat-on-cryptocurrency-uk
zakat-vs-sadaqah-difference
```

> Notably absent: any Qurbani, Ramadan, or Eid content. Blog is Zakat/Sadaqah-heavy.

---

# Section 7 — Trust Signals, Compliance & Maps Readiness

## 7.1 Charity registration

- ✅ **UK Charity Commission Registration No. 1158608** — visible in: footer, all campaign hero strips, all meta descriptions, NGO schema, FAQ answers
- ✅ **Companies House No. 08593822** — in NGO schema, FAQ
- ✅ **`nonprofitStatus: LimitedByGuaranteeCharity`** in NGO schema (correct type for UK CIO + Companies House)
- ✅ External link in Palestine FAQ to Charity Commission register: `https://register-of-charities.charitycommission.gov.uk/charity-details/?regid=1158608&subid=0`

## 7.2 Fundraising Regulator

- ❌ **Not present.** No "Fundraising Regulator" string, no `fr-icon`, no badge image. Not in NGO schema as a memberOf.

> **Action:** apply for Fundraising Regulator membership and add the badge to footer + /about. Required for serious UK ads policy review and improves trust on landing pages.

## 7.3 Memberships / certifications

- ❌ **Muslim Charities Forum** — not referenced
- ❌ **DEC (Disasters Emergency Committee)** — not referenced
- ❌ **Charity Excellence Framework** — not referenced

Partners section on `/palestine` lists 6 logos: Islamic Relief, Bangladesh Red Crescent Society, Human Appeal, Food Bank, Umma Welfare Trust, Read Foundation. Treat as field/operational partners, not regulatory.

## 7.4 Legal pages

| Page | URL | Purpose |
|---|---|---|
| Privacy Policy | `/privacy` | GDPR notice |
| Terms & Conditions | `/terms` | T&Cs |
| Accessibility | `/accessibility` | A11y statement |
| Safeguarding | `/safeguarding` | Child + vulnerable adult safeguarding policy |

All four are linked from the Footer.

## 7.5 Contact info (for call assets + location assets)

From `src/app/layout.tsx → organizationSchema`:

- **Phone:** +44 (0) 300 365 8899
- **Customer service email:** info@deenrelief.org
- **Donations email:** donate@deenrelief.org
- **Registered office:** 71-75 Shelton Street, London, WC2H 9JQ
- **Operations office:** 7 Maldon Road, Brighton, BN1 5BD
- **Country served:** GB (in `areaServed` of contactPoints)

**For Google Ads Call assets:** ✓ phone is consistent across schema, footer, and contact page.

## 7.6 Social profiles

In `sameAs` of NGO schema:
- Facebook: `https://www.facebook.com/DeenRelief/`
- Instagram: `https://www.instagram.com/deenrelief`
- Twitter/X: `https://twitter.com/deenrelief/`
- YouTube: `https://www.youtube.com/@deenrelief9734`

(Twitter handle in OG/Twitter cards: `@deenrelief`.)

## 7.7 Google Business Profile / Maps placements

❌ **Not implemented.** No reference to a GBP, no `LocalBusiness` schema (only `NGO` + `PostalAddress`). The Brighton operations office is a real location and should be a verified GBP for **Maps placements in Ad Grants PMax**.

> **Action item — required for Maps inventory:**
> 1. Create a Google Business Profile for the Brighton operations office (7 Maldon Road, BN1 5BD)
> 2. Verify ownership (postcard or instant verification)
> 3. Link the GBP to the Google Ads account
> 4. PMax campaigns can then include Maps placements

The London office is a registered office (likely virtual / agent address) and may not qualify for a GBP listing.

---

# Section 8 — Performance & Quality Score Signals

## 8.1 Build output

`next build` (Next.js 16.2.3 Turbopack) succeeded in 5.1s, generated **147 routes** statically.

```
✓ Compiled successfully in 5.1s
✓ Generating static pages using 7 workers (147/147) in 3.2s
```

> Turbopack does not currently print per-page first-load JS sizes. Migration warning surfaced: `The "middleware" file convention is deprecated. Please use "proxy" instead.` — non-blocking but worth tracking.

### Route render strategy (every public page)

| Strategy | Routes |
|---|---|
| ○ **Static** (HTML + JS prerendered at build, served from CDN) | `/`, `/about`, `/accessibility`, `/auth`, `/blog`, all 8 campaign pages, `/contact`, `/manage/done`, `/our-work`, `/privacy`, `/safeguarding`, `/terms`, `/volunteer` |
| ● **SSG with `generateStaticParams`** | `/blog/[slug]` (13 paths), `/prayer-times/[city]` (96 paths) |
| ○ **Static with ISR** | `/prayer-times` (1h), `/api/nisab` (6h) |
| ƒ **Dynamic (server-rendered on demand)** | `/donate`, `/donate/thank-you`, `/manage`, all `/api/*` |

**Key conclusion: every campaign landing page is fully static prerendered.** ✓ Great for crawl quality, LCP, and Quality Score.

## 8.2 Largest Contentful Paint (LCP) on donation pages

- All campaign hero images use `next/image` with `priority` set on the LCP candidate. ✓
- `next/font` with `display: swap` for both fonts (no FOIT). ✓
- Hero photos are 1200×1600 WebP at 100–400 KB. Healthy.
- **Palestine has the largest known asset** — `gaza-field.mp4` at 9.6 MB. Already wrapped in `LazyVideo` (poster-first, tap to play) for both mobile + desktop. Mobile visitors pay 0 video bytes on load. ✓

## 8.3 Render-blocking scripts

- **gtag bootstrap:** `strategy="beforeInteractive"` inline (~2 KB). Necessary for Consent Mode v2; runs synchronously pre-hydration.
- **GA4 gtag.js:** loads `afterInteractive` only when ID is set. Not render-blocking.
- **Sentry:** loaded as part of the app bundle (not via external script tag). Adds ~30 KB gzipped.
- **No GTM, no Meta Pixel, no third-party tag manager.**

## 8.4 Mobile responsiveness

Spot-checked across the 8 donation LPs in source: all use Tailwind responsive utilities (`sm:`, `md:`, `lg:`). Notable patterns:
- Mobile: donation form rendered **inside the hero** (high-conversion pattern). Desktop: form is in a separate panel below.
- Hamburger menu in header at <lg breakpoint.
- All images use `sizes` attribute appropriately.

**Recommend a manual Lighthouse pass on /palestine, /zakat, /donate** as part of pre-launch QA.

## 8.5 Accessibility

- All `<button>` elements have `aria-label` where they have icon-only content.
- Skip link present (`#main-content` anchor in pages, but no visible "skip to content" link verified in this audit — recommended check).
- All images have `alt` text in source review.
- Form inputs have `aria-label` and `aria-invalid` / `aria-describedby` for errors.
- Frequency toggle uses `role="group"` + `aria-pressed`.
- Heading hierarchy looks correct (one H1 per page).

> **Recommend** Pa11y or axe-core run before launch — not done in this audit.

## 8.6 SSR vs CSR

Almost everything is **SSR / SSG**. Client components only used where needed: donation forms (state), checkout (Stripe Elements), thank-you tracking, attribution capture, consent banner, lazy video, prayer-times UI. Bots crawl rich HTML on every campaign page. ✓

## 8.7 Security headers

In `next.config.ts`, applied to every route:
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(self), interest-cohort=()`
- `X-XSS-Protection: 1; mode=block`

---

# Section 9 — CMS / Content Source & Page Template System

## 9.1 Content storage

**No CMS.** Everything is in-repo:

| Content type | Source |
|---|---|
| Campaign pages | Hardcoded JSX in `src/app/<campaign>/page.tsx` |
| FAQ data | Hardcoded array at top of each `page.tsx` |
| Donation tiers + outcomes | Hardcoded `donationAmounts` constant in each `<campaign>/DonationForm.tsx` |
| Blog | MDX files in `src/content/blog/*.mdx` with `gray-matter` frontmatter |
| Prayer times | Computed dynamically from a `cities.ts` + algorithmic prayer-time helper |
| Charity number, addresses, contact | Hardcoded in `src/app/layout.tsx` (organizationSchema) and `src/components/Footer.tsx` |
| Campaign allow-list | `src/lib/campaigns.ts` |

**Everything is git-controlled. No live editing.**

## 9.2 Adding a new appeal page (current process)

To launch a new campaign (e.g. Qurbani 2026), today the team must:

1. Add slug + label to `src/lib/campaigns.ts` `CAMPAIGNS` map (and optionally `CAMPAIGN_RECEIPT_MESSAGE`)
2. Create `src/app/<slug>/page.tsx` — copying an existing campaign as a template
3. Create `src/app/<slug>/layout.tsx` — for metadata + DonateAction schema
4. Create `src/app/<slug>/DonationForm.tsx` (campaign-specific tiers + outcomes)
5. Create `src/app/<slug>/MiniDonationPicker.tsx`
6. Create `src/app/<slug>/FaqAccordion.tsx`
7. Add the slug to `src/app/sitemap.ts` (`campaigns` array)
8. Optionally add icon/image assets to `public/images/`
9. Run `next build`, smoke-test locally, merge to `main`, Vercel auto-deploys

**Time:** an experienced engineer can ship a new campaign in ~2-4 hours. **Not a CMS-grade workflow** — every campaign is hand-coded.

## 9.3 Reusable template

✅ The **8 existing campaign pages share an identical structural template** (only copy + tier numbers differ):

```
1. Hero (background image + ProofTag + headline + sub-head + trust strip + CTA)
2. Donation Panel (desktop only — image + DonationForm)
3. Partners (where applicable)
4. Where Your Donation Goes (4 benefit cards + image)
5. Field Evidence (photos / video)
6. Delivery Assurance (3-step Verify → Allocate → Report + trust stats row)
7. FAQ (FaqAccordion)
8. Final CTA (MiniDonationPicker on green background)
```

Copy-pasting `/palestine` is the path of least resistance. Could be abstracted into a shared `<CampaignPage>` component but currently isn't.

## 9.4 Specifically requested page checks

| Page | Status |
|---|---|
| **Qurbani 2026 page** | ❌ **DOES NOT EXIST.** No `/qurbani`, no `qurbani` slug in `CAMPAIGNS`, no animal selector, no per-country pricing, no booking deadline. **Critical Gap given Eid al-Adha is 27 May 2026.** |
| **Sadaqah Jariyah / Water Wells page** | ✅ **Exists at `/clean-water`.** Frames itself as Sadaqah Jariyah. Tiers from £50 (community well contribution) to £500 (multi-family water point). |
| **Day of Arafah / Dhul Hijjah scheduled-giving page** | ❌ **DOES NOT EXIST.** No multi-day Dhul Hijjah / "best 10 days" content anywhere on site or blog. |

---

# Section 10 — Gaps, Risks & Pre-Launch Recommendations

## 10.1 Blockers (must fix before Ad Grants launch)

### Tracking blockers

1. **No GA4 measurement ID set.** `NEXT_PUBLIC_GA4_MEASUREMENT_ID` is empty. Without it, the `purchase` event fires into `dataLayer` but no GA4 receives it. **Smart Bidding cannot learn without ~30 conversions/campaign/month — without GA4 the count is zero.**
2. **No Google Ads account / conversion action ID set.** Even with GA4, you need a Google Ads Conversion Action to import. `GOOGLE_ADS_CONVERSION_ACTION_ID` and the OAuth credentials are unset.
3. **No GA4 ↔ Google Ads link configured** (this is account-side, not codebase, but gating).
4. **No upper-funnel events (`view_item`, `select_item`, `begin_checkout`, `add_payment_info`).** Smart Bidding has only one event to learn on. Volume will be thin in early weeks.

### Content blockers (Ad Grants policy + revenue)

5. **No Qurbani 2026 page.** Eid al-Adha is 27 May 2026. Qurbani is the largest non-Ramadan giving moment of the Islamic year. **27 days to ship a full landing page + animal options + country selector + booking deadline UI + receipt copy.**
6. **No Yemen, Sudan, Fidya, Kaffarah, Fitrana pages.** Each represents a high-intent UK Muslim search vertical and an Ad Grants ad-group opportunity.
7. **No Ramadan / Iftar / Laylatul Qadr seasonal content.**
8. **`/about` page has no metadata layout.** Inherits homepage title — Google sees a duplicate title tag.

### Trust / compliance blockers

9. **No Fundraising Regulator badge or membership reference.** UK ads policy and donor trust both want this.
10. **No Google Business Profile referenced.** Required for Maps placements in Ad Grants PMax.

### Domain / infrastructure blockers

11. **`deenrelief.org` still serves WordPress.** Until DNS cuts over, every canonical, sitemap entry, and JSON-LD URL points to a 404. Strategist must run ads against the Vercel URL until cutover OR delay launch until cutover.
12. **`SITE_PASSWORD` middleware is active by default in code.** If left set in production env, the entire site is password-gated and uncrawlable. Confirm it's unset in Vercel production env.

### Image / creative blockers

13. **No square (1:1) imagery at 1200×1200.** Required for PMax square asset.
14. **No 1.91:1 landscape imagery at 1200×628.** Required for PMax landscape.
15. **No square logo variant.** Logo only exists as 2085×349 landscape.
16. **All hero photography is portrait.** Need to commission/produce square + landscape crops or new shoots.

## 10.2 Tracking debt (every gap that breaks Smart Bidding)

| Gap | Severity | Fix |
|---|---|---|
| GA4 ID not set | Critical | Create new GA4 property (NOT the WordPress one). Set `NEXT_PUBLIC_GA4_MEASUREMENT_ID` in Vercel. Redeploy. |
| Google Ads conversion action not created | Critical | Create offline + online conversion actions in Google Ads UI. |
| OCI cron credentials not set | High | Apply for Google Ads developer token (1–3 weeks). Generate OAuth refresh token. Set 6 env vars. |
| `view_item` not fired | Medium | Add to campaign page mount (client component). |
| `select_item` not fired | Medium | Add to amount-tile click handler. |
| `begin_checkout` not fired | Medium | Add to CheckoutClient mount. |
| `add_payment_info` not fired | Medium | Add to Stripe Payment Element submit. |
| GA4 → Google Ads import not linked | Critical | Account-side. Link GA4 property to Google Ads account; mark `purchase` as conversion. |

## 10.3 Quick wins (ship this week)

- **Clear `SITE_PASSWORD` from Vercel production env** (if set). Immediate.
- **Add metadata layout for `/about`.** ~10 minutes.
- **Compress remaining `.jpeg` to WebP.** `gaza-aid-handover.jpeg` is the only non-WebP — replace it.
- **Generate square + landscape crops of top 5 photos** for PMax. ~1 hour with sips/ImageMagick.
- **Generate a square logo variant** (1200×1200) — likely needs the brand mark only, not the wordmark. Designer's call.
- **Add Fundraising Regulator badge** to footer + /about. (Requires actually being a member; if already a member, just add the asset.)
- **Add the four upper-funnel GA4 events.** ~1–2 hours total.
- **Create a `/qurbani` landing page** by cloning `/clean-water` template and adapting. Critical path — see Section 10.4.

## 10.4 Time-sensitive — Qurbani 2026 (Eid al-Adha 27 May 2026)

**27 days from today.** Booking deadlines for Qurbani typically need **48 hours before Eid** for slaughter logistics, so practical sales window closes ~24 May. **23 effective selling days.**

Minimum viable Qurbani product page to ship in next 5–7 days:

1. **Add `/qurbani` page** — clone `/clean-water` skeleton
2. **Add `qurbani` slug** to `CAMPAIGNS` allow-list
3. **DonationForm with animal selector** instead of monthly/one-time toggle:
   - Sheep / Goat (e.g. £180)
   - Cow share (1/7 of a cow, e.g. £100)
   - Whole cow (£700)
   - With country selector if pricing varies (Bangladesh / Palestine / Turkey / Yemen typically)
4. **Booking deadline countdown** prominently displayed
5. **Page-level FAQ** covering: what is Qurbani / who is it obligatory for / can I do Qurbani for a deceased relative / which animals / when slaughtered / when meat distributed / Gift Aid eligibility
6. **Hero image** — needs commissioning if not in current library (none of the existing images depict livestock or slaughter — and that's likely intentional, but a respectful "meat distribution" or "family receiving meat" shot would be ideal)
7. **Receipt copy** for `qurbani` slug in `CAMPAIGN_RECEIPT_MESSAGE`
8. **Sitemap entry** in `src/app/sitemap.ts`
9. **DonateAction schema** with deadline (`endDate`) so SERPs can surface urgency

Additional pages to ship alongside Qurbani for full Dhul Hijjah coverage:

- `/dhul-hijjah` — the "best 10 days" giving page, deep-linking into Sadaqah / Zakat / Qurbani / Build a School (Sadaqah Jariyah multiplier in these days)
- `/day-of-arafah` (or part of /dhul-hijjah) — fasting + giving content for 26 May 2026

## 10.5 Recommended Ad Grants account structure

Given the £8k/mo budget, search + maps only, and the appeal inventory above, recommended initial structure (high-level — strategist to refine):

**Brand** (low spend cap, high CTR, defensive)
- Deen Relief brand queries

**Zakat** (highest QS asset — calculator + 13 blog posts)
- Pay Zakat / calculate Zakat / Zakat on savings / Zakat al-Mal

**Sadaqah & Sadaqah Jariyah**
- Give Sadaqah / Sadaqah Jariyah / lasting charity

**Palestine / Gaza Emergency**
- Donate Gaza / Palestine appeal / Gaza emergency relief

**Cancer Care for Refugee Children**
- Cancer charity children / refugee children cancer / Gulucuk Evi

**Orphan Sponsorship**
- Sponsor an orphan / orphan sponsorship Bangladesh / £30 orphan sponsor

**Sadaqah Jariyah — Water Wells**
- Build water well / fund tube well / Sadaqah Jariyah water

**Sadaqah Jariyah — Schools**
- Build a school / fund classroom / Sadaqah Jariyah education

**UK Homeless (Brighton)** — if regional bidding allowed
- Brighton homeless charity / homeless outreach Brighton

**Qurbani 2026** (NEW — only after `/qurbani` ships)
- Qurbani 2026 / Qurbani Bangladesh / Qurbani sheep / Qurbani cow share

**Maps placements** (NEW — only after GBP verified)
- Charity near me / Islamic charity near me / charity Brighton / charity London

---

## Final notes for the strategist

- The codebase is **unusually disciplined for a charity site**: keyword-matched H1s, deep structured-data, full Stripe pipeline, Consent Mode v2, OCI scaffold, Enhanced Conversions wired client and server side. That's all uncommon.
- The **gating issues are environmental, not code-level** — env vars unset (GA4, Google Ads, GBP), pages not yet authored (Qurbani, Yemen, Sudan, Fitrana), DNS not yet flipped.
- **Conversion fires reliably on `/donate/thank-you`** with full purchase parameters. Any Google Ads conversion action set to capture `purchase` from GA4 will work the moment GA4 is wired.
- **OCI is the secret weapon** — once Google Ads developer token is approved, the offline pipeline closes the attribution loop with real revenue (net of refunds, with EC). Smart Bidding will outperform standard CPA targets within ~4 weeks of clean OCI data.
- **`gclid` and UTMs persist all the way into `donations` table** — strategist can build offline reporting (e.g. donor LTV by source) directly off Supabase without further tracking work.

---

*End of briefing. File: `/GOOGLE_ADS_BRIEFING.md`. Updated 2026-05-01.*
