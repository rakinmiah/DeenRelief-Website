/**
 * POST /api/donations/create-intent
 *
 * Creates a Stripe PaymentIntent for a one-time donation and returns the
 * client_secret. The Payment Element on /donate uses this secret to mount
 * itself and confirm the payment directly with Stripe.
 *
 * Security:
 *   - Amount is validated server-side against MIN/MAX bounds. Never trust
 *     the client to calculate this — a user could edit the URL or JS to
 *     pass £0.01 or £10m.
 *   - Campaign slug is validated against an allow-list.
 *   - No donor PII is collected here — that happens in /confirm after
 *     the donor has entered their details.
 *
 * Monthly subscriptions (SetupIntent + Subscription) will be added in a
 * future phase — for now this route rejects frequency !== "one-time".
 */

import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import {
  MAX_AMOUNT_PENCE,
  MIN_AMOUNT_PENCE,
  getCampaignLabel,
  isValidCampaign,
} from "@/lib/campaigns";

interface CreateIntentBody {
  campaign?: string;
  amount?: number;        // pence
  frequency?: "one-time" | "monthly";
}

export async function POST(request: Request) {
  let body: CreateIntentBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { campaign, amount, frequency } = body;

  // Campaign validation
  if (!campaign || typeof campaign !== "string" || !isValidCampaign(campaign)) {
    return NextResponse.json(
      { error: "Invalid campaign." },
      { status: 400 }
    );
  }

  // Amount validation
  if (typeof amount !== "number" || !Number.isInteger(amount)) {
    return NextResponse.json(
      { error: "Amount must be an integer number of pence." },
      { status: 400 }
    );
  }
  if (amount < MIN_AMOUNT_PENCE) {
    return NextResponse.json(
      { error: `Minimum donation is £${MIN_AMOUNT_PENCE / 100}.` },
      { status: 400 }
    );
  }
  if (amount > MAX_AMOUNT_PENCE) {
    return NextResponse.json(
      {
        error: `For donations above £${
          MAX_AMOUNT_PENCE / 100
        }, please contact us directly.`,
      },
      { status: 400 }
    );
  }

  // Frequency — one-time only in this phase
  if (frequency !== "one-time") {
    return NextResponse.json(
      { error: "Monthly donations are coming soon." },
      { status: 400 }
    );
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "gbp",
      automatic_payment_methods: { enabled: true },
      description: `Donation — ${getCampaignLabel(campaign)}`,
      metadata: {
        campaign,
        campaign_label: getCampaignLabel(campaign),
        frequency: "one-time",
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      mode: "payment" as const,
    });
  } catch (err) {
    console.error("[create-intent] Stripe error:", err);
    return NextResponse.json(
      { error: "Could not start payment. Please try again." },
      { status: 500 }
    );
  }
}
