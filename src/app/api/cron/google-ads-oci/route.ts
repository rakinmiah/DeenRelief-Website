/**
 * GET /api/cron/google-ads-oci
 *
 * Uploads succeeded donations to Google Ads as Offline Conversions so
 * Smart Bidding trains on *actual* donation value (not gross click intent)
 * and so keyword-level ROAS reports reflect real revenue.
 *
 * Consent-gated:
 *   - Only uploads donations where ad_storage_consent = true at conversion
 *     time (Google policy + PECR).
 *   - Includes hashed email as an Enhanced Conversions user identifier
 *     only when ad_user_data_consent = true.
 *
 * Idempotent:
 *   - Marks donations.google_ads_uploaded_at on success, so subsequent
 *     runs skip them.
 *   - Also passes orderId = Stripe PI/SI ID; Google uses that to de-dupe
 *     server-side as a second safety net.
 *
 * Auth: Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. Any other
 * caller is rejected.
 *
 * Activation: requires all six GOOGLE_ADS_* env vars. Without them the
 * route logs + returns { skipped: true } — safe to deploy pre-vetting.
 */

import { NextResponse } from "next/server";
import { requireCronAuth } from "@/lib/admin-auth";
import {
  getGoogleAdsEnv,
  hashForEnhancedConversion,
  isGoogleAdsConfigured,
  uploadClickConversions,
  type ClickConversionInput,
} from "@/lib/google-ads";
import { getSupabaseAdmin } from "@/lib/supabase";
import { fromPence } from "@/lib/stripe";

export const dynamic = "force-dynamic";

/** Batch cap per run. 500 leaves headroom under Google's 2000 limit. */
const BATCH_SIZE = 500;

interface PendingRow {
  id: string;
  amount_pence: number;
  currency: string;
  completed_at: string;
  gclid: string;
  stripe_payment_intent_id: string | null;
  stripe_setup_intent_id: string | null;
  frequency: "one-time" | "monthly";
  ad_user_data_consent: boolean | null;
  donors: { email: string | null } | { email: string | null }[] | null;
}

export async function GET(request: Request) {
  const auth = requireCronAuth(request);
  if (!auth.ok) return auth.response;

  if (!isGoogleAdsConfigured()) {
    console.log("[cron/google-ads-oci] GOOGLE_ADS_* not fully configured — skipping.");
    return NextResponse.json({ skipped: true, reason: "Google Ads env vars not set." });
  }

  const env = getGoogleAdsEnv()!;
  const supabase = getSupabaseAdmin();

  // Pull donations that are succeeded, have a gclid, had ad_storage consent,
  // and haven't been uploaded yet. Joined with donors so we can hash email
  // for Enhanced Conversions in one shot.
  const { data: rows, error } = await supabase
    .from("donations")
    .select(
      `id, amount_pence, currency, completed_at, gclid,
       stripe_payment_intent_id, stripe_setup_intent_id, frequency,
       ad_user_data_consent,
       donors(email)`
    )
    .eq("status", "succeeded")
    .eq("ad_storage_consent", true)
    .not("gclid", "is", null)
    .is("google_ads_uploaded_at", null)
    .order("completed_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (error) {
    console.error("[cron/google-ads-oci] Query failed:", error);
    return NextResponse.json({ error: "Query failed." }, { status: 500 });
  }

  if (!rows || rows.length === 0) {
    return NextResponse.json({ uploaded: 0, skipped: 0, failed: 0, reason: "No pending rows." });
  }

  // Build the ClickConversion payload, one per donation row.
  const conversions: ClickConversionInput[] = [];
  const rowByOrderId = new Map<string, PendingRow>();

  for (const raw of rows as unknown as PendingRow[]) {
    // Order ID: use whichever intent id is present. De-dupes server-side.
    const orderId = raw.stripe_payment_intent_id ?? raw.stripe_setup_intent_id;
    if (!orderId) continue; // defensive — shouldn't happen

    // Extract donor email. Supabase returns the join as an object or array
    // depending on the relationship cardinality.
    const donor = Array.isArray(raw.donors) ? raw.donors[0] : raw.donors;
    const email = donor?.email ?? null;

    const userIdentifiers: ClickConversionInput["userIdentifiers"] = [];
    // Enhanced Conversions — only include when the donor consented to
    // ad_user_data. Without consent, we still do OCI (gclid + amount)
    // but without the identifier, which hurts match rate but stays legal.
    if (raw.ad_user_data_consent === true) {
      const hashedEmail = hashForEnhancedConversion(email);
      if (hashedEmail) userIdentifiers.push({ hashedEmail });
    }

    conversions.push({
      gclid: raw.gclid,
      conversionDateTime: toGoogleDateTime(raw.completed_at),
      conversionValue: fromPence(raw.amount_pence),
      currencyCode: raw.currency || "GBP",
      orderId,
      ...(userIdentifiers.length > 0 ? { userIdentifiers } : {}),
    });
    rowByOrderId.set(orderId, raw);
  }

  if (conversions.length === 0) {
    return NextResponse.json({ uploaded: 0, skipped: rows.length, failed: 0, reason: "No usable rows." });
  }

  // ── Upload ──
  let result;
  try {
    result = await uploadClickConversions(env, conversions);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[cron/google-ads-oci] Upload threw:", msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  // ── Mark uploaded / record errors ──
  const uploadedAt = new Date().toISOString();
  const failureByOrderId = new Map(result.failures.map((f) => [f.orderId, f.message]));

  for (const c of conversions) {
    const row = rowByOrderId.get(c.orderId);
    if (!row) continue;
    const failure = failureByOrderId.get(c.orderId);
    if (failure) {
      // Record the error but leave google_ads_uploaded_at NULL so the
      // next cron retries.
      await supabase
        .from("donations")
        .update({ google_ads_upload_error: failure })
        .eq("id", row.id);
    } else {
      await supabase
        .from("donations")
        .update({
          google_ads_uploaded_at: uploadedAt,
          google_ads_upload_error: null,
        })
        .eq("id", row.id);
    }
  }

  console.log(
    `[cron/google-ads-oci] Uploaded ${result.uploaded} / ${conversions.length}, failures: ${result.failures.length}`
  );

  return NextResponse.json({
    uploaded: result.uploaded,
    failed: result.failures.length,
    skipped: rows.length - conversions.length,
    // Surface failure messages in the response for easier debugging via
    // Vercel's cron log — don't leak PII because we only pass orderIds.
    failures: result.failures,
  });
}

/**
 * Format a timestamp the way Google's API wants it:
 * "YYYY-MM-DD HH:MM:SS+ZZ:ZZ" — NOT ISO 8601 with a "T". Accepts an ISO
 * input and returns the oddball format.
 */
function toGoogleDateTime(iso: string): string {
  // Use UTC for consistency; donations.completed_at is already stored UTC.
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  const yyyy = d.getUTCFullYear();
  const mm = pad(d.getUTCMonth() + 1);
  const dd = pad(d.getUTCDate());
  const hh = pad(d.getUTCHours());
  const mi = pad(d.getUTCMinutes());
  const ss = pad(d.getUTCSeconds());
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}+00:00`;
}
