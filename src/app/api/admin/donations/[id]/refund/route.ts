import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { logAdminAction } from "@/lib/admin-audit";
import { getSupabaseAdmin } from "@/lib/supabase";
import { stripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/donations/[id]/refund
 *
 * Issues a full Stripe refund against the donation's PaymentIntent.
 *
 * What happens:
 *   1. Stripe processes the refund (typically instant for card)
 *   2. Stripe sends `charge.refunded` webhook to /api/stripe/webhook
 *   3. The existing webhook handler updates the donations row to
 *      status='refunded' (and triggers any downstream notifications)
 *
 * We do NOT update the donations row here — letting the webhook do
 * it keeps a single write path for status changes and avoids the
 * race condition where we'd update status='refunded' but Stripe
 * later rejects the refund (e.g. dispute already filed).
 *
 * Validation:
 *   - Donation must exist and be livemode=true
 *   - Status must currently be 'succeeded' (not pending / already
 *     refunded / failed)
 *   - Frequency must be 'one-time' — refunding a recurring donation
 *     would only refund the latest charge, not cancel the
 *     subscription. Trustees who want to stop recurring should use
 *     the cancel button on /admin/recurring instead.
 *   - PaymentIntent must be on file
 *
 * Idempotency: re-calling on a donation already in status='refunded'
 * returns alreadyRefunded:true with no Stripe call. If the row is
 * 'succeeded' but Stripe has already created a refund (rare race),
 * Stripe rejects the duplicate and we surface the error.
 */
export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = requireAdminAuth(request);
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const supabase = getSupabaseAdmin();

  const { data: donation, error } = await supabase
    .from("donations")
    .select(
      "id, status, frequency, livemode, stripe_payment_intent_id, amount_pence"
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !donation) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (donation.livemode !== true) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (donation.status === "refunded") {
    return NextResponse.json({
      ok: true,
      alreadyRefunded: true,
      message: "Donation has already been refunded.",
    });
  }
  if (donation.status !== "succeeded") {
    return NextResponse.json(
      {
        error: `Cannot refund a donation with status '${donation.status}'. Only succeeded donations can be refunded.`,
      },
      { status: 400 }
    );
  }
  if (donation.frequency !== "one-time") {
    return NextResponse.json(
      {
        error:
          "Refunding a recurring donation only reverses the latest charge, not the subscription. Cancel the subscription via /admin/recurring instead.",
      },
      { status: 400 }
    );
  }
  if (!donation.stripe_payment_intent_id) {
    return NextResponse.json(
      { error: "No PaymentIntent on file for this donation." },
      { status: 400 }
    );
  }

  try {
    const refund = await stripe.refunds.create({
      payment_intent: donation.stripe_payment_intent_id as string,
      reason: "requested_by_customer",
      metadata: {
        refunded_by: "admin",
        refunded_via: "admin-dashboard",
        refunded_at: new Date().toISOString(),
        donation_id: donation.id as string,
      },
    });

    // Audit log AFTER Stripe succeeds — we don't want to record a
    // refund that didn't happen.
    await logAdminAction({
      action: "refund_donation",
      userEmail: auth.email,
      targetId: donation.id as string,
      request,
      metadata: {
        amountPence: donation.amount_pence,
        stripeRefundId: refund.id,
        stripePaymentIntentId: donation.stripe_payment_intent_id,
      },
    });

    return NextResponse.json({
      ok: true,
      alreadyRefunded: false,
      refundId: refund.id,
      message:
        "Refund issued successfully. The donation status will update to 'refunded' within a few seconds via the Stripe webhook.",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[admin-refund] Stripe refund failed for ${id}:`, err);
    return NextResponse.json(
      {
        error: `Stripe rejected the refund: ${msg}`,
      },
      { status: 502 }
    );
  }
}
