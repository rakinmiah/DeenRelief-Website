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
import { stripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase";
import { sendDonationReceipt } from "@/lib/donation-receipt";

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

  await dispatchReceipt(donation, pi.id, completedAt);
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

  const supabase = getSupabaseAdmin();
  await supabase
    .from("donations")
    .update({ status: "refunded" })
    .eq("stripe_payment_intent_id", piId);
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
    console.error(
      `[webhook] setup_intent ${si.id} missing customer or payment_method — cannot create subscription.`
    );
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
      `[webhook] donation row for setup_intent ${si.id} never appeared — cannot create subscription.`
    );
    return;
  }

  const amountPence = donation.amount_pence;
  const campaignLabel = donation.campaign_label;

  // Create the Subscription. dahlia API requires a pre-existing Product ID
  // for inline price_data on subscription items — we create one Product per
  // donation so the Stripe Dashboard shows the campaign name + amount in
  // each subscription's line item.
  const product = await stripe.products.create({
    name: `Monthly donation — ${campaignLabel}`,
    metadata: {
      campaign: donation.campaign,
      donation_id: donation.id,
    },
  });

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
    },
    // Charge immediately. If the first charge fails, we'll get
    // invoice.payment_failed and can surface it.
    payment_behavior: "error_if_incomplete",
  });

  // Record the subscription ID on the donation so invoice.paid for month 1
  // can find + update this exact row (rather than creating a duplicate).
  const supabase = getSupabaseAdmin();
  await supabase
    .from("donations")
    .update({
      stripe_subscription_id: subscription.id,
    })
    .eq("id", donation.id);
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

    await dispatchReceipt(existing as DonationRow, piId ?? invoice.id!, completedAt, customerId);
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

  await dispatchReceipt(inserted as DonationRow, piId ?? invoice.id!, completedAt, customerId);
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
 * Fetch donor row, send the receipt email. Swallow errors — a failing email
 * must not cause Stripe to retry the webhook.
 *
 * `stripeCustomerId` is passed for monthly donations so the email can
 * include a self-service "manage" link. Omit for one-time donations.
 */
async function dispatchReceipt(
  donation: DonationRow,
  referenceId: string,
  completedAt: Date,
  stripeCustomerId?: string
) {
  try {
    const supabase = getSupabaseAdmin();
    const { data: donor } = await supabase
      .from("donors")
      .select("first_name, last_name, email, stripe_customer_id")
      .eq("id", donation.donor_id)
      .maybeSingle();

    if (donor?.email) {
      // Prefer the customer ID passed explicitly (from invoice.customer),
      // fall back to the donor row's cached value.
      const customerId =
        stripeCustomerId ??
        (donor as unknown as { stripe_customer_id?: string }).stripe_customer_id ??
        undefined;

      await sendDonationReceipt({
        toEmail: donor.email,
        firstName: donor.first_name,
        lastName: donor.last_name,
        amountPence: donation.amount_pence,
        campaignLabel: donation.campaign_label,
        frequency: donation.frequency,
        giftAidClaimed: donation.gift_aid_claimed,
        paymentIntentId: referenceId,
        completedAt,
        stripeCustomerId: donation.frequency === "monthly" ? customerId : undefined,
      });
    } else {
      console.warn(`[webhook] No donor email for donation ${donation.id}.`);
    }
  } catch (err) {
    console.error("[webhook] Receipt dispatch failed:", err);
  }
}
