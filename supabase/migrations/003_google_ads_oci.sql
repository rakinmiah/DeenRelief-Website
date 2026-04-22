-- Deen Relief — columns supporting Google Ads Offline Conversion Import
-- Run AFTER 001_donations.sql, 001b_finish.sql, and 002_attribution.sql.
-- Safe to re-run — every ALTER uses IF NOT EXISTS.
--
-- Context: /api/cron/google-ads-oci reads these columns to decide which
-- donations to upload, under what consent, and to prevent double-uploads.

-- ─── Consent state captured at donation time ───
-- Copied from the dr_consent cookie by /api/donations/confirm. Recording
-- here (rather than re-reading the cookie later) means:
--   1. We know the EXACT consent posture at the moment of conversion —
--      cookies expire or get cleared; the donation record is permanent
--   2. We can filter uploads honestly: only donations where the donor
--      had ad_storage granted at conversion time are eligible for OCI
--      (Google's policy; also PECR-compliant)
--   3. ad_user_data_consent gates Enhanced Conversions user_identifiers
--      in the upload payload separately

ALTER TABLE donations ADD COLUMN IF NOT EXISTS ad_storage_consent   boolean;
ALTER TABLE donations ADD COLUMN IF NOT EXISTS ad_user_data_consent boolean;

-- ─── OCI upload bookkeeping ───
-- Null until the cron uploads this row. NON-null value = "already done,
-- skip". Also lets us audit how long it took from donation → Google Ads
-- match (useful when tuning the cron cadence).
ALTER TABLE donations ADD COLUMN IF NOT EXISTS google_ads_uploaded_at timestamptz;

-- Google Ads returns a response object per ClickConversion; we don't
-- strictly need to store anything from it. But keeping the last error
-- message helps when an upload fails repeatedly (permission problem,
-- expired refresh token, etc.). Cleared on the next successful upload.
ALTER TABLE donations ADD COLUMN IF NOT EXISTS google_ads_upload_error text;

-- ─── Index the cron reads on every run ───
-- Hot path: find donations that are succeeded + have a gclid + had
-- consent + are not yet uploaded. Partial index keeps this tiny regardless
-- of total donations volume.
CREATE INDEX IF NOT EXISTS idx_donations_pending_oci ON donations(completed_at)
  WHERE status = 'succeeded'
    AND gclid IS NOT NULL
    AND ad_storage_consent = true
    AND google_ads_uploaded_at IS NULL;
