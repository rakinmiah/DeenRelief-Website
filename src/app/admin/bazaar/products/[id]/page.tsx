import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminSession } from "@/lib/admin-session";
import {
  fetchAdminMakers,
  fetchAdminProductById,
} from "@/lib/bazaar-catalog";
import { updateProductAction } from "@/app/admin/bazaar/actions";
import { formatPence } from "@/lib/bazaar-format";
import ProductFormFields from "../ProductFormFields";
import VariantsManagerClient from "./VariantsManagerClient";
import StockAdjustClient from "./StockAdjustClient";
import DeleteProductClient from "./DeleteProductClient";

export const metadata: Metadata = {
  title: "Edit product | Bazaar Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminSession();
  const { id } = await params;
  const sp = await searchParams;
  const justSaved = sp.saved === "1";

  const [detail, makers] = await Promise.all([
    fetchAdminProductById(id),
    fetchAdminMakers(),
  ]);
  if (!detail) notFound();
  const { product, makerId } = detail;

  const action = updateProductAction.bind(null, id);

  // Variants reduced to the {id, label, stockCount} shape the
  // stock-adjust widget needs for its picker.
  const variantOptions = product.variants.map((v) => ({
    id: v.id,
    label:
      [v.size, v.colour].filter(Boolean).join(" · ") || v.sku || "(variant)",
    stockCount: v.stockCount,
  }));

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link
          href="/admin/bazaar/products"
          className="text-charcoal/60 hover:text-charcoal text-xs uppercase tracking-[0.1em] font-bold transition-colors"
        >
          ← All products
        </Link>
        <h1 className="text-charcoal font-heading font-bold text-2xl sm:text-3xl mt-1">
          {product.name}
        </h1>
        <p className="text-charcoal/50 text-[11px] mt-1 font-mono break-all">
          {product.sku} · /bazaar/{product.slug} · price{" "}
          {formatPence(product.pricePence)} · stock {product.stockCount}
        </p>
      </div>

      {justSaved && (
        <p className="mb-4 px-4 py-2 rounded-lg bg-green/10 border border-green/30 text-green-dark text-sm">
          Product saved.
        </p>
      )}

      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-6">
          {/* Core fields */}
          <form
            action={action}
            className="bg-white border border-charcoal/10 rounded-2xl p-6"
          >
            <ProductFormFields
              makers={makers}
              initial={{
                slug: product.slug,
                name: product.name,
                tagline: product.tagline,
                description: product.description,
                category: product.category,
                sku: product.sku,
                pricePence: product.pricePence,
                weightGrams: product.weightGrams,
                primaryImage: product.primaryImage,
                galleryImages: product.galleryImages,
                materials: product.materials,
                careInstructions: product.careInstructions,
                sizingGuideHtml: product.sizingGuide ?? null,
                makerId,
                stockCount: product.stockCount,
                lowStockThreshold: product.lowStockThreshold,
                isActive: product.isActive,
              }}
            />
            <div className="mt-6 flex justify-end gap-3">
              <Link
                href="/admin/bazaar/products"
                className="px-4 py-2 rounded-full bg-white border border-charcoal/15 text-charcoal text-sm font-medium hover:bg-cream transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                className="px-5 py-2 rounded-full bg-charcoal text-white text-sm font-semibold hover:bg-charcoal/90 transition-colors"
              >
                Save product
              </button>
            </div>
          </form>

          {/* Variants */}
          <VariantsManagerClient
            productId={product.id}
            initialVariants={product.variants.map((v) => ({
              id: v.id,
              size: v.size ?? null,
              colour: v.colour ?? null,
              sku: v.sku,
              stockCount: v.stockCount,
              pricePenceOverride: v.pricePence ?? null,
            }))}
          />
        </div>

        {/* Side panel — stock adjustment */}
        <aside>
          <StockAdjustClient
            productId={product.id}
            productStockCount={product.stockCount}
            variants={variantOptions}
          />
        </aside>
      </div>

      {/* Danger zone — permanent delete. Sits below the main two-
          column layout so it's deliberate to scroll to, not in
          the trustee's flow during normal editing. */}
      <div className="mt-10">
        <DeleteProductClient
          productId={product.id}
          productName={product.name}
          hasOrders={false}
        />
      </div>
    </main>
  );
}
