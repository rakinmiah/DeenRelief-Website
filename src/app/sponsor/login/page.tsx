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
    <section className="bg-cream">
      <div className="max-w-md mx-auto px-4 sm:px-6 py-16 md:py-24">
        <div className="text-center mb-8">
          <span className="inline-block text-[11px] font-bold tracking-[0.1em] uppercase text-green mb-3">
            Sponsor account
          </span>
          <h1 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal leading-tight mb-2">
            Welcome back
          </h1>
          <p className="text-grey text-base leading-[1.7]">
            Sign in to follow the child you sponsor.
          </p>
        </div>
        <div className="bg-white border border-charcoal/5 rounded-2xl shadow-sm p-6 sm:p-8">
          <LoginClient />
        </div>
      </div>
    </section>
  );
}
