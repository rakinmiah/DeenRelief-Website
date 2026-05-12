"use client";

import { useState, useTransition } from "react";
import { sendDonationMessageAction } from "./actions";

/**
 * Send-email composer for the donation detail page.
 *
 * Subject + body + Send. On submit:
 *   - The server action sends via Resend from info@deenrelief.org.
 *   - The send is logged in donation_messages regardless of
 *     outcome (so a failed send still appears in the history with
 *     an error reason).
 *   - The page revalidates so the history list below shows the
 *     new row immediately.
 *
 * Errors are surfaced inline; the trustee can adjust + retry
 * without losing the typed content.
 */
export default function DonationMessageClient({
  donationId,
  donorEmail,
}: {
  donationId: string;
  donorEmail: string;
}) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  function handleSend() {
    if (!subject.trim() || !body.trim()) return;
    setError(null);
    setInfo(null);
    startTransition(async () => {
      const result = await sendDonationMessageAction(
        donationId,
        subject,
        body
      );
      if (result.ok) {
        setSubject("");
        setBody("");
        setInfo(`Sent to ${donorEmail}.`);
      } else {
        setError(result.error ?? "Couldn't send the email.");
      }
    });
  }

  return (
    <div className="space-y-3">
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

      <div>
        <label
          htmlFor="donation-message-subject"
          className="block text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-1.5"
        >
          Subject
        </label>
        <input
          id="donation-message-subject"
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="e.g. Thank you for your continued support"
          className="w-full px-4 py-2.5 rounded-xl border-2 border-grey-light bg-white text-charcoal placeholder:text-grey/40 focus:outline-none focus:border-green/40 transition-colors text-sm"
        />
      </div>

      <div>
        <label
          htmlFor="donation-message-body"
          className="block text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-1.5"
        >
          Message
        </label>
        <textarea
          id="donation-message-body"
          rows={6}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Type the email body. The donor will receive it from info@deenrelief.org wrapped in the standard charity template."
          className="w-full px-4 py-3 rounded-xl border-2 border-grey-light bg-white text-charcoal placeholder:text-grey/40 focus:outline-none focus:border-green/40 transition-colors resize-y text-sm leading-[1.6]"
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] text-charcoal/50">
          Sent to{" "}
          <span className="font-mono text-charcoal/70">{donorEmail}</span>{" "}
          from <span className="font-mono">info@deenrelief.org</span>.
          Replies land in the shared inbox.
        </p>
        <button
          type="button"
          onClick={handleSend}
          disabled={isPending || !subject.trim() || !body.trim()}
          className="px-5 py-2 rounded-full bg-green text-white text-sm font-semibold hover:bg-green-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {isPending ? "Sending…" : "Send email"}
        </button>
      </div>
    </div>
  );
}
