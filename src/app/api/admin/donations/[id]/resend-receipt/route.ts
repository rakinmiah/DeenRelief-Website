import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { logAdminAction } from "@/lib/admin-audit";
import { getSupabaseAdmin } from "@/lib/supabase";
import { sendDonationReceipt } from "@/lib/donation-receipt";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/donations/[id]/resend-receipt
 *
 * Re-sends the original donation receipt email via Resend. Trustees
 * use this when a donor reports they didn't receive the receipt
 * (spam folder, mistyped email at donate-time, etc.) or after a
 * Resend / Stripe outage where the original send failed.
 *
 * Validation:
 *   - Donation must exist and be livemode=true
 *   - Status must be 'succeeded' (no point sending a receipt for a
 *     pending or failed donation; refunded is debatable but skipped)
 *   - Donor + email must be on file
 *
 * Idempotency: Resend will deliver every time it's called. If the
 * trustee clicks twice, two emails arrive. UI surface should disable
 * the button while the request is in flight (which it does).
 *
 * Returns Resend's submission OK + the donation receipt number.
 */
export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = requireAdminAuth(request);
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const supabase = getSupabaseAdmin();

  // Pull the donation + joined donor in one query — avoids a second
  // round-trip and keeps the auth check tight. Donor address fields
  // included so the resent email's PDF attachment can populate the
  // address block (HMRC requires donor name + postcode for valid Gift
  // Aid records).
  const { data: donation, error } = await supabase
    .from("donations")
    .select(
      `id, amount_pence, campaign, campaign_label, frequency,
       gift_aid_claimed, completed_at, livemode, status,
       stripe_payment_intent_id, stripe_customer_id,
       donors(email, first_name, last_name,
              address_line1, address_line2, city, postcode)`
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !donation) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (donation.livemode !== true) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (donation.status !== "succeeded") {
    return NextResponse.json(
      { error: "Receipt can only be resent for succeeded donations." },
      { status: 400 }
    );
  }
  if (!donation.completed_at) {
    return NextResponse.json(
      { error: "Donation has no completion date — cannot build receipt." },
      { status: 400 }
    );
  }

  // PostgREST may return the joined `donors` object as either a single
  // object or an array depending on cardinality detection. Normalise.
  const rawDonor = donation.donors;
  const donor = Array.isArray(rawDonor) ? rawDonor[0] : rawDonor;
  if (!donor || !donor.email) {
    return NextResponse.json(
      { error: "Donor email not on file." },
      { status: 400 }
    );
  }

  const ok = await sendDonationReceipt({
    toEmail: donor.email,
    firstName: donor.first_name ?? "",
    lastName: donor.last_name ?? "",
    amountPence: donation.amount_pence,
    campaignLabel: donation.campaign_label,
    campaignSlug: donation.campaign,
    frequency: donation.frequency,
    giftAidClaimed: donation.gift_aid_claimed === true,
    paymentIntentId:
      (donation.stripe_payment_intent_id as string | null) ?? donation.id,
    completedAt: new Date(donation.completed_at as string),
    stripeCustomerId:
      (donation.stripe_customer_id as string | null) ?? undefined,
    // PDF receipt fields — same shape as the webhook caller. Resent
    // emails include the same PDF attachment the donor would have
    // received originally.
    donationId: donation.id as string,
    addressLine1: donor.address_line1 ?? null,
    addressLine2: donor.address_line2 ?? null,
    city: donor.city ?? null,
    postcode: donor.postcode ?? null,
  });

  if (!ok) {
    return NextResponse.json(
      {
        error:
          "Resend rejected the email. Check server logs and Resend dashboard.",
      },
      { status: 502 }
    );
  }

  await logAdminAction({
    action: "resend_receipt",
    userEmail: auth.email,
    targetId: donation.id as string,
    request,
    metadata: { sentTo: donor.email },
  });

  return NextResponse.json({
    ok: true,
    sentTo: donor.email,
    message: "Receipt re-sent successfully.",
  });
}
