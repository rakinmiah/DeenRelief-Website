"use client";

import { useState, useTransition } from "react";
import { deleteProductAction } from "@/app/admin/bazaar/actions";

/**
 * Danger-zone delete card for the product edit page.
 *
 * Behaviour:
 *   - Two-stage confirmation: click "Delete this product" to
 *     reveal a typed-confirmation input ("type DELETE to
 *     confirm"). Prevents accidental clicks; matches the pattern
 *     used by GitHub / Vercel for destructive ops.
 *   - On confirm, calls deleteProductAction which removes the
 *     row + uploaded images and redirects to the products list.
 *   - Surfaces server-side errors inline if the delete fails
 *     (storage layer issue, RLS, etc).
 *
 * Why typed-confirm + a button (rather than just window.confirm):
 * the form input forces the trustee to pause and read the
 * product name. Native window.confirm is too easy to dismiss
 * mid-thought.
 */
export default function DeleteProductClient({
  productId,
  productName,
  hasOrders,
}: {
  productId: string;
  productName: string;
  /** Surfaced in the warning so the trustee knows historical
   *  orders won't be affected — they keep their snapshot fields
   *  and just lose the FK pointer. */
  hasOrders: boolean;
}) {
  const [armed, setArmed] = useState(false);
  const [typed, setTyped] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      try {
        await deleteProductAction(productId);
        // On success the server action redirects — this code
        // never runs. Kept defensively so any unexpected return
        // path doesn't leave the UI in a confused state.
      } catch (err) {
        setError(err instanceof Error ? err.message : "Delete failed");
      }
    });
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
            Permanently delete &ldquo;{productName}&rdquo; from the
            catalog. The row, its variants, and any uploaded images
            in Supabase Storage are removed.
            {hasOrders ? (
              <>
                {" "}
                Historical orders are <strong>preserved</strong> — they
                keep the product name, maker, price and quantity
                snapshots that were stored at purchase time, and the
                customer&apos;s receipt still renders correctly.
              </>
            ) : null}
          </p>
        </div>
      </div>

      {!armed ? (
        <button
          type="button"
          onClick={() => setArmed(true)}
          className="px-4 py-2 rounded-lg bg-white border border-red-200 text-red-700 text-sm font-semibold hover:bg-red-50 transition-colors"
        >
          Delete this product…
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
