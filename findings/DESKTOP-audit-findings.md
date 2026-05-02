# Deen Relief — Desktop Audit Findings

**Audit date:** 2026-05-02
**Site:** `deen-relief-website.vercel.app` (local dev: `localhost:3000`)
**Stack:** Next.js 16.2.3 (App Router, Turbopack), React 19.2.4, Tailwind CSS v4, TypeScript 5
**Scope:** desktop only, focused on Section 0 suspected bugs + cross-page basics. Cross-browser, full Lighthouse, and form-end-to-end were out of scope for this pass.
**Verifier:** automated DOM + network probes via the local dev preview at 1440×900 plus 375×812 sanity checks for the breakpoint guards.

---

## Audit method

I used the live dev server at `localhost:3000` and the preview tool to:

- Fetch every public page (HEAD + body), confirm 200 responses and content-type
- Inspect the live DOM at 1440×900 and 375×812
- Sample the console + network buffer for errors / warnings / 4xx-5xx
- Statically grep the codebase for heading hierarchy, alt text coverage, donate-anchor wiring, and Charity Commission URL consistency
- Apply fixes and reload to confirm

What I did NOT do (and you'll need to follow up on):

- Cross-browser Playwright runs (Firefox, Safari, Edge)
- Lighthouse desktop scores per page
- Stripe end-to-end test donations (held by the audit's hold list)
- Resend send tests for `/contact`, `/volunteer`, `/newsletter`
- WCAG colour-contrast checks via axe-core
- Manual keyboard tab-order walk
- Tablet / mobile (audit explicitly desktop-only)

---

## Summary

| Severity | Count | Status |
|---|---|---|
| Blocker | 0 | – |
| Major | 1 | ✅ Fixed (counter SSR bug) |
| Minor | 1 | ✅ Fixed (header logo console warning) |
| Polish | 1 | ✅ Fixed (footer hardcoded year → dynamic) |
| Hold (needs your input) | 1 | ⏳ Charity Commission URL on Impact section uses opaque internal ID |
| Verified non-bug | 1 | ✅ "Duplicate Donate" — correctly mutually-exclusive by breakpoint |

**Result: launch-ready on every desktop check covered in this pass. One item flagged for your verification before push.**

---

## Findings

### 1. Impact + TrustBar counters render as `0+` / `0p` for SSR / no-JS / past-fold visitors

- **Severity:** major
- **Viewport(s):** all
- **Browser(s):** all
- **Repro:**
  1. Open `/` in an incognito window
  2. Inspect the rendered HTML *before* JavaScript hydrates (or disable JS)
  3. The TrustBar (`Years of Impact`, `Countries of Operation`) and Impact section (4 stat counters) carry `0+` / `0p`
  4. Same effect for users on backgrounded tabs or who reload a page already scrolled past these sections
- **Expected:** counters carry their final values (12+, 5+, 3,200+, etc.) regardless of JS state or scroll position
- **Actual:** `0+` / `0p` rendered into the SSR HTML; only animates to real values when scrolled into view from below
- **Root cause:** both `CountUp` (Impact.tsx) and `AnimatedNumber` (TrustBar.tsx) initialised `useState(0)`. The animation kick-off was gated on an IntersectionObserver firing with `isIntersecting: true`. SSR rendered 0; if the observer never fired (no scroll, no JS, scrolled-past on reload), the displayed value stayed 0 forever. The `useEffect` deps array `[value, hasAnimated]` also caused a dependency-driven re-run that recreated the observer mid-animation.
- **Fix:**
  - Initialise `useState(value)` so SSR and initial render carry the real number
  - Only reset to 0 + set up the observer if the section is genuinely BELOW the viewport at mount (so reloading-while-past-it leaves the value visible without a jarring reset)
  - Skip animation entirely under `prefers-reduced-motion`
  - Use a local `done` flag in place of state-driven `hasAnimated`, so the effect no longer re-runs and recreates the observer
  - File(s): `src/components/Impact.tsx`, `src/components/TrustBar.tsx`
  - Commit: `790695a Fix impact + trust counters showing 0+ for SSR / no-JS / past-fold reloads`
- **Verified:** ✅ Confirmed via `preview_eval` at four states:
  1. Page top, TrustBar below fold → shows 0+ on screen, animates to 12+/5+ on scroll ✓
  2. Page top, Impact below fold → shows 0+ on screen, animates to 3,200+/5+/12+/90p on scroll ✓
  3. Reload at scroll-past position → counters show real values immediately, no reset to 0 ✓
  4. SSR HTML carries the real numbers ✓

### 2. Header logo — Next.js Image aspect-ratio warning (16x repeats per page load)

- **Severity:** minor
- **Viewport(s):** all
- **Browser(s):** dev console only — wouldn't surface to end users
- **Actual:** `[Image] Image with src "/images/logo.webp" has either width or height modified, but not the other. ... include the styles 'width: "auto"' or 'height: "auto"' to maintain the aspect ratio.` repeats ~16 times per page load.
- **Root cause:** the HTML `width={180} height={32}` did not match the asset's intrinsic aspect ratio (logo is 2085×349, ratio ≈ 5.97). At display height 32, natural width is 191. Next.js's runtime check compared the rendered aspect (5.95 from the optimised 256×43 it served) against the HTML attrs (5.625) and warned because the difference exceeded its tolerance. Inline `style={{ width: "auto" }}` plus `transition-all` also confused the heuristic.
- **Fix:**
  - Set `width={191} height={32}` to match the asset's native ratio at display height
  - Replaced inline `style` + `transition-all` with Tailwind `h-7 / h-8 + w-auto + transition-[height]` — scoped transition, no width animation
  - File: `src/components/Header.tsx`
  - Commit: `8950c33 Header: fix Next.js Image aspect-ratio warning on logo`
- **Verified:** ✅ Console buffer count stayed at 18 across multiple cross-page navigations after the fix (no new warnings emitted).

### 3. Footer copyright year hardcoded to `2026`

- **Severity:** polish
- **Viewport(s):** all
- **Browser(s):** all
- **Actual:** `© 2026 Deen Relief. All rights reserved.` — works in 2026 only; will silently go stale on Jan 1 2027
- **Root cause:** Footer originally was a client component and used `new Date().getFullYear()` which caused a hydration mismatch (server vs client clock drift). The fix at the time was to hardcode the year. After Footer became a server component (no `"use client"`), the dynamic call was safe again but never re-introduced.
- **Fix:**
  - Restored `new Date().getFullYear()` — evaluated server-side at build / request time, ships as static HTML, no hydration mismatch possible
  - File: `src/components/Footer.tsx`
  - Commit: `7fb9909 Footer: dynamic copyright year via new Date().getFullYear()`
- **Verified:** ✅ Live render shows `© 2026 Deen Relief.` Will roll over with the next deploy after Jan 1 2027.

### 4. Charity Commission link on Impact section uses opaque internal ID

- **Severity:** unverified — needs your decision
- **Viewport(s):** all
- **Browser(s):** all
- **Repro:**
  1. Visit `/`, scroll to "Committed to Transparency" panel inside the Impact section
  2. Click "View on Charity Commission"
  3. Lands on `https://register-of-charities.charitycommission.gov.uk/charity-search/-/charity-details/5049652`
- **Expected:** lands on Deen Relief's Charity Commission record (registration No. 1158608)
- **Actual:** the URL uses an internal DB ID `5049652`, not the registration number. Other places on the site (Palestine FAQ, homepage FAQ) use the registration-number form: `?regid=1158608&subid=0` — which is unambiguous.
- **Note:** I did not change this. It touches the charity-number linkage which is on the audit's hold list. Both URLs return 302s when fetched, but the 5049652 redirect doesn't carry the registration number in any header so I can't verify from headers alone whether it actually resolves to Deen Relief's record vs. a different charity.
- **Recommended action:**
  1. Click the live link in production and confirm it lands on Deen Relief's record
  2. If it does, fine — both formats work
  3. If it doesn't (or you want consistency), change the URL in [src/components/Impact.tsx:121](../src/components/Impact.tsx) from `/charity-search/-/charity-details/5049652` to `?regid=1158608&subid=0`
- **File:** `src/components/Impact.tsx:101–110`
- **Verified:** ⏳ pending your confirmation

### 5. "Duplicate Donate CTA in header" — verified non-bug

- **Severity:** polish (audit doc speculation, not an actual bug)
- **Repro:** at desktop, two `<button>` elements in header have text "Donate"
- **Expected:** only one visible at any breakpoint
- **Actual:** at 1440×900, only the first (`hidden lg:block`) is visible (width 81px). The second (`flex lg:hidden items-center gap-3`) has computed `display: none` (width 0). At 375×812, the inverse holds — first is hidden, second is visible.
- **Conclusion:** intentional pattern. Two buttons, mutually exclusive by Tailwind breakpoint, no leakage. **No fix required.**
- **Verified:** ✅ confirmed at both 1440×900 and 375×812.

---

## Cross-page checks that passed (no findings)

### Routing
- All 15 public routes return 200: `/`, `/palestine`, `/cancer-care`, `/orphan-sponsorship`, `/clean-water`, `/uk-homeless`, `/build-a-school`, `/sadaqah`, `/zakat`, `/our-work`, `/about`, `/blog`, `/contact`, `/volunteer`, `/prayer-times`
- `/donate?campaign=palestine&amount=50&frequency=one-time` returns 200 with the correct campaign/amount pre-filled (verified in earlier sessions and again today)

### Donation routing
- All 8 campaign pages emit `/donate?campaign={slug}&amount=...&frequency=...` correctly via DonationForm + MiniDonationPicker
- Header's `donateAnchors` map matches real DOM `id`s on every campaign page:
  - `/zakat → #zakat-form` ✓ (DOM has `id="zakat-form"`)
  - `/orphan-sponsorship → #sponsor-form` ✓ (DOM has `id="sponsor-form"`)
  - `/palestine → #donate-form` ✓ (DOM has both `donate-form` AND `donate-form-mobile`)
  - `/cancer-care`, `/build-a-school`, `/clean-water`, `/uk-homeless`, `/sadaqah → #donate-form` ✓ all present
  - `/ → #donate` ✓ (FeaturedCampaign wrapper has `id="donate"`)

### Heading hierarchy
- Every page has exactly **one** `<h1>` ✓
- All have h1 → h2 → h3 chains, no skipped levels
- Counts at a glance: `/` (1/8/20), `/palestine` (1/7/6), `/zakat` (1/7/10), all campaign pages similar structure

### Alt text coverage
- **Zero** `<img>` tags missing alt text across all 15 pages (probed via static grep on rendered HTML)

### Console / network
- After fix to Header logo: zero new warnings, zero errors emitted on cross-page navigation
- Zero failed (4xx/5xx) network requests across 15 pages probed

### Structured data
- NGO + WebSite + FundraisingEvent + DonateAction + FAQPage + BreadcrumbList all render correctly (verified earlier in the project audit; no regression surfaced today)

---

## Items deferred / out of scope

These weren't probed in this pass and need follow-up before launch:

| Item | Why deferred | Recommended next step |
|---|---|---|
| Cross-browser (Firefox / Safari / Edge) | Playwright not installed; would burn many turns adding it | Run Playwright `npm i -D @playwright/test`, write a simple visual + console smoke test, run on all four browsers |
| Lighthouse desktop scores | Requires real Lighthouse run | Run Lighthouse manually on Chrome devtools for `/`, `/palestine`, `/donate`, `/zakat`, `/blog`. Target ≥90 perf, ≥95 a11y/best practices/SEO |
| Stripe payment-flow end-to-end | Hold list excludes payment provider config | Run a £5 test donation against Stripe test keys; verify webhook + receipt + success state |
| Form submissions (`/contact`, `/volunteer`, newsletter) | Would actually send emails via Resend | Run one test submission against each, verify success state + arrival in Resend dashboard |
| WCAG colour-contrast checks | Need axe-core + manual sweep | Install axe DevTools Chrome extension, run on each landing page |
| Keyboard tab-order walk | Manual only | Tab through each landing page, confirm logical order, focus rings on every focusable element, no traps |
| Window resize 1280–2560 | Time-bound | Resize Chrome window manually from 1280 to 2560, watch for layout breaks |
| 200% browser zoom | Time-bound | Set Chrome zoom to 200% on `/`, `/donate`, `/zakat`, watch for clipped/broken UI |
| Skip-to-content link | Did not visually verify | Hard reload, press Tab once, confirm "Skip to main content" link appears |

---

## Commits in this audit pass

```
8950c33 Header: fix Next.js Image aspect-ratio warning on logo
7fb9909 Footer: dynamic copyright year via new Date().getFullYear()
790695a Fix impact + trust counters showing 0+ for SSR / no-JS / past-fold reloads
```

All committed to `main`. Push when ready — Vercel auto-deploys on push since the GitHub integration is now reconnected.

---

*See [DESKTOP-launch-readiness.md](./DESKTOP-launch-readiness.md) for the launch-gate summary.*
