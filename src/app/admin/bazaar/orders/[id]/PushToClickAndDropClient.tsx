"use client";

import { useState, useTransition } from "react";
import { pushToClickAndDropAction } from "./actions";

/**
 * "Push to Click & Drop" button on the order detail page.
 *
 * Two states:
 *   - Already pushed → renders a quiet pill showing the C&D
 *     reference + timestamp. No action; re-pushing isn't allowed
 *     (duplicate refs at C&D).
 *   - Not yet pushed → renders the Push button. On click:
 *       1. Server action POSTs to Royal Mail's Order API
 *       2. On success → page revalidates, status flips to "pushed"
 *       3. On failure → inline error with the API's reason
 *
 * The button is only shown when the order is in `paid` status —
 * see the gating logic in the server action. Trustees still need
 * to log into C&D to generate the actual label PDF after the push.
 */
export default function PushToClickAndDropClient({
  orderId,
  alreadyPushed,
  clickAndDropOrderId,
  pushedAt,
}: {
  orderId: string;
  alreadyPushed: boolean;
  clickAndDropOrderId: string | null;
  pushedAt: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  if (alreadyPushed && clickAndDropOrderId) {
    return (
      <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 text-[13px]">
        <p className="text-blue-800 font-semibold mb-1">
          Pushed to Click &amp; Drop
        </p>
        <p className="text-charcoal/70">
          Reference{" "}
          <span className="font-mono font-semibold">
            {clickAndDropOrderId}
          </span>{" "}
          — log into{" "}
          <a
            href="https://business.parcel.royalmail.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-charcoal"
          >
            Click &amp; Drop
          </a>{" "}
          to generate the label, then paste the tracking number into
          &ldquo;Mark shipped&rdquo;.
        </p>
        {pushedAt && (
          <p className="text-charcoal/40 text-[11px] mt-2">
            Pushed {new Date(pushedAt).toLocaleString("en-GB")}
          </p>
        )}
      </div>
    );
  }

  function handlePush() {
    setError(null);
    setInfo(null);
    startTransition(async () => {
      const result = await pushToClickAndDropAction(orderId);
      if (result.ok && result.clickAndDropOrderId) {
        setInfo(`Pushed to C&D as ${result.clickAndDropOrderId}.`);
      } else {
        setError(result.error ?? "Couldn't push to Click & Drop.");
      }
    });
  }

  return (
    <div className="space-y-2">
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
      <button
        type="button"
        onClick={handlePush}
        disabled={isPending}
        className="w-full px-4 py-2.5 rounded-full bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
      >
        {isPending ? (
          "Pushing…"
        ) : (
          <>
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
              />
            </svg>
            Push to Click &amp; Drop
          </>
        )}
      </button>
      <p className="text-[11px] text-charcoal/50 leading-relaxed">
        Sends the shipping address + line items to Royal Mail&apos;s
        Click &amp; Drop. You&apos;ll still need to log in to C&amp;D
        to generate the label PDF.
      </p>
    </div>
  );
}
