"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  setMarketingConsentAction,
  requestErasureAction,
} from "../actions";

export default function AccountClient({
  marketingConsent,
  hasPendingErasure,
}: {
  marketingConsent: boolean;
  hasPendingErasure: boolean;
}) {
  const router = useRouter();
  const [marketing, setMarketing] = useState(marketingConsent);
  const [savingMarketing, setSavingMarketing] = useState(false);
  const [erasureSent, setErasureSent] = useState(hasPendingErasure);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function toggleMarketing(next: boolean) {
    setSavingMarketing(true);
    setMsg(null);
    const result = await setMarketingConsentAction(next);
    setSavingMarketing(false);
    if (result.ok) {
      setMarketing(next);
      setMsg({ ok: true, text: "Preference saved." });
    } else {
      setMsg({ ok: false, text: result.error ?? "Couldn't save." });
    }
  }

  async function handleErasure() {
    const confirmed = window.confirm(
      "Request deletion of your account and personal data? We'll process this and confirm by email. This doesn't cancel any donation — contact us separately for that."
    );
    if (!confirmed) return;
    setBusy(true);
    setMsg(null);
    const result = await requestErasureAction();
    setBusy(false);
    if (result.ok) {
      setErasureSent(true);
      setMsg({ ok: true, text: "Deletion request submitted." });
      router.refresh();
    } else {
      setMsg({ ok: false, text: result.error ?? "Couldn't submit." });
    }
  }

  return (
    <div className="space-y-6">
      {msg && (
        <div
          role="status"
          className={`rounded-lg px-4 py-3 text-sm ${
            msg.ok
              ? "bg-green-light text-green"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {msg.text}
        </div>
      )}

      {/* Marketing preference */}
      <section className="rounded-2xl border border-charcoal/5 bg-white shadow-sm p-6">
        <h2 className="font-heading font-bold text-lg text-charcoal mb-3">
          Email preferences
        </h2>
        <label className="flex items-start gap-2.5 text-sm text-charcoal/80">
          <input
            type="checkbox"
            checked={marketing}
            disabled={savingMarketing}
            onChange={(e) => toggleMarketing(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            Email me occasional news and appeals from Deen Relief. (Updates
            about the child you sponsor are sent regardless of this setting.)
          </span>
        </label>
      </section>

      {/* Your data */}
      <section className="rounded-2xl border border-charcoal/5 bg-white shadow-sm p-6">
        <h2 className="font-heading font-bold text-lg text-charcoal mb-2">
          Your data
        </h2>
        <p className="text-sm text-grey mb-5 leading-[1.7]">
          You can download a copy of the personal data we hold about you, or ask
          us to delete your account.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <a
            href="/api/sponsor/export"
            className="inline-flex items-center justify-center px-5 py-2.5 text-sm rounded-full bg-green text-white font-semibold shadow-sm hover:bg-green-dark transition-colors"
          >
            Download my data
          </a>
          {erasureSent ? (
            <span className="text-sm text-amber-dark">
              Deletion request received — we&apos;ll be in touch.
            </span>
          ) : (
            <button
              onClick={handleErasure}
              disabled={busy}
              className="inline-flex items-center justify-center px-5 py-2.5 text-sm rounded-full border border-charcoal/15 text-charcoal/80 font-medium hover:border-red-300 hover:text-red-600 transition-colors disabled:opacity-60"
            >
              Request account deletion
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
