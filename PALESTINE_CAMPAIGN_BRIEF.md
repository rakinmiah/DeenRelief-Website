# Palestine Campaign — Page & Asset Audit for Google Ads Rebuild

**Audit target:** `/palestine` page at `https://deenrelief.org/palestine`
**Source code:** `src/app/palestine/{page.tsx,layout.tsx,DonationForm.tsx,FaqAccordion.tsx,MiniDonationPicker.tsx}`
**Audit date:** 2026-05-04
**Purpose:** Source material for Palestine PMax / Search campaign relaunch with cleaner conversion tracking.

---

## Section 1 — Page content inventory

### 1.1 Hero block (verbatim)

| Element | Copy |
|---|---|
| Eyebrow (uppercase, amber) | `Palestine Emergency Appeal` |
| H1 (white, serif bold) | `Donate to Gaza Emergency Relief` |
| Sub-headline (italic serif, white/90) | `A family in Gaza needs you right now.` |
| Supporting paragraph | `Displaced families urgently need food, clean water, medical supplies, and shelter. Your donation is delivered directly by our teams on the ground.` |
| Trust strip (in-hero, micro) | `Charity No. 1158608 · 100% pledge on emergency relief · Gift Aid Eligible` |
| Hero CTA button (desktop only) | `Help a Family Now` (anchors to `#donate-form`) |
| ProofTag overlay | `Gaza` (no date, bottom-right position) |

> **Comment in code:** "Keyword-matched H1 for ad Quality Score — scanned by Google Ads" — H1 was deliberately rewritten from an emotional headline to a keyword-bearing one. The italic serif sub-head preserves the emotional pull.

### 1.2 H2 section headings in document order

| # | Section | H2 (verbatim) | Eyebrow |
|---|---|---|---|
| 1 | Hero (donation form, mobile only inline) | `Help a Family Survive Today` | `Urgent Appeal` |
| 2 | Donation panel (desktop) | `Help a Family Survive Today` (same component) | `Urgent Appeal` |
| 3 | Where Your Donation Goes | `Direct Relief for Families in Gaza` | `Where Your Donation Goes` |
| 4 | Field Evidence | `We Don't Send Aid From a Distance` | `On the Ground` |
| 5 | Delivery Assurance | `From Your Donation to a Family in Gaza` | `How We Deliver` |
| 6 | FAQ | `Common Questions About Palestine Relief` | `Common Questions` |
| 7 | Final CTA (mini donation picker) | `A Family in Gaza Needs Your Help Today` | — |

### 1.3 Donation form — headline + sub-copy

| Element | Copy |
|---|---|
| Eyebrow | `Urgent Appeal` |
| H2 | `Help a Family Survive Today` |
| Lead | `Takes under 2 minutes. Your £100 becomes £125 with Gift Aid.` |
| Trust line (green) | `Trusted by 3,200+ donors since 2013` |
| Outcome label icon row | Dynamically renders the selected tier's outcome line |
| Gift Aid callout (post-amount selection) | `With Gift Aid: £{value × 1.25} at no extra cost` |
| Payment methods strip | `Secure checkout · Apple Pay · Google Pay · Card` |
| Trust microcopy (one-time) | `100% pledge on emergency relief · Reg. charity 1158608` |
| Trust microcopy (monthly) | `100% pledge on emergency relief · Cancel anytime` |
| Cross-route nudge | `Paying Zakat or Sadaqah instead? Pay Zakat · Give Sadaqah` |

### 1.4 "Where Your Donation Goes" benefit cards (Section 4 of page)

Section intro paragraph (verbatim):
> `When families are displaced by conflict, they lose everything. Your donation provides the essentials they need to survive — delivered directly by our teams on the ground.`

| Card title | Description |
|---|---|
| `Food & Clean Water` | `Hot meals, nutrition packs, and safe drinking water for displaced families` |
| `Medical Supplies` | `Urgent care supplies, trauma kits, and medication for injured and vulnerable families` |
| `Shelter & Essentials` | `Blankets, hygiene kits, and household basics for families with nothing` |
| `Prepared Aid Stocks` | `Pre-packed family kits ready for rapid distribution when crisis escalates` |

### 1.5 Field Evidence section copy

| Element | Copy |
|---|---|
| H2 | `We Don't Send Aid From a Distance` |
| Sub-copy | `Our teams are physically present in Gaza, distributing aid directly to families in displacement camps.` |
| Mobile inline CTA after media stack | `Ready to help these families? Donate now` |

### 1.6 "How We Deliver" 3-step process (Delivery Assurance section)

| Step | Title | Body |
|---|---|---|
| 01 | `We Verify` | `Our field teams identify urgent household needs on the ground in Gaza, prioritising the most vulnerable families.` |
| 02 | `We Allocate` | `Funds are directed where pressure is highest. Every pound goes to the families who need it most.` |
| 03 | `We Report` | `Audited reports published through the Charity Commission. Full transparency, always.` |

Section intro paragraph:
> `Your donation is not just sent — it is verified, allocated, and reported with full transparency.`

Trust stats row (under steps):
> `Charity No. 1158608 | 100% pledge on emergency relief | Audited annually | Gift Aid eligible`

### 1.7 Testimonials

**None present on `/palestine`.** No testimonial component is rendered on the page. This is a gap vs. competitor donation pages — see Section 8.

### 1.8 FAQs (verbatim questions + first 30 words of each answer)

| # | Question | First 30 words of answer |
|---|---|---|
| 1 | `How does my donation reach families in Gaza?` | `Our field teams work with verified local partners to identify the most vulnerable families. Aid is distributed directly — food parcels, clean water, medical supplies, and shelter materials are` |
| 2 | `Is my donation eligible for Gift Aid?` | `Yes. If you are a UK taxpayer, we can claim an extra 25% on your donation at no additional cost to you. Simply check the Gift Aid box during` |
| 3 | `Can I pay my Zakat here, or give Sadaqah instead?` | `Yes. Emergency relief for displaced Gaza families is considered Zakat-eligible under mainstream scholarly opinion covering the wayfarer (ibn al-sabil) and those displaced by conflict. If you prefer a` |
| 4 | `Can I set up a monthly donation?` | `Yes. Monthly donations provide sustained, predictable support for families in Gaza. You can cancel anytime by contacting us at info@deenrelief.org.` |
| 5 | `How much goes to administration?` | `We commit to spending no more than 10% of income on administration and running costs. 100% of emergency relief donations go directly to supporting families on the ground.` |
| 6 | `How is Deen Relief regulated?` | `Deen Relief is registered with the Charity Commission (No. 1158608) and Companies House (No. 08593822). Our accounts are publicly audited and filed annually.` |

### 1.9 100% pledge / trust commitment language (every appearance on page)

The page never uses the phrase "100% pledge" as a full sentence; it's referenced in three short forms:

| Surface | Phrasing |
|---|---|
| Hero in-line trust strip | `100% pledge on emergency relief` |
| Delivery assurance trust row | `100% pledge on emergency relief` |
| Donation form trust microcopy | `100% pledge on emergency relief` |
| FAQ #5 (the only place where it's expanded) | `We commit to spending no more than 10% of income on administration and running costs. 100% of emergency relief donations go directly to supporting families on the ground.` |

> **Important:** The "100% pledge" claim is only fully defined in the FAQ. Ad copy that uses it should be paired with the FAQ-style framing ("100% of emergency relief donations go directly to supporting families on the ground") to remain compliant with the underlying admin-cap commitment of "no more than 10% on admin".

### 1.10 Trust strip / charity references (every appearance)

| Location | Phrasing |
|---|---|
| Hero | `Charity No. 1158608` |
| Donation form trust microcopy | `Reg. charity 1158608` (one-time only — replaced by `Cancel anytime` for monthly) |
| Delivery assurance row | `Charity No. 1158608 \| 100% pledge on emergency relief \| Audited annually \| Gift Aid eligible` |
| Final CTA section | `Every donation verified. Every pound tracked. Every family reached.` |
| Founding date | `since 2013` (in `Trusted by 3,200+ donors since 2013`) |
| Donor count claim | `3,200+ donors` (used twice — main donation form + final mini picker) |

### 1.11 Every CTA button copy variant on page (in document order)

| # | Surface | Button label | Destination |
|---|---|---|---|
| 1 | Header (sticky, all pages) | `Donate` | `#donate-form` (anchors to in-page form on `/palestine`) |
| 2 | Hero, desktop only | `Help a Family Now` | `#donate-form` |
| 3 | Donation form, dynamic | `Donate £{amount} Now` (or `Donate £{amount}/month Now`) | `/donate?campaign=palestine&amount={n}&frequency={one-time\|monthly}` |
| 4 | Donation form, validation state | `Enter £5 or more to continue` | (disabled) |
| 5 | Field-evidence mobile inline | `Donate now` (text link) | `#donate-form` |
| 6 | Mini donation picker (final CTA), dynamic | `Donate £{amount} Now` (or `Donate £{amount}/month Now`) | `/donate?campaign=palestine&amount={n}&frequency={one-time\|monthly}` |
| 7 | FAQ link | `About our team` | `/about` |
| 8 | FAQ link | `Pay Zakat` | `/zakat` |
| 9 | FAQ link | `Give Sadaqah` | `/sadaqah` |
| 10 | FAQ link | `Zakat vs Sadaqah explained` | `/blog/zakat-vs-sadaqah-difference` |
| 11 | FAQ link | `Charity Commission register` | external — Charity Commission |
| 12 | Donation form footer link | `Pay Zakat` | `/zakat` |
| 13 | Donation form footer link | `Give Sadaqah` | `/sadaqah` |

**Total CTA-shaped surfaces:** 6 unique donation-bound CTAs (counting Header on this page once); 13 if you count every clickable element including FAQ exits and Zakat/Sadaqah cross-links.

---

## Section 2 — Donation form configuration

### 2.1 Amount tiers (verbatim from `src/app/palestine/DonationForm.tsx`)

**One-time tiers:**

| Amount | Outcome line | Default? |
|---|---|---|
| £25 | `Provides a food parcel for a family of five for one week` | — |
| £50 | `Feeds a displaced family of five in Gaza for one month` | **Yes** |
| £100 | `Supplies clean water and medical essentials for a family of five` | — |
| £250 | `Provides shelter, blankets, and household basics for a displaced family` | — |

**Monthly tiers:**

| Amount/mo | Outcome line | Default? |
|---|---|---|
| £10 | `Provides ongoing clean water access for a family of five` | — |
| £25 | `Feeds a displaced family of five every month` | **Yes** |
| £50 | `Covers monthly medical supplies and food for a family of five` | — |
| £100 | `Sustains comprehensive monthly support for a family of five` | — |

Custom amount input below the tiles. Outcome label for custom amounts floors to the highest tier ≤ the entered value (no "approximately" hedge).

### 2.2 Defaults

- **Default frequency:** `one-time` (`useState<Frequency>("one-time")`)
- **Default amount on first paint:** £50 one-time
- **Default amount on switching to monthly:** £25/mo (the tier marked `default: true`)
- **Default selected after switching back to one-time:** £50 (re-applied)

### 2.3 Gift Aid behaviour

- **Opt-in by default?** No — Gift Aid is **opt-out at the form, opt-in at checkout**.
  - The Palestine page form **shows** the Gift Aid uplift as a passive indicator: `With Gift Aid: £{amount × 1.25} at no extra cost` — this is informational, not a checkbox.
  - The actual Gift Aid checkbox lives on `/donate` (`CheckoutClient.tsx`, line 502): `<input type="checkbox" checked={giftAidEnabled} onChange={...} />`
  - It is **unchecked by default**: `useState(false)`.
- **Declaration text:** built per donation by `buildDeclarationText(amountGbp)` in `src/lib/gift-aid.ts`; full declaration is collapsed behind a "Read the full declaration" button.
- **HMRC audit:** on submit, declaration text + IP + UA + scope are inserted into `gift_aid_declarations` table linked to the donor.

### 2.4 Currency handling

- **Single currency: GBP.** Hard-coded throughout (`currency: "gbp"` in PaymentIntent, `priceCurrency: "GBP"` in JSON-LD, donation row writes `"GBP"`).
- No currency switcher. Custom amount input has no currency selector — pound sign is a non-interactive prefix glyph.
- **MIN amount:** £5 (client + server: `MIN_AMOUNT = 5` / `MIN_AMOUNT_PENCE = 500`).
- **MAX amount:** £10,000 (server only: `MAX_AMOUNT_PENCE = 10_000_00`); the Palestine form has no client-side upper cap, so the donor sees a server error if they exceed it.

### 2.5 Conditional UI — monthly vs one-time

| Surface | One-time state | Monthly state |
|---|---|---|
| Frequency toggle | `One-time` pill highlighted | `Monthly` pill highlighted |
| Amount tier set | £25/£50/£100/£250 | £10/£25/£50/£100 |
| Outcome lines | One-time outcomes | Per-month outcomes |
| Default selected amount | £50 | £25 |
| CTA button label | `Donate £{n} Now` | `Donate £{n}/month Now` |
| Trust microcopy | `100% pledge on emergency relief · Reg. charity 1158608` | `100% pledge on emergency relief · Cancel anytime` |

### 2.6 Form URL structure & accepted query params

**Outbound URL from the Palestine page form:**
```
/donate?campaign=palestine&amount=<int>&frequency=<one-time|monthly>
```

**Accepted by `/donate` (`src/app/donate/page.tsx`):**

| Param | Type | Notes |
|---|---|---|
| `campaign` | string | Must match the allow-list in `src/lib/campaigns.ts`. Falls back to `general` if invalid. |
| `amount` | int (£, not pence) | `Math.floor(parsedAmount)`. Falls back to £50 if invalid or missing. |
| `frequency` | `one-time` \| `monthly` | Anything except `monthly` → `one-time`. |

**Donor-facing checkout post-success URL (set by Stripe redirect):**
```
/donate/thank-you?payment_intent=<pi_...>&redirect_status=succeeded   (one-time)
/donate/thank-you?setup_intent=<seti_...>&redirect_status=succeeded   (monthly)
```

Both are `noindex, nofollow` (set in `src/app/donate/thank-you/page.tsx` metadata).

### 2.7 Form load-time signal (mobile)

- The form on `/palestine` mobile is the **same React component** rendered inline in the hero, **not** lazy-loaded. It mounts on initial paint.
- It is a client component (`"use client"`) but its only dependencies at mount are React + the Button component — no Stripe SDK on the Palestine page itself. **Stripe.js only loads on `/donate`**, not on `/palestine`.
- **Verdict:** light. Bundle impact = the React tree of `DonationForm` + `MiniDonationPicker` (~few KB gzipped). No payment SDKs, no third-party widgets.
- The expensive load is `/donate` itself (Stripe.js ≈ 200 KB+ on its own).

---

## Section 3 — Imagery available for Palestine creative

### 3.1 Inventory of Palestine/Gaza assets

All measurements via `sips -g pixelWidth -g pixelHeight` on `/Users/rakinmiah/Desktop/DeenRelief/public/images/`.

| Filename | Path | Dimensions | Aspect ratio | File size | Format |
|---|---|---|---|---|---|
| `palestine-relief.webp` | `/public/images/palestine-relief.webp` | 1200 × 1600 | 3:4 (portrait) | 168 KB | WebP |
| `gaza-aid-distribution-1.webp` | `/public/images/gaza-aid-distribution-1.webp` | 900 × 1600 | 9:16 (portrait) | 140 KB | WebP |
| `gaza-aid-distribution-2.webp` | `/public/images/gaza-aid-distribution-2.webp` | 900 × 1600 | 9:16 (portrait) | 203 KB | WebP |
| `gaza-aid-distribution-3.webp` | `/public/images/gaza-aid-distribution-3.webp` | 1200 × 1600 | 3:4 (portrait) | 168 KB | WebP |
| `gaza-aid-handover.jpeg` | `/public/images/gaza-aid-handover.jpeg` | 900 × 1600 | 9:16 (portrait) | 219 KB | JPEG |
| `gaza-aid-packing.webp` | `/public/images/gaza-aid-packing.webp` | 720 × 1280 | 9:16 (portrait) | 113 KB | WebP |
| `gaza-displacement-camp-children.jpeg` | `/public/images/gaza-displacement-camp-children.jpeg` | 900 × 1600 | 9:16 (portrait) | 227 KB | JPEG |

**Every Palestine asset is portrait orientation.** No landscape source files exist for Palestine. This is a hard constraint for 1.91:1 (1200×628) Google Display Ads — landscape crops will be tight to impossible without losing the subject.

### 3.2 Per-asset description, branding, text overlay, crop suitability

I have not viewed the binary contents of these images programmatically. Subject descriptions below are inferred from the filenames + the alt text the codebase assigns + the ProofTag positioning hints in `page.tsx`. **Treat subject descriptions as alt-text-derived, not visually verified — flag for design team review before use in ad creative.**

| Filename | Alt text in code | Inferred subject | Faces visible? | Branding visible? | Text overlay? | 1:1 (1200×1200) | 1.91:1 (1200×628) | 4:5 (960×1200) |
|---|---|---|---|---|---|---|---|---|
| `palestine-relief.webp` | "Deen Relief worker distributing aid to a family in a Gaza displacement camp" | Worker + family in displacement camp | Likely yes | Inferred yes (Deen Relief vest implied) | None | Crops cleanly — square upper portion suitable | Tight; will crop subject heavily — only top band usable | Cleans up well; near-native ratio |
| `gaza-aid-distribution-1.webp` | "Deen Relief field worker delivering aid in a Gaza displacement camp" (used as poster for `gaza-field.mp4`) | Field worker delivering aid | Likely yes | Inferred yes | None | Works at top-of-frame crop | Very tight 9:16 → 1.91:1; subject likely cut | Excellent fit |
| `gaza-aid-distribution-2.webp` | "Deen Relief worker delivering aid to a child in a Gaza displacement camp" | Worker + child handover moment | Yes (child + worker) | Inferred yes | None | Crop will lose either head or hands; risky | Severe crop loss | Excellent fit; near-native 9:16→4:5 |
| `gaza-aid-distribution-3.webp` | "Deen Relief Palestine Relief Campaign worker distributing aid to a woman" | Worker handing aid to a woman | Yes | Inferred yes | None | Workable | Tight; subject likely lost | Cleans up well |
| `gaza-aid-handover.jpeg` | (not used on `/palestine`) | Aid handover moment | Likely yes | Inferred yes | Unknown | Unknown — needs visual review | Likely tight | Likely good |
| `gaza-aid-packing.webp` | "Deen Relief worker packing aid supplies in front of Deen Relief Palestine Relief Campaign banner" | Worker packing aid in front of branded banner | Yes (worker) | **YES — campaign banner explicitly visible per alt text** | None | Square crop should keep banner text — best for 1:1 with branding | Banner likely cropped out at landscape | 4:5 keeps banner |
| `gaza-displacement-camp-children.jpeg` | "Deen Relief field worker delivering an aid package to children in a Gaza displacement camp" | Worker + children, displacement camp setting | Yes (multiple children) | Inferred yes | None | Workable upper-band crop | Very tight | Excellent fit; near-native 9:16→4:5 |

**Crop summary by ad ratio:**

- **1:1 (square — Google Display, IG-style):** All assets workable but `gaza-aid-packing.webp` is the strongest if you want the "Palestine Relief Campaign" banner visible (built-in branding + verification cue).
- **1.91:1 (landscape — Google Display, OG):** **Hard with the current asset set.** Every source is 9:16 or 3:4 portrait. Landscape crops will lose subject context. Best candidates: `palestine-relief.webp` and `gaza-aid-distribution-3.webp` because they're 3:4 not 9:16 — slightly less aggressive landscape crop. **Recommend commissioning landscape source crops or shooting/sourcing landscape originals before launch.**
- **4:5 (Meta feed, vertical Display):** Excellent fit for all assets — nearly all are 9:16 native, which crops to 4:5 with light top/bottom trim.

### 3.3 Currently used on the page (cross-reference)

| Asset | Position on `/palestine` | Image directives in code |
|---|---|---|
| `palestine-relief.webp` | Hero background, full-bleed | `priority`, `object-cover object-[center_37%]`, dark navy gradient overlay |
| `gaza-displacement-camp-children.jpeg` | Desktop donation panel side image | `object-cover object-[center_85%]`, sizes `(max-width: 1024px) 100vw, 50vw` |
| `gaza-aid-distribution-2.webp` | "Where Your Donation Goes" image (mobile inline + desktop side) | `object-cover object-[center_45%]`, sizes 100vw / 50vw |
| `gaza-aid-distribution-1.webp` | Poster for `gaza-field.mp4` (Field Evidence) | Used by `<LazyVideo>` poster, `object-cover` `objectPosition: center 30%` |
| `gaza-aid-packing.webp` | Field Evidence (mobile + desktop, second tile) | `object-cover object-[center_30%]` |
| `gaza-aid-distribution-3.webp` | Field Evidence (mobile + desktop, third / first stacked tile on desktop) | `object-cover object-[center_30%]` |

**Not used on `/palestine`:** `gaza-aid-handover.jpeg`. **Used elsewhere:** `palestine-relief.webp` is also used as the OG image and hero background for `/zakat`, the `OurWork` campaign card, the `CampaignsGrid` campaign card, and the `FeaturedCampaign` homepage hero.

### 3.4 Video assets

| Filename | Path | Size | Notes |
|---|---|---|---|
| `gaza-field.mp4` | `/public/videos/gaza-field.mp4` | 9.6 MB | Compressed delivery file. Used on `/palestine` (Field Evidence) via `<LazyVideo>` (poster-first; only downloads on play tap). |
| `gaza-field.original.mp4` | `/public/videos/gaza-field.original.mp4` | 13.7 MB | Original master. Not referenced anywhere — kept as a source. **TODO: confirm intentional, otherwise delete to keep deploy size lean.** |

> **Code comment confirms intent:** "On mobile, autoplay-muted triggers the browser to download the full file on every page view — crushing LCP on 4G and costing Landing Page Experience in Google Ads. Poster-first means mobile visitors save the full 14 MB unless they choose to watch."

For YouTube ads / video Google Ads creative, this video is the only Palestine-themed footage in the repo. Length and dimensions not extractable without ffprobe — flag for video team to spec for ad cuts.

---

## Section 4 — Page structure and conversion path

### 4.1 Section-by-section walk

| # | Section | What the visitor sees | What they're asked to do |
|---|---|---|---|
| 1 | **Hero** | Full-bleed Gaza camp photo with dark navy left-side gradient. Eyebrow "Palestine Emergency Appeal", H1 "Donate to Gaza Emergency Relief", italic sub "A family in Gaza needs you right now.", supporting paragraph, trust microcopy, ProofTag "Gaza" overlay bottom-right. | Desktop: click "Help a Family Now" CTA → scrolls to `#donate-form`. Mobile: form is **inline beneath the hero copy** — no scroll required. |
| 2 | **Donation panel (desktop only — `lg:` breakpoint and up)** | Two-column grid: left = `gaza-displacement-camp-children.jpeg` portrait image with ProofTag "Gaza 2026"; right = full `<DonationForm>` (toggle / 4 amount tiles / custom field / Gift Aid hint / CTA). Hidden on mobile (`hidden lg:block`). | Pick frequency + amount; CTA fires off to `/donate?...`. |
| 3 | **Partners** | `<Partners />` strip (logo wall — see component for content). | Build trust via third-party validation. |
| 4 | **Where Your Donation Goes** | H2 + intro + 4 benefit cards (Food/Water, Medical, Shelter, Prepared Stocks). Mobile shows `gaza-aid-distribution-2.webp` between H2 and copy; desktop shows it as a side image. | Reinforce specifically what the money buys; no CTA inline. |
| 5 | **Field Evidence** | "We Don't Send Aid From a Distance" — a video tile (poster-first) + 2 photo tiles. Mobile = stacked, desktop = video left / images stacked right. | Mobile-only inline link "Donate now" appended at the bottom of the photo stack. |
| 6 | **Delivery Assurance** | "From Your Donation to a Family in Gaza" — 3-step process (We Verify, We Allocate, We Report) + trust stats row. | Build conviction in the operational pipeline; no CTA inline. |
| 7 | **FAQ** | 6 questions (FAQ accordion). | Resolve last-mile objections; some FAQ answers carry contextual CTAs (e.g. Pay Zakat, Charity Commission register). |
| 8 | **Final CTA** | Dark green band; H2 "A Family in Gaza Needs Your Help Today"; `<MiniDonationPicker>` (frequency toggle + 4 amount tiles + custom + amber CTA). | Recover scrollers who didn't convert higher up. |

### 4.2 Donation form positioning

| Viewport | Position |
|---|---|
| Mobile (< 1024px / `lg`) | **In-hero, inline.** Form card sits beneath the hero copy paragraph, on white background with `rounded-2xl shadow-2xl`, ID `#donate-form-mobile`. Visible without scrolling once the hero copy is consumed. |
| Desktop (≥ 1024px / `lg`) | **Below the hero, in a dedicated `#donate-form` section** as a two-column block (image + form). The hero CTA "Help a Family Now" anchors to this. |

### 4.3 CTA count on the page

**6 unique donation-bound CTAs** (treating the same `<DonationForm>` rendered twice on different viewports as one logical CTA):
1. Header "Donate" (anchors to `#donate-form`)
2. Hero "Help a Family Now" (desktop only, anchors to `#donate-form`)
3. Main donation form CTA (`Donate £{n} Now` / `/month`)
4. Field Evidence "Donate now" inline link (mobile only)
5. Mini donation picker CTA in final section
6. (Implicitly) cross-sell links to `/zakat` and `/sadaqah` from form footer + FAQ

### 4.4 Sticky donate button on scroll?

**Yes — via the global `<Header />` component**, which is `position: fixed top-0` with a `Donate` button on every breakpoint. On `/palestine` it points to `#donate-form` (registered in `donateAnchors` map). The Header is the sticky donate UX. There is **no separate sticky bottom-bar CTA**.

### 4.5 Above-the-fold estimate

#### Desktop 1280×800

- Header height: `py-4` initially → ~64 px (transitions to `py-3` ≈ 60 px on scroll; first paint is 64 px).
- Hero `md:min-h-[50vh]` → 400 px minimum, but the hero also has `py-12 md:py-16 lg:py-20` (top padding ≈ 80 px lg). Hero takes effectively `min-h(50vh)` = 400 px (often more if content forces it taller — eyebrow + H1 + sub + paragraph + trust strip + CTA). Likely renders ~480–560 px tall on desktop.
- **800 px viewport − 64 px header = 736 px usable.**
- Visible above the fold on desktop: full hero (eyebrow, H1, sub, supporting paragraph, trust strip, "Help a Family Now" CTA, ProofTag) — **all hero content fits, with ~150–250 px of the section below the hero (start of donation panel) likely peeking in.**
- The **donation form is NOT above the fold on desktop** (it sits in section 2, below the hero). The hero CTA must be clicked to scroll to it.

#### Mobile 390×844

- Header height: ~60 px (the `mt-[60px]` offset on the hero `<section>` matches this).
- Hero on mobile uses `py-12` (48 px top + 48 px bottom). The mobile hero does not enforce `min-h-[50vh]` (the `md:` prefix scopes that to ≥ 768 px).
- **844 px viewport − 60 px header = 784 px usable.**
- Mobile hero stacks: eyebrow + H1 + italic sub + paragraph + trust strip (mobile CTA hidden — `hidden lg:block`) + **then the donation form card inline (`#donate-form-mobile`)**.
- Visible above the fold on mobile: full hero copy stack (eyebrow → trust strip — roughly 380–440 px) + first portion of the donation form card. The frequency toggle + likely the first row of amount tiles are above the fold; the CTA button is **not** above the fold and requires a small scroll. Desirable behaviour — the donor sees the form and is invited in.

### 4.6 Conversion path (full)

```
/palestine (PMax landing) →
  in-hero form (mobile) OR scroll to #donate-form (desktop)
    pick amount + frequency →
  /donate?campaign=palestine&amount=X&frequency=Y →
    mounts <CheckoutClient> → POST /api/donations/create-intent (Stripe PI/SI) →
    fills donor + Gift Aid + payment fields →
    POST /api/donations/confirm (writes donation row + attribution) →
    stripe.confirmPayment() (or confirmSetup for monthly) →
  /donate/thank-you?payment_intent=... →
    server retrieves PI from Stripe →
    if status==succeeded → <TrackConversion> fires GA4 `purchase` event
```

---

## Section 5 — SEO and structured data for `/palestine`

### 5.1 Metadata (from `src/app/palestine/layout.tsx`)

| Field | Value |
|---|---|
| Title | `Donate to Gaza Emergency Relief \| Deen Relief` |
| Description | `Helping 3,200+ donors since 2013 deliver food, water, and medical aid to Gaza families. Gift Aid eligible. Charity No. 1158608.` |
| Canonical | `/palestine` (resolved via `metadataBase` in root layout to `https://deenrelief.org/palestine`) |
| Robots | Inherits root default — **indexable, followable** (the global `robots()` function only disallows `/api/`). No page-level `noindex`. |
| OG image | `/images/palestine-relief.webp` — 1200×1600 (3:4 portrait). **No `width`/`height` declared in metadata for Palestine OG (root layout's home OG declares dims, but `/palestine` doesn't). Recommend adding explicit `width: 1200, height: 1600` in `openGraph.images[0]`.** |
| OG title / description | Mirror the page title/description |
| Twitter card | `summary_large_image`, `@deenrelief`, same image |
| Locale | `en-GB` (set on `<html>`, declared in JSON-LD) |

### 5.2 Page-level JSON-LD blocks

Three JSON-LD `<script>` tags are emitted on `/palestine` from the page itself plus what the root layout injects globally:

#### 5.2.1 Page-level: WebPage + FundraisingEvent + DonateAction (from `layout.tsx` via `buildDonationPageSchema`)

```json
{
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": "https://deenrelief.org/palestine#webpage",
  "url": "https://deenrelief.org/palestine",
  "name": "Donate to Gaza Emergency Relief | Deen Relief",
  "description": "Helping 3,200+ donors since 2013 deliver food, water, and medical aid to Gaza families. Gift Aid eligible. Charity No. 1158608.",
  "dateModified": "<built at request time, ISO date>",
  "inLanguage": "en-GB",
  "isPartOf": {
    "@type": "WebSite",
    "name": "Deen Relief",
    "url": "https://deenrelief.org"
  },
  "about": {
    "@type": "FundraisingEvent",
    "name": "Palestine Emergency Appeal",
    "description": "Ongoing emergency fundraising to deliver food, clean water, medical supplies, and shelter to displaced families in Gaza.",
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
      "name": "Gaza",
      "address": {
        "@type": "PostalAddress",
        "addressRegion": "Gaza Strip",
        "addressCountry": "PS"
      }
    }
  },
  "potentialAction": {
    "@type": "DonateAction",
    "name": "Donate to Palestine Emergency Appeal",
    "description": "Ongoing emergency fundraising to deliver food, clean water, medical supplies, and shelter to displaced families in Gaza.",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": "https://deenrelief.org/donate?campaign=palestine&amount={amount}&frequency={frequency}",
      "actionPlatform": [
        "http://schema.org/DesktopWebPlatform",
        "http://schema.org/MobileWebPlatform"
      ]
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
    "priceSpecification": {
      "@type": "PriceSpecification",
      "priceCurrency": "GBP",
      "minPrice": 1
    }
  }
}
```

> **Note:** `minPrice: 1` here is the schema default in `buildDonationPageSchema` (config didn't override it), but the actual server-side minimum is **£5** (`MIN_AMOUNT_PENCE = 500`). Inconsistency worth aligning — bump `minPrice` to `5` when calling the helper from `palestine/layout.tsx`.

#### 5.2.2 Page-level: BreadcrumbList (from `BreadcrumbSchema` in `page.tsx`)

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://deenrelief.org" },
    { "@type": "ListItem", "position": 2, "name": "Palestine Relief", "item": "https://deenrelief.org/palestine" }
  ]
}
```

#### 5.2.3 Page-level: FAQPage (from `page.tsx`, built from local `faqs` array)

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    { "@type": "Question", "name": "How does my donation reach families in Gaza?",
      "acceptedAnswer": { "@type": "Answer", "text": "Our field teams work with verified local partners to identify the most vulnerable families. Aid is distributed directly — food parcels, clean water, medical supplies, and shelter materials are delivered hand-to-hand to families in displacement camps and affected areas." } },
    { "@type": "Question", "name": "Is my donation eligible for Gift Aid?",
      "acceptedAnswer": { "@type": "Answer", "text": "Yes. If you are a UK taxpayer, we can claim an extra 25% on your donation at no additional cost to you. Simply check the Gift Aid box during checkout — your £100 becomes £125." } },
    { "@type": "Question", "name": "Can I pay my Zakat here, or give Sadaqah instead?",
      "acceptedAnswer": { "@type": "Answer", "text": "Yes. Emergency relief for displaced Gaza families is considered Zakat-eligible under mainstream scholarly opinion covering the wayfarer (ibn al-sabil) and those displaced by conflict. If you prefer a dedicated Zakat donation experience with our strict 100% Zakat policy, visit our Zakat page. For general charitable giving, Sadaqah and Sadaqah Jariyah are accepted year-round." } },
    { "@type": "Question", "name": "Can I set up a monthly donation?",
      "acceptedAnswer": { "@type": "Answer", "text": "Yes. Monthly donations provide sustained, predictable support for families in Gaza. You can cancel anytime by contacting us at info@deenrelief.org." } },
    { "@type": "Question", "name": "How much goes to administration?",
      "acceptedAnswer": { "@type": "Answer", "text": "We commit to spending no more than 10% of income on administration and running costs. 100% of emergency relief donations go directly to supporting families on the ground." } },
    { "@type": "Question", "name": "How is Deen Relief regulated?",
      "acceptedAnswer": { "@type": "Answer", "text": "Deen Relief is registered with the Charity Commission (No. 1158608) and Companies House (No. 08593822). Our accounts are publicly audited and filed annually." } }
  ]
}
```

#### 5.2.4 Globally injected (from root `layout.tsx`)

- **NGO / Organization schema** — the canonical `Deen Relief` entity. Includes founding date 2013, both UK postal addresses, charity number 1158608, Companies House number 08593822, `nonprofitStatus: LimitedByGuaranteeCharity`, `areaServed` includes `Palestine` as a Country, contact points, social profiles, knowsAbout list, and a `DonateAction` pointing at `/donate`. This appears on every page including `/palestine`.
- **WebSite schema** — `https://deenrelief.org/#website` with a `SearchAction` pointing at `/blog?q={search_term_string}`.

### 5.3 Internal links pointing to `/palestine`

Found via grep across `src/`:

| Source file | Context |
|---|---|
| `src/app/sitemap.ts` (line 20) | Listed in campaign loop, weekly changefreq, priority 0.9 |
| `src/app/not-found.tsx` (line 50) | Listed as "Palestine Appeal" link in 404 quick-jump list |
| `src/app/our-work/page.tsx` (line 14, 18) | Featured campaign card with image + link |
| `src/components/GivingPathways.tsx` (line 40) | One of the homepage giving-path cards |
| `src/components/Footer.tsx` (line 14) | Footer "Emergency Appeals" link |
| `src/components/CampaignsGrid.tsx` (line 23) | Homepage campaigns grid card |
| `src/components/Header.tsx` (line 23) | Maps `/palestine` → `#donate-form` for Header donate button anchor |
| `src/components/PrayerTimesUI.tsx` (line 392) | Cross-link from prayer times pages |
| `src/components/FeaturedCampaign.tsx` (line 208) | Hero featured-campaign block on homepage links to `/donate?campaign=palestine&...` |
| `src/app/zakat/layout.tsx` & `src/app/zakat/page.tsx` | Reuses `palestine-relief.webp` (image only — no link) |

**No `/blog/*` posts link to `/palestine`** at present (zero matches). Topical clustering signal is weak — see Section 8.

### 5.4 Sitemap

`/palestine` **is** in `sitemap.ts` (line 20–28 generator) with:

- URL: `https://deenrelief.org/palestine`
- `changeFrequency: weekly`
- `priority: 0.9`
- `lastModified: now` (regenerated at request time)

### 5.5 Page-level keywords / topical clustering signals

**On-page keyword density (target keywords):**

- `Gaza` appears in: H1, sub-head, paragraph, all 4 H2s containing "Gaza" reference, ProofTags, CTA section, FAQ #1 + #4, every alt text. **Heavy and natural.**
- `Palestine` appears in: eyebrow, FAQ #6 ("Palestine Relief" alt text), final-CTA section, JSON-LD `FundraisingEvent.name`, ProofTag none, page URL slug. **Moderate.**
- `donation` / `donate` appears in: H1, donation panel, all CTAs, FAQ #1/#2/#4/#5, JSON-LD `DonateAction`. **Heavy.**
- `emergency relief` / `emergency appeal` appears in: eyebrow, sub-head, hero supporting copy, trust strips, FAQ #5, JSON-LD `name`. **Heavy and consistent.**
- `Zakat` appears in: FAQ #3 + cross-sell links. **Light — intentional cross-link only.**

**Topical cluster:** weak. The page sits in isolation — no inbound blog content linking to it; no breadcrumb chain beyond Home → Palestine; no related-cause cross-links beyond Zakat/Sadaqah footer nudge. This is a meaningful SEO gap for organic search alongside the paid campaign.

---

## Section 6 — Conversion tracking specific to Palestine donations

### 6.1 Where the `purchase` event fires

**Single fire location:** `src/app/donate/thank-you/TrackConversion.tsx`. Mounted only when `redirect_status === succeeded` (server-side check in `page.tsx`). Strict-mode-double-mount safe via `useRef(transactionId)`.

### 6.2 Verbatim payload structure (from `src/lib/analytics.ts`)

The event sent to GA4 / Google Ads:

```js
gtag('event', 'purchase', {
  transaction_id: '<pi_xxx or seti_xxx>',
  value: <amount in GBP, NOT pence>,
  currency: 'GBP',
  affiliation: 'Deen Relief',
  gift_aid_claimed: true | false,
  frequency: 'one-time' | 'monthly',
  campaign_slug: 'palestine',
  items: [
    {
      item_id: 'palestine',
      item_name: 'Palestine Emergency Relief',
      item_category: 'One-time donation' | 'Monthly donation',
      price: <amount in GBP>,
      quantity: 1
    }
  ],
  // Conditionally added if ad_user_data consent === true AND email available:
  user_data: {
    sha256_email_address: '<hex SHA-256 of trimmed lowercased email>'
  }
});
```

### 6.3 Direct answers to your questions

| Question | Answer |
|---|---|
| Is `campaign_slug: 'palestine'` passed in the `purchase` event? | **Yes.** Both at the top level (`campaign_slug: 'palestine'`) and inside `items[0].item_id`. |
| What does `item_id` look like? | The campaign slug, e.g. `palestine`. |
| What does `item_name` look like? | The human label from `getCampaignLabel('palestine')` → `Palestine Emergency Relief`. |
| Are there Palestine-specific custom events? | **No.** The system fires only the standard GA4 `purchase` event with `campaign_slug` as a custom param. No `view_item`, `begin_checkout`, `add_to_cart`, or any other intermediate funnel event is fired anywhere on the Palestine page or `/donate` (grep confirms zero matches). |
| Are UTMs preserved through the funnel? | **Yes.** `<AttributionCapture>` writes `dr_attribution` first-party cookie (last-click wins, 90-day TTL). Cookie is read server-side in `/api/donations/create-intent` → flattened as `attr_*` keys into Stripe metadata, AND in `/api/donations/confirm` → written as separate columns on the `donations` row (`gclid`, `gbraid`, `wbraid`, `fbclid`, `utm_source/medium/campaign/term/content`, `landing_page`, `landing_referrer`, `landing_at`). |
| Is `gclid` persisted into Stripe metadata for Palestine donations? | **Yes.** Via `attributionToStripeMetadata()` flattened as `attr_gclid` (and `attr_gbraid`, `attr_wbraid`, `attr_fbclid`, `attr_utm_*`, `attr_landing_*`) on **both** the PaymentIntent (one-time) and SetupIntent + Customer (monthly). All values truncated to 500 chars (Stripe metadata cap). |

### 6.4 Stripe metadata fields written for Palestine donations

From `src/app/api/donations/create-intent/route.ts`:

```js
metadata: {
  campaign: 'palestine',
  campaign_label: 'Palestine Emergency Relief',
  amount_pence: '<int as string>',
  frequency: 'one-time' | 'monthly',
  attr_gclid: '<gclid if present>',
  attr_gbraid: '<gbraid if present>',
  attr_wbraid: '<wbraid if present>',
  attr_fbclid: '<fbclid if present>',
  attr_utm_source: '<utm_source if present>',
  attr_utm_medium: '<utm_medium if present>',
  attr_utm_campaign: '<utm_campaign if present>',
  attr_utm_term: '<utm_term if present>',
  attr_utm_content: '<utm_content if present>',
  attr_landing_page: '<first URL hit on the site>',
  attr_landing_referrer: '<document.referrer at capture time>',
  attr_landing_at: '<ISO timestamp>'
}
```

### 6.5 `donations` row columns written for Palestine donations

From `src/app/api/donations/confirm/route.ts`:

```
donor_id, gift_aid_declaration_id, campaign='palestine',
campaign_label='Palestine Emergency Relief', amount_pence, currency='GBP',
frequency, gift_aid_claimed, status='pending',
gclid, gbraid, wbraid, fbclid,
utm_source, utm_medium, utm_campaign, utm_term, utm_content,
landing_page, landing_referrer, landing_at,
ad_storage_consent, ad_user_data_consent,
stripe_payment_intent_id  (one-time)
  OR
stripe_setup_intent_id + stripe_customer_id  (monthly)
```

The `status` is flipped to `succeeded` by the Stripe webhook at `src/app/api/stripe/webhook/route.ts` — that is the source-of-truth event for ROAS reporting and Google Ads Offline Conversion Import (referenced in code comments — the OCI cron filters on `ad_storage_consent=true`).

### 6.6 Consent gate

- `<TrackConversion>` reads `dr_consent` cookie via `readConsentCookie()`.
- `user_data.sha256_email_address` is **only** added when `ad_user_data === true` AND the donor's email is available (from Stripe `receipt_email` for one-time, from the donations row's joined donor for monthly).
- The base `purchase` event still fires regardless of consent — Consent Mode v2 handles whether GA4 / Google Ads sees it as an identified vs. modeled conversion.

### 6.7 Likely cause of the "3 reported conversions" drift

(Diagnostic, not part of the verbatim brief — flag for your campaign review):

- Earlier runs may have used a non-`purchase` event name and therefore weren't auto-imported as a Google Ads conversion (the new code uses GA4-standard `purchase`, which is auto-recognised).
- Or Consent Mode rolled out before GA4 was wired, so most events were blocked client-side. Today's setup fires the base event regardless of consent.
- Worth verifying live: is `NEXT_PUBLIC_GA4_MEASUREMENT_ID` set in production env? `<ConsentBootstrap>` only loads the GA4 script when the env var is present — without it, no `purchase` events leave the browser at all.

---

## Section 7 — Performance signals

### 7.1 LCP candidate

**Highest-priority candidate: `/images/palestine-relief.webp` (1200 × 1600 WebP, 168 KB).** It's the hero `<Image>` with `priority` attribute set (`page.tsx` line 91). Next.js will preload it. This is the correct LCP target.

### 7.2 Client components on the page

| Component | Source |
|---|---|
| `Header` | always client (uses scroll/mobile-menu state) |
| `DonationForm` | client (form state) |
| `MiniDonationPicker` | client (form state) |
| `FaqAccordion` | client (open/close state) |
| `LazyVideo` | client (play state) |
| `AttributionCapture` (root layout) | client (cookie writes) |
| `ConsentBootstrap` (root layout) | server, but injects `<Script>` tags |
| `ConsentBanner` (root layout) | client |

Server components: page.tsx itself (default), layout.tsx, BreadcrumbSchema, JsonLd, Partners, ProcessSteps, ProofTag, Footer.

**Verdict:** Page is **server-rendered** with islands of interactivity. SSG-eligible (no `export const dynamic`, no async server data fetch in the page). The page is likely statically rendered at build time and served from edge cache.

### 7.3 Bundle impact reasoning (without running `next build`)

Page-specific client bundles include:
- `DonationForm` + `MiniDonationPicker` — small React components, no heavy deps.
- `FaqAccordion` — tiny.
- `LazyVideo` — tiny (only Image + button until tap).
- `Header` — present on every page; uses `usePathname` from `next/navigation`.
- Root layout adds `AttributionCapture`, `ConsentBootstrap`, `ConsentBanner`.

**Notably not on `/palestine`:**
- `@stripe/stripe-js` and `@stripe/react-stripe-js` (only loaded on `/donate`).
- No analytics platforms beyond GA4 via gtag.
- No chat widgets, A/B testing tools, or session replay.

**Estimated client JS:** small for a Next.js App Router page — well within Google Ads Landing Page Experience tolerances. The biggest single payload is the hero image (168 KB) followed by gtag (~80 KB depending on consent state).

### 7.4 Mobile responsiveness — breakpoints used

| Breakpoint | Layout switches |
|---|---|
| Default (mobile) | Hero copy + inline donation form card; benefit images inline; field-evidence stacked vertically; final CTA centered |
| `md` (≥ 768 px) | Hero `min-h-[50vh]`, larger H1 sizing, larger paragraphs |
| `lg` (≥ 1024 px) | Two-column hero + dedicated donation panel below; field evidence shifts to video-left/images-right grid; "Where Your Donation Goes" goes side-by-side; mini-picker remains centered |

No obvious off-by-one breakpoint issues in code. The mobile-only hero form vs. desktop dedicated section is **intentional and consistent** (both share `<DonationForm>`).

### 7.5 Third-party scripts

| Script | Loaded via | Conditional? |
|---|---|---|
| `googletagmanager.com/gtag/js?id={GA4 ID}` | `<Script id="gtag-src" strategy="afterInteractive">` in `ConsentBootstrap` | Only if `NEXT_PUBLIC_GA4_MEASUREMENT_ID` env var is set |
| Google Fonts (`Source_Serif_4`, `DM_Sans`) | `next/font/google`, self-hosted (no runtime fetch from fonts.googleapis.com) | Always |
| Stripe.js | `loadStripe()` in `CheckoutClient` | **Not on `/palestine`** — only on `/donate` |

No Hotjar, Microsoft Clarity, Intercom, Drift, FullStory, or other heavy widgets on the page.

### 7.6 Rendering mode

**Server-rendered, statically generatable.** No `export const dynamic`, no `revalidate`, no async data dependency. Likely emitted as static HTML at build time with client islands hydrating after.

The thank-you page is `dynamic` because it does an async Stripe API retrieve — this only matters for the conversion event fire, not for the Palestine landing page itself.

---

## Section 8 — Palestine-specific gaps and recommendations

### 8.1 Competitor comparison disclaimer

I cannot fetch competitor pages (Islamic Relief Gaza appeal, Muslim Aid Palestine, etc.) from this audit environment. Comparisons below are framed as **structural gaps vs. industry standards for emergency-appeal donation pages**, not direct teardowns. Verify against live competitors before claiming any specific gap is "what they do".

### 8.2 Structural gaps on `/palestine`

| Gap | Detail | Severity |
|---|---|---|
| **No testimonials / donor or beneficiary quotes** | Industry standard for emergency appeals is at least one beneficiary quote or donor testimonial on the page. Currently zero. | High — easy social-proof win |
| **No total raised / progress tracker** | "£X raised of £Y goal" thermometers are a near-universal pattern on emergency appeals. Currently no live counter or static raised figure. | High — drives urgency + social proof |
| **No live news / situation update strip** | Most major Gaza appeals show a dated "field update" or "from the ground" timestamped band to convey freshness. Page has `dateModified` in JSON-LD but nothing visible to users. | Medium |
| **No specific outcome anchors per amount above £250** | Tiers cap at £250; high-net donors see no outcome line for £500/£1000. Custom amounts above £250 floor to the £250 outcome (not bad, but capped). | Medium — leaving major-gift donors unguided |
| **No urgency timer or campaign deadline** | The page is "ongoing" — no time-bound matching opportunity, no "donate before X" hook. Optional but proven to lift conversion. | Low — but consider for promotional spikes (Ramadan, ceasefire anniversaries) |
| **No video testimonial / on-the-ground voiceover** | The `gaza-field.mp4` is poster-first and has no captions/transcript stated in code. Captions are an accessibility + ad-policy win. | Medium |
| **No related blog content cross-linking** | Zero `/blog/*` posts link to `/palestine`. Weak topical signal for organic SEO and no content-marketing funnel into the donation page. | Medium |
| **No share / fundraise buttons** | No "Share this appeal" / "Start your own fundraiser" CTAs. Common on Islamic Relief / Muslim Aid pages and a free amplification lever. | Low–Medium |
| **No language toggle / Arabic mirror** | Page is en-GB only. Diaspora donors who'd respond to Arabic copy aren't served. Out of scope for the Google Ads relaunch but worth noting. | Low for paid; high for diaspora organic |
| **`minPrice` schema vs runtime mismatch** | JSON-LD declares `priceSpecification.minPrice: 1`, but server enforces £5 min. Either bump schema to 5 or accept lower min. | Cleanup |

### 8.3 Conversion friction points

| Friction | Detail |
|---|---|
| **Two-step UX (form on page → second checkout page)** | The form on `/palestine` only collects amount + frequency, then ships to `/donate` for donor + payment fields. That's a context switch where some donors abandon. Alternatives: single-step Stripe Checkout redirect (no donor form on your domain at all) or fully embedded Stripe Elements on the Palestine page. Current setup is a sensible middle-ground (own-domain form, on-brand) — but it is still one extra page. |
| **No Apple Pay / Google Pay express button on the Palestine page itself** | Express pay buttons (Stripe `<ExpressCheckoutElement>`) on the landing page would let mobile donors complete in 1–2 taps. Current setup only surfaces them inside the Stripe `PaymentElement` on `/donate`. |
| **Gift Aid is on `/donate`, not on `/palestine`** | The Palestine page only displays "With Gift Aid: £X" as a passive label. The actual checkbox lives on `/donate`. Donors who'd otherwise toggle on Gift Aid early have to wait until checkout. Consider surfacing the checkbox on the Palestine form as well. |
| **No anonymous / quick-donate route** | All donations require donor name + email + UK address + postcode. For low-tier (£5–£10) one-time donations this is heavyweight. Consider a "Quick £5" path that skips the address (Gift Aid won't be claimable, but the gift completes faster). |
| **No PayPal / direct debit alternatives** | Card + Apple Pay + Google Pay only. Some Muslim donor segments prefer PayPal for charity giving. |
| **CTA "Help a Family Now" on the desktop hero** is the only one of its kind | The page's lead CTA verb "Help a Family Now" appears in just one place (desktop hero). All other CTAs are amount-prefixed `Donate £X Now`. Consistency could be tested. |

### 8.4 Monthly / recurring donations — emphasis

- Monthly is implemented end-to-end (SetupIntent → Subscription via webhook → recurring `invoice.paid` events writing renewal donation rows).
- **Emphasis on the page:** under-played. The toggle is small, monthly default tier (£25/mo) is hidden behind a click on the toggle, and no copy block sells the "sustained support" benefit explicitly.
- FAQ #4 confirms monthly is supported. Final CTA mini-picker also has the toggle.
- **Recommendation:** for an emergency appeal where retention matters, surface a "Make this monthly →" nudge inline near the donation form or with a pre-filled monthly toggle for repeat visitors (cookie-based). Industry data suggests monthly donors deliver 3–5× LTV vs. one-time.

### 8.5 Localisation / regional considerations

- Page is **en-GB** with explicit GBP currency, UK postcode validation, UK charity-commission references, "Gift Aid" terminology. Geo-targeted UK ads will land cleanly.
- For overseas donors (US, EU, GCC) who click through, the experience still works but:
  - Currency is forced to GBP — donor sees their bank's FX conversion, not native pricing.
  - Postcode validation is UK-only (`/^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i`) — non-UK donors **cannot complete the donor form** as written. This is a hard blocker for international ad targeting.
  - Gift Aid messaging is irrelevant outside the UK and could confuse.
- **Recommendation if running international Palestine ads:** geo-restrict the campaign to UK, OR add a country selector + localized validation before going wider.

### 8.6 Other notes for paid-search relaunch

- **`/donate` is `noindex, follow`** — correct and intended (we don't want generic `/donate` URLs indexed).
- **`/donate/thank-you` is `noindex, nofollow`** — correct.
- **Robots.txt allows everything except `/api/`** — clean.
- **Consent Mode v2 is already wired** with denied defaults — campaign relaunch can use Enhanced Conversions safely.
- **Landing Page Experience signals:** SSG-able page, light JS, image-priority on the hero, lazy video. Should score well.
- **Quality Score keyword anchor:** the H1 was deliberately switched to `Donate to Gaza Emergency Relief` (a code comment confirms this was for keyword match). Ad headlines aligned to this exact phrasing should produce strong Quality Scores.
- **`gaza-field.original.mp4` (13.7 MB)** is in `/public/videos/` but unreferenced. Either delete or move out of `/public` to avoid bloating the deploy.
- **Stripe metadata audit trail:** every Palestine donation lands with `attr_gclid` (when present) on both the PaymentIntent AND the donations row. Good for both Google Ads OCI uploads and for Stripe-Dashboard manual lookups.
- **Open data fields not yet captured per donation:** Google Ads conversion adjustments (e.g. for refunds) are not wired — there's no automated "refund Stripe → adjust GA4 conversion downward" pathway in code today. Worth adding once relaunch is stable.

---

## File references (absolute paths)

| Concern | Path |
|---|---|
| Page | `/Users/rakinmiah/Desktop/DeenRelief/src/app/palestine/page.tsx` |
| Layout (metadata + page-level JSON-LD) | `/Users/rakinmiah/Desktop/DeenRelief/src/app/palestine/layout.tsx` |
| Donation form (amount tiers, outcomes, defaults) | `/Users/rakinmiah/Desktop/DeenRelief/src/app/palestine/DonationForm.tsx` |
| Mini donation picker (final CTA) | `/Users/rakinmiah/Desktop/DeenRelief/src/app/palestine/MiniDonationPicker.tsx` |
| FAQ accordion | `/Users/rakinmiah/Desktop/DeenRelief/src/app/palestine/FaqAccordion.tsx` |
| Schema helper | `/Users/rakinmiah/Desktop/DeenRelief/src/lib/donationSchema.ts` |
| Campaign allow-list + labels + min/max bounds | `/Users/rakinmiah/Desktop/DeenRelief/src/lib/campaigns.ts` |
| Attribution cookie | `/Users/rakinmiah/Desktop/DeenRelief/src/lib/attribution.ts` |
| Attribution capture client | `/Users/rakinmiah/Desktop/DeenRelief/src/components/AttributionCapture.tsx` |
| Analytics / `purchase` event | `/Users/rakinmiah/Desktop/DeenRelief/src/lib/analytics.ts` |
| Conversion fire location | `/Users/rakinmiah/Desktop/DeenRelief/src/app/donate/thank-you/TrackConversion.tsx` |
| Thank-you page (event mount) | `/Users/rakinmiah/Desktop/DeenRelief/src/app/donate/thank-you/page.tsx` |
| Stripe PaymentIntent creation + Stripe metadata | `/Users/rakinmiah/Desktop/DeenRelief/src/app/api/donations/create-intent/route.ts` |
| Donation row + UTM persistence | `/Users/rakinmiah/Desktop/DeenRelief/src/app/api/donations/confirm/route.ts` |
| Stripe webhook | `/Users/rakinmiah/Desktop/DeenRelief/src/app/api/stripe/webhook/route.ts` |
| Consent Mode v2 + GA4 loader | `/Users/rakinmiah/Desktop/DeenRelief/src/components/ConsentBootstrap.tsx` |
| Header (sticky donate button mapping) | `/Users/rakinmiah/Desktop/DeenRelief/src/components/Header.tsx` |
| Sitemap | `/Users/rakinmiah/Desktop/DeenRelief/src/app/sitemap.ts` |
| Robots | `/Users/rakinmiah/Desktop/DeenRelief/src/app/robots.ts` |
| Root layout (Org + WebSite JSON-LD, GA4 wiring) | `/Users/rakinmiah/Desktop/DeenRelief/src/app/layout.tsx` |
| Hero image (LCP) | `/Users/rakinmiah/Desktop/DeenRelief/public/images/palestine-relief.webp` |
| Field video | `/Users/rakinmiah/Desktop/DeenRelief/public/videos/gaza-field.mp4` |
