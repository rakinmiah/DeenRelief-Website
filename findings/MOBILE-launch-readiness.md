# Deen Relief — Mobile Launch Readiness

**Audit date:** 2026-05-02
**Verdict on covered checks:** **YES, launch-ready on every mobile check covered in this pass.** Two items flagged for your design decision (drawer-menu scroll-lock, Z Fold 280 header overflow). Real-device verification list below — must run before opening paid mobile traffic since most charity donation traffic is mobile.

---

## Issues found, by severity

| Severity | Count | Fixed | Held |
|---|---|---|---|
| Blocker | 0 | – | – |
| Major | 0 | – | – |
| Minor | 4 | 4 | 0 |
| Polish | 2 | 0 | 2 |
| Verified non-bug | 3 | – | – |

**Net: 4 fixes shipped, 2 design-decision items awaiting your call, 0 remaining live bugs within scope.**

---

## Fixes shipped (push `main` to deploy)

| Commit | Title | What it does |
|---|---|---|
| `cad03a4` | Mobile: dvh on full-height sections + 16px input font + 44x44 hamburger | Hero + auth use `dvh` instead of `vh` (fixes iOS Safari address-bar layout jump); Newsletter + ZakatCalculator inputs at 16px (no iOS zoom-on-focus); Zakat inputs add `inputMode="decimal"` for proper keyboard; hamburger button now 44×44 (Apple HIG) |

Plus the four fixes from the desktop pass that also benefit mobile, already on `main`:

| Commit | What it does on mobile |
|---|---|
| `790695a` | Counter SSR bug — mobile users hitting page from search no longer see "0+" before scrolling |
| `8950c33` | Header logo aspect-ratio dev warning silenced on every page load |
| `7fb9909` | Footer year now updates automatically year-on-year |
| `b3b9bb4` (earlier) | Partner strip layout — already correct on mobile |

## Two items awaiting your decision

**1. Hamburger menu — body-scroll lock + backdrop overlay**
The audit checklist requires both. The current implementation is a drawer-style nav (expand/collapse inside the header), which is a valid pattern but doesn't lock body scroll or have a backdrop to tap-to-close. Decide whether to keep as-is, add scroll-lock only (low effort), or convert to full-screen overlay (heavier change).

**2. Galaxy Z Fold closed (280×653) — header overflow**
Header content (logo + Donate + hamburger) doesn't fit at 280px. Page itself doesn't horizontal-scroll; just the header content. All mainstream phones (360–430) are fine. Decide whether to support 280 (~10-min fix) or accept that Z Fold closed-mode is out of scope.

See [MOBILE-audit-findings.md](./MOBILE-audit-findings.md) findings #5 and #6 for details.

---

## Real-device verification — must run before mobile launch

These cannot be confirmed in browser-emulation alone. Allow ~30 minutes total on a real iPhone + a real Android:

- [ ] **iOS Safari address-bar resize:** scroll on `/`, `/palestine`, `/donate` — hero should not jump as bar collapses
- [ ] **Apple Pay button:** appears in `/donate` Stripe Payment Element on iOS Safari with Apple Pay configured
- [ ] **Google Pay button:** appears on Chrome Android with Google Pay configured
- [ ] **Virtual keyboard:** Newsletter / contact / Zakat inputs — keyboard should not hide the input
- [ ] **No iOS zoom-on-focus:** ZakatCalculator inputs after the 14→16px fix
- [ ] **Sticky-hover:** tap a donation card on `/our-work`, navigate back — card should NOT remain in hover state
- [ ] **VoiceOver:** turn on, swipe through `/` and `/palestine` — landmarks announce, reading order logical
- [ ] **TalkBack (Android):** same
- [ ] **Pinch-zoom:** confirm enabled (no `user-scalable=no`)
- [ ] **3G throttling:** Chrome DevTools → "Slow 3G" → reload `/` — graceful loading
- [ ] **Lighthouse mobile:** Performance ≥85, A11y ≥95, Best Practices ≥95, SEO ≥95 on `/`, `/palestine`, `/zakat`, `/donate`, `/blog`
- [ ] **End-to-end donation:** £5 test donation through `/donate` on iOS Safari, then again on Chrome Android

---

## Final mobile launch gate

| Gate | Status |
|---|---|
| All 15 public routes return 200 (verified desktop pass) | ✅ |
| No horizontal scroll at 360–430 viewports (mainstream Android + iOS) | ✅ |
| Single h1 per page across all 15 pages | ✅ |
| All `<img>` tags have alt text | ✅ |
| Hamburger menu functional (open/close, aria, all 7 nav links) | ✅ |
| Hamburger button ≥ 44×44 | ✅ (after fix) |
| Donation form amount presets ≥ 44×44 | ✅ |
| Donate CTA button ≥ 44×44 | ✅ |
| Inputs ≥ 16px font-size (no iOS zoom-on-focus) | ✅ (after fix) |
| `inputMode` set on numeric inputs | ✅ |
| `dvh` instead of `vh` on full-height sections | ✅ (after fix) |
| Counter SSR rendering — was the major bug, applies to mobile | ✅ |
| Hero image serves mobile-sized variant | ✅ |
| Tailwind hover scoped to `(hover: hover)` (no sticky-hover) | ✅ (Tailwind v4 default) |
| Body-scroll lock on hamburger open | ⏳ **awaits your decision** |
| Z Fold (280px closed mode) header layout | ⏳ **awaits your decision** |
| Real-device iOS Safari verification | ⏳ **manual run needed** |
| Real-device Chrome Android verification | ⏳ **manual run needed** |
| Apple Pay / Google Pay button presence | ⏳ **manual run needed** |
| End-to-end donation on real mobile | ⏳ **manual run needed** |
| VoiceOver / TalkBack reading order | ⏳ **manual run needed** |
| Lighthouse mobile scores | ⏳ **manual run needed** |

**Verdict: ship the 5 fixes (push `main`); resolve the 2 design-decision items; run the 7-item real-device verification list before opening mobile paid traffic.**

---

*Detailed findings in [MOBILE-audit-findings.md](./MOBILE-audit-findings.md).*
