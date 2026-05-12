import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminSession } from "@/lib/admin-session";
import {
  fetchAdminMakers,
  fetchAdminProducts,
} from "@/lib/bazaar-catalog";

export const metadata: Metadata = {
  title: "Catalog | Bazaar Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Bazaar catalog hub. Lands the trustee on a two-card choice:
 * manage products, or manage makers. Keeps the top-nav slim with
 * one "Bazaar Catalog" entry instead of two; once the admin picks,
 * each section has its own list page + create/edit flow.
 */
export default async function AdminBazaarCatalogPage() {
  await requireAdminSession();
  const [products, makers] = await Promise.all([
    fetchAdminProducts(),
    fetchAdminMakers(),
  ]);

  const activeProducts = products.filter((p) => p.isActive).length;
  const lowStockProducts = products.filter(
    (p) => p.isActive && p.stockCount <= p.lowStockThreshold
  ).length;
  const activeMakers = makers.filter((m) => m.isActive).length;

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <span className="block text-[11px] font-bold tracking-[0.15em] uppercase text-amber-dark mb-1">
          Bazaar
        </span>
        <h1 className="text-charcoal font-heading font-bold text-2xl sm:text-3xl">
          Catalog
        </h1>
        <p className="text-grey text-sm mt-2 max-w-2xl">
          Products and makers that power the public /bazaar shop.
          Stock adjustments, variants, and active/hidden toggles all
          live here.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Link
          href="/admin/bazaar/products"
          className="group bg-white border border-charcoal/10 rounded-2xl p-5 hover:border-charcoal/30 hover:shadow-sm transition-all"
        >
          <div className="flex items-start justify-between mb-3">
            <span className="block text-[11px] font-bold tracking-[0.1em] uppercase text-amber-dark">
              Catalogue
            </span>
            <span className="text-charcoal/40 group-hover:text-charcoal transition-colors">
              →
            </span>
          </div>
          <h2 className="text-charcoal font-heading font-semibold text-lg mb-1">
            Products
          </h2>
          <p className="text-grey text-sm leading-relaxed">
            Every product in the catalog. Edit pricing, stock, variants,
            and images. {activeProducts} active
            {lowStockProducts > 0 && (
              <span className="text-amber-dark font-medium">
                {" · "}
                {lowStockProducts} low stock
              </span>
            )}
            .
          </p>
        </Link>

        <Link
          href="/admin/bazaar/makers"
          className="group bg-white border border-charcoal/10 rounded-2xl p-5 hover:border-charcoal/30 hover:shadow-sm transition-all"
        >
          <div className="flex items-start justify-between mb-3">
            <span className="block text-[11px] font-bold tracking-[0.1em] uppercase text-amber-dark">
              People
            </span>
            <span className="text-charcoal/40 group-hover:text-charcoal transition-colors">
              →
            </span>
          </div>
          <h2 className="text-charcoal font-heading font-semibold text-lg mb-1">
            Makers
          </h2>
          <p className="text-grey text-sm leading-relaxed">
            The artisans behind every product. Stories, photos, and
            active flags. {activeMakers} active.
          </p>
        </Link>
      </div>
    </main>
  );
}
