-- 014_stock_holds.sql
--
-- Stock reservation at checkout — closes the race window where two
-- customers could both pass the cart's "is there stock?" check and
-- both complete payment, ending up with one customer owning a paid
-- order with nothing to ship.
--
-- The flow:
--
--   1. /api/bazaar/checkout calls bazaar_hold_stock_for_order() which
--      ATOMICALLY decrements stock for every line item with a
--      WHERE stock_count >= quantity guard. If any line fails the
--      whole transaction rolls back — no partial holds. The order's
--      stock_held_until column is stamped to now() + 15 minutes.
--
--   2. The Stripe webhook (checkout.session.completed) marks the
--      order paid and clears stock_held_until — DOES NOT re-decrement
--      stock (already done at hold time). Same with refund: the
--      existing restoreStockForOrderItems flow stays unchanged.
--
--   3. If the customer abandons (closes the Stripe tab, takes too
--      long, etc.), release_expired_stock_holds() — called
--      opportunistically before every catalog fetch and checkout
--      attempt — restocks the items and marks the order 'abandoned'.
--      FOR UPDATE SKIP LOCKED keeps the cleanup race-safe vs. an
--      in-flight webhook on the same row.
--
-- Why 15 minutes: Stripe Checkout Sessions expire after 24h by default
-- but the vast majority of customers complete or abandon within a
-- couple of minutes. 15min is plenty for a slow card-entry case and
-- short enough that abandoned holds release within the same browsing
-- session of other customers who might want that piece.

-- ─────────────────────────────────────────────────────────────────
-- 1. Schema changes — new column + extended status set
-- ─────────────────────────────────────────────────────────────────

ALTER TABLE bazaar_orders
  ADD COLUMN IF NOT EXISTS stock_held_until timestamptz;

-- Extend the status check to allow 'abandoned' for orders whose
-- hold expired without payment. Postgres needs the constraint
-- dropped+recreated since CHECK constraints can't be ALTERed in
-- place.
ALTER TABLE bazaar_orders DROP CONSTRAINT IF EXISTS bazaar_orders_status_check;
ALTER TABLE bazaar_orders ADD CONSTRAINT bazaar_orders_status_check
  CHECK (status IN (
    'pending_payment',
    'paid',
    'fulfilled',
    'delivered',
    'refunded',
    'cancelled',
    'abandoned'
  ));

-- Cleanup path needs to find expired holds quickly.
CREATE INDEX IF NOT EXISTS bazaar_orders_hold_expired_idx
  ON bazaar_orders (stock_held_until)
  WHERE status = 'pending_payment' AND stock_held_until IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────
-- 2. Atomic stock-hold function
-- ─────────────────────────────────────────────────────────────────
--
-- Decrements stock for every line item of the given order_id with
-- per-row WHERE-guards. If any decrement can't proceed (stock would
-- go negative), the entire function raises and the caller's
-- transaction rolls back — so we never end up with partial holds.
--
-- Variant items decrement both the variant row AND the parent
-- product row (parent product.stock_count is the sum-of-variants
-- view, kept in sync at every variant change).

CREATE OR REPLACE FUNCTION bazaar_hold_stock_for_order(
  p_order_id uuid,
  p_hold_minutes integer DEFAULT 15
)
RETURNS void AS $$
DECLARE
  item_record record;
  updated_count integer;
BEGIN
  -- Iterate each line item and atomically decrement.
  FOR item_record IN
    SELECT product_id, variant_id, quantity
    FROM bazaar_order_items
    WHERE order_id = p_order_id
  LOOP
    IF item_record.product_id IS NULL THEN
      -- Product was deleted between cart and checkout — refuse
      -- to hold against a phantom row.
      RAISE EXCEPTION 'product_unavailable'
        USING DETAIL = 'product_id is null on order item';
    END IF;

    IF item_record.variant_id IS NOT NULL THEN
      -- Variant present: decrement variant stock first (the
      -- granular source of truth) then mirror onto parent.
      UPDATE bazaar_product_variants
      SET stock_count = stock_count - item_record.quantity
      WHERE id = item_record.variant_id
        AND stock_count >= item_record.quantity;
      GET DIAGNOSTICS updated_count = ROW_COUNT;
      IF updated_count = 0 THEN
        RAISE EXCEPTION 'insufficient_stock'
          USING DETAIL = 'variant ' || item_record.variant_id::text;
      END IF;

      UPDATE bazaar_products
      SET stock_count = stock_count - item_record.quantity
      WHERE id = item_record.product_id;
    ELSE
      -- No variant — decrement the parent product directly.
      UPDATE bazaar_products
      SET stock_count = stock_count - item_record.quantity
      WHERE id = item_record.product_id
        AND stock_count >= item_record.quantity;
      GET DIAGNOSTICS updated_count = ROW_COUNT;
      IF updated_count = 0 THEN
        RAISE EXCEPTION 'insufficient_stock'
          USING DETAIL = 'product ' || item_record.product_id::text;
      END IF;
    END IF;
  END LOOP;

  -- Stamp the hold expiry on the order row.
  UPDATE bazaar_orders
  SET stock_held_until = now() + (p_hold_minutes || ' minutes')::interval
  WHERE id = p_order_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION bazaar_hold_stock_for_order IS
  'Atomically decrement stock for every line of a pending order. '
  'Raises insufficient_stock if any line cannot be fulfilled. '
  'Stamps stock_held_until on the order row.';

-- ─────────────────────────────────────────────────────────────────
-- 3. Release expired holds
-- ─────────────────────────────────────────────────────────────────
--
-- Scans bazaar_orders for pending_payment rows whose hold has
-- expired, restocks their line items, and flips status to
-- 'abandoned'.
--
-- FOR UPDATE SKIP LOCKED ensures this never blocks behind an
-- in-flight webhook updating the same row to 'paid'. The webhook's
-- update on status='pending_payment'→'paid' will race against this
-- cleanup; whichever lock wins, only one of (restock + abandon)
-- and (mark paid + clear hold) wins. Both outcomes are correct:
-- the customer either paid (paid + stock stays decremented) or
-- abandoned (restock + abandon, stock back to where it was).

CREATE OR REPLACE FUNCTION release_expired_stock_holds()
RETURNS integer AS $$
DECLARE
  affected integer := 0;
  order_record record;
  item_record record;
BEGIN
  FOR order_record IN
    SELECT id
    FROM bazaar_orders
    WHERE status = 'pending_payment'
      AND stock_held_until IS NOT NULL
      AND stock_held_until < now()
    FOR UPDATE SKIP LOCKED
  LOOP
    FOR item_record IN
      SELECT product_id, variant_id, quantity
      FROM bazaar_order_items
      WHERE order_id = order_record.id
    LOOP
      IF item_record.variant_id IS NOT NULL THEN
        UPDATE bazaar_product_variants
        SET stock_count = stock_count + item_record.quantity
        WHERE id = item_record.variant_id;
        UPDATE bazaar_products
        SET stock_count = stock_count + item_record.quantity
        WHERE id = item_record.product_id;
      ELSIF item_record.product_id IS NOT NULL THEN
        UPDATE bazaar_products
        SET stock_count = stock_count + item_record.quantity
        WHERE id = item_record.product_id;
      END IF;
    END LOOP;

    UPDATE bazaar_orders
    SET status = 'abandoned', stock_held_until = NULL
    WHERE id = order_record.id;

    affected := affected + 1;
  END LOOP;

  RETURN affected;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION release_expired_stock_holds IS
  'Restock items and mark orders as abandoned when their stock '
  'hold has expired without payment confirmation. Safe to call '
  'opportunistically — FOR UPDATE SKIP LOCKED keeps it race-safe '
  'against the webhook updating the same row.';
