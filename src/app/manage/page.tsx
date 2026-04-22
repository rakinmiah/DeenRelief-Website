/**
 * /manage?token=...
 *
 * Password-less donor self-service entry point. Linked from the monthly
 * receipt email. Flow:
 *   1. Verify the HMAC-signed token
 *   2. Create a Stripe Billing Portal session bound to the token's customer
 *   3. Redirect to the Stripe-hosted portal (cancel / update card / etc.)
 *
 * After the donor is done in the portal, Stripe redirects them back to
 * /manage/done.
 *
 * Security: invalid / expired / tampered tokens render an error page with
 * a contact fallback. Never leaks customer data in the error state.
 */

import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { stripe } from "@/lib/stripe";
import { verifyManageToken } from "@/lib/signed-token";

export const metadata: Metadata = {
  title: "Manage Your Donation | Deen Relief",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

interface ManagePageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function ManagePage({ searchParams }: ManagePageProps) {
  const { token } = await searchParams;

  if (!token) return <ExpiredOrInvalid reason="missing" />;

  const payload = verifyManageToken(token);
  if (!payload) return <ExpiredOrInvalid reason="invalid" />;

  // Build the return URL — where Stripe sends the donor after they're
  // done in the portal. Use the current deployment origin.
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://deenrelief.org";

  let portalUrl: string;
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: payload.cus,
      return_url: `${origin}/manage/done`,
    });
    portalUrl = session.url;
  } catch (err) {
    console.error("[manage] Billing portal session create failed:", err);
    return <PortalError />;
  }

  // Server redirect to Stripe's hosted portal. This is a 307 — the donor
  // never sees /manage's HTML.
  redirect(portalUrl);
}

function ExpiredOrInvalid({ reason }: { reason: "missing" | "invalid" }) {
  return (
    <>
      <Header />
      <main id="main-content" className="flex-1">
        <section className="bg-cream pt-24 pb-16 md:pt-32 md:pb-24 min-h-[60vh]">
          <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-black/5 p-8 sm:p-12 text-center">
              <h1 className="text-2xl sm:text-3xl font-heading font-bold text-charcoal mb-4">
                {reason === "missing" ? "Link missing token" : "This link has expired"}
              </h1>
              <p className="text-grey leading-relaxed mb-6">
                {reason === "missing"
                  ? "This page needs a valid management token. Please open the link from your most recent donation receipt email."
                  : "For security, donation management links expire after 90 days or if they've been tampered with. Open the link in your most recent receipt email, or email us and we'll help."}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="mailto:info@deenrelief.org?subject=Manage%20my%20donation"
                  className="inline-flex items-center justify-center px-8 py-4 rounded-full bg-green text-white hover:bg-green-dark font-semibold text-base transition-colors duration-200"
                >
                  Email us
                </Link>
                <Link
                  href="/"
                  className="inline-flex items-center justify-center px-8 py-4 rounded-full border border-charcoal/15 text-charcoal hover:bg-charcoal/5 font-semibold text-base transition-colors duration-200"
                >
                  Back to home
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function PortalError() {
  return (
    <>
      <Header />
      <main id="main-content" className="flex-1">
        <section className="bg-cream pt-24 pb-16 md:pt-32 md:pb-24 min-h-[60vh]">
          <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-black/5 p-8 sm:p-12 text-center">
              <h1 className="text-2xl sm:text-3xl font-heading font-bold text-charcoal mb-4">
                Could not open the management portal
              </h1>
              <p className="text-grey leading-relaxed mb-6">
                Something went wrong on our side. Please email{" "}
                <a href="mailto:info@deenrelief.org" className="text-green underline">
                  info@deenrelief.org
                </a>{" "}
                and we&apos;ll sort it out right away.
              </p>
              <Link
                href="/"
                className="inline-flex items-center justify-center px-8 py-4 rounded-full border border-charcoal/15 text-charcoal hover:bg-charcoal/5 font-semibold text-base transition-colors duration-200"
              >
                Back to home
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
