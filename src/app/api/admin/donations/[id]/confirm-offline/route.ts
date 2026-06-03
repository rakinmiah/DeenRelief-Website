import { NextResponse } from "next/server";
import { requireRoleAdminAuth } from "@/lib/admin-auth";
import { logAdminAction } from "@/lib/admin-audit";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/donations/[id]/confirm-offline
 *
 * Confirms an OFFLINE Gift Aid donation (submitted via /gift-aid) once
 * the admin has verified the money actually arrived (e.g. checked the
 * bank statement). Flips status 'pending' → 'succeeded', at which point
 * it counts as income and becomes eligible for the Gift Aid HMRC export.
 *
 * Guarded to only act on source='offline', status='pending' rows so it
 * can never silently change a normal Stripe donation.
 */
export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = requireRoleAdminAuth(request);
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const supabase = getSupabaseAdmin();

  const { data: donation, error } = await supabase
    .from("donations")
    .select("id, status, source, livemode, amount_pence, campaign_label")
    .eq("id", id)
    .maybeSingle();

  if (error || !donation || donation.livemode !== true) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (donation.source !== "offline") {
    return NextResponse.json(
      { error: "This isn't an offline donation." },
      { status: 400 }
    );
  }
  if (donation.status === "succeeded") {
    return NextResponse.json({ ok: true, alreadyConfirmed: true });
  }
  if (donation.status !== "pending") {
    return NextResponse.json(
      { error: `Cannot confirm a donation with status '${donation.status}'.` },
      { status: 400 }
    );
  }

  const { error: updErr } = await supabase
    .from("donations")
    .update({ status: "succeeded", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("source", "offline")
    .eq("status", "pending");

  if (updErr) {
    console.error(`[confirm-offline] update failed for ${id}:`, updErr);
    return NextResponse.json({ error: "Couldn't confirm — try again." }, { status: 500 });
  }

  await logAdminAction({
    action: "confirm_offline_donation",
    userEmail: auth.email,
    targetId: id,
    request,
    metadata: {
      amountPence: donation.amount_pence,
      campaignLabel: donation.campaign_label,
    },
  });

  return NextResponse.json({ ok: true });
}
