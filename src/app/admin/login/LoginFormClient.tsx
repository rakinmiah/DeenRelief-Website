"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Sign-in form. POSTs to /api/admin/login which validates against
 * ADMIN_ALLOWED_EMAILS + ADMIN_LOGIN_PASSPHRASE and sets the
 * dr_admin_session cookie on success.
 *
 * Error UX: any 401 returns the same generic "Invalid credentials"
 * message (we don't differentiate "wrong email" from "wrong passphrase"
 * to avoid revealing which admin emails exist).
 */
export default function LoginFormClient() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, passphrase }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Invalid credentials.");
      }
      // Cookie is now set by the server. Navigate into the admin.
      router.push("/admin/donations");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div
          role="alert"
          className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm"
        >
          {error}
        </div>
      )}

      <div>
        <label
          htmlFor="email"
          className="block text-xs font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-1.5"
        >
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-4 py-3 rounded-xl bg-cream border border-charcoal/10 focus:border-charcoal/30 focus:outline-none focus:ring-2 focus:ring-charcoal/10 text-charcoal text-sm"
          placeholder="trustee@deenrelief.org"
        />
      </div>

      <div>
        <label
          htmlFor="passphrase"
          className="block text-xs font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-1.5"
        >
          Passphrase
        </label>
        <input
          id="passphrase"
          type="password"
          autoComplete="current-password"
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
          required
          className="w-full px-4 py-3 rounded-xl bg-cream border border-charcoal/10 focus:border-charcoal/30 focus:outline-none focus:ring-2 focus:ring-charcoal/10 text-charcoal text-sm"
          placeholder="••••••••"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full px-6 py-3 rounded-full bg-charcoal text-white font-semibold hover:bg-charcoal/90 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-wait"
      >
        {submitting ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
