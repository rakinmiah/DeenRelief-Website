/**
 * POST /api/stripe/webhook
 *
 * Receives verified Stripe events. This is the only place donation.status
 * flips to "succeeded" — /api/donations/confirm only writes the pending row.
 *
 * Critical contract with Stripe:
 *   - Must respond 2xx within 30s or Stripe retries (and escalates to
 *     "failed" after several attempts)
 *   - Must verify the stripe-signature header against STRIPE_WEBHOOK_SECRET
 *   - Must be idempotent — stripe_webhook_events.stripe_event_id UNIQUE
 *     constraint is our guarantee.
 *
 * Events handled:
 *   - payment_intent.succeeded  — one-time donation completed
 *   - payment_intent.payment_failed
 *   - charge.refunded           — mark donation refunded
 *   - setup_intent.succeeded    — monthly: payment method saved, create the
 *                                 Stripe Subscription now
 *   - invoice.paid              — monthly: each renewal. Month 1 fills in
 *                                 the pending row; months 2+ insert new rows.
 *   - invoice.payment_failed    — monthly: mark renewal failed
 *
 * Next.js 15+ App Router: raw body via request.text() — do NOT parse as
 * JSON first or signature verification fails.
 */

import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { fromPence, stripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase";
import { sendDonationReceipt } from "@/lib/donation-receipt";
import { sendDonationStaffNotification } from "@/lib/donation-staff-notification";
import {
  fetchOrderByStripeSession,
  findDonorIdByEmail,
  markOrderPaid,
  markOrderRefunded,
} from "@/lib/bazaar-db";
import {
  decrementStockForOrderItems,
  restoreStockForOrderItems,
} from "@/lib/bazaar-catalog";
import {
  bazaarReceiptNumber,
  sendBazaarOrderConfirmation,
} from "@/lib/bazaar-order-email";
import { enqueueNotification } from "@/lib/admin-notifications";
import {
  BAZAAR_STRIPE_METADATA_KEY,
  BAZAAR_STRIPE_METADATA_VALUE,
} from "@/lib/bazaar-config";
import type { ShippingAddress } from "@/lib/bazaar-types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[webhook] STRIPE_WEBHOOK_SECRET is not set.");
    return NextResponse.json({ error: "Server misconfigured." }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    console.error("[webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  // Idempotency: insert event log first, unique on stripe_event_id.
  const { error: logErr } = await supabase
    .from("stripe_webhook_events")
    .insert({
      stripe_event_id: event.id,
      event_type: event.type,
      payload: event as unknown as Record<string, unknown>,
      processed: false,
    });

  if (logErr) {
    if (logErr.code === "23505") {
      console.log(`[webhook] Duplicate event ${event.id} — skipping.`);
      return NextResponse.json({ received: true, duplicate: true });
    }
    console.error("[webhook] Event log insert failed:", logErr);
    // Fall through — still process the event
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        // Currently only bazaar uses Checkout Sessions; donations
        // flow through PaymentIntent / SetupIntent. The bazaar
        // handler is gated on metadata.source == "bazaar" anyway,
        // so a future donation Checkout Session integration would
        // simply add a second branch here.
        await handleBazaarCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session
        );
        break;
      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
      case "payment_intent.payment_failed":
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;
      case "charge.refunded":
        await handleChargeRefunded(event.data.object as Stripe.Charge);
        break;
      case "setup_intent.succeeded":
        await handleSetupIntentSucceeded(event.data.object as Stripe.SetupIntent);
        break;
      case "invoice.paid":
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      default:
        console.log(`[webhook] Unhandled event type: ${event.type}`);
    }

    await supabase
      .from("stripe_webhook_events")
      .update({ processed: true, processed_at: new Date().toISOString() })
      .eq("stripe_event_id", event.id);

    return NextResponse.json({ received: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[webhook] Handler error for ${event.type}:`, err);
    await supabase
      .from("stripe_webhook_events")
      .update({ error: message })
      .eq("stripe_event_id", event.id);
    return NextResponse.json({ error: "Handler failed." }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// One-time donation handlers
// ─────────────────────────────────────────────────────────────────────────────

interface DonationRow {
  id: string;
  donor_id: string;
  amount_pence: number;
  campaign: string;
  campaign_label: string;
  frequency: "one-time" | "monthly";
  gift_aid_claimed: boolean;
  gift_aid_declaration_id: string | null;
}

/**
 * Look up the donation row by PaymentIntent ID, retrying briefly if not
 * found. Covers the race where payment_intent.succeeded arrives before
 * /api/donations/confirm finishes its upsert.
 */
async function findDonationByPi(
  piId: string,
  maxAttempts = 4,
  delayMs = 400
): Promise<DonationRow | null> {
  const supabase = getSupabaseAdmin();
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const { data, error } = await supabase
      .from("donations")
      .select("id, donor_id, amount_pence, campaign, campaign_label, frequency, gift_aid_claimed, gift_aid_declaration_id")
      .eq("stripe_payment_intent_id", piId)
      .maybeSingle();

    if (error) console.error(`[webhook] donation lookup error (attempt ${attempt}):`, error);
    if (data) return data as DonationRow;
    if (attempt < maxAttempts) await new Promise((r) => setTimeout(r, delayMs));
  }
  return null;
}

async function findDonationBySetupIntent(siId: string): Promise<DonationRow | null> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("donations")
    .select("id, donor_id, amount_pence, campaign, campaign_label, frequency, gift_aid_claimed, gift_aid_declaration_id")
    .eq("stripe_setup_intent_id", siId)
    .maybeSingle();
  return (data as DonationRow) ?? null;
}

async function handlePaymentIntentSucceeded(pi: Stripe.PaymentIntent) {
  const supabase = getSupabaseAdmin();
  const completedAt = new Date();

  // Subscription-invoice PIs flow through invoice.paid, not here. We only
  // process PIs created directly (one-time donations) — signalled by our
  // own metadata from /api/donations/create-intent.
  if (pi.metadata?.frequency !== "one-time") {
    console.log(
      `[webhook] PI ${pi.id} not a one-time donation PI — skipping (handled elsewhere if monthly).`
    );
    return;
  }

  const donation = await findDonationByPi(pi.id);
  if (!donation) {
    console.error(
      `[webhook] donation row never appeared for ${pi.id} after retries. ` +
        `Status update + receipt skipped.`
    );
    return;
  }

  const { error: updateErr } = await supabase
    .from("donations")
    .update({
      status: "succeeded",
      completed_at: completedAt.toISOString(),
    })
    .eq("id", donation.id);

  if (updateErr) {
    throw new Error(`Donation update failed: ${updateErr.message}`);
  }

  // Qurbani-only: read the names array out of PI metadata. /confirm wrote
  // it as a JSON-encoded string. Defensive parse — bad JSON falls through
  // to no-names (receipts show billing donor's name).
  const qurbaniNames = parseQurbaniNamesFromMetadata(pi.metadata);

  // Zakat-only: pathway slug + label written by /create-intent. Either is
  // null on non-Zakat PIs (silently dropped at create-intent time).
  const pathwaySlug = (pi.metadata?.pathway as string | undefined) ?? null;
  const pathwayLabel = (pi.metadata?.pathway_label as string | undefined) ?? null;

  await dispatchReceipt(donation, pi.id, completedAt, undefined, qurbaniNames, pathwaySlug, pathwayLabel);
}

/** Defensive parse of pi.metadata.qurbani_names — returns [] on any failure. */
function parseQurbaniNamesFromMetadata(
  metadata: Stripe.Metadata | null | undefined
): string[] {
  const raw = metadata?.qurbani_names;
  if (!raw || typeof raw !== "string") return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((n): n is string => typeof n === "string");
  } catch {
    return [];
  }
}

async function handlePaymentIntentFailed(pi: Stripe.PaymentIntent) {
  const supabase = getSupabaseAdmin();
  await supabase
    .from("donations")
    .update({ status: "failed" })
    .eq("stripe_payment_intent_id", pi.id);
}

async function handleChargeRefunded(charge: Stripe.Charge) {
  if (!charge.payment_intent) return;
  const piId = typeof charge.payment_intent === "string"
    ? charge.payment_intent
    : charge.payment_intent.id;

  // Route by the metadata Stripe carries from PaymentIntent through
  // to the Charge: bazaar PIs set metadata.source = "bazaar" (via
  // payment_intent_data.metadata in the checkout session create call).
  // Donations have no `source` key. If the source IS "bazaar" we
  // ONLY touch bazaar_orders; never write to donations for the same
  // PI even if some stale donation row shared the id (it can't, but
  // belt-and-braces against future schema changes).
  const isBazaar =
    charge.metadata?.[BAZAAR_STRIPE_METADATA_KEY] ===
    BAZAAR_STRIPE_METADATA_VALUE;
  if (isBazaar) {
    // Find the order's items BEFORE flipping status so the restore
    // call has the full picture. (If we flipped first, a separate
    // query would still work — but a single read + write keeps the
    // window between read and stock-restore as small as possible.)
    const supabase = getSupabaseAdmin();
    const { data: orderRow } = await supabase
      .from("bazaar_orders")
      .select("id, status")
      .eq("stripe_payment_intent", piId)
      .maybeSingle<{ id: string; status: string }>();

    await markOrderRefunded(piId);

    if (orderRow && orderRow.status !== "refunded") {
      // Only restore stock once — if the row was already refunded
      // (admin-initiated refund + this is the echoing webhook),
      // skip to avoid double-restoring.
      const { data: itemRows } = await supabase
        .from("bazaar_order_items")
        .select(
          "id, order_id, product_id, variant_id, product_name_snapshot, variant_snapshot, maker_name_snapshot, unit_price_pence_snapshot, quantity"
        )
        .eq("order_id", orderRow.id)
        .returns<
          {
            id: string;
            order_id: string;
            product_id: string | null;
            variant_id: string | null;
            product_name_snapshot: string;
            variant_snapshot: string | null;
            maker_name_snapshot: string;
            unit_price_pence_snapshot: number;
            quantity: number;
          }[]
        >();

      if (itemRows) {
        await restoreStockForOrderItems(
          itemRows.map((r) => ({
            id: r.id,
            orderId: r.order_id,
            productId: r.product_id,
            variantId: r.variant_id,
            productNameSnapshot: r.product_name_snapshot,
            variantSnapshot: r.variant_snapshot,
            makerNameSnapshot: r.maker_name_snapshot,
            unitPricePenceSnapshot: r.unit_price_pence_snapshot,
            quantity: r.quantity,
          }))
        );
      }
    }
    return;
  }

  const supabase = getSupabaseAdmin();
  await supabase
    .from("donations")
    .update({ status: "refunded" })
    .eq("stripe_payment_intent_id", piId);
}

/**
 * checkout.session.completed for a bazaar order.
 *
 * Stripe fires this when the customer has finished the hosted
 * checkout (whether they paid or not — payment_status tells us
 * which). We only act on session.payment_status === "paid"; the
 * "unpaid" path on async payment methods (BACS) isn't surfaced for
 * bazaar (cards only at launch), so the unpaid branch is mostly
 * defensive.
 *
 * What we do, in order:
 *   1. Re-confirm the event belongs to us via metadata.source.
 *      Anyone else who happens to send Checkout Sessions through
 *      this Stripe account (e.g. a future product line) won't
 *      collide.
 *   2. Pull the order_id out of metadata — that's the
 *      bazaar_orders.id we wrote at session-creation time.
 *   3. Reach into session.shipping_details and session.customer_details
 *      for the real address + email Stripe collected.
 *   4. Try to link the order to an existing donor row by email.
 *   5. Call markOrderPaid() which updates the row in place. Stops
 *      idempotently on a second delivery.
 *   6. (Phase 4) Send the order confirmation email. For Phase 2
 *      we log a TODO and rely on Stripe's own receipt.
 */
async function handleBazaarCheckoutCompleted(
  session: Stripe.Checkout.Session
) {
  if (
    session.metadata?.[BAZAAR_STRIPE_METADATA_KEY] !==
    BAZAAR_STRIPE_METADATA_VALUE
  ) {
    console.log(
      `[webhook] checkout.session.completed ${session.id} missing bazaar metadata — skipping.`
    );
    return;
  }

  if (session.payment_status !== "paid") {
    console.log(
      `[webhook] bazaar session ${session.id} payment_status=${session.payment_status} — skipping promotion.`
    );
    return;
  }

  const orderId = session.metadata?.order_id;
  if (!orderId) {
    console.error(
      `[webhook] bazaar session ${session.id} has no order_id metadata — cannot promote.`
    );
    return;
  }

  // Email: Stripe puts the form-entered email on customer_details.email.
  // We lowercase to match donors.email's UNIQUE-but-not-citext column.
  const contactEmail =
    session.customer_details?.email?.toLowerCase().trim() ?? "";

  // Address — Stripe Checkout collected this via
  // shipping_address_collection. In dahlia the address lives under
  // collected_information.shipping_details (the top-level
  // session.shipping_details on older API versions is gone).
  // Normalise into our ShippingAddress shape (line2 optional,
  // country pinned to "GB" — the session restricted
  // allowed_countries so anything else is anomalous).
  const shippingDetails = session.collected_information?.shipping_details;
  const stripeAddress = shippingDetails?.address;
  if (!stripeAddress) {
    console.error(
      `[webhook] bazaar session ${session.id} missing shipping_details.address — order remains pending.`
    );
    return;
  }
  const shippingAddress: ShippingAddress = {
    name: shippingDetails?.name ?? session.customer_details?.name ?? "",
    line1: stripeAddress.line1 ?? "",
    ...(stripeAddress.line2 ? { line2: stripeAddress.line2 } : {}),
    city: stripeAddress.city ?? "",
    postcode: stripeAddress.postal_code ?? "",
    country: "GB",
  };

  // The actual chosen shipping rate may differ from what we
  // provisionally wrote at session-creation time (customer picked
  // Tracked 24 upgrade). session.shipping_cost is the source of truth.
  const actualShippingPence = session.shipping_cost?.amount_total ?? 0;
  const actualTotalPence = session.amount_total ?? 0;

  // Extract the PaymentIntent id (Stripe may give us a string ref or
  // an expanded object — handle both).
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  // Best-effort donor link: if this email matches an existing donor
  // row, we attach donor_id so reports can join across donation +
  // bazaar history for the same person.
  const donorId = contactEmail
    ? await findDonorIdByEmail(contactEmail)
    : null;

  const updated = await markOrderPaid({
    orderId,
    contactEmail,
    shippingAddress,
    stripeSessionId: session.id,
    stripePaymentIntent: paymentIntentId,
    actualShippingPence,
    actualTotalPence,
    donorIdIfMatched: donorId,
  });

  if (!updated) {
    // Either the order_id pointed at a row that no longer exists or
    // it was already promoted (idempotent re-delivery). Both are
    // benign — log and move on. We deliberately do NOT re-send the
    // confirmation email on a re-delivery, even though we could: the
    // customer already got it, and a duplicate email looks like a
    // scam to the suspicious eye.
    console.log(
      `[webhook] bazaar order ${orderId} for session ${session.id} not in pending_payment state — likely a re-delivery.`
    );
    return;
  }

  console.log(
    `[webhook] bazaar order ${orderId} promoted to paid (session ${session.id}, PI ${paymentIntentId}).`
  );

  // Refetch the order + items in one round-trip. We use this for
  // both stock decrement and the customer email so they see the
  // same authoritative data.
  let detail: Awaited<ReturnType<typeof fetchOrderByStripeSession>>;
  try {
    detail = await fetchOrderByStripeSession(session.id);
  } catch (err) {
    console.error(
      `[webhook] bazaar order ${orderId} refetch failed — stock + email skipped:`,
      err
    );
    return;
  }

  if (!detail) {
    console.warn(
      `[webhook] bazaar order ${orderId} not found on refetch — stock + email skipped.`
    );
    return;
  }

  // Stock decrement runs BEFORE the email so an outright failure
  // surfaces in logs before we tell the customer "your order is
  // confirmed." The helper swallows per-item failures and only
  // logs — a missed decrement is recoverable manually (admin
  // adjusts via the catalog UI) but blocking the email would
  // surface as a missing-receipt support ticket which is worse.
  try {
    await decrementStockForOrderItems(detail.items);
  } catch (err) {
    console.error(
      `[webhook] stock decrement failed for order ${orderId} — admin should reconcile manually:`,
      err
    );
  }

  // Admin notifications — fire-and-forget, no error path. Two
  // rows go in:
  //   1) Immediate "new order" notification visible in the bell
  //      right away.
  //   2) Scheduled "still unfulfilled after 24h" reminder. The
  //      reminder is invisible until scheduled_for elapses; the
  //      mark-shipped route cancels it if the order is shipped
  //      before then.
  const receiptNum = bazaarReceiptNumber(detail.order.id);
  const totalGbp = fromPence(detail.order.totalPence).toFixed(2);
  const itemCount = detail.items.reduce((s, i) => s + i.quantity, 0);
  const adminUrl = `/admin/bazaar/orders/${detail.order.id}`;
  const customerName = detail.order.shippingAddress?.name || "Customer";

  await enqueueNotification({
    type: "bazaar_order_placed",
    severity: "info",
    title: `New order — ${receiptNum} (£${totalGbp})`,
    body: `${customerName} just placed an order for ${itemCount} item${itemCount === 1 ? "" : "s"}. Time to fulfil.`,
    targetUrl: adminUrl,
    targetId: detail.order.id,
  });

  const REMINDER_DELAY_HOURS = 24;
  const reminderAt = new Date(
    Date.now() + REMINDER_DELAY_HOURS * 60 * 60 * 1000
  );
  await enqueueNotification({
    type: "bazaar_order_unfulfilled_reminder",
    severity: "warning",
    title: `Still to ship — ${receiptNum}`,
    body: `Order from ${customerName} (£${totalGbp}, ${itemCount} item${itemCount === 1 ? "" : "s"}) is 24 hours old and not yet marked shipped. Open to fulfil.`,
    targetUrl: adminUrl,
    targetId: detail.order.id,
    scheduledFor: reminderAt,
  });

  // Send the order confirmation email. Same reasoning as above —
  // sendBazaarOrderConfirmation already catches its own errors and
  // returns false, but we belt-and-braces around the fetch too.
  try {
    await sendBazaarOrderConfirmation({
      order: detail.order,
      items: detail.items,
    });
  } catch (err) {
    console.error(
      `[webhook] bazaar order confirmation email send failed for ${orderId}:`,
      err
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Monthly subscription handlers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * setup_intent.succeeded: the donor's payment method is now attached to the
 * Stripe Customer. We create the Subscription using that payment method as
 * the default. Stripe will then generate the first invoice, charge it, and
 * fire invoice.paid — where we send the receipt and mark the donation
 * succeeded.
 */
async function handleSetupIntentSucceeded(si: Stripe.SetupIntent) {
  console.log(`[webhook] setup_intent.succeeded received for ${si.id}, campaign=${si.metadata?.campaign}, freq=${si.metadata?.frequency}`);

  // Only act on setup intents we created (must have our campaign metadata).
  if (!si.metadata?.campaign || si.metadata?.frequency !== "monthly") {
    console.log(`[webhook] setup_intent ${si.id} not ours — skipping.`);
    return;
  }

  const customerId =
    typeof si.customer === "string" ? si.customer : si.customer?.id;
  const paymentMethodId =
    typeof si.payment_method === "string"
      ? si.payment_method
      : si.payment_method?.id;

  if (!customerId || !paymentMethodId) {
    const reason = `missing ${!customerId ? "customer" : "payment_method"}`;
    console.error(
      `[webhook] setup_intent ${si.id}: ${reason} — cannot create subscription.`
    );
    await notifySubscriptionFailure(si.id, reason, null);
    return;
  }

  // Find the donation row we wrote in /confirm. Retry briefly in case of
  // webhook/confirm race (same pattern as one-time).
  let donation: DonationRow | null = null;
  for (let attempt = 1; attempt <= 4; attempt++) {
    donation = await findDonationBySetupIntent(si.id);
    if (donation) break;
    if (attempt < 4) await new Promise((r) => setTimeout(r, 400));
  }
  if (!donation) {
    console.error(
      `[webhook] donation row for setup_intent ${si.id} never appeared after 4 retries — cannot create subscription.`
    );
    await notifySubscriptionFailure(
      si.id,
      "donation row not found after 4 retries",
      null
    );
    return;
  }

  console.log(`[webhook] setup_intent ${si.id}: matched donation ${donation.id}, amount=${donation.amount_pence}, campaign=${donation.campaign}`);

  const amountPence = donation.amount_pence;
  const campaignLabel = donation.campaign_label;
  const supabase = getSupabaseAdmin();

  // Create the Subscription. dahlia API requires a pre-existing Product ID
  // for inline price_data on subscription items — we create one Product per
  // donation so the Stripe Dashboard shows the campaign name + amount in
  // each subscription's line item.
  try {
    const product = await stripe.products.create({
      name: `Monthly donation — ${campaignLabel}`,
      metadata: {
        campaign: donation.campaign,
        donation_id: donation.id,
      },
    });

    console.log(`[webhook] setup_intent ${si.id}: created product ${product.id}, creating subscription...`);

    // Carry pathway through from the SetupIntent metadata onto the
    // Subscription so each renewal invoice's PI also surfaces it (Stripe
    // copies subscription.metadata onto invoice → PI for charges).
    const siPathway = (si.metadata?.pathway as string | undefined) ?? null;
    const siPathwayLabel = (si.metadata?.pathway_label as string | undefined) ?? null;

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      default_payment_method: paymentMethodId,
      items: [
        {
          price_data: {
            currency: "gbp",
            product: product.id,
            unit_amount: amountPence,
            recurring: { interval: "month" },
          },
        },
      ],
      metadata: {
        campaign: donation.campaign,
        campaign_label: campaignLabel,
        frequency: "monthly",
        donation_id: donation.id,
        ...(siPathway ? { pathway: siPathway } : {}),
        ...(siPathwayLabel ? { pathway_label: siPathwayLabel } : {}),
      },
      // Charge immediately. If the first charge fails, we'll get
      // invoice.payment_failed and can surface it.
      payment_behavior: "error_if_incomplete",
    });

    console.log(`[webhook] setup_intent ${si.id}: created subscription ${subscription.id} (status=${subscription.status})`);

    // Record the subscription ID on the donation so invoice.paid for month 1
    // can find + update this exact row (rather than creating a duplicate).
    const { error: updErr } = await supabase
      .from("donations")
      .update({
        stripe_subscription_id: subscription.id,
      })
      .eq("id", donation.id);

    if (updErr) {
      console.error(`[webhook] donation update with subscription ID failed:`, updErr);
      throw new Error(`DB update failed after subscription creation: ${updErr.message}`);
    }
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.error(`[webhook] Subscription creation failed for setup_intent ${si.id}:`, err);

    // Mark the donation as failed and notify the charity so a human can
    // follow up with the donor (Stripe won't retry error_if_incomplete).
    await supabase
      .from("donations")
      .update({ status: "failed" })
      .eq("id", donation.id);

    await notifySubscriptionFailure(si.id, reason, donation.id);

    // Rethrow so the webhook returns 500 and Stripe retries the event.
    throw err;
  }
}

/**
 * Fire a notification email to the charity's contact address when a monthly
 * subscription creation fails. Swallow send errors — we still want the
 * donation.status update and the thrown error to propagate.
 */
async function notifySubscriptionFailure(
  setupIntentId: string,
  reason: string,
  donationId: string | null
) {
  try {
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) return;
    const to = process.env.CONTACT_EMAIL ?? "info@deenrelief.org";
    const { Resend } = await import("resend");
    const resend = new Resend(resendKey);
    await resend.emails.send({
      from: "Deen Relief Website <noreply@deenrelief.org>",
      to,
      subject: "ALERT: Monthly donation subscription failed to set up",
      text: [
        `A monthly donation SetupIntent succeeded but we could not create the subscription.`,
        ``,
        `SetupIntent: ${setupIntentId}`,
        `Donation row: ${donationId ?? "(not found)"}`,
        `Reason: ${reason}`,
        ``,
        `The donor's card was validated but no charge was made. They will NOT be billed and will NOT receive a receipt.`,
        `Please check the donation row in Supabase, the SetupIntent in Stripe, and decide whether to contact the donor.`,
      ].join("\n"),
    });
  } catch (err) {
    console.error("[webhook] notifySubscriptionFailure failed:", err);
  }
}

/**
 * invoice.paid — fires for every successful charge in a subscription's life.
 * Month 1: update the pending row we created in /confirm with the invoice
 *          + PI id, flip to succeeded, send receipt.
 * Month 2+: insert a new donation row (same donor, campaign, declaration),
 *          send receipt.
 */
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  // Only charge subscriptions are relevant — skip one-off invoices (we don't
  // use them) and invoices that aren't for a subscription.
  const subscriptionId = getInvoiceSubscriptionId(invoice);
  if (!subscriptionId) return;
  if (invoice.billing_reason === "manual") return;

  const supabase = getSupabaseAdmin();
  const completedAt = new Date((invoice.status_transitions?.paid_at ?? invoice.created) * 1000);
  const piId = getInvoicePaymentIntentId(invoice);
  const amountPence = invoice.amount_paid;
  const customerId =
    typeof invoice.customer === "string"
      ? invoice.customer
      : invoice.customer?.id ?? undefined;

  // Pull pathway metadata off the parent Subscription so monthly Zakat
  // donors get the same pathway-aware receipt as one-time Zakat donors.
  // Failure here is non-fatal — receipt still sends without the pathway.
  let pathwaySlug: string | null = null;
  let pathwayLabel: string | null = null;
  try {
    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    pathwaySlug = (sub.metadata?.pathway as string | undefined) ?? null;
    pathwayLabel = (sub.metadata?.pathway_label as string | undefined) ?? null;
  } catch (err) {
    console.warn("[webhook] subscription retrieve for pathway failed:", err);
  }

  // Try to find a pending donation for this subscription (month 1 case).
  const { data: existing } = await supabase
    .from("donations")
    .select("id, donor_id, amount_pence, campaign, campaign_label, frequency, gift_aid_claimed, gift_aid_declaration_id")
    .eq("stripe_subscription_id", subscriptionId)
    .eq("status", "pending")
    .maybeSingle();

  if (existing) {
    // Month 1 — update the pending row
    const { error: updErr } = await supabase
      .from("donations")
      .update({
        status: "succeeded",
        completed_at: completedAt.toISOString(),
        stripe_payment_intent_id: piId,
        stripe_invoice_id: invoice.id,
        amount_pence: amountPence, // use actual charged amount (defensive)
      })
      .eq("id", existing.id);
    if (updErr) throw new Error(`Invoice paid update failed: ${updErr.message}`);

    await dispatchReceipt(existing as DonationRow, piId ?? invoice.id!, completedAt, customerId, [], pathwaySlug, pathwayLabel);
    return;
  }

  // Month 2+ — find an existing succeeded row for this subscription to
  // copy donor + declaration info from.
  const { data: template } = await supabase
    .from("donations")
    .select("donor_id, campaign, campaign_label, gift_aid_claimed, gift_aid_declaration_id")
    .eq("stripe_subscription_id", subscriptionId)
    .in("status", ["succeeded", "processing"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!template) {
    console.error(
      `[webhook] invoice.paid for subscription ${subscriptionId} but no prior donation row — cannot create renewal record.`
    );
    return;
  }

  const renewalRow = {
    donor_id: template.donor_id,
    gift_aid_declaration_id: template.gift_aid_declaration_id,
    campaign: template.campaign,
    campaign_label: template.campaign_label,
    amount_pence: amountPence,
    currency: "GBP",
    frequency: "monthly" as const,
    gift_aid_claimed: template.gift_aid_claimed,
    stripe_payment_intent_id: piId,
    stripe_subscription_id: subscriptionId,
    stripe_invoice_id: invoice.id,
    status: "succeeded" as const,
    completed_at: completedAt.toISOString(),
  };

  const { data: inserted, error: insErr } = await supabase
    .from("donations")
    .insert(renewalRow)
    .select("id, donor_id, amount_pence, campaign, campaign_label, frequency, gift_aid_claimed, gift_aid_declaration_id")
    .single();

  if (insErr || !inserted) {
    throw new Error(`Renewal donation insert failed: ${insErr?.message}`);
  }

  await dispatchReceipt(inserted as DonationRow, piId ?? invoice.id!, completedAt, customerId, [], pathwaySlug, pathwayLabel);
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = getInvoiceSubscriptionId(invoice);
  if (!subscriptionId) return;

  const supabase = getSupabaseAdmin();
  // Just record the failed attempt — we don't currently notify the donor
  // here; Stripe sends its own smart retry + "payment failed" emails via
  // Dashboard settings.
  await supabase.from("donations").insert({
    // If there's no pending row (mid-cycle failure) this creates a record
    // for reporting. If there is one, this creates a duplicate — acceptable
    // for reporting, and we can filter by status in the admin UI.
    donor_id: null as unknown as string, // filled later via subscription lookup if needed
    campaign: "unknown",
    campaign_label: "Monthly renewal — failed",
    amount_pence: invoice.amount_due,
    currency: "GBP",
    frequency: "monthly",
    gift_aid_claimed: false,
    stripe_subscription_id: subscriptionId,
    stripe_invoice_id: invoice.id,
    status: "failed",
  });
}

/**
 * customer.subscription.deleted — fires when a monthly donor's subscription
 * is cancelled (by trustee in Dashboard, or programmatically, or when
 * Stripe gives up after a failed-charge retry cycle).
 *
 * We don't track subscription status as a standalone column — Stripe is the
 * source of truth. What we do:
 *   1. Log the cancellation to console + event audit (already happens).
 *   2. Email the charity's contact email so a human can update any external
 *      records (newsletter lists, CRM, etc.) and optionally thank/follow up
 *      with the donor.
 *   3. Future: if we ever add an /admin donations view, this handler can
 *      flip a "cancelled" flag on the latest donation row for that
 *      subscription so trustees see it at a glance.
 */
async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  const supabase = getSupabaseAdmin();

  // Look up the donor via the subscription's customer ID (most recent
  // donation row is a good anchor).
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const { data: donation } = await supabase
    .from("donations")
    .select(
      `campaign_label, amount_pence,
       donors(first_name, last_name, email)`
    )
    .eq("stripe_subscription_id", sub.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const donor = (Array.isArray(donation?.donors) ? donation?.donors[0] : donation?.donors) as
    | { first_name?: string; last_name?: string; email?: string }
    | undefined;

  // Fire-and-forget notification to the charity. Failures are logged but
  // don't throw — the webhook must still ack.
  try {
    const toEmail = process.env.CONTACT_EMAIL ?? "info@deenrelief.org";
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      console.warn("[webhook] subscription.deleted: RESEND_API_KEY not set, staff not notified.");
    } else {
      const { Resend } = await import("resend");
      const resend = new Resend(resendKey);
      const donorName = donor
        ? `${donor.first_name ?? ""} ${donor.last_name ?? ""}`.trim() || "Unknown donor"
        : "Unknown donor";
      const donorEmail = donor?.email ?? "(not found in DB)";
      const amountGbp = donation?.amount_pence
        ? (donation.amount_pence / 100).toFixed(2)
        : "?";
      const campaign = donation?.campaign_label ?? "?";
      const reason = sub.cancellation_details?.reason ?? "not specified";

      await resend.emails.send({
        from: "Deen Relief Website <noreply@deenrelief.org>",
        to: toEmail,
        subject: `Monthly donation cancelled — ${donorName}`,
        text: [
          `A monthly donation subscription has been cancelled.`,
          ``,
          `Donor:       ${donorName}`,
          `Email:       ${donorEmail}`,
          `Campaign:    ${campaign}`,
          `Amount:      £${amountGbp} / month`,
          `Stripe sub:  ${sub.id}`,
          `Customer:    ${customerId}`,
          `Reason:      ${reason}`,
          ``,
          `No further charges will be made. Consider reaching out to thank ${donor?.first_name ?? "the donor"} for their past support.`,
        ].join("\n"),
      });
    }
  } catch (err) {
    console.error("[webhook] subscription.deleted notification failed:", err);
  }

  console.log(`[webhook] Subscription ${sub.id} cancelled. Customer ${customerId}.`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Newer Stripe types expose `parent.subscription_details.subscription` for subscription invoices. */
function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const subRef =
    invoice.parent?.type === "subscription_details"
      ? invoice.parent.subscription_details?.subscription
      : null;
  if (!subRef) return null;
  return typeof subRef === "string" ? subRef : subRef.id;
}

/** Extract PI id from invoice, regardless of which API version shape is present. */
function getInvoicePaymentIntentId(invoice: Stripe.Invoice): string | null {
  // Newer API: invoice.confirmation_secret + invoice.payments has a list
  const paymentsEntry = invoice.payments?.data?.[0]?.payment;
  if (paymentsEntry?.type === "payment_intent" && paymentsEntry.payment_intent) {
    const pi = paymentsEntry.payment_intent;
    return typeof pi === "string" ? pi : pi.id;
  }
  return null;
}

/**
 * Fetch donor + donation extras, then fire the donor receipt and the staff
 * notification in parallel. Swallow errors — a failing email must not cause
 * Stripe to retry the webhook (it would re-process and double-charge donor
 * trust, even though Stripe itself is idempotent).
 *
 * `stripeCustomerId` is passed for monthly donations so the donor email can
 * include a self-service "manage" link. Omit for one-time donations.
 *
 * Two queries (donor + donation extras) run in parallel so the staff email
 * can include the full picture: phone/address/marketing-consent (donors row)
 * plus UTM/gclid attribution + all Stripe IDs (donations row). The base
 * DonationRow only carries the fields the receipt itself needs.
 */
async function dispatchReceipt(
  donation: DonationRow,
  referenceId: string,
  completedAt: Date,
  stripeCustomerId?: string,
  qurbaniNames: string[] = [],
  pathwaySlug: string | null = null,
  pathwayLabel: string | null = null
) {
  try {
    const supabase = getSupabaseAdmin();
    const [donorRes, extrasRes] = await Promise.all([
      supabase
        .from("donors")
        .select(
          "first_name, last_name, email, phone, address_line1, address_line2, city, postcode, country, marketing_consent, stripe_customer_id"
        )
        .eq("id", donation.donor_id)
        .maybeSingle(),
      supabase
        .from("donations")
        .select(
          "stripe_payment_intent_id, stripe_customer_id, stripe_subscription_id, stripe_invoice_id, currency, utm_source, utm_medium, utm_campaign, utm_term, utm_content, gclid, landing_page, landing_referrer"
        )
        .eq("id", donation.id)
        .maybeSingle(),
    ]);

    const donor = donorRes.data;
    const extras = extrasRes.data;

    if (!donor?.email) {
      console.warn(`[webhook] No donor email for donation ${donation.id}.`);
      return;
    }

    const customerId =
      stripeCustomerId ??
      donor.stripe_customer_id ??
      extras?.stripe_customer_id ??
      undefined;

    // Both emails fire in parallel; each helper logs its own failure and
    // returns false on error — neither rejects, so allSettled is belt-and-
    // braces against future internals changing.
    await Promise.allSettled([
      sendDonationReceipt({
        toEmail: donor.email,
        firstName: donor.first_name,
        lastName: donor.last_name,
        amountPence: donation.amount_pence,
        campaignLabel: donation.campaign_label,
        campaignSlug: donation.campaign,
        frequency: donation.frequency,
        giftAidClaimed: donation.gift_aid_claimed,
        paymentIntentId: referenceId,
        completedAt,
        stripeCustomerId:
          donation.frequency === "monthly" ? customerId : undefined,
        qurbaniNames,
        pathwaySlug: pathwaySlug ?? undefined,
        pathwayLabel: pathwayLabel ?? undefined,
        // PDF receipt fields — donation id drives the receipt number
        // (DR-DON-XXXXXXXX), address fields appear on the Donor block
        // of the PDF when present.
        donationId: donation.id,
        addressLine1: donor.address_line1,
        addressLine2: donor.address_line2,
        city: donor.city,
        postcode: donor.postcode,
      }),
      sendDonationStaffNotification({
        firstName: donor.first_name,
        lastName: donor.last_name,
        email: donor.email,
        phone: donor.phone,
        addressLine1: donor.address_line1,
        addressLine2: donor.address_line2,
        city: donor.city,
        postcode: donor.postcode,
        country: donor.country,
        marketingConsent: donor.marketing_consent,
        amountPence: donation.amount_pence,
        currency: extras?.currency ?? "GBP",
        campaignLabel: donation.campaign_label,
        campaignSlug: donation.campaign,
        frequency: donation.frequency,
        giftAidClaimed: donation.gift_aid_claimed,
        completedAt,
        paymentIntentId: referenceId,
        stripePaymentIntentId: extras?.stripe_payment_intent_id ?? null,
        stripeCustomerId: customerId ?? null,
        stripeSubscriptionId: extras?.stripe_subscription_id ?? null,
        stripeInvoiceId: extras?.stripe_invoice_id ?? null,
        utmSource: extras?.utm_source ?? null,
        utmMedium: extras?.utm_medium ?? null,
        utmCampaign: extras?.utm_campaign ?? null,
        utmTerm: extras?.utm_term ?? null,
        utmContent: extras?.utm_content ?? null,
        gclid: extras?.gclid ?? null,
        landingPage: extras?.landing_page ?? null,
        landingReferrer: extras?.landing_referrer ?? null,
        qurbaniNames,
        pathwaySlug: pathwaySlug ?? undefined,
        pathwayLabel: pathwayLabel ?? undefined,
      }),
    ]);
  } catch (err) {
    console.error("[webhook] Receipt dispatch failed:", err);
  }
}
