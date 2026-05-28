-- Migration 025: social_posts registry + per-post performance view.
--
-- Phase 5 of the Social Operations Platform. The SMM logs every post she
-- publishes (platform, URL, caption, the short link she promoted), and
-- the dashboard surfaces:
--
--   • Clicks on the post's short link (from short_link_clicks)
--   • Donations attributed to it (via utm_content = short_link.slug)
--   • £ raised
--   • Conversion rate (donations / clicks)
--
-- Platform-native metrics (likes/views/comments) are a future hook —
-- column reserved (metrics_json) but populating it needs Meta Graph +
-- TikTok Business API access, which is blocked on Meta Business
-- Verification. Build now, populate later.
--
-- Idempotent.

create table if not exists social_posts (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in (
    'instagram', 'tiktok', 'facebook', 'x', 'threads',
    'linkedin', 'whatsapp_channel', 'youtube', 'other'
  )),
  -- The platform's own id for the post (IG media_id, TikTok video_id,
  -- etc.). Optional — many platforms make this awkward to copy. The
  -- external_url is more SMM-friendly.
  external_post_id text,
  -- Direct link to the post on the platform. The SMM pastes this from
  -- the address bar after publishing.
  external_url text,
  -- Short label for the SMM's own indexing — derived from caption first
  -- line if not provided.
  title text,
  -- Full caption text the SMM published. Stored verbatim so we can
  -- later run per-format performance analysis (carousel vs reel vs
  -- single image, hashtag count vs engagement, etc.).
  caption text,
  -- The short link this post promoted. NULL when the post didn't carry
  -- a trackable link (e.g. an awareness post). When set, the attribution
  -- chain works: post → short_link → utm_content → donations.
  short_link_id uuid references short_links(id),
  -- Optional campaign tag. Auto-suggested from the short link's
  -- campaign_slug when one is selected.
  campaign_slug text,
  -- The keyword the SMM asked donors to comment for the auto-DM (Phase 2).
  -- Stored even before Meta verification clears so the SMM can record
  -- what keyword went out manually.
  caption_keyword text,
  -- When the post was actually published. Defaults to now() but the
  -- SMM should backdate when logging older posts.
  published_at timestamptz not null default now(),
  -- Platform-native metrics, populated by future Meta Graph + TikTok
  -- ingesters. Shape per platform — see src/lib/social-performance.ts.
  metrics_json jsonb,
  metrics_updated_at timestamptz,
  created_by_email text,
  created_at timestamptz not null default now(),
  -- Soft delete — keeps history for already-attributed donations.
  archived_at timestamptz,
  notes text
);

create index if not exists idx_social_posts_platform_pub
  on social_posts (platform, published_at desc)
  where archived_at is null;

create index if not exists idx_social_posts_campaign_pub
  on social_posts (campaign_slug, published_at desc)
  where archived_at is null;

create index if not exists idx_social_posts_short_link
  on social_posts (short_link_id)
  where archived_at is null and short_link_id is not null;

create index if not exists idx_social_posts_published_at
  on social_posts (published_at desc);

comment on table social_posts is
  'Registry of social posts the SMM publishes. Joins to short_link_clicks (via short_link_id) and donations (via utm_content = short_link.slug) for end-to-end per-post attribution.';

-- Wire the forward reference from migration 021 (now_spotlights) into a
-- real FK now that social_posts exists. Drop the constraint first if it
-- somehow already exists so the ALTER is idempotent.
alter table now_spotlights
  drop constraint if exists now_spotlights_social_post_id_fkey;
alter table now_spotlights
  add constraint now_spotlights_social_post_id_fkey
  foreign key (social_post_id) references social_posts(id) on delete set null;

-- ─── social_post_stats view ─────────────────────────────────────────
--
-- One row per (non-archived) social post with click + donation totals
-- pre-joined. Lets the dashboard query be a simple SELECT.
--
-- Drop + recreate is the idiomatic way to update a view's schema; CREATE
-- OR REPLACE only works when column types are unchanged.

drop view if exists social_post_stats;

create view social_post_stats as
select
  sp.id,
  sp.platform,
  sp.external_post_id,
  sp.external_url,
  sp.title,
  sp.caption,
  sp.short_link_id,
  sp.campaign_slug,
  sp.caption_keyword,
  sp.published_at,
  sp.metrics_json,
  sp.metrics_updated_at,
  sp.created_by_email,
  sp.created_at,
  sl.slug as short_link_slug,
  coalesce(clicks.click_count, 0)::int as click_count,
  coalesce(donations.donation_count, 0)::int as donation_count,
  coalesce(donations.donation_total_pence, 0)::bigint as donation_total_pence
from social_posts sp
left join short_links sl on sl.id = sp.short_link_id
left join (
  select short_link_id, count(*) as click_count
  from short_link_clicks
  group by short_link_id
) clicks on clicks.short_link_id = sp.short_link_id
left join (
  select
    utm_content,
    count(*) as donation_count,
    sum(amount_pence) as donation_total_pence
  from donations
  where status = 'succeeded' and utm_content is not null
  group by utm_content
) donations on donations.utm_content = sl.slug
where sp.archived_at is null;

comment on view social_post_stats is
  'Per-post performance: clicks (from short_link_clicks via short_link_id) + donation count + £ raised (from donations via utm_content = short_link.slug). Excludes archived posts.';
