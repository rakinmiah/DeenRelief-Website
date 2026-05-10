import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { stripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/recurring/[id]/cancel
 *
 * Cancels a recurring subscription via Stripe. We use
 * `cancel_at_period_end: true` rather than immediate cancel so the
 * donor keeps the period they've already paid for. Stripe stops
 * charging at the next billing cycle.
 *
 * Why not immediate cancel: it would feel punitive to a donor who's
 * just cancelling and lose the days they paid for. Stripe's
 * cancel_at_period_end is the standard polite-cancel pattern.
 *
 * Webhook flow: Stripe will send `customer.subscription.deleted` when
 * the period actually ends and the cancellation takes effect. The
 * existing webhook handler logs that and emails the charity contact.
 * Status changes from "active" → "canceled" at that moment.
 *
 * Auth: admin session (cookie or bearer).
 *
 * Validation:
 *   - The donations row must exist and be livemode=true
 *   - It must have a stripe_subscription_id
 *   - The current Stripe subscription must not already be canceled
 *     (idempotent — re-calling on a canceled sub is a no-op)
 */
export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = requireAdminAuth(request);
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;

  const supabase = getSupabaseAdmin();
  const { data: row, error } = await supabase
    .from("donations")
    .select("stripe_subscription_id, livemode, frequency")
    .eq("id", id)
    .maybeSingle();

  if (error || !row) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (row.livemode !== true) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (row.frequency !== "monthly" || !row.stripe_subscription_id) {
    return NextResponse.json(
      { error: "Donation is not a recurring subscription." },
      { status: 400 }
    );
  }

  const subId = row.stripe_subscription_id as string;

  // Pre-check: idempotent against already-canceled subs.
  let current;
  try {
    current = await stripe.subscriptions.retrieve(subId);
  } catch (err) {
    console.error(
      `[admin-cancel] Stripe retrieve failed for ${subId}:`,
      err
    );
    return NextResponse.json(
      { error: "Subscription not found in Stripe." },
      { status: 404 }
    );
  }

  if (current.status === "canceled") {
    return NextResponse.json({
      ok: true,
      alreadyCanceled: true,
      message: "Subscription was already cancelled.",
    });
  }

  try {
    await stripe.subscriptions.update(subId, {
      cancel_at_period_end: true,
      metadata: {
        ...(current.metadata ?? {}),
        canceled_by: "admin",
        canceled_via: "admin-dashboard",
        canceled_at: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error(`[admin-cancel] Stripe update failed for ${subId}:`, err);
    return NextResponse.json(
      { error: "Stripe rejected the cancellation. Try again or check the dashboard." },
      { status: 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    alreadyCanceled: false,
    message:
      "Subscription cancelled. Donor keeps the current paid period; no further charges.",
  });
}
