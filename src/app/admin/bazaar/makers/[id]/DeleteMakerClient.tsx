"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { deleteMakerAction } from "@/app/admin/bazaar/actions";

/**
 * Danger-zone delete card for the maker edit page.
 *
 * Guard pattern: deleting a maker that still has products would
 * orphan the FK. The DB rejects this anyway via ON DELETE
 * RESTRICT, but we surface a friendly "can't delete, N products
 * still reference this maker" panel instead of letting the user
 * type DELETE only to hit a server-side error.
 *
 * When the maker has zero products, the same typed-confirmation
 * pattern as DeleteProductClient applies.
 */
export default function DeleteMakerClient({
  makerId,
  makerName,
  productCount,
}: {
  makerId: string;
  makerName: string;
  /** Live count of products referencing this maker. Computed
   *  server-side and passed in. */
  productCount: number;
}) {
  const [armed, setArmed] = useState(false);
  const [typed, setTyped] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      try {
        await deleteMakerAction(makerId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Delete failed");
      }
    });
  }

  // Guard: when the maker has products, refuse to expose the
  // delete button at all. Show a clear next-step instead.
  if (productCount > 0) {
    return (
      <section className="bg-white border border-charcoal/15 rounded-2xl p-6">
        <div className="flex items-start gap-3 mb-3">
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
              d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437 1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008Z"
            />
          </svg>
          <div>
            <h2 className="text-charcoal font-heading font-semibold text-base">
              Linked to {productCount} product
              {productCount === 1 ? "" : "s"}
            </h2>
            <p className="text-charcoal/70 text-[13px] leading-relaxed mt-1">
              Makers can&apos;t be deleted while products reference
              them. Either reassign those products to a different
              maker (edit each product and pick a new one) or
              delete the products first.
            </p>
            <Link
              href="/admin/bazaar/products"
              className="inline-block mt-3 text-[13px] text-green font-semibold hover:text-green-dark transition-colors"
            >
              View products →
            </Link>
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
            Permanently delete &ldquo;{makerName}&rdquo;. The row and
            their portrait photo in Supabase Storage are removed.
            Historical orders are unaffected — they keep the maker
            name snapshot that was stored at purchase time.
          </p>
        </div>
      </div>

      {!armed ? (
        <button
          type="button"
          onClick={() => setArmed(true)}
          className="px-4 py-2 rounded-lg bg-white border border-red-200 text-red-700 text-sm font-semibold hover:bg-red-50 transition-colors"
        >
          Delete this maker…
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
