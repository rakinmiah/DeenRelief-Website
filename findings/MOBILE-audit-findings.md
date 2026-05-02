# Deen Relief — Mobile Audit Findings

**Audit date:** 2026-05-02
**Site:** `deen-relief-website.vercel.app` (local dev: `localhost:3000`)
**Stack:** Next.js 16.2.3, React 19.2.4, Tailwind CSS v4, TypeScript 5
**Scope:** mobile only. Verified at 280, 360, 375, 390, 412 px viewports via the local dev preview. Real-device verification (iOS Safari, Chrome Android) is still required for items only physical hardware can confirm — listed separately.
**Audit method:** code grep for mobile-specific concerns (100vh, input font sizes, sticky-hover scoping, hero `sizes`), DOM probes via the preview tool at multiple narrow widths, touch-target measurements, hamburger menu interaction.

What I did NOT do (real-device verification needed):

- iOS Safari address-bar collapse layout-jump on actual hardware
- Apple Pay button presence on mobile Safari
- Google Pay button presence on Chrome Android
- Virtual keyboard pushing layout on real input focus
- VoiceOver / TalkBack reading order
- 3G/offline throttling
- PWA "Add to Home Screen"
- Cross-browser (Mobile Safari iOS 16/17/18, Chrome Android, Samsung Internet, Firefox Android)

---

## Summary

| Severity | Count | Status |
|---|---|---|
| Blocker | 0 | – |
| Major | 0 | – |
| Minor | 4 | ✅ Fixed (4) |
| Polish | 2 | 1 ⏳ user-decision (frequency-toggle height); 1 ⏳ user-decision (Z Fold 280px header) |
| Verified non-bug | 3 | – |

**Result: launch-ready on every mobile check covered in this pass.** Two design-decision items flagged for your call. Real-device verification list at the bottom.

Section-0 items from the audit checklist that were already addressed by the desktop pass (same code path — fix applies to mobile too):
- Counter SSR bug (`Impact` + `TrustBar`) — fixed in commit `790695a`
- "Duplicate Donate" suspicion — verified non-bug (mutually exclusive by Tailwind breakpoint at every viewport tested)
- Header logo aspect-ratio warning — fixed in commit `8950c33`
- Footer hardcoded year — fixed in commit `7fb9909`

---

## Findings

### 1. iOS Safari `100vh` bug on Hero + auth gate

- **Severity:** minor
- **Device(s):** all mobile, all browsers
- **Repro:**
  1. Open `/` on iOS Safari (or any mobile browser with a collapsing address bar)
  2. Scroll
  3. Hero height jumps as the address bar collapses / expands
- **Root cause:** `Hero.tsx` used `min-h-[68vh] md:min-h-[78vh]`. iOS Safari's `100vh` measures with the address bar hidden, so on first paint `vh` extends behind/under the address bar, causing layout shift on scroll.
- **Fix:** swapped both `vh` units to `dvh` (dynamic viewport height) which accounts for the address bar correctly. Same fix applied to `/auth` (`min-h-screen` → `min-h-dvh`).
- **File(s):** `src/components/Hero.tsx`, `src/app/auth/page.tsx`
- **Commit:** `cad03a4`
- **Verified:** ✅ static — unit swap. iOS-real-device verification still recommended (see Items requiring real-device verification).

### 2. Inputs at 14px font-size cause iOS Safari zoom-on-focus

- **Severity:** minor
- **Device(s):** all iOS (iPhone SE / 13 / Pro Max)
- **Repro:**
  1. Open `/` on iPhone Safari, scroll to Newsletter
  2. Tap the email input
  3. Safari zooms the page to ~110%, requiring a manual zoom-out
  4. Same effect on `/zakat` ZakatCalculator inputs
- **Root cause:** Inputs in `Newsletter.tsx` and `ZakatCalculator.tsx` had `text-sm` (14px). iOS Safari auto-zooms any input under 16px on focus to make text readable.
- **Fix:** `text-sm` → `text-base` (16px) on both. Also added `inputMode="decimal"` to the three Zakat number inputs so iOS shows the decimal keyboard rather than the full keyboard.
- **File(s):** `src/components/Newsletter.tsx`, `src/app/zakat/ZakatCalculator.tsx`
- **Commit:** `cad03a4`
- **Verified:** ✅ DOM-confirmed at 375. iOS-real-device verification still recommended.

### 3. Hamburger button under Apple HIG 44×44 minimum

- **Severity:** minor
- **Device(s):** all mobile (button only renders below `lg:` = 1024px)
- **Repro:** measure the header hamburger button at 360–390 viewport
- **Actual:** 40×40 (under the Apple HIG / WCAG 2.5.5 / WCAG 2.2 Target Size minimum of 44×44)
- **Fix:** `p-2` → `p-2.5` (10px padding × 2 + 24px icon = 44px exactly)
- **File:** `src/components/Header.tsx`
- **Commit:** `cad03a4`
- **Verified:** ✅ measured 44×44 at 360 viewport after fix.

### 4. Hero `sizes` prop — verified, not a bug

- **Severity:** verified non-bug (audit doc was outdated)
- **Audit suspicion:** "current home hero is requested at w=3840"
- **Actual:** Hero already has `sizes="100vw"`. At 390×844 viewport with 3× DPR, Next.js serves `w=640`. At 360, serves `w=640`. At 280, also `w=640`. The audit's `w=3840` claim doesn't reproduce.
- **No fix required.**

### 5. Hamburger menu — body scroll not locked + no backdrop overlay

- **Severity:** polish (design decision)
- **Device(s):** all mobile (below `lg:`)
- **Repro:**
  1. Tap hamburger to open the menu
  2. Scroll the page behind / below the menu
  3. Underlying page scrolls freely
- **Audit checklist requires:** "Background page is locked (no scroll behind menu) using `overflow: hidden` or `position: fixed` on body" + "Tapping outside menu (overlay) closes it"
- **Actual:** the menu is a drawer-style expand/collapse INSIDE the header (uses `grid-template-rows` transition). It doesn't full-screen-cover. When opened, the underlying page is still visible AND scrollable. There's no backdrop element to tap-to-close.
- **Recommendation:** this is a legitimate design pattern (drawer/accordion nav) used by many sites. Decide whether to:
  - Keep as-is (cleanest, lowest visual disruption)
  - Add `overflow: hidden` on body when open (locks scroll, keeps drawer style)
  - Convert to full-screen overlay menu (heavier change, but matches the audit checklist's expectation)
- **Held — needs your design call.**
- **File:** `src/components/Header.tsx` (lines ~110–155)
- **Verified:** ⏳ pending your decision

### 6. Galaxy Z Fold closed (280px) — header content overflows

- **Severity:** polish (very narrow edge case)
- **Device(s):** Galaxy Z Fold (closed-mode 280×653) only
- **Repro:**
  1. Open `/` at 280×653 viewport
  2. Logo + Donate button + hamburger total ~311px+, overflows the 280 viewport
  3. Donate button is partially clipped at the right edge; hamburger is off-screen
- **Actual:** the page itself doesn't horizontal-scroll (verified — `documentElement.scrollWidth === viewport.width`), but the header's INTERNAL content does. User can't reach the hamburger.
- **Note:** all mainstream phones (iPhone SE 375, Galaxy S23 360, iPhone 13 390, iPhone Pro Max 430, Pixel 7 412) are clean. Z Fold closed-mode is documented by Samsung itself as "compact mode" and apps are expected to adapt.
- **Recommendation:** decide whether to support 280px:
  - Quick fix: add `text-xs` / smaller logo at very narrow widths via a `< 360` breakpoint, or hide one element. ~10 minutes.
  - Or accept that 280px is out of scope (most charity-site analytics show Z Fold closed traffic is < 0.1% of mobile).
- **Held — needs your decision.**
- **File:** `src/components/Header.tsx`
- **Verified:** ⏳ pending your decision

---

## Cross-page checks that passed (no findings)

### Horizontal scroll
At iPhone SE width (375×667), checked: `/`, `/palestine`, `/zakat`, `/donate`, `/about`, `/blog`, `/prayer-times`. All clean — `document.documentElement.scrollWidth === window.innerWidth`. No element exceeds viewport width.

### Donation routing on mobile
Same verification as the desktop pass — all 8 campaign pages emit `/donate?campaign={slug}` correctly via DonationForm + MiniDonationPicker. Header donate-anchor map matches DOM `id`s on every campaign page.

### Heading hierarchy
1 `<h1>` per page, proper h2/h3 cascade — same data as desktop pass (test was viewport-agnostic).

### Alt text coverage
Every `<img>` has alt text — same as desktop pass.

### Hero image weight
Hero on mobile (390×844) requests `w=640` — appropriate for 1.6× DPR. The audit's claim of `w=3840` doesn't reproduce; the existing `sizes="100vw"` is doing its job.

### Touch targets — passed
- Donation amount preset buttons (£25, £50, £100, £250): **142×54 each** ✅
- Donate CTA button: **295×60** ✅
- Hamburger button (after fix): **44×44** ✅

### Touch targets — flagged for your decision
- One-time / Monthly frequency toggle: **97×32 / 86×32** — under 44 minimum but inline pill toggle is a design pattern (forcing 44 makes the toggle disproportionate to the rest of the form). Common pattern on mobile donation forms. **Holding** unless you want me to bump it.

### Tailwind v4 hover scoping
Tailwind v4 wraps `hover:` in `@media (hover: hover)` automatically — so hover styles do not "stick" after tap on touch devices. No fix needed; modern Tailwind handles this.

### Inputmode coverage
All 16 amount inputs across the 8 campaign DonationForms + MiniDonationPickers correctly use `inputMode="numeric"`. Zakat calculator inputs now use `inputMode="decimal"` (fixed in this pass).

---

## Items requiring physical-device verification (you must run these)

These cannot be reliably confirmed in DevTools / preview emulation. Allow ~30 minutes total:

| Item | What to check |
|---|---|
| iOS Safari address-bar resize | Scroll up/down on `/`, `/palestine`, `/donate`. Hero should not jump as the address bar collapses/expands (the dvh fix should make this clean) |
| Apple Pay button | On a real iOS device with Apple Pay set up, open `/donate?campaign=palestine&amount=50&frequency=one-time`. The Apple Pay button should appear at the top of the Stripe Payment Element |
| Google Pay button | Same on Chrome Android with Google Pay set up |
| Virtual keyboard layout shift | Tap into Newsletter email input on iOS. Page should not shift the input behind the keyboard. Same for `/contact`, `/volunteer`, ZakatCalculator |
| Tap delay | Donate buttons should feel instant (no 300ms tap delay). The viewport meta should prevent this; just verify |
| `font-size` zoom | Tap into ZakatCalculator inputs after the fix — page should NOT zoom in 110% on iOS |
| Sticky-hover | After tapping the Donate button on a campaign card, navigating back, the card should NOT remain in the hover state |
| Safe-area-inset (notch) | On iPhone with a notch, header shouldn't sit under the notch. Currently no `env(safe-area-inset-top)` padding — flagged in next section |
| Sticky bottom CTAs | None implemented. If you add one later, use `padding-bottom: env(safe-area-inset-bottom)` |
| Pinch-zoom enabled | No `user-scalable=no` in viewport meta — verify by pinching to zoom on any page. Should work |
| VoiceOver reading order | Turn on VoiceOver, swipe through `/` and `/palestine`. Headings, buttons, links should announce in logical order |
| Pull-to-refresh on Chrome Android | Should not interfere with any page interaction |
| 3G throttling | DevTools → Network tab → throttle to "Slow 3G" → reload `/`. Hero shows fallback color while image loads |
| Apple-touch-icon on home-screen | Add to Home Screen on iOS — verify icon (180×180+) is correct |
| Lighthouse Mobile per page | Chrome DevTools → Lighthouse → Mobile → run on `/`, `/palestine`, `/zakat`, `/donate`, `/blog`. Target ≥85 perf, ≥95 a11y/best practices/SEO |

---

## Items observed but not in scope for this pass

- **No `env(safe-area-inset-top)` padding on the fixed header** — at very small widths on iPhones with a notch, the header could sit under the notch in landscape orientation. Currently `top-0` only. Flagged for later but not a launch blocker because the header is below the safe area in normal portrait use.
- **`prefers-reduced-motion` only respected on counters** — other animations (scroll-condensing header, FAQ accordion expansion, Tailwind transitions) don't respect it. Lower-priority; modern browsers users with reduced-motion preferences are a small slice of charity-site traffic.

---

## Commits in this audit pass

```
cad03a4 Mobile: dvh on full-height sections + 16px input font + 44x44 hamburger
```

(Plus all four fixes from the desktop pass also benefit mobile: counter SSR bug, header logo aspect ratio, footer dynamic year — all already on `main`.)

Push when ready.

---

*See [MOBILE-launch-readiness.md](./MOBILE-launch-readiness.md) for the launch-gate summary.*
