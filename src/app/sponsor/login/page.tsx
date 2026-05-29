import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSponsorUser } from "@/lib/supabase-server";
import LoginClient from "./LoginClient";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function SponsorLoginPage() {
  // Already signed in → straight to the dashboard.
  const user = await getSponsorUser();
  if (user) redirect("/sponsor/dashboard");

  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 py-14">
      <h1 className="text-2xl font-heading font-bold text-charcoal mb-1">
        Sign in
      </h1>
      <p className="text-sm text-grey mb-7">
        Access updates about the child you sponsor.
      </p>
      <LoginClient />
    </div>
  );
}
