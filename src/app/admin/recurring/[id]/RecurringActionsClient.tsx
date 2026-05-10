"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  internalId: string;
  stripeSubscriptionId: string;
  stripeCustomerId: string | null;
  isActive: boolean;
}

/**
 * Action panel on the recurring-subscription detail page.
 *
 * Three actions, all wired to real endpoints:
 *   - Send Stripe portal link: generates a one-time signed URL for the
 *     donor's Stripe Customer Portal (existing manage-token flow), copies
 *     it to clipboard so the trustee can email it to the donor manually.
 *   - View past charges: links to dashboard.stripe.com (external).
 *   - Cancel subscription: posts to /api/admin/recurring/[id]/cancel,
 *     which updates Stripe with cancel_at_period_end=true (donor keeps
 *     the rest of the month they paid for, doesn't get charged again).
 *
 * UI feedback: each action shows transient success / error state. After
 * a successful cancel, refreshes the page so the status pill updates.
 */
export default function RecurringActionsClient({
  internalId,
  stripeSubscriptionId,
  stripeCustomerId,
  isActive,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);
  const [internalNotes, setInternalNotes] = useState("");

  async function handlePortalLink() {
    if (!stripeCustomerId) {
      setFeedback({
        kind: "error",
        text: "No Stripe customer ID on file — can't generate portal link.",
      });
      return;
    }
    setBusy("portal");
    setFeedback(null);
    try {
      const res = await fetch(
        `/api/admin/recurring/${internalId}/portal-link`,
        { method: "POST", credentials: "same-origin" }
      );
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Failed");
      await navigator.clipboard.writeText(body.url);
      setFeedback({
        kind: "success",
        text: "Portal link copied to clipboard. Paste into the email to the donor.",
      });
    } catch (err) {
      setFeedback({
        kind: "error",
        text: err instanceof Error ? err.message : "Portal link failed.",
      });
    } finally {
      setBusy(null);
    }
  }

  async function handleCancel() {
    const confirmed = window.confirm(
      "Cancel this recurring subscription?\n\n" +
        "Stripe will not charge the donor again. The current billing period " +
        "they have already paid for is honoured.\n\n" +
        "This action cannot be undone — the donor would need to set up a " +
        "new subscription if they want to resume."
    );
    if (!confirmed) return;
    setBusy("cancel");
    setFeedback(null);
    try {
      const res = await fetch(
        `/api/admin/recurring/${internalId}/cancel`,
        { method: "POST", credentials: "same-origin" }
      );
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Failed");
      setFeedback({
        kind: "success",
        text: "Subscription cancelled. Status will refresh in a moment.",
      });
      router.refresh();
    } catch (err) {
      setFeedback({
        kind: "error",
        text: err instanceof Error ? err.message : "Cancel failed.",
      });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <section className="bg-charcoal text-white rounded-2xl p-5">
        <h2 className="text-xs font-bold uppercase tracking-[0.1em] text-white/60 mb-3">
          Actions
        </h2>
        <div className="space-y-2">
          <button
            type="button"
            onClick={handlePortalLink}
            disabled={busy !== null || !stripeCustomerId}
            className="w-full px-4 py-2.5 rounded-full bg-white/10 text-white text-sm font-medium hover:bg-white/15 transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-left"
          >
            {busy === "portal" ? "Generating…" : "Copy Stripe portal link"}
          </button>
          <a
            href={`https://dashboard.stripe.com/subscriptions/${stripeSubscriptionId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full px-4 py-2.5 rounded-full bg-white/10 text-white text-sm font-medium hover:bg-white/15 transition-colors text-left"
          >
            View in Stripe dashboard ↗
          </a>
          {isActive && (
            <button
              type="button"
              onClick={handleCancel}
              disabled={busy !== null}
              className="w-full px-4 py-2.5 rounded-full bg-red-500/20 text-red-200 text-sm font-medium hover:bg-red-500/30 transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-left"
            >
              {busy === "cancel" ? "Cancelling…" : "Cancel subscription…"}
            </button>
          )}
        </div>

        {feedback && (
          <p
            className={`mt-4 text-[11px] leading-relaxed ${
              feedback.kind === "success" ? "text-green-300" : "text-red-300"
            }`}
            role="status"
          >
            {feedback.text}
          </p>
        )}

        <p className="mt-4 text-[10px] text-white/40 leading-relaxed">
          Cancel: Stripe `cancel_at_period_end` (honours the current
          paid period). Portal link: signed URL valid 90 days, lets the
          donor update card / cancel themselves.
        </p>
      </section>

      <section className="bg-white border border-charcoal/10 rounded-2xl p-5">
        <h2 className="text-xs font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-3">
          Internal notes
        </h2>
        <textarea
          rows={4}
          value={internalNotes}
          onChange={(e) => setInternalNotes(e.target.value)}
          placeholder="e.g. donor called to pause for 3 months due to redundancy…"
          className="w-full px-3 py-2 rounded-lg bg-cream border border-charcoal/10 text-sm text-charcoal placeholder:text-charcoal/30"
        />
        <p className="mt-2 text-[11px] text-charcoal/40">
          Notes are local to this view in Phase 2 — persistence to the
          audit log lands in Phase 3.
        </p>
      </section>
    </div>
  );
}
