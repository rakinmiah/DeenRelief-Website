# Deen Relief — Tablet Launch Readiness

**Audit date:** 2026-05-02
**Verdict on covered checks:** **YES, launch-ready on every tablet check covered in this pass.** One polish item flagged for design decision (Cancer Care services panel layout at tablet portrait). Real-iPad verification list below.

---

## Headline

**Zero new commits required.** All Section 0 suspected bugs were already addressed by the desktop + mobile passes, and tablet-specific concerns (nav switch, dead zones, hover scoping, Stage Manager) all came back clean on first inspection.

---

## Issues found, by severity

| Severity | Count | Fixed | Held |
|---|---|---|---|
| Blocker | 0 | – | – |
| Major | 0 | – | – |
| Minor | 0 | – | – |
| Polish | 1 | 0 | 1 (design call) |
| Verified non-bug | 5 | – | – |

---

## What carries from prior passes (already on `main`)

| Commit | What it does on tablet |
|---|---|
| `790695a` | Counter SSR — tablet visitors see real numbers regardless of scroll state |
| `8950c33` | Header logo aspect-ratio dev warning silenced |
| `7fb9909` | Footer year auto-updates |
| `cad03a4` | Hero `dvh` (iPad Safari address-bar friendly), 16px inputs, 44×44 hamburger |
| `484012c` | Hamburger menu body-scroll lock when open |
| `2a8127a` | Cleaner header (no duplicate Donate inside menu) |

## One item awaiting your decision

**Cancer Care "What We Provide" services panel layout at 768–1023.** Currently 4×1 (vertical stack). Audit accepts both 4×1 and 2×2. At tablet portrait there's enough horizontal room to use 2×2 instead, which would feel more intentional. Acceptable as-is per the audit. ~5 lines of CSS to switch — see `src/components/CancerCareCentres.tsx:112`.

## Confirmed working at tablet

- ✅ Nav switch boundary (1023 → 1024) sharp and clean — no leakage either side
- ✅ Zero horizontal scroll at 14 widths probed (507 / 700 / 717 / 768 / 820 / 834 / 900 / 1000 / 1023 / 1024 / 1050 / 1100 / 1180 / 1366)
- ✅ Zero dead zones in the 700–1100 sweep
- ✅ Hero serves an appropriate image variant at every tablet width
- ✅ Stage Manager / Split View (~507) renders as mobile cleanly
- ✅ Galaxy Z Fold inner display (717) renders cleanly with hamburger nav
- ✅ Tailwind v4 hover scoping → no sticky-hover bug on touch-only iPads
- ✅ All counter values display correctly (already-fixed)
- ✅ No "duplicate Donate" leakage at any tablet boundary
- ✅ iPad Pro 12.9 portrait (1024) and landscape (1366) both render correctly

---

## Real-iPad verification — must run before tablet launch

| Item | What to check | Time |
|---|---|---|
| iPad Safari "Request Desktop Site" toggle | Site renders correctly on both modes at 1024+ | 2m |
| Apple Pay on iPad Safari | Apple Pay button appears in Stripe Payment Element on `/donate` | 2m |
| Magic Keyboard / trackpad cursor | Pointer cursor on interactive elements | 2m |
| Apple Pencil tap + Scribble | Pencil tap behaves like finger; Scribble into form inputs works | 3m |
| Stage Manager 50/50 split | Half-screen tile (~507px) renders as mobile cleanly | 2m |
| Slide Over (~320px) | Renders cleanly as phone | 1m |
| VoiceOver iPadOS | Reading order logical on `/`, `/palestine` | 5m |
| Dynamic Type / 200% zoom | Layout doesn't break | 2m |
| Mid-flow rotation | Donation-form state preserved across rotation | 2m |
| Lighthouse mobile @ 768 | Performance ≥85, A11y ≥95 on `/`, `/palestine`, `/donate`, `/zakat`, `/blog` | 10m |
| End-to-end donation on iPad | £5 test donation through Stripe test cards | 5m |

**Total: ~36 minutes.** Same iPad you already use is fine.

---

## Final tablet launch gate

| Gate | Status |
|---|---|
| All 15 public routes return 200 | ✅ |
| No horizontal scroll at any tablet width 507–1366 | ✅ |
| Nav switch at lg:1024 is clean (no leakage either side) | ✅ |
| Dead-zone sweep 700–1100 clean | ✅ |
| Single h1 per page | ✅ |
| All `<img>` tags have alt text | ✅ |
| Hover styles auto-scoped to `(hover: hover)` | ✅ (Tailwind v4 default) |
| Counter SSR rendering correct | ✅ (carry-over) |
| Hero `dvh` (no iPad Safari address-bar jump) | ✅ (carry-over) |
| Stage Manager / Split View renders cleanly | ✅ |
| Galaxy Z Fold inner display (717) | ✅ |
| iPad Pro 12.9 portrait (1024) + landscape (1366) | ✅ |
| Cancer Care services panel layout | ⏳ **awaits your design call (acceptable as-is)** |
| Apple Pay on iPad | ⏳ **manual run needed** |
| Trackpad cursor / Apple Pencil | ⏳ **manual run needed** |
| VoiceOver iPadOS | ⏳ **manual run needed** |
| Lighthouse mobile @ 768 | ⏳ **manual run needed** |
| End-to-end donation on iPad | ⏳ **manual run needed** |

**Verdict: zero new tablet-specific code changes needed.** Push the prior fixes (`main` is 8 commits ahead of `origin`) and run the 36-minute real-iPad checklist before opening tablet traffic.

---

*Detailed findings in [TABLET-audit-findings.md](./TABLET-audit-findings.md).*
