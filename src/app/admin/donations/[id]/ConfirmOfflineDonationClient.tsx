"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Confirmation banner for an OFFLINE Gift Aid donation (submitted via
 * the public /gift-aid form) that's still pending. Confirming flips it
 * to 'succeeded' so it counts as income and enters the Gift Aid HMRC
 * export. Only rendered when source='offline' AND status='pending'.
 */
export default function ConfirmOfflineDonationClient({
  donationId,
}: {
  donationId: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/donations/${donationId}/confirm-offline`,
        { method: "POST" }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Couldn't confirm.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't confirm.");
      setBusy(false);
    }
  }

  return (
    <div className="mb-6 rounded-2xl border border-amber/40 bg-amber-light/40 p-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="font-heading font-semibold text-charcoal">
            Offline donation — needs confirmation
          </p>
          <p className="text-sm text-charcoal/70 mt-1 max-w-2xl leading-relaxed">
            This was logged via the Gift Aid form (bank transfer / cash). It
            won&apos;t count as income or appear in your Gift Aid HMRC export
            until you confirm the money actually arrived.
          </p>
          {error && <p className="text-sm text-red-700 mt-2">{error}</p>}
        </div>
        <button
          type="button"
          onClick={confirm}
          disabled={busy}
          className="shrink-0 px-5 py-2.5 rounded-full bg-green text-white text-sm font-semibold hover:bg-green-dark transition-colors disabled:opacity-60"
        >
          {busy ? "Confirming…" : "Confirm donation"}
        </button>
      </div>
    </div>
  );
}
