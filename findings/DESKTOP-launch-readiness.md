# Deen Relief — Desktop Launch Readiness

**Audit date:** 2026-05-02
**Verdict on covered checks:** **YES, launch-ready on every desktop check covered in this pass.** One item flagged for your decision (Section 4 below). Items deferred for full Playwright + Lighthouse + cross-browser are listed at the bottom.

---

## Issues found, by severity

| Severity | Count | Fixed | Held |
|---|---|---|---|
| Blocker | 0 | – | – |
| Major | 1 | 1 | 0 |
| Minor | 1 | 1 | 0 |
| Polish | 1 | 1 | 0 |
| Hold (decision needed) | 1 | 0 | 1 |
| Verified non-bug | 1 | – | – |

**Net: 3 fixes shipped, 1 item awaiting your call, 0 remaining live blockers within scope.**

## Fixes shipped (all on `main`, push to deploy)

| Commit | Title | What it does |
|---|---|---|
| `790695a` | Fix impact + trust counters showing 0+ for SSR / no-JS / past-fold reloads | SSR + no-JS users + search bots now see real numbers (3,200+, 12+, 5+, 90p) instead of 0+. Animation still kicks in on scroll-from-below |
| `7fb9909` | Footer: dynamic copyright year via new Date().getFullYear() | Year stays current automatically — no annual code change |
| `8950c33` | Header: fix Next.js Image aspect-ratio warning on logo | Removes 16x console warning per page load; logo width now matches its native aspect ratio |

## One item awaiting your decision

**Charity Commission link in Impact section uses internal ID `5049652` instead of registration No. `1158608`.** Other places on the site use the registration-number form. I held off changing this because the audit's hold list explicitly covers charity-number changes. Click the live link in production to confirm it lands on Deen Relief's record. If consistency matters or it lands on a different charity, fix it in [src/components/Impact.tsx:121](../src/components/Impact.tsx). See finding #4 in [DESKTOP-audit-findings.md](./DESKTOP-audit-findings.md) for details.

## Items deferred (recommended before launch — none were possible from this audit)

These aren't blockers I can confirm from a code-only review at the dev server. They need real instrumentation:

- **Lighthouse desktop scores** per page — target ≥90 performance, ≥95 a11y/best practices/SEO. Run Chrome DevTools → Lighthouse on `/`, `/palestine`, `/donate`, `/zakat`, `/blog`.
- **Cross-browser smoke** in Firefox, Safari, Edge — same key pages, watch for layout / form / sticky-header oddities.
- **Stripe end-to-end** — one £5 test donation through `/donate`. Confirm webhook fires + receipt arrives + success state shows.
- **Form submissions** — `/contact` + `/volunteer` + newsletter — confirm Resend delivery + success states.
- **axe-core a11y sweep** — colour contrast + ARIA on every landing page.
- **Keyboard walk** — tab through `/`, `/palestine`, `/donate` end-to-end. Confirm focus rings, logical order, no traps.

---

## Final desktop launch gate

| Gate | Status |
|---|---|
| All 15 public routes return 200 | ✅ |
| Zero failed network requests on probed pages | ✅ |
| Zero console errors after fixes | ✅ |
| Zero console warnings after fixes | ✅ |
| Single `<h1>` per page across all 15 pages | ✅ |
| All `<img>` tags have alt text | ✅ |
| Donation routing — all 8 campaigns emit correct `/donate?campaign=...` | ✅ |
| Header `donateAnchors` map matches real DOM `id`s on every campaign | ✅ |
| Counter SSR rendering (was the major bug) | ✅ |
| Footer copyright year | ✅ |
| Header logo aspect ratio | ✅ |
| "Duplicate Donate" claim — verified non-bug | ✅ |
| Charity Commission link consistency | ⏳ **awaits your call** |
| Lighthouse ≥90 across key pages | ⏳ **manual run needed** |
| Cross-browser pass | ⏳ **manual run needed** |
| Stripe end-to-end | ⏳ **manual test needed** |
| Form submissions | ⏳ **manual test needed** |
| axe-core a11y sweep | ⏳ **manual run needed** |

**Verdict: ship the 3 fixes (push `main`); resolve Section-4 hold; schedule the 5 manual passes above before opening paid traffic.**

---

*Detailed findings in [DESKTOP-audit-findings.md](./DESKTOP-audit-findings.md).*
