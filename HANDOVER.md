# Deen Relief — Handover

**Purpose:** everything a new Claude session (or developer) needs to work on this project productively from a cold start. Written 2026-07-16.

> **Read this first, then confirm current state with `git log --oneline -10` and `gh pr list --state merged --limit 10`.** This doc goes stale; the repo is the truth.

---

## 1. What this is

**Deen Relief** — UK-registered Islamic charity (No. **1158608**), founded 2013 by Shabek Ali in Brighton.

**The differentiator:** it runs *physical cancer care centres* in Adana, Turkey (**Gülücük Evi** / "House of Smiles") for Syrian and Gazan refugee children — unique among UK Islamic charities. Always foreground this in design/content decisions.

**Programmes:** Gaza emergency relief · cancer care (Turkey) · orphan sponsorship, schools, clean water (Bangladesh) · weekly homeless outreach (Brighton, UK).

**Origin:** migrated from WordPress/Elementor to a modern stack. Old WP URLs are 301'd in `next.config.ts` — keep those redirects.

### Stack
- **Next.js 16** (App Router) · **React 19** · **Tailwind v4** · Framer Motion
- **Supabase** (Postgres) — service-role client via `getSupabaseAdmin()` from `@/lib/supabase`
- **Stripe** (donations) · **Resend** (transactional email) · **Royal Mail Click & Drop** (Bazaar shipping)
- **Vercel** (hosting/deploy) · **Anthropic API** (`claude-sonnet-4-6`) for the social deck builder
- **Node 22.22.2 via fnm** — ⚠️ your shell may default to Node 20; run `eval "$(fnm env)" && fnm use 22.22.2` first.

### Repo
`github.com/rakinmiah/DeenRelief-Website` · working branch: **`main`** · production: **deenrelief.org**

---

## 2. ⚠️ Read before you touch anything

1. **Your local checkout is probably stale.** `~/Desktop/DeenRelief` was last seen ~6 commits behind `origin/main`. **`git pull origin main` first**, always.
2. **Never enter the admin passphrase or submit login forms.** The `/admin` area is passphrase-gated. Claude must not authenticate. This means **you cannot click-test admin UI** — verify admin work via `tsc` + `npm run build` + read-only DB probes, and say so plainly rather than claiming you tested it.
3. **Claude has no DDL access. Migrations are applied manually by Rakin** in the Supabase SQL editor. Write the migration file, then *tell him to run it*. Always make code resilient to the migration not being applied yet (see §6).
4. **Don't handle other people's credentials, register accounts, or post/like/follow on social.** Browsing is read-only.
5. **`/chart-sandbox` must stay dev-only** (it `notFound()`s in production). Don't expose it.
6. Commit footer, every commit:
   ```
   Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
   ```

---

## 3. Ship workflow (this is the routine — follow it exactly)

All work goes to `main` via PR. Never commit straight to `main`.

```bash
# 0. Node
eval "$(fnm env)" && fnm use 22.22.2

# 1. Fresh branch off origin/main (NOT off a stale local branch)
git fetch origin main -q && git checkout -b feat/thing origin/main

# 2. …make changes…

# 3. Verify — BOTH must be clean before shipping
npx tsc --noEmit
npm run build

# 4. Commit (with the Co-Authored-By footer), push, PR
git push -u origin feat/thing
gh pr create --base main --head feat/thing --title "..." --body "..."

# 5. Merge + delete branch
gh api -X PUT repos/rakinmiah/DeenRelief-Website/pulls/<N>/merge -f merge_method=merge
gh api -X DELETE repos/rakinmiah/DeenRelief-Website/git/refs/heads/feat/thing

# 6. Poll the deploy until green
git fetch origin main -q && SHA=$(git rev-parse origin/main)
gh api repos/rakinmiah/DeenRelief-Website/commits/$SHA/status --jq '.state'   # want: success
```

**Gotcha:** `main` is checked out in the primary worktree, so `git checkout main` fails inside a worktree ("already checked out"). Branch from `origin/main` instead.

---

## 4. Who's who / access model

| Role | Access |
|---|---|
| `admin` | everything (trustees) |
| `writer` | `/admin/blog` only — sees only their own drafts |
| `sponsorship` | `/admin/sponsorship` only |
| `social` | `/admin/social` only |

**Social is gated by EMAIL, not role** — `SOCIAL_ALLOWED_EMAILS` in `src/lib/admin-social-access.ts` is the single source of truth for the nav, the `/admin/social/*` route guard, and the ⌘K palette. Currently: `info@`, `socialmedia@`, `melissa@`, `ola@` (all `@deenrelief.org`). A general admin **without** an allow-listed email does not get Social.

**People:** Rakin (designer/dev — you're working with him) · Shabek Ali (founder) · Melissa & Ola (trustees) · an SMM who runs social.

---

## 5. Where things live

```
src/app/
  page.tsx                    homepage
  blog/                       public blog — hub + 3 section pages (see §7)
  orphan-sponsorship/         £30/£60/£90/£120 tiers (1–4 children)
  palestine/ qurbani/ zakat/ sadaqah/ cancer-care/ clean-water/
    build-a-school/ uk-homeless/ our-work/
  bazaar/                     PUBLIC Deen Bazaar storefront (custom, live-ish)
  donate/                     Stripe checkout flow
  sponsor/                    sponsor portal (orphan sponsors log in)
  prayer-times/[city]/        programmatic city pages — 94% of search impressions
  r/[slug]/                   short-link redirect (the tracking spine)
  now/                        /now spotlight redirect
  admin/                      DR Admin (passphrase-gated)
    social/                   Campaign Center, First Response, deck builder, performance
    bazaar/ blog/ donations/ sponsorship/ media/ reports/ audit-log/
src/lib/
  supabase.ts  analytics.ts  short-links.ts  admin-session.ts
  admin-social-access.ts     ← social allow-list
  blog.ts  blog-admin.ts  blog-sections.ts
  google-ads.ts              ← dormant, waiting on dev token
  social-editor/  social-*.ts
scripts/growth-report.mjs     ← weekly GSC+GA4+Ads report (see §9)
supabase/migrations/          001 → 042
```

**Docs already in-repo** (lots of prior strategy work — read before re-deriving anything): `DESIGN-SYSTEM.md`, `VISUAL-DIFFERENTIATION-STRATEGY.md`, `PROOF-AND-PROXIMITY-IMPLEMENTATION.md`, `SHOP-PLAN.md`, `BAZAAR_PITCH.md`, `GOOGLE_ADS_BRIEFING.md`, `ANALYTICS_EVENTS.md`, `*_PMAX_AUDIT.md`, plus `seo/` and `website-plan/` directories.

---

## 6. 🔴 OPEN ITEMS — action required

### Migrations awaiting manual application (Rakin, Supabase SQL editor)
| File | What it does | If not applied |
|---|---|---|
| `041_deck_draft_title.sql` | adds `deck_drafts.title` (renameable draft header) | editor still saves; renames just don't persist (code retries without the column on Postgres `42703`) |
| `042_blog_sections.sql` | remaps blog `category` → the 3 sections | public site already correct (resolved at read time); this only tidies stored data + the admin dropdown |

Both are additive, nullable, idempotent, and **safe to run any time**.

### Decisions/blockers owned by Rakin
- **Meta Business Verification** — blocks the Instagram comment-to-DM auto-responder (Phase 2) *and* all platform-native metrics (likes/reach/comments). Nothing to build until it clears.
- **Google Ads API developer token** — apply via a Manager account's API Center (1–3 week approval). Unlocks accurate live Ads reporting **and** activates the already-written offline-conversion uploader in `src/lib/google-ads.ts`.
- **Deen Bazaar architecture** — a *custom* bazaar is already built and live-ish at `/bazaar` (Supabase + Stripe + Royal Mail + named makers). `SHOP-PLAN.md` proposes Shopify Headless instead. **These conflict.** Decision pending: keep custom vs re-platform onto Shopify. Shopify Headless *would* keep the storefront at `deenrelief.org/bazaar` (checkout hosted on a `shop.` subdomain) — a new website is **not** needed either way.
- **DEEN BAZAAR LTD** — the shop is a separate trading company; 100% of net profits go to the charity via corporate Gift Aid. It is **not** a charity and shouldn't be registered as one. Stripe/Shopify signup = **"business/company", not "non-profit"**.

---

## 7. Recent work (this session — all merged & deployed)

| PR | What |
|---|---|
| #21 | Delete-draft option on the deck-builder resume screen |
| #22 | **⌘K command palette** in DR Admin — role-gated search over pages + records (`/api/admin/search`), £0/deterministic |
| #23 | Palette layout fix — portal to `<body>` (escapes stacking contexts) + suppress the global green focus ring |
| #24 | **Charts resize like images** — proportional corner-resize for any group (scales geometry + fontSize + strokes) |
| #25 | Editable draft header (rename) → needs migration **041** |
| #26 | "Delete draft" inside the editor (⋯ menu), race-safe vs autosave |
| #27 | Melissa + Ola granted Social access |
| #28 | **Removed all user-facing "AI"/"Claude" wording from `/admin/social`** (code comments left alone — never rendered) |
| #29 | **Blog split into 3 sections** → needs migration **042** |
| #30 | `/blog` became a 3-card section hub (dropped the "All" feed) |
| #31 | Copy fix |
| #32 | Orphan sponsorship tiers → **£30 / £60 / £90 / £120** = 1 / 2 / 3 / 4 children |
| #33 | **`scripts/growth-report.mjs`** — weekly GSC + GA4 + Ads report |

### The blog structure (new — don't fight it)
Three fixed sections, single source of truth in **`src/lib/blog-sections.ts`**:
- **Islamic Knowledge** `/blog/islamic-knowledge` · **Who We Are** `/blog/who-we-are` · **Latest** `/blog/latest`

`/blog` is a **hub of 3 image cards** (no post feed). The `[slug]` route *dispatches*: a reserved section slug renders the section listing, anything else is a post. Admin editor picks a **Section** from a dropdown; `blog_posts.category` stores the section **label**. `sectionForCategory()` resolves any legacy/stray value → Islamic Knowledge, so the site is correct even pre-migration.

---

## 8. How donation tracking works (important — explain this to the SMM)

**The short link IS the tracking key.** No short link = £0 attributed, no matter what actually happened.

```
Post carries /r/<slug>
  → click logged in short_link_clicks
  → redirect to campaign page with utm_content=<slug>
  → donation stamped utm_content=<slug>
  → social_post_stats view joins clicks + donations back to the post
```

`buildDestinationUrl()` (`src/lib/short-links.ts`) sets: `utm_source`=platform, `utm_medium`=social, `utm_campaign`=campaign_slug, **`utm_content`=slug** ← the per-post key.

**SMM's job per post:** mint a **unique** short link → put it in the post → after publishing hit **"Mark as posted"** (deck builder) or **Log a post** and **select that short link**. Everything else is computed. Dashboard: `/admin/social/performance` (per-post clicks/donations/£/conversion, + rollups by platform, campaign, design template, topic).

**Rules:** one slug per post (reusing a slug merges numbers); only `succeeded` donations count; attribution is last-click.

**Not tracked yet:** platform-native metrics + the top of the comment-to-donate funnel (comments → DMs) — both need Meta verification.

---

## 9. Analytics / growth report

`node scripts/growth-report.mjs` → markdown report to stdout.

- **Auth:** local **gcloud Application Default Credentials**, read-only, **no keys on disk**. Already logged in as `rakin.rifat.miah@gmail.com` (shared with the JDH Gas report). Token is minted per-run via `gcloud auth application-default print-access-token`.
- **GSC site:** `sc-domain:deenrelief.org` · **GA4 property:** `524785471` (Ads is linked to GA4).
- Reports last 7 complete days vs the prior 7 (ranges end 3 days ago — **GSC lags ~2 days**), plus a 28-day donations/Ads context block.

⚠️ **Trust levels:** GSC (~2-day lag) and GA4 traffic/donations are **current and reliable**. The **Google Ads figures are GA4-imported + session-attributed and lag** — they surfaced stale May campaigns as if current. Treat Ads numbers as indicative only until the Ads API dev token lands.

### 🎯 The live SEO finding (biggest open opportunity)
Diagnosed from 90 days of GSC data:
- **94% of impressions (39,533) are prayer-times queries** — huge captive Muslim audience, almost zero donation intent. Donation intent = **2% of impressions but 33% of clicks** → when you show up, people click. You barely show up.
- **~800 impressions of pure Gaza-donation intent** ("donate to gaza", "gaza emergency appeal", "how to help gaza") land on `/palestine`, which ranks **position 86**. `/donate-to-gaza` correctly 308s → `/palestine`. **`/gaza` is a 404** — the most-searched term isn't captured.
- `/orphan-sponsorship` sits at **position 14** — one page off page 1 = fastest win.
- **It's a ranking problem, not a content gap.** Pages exist; they're at pos 55–86 (invisible). Causes: low domain authority + thin optimisation + topical signal drowned by prayer-times.

**Agreed plan (not started):** (1) rebuild `/palestine` for the Gaza query cluster + capture `/gaza`; (2) optimise `/orphan-sponsorship` → page 1; (3) add a "Support our work" module to prayer-times pages to convert the 39k-impression goldmine; (4) use the blog's Islamic Knowledge section as an authority engine with internal links to donation pages; (5) seasonal pages (Fitrana/Fidya/Kaffarah/Eid) — lower competition, time to Ramadan **2027** (~Feb); (6) backlinks (mosque directories, Brighton local press, the artisan story).

---

## 10. Marketing context

- **No usable email marketing list.** 42 donors + 1 sponsor + 11 bazaar customers ≈ ~50 addresses, but **0 have marketing consent**. No newsletter table, no broadcast system (Resend is transactional only). A launch blast to donors is **not legally sendable** (UK PECR/GDPR) — and donor data belongs to the *charity*, while Deen Bazaar is a *separate commercial entity*. Only the ~11 bazaar customers are defensible under "soft opt-in".
- **Therefore:** list-building (consent checkbox + "notify me" signup) is the prerequisite for any email marketing. Not built yet.
- **Deen Bazaar GTM (agreed):** cause-first ("100% of profits fund relief; handmade by named artisans"), social-led using the existing deck-builder + tracked short links + QR, seed Muslim micro-influencers, soft-launch now to build reviews/UGC/list → **big push at Ramadan 2027**.

---

## 11. Design principles (permanent — Rakin's standing bar)

1. **Sleekness is non-negotiable.** Template-feeling output fails.
2. **Research is an input, not a template.** Always include big-budget UI/UX ceiling references (Apple, Stripe, Linear, Figma…), not just direct competitors.
3. **Module composition deserves real thought.** "Rectangle stack, text-left-image-right, repeat" is the failure mode.
4. **Every page needs a signature moment** a competitor isn't shipping.
5. **"Proof & Proximity"** is the brand's visual axis: intimate human crops + location/date evidence tags (`ProofTag`). Source Serif 4 headings (competitors are 100% sans) + DM Sans body.

**Tokens:** green `#2D6A2E` / dark `#1B4D1C` / light `#E8F5E9`; amber `#D4A843`; charcoal `#1A1A2E`; grey `#6B7280`; cream `#FDF8F0`.

**Rakin's working style:** strong visual opinions, specific direction, iterates in passes. **Prefers concise communication and direct action over long explanations.** Lead with the outcome.

---

## 12. Env vars (names only — values in `.env.local` + Vercel, never commit)

`NEXT_PUBLIC_SUPABASE_URL` · `SUPABASE_SERVICE_ROLE_KEY` · `NEXT_PUBLIC_SUPABASE_ANON_KEY` · `STRIPE_SECRET_KEY` · `STRIPE_WEBHOOK_SECRET` · `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` · `RESEND_API_KEY` · `ANTHROPIC_API_KEY` · `APP_SECRET` · `ADMIN_LOGIN_PASSPHRASE` · `SOCIAL_LOGIN_PASSPHRASE` · `WRITER_LOGIN_PASSPHRASE` · `ADMIN_API_TOKEN` · `CRON_SECRET` · `UPSTASH_REDIS_REST_*` · `VAPID_*` · `ROYAL_MAIL_*` · `SWIFTAID_*` · `GOOGLE_ADS_*` (dormant) · `NEXT_PUBLIC_BAZAAR_ENABLED`

---

## 13. Quick verification recipes

```bash
# Read-only DB probe (counts/schema — no PII dumps). Works because .env.local has the service key.
node --env-file=.env.local probe.mjs      # create ad-hoc, then DELETE it — never commit probes

# Does a column exist yet (i.e. has the migration run)?  Postgres 42703 = "not applied"
# Live URL check
curl -s -o /dev/null -w "%{http_code} -> %{redirect_url}" https://deenrelief.org/<path>
```

**Verification honesty:** admin UI can't be click-tested (passphrase). Say what you actually verified — "tsc + build clean, plus a live-DB probe" — and never imply a browser test you didn't run.
