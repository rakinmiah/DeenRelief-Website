import type { Metadata } from "next";
import { requireRoleAdmin } from "@/lib/admin-session";
import { fetchAdminMakers } from "@/lib/bazaar-catalog";
import {
  Button,
  PageHeader,
  StatusBadge,
  ResponsiveTable,
  EmptyState,
  type Column,
} from "@/components/admin/ui";

export const metadata: Metadata = {
  title: "Makers | Bazaar Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type MakerRow = Awaited<ReturnType<typeof fetchAdminMakers>>[number];

/**
 * Admin maker list. One row per artisan / cooperative. Each maker
 * is reusable across products (one maker → many products), so this
 * is a small table that grows slowly.
 *
 * Inactive makers stay visible to the admin so trustees can
 * reactivate or audit them — only active rows are restricted on
 * the public /bazaar/about-our-makers page via RLS.
 */
export default async function AdminMakersListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRoleAdmin();
  const sp = await searchParams;
  const justDeleted = sp.deleted === "1";
  const makers = await fetchAdminMakers();

  const columns: Column<MakerRow>[] = [
    {
      key: "name",
      header: "Name",
      primary: true,
      cell: (m) => <span className="text-charcoal font-medium">{m.name}</span>,
    },
    {
      key: "country",
      header: "Country",
      cell: (m) => <span className="text-charcoal/70">{m.country}</span>,
    },
    {
      key: "region",
      header: "Region",
      cell: (m) => <span className="text-charcoal/70">{m.region}</span>,
    },
    {
      key: "status",
      header: "Status",
      secondary: true,
      cell: (m) => (
        <StatusBadge
          domain="visibility"
          status={m.isActive ? "active" : "hidden"}
          variant="outline"
        />
      ),
    },
  ];

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {justDeleted && (
        <p className="mb-6 px-4 py-2 rounded-lg bg-green/10 border border-green/30 text-green-dark text-sm">
          Maker deleted. Historical orders kept their snapshot fields
          and continue to render correctly.
        </p>
      )}
      <PageHeader
        eyebrow="Bazaar catalog"
        title="Makers"
        description="The artisans and cooperatives behind every product. Stories, photos, and active-status flags. Each product references one maker."
        actions={
          <Button href="/admin/bazaar/makers/new" size="sm">
            New maker
          </Button>
        }
      />

      <ResponsiveTable<MakerRow>
        rows={makers}
        getRowKey={(m) => m.id}
        rowHref={(m) => `/admin/bazaar/makers/${m.id}`}
        rowLabel={(m) => m.name}
        columns={columns}
        empty={
          <EmptyState
            title="No makers yet"
            description="Add the first one to start the catalog."
          />
        }
      />
    </main>
  );
}
