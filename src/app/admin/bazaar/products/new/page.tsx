import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminSession } from "@/lib/admin-session";
import { fetchAdminMakers } from "@/lib/bazaar-catalog";
import { createProductAction } from "@/app/admin/bazaar/actions";
import ProductFormFields from "../ProductFormFields";

export const metadata: Metadata = {
  title: "New product | Bazaar Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  await requireAdminSession();
  const makers = await fetchAdminMakers();

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link
          href="/admin/bazaar/products"
          className="text-charcoal/60 hover:text-charcoal text-xs uppercase tracking-[0.1em] font-bold transition-colors"
        >
          ← All products
        </Link>
        <h1 className="text-charcoal font-heading font-bold text-2xl sm:text-3xl mt-1">
          New product
        </h1>
        {makers.length === 0 && (
          <p className="mt-3 px-4 py-2 rounded-lg bg-amber-light border border-amber/30 text-amber-dark text-sm">
            You need at least one maker before you can create a product.
            <Link
              href="/admin/bazaar/makers/new"
              className="ml-2 underline font-medium"
            >
              Create a maker →
            </Link>
          </p>
        )}
      </div>

      <form
        action={createProductAction}
        className="bg-white border border-charcoal/10 rounded-2xl p-6"
      >
        <ProductFormFields makers={makers} />
        <div className="mt-6 flex justify-end gap-3">
          <Link
            href="/admin/bazaar/products"
            className="px-4 py-2 rounded-full bg-white border border-charcoal/15 text-charcoal text-sm font-medium hover:bg-cream transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={makers.length === 0}
            className="px-5 py-2 rounded-full bg-charcoal text-white text-sm font-semibold hover:bg-charcoal/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create product
          </button>
        </div>
        <p className="mt-3 text-[11px] text-charcoal/50">
          Variants (sizes, colours) and stock adjustments are managed
          on the product detail page after creation.
        </p>
      </form>
    </main>
  );
}
