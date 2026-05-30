import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSponsorUser } from "@/lib/supabase-server";
import MfaChallengeClient from "./MfaChallengeClient";

export const metadata: Metadata = { title: "Verify it's you" };
export const dynamic = "force-dynamic";

/**
 * Second-factor (TOTP) challenge. Sponsors with MFA enabled land here after
 * entering their password — they must enter a code to finish signing in.
 * NOTE: this page deliberately uses getSponsorUser, not requireSponsor, so it
 * doesn't redirect back to itself.
 */
export default async function SponsorMfaPage() {
  const user = await getSponsorUser();
  if (!user) redirect("/sponsor/login");

  return (
    <section className="bg-cream">
      <div className="max-w-md mx-auto px-4 sm:px-6 py-16 md:py-24">
        <div className="text-center mb-8">
          <span className="inline-block text-[11px] font-bold tracking-[0.1em] uppercase text-green mb-3">
            Two-factor authentication
          </span>
          <h1 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal leading-tight mb-2">
            Verify it&apos;s you
          </h1>
          <p className="text-grey text-base leading-[1.7]">
            Enter the 6-digit code from your authenticator app to finish signing
            in.
          </p>
        </div>
        <div className="bg-white border border-charcoal/5 rounded-2xl shadow-sm p-6 sm:p-8">
          <MfaChallengeClient />
        </div>
      </div>
    </section>
  );
}
