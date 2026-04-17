# Proof & Proximity — Implementation Plan

---

## 1. Current Draft Audit

### Where Proximity already exists

| Section | Current state | Assessment |
|---|---|---|
| Hero | Uses Gulucuk Evi photo with children — but it's a wide establishing shot showing the building signage more than the children | Weak proximity. The image choice shows infrastructure, not intimacy |
| Featured Campaign | Palestine relief photo shows a worker handing a bag to a woman — a genuine moment of exchange | Strong proximity. This image already demonstrates the "in the room" quality |
| Cancer Care Centres | Three images: children holding signs (moderate), worker visiting child (strong), child drawing (strong) | Mixed. The selfie-style worker-with-child photo is the strongest proximity asset |
| Campaigns Grid | Reuses images from other sections — some intimate, some establishing | Inconsistent. No deliberate cropping philosophy applied |
| Our Story | Bangladesh community photo — wide shot of 30+ children with workers | Weak proximity. Too wide, too many people. Feels like a group photo, not a connection |
| Impact | Pure text/numbers. No imagery at all | No proximity. Abstract statistics disconnected from human reality |

### Where Proof already exists

| Section | Current state | Assessment |
|---|---|---|
| Trust Bar | Registration number, years, countries | Basic institutional proof — necessary but generic. Every charity does this |
| Hero | Alt text mentions Turkey and the care centre, but nothing visible to the user | Proof is in the code, not in the design |
| Featured Campaign | Outcome labels on donation amounts ("Feeds a family for one week") | Moderate proof of impact. But not location-specific |
| Cancer Care Centres | Building exterior photo shows Deen Relief signage — powerful proof | Accidentally strong. The signage is visible but not highlighted as a design element |
| Impact | Registration numbers, "Charity Commission Verified" link | Institutional proof. Standard, not distinctive |
| Footer | Both addresses, registration numbers, phone, email | Standard legal compliance |

### Where the draft fails both

| Section | Issue |
|---|---|
| Hero | Generic dark-overlay-on-photo treatment. Identical to every competitor. No location tag, no proof of where this is |
| Campaigns Grid | Six identical card designs with no location context. Could be any charity's cards |
| Impact section | Stat numbers floating on backgrounds with no connection to real work. Abstract and cold |
| Giving Pathways | Pure UI — icons and text. No photographic or proof elements at all. Functions well but contributes nothing to Proof & Proximity |
| Newsletter | Standard email capture. No differentiation needed here |
| Partners | Logo strip. Functional. No differentiation needed here |

### Where the design feels template-like

1. **The hero** — dark photo overlay with white text is the #1 category convention. Our hero is cleaner and better-written than competitors, but structurally identical.
2. **The campaigns grid** — six cards in a 3x2 grid. Every competitor has this exact module. The cards themselves lack any distinctive visual treatment.
3. **The impact stats** — four numbers on coloured backgrounds with count-up animation. Standard pattern across the sector.
4. **Section transitions** — abrupt white/cream/grey/white background changes. No visual thread connects sections.

### Risk assessment

- **Over-application risk:** Adding proof tags to every image, every card, every section. This would make the site feel like a documentary database, not a charity homepage. Restraint is essential.
- **Under-application risk:** Adding a ProofTag to two images and calling it done. That's decoration, not a system. The direction needs to appear in enough places to become recognisable.
- **The right calibration:** Proof elements on 40-60% of images. Present often enough to be a pattern, absent often enough to not be noise.

---

## 2. Proof & Proximity Design Rules

### Image Selection Rules
1. **Prefer images that show a Deen Relief person WITH a beneficiary** over images that show beneficiaries alone
2. **Prefer images with visible Deen Relief branding** (t-shirts, signage) over unbranded images
3. **Prefer images with identifiable locations** (buildings, streets, interiors) over placeless backgrounds
4. **Never use stock photography.** Every image must be from Deen Relief's actual fieldwork
5. **For the hero:** choose the image that best shows human connection, not the image that best shows a building or project

### Image Cropping Rules
1. **Default crop: tighter than instinct suggests.** Crop to the people, not the environment
2. **Centre the relationship** — the focal point should be the space between two people (worker and child, hand and hand) not a single subject
3. **Allow the Deen Relief branding** (t-shirts, signage) to remain visible when cropping — do not crop it out
4. **Mix aspect ratios deliberately:** use portrait (3:4) and square (1:1) for intimate/connection images; use landscape (16:9) sparingly, only for establishing context
5. **On campaign cards:** crop to face/upper body. Eye contact with the camera is strongest

### Proof Tag Rules

**Where proof tags SHOULD appear:**
- Hero image (location only, no date — it's a permanent identity element)
- Featured campaign image (location + timeframe)
- Cancer care centre images (location)
- Campaign card images (location only — one word: "Turkey", "Gaza", "Bangladesh", "Brighton")

**Where proof tags should NOT appear:**
- Giving Pathways cards (these are navigational, not photographic)
- Impact statistics section (the numbers themselves are the proof)
- Partner logos section
- Newsletter section
- Footer
- Any UI element that is not a photograph
- The donation panel (proof appears here as impact text, not as an image tag)

**Proof tag visual rules:**
- Font size: 10px (0.625rem)
- Weight: 500 (medium)
- Case: uppercase
- Letter spacing: 0.1em
- Colour on images: white at 70% opacity
- Colour on light backgrounds: charcoal at 40% opacity
- Position: bottom-left of image, 12px from edges
- No background box or pill — text only, with a subtle text-shadow for legibility on images
- Never more than one tag per image
- Maximum text length: ~25 characters (e.g., "ADANA, TURKEY" not "GULUCUK EVI CARE CENTRE, ADANA, TURKEY — FEBRUARY 2024")

### Typography Rules for Proof Elements
- **Proof tags:** DM Sans (body font), 10px, uppercase, medium weight, wide tracking. This is NOT the heading font. Proof text should feel precise and quiet, not editorial and expressive.
- **Image captions (when used below an image):** DM Sans, 12px, normal case, regular weight, grey colour. Optional. Only for the Cancer Care section where multiple images need context.
- **Impact text in donation panel:** DM Sans, 14px, normal case, medium weight, green colour. One sentence maximum.

### Layout Rules
1. **Section spacing:** maintain current 64-96px (py-16 md:py-24). No change needed.
2. **Section backgrounds:** maintain the current alternating pattern (white → dark green trust bar → white → cream → white → grey → white → cream → white). This rhythm already works.
3. **Image framing:** most images stay in rounded containers (rounded-2xl). The hero remains full-bleed (it's the one emotional impact moment). Do not make every image contained — variety is important.
4. **Content width:** keep max-w-7xl. Do not narrow the content area.

### Section Rhythm Rules
1. **Every photographic section should carry at least one proof element** (tag, caption, or specific data point) — but it can be very subtle
2. **No two consecutive sections should have the same proof treatment** — vary between image tags, inline numbers, and specific text
3. **Non-photographic sections (Giving Pathways, Newsletter, Footer) are exempt** from proof treatment. They serve navigation and conversion, not storytelling.

### Mobile Adaptation Rules
1. **Proof tags remain on mobile** but move to bottom-left with 8px margin (slightly smaller margin than desktop)
2. **Font size stays 10px** — do not scale down further. It must remain legible.
3. **Image crops may differ on mobile** — portrait aspect ratios are better on narrow screens. Consider using `object-position` to recentre on faces when images are cropped by responsive containers.
4. **The donation panel impact image** should be smaller on mobile (150px wide) but still present.

### Motion Rules
1. **Proof tags:** fade in with the image. No separate animation. They should feel native to the image, not added later.
2. **No hover effects on proof tags.** They are not interactive.
3. **Donation panel impact reveal:** fade in over 300ms when amount is selected. Fade out over 200ms when amount changes. No slide, no bounce.
4. **All existing animations (count-up, card hover, header scroll)** remain unchanged.

---

## 3. Section-by-Section Refinement Plan

### Header
- **What works:** Transparent-to-solid scroll transition, amber donate button, clean navigation. All good.
- **What changes:** Nothing. The header is a navigation element, not a storytelling element. Proof & Proximity does not apply here.
- **Avoid:** Adding proof text or location data to the header.

### Hero
- **What works:** Headline, subtext, CTAs. These are strong.
- **What changes:**
  1. **Image swap:** Replace the Gulucuk Evi building exterior (wide, establishing) with a closer, warmer image. Best candidate: the Turkey selfie (DR-Turkey-2022-2.webp) — worker smiling next to a child with cancer. This IS proximity. Crop it to fill the hero, centred on the two faces.
  2. **Add a proof tag:** Bottom-left of the hero: "ADANA, TURKEY" in 10px white at 70% opacity with subtle text-shadow.
  3. **Soften the overlay slightly:** The current overlay is from-charcoal/90. For a warmer, more intimate image, reduce to from-charcoal/80 via-charcoal/65 to-charcoal/40 — let more of the image warmth through.
- **Why:** The hero is the single most impactful place to demonstrate the direction. Moving from "building exterior" to "human connection" transforms the first impression. The proof tag adds location grounding without any friction.
- **Avoid:** Adding more than one proof element. No date in the hero tag. No caption below the hero.

### Trust Bar
- **What works:** Registration number, years, countries, transparency statement. All function well.
- **What changes:** Minor text refinement. Change "Committed to Transparency" to the actual figure once verified, or keep as is. No structural change.
- **Avoid:** Adding imagery to the trust bar. It should stay as a clean data strip.

### Featured Campaign (Palestine)
- **What works:** Image, headline, copy, donation amounts with outcome labels, CTA. Strong section.
- **What changes:**
  1. **Add a proof tag on the image:** "GAZA — 2026" in the bottom-left corner.
  2. **Make outcome labels more specific:** Change "Provides emergency food for a family" → "Provides emergency food for a family of five in Gaza". Change "Feeds a family for one week" → "Feeds a displaced family in Gaza for one week". The word "Gaza" appears in the proof tag AND in the outcome text — this is intentional reinforcement, not redundancy.
  3. **Image crop:** The current Palestine image (worker handing bag to woman) is already an intimate moment. Ensure it's cropped to emphasise the exchange between the two people, not the camp environment.
- **Avoid:** Adding a proof tag AND a caption AND specific stats all in this one section. One proof tag on the image is sufficient. The outcome labels carry the rest.

### Cancer Care Centres
- **What works:** Three-image grid, four service cards, strong copy. This is already the most distinctive section.
- **What changes:**
  1. **Add proof tags on two of the three images** (not all three — restraint):
     - Children holding signs photo: "ADANA, TURKEY"
     - Building exterior / worker visit photo: no tag (the Deen Relief signage in the photo IS the proof — adding a tag would be redundant)
     - Child drawing: no tag (it's a warm detail shot, not an evidence shot)
  2. **Add one specific number to the section copy:** e.g., "supporting [X] families near Adana City Hospital" — if this figure is available. If not, leave the copy as is.
- **Why:** This section already demonstrates both proximity (intimate images) and proof (building signage). Light touches sharpen it without overloading it.
- **Avoid:** Tagging every image. The child drawing at the table is a warm moment — a proof tag on it would feel clinical and invasive.

### Giving Pathways
- **What works:** Six-card grid with icons, descriptions, and hover effects. Clean, functional.
- **What changes:** None. This is a navigation module, not a storytelling module. Proof & Proximity does not apply here.
- **Avoid:** Adding photography, proof tags, or location data to navigation cards.

### Campaigns Grid
- **What works:** Six cards with images, titles, descriptions, hover effects, "Urgent" badge on Palestine.
- **What changes:**
  1. **Add location proof tags on campaign card images.** One word each:
     - Palestine Emergency Relief: "GAZA"
     - Bangladesh Orphan Sponsorship: "BANGLADESH"
     - Refugee Children with Cancer: "TURKEY"
     - Bangladesh Clean Water: "BANGLADESH"
     - UK Homeless Community Aid: "BRIGHTON, UK"
     - Build a School: "BANGLADESH"
  2. **Tighten image crops** where possible — prioritise face-forward or connection-forward compositions over establishing shots.
- **Why:** The location tags differentiate these cards from every competitor's campaign grid. In one glance, the visitor sees the geographic spread of the work — Turkey, Gaza, Bangladesh, Brighton. This is both proof (specific locations) and a trust signal (real places, not vague "overseas").
- **Avoid:** Adding dates to campaign cards. Location only. One word or two-word maximum.

### Impact & Transparency
- **What works:** The dark green transparency banner with Charity Commission link is strong. Count-up statistics work.
- **What changes:**
  1. **Optional enhancement:** If small thumbnail images are available, pair the "3,200+ children & families supported" stat with a small (48x48px) circular thumbnail of a child. This connects the abstract number to a human face. This is a proximity move — the stat becomes a person, not a digit.
  2. **If thumbnails aren't available or feel forced, leave this section as is.** Stats sections can remain abstract — the proof is in the numbers and the Charity Commission link.
- **Avoid:** Adding proof tags to this section. The section IS proof. Meta-proof (proof about the proof) is absurd.

### Our Story
- **What works:** Founder narrative, CTA.
- **What changes:**
  1. **Image swap consideration:** The current image (wide shot of 30+ children) is the weakest proximity image. Consider swapping for a closer image — perhaps the worker holding a child at the Bangladesh facility (Screenshot-2021-11-15-at-19.18.23.webp). This shows one worker with one child — proximity.
  2. **Add a proof tag:** "BRIGHTON, EST. 2013" or the location of whatever image is used.
- **Why:** The story section is about origin and authenticity. A closer image of one human connection feels truer to the grassroots origin than a crowd photo.
- **Avoid:** Over-narrating. The text already tells the story. The image and proof tag should support it quietly.

### Partners
- **What works:** Six real logos. Clean strip.
- **What changes:** None. This is a trust module through association. Proof & Proximity does not apply.
- **Avoid:** Adding captions, tags, or narrative to the partner strip.

### Newsletter
- **What works:** Email capture, social links, dark green background.
- **What changes:** None. This is a conversion module. Keep it clean.
- **Avoid:** Any proof or proximity treatment.

### Footer
- **What works:** Four-column layout, both addresses labelled, registration numbers, legal links.
- **What changes:** None. The footer is already a proof element (registration numbers, addresses). No further treatment needed.

### Donation Panel (not yet built)
- **When built, apply:**
  1. **Impact image reveal:** When a donation amount is selected, show a small thumbnail (200x150px, rounded-lg) with a one-line specific impact text. Image changes per campaign.
  2. **Location in impact text:** "£50 — feeds a displaced family in Gaza for one week" (not just "feeds a family for one week").
  3. **No proof tag on the impact thumbnail.** The text carries the proof. The image carries the proximity. Together they work.
- **Avoid:** Making the impact reveal feel like a mandatory step. It should appear beside or below the amount selector, not between the amount and the payment form.

---

## 4. Reusable Component and Pattern Layer

### Component: `ProofTag`

**What it does:** Renders a small, uppercase location/date label positioned absolutely within an image container.

**Props:**
- `location` (required): string — e.g., "ADANA, TURKEY"
- `date` (optional): string — e.g., "2026". Only used on featured campaign images, not on cards.
- `position` (optional): "bottom-left" | "bottom-right" — defaults to "bottom-left"

**Visual spec:**
- Font: DM Sans (inherits from body font)
- Size: 10px (0.625rem)
- Weight: 500
- Letter spacing: 0.1em
- Text transform: uppercase
- Colour: white at 70% opacity (`text-white/70`)
- Text shadow: `0 1px 3px rgba(0,0,0,0.5)` for legibility on varied backgrounds
- Position: absolute, 12px from bottom, 12px from left (or right)
- No background pill, no border, no box — text only
- z-index: 10 (above image, below overlays)

**Where it appears:**
- Hero image
- Featured campaign image
- 2 of 3 cancer care images
- All 6 campaign card images
- Our Story image

**Where it does NOT appear:**
- Giving Pathways (no images)
- Impact stats (no images currently)
- Partners (logos, not photos)
- Newsletter (no images)
- Footer (no images)
- Donation panel (proof carried by text, not tags)

**Implementation difficulty:** Very low. It's a positioned `<span>` inside a relative container.

**Risk of misuse:** Adding it to every image, including decorative thumbnails and icons. Rule: only apply to documentary photographs, never to UI elements.

---

### Component: `ImageWithProof`

**What it does:** Wraps a Next.js `<Image>` inside a relative container with an optional `ProofTag`. This becomes the standard way to render field photography across the site.

**Props:**
- All standard Next.js Image props (src, alt, fill, sizes, etc.)
- `proofLocation` (optional): string — if provided, renders a `ProofTag`
- `proofDate` (optional): string
- `caption` (optional): string — renders below the image as a small text caption
- `aspect` (optional): "landscape" | "portrait" | "square" — controls aspect ratio class

**Where it appears:** Anywhere a field photograph is rendered.

**Implementation difficulty:** Low. A thin wrapper component.

---

### Component: `DonationImpact`

**What it does:** Renders a small image + one-line text that appears when a donation amount is selected in the donation panel or featured campaign section.

**Props:**
- `image`: string (thumbnail src)
- `text`: string (impact description)
- `visible`: boolean (controlled by parent based on amount selection)

**Visual spec:**
- Container: flex row, items-centre, gap-3
- Image: 56x56px, rounded-lg, object-cover
- Text: 14px, medium weight, green colour
- Appears with 300ms fade-in, 200ms fade-out
- Max width: fits within the donation panel without scrolling

**Where it appears:** Featured campaign donation amounts section. Later, the donation slide panel.

**Implementation difficulty:** Low-medium. Needs conditional rendering and a data map of campaign → amount → image + text.

---

### Pattern: Campaign Card with Proof

**What it is:** The existing `CampaignCard` link component, extended to include an `ImageWithProof` (with location tag) instead of a plain `Image`.

**Change from current:** Add `location` prop to the campaign data array. Render `ProofTag` inside the image container.

**Implementation difficulty:** Very low. Add one prop and one child element.

---

### Pattern: Section Header

**What it is:** Not a new component, but a consistent pattern. Section headers should follow:
- Small uppercase label (category): 12px, green or amber, tracking-widest
- Large serif heading: 30-40px, Source Serif 4, charcoal
- Optional body paragraph: 18px, DM Sans, grey

This pattern already exists across sections. Documenting it as a rule ensures consistency.

---

## 5. Revision Priority Order

### Priority 1 (highest impact, do first)

**1. Build the `ProofTag` component and apply it to the Hero and Featured Campaign.**
These are the first two things every visitor sees. Adding location tags here immediately sets the Proof & Proximity tone. Low effort, high impact.

**2. Swap the hero image to a closer, warmer photo.**
The current Gulucuk Evi exterior is an establishing shot. Replacing it with the Turkey selfie (or a tighter crop of a human connection image) transforms the entire first impression from "building" to "people." This single change is the most impactful proximity move.

**3. Add location tags to all 6 campaign cards.**
The campaigns grid is the section that looks most like every competitor. Adding one-word location tags to each card image instantly differentiates it. "GAZA", "TURKEY", "BANGLADESH", "BRIGHTON, UK" — geographic specificity that no competitor provides at the card level.

### Priority 2 (strong improvement, do second)

**4. Make donation outcome labels location-specific.**
Change "Feeds a family for one week" → "Feeds a displaced family in Gaza for one week." Small text change, meaningful proof reinforcement.

**5. Add proof tags to 2 of the 3 Cancer Care images.**
Light touch on an already-strong section.

**6. Consider swapping the Our Story image to a closer crop.**

### Priority 3 (already working well enough)

- **Trust Bar** — functional, no changes needed
- **Giving Pathways** — functional, exempt from Proof & Proximity
- **Partners** — functional with real logos now
- **Newsletter** — functional, exempt
- **Footer** — comprehensive, no changes needed
- **Header** — working well

### Highest risk if handled badly

1. **Over-tagging images.** If every photo has a proof tag, the system becomes noise. Strict adherence to the "where NOT to apply" rules is critical.
2. **Hero image swap.** If the replacement image is too low-resolution, it will look worse than the current one. Must verify image quality before swapping.
3. **Outcome label specificity.** If the specific details are inaccurate ("family of five" when we don't actually know family sizes), it undermines the trust that proof is supposed to build. Only add specificity that is genuinely defensible.

---

## 6. Implementation Brief

### Build order for next session:

**Step 1:** Create the `ProofTag` component
- Positioned absolute span, 10px uppercase, white/70, text-shadow, bottom-left

**Step 2:** Create the `ImageWithProof` wrapper component
- Relative container, Next.js Image, optional ProofTag, optional caption

**Step 3:** Apply ProofTag to Hero
- Add "ADANA, TURKEY" tag to the hero image
- Assess hero image swap (check resolution of DR-Turkey-2022-2.webp)
- If resolution is sufficient, swap. If not, keep current image but add the tag.

**Step 4:** Apply ProofTag to Featured Campaign image
- Add "GAZA — 2026" tag
- Update outcome labels to include "in Gaza" specificity

**Step 5:** Apply ProofTag to Campaign Cards
- Add `location` field to each campaign in the data array
- Render ProofTag inside each card's image container

**Step 6:** Apply ProofTag to Cancer Care images (2 of 3)
- Children holding signs: "ADANA, TURKEY"
- Child drawing: no tag

**Step 7:** Apply ProofTag to Our Story image
- Tag with location of the image

### Rules to preserve during implementation:
- Never tag non-photographic elements
- Never tag more than 60% of images on the page
- Never use more than 25 characters in a proof tag
- Never add a background box to proof tags
- Keep the green brand colour, amber CTAs, serif headings, warm backgrounds
- Keep generous spacing — do not compress sections
- Keep all existing hover effects, animations, and interactions

### Things to avoid:
- Adding proof tags to the Giving Pathways, Partners, Newsletter, or Footer
- Using proof tags as links or interactive elements
- Making proof tags larger than 10px
- Adding dates to campaign card proof tags (location only)
- Adding multiple proof tags to a single image
- Making the system feel "clever" — it should feel natural and inevitable
