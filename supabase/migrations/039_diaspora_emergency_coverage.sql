-- Migration 039: widen First Response coverage to diaspora-appeal regions.
--
-- Problem this solves
-- ───────────────────
-- After migration 027 sharpened the map down to DR's actual field
-- reach (PS, BD, GB-BRT), the only events that score > 0 and surface
-- on the dashboard are Palestine / Bangladesh / Brighton ones. Major
-- crises in the large UK-diaspora, Muslim-majority regions DR could
-- credibly run a rapid online appeal for — Pakistan floods, Syria /
-- Afghanistan earthquakes, Sudan / Yemen / Somalia hunger — are
-- already INGESTED (those ISO codes are in DR_INGEST_COUNTRIES_ISO2),
-- but they match no coverage row, so they score 0 and stay hidden.
-- That's why weeks can pass with no alert.
--
-- How this is DIFFERENT from the catch-alls 027 removed
-- ─────────────────────────────────────────────────────
-- 027 deleted the zakat/sadaqah rows because they were GLOBAL
-- catch-alls (is_catch_all = true, empty geographies) — they matched
-- EVERY event on Earth (Antarctic quakes, mid-Pacific cyclones),
-- promising a response DR couldn't honestly deliver and drowning the
-- signal. This row is the opposite: is_catch_all = FALSE with an
-- EXPLICIT six-country allow-list. It only ever matches crises in
-- regions where an Islamic charity genuinely runs partner-delivered
-- appeals — keeping signal-to-noise high while surfacing real
-- fundraising opportunities. It is NOT a re-introduction of the
-- global catch-all.
--
-- Honesty note: DR has NO field team in these six countries. The
-- dashboard renders them under a distinct "Diaspora appeal" tier
-- (not "Strategic — field presence" or "Partner network") so the
-- SMM/trustees see them for what they are — appeal opportunities to
-- evaluate, typically delivered via partners — not a delivery claim.
--
-- Scoring stays the honest base: the diaspora_multiplier (PK 2.0;
-- SY/SD/YE/AF/SO 1.5) and muslim_multiplier (all six are
-- Muslim-majority → 1.5) already live in first-response-scoring.ts.
-- At coverage_weight = 2 (partner-tier), even a max-severity event
-- caps at HIGH (e.g. Pakistan GDACS-Red flood: 3×2×2.0×1.5 = 18),
-- never CRITICAL — the audible/critical tier stays reserved for the
-- field-presence regions where DR must mobilise on the ground.
--
-- Idempotent: the upsert re-applies cleanly; the backfill only
-- touches currently-unmatched rows.

-- ── 1. The diaspora-appeal coverage row ──────────────────────────
-- One row, six geographies, mapped to the flexible Sadaqah channel
-- (a real campaign with a /sadaqah donation page + tailored receipt).
insert into coverage_map (
  campaign_slug, geographies, trigger_event_types, trigger_keywords,
  is_catch_all, weight, launch_readiness, notes
) values (
  'sadaqah',
  ARRAY['PK','SY','SD','YE','AF','SO'],
  ARRAY['conflict_escalation','displacement','casualty_spike','earthquake','flood','cyclone','drought','outbreak'],
  ARRAY['floods','earthquake','famine','displacement','refugees','cholera'],
  false, 2, 'rapid-appeal',
  'Diaspora rapid-appeal regions — large UK Muslim diaspora, Muslim-majority, no DR field team but a credible partner-delivered online appeal (Pakistan floods, Syria/Afghanistan quakes, Sudan/Yemen/Somalia hunger). Geography-specific allow-list, NOT a global catch-all (cf. 027): only these six countries match, so signal stays sharp. Caps at HIGH (weight 2) — never CRITICAL.'
)
on conflict (campaign_slug) do update set
  geographies         = excluded.geographies,
  trigger_event_types = excluded.trigger_event_types,
  trigger_keywords    = excluded.trigger_keywords,
  is_catch_all        = excluded.is_catch_all,
  weight              = excluded.weight,
  launch_readiness    = excluded.launch_readiness,
  notes               = excluded.notes;

-- ── 2. Backfill: revive already-ingested but hidden diaspora events ──
-- These events are sitting in emergency_events with matched_campaigns
-- = {} and dr_priority_score = 0 (the ingester inserts every event
-- that passed the country filter, even with no coverage match). Now
-- that the row above matches them, recompute their score so the
-- recent ones surface on the dashboard immediately rather than only
-- the next time a fresh event arrives.
--
-- The arithmetic below mirrors computeDrPriorityScore() EXACTLY:
--   score = round( severity_norm × weight(2) × diaspora × muslim(1.5)
--                  × conversion(1.0) × 10 ) / 10
--   severity_norm = (source = 'usgs') ? greatest(0, severity_raw-4.5)
--                                     : severity_raw
--   diaspora      = (country = 'PK') ? 2.0 : 1.5   (the six are PK + five at 1.5)
--   muslim        = 1.5                            (all six Muslim-majority)
--   conversion    = 1.0                            (no historical verdict yet)
-- A USGS quake that normalises to 0 correctly lands at score 0 and
-- stays hidden — same as the live scorer's severity===0 guard.
--
-- NOTE: this is dashboard visibility only. No push notifications fire
-- retroactively (SQL can't, and back-pushing week-old events would be
-- noise) — only NEW events from these regions will ping going forward.
--
-- Recency guard (21 days): the events list sorts by score DESC, so a
-- months-old severe event would otherwise leap to the top of "Active
-- alerts" looking like breaking news. Only revive the genuinely-recent
-- backlog — which is exactly the window the SMM has been missing.
update emergency_events e
set
  matched_campaigns = ARRAY['sadaqah'],
  dr_priority_score = round(
      (case when e.source = 'usgs'
            then greatest(0, e.severity_raw - 4.5)
            else e.severity_raw end)
    * 2
    * (case when upper(split_part(e.country_iso, '-', 1)) = 'PK' then 2.0 else 1.5 end)
    * 1.5
    * 1.0
    * 10
  ) / 10.0
where upper(split_part(coalesce(e.country_iso, ''), '-', 1)) in ('PK','SY','SD','YE','AF','SO')
  and (e.matched_campaigns is null or array_length(e.matched_campaigns, 1) is null)
  and e.severity_raw is not null
  and e.detected_at > now() - interval '21 days'
  and (
    e.event_type is null
    or e.event_type in (
      'conflict_escalation','displacement','casualty_spike',
      'earthquake','flood','cyclone','drought','outbreak'
    )
  );
