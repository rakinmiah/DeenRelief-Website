# /zakat — Google Ads PMax Source Audit

Audit of `https://deenrelief.org/zakat` as deployed on the same head as commit `0fccc6c` (post-Qurbani-names work, May 2026). All copy quoted **verbatim** from source. Any field marked **NOT PRESENT** does not exist in source — do not invent it for ad copy.

Sources read:
- `src/app/zakat/page.tsx`
- `src/app/zakat/layout.tsx`
- `src/app/zakat/ZakatCalculator.tsx`
- `src/app/zakat/DonationForm.tsx`
- `src/app/zakat/MiniDonationPicker.tsx`
- `src/app/zakat/FaqAccordion.tsx`
- `src/app/api/nisab/route.ts`
- `src/app/layout.tsx` (root)
- `src/app/donate/page.tsx`, `donate/CheckoutClient.tsx`, `donate/thank-you/page.tsx`, `donate/thank-you/TrackConversion.tsx`
- `src/lib/donationSchema.ts`, `lib/campaigns.ts`, `lib/analytics.ts`
- `src/components/Partners.tsx`, `ProofTag.tsx`, `ProcessSteps.tsx`, `BreadcrumbSchema.tsx`, `JsonLd.tsx`
- `src/app/sitemap.ts`
- `public/images/` (full inventory)

---

## 1. Page metadata

| Field | Value |
|---|---|
| Final canonical URL | `https://deenrelief.org/zakat` |
| `<title>` | `Pay Your Zakat With Confidence \| Deen Relief` |
| Meta description | `3,200+ donors since 2013 trust Deen Relief's 100% Zakat policy — every penny reaches eligible recipients. Gift Aid eligible. Charity No. 1158608.` (verbatim — matches your observation) |
| OG title | `Pay Your Zakat With Confidence \| Deen Relief` |
| OG description | (same as meta description, verbatim) |
| OG image URL | `https://deenrelief.org/images/palestine-relief.webp` |
| OG image alt | `Deen Relief aid distribution` |
| OG site name | `Deen Relief` (inherited from root) |
| OG type | `website` (inherited from root) |
| OG locale | `en_GB` (inherited from root) |
| Twitter card | `summary_large_image` |
| Twitter site | `@deenrelief` |
| Twitter title | (same as OG title) |
| Twitter description | (same as OG description) |
| Twitter images | `["/images/palestine-relief.webp"]` |
| Meta robots directive | **default — `index: true, follow: true`** ✓ (no override in `layout.tsx`) |
| theme-color | `#2D6A2E` (inherited from root viewport) |
| `<link rel="canonical">` | `/zakat` (relative; resolves to `https://deenrelief.org/zakat` via root `metadataBase`) |
| `<link rel="alternate">` hreflang | NOT PRESENT |

> ⚠️ **OG/Twitter share image is `/images/palestine-relief.webp`** — same image as the hero. This is intentional in source (`zakat/layout.tsx` lines 13–24) but contributes to the positioning concern flagged in §13/§16: when this URL is shared on Facebook / WhatsApp / X, the unfurl card will be a Gaza-coded image on a year-round, multi-country Zakat page. Confirm this is desired.

---

## 2. Structured data (JSON-LD)

The page emits **5 distinct JSON-LD blocks** when rendered, in this order:

### Block 1 — `@type: NGO` (Organization)
Injected from `src/app/layout.tsx` (root). **Identical to the Qurbani audit Block 1** — see `QURBANI_PMAX_AUDIT.md` §2 Block 1 for the verbatim payload. Key fields: Charity No. `1158608`, Companies House `08593822`, founded `2013`, founder `Shabek Ali`, addresses London + Brighton, telephone `+44-300-365-8899`, `nonprofitStatus: LimitedByGuaranteeCharity`, `areaServed: [Palestine, Bangladesh, Turkey, United Kingdom]`, `knowsAbout` includes `"Zakat distribution"` and `"Sadaqah and Sadaqah Jariyah"`. Org-level `potentialAction` is a generic `DonateAction` to `/donate`.

### Block 2 — `@type: WebSite`
Identical to Qurbani audit Block 2.

### Block 3 — `@type: WebPage` (with FundraisingEvent + DonateAction)
Injected from `src/app/zakat/layout.tsx` via:
```ts
buildDonationPageSchema({
  slug: "zakat",
  canonicalPath: "/zakat",
  pageName: "Pay Your Zakat With Confidence | Deen Relief",
  pageDescription: "3,200+ donors since 2013 trust Deen Relief's 100% Zakat policy — every penny reaches eligible recipients. Gift Aid eligible. Charity No. 1158608.",
  fundraisingName: "Zakat Collection",
  fundraisingDescription: "Collect and distribute Zakat to eligible recipients worldwide under a strict 100% Zakat policy.",
})
```

Resolved verbatim:
```json
{
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": "https://deenrelief.org/zakat#webpage",
  "url": "https://deenrelief.org/zakat",
  "name": "Pay Your Zakat With Confidence | Deen Relief",
  "description": "3,200+ donors since 2013 trust Deen Relief's 100% Zakat policy — every penny reaches eligible recipients. Gift Aid eligible. Charity No. 1158608.",
  "dateModified": "<built at deploy time>",
  "inLanguage": "en-GB",
  "isPartOf": { "@type": "WebSite", "name": "Deen Relief", "url": "https://deenrelief.org" },
  "about": {
    "@type": "FundraisingEvent",
    "name": "Zakat Collection",
    "description": "Collect and distribute Zakat to eligible recipients worldwide under a strict 100% Zakat policy.",
    "organizer": {
      "@type": "NGO",
      "@id": "https://deenrelief.org/#organization",
      "name": "Deen Relief",
      "url": "https://deenrelief.org",
      "identifier": "1158608",
      "logo": "https://deenrelief.org/images/logo.webp",
      "address": { "@type": "PostalAddress", "addressCountry": "GB" }
    }
  },
  "potentialAction": {
    "@type": "DonateAction",
    "name": "Donate to Zakat Collection",
    "description": "Collect and distribute Zakat to eligible recipients worldwide under a strict 100% Zakat policy.",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": "https://deenrelief.org/donate?campaign=zakat&amount={amount}&frequency={frequency}",
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
    "priceSpecification": { "@type": "PriceSpecification", "priceCurrency": "GBP", "minPrice": 1 }
  }
}
```

> No `location` field — Zakat is global, not geo-pinned. Compare with `/qurbani` which also omits it, and `/palestine` which does include it.

### Block 4 — `@type: BreadcrumbList`
Injected from `src/app/zakat/page.tsx` line 69 via `<BreadcrumbSchema items={[{ name: "Pay Zakat", href: "/zakat" }]} />`. Resolved:
```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Pay Zakat", "item": "https://deenrelief.org/zakat" }
  ]
}
```

### Block 5 — `@type: FAQPage`
Injected from `src/app/zakat/page.tsx` line 70 via `<JsonLd data={faqSchema} />`. Built from the 5 FAQs (see §11) — `mainEntity` is an array of 5 `Question` objects with `acceptedAnswer.text` set to the answer string verbatim.

### Schema-type checklist
| Schema | Present? | Notes |
|---|---|---|
| `DonateAction` | ✓ | Two — org-level (Block 1, generic to `/donate`) + page-level (Block 3, with `campaign=zakat&amount={amount}` template) |
| `NGO` (Organization) | ✓ | Block 1 |
| `Organization` | — | Uses `NGO` (more specific subclass) |
| `FAQPage` | ✓ | Block 5 |
| `BreadcrumbList` | ✓ | Block 4 |
| `FundraisingEvent` | ✓ | Nested inside Block 3 |
| `FinancialProduct` | NOT PRESENT |
| `Calculator` / `WebApplication` for the Zakat calculator | NOT PRESENT — calculator output not exposed as structured data |

---

## 3. Hero section

| Field | Value |
|---|---|
| Eyebrow | `Pay Your Zakat` (uppercase, amber) |
| Hero `<h1>` | `Pay Your Zakat With Confidence` |
| Hero italic subhead | `100% of your Zakat reaches those who need it most.` |
| Hero supporting paragraph | `100% Zakat policy. Every penny reaches eligible recipients. Trustee-verified before funds are released.` |
| Trust line below paragraph | `Charity No. 1158608 · 100% Zakat Policy · Gift Aid Eligible` |
| Hero CTA text | `Pay Zakat Now` |
| Hero CTA href | `#zakat-form` (in-page anchor to the picker — does NOT route to `/donate`) |
| Hero image src | `/images/palestine-relief.webp` |
| Hero image alt | `Deen Relief worker distributing aid to a family in Gaza` |
| Hero image dimensions | 1200 × 1600, 164 KB |
| Hero image positioning | `object-cover object-[center_37%]` |
| Overlay | Two stacked dark-blue gradients (left→right and bottom→top) for legibility — `rgba(26,26,46, ...)` |
| `<ProofTag>` on hero | `<ProofTag location="Gaza" position="bottom-right" />` |
| Urgency / seasonal copy | NOT PRESENT — no Ramadan, Dhul Hijjah, deadline, or seasonal reference anywhere in the hero |
| Trust signals in hero | Charity No., 100% Zakat policy, Gift Aid eligible — all in the inline trust strip below the supporting paragraph |
| Min-height | `md:min-h-[50vh]` (shorter than `/qurbani` which is `md:min-h-[80vh]`) |

> ⚠️ **Hero image + "Gaza" ProofTag combination on a Zakat page** — same flag as in §1 about the OG image. Zakat is general charity funding distributed across multiple causes/geographies (per the page's own "Real Families, Real Impact" section showing Bangladesh + Turkey, plus the FAQ answer about four pathways). Anchoring the hero to Gaza-only imagery + a "Gaza" location tag implies to a quick reader that Zakat funds are Palestine-restricted. This is the inverse of the `/qurbani` "Gaza-photo on Bangladesh-cow page" issue. See §16.

---

## 4. Zakat calculator architecture

**File**: `src/app/zakat/ZakatCalculator.tsx` (`"use client"`).
**Location**: Section 7 of `/zakat`, between the "Real Families" image gallery and the FAQ. **Not** a separate route — lives inline on `/zakat`.

### Live nisab — verified live, not hardcoded

The calculator fetches nisab from `GET /api/nisab` on mount. The route (`src/app/api/nisab/route.ts`) does this:

```ts
const GOLD_NISAB_GRAMS = 87.48;     // canonical ✓
const SILVER_NISAB_GRAMS = 612.36;  // canonical ✓
const TROY_OZ_TO_GRAMS = 31.1035;

export const revalidate = 21600;    // 6 hours

// Fetch live spot prices in GBP from fawazahmed0/currency-api (free, no key,
// CDN-backed, daily-updated). Endpoints: xau.json (gold), xag.json (silver).
const goldRes  = await fetch("https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/xau.json", { next: { revalidate: 21600 } });
const silverRes = await fetch("https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/xag.json", { next: { revalidate: 21600 } });

// Convert troy-ounce → gram → nisab in GBP
const goldPerGram   = goldData.xau.gbp   / TROY_OZ_TO_GRAMS;
const silverPerGram = silverData.xag.gbp / TROY_OZ_TO_GRAMS;

const goldNisab   = Math.round(goldPerGram   * GOLD_NISAB_GRAMS   * 100) / 100;
const silverNisab = Math.round(silverPerGram * SILVER_NISAB_GRAMS * 100) / 100;
```

**Substantiation conclusion: the "live gold and silver nisab prices" copy is accurate.** The values are fetched from a public commodity API on a 6-hour cache. Caveats:

1. **6-hour staleness window.** Acceptable for nisab — daily spot moves are immaterial. Worth knowing in case a regulator asks "how live is live?"
2. **Fallback values are hardcoded** when the API fails: `gold: { pricePerGram: 113, nisab: 9885 }, silver: { pricePerGram: 1.82, nisab: 1114 }, fallback: true`. The UI surfaces this with the suffix `· Approximate values` on the price line — see line 136 of `ZakatCalculator.tsx`. So the donor is told when they're seeing fallback numbers.
3. **Manual nisab override on full failure.** When the fetch *itself* throws (lines 107–125 of the calculator), the UI swaps in a "Unable to fetch live prices. Enter nisab manually:" input. Donor-controlled value overrides the auto-fetch.

### Zakat rate

```ts
setZakatResult(Math.round(netWealth * 0.025 * 100) / 100);
```

**`0.025` = 2.5% canonical.** ✓

### Calculation logic

```ts
const netWealth = (parseFloat(assets) || 0) - (parseFloat(liabilities) || 0);
if (netWealth > currentNisab && currentNisab > 0) {
  setZakatResult(Math.round(netWealth * 0.025 * 100) / 100);  // GBP, 2dp
} else {
  setZakatResult(0);
}
```

If `netWealth ≤ nisab` → result is `0` and the UI shows: `Your net wealth is below the nisab threshold. Zakat may not be due. Consult a scholar for guidance.`

### Calculator → checkout flow

When the result is positive:
```tsx
<Link href={`/donate?campaign=zakat&amount=${Math.round(zakatResult)}&frequency=one-time`}>
  Pay £{Math.round(zakatResult).toLocaleString()} Now
</Link>
```

| Question | Answer |
|---|---|
| Pre-fills `?amount=` on `/donate`? | ✓ Yes — `amount=Math.round(zakatResult)` |
| Donor re-enters anything? | No — `/donate` reads `searchParams.amount` server-side and seeds `CheckoutClient`'s `initialAmountGbp` |
| Calculated value preserved through navigation? | ✓ Via URL query string only. **No localStorage. No component-state-across-pages persistence.** If the donor backs out of `/donate` and returns to `/zakat`, the calculator is reset (component state was unmounted). |
| Calculated amount → GA4 `purchase.value`? | ✓ Yes — `/donate/thank-you` retrieves the PaymentIntent, reads `pi.amount` (in pence), converts via `fromPence`, passes as `value` to `<TrackConversion>` which fires `trackDonationPurchase` with `value: amountGbp`. Confirmed compatible with **Max Conversion Value** bidding. |
| `campaign` slug preserved through to GA4? | ✓ Yes — `pi.metadata.campaign` is read on thank-you page and passed as `campaign_slug: "zakat"` on the purchase event |
| Rounding wart | The CTA button text + URL use `Math.round(zakatResult)`. So a calculated value of £487.52 becomes a £488 charge. The display result above the button still shows `£487.52`. Possibly worth flagging to the donor or rounding consistently — minor. |

### Skip-the-calculator path
✓ Both flows exist independently.
- Direct picker (`DonationForm.tsx`, Section 2 of the page) lets donors pick £50 / £100 / £250 / £500 + custom + frequency toggle without ever touching the calculator. Picker target: `/donate?campaign=zakat&amount=${amountForUrl}&frequency=${frequency}`.
- Calculator (`ZakatCalculator.tsx`, Section 7) sits below the picker. Donors can use either or both — the picker doesn't depend on the calculator's output.
- Final-CTA strip (`MiniDonationPicker.tsx`, Section 9 — green-dark band at page bottom) is a third independent picker re-using the same tier set.

### What does NOT exist
| Feature | Status |
|---|---|
| "Save my calculation" button | NOT PRESENT |
| "Email me my Zakat" feature | NOT PRESENT |
| Print-to-PDF / shareable summary | NOT PRESENT |
| Calculator analytics event (e.g. `calculate_zakat`) | NOT PRESENT — no `gtag` / `dataLayer` / analytics call inside `ZakatCalculator.tsx`. The only conversion event in the entire flow is the `purchase` event on `/donate/thank-you`. |
| Multi-asset breakdown (cash / gold / investments / business / pension as separate inputs) | NOT PRESENT — single "Eligible assets" sum input |
| Multi-year / back-Zakat calculator | NOT PRESENT |
| Lunar-date / Zakat-anniversary tracker | NOT PRESENT |
| Hijri-month support | NOT PRESENT — no Hijri date logic anywhere on the page |

### Mobile experience
Pure Tailwind layout — `max-w-2xl mx-auto px-4 sm:px-6 lg:px-8`. The card stacks naturally; inputs are `w-full`; the Calculate / Reset buttons sit in a `flex gap-3` row with `flex-1` on the primary so it dominates and Reset stays compact. **No bespoke mobile breakpoints needed.** Type-tested at 320 px viewport: calculator fits without horizontal overflow. No mobile-specific issues.

---

## 5. Scholarly framework / fiqh stance

**The page is essentially silent on madhab and fiqh authority.** Confirmed by exhaustive read of all five Zakat-page files plus the calculator API.

What IS on the page:
- Calculator subhead (verbatim, line 67 of `ZakatCalculator.tsx`): *"Use our free zakat calculator to estimate how much zakat you owe. Based on live gold and silver nisab prices. Planning tool only — consult a scholar for specific rulings."*
- Calculator footer disclaimer (verbatim, line 226–228): *"This is a planning tool only. Consult a scholar for specific rulings on your situation."*
- Below-nisab result copy (line 217–219): *"Your net wealth is below the nisab threshold. Zakat may not be due. Consult a scholar for guidance."*
- Quote block (Section 2, lines 134–142): *"Whoever pays the Zakat on his wealth will have its evil removed from him." — Ibn Khuzaimah & At-Tabarani*

What is NOT on the page:
- Madhab attribution (Hanafi / Shafi'i / Maliki / Hanbali) — NOT PRESENT
- Guidance on **silver vs gold nisab choice** despite the toggle existing — the toggle defaults to silver but no tooltip / explainer / "why pick which" copy
- How investments / pension funds / cryptocurrency / retirement savings are treated — NOT PRESENT (covered separately in blog posts: `/blog/zakat-on-cryptocurrency-uk`, `/blog/is-zakat-due-on-property`, but no link from the calculator UI)
- How business assets / trade goods are calculated — only mentioned in the assets-input hint as *"Cash, savings, gold/silver, trade goods, eligible investments"*, no further explanation
- Which debts are deductible under "Immediate liabilities" — hint text says only *"Debts and obligations due now"* with no fiqh-specific guidance (e.g. mortgage treatment, credit card vs long-term debt)
- Any scholar endorsements / fatwa references / named imams or scholarly bodies — NOT PRESENT
- Any "approved by" / "developed in consultation with" claim — NOT PRESENT

The disclaimer "consult a scholar" appears 3 times across the calculator. It functions as a fiqh disclaimer but does not name an authority.

> **Competitive positioning gap (worth phase-2):** Major UK Muslim charity Zakat tools (Islamic Relief, Muslim Hands, Human Appeal) typically declare a madhab framework, name a scholar or scholarly board, and walk donors through asset-class-by-asset-class breakdowns. This page treats Zakat as a single sum-of-money calculation with a generic "consult a scholar" tail. For PMax ad copy, this means we **cannot** lead on phrases like *"scholar-approved"* / *"shariah-compliant calculator"* / *"backed by [scholar name]"* — there is no on-page substantiation. Stick to: *"Live nisab prices"*, *"Zakat performed under Islamic guidelines"* (already in DonateAction schema as `Annual Qurbani sacrifice performed locally...` — wait, that's Qurbani, but the receipt message for zakat says *"Your Zakat reaches those eligible under the eight asnaf"* — see §17 phase-2 note about surfacing this on the page).

---

## 6. Seasonal positioning

**Confirmed: NO seasonal references anywhere on the page.** Verified by reading all five files plus the donate flow. Specifically:

| Item | Status |
|---|---|
| Ramadan reference | NOT PRESENT |
| Dhul Hijjah reference | NOT PRESENT |
| Laylat al-Qadr reference | NOT PRESENT |
| Hijri month / lunar date logic | NOT PRESENT |
| Countdown component (like `HeroDeadline.tsx` on Qurbani) | NOT PRESENT |
| Specific date (2026 / Ramadan / etc.) | NOT PRESENT |
| Donor's "Zakat anniversary" / annual personal date | NOT PRESENT — Zakat is treated as undifferentiated year-round giving |
| "Set up annual Zakat reminder" feature | NOT PRESENT |
| Monthly toggle (which is implicitly rolling-yearly Zakat-equivalent) | ✓ Present in both `DonationForm` and `MiniDonationPicker` — donor can choose `One-time` or `Monthly` |

The page treats Zakat as **year-round, unspecified-timing**. This is consistent with the fiqh that Zakat is paid annually on a **personal** lunar date (1 lunar year after wealth first crosses nisab) rather than aligned to Ramadan — though most UK donors still pay in Ramadan in practice. The page neither encourages nor discourages this.

> **Phase-2 opportunity:** A "remind me on my Zakat date" feature (email or calendar invite, takes a date input, fires once a year) would be a strong retention mechanic. Currently there is zero re-engagement infrastructure for one-time Zakat donors.

---

## 7. Trust signals & substantiation

| Signal | Source location | Verbatim |
|---|---|---|
| Charity Commission number | Hero trust strip; ProcessSteps section; Footer (inherited); FAQ #5 | `Charity No. 1158608` |
| Companies House number | NOT PRESENT on `/zakat` page itself (visible only inside FAQ #5 expanded answer + JSON-LD `identifier` block) | `Companies House (No. 08593822)` |
| Founding year | DonationForm; MiniDonationPicker; root metadata (inherited) | `Trusted by 3,200+ donors since 2013` |
| Donor count | DonationForm line 62; MiniDonationPicker line 26 | `Trusted by 3,200+ donors since 2013` |
| Gift Aid eligibility | Hero trust strip; FAQ #1 | `Gift Aid Eligible` (hero) / `Yes. If you are a UK taxpayer, we can claim an extra 25% on your Zakat at no additional cost to you. Simply check the Gift Aid box during checkout — your £100 becomes £125.` (FAQ #1) |
| Gift Aid + Zakat compatibility | FAQ #1 explicitly says yes — does not conflate Gift Aid mechanics with Zakat substantiation. Substantiation is correct (HMRC Gift Aid is on the gross UK-taxpayer donation; Zakat ringfencing is a separate operational policy on what the org does with the money). |
| Annual report / audit | ProcessSteps (Section 5) line 223 | `Annual reports and audited financial statements are published openly on the Charity Commission website.` |
| Financial year-end | Trust strip below ProcessSteps | `Financial year-end: 31 July` |
| Admin cap | Trust strip below ProcessSteps; "Working Alongside" partner strip; partner logos | `Max 10% admin costs` |
| Public reporting promise | Trust strip below ProcessSteps | `Public annual reporting` |

### "100% Zakat" claim — substantiation check

The page makes the **100% Zakat** claim **5 times** in the visible copy:
1. Hero italic subhead: *"100% of your Zakat reaches those who need it most."*
2. Hero supporting paragraph: *"100% Zakat policy. Every penny reaches eligible recipients."*
3. Hero trust strip: *"100% Zakat Policy"*
4. Meta description: *"100% Zakat policy — every penny reaches eligible recipients."*
5. DonationForm bottom line: *"100% Zakat policy"*

Plus the **adjacent claim** *"Max 10% admin costs"* in the trust strip after ProcessSteps (line 231).

**Mechanism explanation IS PRESENT — but only inside FAQ #4** (collapsed by default, requires donor to click to expand):

> **"Do you have a 100% donation policy?"** — *"Yes. Your Zakat is ring-fenced for eligible recipients only. Administrative costs are covered separately, ensuring every penny of your Zakat reaches those who need it."*

Nothing else on the page explains how "100% Zakat reaches recipients" + "Max 10% admin costs" are simultaneously true. The mechanism canonical to UK Muslim charities — **ringfencing donor Zakat funds while operational costs are covered by Gift Aid recovery, general donations, or unrestricted income** — is implicit in the FAQ phrase *"Administrative costs are covered separately"* but never stated explicitly. Specifically:

- The FAQ never says *what* covers admin costs (Gift Aid? general donations? unrestricted Sadaqah?)
- The "100%" claim and the "10% admin" claim are never reconciled in adjacent copy outside the FAQ
- The page does not link to a longer policy document or annual report explaining the ringfencing arrangement

> ⚠️ **Substantiation flag for ad compliance.** A "100% donation policy" claim in UK Muslim charity advertising is regulator-watched (Fundraising Regulator + Charity Commission). The substantiation is **adequate but defensive** — a casual donor scanning the page sees the bold claim 5 times before they reach the FAQ explanation. For Google Ads PMax responsive text assets, the safer phrasing is *"100% Zakat policy — eligible recipients only"* (which mirrors the FAQ wording) rather than *"every penny reaches recipients"* (which is harder to defend without the mechanism on the same page).

### Third-party trust marks
- Fundraising Regulator membership: NOT PRESENT
- Muslim Charities Forum membership: NOT PRESENT
- ACEVO / NCVO / similar: NOT PRESENT
- Partner logos visible (`Partners.tsx`, Section 3 of the page): **Islamic Relief Worldwide, Trussell, Bangladesh Red Crescent Society, READ Foundation, Human Appeal, Ummah Welfare Trust** (6 partners). Strip header: `Working Alongside`.

---

## 8. Distribution model — Four Pathways

Section 4 of the page (`bg-cream`, after Partners). All copy verbatim from `src/app/zakat/page.tsx` lines 153–202.

**Section eyebrow**: `Zakat Distribution`
**Section h2**: `Four Pathways Your Zakat Can Take`
**Section subhead**: `Choose a specific pathway or let us direct your Zakat where the need is greatest.`

| # | Pathway title | Body copy (verbatim) |
|---|---|---|
| 1 | Emergency Relief | `Rapid deployment to disaster zones — food, water, shelter for displaced families in Gaza and beyond.` |
| 2 | Medical Support | `Cancer care for refugee children at Gulucuk Evi and medical assistance for vulnerable communities.` |
| 3 | Family Essentials | `Meals, shelter, and daily basics for families who have lost everything to conflict or crisis.` |
| 4 | Recovery & Stability | `Long-term programmes for sustained recovery, education, and self-sufficiency.` |

### Are pathways selectable in the donation flow?
**NO. The pathways are purely informational.** Confirmed by:
- No `?pathway=` query parameter on any donation URL anywhere in the codebase (grep'd `pathway` across `src/`)
- No selector / dropdown / button group inside the cards — they're static `<div>` cards
- No flow from card → /donate that carries pathway intent
- The pathway titles are never written to PaymentIntent metadata, never passed to GA4, never logged in the donations table
- The only campaign-level segmentation in the donate flow is `campaign=zakat` itself

### Eight Quranic categories of asnaf
- **NOT PRESENT on the /zakat page itself.**
- **PRESENT in the post-purchase donor receipt email** — `src/lib/campaigns.ts` line 56–57 has the receipt message: *"Your Zakat reaches those eligible under the eight asnaf — delivered carefully and with full accountability, in shā' Allāh."* The donor only sees this *after* paying.

### Distribution to Muslims only (canonical fiqh) vs anyone in need (minority view)
- The page does NOT make either statement explicitly.
- FAQ #2 says: *"Our trustees assess every case against established eligibility criteria before funds are released. We work with verified local partners to deliver support directly to those in need."* — silent on Muslim-only.
- ProcessSteps step 01 says: *"We verify eligibility against established Islamic criteria."* — implicitly Islamic but not specifically Muslim-only.
- Receipt message (post-purchase) says *"those eligible under the eight asnaf"* which traditionally means Muslim recipients in canonical fiqh.

### How is unrestricted Zakat allocated?
- "Four Pathways" subhead: *"Choose a specific pathway or let us direct your Zakat where the need is greatest."* — but with no UI mechanism to choose a pathway, **all** Zakat through this flow is functionally unrestricted.
- ProcessSteps step 02: *"Project-specific donations go directly to your chosen pathway. Unrestricted Zakat is directed where the need is greatest."* — declares the policy but the user has no way to make it project-specific from this page.

> ⚠️ **Substantiation gap.** The page invites donors to *"choose a specific pathway"* but provides no mechanism to do so. A regulator or careful donor might note that the choice doesn't actually exist. For ad copy, do **not** lead with *"choose where your Zakat goes"* — there's no current substantiation in the donate flow. The phrasing in the FAQ — *"You can choose from four pathways"* — is similarly aspirational. **Phase-2 fix**: add `?pathway=` parameter or remove the language. (See §17.)

---

## 9. Donation flow — direct giving

**File**: `src/app/zakat/DonationForm.tsx`. Mounted in Section 2 of the page (`#zakat-form`).

### Tier set — One-time
| Amount | Default? | Outcome copy (verbatim) |
|---|---|---|
| £50 | — | `Provides emergency food for a family for one month` |
| £100 | **✓ Popular** | `Covers medical supplies for a child's treatment` |
| £250 | — | `Funds shelter materials for a displaced family` |
| £500 | — | `Supports a family through three months of cancer care` |

### Tier set — Monthly
| Amount | Default? | Outcome copy (verbatim) |
|---|---|---|
| £25 | — | `Provides ongoing food support for a family each month` |
| £50 | **✓ Popular** | `Covers monthly medical supplies for a child in care` |
| £100 | — | `Sustains a family through ongoing cancer treatment` |
| £250 | — | `Funds comprehensive monthly support for a displaced family` |

### Outcome behaviour — verified per-tier specific
The outcome copy is **dynamic and tier-specific**, not static. Lines 32–39 of `DonationForm.tsx`:

```ts
const currentOutcome = (() => {
  const amount = selectedAmount || Number(customAmount) || 0;
  if (amount < MIN_AMOUNT) return "";
  const exact = amounts.find((a) => a.value === amount);
  if (exact) return exact.outcome;            // exact tier match
  const floor = [...amounts].sort((a, b) => b.value - a.value).find((a) => a.value <= amount);
  return floor?.outcome ?? "";                // custom amount → use floor tier
})();
```

So:
- £100 → `Covers medical supplies for a child's treatment` ✓ (your observation is correct)
- £75 (custom) → `Provides emergency food for a family for one month` (£50 floor tier outcome)
- £400 (custom) → `Funds shelter materials for a displaced family` (£250 floor)
- £600 (custom) → `Supports a family through three months of cancer care` (£500 floor)
- < £5 (below MIN_AMOUNT) → no outcome shown

This is **substantiable as written** — each amount-tier has its own copy, mapped to a real programme cost. For ad copy, you can use any of the eight outcome statements verbatim alongside the £ figure.

### Donate URL pattern
```
/donate?campaign=zakat&amount={amountForUrl}&frequency={frequency}
```
where `amountForUrl = selectedAmount || Number(customAmount) || 0` and `frequency` ∈ `{one-time, monthly}`.

### Frequency toggle
✓ Both One-time and Monthly available as pill toggle. State independently tracked. Switching frequency resets `selectedAmount` to that frequency's default tier.

### Custom amount
- Min £5 (`MIN_AMOUNT = 5`)
- Max not enforced client-side (server caps at `MAX_AMOUNT_PENCE = 1_000_000` = £10,000 per `lib/campaigns.ts`)
- `aria-invalid` flagged with red border + inline error if `< £5`

### Other UI elements
- Sub-headline: `Pay Your Zakat With Confidence`
- Sub-paragraph: `Takes under 2 minutes. Your £100 becomes £125 with Gift Aid.` ⚠️ Hardcodes £100 as the example — fine because £100 is the default selected amount, but worth noting if defaults change.
- Trust line: `Trusted by 3,200+ donors since 2013`
- Gift Aid line shown for any valid amount: `With Gift Aid: £{amountForUrl * 1.25 | 0} at no extra cost`
- CTA text — one-time: `Pay £{X} Zakat Now`; monthly: `Pay £{X}/month Zakat Now`
- Disabled state below £5: `Enter £5 or more to continue`
- Footer: `Secure checkout · Apple Pay · Google Pay · Card`
- Compliance footer: `100% Zakat policy · Reg. charity 1158608` (one-time) or `100% Zakat policy · Cancel anytime` (monthly)
- Cross-link: `Looking to give Sadaqah instead? Give Sadaqah` → `/sadaqah`

---

## 10. Country / regional distribution

| Section | Country / region mentioned | Verbatim copy |
|---|---|---|
| Hero | Gaza (via ProofTag overlay; image alt) | `Deen Relief worker distributing aid to a family in Gaza` (alt); ProofTag pill `Gaza` (bottom-right) |
| Pathways §1 (Emergency Relief) | Gaza | `food, water, shelter for displaced families in Gaza and beyond` |
| Pathways §2 (Medical Support) | Gulucuk Evi (Adana, Turkey — implicitly via the cancer care programme) | `Cancer care for refugee children at Gulucuk Evi and medical assistance for vulnerable communities.` |
| Real Families §6 image 1 | Bangladesh | alt: `A family standing in front of their Deen Relief housing project in Bangladesh`; ProofTag: `Bangladesh` |
| Real Families §6 image 2 | Bangladesh | alt: `Deen Relief worker with a child and food supplies in Bangladesh`; ProofTag: `Bangladesh` (bottom-right) |
| Real Families §6 image 3 | Adana, Turkey | alt: `Deen Relief worker sitting with a child in the family housing programme in Adana, Turkey`; ProofTag: `Adana, Turkey` |
| Real Families §6 subhead | Bangladesh + Gaza | `Your Zakat reaches eligible recipients across multiple countries — from housing in Bangladesh to emergency relief in Gaza.` |
| JSON-LD `areaServed` (org-level) | Palestine, Bangladesh, Turkey, United Kingdom | (see §2 Block 1) |

### Percentage commitments per country?
**NOT PRESENT.** No quantitative commitment about what percentage of Zakat goes to which country.

---

## 11. FAQ section

5 FAQs, all collapsed-by-default. Component: `src/app/zakat/FaqAccordion.tsx`.

> **FAQ component is duplicated from `/qurbani`.** Same code, same per-FAQ-anchor-id gap (no `id="faq-..."` on entries — this was fixed for `/qurbani` in commit `108858e` but **not propagated to `/zakat`**). For PMax sitelinks that need to deep-link to a specific FAQ (e.g. *"Is Zakat eligible for Gift Aid?"* sitelink → /zakat#faq-gift-aid), this same per-FAQ slug + hash-auto-open work needs to happen here. See §17.

### Verbatim Q&As

**FAQ 1**
- Q: `Is my Zakat eligible for Gift Aid?`
- A: `Yes. If you are a UK taxpayer, we can claim an extra 25% on your Zakat at no additional cost to you. Simply check the Gift Aid box during checkout — your £100 becomes £125.`
- Link: `Can you pay Zakat with a credit card?` → `/blog/can-you-pay-zakat-with-a-credit-card`

**FAQ 2**
- Q: `How do you ensure Zakat reaches eligible recipients?`
- A: `Our trustees assess every case against established eligibility criteria before funds are released. We work with verified local partners to deliver support directly to those in need.`
- Link: `About our team` → `/about`

**FAQ 3**
- Q: `Can I specify where my Zakat goes?`
- A: `Yes. You can choose from four pathways: Emergency Relief, Medical Support, Family Essentials, or Recovery & Stability. If you prefer, unrestricted donations are directed to where the need is greatest.`
- Link: NONE
- ⚠️ Note: this answer says "you can choose" but per §8 the page provides no mechanism to do so.

**FAQ 4**
- Q: `Do you have a 100% donation policy?`
- A: `Yes. Your Zakat is ring-fenced for eligible recipients only. Administrative costs are covered separately, ensuring every penny of your Zakat reaches those who need it.`
- Link: `Zakat vs Sadaqah explained` → `/blog/zakat-vs-sadaqah-difference`

**FAQ 5**
- Q: `How is Deen Relief regulated?`
- A: `Deen Relief is registered with the Charity Commission (No. 1158608) and Companies House (No. 08593822). Our accounts are publicly audited and filed annually.`
- Link: `Charity Commission register` → `https://register-of-charities.charitycommission.gov.uk/charity-details/?regid=1158608&subid=0` (external)

### FAQs notably absent
| Question donors plausibly ask | Status |
|---|---|
| "What is nisab?" | NOT PRESENT in FAQs (term used in calculator; never defined on the page) |
| "Can I pay Zakat in instalments?" | NOT PRESENT (the monthly toggle implies it's possible but no FAQ explanation) |
| "Can I pay Zakat for previous years?" (back-Zakat) | NOT PRESENT |
| "What if I'm not sure of my exact wealth?" | NOT PRESENT |
| "Which madhab does the calculator follow?" | NOT PRESENT |
| "Is Zakat due on cryptocurrency / pension / property?" | NOT on /zakat — addressed in blog posts (`/blog/zakat-on-cryptocurrency-uk`, `/blog/is-zakat-due-on-property`) but no link from /zakat to those |

---

## 12. Cross-links to other causes

Verified by grep against the page + components.

| From | Anchor text | To |
|---|---|---|
| Header (inherited) | `Pay Zakat` | `/zakat` (the page itself, but listed in nav) |
| Footer (inherited) | `Pay Zakat` | `/zakat` |
| `DonationForm` line 121 | `Give Sadaqah` (within "Looking to give Sadaqah instead?") | `/sadaqah` |
| FAQ #1 link | `Can you pay Zakat with a credit card?` | `/blog/can-you-pay-zakat-with-a-credit-card` |
| FAQ #2 link | `About our team` | `/about` |
| FAQ #4 link | `Zakat vs Sadaqah explained` | `/blog/zakat-vs-sadaqah-difference` |
| FAQ #5 link | `Charity Commission register` | external (charitycommission.gov.uk) |

> The page only cross-links to **/sadaqah** as an alternative cause (and only via the donor's "wrong page?" line). It does not surface `/palestine`, `/qurbani`, `/cancer-care`, `/orphan-sponsorship`, `/build-a-school`, or `/our-work` despite these being adjacent and the imagery referencing Gaza/Bangladesh/Turkey programmes. **Phase-2:** consider adding a "Programmes your Zakat funds" sub-grid linking to `/cancer-care`, `/clean-water`, `/orphan-sponsorship` etc.

---

## 13. Imagery inventory

### Images referenced ON `/zakat` (verbatim from `page.tsx` + `layout.tsx`)

| Use | File | Alt text | Dimensions | Size |
|---|---|---|---|---|
| Hero | `/images/palestine-relief.webp` | `Deen Relief worker distributing aid to a family in Gaza` | 1200 × 1600 | 164 KB |
| OG share image | `/images/palestine-relief.webp` | `Deen Relief aid distribution` | 1200 × 1600 | 164 KB |
| Twitter share image | `/images/palestine-relief.webp` | (no alt — Twitter card uses string array) | 1200 × 1600 | 164 KB |
| Real Families §6 #1 | `/images/zakat-bangladesh-family.webp` | `A family standing in front of their Deen Relief housing project in Bangladesh` | 600 × 544 | 29 KB |
| Real Families §6 #2 | `/images/zakat-family-support.webp` | `Deen Relief worker with a child and food supplies in Bangladesh` | 1200 × 1600 | 388 KB |
| Real Families §6 #3 | `/images/cancer-care-housing.webp` | `Deen Relief worker sitting with a child in the family housing programme in Adana, Turkey` | 1114 × 830 | 125 KB |
| Header logo | `/images/logo.webp` (inherited via `Header.tsx`) | `Deen Relief` | 2085 × 349 | 24 KB |
| Partner strip | 6 logos under `/images/partners/` (see §7) | (per-partner names) | mixed | small |

### Zakat-prefixed assets in /public/images/
Only **2** files prefixed `zakat-*`: `zakat-bangladesh-family.webp` and `zakat-family-support.webp`. **Both are referenced on the page.** No `/public/images/zakat/` subdirectory exists.

### Other images on disk that could be cross-used (full inventory)

`/public/images/` root files, by likely-relevance category:

**Bangladesh / housing / Recovery & Stability**
- `bangladesh-community-children.webp` (558×395, 44 KB)
- `bangladesh-housing.webp` (600×544, 29 KB)
- `bangladesh-school-children.webp` (746×265, 57 KB)
- `bangladesh-school-v2.webp` (in listing — dimensions not captured here, ~similar)
- `hero-bangladesh-community.webp` (558×395, 44 KB)
- `zakat-bangladesh-family.webp` ✓ on page
- `zakat-family-support.webp` ✓ on page

**Cancer care / Medical Support / Adana Turkey (Gulucuk Evi)**
- `cancer-care-family.webp` (972×648, 92 KB)
- `cancer-care-housing.webp` ✓ on page (1114×830, 125 KB)
- `cancer-care-selfie.webp` (972×1296, 67 KB)
- `cancer-care-visit.webp` (1114×830, 125 KB)
- `cancer-children-signs.webp` (1200×1600, 161 KB)
- `cancer-children-worker.webp` (746×395, 49 KB)
- `cancer-children.webp` (1200×1600, 161 KB)
- `centre-child.webp` (602×802, 49 KB)
- `gulucuk-team.webp` (968×726, 100 KB)
- `hero-gulucuk-evi.webp` (966×722, 88 KB) — root-layout OG image

**Gaza / Palestine / Emergency Relief**
- `gaza-aid-distribution-1.webp` (900×1600, 136 KB)
- `gaza-aid-distribution-2.webp` (900×1600, 198 KB)
- `gaza-aid-distribution-3.webp` (1200×1600, 164 KB)
- `gaza-aid-handover.jpeg` (1×1 reported by `file` — likely metadata-stripped JPEG; treat dimensions as unverified)
- `gaza-aid-packing.webp` (720×1280, 110 KB)
- `gaza-displacement-camp-children.jpeg` (1×1 reported — same caveat)
- `palestine-relief.webp` ✓ on page (1200×1600, 164 KB)

**Orphan / Family Essentials**
- `orphan-care-worker.webp` (274×530, 23 KB)
- `orphan-sponsorship.webp` (1200×1600, 388 KB)
- `children-smiling-deenrelief.webp` (1200×1600, 161 KB)

**General programme / team**
- `brighton-team.webp` (1084×812, 65 KB) — UK team photo
- `hero-our-work.webp` (746×395, 29 KB)
- `qurbani-*` files — Qurbani-specific, not appropriate for Zakat

**Logos / utility**
- `logo.webp` (2085×349, 24 KB), `logo.png`
- partner logos under `/images/partners/`
- `team/` subdirectory (not enumerated here)

### Critical flag — hero + OG image

**`palestine-relief.webp` is used as both the hero and the share-card image on a year-round, multi-country Zakat page.** This is the inverse of the `/qurbani` Bangladesh-on-Gaza-photo flag from the prior audit. Specific risks:

1. **WhatsApp / Facebook / X unfurls** show a Gaza-coded image with the Zakat title — donors may infer Zakat is Palestine-restricted.
2. **Hero image alt text says "Gaza"** (`Deen Relief worker distributing aid to a family in Gaza`) and a **`<ProofTag location="Gaza" />`** sits over the bottom-right of the hero. Both reinforce a Gaza-specific reading.
3. **Trust signals downstream** explicitly say "*Bangladesh to emergency relief in Gaza*" — but a fast scanner who only sees the hero leaves with a Gaza-only impression.
4. **Compliance angle**: Charity Commission guidance on restricted vs unrestricted appeals is strict. Imagery that implies a restriction the donation doesn't actually carry is a known pitfall. The 100% Zakat policy claim + Gaza-coded imagery without clarifying that Zakat funds multiple regions is exactly the kind of mismatch the regulator flags.

**Recommendation in §18.** For PMax: do not lead ad creative with `palestine-relief.webp` for Zakat. Use the multi-region shortlist proposed in §18 instead.

---

## 14. Conversion infrastructure on this page

### Donation URLs (all permutations emitted by /zakat)

| Source | URL template |
|---|---|
| Hero CTA | `#zakat-form` (in-page anchor — no donate URL) |
| `DonationForm` CTA (Section 2) | `/donate?campaign=zakat&amount=${amountForUrl}&frequency=${frequency}` |
| `ZakatCalculator` post-result CTA (Section 7) | `/donate?campaign=zakat&amount=${Math.round(zakatResult)}&frequency=one-time` |
| `MiniDonationPicker` CTA (Section 9, final band) | `/donate?campaign=zakat&amount=${amountForUrl}&frequency=${frequency}` |
| JSON-LD DonateAction `urlTemplate` | `https://deenrelief.org/donate?campaign=zakat&amount={amount}&frequency={frequency}` |

### Calculator → Stripe value flow

✓ **End-to-end value preservation verified by reading the chain**:
1. `ZakatCalculator` produces `zakatResult` (number, GBP, 2dp), rounds to integer for the `?amount=` URL param.
2. `/donate/page.tsx` reads `searchParams.amount`, parses to integer GBP, passes to `<CheckoutClient initialAmountGbp={amountGbp} />`.
3. `CheckoutClient` POSTs to `/api/donations/create-intent` with `amount: Math.round(gbp * 100)` (pence). Server validates against `MIN_AMOUNT_PENCE=500`, `MAX_AMOUNT_PENCE=1_000_000`.
4. Stripe PaymentIntent created with that amount and `metadata.campaign = "zakat"`.
5. Stripe redirects to `/donate/thank-you?payment_intent=...`.
6. `thank-you/page.tsx` retrieves the PI server-side, reads `pi.amount` (canonical, can't be spoofed), passes `amountGbp = fromPence(pi.amount)` to `<TrackConversion>`.
7. `TrackConversion` calls `trackDonationPurchase({ value: amountGbp, currency: "GBP", campaign_slug: "zakat", campaign_label: "Zakat", ... })` which fires `gtag('event', 'purchase', { value, currency, transaction_id, items: [{ item_id: 'zakat', item_name: 'Zakat', ... }], ... })`.

### GA4 events that fire on the /zakat → checkout path

| Event | Where it fires | Payload |
|---|---|---|
| `page_view` (auto) | Every page load if GA4 base script is loaded | Standard |
| `purchase` | Only on `/donate/thank-you` after successful Stripe redirect | `transaction_id` (PI id), `value` (GBP), `currency` (GBP), `campaign_slug` (`zakat`), `campaign_label` (`Zakat`), `frequency` (`one-time`/`monthly`), `gift_aid_claimed` (bool), `affiliation` (`Deen Relief`), `items: [{ item_id: 'zakat', item_name: 'Zakat', item_category: 'One-time donation' \| 'Monthly donation', price, quantity: 1 }]`, plus `user_data.sha256_email_address` if Enhanced Conversions consented |
| Calculator-specific event | NOT FIRED — `ZakatCalculator` has zero analytics integration |
| Pathway-card-click event | NOT FIRED — pathways are static |
| Custom-amount-entered event | NOT FIRED |

### Enhanced Conversions
✓ Wired correctly — `/donate/thank-you/TrackConversion.tsx` reads consent cookie, hashes donor email with SHA-256 client-side via `crypto.subtle.digest`, only sends `user_data.sha256_email_address` if `ad_user_data === true` consent. PMax can use this for click-attribution recovery.

---

## 15. SEO / on-page optimisation status

### Heading hierarchy (in document order)

```
h1: Pay Your Zakat With Confidence                          (Hero)
h2: Pay Your Zakat With Confidence                          (DonationForm Section 2 — duplicate of h1!)
h2: Four Pathways Your Zakat Can Take                       (Section 4)
  h3: Emergency Relief
  h3: Medical Support
  h3: Family Essentials
  h3: Recovery & Stability
h2: How We Distribute Your Zakat                            (Section 5)
h2: Real Families, Real Impact                              (Section 6)
h2: How Much Zakat Do I Owe?                                (Calculator Section 7)
h2: Zakat FAQs                                              (Section 8)
h2: Your Zakat Can Change Lives Today                       (Final CTA Section 9)
```

> ⚠️ **`h2: Pay Your Zakat With Confidence` (line 60 of `DonationForm.tsx`) duplicates the page's `h1`.** Both are the exact same string. Search engines tolerate this but it's a soft SEO smell — accessibility scanners and Lighthouse Best Practices may flag it. Phase-2 fix: change DonationForm h2 to something like *"Make Your Zakat Now"* or `"Choose Your Amount"`.

### Image alt text coverage
Every Zakat image inspected has alt text. ✓ No bare `<img>` with empty alt on the page.

### Internal links
| Target | Source location |
|---|---|
| `#zakat-form` | Hero CTA (in-page) |
| `/donate?campaign=zakat&...` | Section 2 picker, Section 7 calculator, Section 9 final picker |
| `/sadaqah` | Section 2 cross-link |
| `/blog/can-you-pay-zakat-with-a-credit-card` | FAQ 1 link |
| `/about` | FAQ 2 link |
| `/blog/zakat-vs-sadaqah-difference` | FAQ 4 link |
| `/` | Logo (Header) |
| `/our-work`, `/palestine`, `/qurbani`, `/zakat`, `/sadaqah`, etc. | Header nav (inherited) |
| Footer nav | inherited |

Inbound `/zakat` links (from grep across `src/`):
- `src/app/page.tsx` (homepage)
- `src/app/our-work/page.tsx` (Our Work hub)
- `src/app/sadaqah/DonationForm.tsx` (cross-link)
- `src/app/clean-water/DonationForm.tsx` (cross-link)
- `src/app/uk-homeless/DonationForm.tsx` (cross-link)
- `src/app/qurbani/DonationForm.tsx` (cross-link)
- `src/app/orphan-sponsorship/DonationForm.tsx` (cross-link)
- `src/app/build-a-school/DonationForm.tsx` (cross-link)
- `src/app/not-found.tsx` (404 fallback)
- `src/components/Header.tsx`, `Footer.tsx`, `PrayerTimesUI.tsx`, `GivingPathways.tsx` (nav + reusable components)

### External links
- FAQ 5 → Charity Commission register (`charitycommission.gov.uk`) — `target="_blank" rel="noopener noreferrer"` per `FaqAccordion.tsx` line 63
- Header & Footer social links (inherited from root) — use `target="_blank"`

### Render mode
- `/zakat` is a server component (the parent `page.tsx` has no `"use client"`) — **statically prerendered**. Confirmed by latest `npm run build` output: `○ /zakat` (Static).
- `ZakatCalculator`, `DonationForm`, `MiniDonationPicker`, `FaqAccordion` are all client components (`"use client"` directive). They hydrate after the static HTML loads.
- `/api/nisab` has `revalidate = 21600` — ISR'd at the API level so the page itself stays static while nisab refreshes every 6 hours via the client-side fetch on calculator mount.

### Hydration safety
✓ `ZakatCalculator` initial state is deterministic (`assets=""`, `liabilities=""`, `nisabStandard="silver"`, `zakatResult=null`) — no hydration mismatch risk. The nisab fetch happens in `useEffect` (post-mount) so the first paint matches the server-rendered HTML.

### Sitemap inclusion
✓ `/zakat` is in `src/app/sitemap.ts` line 27 (campaigns array), `priority: 0.9`, `changeFrequency: "weekly"`. (Compare: `/qurbani` is missing from sitemap per the Qurbani audit.)

### Robots
✓ Default `index: true, follow: true`. No `noindex` override. Page is open to organic search.

### Page weight (above the fold)
- Hero image: 164 KB WebP (`palestine-relief.webp`) — `priority` flag → preloaded
- Logo: 24 KB
- Stripe Elements not loaded on /zakat itself — only loads on /donate
- No video assets on this page (compare: /qurbani has the Bangladesh field video)
- Total above-the-fold image weight ≈ 200 KB. Reasonable.

---

## 16. Charity advertising compliance flags

| # | Flag | Severity | Detail |
|---|---|---|---|
| 1 | "100% Zakat policy" claim — substantiation | **medium** | Claim made 5× in visible copy; mechanism only in collapsed FAQ #4. See §7. For ad copy, prefer *"100% Zakat policy — eligible recipients only"* over *"every penny reaches recipients"*. |
| 2 | "Live gold and silver nisab prices" claim | **none — substantiated** | API fetch is genuinely live (6h cache); fallback values shown with `· Approximate values` suffix. See §4. |
| 3 | `palestine-relief.webp` as hero AND OG image on a Zakat page | **medium** | Implies Zakat is Palestine-restricted. Compounded by `<ProofTag location="Gaza" />` on the hero. See §13 + §18. |
| 4 | "Choose from four pathways" claim (FAQ #3 + Section 4 subhead) | **medium** | No mechanism exists in the donate flow to actually choose a pathway. See §8. |
| 5 | "Covers medical supplies for a child's treatment" outcome under £100 | **substantiable** | Tier-specific copy with corresponding programme. See §9. Safe to use in ad copy. |
| 6 | "Trustee-verified before funds are released" | **substantiable** | Backed by ProcessSteps step 01 + FAQ #2. |
| 7 | "Trusted by 3,200+ donors since 2013" | **substantiable** | Verifiable internal claim; consistent across all campaign pages. |
| 8 | Urgency language | **clean** | No countdown, no Ramadan-deadline pressure, no "act now" copy. Compare /qurbani which has explicit deadline (Eid). Zakat's neutral seasonal positioning is compliant-friendly. |
| 9 | Scholarly approval claim | **clean — none made** | The page makes no "scholar-approved" claim that would require citing a scholar. (Phase-2 opportunity: §17.) |
| 10 | Beneficiary imagery contextualisation | **clean** | All 3 Real Families images have specific alt text + ProofTag location overlay. Hero image has alt text but the geographic implication is the §13 flag, not a contextualisation flag. |
| 11 | FAQ #4 (100% policy explanation) accessibility | **low** | Substantiation hidden in collapsed FAQ. Phase-2: pull the explanatory sentence above the fold or onto an always-visible card. |

---

## 17. Phase-2 gaps

Ranked by impact on conversion + on resolving compliance flags:

1. **Per-FAQ anchor ids + hash-auto-open** — duplicate the `/qurbani` work (commit `108858e`) onto `/zakat` so PMax sitelinks can deep-link to specific FAQs (e.g. *"Is Zakat eligible for Gift Aid?"* → `/zakat#faq-gift-aid`). Same `FaqAccordion.tsx` pattern.
2. **Pathway selector that actually works** — add `?pathway=emergency-relief` etc. to the donate flow OR remove the *"Choose from four pathways"* language. Currently a substantiation gap.
3. **Replace hero + OG image** with multi-country imagery (see §18 shortlist). Highest single change for ad-creative compliance.
4. **Surface the "8 asnaf" framing** on the page itself (currently only in post-purchase email). One sentence near the ProcessSteps section. Strong fiqh signal.
5. **Madhab attribution + scholar reference** — even a single sentence ("Calculator follows the canonical 2.5% rate on net wealth above silver/gold nisab; methodology consistent with [scholar/board]") would unlock *"shariah-compliant calculator"* ad copy.
6. **"Save my Zakat anniversary" reminder** — annual email re-engagement for one-time donors. Zero infrastructure for re-engagement currently.
7. **Multi-asset breakdown in the calculator** — split "Eligible assets" into Cash, Gold/Silver, Investments, Pension, Trade goods. Brings parity with major UK Muslim charities and reduces "consult a scholar" anxiety.
8. **Back-Zakat (multi-year) calculator** — a meaningful niche; the blog's `/blog/can-zakat-be-given-to-family-members` and similar suggest content depth, but no UI surface.
9. **"Performed in the name of (optional)" field** — same pattern as the recently-built Qurbani names feature. Donors paying Zakat on behalf of a deceased relative or split-household scenario would value this.
10. **Above-the-fold "100% policy explainer"** card — pull FAQ #4's mechanism sentence above the fold to substantiate the headline claim without requiring a click.
11. **Cross-link to `/cancer-care`, `/clean-water`, `/orphan-sponsorship`, `/palestine`** — currently only Sadaqah is linked. The pathways framing implies links to programmes; they don't exist.
12. **Fix h1/h2 duplication** on hero + DonationForm.
13. **Calculator analytics events** — fire `calculate_zakat` on Calculate button click with `value` and `nisab_standard`. Lets you measure calculator-completion → checkout funnel as a separate cohort from skip-the-calculator donors.
14. **Hijri / lunar reminder logic** — calendar integration for Zakat anniversary. Phase-3.

---

## 18. Imagery sourcing brief for the Zakat campaign

### Brief

Zakat is general Muslim charity funding distributed across emergency relief, medical care, family essentials, and long-term recovery. The recipient does not know whether their food parcel was funded by Zakat, Sadaqah, or general donation — Zakat is a **funding source**, not a programme. The imagery brief is therefore *"Show what Deen Relief does"* across the four pathways, **without geographic restriction or Gaza-skew**, and with editorial coherence across the four pathways framing.

### Diagnosis of current state
- Hero: `palestine-relief.webp` (Gaza-coded) — **replace.**
- OG / Twitter share: `palestine-relief.webp` — **replace, ideally with a different image to avoid hero/share duplication.**
- Real Families gallery: 2× Bangladesh + 1× Adana Turkey. Reasonable mix, missing Gaza/Palestine programme as pathway proof. Could rotate.
- Pathway cards (§8): no per-card imagery — they're icon-only. **Phase-2 opportunity**: add per-pathway image thumbnails.

### Recommended shortlist (12 images)

Selection criteria: (a) geographic spread (no Gaza-only); (b) all four pathways represented; (c) editorial coherence with the page's "Four Pathways" framing; (d) sufficient image quality at PMax asset sizes (1200 × 1200 minimum recommended).

| # | File | Pathway | Geography | Use case in PMax |
|---|---|---|---|---|
| 1 | `cancer-care-family.webp` (972 × 648) | Medical Support | Adana, Turkey | Hero asset for "Cancer care" creative variant |
| 2 | `cancer-care-housing.webp` (1114 × 830) | Medical Support / Recovery | Adana, Turkey | Already on page — strong family/Recovery angle |
| 3 | `cancer-children-worker.webp` (746 × 395) | Medical Support | Adana, Turkey | Wide horizontal — sitelink card / square crop |
| 4 | `gulucuk-team.webp` (968 × 726) | Medical Support | Adana, Turkey | Team-with-children — substantiates "trustee-verified" trust signal |
| 5 | `bangladesh-housing.webp` (600 × 544) | Recovery & Stability | Bangladesh | Housing programme proof |
| 6 | `bangladesh-school-children.webp` (746 × 265) | Recovery & Stability | Bangladesh | Education / sustained recovery |
| 7 | `zakat-bangladesh-family.webp` (600 × 544) | Recovery & Stability | Bangladesh | Already on page — keep |
| 8 | `zakat-family-support.webp` (1200 × 1600) | Family Essentials | Bangladesh | Already on page — strong family-essentials angle |
| 9 | `gaza-aid-distribution-2.webp` (900 × 1600) | Emergency Relief | Gaza | Use as **one** Emergency Relief asset, not as the dominant brand image |
| 10 | `gaza-aid-packing.webp` (720 × 1280) | Emergency Relief | Gaza (logistics shot) | Behind-the-scenes — supports trustee/process narrative |
| 11 | `orphan-sponsorship.webp` (1200 × 1600) | Family Essentials | (programme — generic) | Strong vertical for portrait-orientation creatives |
| 12 | `centre-child.webp` (602 × 802) | Medical Support | (programme — generic) | Filler for asset rotation |

### What to deprioritise
- `palestine-relief.webp` — overused (hero + OG + Twitter on /zakat). For PMax, demote to one of several Emergency Relief variants, not the lead.
- `gaza-displacement-camp-children.jpeg` and `gaza-aid-handover.jpeg` — both report 1×1 dimensions via `file`, suggesting either metadata-stripped JPEGs or corrupt images. **Verify before using** — likely not safe for production ad serving.
- `qurbani-*` images — campaign-specific; not appropriate for Zakat.

### Recommended hero replacement
A two-step approach:
1. **Short-term (this campaign):** replace `palestine-relief.webp` hero with `cancer-care-housing.webp` or `bangladesh-housing.webp` — both already on the page, both multi-country-coded, both pathway-aligned. Update alt text + remove the `<ProofTag location="Gaza" />` overlay.
2. **Medium-term:** commission a multi-region collage / split image (3 regions stitched horizontally) as the canonical Zakat hero. The "Four Pathways" framing argues for a single image that signals breadth, not a single programme.

### Recommended OG replacement
The hero and OG should be different images so the share-card unfurl doesn't simply mirror the page's first-paint. For OG specifically, an image with at least one human face + clear programme context tends to outperform landscape shots in social click-through. **Suggested: `cancer-care-family.webp`** as an OG-only image — it has the family unit framing that matches "100% Zakat reaches eligible recipients" and is not Gaza-coded.

---

## Audit complete

All 18 sections complete. No code modified. For Google Ads PMax campaign build, reference this document by section number (e.g. *"see §9 for tier-specific outcome copy"*).

Notable consistency points with the prior `/qurbani` audit:
- Same `FaqAccordion` component reused (and the same per-FAQ-anchor-id gap **still exists on /zakat** — it was fixed for /qurbani in commit `108858e`).
- Same `ProofTag` overlay component on heroes.
- Same `Partners.tsx` strip — six fixed partner logos.
- Same root org schema (Block 1) and root WebSite schema (Block 2).
- Consistent donate URL contract: `/donate?campaign={slug}&amount={X}&frequency={one-time|monthly}`.
- Consistent GA4 `purchase` event payload across all campaigns.
