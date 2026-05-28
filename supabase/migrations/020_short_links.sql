-- Migration 020: short links system for the Social Operations Platform.
--
-- The SMM generates voice-friendly, brand-consistent URLs like
--   deenrelief.org/r/q                  (Qurbani — voiceover-friendly)
--   deenrelief.org/r/orphans-tiktok     (descriptive — per-post tagging)
--   deenrelief.org/r/sudan              (per-campaign hotlink)
-- These 302 to the right campaign landing page with UTMs baked in,
-- so every click is end-to-end attributable to the link (and therefore
-- to the social post that promoted it).
--
-- Used by:
--   - /r/[slug]/route.ts                — redirect handler + click logger
--   - /admin/social/links               — SMM-facing list + create form
--   - The per-post performance dashboard (Phase 5)
--
-- Idempotent — safe to run more than once.

create table if not exists short_links (
  id uuid primary key default gen_random_uuid(),
  -- Slug is the path segment after /r/. Lowercase ASCII + digits +
  -- hyphens; 1–50 chars; the regex is enforced in code (src/lib/
  -- short-links.ts) so we get nicer error messages than a CHECK
  -- constraint, but uniqueness is enforced by the unique index below.
  slug text not null,
  -- Where to send the donor. Stored as a relative path
  -- (e.g. '/qurbani') or an absolute URL. The redirect handler
  -- resolves relative paths against the request origin.
  destination_url text not null,
  -- Optional grouping tag — usually the donation campaign slug
  -- (palestine, qurbani, orphan-sponsorship, etc.). Drives the
  -- utm_campaign value on the redirect target.
  campaign_slug text,
  -- Optional platform the link was minted for. Drives utm_source.
  -- Free-text; common values: instagram, tiktok, facebook, x,
  -- threads, whatsapp_channel, email, voice, qr, other.
  platform text,
  -- Internal notes for the SMM ("voice CTA on Reel May 25",
  -- "printed on mosque poster", etc.). Not surfaced to donors.
  notes text,
  -- Who created it — audit trail.
  created_by_email text,
  created_at timestamptz not null default now(),
  -- Soft-delete marker. Archived links 302 to the homepage rather
  -- than the original destination, so any in-the-wild copies of an
  -- old link fail gracefully instead of breaking.
  archived_at timestamptz
);

-- Case-insensitive uniqueness on the slug. Lookups in the redirect
-- handler use ilike against this index.
create unique index if not exists idx_short_links_slug_lower
  on short_links (lower(slug));

-- Active links filtered by campaign — used by the admin list view.
create index if not exists idx_short_links_campaign_active
  on short_links (campaign_slug) where archived_at is null;

-- Recent-first ordering for the list view.
create index if not exists idx_short_links_created
  on short_links (created_at desc);

comment on table short_links is
  'Branded short URLs (deenrelief.org/r/<slug>) for the social media manager. Each link redirects to a destination page with UTMs baked in for end-to-end attribution.';

-- ─────────────────────────────────────────────────────────────────────────
-- Click events. One row per /r/[slug] hit. Drives the per-post
-- performance dashboard (Phase 5) and is later joined to the
-- donations table on UTM params to compute conversion per link/post.
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists short_link_clicks (
  id bigserial primary key,
  short_link_id uuid not null references short_links(id) on delete cascade,
  clicked_at timestamptz not null default now(),
  -- All optional / privacy-respecting fields. IP is captured for
  -- spam/abuse diagnostics only; we don't surface it in the UI.
  ip_address text,
  user_agent text,
  referrer text,
  country_iso text
);

create index if not exists idx_short_link_clicks_link_time
  on short_link_clicks (short_link_id, clicked_at desc);

comment on table short_link_clicks is
  'One row per /r/<slug> redirect. Logged in the background via Next.js after() so the redirect itself stays fast.';
