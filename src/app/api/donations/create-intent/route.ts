/**
 * POST /api/donations/create-intent
 *
 * One-time:
 *   Creates a PaymentIntent, returns { clientSecret, paymentIntentId, mode: 'payment' }.
 *
 * Monthly:
 *   Creates (or reuses) a Stripe Customer and a SetupIntent attached to
 *   that customer, returns { clientSecret, setupIntentId, customerId,
 *   mode: 'setup' }. The actual recurring Subscription is created by the
 *   webhook handler on setup_intent.succeeded, once the payment method
 *   is confirmed attached.
 *
 * Security:
 *   - Amount validated server-side against MIN/MAX bounds (clients can't
 *     fabricate a £0.01 or £10m donation).
 *   - Campaign slug validated against allow-list.
 *   - No donor PII collected here — that's /confirm's job, after Payment
 *     Element is populated.
 */

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import {
  ATTRIBUTION_COOKIE,
  attributionToStripeMetadata,
  parseAttribution,
} from "@/lib/attribution";
import {
  MAX_AMOUNT_PENCE,
  MIN_AMOUNT_PENCE,
  getCampaignLabel,
  isValidCampaign,
} from "@/lib/campaigns";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

interface CreateIntentBody {
  campaign?: string;
  amount?: number;        // pence
  frequency?: "one-time" | "monthly";
}

export async function POST(request: Request) {
  // Rate limit first — cheap check, no Stripe API call needed to 429.
  const rl = await checkRateLimit(request, "create-intent");
  if (!rl.success) return rateLimitResponse(rl);

  let body: CreateIntentBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { campaign, amount, frequency } = body;

  if (!campaign || typeof campaign !== "string" || !isValidCampaign(campaign)) {
    return NextResponse.json({ error: "Invalid campaign." }, { status: 400 });
  }
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
  if (frequency !== "one-time" && frequency !== "monthly") {
    return NextResponse.json({ error: "Invalid frequency." }, { status: 400 });
  }

  // Pull ad-attribution from the first-party cookie set by <AttributionCapture>.
  // Flattened as `attr_*` keys so they're namespaced from donation metadata.
  // Useful for Stripe-Dashboard-side debugging; the donations row is still
  // the source of truth for ROAS reporting (written by /confirm).
  const cookieStore = await cookies();
  const attribution = parseAttribution(cookieStore.get(ATTRIBUTION_COOKIE)?.value);

  const commonMetadata: Stripe.MetadataParam = {
    campaign,
    campaign_label: getCampaignLabel(campaign),
    amount_pence: String(amount),
    frequency,
    ...attributionToStripeMetadata(attribution),
  };

  try {
    if (frequency === "one-time") {
      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: "gbp",
        automatic_payment_methods: { enabled: true },
        description: `Donation — ${getCampaignLabel(campaign)}`,
        metadata: commonMetadata,
      });

      return NextResponse.json({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        mode: "payment" as const,
      });
    }

    // ── Monthly: SetupIntent + Customer ──
    // A fresh Customer per checkout; the Subscription is created later by
    // the setup_intent.succeeded webhook. We don't yet know the donor's
    // email, so we can't upsert a named Customer — that's fine, Stripe
    // allows us to update it post-creation when /confirm arrives.
    const customer = await stripe.customers.create({
      metadata: commonMetadata,
    });

    const setupIntent = await stripe.setupIntents.create({
      customer: customer.id,
      automatic_payment_methods: { enabled: true },
      usage: "off_session",
      description: `Monthly donation setup — ${getCampaignLabel(campaign)}`,
      metadata: commonMetadata,
    });

    return NextResponse.json({
      clientSecret: setupIntent.client_secret,
      setupIntentId: setupIntent.id,
      customerId: customer.id,
      mode: "setup" as const,
    });
  } catch (err) {
    console.error("[create-intent] Stripe error:", err);
    return NextResponse.json(
      { error: "Could not start payment. Please try again." },
      { status: 500 }
    );
  }
}
