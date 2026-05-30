"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase-browser";

type Status = "loading" | "off" | "enrolling" | "on";

const inputCls =
  "w-40 px-3.5 py-2.5 rounded-lg bg-white border border-charcoal/15 focus:border-green focus:outline-none focus:ring-2 focus:ring-green/15 text-charcoal text-lg tracking-[0.3em] text-center";

/**
 * Two-factor authentication (TOTP) management for the sponsor account.
 * Enroll → scan QR in an authenticator app → verify a 6-digit code → on.
 * Verifying the first factor steps the current session up to aal2, so the
 * sponsor isn't immediately bounced to the MFA challenge.
 */
export default function MfaClient() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("loading");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createBrowserSupabase();
    supabase.auth.mfa
      .listFactors()
      .then(({ data }) => {
        const verified = data?.totp?.[0];
        if (verified) {
          setFactorId(verified.id);
          setStatus("on");
        } else {
          setStatus("off");
        }
      })
      .catch(() => setStatus("off"));
  }, []);

  async function startEnroll() {
    setBusy(true);
    setError(null);
    const supabase = createBrowserSupabase();
    // Clear any abandoned unverified factors first so enroll doesn't clash.
    try {
      const { data: all } = await supabase.auth.mfa.listFactors();
      const stale = (all?.all ?? []).filter(
        (f) => f.factor_type === "totp" && f.status === "unverified"
      );
      for (const f of stale) await supabase.auth.mfa.unenroll({ factorId: f.id });
    } catch {
      /* best effort */
    }

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "Authenticator app",
    });
    setBusy(false);
    if (error || !data) {
      setError("Couldn't start setup. Please try again.");
      return;
    }
    setFactorId(data.id);
    setQrCode(data.totp.qr_code);
    setSecret(data.totp.secret);
    setStatus("enrolling");
  }

  async function verifyEnroll(e: React.FormEvent) {
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
      setError("That code wasn't right. Check your authenticator app and try again.");
      return;
    }
    setCode("");
    setQrCode(null);
    setSecret(null);
    setStatus("on");
    router.refresh();
  }

  async function disable() {
    if (!factorId) return;
    const ok = window.confirm(
      "Turn off two-factor authentication? Your account will be protected by your password only."
    );
    if (!ok) return;
    setBusy(true);
    setError(null);
    const supabase = createBrowserSupabase();
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    setBusy(false);
    if (error) {
      setError("Couldn't turn it off. Please try again.");
      return;
    }
    setFactorId(null);
    setStatus("off");
    router.refresh();
  }

  return (
    <div className="mt-6 pt-6 border-t border-charcoal/8">
      <div className="flex items-center justify-between gap-3 mb-2">
        <h2 className="font-heading font-bold text-lg text-charcoal">
          Two-factor authentication
        </h2>
        {status === "on" && (
          <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full bg-green-light text-green">
            On
          </span>
        )}
      </div>

      {error && (
        <p className="mb-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {status === "loading" && (
        <p className="text-sm text-grey">Checking…</p>
      )}

      {status === "off" && (
        <>
          <p className="text-sm text-grey mb-4 leading-[1.7]">
            Add a second step at sign-in using an authenticator app (like Google
            Authenticator or Authy) for extra protection on your account.
          </p>
          <button
            onClick={startEnroll}
            disabled={busy}
            className="inline-flex items-center justify-center px-5 py-2.5 text-sm rounded-full bg-green text-white font-semibold shadow-sm hover:bg-green-dark transition-colors disabled:opacity-60"
          >
            {busy ? "Setting up…" : "Turn on two-factor authentication"}
          </button>
        </>
      )}

      {status === "enrolling" && (
        <div className="space-y-4">
          <p className="text-sm text-grey leading-[1.7]">
            Scan this QR code with your authenticator app, then enter the
            6-digit code it shows.
          </p>
          {qrCode && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qrCode}
              alt="Two-factor QR code"
              className="w-44 h-44 rounded-lg border border-charcoal/10 bg-white p-2"
            />
          )}
          {secret && (
            <p className="text-xs text-grey/80">
              Can&apos;t scan? Enter this key manually:{" "}
              <code className="font-mono text-charcoal break-all">{secret}</code>
            </p>
          )}
          <form onSubmit={verifyEnroll} className="flex flex-wrap items-center gap-3">
            <input
              className={inputCls}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              aria-label="6-digit code"
            />
            <button
              type="submit"
              disabled={busy || code.length !== 6}
              className="px-5 py-2.5 rounded-full bg-green text-white text-sm font-semibold shadow-sm hover:bg-green-dark transition-colors disabled:opacity-60"
            >
              {busy ? "Verifying…" : "Verify & turn on"}
            </button>
            <button
              type="button"
              onClick={() => {
                setStatus("off");
                setQrCode(null);
                setSecret(null);
                setCode("");
                setError(null);
              }}
              className="text-sm text-grey hover:text-charcoal"
            >
              Cancel
            </button>
          </form>
        </div>
      )}

      {status === "on" && (
        <>
          <p className="text-sm text-grey mb-4 leading-[1.7]">
            Two-factor authentication is protecting your account. You&apos;ll be
            asked for a code from your authenticator app when you sign in.
          </p>
          <button
            onClick={disable}
            disabled={busy}
            className="text-sm font-medium text-charcoal/70 hover:text-red-600 transition-colors disabled:opacity-60"
          >
            {busy ? "Turning off…" : "Turn off two-factor authentication"}
          </button>
        </>
      )}
    </div>
  );
}
