-- Migration 022: First Response foundations.
--
-- Two tables that drive the crisis-intelligence half of the Social
-- Operations Platform. Together they answer: "which crises happening
-- in the world right now does Deen Relief have the operational
-- capability to convert on, ranked by revenue potential?"
--
--   coverage_map      — one row per DR campaign declaring the
--                       geographies + event types it can respond to.
--                       Set once (with seed data below), edited rarely.
--
--   emergency_events  — one row per detected crisis. Inserted by the
--                       signal-source ingesters (Phase 3b). Scored at
--                       insert time against coverage_map to produce a
--                       Deen-Relief-specific priority. Surfaced in the
--                       admin dashboard ranked by that score.
--
-- A third table — capability_gaps — was discussed (pending Pre-flight
-- #2 client decision). When greenlit, it ships as a separate migration.
--
-- Idempotent — safe to run more than once.

-- ─── coverage_map ────────────────────────────────────────────────────

create table if not exists coverage_map (
  campaign_slug text primary key,
  -- Geographies the campaign can respond to. Format: ISO 3166-1
  -- alpha-2 codes ('BD','PK','SY','IN','GB','PS'), with optional
  -- subdivision suffix for narrower scoping ('GB-BRT' for the
  -- Brighton homeless programme, 'PS-GAZA' for Gaza specifically).
  -- Empty array combined with is_catch_all=true means "matches any
  -- geography" (the Zakat / Sadaqah fallback).
  geographies text[] not null default '{}',
  -- Event types this campaign should be considered for. Strings,
  -- free-text but conventionally drawn from a small vocabulary:
  --   'earthquake', 'flood', 'cyclone', 'drought', 'wildfire',
  --   'displacement', 'conflict_escalation', 'blockade',
  --   'casualty_spike', 'outbreak', 'cold_snap', 'heatwave',
  --   'severe_weather', 'contamination'
  -- Empty means "not crisis-triggered" (evergreen campaigns).
  trigger_event_types text[] not null default '{}',
  -- Optional secondary signal — text keywords found in news article
  -- titles / summaries that should boost matching for this campaign.
  -- E.g. ['sylhet','dhaka'] for Bangladesh-specific.
  trigger_keywords text[] not null default '{}',
  -- True for the flexible-routing campaigns (Zakat with the
  -- emergency-relief pathway, Sadaqah). When set, the row matches
  -- ANY event regardless of geography — used as a fallback when
  -- no geography-specific row matches.
  is_catch_all boolean not null default false,
  -- Strategic-importance multiplier in the scoring algorithm:
  --   3 = strategic field presence (palestine, orphan-sponsorship)
  --   2 = partner network or important secondary
  --   1 = catch-all / fallback
  --   0 = not used by First Response (e.g. 'general')
  weight numeric not null default 1,
  -- How fast we can launch an appeal targeting this campaign. Free-
  -- text. Common values: 'always-on', '30min', '1hour', 'seasonal',
  -- 'evergreen'. Surfaced in the admin UI to set realistic expectations.
  launch_readiness text,
  -- Field-team contact for emergency comms (Phase 4b ping flow).
  -- E164 format if set.
  field_team_phone text,
  notes text,
  updated_at timestamptz not null default now()
);

comment on table coverage_map is
  'One row per Deen Relief campaign declaring which crises it can convert on. Read by First Response to filter detected world events down to only those mappable to a live campaign + scored by weight × event-severity × diaspora-relevance.';

-- Seed the 10 confirmed campaigns. Idempotent via ON CONFLICT.
insert into coverage_map (
  campaign_slug, geographies, trigger_event_types, trigger_keywords,
  is_catch_all, weight, launch_readiness, notes
) values
  (
    'palestine',
    ARRAY['PS','PS-GAZA'],
    ARRAY['conflict_escalation','displacement','blockade','casualty_spike'],
    ARRAY['gaza','west bank','israel','rafah','khan younis'],
    false, 3, 'always-on',
    'Ongoing emergency. Intensifies with escalations; donor base highly responsive.'
  ),
  (
    'orphan-sponsorship',
    ARRAY['BD'],
    ARRAY['flood','cyclone','displacement','conflict_escalation'],
    ARRAY['sylhet','dhaka','chittagong','rohingya'],
    false, 3, 'always-on',
    'Bangladesh Sylhet field team. Mass-displacement events create new orphans → both immediate aid AND long-term sponsorship demand.'
  ),
  (
    'build-a-school',
    ARRAY['BD'],
    ARRAY['flood','cyclone'],
    ARRAY['school','education','classroom'],
    false, 2, 'always-on',
    'School infrastructure damage triggers rebuild appeals. Slower-burn campaign — file alongside immediate-need ones.'
  ),
  (
    'clean-water',
    ARRAY['BD'],
    ARRAY['flood','drought','contamination'],
    ARRAY['water','well','sanitation','cholera'],
    false, 2, 'always-on',
    'Water contamination from flooding; ongoing well projects.'
  ),
  (
    'cancer-care',
    ARRAY['GB'],
    ARRAY[]::text[],
    ARRAY[]::text[],
    false, 1, 'evergreen',
    'UK medical aid — not news-triggered. Excluded from event matching.'
  ),
  (
    'uk-homeless',
    ARRAY['GB-BRT'],
    ARRAY['cold_snap','heatwave','severe_weather'],
    ARRAY['brighton','rough sleeping','homeless'],
    false, 2, 'always-on',
    'Brighton weekly outreach. Severe weather → outreach intensification ask, not new appeal.'
  ),
  (
    'qurbani',
    ARRAY['BD','PK','SY','IN'],
    ARRAY[]::text[],
    ARRAY[]::text[],
    false, 1, 'seasonal',
    'Eid al-Adha window only. Not crisis-triggered (deadline-driven by Islamic calendar).'
  ),
  (
    'zakat',
    ARRAY[]::text[],
    ARRAY['conflict_escalation','displacement','flood','cyclone','earthquake','drought','outbreak'],
    ARRAY[]::text[],
    true, 2, 'always-on',
    'Catch-all fallback via the Emergency Relief pathway. Routes here when no geography-specific row matches.'
  ),
  (
    'sadaqah',
    ARRAY[]::text[],
    ARRAY['conflict_escalation','displacement','flood','cyclone','earthquake','drought','outbreak','severe_weather'],
    ARRAY[]::text[],
    true, 1, 'always-on',
    'General catch-all — multi-region. Lower priority than Zakat (Zakat is religiously framed as the obligatory-giving channel).'
  ),
  (
    'general',
    ARRAY[]::text[],
    ARRAY[]::text[],
    ARRAY[]::text[],
    false, 0, NULL,
    'Generic fallback campaign. NOT used by First Response — weight=0 excludes it from matching.'
  )
on conflict (campaign_slug) do nothing;

-- ─── emergency_events ────────────────────────────────────────────────

create table if not exists emergency_events (
  id uuid primary key default gen_random_uuid(),
  -- External identifier from the source system. Used for dedupe — a
  -- GDACS event re-broadcast or a news article re-indexed should not
  -- create a second row. Format: '<source>:<source-id>'.
  external_id text unique,
  -- Where we found out about this event.
  --   'gdacs','usgs','reliefweb','acled' → Tier 1 authoritative
  --   'news' → Tier 2 (news API / RSS)
  --   'social' → Tier 3 (curated X accounts, hashtags)
  --   'competitor' → Tier 4 (competitor charity appeal launched)
  --   'site_search' → Tier 5 (donor demand spike)
  --   'manual' → admin-entered for testing or signal-augmentation
  source text not null,
  -- Free-text event type, conventionally from the same vocabulary as
  -- coverage_map.trigger_event_types.
  event_type text,
  country_iso text,        -- e.g. 'BD','PK','GB','PS'
  region text,             -- free-text city/region for context
  title text not null,
  summary text,
  -- Raw severity from the source — magnitude for USGS, GDACS alert
  -- level (Green=1/Orange=2/Red=3), ACLED fatality count, etc.
  severity_raw numeric,
  -- Computed at insert by the scoring algorithm. Higher = more urgent
  -- AND more revenue-likely for DR specifically.
  dr_priority_score numeric,
  -- Which DR campaigns the scorer matched this event to. Drives the
  -- launch-packet generator (Phase 4) and the suggested routing on
  -- the admin UI.
  matched_campaigns text[],
  -- Workflow state.
  --   'detected'  — fresh, awaiting review
  --   'reviewed'  — SMM/trustee acknowledged
  --   'launched'  — appeal went live for this event
  --   'dismissed' — false alarm, out of scope, or low priority
  status text not null default 'detected'
    check (status in ('detected','reviewed','launched','dismissed')),
  detected_at timestamptz not null default now(),
  reviewed_by_email text,
  reviewed_at timestamptz,
  source_url text,
  -- Full original event payload for forensics + future enrichment.
  raw_payload jsonb
);

-- Dashboard reads: highest priority first, most recent on top within
-- equal scores.
create index if not exists idx_emergency_events_score_time
  on emergency_events (dr_priority_score desc nulls last, detected_at desc);

-- Workflow filters (Detected vs Reviewed vs Launched tabs).
create index if not exists idx_emergency_events_status_time
  on emergency_events (status, detected_at desc);

comment on table emergency_events is
  'One row per detected world crisis. Populated by signal-source ingesters (Phase 3b). Scored at insert against coverage_map (Phase 3c). Drives the First Response admin dashboard.';
