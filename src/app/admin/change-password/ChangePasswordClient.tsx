"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { changeAdminPasswordAction } from "./actions";

const labelCls =
  "block text-xs font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-1.5";
const inputCls =
  "w-full px-4 py-3 rounded-xl bg-cream border border-charcoal/10 focus:border-charcoal/30 focus:outline-none focus:ring-2 focus:ring-charcoal/10 text-charcoal text-sm";

/**
 * Set/change the admin's personal password.
 *
 * `forced` (first sign-in with a temporary password): no "current
 * password" field — they just authenticated with the temp one. We hide
 * the cancel link so they can't skip it (the page guards also bounce
 * them back here until it's done).
 *
 * Voluntary: asks for the current password to re-authenticate.
 */
export default function ChangePasswordClient({
  email,
  forced,
}: {
  email: string;
  forced: boolean;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (next.length < 10) {
      setError("Password must be at least 10 characters.");
      return;
    }
    if (next !== confirm) {
      setError("New passwords don't match.");
      return;
    }

    setSubmitting(true);
    const result = await changeAdminPasswordAction({
      currentPassword: forced ? undefined : current,
      newPassword: next,
    });
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error ?? "Couldn't update your password.");
      return;
    }

    setDone(true);
    // The action re-issued the session cookie without the mustChange
    // flag; send them into the app. refresh() ensures the new cookie is
    // picked up by the server guards.
    router.replace("/admin/donations");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-cream flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <span className="block text-[10px] font-bold tracking-[0.18em] uppercase text-amber-dark mb-1">
            Deen Relief
          </span>
          <h1 className="text-charcoal font-heading font-bold text-2xl">
            {forced ? "Set your password" : "Change your password"}
          </h1>
          <p className="text-charcoal/60 text-sm mt-2">
            {forced
              ? "You're signing in with a temporary password. Choose a new one to finish setting up your account."
              : "Update the password you use to sign in to DR Admin."}
          </p>
          <p className="text-charcoal/40 text-xs mt-1">{email}</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white border border-charcoal/10 rounded-2xl p-6 space-y-5 shadow-sm"
        >
          {error && (
            <div
              role="alert"
              className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm"
            >
              {error}
            </div>
          )}

          {!forced && (
            <div>
              <label className={labelCls} htmlFor="current">
                Current password
              </label>
              <input
                id="current"
                type="password"
                autoComplete="current-password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                required
                className={inputCls}
              />
            </div>
          )}

          <div>
            <label className={labelCls} htmlFor="next">
              New password
            </label>
            <input
              id="next"
              type="password"
              autoComplete="new-password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              required
              className={inputCls}
              placeholder="At least 10 characters"
            />
          </div>

          <div>
            <label className={labelCls} htmlFor="confirm">
              Confirm new password
            </label>
            <input
              id="confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              className={inputCls}
            />
          </div>

          <button
            type="submit"
            disabled={submitting || done}
            className="w-full px-6 py-3 rounded-full bg-charcoal text-white font-semibold hover:bg-charcoal/90 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-wait"
          >
            {submitting
              ? "Saving…"
              : done
              ? "Saved — redirecting…"
              : forced
              ? "Set password & continue"
              : "Update password"}
          </button>

          {!forced && (
            <button
              type="button"
              onClick={() => router.push("/admin/donations")}
              className="w-full text-center text-sm text-charcoal/60 hover:text-charcoal transition-colors"
            >
              Cancel
            </button>
          )}
        </form>
      </div>
    </main>
  );
}
