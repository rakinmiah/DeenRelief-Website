import type { Metadata } from "next";
import SetPasswordClient from "./SetPasswordClient";

export const metadata: Metadata = { title: "Set your password" };
export const dynamic = "force-dynamic";

export default function SetPasswordPage() {
  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 py-14">
      <h1 className="text-2xl font-heading font-bold text-charcoal mb-1">
        Activate your account
      </h1>
      <p className="text-sm text-grey mb-7">
        Set a password to finish setting up your sponsor account.
      </p>
      <SetPasswordClient />
    </div>
  );
}
