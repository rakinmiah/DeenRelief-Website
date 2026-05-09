# Deen Relief Bazaar — V1 Pitch Pack

> **For:** Deen Relief client review
> **Status:** Mockup live in development environment, ready to walk through
> **Live preview:** `npm run dev` → visit `/bazaar` (and the URLs listed below)

---

## 1. The proposition in one sentence

A small e-commerce shop attached to the Deen Relief website, selling 6-8 hand-made Islamic clothing and goods, where every piece is made by a named person we work with directly in Bangladesh or Turkey, paid 3-4× regional commercial rates, with the surplus profits gift-aided back into the charity's programmes.

The angle is **commerce as charity, not the reverse**. The customer buys a real, well-made product; the supply chain happens to be ethical. They are not "donating with a thank-you gift" — that framing sets the wrong legal and emotional expectations.

---

## 2. What the customer sees — a click-through tour

All these pages are live in the mockup. Walk through them in this order to see the full experience the way a customer would.

### `/bazaar` — Catalog landing
- **Hero**: thesis statement before any product appears.
- **The Promise** strip: three commitments (named makers / fair pay / surplus to charity).
- **Featured maker preview**: hooks the donor with one human story before they browse.
- **Catalog grid**: 8 placeholder products with maker attribution, low-stock indicators, region tags.
- **Trust strip footer**: shipping, returns, charity number.

### `/bazaar/[slug]` — Product detail
Try `/bazaar/the-sylhet-abaya` (the flagship example).
- **Above the fold**: gallery + price + variant picker + quantity + buy CTAs.
- **Below the fold**: description, materials, care instructions, sizing guide.
- **Then** — and only then — the full **Maker block**: a half-page, image-led module with the maker's photograph, story, and a direct quote. This is the moat.
- **Cross-sell**: 3 other pieces from the collection.

### `/bazaar/cart` — Cart
- Line items with variant labels and per-product maker attribution.
- Quantity adjustment, remove item, empty cart.
- **Free-shipping progress bar** — proven AOV nudge.
- Order summary with shipping cost and total.
- Checkout button (currently routes to a preview page; will route to Stripe Checkout post-launch).

### `/bazaar/order/preview` — Post-purchase confirmation
This is what customers see after a successful Stripe Checkout. In the mockup, hitting "Checkout securely" lands here.

### `/bazaar/about-our-makers` — Brand-story page
Standalone page that tells the story of the makers themselves. Donors arrive here from the catalog hero or from the maker block on a product page. It's the page they share with friends.

### `/bazaar/our-promise` — Transparency / trust
Three explicit promises (to makers, to customers, about the money), with policy links.

### `/bazaar/shipping` and `/bazaar/returns` — Policy pages
The detail behind the trust strip. Required by UK Consumer Contracts Regulations.

### `/admin/bazaar/orders` — Internal fulfillment dashboard
*Not customer-facing.* This is what the team sees when they log in to fulfil orders. Currently open for the pitch demo; gated behind admin auth in production.

### `/admin/bazaar/orders/[any-id]` — Order detail
Try `/admin/bazaar/orders/DR-BZR-A4F2K9X1`. Shows: line items with maker attribution, shipping address, customer record, total weight estimate, and the action panel for marking the order shipped with a Royal Mail tracking number.

---

## 3. The customer journey — start to finish

```
1. Discovery
   ├─ Email newsletter to existing donors
   ├─ Instagram / TikTok content about a specific maker
   ├─ Organic search ("ethical abaya UK", "muslim charity shop UK")
   └─ Cross-link from /our-work pages on the main site

2. Landing
   ├─ /bazaar — story-led hero
   └─ /bazaar/[product] — direct product link from social/email

3. Consideration
   ├─ Reads maker block, sees the story
   ├─ Checks materials, sizing guide, care instructions
   ├─ Clicks through to /bazaar/about-our-makers (optional)
   └─ Clicks "Add to cart" or "Buy now"

4. Cart
   ├─ /bazaar/cart — reviews items, may add a small item to clear free-shipping threshold
   └─ Clicks "Checkout securely"

5. Checkout
   ├─ Redirected to Stripe Checkout (hosted, PCI-compliant)
   ├─ Enters shipping address (UK only at launch)
   ├─ Enters card details (Apple Pay / Google Pay also offered automatically)
   └─ Submits payment

6. Confirmation
   ├─ Stripe redirects back to /bazaar/order/[stripe-session-id]
   ├─ Customer sees confirmation page with order number, items, total
   ├─ Confirmation email arrives (via Resend)
   └─ Cart is cleared

7. Fulfillment (server-side, kicked off by Stripe webhook)
   ├─ Webhook fires on payment_intent.succeeded
   ├─ Order row inserted in Supabase with status = "paid"
   ├─ Stock count decremented atomically
   ├─ GA4 purchase event fired server-side (with commerce: true flag)
   └─ Order appears in /admin/bazaar/orders

8. Shipping (manual, daily/weekly batched)
   ├─ Team opens /admin/bazaar/orders
   ├─ Exports pending orders as CSV
   ├─ Bulk-uploads to Royal Mail Click & Drop
   ├─ Prints labels on adhesive paper
   ├─ Packs each order with the maker tag in the parcel
   ├─ Drops at Royal Mail Customer Service Point
   └─ Marks each as "shipped" with tracking number

9. In transit
   ├─ Customer receives shipping email with Royal Mail tracking link
   └─ Royal Mail Tracked 48 delivers in 2-4 working days

10. Delivered
    ├─ Customer receives parcel with maker tag inside
    ├─ Tag has maker's first name, region, and a QR code to /bazaar/about-our-makers
    └─ Order status auto-updates to "delivered" via Royal Mail API (or manually)

11. Aftercare
    ├─ Optional: 7-day post-delivery email asking for feedback
    ├─ If returns: customer emails hello@deenrelief.org → admin processes
    └─ If review-positive: post-purchase email asking for a review
```

---

## 4. The fulfillment plan — operational ops

### Inventory storage
- £500 of inventory fits in 3-4 large boxes
- Store at a clean, dry location (spare room, garage, or small leased storage unit)
- Don't pay for warehousing yet — at <50 orders/month it's not justified
- When you cross ~50 orders/month, look at services like **Huboo** (UK-based, ~£0.50/order pick-and-pack)

### Order fulfillment workflow
**Daily (10 minutes) or twice-weekly (30 minutes), whichever fits the team's rhythm:**

1. **Open `/admin/bazaar/orders`** — see all orders with status `paid`
2. **Export CSV** — one row per pending order with destination address, weight, service tier
3. **Log in to Royal Mail Click & Drop** (free web tool, no API required at this volume)
4. **Bulk-upload the CSV** — Click & Drop generates labels in batch
5. **Print labels** on a standard inkjet/laser printer with adhesive label paper (Avery L7163 or equivalent)
6. **Pick & pack** in a dedicated workspace:
   - Picking sheet from the admin dashboard shows: product, variant, maker, quantity
   - Packing materials: branded tissue paper, drawstring fabric bag for clothing items, rigid mailer for fragile items (Qur'an covers, tasbih)
   - **The maker tag** goes in every parcel — pre-printed cards with the maker's first name, region, photo, and a QR code linking to `/bazaar/about-our-makers`
7. **Affix label, drop at Royal Mail** — Customer Service Point or parcel locker
8. **Mark each order shipped** in `/admin/bazaar/orders/[id]` with the tracking number — this triggers the shipping confirmation email

### Royal Mail service selection
- **Default:** Tracked 48 (~£3.30 cost, charged at £3.99 to customer for orders <£75)
- **Free over £75** — customer-facing nudge, charity absorbs the £3.30
- **Tracked 24 upgrade** — offered at checkout for £4.99
- **Special Delivery** — for orders over £200, manual flag in admin

### Returns workflow
1. Customer emails `hello@deenrelief.org` with order number
2. Team replies within 1 working day with the return address (and a prepaid Royal Mail label if the issue is ours)
3. Customer drops parcel at Royal Mail Customer Service Point
4. On receipt at the storage location:
   - Inspect (unworn, unwashed, tag still attached?)
   - Update order status in admin → "refunded"
   - Issue Stripe refund (auto-restores stock count via webhook)
   - Send refund-issued email
5. **Restocking:** if condition is good, return to inventory. If damaged, write off (charity has a 1-2% write-off allowance baked into the unit economics).

### Customer service
- All inbound: `hello@deenrelief.org`
- SLA: respond within 1 working day
- FAQ topics that should drive most questions:
  - Where's my order? (point to tracking link)
  - Can I exchange size? (return + reorder; recommend they don't open the new one until happy)
  - Will you ship outside UK? (not yet, but newsletter signup)
  - Is this Gift Aid eligible? (no — purchases aren't donations; explain politely)

---

## 5. The technical architecture

### Stack
- **Frontend:** Next.js 16 (existing site stack, extended with `/bazaar/*` routes)
- **Backend:** Next.js API routes + Supabase (existing donor DB, with new `products` / `orders` / `order_items` tables)
- **Payments:** Stripe Checkout (hosted) — separate Stripe account from donations
- **Email:** Resend (existing transactional email infrastructure, separate "from" address `bazaar@deenrelief.org`)
- **Storage:** Vercel (no additional infra)
- **Shipping:** Royal Mail Click & Drop (free web tool, manual at this volume)

### Why NOT Shopify Headless
- £29-79/month base + 0.5-2% transaction fees on top of Stripe — not justified at <100 orders/month
- Splits the donor and customer profile across two systems — undermines the unified Deen Relief story
- The "made by Khadija" narrative needs deep UI customisation that Shopify's templates make harder
- Migration to Shopify is possible later if volume scales beyond ~500 orders/month — the data model maps cleanly

### Data model (Supabase tables)
Every type defined in `src/lib/bazaar-types.ts`. The schema mirrors what we'd build in Postgres.

```
products              — catalog
product_variants      — sizes/colours per product
product_makers        — the maker info (1:1 with product, can be team)
orders                — one row per Stripe checkout session
order_items           — line items with denormalised maker name (stable history)
```

Snapshot pattern for `order_items`: we store the product name, variant label, unit price, and maker name **at time of purchase**. So if we later edit the catalog (rename a product, swap a maker, change a price), the order history stays accurate.

### Money handling
All amounts stored in **integer pence** (avoids floating-point rounding bugs on VAT, refunds, partial refunds). Formatting to "£X.XX" happens only at the display boundary. Source of truth: `src/lib/bazaar-format.ts`.

### Inventory race-condition handling
At Stripe Checkout Session creation:
1. Server validates each line item against current stock in Supabase
2. Recomputes the unit price (defends against client tampering)
3. If valid, creates the Stripe session with a 30-min expiry
4. **Stock is NOT decremented yet** — we wait for `payment_intent.succeeded`
5. On webhook: atomically decrement; if oversold (extremely unlikely at this volume), refund automatically with apology email

### Analytics integration
- Existing GA4 tag picks up shop activity automatically
- Server-side `purchase` event on the Stripe webhook with `commerce: true` parameter — disambiguates from the donation `purchase` event in the same GA4 property
- Enhanced Conversions hashing reused from the donation flow (`hashEmailForEnhancedConversions`)
- Cart abandonment tracking in a future phase

---

## 6. ⚠️ Charity legal structure — must resolve BEFORE launch

> *Not legal advice. Take this to a charity accountant before acting.*

### The structural question

The Charity Commission distinguishes:

- **Primary purpose trading** — selling things that directly further the charitable mission. Selling Qur'ans for da'wah might count. Selling abayas does NOT.
- **Ancillary trading (small)** — under HMRC rules, charities can trade limited amounts without paying tax on profits. The threshold is the lesser of (a) £80,000/year, or (b) 25% of total annual income, with a minimum of £8,000. At £500 starting inventory you're well under this.
- **Ancillary trading (significant)** — once you exceed the small-trading threshold, the standard structure is a **trading subsidiary**: a separate Limited company owned by the charity, which pays Corporation Tax on profits, then Gift Aids them back to the charity to eliminate the tax liability.

### Recommended action

A 30-minute consultation with a UK charity accountant. Specialists who handle Muslim charities specifically:
- **Sayer Vincent** (London, charity-only)
- **BHP Chartered Accountants** (multiple offices)
- **Crowe UK** (large; has charity practice)

Cost: ~£300-500. Saves potential five-figure tax-and-penalty issues later.

### What to ask them
1. Do we set up a trading subsidiary now, or trade through the charity initially under the small-trading exemption?
2. At what trailing-12-month revenue does the subsidiary become necessary?
3. What HMRC reporting is required for whichever route?
4. VAT — we're well under the £90k threshold initially, but at what point does VAT registration become required, and does that trigger any need to charge VAT on the products?
5. How are profits Gift Aided back from the subsidiary? (This is the tax-eliminating mechanism.)
6. Insurance — do we need product liability insurance on top of the existing charity policy?

### Architectural impact

The build is being designed so the migration is clean either way:

- **Separate Stripe account** for the Bazaar from day one — same merchant brand, separate financial entity. Easier to attach to a future trading subsidiary.
- **Separate "from" address** for emails (`bazaar@deenrelief.org`) — consistent with separate financial entity.
- **Bookkeeping separation** — even if trading through the charity initially, treat Bazaar revenue as a separate stream in the accounting software so the migration to a subsidiary is a journal entry, not a refactor.

---

## 7. Costs and unit economics

### One-time launch costs

| Item | Estimated cost |
|---|---|
| Build (Bazaar v1 — pages, cart, checkout, admin, emails, returns flow) | £8,000–£11,000 |
| Photoshoot in source country (makers + products) | £200–£500 |
| Charity accountant consultation | £300–£500 |
| Companies House registration if subsidiary route | £50 |
| Initial inventory order | £500 |
| Branded packaging (tissue paper, drawstring bags, mailers, maker tags) | £200–£400 |
| **Total launch budget** | **£9,250–£12,950** |

### Ongoing monthly costs

| Item | Monthly cost |
|---|---|
| Vercel + Supabase (incremental on existing plan) | £10–£20 |
| Resend (incremental) | £0 (covered by free tier at low volume) |
| Stripe transaction fees | 1.4% + 20p per transaction |
| Royal Mail postage | Pass-through to customer |
| **Total fixed monthly** | **~£10–£20 + transaction fees** |

### Unit economics — sample £75 abaya

| Item | Pence |
|---|---|
| Customer pays | 7,500 |
| Stripe fees (1.4% + 20p) | -125 |
| Royal Mail Tracked 48 (we absorb >£75) | -330 |
| Maker payment (3-4× commercial rate) | -1,500 |
| Materials cost (allocated) | -800 |
| Freight from source country (allocated) | -300 |
| Packaging (tissue, mailer, tag) | -100 |
| Customs/import (allocated) | -200 |
| Write-off allowance (1.5%) | -100 |
| **Surplus → Gift Aid to charity** | **4,045 (54%)** |

**At 30 orders/month at £60 average order value**, monthly surplus to charity ≈ £900-£1,000. Doesn't sound huge, but at 100 orders/month it's £3-4k — meaningful for a charity at this scale.

The £500 starting inventory turns roughly twice in the first 90 days if marketing is solid, generating ~£900 in surplus and ~£500 in maker payments before reorder.

---

## 8. Phased rollout plan

| Phase | What | Owner | Timeline |
|---|---|---|---|
| 0 | Finish main site (current focus — analytics, SEO, redirects) | dev | ongoing |
| 1 | **Charity accountant consultation** re: trading structure | client | 1-2 weeks |
| 2 | Set up trading-side infrastructure: separate Stripe account, separate Resend sub-account, basic Companies House registration if subsidiary route | client + dev | 1-2 weeks |
| 3 | **Photoshoot in source country**: makers in their workshops, product flat-lay shots, lifestyle shots. Cultural sensitivity protocol (especially photographing women) — confirm with the makers themselves | client | 2-4 weeks |
| 4 | **Build Bazaar v1**: replace placeholder data with Supabase, wire real Stripe Checkout, build the webhook handler, add admin auth, write the transactional emails, populate real product copy | dev | 3-4 weeks |
| 5 | **Bulk inventory order** arrives in UK; sample QC; sizing guide tested with real garments; admin/fulfillment dry-run with a few practice orders to family | client | 2 weeks |
| 6 | **Soft launch**: announce to existing donor email list first, then social, with a "first 50 customers receive a handwritten note from the maker" hook | client | 1 week |
| 7 | **Iterate** based on real-order data: returns rate, AOV, sizing patterns, inventory turnover, marketing channel performance | both | ongoing |

**Total wall-clock from "decide to do this" to "shop is live":** ~3-4 months. Most of that is non-dev (legal, photoshoot, inventory shipping, sample QC). The build itself is 3-4 weeks once the legal structure is clear.

---

## 9. Risks worth surfacing now

### High-priority — get ahead of these
1. **Maker-attribution at scale.** Per-product named-maker is the moat. If product #14 ends up faceless because demand outstrips one woman's capacity, the brand premise breaks. Plan for "small named teams" rather than "individual makers" as you scale.
2. **Quality control variance.** Compassion-driven supply chain has real variance. A struggling first-time maker may produce a beautiful first abaya and a lopsided second. Need a UK-side QC step before stocking, or returns rate will spike.
3. **Cultural / regulatory sensitivity in photography.** Photographing women makers requires informed consent in a culturally appropriate way. Don't promise the client face shots are guaranteed; the story can be carried with first names + voice quotes + workspace shots without faces.
4. **Charity Commission compliance.** §6 above — accountant consultation BEFORE launch.

### Medium-priority — monitor
5. **Inventory loss/damage in transit** from Bangladesh/Turkey to UK. Loss rates of 1-5% are typical; price into unit economics.
6. **VAT registration trigger.** If revenue scales fast and crosses £90k/year trailing-12-months, VAT registration kicks in retrospectively. Have an accountant on retainer once you're at £30k+ to catch this.
7. **Returns rate underestimation.** Clothing returns can hit 30%+. Mitigate with: clear sizing guides on every product, friendly customer service, and accepting that ~5-10% of revenue may go to returns.

### Lower-priority — flag
8. **Brand risk if a maker is later associated with anything controversial** — vetting matters when you're putting names and photos out.
9. **Holiday / seasonal demand spikes** — Ramadan and Eid will create surges. Plan inventory accordingly; don't restock from the same makers if it would force them into unhealthy hours.
10. **International expansion later** — UK only at launch is the right call. International adds customs paperwork, currency, tax complexity. Revisit at 6-12 months post-launch.

---

## 10. What's already built vs what's left

### Built and ready (the mockup the client sees)

| Component | Status |
|---|---|
| `/bazaar` catalog page with 8 placeholder products | ✅ Complete |
| 8 product detail pages with full maker stories | ✅ Complete |
| Cart UI with add/remove/quantity, free-shipping nudge | ✅ Complete |
| Checkout flow → preview confirmation page | ✅ Complete (mock URL; real Stripe in §11) |
| `/bazaar/about-our-makers` brand-story page | ✅ Complete |
| `/bazaar/our-promise` transparency page | ✅ Complete |
| `/bazaar/shipping` policy page | ✅ Complete |
| `/bazaar/returns` policy page | ✅ Complete |
| `/admin/bazaar/orders` fulfillment dashboard | ✅ Complete (mock data) |
| `/admin/bazaar/orders/[id]` order detail | ✅ Complete (mock data) |
| TypeScript schema mirroring future Supabase tables | ✅ Complete |
| Cart state with localStorage persistence | ✅ Complete |
| Money formatting, helper utilities | ✅ Complete |
| Brand-cohesion check: design system inheritance | ✅ Complete |

### What's left for production launch

| Component | Effort | Trigger |
|---|---|---|
| Replace placeholder image components with real photoshoot output | ~2 days | After photoshoot |
| Replace placeholder fixture data with Supabase queries | ~3 days | After Supabase tables created |
| Wire real Stripe Checkout in `/api/bazaar/checkout/route.ts` | ~1 day | After Stripe account provisioned |
| Wire real Stripe webhook handler | ~2 days | After Stripe account provisioned |
| Resend transactional email templates (order confirm, ship, refund) | ~2 days | After Resend domain verified |
| Admin auth gate on `/admin/bazaar/*` | ~1 day | After Supabase Auth set up |
| Royal Mail Click & Drop CSV export from admin | ~1 day | Pre-launch |
| Sentry / error monitoring on Bazaar routes | ~0.5 days | Pre-launch |
| Accessibility audit + fixes | ~1-2 days | Pre-launch |
| QA: full end-to-end test transaction in Stripe test mode | ~0.5 days | Pre-launch |
| **Total** | **~14 dev days** | |

That's a real budget of ~3 weeks of focused dev work, after the legal structure, Stripe account, and photoshoot are done — exactly as targeted.

---

## 11. The one-page client conversation

When pitching to the client, the takeaways are:

1. ✅ **The mockup exists. It's clickable. The brand premise survives.**
2. ✅ **The architecture is decided** — Next.js + Stripe + Supabase, NOT Shopify. Justified above.
3. ⚠️ **Legal first.** Before any inventory ships, the trading-structure question goes to a charity accountant. ~£500, ~30 minutes, ~2 weeks turnaround. Saves five-figure problems later.
4. 📅 **3-4 months wall-clock** from go-ahead to live shop. ~14 dev days within that.
5. 💰 **£9-13k launch cost** all-in (build + inventory + shoot + legal). ~30 orders/month at £60 AOV = ~£900-1,000/month surplus to the charity once running.
6. 🎯 **The moat is the maker story.** Every architectural decision protects it: per-product attribution, parcel tags, dedicated brand pages, deep UI customisation that Shopify Headless would have constrained.

---

## Appendix: file tree of what was built

```
src/
├── app/
│   ├── bazaar/
│   │   ├── layout.tsx                       — wraps all bazaar pages with cart context + sub-header
│   │   ├── page.tsx                         — catalog landing
│   │   ├── [slug]/
│   │   │   └── page.tsx                     — product detail (statically prerendered for all 8 SKUs)
│   │   ├── cart/
│   │   │   ├── page.tsx
│   │   │   └── CartPageClient.tsx           — cart UI, free-shipping nudge, checkout handoff
│   │   ├── order/preview/
│   │   │   ├── page.tsx
│   │   │   └── PreviewClient.tsx            — post-purchase confirmation
│   │   ├── about-our-makers/page.tsx        — brand-story page
│   │   ├── our-promise/page.tsx             — transparency page
│   │   ├── shipping/page.tsx                — shipping policy
│   │   └── returns/page.tsx                 — returns policy
│   ├── admin/bazaar/orders/
│   │   ├── page.tsx                         — fulfilment dashboard
│   │   └── [id]/page.tsx                    — order detail with mark-shipped action
│   └── api/bazaar/
│       ├── checkout/route.ts                — Stripe Checkout Session (mock + production stub)
│       └── webhook/stripe/route.ts          — Stripe webhook handler (skeleton with prod implementation in comments)
├── components/bazaar/
│   ├── BazaarCartProvider.tsx               — React Context cart, localStorage persistence
│   ├── BazaarSubHeader.tsx                  — sticky shop nav with live cart counter
│   ├── BazaarPlaceholderImage.tsx           — branded placeholder cards (replace with photoshoot)
│   ├── ProductCard.tsx                      — catalog grid card
│   ├── MakerBlock.tsx                       — "Made by..." module on product pages
│   └── AddToCartButton.tsx                  — variant picker + quantity + buy CTAs
└── lib/
    ├── bazaar-types.ts                      — TypeScript types matching future Supabase schema
    ├── bazaar-placeholder.ts                — fixture data (8 products with maker bios)
    └── bazaar-format.ts                     — money formatting (server + client safe)
```

**Total new code:** ~1,800 lines across 18 files. None of it touches the existing main-site code; everything is additive.
