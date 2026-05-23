/**
 * POST /api/donations/create-intent
 *
 * One-time:
 *   Creates a PaymentIntent, returns { clientSecret, paymentIntentId, mode: 'payment' }.
 *
 * Monthly:
 *   Creates a Stripe Customer, a per-donation Product, and a Subscription
 *   with payment_behavior: 'default_incomplete'. Stripe finalises the first
 *   invoice immediately and creates a PaymentIntent for it; we return that
 *   invoice's PaymentIntent client_secret as { clientSecret, paymentIntentId,
 *   subscriptionId, customerId, mode: 'payment' }.
 *
 *   The client then confirms that PaymentIntent ON-SESSION via
 *   stripe.confirmPayment() — which means any 3-D Secure / SCA challenge is
 *   presented to the donor while they're present on the page. (The old flow
 *   used a SetupIntent + off-session subscription charge, which silently
 *   failed for cards that mandate 3DS on every transaction because the
 *   challenge can't be completed off-session.)
 *
 *   When the first payment succeeds the subscription activates and Stripe
 *   fires invoice.paid, where the webhook flips the donation to succeeded
 *   and sends the receipt.
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
  resolvePathway,
} from "@/lib/campaigns";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

interface CreateIntentBody {
  campaign?: string;
  amount?: number;        // pence
  frequency?: "one-time" | "monthly";
  /** Zakat-only — see resolvePathway. Other campaigns silently ignore. */
  pathway?: string;
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

  const { campaign, amount, frequency, pathway } = body;

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

  // Pathway is Zakat-only and silently dropped for other campaigns. Validation
  // mirrors the page-level resolvePathway so a stray ?pathway= on a non-Zakat
  // campaign doesn't pollute PI metadata.
  const resolvedPathway = resolvePathway(campaign, pathway);

  const commonMetadata: Stripe.MetadataParam = {
    campaign,
    campaign_label: getCampaignLabel(campaign),
    amount_pence: String(amount),
    frequency,
    ...attributionToStripeMetadata(attribution),
    ...(resolvedPathway
      ? {
          pathway: resolvedPathway.slug,
          pathway_label: resolvedPathway.label,
        }
      : {}),
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

    // ── Monthly: Customer + Product + default_incomplete Subscription ──
    // A fresh Customer per checkout. We don't yet know the donor's email,
    // so the Customer is anonymous for now; /confirm updates it with the
    // donor's name + email once they submit the form.
    const customer = await stripe.customers.create({
      metadata: commonMetadata,
    });

    // One Product per donation so the Stripe Dashboard shows the campaign
    // name + amount on each subscription's line item.
    const product = await stripe.products.create({
      name: `Monthly donation — ${getCampaignLabel(campaign)}`,
      metadata: { campaign, donation_amount_pence: String(amount) },
    });

    // default_incomplete: Stripe creates + finalises the first invoice
    // immediately and attaches a PaymentIntent, but does NOT attempt to
    // charge it off-session. The subscription sits in `incomplete` until we
    // confirm that PaymentIntent on-session from the client — at which point
    // any SCA challenge runs with the donor present. Incomplete subscriptions
    // auto-expire after ~23h, so amount edits (which create a fresh
    // subscription each time) self-clean.
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [
        {
          price_data: {
            currency: "gbp",
            product: product.id,
            unit_amount: amount,
            recurring: { interval: "month" },
          },
        },
      ],
      payment_behavior: "default_incomplete",
      // Persist the confirmed payment method as the subscription default so
      // future renewals charge off-session without re-authentication.
      payment_settings: { save_default_payment_method: "on_subscription" },
      metadata: commonMetadata,
      // Pull the first invoice's confirmation secret back in one round-trip.
      expand: ["latest_invoice.confirmation_secret"],
    });

    const latestInvoice = subscription.latest_invoice as Stripe.Invoice | null;
    const clientSecret = latestInvoice?.confirmation_secret?.client_secret;
    if (!clientSecret) {
      console.error(
        `[create-intent] No confirmation_secret on subscription ${subscription.id} first invoice.`
      );
      return NextResponse.json(
        { error: "Could not start payment. Please try again." },
        { status: 500 }
      );
    }

    // The confirmation secret is a PaymentIntent client_secret of the form
    // `pi_XXX_secret_YYY`; the id is everything before `_secret_`. We hand it
    // to /confirm so the pending donation row can be keyed on the (unique)
    // PaymentIntent id — stripe_subscription_id is non-unique because monthly
    // renewals reuse it, so it can't be the upsert conflict target.
    const paymentIntentId = clientSecret.split("_secret_")[0];

    return NextResponse.json({
      clientSecret,
      paymentIntentId,
      subscriptionId: subscription.id,
      customerId: customer.id,
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
