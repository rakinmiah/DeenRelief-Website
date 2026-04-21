/**
 * POST /api/donations/confirm
 *
 * Called by the /donate client after stripe.confirmPayment() is about to run
 * (or immediately after, depending on the client flow). Stores the donor's
 * details and creates a pending donation row keyed by Stripe PaymentIntent ID.
 *
 * IMPORTANT: This route does NOT mark the donation as succeeded. That state
 * transition only happens in /api/stripe/webhook when Stripe sends us the
 * verified payment_intent.succeeded event. This prevents a malicious client
 * from faking success.
 *
 * Idempotency: if called twice with the same paymentIntentId, the second
 * call is a no-op (UNIQUE constraint on donations.stripe_payment_intent_id).
 *
 * Gift Aid: if the donor ticks the box, we insert a gift_aid_declarations
 * row (with IP + user agent as audit trail for HMRC) and link it to the
 * donation. The declaration_text field stores the verbatim wording the
 * donor saw — HMRC may request this if a claim is audited.
 */

import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getCampaignLabel, isValidCampaign } from "@/lib/campaigns";
import { type GiftAidScope } from "@/lib/gift-aid";

interface ConfirmBody {
  paymentIntentId?: string;
  campaign?: string;
  frequency?: "one-time" | "monthly";
  donor?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    postcode?: string;
    phone?: string;
  };
  giftAid?: {
    enabled?: boolean;
    scope?: GiftAidScope;
    declarationText?: string;
  };
  marketingConsent?: boolean;
}

// UK postcode — lenient, accepts missing space and any case.
const UK_POSTCODE = /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i;

function isEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

/** Extract client IP from request headers. Vercel + Next.js convention. */
function getClientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? null;
}

export async function POST(request: Request) {
  let body: ConfirmBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { paymentIntentId, campaign, frequency, donor, giftAid, marketingConsent } = body;

  // Validate shape
  if (!paymentIntentId || typeof paymentIntentId !== "string") {
    return NextResponse.json(
      { error: "paymentIntentId is required." },
      { status: 400 }
    );
  }
  if (!campaign || !isValidCampaign(campaign)) {
    return NextResponse.json({ error: "Invalid campaign." }, { status: 400 });
  }
  if (frequency !== "one-time") {
    return NextResponse.json(
      { error: "Only one-time donations are supported in this phase." },
      { status: 400 }
    );
  }
  if (!donor) {
    return NextResponse.json({ error: "Donor details missing." }, { status: 400 });
  }

  const firstName = donor.firstName?.trim() ?? "";
  const lastName = donor.lastName?.trim() ?? "";
  const email = donor.email?.trim().toLowerCase() ?? "";
  const addressLine1 = donor.addressLine1?.trim() ?? "";
  const addressLine2 = donor.addressLine2?.trim() || null;
  const city = donor.city?.trim() || null;
  const postcode = donor.postcode?.trim().toUpperCase() ?? "";
  const phone = donor.phone?.trim() || null;

  if (!firstName) return NextResponse.json({ error: "First name required." }, { status: 400 });
  if (!lastName) return NextResponse.json({ error: "Last name required." }, { status: 400 });
  if (!email || !isEmail(email)) return NextResponse.json({ error: "Valid email required." }, { status: 400 });
  if (!addressLine1) return NextResponse.json({ error: "Address required." }, { status: 400 });
  if (!postcode || !UK_POSTCODE.test(postcode)) {
    return NextResponse.json({ error: "Valid UK postcode required." }, { status: 400 });
  }

  // Gift Aid validation — if claimed, declaration text is required so we can
  // prove to HMRC what the donor agreed to.
  const giftAidEnabled = giftAid?.enabled === true;
  if (giftAidEnabled) {
    if (!giftAid?.declarationText || typeof giftAid.declarationText !== "string") {
      return NextResponse.json(
        { error: "Gift Aid declaration text is required when Gift Aid is enabled." },
        { status: 400 }
      );
    }
    if (
      giftAid.scope !== "this-donation-only" &&
      giftAid.scope !== "this-and-past-4-years-and-future"
    ) {
      return NextResponse.json({ error: "Invalid Gift Aid scope." }, { status: 400 });
    }
  }

  // Verify the PaymentIntent exists and matches the campaign we're writing.
  // This prevents a user from POSTing a donation row against a PI they didn't create.
  let paymentIntent;
  try {
    paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  } catch (err) {
    console.error("[confirm] PI retrieve failed:", err);
    return NextResponse.json({ error: "PaymentIntent not found." }, { status: 404 });
  }

  if (paymentIntent.metadata.campaign !== campaign) {
    return NextResponse.json({ error: "Campaign mismatch." }, { status: 400 });
  }

  const amountPence = paymentIntent.amount;

  const supabase = getSupabaseAdmin();

  // 1. Upsert donor by email. Update address fields so the newest donation
  //    always wins (donors move house, fix typos, etc.).
  const { data: donorRow, error: donorErr } = await supabase
    .from("donors")
    .upsert(
      {
        email,
        full_name: `${firstName} ${lastName}`,
        first_name: firstName,
        last_name: lastName,
        address_line1: addressLine1,
        address_line2: addressLine2,
        city,
        postcode,
        country: "GB",
        phone,
        marketing_consent: marketingConsent === true,
      },
      { onConflict: "email" }
    )
    .select("id")
    .single();

  if (donorErr || !donorRow) {
    console.error("[confirm] Donor upsert failed:", donorErr);
    return NextResponse.json({ error: "Could not save donor." }, { status: 500 });
  }

  // 2. Insert the Gift Aid declaration if claimed. One declaration per
  //    donation; the "past 4 years and future" scope covers subsequent
  //    donations automatically (we could look up the latest active
  //    declaration on future donations, but for now each donation gets
  //    a fresh record — simpler + better audit trail).
  let giftAidDeclarationId: string | null = null;
  if (giftAidEnabled) {
    const ipAddress = getClientIp(request);
    const userAgent = request.headers.get("user-agent");

    const { data: declRow, error: declErr } = await supabase
      .from("gift_aid_declarations")
      .insert({
        donor_id: donorRow.id,
        scope: giftAid!.scope,
        declaration_text: giftAid!.declarationText,
        ip_address: ipAddress,
        user_agent: userAgent,
      })
      .select("id")
      .single();

    if (declErr || !declRow) {
      console.error("[confirm] Gift Aid declaration insert failed:", declErr);
      return NextResponse.json(
        { error: "Could not save Gift Aid declaration." },
        { status: 500 }
      );
    }
    giftAidDeclarationId = declRow.id;
  }

  // 3. Insert donation as pending. Webhook flips status to succeeded.
  //    Upsert on PI ID makes this idempotent under duplicate submits.
  const { error: donationErr } = await supabase
    .from("donations")
    .upsert(
      {
        donor_id: donorRow.id,
        gift_aid_declaration_id: giftAidDeclarationId,
        campaign,
        campaign_label: getCampaignLabel(campaign),
        amount_pence: amountPence,
        currency: "GBP",
        frequency: "one-time",
        gift_aid_claimed: giftAidEnabled,
        stripe_payment_intent_id: paymentIntentId,
        status: "pending",
      },
      { onConflict: "stripe_payment_intent_id" }
    );

  if (donationErr) {
    console.error("[confirm] Donation insert failed:", donationErr);
    return NextResponse.json({ error: "Could not save donation." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
