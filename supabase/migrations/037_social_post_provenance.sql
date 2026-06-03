-- 037_social_post_provenance.sql
-- Close the one broken link in the social attribution chain so the deck
-- builder can learn from REAL outcomes (clicks + donations), not just the
-- SMM's edits.
--
-- Today a published `social_posts` row connects to outcomes
-- (short_link_clicks + donations via utm_content = short_link.slug) but NOT to
-- (a) the emergency_events news report it was built from, nor (b) the deck
-- "recipe" — which template design sat on each slide. The canvas flattens a
-- deck to absolute layers and discards templateId/role, so the recipe has to
-- be captured at posting time and stored here.
--
-- With event_id + deck_recipe in place we can rank template DESIGNS and news
-- TOPICS by the money they actually raised, feed the winners back into the
-- generator, and nudge what to target — all deterministically, £0 / 0 tokens.
--
-- Numbered 037 to clear both branches (main already ships 036_donation_source;
-- this feature branch's 030–035 differ from main's). Additive, nullable,
-- idempotent: existing rows and existing inserts are untouched, and the app
-- inserts these two columns defensively (falls back if the migration is not
-- yet applied), so nothing breaks before/after running this.

-- ── 1. Provenance columns ────────────────────────────────────────────────
alter table social_posts
  -- The news report (emergency_events row) this post was built from.
  -- NULL for manually-logged posts with no event. ON DELETE SET NULL keeps
  -- the post + its outcome history even if the event is later purged.
  add column if not exists event_id uuid
    references emergency_events(id) on delete set null,
  -- Compact per-slide design provenance, in slide order:
  --   [{ "role": "hero", "templateId": "ig-hero-magazine-cover" }, ...]
  -- Only the DESIGN is stored here (role + templateId) — never the copy or
  -- imagery. NULL for posts created before this migration or without a deck
  -- (e.g. a blank-canvas post or one logged manually outside the builder).
  add column if not exists deck_recipe jsonb;

create index if not exists idx_social_posts_event
  on social_posts (event_id)
  where archived_at is null and event_id is not null;

-- GIN keeps the per-template unnest joins in template_performance cheap.
create index if not exists idx_social_posts_deck_recipe
  on social_posts using gin (deck_recipe)
  where deck_recipe is not null;

comment on column social_posts.event_id is
  'The emergency_events row (news report) this post was built from. NULL for manually-logged posts with no event. Powers the topic/targeting learning loop (migration 037).';
comment on column social_posts.deck_recipe is
  'Per-slide design provenance [{role, templateId}] in slide order. Design only (no copy/imagery). NULL pre-037 / for deckless posts. Powers the template leaderboard + outcome-learning loop (migration 037).';

-- ── 2. Re-create social_post_stats to expose the two new columns ─────────
-- Same body as migration 025, plus sp.event_id and sp.deck_recipe in the
-- SELECT so the aggregation views + TS readers can see provenance.
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
  sp.event_id,
  sp.deck_recipe,
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

-- ── 3. template_performance — per design-template outcomes ───────────────
-- Unnest each post's deck_recipe and credit the post's clicks/donations to
-- EVERY template in that recipe. Attribution is necessarily post-level (a
-- carousel raises money as a whole, not slide-by-slide), so a template that
-- "participated" in a converting post shares its outcome. The over-credit is
-- CONSISTENT across templates, so the relative ranking the learning loop uses
-- stays fair — we never claim per-slide precision.
drop view if exists template_performance;
create view template_performance as
with recipe as (
  select
    s.id as post_id,
    s.click_count,
    s.donation_count,
    s.donation_total_pence,
    (elem ->> 'role') as role,
    (elem ->> 'templateId') as template_id
  from social_post_stats s,
       lateral jsonb_array_elements(coalesce(s.deck_recipe, '[]'::jsonb)) as elem
  where s.deck_recipe is not null
    and (elem ->> 'templateId') is not null
)
select
  role,
  template_id,
  count(distinct post_id)::int as posts_count,
  coalesce(sum(click_count), 0)::bigint as clicks,
  coalesce(sum(donation_count), 0)::bigint as donations,
  coalesce(sum(donation_total_pence), 0)::bigint as donation_total_pence,
  case when sum(click_count) > 0
       then sum(donation_count)::numeric / sum(click_count)
       else 0 end as donation_rate,
  case when count(distinct post_id) > 0
       then sum(donation_total_pence)::numeric / count(distinct post_id)
       else 0 end as pence_per_post
from recipe
group by role, template_id;

comment on view template_performance is
  'Per-template design outcomes. Each post credits EVERY template in its recipe (carousel attribution is post-level, not slide-level; over-credit is consistent so relative ranking is fair). posts_count = distinct posts a template appeared in. donation_rate = donations/clicks. pence_per_post = £ raised / posts.';

-- ── 4. topic_performance — per news-topic / campaign outcomes ────────────
-- Which kinds of news report + which campaigns actually drive traffic and
-- donations. Joins the post stats to the emergency_events row it came from.
drop view if exists topic_performance;
create view topic_performance as
select
  e.event_type,
  e.country_iso,
  e.region,
  s.campaign_slug,
  count(distinct s.id)::int as posts_count,
  coalesce(sum(s.click_count), 0)::bigint as clicks,
  coalesce(sum(s.donation_count), 0)::bigint as donations,
  coalesce(sum(s.donation_total_pence), 0)::bigint as donation_total_pence,
  case when sum(s.click_count) > 0
       then sum(s.donation_count)::numeric / sum(s.click_count)
       else 0 end as donation_rate
from social_post_stats s
left join emergency_events e on e.id = s.event_id
group by e.event_type, e.country_iso, e.region, s.campaign_slug;

comment on view topic_performance is
  'Per news-topic (event_type/country/region) and campaign outcomes. Tells the SMM which reports/campaigns convert, and feeds the gated historical-conversion nudge in First Response scoring (Phase 3f). Last-click attribution via donations.utm_content = short_link.slug.';
