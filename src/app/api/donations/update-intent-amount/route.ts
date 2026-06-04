/**
 * POST /api/donations/update-intent-amount
 *
 * Confirm-step upsell support for ONE-TIME donations. When a donor accepts a
 * one-off add-on in the checkout interstitial, we bump the existing
 * PaymentIntent's amount IN PLACE. Updating amount does not change the
 * PaymentIntent's client_secret, so the card the donor already entered in the
 * Payment Element stays valid — the client then confirms the (higher) amount
 * without re-mounting Stripe Elements.
 *
 * Only valid before confirmation (status requires_payment_method /
 * requires_confirmation). One-time only — monthly amounts are fixed by the
 * subscription price and can't be patched this way. The downstream /confirm
 * route reads the authoritative amount back from Stripe, so the bumped value
 * flows into the donation row + receipt automatically.
 */

import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { MAX_AMOUNT_PENCE, MIN_AMOUNT_PENCE, isValidCampaign } from "@/lib/campaigns";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

interface UpdateAmountBody {
  paymentIntentId?: string;
  amount?: number; // pence — the NEW total
  campaign?: string;
  /** Stable upsell card id, recorded on the PI for take-rate reporting. */
  upsellItem?: string;
}

const UPDATABLE_STATUSES = new Set([
  "requires_payment_method",
  "requires_confirmation",
  "requires_action",
]);

export async function POST(request: Request) {
  const rl = await checkRateLimit(request, "create-intent");
  if (!rl.success) return rateLimitResponse(rl);

  let body: UpdateAmountBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { paymentIntentId, amount, campaign, upsellItem } = body;

  if (!paymentIntentId || typeof paymentIntentId !== "string") {
    return NextResponse.json({ error: "paymentIntentId is required." }, { status: 400 });
  }
  if (!campaign || !isValidCampaign(campaign)) {
    return NextResponse.json({ error: "Invalid campaign." }, { status: 400 });
  }
  if (typeof amount !== "number" || !Number.isInteger(amount)) {
    return NextResponse.json({ error: "Amount must be an integer number of pence." }, { status: 400 });
  }
  if (amount < MIN_AMOUNT_PENCE || amount > MAX_AMOUNT_PENCE) {
    return NextResponse.json({ error: "Amount out of bounds." }, { status: 400 });
  }

  try {
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);

    // Guard: only the matching campaign's own intent, and only while it's
    // still pre-charge. A confirmed/processing/succeeded PI must never be
    // re-amounted.
    if (pi.metadata.campaign !== campaign) {
      return NextResponse.json({ error: "Campaign mismatch." }, { status: 400 });
    }
    if (pi.metadata.frequency === "monthly") {
      return NextResponse.json({ error: "Cannot patch a monthly amount." }, { status: 400 });
    }
    if (!UPDATABLE_STATUSES.has(pi.status)) {
      return NextResponse.json({ error: "Payment already in progress." }, { status: 409 });
    }

    const updated = await stripe.paymentIntents.update(paymentIntentId, {
      amount,
      metadata: {
        amount_pence: String(amount),
        ...(upsellItem ? { upsell_item: upsellItem } : {}),
      },
    });

    return NextResponse.json({ ok: true, amount: updated.amount });
  } catch (err) {
    console.error("[update-intent-amount] Stripe error:", err);
    return NextResponse.json({ error: "Could not update amount." }, { status: 500 });
  }
}
