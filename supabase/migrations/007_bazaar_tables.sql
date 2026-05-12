-- 007_bazaar_tables.sql
--
-- Deen Relief Bazaar — schema for the post-launch e-commerce shop selling
-- Islamic/halal goods made by named makers in Bangladesh and Turkey.
--
-- Architectural decision: bazaar trades through the EXISTING charity Stripe
-- account under HMRC's small-trading exemption (Path A). Income separation
-- between donations and bazaar orders is enforced via:
--
--   1. STRIPE METADATA — every bazaar Stripe transaction sets
--      metadata.source = "bazaar". Donations have no source key.
--   2. SUPABASE TABLES — bazaar lives in `bazaar_*` tables; donations remain
--      in the existing `donations` + `donors` tables. `donors` is the one
--      shared table — same person may both donate AND buy.
--   3. EMAIL SENDER — currently shared (info@deenrelief.org), will split
--      to bazaar@... once volume justifies the operational separation.
--   4. ADMIN UI — donations at /admin/donations, bazaar at
--      /admin/bazaar/orders, accountant reconciliation at
--      /admin/reports/reconciliation.
--
-- See src/lib/bazaar-config.ts for the application-side mirror of these
-- constants.
--
-- Money is stored as integer pence (avoids floating-point rounding bugs
-- on VAT, shipping, refunds). All "£X.XX" formatting happens at the
-- display boundary only — the same convention as the donations schema.

-- ─────────────────────────────────────────────────────────────────────────────
-- bazaar_product_makers — one row per artisan/cooperative.
--
-- Held separately from products because (a) one maker may produce multiple
-- items in a collection, (b) the maker bio + photo deserves its own
-- editorial surface (the Our Makers page), (c) protects against the case
-- where a product is delisted but the maker remains.
--
-- Privacy: name is intentionally first-name-plus-last-initial in production
-- ("Fatima R.") to protect maker identity from cold web scraping while
-- still giving the customer a real human to attach to. Region is the
-- city/region ("Sylhet", "Adana") not the village.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bazaar_product_makers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  country text NOT NULL CHECK (country IN ('Bangladesh', 'Turkey', 'Pakistan')),
  region text NOT NULL,
  photo_url text NOT NULL,
  story text NOT NULL,
  quote text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bazaar_makers_active
  ON bazaar_product_makers (is_active)
  WHERE is_active = true;

-- ─────────────────────────────────────────────────────────────────────────────
-- bazaar_products — the catalog. One row per SKU family (variants, if any,
-- live in bazaar_product_variants).
--
-- slug is the URL key — must be stable across price/stock edits because
-- it gets shared, indexed, and emailed in order confirmations.
--
-- is_active = false hides the product from catalog while preserving order
-- history references (orders snapshot the product info at purchase time
-- via bazaar_order_items.product_name_snapshot etc).
--
-- gallery_images is jsonb (array of strings) rather than a child table —
-- ordered, small, never queried individually, so the jsonb cost is a wash
-- and the join overhead matters.
--
-- care_instructions is jsonb array for the same reason — small, ordered,
-- displayed as a bulleted list, never filtered on.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bazaar_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  tagline text NOT NULL,
  description text NOT NULL,
  category text NOT NULL CHECK (category IN (
    'abaya', 'thobe', 'prayer-mat', 'hijab', 'tasbih',
    'quran-cover', 'kufi', 'kids'
  )),
  sku text NOT NULL UNIQUE,

  -- Money
  price_pence integer NOT NULL CHECK (price_pence >= 100),  -- £1.00 minimum
  weight_grams integer NOT NULL CHECK (weight_grams > 0),

  -- Imagery
  primary_image text NOT NULL,
  gallery_images jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- Editorial
  materials text NOT NULL,
  care_instructions jsonb NOT NULL DEFAULT '[]'::jsonb,
  sizing_guide_html text,

  -- Maker (one product → one maker; one maker → many products)
  maker_id uuid NOT NULL REFERENCES bazaar_product_makers(id) ON DELETE RESTRICT,

  -- Stock — total across variants when variants exist; otherwise the
  -- canonical product stock. Variant-level stock lives on the variant row.
  stock_count integer NOT NULL DEFAULT 0 CHECK (stock_count >= 0),
  low_stock_threshold integer NOT NULL DEFAULT 3 CHECK (low_stock_threshold >= 0),

  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bazaar_products_active
  ON bazaar_products (is_active, category)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_bazaar_products_maker
  ON bazaar_products (maker_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- bazaar_product_variants — optional per-size/colour variation.
--
-- A product with no variants has zero rows here and uses bazaar_products
-- .stock_count + .price_pence directly. A product with variants has one
-- row per (size, colour) combo. price_pence_override lets a variant
-- charge more (e.g. XXL costs £5 more) without forking the parent SKU.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bazaar_product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES bazaar_products(id) ON DELETE CASCADE,
  size text,
  colour text,
  sku text NOT NULL UNIQUE,
  stock_count integer NOT NULL DEFAULT 0 CHECK (stock_count >= 0),
  price_pence_override integer CHECK (price_pence_override IS NULL OR price_pence_override >= 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- Each (product, size, colour) combination must be unique. NULL is
  -- treated as a value here intentionally (a product with one "default"
  -- variant is allowed; a second NULL/NULL row would be a bug).
  UNIQUE (product_id, size, colour)
);

CREATE INDEX IF NOT EXISTS idx_bazaar_variants_product
  ON bazaar_product_variants (product_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- bazaar_orders — one row per checkout. The Stripe Checkout Session is
-- the integration point; we create this row with status = 'pending_payment'
-- when the session is created, then promote to 'paid' on the
-- checkout.session.completed webhook.
--
-- donor_id is OPTIONAL — bazaar customers don't need a donor record (they
-- haven't filled in a Gift Aid declaration etc). When the contact_email
-- already matches an existing donor, we link it; otherwise donor_id stays
-- NULL and the customer remains a "bazaar-only" identity.
--
-- shipping_address is jsonb for two reasons: (1) we accept whatever Stripe
-- Checkout collects and don't impose our own structural constraints,
-- (2) the address at order time needs to be immutable for fulfilment
-- audit, regardless of any later donor profile edits.
--
-- livemode mirrors the donations table convention so admin / reconciliation
-- queries can filter test from real consistently.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bazaar_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Customer
  contact_email text NOT NULL,
  donor_id uuid REFERENCES donors(id) ON DELETE SET NULL,

  -- Lifecycle
  status text NOT NULL CHECK (status IN (
    'pending_payment', 'paid', 'fulfilled', 'delivered', 'refunded', 'cancelled'
  )) DEFAULT 'pending_payment',

  -- Money (all in pence)
  subtotal_pence integer NOT NULL CHECK (subtotal_pence >= 0),
  shipping_pence integer NOT NULL DEFAULT 0 CHECK (shipping_pence >= 0),
  total_pence integer NOT NULL CHECK (total_pence >= 0),
  currency text NOT NULL DEFAULT 'GBP',

  -- Address (jsonb — shape: {name, line1, line2?, city, postcode, country})
  shipping_address jsonb NOT NULL,

  -- Stripe linkage
  stripe_session_id text UNIQUE,
  stripe_payment_intent text UNIQUE,
  livemode boolean NOT NULL DEFAULT true,

  -- Fulfilment
  fulfilled_at timestamptz,
  tracking_number text,
  royal_mail_service text CHECK (
    royal_mail_service IS NULL OR
    royal_mail_service IN ('tracked-48', 'tracked-24', 'special-delivery')
  ),
  internal_notes text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bazaar_orders_status
  ON bazaar_orders (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bazaar_orders_donor
  ON bazaar_orders (donor_id)
  WHERE donor_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bazaar_orders_email
  ON bazaar_orders (contact_email, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bazaar_orders_created
  ON bazaar_orders (created_at DESC)
  WHERE livemode = true;

-- ─────────────────────────────────────────────────────────────────────────────
-- bazaar_order_items — line items on each order, with full snapshots of
-- product/variant/maker info at purchase time.
--
-- Why snapshot? Two reasons:
--   1. Stable order history — if the catalog product is renamed, repriced,
--      or deactivated three months later, the customer's order confirmation
--      and the admin's fulfilment view still reflect what was actually
--      bought.
--   2. Maker attribution lockup — if a maker stops working with us, their
--      name still appears on the historical receipt that the customer can
--      open from their email.
--
-- product_id and variant_id remain pointers (nullable on later product
-- deletion via SET NULL) so reporting can still aggregate "how many
-- Sylhet Abayas have we sold" — but the snapshot fields are the source
-- of truth for what the customer paid for.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bazaar_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES bazaar_orders(id) ON DELETE CASCADE,

  -- Pointers (nullable for graceful catalog deletion)
  product_id uuid REFERENCES bazaar_products(id) ON DELETE SET NULL,
  variant_id uuid REFERENCES bazaar_product_variants(id) ON DELETE SET NULL,

  -- Snapshots (immutable once written)
  product_name_snapshot text NOT NULL,
  variant_snapshot text,                  -- e.g. "Size M, Cream"
  maker_name_snapshot text NOT NULL,
  unit_price_pence_snapshot integer NOT NULL CHECK (unit_price_pence_snapshot >= 0),
  quantity integer NOT NULL CHECK (quantity > 0),

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bazaar_order_items_order
  ON bazaar_order_items (order_id);

CREATE INDEX IF NOT EXISTS idx_bazaar_order_items_product
  ON bazaar_order_items (product_id)
  WHERE product_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- updated_at triggers — reuses the set_updated_at() function from
-- migration 001_donations.sql.
-- ─────────────────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_bazaar_makers_updated_at ON bazaar_product_makers;
CREATE TRIGGER trg_bazaar_makers_updated_at
  BEFORE UPDATE ON bazaar_product_makers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_bazaar_products_updated_at ON bazaar_products;
CREATE TRIGGER trg_bazaar_products_updated_at
  BEFORE UPDATE ON bazaar_products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_bazaar_variants_updated_at ON bazaar_product_variants;
CREATE TRIGGER trg_bazaar_variants_updated_at
  BEFORE UPDATE ON bazaar_product_variants
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_bazaar_orders_updated_at ON bazaar_orders;
CREATE TRIGGER trg_bazaar_orders_updated_at
  BEFORE UPDATE ON bazaar_orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- Row-Level Security
--
-- Catalog tables (makers, products, variants) — anon SELECT is ALLOWED but
-- restricted to active rows only. This lets the public bazaar catalog be
-- rendered through the anon key (server components fine, but also any
-- client-side polling we add later doesn't need the service role to leak
-- through).
--
-- Order tables (orders, order_items) — RLS enabled with NO policies. Only
-- the service_role key (which bypasses RLS) can read or write. PII +
-- shipping addresses + Stripe IDs never leak through anon. The public
-- order confirmation page reads via a server route that uses the service
-- role and verifies the Stripe session ID matches.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE bazaar_product_makers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bazaar_products        ENABLE ROW LEVEL SECURITY;
ALTER TABLE bazaar_product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE bazaar_orders          ENABLE ROW LEVEL SECURITY;
ALTER TABLE bazaar_order_items     ENABLE ROW LEVEL SECURITY;

-- Anon SELECT on the catalog (active rows only).
DROP POLICY IF EXISTS bazaar_makers_anon_read ON bazaar_product_makers;
CREATE POLICY bazaar_makers_anon_read
  ON bazaar_product_makers
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS bazaar_products_anon_read ON bazaar_products;
CREATE POLICY bazaar_products_anon_read
  ON bazaar_products
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- Variants of an active product are visible. We don't track is_active on
-- variants directly — the parent product's flag governs them.
DROP POLICY IF EXISTS bazaar_variants_anon_read ON bazaar_product_variants;
CREATE POLICY bazaar_variants_anon_read
  ON bazaar_product_variants
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bazaar_products p
      WHERE p.id = bazaar_product_variants.product_id
        AND p.is_active = true
    )
  );

-- bazaar_orders and bazaar_order_items: RLS enabled, NO policies. Reads
-- and writes go via service_role only. The anon key gets nothing — even
-- the customer's own order confirmation page is rendered server-side
-- with the service role, after validating the Stripe session ID.

COMMENT ON TABLE bazaar_product_makers IS
  'Bazaar artisan profiles. Public-readable (active rows). One maker may '
  'produce multiple products.';

COMMENT ON TABLE bazaar_products IS
  'Bazaar product catalog. Public-readable (active rows). Stock and price '
  'updates flow through the service role; never through the anon key.';

COMMENT ON TABLE bazaar_product_variants IS
  'Per-size / per-colour variants. Public-readable when parent product '
  'is_active = true.';

COMMENT ON TABLE bazaar_orders IS
  'Bazaar order header. PII-bearing (shipping address, contact email) — '
  'service-role-only access. Linked to donors table when contact_email '
  'matches an existing donor.';

COMMENT ON TABLE bazaar_order_items IS
  'Line items per order. Snapshot fields are the source of truth for '
  'what the customer purchased, surviving any later catalog edits.';
