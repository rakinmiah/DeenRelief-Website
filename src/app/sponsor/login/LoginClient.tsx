"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase-browser";

const inputCls =
  "w-full px-4 py-3 rounded-xl bg-white border border-charcoal/15 focus:border-green focus:outline-none focus:ring-2 focus:ring-green/15 text-charcoal text-sm";
const labelCls =
  "block text-xs font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-1.5";

export default function LoginClient() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"signin" | "reset">("signin");
  const [resetSent, setResetSent] = useState(false);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const supabase = createBrowserSupabase();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError("Invalid email or password.");
      setSubmitting(false);
      return;
    }
    // If the sponsor has 2FA enabled, the session is aal1 and must step up to
    // aal2 — send them to the code challenge before the portal.
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal && aal.currentLevel === "aal1" && aal.nextLevel === "aal2") {
      router.replace("/sponsor/mfa");
      router.refresh();
      return;
    }
    // Server components read the refreshed cookie; refresh to land on dashboard.
    router.replace("/sponsor/dashboard");
    router.refresh();
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const supabase = createBrowserSupabase();
    const redirectTo = `${window.location.origin}/sponsor/set-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    setSubmitting(false);
    // Don't reveal whether the email exists — always show the same confirmation.
    setResetSent(true);
    if (error) console.error("[sponsor reset]", error.message);
  }

  if (mode === "reset") {
    return (
      <div className="space-y-5">
        {resetSent ? (
          <div className="rounded-lg bg-green-light text-green px-4 py-3 text-sm">
            If an account exists for that email, we&apos;ve sent a link to reset
            your password. Check your inbox.
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-5">
            <div>
              <label className={labelCls} htmlFor="reset-email">
                Email
              </label>
              <input
                id="reset-email"
                type="email"
                autoComplete="username"
                className={inputCls}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full px-6 py-3 rounded-full bg-charcoal text-white font-semibold hover:bg-charcoal/90 transition-colors disabled:opacity-60"
            >
              {submitting ? "Sending…" : "Send reset link"}
            </button>
          </form>
        )}
        <button
          onClick={() => {
            setMode("signin");
            setResetSent(false);
            setError(null);
          }}
          className="text-sm text-green hover:underline"
        >
          ← Back to sign in
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSignIn} className="space-y-5">
      {error && (
        <div
          role="alert"
          className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm"
        >
          {error}
        </div>
      )}
      <div>
        <label className={labelCls} htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          className={inputCls}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div>
        <label className={labelCls} htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          className={inputCls}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="w-full px-6 py-3 rounded-full bg-green text-white font-semibold hover:bg-green-dark transition-colors disabled:opacity-60"
      >
        {submitting ? "Signing in…" : "Sign in"}
      </button>
      <button
        type="button"
        onClick={() => setMode("reset")}
        className="text-sm text-green hover:underline"
      >
        Forgot your password?
      </button>
    </form>
  );
}
