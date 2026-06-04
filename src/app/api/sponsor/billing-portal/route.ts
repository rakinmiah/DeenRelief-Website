import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createServerSupabase, getSponsorUser } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

/**
 * GET /api/sponsor/billing-portal
 *
 * Opens a Stripe-hosted Billing Portal session for the signed-in sponsor so
 * they can self-manage their sponsorship: update card, change/cancel the
 * monthly amount, and view billing history — no custom billing UI needed.
 *
 * The sponsor is already authenticated (Supabase), so we use their
 * sponsor_profiles.stripe_customer_id directly (no signed token like the
 * public /manage flow). Same Stripe pattern as /manage otherwise.
 *
 * Note: the donation flow creates a fresh Stripe Customer per checkout, so a
 * donor who started multiple sponsorships at different times may have more
 * than one customer; this opens the one captured at onboarding (their primary
 * sponsorship). A future improvement could consolidate customers per donor.
 */
export async function GET(request: Request) {
  const origin = new URL(request.url).origin;

  const user = await getSponsorUser();
  if (!user) {
    return NextResponse.redirect(new URL("/sponsor/login", origin));
  }

  // RLS lets a sponsor read their own profile row.
  const supabase = await createServerSupabase();
  const { data: profile } = await supabase
    .from("sponsor_profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  const customerId = profile?.stripe_customer_id as string | undefined;
  if (!customerId) {
    return NextResponse.redirect(
      new URL("/sponsor/account?billing=none", origin)
    );
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/sponsor/account`,
    });
    return NextResponse.redirect(session.url);
  } catch (err) {
    console.error("[sponsor/billing-portal] session create failed:", err);
    return NextResponse.redirect(
      new URL("/sponsor/account?billing=error", origin)
    );
  }
}
