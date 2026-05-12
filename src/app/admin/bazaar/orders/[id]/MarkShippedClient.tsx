"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Mark-shipped action panel.
 *
 * Posts to /api/admin/bazaar/orders/[id]/mark-shipped with the
 * tracking number, service tier, and (optional) internal notes
 * scratched in by the admin while packing.
 *
 * On success: router.refresh() so the order detail page re-renders
 * with the new `fulfilled` status, the tracking number, and the
 * action panel disappears (parent re-evaluates).
 *
 * On the API returning emailSent=false: we still consider the action
 * a success (the order IS shipped in the DB), but surface a
 * non-blocking warning so the admin knows to resend the email by
 * other means.
 */
type RoyalMailService = "tracked-48" | "tracked-24" | "special-delivery";

export default function MarkShippedClient({
  orderId,
  initialInternalNotes,
  initialService,
}: {
  orderId: string;
  initialInternalNotes: string | null;
  /**
   * The Royal Mail tier the customer paid for at checkout (derived
   * from session.shipping_cost). Pre-fills the service select so
   * the admin doesn't have to remember which tier to ship at.
   * Defaults to tracked-48 when the customer's choice can't be
   * derived (e.g. zero-shipping orders before this column existed).
   */
  initialService: RoyalMailService | null;
}) {
  const router = useRouter();
  const [trackingNumber, setTrackingNumber] = useState("");
  const [service, setService] = useState<RoyalMailService>(
    initialService ?? "tracked-48"
  );
  const [internalNotes, setInternalNotes] = useState(initialInternalNotes ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setWarning(null);
    try {
      const res = await fetch(
        `/api/admin/bazaar/orders/${orderId}/mark-shipped`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            trackingNumber: trackingNumber.trim(),
            royalMailService: service,
            internalNotes: internalNotes.trim() || undefined,
          }),
        }
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.error ?? `Server returned ${res.status}`);
      }
      if (body?.emailSent === false) {
        setWarning(
          "Order marked shipped, but the customer email didn't send. Check Resend logs."
        );
        // Still refresh — the DB write succeeded.
        setTimeout(() => router.refresh(), 1500);
        return;
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  const customerChoiceLabel =
    initialService === "tracked-48"
      ? "Royal Mail Tracked 48"
      : initialService === "tracked-24"
        ? "Royal Mail Tracked 24"
        : initialService === "special-delivery"
          ? "Royal Mail Special Delivery"
          : null;

  return (
    <section className="bg-charcoal text-white rounded-2xl p-5">
      <h2 className="text-xs font-bold uppercase tracking-[0.1em] text-white/60 mb-3">
        Mark as shipped
      </h2>

      {customerChoiceLabel && (
        <div className="mb-4 p-3 bg-amber-dark/15 border border-amber/30 rounded-lg text-[12px] text-amber-light leading-relaxed">
          <span className="block text-[10px] uppercase tracking-[0.1em] text-amber/80 font-bold mb-0.5">
            Customer chose
          </span>
          {customerChoiceLabel}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <label
          htmlFor="tracking"
          className="block text-xs text-white/70 mb-1.5"
        >
          Royal Mail tracking number
        </label>
        <input
          id="tracking"
          type="text"
          value={trackingNumber}
          onChange={(e) => setTrackingNumber(e.target.value)}
          placeholder="LX 123 456 789 GB"
          disabled={submitting}
          required
          className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/15 text-white placeholder:text-white/30 text-sm mb-3 focus:outline-none focus:border-amber/60 disabled:cursor-not-allowed"
        />

        <label
          htmlFor="service"
          className="block text-xs text-white/70 mb-1.5"
        >
          Service
        </label>
        <select
          id="service"
          value={service}
          onChange={(e) => setService(e.target.value as RoyalMailService)}
          disabled={submitting}
          className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/15 text-white text-sm mb-4 focus:outline-none focus:border-amber/60 disabled:cursor-not-allowed"
        >
          <option value="tracked-48">Royal Mail Tracked 48</option>
          <option value="tracked-24">Royal Mail Tracked 24</option>
          <option value="special-delivery">Royal Mail Special Delivery</option>
        </select>

        <label
          htmlFor="notes"
          className="block text-xs text-white/70 mb-1.5"
        >
          Internal notes (optional)
        </label>
        <textarea
          id="notes"
          rows={2}
          value={internalNotes}
          onChange={(e) => setInternalNotes(e.target.value)}
          disabled={submitting}
          placeholder="Anything the team should know about this order…"
          className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/15 text-white placeholder:text-white/30 text-sm mb-4 focus:outline-none focus:border-amber/60 disabled:cursor-not-allowed"
        />

        {error && (
          <p className="text-[12px] text-red-300 bg-red-900/20 border border-red-500/30 rounded-lg px-3 py-2 mb-3">
            {error}
          </p>
        )}
        {warning && (
          <p className="text-[12px] text-amber-light bg-amber-dark/20 border border-amber/30 rounded-lg px-3 py-2 mb-3">
            {warning}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || trackingNumber.trim().length === 0}
          className="w-full px-4 py-2.5 rounded-full bg-amber text-charcoal text-sm font-semibold hover:bg-amber-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitting
            ? "Saving…"
            : "Mark shipped & notify customer"}
        </button>
        <p className="mt-3 text-[10px] text-white/40 leading-relaxed">
          Writes tracking_number + status=&apos;fulfilled&apos; to Supabase,
          triggers shipping email via Resend, logs to the audit trail.
        </p>
      </form>
    </section>
  );
}
