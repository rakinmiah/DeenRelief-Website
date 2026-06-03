import { NextResponse } from "next/server";
import sanitizeHtml from "sanitize-html";
import { getSupabaseAdmin } from "@/lib/supabase";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { clientIpFromRequest } from "@/lib/admin-audit";
import { enqueueNotification } from "@/lib/admin-notifications";
import {
  isValidCampaign,
  getCampaignLabel,
  MIN_AMOUNT_PENCE,
  MAX_AMOUNT_PENCE,
} from "@/lib/campaigns";
import { buildDeclarationText, GIFT_AID_SCOPE } from "@/lib/gift-aid";

/**
 * POST /api/gift-aid-declaration
 *
 * Public endpoint behind the shareable /gift-aid form. A donor who gave
 * OFFLINE (bank transfer / cash) submits their Gift Aid declaration +
 * the gift details. We:
 *   1. upsert the donor (their declaration address is the Gift Aid one),
 *   2. record a gift_aid_declaration (verbatim HMRC wording + IP/UA),
 *   3. create a donation row marked source='offline', status='pending'.
 *
 * The donation is PENDING on purpose: it does not count as income and is
 * NOT in the Gift Aid HMRC export until an admin confirms the money
 * actually arrived (status → 'succeeded') from the DR Admin donation
 * page. This stops a public form from injecting fake claimable gifts.
 *
 * An admin notification fires so the review queue is visible.
 */

const clean = (v: unknown): string =>
  sanitizeHtml(String(v ?? ""), { allowedTags: [], allowedAttributes: {} }).trim();

export async function POST(request: Request) {
  const rl = await checkRateLimit(request, "gift-aid-offline");
  if (!rl.success) return rateLimitResponse(rl);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const fullName = clean(body.fullName);
  const email = clean(body.email).toLowerCase();
  const phone = clean(body.phone) || null;
  const addressLine1 = clean(body.addressLine1);
  const addressLine2 = clean(body.addressLine2) || null;
  const city = clean(body.city) || null;
  const postcode = clean(body.postcode).toUpperCase();
  const country = clean(body.country) || "GB";
  const campaign = clean(body.campaign);
  const amountGbp = Number(body.amountGbp);
  const donationDate = clean(body.donationDate); // YYYY-MM-DD
  const confirmed = body.confirmed === true;

  // ── Validation ──
  if (!fullName) return bad("Please enter your full name.");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return bad("Please enter a valid email.");
  if (!addressLine1) return bad("Your home address is required for Gift Aid.");
  if (!postcode) return bad("Your postcode is required for Gift Aid.");
  if (!isValidCampaign(campaign)) return bad("Please choose a cause.");
  if (!Number.isFinite(amountGbp)) return bad("Please enter the donation amount.");
  const amountPence = Math.round(amountGbp * 100);
  if (amountPence < MIN_AMOUNT_PENCE) return bad("Minimum amount is £5.");
  if (amountPence > MAX_AMOUNT_PENCE) return bad("That amount looks too large — contact us instead.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(donationDate)) return bad("Please enter the donation date.");
  const date = new Date(`${donationDate}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return bad("Please enter a valid donation date.");
  if (date.getTime() > Date.now() + 24 * 60 * 60 * 1000) return bad("The donation date can't be in the future.");
  if (!confirmed) return bad("Please confirm the Gift Aid declaration to continue.");

  const [first, ...rest] = fullName.split(/\s+/);
  const lastName = rest.join(" ");
  const ip = clientIpFromRequest(request);
  const userAgent = request.headers.get("user-agent");
  const supabase = getSupabaseAdmin();

  // 1. Upsert donor — their declaration address is the authoritative
  //    Gift Aid address.
  const { data: donor, error: donorErr } = await supabase
    .from("donors")
    .upsert(
      {
        email,
        full_name: fullName,
        first_name: first || fullName,
        last_name: lastName || "",
        address_line1: addressLine1,
        address_line2: addressLine2,
        city,
        postcode,
        country,
        phone,
      },
      { onConflict: "email" }
    )
    .select("id")
    .single();
  if (donorErr || !donor) {
    console.error("[gift-aid] donor upsert failed:", donorErr);
    return bad("Something went wrong saving your details. Please try again.", 500);
  }

  // 2. Record the declaration (HMRC audit trail).
  const { data: declaration, error: declErr } = await supabase
    .from("gift_aid_declarations")
    .insert({
      donor_id: donor.id,
      scope: GIFT_AID_SCOPE,
      declaration_text: buildDeclarationText(amountGbp),
      ip_address: ip,
      user_agent: userAgent,
    })
    .select("id")
    .single();
  if (declErr || !declaration) {
    console.error("[gift-aid] declaration insert failed:", declErr);
    return bad("Something went wrong. Please try again.", 500);
  }

  // 3. Create the pending offline donation.
  const campaignLabel = getCampaignLabel(campaign);
  const { data: donation, error: donErr } = await supabase
    .from("donations")
    .insert({
      donor_id: donor.id,
      gift_aid_declaration_id: declaration.id,
      campaign,
      campaign_label: campaignLabel,
      amount_pence: amountPence,
      currency: "GBP",
      frequency: "one-time",
      gift_aid_claimed: true,
      status: "pending",
      source: "offline",
      livemode: true,
      completed_at: date.toISOString(),
    })
    .select("id")
    .single();
  if (donErr || !donation) {
    console.error("[gift-aid] donation insert failed:", donErr);
    return bad("Something went wrong. Please try again.", 500);
  }

  // Notify admins to confirm the money arrived.
  await enqueueNotification({
    type: "donation_offline_pending",
    severity: "warning",
    title: `Offline Gift Aid — £${amountGbp.toLocaleString("en-GB")} (confirm)`,
    body: `${fullName} · ${campaignLabel} · bank transfer — confirm it arrived to claim Gift Aid.`,
    targetUrl: `/admin/donations/${donation.id}`,
    targetId: donation.id,
  });

  return NextResponse.json({ ok: true });
}

function bad(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}
