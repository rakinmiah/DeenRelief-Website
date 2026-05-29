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
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-2xl font-heading font-bold text-charcoal mb-1">
        Your account
      </h1>
      <p className="text-sm text-grey mb-8">
        {profile?.full_name || user.email}
        {profile?.contact_email ? ` · ${profile.contact_email}` : ""}
      </p>

      <AccountClient
        marketingConsent={Boolean(profile?.marketing_consent)}
        hasPendingErasure={hasPendingErasure}
      />
    </div>
  );
}
