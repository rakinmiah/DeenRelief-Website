"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginFormClient() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    // Mockup: pretend to authenticate, then route to the donations list.
    // Production: await supabase.auth.signInWithPassword({ email, password })
    // and surface error messages on failure.
    window.setTimeout(() => router.push("/admin/donations"), 400);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
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
        <div className="flex items-center justify-between mb-1.5">
          <label
            htmlFor="password"
            className="text-xs font-bold uppercase tracking-[0.1em] text-charcoal/60"
          >
            Password
          </label>
          <a
            href="mailto:tech@deenrelief.org?subject=Admin%20password%20reset"
            className="text-[11px] text-charcoal/50 hover:text-charcoal/80 underline transition-colors"
          >
            Forgot?
          </a>
        </div>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
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
