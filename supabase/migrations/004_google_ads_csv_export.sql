-- Deen Relief — columns supporting Google Ads Scheduled CSV Upload pathway.
-- Run AFTER 003_google_ads_oci.sql. Safe to re-run — uses IF NOT EXISTS.
--
-- Context: this is the parallel pathway to /api/cron/google-ads-oci. While
-- the API path requires an MCC + developer token, the CSV path lets Google
-- Ads poll a public-but-token-protected URL and pull a CSV on a schedule.
-- The two pathways are deliberately independent — they use separate state
-- columns so we can flip between them without conflicts.
--
-- Two-phase commit columns:
--   csv_served_at    — set when /api/google-ads-csv-export serves the row
--                       to Google. Excludes the row from subsequent fetches.
--   csv_uploaded_at  — set when the commit cron confirms (after a 6h Google
--                       processing window) that the row has been ingested.
--                       Permanent — row never re-enters the pipeline.
--   csv_upload_error — last error from the upload pipeline, if any.

ALTER TABLE donations ADD COLUMN IF NOT EXISTS csv_served_at   timestamptz;
ALTER TABLE donations ADD COLUMN IF NOT EXISTS csv_uploaded_at timestamptz;
ALTER TABLE donations ADD COLUMN IF NOT EXISTS csv_upload_error text;

-- Hot-path index for the fetch query: succeeded + has gclid + not yet
-- uploaded via CSV. Partial index so it stays small even as donations
-- volume grows.
CREATE INDEX IF NOT EXISTS donations_csv_upload_idx
  ON donations (csv_uploaded_at, status, gclid)
  WHERE csv_uploaded_at IS NULL
    AND gclid IS NOT NULL
    AND status = 'succeeded';
