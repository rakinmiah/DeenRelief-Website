-- Migration 027: sharpen First Response by removing the catch-all
-- Zakat + Sadaqah rows from coverage_map.
--
-- Rationale — the original catch-all design matched EVERY event
-- globally (any earthquake, any flood, any conflict) to Zakat
-- and Sadaqah, regardless of whether DR had any field presence
-- to action it. Two problems with that:
--
--   1. Donor-expectation risk. Zakat in particular carries strict
--      Islamic obligations (eight asnaf categories, must reach
--      eligible recipients). Listing it as a "matched campaign"
--      for an earthquake in a country DR can't deliver to
--      promises something the charity can't honestly deliver.
--      Sadaqah is more flexible but the same principle applies.
--
--   2. Signal-to-noise. Every event ingested came pre-tagged
--      with [zakat, sadaqah], so the dashboard surfaced
--      irrelevant events (Antarctic earthquakes, mid-Pacific
--      cyclones) at meaningful priority scores. The "no
--      coverage" events drowned out the genuinely actionable
--      ones.
--
-- After this migration:
--   • Events outside DR's actual field reach (PS, BD, GB-BRT)
--     score 0 and stay hidden from Active alerts (dashboard
--     filter applied separately in code).
--   • Zakat + Sadaqah remain valid donation channels — donor
--     pages /zakat and /sadaqah are unaffected.
--   • The launch button can still target them manually if the
--     SMM specifically chooses to (rare).
--
-- Idempotent — the delete is a no-op if already applied.

delete from coverage_map where campaign_slug in ('zakat', 'sadaqah');

-- Backfill any existing emergency_events that had only zakat/sadaqah
-- in their matched_campaigns — drop those slugs so the rows reflect
-- the new coverage map. Events that ONLY matched the catch-alls
-- end up with empty matched_campaigns (which the dashboard filters
-- out as "no coverage").
update emergency_events
set matched_campaigns = array_remove(array_remove(matched_campaigns, 'zakat'), 'sadaqah')
where 'zakat' = any(matched_campaigns) or 'sadaqah' = any(matched_campaigns);

-- Recompute dr_priority_score for rows that just lost their only
-- coverage match. With maxCoverageWeight() now returning 0 for
-- those, score should be 0. Done in code at next read rather than
-- a complex SQL recompute; the dashboard filter handles the
-- transition cleanly (empty matched_campaigns → hidden).
