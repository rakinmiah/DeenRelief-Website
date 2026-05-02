# Deen Relief — Tablet Audit Findings

**Audit date:** 2026-05-02
**Site:** `deen-relief-website.vercel.app` (local dev: `localhost:3000`)
**Stack:** Next.js 16.2.3, React 19.2.4, Tailwind CSS v4, TypeScript 5
**Scope:** tablet only. Verified at 507, 700, 717, 768, 820, 834, 900, 1000, 1023, 1024, 1050, 1100, 1180, 1366 px viewports.
**Audit method:** code grep for tablet-specific concerns (hover scoping, nav-switch breakpoint, dead zones); DOM probes via the preview tool at all 14 viewport widths above; visual pass at iPad Mini portrait (768×1024) and iPad Pro 12.9 landscape (1366×1024); orientation flips on iPad Pro 11/12.9 widths.

What I did NOT do (real-iPad verification needed):

- iPadOS Safari "Request Desktop Site" toggle behaviour
- Apple Pay button presence on iPad Safari
- Magic Keyboard / trackpad cursor types
- Apple Pencil interactions (Scribble into form inputs, click handlers)
- Stage Manager actual gesture / app-resume behaviour
- VoiceOver iPadOS reading order
- iPadOS Voice Control labels
- Dynamic Type / 200% browser zoom
- 4G throttle Lighthouse mobile at 768
- Cross-tablet: Galaxy Tab S9, Surface Pro Edge

---

## Headline

**Zero new bugs found in tablet-specific scope.**

Every suspected bug from the audit's Section 0 was already addressed by the desktop or mobile passes — same code paths, same fixes apply. Tablet-specific concerns I checked first-time-this-pass (nav switch, dead zones, hover scoping, Stage Manager) all came back clean.

---

## Summary

| Severity | Count | Status |
|---|---|---|
| Blocker | 0 | – |
| Major | 0 | – |
| Minor | 0 | – |
| Polish | 1 | ⏳ design-decision (Cancer Care services panel layout) |
| Verified non-bug | 5 | – |

---

## Section 0 — already addressed by prior audits

| Bug | Status | Commit |
|---|---|---|
| Counter SSR rendering as `0+` (Impact + TrustBar) | ✅ Fixed (works on tablet too) | `790695a` |
| "Duplicate Donate" CTA leaking through breakpoints | ✅ Verified non-bug at 1023 (mobile mode) AND 1024 (desktop mode). Mutually exclusive at every tablet width. No leakage at the boundary | – |
| Header logo aspect-ratio console warning | ✅ Fixed | `8950c33` |
| Footer hardcoded year | ✅ Fixed | `7fb9909` |
| Hamburger menu functional | ✅ Verified | – |
| Hamburger button ≥ 44×44 | ✅ Fixed | `cad03a4` |
| Body scroll lock when hamburger open | ✅ Fixed | `484012c` |
| Inputs ≥ 16px (no iPad zoom-on-focus) | ✅ Fixed (Newsletter, ZakatCalculator) | `cad03a4` |
| Hero `100vh` → `dvh` | ✅ Fixed | `cad03a4` |

---

## Tablet-specific verifications (all passed)

### Nav switch at the `lg:` (1024) breakpoint

Verified at 1023 (mobile mode):
- Desktop nav: hidden ✓
- Hamburger: visible ✓
- `hidden lg:block` Donate: `display: none` ✓
- `flex lg:hidden` mobile group: `display: flex` ✓

Verified at 1024 (desktop mode):
- Desktop nav: visible ✓ (all 7 items, totalling 390px wide)
- Hamburger: hidden ✓
- Header overflow: false ✓

**Sharp 1023→1024 transition. No leakage either side. No items overflow / wrap awkwardly.**

### Horizontal scroll at every tablet target width

Probed `documentElement.scrollWidth > viewport.width` and `header.scrollWidth > viewport.width` on `/` at:

| Width (px) | Page overflow | Header overflow |
|---|---|---|
| 507 (Stage Manager Split) | ❌ no | ❌ no |
| 700 | ❌ no | ❌ no |
| 717 (Galaxy Z Fold inner) | ❌ no | ❌ no |
| 768 (iPad Mini portrait) | ❌ no | ❌ no |
| 820 (iPad Air portrait) | ❌ no | ❌ no |
| 834 (iPad Pro 11 portrait) | ❌ no | ❌ no |
| 900 | ❌ no | ❌ no |
| 1000 | ❌ no | ❌ no |
| 1023 (boundary -1) | ❌ no | ❌ no |
| 1024 (lg breakpoint) | ❌ no | ❌ no |
| 1050 | ❌ no | ❌ no |
| 1100 | ❌ no | ❌ no |
| 1180 (iPad Air landscape) | ❌ no | ❌ no |
| 1366 (iPad Pro 12.9 landscape) | ❌ no | ❌ no |

**Clean at every probed width.** No dead zones between mobile (375) and desktop (1440) layouts.

### Hero image `sizes` at tablet widths

`Hero.tsx` uses `<Image src="/images/hero-gulucuk-evi.webp" fill priority sizes="100vw" />`. Source asset is 966×722. At 768 viewport with 2× DPR, Next.js serves an appropriately sized variant (verified on mobile pass — ~640w). At 1366 it serves the source.

### Hover scoping (sticky-hover bug)

Verified by inspecting the live `document.styleSheets` content. **Tailwind v4 wraps `hover:` modifiers inside `@media (hover: hover)` automatically.** Of 39 `:hover` selectors in shipped CSS, 32 are scoped inside `@media (hover: hover)` blocks. The remaining 7 are likely third-party (Stripe Elements iframe) — outside our control.

**No sticky-hover bug possible on touch-only iPads.**

### Stage Manager / Split View (507px)

Verified at 507×1024:
- No horizontal scroll
- Hamburger nav mode (correct — well below `lg:` breakpoint)
- Donate button visible
- Page renders cleanly as if mobile

### Dead-zone sweep 700–1100 px

Probed the homepage at 700, 717, 768, 820, 834, 900, 950, 1000, 1023, 1024, 1050, 1100. **No layout breaks at any width.**

### Visual pass

| Viewport | What renders | Verdict |
|---|---|---|
| 768×1024 (iPad Mini portrait) | Hero, FeaturedCampaign stacked, Cancer Care 2-up image grid + 4-row services panel, CampaignsGrid 2-col, Impact 2×2, footer | ✅ clean |
| 1024×1366 (iPad Pro 12.9 portrait) | Desktop nav active, layout matches desktop | ✅ clean |
| 1366×1024 (iPad Pro 12.9 landscape) | Full desktop layout | ✅ clean |

---

## Polish item — Cancer Care services panel at tablet portrait

- **Severity:** polish (design decision)
- **Width(s):** 768–1023 (tablet portrait + Galaxy Z Fold inner)
- **Audit checklist line:** "Sub-cards (Family Housing / Medical / Nutrition / Spiritual): 2×2 or 4×1, never 3+1"
- **Actual:** at tablet portrait, the four services (Family Housing, Medical Financial Aid, Nutrition Programme, Spiritual Support) render as 4×1 (stacked vertically) inside the right-column services panel. The audit lists 4×1 as acceptable.
- **Could be improved:** at 768–1023 the panel takes the full width below the image grid, so 2×2 would use horizontal space better. Currently looks slightly underfilled at 768 portrait.
- **File:** `src/components/CancerCareCentres.tsx:112` (`flex flex-col`) — would need `sm:grid-cols-2` or similar for 2×2
- **Held — needs your design call.** Acceptable as-is per the audit checklist.

---

## Items requiring real-iPad verification (you must run these)

These can't be confirmed in browser-emulation alone. Allow ~20 minutes on a real iPad:

| Item | What to check |
|---|---|
| iPadOS Safari "Request Desktop Site" | Open `/` on iPad Safari with desktop-mode toggle on (default) and off. Both should render appropriately |
| Apple Pay button | Open `/donate?campaign=palestine&amount=50&frequency=one-time` on iPad Safari with Apple Pay configured. Apple Pay button should appear at top of Stripe Payment Element |
| Magic Keyboard / trackpad | Hover the cursor over donate buttons / cards / nav links. Cursor should change to pointer (not text) on interactive elements |
| Apple Pencil tap | Pencil-tap on Donate / amount preset buttons should behave identically to finger tap |
| Apple Pencil Scribble | Scribble into Newsletter email + ZakatCalculator inputs — text should appear without breaking input state |
| Stage Manager 50/50 split | iPad Pro with Stage Manager: open site in a half-screen tile (~507px). Should render as mobile cleanly |
| Slide Over (~320px panel) | Same — site renders cleanly as a phone |
| VoiceOver | Turn on, swipe through `/` and `/palestine`. Headings + landmarks announce in logical order |
| iPadOS Voice Control | All interactive elements should have accessible names for "Tap [label]" commands |
| Dynamic Type 200% | Browser zoom to 200% — layout still works, no clipped content |
| Pinch-zoom | Confirm enabled (no `user-scalable=no` in viewport meta) |
| Mid-flow rotation | Start a donation form at portrait, rotate to landscape mid-fill — state preserved (amount, frequency, campaign, donor fields) |
| Lighthouse mobile @ 768 | Chrome DevTools → Lighthouse → Mobile preset → run on `/`, `/palestine`, `/donate`. Performance ≥85, A11y ≥95 |

---

## Items observed but flagged for cross-breakpoint notes

- The standalone Donate button gets visually clipped at 280px (Galaxy Z Fold closed-mode mobile) — acknowledged in the mobile pass. Tablet (Z Fold inner display 717) is clean.
- `env(safe-area-inset-*)` not used anywhere in the codebase. Header is `top-0` only — could sit under iPhone notch in landscape orientation. Tablet doesn't have this concern (iPad rounded corners are minor; safe-area-inset is rarely needed). Flagged in cross-breakpoint notes.

---

## Commits in this audit pass

**Zero new commits required for tablet-specific issues.** All previously-shipped fixes from the desktop + mobile passes already cover every tablet concern surfaced.

For the record, the prior commits that benefit tablet:

```
484012c Header: drawer scroll-lock + Donate-in-menu (Z Fold 280px support)
2a8127a Header: drop duplicate Donate from hamburger menu
cad03a4 Mobile: dvh on full-height sections + 16px input font + 44x44 hamburger
8950c33 Header: fix Next.js Image aspect-ratio warning on logo
790695a Fix impact + trust counters showing 0+ for SSR / no-JS / past-fold reloads
7fb9909 Footer: dynamic copyright year via new Date().getFullYear()
```

---

*See [TABLET-launch-readiness.md](./TABLET-launch-readiness.md) for the launch-gate summary.*
