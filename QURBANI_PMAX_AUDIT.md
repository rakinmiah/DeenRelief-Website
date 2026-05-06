# /qurbani — Google Ads PMax Source Audit

Audit of `https://deenrelief.org/qurbani` as deployed on commit `46d942c` (post-WordPress cutover, May 2026). All copy is quoted **verbatim** from source. Any field marked **NOT PRESENT** does not exist in source — do not invent it for ad copy.

Sources read:
- `src/app/qurbani/page.tsx`
- `src/app/qurbani/layout.tsx`
- `src/app/qurbani/DonationForm.tsx`
- `src/app/qurbani/MiniDonationPicker.tsx`
- `src/app/qurbani/FaqAccordion.tsx`
- `src/app/qurbani/HeroDeadline.tsx`
- `src/app/layout.tsx` (root)
- `src/lib/donationSchema.ts`
- `src/lib/qurbani.ts`
- `src/components/Partners.tsx`, `ProcessSteps.tsx`, `ProofTag.tsx`, `BreadcrumbSchema.tsx`, `JsonLd.tsx`, `ConsentBootstrap.tsx`
- `src/app/donate/page.tsx`, `donate/thank-you/page.tsx`, `donate/thank-you/TrackConversion.tsx`
- `src/app/sitemap.ts`

---

## 1. Page metadata

| Field | Value |
|---|---|
| Final canonical URL | `https://deenrelief.org/qurbani` |
| `<title>` | `Donate Your Qurbani 2026 \| Deen Relief` |
| Meta description | `Donate your Qurbani from £50 — Bangladesh, India, Pakistan, Syria. Trusted by 3,200+ donors since 2013. Gift Aid eligible. Charity No. 1158608.` |
| OG title | `Donate Your Qurbani 2026 \| Deen Relief` |
| OG description | (same as meta description above, verbatim) |
| OG image URL | `https://deenrelief.org/images/qurbani-hero-v2.jpeg` |
| OG image alt | `A Deen Relief field worker handing a bag of supplies to children sitting outside a UN displacement camp tent` |
| OG site name | `Deen Relief` (inherited from root layout) |
| OG type | `website` (inherited from root) |
| OG locale | `en_GB` (inherited from root) |
| Twitter card | `summary_large_image` |
| Twitter site | `@deenrelief` |
| Twitter title | (same as OG title) |
| Twitter description | (same as OG description) |
| Twitter images | `["/images/qurbani-hero-v2.jpeg"]` |
| Meta robots directive | **`index: false, follow: false`** ⚠️ |
| theme-color | `#2D6A2E` (inherited from root viewport) |
| `<link rel="canonical">` | `/qurbani` (relative; resolves to `https://deenrelief.org/qurbani` via `metadataBase`) |
| `<link rel="alternate">` hreflang | NOT PRESENT |

> ⚠️ **`robots: noindex,nofollow`** is intentionally set in `qurbani/layout.tsx` with the comment: *"Page is reachable for paid traffic but excluded from search until launch. Flip to { index: true, follow: true } once we add it to sitemap + nav."* The page is **also absent from `sitemap.ts`**. **PMax is unaffected** by `noindex` (Google's crawler reads the landing page for ad relevance regardless), but Search Quality scores and organic visibility are zero today. Worth flipping if the campaign is going live.

---

## 2. Structured data (JSON-LD)

The page emits **5 distinct JSON-LD blocks** when rendered, in this order:

### Block 1 — `@type: NGO` (Organization)
Injected from `src/app/layout.tsx` (root) via `<JsonLd data={organizationSchema} />`. Verbatim:

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
    "https://www.facebook.com/DeenRelief",
    "https://www.instagram.com/deenrelief",
    "https://x.com/DeenRelief",
    "https://www.youtube.com/@deenrelief9734",
    "https://www.tiktok.com/@deenrelief"
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
    "Emergency humanitarian aid", "Childhood cancer care", "Orphan sponsorship",
    "Zakat distribution", "Sadaqah and Sadaqah Jariyah", "Clean water projects",
    "Education funding", "Homelessness outreach", "Refugee support"
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

### Block 2 — `@type: WebSite`
Injected from `src/app/layout.tsx` (root). Verbatim:

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

### Block 3 — `@type: WebPage` (with FundraisingEvent + DonateAction)
Injected from `src/app/qurbani/layout.tsx` via `buildDonationPageSchema({ slug: "qurbani", canonicalPath: "/qurbani", pageName, pageDescription, fundraisingName: "Qurbani 2026 — Eid al-Adha Appeal", fundraisingDescription: "Annual Qurbani sacrifice performed locally in Bangladesh, India, Pakistan, and Syria with the meat distributed to families in need.", minPrice: 50 })`. Resolved verbatim:

```json
{
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": "https://deenrelief.org/qurbani#webpage",
  "url": "https://deenrelief.org/qurbani",
  "name": "Donate Your Qurbani 2026 | Deen Relief",
  "description": "Donate your Qurbani from £50 — Bangladesh, India, Pakistan, Syria. Trusted by 3,200+ donors since 2013. Gift Aid eligible. Charity No. 1158608.",
  "dateModified": "<built at deploy time>",
  "inLanguage": "en-GB",
  "isPartOf": { "@type": "WebSite", "name": "Deen Relief", "url": "https://deenrelief.org" },
  "about": {
    "@type": "FundraisingEvent",
    "name": "Qurbani 2026 — Eid al-Adha Appeal",
    "description": "Annual Qurbani sacrifice performed locally in Bangladesh, India, Pakistan, and Syria with the meat distributed to families in need.",
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
    "name": "Donate to Qurbani 2026 — Eid al-Adha Appeal",
    "description": "Annual Qurbani sacrifice performed locally in Bangladesh, India, Pakistan, and Syria with the meat distributed to families in need.",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": "https://deenrelief.org/donate?campaign=qurbani&amount={amount}&frequency={frequency}",
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
    "priceSpecification": { "@type": "PriceSpecification", "priceCurrency": "GBP", "minPrice": 50 }
  }
}
```

### Block 4 — `@type: BreadcrumbList`
Injected from `page.tsx` via `<BreadcrumbSchema items={[{ name: "Qurbani 2026", href: "/qurbani" }]} />`:

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://deenrelief.org" },
    { "@type": "ListItem", "position": 2, "name": "Qurbani 2026", "item": "https://deenrelief.org/qurbani" }
  ]
}
```

### Block 5 — `@type: FAQPage`
Generated from the `faqs` array in `page.tsx` (full Q&A in §11 below).

### Schema presence checklist
- ✅ `DonateAction` — present in **two** places (NGO `potentialAction` and WebPage `potentialAction`)
- ✅ `NGO` / `Organization` — present (uses `NGO` as the most specific subtype; `@id: https://deenrelief.org/#organization`)
- ✅ `Organization` — implied via NGO subtype (NGO extends Organization in schema.org)
- ✅ `FAQPage` — present
- ✅ `BreadcrumbList` — present
- ✅ `FundraisingEvent` — present (nested in WebPage `about`)
- ✅ `WebPage` — present (with `@id: …/qurbani#webpage`)
- ✅ `WebSite` — present (`@id: …/#website`)
- `@id` chains: NGO `#organization` is referenced by FundraisingEvent's `organizer`, DonateAction's `recipient`, and WebSite's `publisher` — clean canonical references throughout.

---

## 3. Hero section

| Element | Value |
|---|---|
| Pre-headline (eyebrow) | `Eid al-Adha 2026` |
| H1 headline | `Donate Your Qurbani 2026` |
| Sub-headline (italic) | `Fulfil the Sunnah of Ibrahim (AS) this Eid.` |
| Supporting paragraph | `Sheep, goat, and cow shares from £50. Performed locally and delivered to families in need.` |
| Hero trust strip | `Charity No. 1158608` · `Gift Aid Eligible` |
| Hero countdown (pre-hydration) | `Order by 23 May 2026` |
| Hero countdown (hydrated) | Label `Order closes in` + live ticker showing **DD HRS MIN SEC** to deadline `2026-05-23T23:59:59+01:00` |
| Hero countdown (post-deadline) | `Final orders being processed` |
| Hero CTA | Button label: `Donate Qurbani Now` — href: `#donate-form` (in-page anchor scroll, not navigation) |
| Hero image src | `/images/qurbani-hero-v3.jpeg` |
| Hero image dimensions | **1200×900** (4:3 landscape JPEG) |
| Hero image alt | `A Deen Relief worker with a Bangladeshi child alongside food parcels of rice and supplies` |
| Hero image style | `fill, object-cover, object-[center_35%]` with two stacked dark gradients (dark navy left-to-right, plus a bottom shadow gradient) |
| Hero ProofTag overlay | Text: `Gaza` (position bottom-right) — ⚠️ **mismatches the alt text which says "Bangladeshi"**; see §16 |

---

## 4. Pricing matrix

The product picker (`DonationForm.tsx`) groups options by country. **All 10 options below feed the same checkout URL pattern: `/donate?campaign=qurbani&amount={amount}&frequency=one-time`.**

| Country | Animal | Price | Donate URL | Per-share outcome copy |
|---|---|---|---|---|
| Bangladesh | Sheep | £50 | `/donate?campaign=qurbani&amount=50&frequency=one-time` | `Your Qurbani sheep — performed in rural Bangladesh, distributed to a family in need.` |
| Bangladesh | Half Cow | £240 | `/donate?campaign=qurbani&amount=240&frequency=one-time` | `Your half cow share — feeds multiple families in rural Bangladesh on Eid.` |
| Bangladesh | Cow | £480 | `/donate?campaign=qurbani&amount=480&frequency=one-time` | `A full cow Qurbani in Bangladesh — meat distributed to up to seven households.` |
| Pakistan | Sheep | £70 | `/donate?campaign=qurbani&amount=70&frequency=one-time` | `Your Qurbani sheep — performed locally in Pakistan, distributed to a family in need.` |
| Pakistan | Half Cow | £240 | `/donate?campaign=qurbani&amount=240&frequency=one-time` | `Your half cow share in Pakistan — feeds multiple families on Eid.` |
| Pakistan | Cow | £480 | `/donate?campaign=qurbani&amount=480&frequency=one-time` | `A full cow Qurbani in Pakistan — meat distributed to up to seven households.` |
| Syria | Sheep | £250 | `/donate?campaign=qurbani&amount=250&frequency=one-time` | `Your Qurbani sheep in Syria — distributed in conflict-affected regions where need is high.` |
| Syria | Half Cow | £650 | `/donate?campaign=qurbani&amount=650&frequency=one-time` | `Your half cow share in Syria — feeds multiple families in conflict-affected areas.` |
| Syria | Cow | £1,300 | `/donate?campaign=qurbani&amount=1300&frequency=one-time` | `A full cow Qurbani in Syria — meat distributed to up to seven households in great need.` |
| India | Goat | £120 | `/donate?campaign=qurbani&amount=120&frequency=one-time` | `Your Qurbani goat — distributed to families through our partners in India.` |

- **Entry-level (lowest) price:** `£50` — Bangladesh sheep
- **Top-tier (highest) price:** `£1,300` — Syria cow
- **"Where most needed" default option:** NOT PRESENT as a labelled choice. The picker's pre-selected default is `bd-sheep` (Bangladesh sheep £50), set via `const DEFAULT_ID = "bd-sheep"`, but it is not framed as "where most needed."

### Adjacent picker copy (verbatim)
- Eyebrow: `Eid al-Adha 2026`
- H2: `Choose Your Qurbani`
- Lead paragraph: `Select your animal and country. Each Qurbani is performed locally and the meat is distributed to families in need.`
- Trust line: `Trusted by 3,200+ donors since 2013 · Order by 23 May 2026`
- Selected-state line (dynamic): `You're paying for: {Animal} — {Country}`
- Gift Aid callout (dynamic per selection): `With Gift Aid: £{amount × 1.25} at no extra cost`
- Primary CTA (dynamic per selection): `Pay £{amount} Qurbani Now`
- Payment-methods microcopy: `Secure checkout · Apple Pay · Google Pay · Card`
- Compliance microcopy: `Performed in accordance with Islamic guidelines · Reg. charity 1158608`
- Cross-link footer: `Paying Zakat or Sadaqah instead? Pay Zakat · Give Sadaqah`

---

## 5. Order deadline / urgency

- **Deadline date (canonical machine-readable):** `2026-05-23T23:59:59+01:00` (Europe/London end-of-day 23 May 2026), defined in `src/lib/qurbani.ts` as the constant `QURBANI_DEADLINE`.
- **Eid al-Adha date as referenced on the page:** NOT PRESENT as an exact date. The page references "Eid al-Adha 2026" / "the days of Eid al-Adha" / "the first day of Eid" but never states the precise calendar date.
- **Verbatim deadline mentions on the page (4 distinct places):**
  1. Hero pre-hydration: `Order by 23 May 2026`
  2. Hero hydrated: `Order closes in` + live `DD HRS MIN SEC` ticker
  3. DonationForm trust line: `Trusted by 3,200+ donors since 2013 · Order by 23 May 2026`
  4. Final CTA H2: `Order Your Qurbani Before 23 May`
  5. FAQ answer: `Orders must be placed by 23 May 2026 to guarantee performance on the first day of Eid. Orders received after this date will be performed on the second or third day of Eid where possible.`
- **Countdown component:** `HeroDeadline.tsx` — renders 4 tabular-numeral cells (Days / Hrs / Min / Sec), updates every 1 second + on tab refocus. Replaced by `Final orders being processed` (amber colour) once deadline passes.
- **Last-chance / scarcity copy beyond the deadline date:** NOT PRESENT. No "only X shares left", no "supply limited", no donation cap.

---

## 6. Religious authority / authenticity copy

### Quranic verses or Hadith (verbatim)
**Hadith block (above the donation panel):**

> "Whoever offers a sacrifice after the (Eid) prayer, has completed his rituals (of Qurbani) and has succeeded in following the way of the Muslims."
> — Bukhari

**Quranic verses:** NOT PRESENT.

**Other Hadith:** NOT PRESENT.

### Compliance / authenticity language (verbatim)
- Hero sub-headline: `Fulfil the Sunnah of Ibrahim (AS) this Eid.`
- DonationForm trust line: `Performed in accordance with Islamic guidelines`
- ProcessSteps step 02: `Slaughter is carried out locally on the days of Eid al-Adha, in accordance with Islamic guidelines.`
- FAQ answer (How does my Qurbani reach families): `Each Qurbani is performed locally in your chosen country during the days of Eid al-Adha, in accordance with Islamic guidelines.`
- "Where Your Qurbani Goes" Pakistan bullet: `Performed in line with local Islamic guidance and distributed locally.`

### Scholar endorsements / fatwa references
NOT PRESENT. No named scholars, no fatwa numbers, no madhhab-specific guidance, no Islamic authority logos.

---

## 7. Trust signals & substantiation

| Signal | Verbatim text on page | Where it appears |
|---|---|---|
| Charity Commission number | `Charity No. 1158608` (also `Reg. charity 1158608`, `Charity Commission (No. 1158608)`) | Hero strip · DonationForm trust line · Trust footer · FAQ answer |
| Companies House number | `Companies House (No. 08593822)` | FAQ answer only (NOT in hero or trust strip) |
| Founding year | `since 2013` | DonationForm trust line · MiniDonationPicker |
| Donor count claim | `Trusted by 3,200+ donors since 2013` | DonationForm · MiniDonationPicker |
| Gift Aid eligibility | `Gift Aid Eligible` (hero); `Gift Aid eligible` (trust footer); `If you are a UK taxpayer, we can claim an extra 25% on your Qurbani at no additional cost to you. Tick the Gift Aid box during checkout — your £50 sheep share becomes worth £62.50 to the families we serve.` (FAQ) | Hero strip · DonationForm dynamic callout · Trust footer · FAQ |
| Audit / annual report | `Audited annual reports published through the Charity Commission. Full transparency, always.` (ProcessSteps step 03); `Audited annually` (trust footer); `Our accounts are publicly audited and filed annually.` (FAQ) | ProcessSteps · Trust footer · FAQ |
| Admin cap / pledge | `100% to relief` | Trust footer only — see §16 compliance flag |
| Third-party trust marks | NOT PRESENT (no Fundraising Regulator badge, no Muslim Charities Forum, no Charity Commission badge image) | — |

### Trust footer strip (verbatim)
After the ProcessSteps section, a single horizontal strip:

> `Charity No. 1158608` | `100% to relief` | `Audited annually` | `Gift Aid eligible`

---

## 8. Partner organisations

Rendered by the `Partners` component in section 3 of the page. The eyebrow label reads:

> `Working Alongside`

| # | Partner name (alt text on logo) | Logo file |
|---|---|---|
| 1 | Islamic Relief Worldwide | `/images/partners/islamic-relief.png` |
| 2 | Trussell | `/images/partners/trussell.svg` |
| 3 | Bangladesh Red Crescent Society | `/images/partners/bangladesh-red-crescent.svg` |
| 4 | READ Foundation | `/images/partners/read-foundation.jpeg` |
| 5 | Human Appeal | `/images/partners/human-appeal.png` |
| 6 | Ummah Welfare Trust | `/images/partners/ummah-welfare-trust.png` |

These are *visual* partner mentions only — there are no per-partner descriptions, no partnership-type qualifiers, and no links from logos to partner sites.

---

## 9. Process / "How it works"

Section eyebrow: `How We Deliver`
Section H2: `From Your Order to a Family on Eid`
Section lead paragraph:

> `Your Qurbani is not just sent — it is performed, delivered, and reported with full transparency.`

### Steps (verbatim from `ProcessSteps`)

| # | Title | Body |
|---|---|---|
| **01** | `We Verify` | `Our field teams identify families in need in each country, prioritising those without regular access to meat.` |
| **02** | `We Perform` | `Slaughter is carried out locally on the days of Eid al-Adha, in accordance with Islamic guidelines.` |
| **03** | `We Report` | `Audited annual reports published through the Charity Commission. Full transparency, always.` |

### Diagram / infographic
NOT PRESENT. The "process" is a typographic 3-step row with circular numbered nodes connected by an animated track that fills as the user scrolls. No illustrations, photos, or icons within the steps.

---

## 10. Country / regional copy

Section eyebrow: `Where Your Qurbani Goes`
Section H2: `Performed Locally, Distributed Locally`
Section lead paragraph:

> `Your Qurbani is performed in the country you choose, on the days of Eid al-Adha, and the meat is delivered hand-to-hand to families known to be in need.`

Then a 4-bullet country list:

### Bangladesh
> **Bangladesh — sheep £50 / cow £480**
> Half cow shares £240. Distributed in rural communities through our long-standing field network.

### India
> **India — goat £120**
> Goat Qurbani delivered to families through our partners in northern India.

### Pakistan
> **Pakistan — sheep £70 / cow £480**
> Half cow shares £240. Performed in line with local Islamic guidance and distributed locally.

### Syria
> **Syria — sheep £250 / cow £1,300**
> Half cow shares £650. Higher cost reflects livestock supply in conflict-affected regions.

---

## 11. FAQ section

7 questions. **All answers are present in source code (server-rendered into the FAQPage JSON-LD), and the visible accordion is a client component (`FaqAccordion`) that toggles open/closed state.** Crawlers see all answers in the schema; users see them on click.

| # | Question (verbatim) | Answer (verbatim) |
|---|---|---|
| 1 | `How does my Qurbani reach families in need?` | `Each Qurbani is performed locally in your chosen country during the days of Eid al-Adha, in accordance with Islamic guidelines. Our field teams and verified partners then distribute the meat to families known to be in need — those who would not otherwise have meat on Eid.` (Inline link: "About our team" → `/about`) |
| 2 | `Is my Qurbani eligible for Gift Aid?` | `Yes. If you are a UK taxpayer, we can claim an extra 25% on your Qurbani at no additional cost to you. Tick the Gift Aid box during checkout — your £50 sheep share becomes worth £62.50 to the families we serve.` |
| 3 | `What is the deadline for ordering?` | `Orders must be placed by 23 May 2026 to guarantee performance on the first day of Eid. Orders received after this date will be performed on the second or third day of Eid where possible.` (Inline link: "Contact us about late orders" → `/contact`) |
| 4 | `Can I split a cow share with my family?` | `Yes. A cow can be shared between up to seven people. Order one share per person — for example, a household of four could order four half-cow shares between two cows. Add each person's name as the donor when prompted at checkout.` |
| 5 | `What animals are eligible, and which countries do you operate in?` | `Sheep and goats count as one share. Cows, buffalo, and camels can be shared between up to seven people. We deliver Qurbani in Bangladesh (sheep £50, cow £480, half cow £240), India (goat £120), Pakistan (sheep £70, cow £480, half cow £240) and Syria (sheep £250, cow £1,300, half cow £650).` |
| 6 | `Can I set up a monthly donation toward next year's Qurbani?` | `Yes. Many donors prefer to spread the cost across the year — £20/month builds toward a goat or half cow Qurbani by next Eid. Set up a monthly donation at any time and cancel whenever you wish.` |
| 7 | `How is Deen Relief regulated?` | `Deen Relief is registered with the Charity Commission (No. 1158608) and Companies House (No. 08593822). Our accounts are publicly audited and filed annually.` (External link: "Charity Commission register" → `https://register-of-charities.charitycommission.gov.uk/charity-details/?regid=1158608&subid=0`) |

---

## 12. Cross-links to other causes

### From DonationForm (footer of the picker):
> `Paying Zakat or Sadaqah instead?` — followed by:
> - `Pay Zakat` → `/zakat` (presented as alternative)
> - `Give Sadaqah` → `/sadaqah` (presented as alternative)

### From FAQ answers:
- FAQ #1 — `About our team` → `/about`
- FAQ #3 — `Contact us about late orders` → `/contact`
- FAQ #7 — `Charity Commission register` → external

### Cross-links NOT PRESENT
- No link to `/palestine`
- No link to `/our-work`
- No link to `/orphan-sponsorship`
- No link to `/cancer-care`
- No link to `/clean-water`
- No link to `/build-a-school`

(Header nav and Footer expose these site-wide, but the page body itself does not surface any campaign cross-links other than Zakat/Sadaqah.)

---

## 13. Imagery inventory

### Images displayed on /qurbani

| # | File | Used at | Alt text (verbatim) | Dimensions | Optimised? | Qurbani-specific? |
|---|---|---|---|---|---|---|
| 1 | `/images/qurbani-hero-v3.jpeg` | Hero background (full-width) | `A Deen Relief worker with a Bangladeshi child alongside food parcels of rice and supplies` | 1200×900 (4:3 JPEG) | `next/image fill priority` | ⚠️ **Mismatched** — alt says Bangladeshi child + rice food parcels, NOT a Qurbani slaughter/meat distribution scene. Repurposed Bangladesh general-relief imagery on a Qurbani page. |
| 2 | `/images/gaza-displacement-camp-children.jpeg` | "Where Your Qurbani Goes" inline — appears **twice** (once mobile-only inline, once desktop-only side image) | `Deen Relief field worker delivering an aid package to children in a Gaza displacement camp` | 900×1600 (9:16 JPEG, portrait) | `next/image fill, sizes` | ⚠️ **Repurposed Gaza/Palestine imagery.** Section copy describes Bangladesh / India / Pakistan / Syria — none of which is Gaza. |
| 3 | Partner logos × 6 | Partners strip | (per §8 above) | Per `<img>` intrinsic dims | Plain `<img>` (deliberate, see Partners.tsx comment for SVG support) | Generic partner logos |

### Hero overlay element
A small text-only `ProofTag` is positioned `bottom-right` on the hero with text **`Gaza`** — this is a visual location stamp that appears on top of the Bangladesh-context hero photo. **This is the most likely-to-be-flagged compliance issue** for paid charity advertising; see §16.

### Images available in the repo but NOT used on /qurbani
Found in `/public/images/`:
- `qurbani-hero-v2.jpeg` (900×900) — used as **OG/Twitter share image only**, not displayed on page
- `qurbani-distribution.jpg` (1200×1600) — **NOT REFERENCED ANYWHERE on /qurbani**. Available for reuse if needed.
- `qurbani-hero.webp` (746×395) — NOT used by /qurbani; per `IMAGE_INVENTORY.md` this is a bit-identical duplicate of the Bangladesh community group photo.

### Per `IMAGE_INVENTORY.md` cross-reference
- There is **no `/public/images/qurbani/` subdirectory**. All Qurbani-prefixed assets live directly in `/public/images/` alongside generic photos.
- `qurbani-hero-v3.jpeg` (the in-use hero) is **not** in any duplicate group — unique file.
- `qurbani-hero-v2.jpeg` (the OG share image) is unique.
- `qurbani-distribution.jpg` is unique and unused — single biggest unused asset on the page (425 KB).

### Captions / contextual framing copy
- Hero: no explicit caption; the visible context is the H1 + sub-headline only.
- "Where Your Qurbani Goes" image: no explicit caption — appears alongside the Bangladesh / India / Pakistan / Syria bullets but with **no caption tying the image to any of those countries**.
- Partner logos: `title` attribute on the wrapper is the partner name (mouseover only).

---

## 14. Conversion infrastructure on this page

### Donation URLs emitted by the page (every link out to `/donate`)

All from `DonationForm.tsx`. **One CTA renders at a time** (the Button's `href` is computed dynamically based on the currently-selected product), but the picker exposes 10 products that each map to one of these URLs:

```
/donate?campaign=qurbani&amount=50&frequency=one-time     (Bangladesh sheep)
/donate?campaign=qurbani&amount=70&frequency=one-time     (Pakistan sheep)
/donate?campaign=qurbani&amount=120&frequency=one-time    (India goat)
/donate?campaign=qurbani&amount=240&frequency=one-time    (Bangladesh/Pakistan half cow)
/donate?campaign=qurbani&amount=250&frequency=one-time    (Syria sheep)
/donate?campaign=qurbani&amount=480&frequency=one-time    (Bangladesh/Pakistan cow)
/donate?campaign=qurbani&amount=650&frequency=one-time    (Syria half cow)
/donate?campaign=qurbani&amount=1300&frequency=one-time   (Syria cow)
```

In-page anchors (not `/donate`):
- Hero CTA `Donate Qurbani Now` → `#donate-form` (scrolls to the picker)
- Final CTA `Choose Your Qurbani` (in MiniDonationPicker) → `#donate-form` (scrolls to picker)

**Frequency:** all CTAs are hardcoded to `frequency=one-time`. There is no monthly toggle on the picker. (FAQ #6 mentions monthly framing as an alternative for "next year's Qurbani" but no monthly path is wired into this page's checkout flow.)

### `/donate` campaign-param handling
`src/app/donate/page.tsx` reads `searchParams`:
- `campaign` — validated via `isValidCampaign` (`qurbani` is a valid slug; falls back to `"general"` if unknown)
- `amount` — parsed as integer; defaults to **£50** if missing/invalid
- `frequency` — `"monthly"` if exactly that, else `"one-time"`

Values are passed to `<CheckoutClient initialCampaign initialAmountGbp initialFrequency />`. Donor can adjust amount inside the form; campaign metadata persists into the Stripe PaymentIntent's `metadata.campaign`.

### `/donate/thank-you` purchase-event flow
- Page reads `payment_intent` (one-time) or `setup_intent` (monthly) from the URL
- Server-side retrieves the intent from Stripe (source of truth — cannot be spoofed by URL manipulation)
- Pulls `campaign`, `campaign_label`, `amount`, `email`, `gift_aid_claimed`, `frequency` from intent metadata + Supabase row
- **Only fires conversion on `status === "succeeded"`** (not processing, not failed)
- Mounts `<TrackConversion>` which calls `trackDonationPurchase()` exactly once per `transaction_id`
- Event payload sent to GA4: `transaction_id`, `value` (in **GBP**), `currency: "GBP"`, `campaign_slug`, `campaign_label`, `frequency`, `gift_aid_claimed`, optional `hashed_email` for Enhanced Conversions (only if `ad_user_data` consent granted)

For Qurbani conversions specifically, `campaign_slug` will be `"qurbani"` and `campaign_label` resolves to `"Qurbani 2026"` (per `src/lib/campaigns.ts`).

### GA4 `page_view` on /qurbani
- GA4 loads only if `NEXT_PUBLIC_GA4_MEASUREMENT_ID` env var is set (currently `G-PTPPW5THWJ` per the production deploy)
- Loaded via `ConsentBootstrap` with Google Consent Mode v2: defaults to **denied** for ad_storage / analytics_storage / ad_user_data / ad_personalization until the cookie banner is acted on
- `gtag('config', '${measurementId}', { anonymize_ip: true })` on page load — this fires the auto-`page_view` event for users who granted consent
- For users who decline analytics, the GA4 script still loads but no events leave the browser (Consent Mode handles the suppression)

### Stripe checkout flow detail
- `/donate?campaign=qurbani&amount=50&frequency=one-time` →
- `CheckoutClient` calls `/api/donations/create-intent` with `automatic_payment_methods: { enabled: true }` →
- Stripe PaymentIntent created with `metadata.campaign = "qurbani"`, `metadata.frequency = "one-time"`, `amount = 5000` (pence) →
- Stripe Elements PaymentElement renders (Card / Apple Pay / Google Pay / Klarna / Revolut Pay / Amazon Pay availability depends on user's browser + Dashboard settings) →
- On success, Stripe redirects to `/donate/thank-you?payment_intent={id}` →
- Server confirms status, fires GA4 `purchase` event via TrackConversion

---

## 15. SEO / on-page optimisation status

### Heading hierarchy (in document order)
- **H1** — `Donate Your Qurbani 2026` (hero)
- **H2** — `Choose Your Qurbani` (DonationForm)
- **H2** — `Performed Locally, Distributed Locally` (Where Your Qurbani Goes)
- **H2** — `From Your Order to a Family on Eid` (Process)
- **H2** — `Common Questions About Qurbani` (FAQ)
- **H2** — `Order Your Qurbani Before 23 May` (Final CTA)
- **H3** × 3 — `We Verify`, `We Perform`, `We Report` (ProcessSteps)

Heading hierarchy is well-formed: one H1, multiple H2s as section heads, H3s only nested inside the Process section.

### Images without alt text
NONE — every `<Image>` and `<img>` on the page has an `alt` attribute set. Decorative SVGs (icons within bullets, the chevron in FAQ accordion, etc.) correctly use `aria-hidden="true"`.

### Internal link count (rendered DOM)
Approximate count from the page-body code (excluding shared Header / Footer nav):
- 1 dynamic CTA → `/donate?campaign=qurbani&amount=…&frequency=one-time`
- 1 → `/zakat`
- 1 → `/sadaqah`
- 1 → `/about` (FAQ link, only when FAQ #1 is open)
- 1 → `/contact` (FAQ link, only when FAQ #3 is open)
- Plus Header nav (~8 links incl. Qurbani itself) and Footer nav (~25 links + 5 social)

### External link count + rel attributes
- 1 → `https://register-of-charities.charitycommission.gov.uk/...` from FAQ — has `target="_blank" rel="noopener noreferrer"` (correct)
- 5 → social profile links from Footer (Facebook, Instagram, X, YouTube, TikTok) — all have `target="_blank" rel="noopener noreferrer"` (correct)

### Rendering mode
- `page.tsx` is a **server component** — statically rendered at build (or per-request SSR if cache-busted)
- Layout is server-rendered too
- Client islands: `DonationForm`, `FaqAccordion`, `HeroDeadline`, `MiniDonationPicker`, `ProcessSteps` — hydrate on the client
- `Partners`, `Footer`, `BreadcrumbSchema`, `JsonLd` are server components (no hydration cost)

### Image optimisation
- ✅ Hero (`qurbani-hero-v3.jpeg`) uses `next/image` with `priority` — eligible for LCP optimisation
- ✅ Gaza-camp inline image uses `next/image` with `sizes`
- ⚠️ Hero JPEG is **1200×900** = 348 KB. WebP conversion would shave ~40%. (See `IMAGE_INVENTORY.md` JPEG-conversion candidates list — `qurbani-hero-v3.jpeg` is on it.)
- ⚠️ OG image (`qurbani-hero-v2.jpeg`) is 900×900 = 196 KB JPEG; non-standard OG aspect ratio (square instead of 1.91:1) → social platforms will subject-crop to landscape. Worth replacing with a 1200×630 export.
- Partner logos use plain `<img>` with explicit width/height (CLS-safe) and `loading="lazy" decoding="async"` — fine.

---

## 16. Charity advertising compliance flags

### 🚩 1. Hero image / ProofTag mismatch
- The hero image's **alt text** says: *"A Deen Relief worker with a Bangladeshi child alongside food parcels of rice and supplies"* — Bangladesh, general aid, NOT a Qurbani-specific scene.
- The visible **`ProofTag` overlay** in the bottom-right corner reads: **`Gaza`**.
- The image content does not depict Qurbani slaughter, meat distribution, or anything Qurbani-specific.

This is potentially flaggable in three ways: (a) using a non-Qurbani image as the visual anchor of a Qurbani fundraising page; (b) labelling a Bangladesh-context image with "Gaza" via the proof tag; (c) ASA / Fundraising Code "must not mislead" in donor-facing imagery.

**Recommendation before campaign launch:** swap the hero to a Qurbani-specific image (livestock, butchering, meat distribution, or post-distribution beneficiary scene) and either remove the ProofTag or set its location to match the actual image content.

### 🚩 2. "Where Your Qurbani Goes" — Gaza imagery alongside Bangladesh/India/Pakistan/Syria copy
The section's image is `gaza-displacement-camp-children.jpeg` with alt text describing Gaza. The section's text describes Bangladesh, India, Pakistan, and Syria — **none of those are Gaza**. There is no caption tying the image to a specific country represented in the section.

A reasonable donor reading the text and seeing the image could be misled into believing Qurbani is delivered to Gaza, which the text does not claim and which is also not currently represented in the picker.

**Recommendation:** swap the image for one of the four countries mentioned in the section, or add a caption explicitly framing the image's relationship to the section copy.

### 🚩 3. "100% to relief" pledge
Verbatim text in the trust footer: `100% to relief`. This is a strong claim regulated by the Fundraising Regulator and ASA — UK best practice requires that "100% to cause" / "100% to relief" claims be substantiated with a clear explanation of how the charity covers operating costs (typically: from Gift Aid, restricted funds, separate admin endowments, or a stated admin cap covered by other income).

The page contains no such explanation. There is no admin-cost statement, no "X% admin / Y% to cause" breakdown, no "operating costs covered by Gift Aid" disclosure.

**Recommendation:** either substantiate the claim with a one-line clarification (e.g., "Operating costs covered by Gift Aid recovery, not your donation"), or soften the language to "Maximum impact to relief" / "All public donations to programmes" while a substantiation page is added.

### 🚩 4. "Trusted by 3,200+ donors since 2013" — verify against actual records
Per the GiveWP exports analysed earlier in this engagement (`give-export-donors-05-06-2026.csv`, ~290 raw rows minus ~15–20 obvious bot signups → ~270 unique real donor records on the WordPress system). The page's claim is **3,200+ donors**.

Possible explanations for the gap:
- Includes pre-2021 donors from a prior platform (the WP DB only goes back to Sept 2021)
- Counts mailing-list signups / newsletter subscribers as "donors"
- Counts repeat donations as separate "donors"
- Includes giftaid-eligible donations counted by transaction not unique person
- Inflated pre-launch figure that needs verification

**Recommendation:** confirm with trustees what the 3,200+ figure represents (donations? donors? subscribers?) before going live with paid traffic. ASA Code 3.1 ("must not mislead") and Fundraising Code 1.1 (truthful messaging) both apply. If the figure can't be substantiated, substitute with a verifiable claim ("Trusted by hundreds of donors since 2013" / "Established 2013").

### 🚩 5. Country-specific imagery for India, Pakistan, Syria
The pricing matrix and country bullets list four countries. Only Bangladesh and Gaza imagery actually appear on the page. India / Pakistan / Syria have no associated imagery, so all four country pricing options visually anchor to non-matching photos.

This isn't strictly a compliance breach but is a substantiation/credibility weakness that paid traffic will spot.

### 🟡 Items checked and found acceptable
- **Urgency language** — the deadline countdown is anchored to a real Eid al-Adha 2026 cutoff (23 May). Not manipulative.
- **Beneficiary imagery** — children prominent in both photos, but with contextualising alt text. Not pity-coded by typical Fundraising Code thresholds (no scarcity / suffering close-ups).
- **Religious authenticity language** — appropriately framed ("in accordance with Islamic guidelines"), no overclaim of scholar approval.
- **Charity registration display** — Charity No. and Companies House No. both correctly displayed.
- **Gift Aid claim** — accurately described (25% top-up only valid for UK taxpayers, donor must declare). FAQ explains the eligibility correctly.
- **Subscription / monthly** — FAQ #6 mentions monthly donation as an alternative; not surfaced as a Qurbani-specific option, which avoids confusion.

---

## 17. Phase-2 gaps — what's missing that would help paid conversion

### Strongest candidates for phase-2 work (ordered by likely uplift)
1. **Country-specific imagery for India, Pakistan, Syria.** Currently the pricing offers four countries but visually anchors only to Bangladesh / Gaza imagery. Donors choosing Syria £250 sheep see no Syria photo; that's an avoidable conversion friction.
2. **Specific "X families served last Eid" beneficiary count.** Page makes "trusted by 3,200+ donors" claim but no impact-side number ("Last year your Qurbani fed N families across 4 countries"). Impact framing converts better than donor-count framing for new acquisition.
3. **Real Qurbani imagery in the hero.** Current hero is a generic Bangladesh aid scene. PMax visual-asset selection will pick the hero as a brand image; it doesn't read as Qurbani at a glance.
4. **"Where Most Needed" option in the picker.** A "let us send your Qurbani where the need is greatest" option converts decision-paralysis donors faster. Default would still be Bangladesh sheep £50 but the explicit "where most needed" framing reduces friction for first-time donors.
5. **Cow-share co-donor flow.** FAQ #4 explains that 1 cow = 7 shares but the picker offers "Cow £480" as an all-or-nothing purchase. Surface a "Buy 1 of 7 shares = £69" option in the picker so households can split formally without a "household of four ordering four half-cow shares between two cows" workaround.
6. **Recent-donor ticker / social proof.** No "Khizar from Brighton just gave a Bangladesh sheep — 2 minutes ago" component. Common in high-converting Qurbani campaigns from competing charities.
7. **Eid date countdown component.** The order-deadline ticker shows time-to-23-May. There is no "Eid al-Adha is in N days" component — distinct from the order deadline and a different urgency frame.
8. **Video testimonial.** No video on the page. Field-team explainer or beneficiary thank-you converts well in PMax video assets.
9. **Scholar / fatwa endorsement.** No named scholar endorsing the Qurbani process. Competitors typically have at least one referenced scholar or madhhab note. Reduces friction for traditionalist donors.
10. **"What if my country isn't listed?" FAQ.** Common search; not addressed.
11. **Per-country imagery galleries.** A small 2–3 image strip under each country bullet would let the page substantiate "we operate here" beyond just the price.
12. **Cumulative Gift Aid claimed for Qurbani specifically.** "Your Qurbani has helped us reclaim £X in Gift Aid since 2013" — concrete substantiation of the audit claim, not just a stated pledge.
13. **Repeat-donor recognition.** No "this is your second Qurbani with us" flow. Returning donors are 3–5× more valuable than new acquisitions; a small acknowledgement (with email-keyed personalisation) would lift LTV.
14. **Monthly-toward-next-Eid CTA on this page.** FAQ #6 acknowledges this option but the picker doesn't expose it. A "save monthly toward Qurbani 2027" toggle could capture donors who arrive too late or who want to spread cost.
15. **Print-friendly / offline contact route.** No "donate by phone" alternative shown on the page (despite Charity having a published number `+44-300-365-8899`). For a Qurbani audience that skews older, a phone-donation path can convert paid traffic that won't complete the Stripe form.

### Pre-launch SEO/index hygiene (non-conversion but blocks PMax landing-page Quality Score upside)
- Currently `robots: noindex, nofollow` — flip to `index: true, follow: true`
- Currently absent from `sitemap.ts` `campaigns` array — add `"qurbani"` so it's discoverable
- Add `/qurbani` to the homepage `CampaignsGrid` if not already present (audit didn't check homepage; verify separately)

---

*End of audit. Generated 2026-05-06 against deployed commit `46d942c`. Re-audit before each major page change so PMax campaign assets stay in sync with the page they advertise.*
