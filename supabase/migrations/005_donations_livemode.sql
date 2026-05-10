-- 005_donations_livemode.sql
--
-- Adds Stripe-mode discrimination to the donations table so the admin
-- pages and Gift Aid export can exclude test-mode rows.
--
-- Why this is necessary:
--   Stripe IDs (pi_..., cus_..., sub_...) look identical between test
--   and live mode — there's no string-prefix distinction. The only
--   authoritative signal is the `livemode` field on the Stripe object
--   itself, which is set when the resource is created and never
--   changes thereafter.
--
--   Without this column, test-mode donations from the Stripe sandbox
--   appear alongside real live-mode donations in the trustee admin
--   and (worse) on the HMRC Gift Aid CSV export — neither is
--   acceptable for production.
--
-- Backfill:
--   Existing rows are NULL after this migration runs. The companion
--   admin endpoint /api/admin/backfill-livemode iterates rows where
--   livemode IS NULL, retrieves the matching PaymentIntent or
--   SetupIntent from Stripe, and writes the authoritative livemode
--   value back. Run it once after deploying.
--
-- Going forward:
--   /api/donations/confirm/route.ts captures stripe.livemode at the
--   same moment it cross-checks the campaign and writes the value on
--   donation insert. No further code paths create donation rows.
--
-- Filter behaviour:
--   Admin queries use `.eq("livemode", true)`. NULL rows are excluded
--   by this filter — i.e. unbackfilled rows behave the same as
--   test-mode rows (hidden from trustees) until the backfill writes
--   true to the live ones. Safe by default.

ALTER TABLE donations
  ADD COLUMN IF NOT EXISTS livemode boolean;

-- Hot-path index for the admin filter. Partial index keeps it small —
-- only live-mode rows are indexed, since test-mode rows are never
-- queried in the admin path.
CREATE INDEX IF NOT EXISTS donations_livemode_idx
  ON donations (livemode, created_at DESC)
  WHERE livemode = true;

COMMENT ON COLUMN donations.livemode IS
  'Stripe authoritative livemode flag from PaymentIntent/SetupIntent. '
  'true = live, false = test, NULL = pre-backfill (treated as test). '
  'Admin queries filter on livemode=true.';
