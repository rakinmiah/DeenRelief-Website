import Link from "next/link";
import type { Metadata } from "next";
import { createServerSupabase, requireSponsor } from "@/lib/supabase-server";
import { getSponsorById } from "@/lib/sponsorship-admin";
import AccountClient from "./AccountClient";
import SecurityClient from "./SecurityClient";
import MfaClient from "./MfaClient";

export const metadata: Metadata = { title: "Your account" };
export const dynamic = "force-dynamic";

export default async function SponsorAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ billing?: string }>;
}) {
  const user = await requireSponsor();
  const { billing } = await searchParams;

  const sponsor = await getSponsorById(user.id);
  const hasBilling = Boolean(sponsor?.stripeCustomerId);
  const email = sponsor?.contactEmail || user.email || "";

  const supabase = await createServerSupabase();
  const { data: openRequests } = await supabase
    .from("sponsor_data_requests")
    .select("request_type, status")
    .eq("status", "pending");
  const hasPendingErasure = (openRequests ?? []).some(
    (r) => r.request_type === "erasure"
  );

  return (
    <section className="bg-white">
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-12 md:py-16">
        <div className="mb-10">
          <span className="inline-block text-[11px] font-bold tracking-[0.1em] uppercase text-green mb-3">
            Account settings
          </span>
          <h1 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal leading-tight mb-2">
            Account &amp; security
          </h1>
          <p className="text-grey text-base">
            Your personal details and giving are in{" "}
            <Link href="/sponsor/profile" className="text-green hover:underline">
              your profile
            </Link>
            .
          </p>
        </div>

        <div className="space-y-6">
          {/* Sign-in & security (password, sessions, 2FA in one card) */}
          <section className="rounded-2xl border border-charcoal/5 bg-white shadow-sm p-6">
            <SecurityClient
              email={email}
              lastSignInAt={user.last_sign_in_at ?? null}
            />
            <MfaClient />
          </section>

          {/* Billing self-service via the Stripe-hosted portal */}
          <section className="rounded-2xl border border-charcoal/5 bg-white shadow-sm p-6">
            <h2 className="font-heading font-bold text-lg text-charcoal mb-2">
              Manage your sponsorship
            </h2>
            {billing === "error" && (
              <p className="mb-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3.5 py-2.5">
                Sorry — we couldn&apos;t open the billing portal just then.
                Please try again, or email us.
              </p>
            )}
            {billing === "none" && (
              <p className="mb-3 rounded-lg bg-amber-light/60 border border-amber/30 text-amber-dark text-sm px-3.5 py-2.5">
                We don&apos;t have payment details linked to your account yet.
                Email us and we&apos;ll help.
              </p>
            )}
            <p className="text-sm text-grey mb-5 leading-[1.7]">
              Update your card, change or pause your monthly amount, view your
              payment history, and download receipts — all in our secure payment
              portal.
            </p>
            {hasBilling ? (
              <a
                href="/api/sponsor/billing-portal"
                className="inline-flex items-center justify-center px-5 py-2.5 text-sm rounded-full bg-green text-white font-semibold shadow-sm hover:bg-green-dark transition-colors"
              >
                Manage billing &amp; payments
              </a>
            ) : (
              <a
                href="mailto:info@deenrelief.org?subject=Manage%20my%20sponsorship"
                className="inline-flex items-center justify-center px-5 py-2.5 text-sm rounded-full border border-charcoal/15 text-charcoal/80 font-medium hover:border-green hover:text-green transition-colors"
              >
                Contact us about billing
              </a>
            )}
          </section>

          {/* Email preferences + data controls */}
          <AccountClient
            marketingConsent={Boolean(sponsor?.marketingConsent)}
            notifyNewUpdate={sponsor?.notifyNewUpdate !== false}
            hasPendingErasure={hasPendingErasure}
          />
        </div>
      </div>
    </section>
  );
}
