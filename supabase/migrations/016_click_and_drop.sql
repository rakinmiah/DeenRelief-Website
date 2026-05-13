-- 016_click_and_drop.sql
--
-- Royal Mail Click & Drop Order API integration columns.
--
-- The Click & Drop free-tier Order API lets us push a bazaar order
-- into the C&D dashboard with one POST — saving the trustee the
-- "retype shipping address + line items" step. The trustee still
-- logs into C&D to generate the actual label PDF (that's a paid
-- Shipping API V4 feature we're not building).
--
-- Two columns are enough:
--
--   click_and_drop_order_id   — the reference C&D returns to us
--                                after a successful push. Stored so
--                                we can:
--                                  (a) show the trustee which C&D
--                                      order to look up
--                                  (b) refuse to re-push (idempotency
--                                      at the application layer)
--
--   click_and_drop_pushed_at  — timestamp of the successful push.
--                                For audit + the UI "pushed N minutes
--                                ago" indicator.

ALTER TABLE bazaar_orders
  ADD COLUMN IF NOT EXISTS click_and_drop_order_id text,
  ADD COLUMN IF NOT EXISTS click_and_drop_pushed_at timestamptz;

-- Lookup index for "show me the order behind C&D ref XYZ" — rare
-- but cheap to add now.
CREATE INDEX IF NOT EXISTS bazaar_orders_cnd_id_idx
  ON bazaar_orders (click_and_drop_order_id)
  WHERE click_and_drop_order_id IS NOT NULL;

COMMENT ON COLUMN bazaar_orders.click_and_drop_order_id IS
  'Reference returned by Royal Mail Click & Drop Order API after a '
  'successful push. NULL until the trustee clicks "Push to C&D".';

COMMENT ON COLUMN bazaar_orders.click_and_drop_pushed_at IS
  'When the order was pushed to Click & Drop. Used for audit + UI.';
