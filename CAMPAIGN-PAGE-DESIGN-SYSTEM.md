# Campaign Page Design System

> A comprehensive specification for building high-converting, SEO-optimised campaign pages on DeenRelief.org. Derived from the `/palestine` page — the reference implementation that sets the standard for all other campaign pages.
>
> **Source of truth:** `/src/app/palestine/` — every pattern in this document is extracted from what has been built and verified on the Palestine page, not from theory.
>
> **Key constraint:** The Palestine page has a donation form integrated into the mobile hero. This is a **Palestine-only exception** due to its emergency appeal nature. All other campaign pages use the standard hero with a CTA button that scrolls to the donation section below.

---

## 1. Design Principles

These principles drive every decision in the system. When in doubt, refer back here.

1. **Keyword-first H1, emotion-second sub-headline.** Google Ads scans H1 for keyword match. The H1 must echo what people search ("Donate to [cause]", "Sponsor an Orphan", "Pay Zakat"). The emotional hook lives in an italic sub-headline directly below. This pattern gets both Quality Score wins and conversion.

2. **Proof over promise.** Every section should show evidence of real work — specific locations, dated photos, video, charity registration numbers, partner logos. Generic stock imagery or vague claims are banned.

3. **Trust signals at every decision point.** The moments where a donor decides whether to act are: (a) hero first impression, (b) donation form CTA, (c) bottom of page after reading. Each of these moments must have visible trust markers (charity number, donor count, Gift Aid, payment methods).

4. **Server component by default, client islands for interactivity only.** Campaign pages must be server components. Only components requiring `useState` (DonationForm, FaqAccordion, MiniDonationPicker) are client components. This minimises JavaScript sent to the browser and improves LCP.

5. **Mobile-first, desktop-enhanced.** Design for 375px viewport first. Desktop (1280px+) adds multi-column layouts and wider containers. Tablet (768px) gets the mobile layout with minor spacing adjustments — never a unique third layout.

6. **Every link earns its place.** Internal links to `/zakat`, `/sadaqah`, `/about`, `/blog/*`, and external links to Charity Commission register must be contextually relevant, not decorative. Each link should help a specific user segment complete their intent.

---

## 2. File Structure

Every campaign page consists of these files:

```
src/app/{campaign-slug}/
  layout.tsx          — Metadata (title, description, OG, Twitter) + DonateAction schema via helper
  page.tsx            — Server component. Imports and composes all sections.
  DonationForm.tsx    — Client component. Donation amount picker + CTA + trust signals.
  FaqAccordion.tsx    — Client component. Expandable FAQ with optional action links.
  MiniDonationPicker.tsx — Client component. Stripped-down picker for the Final CTA section.
```

### Shared dependencies (do not duplicate per page)

| File | Purpose |
|---|---|
| `src/lib/donationSchema.ts` | `buildDonationPageSchema()` — generates WebPage + FundraisingEvent + DonateAction JSON-LD |
| `src/components/Header.tsx` | Site header (shared) |
| `src/components/Footer.tsx` | Site footer (shared) |
| `src/components/Partners.tsx` | Partner logos grid (shared, 3x2 mobile / single row desktop) |
| `src/components/Button.tsx` | Primary/secondary/outline button with smart hash-link handling |
| `src/components/ProofTag.tsx` | Location + date evidence tag overlaid on images |
| `src/components/JsonLd.tsx` | Renders `<script type="application/ld+json">` |
| `src/components/BreadcrumbSchema.tsx` | Breadcrumb structured data |

---

## 3. Page Architecture — Section Order

Every campaign page follows this exact section order. Sections marked **[required]** must always be present. Sections marked **[optional]** can be included if the campaign has the content to support them.

| # | Section | Background | Required | Container |
|---|---|---|---|---|
| 1 | **Hero** | Full-bleed image with gradient | [required] | `max-w-7xl` |
| 2 | **Donation Panel** | `bg-white` | [required] | `max-w-7xl` |
| 3 | **Partners** | `bg-white` | [required] | `max-w-5xl` |
| 4 | **What Your Donation Funds** | `bg-cream` | [required] | `max-w-7xl` |
| 5 | **Field Evidence** | `bg-white` | [required] | `max-w-[1600px]` (wider) |
| 6 | **Delivery Assurance** | `bg-cream` | [required] | `max-w-7xl` |
| 7 | **FAQ** | `bg-white` | [required] | `max-w-3xl` |
| 8 | **Final CTA** | `bg-green-dark` | [required] | `max-w-2xl` |

**Background alternation rule:** white → white (donation + partners) → cream → white → cream → white → green-dark. This creates visual rhythm without jarring contrasts.

---

## 4. SEO Specification

### 4.1 layout.tsx — Metadata

Every campaign layout must:

```tsx
const title = "Donate to [Cause] | Deen Relief";   // or "Sponsor an Orphan | Deen Relief"
const description = "[Specific claim with number]. 3,200+ donors since 2013. Gift Aid eligible. Charity No. 1158608.";
```

Rules:
- **Title** must contain the primary keyword users search for. Under 60 characters.
- **Title must match the H1** on the page — Google checks title-to-H1 consistency for both organic ranking and ad Quality Score.
- **Description** must include a concrete number (donor count, years active, specific price), "Gift Aid eligible", and "Charity No. 1158608". Under 160 characters.
- **Title and description are shared** across `metadata.title`, `openGraph.title`, `twitter.title`, `metadata.description`, `openGraph.description`, `twitter.description` — use a const to avoid drift.

### 4.2 Structured data

Every layout must call `buildDonationPageSchema()` and render via `<JsonLd />`:

```tsx
const donationSchema = buildDonationPageSchema({
  slug: "orphan-sponsorship",
  canonicalPath: "/orphan-sponsorship",
  pageName: title,
  pageDescription: description,
  fundraisingName: "Orphan Sponsorship Programme",
  fundraisingDescription: "Monthly sponsorship providing education, nutrition, safe shelter, and healthcare to orphans in Bangladesh.",
  location: { name: "Bangladesh", country: "BD" },  // omit for non-geographic campaigns
  minPrice: 30,                                       // campaign-specific minimum
});
```

Additionally, `page.tsx` must render:
- `<BreadcrumbSchema />` with the campaign name
- `<JsonLd data={faqSchema} />` with the FAQ data

### 4.3 H1 + sub-headline pattern

```
[EYEBROW — amber, uppercase, 11px, tracking-wide]
Campaign Name or Appeal Label

[H1 — keyword-matched, serif, bold]
Donate to [Cause/Location] [Type]

[SUB-HEADLINE — serif, italic, white/90, slightly smaller than H1]
Emotional one-liner that creates urgency or connection.

[BODY — 14-15px, white/65, max 2 lines]
One sentence explaining what the donation provides and how it's delivered.
```

**H1 examples by campaign:**
- Palestine: "Donate to Gaza Emergency Relief"
- Orphan Sponsorship: "Sponsor an Orphan in Bangladesh"
- Cancer Care: "Support Cancer Care for Refugee Children"
- Build a School: "Build a School in Rural Bangladesh"
- Clean Water: "Fund Clean Water in Bangladesh"
- UK Homeless: "Support Brighton's Homeless Community"
- Zakat: "Pay Your Zakat With Confidence"
- Sadaqah: "Give Sadaqah and Sadaqah Jariyah"

**Sub-headline examples:**
- Palestine: *"A family in Gaza needs you right now."*
- Orphan Sponsorship: *"Every child deserves a chance to grow up safe."*
- Cancer Care: *"No child should face cancer alone and far from home."*
- UK Homeless: *"Rain or shine, every week since 2013."*
- Zakat: *"100% of your Zakat reaches those who need it most."*

---

## 5. Hero Section

### 5.1 Structure

```
<section> (relative, full-bleed image background)
  <Image> (absolute fill, object-cover, priority)
  <gradient overlays> (left-to-right dark + bottom-to-top dark)
  <content container> (relative z-10, max-w-7xl, py-12 md:py-16 lg:py-20)
    <text column> (max-w-[22rem] sm:[26rem] md:[28rem])
      [EYEBROW]
      [H1]
      [SUB-HEADLINE]
      [BODY]
      [TRUST ROW] — Charity No. · 100% to Relief · Gift Aid Eligible
      [CTA BUTTON] — scrolls to #donate-form
    </text column>
  </content container>
  <ProofTag> (bottom-right)
</section>
```

### 5.2 Responsive behavior

| Breakpoint | Behavior |
|---|---|
| **Mobile (< md)** | No min-height. Content flows naturally. Text stacks. CTA button visible and scrolls to donation section below. **No donation form in hero** (Palestine is the exception). |
| **Tablet (md–lg)** | `min-h-[50vh]`, `flex items-end`. Content pushed to bottom of hero image area. |
| **Desktop (lg+)** | Same as tablet. Text column left-aligned on the image. |

### 5.3 Gradient overlay

Two overlays stacked:
1. **Left-to-right** — dark on the left (text readable) fading to transparent on the right (image visible):
   ```
   rgba(26,26,46,0.93) 0% → rgba(26,26,46,0.06) 100%
   ```
2. **Bottom-to-top** — ensures text at the bottom is always readable:
   ```
   rgba(26,26,46,0.45) 0% → transparent 45%
   ```

### 5.4 Hero trust row

```tsx
<div className="flex flex-wrap items-center gap-2.5 mb-7 text-[11px] text-white/45 font-medium">
  <span>Charity No. 1158608</span>
  <span className="text-white/20">·</span>
  <span>100% to Relief</span>
  <span className="text-white/20">·</span>
  <span>Gift Aid Eligible</span>
</div>
```

This row is identical across all campaigns. Do not customise.

### 5.5 Palestine exception — mobile hero donation form

**Only the Palestine page** renders `<DonationForm />` inside the hero on mobile (wrapped in a white card, `lg:hidden`). This is because Palestine is the primary emergency appeal and the above-fold donation form is critical for ad-driven traffic.

All other campaign pages render the standard CTA button on mobile that scrolls to `#donate-form`:

```tsx
<Button variant="primary" href="#donate-form">
  Donate Now
</Button>
```

---

## 6. Donation Panel (Section 2)

### 6.1 Layout

| Breakpoint | Layout |
|---|---|
| **Mobile** | Full-width, stacked: image (aspect-[5/4]) then form below |
| **Desktop (lg+)** | Two-column grid: image left (aspect-[5/4]), form right |

```tsx
<section id="donate-form" className="pt-16 md:pt-24 pb-4 md:pb-6 bg-white">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="grid lg:grid-cols-2 gap-10 lg:gap-12 items-center">
      <div className="relative rounded-2xl overflow-hidden aspect-[5/4]">
        <Image ... />
        <ProofTag ... />
      </div>
      <DonationForm />
    </div>
  </div>
</section>
```

**Palestine exception:** This section is `hidden lg:block` because mobile has the form integrated into the hero. For all other campaigns, this section is **always visible** on all breakpoints.

### 6.2 DonationForm component specification

This is the most important component on the page. It must be extracted as a separate client component per campaign.

**Props:** None. All data (amounts, outcomes, campaign slug) is defined inside the component.

**Internal state:**
- `frequency: "one-time" | "monthly"`
- `selectedAmount: number` (default varies per campaign)
- `customAmount: string`

**Derived values:**
- `isCustom` — whether the user has typed a custom amount
- `currentOutcome` — the impact statement for the selected/floored amount
- `customAmountError` — validation message (minimum £5)
- `amountForUrl` — the amount to pass in the donate URL
- `isAmountValid` — whether the CTA should be enabled

**Visual structure (top to bottom):**

1. **Eyebrow** — "Urgent Appeal" or campaign-specific label
2. **H2** — "Help a Family Survive Today" or campaign-specific emotional CTA
3. **Subhead** — "Takes under 2 minutes. Your £100 becomes £125 with Gift Aid."
4. **Trust line** — "Trusted by 3,200+ donors since 2013" (green, xs, font-semibold)
5. **Frequency toggle** — One-time / Monthly pill, `role="group"`, `aria-label`, `aria-pressed`
6. **Amount grid** — 2-col mobile / 4-col sm+, with "Popular" badge on default
7. **Custom amount input** — with min validation, error state (red border + message), `inputMode="numeric"`
8. **Outcome label** — green checkmark + impact statement (exact tier or floor for custom amounts)
9. **Gift Aid callout** — dynamic "With Gift Aid: £X at no extra cost"
10. **CTA button** — "Donate £X Now" or disabled "Enter £5 or more to continue"
11. **Payment methods row** — padlock + "Secure checkout · Apple Pay · Google Pay · Card"
12. **Trust microcopy** — "100% to emergency relief · Reg. charity 1158608"
13. **Zakat/Sadaqah recovery** — "Paying Zakat or Sadaqah instead? Pay Zakat · Give Sadaqah" (separator + links)

**CTA routing pattern:**
```
/donate?campaign={slug}&amount={amount}&frequency={frequency}
```

### 6.3 Donation amount data shape

```ts
export const donationAmounts = {
  "one-time": [
    { value: 25, label: "£25", outcome: "...", default?: true },
    ...
  ],
  monthly: [
    { value: 10, label: "£10", outcome: "...", default?: true },
    ...
  ],
};
```

**Rules:**
- Exactly 4 tiers per frequency (fits the 2x2 mobile / 4x1 desktop grid)
- One tier per frequency marked `default: true` — this gets the "Popular" badge and is pre-selected
- Outcomes must be specific and declarative ("Feeds a family of five for one month"), not vague ("Helps people in need")
- Export `donationAmounts`, `MIN_AMOUNT`, and `Frequency` type so `MiniDonationPicker` can import them

### 6.4 Validation

- Minimum: `£5` (defined as `MIN_AMOUNT = 5`)
- No maximum (large donors must not be blocked)
- Below minimum: red border on input, "Minimum £5" error text, CTA disabled with "Enter £5 or more to continue"
- `aria-invalid` + `aria-describedby` on the input when error is present

---

## 7. Partners Section

Shared `<Partners />` component. No per-campaign configuration.

| Breakpoint | Layout |
|---|---|
| **Mobile (< sm)** | `grid-cols-3`, 2 rows of 3, `max-h-[72px]` logos |
| **sm and up** | Single flex row, `max-h-[75px]` logos |

---

## 8. "What Your Donation Funds" (Section 4)

### 8.1 Layout

| Breakpoint | Layout |
|---|---|
| **Mobile** | Stacked: eyebrow + H2 → **inline image** (aspect-[4/3]) → body paragraph → bullet list |
| **Desktop (lg+)** | Two-column grid: text column left, image right (`min-h-[300px]`) |

**Mobile image strategy:** On mobile, the image appears **between the H2 and the body paragraph**, not at the bottom. This restores photographic proof immediately after the hero content. Use `lg:hidden` on the mobile image and `hidden lg:block` on the desktop image.

### 8.2 Bullet list pattern

4 items, each with a green checkmark icon, bold title, and description:

```tsx
{[
  { title: "Food & Clean Water", description: "£50 delivers a month of meals and clean water for a family of five" },
  { title: "Medical Supplies", description: "Urgent care supplies, trauma kits, and medication" },
  ...
].map(item => (
  <div className="flex gap-3 items-start">
    <svg className="w-5 h-5 text-green flex-shrink-0 mt-0.5">...</svg>
    <div>
      <p className="font-heading font-semibold text-[0.9375rem] text-charcoal">{item.title}</p>
      <p className="text-grey text-[0.8125rem] leading-[1.6]">{item.description}</p>
    </div>
  </div>
))}
```

**Content rule:** Where possible, tie each bullet to a specific £ amount from the donation tiers. This mirrors the donation form's outcome labels and creates a consistency loop ("I saw £50 feeds a family → now I see it again in the evidence section → I trust it").

---

## 9. Field Evidence (Section 5)

### 9.1 Container

Uses a **wider container** than other sections: `max-w-[1600px]` (vs `max-w-7xl` elsewhere). This gives the media grid room to breathe and makes the images/video impactful.

### 9.2 Content options

Campaigns may have:
- **3 photos** (minimum, every campaign should have this)
- **1 video + 2 photos** (preferred if video exists)
- **2 photos** (acceptable if content is limited)

### 9.3 Layout — 3 photos (no video)

| Breakpoint | Layout |
|---|---|
| **Mobile** | Stacked, `gap-3`, each `aspect-[3/4]` |
| **Desktop (lg+)** | `grid-cols-3`, `gap-3`, each `aspect-[3/4]` |

### 9.4 Layout — 1 video + 2 photos

| Breakpoint | Layout |
|---|---|
| **Mobile** | Stacked: video (`aspect-[4/5]`) → 2 photos (`aspect-[3/4]`) |
| **Desktop (lg+)** | 2-column grid (`gap-4`): video left (`aspect-square`), 2 photos stacked right (`grid-rows-2 gap-4`) |

### 9.5 Video element specification

```tsx
<video
  className="w-full h-full object-cover"
  src="/videos/{campaign}-field.mp4"
  poster="/images/{campaign}-poster.jpeg"
  preload="metadata"
  playsInline          // required for iOS
  muted                // required for autoplay
  loop
  autoPlay
  controls             // show controls — this is content, not background
/>
```

**Every image and video** in this section must have a `<ProofTag />` with at minimum a location. Date is optional but preferred.

### 9.6 Section header

Centered, `max-w-2xl mx-auto mb-10`:
- Eyebrow: "On the Ground"
- H2: Campaign-specific ("We Don't Send Aid From a Distance", "Our Teams Are On the Ground in Bangladesh", etc.)
- Body: One sentence about physical presence

---

## 10. Delivery Assurance (Section 6)

### 10.1 Structure

Centered header + 3-step horizontal grid + trust stats row.

### 10.2 Three-step process

```
[01] We Verify       [02] We Allocate       [03] We Report
```

Each step: number (green/20, 3xl), title (bold, lg), description (grey/80, 0.8125rem).

**Content rules:**
- Step 1 describes how needs are identified on the ground
- Step 2 describes how funds are directed
- Step 3 references the Charity Commission and audited reports
- Descriptions should be campaign-specific, not copy-pasted from Palestine

### 10.3 Trust stats row

```
Charity No. 1158608 | 100% to relief | Audited annually | Gift Aid eligible
```

This row is **identical across all campaigns**. Do not customise.

---

## 11. FAQ (Section 7)

### 11.1 Required questions

Every campaign page must have **at least 5 FAQs**. The following 3 are **mandatory** (answers are campaign-specific):

1. **"How does my donation reach [beneficiaries]?"** — explains the delivery mechanism. Link to `/about`.
2. **"Is my donation eligible for Gift Aid?"** — standard Gift Aid explanation.
3. **"How is Deen Relief regulated?"** — references Charity Commission (1158608) + Companies House (08593822). Link to Charity Commission register.

The following are **recommended** (include if relevant):

4. **"Can I pay my Zakat here, or give Sadaqah instead?"** — with links to `/zakat`, `/sadaqah`, and a relevant blog post. Lead with "Yes" if the campaign is Zakat-eligible.
5. **"Can I set up a monthly donation?"** — for campaigns that support recurring giving.
6. **"How much goes to administration?"** — "no more than 10% on admin". Link to `/about`.
7. **Campaign-specific question** — e.g. "What does £30/month cover?" for orphan sponsorship, "What is Gulucuk Evi?" for cancer care.

### 11.2 FAQ data shape

```ts
const faqs = [
  {
    question: "...",
    answer: "...",
    links?: [
      { href: "/about", label: "About our team" },
      { href: "https://external-url.gov.uk", label: "External resource" },
    ],
  },
];
```

**Rules:**
- `answer` is plain text (no HTML). This text is reused verbatim in the FAQPage JSON-LD schema.
- `links` is optional. Internal links use Next.js `<Link>`. External links auto-detect and add `target="_blank" rel="noopener noreferrer"`.
- Blog post links should be contextually relevant (e.g. Zakat FAQ links to `/blog/zakat-vs-sadaqah-difference`).
- Every FAQ answer should be factual and specific. Avoid hedging language ("may", "could", "possibly") — lead with "Yes" or "No" where applicable.

### 11.3 FaqAccordion component

Shared client component. Accepts `faqs: Faq[]` prop. Renders expandable items with `aria-expanded`, chevron animation, and optional action links below each answer.

---

## 12. Final CTA with MiniDonationPicker (Section 8)

### 12.1 Structure

```
<section> (bg-green-dark, py-12 md:py-16)
  <container> (max-w-2xl, text-center)
    <h2> (white, serif bold) — "[Beneficiary] Needs Your Help Today"
    <p> (white/55, sm) — "Every donation verified. Every pound tracked."
    <MiniDonationPicker />
  </container>
</section>
```

### 12.2 MiniDonationPicker specification

Stripped-down donation picker for dark backgrounds. No eyebrow, no H2, no outcome labels, no trust microcopy, no Zakat recovery. Just the essentials:

1. **Trust signal** — "Trusted by 3,200+ donors since 2013" (amber text)
2. **Frequency toggle** — cream selected pill on white/10 track
3. **Amount grid** — 2-col mobile / 4-col sm+. Selected: `bg-cream border-amber`. Unselected: `bg-white/5 border-white/25 text-white`.
4. **Custom amount input** — `bg-white/5 text-white`, amber border when active
5. **Gift Aid callout** — "With Gift Aid: £X at no extra cost" (white/60)
6. **CTA button** — amber, centered
7. **Payment methods** — padlock + "Secure checkout · Apple Pay · Google Pay · Card" (white/45)

**Imports data from DonationForm:** `donationAmounts`, `MIN_AMOUNT`, `Frequency` — single source of truth per campaign.

---

## 13. Responsive Summary

### Mobile (< 640px / default)
- Everything stacked vertically
- Amount grid: `grid-cols-2`
- Partners: `grid-cols-3` (2 rows)
- Field Evidence: stacked images/video
- Hero: text flows naturally, no min-height
- Donation form: full-width in its own section (scrolled to via CTA button)
  - **Exception: Palestine** has the form in the hero

### Tablet (640px – 1023px)
- Inherits mobile layout with minor spacing increases
- Amount grid: `grid-cols-4` (sm breakpoint)
- Partners: single flex row (sm breakpoint)
- Field Evidence images: `grid-cols-3` (sm breakpoint) — only for 3-photo layout
- Hero: `min-h-[50vh]`, `flex items-end` (md breakpoint)
- **No unique tablet-specific layouts.** Tablet is "bigger mobile" not "smaller desktop".

### Desktop (1024px+)
- Two-column grids activate (lg breakpoint)
- Donation panel: image left, form right
- "What Your Donation Funds": text left, image right
- Field Evidence (video): video left square, 2 images stacked right (wider container)
- Field Evidence (no video): 3-column grid
- Hero: `min-h-[50vh]`, text left-aligned on image

---

## 14. Accessibility Checklist

Every campaign page must pass these:

- [ ] Frequency toggle has `role="group"` + `aria-label="Donation frequency"`
- [ ] Frequency buttons have `aria-pressed` (dynamic)
- [ ] Custom amount input has `aria-label`, `aria-invalid`, `aria-describedby` (when error exists)
- [ ] FAQ buttons have `aria-expanded` (dynamic)
- [ ] All images have descriptive `alt` text (not "image" or "photo")
- [ ] All decorative SVGs have `aria-hidden="true"`
- [ ] External links have `target="_blank"` + `rel="noopener noreferrer"`
- [ ] Video has `controls` attribute (not just autoplay with no user control)
- [ ] Validation errors use `role="alert"` for screen reader announcement
- [ ] Page has a single `<h1>` (in the hero)
- [ ] H2s follow logical document order (no skipping heading levels)
- [ ] All interactive elements are keyboard-accessible (no `onClick` without a `<button>`)

---

## 15. Performance Requirements

- [ ] `page.tsx` is a **server component** (no `"use client"` directive)
- [ ] Only `DonationForm.tsx`, `FaqAccordion.tsx`, and `MiniDonationPicker.tsx` are client components
- [ ] Hero image uses `priority` prop (preloaded for LCP)
- [ ] Below-fold images rely on Next/Image default lazy loading
- [ ] Video uses `preload="metadata"` (not `preload="auto"`)
- [ ] No unused imports or dead code
- [ ] Donation data constants are exported and reused (not duplicated between DonationForm and MiniDonationPicker)

---

## 16. Content Customisation Per Campaign

When applying this system to a new campaign, these elements must be customised:

### Must change
- H1 text (keyword-matched for the campaign)
- Sub-headline (emotional hook for the campaign)
- Hero image + alt text
- Hero body paragraph
- Donation amounts and outcomes (all 8 tiers: 4 one-time + 4 monthly)
- Default frequency and default amount
- DonationForm H2 + eyebrow
- "What Your Donation Funds" H2, body, bullet list (4 items)
- "What Your Donation Funds" image(s)
- Field Evidence images/video + alt text + ProofTag locations/dates
- Delivery Assurance 3-step descriptions
- FAQ questions and answers (at least 5, with campaign-specific links)
- Final CTA H2 + subhead
- layout.tsx: title, description, donationSchema config
- CTA route: `/donate?campaign={slug}&...`

### Keep identical
- Hero trust row (Charity No. · 100% to Relief · Gift Aid Eligible)
- Delivery Assurance trust stats row
- DonationForm trust microcopy ("100% to emergency relief · Reg. charity 1158608")
- DonationForm payment methods row
- DonationForm Zakat/Sadaqah recovery links
- DonationForm validation logic and min amount
- MiniDonationPicker trust signal, Gift Aid callout, payment methods row
- Partners section
- FaqAccordion component
- All shared components
- Section padding rhythm (`py-16 md:py-24`)
- Background alternation (white → white → cream → white → cream → white → green-dark)
- Container widths per section

---

## 17. Migration Guide — Converting an Existing Campaign Page

Step-by-step process to bring a legacy campaign page (e.g. `/orphan-sponsorship`) up to the Palestine standard:

### Phase 1: File restructure (30 min)

1. **Create `DonationForm.tsx`** — extract the donation state, amount data, form JSX, validation, and trust signals from `page.tsx`. Export `donationAmounts`, `MIN_AMOUNT`, `Frequency`.
2. **Create `FaqAccordion.tsx`** — copy from Palestine (component is reusable as-is, just takes `faqs` prop).
3. **Create `MiniDonationPicker.tsx`** — copy from Palestine, update the campaign slug in the CTA href.
4. **Convert `page.tsx` to server component** — remove `"use client"`, remove `useState` import, remove inline state. Import the 3 client components.

### Phase 2: SEO alignment (15 min)

5. **Update `layout.tsx`** — align `title` const with the new keyword-matched H1. Ensure `description` contains a number + "3,200+ donors" + charity number. Verify `donationSchema` config matches.
6. **Rewrite H1** in page.tsx — keyword-matched, matching title tag.
7. **Add emotional sub-headline** — italic serif line below H1.
8. **Add eyebrow** above H1 — campaign appeal name, amber, uppercase.

### Phase 3: Section upgrades (45 min)

9. **Hero** — add gradient overlays (if not present), trust row, ProofTag. On mobile: standard CTA button (not Palestine's inline form). On desktop: CTA scrolls to `#donate-form`.
10. **Donation panel** — replace inline form with `<DonationForm />`. Add `id="donate-form"` to section.
11. **"What Your Donation Funds"** — add mobile-only inline image between H2 and body paragraph. Add `hidden lg:block` to desktop image. Rewrite bullet descriptions with £-specific outcomes.
12. **Field Evidence** — widen container to `max-w-[1600px]`. If video exists, use video+2 layout. Add ProofTags to all media.
13. **FAQ** — replace inline accordion with `<FaqAccordion faqs={faqs} />`. Add contextual links (at minimum: `/about` on Q1, Charity Commission register on regulation Q). Add Zakat/blog links if relevant.
14. **Final CTA** — replace button-only section with `<MiniDonationPicker />` inside the existing dark green section.

### Phase 4: Verification (15 min)

15. **Build check** — `npm run build` must pass with no errors.
16. **Schema check** — verify FAQPage, BreadcrumbList, and WebPage/DonateAction schemas render in HTML.
17. **Responsive check** — test at 375px, 768px, 1280px, 1440px viewports.
18. **Accessibility check** — verify all aria attributes, alt texts, keyboard navigation.
19. **Link check** — verify all internal links (`/about`, `/zakat`, `/sadaqah`, `/blog/*`) resolve to 200.

**Estimated total time per campaign: ~2 hours.**

---

## 18. Campaign-Specific Notes

Quick-reference for what makes each campaign unique vs the standard template.

### Palestine (`/palestine`) — REFERENCE IMPLEMENTATION
- **Exception:** mobile hero donation form (unique to this page)
- **Exception:** desktop donation section is `hidden lg:block` (mobile handled by hero)
- **Has video:** field evidence uses 1 video + 2 photos layout
- **Default frequency:** one-time, £50
- **Zakat-eligible:** FAQ confirms yes, with scholarly reference

### Orphan Sponsorship (`/orphan-sponsorship`)
- **Default frequency:** monthly (this is a sponsorship programme, not a one-off donation)
- **Default amount:** £30/month
- **Key differentiator:** ongoing relationship with a specific child
- **FAQ must explain:** what £30/month covers, how the child is selected, how donors get updates

### Cancer Care (`/cancer-care`)
- **Location:** Adana, Turkey (Gulucuk Evi centre)
- **Default frequency:** one-time, £100
- **Key differentiator:** specific named centre, specific medical context
- **FAQ must explain:** what Gulucuk Evi is, what cancer types, how children are referred

### Build a School (`/build-a-school`)
- **Location:** Bangladesh
- **Key differentiator:** Sadaqah Jariyah framing (ongoing reward)
- **FAQ should reference:** `/blog/what-is-sadaqah-jariyah`

### Clean Water (`/clean-water`)
- **Location:** Bangladesh
- **Key differentiator:** Sadaqah Jariyah framing, tangible outcome (one tube well)
- **FAQ should reference:** `/blog/what-is-sadaqah-jariyah`

### UK Homeless (`/uk-homeless`)
- **Location:** Brighton, UK
- **Key differentiator:** domestic campaign, weekly outreach, 12+ year track record
- **Proof angle:** longevity ("never missed a week since 2013")
- **Different audience:** may attract non-Muslim donors — Zakat FAQ less relevant

### Zakat (`/zakat`)
- **No specific location** (distributed to eligible recipients)
- **Key differentiator:** 100% Zakat policy, scholarly compliance
- **FAQ must explain:** 8 categories of Zakat recipients, how eligibility is verified
- **Blog links:** heavy linking to Zakat blog posts (7 posts available)
- **Default frequency:** one-time, £100

### Sadaqah (`/sadaqah`)
- **No specific location** (distributed globally)
- **Key differentiator:** no minimum, Sadaqah Jariyah option
- **FAQ should reference:** `/blog/what-is-sadaqah-jariyah`, `/blog/best-time-to-give-sadaqah`
- **Blog links:** heavy linking to Sadaqah blog posts (4 posts available)
