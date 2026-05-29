"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase-browser";
import { activateAccountAction } from "../actions";

const inputCls =
  "w-full px-4 py-3 rounded-xl bg-white border border-charcoal/15 focus:border-green focus:outline-none focus:ring-2 focus:ring-green/15 text-charcoal text-sm";
const labelCls =
  "block text-xs font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-1.5";

export default function SetPasswordClient() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agree, setAgree] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The invite/recovery link establishes a session (PKCE via the callback
  // route, or hash tokens auto-detected by the browser client). Confirm it
  // exists before showing the form.
  useEffect(() => {
    const supabase = createBrowserSupabase();
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(!!data.session);
      setReady(true);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    if (!agree) {
      setError("Please accept the terms to continue.");
      return;
    }
    setSubmitting(true);
    const supabase = createBrowserSupabase();
    const { error: pwError } = await supabase.auth.updateUser({ password });
    if (pwError) {
      setError("Couldn't set your password. Your link may have expired.");
      setSubmitting(false);
      return;
    }
    // Record activation consents + mark the profile active (server-side).
    const activation = await activateAccountAction();
    if (!activation.ok) {
      setError(activation.error ?? "Couldn't activate your account.");
      setSubmitting(false);
      return;
    }
    if (marketing) {
      const { setMarketingConsentAction } = await import("../actions");
      await setMarketingConsentAction(true);
    }
    router.replace("/sponsor/dashboard");
    router.refresh();
  }

  if (!ready) {
    return <p className="text-sm text-grey">Checking your link…</p>;
  }

  if (!hasSession) {
    return (
      <div className="rounded-lg bg-amber-light/50 border border-amber/30 px-4 py-3 text-sm text-amber-dark">
        This activation link is invalid or has expired. Please ask us to resend
        your invite, or use{" "}
        <a href="/sponsor/login" className="underline">
          forgot password
        </a>{" "}
        if you already set one.
      </div>
    );
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
        <label className={labelCls} htmlFor="password">
          New password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          className={inputCls}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <div>
        <label className={labelCls} htmlFor="confirm">
          Confirm password
        </label>
        <input
          id="confirm"
          type="password"
          autoComplete="new-password"
          className={inputCls}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
      </div>

      <label className="flex items-start gap-2.5 text-sm text-charcoal/80 leading-relaxed">
        <input
          type="checkbox"
          checked={agree}
          onChange={(e) => setAgree(e.target.checked)}
          className="mt-0.5"
        />
        <span>
          I accept the account terms and privacy policy, and I agree to keep the
          updates, photos, and videos about the child I sponsor confidential and
          not to share or republish them.
        </span>
      </label>

      <label className="flex items-start gap-2.5 text-sm text-charcoal/70 leading-relaxed">
        <input
          type="checkbox"
          checked={marketing}
          onChange={(e) => setMarketing(e.target.checked)}
          className="mt-0.5"
        />
        <span>
          (Optional) Email me occasional news and appeals from Deen Relief.
        </span>
      </label>

      <button
        type="submit"
        disabled={submitting}
        className="w-full px-6 py-3 rounded-full bg-green text-white font-semibold hover:bg-green-dark transition-colors disabled:opacity-60"
      >
        {submitting ? "Activating…" : "Activate account"}
      </button>
    </form>
  );
}
