-- Migration 021: Campaign Command Center foundations.
--
-- Two tables that power the SMM's self-serve controls without a dev cycle:
--
--   site_config     — flexible key/value JSON store for tactical site-wide
--                     state. Current keys:
--                       'banner'           → site-wide urgent banner
--                       'featured_campaign'→ which campaign to feature on
--                                            homepage + /donate
--                     Future phases can add new keys without a new migration.
--
--   now_spotlights  — timed pointer driving deenrelief.org/now. Each row
--                     represents an SMM-chosen redirect target with an
--                     expiry. The /now redirect picks the most recent
--                     unexpired uncleared row; falls back to homepage when
--                     none exists. Auto-resets the moment expires_at lapses
--                     — no cron needed.
--
-- Idempotent — safe to run more than once.

-- ─── site_config ──────────────────────────────────────────────────────

create table if not exists site_config (
  key text primary key,
  value jsonb not null,
  updated_by_email text,
  updated_at timestamptz not null default now()
);

comment on table site_config is
  'Flexible key/value store for SMM-controlled site state (banner toggle, featured campaign, etc). Keyed by string; values are JSON validated in code (see src/lib/site-config.ts).';

-- ─── now_spotlights ───────────────────────────────────────────────────

create table if not exists now_spotlights (
  id uuid primary key default gen_random_uuid(),
  -- Which campaign was spotlighted. Free-text so we don't FK to a
  -- campaigns table that doesn't exist (campaigns live in code).
  campaign_slug text not null,
  -- Where /now should redirect to during this spotlight's window.
  -- Stored explicitly (rather than derived from campaign_slug) so a
  -- spotlight can point at a sub-route or pathway-prefilled URL in
  -- future without schema changes.
  destination_path text not null,
  -- Who created the spotlight.
  spotlighted_by_email text,
  spotlighted_at timestamptz not null default now(),
  -- When this spotlight stops being active. The /now redirect picks
  -- the most recent row where expires_at > now() AND cleared_at IS NULL;
  -- otherwise it 302s to the homepage. No cron job needed — expiry is
  -- purely query-time.
  expires_at timestamptz not null,
  -- Optional forward-reference for Phase 5 (per-post performance):
  -- when the SMM clicks "Spotlight" inline on a registered social post,
  -- we record which post triggered the spotlight here.
  social_post_id uuid,
  -- Soft-clear marker for the "Reset to homepage now" button. We keep
  -- the row for history rather than DELETE.
  cleared_at timestamptz,
  -- Why cleared (audit only — "manual_reset", "superseded_by", etc).
  cleared_reason text
);

-- Most recent active (= unexpired AND uncleared) spotlight is the most
-- common query — index supports it.
create index if not exists idx_now_spotlights_active
  on now_spotlights (spotlighted_at desc)
  where cleared_at is null;

-- For spotlight-history views, ordered by spotlight time desc.
create index if not exists idx_now_spotlights_spotlighted_at
  on now_spotlights (spotlighted_at desc);

comment on table now_spotlights is
  'Timed redirect targets for deenrelief.org/now. SMM clicks "Spotlight on /now" per campaign; row inserted with expires_at = now() + N days (default 3, configurable 1–30). /now picks the most recent active row, else falls back to homepage.';
