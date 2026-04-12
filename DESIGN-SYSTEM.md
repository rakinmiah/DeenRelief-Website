# Deen Relief Design System

---

## 1. Executive Summary

This design system is extracted from the completed Deen Relief homepage. It codifies every visual, typographic, layout, and interaction decision into reusable rules so that the rest of the site can be built faster, more consistently, and without losing what makes Deen Relief distinctive.

The system serves three goals: (1) preserve the "Proof & Proximity" differentiator across all pages, (2) maintain visual consistency without making every page identical, and (3) give Claude Code clear, build-ready guidance for implementation.

The homepage is the source of truth. Everything in this document is derived from what has actually been built, not from theory.

---

## 2. Homepage-as-Source-of-Truth Audit

### What the homepage has established as a system

**Strong and repeatable:**
- Colour palette (green/amber/charcoal/cream) — consistent across all sections
- Typography pairing (Source Serif 4 headings + DM Sans body) — applied everywhere
- Section padding rhythm (`py-16 md:py-24` for major sections) — standardised
- Container pattern (`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`) — consistent
- Button component with three clear variants (primary/secondary/outline) and three sizes
- ProofTag component with consistent styling and positioning rules
- Card hover pattern (`hover:shadow-md hover:-translate-y-1`) — standardised
- Section label/eyebrow pattern (`text-[11px] font-bold tracking-[0.1em] uppercase text-green`) — consistent
- H2 heading pattern (`text-3xl sm:text-4xl font-heading font-bold text-charcoal leading-tight`) — consistent
- Body text pattern (`text-grey text-base sm:text-[1.0625rem] leading-[1.7]`) — consistent
- Background alternation logic (white/cream/green-dark) — established

**Still slightly one-off:**
- Partners section uses `text-sm` for its label while all other section labels use `text-[11px]` — should be standardised
- Impact stat boxes use a different visual treatment from TrustBar stats — two stat systems on one site
- Newsletter input uses `rounded-lg` while Newsletter button uses `rounded-full` — mixed radius in one form
- Campaign card descriptions use `text-sm leading-relaxed` while other body text uses `text-base sm:text-[1.0625rem] leading-[1.7]` — card body text is a separate tier
- CancerCareCentres service card text uses `text-[0.8125rem] leading-[1.6]` — a third body text tier

### System readiness verdict

The homepage is approximately 85% system-ready. The colour, typography, spacing, and component foundations are solid. The remaining 15% is minor inconsistencies in body text tiers and stat display patterns that can be resolved by defining clear tiers in this system.

---

## 3. Core Design Principles

1. **Restrained authority.** The site must feel credible and competent without feeling corporate. Generous whitespace, calm typography, and muted colours signal quality. Nothing should shout.

2. **Proof over promise.** Every visual decision should favour evidence (specific locations, real photography, verifiable numbers) over generic emotional appeals. Show the work, don't just describe it.

3. **Proximity over distance.** Images should show human connection — workers with beneficiaries, faces, hands, the space between people. Not buildings, not wide establishing shots, not stock photography.

4. **Warmth without sentimentality.** The palette (warm cream, amber accents, organic green) and typography (editorial serif headings) create warmth. But the tone is confident and specific, never pitying or guilt-driven.

5. **Consistency without sameness.** Sections share a common system (same fonts, same padding, same button styles) but vary through background colour, layout pattern, and content density. No two adjacent sections should use the same layout structure.

---

## 4. Brand and Differentiator Translation

### What makes the site feel like Deen Relief

- **Source Serif 4 headings** — editorial voice that no competitor uses (they are all 100% sans-serif)
- **Green-dominant palette** — preserves the existing brand identity
- **Amber/gold CTAs** — warm, inviting action colour that avoids the red urgency of competitors
- **ProofTags on images** — small location/date labels that prove physical presence
- **Real field photography** — never stock, always from actual Deen Relief operations
- **Generous spacing** — the site breathes in a way competitors' dense layouts do not

### What must never be lost

- The serif/sans-serif pairing
- The green brand colour as the dominant identity colour
- The amber CTA colour (not red, not blue)
- ProofTags as a consistent image treatment
- Real photography from the field
- The calm, breathing layout rhythm
- The trust microcopy pattern near donation interactions

### How Proof & Proximity manifests

| Element | How it works |
|---|---|
| ProofTag | Location labels on 40-60% of images, proving where the charity operates |
| Image selection | Prefer images showing Deen Relief workers WITH beneficiaries, not observing from outside |
| Image cropping | Crop tighter than instinct suggests — faces, hands, connection points |
| Outcome labels | "Feeds a displaced family in Gaza for one week" — tangible, specific, located |
| Trust microcopy | "100% to emergency relief · Reg. charity 1158608" — near every donation ask |
| Stat presentation | Real numbers, not rounded generics. "3,200+" not "thousands" |

---

## 5. Colour System

### Primary palette

| Token | Hex | Usage |
|---|---|---|
| `green` | `#2D6A2E` | Brand primary. Section labels, active states, links, icons, secondary buttons |
| `green-dark` | `#1B4D1C` | Dark backgrounds (TrustBar, Newsletter), stat values, emphasis |
| `green-light` | `#E8F5E9` | Selected states, icon backgrounds, stat box tint |
| `amber` | `#D4A843` | Primary CTA buttons, urgent badges |
| `amber-dark` | `#B8912E` | CTA hover states, badge text on light amber |
| `amber-light` | `#FDF3DC` | Badge backgrounds (Urgent Appeal) |

### Neutrals

| Token | Hex | Usage |
|---|---|---|
| `charcoal` | `#1A1A2E` | Primary text, footer background |
| `grey` | `#6B7280` | Body text, secondary descriptions |
| `grey-light` | `#F3F4F6` | Toggle backgrounds, form elements |
| `cream` | `#FDF8F0` | Alternating section backgrounds |
| `white` | `#FFFFFF` | Primary backgrounds, card surfaces |

### Opacity scale

Opacity is used extensively for text hierarchy and subtle UI:

| Usage | Opacity | Example |
|---|---|---|
| Primary text | 100% | Headings, values |
| Secondary text | 70% | Nav links (`text-charcoal/70`) |
| Tertiary text | 60% | Footer links (`text-white/60`) |
| Supporting text | 50-55% | Labels, subtitles |
| Quaternary text | 40-45% | Captions, micro-labels |
| Subtle borders | 5-15% | Section dividers, card borders |
| Tinted backgrounds | 8-12% | Hover states on dark backgrounds |

### Usage rules

- **Green dominates text accents** — labels, links, active states. Never used as a page background except in `green-dark` form.
- **Amber is reserved for primary actions only** — donate buttons, urgent badges, subscribe buttons. Never for text, headings, or decoration.
- **Cream and white alternate** for section backgrounds. Never use cream for two consecutive sections.
- **Green-dark** is used for maximum two full-width bands per page (currently TrustBar + Newsletter). Three would create green fatigue.
- **Charcoal** is only for the footer background and primary text colour. Not for section backgrounds.

---

## 6. Typography System

### Font families

| Role | Family | Weights | CSS Variable |
|---|---|---|---|
| Headings | Source Serif 4 | 400, 600, 700 | `--font-heading` |
| Body | DM Sans | 400, 500, 600, 700 | `--font-body` |

Source Serif 4 (serif) is used for ALL headings, stat values, and the footer wordmark. DM Sans (sans-serif) is used for everything else. This split is non-negotiable — it is the primary typographic differentiator from competitors.

### Type scale

| Level | Size | Weight | Line-height | Tracking | Font | Usage |
|---|---|---|---|---|---|---|
| **Display** | `text-[1.75rem] sm:text-[2.25rem] lg:text-[2.85rem]` | 700 | `1.12-1.18` | `-0.02em` | Heading | Hero headline only |
| **H2** | `text-3xl sm:text-4xl` | 700 | `tight` (1.25) | — | Heading | Section headings |
| **H3** | `text-lg` or `text-[1.0625rem]` | 600-700 | — | — | Heading | Card titles, subsection heads |
| **H4** | `text-[0.9375rem]` | 600 | — | — | Heading | Service card titles |
| **Eyebrow** | `text-[11px]` | 700 | — | `0.1em` | Body | Section labels, always uppercase |
| **Body** | `text-base sm:text-[1.0625rem]` | 400 | `1.7` | — | Body | Section descriptions |
| **Body small** | `text-sm` (14px) | 400-500 | `relaxed` (1.625) | — | Body | Card descriptions, supporting text |
| **Body XS** | `text-[0.8125rem]` (13px) | 400 | `1.6` | — | Body | Pathway descriptions, service details |
| **Caption** | `text-[11px]-text-xs` | 500-600 | — | — | Body | Trust labels, stat labels |
| **Micro** | `text-[10px]` | 600-700 | — | `0.1em` | Body | ProofTags, badges |
| **Button** | `text-sm / text-base / text-lg` | 600 | — | — | Body | Per button size variant |
| **Nav** | `text-sm` (14px) | 500 | — | `wide` | Body | Navigation links |
| **Nav active** | `text-[15px]` | 700 | — | `wide` | Body | Active page indicator |

### Typography rules

- **Serif (Source Serif 4)** is used only for: headings (H1-H4), stat values, and the footer wordmark. Never for body text, labels, buttons, or navigation.
- **Sans-serif (DM Sans)** is used for everything else.
- **Headings are always `text-charcoal`** on light backgrounds, `text-white` on dark backgrounds. Never grey, never green for headings.
- **Section eyebrows are always `text-green`**, uppercase, bold, with `tracking-[0.1em]`. This is a system-wide rule.
- **Body text is always `text-grey`** on light backgrounds. Not charcoal (too heavy), not green.
- **Maximum line length** for body text: `max-w-2xl` (42rem / ~672px) when centred, natural column width when in a grid.

---

## 7. Spacing, Grid, and Layout System

### Container widths

| Width | Token | Usage |
|---|---|---|
| 1280px | `max-w-7xl` | Standard page container. Used by most sections. |
| 1024px | `max-w-5xl` | Narrower content (Partners strip) |
| 896px | `max-w-4xl` | Compact content (TrustBar) |
| 672px | `max-w-2xl` | Centred text blocks (section intros, Impact header) |
| 576px | `max-w-xl` | Narrow content (Newsletter) |
| 448px | `max-w-md` | Form containers (Newsletter form) |

All containers use `mx-auto px-4 sm:px-6 lg:px-8` for consistent horizontal padding.

### Section vertical padding

| Section type | Padding | Usage |
|---|---|---|
| Major content section | `py-16 md:py-24` | FeaturedCampaign, CancerCare, GivingPathways, CampaignsGrid, Impact, OurStory |
| Utility section | `py-7 md:py-8` | TrustBar |
| Compact section | `py-12 md:py-14` | Newsletter |
| Custom top-heavy | `pt-14 md:pt-16 pb-2 md:pb-3` | Partners (sits close to module below) |
| Footer | `py-12 md:py-16` | Footer main area |

### Grid patterns

| Pattern | Classes | Usage |
|---|---|---|
| 2-column feature | `grid lg:grid-cols-2 gap-10 lg:gap-12 items-center` | FeaturedCampaign, OurStory |
| 2-column complex | `grid lg:grid-cols-2 gap-8 lg:gap-10` | CancerCareCentres |
| 3-column cards | `grid sm:grid-cols-2 lg:grid-cols-3 gap-4` | GivingPathways |
| 3-column cards (spaced) | `grid sm:grid-cols-2 lg:grid-cols-3 gap-6` | CampaignsGrid |
| 4-column stats | `grid grid-cols-2 lg:grid-cols-4 gap-5` | Impact, TrustBar |
| 4-column footer | `grid sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8` | Footer |
| Horizontal logos | `flex items-center justify-between gap-10 sm:gap-12 md:gap-16` | Partners |

### Spacing scale

The system uses Tailwind's default spacing scale plus custom extensions:

| Token | Value | Common usage |
|---|---|---|
| `0.5` | 2px | Micro margins (mb-0.5) |
| `1` | 4px | Tight gaps |
| `1.5` | 6px | Card title to description |
| `2` | 8px | Small internal spacing |
| `3` | 12px | Button internal padding, label to heading |
| `4` | 16px | Card grid gaps, icon to content |
| `5` | 20px | Medium spacing, stat grid gaps |
| `6` | 24px | Section intro to content |
| `8` | 32px | Heading block to grid, medium section gaps |
| `10` | 40px | Two-column grid gaps |
| `12` | 48px | Large section gaps |
| `16` | 64px | Section vertical padding (md) |
| `24` | 96px | Section vertical padding (md+) |

### Background alternation

The page uses this background rhythm:

```
Hero (transparent/image)
Partners (white)
FeaturedCampaign (white)
CancerCareCentres (cream)
GivingPathways (white)
TrustBar (green-dark)
CampaignsGrid (cream)
Impact (white)
OurStory (cream)
Newsletter (green-dark)
Footer (charcoal)
```

**Rules:**
- Never use cream for two consecutive sections
- Never use green-dark for two consecutive sections
- White can appear consecutively if separated by different layout patterns
- Green-dark is used for maximum two sections per page

---

## 8. Component System

### Button

**Purpose:** Primary interactive element for all actions.

| Variant | Background | Text | Hover | Usage |
|---|---|---|---|---|
| `primary` | `bg-amber` | `text-charcoal` | `bg-amber-dark` | Donate, Subscribe, primary actions |
| `secondary` | `bg-green` | `text-white` | `bg-green-dark` | Secondary CTAs (Support, View All, Read More) |
| `outline` | `transparent` | `text-white` | `bg-white/5` | Hero secondary CTA only (on dark backgrounds) |

| Size | Padding | Text | Radius |
|---|---|---|---|
| `sm` | `px-4 py-2` | `text-sm` | `rounded-full` |
| `md` | `px-6 py-3` | `text-base` | `rounded-full` |
| `lg` | `px-8 py-4` | `text-lg` | `rounded-full` |

**All buttons** use `rounded-full`. No exceptions. All buttons include `shadow-sm` (except outline), `transition-colors duration-200`, and focus ring `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green`.

### ProofTag

**Purpose:** Location/date evidence label on images.

- Position: `absolute bottom-3 left-3` or `bottom-3 right-3`
- Typography: `text-[10px] font-semibold uppercase tracking-[0.1em] text-white/80`
- Shadow: `text-shadow: 0 1px 4px rgba(0,0,0,0.6)`
- Z-index: `z-10`, `aria-hidden="true"`
- Format: `"LOCATION"` or `"LOCATION — DATE"`
- Maximum length: ~25 characters

**Rules:**
- Allowed on: Hero, campaign images, story images, feature images
- Not allowed on: icons, UI cards, stat sections, newsletter, footer, giving pathways
- Maximum one tag per image
- Aim for 40-60% of images on any given page

### Section Intro Block

**Purpose:** Standardised heading area for content sections.

**Structure:**
```
<Eyebrow> — text-[11px] font-bold tracking-[0.1em] uppercase text-green mb-3
<H2> — text-3xl sm:text-4xl font-heading font-bold text-charcoal leading-tight mb-3/mb-4
<Body> — text-grey text-base sm:text-[1.0625rem] leading-[1.7]
```

**Variants:**
- **Left-aligned** (default): Used in two-column layouts (FeaturedCampaign, CancerCare, OurStory)
- **Centre-aligned**: Used in full-width grid sections (GivingPathways, Impact). Add `text-center max-w-2xl mx-auto`

### Card — Campaign

**Purpose:** Clickable campaign preview card with image, title, description, and CTA.

- Container: `bg-white rounded-2xl overflow-hidden shadow-sm`
- Hover: `hover:shadow-md hover:-translate-y-1 transition-all duration-200`
- Image: `aspect-[16/10]` with `group-hover:scale-105 transition-transform duration-300`
- Content padding: `p-5`
- Title: `font-heading font-semibold text-lg text-charcoal mb-2`
- Description: `text-grey/80 text-sm leading-relaxed mb-4`
- CTA: `text-green text-sm font-medium` with arrow icon

### Card — Pathway

**Purpose:** Navigational card linking to a giving category.

- Container: `bg-white border border-charcoal/5 rounded-2xl p-6`
- Hover: `hover:shadow-md hover:-translate-y-1 transition-all duration-200`
- Icon: `w-11 h-11 rounded-xl bg-green/10 text-green` with `w-7 h-7` SVG
- Title: `font-heading font-bold text-[1.0625rem] text-charcoal mb-1.5`
- Description: `text-grey/80 text-[0.8125rem] leading-[1.6] mb-4`
- CTA: `text-green text-[0.8125rem] font-semibold` with arrow, hover translate

### Card — Service

**Purpose:** Informational card describing a service/feature (not clickable).

- Layout: `flex gap-4 items-start py-3`
- Icon: `w-10 h-10 rounded-lg bg-green-light text-green` with `w-5 h-5` SVG
- Title: `font-heading font-semibold text-[0.9375rem] text-charcoal mb-1`
- Description: `text-grey text-[0.8125rem] leading-[1.6]`

### Card — Stat (Impact)

**Purpose:** Display a key impact metric with animated number.

- Container: `bg-green-light/40 border border-green/8 rounded-xl p-6 md:p-8 text-center`
- Value: `text-3xl md:text-4xl font-heading font-bold text-green-dark mb-2`
- Label: `text-charcoal/50 text-sm font-medium`

### Trust Strip Item

**Purpose:** Compact credibility metric in the TrustBar.

- Value: `font-heading font-bold text-white text-2xl sm:text-[26px] tracking-tight`
- Label: `font-medium text-white/50 text-[11.5px]`
- Divider: `lg:border-r lg:border-white/15`

### Badge

**Purpose:** Status indicator on images or content.

**Variants:**
- **Urgent:** `text-[10px] font-bold tracking-[0.08em] uppercase text-amber-dark bg-amber-light px-3 py-1 rounded-md` — positioned absolute on images
- **Urgent (card):** `text-[11px] font-bold tracking-wider uppercase bg-amber text-charcoal px-3 py-1 rounded-full` — on campaign cards
- **Popular:** `text-[8px] bg-green text-white px-1.5 py-px rounded-full` — on amount buttons

### Donation Amount Button

**Purpose:** Selectable preset donation amount.

- Container: `py-3 px-4 rounded-xl text-center font-semibold border-2 transition-all duration-200`
- Selected: `border-green bg-green-light text-green`
- Unselected: `border-grey-light bg-white text-charcoal hover:border-green/40`
- Grid: `grid grid-cols-2 sm:grid-cols-4 gap-3`

### Frequency Toggle

**Purpose:** Switch between one-time and monthly donation.

- Container: `flex items-center gap-1 bg-grey-light rounded-full p-1 w-fit`
- Active: `px-4 py-1.5 rounded-full text-sm font-medium bg-white text-charcoal shadow-sm`
- Inactive: `px-4 py-1.5 rounded-full text-sm font-medium text-charcoal/50 hover:text-charcoal/70`

### Form Input

**Purpose:** Text/email input field.

- Standard: `px-4 py-2.5 rounded-lg border text-sm transition-colors duration-200`
- On dark bg: `bg-white/10 border-white/25 text-white placeholder:text-white/40 focus:border-white/50`
- On light bg: `border-grey-light text-charcoal focus:border-green/40`
- Custom amount: `rounded-xl border-2` (larger, more prominent treatment)

---

## 9. Image and Proof System

### Image selection principles

1. **Prefer images with Deen Relief workers IN the frame** with beneficiaries over beneficiaries alone
2. **Prefer images with visible Deen Relief branding** (t-shirts, signage)
3. **Prefer images with identifiable locations**
4. **Never use stock photography.** Every image must be from actual Deen Relief work
5. **Crop tighter than instinct suggests.** Focus on people, not environments

### Aspect ratios

| Ratio | Classes | Usage |
|---|---|---|
| 5:4 | `aspect-[5/4]` | Featured campaign images (two-column layout) |
| 4:3 | `aspect-[4/3]` | Story images, general purpose |
| 3:4 (portrait) | `aspect-[3/4]` | Intimate/connection images in collages |
| 16:10 | `aspect-[16/10]` | Campaign card thumbnails |
| 2.2:1 (wide) | `aspect-[2.2/1]` | Establishing/context images in collages |

### Image treatment

- All content images: `rounded-2xl overflow-hidden` with `object-cover`
- Hero images: Full-bleed, no rounding, with gradient overlay
- Card images: Inherit rounding from parent card container
- Hover on cards: `group-hover:scale-105 transition-transform duration-300`

### ProofTag placement rules

- **Hero:** `position="bottom-right"` — location only, no date
- **Featured campaign:** `position="bottom-left"` — location + date
- **Campaign cards:** `position="bottom-left"` — location only, single word
- **Story/feature images:** Either position — location only
- **Collage grids:** Mirror positions (first image bottom-left, second bottom-right) for balance
- **Never on:** Giving pathway icons, stat sections, newsletter, footer, partner logos

---

## 10. Module Library

### Module: Hero

**Purpose:** Page-level identity statement with emotional imagery and primary CTA.

- Full viewport width, `min-h-[68vh] md:min-h-[78vh]`
- Full-bleed background image with gradient overlay
- Content constrained to `max-w-[20-26rem]`, positioned bottom-left
- Primary + secondary CTA buttons
- ProofTag on image
- **Use on:** Homepage, potentially campaign landing pages
- **Variation:** Different images, headlines, CTAs per page. Structure stays the same.

### Module: Partner/Logo Strip

**Purpose:** Passive credibility through association with recognised organisations.

- Centred label + horizontal logo row
- White background, compact padding
- **Use on:** Homepage, About page, potentially donation confirmation
- **Variation:** Different partner sets. Layout stays the same.

### Module: Featured Donation

**Purpose:** Primary conversion module with campaign context and donation interaction.

- Two-column: image left, donation panel right
- Badge, amount selector, frequency toggle, outcome labels, trust microcopy
- **Use on:** Homepage (one instance), campaign landing pages
- **Variation:** Different campaigns, images, amounts, outcomes. Structure stays the same.

### Module: Image + Text Story

**Purpose:** Two-column narrative with image and text content.

- Two-column grid with `gap-10 lg:gap-16 items-center`
- Image with ProofTag, text with eyebrow + heading + body + CTA
- **Use on:** Homepage (OurStory), About page, campaign details
- **Variation:** Image can be left or right. Content depth can vary.

### Module: Image Collage + Panel

**Purpose:** Visual showcase with structured information panel alongside.

- Two-column: image grid left, white panel right
- Image grid: 2 portraits top, 1 landscape bottom
- Panel: sectioned with border dividers, icon + text rows
- **Use on:** Homepage (CancerCare), programme detail pages
- **Variation:** Different image configurations, different panel content.

### Module: Card Grid

**Purpose:** Multiple items displayed as a scannable grid.

- 3-column on desktop, 2-column on tablet, 1-column on mobile
- **Use on:** Campaigns, giving pathways, blog posts, programmes
- **Variation:** Different card types (campaign, pathway, blog). Grid density (gap-4 vs gap-6) varies by card type.

### Module: Stats/Impact

**Purpose:** Display key metrics with visual emphasis.

- Centred heading + 4-column stat grid + optional transparency statement
- **Use on:** Homepage, About page, annual report page
- **Variation:** Different stats, optional transparency box.

### Module: Trust Band

**Purpose:** Compact credibility strip acting as a visual transition between sections.

- Full-width `bg-green-dark` with white text
- 4-column stat layout, compact padding
- Animated numbers on scroll
- **Use on:** Homepage (between major section groups). Maximum once per page.

### Module: Newsletter CTA

**Purpose:** Email capture with social links.

- `bg-green-dark`, centred, compact
- Email form + social icon row
- **Use on:** Homepage, blog, all internal pages (consistent position above footer)

### Module: Footer

**Purpose:** Site-wide navigation, contact details, legal information.

- `bg-charcoal`, 4-column layout
- Text wordmark, contact info, link columns, addresses, legal bar
- **Use on:** Every page. No variation.

---

## 11. CTA and Form System

### CTA hierarchy

| Level | Treatment | Usage | Frequency |
|---|---|---|---|
| **Primary donation** | Button `primary` `lg` | Featured donation module | 1 per page |
| **Section CTA** | Button `secondary` `md` | End of content sections | 1 per section max |
| **Utility CTA** | Button `secondary` `sm` | Grid headers, compact actions | As needed |
| **Text CTA** | `text-green text-sm font-medium` + arrow | Cards, inline links | Within cards |
| **Persistent CTA** | Button `primary` `sm` | Header donate button | Always visible |

### CTA rules

- Maximum one `primary lg` button per page (the main donation ask)
- Maximum one CTA button per section (avoid CTA overload)
- Text CTAs (arrow links) can appear in every card — they're lightweight enough
- Never stack two button CTAs vertically in the same module
- Primary (amber) buttons are for donation/money actions only. Secondary (green) for exploration/information actions.

### Form styling

- Inputs: `rounded-lg` on dark backgrounds, `rounded-xl` for donation amounts
- Labels: `sr-only` with descriptive placeholders, or visible `text-sm font-medium text-charcoal`
- Form layout: `flex flex-col sm:flex-row gap-2.5` for inline forms
- Validation: Native HTML5 (`required`, `type="email"`)
- Success state: `bg-white/10 rounded-lg p-5` with confirmation message

---

## 12. Trust and Credibility System

### Trust devices

| Device | Implementation | Location |
|---|---|---|
| Registration number | "No. 1158608" in TrustBar, footer bottom bar | Above fold (TrustBar), page bottom (footer) |
| Partner logos | Logo strip with recognisable names | Near top of page |
| Years active | "12+" animated stat | TrustBar |
| Countries | "5+" animated stat | TrustBar |
| Commission verification | "Charity Commission Verified" | TrustBar |
| Transparency statement | "90p of every £1 to programmes" | Impact section |
| Trust microcopy | "100% to emergency relief · Gift Aid adds 25% · Reg. charity 1158608" | Adjacent to every donation CTA |
| ProofTags | Location evidence on photographs | Throughout page on images |
| Commission link | Direct link to Charity Commission profile | Impact section |

### Trust rules

- Every donation interaction must have trust microcopy within 100px of the CTA button
- Registration numbers must appear at least twice on any page (TrustBar + footer)
- ProofTags must appear on at least 3 images per page
- Trust signals should feel integrated, not tacked on — they are part of the design, not afterthoughts

---

## 13. Header and Footer System

### Header

- **Position:** `fixed top-0 z-50 bg-white`
- **Scroll behaviour:** Padding reduces (`py-4` → `py-3`), logo shrinks (32px → 28px), shadow appears
- **Desktop:** Logo left, nav centre, Donate button right
- **Mobile:** Logo left, Donate + hamburger right. Nav in full-width dropdown.
- **Active page:** Green text, bold weight, 2px green underline (`border-b-2 border-green`)
- **Donate button:** Always visible, never hidden inside hamburger. Uses `primary sm` variant.

### Footer

- **Background:** `bg-charcoal`
- **Structure:** 4-column grid (brand/contact, give links, about links, addresses)
- **Brand column:** Text wordmark in `font-heading font-bold text-[19px] tracking-tight`
- **Column headings:** `text-xs font-semibold uppercase tracking-wider text-white/50`
- **Links:** `text-white/60 hover:text-white text-sm`
- **Bottom bar:** `border-t border-white/10` with registration info and legal links
- **Bottom bar text:** `text-white/40 text-xs`

---

## 14. Responsive System

### Breakpoints

| Breakpoint | Width | Key changes |
|---|---|---|
| Base (mobile) | < 640px | Single column, stacked layouts, compact typography |
| `sm` | 640px | 2-column grids begin, typography scales up slightly |
| `md` | 768px | Desktop nav appears, section padding increases, header adjusts |
| `lg` | 1024px | Full multi-column layouts, maximum typography scale |

### Typography scaling

- H1: `1.75rem` → `2.25rem` → `2.85rem` (3 breakpoints)
- H2: `1.875rem` → `2.25rem` (2 breakpoints)
- Body: `1rem` → `1.0625rem` (2 breakpoints)
- Labels/captions: No scaling (fixed small sizes)

### Grid collapse

- 4-column → 2-column at `< lg`
- 3-column → 2-column at `< lg`, → 1-column at `< sm`
- 2-column → 1-column at `< lg`
- Footer: 4-column → 2-column at `< lg`, → 1-column at `< sm`

### Mobile-specific rules

- Hamburger menu replaces desktop nav at `< md`
- Donate button stays visible outside hamburger at all sizes
- Section padding reduces from `py-24` to `py-16`
- Hero minimum height reduces from `78vh` to `68vh`
- Partner logos scale down from 75px to 60px max-height
- Donation amount grid goes from 4 columns to 2 columns

---

## 15. Page Composition Rules

### Homepage vs internal pages

- **Homepage:** Full hero, multiple content sections, all module types, maximum visual variety
- **Internal pages:** Shorter hero or page header, focused content, fewer module types per page
- **Campaign pages:** Featured donation module + campaign story + impact stats
- **About page:** Story module + image collage + stats + team (if applicable)
- **Giving pages (Zakat, Sadaqah, etc.):** Explanation content + donation module + FAQ

### Composition rules

1. **Never use the same layout pattern for two consecutive sections.** If section A is a 3-column grid, section B must be something else (2-column, full-width, stats, etc.).

2. **Alternate backgrounds.** White → cream → white or white → green-dark → white. Never same background twice in a row (except white if layouts differ significantly).

3. **Maximum 2 card grids per page.** More than two grids of cards creates visual fatigue.

4. **Every page needs at least one donation touchpoint.** Either a featured donation module, an inline donate CTA, or a campaign card with a donate link.

5. **Every page needs at least one trust signal.** TrustBar, trust microcopy, registration number, or partner logos.

6. **ProofTags should appear on 40-60% of images** on any page. Enough to feel like a system, not so many that the page feels labelled.

7. **Section eyebrows are optional** — not every section needs one. Use them to signal "this section is categorised" (e.g., "WHAT MAKES US DIFFERENT", "OUR PARTNERS").

---

## 16. Implementation Guidance for Claude Code

### Token structure

All design tokens are defined as CSS custom properties in `globals.css` under `@theme inline`:

```css
--color-green: #2D6A2E;
--color-green-dark: #1B4D1C;
--color-green-light: #E8F5E9;
--color-amber: #D4A843;
/* etc. */
--font-heading: var(--font-source-serif-4);
--font-body: var(--font-dm-sans);
```

Reference these via Tailwind classes (`text-green`, `bg-amber`, `font-heading`). Never hardcode hex values in components.

### Component naming

| Component | File | Reusable? |
|---|---|---|
| `Button` | `Button.tsx` | Yes — use everywhere |
| `ProofTag` | `ProofTag.tsx` | Yes — use on any image |
| `Header` | `Header.tsx` | Yes — every page |
| `Footer` | `Footer.tsx` | Yes — every page |
| `Newsletter` | `Newsletter.tsx` | Yes — every page above footer |
| `TrustBar` | `TrustBar.tsx` | Yes — homepage, potentially about page |
| `Partners` | `Partners.tsx` | Yes — homepage, about page |
| `FeaturedCampaign` | `FeaturedCampaign.tsx` | Adaptable — swap campaign data for different pages |
| `CampaignsGrid` | `CampaignsGrid.tsx` | Adaptable — different campaign sets |
| `GivingPathways` | `GivingPathways.tsx` | Adaptable — subset of pathways on different pages |
| `CancerCareCentres` | `CancerCareCentres.tsx` | Page-specific — homepage only, but layout pattern is reusable |
| `Impact` | `Impact.tsx` | Adaptable — different stats per page |
| `OurStory` | `OurStory.tsx` | Adaptable — same layout, different story content |
| `Hero` | `Hero.tsx` | Adaptable — different images/headlines per page |

### Prop/variant guidance

Components that should accept data props for reuse across pages:
- `Hero` → `{ headline, subheadline, image, ctaPrimary, ctaSecondary, proofLocation }`
- `FeaturedCampaign` → `{ campaign, amounts, image, badge }`
- `CampaignsGrid` → `{ campaigns[], heading, showViewAll }`
- `Impact` → `{ stats[], showTransparency }`
- `OurStory` → `{ heading, eyebrow, body, image, cta }`

Components that are fixed (no props needed):
- `Header`, `Footer`, `Newsletter` — same on every page
- `TrustBar` — same content everywhere
- `Partners` — same logos everywhere

### Section intro pattern (extract as component)

The heading block pattern (eyebrow + H2 + body) appears in 6 sections. This should be extracted as a `SectionIntro` component:

```tsx
interface SectionIntroProps {
  eyebrow?: string;
  heading: string;
  body?: string;
  align?: "left" | "center";
}
```

This would reduce duplication and enforce consistency across all future pages.

---

## 17. What is Fixed vs Flexible

### Fixed (never change)

- Font pairing: Source Serif 4 + DM Sans
- Colour palette: green/amber/charcoal/cream
- Button variants and their colour assignments
- ProofTag styling (size, weight, opacity, shadow)
- Section padding: `py-16 md:py-24` for major sections
- Container: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`
- H2 styling: `text-3xl sm:text-4xl font-heading font-bold text-charcoal leading-tight`
- Eyebrow styling: `text-[11px] font-bold tracking-[0.1em] uppercase text-green`
- Body text: `text-grey text-base sm:text-[1.0625rem] leading-[1.7]`
- Card border-radius: `rounded-2xl`
- Card hover: `hover:shadow-md hover:-translate-y-1`
- Header: sticky, white, with persistent Donate button
- Footer: charcoal, 4-column, text wordmark

### Flexible (can vary per page)

- Which modules appear and in what order
- Section background colours (white, cream, green-dark — following alternation rules)
- Number of cards in a grid (4 or 6, not more)
- Image aspect ratios (chosen per context from the defined set)
- ProofTag position (bottom-left or bottom-right)
- Whether a section has an eyebrow label
- CTA button variant per section (primary vs secondary — following hierarchy rules)
- Stat content and values
- Campaign/story content
- Hero image and headline

---

## 18. Gaps or Open Decisions

1. **Impact stat boxes vs TrustBar stats** — two different visual treatments for statistics. Should be resolved: either flatten Impact stats to match TrustBar's minimal style, or accept the difference as intentional (boxed for detailed stats, inline for compact stats).

2. **Newsletter form radius mismatch** — input uses `rounded-lg`, button uses `rounded-full`. Should be standardised to one or the other.

3. **Partners label uses `text-sm`** while all other eyebrows use `text-[11px]`. Should be standardised to `text-[11px]` unless Partners is intentionally different.

4. **No error/loading states defined** for forms or interactive elements. These need to be designed before backend integration.

5. **No 404 page or empty state patterns** defined yet.

6. **No blog/article page template** exists. The system provides building blocks but a long-form content template needs to be designed.

7. **No modal/overlay patterns** defined. If donation flows or Zakat calculators need overlays, these need to be designed.

8. **Mobile hamburger menu animation** — currently instant show/hide. Could benefit from a slide or fade transition.

---

## 19. Final Distilled Design System Brief

**For Claude Code — when building any new Deen Relief page, follow these rules:**

**Layout:** Use `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` for all containers. Major sections get `py-16 md:py-24`. Alternate backgrounds: white → cream → white (with green-dark for max 2 accent bands). Never repeat the same layout pattern in consecutive sections.

**Typography:** Source Serif 4 for all headings. DM Sans for everything else. H2: `text-3xl sm:text-4xl font-heading font-bold text-charcoal leading-tight`. Body: `text-grey text-base sm:text-[1.0625rem] leading-[1.7]`. Eyebrows: `text-[11px] font-bold tracking-[0.1em] uppercase text-green`.

**Colour:** Green for brand identity (text, icons, active states). Amber for primary actions only (donate, subscribe). Charcoal for text and footer. Cream for alternating section backgrounds. Never use amber for non-action elements.

**Components:** Use `Button` component for all CTAs (primary/secondary/outline × sm/md/lg). Use `ProofTag` on 40-60% of images. Use rounded-2xl for image containers and cards. Use `hover:shadow-md hover:-translate-y-1` for all interactive cards.

**Images:** Always real Deen Relief photography. Crop to people, not buildings. Show workers with beneficiaries. Add ProofTag with location. Use aspect ratios from the defined set.

**Trust:** Every page needs registration number visible (TrustBar or footer). Every donation touchpoint needs trust microcopy within 100px. ProofTags on images reinforce "we are physically present."

**Proof & Proximity:** This is what makes Deen Relief different. Every image should ask: "does this show closeness AND evidence?" Location tags prove where. Intimate crops prove presence. Specific outcomes prove impact. Together they create the visual identity no competitor has.
