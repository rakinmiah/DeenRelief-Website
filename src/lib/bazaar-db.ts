/**
 * Server-side Supabase access for the Bazaar order tables.
 *
 * Scoped to the four mutations the checkout/webhook/confirmation
 * flow needs:
 *
 *   - createPendingOrder()      — on Stripe Checkout Session creation
 *   - markOrderPaid()           — on checkout.session.completed
 *   - markOrderRefunded()       — on charge.refunded
 *   - fetchOrderByStripeSession() — for the order confirmation page
 *
 * Catalog reads are NOT here yet. The current Phase 2 wiring keeps the
 * catalog file-based (src/lib/bazaar-placeholder.ts) so the checkout
 * flow can be exercised before the real product data exists. When the
 * post-photoshoot data swap lands, this module gains:
 *   - fetchActiveProducts()
 *   - fetchProductBySlug()
 *   - fetchProductBySku()      — for a SKU-match backfill of historical
 *                                order_items.product_id
 *
 * Why service-role only: bazaar_orders + bazaar_order_items have RLS
 * enabled with no policies (see migration 007). PII (shipping address,
 * contact email) and Stripe IDs never leak through the anon key. The
 * order confirmation page on the public site reads via a server route
 * that uses this module after verifying the Stripe session ID matches.
 */

import { getSupabaseAdmin } from "@/lib/supabase";
import type { ShippingAddress } from "@/lib/bazaar-types";

/** Shape of a row in bazaar_orders mapped to camelCase for the app side. */
export interface BazaarOrderRow {
  id: string;
  contactEmail: string;
  donorId: string | null;
  status:
    | "pending_payment"
    | "paid"
    | "fulfilled"
    | "delivered"
    | "refunded"
    | "cancelled"
    // 'abandoned' = customer started checkout, stock was held,
    // but the Stripe payment never completed and the hold
    // expired. Cleanup restocked the items and flipped the
    // status. See migration 014.
    | "abandoned";
  subtotalPence: number;
  shippingPence: number;
  totalPence: number;
  currency: string;
  shippingAddress: ShippingAddress | null;
  stripeSessionId: string | null;
  stripePaymentIntent: string | null;
  livemode: boolean;
  fulfilledAt: string | null;
  trackingNumber: string | null;
  royalMailService: "tracked-48" | "tracked-24" | "special-delivery" | null;
  internalNotes: string | null;
  /**
   * Set when stock was reserved for this order at checkout time.
   * Non-null means: stock has been decremented and is being held
   * pending payment. The Stripe webhook reads this — if set when
   * the webhook fires, skip the decrement (already debited) and
   * clear the hold. See migration 014.
   */
  stockHeldUntil: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BazaarOrderItemRow {
  id: string;
  orderId: string;
  productId: string | null;
  variantId: string | null;
  productNameSnapshot: string;
  variantSnapshot: string | null;
  makerNameSnapshot: string;
  unitPricePenceSnapshot: number;
  quantity: number;
}

/**
 * Insert a new bazaar_orders row in `pending_payment` plus one
 * bazaar_order_items row per cart line. Returns the new order ID
 * so the caller can stamp it into the Stripe Checkout Session metadata
 * (which the webhook reads back to find this exact order).
 *
 * The contact_email is what we'll get from Stripe Checkout after the
 * customer completes the form — at session-creation time we pass an
 * empty string and the webhook updates it. shipping_address gets the
 * same lazy fill from Stripe. shipping_pence is provisional too — the
 * customer might pick the Tracked 24 upgrade at checkout, so the
 * webhook overwrites with the actual chosen rate.
 *
 * livemode is determined by the STRIPE_SECRET_KEY prefix at the route
 * level and passed in here.
 */
/**
 * Pre-validated cart line ready to write to bazaar_order_items.
 * Built by the checkout route after it has resolved each cart entry
 * against the live catalog. createPendingOrder doesn't do any
 * catalog lookup itself — the route's validation pass is the
 * source of truth for what gets persisted.
 */
export interface PendingOrderItem {
  /** bazaar_products.id (UUID). Now that the catalog is in the DB,
   *  this is a real foreign-key target. */
  productId: string;
  /** bazaar_product_variants.id (UUID) or undefined. */
  variantId?: string;
  quantity: number;
  unitPricePence: number;
  productName: string;
  /** Pre-formatted "Size: Medium" / "Cream" — null when no variant. */
  variantLabel?: string | null;
  makerName: string;
}

export async function createPendingOrder(input: {
  items: PendingOrderItem[];
  subtotalPence: number;
  shippingPence: number;
  totalPence: number;
  livemode: boolean;
}): Promise<string> {
  const supabase = getSupabaseAdmin();

  type ItemInsert = {
    product_id: string;
    variant_id: string | null;
    product_name_snapshot: string;
    variant_snapshot: string | null;
    maker_name_snapshot: string;
    unit_price_pence_snapshot: number;
    quantity: number;
  };
  const itemRows: ItemInsert[] = input.items.map((item) => ({
    product_id: item.productId,
    variant_id: item.variantId ?? null,
    product_name_snapshot: item.productName,
    variant_snapshot: item.variantLabel ?? null,
    maker_name_snapshot: item.makerName,
    unit_price_pence_snapshot: item.unitPricePence,
    quantity: item.quantity,
  }));

  const { data: orderRow, error: orderErr } = await supabase
    .from("bazaar_orders")
    .insert({
      contact_email: "",
      donor_id: null,
      status: "pending_payment",
      subtotal_pence: input.subtotalPence,
      shipping_pence: input.shippingPence,
      total_pence: input.totalPence,
      currency: "GBP",
      // Stripe Checkout collects the address; placeholder until the
      // webhook fills it in from session.shipping_details.
      shipping_address: {},
      livemode: input.livemode,
    })
    .select("id")
    .single();

  if (orderErr || !orderRow) {
    throw new Error(
      `bazaar_orders insert failed: ${orderErr?.message ?? "no row returned"}`
    );
  }

  const { error: itemsErr } = await supabase
    .from("bazaar_order_items")
    .insert(itemRows.map((r) => ({ ...r, order_id: orderRow.id })));

  if (itemsErr) {
    // Orphaned header is a minor problem — delete it so we don't
    // accumulate ghost orders on retry.
    await supabase.from("bazaar_orders").delete().eq("id", orderRow.id);
    throw new Error(`bazaar_order_items insert failed: ${itemsErr.message}`);
  }

  return orderRow.id;
}

/**
 * Stamp the Stripe Checkout Session id onto a freshly-created pending
 * order, called immediately after stripe.checkout.sessions.create()
 * returns. Two reasons this matters:
 *
 *   1. The order confirmation page looks up the order by session id
 *      (that's all it has in the URL — Stripe's success_url
 *      substitution gives us cs_… and nothing else). Without this
 *      stamp the page can't find the row and shows the "still
 *      processing" interstitial until the webhook lands (which in
 *      local dev requires Stripe CLI forwarding).
 *   2. Reconciliation queries can join orders ↔ Stripe Dashboard
 *      session lookups without going via payment_intent (which
 *      isn't set until the customer actually pays).
 */
export async function attachStripeSessionId(input: {
  orderId: string;
  stripeSessionId: string;
}): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("bazaar_orders")
    .update({ stripe_session_id: input.stripeSessionId })
    .eq("id", input.orderId);
  if (error) {
    throw new Error(`attachStripeSessionId failed: ${error.message}`);
  }
}

/**
 * Promote a pending order to `paid` and stamp in the data Stripe
 * collected at checkout: real email, real address, the Payment Intent,
 * and the actual shipping rate chosen (the customer might have
 * upgraded to Tracked 24 — the original row carries the provisional
 * Tracked 48 figure).
 *
 * Returns the updated row so the caller (the webhook) can fan out
 * email / donor-link work without re-querying.
 *
 * Idempotency: this is safe to call multiple times for the same order.
 * The .eq("id") + .eq("status") "promote only if still pending" guard
 * stops a double-fire from overwriting fulfilment data set by a later
 * admin action.
 */
export async function markOrderPaid(input: {
  orderId: string;
  contactEmail: string;
  shippingAddress: ShippingAddress;
  stripeSessionId: string;
  stripePaymentIntent: string | null;
  actualShippingPence: number;
  actualTotalPence: number;
  donorIdIfMatched: string | null;
}): Promise<BazaarOrderRow | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("bazaar_orders")
    .update({
      status: "paid",
      contact_email: input.contactEmail,
      shipping_address: input.shippingAddress,
      stripe_session_id: input.stripeSessionId,
      stripe_payment_intent: input.stripePaymentIntent,
      shipping_pence: input.actualShippingPence,
      total_pence: input.actualTotalPence,
      donor_id: input.donorIdIfMatched,
    })
    .eq("id", input.orderId)
    .eq("status", "pending_payment")
    .select(BAZAAR_ORDER_COLUMNS)
    .maybeSingle<RawBazaarOrderRow>();

  if (error) {
    throw new Error(`markOrderPaid failed: ${error.message}`);
  }
  return data ? mapOrderRow(data) : null;
}

/**
 * Reverse a paid order. Called from the existing charge.refunded
 * webhook handler when the refunded charge's PaymentIntent matches a
 * bazaar order.
 *
 * We don't try to restore stock here because Phase 2 doesn't decrement
 * stock (the catalog isn't in the DB yet). When stock decrement lands
 * alongside the catalog seed, this function gains the restore step.
 */
export async function markOrderRefunded(stripePaymentIntent: string) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("bazaar_orders")
    .update({ status: "refunded" })
    .eq("stripe_payment_intent", stripePaymentIntent);
  if (error) {
    throw new Error(`markOrderRefunded failed: ${error.message}`);
  }
}

/**
 * Look up an order by Stripe Checkout Session ID. The order
 * confirmation page (`/bazaar/order/[sessionId]`) calls this after
 * verifying the session ID came from a successful checkout
 * redirect.
 *
 * Returns null (not 404) for unknown session IDs so the page can
 * decide whether to show a friendly "still processing" UI for the
 * narrow window between checkout.session.completed firing and the
 * customer landing on the success URL.
 */
export async function fetchOrderByStripeSession(
  stripeSessionId: string
): Promise<{ order: BazaarOrderRow; items: BazaarOrderItemRow[] } | null> {
  const supabase = getSupabaseAdmin();
  const { data: orderData, error: orderErr } = await supabase
    .from("bazaar_orders")
    .select(BAZAAR_ORDER_COLUMNS)
    .eq("stripe_session_id", stripeSessionId)
    .maybeSingle<RawBazaarOrderRow>();

  if (orderErr) {
    throw new Error(`fetchOrderByStripeSession failed: ${orderErr.message}`);
  }
  if (!orderData) return null;
  const order = mapOrderRow(orderData);

  type RawItemRow = {
    id: string;
    order_id: string;
    product_id: string | null;
    variant_id: string | null;
    product_name_snapshot: string;
    variant_snapshot: string | null;
    maker_name_snapshot: string;
    unit_price_pence_snapshot: number;
    quantity: number;
  };
  const { data: itemsData, error: itemsErr } = await supabase
    .from("bazaar_order_items")
    .select(BAZAAR_ORDER_ITEM_COLUMNS)
    .eq("order_id", order.id)
    .order("created_at", { ascending: true })
    .returns<RawItemRow[]>();

  if (itemsErr) {
    throw new Error(`bazaar_order_items fetch failed: ${itemsErr.message}`);
  }

  const items: BazaarOrderItemRow[] = (itemsData ?? []).map((r) => ({
    id: r.id,
    orderId: r.order_id,
    productId: r.product_id,
    variantId: r.variant_id,
    productNameSnapshot: r.product_name_snapshot,
    variantSnapshot: r.variant_snapshot,
    makerNameSnapshot: r.maker_name_snapshot,
    unitPricePenceSnapshot: r.unit_price_pence_snapshot,
    quantity: r.quantity,
  }));

  return { order, items };
}

/**
 * Filters accepted by fetchAdminBazaarOrders. All optional; an empty
 * options object returns "everything in livemode (or everything in
 * dev), most recent first".
 *
 * Why server-side rather than client filtering:
 *   - At 200-row cap we could filter in-app, but the date range and
 *     status filters routinely shrink the table to <20 rows; we want
 *     the row cap to apply AFTER filtering so the trustee can see
 *     the older "delivered" orders that would otherwise scroll off.
 *   - Customer search (name / email) does happen in-app because
 *     name lives inside shipping_address jsonb and isn't trivially
 *     queryable from PostgREST.
 */
export interface AdminBazaarOrderFilters {
  /** Restrict to these statuses. Empty/undefined = all statuses. */
  status?: BazaarOrderRow["status"][];
  /** ISO date (YYYY-MM-DD), inclusive lower bound on created_at. */
  from?: string;
  /** ISO date (YYYY-MM-DD), inclusive upper bound on created_at. */
  to?: string;
  /** Free-text search of contact_email + shipping_address.name. */
  q?: string;
}

/**
 * List orders for the admin /admin/bazaar/orders page.
 *
 * Defaults: all statuses, sorted by created_at DESC, limit 200. The
 * 200 cap matches the donations admin list — at our scale this fits
 * on one page; if the bazaar ever grows past it, we'll add the same
 * search-and-paginate UI the donations page uses.
 *
 * Livemode filter behaviour:
 *   - Production deploys (NODE_ENV === "production") filter to
 *     livemode=true so trustees never see development noise.
 *   - Local dev (and Vercel preview, which also runs as
 *     NODE_ENV=production but for our purposes is dev-grade) shows
 *     ALL orders — but the list view tags test rows visually so
 *     it's never ambiguous.
 *
 * Explicit `includeTestMode` overrides the env-based default in
 * either direction.
 */
export async function fetchAdminBazaarOrders(
  options: {
    includeTestMode?: boolean;
    limit?: number;
    filters?: AdminBazaarOrderFilters;
  } = {}
): Promise<{ order: BazaarOrderRow; itemCount: number }[]> {
  const limit = options.limit ?? 200;
  const filters = options.filters ?? {};
  const includeTestMode =
    options.includeTestMode ?? process.env.NODE_ENV !== "production";
  const supabase = getSupabaseAdmin();

  let query = supabase
    .from("bazaar_orders")
    .select(BAZAAR_ORDER_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!includeTestMode) {
    query = query.eq("livemode", true);
  }
  if (filters.status && filters.status.length > 0) {
    query = query.in("status", filters.status);
  }
  if (filters.from) {
    query = query.gte("created_at", `${filters.from}T00:00:00Z`);
  }
  if (filters.to) {
    // Inclusive: rows up to the END of the "to" day.
    query = query.lt(
      "created_at",
      new Date(
        new Date(`${filters.to}T00:00:00Z`).getTime() + 24 * 60 * 60 * 1000
      ).toISOString()
    );
  }

  const { data, error } = await query.returns<RawBazaarOrderRow[]>();
  if (error) {
    throw new Error(`fetchAdminBazaarOrders failed: ${error.message}`);
  }
  if (!data || data.length === 0) return [];

  // Second query: count items per order in one go. Avoids N+1 by
  // grouping on order_id in-app rather than per-order subquery.
  const orderIds = data.map((o) => o.id);
  const { data: itemRows, error: itemsErr } = await supabase
    .from("bazaar_order_items")
    .select("order_id, quantity")
    .in("order_id", orderIds)
    .returns<{ order_id: string; quantity: number }[]>();

  if (itemsErr) {
    throw new Error(
      `fetchAdminBazaarOrders items count failed: ${itemsErr.message}`
    );
  }

  const counts = new Map<string, number>();
  for (const r of itemRows ?? []) {
    counts.set(r.order_id, (counts.get(r.order_id) ?? 0) + r.quantity);
  }

  const mapped = data.map((raw) => ({
    order: mapOrderRow(raw),
    itemCount: counts.get(raw.id) ?? 0,
  }));

  // Customer search post-filter. The name lives in shipping_address
  // jsonb (PostgREST can technically reach it but the syntax is
  // awkward and brittle). 200-row in-app filter is cheap.
  if (filters.q && filters.q.trim().length > 0) {
    const needle = filters.q.trim().toLowerCase();
    return mapped.filter(({ order }) => {
      const email = order.contactEmail?.toLowerCase() ?? "";
      const name = order.shippingAddress?.name?.toLowerCase() ?? "";
      return email.includes(needle) || name.includes(needle);
    });
  }
  return mapped;
}

/**
 * Count orders by status for the admin dashboard's stat strip.
 *
 * Always runs unfiltered (against the same livemode visibility
 * rule that the list query uses) — the stat tiles represent "the
 * inbox at a glance", not "the current filtered view". Click-
 * through on a tile is what narrows the table to that subset.
 *
 * Returns a record keyed by status with the count. Missing keys
 * default to 0 at the call site.
 */
export async function countAdminBazaarOrdersByStatus(
  options: { includeTestMode?: boolean } = {}
): Promise<Partial<Record<BazaarOrderRow["status"], number>>> {
  const includeTestMode =
    options.includeTestMode ?? process.env.NODE_ENV !== "production";
  const supabase = getSupabaseAdmin();

  let query = supabase
    .from("bazaar_orders")
    .select("status");
  if (!includeTestMode) {
    query = query.eq("livemode", true);
  }

  const { data, error } = await query.returns<
    { status: BazaarOrderRow["status"] }[]
  >();
  if (error) {
    throw new Error(`countAdminBazaarOrdersByStatus failed: ${error.message}`);
  }

  const counts: Partial<Record<BazaarOrderRow["status"], number>> = {};
  for (const row of data ?? []) {
    counts[row.status] = (counts[row.status] ?? 0) + 1;
  }
  return counts;
}

/**
 * Fetch a single order with items for the admin detail page. Returns
 * null on unknown id so the page can 404 cleanly.
 *
 * Mirrors fetchOrderByStripeSession but keys on the order id (which
 * is what the admin URL carries — /admin/bazaar/orders/[id], where
 * [id] is the row UUID, not the receipt-number short form).
 */
export async function fetchAdminBazaarOrderById(
  orderId: string
): Promise<{ order: BazaarOrderRow; items: BazaarOrderItemRow[] } | null> {
  const supabase = getSupabaseAdmin();
  const { data: orderData, error: orderErr } = await supabase
    .from("bazaar_orders")
    .select(BAZAAR_ORDER_COLUMNS)
    .eq("id", orderId)
    .maybeSingle<RawBazaarOrderRow>();

  if (orderErr) {
    throw new Error(`fetchAdminBazaarOrderById failed: ${orderErr.message}`);
  }
  if (!orderData) return null;
  const order = mapOrderRow(orderData);

  type RawItemRow = {
    id: string;
    order_id: string;
    product_id: string | null;
    variant_id: string | null;
    product_name_snapshot: string;
    variant_snapshot: string | null;
    maker_name_snapshot: string;
    unit_price_pence_snapshot: number;
    quantity: number;
  };
  const { data: itemsData, error: itemsErr } = await supabase
    .from("bazaar_order_items")
    .select(BAZAAR_ORDER_ITEM_COLUMNS)
    .eq("order_id", order.id)
    .order("created_at", { ascending: true })
    .returns<RawItemRow[]>();

  if (itemsErr) {
    throw new Error(`bazaar_order_items fetch failed: ${itemsErr.message}`);
  }

  const items: BazaarOrderItemRow[] = (itemsData ?? []).map((r) => ({
    id: r.id,
    orderId: r.order_id,
    productId: r.product_id,
    variantId: r.variant_id,
    productNameSnapshot: r.product_name_snapshot,
    variantSnapshot: r.variant_snapshot,
    makerNameSnapshot: r.maker_name_snapshot,
    unitPricePenceSnapshot: r.unit_price_pence_snapshot,
    quantity: r.quantity,
  }));

  return { order, items };
}

/**
 * Mark an order as fulfilled — admin clicks "Mark shipped & notify"
 * on the detail page with a tracking number + service tier. The
 * server action calls this, then triggers the shipping confirmation
 * email and logs to the audit trail.
 *
 * The .eq("status", "paid") guard prevents a stale re-submission
 * from un-doing a later state transition (e.g. an already-delivered
 * order can't slip back to "fulfilled"). Returns the new row, or
 * null if the guard rejected the update (admin sees a "this order
 * has moved on, refresh the page" error in that case).
 */
export async function markOrderFulfilled(input: {
  orderId: string;
  trackingNumber: string;
  royalMailService:
    | "tracked-48"
    | "tracked-24"
    | "special-delivery";
  internalNotes?: string;
}): Promise<BazaarOrderRow | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("bazaar_orders")
    .update({
      status: "fulfilled",
      tracking_number: input.trackingNumber,
      royal_mail_service: input.royalMailService,
      fulfilled_at: new Date().toISOString(),
      ...(input.internalNotes !== undefined
        ? { internal_notes: input.internalNotes }
        : {}),
    })
    .eq("id", input.orderId)
    .eq("status", "paid")
    .select(BAZAAR_ORDER_COLUMNS)
    .maybeSingle<RawBazaarOrderRow>();

  if (error) {
    throw new Error(`markOrderFulfilled failed: ${error.message}`);
  }
  return data ? mapOrderRow(data) : null;
}

/**
 * Update the free-text internal notes on an order without touching
 * status / fulfilment fields. Lets the admin annotate context for
 * the next person who picks the order up (returns inquiry, stock
 * substitution, customer message on the side channel).
 */
export async function updateOrderInternalNotes(input: {
  orderId: string;
  internalNotes: string;
}): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("bazaar_orders")
    .update({ internal_notes: input.internalNotes })
    .eq("id", input.orderId);
  if (error) {
    throw new Error(`updateOrderInternalNotes failed: ${error.message}`);
  }
}

/**
 * Transition an order from `fulfilled` to `delivered`. Currently
 * a manual admin action — Royal Mail's tracking API would automate
 * this, but at our volume the trustee can flip it by hand when
 * tracking confirms delivery.
 *
 * Guarded by .eq("status", "fulfilled") so an already-delivered
 * order can't be flipped back (the guard rejects, the route
 * surfaces a 409 to the admin).
 */
export async function markOrderDelivered(
  orderId: string
): Promise<BazaarOrderRow | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("bazaar_orders")
    .update({ status: "delivered" })
    .eq("id", orderId)
    .eq("status", "fulfilled")
    .select(BAZAAR_ORDER_COLUMNS)
    .maybeSingle<RawBazaarOrderRow>();
  if (error) throw new Error(`markOrderDelivered failed: ${error.message}`);
  return data ? mapOrderRow(data) : null;
}

/**
 * Mark an order as refunded after the Stripe refund succeeds.
 *
 * Distinguishes admin-initiated refunds (this fn — the admin
 * clicked the Refund button) from webhook-driven ones
 * (markOrderRefunded above, fired by charge.refunded events for
 * refunds issued directly from the Stripe Dashboard).
 *
 * Both end up at status='refunded'. The webhook one is the
 * fallback / belt-and-braces — when the admin clicks Refund here,
 * Stripe will ALSO emit charge.refunded which markOrderRefunded
 * handles, but by that point this update has already happened and
 * markOrderRefunded becomes a no-op on a row that's already
 * refunded.
 *
 * Returns the updated row; the route uses it to confirm the new
 * state to the client. Guarded so we can only refund a row that's
 * actually in a refundable state.
 */
export async function markBazaarOrderRefundedFromAdmin(
  orderId: string
): Promise<BazaarOrderRow | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("bazaar_orders")
    .update({ status: "refunded" })
    .eq("id", orderId)
    .in("status", ["paid", "fulfilled", "delivered"])
    .select(BAZAAR_ORDER_COLUMNS)
    .maybeSingle<RawBazaarOrderRow>();
  if (error)
    throw new Error(
      `markBazaarOrderRefundedFromAdmin failed: ${error.message}`
    );
  return data ? mapOrderRow(data) : null;
}

/**
 * List orders ready for fulfilment — used by the Royal Mail Click &
 * Drop CSV export. Always returns status='paid' rows (the work
 * queue). Same livemode rules as the rest of the admin.
 */
export async function fetchAdminBazaarOrdersForClickAndDrop(): Promise<
  { order: BazaarOrderRow; items: BazaarOrderItemRow[] }[]
> {
  const includeTestMode = process.env.NODE_ENV !== "production";
  const supabase = getSupabaseAdmin();

  let q = supabase
    .from("bazaar_orders")
    .select(BAZAAR_ORDER_COLUMNS)
    .eq("status", "paid")
    .order("created_at", { ascending: true });
  if (!includeTestMode) q = q.eq("livemode", true);
  const { data, error } = await q.returns<RawBazaarOrderRow[]>();
  if (error) {
    throw new Error(
      `fetchAdminBazaarOrdersForClickAndDrop failed: ${error.message}`
    );
  }
  if (!data || data.length === 0) return [];

  type RawItemRow = {
    id: string;
    order_id: string;
    product_id: string | null;
    variant_id: string | null;
    product_name_snapshot: string;
    variant_snapshot: string | null;
    maker_name_snapshot: string;
    unit_price_pence_snapshot: number;
    quantity: number;
  };
  const orderIds = data.map((o) => o.id);
  const { data: itemRows, error: itemsErr } = await supabase
    .from("bazaar_order_items")
    .select(BAZAAR_ORDER_ITEM_COLUMNS)
    .in("order_id", orderIds)
    .order("created_at", { ascending: true })
    .returns<RawItemRow[]>();
  if (itemsErr) {
    throw new Error(
      `Click & Drop items fetch failed: ${itemsErr.message}`
    );
  }

  // Group items by order_id for a clean nested return.
  const byOrder = new Map<string, BazaarOrderItemRow[]>();
  for (const r of itemRows ?? []) {
    const list = byOrder.get(r.order_id) ?? [];
    list.push({
      id: r.id,
      orderId: r.order_id,
      productId: r.product_id,
      variantId: r.variant_id,
      productNameSnapshot: r.product_name_snapshot,
      variantSnapshot: r.variant_snapshot,
      makerNameSnapshot: r.maker_name_snapshot,
      unitPricePenceSnapshot: r.unit_price_pence_snapshot,
      quantity: r.quantity,
    });
    byOrder.set(r.order_id, list);
  }

  return data.map((raw) => ({
    order: mapOrderRow(raw),
    items: byOrder.get(raw.id) ?? [],
  }));
}

/**
 * Look up an existing donor by email so a returning donor's bazaar
 * order links to their existing record. Returns the donor id when a
 * row matches, null otherwise. Used by the webhook when promoting an
 * order to paid.
 */
export async function findDonorIdByEmail(
  email: string
): Promise<string | null> {
  if (!email) return null;
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("donors")
    .select("id")
    .eq("email", email.toLowerCase())
    .maybeSingle();
  return data?.id ?? null;
}

// ───────────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────────

// Static string literals (not concatenated) so Supabase's TypeScript
// inference can read the column list and avoid falling back to its
// GenericStringError type. Update both locations if the row shape
// changes.
const BAZAAR_ORDER_COLUMNS =
  "id, contact_email, donor_id, status, subtotal_pence, shipping_pence, total_pence, currency, shipping_address, stripe_session_id, stripe_payment_intent, livemode, fulfilled_at, tracking_number, royal_mail_service, internal_notes, stock_held_until, created_at, updated_at";

const BAZAAR_ORDER_ITEM_COLUMNS =
  "id, order_id, product_id, variant_id, product_name_snapshot, variant_snapshot, maker_name_snapshot, unit_price_pence_snapshot, quantity";

type RawBazaarOrderRow = {
  id: string;
  contact_email: string;
  donor_id: string | null;
  status: BazaarOrderRow["status"];
  subtotal_pence: number;
  shipping_pence: number;
  total_pence: number;
  currency: string;
  shipping_address: unknown;
  stripe_session_id: string | null;
  stripe_payment_intent: string | null;
  livemode: boolean;
  fulfilled_at: string | null;
  tracking_number: string | null;
  royal_mail_service: BazaarOrderRow["royalMailService"];
  internal_notes: string | null;
  stock_held_until: string | null;
  created_at: string;
  updated_at: string;
};

function mapOrderRow(r: RawBazaarOrderRow): BazaarOrderRow {
  const address = r.shipping_address as ShippingAddress | null;
  return {
    id: r.id,
    contactEmail: r.contact_email,
    donorId: r.donor_id,
    status: r.status,
    subtotalPence: r.subtotal_pence,
    shippingPence: r.shipping_pence,
    totalPence: r.total_pence,
    currency: r.currency,
    shippingAddress:
      address && typeof address === "object" && "line1" in address
        ? address
        : null,
    stripeSessionId: r.stripe_session_id,
    stripePaymentIntent: r.stripe_payment_intent,
    livemode: r.livemode,
    fulfilledAt: r.fulfilled_at,
    trackingNumber: r.tracking_number,
    royalMailService: r.royal_mail_service,
    internalNotes: r.internal_notes,
    stockHeldUntil: r.stock_held_until,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}
