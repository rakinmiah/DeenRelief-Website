"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase-browser";

const inputCls =
  "w-full px-4 py-3 rounded-xl bg-white border border-charcoal/15 focus:border-green focus:outline-none focus:ring-2 focus:ring-green/15 text-charcoal text-xl tracking-[0.4em] text-center";

export default function MfaChallengeClient() {
  const router = useRouter();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createBrowserSupabase();
    supabase.auth.mfa
      .listFactors()
      .then(({ data }) => {
        const totp = data?.totp?.[0];
        if (!totp) {
          // No factor — nothing to challenge; go to the dashboard.
          router.replace("/sponsor/dashboard");
          return;
        }
        setFactorId(totp.id);
        setReady(true);
      })
      .catch(() => setReady(true));
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId) return;
    setBusy(true);
    setError(null);
    const supabase = createBrowserSupabase();
    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code: code.trim(),
    });
    setBusy(false);
    if (error) {
      setError("That code wasn't right. Try the latest code from your app.");
      setCode("");
      return;
    }
    router.replace("/sponsor/dashboard");
    router.refresh();
  }

  if (!ready) {
    return <p className="text-sm text-grey text-center">Loading…</p>;
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {error && (
        <div
          role="alert"
          className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm"
        >
          {error}
        </div>
      )}
      <input
        className={inputCls}
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
        inputMode="numeric"
        autoComplete="one-time-code"
        autoFocus
        placeholder="000000"
        aria-label="6-digit code"
      />
      <button
        type="submit"
        disabled={busy || code.length !== 6}
        className="w-full px-6 py-3 rounded-full bg-green text-white font-semibold hover:bg-green-dark transition-colors disabled:opacity-60"
      >
        {busy ? "Verifying…" : "Verify"}
      </button>
      <p className="text-sm text-grey text-center">
        Lost your device?{" "}
        <a href="/sponsor/logout" className="text-green hover:underline">
          Sign out
        </a>{" "}
        and contact us.
      </p>
    </form>
  );
}
