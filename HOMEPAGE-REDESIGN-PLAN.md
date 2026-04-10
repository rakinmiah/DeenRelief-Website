# Deen Relief Homepage Redesign Plan

---

## 1. Executive Summary

Deen Relief is a UK-registered Islamic charity (No. 1158608) with a genuinely differentiated asset that its current website buries: physical cancer care centres in Adana, Turkey, serving Syrian and Gazan refugee children with cancer. The current WordPress/Elementor site suffers from architectural entropy (duplicate pages, broken links, misspelled URLs), diffuse messaging, a generic hero section ("Welcome to Deen Relief"), incomplete Islamic giving pathways, and a lack of transparency infrastructure. The homepage tries to say everything and ends up saying nothing memorable.

The redesign strategy is to **elevate Deen Relief from a small charity that looks small to a focused charity that punches above its weight**. The homepage must do three things exceptionally well: (1) immediately communicate a clear, emotionally resonant identity, (2) make donating frictionless and trustworthy, and (3) establish credibility that justifies trust from first-time visitors.

The recommended stack is **Next.js + Tailwind CSS + Stripe Elements**, giving full creative control over the donation experience, strong performance, and a scalable component architecture that lays the foundation for a sitewide design system. The donation flow will use Stripe's Payment Element and Express Checkout for Apple Pay/Google Pay/Link, with campaign metadata tagging, recurring billing via Stripe Subscriptions, and a custom donor experience that far exceeds what GiveWP could deliver.

The visual direction preserves the Deen Relief green brand identity but elevates it with a warm, premium palette, custom typography, and authentic field photography as the primary storytelling medium. The tone shifts from generic charity language to confident, specific, dignity-preserving communication.

---

## 2. Brand and Business Understanding

### Who Deen Relief Is
Deen Relief is a UK-based Islamic charity founded in 2013 by Shabek Ali, originating from grassroots homeless outreach in Brighton & Hove. It has since expanded to international operations across Bangladesh, Turkey, Palestine/Gaza, and other regions. The charity is registered with the Charity Commission (No. 1158608) and Companies House (No. 08593822).

### Core Identity
- **Tagline (from logo):** "Helping Poor, Vulnerable and Disabled Children Globally"
- **Logo:** Dark green (#2D6A2E approximate) with a family icon motif — two adults sheltering a child. The icon communicates protection, family, and care. The trademark symbol indicates brand ownership awareness.
- **Earlier logo variant** (seen on field t-shirts): "Helping Children Globally" with a child's handprint in the 'D' — warmer, more playful. The current 2023 logo is more institutional.
- **Mission scope:** Children with cancer (core differentiator), orphan care, emergency relief, housing, clean water, education, UK homelessness.
- **Values stated:** Integrity, Commitment, Humanity.
- **Admin pledge:** No more than 10% on administrative costs.

### Key Differentiator — Cancer Care Centres
Deen Relief operates physical care facilities in Adana, Turkey (the "Gulucuk Evi" — House of Smiles, in partnership with "Her Sey Bir Gulucuk Icin" / Anything for a Smile). These centres serve Syrian and Gazan refugee children undergoing cancer treatment, providing:
- Free family housing near hospitals
- Financial assistance for medical expenses
- Nutritional programmes
- Case management
- Spiritual support

This is **not common** among UK Islamic charities. Islamic Relief, Penny Appeal, Human Appeal, Muslim Hands, and Muslim Aid do not operate dedicated cancer care centres for refugee children. This is Deen Relief's most bankable brand asset.

### Audience
- **Primary:** UK-based Muslim donors (evidenced by GBP pricing, Gift Aid, UK charity registration, prayer times pages targeting UK cities, Brighton origin)
- **Secondary:** Diaspora Muslims globally (some USD/international engagement likely)
- **Tertiary:** Non-Muslim donors who encounter the charity through local Brighton work or specific campaigns

### Emotional Positioning
The imagery tells the story clearly:
- **Field workers in branded t-shirts** — direct, on-the-ground, hands-on (not a remote, corporate charity)
- **Named individuals** (Rahul Mia, Suhel Mia) wearing branded clothing — suggests local team members/volunteers, not anonymous staff
- **Children with cancer** shown with warmth, dignity, and smiles — not clinical or pitying
- **Aid distribution** (food parcels, supplies in Palestine displacement camps) — demonstrating tangible delivery
- **Community scenes** (large groups of children smiling with Deen Relief workers in Bangladesh/Rohingya camps) — showing scale of reach and genuine community relationships
- **Branded signage on buildings** (Gulucuk Evi) — proving physical infrastructure, not just financial transfers

The brand's emotional truth is: **"We show up. We're on the ground. We're in the room with these children."** The current website does not communicate this powerfully enough.

### Trust Requirements
For a smaller charity competing for Zakat and Sadaqah against Islamic Relief, Penny Appeal, and Human Appeal, trust is the single biggest barrier. The homepage must:
- Display charity registration prominently
- Show verifiable impact (not just emotional appeals)
- Demonstrate financial transparency
- Feature recognisable partners (Islamic Relief, BDRCS, Human Appeal are already partners)
- Prove physical presence through imagery and documentation
- Address the implicit donor question: "Is my money actually reaching people?"

---

## 3. Research Findings

### 3a. Current Site Audit — Key Findings

**Structure Problems:**
- 50+ pages with significant duplication (Gaza alone has 4 different URLs)
- Misspelled URLs (/compaigns/, /victiims/)
- Broken pages (/news-press/ returns 404, /stories/ is empty, /shop/ is placeholder)
- Two different addresses listed (Brighton vs. London) with no explanation
- Old and new versions of pages coexist (e.g., /zakaat/ from 2023 alongside /fulfill-your-duty-contribute-zakat-today/ from 2026)
- 18+ prayer times pages serving as SEO plays that dilute the charitable mission

**Homepage Problems:**
- "Welcome to Deen Relief" hero — generic, not a value proposition
- Tries to showcase 7+ campaigns simultaneously without clear hierarchy
- Cancer care centres (the key differentiator) are not given prominent positioning
- No impact statistics on the homepage
- No financial transparency visible
- Partner logos shown but not contextualised
- No urgency or emotional hook above the fold

**Donation Problems:**
- GiveWP forms are functional but template-driven
- No quick-donate widget
- No outcome-linked donation amounts ("£30 provides X")
- Zakat calculator is a "planning tool only" — no live nisab values
- No dedicated Sadaqah page
- Qurbani page has no pricing
- No Fidyah, Kaffarah, or Lillah pathways
- Gift Aid supported but not prominently featured

**What to Preserve:**
- Cancer care centre programme and its documentation
- Charity registration credentials
- Partner relationships (Islamic Relief, BDRCS, Human Appeal, Read Foundation)
- Local + global dual-impact story (Brighton homelessness + international work)
- Founder origin story (grassroots beginning)
- Existing field photography (authentic, not stock)
- Zakat four-pathway framework (Emergency Relief, Medical Support, Family Essentials, Recovery & Stability)
- Orphan sponsorship at £30/month
- Prayer times SEO traffic (preserve but deprioritise from main navigation)

### 3b. Islamic Charity Benchmark Findings

**Sector Standards (what Deen Relief must match):**
- Charity Commission + Company registration displayed prominently
- Fundraising Regulator badge
- Quick-donate widget with preset amounts
- One-time/recurring toggle
- Zakat calculator with scholarly oversight or credible methodology
- Full Islamic giving pathway suite (Zakat, Sadaqah, Sadaqah Jariyah, Fidyah, Kaffarah, Qurbani, Fitrana)
- Emergency-first hero with campaign stacking below
- Impact statistics dashboard
- Financial transparency statement
- Multiple payment channels (online, phone, bank transfer)

**Best-in-Class Innovations to Learn From:**
- **Human Appeal's "Jummah Club"** — recurring donations framed as a weekly spiritual habit tied to Friday prayers. 10,000+ weekly donors. This reframes recurring giving from financial commitment to spiritual practice.
- **Penny Appeal's Faith Hub** — prayer times, Hijri Calendar, faith content. Creates daily touchpoints beyond donation, keeping the charity top-of-mind.
- **Human Appeal's outcome-based amounts** — "£9 provides one hot meal" makes the donation tangible and answerable.
- **Muslim Hands' "amanah" framing** — treating donations as a sacred trust (amanah) elevates the relationship from transactional to spiritual.
- **Muslim Aid's cart system** — multi-cause donations in a single transaction increases average donation value.
- **Muslim Aid's Waqf Fund** — endowment-style giving is a differentiator.
- **Muslim Hands' Interest Fund** — purification of conventional banking interest is a genuine need for practising Muslims.
- **Islamic Relief's honest 100% policy stance** — rejecting the "100% donation policy" as misleading and instead being transparent about spending ratios (90p/3p/7p) actually builds deeper trust with informed donors.

**Sector Weaknesses to Avoid:**
- Category-first donation flows without quick-donate fallback (high friction)
- 5-slide hero carousels (campaigns 3-5 are invisible to most visitors)
- 15+ appeals creating choice paralysis
- Guilt-driven emotional language without dignity balance
- Dark, heavy colour palettes that feel dated on screen
- Assuming all donors know Islamic giving terminology without explanation
- Burying the "Where Most Needed" catch-all option

### 3c. General Charity Benchmark Findings

**What Makes a Charity Site Feel Premium:**
- **Restraint and white space** — premium sites breathe, they don't cram
- **Custom typography** — a single font upgrade transforms perceived quality
- **Mission-first hero** — lead with the cause, not "Welcome to [Charity Name]"
- **Documentary-style photography** — real people in real contexts, showing agency not suffering
- **Confident tone** — stating facts and presenting the ask, not begging
- **Consistent spacing and alignment** — strict grid with generous padding
- **Financial transparency near the ask** — "76p of every pound goes directly to programmes" (British Red Cross model)

**Conversion Best Practices:**
- Default to monthly/recurring giving as the recommended option
- Offer 3-5 preset amounts with a custom option; pre-select the middle amount
- Pair every amount with a tangible outcome
- Remove main site navigation from the donation page (plug the leaky funnel)
- Support digital wallets (Apple Pay, Google Pay)
- Place trust signals directly adjacent to the payment form
- Keep forms short — every additional field increases abandonment
- Mobile-first form design (60%+ of charity donations now happen on smartphones)
- Post-donation confirmation with impact messaging

**charity:water's Key Lesson:** The "100% model" (operations funded by a separate group of philanthropists, so all public donations go directly to projects) is their most powerful trust mechanism. Deen Relief's "10% admin cap" pledge is similar in spirit and should be communicated with equal confidence and specificity.

**Macmillan's Key Lesson:** Multi-persona architecture — acknowledging that not every visitor is a donor. Some may be beneficiaries, volunteers, or learners. The Deen Relief homepage should have clear secondary pathways for non-donors.

### 3d. Stripe Capability Findings

**What Stripe Can Do for Deen Relief:**

| Capability | How |
|---|---|
| Fully branded donation form | Stripe Elements + Payment Element with Appearance API |
| Apple Pay / Google Pay / Link | Express Checkout Element — tap, authenticate, done |
| Recurring donations (weekly/monthly/quarterly/annual) | Stripe Subscriptions with flexible intervals |
| Campaign tagging | Metadata on every PaymentIntent/Subscription (up to 50 key-value pairs) |
| Multi-currency (GBP/USD/EUR) | Native — create PaymentIntent in donor's chosen currency |
| Donor self-service | Stripe Customer Portal for managing recurring donations |
| Visual customisation | Appearance API — match fonts, colors, borders, spacing to brand |
| Fee coverage ("cover the processing fee") | Custom frontend calculation, adjusted amount on PaymentIntent |
| Nonprofit discount | ~1.2% + 20p for UK domestic cards (apply via nonprofit@stripe.com) |

**What Stripe Cannot Do (Build Custom):**
- Gift Aid declaration capture and HMRC submission
- Donation-specific UI (amount selection, campaign picker, impact messaging)
- Donor CRM and communications
- Fund accounting and allocation
- Charity-specific tax receipts
- Zakat calculator
- Fundraising pages / peer-to-peer
- Donor thank-you emails and impact updates

**Recommended Stripe Stack:**
- Stripe Elements (embedded) with Payment Element — full design control
- Express Checkout Element — wallet buttons for quick donations
- Stripe Billing/Subscriptions — recurring donations
- Customer Portal — donor self-service
- Metadata — campaign/fund tagging on every transaction
- Appearance API — brand-matched styling

**Fees:** ~1.2% + 20p per UK card transaction at nonprofit rate. On a £50 donation: £0.80 fee, charity receives £49.20. With "cover the fee" option: donor pays £50.81, charity nets full £50.

---

## 4. Strategic Homepage Objectives

The homepage must accomplish these non-negotiable jobs:

1. **Communicate identity in 5 seconds** — A first-time visitor must understand who Deen Relief is, what makes them different, and that they are legitimate, before scrolling.

2. **Create an emotional connection in 15 seconds** — Through authentic imagery and specific (not generic) storytelling, the visitor must feel something that moves them toward action.

3. **Enable donation in under 30 seconds** — A returning donor or impulse giver must be able to complete a donation (including via Apple Pay) without scrolling past the fold.

4. **Establish trust for first-time visitors** — Registration numbers, partner logos, impact statistics, and financial transparency must be visible without requiring navigation to other pages.

5. **Surface the key differentiator** — The cancer care centres must be featured prominently, not buried beneath generic campaign cards.

6. **Serve multiple Islamic giving intents** — Zakat, Sadaqah, orphan sponsorship, and emergency appeals must each have clear entry points.

7. **Work exceptionally on mobile** — 60%+ of traffic will be mobile. The homepage must be designed mobile-first, not desktop-first with responsive afterthought.

8. **Support seasonal pivots** — During Ramadan, Dhul Hijjah, and emergencies, the hero and featured content must be swappable without rebuilding the page.

9. **Drive recurring giving** — Monthly/weekly giving must be positioned as the default, framed in spiritual terms (Sadaqah Jariyah, Jummah habit).

10. **Feel premium without feeling corporate** — The site must signal competence, warmth, and authenticity simultaneously. It should feel like a serious charity, not a template site and not a cold institution.

---

## 5. Audience and User Intent Framework

### User Type 1: The Zakat Giver (Seasonal, High Intent)
- **When they arrive:** Ramadan, before Eid al-Fitr, annually on their Zakat date
- **What they need:** A Zakat calculator or clear Zakat donation pathway, confidence that Zakat funds are distributed correctly (scholar-verified), quick completion
- **Homepage job:** Clear "Pay Zakat" entry point, trust signals about Zakat compliance, speed to donation form

### User Type 2: The Emergency Responder (Crisis-Driven, High Intent)
- **When they arrive:** After seeing a news story, social media post, or WhatsApp forward about Gaza/Palestine, earthquakes, floods
- **What they need:** To donate to the specific crisis immediately, reassurance that funds reach the affected area, evidence of on-the-ground presence
- **Homepage job:** Prominent emergency appeal with direct donation CTA, field imagery/video proving physical presence

### User Type 3: The Considered Giver (Researching, Medium Intent)
- **When they arrive:** Comparing charities before committing, may have been recommended Deen Relief
- **What they need:** Evidence of legitimacy, impact data, financial transparency, what makes Deen Relief different from Islamic Relief or Penny Appeal, proof of real-world impact
- **Homepage job:** Trust framework (registration, partners, transparency), impact statistics, differentiator story (cancer care centres), clear "About" pathway

### User Type 4: The Recurring Donor (Returning, High Intent)
- **When they arrive:** Monthly to manage their donation or make an additional gift
- **What they need:** Quick access to donate, manage existing donation, no friction
- **Homepage job:** Persistent donate button, donor portal access, quick-donate with saved payment method

### User Type 5: The Orphan Sponsor (Specific Intent)
- **When they arrive:** Specifically looking to sponsor an orphan (common Islamic giving intent)
- **What they need:** Clear sponsorship programme, cost (£30/month), what's included, a human connection to the sponsorship
- **Homepage job:** Visible orphan sponsorship pathway, not buried in a list of 7 campaigns

### User Type 6: The Local Supporter (Brighton/UK Community)
- **When they arrive:** Interested in local homeless outreach, volunteering, or events
- **What they need:** Information about UK work, volunteer pathways, contact
- **Homepage job:** Secondary pathway acknowledging UK/local work, volunteer CTA

---

## 6. Homepage Information Architecture

Top-to-bottom content hierarchy:

```
1. STICKY HEADER
   - Logo + navigation + "Donate" CTA button
   - Persistent across all scroll positions

2. HERO SECTION
   - Mission statement headline (not "Welcome to...")
   - Subheadline with specific positioning
   - Primary CTA: Donate Now
   - Secondary CTA: Learn More / Watch Video
   - Background: Full-bleed authentic photography
   - Quick-donate overlay or adjacent panel

3. TRUST BAR
   - Charity Commission number
   - Years active (est. 2013)
   - Key impact stat
   - "90p of every £1 goes to programmes" (or actual figure)

4. EMERGENCY/FEATURED CAMPAIGN
   - Current priority appeal (e.g., Palestine Emergency Relief)
   - Campaign-specific imagery
   - Targeted donation CTA with outcome-linked amounts
   - Progress indicator if applicable

5. WHAT MAKES US DIFFERENT — Cancer Care Centres
   - The Gulucuk Evi story
   - Authentic imagery of children and centres
   - Specific impact details
   - Dedicated CTA

6. WAYS TO GIVE — Islamic Giving Pathways
   - Zakat (with calculator link)
   - Sadaqah / Sadaqah Jariyah
   - Orphan Sponsorship
   - Emergency Appeals
   - Monthly Giving
   - Where Most Needed

7. ACTIVE CAMPAIGNS GRID
   - 4-6 campaign cards (not 7+)
   - Each with image, title, short description, donate CTA
   - Clear hierarchy: emergency > core programmes > seasonal

8. IMPACT & TRANSPARENCY
   - Key statistics (beneficiaries reached, countries, projects)
   - Financial transparency statement
   - Link to annual report / Charity Commission filing

9. OUR STORY / ABOUT PREVIEW
   - Founder origin (Brighton, 2013)
   - From local homeless outreach to global impact
   - CTA to full About page

10. PARTNERS & ACCREDITATION
    - Partner logos (Islamic Relief, BDRCS, Human Appeal, etc.)
    - Fundraising Regulator badge
    - Charity Commission badge

11. LATEST UPDATES
    - 2-3 recent blog posts or campaign updates
    - Video content if available

12. NEWSLETTER / STAY CONNECTED
    - Email signup
    - Social media links

13. FOOTER
    - Full navigation
    - Contact details (single clear address, single phone number)
    - Registration numbers
    - Legal links
    - Social media
```

---

## 7. Module-by-Module Homepage Plan

### Module 1: Sticky Header

**Strategic purpose:** Persistent navigation and ever-present donation CTA. The donate button must be accessible at any scroll depth.

**Key content:**
- Deen Relief logo (left)
- Primary navigation: Our Work | Give | About | Contact
- "Donate" button (right, high-contrast)
- Mobile: hamburger menu + standalone Donate button

**UX function:** Navigation and conversion anchor. The "Give" nav item opens a mega-menu with Islamic giving pathways (Zakat, Sadaqah, Orphan Sponsorship, Emergency, Monthly, Where Most Needed). This replaces the current flat nav.

**Visual direction:** White/light background, logo in brand green, Donate button in a warm accent colour (amber/gold) that contrasts with the green. Subtle shadow on scroll to indicate stickiness. Clean, uncluttered — maximum 5 nav items on desktop.

**Interaction ideas:**
- Header compacts on scroll (logo shrinks, padding reduces)
- "Give" mega-menu with category icons and brief descriptions
- Donate button subtly pulses once on first page load (then stops — not aggressive)

**Trust/conversion role:** The Donate button's persistent presence means conversion is always one click away, regardless of where the visitor is on the page.

**Mobile notes:** Logo + hamburger + Donate button only. Mega-menu becomes a full-screen overlay with large touch targets. Donate button stays visible at all times — never hidden inside the hamburger menu.

**Design system notes:** The header component is reusable across all pages. The mega-menu structure can accommodate additional categories as the site grows.

---

### Module 2: Hero Section

**Strategic purpose:** Communicate identity, create emotional connection, and enable immediate donation — all within the first 5 seconds.

**Key content:**
- **Headline:** "Every child deserves a chance to heal" (or similar — specific, emotional, tied to the cancer care differentiator; NOT "Welcome to Deen Relief")
- **Subheadline:** "We run care centres for refugee children with cancer in Turkey, deliver emergency aid in Gaza, and support vulnerable communities from Bangladesh to Brighton."
- **Primary CTA:** "Donate Now"
- **Secondary CTA:** "See Our Impact" or "Watch Our Story"
- **Background:** Full-bleed hero image — one powerful, dignity-preserving photograph from the field (e.g., the Gulucuk Evi image with children, or the Bangladesh community photo)

**UX function:** The hero is the homepage's thesis statement. It must answer three questions instantly: What does this charity do? Why should I care? How do I help?

**Visual direction:**
- Full-viewport height on desktop (100vh), slightly shorter on mobile (85vh)
- Dark overlay gradient on the photograph to ensure text readability
- Headline in white, large custom serif or clean sans-serif
- CTAs as solid buttons with generous padding — primary in accent colour, secondary in outlined white
- No carousel. One image. One message. One moment.

**Interaction ideas:**
- Subtle parallax on the background image (very slight — 10-15% movement, not aggressive)
- Hero image crossfades between 2-3 images on a slow timer (10+ seconds, not a fast slider) — optional, only if imagery quality supports it
- On mobile, the image fills the top half, text sits below in a clean card

**Trust/conversion role:** The hero establishes emotional credibility. The single image of real children in a real Deen Relief facility communicates "this is not a generic charity" instantly. The specific headline ("chance to heal") signals the cancer care focus without excluding other work.

**Mobile notes:** Stack layout — image top, content below. Headline must be readable at 32px minimum. CTAs must be full-width tappable buttons. No parallax on mobile (performance).

**Design system notes:** The hero module is reusable for campaign landing pages with swappable image, headline, and CTAs. During Ramadan or emergencies, the hero content swaps to the seasonal/urgent message.

---

### Module 3: Trust Bar

**Strategic purpose:** Immediately establish credibility below the emotional hero. This answers the first-time visitor's implicit question: "Is this charity legitimate?"

**Key content:**
- Charity Commission Reg. No. 1158608
- "Est. 2013 — 12+ years of impact"
- "[X] children supported" (key impact stat)
- "90% of donations go directly to programmes" (or actual verified figure)

**UX function:** A narrow, full-width strip that transitions from emotional (hero) to rational (trust). Quick-scan format — the visitor absorbs this in 2 seconds.

**Visual direction:** Darker background (deep green or charcoal) to contrast with the hero and the lighter section below. White text. Four items arranged horizontally on desktop, 2x2 grid on mobile. Simple icons or no icons — the data speaks for itself.

**Interaction ideas:** Subtle count-up animation on the impact statistic when it scrolls into view (e.g., "3,200+ children supported" counts from 0 to 3,200). Fires once only.

**Trust/conversion role:** This is the single most important trust module for first-time visitors. It transforms the charity from "unknown" to "registered and accountable" in one glance.

**Mobile notes:** 2x2 grid with generous padding. Font size must remain readable (14px minimum).

**Design system notes:** Reusable as a "stats bar" on any page. Content is CMS-editable so impact figures can be updated.

---

### Module 4: Featured Campaign / Emergency Appeal

**Strategic purpose:** Surface the most urgent current campaign with a direct donation pathway. This is where crisis-driven visitors convert.

**Key content:**
- Campaign title (e.g., "Palestine Emergency Relief")
- Brief, specific description (2-3 sentences maximum)
- Campaign-specific image from the field
- Donation CTA with pre-set amounts linked to outcomes
- Optional: fundraising progress bar or urgency indicator

**UX function:** This module is the "if you only do one thing, do this" section. It narrows the visitor's focus from the broad charity to a single, actionable campaign.

**Visual direction:**
- Two-column layout: image left, content right (or full-bleed image with overlaid content card)
- Campaign imagery should be from Deen Relief's own fieldwork (the Palestine distribution photos from the media folder are strong candidates)
- Warm, urgent but not panicked — no red "EMERGENCY" banners or flashing elements
- Pre-set donation amount buttons: £25 / £50 / £100 / £250 / Custom — with outcome labels beneath each (e.g., "£50 — feeds a family for a week")

**Interaction ideas:**
- Clicking a preset amount opens the donation panel (see Module: Donation Experience) pre-filled with that amount and campaign
- Progress bar fills with subtle animation
- "Just donated" social proof ticker (optional — pulls from real Stripe webhook data, anonymised)

**Trust/conversion role:** Campaign-specific appeals convert better than general "donate" asks. The outcome-linked amounts answer "what will my money do?" The field imagery proves on-the-ground presence.

**Mobile notes:** Stack vertically — image on top, content below. Preset amounts as a horizontal scroll of large tappable chips. Full-width Donate CTA button.

**Design system notes:** This is the "Campaign Feature" module — reusable on the homepage and on individual campaign pages. The campaign content (title, description, image, amounts) is CMS-driven and swappable. During Ramadan or Dhul Hijjah, a seasonal campaign replaces the default.

---

### Module 5: Cancer Care Centres (Key Differentiator)

**Strategic purpose:** Elevate Deen Relief's most unique programme to a primary brand pillar. This is what no other UK Islamic charity offers.

**Key content:**
- Section title: "A Home of Hope for Children Fighting Cancer"
- Subheading: "Our care centres in Adana, Turkey provide housing, nutrition, and support for Syrian and Gazan refugee children undergoing cancer treatment."
- Specific services listed: free family housing near hospitals, financial assistance for medical expenses, nutritional programmes, case management, spiritual support
- Impact numbers: how many children served, how many families housed
- CTA: "Support Our Cancer Care Centres" / "Learn More"

**UX function:** This module transforms Deen Relief's positioning from "one of many Islamic charities" to "the Islamic charity that runs cancer care centres for refugee children." This is the brand story that sticks in a visitor's memory.

**Visual direction:**
- Use the strongest imagery from the DeenReliefMedia folder — the children with cancer photos are powerful because they show smiling, dignified children, not pitying medical imagery
- The Gulucuk Evi building exterior photo (with children standing in front and Deen Relief signage) proves physical infrastructure
- Consider a short video embed or video thumbnail linking to a documentary-style piece
- Warm, hopeful colour treatment — perhaps a soft cream/warm white background to feel nurturing rather than clinical

**Interaction ideas:**
- Image gallery or subtle carousel of 3-4 images from the centres (not auto-playing — user-controlled)
- "Watch their stories" video play button
- Expandable detail cards for each service offered

**Trust/conversion role:** This module answers the considered giver's question: "What makes Deen Relief different from Islamic Relief or Penny Appeal?" The answer is specific, verifiable, and emotionally powerful. The building signage photo is especially strong — it proves physical presence in a way that text claims cannot.

**Mobile notes:** Single-column. Lead with one strong image. Collapsible service details to avoid long scrolling.

**Design system notes:** This module type — "Programme Spotlight" — is reusable for other core programmes (orphan sponsorship, Bangladesh housing, etc.) on dedicated pages.

---

### Module 6: Ways to Give — Islamic Giving Pathways

**Strategic purpose:** Serve the diverse Islamic giving intents (Zakat, Sadaqah, sponsorship) with clear, distinct pathways. This replaces the current scattered approach.

**Key content — 6 pathway cards:**

1. **Pay Zakat** — "Fulfil your obligation with confidence. Verified Zakat distribution." → Links to Zakat page with calculator
2. **Give Sadaqah** — "Voluntary charity that transforms lives." → Links to general donation or Sadaqah-specific page
3. **Sponsor an Orphan** — "£30/month provides education, nutrition, and shelter." → Links to orphan sponsorship page
4. **Emergency Appeals** — "Urgent relief for those in crisis right now." → Links to active emergency campaigns
5. **Give Monthly** — "Join our community of regular givers. Your Sadaqah Jariyah." → Links to recurring donation setup
6. **Where Most Needed** — "Let us direct your gift where the need is greatest." → Links to general unrestricted donation

**UX function:** This module acts as a routing hub. Each visitor type from the Audience Framework (Section 5) can find their pathway within this grid. The Zakat giver goes to Zakat. The impulse giver goes to Where Most Needed. The relationship-builder goes to orphan sponsorship.

**Visual direction:**
- Six cards in a 3x2 grid on desktop, 2x3 or scrollable on mobile
- Each card has a distinctive icon (not clip art — custom, on-brand icons)
- Consistent card styling but with subtle colour differentiation (e.g., Zakat card has a slightly different accent, Emergency has an urgency indicator)
- Clean, scannable — icon + title + one-line description + arrow/CTA

**Interaction ideas:**
- Hover lift effect on cards
- Subtle icon animation on hover (e.g., the monthly giving icon gently pulses)
- Quick-action: clicking a card goes directly to the relevant donation flow

**Trust/conversion role:** By presenting Islamic giving categories explicitly, this module signals Islamic literacy and donor respect. It says: "We understand how you want to give."

**Mobile notes:** 2-column grid or horizontally scrollable card strip. Large touch targets (minimum 48px hit area).

**Design system notes:** The "Pathway Grid" module is reusable for other categorisation needs (e.g., "Our Work" on the About page, "Browse Campaigns" on a campaigns index).

---

### Module 7: Active Campaigns Grid

**Strategic purpose:** Showcase current campaigns beyond the featured/emergency appeal. Limit to 4-6 campaigns to avoid choice paralysis.

**Key content — priority-ordered campaign cards:**
1. Palestine Emergency Relief (if not already the featured campaign above)
2. Bangladesh Orphan Sponsorship
3. Refugee Children with Cancer
4. Bangladesh Clean Water Aid
5. UK Homeless Community Aid (Brighton)
6. Build a School in Bangladesh

**UX function:** Browseable campaign catalogue. Each card is a gateway to a dedicated campaign page with its own donation form. The grid allows self-selection without overwhelming.

**Visual direction:**
- Card-based layout: 3 across on desktop, 2 on tablet, 1 on mobile
- Each card: campaign image (full-bleed top), title, 1-2 line description, "Donate" CTA
- Consistent card dimensions — image aspect ratio fixed (16:9 or 4:3)
- Subtle "Urgent" badge on emergency campaigns
- No more than 6 cards. If there are more campaigns, show a "View all campaigns" link

**Interaction ideas:**
- Hover: card lifts slightly, image zooms subtly (3-5%)
- Click: navigates to campaign-specific page
- Optional filter tabs above the grid: All | Emergency | Children | Community (only if campaign count justifies it)

**Trust/conversion role:** Multiple campaigns demonstrate breadth of work. Each card with a specific image proves tangible activity. Limiting to 4-6 avoids the current site's problem of 7+ campaigns with no hierarchy.

**Mobile notes:** Single-column stack or horizontal scroll of cards. "View all" link after 3-4 cards.

**Design system notes:** The "Campaign Card" is a core reusable component. It appears on the homepage, campaign index page, and potentially in the donation flow as a campaign selector.

---

### Module 8: Impact & Transparency

**Strategic purpose:** Convert emotional interest into rational trust. This is where the considered giver decides "yes, I trust this charity."

**Key content:**
- 3-4 headline impact statistics:
  - "[X]+ children and families supported"
  - "[X] countries of operation"
  - "Est. 2013 — [X] years of continuous service"
  - "90%+ of funds go directly to programmes" (or verified figure)
- Financial transparency statement: "We are committed to spending no more than 10% on administration. View our Charity Commission filings."
- Link to annual report or Charity Commission page
- Optional: simple pie chart or bar showing fund allocation

**UX function:** This module provides the evidence layer. It transitions the visitor from "I feel something" to "I trust this enough to donate."

**Visual direction:**
- Clean, spacious section — generous white space
- Large, bold numbers (48-64px) with descriptive labels below
- Subtle background texture or light pattern to differentiate from adjacent sections
- If using a chart, keep it extremely simple — no complex infographics
- Colour palette: brand green for the statistics, neutral text for descriptions

**Interaction ideas:**
- Count-up animation on statistics when scrolled into view
- Interactive pie chart that shows fund allocation on hover (optional — only if data is verified and current)
- "View our annual report" link opens a PDF or dedicated transparency page

**Trust/conversion role:** This is critical for first-time donors and for Zakat givers who need assurance their obligatory charity is handled responsibly. The financial transparency statement should be specific, not vague.

**Mobile notes:** Statistics stack vertically. Large numbers remain prominent. Link to annual report must be easily tappable.

**Design system notes:** The "Impact Dashboard" module is reusable on the About page and on individual campaign pages (with campaign-specific statistics).

---

### Module 9: Our Story Preview

**Strategic purpose:** Humanise the charity. The founder story (grassroots Brighton beginnings) creates an emotional anchor that large charities cannot replicate.

**Key content:**
- "From Brighton's streets to a global mission"
- Brief origin: "In 2013, Shabek Ali began distributing food to Brighton's homeless community. Today, Deen Relief operates in [X] countries, runs cancer care centres in Turkey, and has supported [X]+ children worldwide."
- Photo of founder or early team (if available in media assets)
- CTA: "Read Our Full Story"

**UX function:** This provides the narrative arc that makes Deen Relief memorable. Visitors remember stories, not statistics. The grassroots origin is a strength, not a weakness — it signals authenticity.

**Visual direction:**
- Two-column: text left, image right
- Warm, personal tone — this section should feel different from the data-driven sections above
- Perhaps a slightly warmer background colour (cream or light amber) to signal intimacy
- If no founder photo is available, use the Bangladesh community photo (the one with many children and Deen Relief workers) — it captures the spirit of grassroots, on-the-ground work

**Interaction ideas:** Minimal. Let the story and image do the work. A simple "Read more" link.

**Trust/conversion role:** Origin stories build emotional trust. A charity that started from one person's compassion feels more genuine than a faceless institution.

**Mobile notes:** Image above, text below. Keep the text short — 3-4 sentences maximum.

**Design system notes:** The "Story Preview" module is reusable for beneficiary stories, volunteer spotlights, and other narrative content.

---

### Module 10: Partners & Accreditation

**Strategic purpose:** Borrowed credibility. If Islamic Relief, BDRCS, and Human Appeal work with Deen Relief, the visitor can trust Deen Relief by association.

**Key content:**
- Partner logos: Islamic Relief, BDRCS (Bangladesh Red Crescent Society), Human Appeal, Umma Welfare Trust, Read Foundation, Her Sey Bir Gulucuk Icin
- Accreditation badges: Charity Commission, Fundraising Regulator
- Brief contextual line: "Proud to work alongside leading humanitarian organisations worldwide."

**UX function:** Trust-by-association. Logo recognition (especially Islamic Relief and Red Crescent) provides instant credibility.

**Visual direction:**
- Single horizontal row of logos on desktop, 2x3 grid on mobile
- Logos in greyscale or muted colour (not full colour) to avoid visual clutter — they become full colour on hover
- Clean white or very light background
- Small section — this should feel like a quiet, confident credibility statement, not a loud proclamation

**Interaction ideas:** Logos subtly transition from greyscale to full colour on hover. Optional: clicking a partner logo opens a brief tooltip or link to the partnership page.

**Trust/conversion role:** This is the "who else trusts them?" module. It leverages the visitor's existing trust in recognised organisations to transfer credibility to Deen Relief.

**Mobile notes:** 2x3 or 3x2 grid of logos. No interaction needed on mobile — just display them.

**Design system notes:** The "Partner Strip" module is reusable in the footer and on the About page.

---

### Module 11: Latest Updates

**Strategic purpose:** Signal that the charity is active, current, and engaged. A stale blog or news section signals abandonment.

**Key content:**
- 2-3 recent blog posts, campaign updates, or video content
- Each with: thumbnail image, title, date, 1-line excerpt, "Read more" link
- Prioritise: field updates, campaign progress reports, impact stories

**UX function:** Demonstrates currency. A charity with recent updates feels alive. This also serves SEO by surfacing fresh content on the homepage.

**Visual direction:** Card-based, consistent with the campaign cards but smaller/simpler. 3 across on desktop, horizontally scrollable on mobile.

**Interaction ideas:** Standard card hover effects. Link to the full blog/news section.

**Trust/conversion role:** Recency signals. A post from "March 2026" reassures visitors the charity is active. This is why the current site's sporadic blog cadence is problematic.

**Mobile notes:** Horizontal scroll or single-column stack of 2-3 cards.

**Design system notes:** The "Content Card" is a core component reusable across blog, news, and campaign update listings.

---

### Module 12: Newsletter & Social

**Strategic purpose:** Capture email addresses for donor nurturing and create social proof through platform links.

**Key content:**
- "Stay connected with our work" — email signup form
- Social media links: Instagram, Facebook, Twitter/X, YouTube, TikTok (if active)

**UX function:** Lead capture. Not everyone who visits will donate today. An email address creates a future conversion opportunity.

**Visual direction:** Full-width section with a contrasting background (brand green or deep charcoal). Single email input + submit button. Social icons in a clean row.

**Interaction ideas:** Simple form validation. Optional: "Join [X]+ supporters" social proof number next to the signup.

**Trust/conversion role:** Ongoing relationship building. Most first-time charity website visitors do not donate — they need 3-7 touchpoints. Email is the most effective nurturing channel.

**Mobile notes:** Full-width input, large submit button. Social icons with generous spacing for thumb targeting.

**Design system notes:** The "CTA Strip" module is reusable for any full-width call-to-action section (newsletter, volunteer signup, etc.).

---

### Module 13: Footer

**Strategic purpose:** Comprehensive navigation, legal compliance, and contact information.

**Key content:**
- **Column 1:** Deen Relief logo, tagline, brief mission statement (2 lines max)
- **Column 2:** Quick links — Our Work, Give, Zakat, About, Blog, Contact, Volunteer
- **Column 3:** Legal — Privacy Policy, Terms & Conditions, Accessibility Statement, Safeguarding Policy
- **Column 4:** Contact — ONE clear address (resolve the Brighton vs. London confusion), ONE clear phone number, email addresses (info@ and donations@)
- **Bottom bar:** "Charity Commission Reg. No. 1158608 | Company No. 08593822 | Fundraising Regulator" with badges
- Social media icons

**UX function:** Catch-all navigation and legal compliance. Visitors who scroll to the bottom are either thorough researchers or looking for something specific.

**Visual direction:** Dark background (charcoal or deep green). Light/white text. Clean columns. Registration numbers and badges prominently displayed.

**Mobile notes:** Columns stack vertically. Collapsible sections to reduce scroll length.

**Design system notes:** Footer is a global component, identical across all pages.

---

## 8. Donation Experience Strategy

### 8.1 Donation Entry Points on the Homepage

The homepage must have **four distinct donation entry points**, each serving a different user intent:

1. **Sticky header "Donate" button** — ever-present, for the ready-to-give visitor. Opens the donation panel.
2. **Hero section CTA** — "Donate Now" in the hero. Opens the donation panel with "Where Most Needed" pre-selected.
3. **Featured campaign donation amounts** — preset £25/£50/£100/£250 buttons within the campaign module. Opens the donation panel with that campaign and amount pre-selected.
4. **Islamic giving pathway cards** — each card (Zakat, Sadaqah, etc.) leads to a donation flow with the giving type pre-selected.

### 8.2 The Donation Panel — Structure

The donation panel should be a **slide-in side panel** (desktop) or **full-screen overlay** (mobile) that appears without leaving the homepage. This keeps the donor in context and avoids the jarring redirect to a separate page.

**Panel layout (top to bottom):**

```
┌─────────────────────────────┐
│  DONATE TO DEEN RELIEF      │
│  [Close X]                  │
├─────────────────────────────┤
│  Campaign Selector          │
│  [Where Most Needed ▼]      │
│  or [Pre-selected campaign] │
├─────────────────────────────┤
│  Giving Type                │
│  [Sadaqah] [Zakat] [Other]  │
├─────────────────────────────┤
│  Frequency                  │
│  [One-time] [Monthly ★]     │
│  [Weekly] [Quarterly]       │
├─────────────────────────────┤
│  Amount                     │
│  [£25] [£50★] [£100] [£250] │
│  [Custom: £____]            │
│                             │
│  "£50 feeds a family for    │
│   one week"                 │
├─────────────────────────────┤
│  Quick Donate               │
│  [Apple Pay] [Google Pay]   │
│  [Link]                     │
├─────────────────────────────┤
│  Or pay by card             │
│  ┌───────────────────────┐  │
│  │ Stripe Payment Element│  │
│  │ (card, bank, etc.)    │  │
│  └───────────────────────┘  │
├─────────────────────────────┤
│  □ I am a UK taxpayer —     │
│    add 25% via Gift Aid     │
│                             │
│  □ Cover the processing fee │
│    (+ £0.80)                │
├─────────────────────────────┤
│  [DONATE £50.00]            │
├─────────────────────────────┤
│  🔒 Secure payment via      │
│  Stripe. Reg. charity       │
│  No. 1158608                │
└─────────────────────────────┘
```

### 8.3 One-Time vs. Recurring Logic

- **Monthly is the recommended default** — pre-selected with a subtle "Recommended" badge or star
- Frequency options: One-time | Weekly | Monthly (recommended) | Quarterly
- For recurring donations: Stripe Subscriptions handle billing automatically
- Donors can manage/cancel via Stripe Customer Portal (linked from a future "My Donations" page or email receipts)
- Recurring giving framed as Sadaqah Jariyah (ongoing charity) — this is spiritually resonant for Muslim donors

### 8.4 Campaign-Specific vs. General Donation Logic

- **Default campaign: "Where Most Needed"** — unrestricted funds that the charity can allocate where impact is greatest
- **Campaign selector dropdown** — lists active campaigns (Palestine Emergency, Cancer Care Centres, Orphan Sponsorship, Clean Water, etc.)
- **Pre-selection:** when a donor arrives via a campaign card or campaign page, the panel opens with that campaign pre-selected
- **Stripe metadata:** every donation is tagged with `campaign`, `giving_type` (zakat/sadaqah/general), `frequency`, and `gift_aid` status
- **Fund allocation:** the backend uses Stripe metadata to route donations to the correct restricted or unrestricted fund

### 8.5 How Stripe Is Used — Practical Stack

| Component | Stripe Feature | Purpose |
|---|---|---|
| Card payment | Payment Element (embedded) | Brand-matched card input |
| Apple Pay / Google Pay | Express Checkout Element | One-tap mobile donations |
| Link (Stripe) | Express Checkout Element | Returning donor fast checkout |
| Recurring billing | Stripe Subscriptions | Weekly/monthly/quarterly automation |
| Campaign tagging | Metadata on PaymentIntent/Subscription | Fund allocation and reporting |
| Donor self-service | Customer Portal | Manage recurring, update card, cancel |
| Visual matching | Appearance API | Green brand colours, matching fonts |
| Fee coverage | Custom calculation | "Cover the fee" adds adjusted amount |

### 8.6 What to Prioritise for Donor Conversion and Trust

**Prioritise:**
- Express Checkout (Apple Pay/Google Pay) at the top of the panel — fastest path to completion
- Outcome-linked amounts with real impact labels (research what £25, £50, £100 actually provides)
- Gift Aid checkbox with clear explanation — this adds 25% at no cost to the donor
- "Cover the fee" option — frames donor as generous, charity receives 100%
- Security and registration badge at the bottom of the panel
- Post-donation confirmation with specific impact message and shareable receipt

**Avoid:**
- Multi-page donation flows (keep everything in one panel/screen)
- Requiring account creation before donating
- Asking for unnecessary information (name, address only if needed for Gift Aid; email is essential for receipt)
- Showing the Stripe branding too prominently — the donor should feel they're giving to Deen Relief, not to Stripe
- Pop-up donation asks on page load (intrusive and counterproductive)
- Auto-playing urgency timers or fake countdown clocks

### 8.7 Zakat-Specific Considerations

- Zakat donations must be clearly segregated from general funds (Stripe metadata: `giving_type: "zakat"`)
- Consider adding a Zakat calculator that outputs a recommended donation amount and feeds directly into the donation panel
- Zakat page should reference the four-pathway framework (Emergency Relief, Medical Support, Family Essentials, Recovery & Stability)
- Consider stating Zakat compliance policy (how Zakat funds are distributed, any scholarly oversight or policy)
- Live nisab values would be ideal but require an external data source (gold/silver prices) — flag as a phase 2 enhancement if too complex initially

---

## 9. Visual and Creative Direction

### 9.1 Recommended Visual Tone
**Warm, grounded, and confident.** The site should feel like a charity run by people who care deeply and operate with professional discipline. Not cold and institutional (Islamic Relief), not playful and pop (Penny Appeal). The aesthetic should communicate: "We are serious about this work, and we are right there on the ground."

### 9.2 Layout Philosophy
- **Generous white space** — let content breathe. The current Elementor site is too dense.
- **Strong vertical rhythm** — consistent spacing between sections (e.g., 80px on desktop, 48px on mobile)
- **Asymmetric grids** where appropriate — avoid the monotony of perfectly centred, symmetrical layouts on every section
- **Full-bleed imagery** for emotional sections, contained grids for informational sections
- **No carousels as primary content delivery** — carousels are acceptable for secondary content (image galleries, testimonials) with user controls, but never for the hero or primary campaign

### 9.3 Image Strategy
- **Primary source: DeenReliefMedia folder** — these images are authentic, on-brand, and irreplaceable. They show real Deen Relief workers, real beneficiaries, and real facilities.
- **Hero-worthy images from the folder:**
  - The Gulucuk Evi exterior with children (proves physical presence)
  - The Bangladesh community photo with 30+ smiling children (captures joy and scale)
  - The Palestine relief distribution photos (proves crisis response capability)
- **Image treatment:** Minimal filtering. These photos are powerful because they're real. Avoid heavy colour grading that makes them look like stock photography.
- **Image sizing:** Serve images in WebP format with responsive srcsets. Original files are a mix of JPEG and WebP — standardise on WebP for the web.
- **Never use stock photography.** Deen Relief's real imagery is its strongest visual asset. If new photography is needed, it should be from the field, not from a stock library.

### 9.4 Typography Direction
- **Headline font:** A clean, warm serif (e.g., Lora, Merriweather, or Source Serif Pro from Google Fonts) — serif headlines signal credibility and editorial quality without feeling stuffy
- **Body font:** A highly readable sans-serif (e.g., Inter, DM Sans, or Plus Jakarta Sans) — clean, modern, excellent at small sizes
- **Arabic text support:** If Quranic verses or Arabic content is included, ensure the font stack supports Arabic script gracefully (Noto Sans Arabic as a fallback)
- **Hierarchy:** 3-4 clear heading levels, consistent body text size (16-18px base), generous line height (1.5-1.6 for body)

### 9.5 Colour Application Logic

**Primary palette (from logo):**
- **Brand Green:** #2D6A2E (approximate from logo — deep, Islamic green) — used for logo, primary accents, links, and section highlights
- **Dark Green:** #1B4D1C — used for header/footer backgrounds, dark overlays
- **Light Green:** #E8F5E9 — used for light backgrounds, subtle card tints

**Accent palette (new — to differentiate from competitor greens):**
- **Warm Amber/Gold:** #D4A843 or similar — used for the Donate CTA button, key action elements, and highlights. This is the conversion colour. It contrasts with green and signals warmth and generosity.
- **Why amber?** Every major Islamic charity uses green. Penny Appeal differentiates with orange. Human Appeal uses purple. Muslim Hands uses burgundy. Deen Relief can own green + amber — the green maintains Islamic identity, the amber adds warmth and differentiation.

**Neutral palette:**
- **Charcoal:** #1A1A2E — primary text colour
- **Medium Grey:** #6B7280 — secondary text, captions
- **Light Grey:** #F3F4F6 — section backgrounds, card backgrounds
- **White:** #FFFFFF — primary content backgrounds
- **Cream:** #FDF8F0 — warm background for storytelling sections

**Rules:**
- Green for identity and structural elements (nav, headings, accents)
- Amber/gold exclusively for action elements (donate buttons, key CTAs)
- Neutrals for content readability
- Never use red for urgency (it conflicts with the warm, dignified tone)
- Emergency campaign urgency communicated through language and layout, not colour screaming

### 9.6 Motion/Animation Principles
- **Purposeful, not decorative** — every animation must serve UX (guide attention, confirm action, reveal content)
- **Subtle and fast** — transitions of 200-400ms. Nothing should feel slow or bouncy.
- **Scroll-triggered reveals** — content sections fade/slide in gently as they enter the viewport (using Intersection Observer, not scroll-jacking)
- **Count-up statistics** — impact numbers count up when the Trust Bar or Impact section enters view
- **Hover states** — cards lift slightly, buttons darken, icons subtly animate
- **No parallax on mobile** — performance concern
- **No auto-playing video or audio** — ever
- **Loading states** — skeleton screens for dynamic content (donation panel, campaign data)
- **Recommended library:** Framer Motion (React ecosystem) — production-grade, accessible, performant

### 9.7 Iconography/Illustration Guidance
- **Custom icon set** — not generic Material or Font Awesome icons. A simple, consistent line-icon set (2px stroke, rounded caps) in brand green for the Islamic giving pathway cards and campaign categories.
- **No illustrations or clip art.** The brand strength is in real photography. Illustrations would introduce a stylistic disconnect.
- **Icon style:** Minimal, geometric, referencing Islamic geometric patterns subtly (octagonal frames, interlocking shapes) without being literal or ornate.

### 9.8 How to Feel Premium Without Feeling Corporate or Cold
- Use **real photography of real people** — this is the antidote to corporate coldness
- **Warm colour accents** (amber, cream backgrounds) prevent the clinical feel that pure white + green can create
- **Serif headlines** add editorial warmth that pure sans-serif stacks lack
- **Generous spacing** feels confident, not empty
- **Human language** — "We run care centres" not "Our organisation facilitates healthcare initiatives"
- **The founder story** grounds the charity in personal authenticity
- **Avoid:** corporate stock imagery, excessive gradients, overly polished animation, buzzword-heavy copy

---

## 10. Trust, Legitimacy, and Charity-Specific Credibility Framework

### Elements That Must Appear on the Homepage:

**Tier 1 — Non-negotiable (above the fold or within first scroll):**
- Charity Commission Registration No. 1158608
- "Est. 2013" — years of operation
- One headline impact statistic
- Financial transparency statement ("90%+ to programmes" or verified figure)

**Tier 2 — Essential (visible without deep scrolling):**
- Partner logos (Islamic Relief, BDRCS, Human Appeal)
- Fundraising Regulator badge (Deen Relief should register if not already)
- Field photography proving on-the-ground presence
- Branded building/facility image (Gulucuk Evi signage)
- Specific impact numbers (children supported, families housed, etc.)

**Tier 3 — Supporting (lower on the page or in footer):**
- Company registration number
- Link to Charity Commission public page
- Link to annual report / financial statements
- Physical address (ONE clear address — resolve the current confusion)
- Contact phone number and email
- Safeguarding policy link
- Privacy policy link
- Accessibility statement link

**Tier 4 — Aspirational (build toward these):**
- Annual impact report (downloadable PDF or dedicated page)
- Financial breakdown chart (income vs. expenditure vs. programme delivery)
- Beneficiary testimonials with named individuals (with consent)
- Independent audit reference
- Scholar endorsement or Zakat advisory board (if applicable)
- Fundraising Regulator registration (if not already held)

### Trust Friction Points to Eliminate:
- **Two addresses (Brighton vs. London)** — pick one as the primary address or clearly label them (registered office vs. operational office)
- **Two phone numbers with no explanation** — designate one as the main line
- **No annual report accessible on-site** — this must be added
- **No Fundraising Regulator badge** — register and display it
- **Generic hero ("Welcome to Deen Relief")** — replace with specific, confident messaging
- **Broken pages and 404s** — the new site must have zero dead links at launch

---

## 11. Accessibility, Responsiveness, and Performance Principles

### Accessibility Standards
- **WCAG 2.1 AA compliance** as the minimum standard
- Semantic HTML5 (proper heading hierarchy: one h1 per page, logical h2/h3 nesting)
- ARIA labels on all interactive elements
- Skip-to-content link as the first focusable element
- Keyboard navigation support throughout (tab order, focus indicators)
- Colour contrast ratios: minimum 4.5:1 for body text, 3:1 for large text
- Alt text on all images (descriptive, not decorative — "Deen Relief worker distributing food parcels in Palestine displacement camp" not "image1")
- Form labels associated with inputs
- Error states clearly communicated (not colour-only — include text and icons)
- Donation panel fully keyboard-navigable
- Accessibility statement page linked from footer

### Responsiveness
- **Mobile-first design** — design for 375px first, scale up to desktop
- **Breakpoints:** 375px (mobile), 768px (tablet), 1024px (small desktop), 1280px (desktop), 1440px (large desktop)
- **Touch targets:** minimum 44x44px for interactive elements on mobile
- **No horizontal scrolling** on any viewport (except intentional card carousels with scroll indicators)
- **Images:** responsive srcsets with WebP format, lazy loading below the fold
- **Typography:** fluid type scaling (clamp() function) for headlines
- **Navigation:** hamburger menu on mobile with full-screen overlay, donate button always visible

### Performance
- **Target:** Lighthouse score of 90+ on Performance, Accessibility, Best Practices, and SEO
- **Core Web Vitals targets:** LCP < 2.5s, FID < 100ms, CLS < 0.1
- **Image optimisation:** WebP format, responsive sizing, lazy loading, blur-up placeholders
- **Font loading:** font-display: swap to prevent FOIT (flash of invisible text)
- **JavaScript:** tree-shaking, code splitting by route, defer non-critical scripts
- **CSS:** Tailwind's purge removes unused classes, resulting in small CSS bundles
- **Hosting:** static/hybrid rendering via Next.js on Vercel (or similar) — global CDN, edge functions
- **No render-blocking resources** above the fold

---

## 12. Design System Implications

### How the Homepage Informs the Future Design System

The homepage plan intentionally uses modular, reusable components that will form the foundation of a sitewide design system:

### Reusable Modules

| Module | Homepage Use | Future Reuse |
|---|---|---|
| Hero | Homepage hero | Campaign landing pages, seasonal pages |
| Trust Bar | Homepage trust strip | About page, donation page |
| Campaign Feature | Featured emergency appeal | Individual campaign pages |
| Programme Spotlight | Cancer care centres | Orphan sponsorship, clean water, housing pages |
| Pathway Grid | Islamic giving pathways | "Our Work" index, "Get Involved" page |
| Campaign Card | Active campaigns grid | Campaign index, search results, blog related campaigns |
| Impact Dashboard | Homepage statistics | About page, annual report page, campaign impact sections |
| Story Preview | Our story teaser | Beneficiary stories, volunteer stories, blog previews |
| Partner Strip | Partner logos | About page, footer |
| Content Card | Latest updates | Blog listing, news archive, resource library |
| CTA Strip | Newsletter signup | Volunteer signup, event registration, campaign-specific CTAs |
| Donation Panel | Slide-in donation flow | Standalone donation page, campaign page embedded forms |

### Reusable Patterns

- **Card pattern:** Image + title + description + CTA. Consistent padding, border-radius, shadow. Used for campaigns, blog posts, giving pathways, team members.
- **Section pattern:** Full-width section with heading, optional subheading, content area, optional CTA. Consistent vertical spacing (80px desktop, 48px mobile).
- **Stat pattern:** Large number + label + optional icon. Used in Trust Bar, Impact Dashboard, campaign progress.
- **Form pattern:** Label + input + validation + submit. Consistent styling for donation forms, newsletter signup, contact forms, volunteer applications.
- **Button hierarchy:** Primary (amber, filled), Secondary (green, outlined), Tertiary (text link with arrow). Consistent sizing and padding.

### Flexible Consistency

The design system should enforce:
- Consistent typography scale (headings, body, captions, labels)
- Consistent colour palette application
- Consistent spacing scale (4px base unit: 4, 8, 12, 16, 24, 32, 48, 64, 80, 96, 128)
- Consistent border-radius (8px for cards, 4px for inputs, 24px for buttons)
- Consistent shadow levels (sm, md, lg for elevation)

But allow:
- **Section background variation** — white, light grey, cream, dark green, charcoal. Different pages can use different background sequences to avoid monotony.
- **Layout variation** — left-aligned image sections alternate with right-aligned; full-bleed sections alternate with contained grids.
- **Density variation** — the homepage is spacious and editorial; a campaign page might be denser and more action-oriented; the About page might be long-form and narrative.
- **Colour accent variation** — individual campaigns can have their own accent colour (within the palette) to create visual identity for each cause.

### Page Variation Without Chaos

The principle is: **same components, different composition.** Every page uses the same building blocks (cards, sections, CTAs, stat bars) but arranges them differently to match the page's purpose and mood. A Tailwind + React component library makes this trivial — components accept props for layout, colour, and density variants.

---

## 13. Recommended Tech/Product Direction

### Recommended Stack: Next.js + Tailwind CSS + Stripe

| Layer | Technology | Why |
|---|---|---|
| **Framework** | Next.js (App Router) | Server/static hybrid rendering, excellent performance, React ecosystem, image optimisation built-in, API routes for Stripe backend, Vercel deployment with global CDN |
| **Styling** | Tailwind CSS | Utility-first CSS that naturally produces a consistent design system, purges unused styles for tiny bundles, responsive utilities, excellent developer experience |
| **Animation** | Framer Motion | Production-grade React animation library, accessible (respects prefers-reduced-motion), performant, scroll-triggered animations |
| **Payments** | Stripe (Elements + Subscriptions + Customer Portal) | Full creative control over donation UX, Apple Pay/Google Pay, recurring billing, campaign metadata, nonprofit pricing |
| **CMS** | Sanity or Contentful (headless) | Allows non-technical team members to update campaign content, blog posts, impact statistics, and hero content without code changes |
| **Hosting** | Vercel | Zero-config Next.js deployment, global CDN, serverless functions for Stripe API calls, automatic HTTPS, preview deployments |
| **Email** | Resend or SendGrid | Transactional emails (donation receipts, Gift Aid confirmations), newsletter campaigns |
| **Analytics** | Plausible or Fathom | Privacy-friendly analytics (no cookie banners needed), GDPR compliant, lightweight |

### Why Not Other Stacks?

| Alternative | Assessment |
|---|---|
| **WordPress + Elementor** | What you're leaving. Template-driven, limited design freedom, plugin dependency, security maintenance burden, poor performance baseline. |
| **Astro** | Excellent for static content sites. Weaker for the dynamic donation panel, user authentication, and Stripe webhook handling that Deen Relief needs. Could work but Next.js is more versatile. |
| **Vue / Nuxt** | Viable, but the React ecosystem has stronger Stripe integration libraries, more component options (Framer Motion, Radix UI), and larger hiring pool if you need help. |
| **Plain HTML/CSS/JS** | No component reuse, no server-side rendering, manual routing, difficult to maintain a design system. Not appropriate for this scope. |
| **Gatsby** | Declining ecosystem. Next.js has surpassed it in every dimension. |
| **Webflow / Squarespace** | Same category of limitation as WordPress — constrained design freedom, limited Stripe integration, not suitable for a custom donation experience. |

### Stack Justification by Requirement

- **Maintainability:** Next.js + Tailwind uses file-based routing, component composition, and utility classes — the codebase is readable and modifiable by any React developer.
- **Performance:** Static generation for content pages, server rendering for dynamic pages, automatic image optimisation (next/image), Tailwind's tiny CSS bundles, Vercel's global CDN.
- **CMS/editorial practicality:** A headless CMS (Sanity or Contentful) allows Deen Relief team members to update campaigns, blog posts, hero content, and impact statistics without touching code. Both offer free tiers suitable for a charity's content volume.
- **Donation integration:** Next.js API routes handle Stripe PaymentIntent creation, webhook processing, and subscription management server-side. The frontend uses Stripe Elements for a fully branded experience.
- **Animation/design freedom:** Framer Motion provides scroll-triggered reveals, page transitions, and micro-interactions. Tailwind's utility classes enable pixel-perfect implementation of the design system.
- **Scalability:** Adding a new campaign page means creating a new entry in the CMS and the component template handles the rest. The design system scales through composition, not duplication.

### CMS Recommendation: Sanity (Preferred)

- Free tier (3 users, 500k API requests/month) is sufficient for Deen Relief's team size
- Real-time collaborative editing (both you and your partner can edit simultaneously)
- Custom schemas match the content model perfectly (campaigns, blog posts, impact stats, hero content)
- Excellent Next.js integration via official libraries
- Media asset management built-in
- Portable Text for rich content (better than Markdown for non-technical editors)
- GROQ query language is powerful for complex content relationships

---

## 14. Risks and Pitfalls

### Design Risks
1. **Trying to say too much on the homepage** — the current site's biggest problem. The redesign must resist the temptation to feature every campaign above the fold. Curation is trust.
2. **Losing brand authenticity in pursuit of "premium"** — if the redesign feels like a generic agency template, it undermines the grassroots authenticity that is Deen Relief's strength. Every design decision must pass the test: "Does this still feel like Deen Relief?"
3. **Over-designing the donation flow** — the donation panel should be efficient, not elaborate. Clever animations and multi-step wizards add friction. Speed to completion is the priority.
4. **Ignoring mobile** — if the site is designed desktop-first and "made responsive," the mobile experience will be compromised. 60%+ of traffic and a growing majority of donations happen on mobile.

### Technical Risks
5. **Scope creep into full-site build** — the plan is homepage-first for a reason. Building the entire site before launching anything means months of no visible progress. Launch the homepage, then build outward.
6. **CMS over-engineering** — a headless CMS is recommended for editorial flexibility, but the initial build can hardcode content and add CMS integration in a second phase. Don't let CMS setup block the homepage launch.
7. **Stripe integration complexity** — Stripe's API is well-documented but requires server-side code for PaymentIntents, webhook handling, and subscription management. Budget development time for this. Use Stripe's official examples as starting points.
8. **Gift Aid compliance** — Gift Aid declarations have legal requirements (full name, home address, declaration text). The implementation must meet HMRC requirements, not just look like a checkbox.

### Organisational Risks
9. **Content gaps** — the homepage plan assumes specific content (impact statistics, financial transparency figures, campaign descriptions) that may not currently exist in verified form. Before building, the charity needs to compile these numbers.
10. **Photography quality** — the existing media folder has strong imagery, but some images are low resolution or poorly lit. The homepage design should be flexible enough to work with the available assets while planning for higher-quality photography in the future.
11. **Ongoing content maintenance** — the current site has stale blog posts and broken links. The redesigned site will suffer the same fate unless someone is responsible for regular content updates. A CMS makes this easier but doesn't solve the human commitment problem.
12. **Domain and DNS transition** — moving deenrelief.org from WordPress hosting to Vercel requires DNS changes. Plan for the transition carefully to avoid downtime during the switch.

---

## 15. Clear Next Steps

### Immediate (Before Building)

1. **Verify impact data** — Compile exact, verified numbers for: children supported, families housed, countries of operation, percentage of funds to programmes. These numbers are foundational to the trust framework. Do not estimate or round up.

2. **Resolve the address issue** — Decide on one primary contact address for the website. If both Brighton and London are legitimate, label them clearly (e.g., "Registered Office" and "Operational Office").

3. **Confirm Fundraising Regulator status** — Check if Deen Relief is registered with the Fundraising Regulator. If not, begin the registration process. The badge is a sector standard.

4. **Review photography assets** — Identify the 8-10 strongest photographs from the DeenReliefMedia folder for the homepage. Assess resolution and quality. Plan for any additional photography needed.

5. **Set up Stripe account** — Create a Stripe account (if not already done), apply for nonprofit pricing, and configure the account for GBP with test mode for development.

6. **Set up development environment** — Initialize the Next.js project, configure Tailwind CSS, set up the GitHub repository for collaboration, deploy to Vercel for live preview.

### Phase 1: Homepage Build

7. **Build the component library** — Start with the reusable components: Button, Card, Section, StatBar, Header, Footer, DonationPanel.

8. **Build the homepage** — Implement the 13 modules in order, using hardcoded content initially. Connect Stripe for the donation panel.

9. **Test the donation flow end-to-end** — Test with Stripe test mode: one-time donations, recurring subscriptions, Apple Pay, Gift Aid metadata, campaign tagging.

10. **Mobile testing** — Test on real devices (iPhone, Android), not just browser DevTools. Fix any touch target, layout, or performance issues.

11. **Accessibility audit** — Run Lighthouse, axe-core, and manual keyboard navigation testing. Fix any issues before launch.

12. **Launch the homepage** — Deploy to deenrelief.org. This replaces the WordPress homepage. Other pages can initially redirect to their WordPress equivalents while you build them.

### Phase 2: Design System + Site Expansion

13. **Formalise the design system** — Document the component library, colour palette, typography scale, spacing system, and usage guidelines.

14. **Build campaign page template** — Using the design system, create a reusable campaign page that pulls content from the CMS.

15. **Build the Zakat page** — Zakat calculator, giving pathways, scholarly compliance information.

16. **Build remaining pages** — About, Contact, Blog, individual campaign pages, volunteer page.

17. **Integrate CMS** — Connect Sanity or Contentful so the team can manage content without code changes.

18. **Build donor features** — Donor dashboard (donation history, recurring management, Gift Aid status), powered by Stripe Customer Portal and custom API.

---

## 16. Final Distilled Build Brief

### For the Next Implementation Session

**Project:** Deen Relief Homepage Redesign
**URL:** deenrelief.org
**Stack:** Next.js 14+ (App Router) + Tailwind CSS + Framer Motion + Stripe Elements
**Hosting:** Vercel
**Repository:** GitHub (collaborative, you + partner)

**What to Build:**
A single-page homepage with 13 modules (see Section 7), a slide-in donation panel powered by Stripe (see Section 8), and a responsive design system foundation (see Section 12).

**Design Tokens:**
- Brand Green: #2D6A2E
- Dark Green: #1B4D1C
- Light Green: #E8F5E9
- Amber/Gold (CTA): #D4A843
- Charcoal: #1A1A2E
- Cream: #FDF8F0
- Border radius: 8px (cards), 4px (inputs), 24px (buttons)
- Spacing scale: 4px base (4, 8, 12, 16, 24, 32, 48, 64, 80)
- Headline font: Lora or Source Serif Pro (Google Fonts)
- Body font: Inter or DM Sans (Google Fonts)

**Content Requirements (must be provided by the charity):**
- Verified impact statistics
- Financial transparency percentage
- Confirmed primary address
- Campaign descriptions and donation amounts with outcome labels
- High-resolution hero image selection from DeenReliefMedia folder

**Stripe Integration Requirements:**
- Stripe account with nonprofit pricing applied
- Payment Element (embedded) with Appearance API branding
- Express Checkout Element (Apple Pay, Google Pay, Link)
- Subscriptions for recurring donations
- Metadata tagging: campaign, giving_type, gift_aid, frequency
- Gift Aid checkbox (custom, not Stripe-native)
- "Cover the fee" calculation (custom)

**Key Principles:**
- Mobile-first
- One hero image, not a carousel
- Mission-first headline, not "Welcome to..."
- Monthly giving as default
- Cancer care centres as the key differentiator
- Maximum 6 campaigns on homepage
- Trust signals near every donation touchpoint
- WCAG 2.1 AA accessibility
- Lighthouse 90+ across all categories

**What NOT to Do:**
- Don't build the full site — homepage only in Phase 1
- Don't integrate a CMS yet — hardcode content initially
- Don't build a donor dashboard yet — that's Phase 2
- Don't use stock photography
- Don't add more than 6 campaigns to the homepage grid
- Don't use a carousel for the hero
- Don't require account creation to donate

---

*This plan was produced through systematic research of deenrelief.org, analysis of the DeenReliefMedia asset folder, benchmarking against Islamic Relief UK, Muslim Aid, Penny Appeal, Human Appeal, Muslim Hands, and LaunchGood, benchmarking against charity:water, Save the Children, WaterAid, British Red Cross, and Macmillan Cancer Support, and thorough research of Stripe's payment infrastructure capabilities.*
