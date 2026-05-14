# /orphan-sponsorship — Google Ads PMax Source Audit

Audit of `https://deenrelief.org/orphan-sponsorship` as deployed on the same head as commit `28549d7` (post-Zakat-hero-position fix, May 2026). All copy quoted **verbatim** from source. Any field marked **NOT PRESENT** does not exist in source — do not invent it for ad copy.

Sources read:
- `src/app/orphan-sponsorship/page.tsx`
- `src/app/orphan-sponsorship/layout.tsx`
- `src/app/orphan-sponsorship/DonationForm.tsx`
- `src/app/orphan-sponsorship/MiniDonationPicker.tsx`
- `src/app/orphan-sponsorship/FaqAccordion.tsx`
- `src/app/layout.tsx` (root)
- `src/app/donate/page.tsx`, `donate/CheckoutClient.tsx`, `donate/thank-you/page.tsx`, `donate/thank-you/TrackConversion.tsx`
- `src/app/api/donations/create-intent/route.ts`
- `src/app/api/donations/confirm/route.ts`
- `src/app/api/stripe/webhook/route.ts`
- `src/lib/donationSchema.ts`, `lib/campaigns.ts`, `lib/analytics.ts`
- `src/components/Partners.tsx`, `ProcessSteps.tsx`, `ProofTag.tsx`, `BreadcrumbSchema.tsx`, `JsonLd.tsx`
- `src/app/sitemap.ts`
- `public/images/` (full inventory)

---

## 1. Page metadata

| Field | Value |
|---|---|
| Final canonical URL | `https://deenrelief.org/orphan-sponsorship` |
| `<title>` | `Sponsor an Orphan in Bangladesh \| Deen Relief` |
| Meta description | `Sponsor an orphan in Bangladesh — £30/month, £37.50 with Gift Aid. 3,200+ donors since 2013. Education, shelter, healthcare. Charity No. 1158608.` ✓ matches your observation |
| OG title | `Sponsor an Orphan in Bangladesh \| Deen Relief` |
| OG description | (same as meta description, verbatim) |
| OG image URL | `https://deenrelief.org/images/children-smiling-deenrelief.webp` |
| OG image alt | `Children supported by Deen Relief` ✓ matches your observation |
| OG site name | `Deen Relief` (inherited from root) |
| OG type | `website` (inherited) |
| OG locale | `en_GB` (inherited) |
| Twitter card | `summary_large_image` |
| Twitter site | `@deenrelief` |
| Twitter title | (same as OG title) |
| Twitter description | (same as OG description) |
| Twitter images | `["/images/children-smiling-deenrelief.webp"]` |
| Meta robots directive | **default — `index: true, follow: true`** ✓ no `noindex` override |
| theme-color | `#2D6A2E` (inherited from root viewport) ✓ |
| `<link rel="canonical">` | `/orphan-sponsorship` (resolves via `metadataBase`) |
| `<link rel="alternate">` hreflang | NOT PRESENT |
| Sitemap inclusion | ✓ `/orphan-sponsorship` is in `src/app/sitemap.ts` line 21 (campaigns array), `priority: 0.9`, `changeFrequency: "weekly"` |

---

## 2. Structured data (JSON-LD)

The page emits **5 distinct JSON-LD blocks** when rendered, in this order:

### Block 1 — `@type: NGO` (Organization)
Injected from `src/app/layout.tsx` (root). **Identical to the Qurbani + Zakat audit Block 1** — see `QURBANI_PMAX_AUDIT.md` §2 Block 1 for the verbatim payload. Key fields: Charity No. `1158608`, Companies House `08593822`, founded `2013`, founder `Shabek Ali`, addresses London + Brighton, telephone `+44-300-365-8899`, `nonprofitStatus: LimitedByGuaranteeCharity`, `areaServed: [Palestine, Bangladesh, Turkey, United Kingdom]`, `knowsAbout` includes `"Orphan sponsorship"`.

### Block 2 — `@type: WebSite`
Identical to Qurbani + Zakat audit Block 2.

### Block 3 — `@type: WebPage` (with FundraisingEvent + DonateAction)
Injected from `src/app/orphan-sponsorship/layout.tsx` via:
```ts
buildDonationPageSchema({
  slug: "orphan-sponsorship",
  canonicalPath: "/orphan-sponsorship",
  pageName: "Sponsor an Orphan in Bangladesh | Deen Relief",
  pageDescription: "Sponsor an orphan in Bangladesh — £30/month, £37.50 with Gift Aid. 3,200+ donors since 2013. Education, shelter, healthcare. Charity No. 1158608.",
  fundraisingName: "Orphan Sponsorship Programme",
  fundraisingDescription: "Monthly sponsorship providing education, nutrition, safe shelter, and healthcare to orphans in Bangladesh.",
  location: { name: "Bangladesh", country: "BD" },
  minPrice: 30,
})
```

Resolved verbatim:
```json
{
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": "https://deenrelief.org/orphan-sponsorship#webpage",
  "url": "https://deenrelief.org/orphan-sponsorship",
  "name": "Sponsor an Orphan in Bangladesh | Deen Relief",
  "description": "Sponsor an orphan in Bangladesh — £30/month, £37.50 with Gift Aid. 3,200+ donors since 2013. Education, shelter, healthcare. Charity No. 1158608.",
  "dateModified": "<built at deploy time>",
  "inLanguage": "en-GB",
  "isPartOf": { "@type": "WebSite", "name": "Deen Relief", "url": "https://deenrelief.org" },
  "about": {
    "@type": "FundraisingEvent",
    "name": "Orphan Sponsorship Programme",
    "description": "Monthly sponsorship providing education, nutrition, safe shelter, and healthcare to orphans in Bangladesh.",
    "organizer": {
      "@type": "NGO",
      "@id": "https://deenrelief.org/#organization",
      "name": "Deen Relief",
      "url": "https://deenrelief.org",
      "identifier": "1158608",
      "logo": "https://deenrelief.org/images/logo.webp",
      "address": { "@type": "PostalAddress", "addressCountry": "GB" }
    },
    "location": {
      "@type": "Place",
      "name": "Bangladesh",
      "address": { "@type": "PostalAddress", "addressCountry": "BD" }
    }
  },
  "potentialAction": {
    "@type": "DonateAction",
    "name": "Donate to Orphan Sponsorship Programme",
    "description": "Monthly sponsorship providing education, nutrition, safe shelter, and healthcare to orphans in Bangladesh.",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": "https://deenrelief.org/donate?campaign=orphan-sponsorship&amount={amount}&frequency={frequency}",
      "actionPlatform": ["http://schema.org/DesktopWebPlatform", "http://schema.org/MobileWebPlatform"]
    },
    "query-input": [
      { "@type": "PropertyValueSpecification", "valueName": "amount", "valueRequired": false },
      { "@type": "PropertyValueSpecification", "valueName": "frequency", "valueRequired": false }
    ],
    "recipient": {
      "@type": "NGO",
      "@id": "https://deenrelief.org/#organization",
      "name": "Deen Relief",
      "url": "https://deenrelief.org",
      "identifier": "1158608"
    },
    "priceSpecification": { "@type": "PriceSpecification", "priceCurrency": "GBP", "minPrice": 30 }
  }
}
```

> Notably this is the **only** campaign page that includes a `location` field (Bangladesh, BD) in its FundraisingEvent. `/qurbani` and `/zakat` both omit it. Good signal for Google understanding the geographic scope.

### Block 4 — `@type: BreadcrumbList`
From `page.tsx` line 71:
```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Orphan Sponsorship", "item": "https://deenrelief.org/orphan-sponsorship" }
  ]
}
```

### Block 5 — `@type: FAQPage`
From `page.tsx` line 72. Built from the 6 FAQs (see §12) — `mainEntity` is an array of 6 `Question` objects with `acceptedAnswer.text` set to the answer string verbatim.

### Schema-type checklist
| Schema | Present? | Notes |
|---|---|---|
| `DonateAction` | ✓ | Two — org-level (Block 1) + page-level (Block 3, with `campaign=orphan-sponsorship&amount={amount}` template) |
| `NGO` (Organization) | ✓ | Block 1 |
| `FAQPage` | ✓ | Block 5 |
| `BreadcrumbList` | ✓ | Block 4 |
| `FundraisingEvent` | ✓ | Block 3, with `location: Bangladesh` |
| Per-child / individual beneficiary schema (`Person`, `Patient`, etc.) | NOT PRESENT | Sponsorship is generic, not per-child — see §4 |

---

## 3. Hero section

| Field | Value (verbatim) |
|---|---|
| Eyebrow | `Orphan Sponsorship Programme` (uppercase, amber) |
| Hero `<h1>` | `Sponsor an Orphan in Bangladesh` |
| Hero italic subhead | `Every child deserves a chance to grow up safe.` |
| Hero supporting paragraph | `Your monthly sponsorship provides education, nutrition, safe shelter, and healthcare for an orphaned child in Bangladesh.` |
| Trust strip below paragraph | `Charity No. 1158608 · 100% pledge on orphan care · Gift Aid Eligible` |
| Hero CTA text | `Sponsor a Child` |
| Hero CTA href | `#sponsor-form` (in-page anchor — does NOT route to `/donate`) |
| Hero image src | `/images/orphan-sponsorship.webp` |
| Hero image alt | `Deen Relief worker with a sponsored child and food supplies in Bangladesh` ✓ matches your observation |
| Hero image dimensions | 1200 × 1600, 388 KB |
| Hero image positioning | `object-cover object-[center_25%]` |
| Overlay | Two stacked dark-blue gradients (left→right and bottom→top) for legibility — same pattern as Qurbani / Zakat heroes |
| `<ProofTag>` on hero | ✓ **PRESENT** — `<ProofTag location="Bangladesh" position="bottom-right" />` (page.tsx line 131). This is **consistent** with the page content (single-country Bangladesh programme), unlike the previous Zakat hero which had a Gaza ProofTag mismatched with multi-country Zakat. No flag here. |
| Urgency / seasonal copy | NOT PRESENT — no Ramadan, deadline, or seasonal reference |
| Trust signals in hero | Charity No. 1158608, "100% pledge on orphan care", "Gift Aid Eligible" — all in the inline trust strip |
| Min-height | `md:min-h-[50vh]` (same shorter hero as `/zakat`; compare `/qurbani` at `md:min-h-[80vh]`) |

---

## 4. Sponsorship architecture

### Pricing model — verified literal-coded tiers, no per-child or country logic

**Source of truth**: `src/app/orphan-sponsorship/DonationForm.tsx` lines 7-20. The tier set is hard-coded inline (not pulled from a config or database):

```ts
export const donationAmounts = {
  monthly: [
    { value: 30, label: "£30", outcome: "Sponsors one child — education, nutrition, shelter, and healthcare", default: true },
    { value: 50, label: "£50", outcome: "Sponsors one child with enhanced support and learning materials" },
    { value: 75, label: "£75", outcome: "Sponsors one child with comprehensive family support" },
    { value: 100, label: "£100", outcome: "Sponsors one child and contributes to community development" },
  ],
  "one-time": [
    { value: 50, label: "£50", outcome: "Provides a month of education and meals for a child" },
    { value: 100, label: "£100", outcome: "Covers three months of school fees and learning materials", default: true },
    { value: 250, label: "£250", outcome: "Provides six months of comprehensive support for a child" },
    { value: 500, label: "£500", outcome: "Funds a full year of education and nutrition for a child" },
  ],
};
```

The `MiniDonationPicker.tsx` re-imports `donationAmounts` from `DonationForm.tsx` (line 5) — single source of truth, two render surfaces.

### Verified architectural facts

| Question | Answer |
|---|---|
| Per-child or generic sponsorship? | **Generic.** No named-child profiles, no photo-browsing, no matching UX, no per-child URL parameters anywhere in source. The donor's £30/month is allocated to the orphan programme; no specific child is committed. |
| Multi-country support? | **NO.** Bangladesh-only. Search of source for country-related code found only the single hardcoded copy `"in Bangladesh"` in hero + body sections. No `?country=` parameter, no country selector UI, no per-country pricing logic. The audit-suggested possibility of "multi-country data underneath single-country UI" is **not the case** — source is single-country end-to-end. |
| Default frequency | **Monthly** (line 27 of DonationForm: `useState<Frequency>("monthly")`). MiniDonationPicker also defaults Monthly. **Note**: this differs from /zakat and /sadaqah which default One-time. The Monthly-first ordering is also reflected in the toggle layout (line 84-95: Monthly button first, One-time second). |
| Default amount on Monthly | £30 (the `default: true` tier in the monthly array, marked "Recommended" in UI) |
| Default amount on One-time | £100 (the `default: true` tier in the one-time array, marked "Popular" in UI) |
| Tier badges | Monthly default → `Recommended`. One-time default → `Popular`. (DonationForm.tsx line 128) |
| Custom amount support | ✓ £5 minimum (`MIN_AMOUNT = 5`), no upper cap client-side (server caps at £10,000 per `lib/campaigns.ts`) |
| Outcome copy behaviour | Tier-specific: matches exact tier or falls back to nearest-floor tier for custom amounts (DonationForm.tsx lines 34-43). Same pattern as /zakat. |
| One-off setup fee | NONE |
| Minimum commitment period | NONE — see "Cancel anytime" verification below |
| Country selector | NOT PRESENT |
| Per-child profile / matching UI | NOT PRESENT |
| Letter / photo exchange feature | NOT PRESENT |
| Cancellation portal | NOT PRESENT — donor cancels via email (`info@deenrelief.org`), see FAQ #2 |

### "100% pledge on orphan care" — verbatim source verification

This phrase appears **5 times** in source (4 visible to donors + 1 in FAQ):

1. `page.tsx:121` — Hero trust strip: `100% pledge on orphan care`
2. `page.tsx:324` — "How We Deliver" section trust strip: `100% pledge on orphan care`
3. `DonationForm.tsx:229` — Picker bottom microcopy: `100% pledge on orphan care`
4. (Implicit on each MiniDonationPicker render — final CTA section)
5. FAQ explanation — see §9 below

The phrase is **hardcoded copy**, identical across all instances. **CRITICAL: There is no on-page mechanism explanation for how "100% pledge" is true.** Compare Zakat which at least has FAQ #4 ("Your Zakat is ring-fenced... Administrative costs are covered separately") explaining the ringfencing mechanism. The Orphan Sponsorship FAQ (§12 below) **does not contain a corresponding "Do you have a 100% donation policy?" question** — so this claim sits without on-page substantiation.

### "Cancel anytime" — verbatim source verification

Three instances:

1. `DonationForm.tsx:73` — under the H2: `£30/month. Gift Aid adds 25%. Cancel anytime.`
2. `DonationForm.tsx:232` — picker bottom microcopy: shows `Cancel anytime` when `frequency === "monthly"`, falls back to `Reg. charity 1158608` for one-time
3. FAQ #2 (§12 below) — `You can cancel your monthly sponsorship at any time by contacting us at info@deenrelief.org. There are no contracts or penalties.`

> **Substantiation note**: the FAQ qualifies *how* cancellation works (email `info@deenrelief.org`). There's no self-service cancellation portal in source — donor must email. For ad copy, "Cancel anytime" is technically substantiable because the FAQ explains the email mechanism, but a donor with high cancellation friction concerns may prefer a portal. The receipt email contains a `manage` link for monthly donors (per `donation-receipt.ts` lines 169-178) so donors do have a self-serve route — but it's not surfaced on the /orphan-sponsorship page itself.

---

## 5. Donation flow architecture

### URL contract

All four donation surfaces on the page emit URLs in the same shape:

```
/donate?campaign=orphan-sponsorship&amount={amount}&frequency={one-time|monthly}
```

| Source | URL template |
|---|---|
| Hero CTA | `#sponsor-form` (in-page anchor — does not route to /donate) |
| "Everything a Child Needs" CTA | `#sponsor-form` (in-page anchor) |
| `DonationForm` CTA (Section 4) | `/donate?campaign=orphan-sponsorship&amount=${amountForUrl}&frequency=${frequency}` |
| `MiniDonationPicker` CTA (Section 8 final band) | `/donate?campaign=orphan-sponsorship&amount=${amountForUrl}&frequency=${frequency}` |
| JSON-LD DonateAction `urlTemplate` | `https://deenrelief.org/donate?campaign=orphan-sponsorship&amount={amount}&frequency={frequency}` |

### CRITICAL: Recurring billing IS handled via Stripe Subscriptions ✓

Verified end-to-end by reading `src/app/api/donations/create-intent/route.ts` and `src/app/api/stripe/webhook/route.ts`:

1. **`/api/donations/create-intent`** (lines 119-142): when `frequency === "monthly"`, creates a Stripe **Customer** + **SetupIntent** (not a PaymentIntent). The SetupIntent's purpose is `off_session` — explicitly intended for future recurring charges.

2. **`/api/stripe/webhook` `setup_intent.succeeded` handler** (lines 263-435): when the SetupIntent succeeds:
   - Creates a **Stripe Product** (one per donation) with name `Monthly donation — ${campaignLabel}`
   - Creates a **`stripe.subscriptions.create({ ... })`** with:
     - `interval: "month"` recurring
     - `unit_amount: amountPence`
     - `default_payment_method: paymentMethodId`
     - `payment_behavior: "error_if_incomplete"` (charges immediately on month 1)
   - Records the Subscription ID on the donation row

3. **`invoice.paid` handler** (lines 442-530): fires for every successful charge in the subscription's life — month 1 (filling the pending row), month 2+ (creating new donation rows for renewals). Each renewal sends a **fresh receipt email** via `dispatchReceipt`.

**Conclusion: Genuine Stripe Subscription model.** Recurring sponsorship is fully automated — donor's card auto-charges every month until they cancel. Cancellation flows through Stripe Dashboard / signed manage-token URL on the receipt email.

### CRITICAL FINDING: GA4 `purchase.value` is the FIRST-MONTH amount, NOT LTV ⚠️

Verified by reading `src/lib/analytics.ts` line 65 explicit comment:

> *"For monthly donations, `value` is the first-month amount — LTV logic belongs to whatever reports on the donations table, not the pixel."*

And `src/app/donate/thank-you/page.tsx` line 61:
```ts
amountGbp = fromPence(pi.amount);  // single-charge amount
```

**Implication for PMax bidding**: Smart Bidding (Max Conversion Value) sees the donor as worth £30, when their actual expected lifetime contribution is £30 × N months × probability of retention. UK Muslim charity orphan sponsorship retention rates are typically 18-36 months mean.

**At ~24-month mean retention with 75% probability of reaching month 12**, true expected LTV per acquired sponsor is roughly **£360-720**. Reporting `value: 30` to GA4 means Smart Bidding will under-bid this campaign by **~12-24x** versus its actual value. This is the single biggest bidding-side issue in the conversion infrastructure.

**Two phase-2 fixes** (both out of scope for this audit):

1. **Front-load LTV**: in `TrackConversion.tsx`, when `frequency === "monthly"`, send `value: amountGbp * EXPECTED_RETENTION_MONTHS` (e.g. 24 months × £30 = £720). Ad-pixel-side LTV proxy. Industry standard for recurring SaaS / charity acquisition campaigns.

2. **Server-side conversion upload via Google Ads API**: re-import accumulated revenue per click_id (gclid) periodically using OCI (Offline Conversions Imports) — `/api/cron/google-ads-oci` already exists in this codebase per the cron schedule. Best-of-both: pixel reports first-month, OCI reports monthly accumulation.

Without one of these fixes, **the PMax campaign will undervalue Orphan Sponsorship conversions and likely under-spend on this audience versus competing campaigns.**

### Subsequent recurring charges and GA4

The webhook dispatches a **receipt email** on every `invoice.paid` (every monthly renewal). However:
- The webhook does NOT fire any GA4 event — it's server-side, no browser context
- The donor only hits `/donate/thank-you` (where `<TrackConversion>` lives) on initial signup, not on subsequent monthly renewals (those are headless background charges)

**Net: GA4 sees one `purchase` event per acquired sponsor, with `value=30` (first month).** No recurring-purchase events in GA4 for monthly sponsors. This is consistent with GA4 best practice for subscription products (one purchase event = one acquisition), but compounds the LTV under-reporting issue above.

### Campaign + frequency parameter persistence

| Stage | `campaign` | `frequency` | `amount` |
|---|---|---|---|
| URL → /donate page.tsx | ✓ read | ✓ read | ✓ read |
| → CheckoutClient props | ✓ `initialCampaign` | ✓ `initialFrequency` | ✓ `initialAmountGbp` |
| → /api/donations/create-intent body | ✓ | ✓ | ✓ (in pence) |
| → Stripe PI/SI metadata | ✓ `metadata.campaign` | ✓ `metadata.frequency` | ✓ `metadata.amount_pence` |
| → /api/donations/confirm | ✓ validated | ✓ validated | ✓ retrieved from PI |
| → Supabase `donations` row | ✓ `campaign` column | ✓ `frequency` column | ✓ `amount_pence` |
| → Webhook → dispatchReceipt | ✓ `donation.campaign` | ✓ `donation.frequency` | ✓ `donation.amount_pence` |
| → Receipt email | ✓ in subject + body | ✓ "Monthly" / "One-time" label | ✓ formatted GBP |
| → GA4 purchase event | ✓ `campaign_slug: "orphan-sponsorship"` | ✓ `frequency: "monthly"` | ⚠️ `value: 30` (first-month, not LTV) |

The `campaign=orphan-sponsorship` parameter is preserved end-to-end. Frequency is preserved end-to-end. Only the `value` semantics are off.

---

## 6. "Everything a Child Needs to Thrive" section

Section 2 of the page (`bg-white`, after hero). All copy verbatim from `page.tsx` lines 134-210.

**Section eyebrow**: `Orphan Sponsorship`
**Section h2**: `Everything a Child Needs to Thrive`
**Lead paragraph**: *"For just £30 a month, you provide an orphaned child with the foundations they need to grow into a self-sufficient adult who contributes positively to their community."*

### Four pillars (verbatim from page.tsx lines 178-201)

| Pillar | Body copy |
|---|---|
| Education | `School fees, uniforms, and learning materials so they can build a future` |
| Nutrition | `Daily meals and clean drinking water for healthy growth` |
| Safe Shelter | `Secure housing in a caring, stable environment` |
| Healthcare | `Medical check-ups, treatment, and vaccinations` |

**Section CTA**: `Sponsor a Child — £30/month` → `#sponsor-form` (in-page anchor)

### Are pillars selectable in the donation flow?

**NO. Pillars are purely informational.** Confirmed by:
- No `?pillar=` query parameter anywhere in source (grepped)
- No selector / dropdown / radio inside the cards — they're static `<div>` blocks
- No flow from card → /donate that carries pillar intent
- The pillar names are never written to PaymentIntent metadata, never passed to GA4, never logged in the donations table

This is structurally identical to the /zakat "Four Pathways" issue (informational copy without backing infrastructure). However the framing is less problematic here because the page never says *"choose a pillar"* — pillars are presented as a holistic outcome ("Everything a Child Needs"), not as selectable options.

### £30 outcome copy (per DonationForm tier set, see §4)

`Sponsors one child — education, nutrition, shelter, and healthcare`

This **is the substantiating tier copy that mirrors the pillars section**. Safe to use verbatim in PMax descriptions because the four-pillar framing on the page substantiates the breakdown.

---

## 7. "From Hardship to Hope" / A Child's Journey section

Section 5 of the page (`bg-white`, after the donation panel). Copy verbatim from `page.tsx` lines 224-282.

**Section eyebrow**: `A Child's Journey`
**Section h2**: `From Hardship to Hope`

### Three narrative paragraphs (verbatim)

**Paragraph 1**:
> *"In rural Bangladesh, millions of orphaned children face daily struggles. Without access to education, proper nutrition, or safe shelter, their futures are uncertain before they begin."*

**Paragraph 2**:
> *"With a sponsor, everything changes. A child who was missing school is now in a classroom. A child who went hungry now eats every day. A child who slept in unsafe conditions now has a stable home."*

**Paragraph 3**:
> *"Children who receive this support are far more likely to become self-sufficient adults who contribute positively to their communities. Your £30 a month doesn't just help a child survive — it gives them the chance to thrive."*

### Imagery in this section

- File: `/images/zakat-family-support.webp` — **shared with /zakat page** (see §14 for full implications)
- Alt: `Deen Relief worker with a child and food supplies in Bangladesh`
- Position: `object-cover object-[center_25%]`
- ProofTag: `<ProofTag location="Bangladesh" position="bottom-right" />`
- Renders inline on mobile (above the narrative text, lg:hidden) and as the right column on desktop (lg:block)

### Captions

NOT PRESENT — only the alt text + ProofTag overlay. No caption block under the image.

---

## 8. "How We Deliver" / Three-step process

Section 6 of the page (`bg-cream`). Copy verbatim from `page.tsx` lines 284-331.

**Section eyebrow**: `How We Deliver`
**Section h2**: `Your Sponsorship, Accounted For`
**Section subhead**: *"Every pound of your sponsorship is tracked and reported with full transparency."*

### Three process steps (verbatim from page.tsx lines 301-318)

| # | Title | Body copy |
|---|---|---|
| 01 | We Identify | `Our local partners identify orphaned children in greatest need across Bangladesh, assessing each case individually.` |
| 02 | We Support | `Your £30/month is directed to education, nutrition, shelter, and healthcare for your sponsored child.` |
| 03 | We Report | `Annual reports and audited financial statements are published openly through the Charity Commission.` |

### Trust strip below the steps (verbatim, page.tsx line 322-329)

`Charity No. 1158608 | 100% pledge on orphan care | Audited annually | Gift Aid eligible`

> ⚠️ **Note step 02 wording**: *"Your £30/month is directed to ... your sponsored child."* — the word *"your"* implies a specific donor↔child mapping that the architecture (§4) does **not** support. This is a soft compliance flag (see §11 + §18). Phase-2 rewrite: *"Your £30/month is directed to education, nutrition, shelter, and healthcare for orphans in our care."* removes the implication.

---

## 9. Trust signals & substantiation

| Signal | Source location | Verbatim |
|---|---|---|
| Charity Commission number | Hero trust strip; Section 6 trust strip; FAQ #6; Footer (inherited) | `Charity No. 1158608` |
| Companies House number | NOT PRESENT on page itself (visible only inside FAQ #6 expanded answer + JSON-LD `identifier` block) | `Companies House (No. 08593822)` |
| Founding year | DonationForm line 75; MiniDonationPicker line 26-27; root metadata (inherited) | `Trusted by 3,200+ donors since 2013` |
| Donor count | DonationForm + MiniDonationPicker | `Trusted by 3,200+ donors since 2013` ✓ |
| Gift Aid eligibility (general) | Hero trust strip; Section 6 trust strip; DonationForm Gift Aid callout | `Gift Aid Eligible` (hero) / `Gift Aid eligible` (footer trust strip) |
| Gift Aid mechanic specific | FAQ #3 (verbatim): `Yes. If you are a UK taxpayer, we can claim an extra 25% on your sponsorship at no additional cost to you. Your £30 becomes £37.50 every month.` | ✓ correctly addresses recurring mechanics — the *"every month"* wording confirms the declaration covers all subsequent renewals (which is correct UK Gift Aid mechanics: the donor's declaration on signup covers all linked future donations under the same agreement). However, this is implicit — the page does NOT explicitly say *"your declaration covers all future monthly charges"*, which would be the most defensive phrasing. Implementation-side, `/api/donations/confirm` does store the Gift Aid declaration once and re-uses it across renewals (per webhook `template.gift_aid_declaration_id` reuse on month 2+). |
| Annual report / audit | FAQ #4 + FAQ #6 + Section 6 step 03 | `Our accounts are publicly audited and filed annually with the Charity Commission.` (FAQ #4); `Annual reports and audited financial statements are published openly through the Charity Commission website.` (FAQ #6); `Annual reports and audited financial statements are published openly through the Charity Commission.` (step 03) |
| Audited annually | Section 6 trust strip | `Audited annually` |
| Admin cap | NOT PRESENT — no "Max 10% admin" qualifier on /orphan-sponsorship (compare /zakat which has it) |
| Public reporting | Implicit via FAQ #6 + step 03 |

### "100% pledge on orphan care" — substantiation analysis

**The claim appears 5 times** (per §4 above). **There is no FAQ entry that explains the mechanism.** Compare:

| Page | Claim | Substantiation? |
|---|---|---|
| /zakat | "100% Zakat policy" | Partially — FAQ #4 explains *"Your Zakat is ring-fenced ... Administrative costs are covered separately"*, but doesn't say what covers admin |
| /qurbani | (no 100% claim — different framing) | N/A |
| /orphan-sponsorship | "100% pledge on orphan care" | ❌ NO FAQ explanation, NO "Max 10% admin" qualifier, NO mechanism statement anywhere |

**This is a more serious substantiation gap than /zakat had.** A regulator or careful donor reading the page sees the bold claim 5 times with **zero on-page explanation** of what covers operational costs. The implication is that 100% goes to "orphan care" with operational costs covered separately (presumably by Gift Aid recovery / unrestricted donations / volunteer time), but this is not stated.

> ⚠️ **For ad copy: high-severity substantiation flag.** Recommend either:
> 1. Soften ad copy to *"Direct support to orphans in Bangladesh"* (substantiable from the four-pillar section)
> 2. Add an FAQ entry: *"Do you have a 100% donation policy? — Yes. Your sponsorship is ring-fenced for direct orphan care... [explain mechanism]"* mirroring /zakat's FAQ #4 pattern — phase-2 fix
> 3. Add a "Max 10% admin" qualifier to the trust strip — phase-2 fix

### Third-party trust marks

- Fundraising Regulator membership: NOT PRESENT
- Muslim Charities Forum membership: NOT PRESENT
- Partner logos visible (`Partners.tsx`, Section 3): **Islamic Relief Worldwide, Trussell, Bangladesh Red Crescent Society, READ Foundation, Human Appeal, Ummah Welfare Trust** (6 partners). Strip header: `Working Alongside`.

---

## 10. Religious framing

**The page is COMPLETELY silent on religious framing.** Confirmed by exhaustive grep against `page.tsx`, `DonationForm.tsx`, `MiniDonationPicker.tsx`, `FaqAccordion.tsx`, `layout.tsx`. None of the following appear:

| Religious anchor | Status on /orphan-sponsorship |
|---|---|
| Quranic verse references (4:36, 76:8, 93:9, 107:1-3) | NOT PRESENT |
| Hadith quotation (Sahih Bukhari "with the orphan in Paradise") | NOT PRESENT |
| Word "Sadaqah" | NOT PRESENT |
| Phrase "Sadaqah Jariyah" | NOT PRESENT |
| Word "Zakat" | ONLY in the cross-link footer — `Paying Zakat or Sadaqah instead?` |
| Reference to Islamic charity / fiqh | NOT PRESENT |
| Mention of Prophet ﷺ | NOT PRESENT |
| Quranic / Arabic quotation block | NOT PRESENT (compare /zakat which has the Ibn Khuzaimah hadith quote about Zakat) |
| Madhab / scholarly framework | NOT PRESENT |
| "in shā' Allāh" or similar | NOT PRESENT on page (BUT receipt email contains it — see `lib/campaigns.ts` orphan-sponsorship receipt: *"Your gift supports an orphaned child with food, shelter, and the chance to stay in school, in shā' Allāh."*) |

> **Competitive gap**. Major UK Muslim charity orphan sponsorship pages (Islamic Relief, Muslim Hands, Penny Appeal, Human Appeal) lead heavily on:
>   1. Quranic verses about caring for orphans
>   2. The Bukhari hadith "I and the one who cares for an orphan will be like this in Paradise" (with the two-fingers gesture)
>   3. Sadaqah Jariyah framing (ongoing reward for ongoing care)
>
> The Deen Relief /orphan-sponsorship page treats orphan sponsorship as **secular international development charity**, not as Islamic religious charity. For the **specifically-Muslim donor segment** (which is the primary acquisition pool for orphan sponsorship in UK ad targeting), this is a meaningful framing gap. PMax ad copy can compensate, but the landing page won't reinforce the religious motivation that drove the click.
>
> **Phase-2**: highest-leverage single addition would be a religious-anchor block (1 verse + 1 hadith + Sadaqah Jariyah framing) inserted between hero and DonationForm. See §19.

---

## 11. Compliance & ethics on orphan imagery

UK Fundraising Code + ASA review of charity advertising imagery is strict. Findings:

### Imagery flags audit

| Flag | Result |
|---|---|
| Photos identifying specific named minors | **NO** — none of the 3 referenced images include child names. Alt text uses generic terms ("a sponsored child", "Three smiling children"). |
| Photos depicting children in distress, hunger, or visible suffering | **NO** — `children-smiling-deenrelief.webp` (alt: *"Three smiling children holding Deen Relief signs in a safe home environment"*) is a positive-framing dignified image. `orphan-sponsorship.webp` (alt: *"Deen Relief worker with a sponsored child and food supplies in Bangladesh"*) is a programme-delivery shot, not distress. `zakat-family-support.webp` is similar. |
| "Save this child" / "rescue this child" framing | **PARTIAL FLAG** — see "A Child Is Waiting for You" analysis below |
| Before/after imagery | **NO** — no before/after pairs |
| Photos lacking contextualising captions | **PARTIAL** — alt text is good but there are no on-page **visible** captions under any image. ProofTag shows location only. |
| Donor-facing statement implying photographed children are "your" sponsored child | **PARTIAL FLAG** — see analysis below |
| Stock-library photos passed off as Deen Relief beneficiaries | **CANNOT VERIFY FROM SOURCE.** The images are in `/public/images/` with no metadata indicating provenance. Visual inspection by a charity comms reviewer is recommended. |

### Specific flag: "A Child Is Waiting for You" — final CTA framing

`page.tsx` line 353 verbatim:

> *"A Child Is Waiting for You"* (h2) + *"£30 a month. That's all it takes to change a life."* (subhead)

**Analysis**:
- The architecture (§4) is **generic-pool sponsorship**, not per-child matching.
- The phrase *"A Child Is Waiting for You"* implies a specific child is awaiting a specific donor — donor-as-saviour positioning, AND donor↔child specificity.
- Combined with Section 6 step 02 wording *"Your £30/month is directed to ... your sponsored child"*, this could be read by a careful donor (or regulator) as misleading: the language implies a per-child relationship that doesn't exist in the actual programme structure.

**Severity**: medium. UK ASA has historically taken issue with charity advertising that implies a 1:1 donor↔beneficiary relationship when the underlying programme is general-pool. Search "[ASA orphan sponsorship complaint]" — this is a known regulator-watched pattern.

**Phase-2 fix** (§19): rewrite both phrases:
- *"A Child Is Waiting for You"* → *"Children Are Waiting for Support"* (collective framing, no implied 1:1)
- Step 02 *"your sponsored child"* → *"orphans in our care"* or *"the child your sponsorship reaches"* (passive — describes outcome, doesn't claim assignment)

### Specific flag: image alt text containing "a sponsored child"

The hero image's alt text says *"Deen Relief worker with a sponsored child"*. The architecture is generic-pool. Flag: same issue as above — the word *"sponsored"* in the alt text implies the photographed child has a specific sponsor.

**Phase-2 fix**: alt text change to *"Deen Relief worker with a child supported by the orphan programme in Bangladesh"* or similar — drops the implied-specific-sponsor framing.

### Image provenance verification — recommended

For each of the 3 referenced images on this page:
- `/images/orphan-sponsorship.webp`
- `/images/children-smiling-deenrelief.webp`
- `/images/zakat-family-support.webp` (shared with /zakat)

Confirm internally before serving paid ads:
1. Does Deen Relief hold parental/guardian consent for these specific children to appear in advertising?
2. Are the children pictured currently in the programme (vs. former beneficiaries who have aged out)?
3. Are the locations correctly attributed (Bangladesh — confirmed for two; verify the third)?
4. None of these are stock-library photos.

This is **not something I can verify from source** — it's an internal records check. Worth doing before ad spend hits significant volume.

---

## 12. FAQ section

6 FAQs, all collapsed-by-default. Component: `src/app/orphan-sponsorship/FaqAccordion.tsx`.

> ⚠️ **FAQ component is duplicated from /qurbani / /zakat (pre-fix)**. Same per-FAQ-anchor-id gap that we already fixed for /qurbani (commit `108858e`) and /zakat (commit `b383643`) — **NOT YET propagated to /orphan-sponsorship**. PMax sitelinks that need to deep-link to specific FAQs (e.g. *"Can I cancel my sponsorship?"* → `/orphan-sponsorship#faq-cancel`) won't work until this fix lands. See §19.

### Verbatim Q&As

**FAQ 1**
- Q: `What does £30/month cover?`
- A: `Your £30 monthly sponsorship covers education (school fees, uniforms, and materials), daily nutrition, safe shelter in a caring environment, and healthcare including medical check-ups and vaccinations.`
- Link: NONE

**FAQ 2**
- Q: `Can I cancel my sponsorship?`
- A: `Yes. You can cancel your monthly sponsorship at any time by contacting us at info@deenrelief.org. There are no contracts or penalties.`
- Link: NONE

**FAQ 3**
- Q: `Is my sponsorship eligible for Gift Aid?`
- A: `Yes. If you are a UK taxpayer, we can claim an extra 25% on your sponsorship at no additional cost to you. Your £30 becomes £37.50 every month.`
- Link: NONE

**FAQ 4**
- Q: `How do I know my sponsorship reaches a child?`
- A: `Our trustees oversee every sponsorship. We work with verified local partners in Bangladesh who deliver support directly. Our accounts are publicly audited and filed annually with the Charity Commission.`
- Link: `About our team` → `/about`

**FAQ 5**
- Q: `Can I sponsor more than one child?`
- A: `Yes. You can set up multiple sponsorships — each at £30/month — to support additional children. Contact us at info@deenrelief.org to arrange this.`
- Link: NONE

**FAQ 6**
- Q: `How is Deen Relief regulated?`
- A: `Deen Relief is registered with the Charity Commission (No. 1158608) and Companies House (No. 08593822). Our accounts are publicly audited and filed annually.`
- Link: `Charity Commission register` → `https://register-of-charities.charitycommission.gov.uk/charity-details/?regid=1158608&subid=0` (external)

### Analysis: FAQ #4 substantiation depth

The campaign-critical FAQ ("How do I know my sponsorship reaches a child?") answers with **trust mechanism only** (trustees + verified local partners + Charity Commission audit), not with **per-donor verification** (no progress reports, no annual statement of where funds went, no portal). The answer is technically substantiable but minimally so.

Compare expectations from major UK Muslim charities (Islamic Relief, Penny Appeal): typically promise **annual progress letter** + **photo update** + **named project area** for individual sponsors. Deen Relief offers none of these per source.

**For ad copy targeting high-friction sponsorship intent**: lean on the existing FAQ wording exactly (it's substantiable), but be aware that competitive landing pages will offer more donor-confidence infrastructure. Conversion rate may be lower per-click than competing campaigns until that infrastructure exists.

### Analysis: FAQ #3 Gift Aid mechanics

The answer correctly conveys that the 25% applies *"every month"* which is the right substantiation for recurring Gift Aid. **The actual implementation is correct** — `/api/donations/confirm` stores one Gift Aid declaration on initial signup and re-uses it for every subsequent renewal (per webhook `gift_aid_declaration_id` reuse logic). This is HMRC-compliant Gift Aid mechanics for a recurring giving relationship.

**Minor improvement opportunity**: the FAQ doesn't explicitly say *"Your declaration covers all future monthly charges automatically — no need to re-declare each month."* — that would be the most defensive donor-facing wording. But the current copy is fine as-is.

### FAQs notably absent

| Question donors plausibly ask | Status |
|---|---|
| "Do you have a 100% donation policy?" | **NOT PRESENT** — major gap given the claim is made 5× on the page (see §9) |
| "Is orphan sponsorship Zakat-eligible?" | **NOT PRESENT** — important for Muslim donor segment (orphans are explicitly Zakat-eligible in canonical fiqh) |
| "Can I exchange letters / photos with my sponsored child?" | **NOT PRESENT** (no, the architecture doesn't support this) |
| "What happens to my sponsored child if I stop?" | **NOT PRESENT** — donor-anxiety question |
| "How are sponsored orphans selected?" | **PARTIAL** — covered obliquely in step 01 ("Our local partners identify orphaned children in greatest need") but not as an explicit FAQ |
| "Do I get progress updates / photos / letters?" | **NOT PRESENT** — major confidence gap |
| "What's the religious basis for orphan sponsorship?" | **NOT PRESENT** — see §10 |

---

## 13. Cross-links to other causes

| From | Anchor text | To |
|---|---|---|
| Header (inherited) | `Pay Zakat` | `/zakat` |
| Header (inherited) | other nav items | various |
| Footer (inherited) | nav | various |
| FAQ #4 link | `About our team` | `/about` |
| FAQ #6 link | `Charity Commission register` | external |
| `DonationForm` line 240 | `Pay Zakat` | `/zakat` |
| `DonationForm` line 247 | `Give Sadaqah` | `/sadaqah` |
| `DonationForm` lead-in copy line 238 | `Paying Zakat or Sadaqah instead?` | (text framing) |

The page **only cross-links to `/zakat` and `/sadaqah`** as alternatives, in the donation footer. There is no cross-link to `/palestine`, `/qurbani`, `/cancer-care`, `/clean-water`, `/uk-homeless`, `/build-a-school`, or `/our-work`. **Phase-2**: a "Programmes your sponsorship complements" subgrid linking to /cancer-care and /our-work could keep donors on-site even if they bounce off the £30/month commitment.

> Inbound cross-links to `/orphan-sponsorship` from elsewhere on the site (verified by grep against `src/`):
> - Header nav (`Header.tsx`)
> - Footer nav (`Footer.tsx`)
> - Homepage (`src/app/page.tsx`)
> - 404 page (`not-found.tsx`)
> - Cross-link from `/sadaqah` and `/uk-homeless` DonationForms
> - `/our-work` page
> - `GivingPathways` component

---

## 14. Imagery inventory

### Images referenced ON `/orphan-sponsorship` (verbatim from source)

| Use | File | Alt text | Dimensions | Size |
|---|---|---|---|---|
| Hero | `/images/orphan-sponsorship.webp` | `Deen Relief worker with a sponsored child and food supplies in Bangladesh` | 1200 × 1600 | 388 KB |
| OG share image | `/images/children-smiling-deenrelief.webp` | `Children supported by Deen Relief` | 1200 × 1600 | 161 KB |
| Twitter share image | `/images/children-smiling-deenrelief.webp` | (string array — no alt) | 1200 × 1600 | 161 KB |
| "Everything a Child Needs" §2 desktop + mobile | `/images/children-smiling-deenrelief.webp` (used 2x via responsive show/hide) | `Three smiling children holding Deen Relief signs in a safe home environment` | 1200 × 1600 | 161 KB |
| "From Hardship to Hope" §5 desktop + mobile | `/images/zakat-family-support.webp` (used 2x via responsive show/hide; **shared with /zakat**) | `Deen Relief worker with a child and food supplies in Bangladesh` | 1200 × 1600 | 388 KB |
| Header logo | `/images/logo.webp` | `Deen Relief` | 2085 × 349 | 24 KB |
| Partner strip | 6 logos under `/images/partners/` | (per-partner names) | mixed | small |

> **Image-sharing observation**: `zakat-family-support.webp` is rendered on both /zakat and /orphan-sponsorship with the **same alt text** (`Deen Relief worker with a child and food supplies in Bangladesh`). Since both contexts (Zakat funding + Orphan Sponsorship) genuinely encompass this kind of programme delivery, this is not a misleading reuse — it's accurate dual-context imagery. No flag.

### Other images on disk that COULD be cross-used for orphan sponsorship

Inventory of all `/public/images/` root files relevant to Bangladesh / orphans / children context:

| File | Dimensions | Size | Likely content (from filename + alt-text usage elsewhere) |
|---|---|---|---|
| `bangladesh-community-children.webp` | 558×395 | 44 KB | Community children — used elsewhere for Bangladesh-coded contexts |
| `bangladesh-housing.webp` | 600×544 | 29 KB | Housing programme — used in `/clean-water` page |
| `bangladesh-school-children.webp` | 746×265 | 57 KB | School children — wide horizontal aspect, good for sitelinks |
| `bangladesh-school-v2.webp` | 746×320 | 81 KB | School children alt version — wide horizontal |
| `centre-child.webp` | 602×802 | 49 KB | Child at centre — likely Gulucuk Evi (cancer-care context) — caution: cross-context use risks misattribution |
| `children-smiling-deenrelief.webp` | 1200×1600 | 161 KB | ✓ already on this page |
| `hero-bangladesh-community.webp` | 558×395 | 44 KB | Bangladesh community hero |
| `orphan-care-worker.webp` | 274×530 | 23 KB | Orphan-care worker — small file, narrow vertical |
| `orphan-sponsorship.webp` | 1200×1600 | 388 KB | ✓ already on this page (hero) |
| `zakat-bangladesh-family.webp` | 600×544 | 29 KB | Bangladesh family — used on /zakat |
| `zakat-family-support.webp` | 1200×1600 | 388 KB | ✓ already on this page (§5) |

### Sub-directories checked

- `/public/images/orphan/` — does NOT exist
- `/public/images/orphans/` — does NOT exist
- `/public/images/sponsorship/` — does NOT exist
- `/public/images/bangladesh/` — does NOT exist
- `/public/images/team/` — exists (team photos, not relevant for orphan campaign)
- `/public/images/partners/` — exists (partner logos)

### Images depicting individual identifiable children

From alt text and filenames alone (visual inspection by a comms reviewer recommended for final compliance check):

- `children-smiling-deenrelief.webp` — alt: "Three smiling children holding Deen Relief signs" → identifiable but in dignified-positive framing, holding org-branded signs (suggests organised event with consent). Used as both OG and inline.
- `orphan-sponsorship.webp` (hero) — alt: "Deen Relief worker with a sponsored child" → child appears identifiable; "sponsored" wording is the §11 flag.
- `zakat-family-support.webp` — alt: "Deen Relief worker with a child" → child appears identifiable.
- `centre-child.webp` — likely identifiable single child.

> **None depict children in distress per alt text**, but all four pictured-with-child images would benefit from internal verification of consent records before paid ad scaling.

---

## 15. Imagery sourcing brief for the Orphan Sponsorship campaign

### Editorial criteria recap (from your brief)

- **Geographic focus**: Bangladesh only
- **Age range diversity**: not all the same age group
- **Subject framing**: dignified, no distress, no "save this child" positioning
- **Coherence with page pillars**: education, nutrition, shelter, healthcare
- **Aspect ratio diversity**: include landscape if available (PMax gains from 1.91:1 coverage)

### Recommended shortlist (8-12 images)

| # | File | Aspect | Dimensions | Rationale | Caveats / concerns |
|---|---|---|---|---|---|
| 1 | `orphan-sponsorship.webp` | 3:4 portrait | 1200×1600 | ✓ Hero asset already on page. Worker + child + supplies → maps to Nutrition + Shelter pillars. Strong primary creative. | Alt text uses *"sponsored"* — fix per §11 if reused in ads with a caption |
| 2 | `children-smiling-deenrelief.webp` | 3:4 portrait | 1200×1600 | ✓ Multiple children, smiling, dignified framing, holding Deen Relief signs (clear org context). Maps well to "thrive" framing. Strong for OG/share. | Already in heavy use on the page — for ad creative, consider rotating with #4-#7 below to avoid overexposure |
| 3 | `zakat-family-support.webp` | 3:4 portrait | 1200×1600 | ✓ Worker + child + supplies. Programme-delivery shot. Maps to all four pillars. | Currently shared with /zakat — if ad creative repeats too often across both campaigns, consider commissioning an orphan-exclusive replacement |
| 4 | `bangladesh-school-children.webp` | ~2.8:1 landscape | 746×265 | Wide horizontal — **rare landscape asset**, ideal for PMax 1.91:1 slot which usually has poor coverage. Education pillar. | Small native height (265px) — may upscale poorly. Only use at original size or smaller. Verify quality before ad serving. |
| 5 | `bangladesh-school-v2.webp` | ~2.3:1 landscape | 746×320 | Better-resolution version of #4 — same content premise. Education pillar. | Same caveat re: native size. Prefer this over #4 if subjects align. |
| 6 | `bangladesh-community-children.webp` | ~1.4:1 landscape-ish | 558×395 | Community children context. Less polished than #1-#3 but adds geographic + community framing. | Small native size — limit to small ad slots |
| 7 | `bangladesh-housing.webp` | ~1.1:1 squarish | 600×544 | Shelter pillar — hard to find shelter-specific imagery. | Small native size. Currently used on `/clean-water` so has cross-context history — verify visual content matches "shelter" framing for orphan use |
| 8 | `hero-bangladesh-community.webp` | ~1.4:1 landscape-ish | 558×395 | Bangladesh community establishing shot. Anchors geographic context. | Small. May be visually similar to #6 — pick one or the other for diversity |
| 9 | `zakat-bangladesh-family.webp` | ~1.1:1 squarish | 600×544 | Family unit framing. Already on /zakat as Real Families image. | Cross-context with /zakat — same caveat as #3 |
| 10 | `orphan-care-worker.webp` | ~0.5:1 narrow vertical | 274×530 | Worker focus — humanises the programme delivery angle. | Very small + odd aspect ratio. Limited PMax usefulness. Consider only for small responsive ad slots |
| 11 | `centre-child.webp` | ~0.75:1 portrait | 602×802 | Single-child portrait. | ⚠️ Likely Gulucuk Evi (cancer-care context). Cross-context use risks misattribution. **Verify before using on orphan-sponsorship campaign.** |

### What to deprioritise / avoid

- **All `cancer-children-*.webp` and `cancer-care-*.webp` files** — these are explicitly cancer-care programme imagery (often Adana, Turkey / Gulucuk Evi). Using them on orphan sponsorship implies a cross-programme relationship that the page architecture doesn't support. Avoid.
- **All `gaza-*` imagery** — Palestine emergency relief, geographically incorrect for a Bangladesh-only orphan programme.
- **All `qurbani-*` imagery** — campaign-specific livestock + Eid context, irrelevant.
- **`gaza-displacement-camp-children.jpeg`** — distress-coded imagery (displacement camp), violates the "no distress" criterion.

### Phase-2 commission recommendations

The 11 images above are the workable pool. None of them are landscape-native at PMax-friendly resolution (the closest are `bangladesh-school-children.webp` and `bangladesh-school-v2.webp` at 746×265 / 746×320, both too small for full-bleed landscape ad slots).

**Recommended commission shoots** (out of scope for this audit, but worth documenting):
1. **Wide-aspect Bangladesh school programme establishing shot** at 1920×1080 minimum — fills the PMax landscape gap
2. **Multiple-children dignified group shot** with varied ages (5-15 range) — fills the age-diversity gap
3. **Healthcare delivery shot** (medical check-up, vaccination context) — fills the Healthcare pillar gap (currently no image directly maps to it)
4. **Specific shelter / housing facility shot** — substantiates Shelter pillar

---

## 16. Conversion infrastructure on this page

### Donation URLs (all permutations emitted)

| Source | URL template |
|---|---|
| Hero CTA | `#sponsor-form` (in-page anchor — does not route to /donate) |
| §2 CTA | `#sponsor-form` (in-page anchor) |
| `DonationForm` CTA (§4) | `/donate?campaign=orphan-sponsorship&amount=${amountForUrl}&frequency=${frequency}` |
| `MiniDonationPicker` CTA (§8) | same as above |
| JSON-LD DonateAction `urlTemplate` | `https://deenrelief.org/donate?campaign=orphan-sponsorship&amount={amount}&frequency={frequency}` |

### End-to-end value flow

✓ Verified in §5 above. Summary:

1. URL `?amount=X` → /donate page reads searchParams → CheckoutClient seeded with `initialAmountGbp`, `initialFrequency`
2. CheckoutClient → POST `/api/donations/create-intent` → server creates **PI (one-time) or SI+Customer (monthly)** with `metadata.campaign = "orphan-sponsorship"` + `metadata.amount_pence`
3. Donor confirms via Stripe Elements → POST `/api/donations/confirm` → upserts donor + Gift Aid declaration + pending donation row
4. Stripe redirects to `/donate/thank-you?payment_intent=X` (one-time) or `?setup_intent=X` (monthly)
5. **Monthly path**: webhook `setup_intent.succeeded` creates **`stripe.subscriptions.create({ ... interval: month, amount: amountPence ... })`** — full Subscription object, not manual billing
6. Thank-you page retrieves intent server-side, passes `value: amountGbp`, `campaign_slug: "orphan-sponsorship"` to `<TrackConversion>` → fires GA4 `purchase` event
7. Subsequent monthly renewals (webhook `invoice.paid`): each creates a new donation row + sends a fresh receipt email; **no GA4 event fires** on renewals (server-side, no browser context)

### GA4 events fired

| Event | When | Payload |
|---|---|---|
| `page_view` (auto) | Every page load if GA4 base script is loaded | Standard |
| `purchase` | Once per signup, on `/donate/thank-you` after Stripe success redirect | `transaction_id` (PI/SI id), `value` (GBP — **first-month for monthly, full amount for one-time**), `currency: GBP`, `campaign_slug: "orphan-sponsorship"`, `campaign_label: "Orphan Sponsorship"`, `frequency: "monthly" \| "one-time"`, `gift_aid_claimed`, `affiliation: "Deen Relief"`, `items[]`, plus `user_data.sha256_email_address` if Enhanced Conversions consented |
| Form-fill / sponsorship-signup-specific event | NOT FIRED — only `purchase` exists in the analytics surface |
| Recurring renewal events | NOT FIRED |

### Enhanced Conversions

✓ Wired correctly. `/donate/thank-you/TrackConversion.tsx` reads consent cookie, hashes donor email with SHA-256 client-side via `crypto.subtle.digest`, only sends `user_data.sha256_email_address` if `ad_user_data === true`.

---

## 17. SEO / on-page optimisation status

### Heading hierarchy (in document order)

```
h1: Sponsor an Orphan in Bangladesh                          (Hero)
h2: Everything a Child Needs to Thrive                       (§2)
h2: Start Your Sponsorship Today                             (DonationForm §4)
h2: From Hardship to Hope                                    (§5)
h2: Your Sponsorship, Accounted For                          (§6)
h2: Sponsorship FAQs                                         (§7)
h2: A Child Is Waiting for You                               (§8 — flagged in §11)
```

> ✓ No h1/h2 duplication issue (compare /zakat which had a duplicate "Pay Your Zakat With Confidence" h1 + h2). The DonationForm uses `Start Your Sponsorship Today` as its h2 — distinct from h1.

### Image alt text coverage

✓ Every image inspected has alt text. ✓ No bare `<img>` with empty alt. (Twitter image array doesn't take alt — that's a Next.js Metadata API limitation, not a coverage gap.)

### Internal links

| Target | Source location |
|---|---|
| `#sponsor-form` | Hero CTA, §2 CTA |
| `/donate?campaign=orphan-sponsorship&...` | DonationForm CTA, MiniDonationPicker CTA |
| `/zakat` | DonationForm cross-link |
| `/sadaqah` | DonationForm cross-link |
| `/about` | FAQ #4 link |
| `/` (logo) | Header (inherited) |
| Header nav | various (inherited) |
| Footer nav | various (inherited) |

### External links

- FAQ #6 → Charity Commission register — `target="_blank" rel="noopener noreferrer"` per FaqAccordion.tsx line 63
- Header / Footer social links (inherited) — `target="_blank"`

### Render mode

- `/orphan-sponsorship` = server component → **statically prerendered**. Confirmed by `npm run build` output: `○ /orphan-sponsorship` (Static).
- `DonationForm`, `MiniDonationPicker`, `FaqAccordion` all client components, hydrate after static HTML loads.

### Page weight (above the fold)

- Hero image: 388 KB WebP (`orphan-sponsorship.webp`) — `priority` flag → preloaded
- Logo: 24 KB
- No video assets
- Stripe Elements not loaded on this page (only on `/donate`)
- Total above-the-fold image weight ≈ 412 KB. Reasonable but the hero image is large — consider serving a smaller variant for hero crop dimensions in phase-2.

### Sitemap inclusion

✓ `/orphan-sponsorship` is in `src/app/sitemap.ts` line 21 (campaigns array), `priority: 0.9`, `changeFrequency: "weekly"`.

### Robots

✓ Default `index: true, follow: true`. No `noindex` override.

---

## 18. Charity advertising compliance flags

| # | Flag | Severity | Detail |
|---|---|---|---|
| 1 | "100% pledge on orphan care" claim — substantiation gap | **HIGH** | Claim made 5× in visible copy. NO FAQ explanation. NO "Max 10% admin" qualifier. NO mechanism statement anywhere on page. Compare /zakat which at least has FAQ #4. **Highest-priority flag for ad copy.** See §9. |
| 2 | "A Child Is Waiting for You" CTA framing | **MEDIUM** | Implies per-child specificity that the architecture doesn't support. Combine with Section 6 step 02 wording *"your sponsored child"* and the implication is donor↔child 1:1 relationship which is not how the programme works. Known ASA-watched pattern. See §11. |
| 3 | "your sponsored child" wording in step 02 | **MEDIUM** | Same root issue as #2. Reinforces 1:1 implication. See §11. |
| 4 | Hero image alt text *"a sponsored child"* | **LOW** | Same root issue as #2-3, but in alt text only. Less donor-visible. See §11. |
| 5 | Image consent / provenance | **VERIFY INTERNALLY** | Cannot verify from source. Confirm parental/guardian consent records exist for the 3 children pictured. See §11. |
| 6 | Outcome claims tied to specific amounts (£30 → "education, nutrition, shelter, healthcare") | **LOW — substantiable** | Tier-specific outcome copy is mapped to programme pillars in the four-pillar section. Substantiable as written. See §6. |
| 7 | Urgency language | **CLEAN** | No countdown, no "act now", no Ramadan-deadline pressure. Closing CTA *"A Child Is Waiting for You"* is the only urgency signal — flagged as #2 above for different reason. |
| 8 | Religious approval claims | **CLEAN — none made** | Page makes no "scholar-approved" or fatwa-cited claim. (Phase-2 opportunity §19 to add religious framing without making approval claims that need substantiation.) |
| 9 | Beneficiary imagery contextualisation | **PARTIAL** | Alt text is descriptive but no on-page visible captions. ProofTag shows location only. Phase-2: add caption blocks. |
| 10 | Gift Aid mechanics on recurring | **CLEAN** | FAQ #3 correctly conveys *"Your £30 becomes £37.50 every month"* — implementation matches per webhook code. |
| 11 | "Cancel anytime" substantiation | **CLEAN** | FAQ #2 explains email-based cancellation. Receipt email also provides signed manage-token URL for self-service. |

---

## 19. Phase-2 gaps

Ranked by impact on conversion + on resolving compliance flags:

1. **Per-FAQ anchor ids + hash-auto-open** — duplicate the /qurbani (`108858e`) + /zakat (`b383643`) work. PMax sitelinks need to deep-link to specific FAQs (e.g. /orphan-sponsorship#faq-cancel). Same `FaqAccordion.tsx` pattern, mechanical fix.

2. **Add "100% pledge on orphan care" mechanism explanation** — either a new FAQ entry mirroring /zakat's FAQ #4 wording, OR a "Max 10% admin" qualifier in the trust strip, OR an above-the-fold explainer card. Substantiation flag #1 above.

3. **Soften "A Child Is Waiting for You" + "your sponsored child" wording** — collective framing instead of 1:1 implication. Substantiation flags #2-3 above.

4. **Religious framing block** — single largest competitive gap (§10). Insert between hero and DonationForm:
   - 1 Quranic verse (4:36 or 93:9 are standard choices)
   - 1 hadith (the Bukhari "with the orphan in Paradise" hadith is canonical for orphan sponsorship)
   - Sadaqah Jariyah framing line
   
   This is high-leverage for the Muslim donor segment that PMax will target.

5. **Add "Is orphan sponsorship Zakat-eligible?" FAQ** — orphans are explicitly in the 8 categories of Zakat-eligible recipients (the *masakin* and *fuqara* categories cover destitute orphans). Surfacing this would significantly broaden the donor pool by tapping Zakat-budget alongside Sadaqah-budget donors.

6. **Forward-load monthly LTV in GA4 `purchase.value`** — see §5 critical finding. Without this, PMax will under-bid by 12-24x. Either client-side LTV proxy (`value: amountGbp * 24`) or server-side OCI uploads via the existing `/api/cron/google-ads-oci` cron.

7. **Donor-confidence infrastructure** — annual progress letter, photo update, named project area. Currently FAQ #4 answers minimally compared to competitor charities. Phase-2 / phase-3.

8. **Sponsor portal** — donors track their sponsorship over time, view annual statements, download Gift Aid summary. Major retention improvement; reduces month-3-cancel attrition.

9. **Country expansion** — Pakistan, Yemen, Syria all common in UK Muslim charity orphan sponsorship. Currently single-country (Bangladesh). Phase-3.

10. **Multi-orphan tier** — *"Sponsor 5 orphans for £150/month"* currently handled by FAQ #5 *"Contact us at info@deenrelief.org"*. Self-service multi-orphan tier in the picker would convert higher.

11. **Cross-link to `/cancer-care`, `/clean-water`, `/our-work`** — currently only /zakat and /sadaqah. Adding programme links could keep bouncing donors on-site.

12. **Calculator / impact framing** — *"Your sponsorship over 24 months: £720 + £180 Gift Aid = £900 lifetime impact"* — gives donors a concrete LTV picture, reinforces the long-term commitment frame.

13. **Wide-aspect orphan-specific imagery commission** — fills the PMax 1.91:1 landscape gap (§15).

14. **Update step 02 wording to drop *"your sponsored child"* phrasing** — same as #3 above. Phase-2.

15. **"Performed in the name of (optional)" field** — same pattern as recently-built Qurbani names feature. Donors sponsoring on behalf of a deceased relative would value this.

---

## Audit complete

All 19 sections complete. No code modified. For Google Ads PMax campaign build, reference this document by section number (e.g. *"see §6 for the four-pillar copy"*).

### Notable consistency points with the prior /qurbani and /zakat audits

- Same `FaqAccordion` component (and the same per-FAQ-anchor-id gap **still exists on /orphan-sponsorship** — same fix as `108858e` for Qurbani and `b383643` for Zakat needs to land here)
- Same `ProofTag` overlay pattern on hero (here used correctly for single-country page)
- Same `Partners.tsx` strip — six fixed partner logos
- Same root org schema (Block 1) and root WebSite schema (Block 2)
- Consistent donate URL contract: `/donate?campaign={slug}&amount={X}&frequency={one-time|monthly}`
- Consistent GA4 `purchase` event payload across all campaigns

### Single-page singular findings (not present on /qurbani or /zakat)

- **Stripe Subscription model verified end-to-end** — true recurring billing for monthly sponsors (the only campaign where this matters operationally)
- **GA4 `value` is first-month, NOT LTV** — affects PMax bidding accuracy materially (§5 + §19 #6)
- **No religious framing on the page** — competitive gap unique to this page (§10)
- **`location: Bangladesh, BD` is encoded in the FundraisingEvent JSON-LD** — only campaign page with explicit geographic schema (§2)
- **"100% pledge on orphan care" claim with NO on-page mechanism explanation** — substantiation gap more severe than /zakat's "100% Zakat policy" claim (§9)
- **CTA framing implies per-child specificity** that the architecture doesn't support — ASA-watched pattern (§11 + §18 #2-3)
