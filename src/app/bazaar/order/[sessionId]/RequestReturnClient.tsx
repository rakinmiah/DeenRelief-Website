"use client";

import { useState } from "react";

/**
 * Expandable "Request a return" form on the order confirmation
 * page. Submits to /api/bazaar/return-request which:
 *
 *   1. Verifies the session id matches a real order
 *   2. Creates a bazaar_inquiries row with order_id linked,
 *      subject = "Returns & refunds", customer info from the
 *      order, body composed from the reason + note
 *   3. Fires the standard bazaar_inquiry_new admin notification
 *
 * Reusing the inquiries pipeline means returns thread into the
 * exact same inbox the trustee already monitors — they don't
 * need a separate "returns queue". The admin just sees a new
 * inquiry with the customer's reason + a link straight to the
 * order via the existing inquiry→order linkage.
 *
 * Self-service framing: this isn't a guaranteed-refund button,
 * it's a request that lands in the inquiries inbox where the
 * trustee actually decides + responds. The success state makes
 * that clear ("we'll be in touch within 1 working day").
 */

const REASONS = [
  "Damaged or defective",
  "Wrong item received",
  "Sizing / fit issue",
  "Changed my mind",
  "Other",
] as const;

type Reason = (typeof REASONS)[number];

export default function RequestReturnClient({
  sessionId,
}: {
  sessionId: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState<Reason | "">("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<
    "idle" | "submitting" | "submitted" | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason) return;
    setError(null);
    setStatus("submitting");
    try {
      const res = await fetch("/api/bazaar/return-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, reason, note }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? "Couldn't submit the request.");
      }
      setStatus("submitted");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Email info@deenrelief.org and we'll help."
      );
      setStatus("error");
    }
  }

  if (status === "submitted") {
    return (
      <div className="rounded-2xl border border-green/25 bg-green/5 p-5 text-center">
        <p className="text-green-dark font-semibold text-sm mb-1">
          Return request received.
        </p>
        <p className="text-charcoal/70 text-[13px] leading-relaxed max-w-md mx-auto">
          We&apos;ll come back within 1 working day with the next
          steps — a prepaid label if the issue is ours, or
          instructions if you&apos;re returning for size or
          preference. The reply lands in the inbox of the email you
          used to place this order.
        </p>
      </div>
    );
  }

  if (!isOpen) {
    return (
      <div className="text-center">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="text-charcoal/60 hover:text-charcoal text-xs font-semibold underline decoration-charcoal/20 hover:decoration-charcoal/50 transition-colors"
        >
          Need to return something?
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-charcoal/10 bg-cream/40 p-5 space-y-4"
    >
      <div>
        <p className="text-charcoal font-semibold text-sm mb-1">
          Request a return
        </p>
        <p className="text-charcoal/60 text-[12px] leading-relaxed">
          14 days from delivery. We&apos;ll reply within one working
          day with confirmation and a prepaid label if the issue is
          ours.
        </p>
      </div>

      <div>
        <label
          htmlFor="return-reason"
          className="block text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-1.5"
        >
          Reason
        </label>
        <select
          id="return-reason"
          required
          value={reason}
          onChange={(e) => setReason(e.target.value as Reason | "")}
          className="w-full px-4 py-2.5 rounded-xl border-2 border-grey-light bg-white text-charcoal focus:outline-none focus:border-green/40 transition-colors appearance-none bg-no-repeat bg-right pr-10 text-sm"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%231F2937' stroke-width='2'%3e%3cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7' /%3e%3c/svg%3e\")",
            backgroundSize: "1.25rem",
            backgroundPosition: "right 1rem center",
          }}
        >
          <option value="" disabled>
            Pick a reason…
          </option>
          {REASONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="return-note"
          className="block text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-1.5"
        >
          Anything else?{" "}
          <span className="font-normal text-charcoal/40">(optional)</span>
        </label>
        <textarea
          id="return-note"
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="If it's damaged, a quick description helps us decide whether to send a prepaid label."
          className="w-full px-4 py-2.5 rounded-xl border-2 border-grey-light bg-white text-charcoal placeholder:text-grey/40 focus:outline-none focus:border-green/40 transition-colors resize-y text-sm leading-[1.55]"
        />
      </div>

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            setIsOpen(false);
            setReason("");
            setNote("");
            setError(null);
          }}
          disabled={status === "submitting"}
          className="px-4 py-2 rounded-full bg-white border border-charcoal/15 text-charcoal text-sm font-medium hover:bg-cream transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={status === "submitting" || !reason}
          className="px-5 py-2 rounded-full bg-charcoal text-white text-sm font-semibold hover:bg-charcoal/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === "submitting" ? "Sending…" : "Send request"}
        </button>
      </div>
    </form>
  );
}
