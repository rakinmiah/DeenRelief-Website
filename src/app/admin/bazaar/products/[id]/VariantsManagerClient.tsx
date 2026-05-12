"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createVariantAction,
  deleteVariantAction,
  updateVariantAction,
} from "@/app/admin/bazaar/actions";

/**
 * Variant management table for a product's edit page.
 *
 * Existing variants render as editable rows (save in place). A
 * trailing "Add variant" row creates new ones. Delete is a button
 * with a window.confirm.
 *
 * Server actions handle the writes — this component just wraps them
 * in useTransition so the UI shows a pending state while the page
 * re-renders.
 */
type VariantRow = {
  id: string;
  size: string | null;
  colour: string | null;
  sku: string;
  stockCount: number;
  pricePenceOverride: number | null;
};

export default function VariantsManagerClient({
  productId,
  initialVariants,
}: {
  productId: string;
  initialVariants: VariantRow[];
}) {
  return (
    <section className="bg-white border border-charcoal/10 rounded-2xl p-6">
      <div className="flex items-end justify-between gap-3 mb-4">
        <div>
          <h2 className="text-charcoal font-heading font-semibold text-lg">
            Variants
          </h2>
          <p className="text-charcoal/50 text-[12px] mt-1">
            Optional. If a product has no variants, the parent stock
            count + price apply. Variant stock takes precedence at
            checkout when present.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {initialVariants.map((v) => (
          <VariantRowEdit
            key={v.id}
            productId={productId}
            variant={v}
          />
        ))}
        <VariantNewRow productId={productId} />
      </div>
    </section>
  );
}

function VariantRowEdit({
  productId,
  variant,
}: {
  productId: string;
  variant: VariantRow;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const data = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await updateVariantAction(variant.id, productId, data);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Update failed");
      }
    });
  }

  async function handleDelete() {
    if (!window.confirm("Delete this variant? This can't be undone."))
      return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteVariantAction(variant.id, productId);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Delete failed");
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-2 lg:grid-cols-[1fr_1fr_1.2fr_0.8fr_0.8fr_auto_auto] gap-2 items-end p-3 bg-cream rounded-xl"
    >
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-1">
          Size
        </label>
        <input
          name="size"
          type="text"
          defaultValue={variant.size ?? ""}
          placeholder="—"
          className={inputCx}
        />
      </div>
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-1">
          Colour
        </label>
        <input
          name="colour"
          type="text"
          defaultValue={variant.colour ?? ""}
          placeholder="—"
          className={inputCx}
        />
      </div>
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-1">
          SKU
        </label>
        <input
          name="sku"
          type="text"
          required
          defaultValue={variant.sku}
          className={`${inputCx} font-mono`}
        />
      </div>
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-1">
          Stock
        </label>
        <input
          name="stockCount"
          type="number"
          min={0}
          required
          defaultValue={variant.stockCount}
          className={inputCx}
        />
      </div>
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-1">
          Price (p)
        </label>
        <input
          name="pricePenceOverride"
          type="number"
          min={100}
          defaultValue={variant.pricePenceOverride ?? ""}
          placeholder="—"
          className={inputCx}
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="px-3 py-2 rounded-lg bg-charcoal text-white text-xs font-semibold hover:bg-charcoal/90 transition-colors disabled:opacity-50"
      >
        {isPending ? "…" : "Save"}
      </button>
      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        className="px-3 py-2 rounded-lg bg-white border border-red-200 text-red-700 text-xs font-semibold hover:bg-red-50 transition-colors disabled:opacity-50"
      >
        Delete
      </button>
      {error && (
        <p className="col-span-full text-[11px] text-red-700">{error}</p>
      )}
    </form>
  );
}

function VariantNewRow({ productId }: { productId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [size, setSize] = useState("");
  const [colour, setColour] = useState("");
  const [sku, setSku] = useState("");
  const [stockCount, setStockCount] = useState("0");
  const [pricePenceOverride, setPricePenceOverride] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const data = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await createVariantAction(productId, data);
        // Clear the row so the admin can add another.
        setSize("");
        setColour("");
        setSku("");
        setStockCount("0");
        setPricePenceOverride("");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Create failed");
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-2 lg:grid-cols-[1fr_1fr_1.2fr_0.8fr_0.8fr_auto] gap-2 items-end p-3 bg-white border-2 border-dashed border-charcoal/20 rounded-xl"
    >
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-1">
          Size
        </label>
        <input
          name="size"
          type="text"
          value={size}
          onChange={(e) => setSize(e.target.value)}
          placeholder="Medium"
          className={inputCx}
        />
      </div>
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-1">
          Colour
        </label>
        <input
          name="colour"
          type="text"
          value={colour}
          onChange={(e) => setColour(e.target.value)}
          placeholder="Cream"
          className={inputCx}
        />
      </div>
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-1">
          SKU
        </label>
        <input
          name="sku"
          type="text"
          required
          value={sku}
          onChange={(e) => setSku(e.target.value)}
          placeholder="DR-ABY-001-M"
          className={`${inputCx} font-mono`}
        />
      </div>
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-1">
          Stock
        </label>
        <input
          name="stockCount"
          type="number"
          min={0}
          required
          value={stockCount}
          onChange={(e) => setStockCount(e.target.value)}
          className={inputCx}
        />
      </div>
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-1">
          Price (p)
        </label>
        <input
          name="pricePenceOverride"
          type="number"
          min={100}
          value={pricePenceOverride}
          onChange={(e) => setPricePenceOverride(e.target.value)}
          placeholder="—"
          className={inputCx}
        />
      </div>
      <button
        type="submit"
        disabled={isPending || sku.trim() === ""}
        className="px-3 py-2 rounded-lg bg-amber text-charcoal text-xs font-semibold hover:bg-amber-dark transition-colors disabled:opacity-50"
      >
        {isPending ? "…" : "Add variant"}
      </button>
      {error && (
        <p className="col-span-full text-[11px] text-red-700">{error}</p>
      )}
    </form>
  );
}

const inputCx =
  "block w-full px-2 py-1.5 rounded border border-charcoal/15 bg-white text-charcoal text-xs focus:outline-none focus:border-charcoal/50";
