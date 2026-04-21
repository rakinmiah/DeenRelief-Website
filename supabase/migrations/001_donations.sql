-- Deen Relief — donations schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL → New query).
-- Creates four tables: donors, gift_aid_declarations, donations, stripe_webhook_events.
--
-- Retention note: Gift Aid declarations must be kept for 6 years after the last
-- donation claimed under them (HMRC rule). Do NOT hard-delete donor or
-- declaration rows — use the revoked_at column if a donor withdraws consent.

-- ─────────────────────────────────────────────────────────────────────────────
-- Donors: one row per unique email. Gift Aid declarations live on a separate
-- table so one declaration can cover multiple donations.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS donors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  full_name text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  address_line1 text NOT NULL,         -- house number + street (HMRC requires house # + postcode at minimum)
  address_line2 text,
  city text,
  postcode text NOT NULL,
  country text NOT NULL DEFAULT 'GB',
  phone text,
  marketing_consent boolean NOT NULL DEFAULT false,
  stripe_customer_id text UNIQUE,      -- populated once we create a Stripe Customer (for monthly subs)
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Gift Aid declarations. HMRC audit trail: store the verbatim declaration text
-- that was shown to the donor, plus IP + user agent at time of declaration.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gift_aid_declarations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id uuid NOT NULL REFERENCES donors(id) ON DELETE RESTRICT,
  declared_at timestamptz NOT NULL DEFAULT now(),
  scope text NOT NULL CHECK (scope IN ('this-donation-only', 'this-and-past-4-years-and-future')),
  declaration_text text NOT NULL,      -- verbatim HMRC-approved wording shown to donor
  ip_address inet,                     -- audit trail for HMRC
  user_agent text,                     -- audit trail
  revoked_at timestamptz,              -- if donor later withdraws consent
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gift_aid_declarations_donor ON gift_aid_declarations(donor_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Donations — source of truth for completed payments and Gift Aid claims.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id uuid NOT NULL REFERENCES donors(id) ON DELETE RESTRICT,
  gift_aid_declaration_id uuid REFERENCES gift_aid_declarations(id),

  -- Campaign routing (from /donate?campaign=... query param)
  campaign text NOT NULL,              -- 'palestine', 'zakat', 'orphan-sponsorship', etc.
  campaign_label text NOT NULL,        -- human-readable label, e.g. 'Palestine Emergency Appeal'

  -- Money
  amount_pence integer NOT NULL CHECK (amount_pence >= 500),  -- £5 minimum
  currency text NOT NULL DEFAULT 'GBP',
  frequency text NOT NULL CHECK (frequency IN ('one-time', 'monthly')),

  -- Gift Aid
  gift_aid_claimed boolean NOT NULL DEFAULT false,
  gift_aid_amount_pence integer GENERATED ALWAYS AS (
    CASE WHEN gift_aid_claimed THEN amount_pence / 4 ELSE 0 END
  ) STORED,

  -- Stripe
  stripe_payment_intent_id text UNIQUE,
  stripe_setup_intent_id text UNIQUE,  -- for monthly: the SetupIntent that captured payment method
  stripe_customer_id text,
  stripe_subscription_id text,         -- null for one-time
  stripe_invoice_id text,              -- populated per subscription renewal
  status text NOT NULL CHECK (status IN (
    'pending', 'processing', 'succeeded', 'failed', 'refunded', 'disputed'
  )),

  -- Swiftaid tracking (future — not wired in v1)
  swiftaid_submission_id text,
  swiftaid_submitted_at timestamptz,
  swiftaid_hmrc_claim_status text,     -- 'pending', 'claimed', 'rejected'

  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_donations_donor ON donations(donor_id);
CREATE INDEX IF NOT EXISTS idx_donations_campaign ON donations(campaign);
CREATE INDEX IF NOT EXISTS idx_donations_status ON donations(status);
CREATE INDEX IF NOT EXISTS idx_donations_subscription ON donations(stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_donations_gift_aid_unclaimed ON donations(gift_aid_claimed, swiftaid_submission_id)
  WHERE gift_aid_claimed = true AND swiftaid_submission_id IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- Stripe webhook event log — idempotency + replay protection + debug trail.
-- Every incoming webhook writes a row here before processing. The UNIQUE
-- constraint on stripe_event_id means duplicate deliveries are a no-op.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  processed boolean NOT NULL DEFAULT false,
  processed_at timestamptz,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_unprocessed ON stripe_webhook_events(processed, created_at)
  WHERE processed = false;

-- ─────────────────────────────────────────────────────────────────────────────
-- updated_at triggers — keep updated_at fresh on every UPDATE.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_donors_updated_at ON donors;
CREATE TRIGGER trg_donors_updated_at
  BEFORE UPDATE ON donors
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_donations_updated_at ON donations;
CREATE TRIGGER trg_donations_updated_at
  BEFORE UPDATE ON donations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- Row-Level Security — all four tables are written only via API routes using
-- the service_role key (which bypasses RLS). Enable RLS with NO policies so
-- the anon key can't read or write anything. This is defence-in-depth — the
-- anon key shouldn't be used against these tables anyway, but if someone
-- accidentally imports the anon client, they get empty results, not PII.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE donors ENABLE ROW LEVEL SECURITY;
ALTER TABLE gift_aid_declarations ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_webhook_events ENABLE ROW LEVEL SECURITY;
