"use client";

import { useState, useTransition } from "react";
import { deleteDonationAction } from "./actions";

/**
 * Danger-zone hard-delete for a donation.
 *
 * Same pattern as DeleteOrderClient — collapsed → typed `DELETE`
 * → permanent removal. Cascades clean up donation_messages.
 * Donor row stays alive (may have other donations).
 *
 * Hard-stop on Gift Aid claimed donations: the server action's
 * underlying helper refuses, returning an error message we
 * surface inline. HMRC requires retention of every Gift Aid
 * claim for six years; deleting one would put the charity out
 * of compliance.
 *
 * The "this is real money" warning panel always surfaces because
 * EVERY donation on the admin is livemode (test-mode donations
 * are filtered out at the fetch layer). Use case: purging
 * accidental duplicates or test rows that somehow leaked into
 * livemode.
 */
export default function DeleteDonationClient({
  donationId,
  receiptNumber,
  amountFormatted,
  donorEmail,
  giftAidClaimed,
  giftAidRevoked,
}: {
  donationId: string;
  receiptNumber: string;
  amountFormatted: string;
  donorEmail: string;
  giftAidClaimed: boolean;
  giftAidRevoked: boolean;
}) {
  const [armed, setArmed] = useState(false);
  const [typed, setTyped] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const giftAidBlocks = giftAidClaimed && !giftAidRevoked;

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteDonationAction(donationId);
      if (!result.ok) {
        setError(result.error ?? "Delete failed.");
      }
      // On success the server action redirects — we never reach
      // here.
    });
  }

  // Gift Aid block: render an explanatory panel and no delete UI
  // at all. The trustee has to revoke first.
  if (giftAidBlocks) {
    return (
      <section className="bg-white border border-charcoal/15 rounded-2xl p-6">
        <div className="flex items-start gap-3">
          <svg
            className="w-5 h-5 text-charcoal/50 flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
            />
          </svg>
          <div>
            <h2 className="text-charcoal font-heading font-semibold text-base">
              Gift Aid block — can&apos;t delete
            </h2>
            <p className="text-charcoal/70 text-[13px] leading-relaxed mt-1">
              This donation has an active Gift Aid claim. HMRC
              requires us to retain Gift Aid records for six years
              from the date of the claim. Revoke the Gift Aid
              declaration first if deletion is truly necessary, or
              leave the donation in place — that&apos;s the
              compliant outcome in every normal case.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white border border-red-200 rounded-2xl p-6">
      <div className="flex items-start gap-3 mb-4">
        <svg
          className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
          />
        </svg>
        <div>
          <h2 className="text-charcoal font-heading font-semibold text-base">
            Danger zone
          </h2>
          <p className="text-charcoal/70 text-[13px] leading-relaxed mt-1">
            Permanently delete donation{" "}
            <span className="font-mono font-semibold">{receiptNumber}</span>
            . The row, any sent emails, and the message history are
            removed. The donor record stays alive (they may have
            other donations).
          </p>
        </div>
      </div>

      <div className="mb-4 rounded-xl bg-amber-light border border-amber/30 p-4 text-[13px] text-amber-dark leading-relaxed">
        <p className="font-semibold mb-1">This is real donor data.</p>
        <p>
          Deleting wipes the record of {amountFormatted} from{" "}
          {donorEmail}. For real donor mistakes the right tool is
          usually <strong>Issue refund</strong>, which preserves the
          paper trail. Only continue if this row is genuinely test/
          duplicate data that needs purging.
        </p>
      </div>

      {!armed ? (
        <button
          type="button"
          onClick={() => setArmed(true)}
          className="px-4 py-2 rounded-lg bg-white border border-red-200 text-red-700 text-sm font-semibold hover:bg-red-50 transition-colors"
        >
          Delete this donation…
        </button>
      ) : (
        <div className="space-y-3">
          <label className="block">
            <span className="block text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-1.5">
              Type <strong className="text-red-700">DELETE</strong> to
              confirm
            </span>
            <input
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoFocus
              autoComplete="off"
              className="block w-full px-3 py-2 rounded-lg border border-charcoal/15 bg-white text-charcoal text-sm focus:outline-none focus:border-red-400"
            />
          </label>

          {error && (
            <p className="text-[12px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setArmed(false);
                setTyped("");
                setError(null);
              }}
              disabled={isPending}
              className="px-4 py-2 rounded-lg bg-white border border-charcoal/15 text-charcoal text-sm font-medium hover:bg-cream transition-colors disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending || typed !== "DELETE"}
              className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? "Deleting…" : "Permanently delete"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
