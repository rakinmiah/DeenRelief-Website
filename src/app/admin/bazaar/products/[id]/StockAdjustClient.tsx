"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adjustStockAction } from "@/app/admin/bazaar/actions";

/**
 * Stock adjustment widget on the product edit page.
 *
 * Separate from the product edit form for two reasons:
 *   1. It's a separate audit log action ("adjust_bazaar_stock") so
 *      trustees can review stock movements distinct from product
 *      metadata changes.
 *   2. The delta + reason model is the natural inventory pattern —
 *      "+10, new batch arrived" or "-1, damaged in shipping" is
 *      what the trustee wants to express, not "change stock to 14".
 *
 * Adjusts the parent product stock OR a specific variant's stock
 * via the variantId picker. The check constraint on the schema
 * rejects negative results — the route surfaces the error.
 */
type VariantOption = {
  id: string;
  label: string;
  stockCount: number;
};

export default function StockAdjustClient({
  productId,
  productStockCount,
  variants,
}: {
  productId: string;
  productStockCount: number;
  variants: VariantOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");
  const [variantId, setVariantId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    const data = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await adjustStockAction(productId, data);
        setNotice(`Stock adjusted by ${delta}.`);
        setDelta("");
        setReason("");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Adjustment failed");
      }
    });
  }

  return (
    <section className="bg-charcoal text-white rounded-2xl p-6">
      <h2 className="text-xs font-bold uppercase tracking-[0.1em] text-white/60 mb-3">
        Adjust stock
      </h2>
      <p className="text-[12px] text-white/60 mb-4 leading-relaxed">
        Add or remove inventory. Logged to the audit trail with the
        reason you provide. Current parent stock:{" "}
        <strong className="text-white">{productStockCount}</strong>.
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        {variants.length > 0 && (
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-[0.1em] text-white/60 mb-1.5">
              Target
            </label>
            <select
              name="variantId"
              value={variantId}
              onChange={(e) => setVariantId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/15 text-white text-sm focus:outline-none focus:border-amber/60"
            >
              <option value="">Parent product</option>
              {variants.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label} (stock: {v.stockCount})
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-[0.1em] text-white/60 mb-1.5">
            Delta
          </label>
          <input
            name="delta"
            type="number"
            required
            value={delta}
            onChange={(e) => setDelta(e.target.value)}
            placeholder="+10 or -1"
            className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/15 text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-amber/60"
          />
          <p className="mt-1 text-[10px] text-white/40">
            Positive to add stock, negative to remove. Cannot push stock
            below zero.
          </p>
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-[0.1em] text-white/60 mb-1.5">
            Reason (optional)
          </label>
          <input
            name="reason"
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="New batch from Sylhet"
            className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/15 text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-amber/60"
          />
        </div>

        {error && (
          <p className="text-[12px] text-red-300 bg-red-900/20 border border-red-500/30 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
        {notice && (
          <p className="text-[12px] text-green bg-green/10 border border-green/30 rounded-lg px-3 py-2">
            {notice}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending || delta === ""}
          className="w-full px-4 py-2.5 rounded-full bg-amber text-charcoal text-sm font-semibold hover:bg-amber-dark transition-colors disabled:opacity-60"
        >
          {isPending ? "Adjusting…" : "Apply adjustment"}
        </button>
      </form>
    </section>
  );
}
