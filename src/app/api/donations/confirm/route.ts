/**
 * POST /api/donations/confirm
 *
 * Stores donor + pending donation before the client calls stripe.confirmPayment
 * (one-time) or stripe.confirmSetup (monthly). NEVER marks status=succeeded —
 * that's the webhook's job, keyed on signed Stripe events.
 *
 * One-time: keyed by paymentIntentId. Webhook payment_intent.succeeded flips
 * the row to succeeded and sends the receipt.
 *
 * Monthly: keyed by setupIntentId. Webhook setup_intent.succeeded creates
 * the recurring Subscription. Subsequent invoice.paid events create new
 * donation rows per renewal, reusing the donor + gift aid declaration.
 *
 * Gift Aid: if the donor ticks the box, we insert a gift_aid_declarations
 * row (with IP + user agent audit trail) and link it to the donation.
 * For monthly donors the same declaration covers all future renewals.
 */

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase";
import { ATTRIBUTION_COOKIE, parseAttribution } from "@/lib/attribution";
import { CONSENT_COOKIE, parseConsentCookieValue } from "@/lib/consent";
import { getCampaignLabel, isValidCampaign } from "@/lib/campaigns";
import { type GiftAidScope } from "@/lib/gift-aid";

interface ConfirmBody {
  // Exactly one of these is set, depending on frequency.
  paymentIntentId?: string;
  setupIntentId?: string;
  customerId?: string;       // required when setupIntentId is set

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

const UK_POSTCODE = /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i;

function isEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

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

  const {
    paymentIntentId,
    setupIntentId,
    customerId,
    campaign,
    frequency,
    donor,
    giftAid,
    marketingConsent,
  } = body;

  if (!campaign || !isValidCampaign(campaign)) {
    return NextResponse.json({ error: "Invalid campaign." }, { status: 400 });
  }
  if (frequency !== "one-time" && frequency !== "monthly") {
    return NextResponse.json({ error: "Invalid frequency." }, { status: 400 });
  }

  // One-time requires paymentIntentId; monthly requires setupIntentId + customerId.
  if (frequency === "one-time") {
    if (!paymentIntentId || typeof paymentIntentId !== "string") {
      return NextResponse.json(
        { error: "paymentIntentId is required for one-time donations." },
        { status: 400 }
      );
    }
  } else {
    if (!setupIntentId || typeof setupIntentId !== "string") {
      return NextResponse.json(
        { error: "setupIntentId is required for monthly donations." },
        { status: 400 }
      );
    }
    if (!customerId || typeof customerId !== "string") {
      return NextResponse.json(
        { error: "customerId is required for monthly donations." },
        { status: 400 }
      );
    }
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

  // Cross-check against Stripe — the PI or SI must exist and match campaign
  let amountPence: number;
  try {
    if (frequency === "one-time") {
      const pi = await stripe.paymentIntents.retrieve(paymentIntentId!);
      if (pi.metadata.campaign !== campaign) {
        return NextResponse.json({ error: "Campaign mismatch." }, { status: 400 });
      }
      amountPence = pi.amount;
    } else {
      const si = await stripe.setupIntents.retrieve(setupIntentId!);
      if (si.metadata?.campaign !== campaign) {
        return NextResponse.json({ error: "Campaign mismatch." }, { status: 400 });
      }
      const siCustomer = typeof si.customer === "string" ? si.customer : si.customer?.id;
      if (siCustomer !== customerId) {
        return NextResponse.json({ error: "Customer mismatch." }, { status: 400 });
      }
      // SetupIntents have no amount — pull it from the metadata we set at
      // create-intent time.
      const meta = si.metadata?.amount_pence;
      const parsed = meta ? Number(meta) : NaN;
      if (!Number.isInteger(parsed) || parsed <= 0) {
        return NextResponse.json(
          { error: "Could not determine amount for monthly donation." },
          { status: 400 }
        );
      }
      amountPence = parsed;
    }
  } catch (err) {
    console.error("[confirm] Intent retrieve failed:", err);
    return NextResponse.json({ error: "Intent not found." }, { status: 404 });
  }

  const supabase = getSupabaseAdmin();

  // 1. Upsert donor. For monthly donors we also attach the Stripe Customer
  //    ID so future subscription events can find them by customer.
  const donorUpsert: Record<string, unknown> = {
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
  };
  if (frequency === "monthly" && customerId) {
    donorUpsert.stripe_customer_id = customerId;
  }

  const { data: donorRow, error: donorErr } = await supabase
    .from("donors")
    .upsert(donorUpsert, { onConflict: "email" })
    .select("id")
    .single();

  if (donorErr || !donorRow) {
    console.error("[confirm] Donor upsert failed:", donorErr);
    return NextResponse.json({ error: "Could not save donor." }, { status: 500 });
  }

  // 2. Also update the Stripe Customer with the donor's email + name so the
  //    Stripe Dashboard shows a human identity, not a random customer ID.
  if (frequency === "monthly" && customerId) {
    try {
      await stripe.customers.update(customerId, {
        email,
        name: `${firstName} ${lastName}`,
        address: {
          line1: addressLine1,
          line2: addressLine2 ?? undefined,
          city: city ?? undefined,
          postal_code: postcode,
          country: "GB",
        },
      });
    } catch (err) {
      // Non-fatal — the subscription still works, just has less info.
      console.warn("[confirm] Stripe customer update failed:", err);
    }
  }

  // 3. Insert Gift Aid declaration if claimed.
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

  // Ad-attribution from the first-party cookie set by <AttributionCapture>.
  // Attached to the donations row so we can:
  //   - Report ROAS per campaign / keyword
  //   - Upload Google Ads Offline Conversions (needs gclid + donation time)
  //   - Separate paid vs organic revenue in dashboards
  // All nullable — most rows will have none or some of these.
  const cookieStore = await cookies();
  const attribution = parseAttribution(cookieStore.get(ATTRIBUTION_COOKIE)?.value);

  // Consent snapshot captured at conversion time. The OCI cron filters on
  // ad_storage_consent=true before uploading to Google Ads (policy +
  // PECR). ad_user_data_consent gates Enhanced Conversions user data in
  // both the client purchase event and the server OCI payload.
  // Stored as booleans rather than re-reading the cookie later — cookies
  // decay; the donation row is permanent audit.
  const consent = parseConsentCookieValue(cookieStore.get(CONSENT_COOKIE)?.value);

  // 4. Insert pending donation. Keyed differently based on frequency.
  const donationRow: Record<string, unknown> = {
    donor_id: donorRow.id,
    gift_aid_declaration_id: giftAidDeclarationId,
    campaign,
    campaign_label: getCampaignLabel(campaign),
    amount_pence: amountPence,
    currency: "GBP",
    frequency,
    gift_aid_claimed: giftAidEnabled,
    status: "pending",
    gclid: attribution?.gclid ?? null,
    gbraid: attribution?.gbraid ?? null,
    wbraid: attribution?.wbraid ?? null,
    fbclid: attribution?.fbclid ?? null,
    utm_source: attribution?.utm_source ?? null,
    utm_medium: attribution?.utm_medium ?? null,
    utm_campaign: attribution?.utm_campaign ?? null,
    utm_term: attribution?.utm_term ?? null,
    utm_content: attribution?.utm_content ?? null,
    landing_page: attribution?.landing_page ?? null,
    landing_referrer: attribution?.landing_referrer ?? null,
    landing_at: attribution?.landing_at ?? null,
    ad_storage_consent: consent?.ad_storage ?? null,
    ad_user_data_consent: consent?.ad_user_data ?? null,
  };
  if (frequency === "one-time") {
    donationRow.stripe_payment_intent_id = paymentIntentId;
  } else {
    donationRow.stripe_setup_intent_id = setupIntentId;
    donationRow.stripe_customer_id = customerId;
  }

  const conflictCol =
    frequency === "one-time" ? "stripe_payment_intent_id" : "stripe_setup_intent_id";

  const { error: donationErr } = await supabase
    .from("donations")
    .upsert(donationRow, { onConflict: conflictCol });

  if (donationErr) {
    console.error("[confirm] Donation insert failed:", donationErr);
    return NextResponse.json({ error: "Could not save donation." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
