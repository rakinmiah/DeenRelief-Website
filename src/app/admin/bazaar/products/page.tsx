import type { Metadata } from "next";
import { requireRoleAdmin } from "@/lib/admin-session";
import { fetchAdminProducts } from "@/lib/bazaar-catalog";
import { formatPence } from "@/lib/bazaar-format";
import {
  Button,
  PageHeader,
  StatusBadge,
  ResponsiveTable,
  EmptyState,
  type Column,
} from "@/components/admin/ui";

export const metadata: Metadata = {
  title: "Products | Bazaar Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type ProductRow = Awaited<ReturnType<typeof fetchAdminProducts>>[number];

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
  await requireRoleAdmin();
  const sp = await searchParams;
  const justDeleted = sp.deleted === "1";
  const products = await fetchAdminProducts();

  const columns: Column<ProductRow>[] = [
    {
      key: "product",
      header: "Product",
      primary: true,
      cell: (p) => (
        <div>
          <div className="text-charcoal font-medium">{p.name}</div>
          <div className="text-charcoal/50 text-[11px] font-mono">{p.sku}</div>
        </div>
      ),
    },
    {
      key: "maker",
      header: "Maker",
      cell: (p) => <span className="text-charcoal/70">{p.makerName}</span>,
    },
    {
      key: "category",
      header: "Category",
      cell: (p) => (
        <span className="text-charcoal/70 capitalize">
          {p.category.replace(/-/g, " ")}
        </span>
      ),
    },
    {
      key: "price",
      header: "Price",
      align: "right",
      secondary: true,
      cell: (p) => (
        <span className="text-charcoal font-semibold whitespace-nowrap">
          {formatPence(p.pricePence)}
        </span>
      ),
    },
    {
      key: "stock",
      header: "Stock",
      cell: (p) => {
        const lowStock = p.stockCount <= p.lowStockThreshold && p.isActive;
        return (
          <span
            className={`font-medium whitespace-nowrap ${
              lowStock ? "text-amber-dark" : "text-charcoal/70"
            }`}
          >
            {p.stockCount}
            {lowStock && (
              <span className="ml-1 text-[10px] font-bold uppercase tracking-[0.1em]">
                Low
              </span>
            )}
          </span>
        );
      },
    },
    {
      key: "variants",
      header: "Variants",
      hideOnMobile: true,
      cell: (p) => <span className="text-charcoal/70">{p.variantCount}</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (p) => (
        <StatusBadge
          domain="visibility"
          status={p.isActive ? "active" : "hidden"}
          variant="outline"
        />
      ),
    },
  ];

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {justDeleted && (
        <p className="mb-6 px-4 py-2 rounded-lg bg-green/10 border border-green/30 text-green-dark text-sm">
          Product deleted. Historical orders kept their snapshot
          fields and continue to render correctly.
        </p>
      )}
      <PageHeader
        eyebrow="Bazaar catalog"
        title="Products"
        description="Every product in the catalog. Active products show on the public /bazaar; hidden products keep their order history intact but disappear from the catalog."
        actions={
          <Button href="/admin/bazaar/products/new" size="sm">
            New product
          </Button>
        }
      />

      <ResponsiveTable<ProductRow>
        rows={products}
        getRowKey={(p) => p.id}
        rowHref={(p) => `/admin/bazaar/products/${p.id}`}
        rowLabel={(p) => p.name}
        columns={columns}
        empty={
          <EmptyState
            title="No products yet"
            description="Create your first to seed the catalog."
          />
        }
      />
    </main>
  );
}
