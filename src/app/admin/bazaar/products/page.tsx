import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminSession } from "@/lib/admin-session";
import { fetchAdminProducts } from "@/lib/bazaar-catalog";
import { formatPence } from "@/lib/bazaar-format";

export const metadata: Metadata = {
  title: "Products | Bazaar Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Admin product list. Shows every product (active and inactive)
 * with a quick read on stock and pricing. Low-stock rows get an
 * amber accent so trustees notice them before they sell out.
 */
export default async function AdminProductsListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminSession();
  const sp = await searchParams;
  const justDeleted = sp.deleted === "1";
  const products = await fetchAdminProducts();

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {justDeleted && (
        <p className="mb-6 px-4 py-2 rounded-lg bg-green/10 border border-green/30 text-green-dark text-sm">
          Product deleted. Historical orders kept their snapshot
          fields and continue to render correctly.
        </p>
      )}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="block text-[11px] font-bold tracking-[0.15em] uppercase text-amber-dark mb-1">
            Bazaar catalog
          </span>
          <h1 className="text-charcoal font-heading font-bold text-2xl sm:text-3xl">
            Products
          </h1>
          <p className="text-grey text-sm mt-2 max-w-2xl">
            Every product in the catalog. Active products show on the
            public /bazaar; hidden products keep their order history
            intact but disappear from the catalog.
          </p>
        </div>
        <Link
          href="/admin/bazaar/products/new"
          className="px-4 py-2 rounded-full bg-charcoal text-white text-sm font-semibold hover:bg-charcoal/90 transition-colors whitespace-nowrap"
        >
          New product
        </Link>
      </div>

      <div className="bg-white border border-charcoal/10 rounded-2xl overflow-hidden">
        {products.length === 0 ? (
          <div className="p-12 text-center text-charcoal/60 text-sm">
            No products yet. Create your first to seed the catalog.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead className="bg-cream border-b border-charcoal/10">
                <tr className="text-left">
                  {[
                    "Product",
                    "Maker",
                    "Category",
                    "Price",
                    "Stock",
                    "Variants",
                    "Status",
                    "",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3 font-bold uppercase tracking-[0.1em] text-charcoal/60 text-[11px] whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-charcoal/8">
                {products.map((p) => {
                  const lowStock =
                    p.stockCount <= p.lowStockThreshold && p.isActive;
                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-cream/50 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <div className="text-charcoal font-medium">
                          {p.name}
                        </div>
                        <div className="text-charcoal/50 text-[11px] font-mono">
                          {p.sku}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-charcoal/70">
                        {p.makerName}
                      </td>
                      <td className="px-5 py-4 text-charcoal/70 capitalize">
                        {p.category.replace(/-/g, " ")}
                      </td>
                      <td className="px-5 py-4 text-charcoal font-medium whitespace-nowrap">
                        {formatPence(p.pricePence)}
                      </td>
                      <td
                        className={`px-5 py-4 font-medium whitespace-nowrap ${
                          lowStock ? "text-amber-dark" : "text-charcoal/70"
                        }`}
                      >
                        {p.stockCount}
                        {lowStock && (
                          <span className="ml-1 text-[10px] font-bold uppercase tracking-[0.1em]">
                            Low
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-charcoal/70">
                        {p.variantCount}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium uppercase tracking-wider border ${
                            p.isActive
                              ? "bg-green/10 text-green-dark border-green/30"
                              : "bg-charcoal/8 text-charcoal/60 border-charcoal/15"
                          }`}
                        >
                          {p.isActive ? "Active" : "Hidden"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <Link
                          href={`/admin/bazaar/products/${p.id}`}
                          className="text-green text-sm font-medium hover:underline"
                        >
                          Edit →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
