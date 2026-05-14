"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  internalId: string;
  status: "succeeded" | "pending" | "failed" | "refunded";
  frequency: "one-time" | "monthly";
  /** Pre-formatted amount ("£25.00") — surfaced in the refund
   *  confirm so the trustee sees the exact sum before clicking
   *  through. Belt-and-braces against fat-finger refunds. */
  amountFormatted: string;
  /** Donor email — surfaced in the refund confirm so the trustee
   *  knows whose card will be credited. */
  donorEmail: string;
  /** Did this donation have an active Gift Aid claim? Drives the
   *  Gift Aid-reversal warning paragraph in the confirm prompt. */
  giftAidClaimed: boolean;
}

/**
 * Action panel on the donation-detail page.
 *
 * Three actions, all wired to real endpoints:
 *   - Resend receipt → POST /api/admin/donations/[id]/resend-receipt
 *     re-sends the original receipt template via Resend.
 *   - Download PDF receipt → currently disabled; PDF generation is
 *     a Phase 3 add-on (the email itself is HTML, not PDF, so we'd
 *     need to render to PDF server-side — Puppeteer / Playwright /
 *     a PDF service).
 *   - Issue refund → POST /api/admin/donations/[id]/refund. Confirms
 *     before submitting; Stripe processes the refund and the
 *     existing charge.refunded webhook updates the row to
 *     status='refunded' shortly after.
 *
 * UI feedback: transient success/error strip with role=status. After
 * a successful refund, refreshes the page so the status pill flips.
 */
export default function DonationActionsClient({
  internalId,
  status,
  frequency,
  amountFormatted,
  donorEmail,
  giftAidClaimed,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);

  const canRefund = status === "succeeded" && frequency === "one-time";

  async function handleResendReceipt() {
    setBusy("resend");
    setFeedback(null);
    try {
      const res = await fetch(
        `/api/admin/donations/${internalId}/resend-receipt`,
        { method: "POST", credentials: "same-origin" }
      );
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Failed");
      setFeedback({
        kind: "success",
        text: `Receipt sent to ${body.sentTo}.`,
      });
    } catch (err) {
      setFeedback({
        kind: "error",
        text: err instanceof Error ? err.message : "Resend failed.",
      });
    } finally {
      setBusy(null);
    }
  }

  async function handleRefund() {
    const giftAidParagraph = giftAidClaimed
      ? "Gift Aid claimed on this donation will need to be reversed " +
        "in the next HMRC reclaim — adjust the next R68 submission " +
        "accordingly.\n\n"
      : "";
    const confirmed = window.confirm(
      `Issue a ${amountFormatted} refund to ${donorEmail || "the donor"}?\n\n` +
        "Stripe will refund the card immediately (typically instant for " +
        "cards, up to 10 working days for bank transfers).\n\n" +
        giftAidParagraph +
        "This action cannot be undone."
    );
    if (!confirmed) return;
    setBusy("refund");
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/donations/${internalId}/refund`, {
        method: "POST",
        credentials: "same-origin",
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Failed");
      if (body.alreadyRefunded) {
        setFeedback({
          kind: "success",
          text: "This donation was already refunded.",
        });
      } else {
        setFeedback({
          kind: "success",
          text:
            "Refund issued. Donation status will update to 'refunded' in a few seconds.",
        });
        // Refresh after a short delay so the webhook has time to flip
        // the status — the page reload then reflects the change.
        window.setTimeout(() => router.refresh(), 4000);
      }
    } catch (err) {
      setFeedback({
        kind: "error",
        text: err instanceof Error ? err.message : "Refund failed.",
      });
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="bg-charcoal text-white rounded-2xl p-5">
      <h2 className="text-xs font-bold uppercase tracking-[0.1em] text-white/60 mb-3">
        Actions
      </h2>
      <div className="space-y-2">
        <button
          type="button"
          onClick={handleResendReceipt}
          disabled={busy !== null || status !== "succeeded"}
          className="w-full px-4 py-2.5 rounded-full bg-white/10 text-white text-sm font-medium hover:bg-white/15 transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-left"
        >
          {busy === "resend" ? "Sending…" : "Resend receipt email"}
        </button>
        {(status === "succeeded" || status === "refunded") ? (
          <a
            href={`/api/admin/donations/${internalId}/receipt-pdf`}
            className="block w-full px-4 py-2.5 rounded-full bg-white/10 text-white text-sm font-medium hover:bg-white/15 transition-colors text-left"
          >
            Download PDF receipt
          </a>
        ) : (
          <button
            type="button"
            disabled
            className="w-full px-4 py-2.5 rounded-full bg-white/10 text-white text-sm font-medium hover:bg-white/15 transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-left"
          >
            Download PDF receipt
          </button>
        )}
        {canRefund && (
          <button
            type="button"
            onClick={handleRefund}
            disabled={busy !== null}
            className="w-full px-4 py-2.5 rounded-full bg-red-500/20 text-red-200 text-sm font-medium hover:bg-red-500/30 transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-left"
          >
            {busy === "refund" ? "Refunding…" : "Issue refund…"}
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
        Resend uses the original receipt template. Refund uses
        Stripe&apos;s refund API; the donation row updates to
        &apos;refunded&apos; via the existing charge.refunded webhook.
      </p>
    </section>
  );
}
