# Deen Relief — project instructions

**📖 Read [`HANDOVER.md`](./HANDOVER.md) at the start of any substantial task.** It has the full picture: architecture, access model, tracking, open items, SEO findings, design principles. This file is only the non-negotiables.

## What this is
UK Islamic charity (No. 1158608). **Next.js 16 + React 19 + Tailwind v4 + Supabase + Stripe + Vercel.** Production: deenrelief.org. Working branch: `main`.

## Non-negotiables

1. **Node 22.22.2 via fnm** — the shell may default to Node 20:
   `eval "$(fnm env)" && fnm use 22.22.2`
2. **Pull first.** The local checkout is often behind. `git fetch origin main` and branch from **`origin/main`** (never a stale local branch; `git checkout main` fails inside a worktree).
3. **Never enter the admin passphrase or submit login forms.** `/admin` is passphrase-gated — Claude must not authenticate. So admin UI **cannot be click-tested**. Verify with `tsc` + `build` + read-only DB probes, and **say exactly what you verified** — never imply a browser test you didn't run.
4. **No DDL access — migrations are applied manually by Rakin** in the Supabase SQL editor. Write the file, then tell him to run it. Make code **resilient to the migration not being applied** (retry without the column on Postgres `42703`).
5. **Verify before shipping — both must be clean:**
   `npx tsc --noEmit` && `npm run build`
6. **Ship via PR, never straight to `main`:** branch → verify → push → `gh pr create` → merge via `gh api -X PUT .../pulls/<N>/merge -f merge_method=merge` → delete branch → poll `commits/<sha>/status` until `success`.
7. **Commit footer, every commit:**
   ```
   Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
   ```
8. **Never commit secrets.** Env values live in `.env.local` + Vercel. Delete any ad-hoc probe scripts after use.
9. `/chart-sandbox` stays **dev-only** (404s in production).
10. **Social section is gated by EMAIL, not role** — `SOCIAL_ALLOWED_EMAILS` in `src/lib/admin-social-access.ts` is the single source of truth (nav + route guard + ⌘K palette).

## Style

- **Sleekness is a permanent bar** — template-feeling output fails. Every page needs a signature moment. Research (incl. big-budget UI/UX ceilings) is an input, not a template.
- Brand axis: **"Proof & Proximity"** — intimate human crops + location/date `ProofTag`s. Source Serif 4 headings, DM Sans body. Green `#2D6A2E`, amber `#D4A843`, charcoal `#1A1A2E`, cream `#FDF8F0`.
- **Rakin prefers concise communication and direct action over long explanations.** Lead with the outcome.
