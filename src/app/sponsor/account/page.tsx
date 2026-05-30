import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createServerSupabase, getSponsorUser } from "@/lib/supabase-server";
import AccountClient from "./AccountClient";

export const metadata: Metadata = { title: "Your account" };
export const dynamic = "force-dynamic";

export default async function SponsorAccountPage() {
  const user = await getSponsorUser();
  if (!user) redirect("/sponsor/login");

  const supabase = await createServerSupabase();
  const { data: profile } = await supabase
    .from("sponsor_profiles")
    .select("full_name, contact_email, marketing_consent")
    .eq("id", user.id)
    .maybeSingle();

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
            Your account
          </span>
          <h1 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal leading-tight mb-2">
            {profile?.full_name || "Account settings"}
          </h1>
          <p className="text-grey text-base">
            {profile?.contact_email || user.email}
          </p>
        </div>

        <AccountClient
          marketingConsent={Boolean(profile?.marketing_consent)}
          hasPendingErasure={hasPendingErasure}
        />
      </div>
    </section>
  );
}
