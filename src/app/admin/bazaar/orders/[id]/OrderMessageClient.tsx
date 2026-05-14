"use client";

import { useState, useTransition } from "react";
import { sendBazaarOrderMessageAction } from "./actions";
import { BAZAAR_SUPPORT_EMAIL } from "@/lib/bazaar-config";

/**
 * Send-email composer for the bazaar order detail page.
 *
 * Same shape as DonationMessageClient — subject + body + Send.
 * On submit, the server action sends via Resend from
 * bazaar@deenrelief.org (Deen Relief Bazaar branded) and logs the
 * send in bazaar_order_messages. Errors surface inline so the
 * trustee can adjust + retry without losing the typed content.
 */
export default function OrderMessageClient({
  orderId,
  customerEmail,
}: {
  orderId: string;
  customerEmail: string;
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
      const result = await sendBazaarOrderMessageAction(
        orderId,
        subject,
        body
      );
      if (result.ok) {
        setSubject("");
        setBody("");
        setInfo(`Sent to ${customerEmail}.`);
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
          htmlFor="order-message-subject"
          className="block text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-1.5"
        >
          Subject
        </label>
        <input
          id="order-message-subject"
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="e.g. Update on your order"
          className="w-full px-4 py-2.5 rounded-xl border-2 border-grey-light bg-white text-charcoal placeholder:text-grey/40 focus:outline-none focus:border-green/40 transition-colors text-sm"
        />
      </div>

      <div>
        <label
          htmlFor="order-message-body"
          className="block text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-1.5"
        >
          Message
        </label>
        <textarea
          id="order-message-body"
          rows={6}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={`Type the email body. The customer will receive it from ${BAZAAR_SUPPORT_EMAIL} wrapped in the Bazaar transactional template — the order's receipt number is automatically referenced.`}
          className="w-full px-4 py-3 rounded-xl border-2 border-grey-light bg-white text-charcoal placeholder:text-grey/40 focus:outline-none focus:border-green/40 transition-colors resize-y text-sm leading-[1.6]"
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] text-charcoal/50">
          Sent to{" "}
          <span className="font-mono text-charcoal/70">{customerEmail}</span>{" "}
          from <span className="font-mono">{BAZAAR_SUPPORT_EMAIL}</span>.
          Replies land in the Bazaar inbox.
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
