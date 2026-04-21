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
 *   - Must be idempotent — Stripe retries on any non-2xx response and may
 *     also re-deliver events. The stripe_webhook_events.stripe_event_id
 *     UNIQUE constraint is our idempotency guarantee.
 *
 * Next.js 15 App Router: raw body is available via request.text() — do NOT
 * parse as JSON first, or the signature hash won't match.
 */

import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase";
import { sendDonationReceipt } from "@/lib/donation-receipt";

// Route segment config — force dynamic rendering (webhooks are never static)
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

  // Idempotency: insert the event log first. If we've seen this event_id
  // before, the UNIQUE violation short-circuits processing.
  const { error: logErr } = await supabase
    .from("stripe_webhook_events")
    .insert({
      stripe_event_id: event.id,
      event_type: event.type,
      payload: event as unknown as Record<string, unknown>,
      processed: false,
    });

  if (logErr) {
    // Duplicate event — already processed. Acknowledge so Stripe stops retrying.
    if (logErr.code === "23505") {
      console.log(`[webhook] Duplicate event ${event.id} — skipping.`);
      return NextResponse.json({ received: true, duplicate: true });
    }
    console.error("[webhook] Event log insert failed:", logErr);
    // Fall through — we'd rather process the event than drop it
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

      default:
        // Unknown event types are logged but not an error — Stripe sends many
        // events we don't care about (customer.updated, etc.)
        console.log(`[webhook] Unhandled event type: ${event.type}`);
    }

    // Mark event processed
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
    // Return 500 so Stripe retries
    return NextResponse.json({ error: "Handler failed." }, { status: 500 });
  }
}

/**
 * Look up the donation row by PaymentIntent ID, retrying briefly if not
 * found. Covers the race where payment_intent.succeeded arrives before
 * /api/donations/confirm finishes its upsert. Short backoff is enough
 * since the client awaits confirm before calling stripe.confirmPayment.
 */
async function findDonationWithRetry(
  piId: string,
  maxAttempts: number,
  delayMs: number
): Promise<{
  donor_id: string;
  amount_pence: number;
  campaign_label: string;
  frequency: "one-time" | "monthly";
  gift_aid_claimed: boolean;
} | null> {
  const supabase = getSupabaseAdmin();
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const { data, error } = await supabase
      .from("donations")
      .select("donor_id, amount_pence, campaign_label, frequency, gift_aid_claimed")
      .eq("stripe_payment_intent_id", piId)
      .maybeSingle();

    if (error) {
      console.error(`[webhook] donation lookup error (attempt ${attempt}):`, error);
    }
    if (data) {
      return data as {
        donor_id: string;
        amount_pence: number;
        campaign_label: string;
        frequency: "one-time" | "monthly";
        gift_aid_claimed: boolean;
      };
    }
    if (attempt < maxAttempts) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  return null;
}

async function handlePaymentIntentSucceeded(pi: Stripe.PaymentIntent) {
  const supabase = getSupabaseAdmin();
  const completedAt = new Date();

  // Race: Stripe can fire payment_intent.succeeded in parallel with our
  // /api/donations/confirm completing. Wait for the donation row before
  // running the update + sending the receipt — otherwise both are no-ops
  // (an UPDATE matching zero rows in PostgREST returns success silently).
  const donation = await findDonationWithRetry(pi.id, 4, 400);
  if (!donation) {
    console.error(
      `[webhook] donation row never appeared for ${pi.id} after retries. ` +
        `Status update + receipt skipped. Either /confirm failed or the row ` +
        `is taking unusually long to propagate. This needs manual investigation.`
    );
    return;
  }

  // 1. Flip status to succeeded
  const { error: updateErr } = await supabase
    .from("donations")
    .update({
      status: "succeeded",
      completed_at: completedAt.toISOString(),
    })
    .eq("stripe_payment_intent_id", pi.id);

  if (updateErr) {
    throw new Error(`Donation update failed: ${updateErr.message}`);
  }

  // 2. Send receipt. Failures are logged but never rethrown — a failing
  //    email must not cause Stripe to retry the webhook (double-charge risk
  //    of side effects is zero here, but double-email is bad donor UX).
  try {
    const { data: donor, error: donorErr } = await supabase
      .from("donors")
      .select("first_name, last_name, email")
      .eq("id", donation.donor_id)
      .maybeSingle();

    if (donorErr) {
      console.error("[webhook] receipt: donor lookup error:", donorErr);
    }

    if (donor?.email) {
      await sendDonationReceipt({
        toEmail: donor.email,
        firstName: donor.first_name,
        lastName: donor.last_name,
        amountPence: donation.amount_pence,
        campaignLabel: donation.campaign_label,
        frequency: donation.frequency,
        giftAidClaimed: donation.gift_aid_claimed,
        paymentIntentId: pi.id,
        completedAt,
      });
    } else {
      console.warn(
        `[webhook] receipt: no donor email for donation on ${pi.id}`
      );
    }
  } catch (err) {
    console.error("[webhook] Receipt email dispatch failed:", err);
  }

  // TODO (future): submit Gift Aid claim to Swiftaid if gift_aid_claimed
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

  // TODO (future): notify Swiftaid to void Gift Aid claim
}
