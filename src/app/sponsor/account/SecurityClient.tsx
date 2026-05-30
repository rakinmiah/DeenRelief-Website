"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase-browser";

const labelCls =
  "block text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal/50 mb-1.5";
const inputCls =
  "w-full px-3.5 py-2.5 rounded-lg bg-white border border-charcoal/15 focus:border-green focus:outline-none focus:ring-2 focus:ring-green/15 text-charcoal text-sm";

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SecurityClient({
  email,
  lastSignInAt,
}: {
  email: string;
  lastSignInAt: string | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function reset() {
    setCurrent("");
    setNext("");
    setConfirm("");
    setEditing(false);
    setMsg(null);
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (next.length < 8) {
      setMsg({ ok: false, text: "New password must be at least 8 characters." });
      return;
    }
    if (next !== confirm) {
      setMsg({ ok: false, text: "New passwords don't match." });
      return;
    }
    setSaving(true);
    const supabase = createBrowserSupabase();

    // Re-verify the current password before changing it — prevents a hijacked
    // session from silently changing the password.
    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email,
      password: current,
    });
    if (reauthError) {
      setSaving(false);
      setMsg({ ok: false, text: "Your current password is incorrect." });
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: next });
    setSaving(false);
    if (error) {
      setMsg({ ok: false, text: "Couldn't update your password — please try again." });
      return;
    }
    reset();
    setMsg({ ok: true, text: "Password updated." });
    router.refresh();
  }

  async function signOutEverywhere() {
    const ok = window.confirm(
      "Sign out of every device, including this one? You'll need to sign in again."
    );
    if (!ok) return;
    setSigningOut(true);
    const supabase = createBrowserSupabase();
    await supabase.auth.signOut({ scope: "global" });
    router.replace("/sponsor/login");
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-2">
        <h2 className="font-heading font-bold text-lg text-charcoal">
          Sign-in &amp; security
        </h2>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="text-sm font-semibold text-green hover:text-green-dark transition-colors"
          >
            Change password
          </button>
        )}
      </div>

      {msg && (
        <p
          className={`mb-3 text-sm ${msg.ok ? "text-green" : "text-red-600"}`}
          role="status"
        >
          {msg.text}
        </p>
      )}

      {editing ? (
        <form onSubmit={changePassword} className="space-y-4">
          <div>
            <label className={labelCls} htmlFor="cur-pw">Current password</label>
            <input
              id="cur-pw"
              type="password"
              autoComplete="current-password"
              className={inputCls}
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              required
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="new-pw">New password</label>
            <input
              id="new-pw"
              type="password"
              autoComplete="new-password"
              className={inputCls}
              value={next}
              onChange={(e) => setNext(e.target.value)}
              required
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="conf-pw">Confirm new password</label>
            <input
              id="conf-pw"
              type="password"
              autoComplete="new-password"
              className={inputCls}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-full bg-green text-white text-sm font-semibold shadow-sm hover:bg-green-dark transition-colors disabled:opacity-60"
            >
              {saving ? "Updating…" : "Update password"}
            </button>
            <button
              type="button"
              onClick={reset}
              disabled={saving}
              className="px-5 py-2.5 rounded-full border border-charcoal/15 text-charcoal/80 text-sm font-medium hover:border-charcoal/30 transition-colors disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-4 py-2.5 border-b border-charcoal/5">
            <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal/50 sm:w-40 shrink-0">
              Password
            </span>
            <span className="text-sm text-charcoal">••••••••</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-4 py-2.5">
            <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal/50 sm:w-40 shrink-0">
              Last signed in
            </span>
            <span className="text-sm text-charcoal">{formatWhen(lastSignInAt)}</span>
          </div>
        </>
      )}

      <div className="mt-5 pt-5 border-t border-charcoal/5">
        <button
          onClick={signOutEverywhere}
          disabled={signingOut}
          className="text-sm font-medium text-charcoal/70 hover:text-red-600 transition-colors disabled:opacity-60"
        >
          {signingOut ? "Signing out…" : "Sign out of all devices"}
        </button>
        <p className="mt-1 text-xs text-grey/70">
          Signs you out everywhere — useful if you&apos;ve used a shared or lost
          device.
        </p>
      </div>
    </div>
  );
}
