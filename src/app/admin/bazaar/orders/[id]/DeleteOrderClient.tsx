"use client";

import { useState, useTransition } from "react";
import BottomSheet from "@/components/admin/BottomSheet";
import { deleteBazaarOrderAction } from "./actions";

/**
 * Danger-zone hard-delete for a bazaar order.
 *
 * Pattern matches DeleteProductClient / DeleteMakerClient:
 *   - Collapsed by default behind a "Delete this order…" button
 *   - Tapping opens a bottom-sheet confirm with the typed `DELETE`
 *     input + warning panel + cancel/confirm buttons
 *
 * Two safety layers above the typed confirm:
 *   1. The sheet explains EXACTLY what will be deleted —
 *      the order, all line items, any customer comms history, any
 *      abandonment emails. Linked inquiries stay alive but lose
 *      their order link.
 *   2. For livemode orders that were paid/fulfilled/delivered, an
 *      additional warning panel calls out that this is real
 *      customer data and they probably want refund-and-cancel
 *      instead of delete. Use case is purging accidental test
 *      orders, not erasing real history.
 *
 * Stock auto-restores when status was paid/fulfilled/delivered or
 * had an active hold — see the server action.
 *
 * The confirm UI lives in a BottomSheet (rather than expanding
 * inline) so the mobile keyboard doesn't cover the cancel/confirm
 * buttons, and the typed-DELETE check is case-insensitive so
 * trustees don't have to fight with mobile shift-key behaviour.
 */
export default function DeleteOrderClient({
  orderId,
  receiptNumber,
  status,
  livemode,
  customerEmail,
  totalFormatted,
}: {
  orderId: string;
  receiptNumber: string;
  status: string;
  livemode: boolean;
  customerEmail: string;
  totalFormatted: string;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // High-risk = live order that customer actually received goods
  // for. The user is almost certainly trying to delete a test/
  // accidental row, but we surface the warning regardless because
  // accidentally deleting real customer history is unrecoverable.
  const isHighRisk =
    livemode &&
    (status === "paid" || status === "fulfilled" || status === "delivered");
  const canConfirm = typed.trim().toUpperCase() === "DELETE";

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      try {
        await deleteBazaarOrderAction(orderId);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Delete failed."
        );
      }
    });
  }

  function handleClose() {
    if (isPending) return;
    setSheetOpen(false);
    setTimeout(() => {
      setTyped("");
      setError(null);
    }, 200);
  }

  return (
    <>
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
              Permanently delete order{" "}
              <span className="font-mono font-semibold">{receiptNumber}</span>
              . The order, line items, customer comms history, and any
              abandonment emails are removed. Linked inquiries stay
              alive but lose the order link. Stock is auto-restored
              when applicable.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="px-4 py-2 rounded-lg bg-white border border-red-200 text-red-700 text-sm font-semibold hover:bg-red-50 transition-colors"
        >
          Delete this order…
        </button>
      </section>

      <BottomSheet
        open={sheetOpen}
        onClose={handleClose}
        title="Confirm deletion"
        hideHandle
      >
        <div className="space-y-4">
          {isHighRisk && (
            <div className="rounded-xl bg-amber-light border border-amber/30 p-4 text-[13px] text-amber-dark leading-relaxed">
              <p className="font-semibold mb-1">
                This is a live, paid order.
              </p>
              <p>
                Deleting wipes the only record of a real customer
                transaction ({totalFormatted} to {customerEmail}). If
                you need to reverse the order, the right tool is{" "}
                <strong>Issue refund</strong>, not delete. Only
                continue if this row is genuinely test/accidental
                data that slipped into live mode.
              </p>
            </div>
          )}

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
              autoCapitalize="characters"
              spellCheck={false}
              className="block w-full px-3 py-2 rounded-lg border border-charcoal/15 bg-white text-charcoal text-base focus:outline-none focus:border-red-400"
            />
            <span className="block mt-1 text-[11px] text-charcoal/50">
              Lower or upper case both fine.
            </span>
          </label>

          {error && (
            <p className="text-[12px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isPending}
              className="flex-1 min-h-[44px] px-4 py-2 rounded-lg bg-white border border-charcoal/15 text-charcoal text-sm font-medium hover:bg-cream transition-colors disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending || !canConfirm}
              className="flex-1 min-h-[44px] px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? "Deleting…" : "Permanently delete"}
            </button>
          </div>
        </div>
      </BottomSheet>
    </>
  );
}
