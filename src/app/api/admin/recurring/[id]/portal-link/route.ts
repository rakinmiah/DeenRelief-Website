import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { logAdminAction } from "@/lib/admin-audit";
import { getSupabaseAdmin } from "@/lib/supabase";
import { signManageToken } from "@/lib/signed-token";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/recurring/[id]/portal-link
 *
 * Generates a signed donor self-service link the trustee can copy and
 * email to the donor. The link routes to /manage?token=... which:
 *   1. Verifies the HMAC signature
 *   2. Creates a Stripe Billing Portal session bound to the customer
 *   3. Redirects to the Stripe-hosted portal (update card, cancel, etc.)
 *
 * Same signed-token mechanism that's used in the monthly receipt email
 * — re-using here keeps a single source of truth for donor portal access.
 *
 * Auth: requires admin session (cookie or bearer token).
 *
 * The returned URL is valid for 90 days (default TTL of signManageToken).
 */
export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = requireAdminAuth(request);
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;

  // Look up the donation row to get the Stripe customer id. We don't
  // accept a customer id from the request body — that would let an
  // attacker with admin auth generate links for arbitrary customers.
  // Instead the trustee must navigate to a specific donation row,
  // which carries its own livemode / DB-existence check.
  const supabase = getSupabaseAdmin();
  const { data: row, error } = await supabase
    .from("donations")
    .select("stripe_customer_id, livemode")
    .eq("id", id)
    .maybeSingle();

  if (error || !row) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (row.livemode !== true) {
    // Defence-in-depth — never sign portal tokens for test-mode rows.
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (!row.stripe_customer_id) {
    return NextResponse.json(
      { error: "No Stripe customer on this donation — cannot generate portal link." },
      { status: 400 }
    );
  }

  let token: string;
  try {
    token = signManageToken(row.stripe_customer_id as string);
  } catch {
    // signManageToken throws when APP_SECRET isn't configured.
    return NextResponse.json(
      { error: "Server not configured for portal links." },
      { status: 500 }
    );
  }

  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://deenrelief.org";
  const url = `${origin}/manage?token=${encodeURIComponent(token)}`;

  await logAdminAction({
    action: "send_portal_link",
    userEmail: auth.email,
    targetId: id,
    request,
    metadata: { stripeCustomerId: row.stripe_customer_id },
  });

  return NextResponse.json({ ok: true, url });
}
