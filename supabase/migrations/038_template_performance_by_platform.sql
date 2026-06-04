-- 038_template_performance_by_platform.sql
-- Make the outcome-learning loop PLATFORM-AWARE.
--
-- Until now the design leaderboard + proven-winner derivation grouped by
-- (role, template_id), so Instagram / Facebook / X shared a single "best hero",
-- "best stat", etc. But the three platforms have different template pools (X is
-- a landscape single image; IG/FB are square carousels) and what converts on
-- one needn't on another. Re-group `template_performance` by
-- (platform, role, template_id) so each platform learns its own winners.
--
-- `social_post_stats` already exposes sp.platform (migration 037); this just
-- adds it to the unnest + group. Idempotent (drop + recreate). Additive: degrades
-- to no learned winners before it's applied (the reader catches the missing
-- column), so nothing breaks.

drop view if exists template_performance;
create view template_performance as
with recipe as (
  select
    s.id as post_id,
    s.platform,
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
  platform,
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
group by platform, role, template_id;

comment on view template_performance is
  'Per-platform, per-template design outcomes. Each post credits EVERY template in its recipe (carousel attribution is post-level; over-credit is consistent so relative ranking is fair). Grouped by (platform, role, template_id) so X / Facebook / Instagram each learn their own winners (migration 038).';
