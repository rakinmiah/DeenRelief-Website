/**
 * /donate/thank-you?payment_intent=... (one-time)
 * /donate/thank-you?setup_intent=...   (monthly)
 *
 * Stripe redirects here after stripe.confirmPayment() / stripe.confirmSetup()
 * resolves. We:
 *   1. Read payment_intent or setup_intent from the URL
 *   2. Retrieve the intent server-side (source of truth, can't spoof)
 *   3. Show a summary based on its status
 *
 * For monthly flows the actual charge happens asynchronously — the webhook
 * creates the Subscription on setup_intent.succeeded and the first charge
 * fires invoice.paid shortly after. This page shows "processing" for the
 * first few seconds until the DB row catches up, then the success state
 * once the donation is marked succeeded.
 *
 * noindex: we don't want these URLs (with intent IDs) in search results.
 */

import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { stripe } from "@/lib/stripe";
import { fromPence } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase";
import { totalWithGiftAidGbp } from "@/lib/gift-aid";
import TrackConversion from "./TrackConversion";

export const metadata: Metadata = {
  title: "Thank You | Deen Relief",
  robots: { index: false, follow: false },
};

interface ThankYouPageProps {
  searchParams: Promise<{
    payment_intent?: string;
    setup_intent?: string;
    redirect_status?: string;
  }>;
}

export default async function ThankYouPage({ searchParams }: ThankYouPageProps) {
  const params = await searchParams;
  const piId = params.payment_intent;
  const siId = params.setup_intent;

  let status: string | null = null;
  let amountGbp: number | null = null;
  let campaignSlug: string | null = null;
  let campaignLabel: string | null = null;
  let email: string | null = null;
  let giftAidClaimed = false;
  let isMonthly = false;
  let pathway: string | null = null;

  if (piId) {
    // ── One-time path ──
    try {
      const pi = await stripe.paymentIntents.retrieve(piId);
      status = pi.status;
      amountGbp = fromPence(pi.amount);
      campaignSlug = (pi.metadata?.campaign as string) ?? null;
      campaignLabel = (pi.metadata?.campaign_label as string) ?? null;
      email = pi.receipt_email ?? null;
      pathway = (pi.metadata?.pathway as string) ?? null;
    } catch (err) {
      console.error("[thank-you] PI retrieve failed:", err);
    }

    try {
      const supabase = getSupabaseAdmin();
      const { data } = await supabase
        .from("donations")
        .select("gift_aid_claimed")
        .eq("stripe_payment_intent_id", piId)
        .maybeSingle();
      giftAidClaimed = data?.gift_aid_claimed === true;
    } catch (err) {
      console.error("[thank-you] donation lookup failed:", err);
    }
  } else if (siId) {
    // ── Monthly path ──
    isMonthly = true;
    try {
      const si = await stripe.setupIntents.retrieve(siId);
      // SetupIntent.status succeeded means payment method attached; the
      // actual first charge (via Subscription) is async via webhook. We
      // still treat this as a donor success from the user's perspective.
      status = si.status;
      campaignSlug = (si.metadata?.campaign as string) ?? null;
      campaignLabel = (si.metadata?.campaign_label as string) ?? null;
      pathway = (si.metadata?.pathway as string) ?? null;
      const amountPence = si.metadata?.amount_pence ? Number(si.metadata.amount_pence) : null;
      amountGbp = amountPence ? fromPence(amountPence) : null;

      // Pull email + gift aid flag from the donation row we wrote in /confirm.
      const supabase = getSupabaseAdmin();
      const { data } = await supabase
        .from("donations")
        .select("gift_aid_claimed, donors(email)")
        .eq("stripe_setup_intent_id", siId)
        .maybeSingle();
      giftAidClaimed = data?.gift_aid_claimed === true;
      const donors = data?.donors as { email?: string } | { email?: string }[] | undefined;
      const donorRow = Array.isArray(donors) ? donors[0] : donors;
      email = donorRow?.email ?? null;
    } catch (err) {
      console.error("[thank-you] SI retrieve failed:", err);
    }
  }

  const succeeded = status === "succeeded";
  const processing =
    status === "processing" || status === "requires_capture";

  // Transaction id for the purchase event: PI id for one-time, SI id for
  // monthly. Only fire the conversion event on success — processing and
  // failed states aren't purchases. Build the props object here so
  // TypeScript can narrow all nullable fields in one place.
  const transactionId = piId ?? siId;
  const conversionProps =
    succeeded &&
    transactionId &&
    amountGbp !== null &&
    campaignSlug !== null &&
    campaignLabel !== null
      ? {
          transactionId,
          value: amountGbp,
          currency: "GBP" as const,
          campaignSlug,
          campaignLabel,
          frequency: (isMonthly ? "monthly" : "one-time") as "one-time" | "monthly",
          giftAidClaimed,
          email,
          pathway,
        }
      : null;

  return (
    <>
      <Header />
      <main id="main-content" className="flex-1">
        <section className="bg-cream pt-24 pb-16 md:pt-32 md:pb-24 min-h-[70vh]">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-black/5 p-8 sm:p-12 text-center">
              {succeeded ? (
                <SuccessState
                  amountGbp={amountGbp}
                  campaignLabel={campaignLabel}
                  email={email}
                  giftAidClaimed={giftAidClaimed}
                  isMonthly={isMonthly}
                />
              ) : processing ? (
                <ProcessingState amountGbp={amountGbp} email={email} />
              ) : (
                <FailedState status={status} />
              )}
            </div>
          </div>
        </section>
      </main>
      {conversionProps && <TrackConversion {...conversionProps} />}
      <Footer />
    </>
  );
}

function SuccessState({
  amountGbp,
  campaignLabel,
  email,
  giftAidClaimed,
  isMonthly,
}: {
  amountGbp: number | null;
  campaignLabel: string | null;
  email: string | null;
  giftAidClaimed: boolean;
  isMonthly: boolean;
}) {
  return (
    <>
      <div className="mx-auto w-16 h-16 rounded-full bg-green-light flex items-center justify-center mb-6">
        <svg className="w-8 h-8 text-green" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      </div>
      <span className="inline-block text-[11px] font-bold tracking-[0.1em] uppercase text-green mb-3">
        {isMonthly ? "Monthly Donation Set Up" : "Donation Received"}
      </span>
      <h1 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal leading-tight mb-4">
        Thank you for your generosity
      </h1>

      {amountGbp !== null && (
        <div className="my-6 inline-block px-6 py-4 bg-green-light rounded-xl">
          {campaignLabel && (
            <p className="text-[11px] font-bold tracking-[0.1em] uppercase text-green/70 mb-1">
              {campaignLabel}
            </p>
          )}
          <p className="text-3xl font-heading font-bold text-charcoal">
            £{amountGbp.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            {isMonthly && (
              <span className="text-base font-medium text-grey"> / month</span>
            )}
          </p>
          {giftAidClaimed && (
            <p className="text-[13px] text-green-dark font-medium mt-1">
              + £{(totalWithGiftAidGbp(amountGbp) - amountGbp).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Gift Aid reclaimed = £{totalWithGiftAidGbp(amountGbp).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} total
              {isMonthly ? " / month" : ""}
            </p>
          )}
        </div>
      )}

      <p className="text-grey text-base sm:text-[1.0625rem] leading-[1.7] mb-2 max-w-md mx-auto">
        {isMonthly
          ? "Your monthly donation is set up. Your first charge is processing now — a receipt will arrive shortly, and each following month."
          : "Your donation has been received and will go directly to the people who need it most."}
      </p>
      {email && (
        <p className="text-grey/70 text-sm mb-8">
          A receipt is on its way to <strong>{email}</strong>.
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
        <Link
          href="/"
          className="inline-flex items-center justify-center px-8 py-4 rounded-full bg-green text-white hover:bg-green-dark font-semibold shadow-sm text-base transition-colors duration-200"
        >
          Back to home
        </Link>
        <Link
          href="/blog"
          className="inline-flex items-center justify-center px-8 py-4 rounded-full border border-charcoal/15 text-charcoal hover:bg-charcoal/5 font-semibold text-base transition-colors duration-200"
        >
          Read our latest
        </Link>
      </div>
    </>
  );
}

function ProcessingState({
  amountGbp,
  email,
}: {
  amountGbp: number | null;
  email: string | null;
}) {
  return (
    <>
      <div className="mx-auto w-16 h-16 rounded-full bg-amber/20 flex items-center justify-center mb-6">
        <span className="inline-block w-8 h-8 border-2 border-amber-dark border-t-transparent rounded-full animate-spin" />
      </div>
      <h1 className="text-2xl sm:text-3xl font-heading font-bold text-charcoal leading-tight mb-3">
        Your donation is processing
      </h1>
      <p className="text-grey leading-relaxed mb-6">
        Some payment methods take a moment to confirm. We&apos;ll email
        {email ? <> <strong>{email}</strong></> : " you"} as soon as it clears.
      </p>
      {amountGbp !== null && (
        <p className="text-charcoal/70">
          Amount: <strong>£{amountGbp.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
        </p>
      )}
      <Link
        href="/"
        className="inline-flex items-center justify-center px-8 py-4 rounded-full border border-charcoal/15 text-charcoal hover:bg-charcoal/5 font-semibold text-base transition-colors duration-200 mt-6"
      >
        Back to home
      </Link>
    </>
  );
}

function FailedState({ status }: { status: string | null }) {
  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-heading font-bold text-charcoal leading-tight mb-3">
        Something went wrong
      </h1>
      <p className="text-grey leading-relaxed mb-6">
        Your donation could not be completed
        {status && status !== "null" ? ` (status: ${status})` : ""}. No money has
        been taken. Please try again, or contact us if the problem persists.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href="/donate"
          className="inline-flex items-center justify-center px-8 py-4 rounded-full bg-green text-white hover:bg-green-dark font-semibold shadow-sm text-base"
        >
          Try again
        </Link>
        <Link
          href="/contact"
          className="inline-flex items-center justify-center px-8 py-4 rounded-full border border-charcoal/15 text-charcoal hover:bg-charcoal/5 font-semibold text-base"
        >
          Contact us
        </Link>
      </div>
    </>
  );
}
