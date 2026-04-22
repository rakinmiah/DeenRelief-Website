-- Deen Relief — ad-attribution columns on donations
-- Run this in the Supabase SQL Editor AFTER 001_donations.sql + 001b_finish.sql.
-- Safe to re-run — every ALTER uses IF NOT EXISTS.
--
-- Added so we can:
--   - Report ROAS per Google / Meta / email campaign
--   - Upload Google Ads Offline Conversions (needs gclid + conversion_time)
--   - Separate paid from organic donation revenue in dashboards
--
-- All columns nullable. Direct / organic donations leave them NULL.
-- Populated by src/app/api/donations/confirm/route.ts from the
-- dr_attribution first-party cookie set by <AttributionCapture />.

-- ─── Click IDs (the values ad platforms append to the landing URL) ───
ALTER TABLE donations ADD COLUMN IF NOT EXISTS gclid text;   -- Google Ads
ALTER TABLE donations ADD COLUMN IF NOT EXISTS gbraid text;  -- Google Ads, iOS app
ALTER TABLE donations ADD COLUMN IF NOT EXISTS wbraid text;  -- Google Ads, iOS web
ALTER TABLE donations ADD COLUMN IF NOT EXISTS fbclid text;  -- Meta / Facebook

-- ─── UTM params (campaign-source attribution for any channel) ───
ALTER TABLE donations ADD COLUMN IF NOT EXISTS utm_source   text;
ALTER TABLE donations ADD COLUMN IF NOT EXISTS utm_medium   text;
ALTER TABLE donations ADD COLUMN IF NOT EXISTS utm_campaign text;
ALTER TABLE donations ADD COLUMN IF NOT EXISTS utm_term     text;
ALTER TABLE donations ADD COLUMN IF NOT EXISTS utm_content  text;

-- ─── Visit context (useful for debugging and multi-touch models later) ───
ALTER TABLE donations ADD COLUMN IF NOT EXISTS landing_page     text;          -- path + query of first page on site
ALTER TABLE donations ADD COLUMN IF NOT EXISTS landing_referrer text;          -- document.referrer at capture time
ALTER TABLE donations ADD COLUMN IF NOT EXISTS landing_at       timestamptz;   -- ISO ts when attribution was stamped

-- ─── Indexes for the lookups the analytics jobs will run ───
-- gclid index: used by the Offline Conversion Import uploader, which
-- periodically selects rows where gclid IS NOT NULL AND not yet uploaded.
CREATE INDEX IF NOT EXISTS idx_donations_gclid ON donations(gclid)
  WHERE gclid IS NOT NULL;

-- utm_campaign index: used by per-campaign ROAS dashboards.
CREATE INDEX IF NOT EXISTS idx_donations_utm_campaign ON donations(utm_campaign)
  WHERE utm_campaign IS NOT NULL;
