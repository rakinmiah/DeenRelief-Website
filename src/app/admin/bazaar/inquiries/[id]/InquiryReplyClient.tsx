"use client";

import { useState, useTransition } from "react";
import {
  sendReplyAction,
  updateStatusAction,
  addManualMessageAction,
} from "@/app/admin/bazaar/inquiries/actions";
import type { InquiryStatus } from "@/lib/bazaar-inquiries";

/**
 * Reply composer + workflow controls for a single inquiry.
 *
 * Three actions:
 *   - Send reply — composes + sends an email via Resend, logs the
 *                  outbound message, flips status to 'replied'.
 *   - Log Gmail reply — pastes a customer follow-up that came
 *                       through Gmail (Option A's manual capture).
 *                       Doesn't send any email; just adds an
 *                       inbound row to the chat log.
 *   - Status change — open / replied / closed buttons.
 *
 * All three are server actions wrapped in useTransition so the
 * form stays responsive while the action runs. Errors surface
 * inline so the trustee knows when something failed (the audit
 * log captures the attempt either way).
 */
export default function InquiryReplyClient({
  inquiryId,
  currentStatus,
}: {
  inquiryId: string;
  currentStatus: InquiryStatus;
}) {
  const [body, setBody] = useState("");
  const [pasteBody, setPasteBody] = useState("");
  const [pasteOpen, setPasteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  function handleSendReply() {
    if (!body.trim()) return;
    setError(null);
    setInfo(null);
    startTransition(async () => {
      const result = await sendReplyAction(inquiryId, body);
      if (result.ok) {
        setBody("");
        setInfo("Reply sent and logged.");
      } else {
        setError(result.error ?? "Couldn't send the reply.");
      }
    });
  }

  function handleStatusChange(next: InquiryStatus) {
    if (next === currentStatus) return;
    setError(null);
    setInfo(null);
    startTransition(async () => {
      try {
        await updateStatusAction(inquiryId, next);
        setInfo(`Status changed to ${next}.`);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Couldn't change status."
        );
      }
    });
  }

  function handleLogManual() {
    if (!pasteBody.trim()) return;
    setError(null);
    setInfo(null);
    startTransition(async () => {
      const result = await addManualMessageAction(
        inquiryId,
        "inbound",
        pasteBody
      );
      if (result.ok) {
        setPasteBody("");
        setPasteOpen(false);
        setInfo("Customer reply added to the log.");
      } else {
        setError(result.error ?? "Couldn't add the message.");
      }
    });
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
          {error}
        </p>
      )}
      {info && (
        <p className="text-sm text-green-dark bg-green/10 border border-green/30 rounded-lg px-4 py-2.5">
          {info}
        </p>
      )}

      {/* Reply composer */}
      <div className="bg-white border border-charcoal/10 rounded-2xl p-5">
        <label
          htmlFor="reply-body"
          className="block text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-2"
        >
          Reply to the customer
        </label>
        <textarea
          id="reply-body"
          rows={6}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Type your reply here. The customer will receive it from info@deenrelief.org and your message will be logged on this inquiry."
          className="w-full px-4 py-3 rounded-xl border-2 border-grey-light bg-white text-charcoal placeholder:text-grey/40 focus:outline-none focus:border-green/40 transition-colors resize-y text-sm leading-[1.6]"
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-[11px] text-charcoal/50">
            Sent from <span className="font-mono">info@deenrelief.org</span>.
            Their reply lands in your Gmail inbox — paste it into the
            log below if you want it on the record.
          </p>
          <button
            type="button"
            onClick={handleSendReply}
            disabled={isPending || !body.trim()}
            className="px-5 py-2 rounded-full bg-green text-white text-sm font-semibold hover:bg-green-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {isPending ? "Sending…" : "Send reply"}
          </button>
        </div>
      </div>

      {/* Manual log toggle */}
      <div className="bg-white border border-charcoal/10 rounded-2xl p-5">
        {!pasteOpen ? (
          <button
            type="button"
            onClick={() => setPasteOpen(true)}
            className="text-sm font-semibold text-charcoal/70 hover:text-charcoal transition-colors"
          >
            + Paste a customer reply from Gmail
          </button>
        ) : (
          <div>
            <label
              htmlFor="paste-body"
              className="block text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-2"
            >
              Customer&apos;s reply (from Gmail)
            </label>
            <textarea
              id="paste-body"
              rows={4}
              value={pasteBody}
              onChange={(e) => setPasteBody(e.target.value)}
              placeholder="Paste the body of the customer's reply here. It'll appear as an inbound message in the chat log — no email is sent."
              className="w-full px-4 py-3 rounded-xl border-2 border-grey-light bg-white text-charcoal placeholder:text-grey/40 focus:outline-none focus:border-green/40 transition-colors resize-y text-sm leading-[1.6]"
            />
            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setPasteOpen(false);
                  setPasteBody("");
                }}
                disabled={isPending}
                className="px-4 py-2 rounded-full bg-white border border-charcoal/15 text-charcoal text-sm font-medium hover:bg-cream transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLogManual}
                disabled={isPending || !pasteBody.trim()}
                className="px-5 py-2 rounded-full bg-charcoal text-white text-sm font-semibold hover:bg-charcoal/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? "Adding…" : "Add to log"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Status controls */}
      <div className="bg-white border border-charcoal/10 rounded-2xl p-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-3">
          Status
        </p>
        <div className="flex flex-wrap gap-2">
          {(["open", "replied", "closed"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => handleStatusChange(s)}
              disabled={isPending || s === currentStatus}
              className={`px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-colors ${
                s === currentStatus
                  ? "bg-charcoal text-white border-charcoal cursor-default"
                  : "bg-white border-charcoal/15 text-charcoal/70 hover:border-charcoal/40 hover:text-charcoal"
              } disabled:opacity-60`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
