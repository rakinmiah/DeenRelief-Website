# Deen Bazaar → Shopify Headless — Re-platform Plan

> **Status:** Approved direction (2026-07-16). This resolves the "custom bazaar vs Shopify" conflict flagged in `HANDOVER.md` §6 and **supersedes `SHOP-PLAN.md`** (which predates the custom bazaar and described a from-scratch `/shop`).
>
> **Division of labour:** Claude/dev builds everything in this repo. **Rakin handles the Shopify store itself and the fulfilment-partner integration** (apps, shipping rates, stock sync on their side). §3 is his checklist; everything else is build work.

---

## 1. The decision in one paragraph

The custom bazaar (Supabase + Stripe Checkout + Royal Mail Click & Drop + a hand-built admin cockpit, ~19,300 LOC) is replaced by **Shopify Headless**: Shopify becomes the system of record for products, stock, orders, payments, fulfilment, and customer emails, operated day-to-day through Shopify admin by the team and the fulfilment partner. **The storefront stays exactly where and what it is** — `deenrelief.org/bazaar`, our Next.js pages, our "Proof & Proximity" design, our named-maker storytelling — but reads from the Shopify Storefront API instead of Supabase, and hands off to Shopify-hosted checkout on `shop.deenrelief.org`. A new website is not needed and the visitor-facing brand does not change.

**Why:** fulfilment moves to a partner business that plugs into Shopify natively; trustees get an industry-standard admin instead of a bespoke one we must maintain; we delete ~17k LOC of order/stock/shipping/email machinery that Shopify does better (chargebacks, fraud analysis, partial refunds, discount codes, abandoned-cart, VAT).

**Entity reminder (from HANDOVER §6):** the store is **DEEN BAZAAR LTD** — a commercial trading company, *not* a charity. Shopify + Shopify Payments sign-up is **"business/company," never "non-profit."** 100% of net profits reach the charity via corporate Gift Aid; that happens in accounting, not in the store.

---

## 2. Target architecture

```
Visitor
  │
  ├── deenrelief.org/bazaar/*          Next.js storefront (this repo)
  │     • catalog + PDP + cart UI      ← Shopify STOREFRONT API (GraphQL)
  │     • maker stories                ← Shopify METAOBJECTS
  │     • cart state                   ← Shopify Cart object (cartId in cookie)
  │     [Checkout →]
  │
  ├── shop.deenrelief.org/checkout…    SHOPIFY-HOSTED checkout + order status page
  │     • payment (Shopify Payments, DEEN BAZAAR LTD)
  │     • shipping rates, VAT, discounts, Shop Pay
  │
  └── (post-purchase)
        Shopify → order confirmation / shipping / refund emails (native)
        Shopify → fulfilment partner app → dispatch + tracking
        Shopify → WEBHOOKS → /api/shopify/webhook (this repo)
                               └─ slim order mirror in Supabase
                                  (reconciliation report, donor linking,
                                   admin search, social attribution)
```

Three integration surfaces in this repo, and only three:

1. **`src/lib/shopify.ts`** — Storefront API client (catalog reads + cart mutations).
2. **`/api/shopify/webhook`** — `orders/paid`, `refunds/create`, `fulfillments/create` → mirror rows in Supabase.
3. **One-time migration script** — Admin API push of the existing Supabase catalog (makers, products, variants, images) into Shopify.

---

## 3. Rakin's checklist (store side — blocks the cutover, not the build)

| # | Task | Notes |
|---|---|---|
| 1 | Create Shopify store as **DEEN BAZAAR LTD** (business, not non-profit) | Basic plan is sufficient for v1 |
| 2 | Shopify Payments onboarding | LTD's bank account — never the charity's |
| 3 | Point **`shop.deenrelief.org`** at Shopify as the store's primary domain | CNAME in DNS; checkout and order-status pages live here. Storefront stays at `deenrelief.org/bazaar` |
| 4 | Install/connect the **fulfilment partner's app**; agree stock-sync + dispatch SLAs | Partner owns pick/pack/ship + tracking upload from here on |
| 5 | Configure **shipping rates** to match today's storefront promise: Tracked 48 £3.99 / Tracked 24 £4.99 / **free over £75** (£1 upgrade to 24) — or renegotiate with the partner and tell us so we update storefront copy | UK-only (GB) at launch, matching current behaviour |
| 6 | Legal pages in Shopify admin (refund/privacy/terms of sale) | Can copy from existing `/bazaar/returns` etc. |
| 7 | Set customer-email branding (logo, colours, reply-to `bazaar@deenrelief.org`) | Shopify sends confirmation/shipping/refund emails natively |
| 8 | Create API credentials for the dev side | **Storefront API token** (public, read + cart scopes), **Admin API token** (one-time migration: write_products, write_metaobjects, write_files), **webhook signing secret** |
| 9 | Enable Shopify's **Google & YouTube channel** with GA4 property `524785471` | Gives us purchase events from the checkout domain (we can't script Shopify-hosted checkout ourselves) |

Nothing in §3 blocks Phases 1–2 of the build (we can develop against a dev store).

---

## 4. Data modelling in Shopify (mapping the current schema)

| Today (Supabase) | Shopify | Notes |
|---|---|---|
| `bazaar_products` | **Product** | `slug`→handle (keep identical — URLs must not change), `name`→title, `description`→descriptionHtml, `sku`, `price_pence`→variant price, `category`→**Collection** (one per current category: abaya, thobe, prayer-mat, hijab, tasbih, quran-cover, kufi, kids) + product `tags` |
| `bazaar_product_variants` (size/colour) | **Variants** (options: Size, Colour) | price overrides map directly |
| `tagline`, `materials`, `care_instructions`, `sizing_guide_html` | **Metafields** (`bazaar.tagline`, `bazaar.materials`, `bazaar.care`, `bazaar.sizing_html`) | Rendered by the PDP exactly as today |
| `bazaar_product_makers` (name, country, region, photo, story, quote) | **Metaobject** type `maker`, referenced from a `bazaar.maker` product metafield | This is the piece Shopify doesn't have natively — metaobjects preserve the named-artisan differentiator with zero design change |
| `weight_grams` | Variant weight | Feeds partner's shipping |
| `stock_count` / holds / thresholds | **Shopify inventory** | Our entire hold/release system (`014_stock_holds.sql` machinery) is deleted; Shopify reserves stock during checkout natively |
| Images (Supabase Storage `bazaar-products`) | **Shopify Files/CDN** | Migration script uploads; `next.config.ts` gains `cdn.shopify.com` in `images.remotePatterns` |

**Catalog migration is a scripted one-time push** (`scripts/migrate-bazaar-to-shopify.mjs`, Admin API GraphQL): makers → metaobjects, products → products+variants+metafields+collections, images → files. Idempotent (keyed on handle/SKU), run against the dev store first, then production. Delete the script's token afterwards. (Catalog is currently 5 makers / 6 products — the script matters less for volume than for getting handles/SKUs exactly right so URLs and analytics continuity hold.)

---

## 5. Storefront: what changes, what doesn't

**Unchanged (the point of going headless):** every visitor-facing page keeps its current design and route — `/bazaar` landing, `/bazaar/[slug]` PDP, cart page, makers page, policy pages, contact. `BazaarHeader`, product cards, gallery, FAQ, sizing UI, Framer Motion — all kept. The feature flag (`NEXT_PUBLIC_BAZAAR_ENABLED` + `noindex` pre-launch) keeps working as-is.

**Replaced under the hood:**

| Concern | Today | After |
|---|---|---|
| Catalog reads | `bazaar-catalog.ts` → Supabase | `src/lib/shopify.ts` → Storefront API (`products`, `productByHandle`, `collectionByHandle`, metaobject reads), cached with Next `revalidate` (~60s) + on-demand revalidation later if needed |
| Cart | localStorage array of product ids, priced server-side at checkout | **Shopify Cart object**: `cartId` in a cookie, server actions for create/add/update/remove; Shopify is the price/stock truth on every render — the 409 price-drift and stock-validation code disappears |
| Checkout | `POST /api/bazaar/checkout` → our Stripe Checkout Session (405 LOC + stock holds) | `cart.checkoutUrl` redirect to Shopify checkout. The entire route is deleted |
| Order confirmation page | `/bazaar/order/[sessionId]` (custom) | Shopify's order-status page on `shop.deenrelief.org` (it's good, and it's where tracking updates live). Our page is deleted; "continue shopping" points back to `/bazaar` |
| Sizing/FAQ content | `bazaar-sizing.ts` / `bazaar-faqs.ts` hardcoded | Keep hardcoded in v1 (works, zero migration risk); can move to metaobjects later |

**Attribution upgrade (new, small):** the current bazaar captures no UTM/short-link data at all. The new cart layer writes `utm_content` (the `/r/<slug>` short-link key) + `utm_source/campaign` as **cart attributes**, which Shopify carries onto the order; the webhook stamps them on the mirror row. That makes bazaar revenue attributable per social post through the same `social_post_stats` spine as donations — for the Ramadan 2027 push. (Capture only in v1; dashboard wiring is a later, separate task.)

---

## 6. Orders mirror — keep `bazaar_orders`, feed it from webhooks

Rather than a new table, **reuse `bazaar_orders` / `bazaar_order_items` as a slim mirror** of Shopify orders. This keeps four things working with almost no code: the **reconciliation report** ("Bazaar trading income" tile + CSV), **donor linking** (`donor_id` by email match), **admin global search / ⌘K**, and the **order history of the 11 existing customers** (their rows simply stay, marked as the old source).

**Migration `043_bazaar_shopify.sql`** (additive, idempotent, safe pre-application per house rules):
- `source text not null default 'stripe' check (source in ('stripe','shopify'))`
- `shopify_order_id text unique`, `shopify_order_name text` (e.g. `#1024`), `shopify_customer_email` fallback
- Code resilient to 42703 until applied (standard pattern).

**`/api/shopify/webhook`** (HMAC-verified, idempotent via existing `stripe_webhook_events`-style dedup on webhook id):
- `orders/paid` → upsert order header + item snapshots (+ cart-attribute UTMs), link donor by email
- `refunds/create` → mark refunded
- `fulfillments/create` → stamp `fulfilled_at` + tracking (keeps admin/reconciliation status truthful)

**Admin slims down to read-only:** orders list + a detail page that shows the mirror and deep-links **"Open in Shopify admin."** Everything operational is deleted — mark-shipped/delivered, refund, push-to-Click&Drop, CSV export, packing slips, stock adjust, catalog CRUD, image upload + AI autofill (catalog editing happens in Shopify admin now). **Inquiries stay** (customer contact + return requests are ours, decoupled from commerce; return requests reference the Shopify order name).

---

## 7. Deletion inventory (~17k of the 19.3k LOC goes)

| Deleted | Why |
|---|---|
| `api/bazaar/checkout` (405), stock hold system (migrations logic + `bazaar-catalog.ts` stock fns), cart-abandonment emails + table | Shopify checkout owns all of it |
| `src/lib/royal-mail-api.ts` (554) + push/export routes + C&D columns usage | Fulfilment partner ships via Shopify |
| `bazaar-order-email.ts`, `bazaar-shipping-email.ts`, `bazaar-cart-abandonment-email.ts` (~1,050) | Shopify native customer emails |
| Admin catalog CRUD, fulfilment cockpit actions, upload/AI-fill routes (~5,500 of the 6,300 admin LOC) | Shopify admin |
| `bazaar-catalog.ts` + `bazaar-db.ts` order-lifecycle write paths (~1,600) | Replaced by `shopify.ts` + webhook upserts |
| Bazaar branches of the Stripe webhook (~250) | After cutover, no new Stripe bazaar events (keep `charge.refunded` handling until the last legacy order is past its return window, then delete) |

**Kept:** all storefront UI/components, inquiries system, order-message emails (admin→customer ad-hoc), reconciliation, admin notifications (`bazaar_order_placed` now fired from the Shopify webhook), analytics wrappers, feature flag. **Old Supabase catalog/order tables are never dropped** — catalog tables just stop being read; order tables live on as the mirror.

---

## 8. Analytics

- **On our pages** (view_item, add_to_cart, begin_checkout): keep the existing GA4 wrappers in `analytics.ts`, re-pointed at Shopify product data. Consent gating unchanged.
- **Purchase event:** fired from Shopify's GA4 integration (§3 #9) since checkout is on Shopify's domain — we cannot and should not script it. Keep `affiliation: "Deen Relief Bazaar"` separation via the Shopify-side GA4 config; verify the donation/bazaar split in GA4 after the first test order.
- **Cross-domain:** add `shop.deenrelief.org` to the GA4 cross-domain linker so sessions survive the checkout hop.
- Our old `trackBazaarPurchase` client event is deleted with the confirmation page.

---

## 9. Env vars (new)

```
SHOPIFY_STORE_DOMAIN            xxxx.myshopify.com
SHOPIFY_STOREFRONT_API_TOKEN    storefront token (read products + cart)
SHOPIFY_WEBHOOK_SECRET          HMAC verification
SHOPIFY_API_VERSION             e.g. 2026-04
SHOPIFY_ADMIN_API_TOKEN         one-time migration script only — revoke after
```
Retired after cutover: `ROYAL_MAIL_*` (all).

---

## 10. Build phases

| Phase | Scope | Est. |
|---|---|---|
| **0. Store setup** (Rakin, §3) | Store, Payments, domain, partner app, rates, GA4 channel, tokens | parallel |
| **1. Foundation** | `src/lib/shopify.ts` client + typed queries; catalog migration script; run against dev store; `cdn.shopify.com` image config | 2 days |
| **2. Storefront swap** | Landing + PDP + makers pages read Shopify; cart rebuilt on Shopify Cart (same UI); checkout handoff via `checkoutUrl`. All behind the existing flag | 3 days |
| **3. Webhooks + mirror** | Migration 043; `/api/shopify/webhook`; donor linking; UTM cart attributes; admin orders → read-only + Shopify deep links; reconciliation verified against a test order | 2 days |
| **4. Deletion pass + QA** | Remove everything in §7; tsc + build clean; end-to-end test purchase on the dev store (test payments); GA4 events verified; a11y/mobile pass on changed pages | 2 days |
| **5. Cutover** | Run catalog migration against prod store; flip env to prod tokens; place one real £-small order end-to-end (payment → partner fulfilment → tracking email → mirror row → reconciliation); then remove legacy Stripe-bazaar webhook branch after the last legacy return window | ½ day + soak |

**~9–10 dev days** once Phase 0 tokens exist; Phases 1–2 can start against a dev store immediately.

**Cutover safety:** the storefront ships dark behind the flag exactly as today, so the swap deploys progressively to production with zero visitor impact until the flip. No order-freeze window is needed — the bazaar is live-*ish* with near-zero traffic; if that changes before cutover, add a 1-hour checkout pause.

---

## 11. Risks

| Risk | Mitigation |
|---|---|
| Checkout leaves `deenrelief.org` (trust dip at the hop) | `shop.deenrelief.org` + fully branded checkout (logo/colours) + consistent email branding; this is the standard headless trade-off and Shop Pay conversion generally more than pays for it |
| Maker storytelling degrades in Shopify's model | Metaobjects preserve the full maker schema; PDP renders them identically — acceptance criterion, not a hope |
| Partner stock-sync errors oversell | Shopify inventory is the single stock truth; partner app writes to it; storefront always renders live availability |
| GA4 purchase double-count (our events + Shopify's) | Only Shopify fires `purchase`; our client fires the pre-checkout funnel only |
| Mixing entities (charity vs LTD) | Shopify Payments → LTD bank only; reconciliation report keeps the separation visible; sign-ups always "business" |
| Migration 043 not applied at deploy time | 42703-resilient code, per house standard |
| URL/SEO regressions | Handles are copied verbatim from current slugs; `/bazaar/*` routes unchanged; still `noindex` until launch anyway |

---

## 12. Acceptance criteria (cutover gate)

1. `npx tsc --noEmit` and `npm run build` clean.
2. Test purchase end-to-end: product page → cart → Shopify checkout → payment → Shopify confirmation email → webhook mirror row (`source='shopify'`, items snapshotted, donor linked when email matches) → order visible in admin list + reconciliation report → fulfilment webhook stamps tracking.
3. PDP for a migrated product is pixel-equivalent to today (maker block, materials, care, sizing, gallery).
4. A `/r/<slug>` short-link visit that ends in a purchase lands `utm_content` on the mirror row.
5. GA4 shows exactly one `purchase` with bazaar affiliation; add_to_cart/begin_checkout fire from our pages.
6. Storefront still 404s cleanly with the flag off; `/chart-sandbox` untouched.
7. All §7 deletions merged; `ROYAL_MAIL_*` removed from Vercel.

---

## 13. Open questions (answer whenever — none block Phases 1–2)

1. **Shipping promise:** keep today's Tracked 48 £3.99 / Tracked 24 £4.99 / free over £75, or adopt the fulfilment partner's rates? (Storefront copy on `/bazaar/shipping` follows the answer.)
2. **Catalog expansion** (the old SHOP-PLAN cosmetics/wider-goods vision): out of scope for the re-platform; purely a merchandising decision inside Shopify admin afterwards. Confirm that's the intent.
3. **Discounts at launch?** (e.g. a soft-launch code) — zero build cost either way, Shopify admin feature.
4. **Inquiries long-term:** keep our inbox (planned here) or move customer service into a Shopify app later?
