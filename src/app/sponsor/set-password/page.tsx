import type { Metadata } from "next";
import SetPasswordClient from "./SetPasswordClient";

export const metadata: Metadata = { title: "Set your password" };
export const dynamic = "force-dynamic";

export default function SetPasswordPage() {
  // Session detection happens client-side: the activation link may deliver
  // the token in the URL hash (implicit/recovery links) OR as a cookie set by
  // the callback route (token_hash links). The client handles both.
  return (
    <section className="bg-cream">
      <div className="max-w-md mx-auto px-4 sm:px-6 py-16 md:py-24">
        <div className="text-center mb-8">
          <span className="inline-block text-[11px] font-bold tracking-[0.1em] uppercase text-green mb-3">
            Welcome to Deen Relief
          </span>
          <h1 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal leading-tight mb-2">
            Activate your account
          </h1>
          <p className="text-grey text-base leading-[1.7]">
            Set a password to finish setting up your sponsor account.
          </p>
        </div>
        <div className="bg-white border border-charcoal/5 rounded-2xl shadow-sm p-6 sm:p-8">
          <SetPasswordClient />
        </div>
      </div>
    </section>
  );
}
