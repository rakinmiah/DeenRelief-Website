import type { Metadata } from "next";
import LoginFormClient from "./LoginFormClient";

export const metadata: Metadata = {
  title: "Sign in | Deen Relief Admin",
  robots: { index: false, follow: false },
};

/**
 * Admin sign-in page.
 *
 * Credentials-based auth (not magic links) because admin users:
 *   - Are a small known set (trustees + a few staff)
 *   - Sign in regularly enough that password isn't forgotten
 *   - Need an audit trail tied to credentials, not "anyone with email
 *     access can sign in" (which a magic link effectively is)
 *
 * Production wiring: LoginFormClient calls supabase.auth.signInWithPassword.
 * Server-side, the admin layout checks the resulting session against
 * an `admin_users` table and rejects non-admin authenticated users.
 *
 * Mockup: the form accepts any credentials and routes to /admin/donations.
 * No real auth happens. The pitch banner makes this explicit.
 */
export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="block text-[11px] font-bold tracking-[0.2em] uppercase text-amber-dark mb-2">
            Deen Relief
          </span>
          <h1 className="text-3xl font-heading font-bold text-charcoal">
            Admin sign-in
          </h1>
          <p className="text-grey text-sm mt-2">
            For trustees and authorised staff only.
          </p>
        </div>

        <div className="bg-white border border-charcoal/10 rounded-2xl p-7 shadow-sm">
          <LoginFormClient />
        </div>

        <div className="mt-6 p-4 bg-amber-light border border-amber/30 rounded-xl text-[12px] text-charcoal/80 leading-relaxed">
          <span className="block text-[10px] font-bold uppercase tracking-[0.15em] text-amber-dark mb-1">
            Pitch preview
          </span>
          Any credentials let you in. Real version uses Supabase Auth
          with email + password, scoped to an{" "}
          <code className="text-[11px]">admin_users</code> allow-list.
          Sessions expire after 8 hours of inactivity.
        </div>

        <p className="mt-6 text-center text-[11px] text-charcoal/40">
          Trouble signing in?{" "}
          <a
            href="mailto:tech@deenrelief.org"
            className="underline hover:text-charcoal/60"
          >
            tech@deenrelief.org
          </a>
        </p>
      </div>
    </div>
  );
}
