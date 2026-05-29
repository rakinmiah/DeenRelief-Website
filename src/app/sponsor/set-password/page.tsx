import type { Metadata } from "next";
import { getSponsorUser } from "@/lib/supabase-server";
import SetPasswordClient from "./SetPasswordClient";

export const metadata: Metadata = { title: "Set your password" };
export const dynamic = "force-dynamic";

export default async function SetPasswordPage() {
  // The callback route verifies the invite/recovery link and sets the session
  // cookie before redirecting here, so the check is server-side (reliable)
  // rather than depending on the browser client seeing the session.
  const user = await getSponsorUser();

  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 py-14">
      <h1 className="text-2xl font-heading font-bold text-charcoal mb-1">
        Activate your account
      </h1>
      <p className="text-sm text-grey mb-7">
        Set a password to finish setting up your sponsor account.
      </p>
      <SetPasswordClient authed={!!user} />
    </div>
  );
}
