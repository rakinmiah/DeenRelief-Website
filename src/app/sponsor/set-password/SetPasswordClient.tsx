"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase-browser";
import { setPasswordAction, requestActivationLinkAction } from "../actions";

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
  // "Request a new link" flow shown when the link is expired.
  const [requestEmail, setRequestEmail] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  // Establish the session from whatever the activation link delivered:
  //   - tokens in the URL hash (#access_token=…&refresh_token=…) for implicit
  //     / recovery links → set them explicitly, then strip the hash.
  //   - otherwise an existing cookie set by the /sponsor/auth/callback route.
  // Either way the browser client persists it to cookies, so the server
  // action that follows can read the session too.
  useEffect(() => {
    const supabase = createBrowserSupabase();

    async function establish() {
      const hash =
        typeof window !== "undefined" ? window.location.hash : "";
      if (hash && hash.includes("access_token")) {
        const params = new URLSearchParams(hash.replace(/^#/, ""));
        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");
        if (access_token && refresh_token) {
          await supabase.auth.setSession({ access_token, refresh_token });
          // Remove the token from the URL so it isn't left in history.
          window.history.replaceState(
            null,
            "",
            window.location.pathname + window.location.search
          );
        }
      }
      const { data } = await supabase.auth.getSession();
      setHasSession(!!data.session);
      setReady(true);
    }

    establish();
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
    const result = await setPasswordAction(password, marketing);
    if (!result.ok) {
      setError(result.error ?? "Couldn't activate your account.");
      setSubmitting(false);
      return;
    }
    router.replace("/sponsor/dashboard");
    router.refresh();
  }

  if (!ready) {
    return <p className="text-sm text-grey">Checking your link…</p>;
  }

  async function handleRequestLink(e: React.FormEvent) {
    e.preventDefault();
    setRequesting(true);
    await requestActivationLinkAction(requestEmail);
    setRequesting(false);
    setRequestSent(true);
  }

  if (!hasSession) {
    return (
      <div className="space-y-5">
        <div className="rounded-xl bg-amber-light/50 border border-amber/20 px-4 py-3 text-sm text-amber-dark leading-relaxed">
          This activation link is invalid or has expired. Enter your email below
          and we&apos;ll send you a fresh one.
        </div>

        {requestSent ? (
          <div className="rounded-xl bg-green-light px-4 py-3 text-sm text-green leading-relaxed">
            If an account exists for that email, we&apos;ve sent a new activation
            link. Please check your inbox.
          </div>
        ) : (
          <form onSubmit={handleRequestLink} className="space-y-4">
            <div>
              <label className={labelCls} htmlFor="request-email">
                Email
              </label>
              <input
                id="request-email"
                type="email"
                autoComplete="email"
                className={inputCls}
                value={requestEmail}
                onChange={(e) => setRequestEmail(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              disabled={requesting}
              className="w-full px-6 py-3 rounded-full bg-green text-white font-semibold hover:bg-green-dark transition-colors disabled:opacity-60"
            >
              {requesting ? "Sending…" : "Send me a new link"}
            </button>
          </form>
        )}

        <p className="text-sm text-grey text-center">
          Already set a password?{" "}
          <a href="/sponsor/login" className="text-green hover:underline">
            Sign in
          </a>
        </p>
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
