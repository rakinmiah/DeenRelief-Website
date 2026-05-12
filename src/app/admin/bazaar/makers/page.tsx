import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminSession } from "@/lib/admin-session";
import { fetchAdminMakers } from "@/lib/bazaar-catalog";

export const metadata: Metadata = {
  title: "Makers | Bazaar Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

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
  await requireAdminSession();
  const sp = await searchParams;
  const justDeleted = sp.deleted === "1";
  const makers = await fetchAdminMakers();

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {justDeleted && (
        <p className="mb-6 px-4 py-2 rounded-lg bg-green/10 border border-green/30 text-green-dark text-sm">
          Maker deleted. Historical orders kept their snapshot fields
          and continue to render correctly.
        </p>
      )}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="block text-[11px] font-bold tracking-[0.15em] uppercase text-amber-dark mb-1">
            Bazaar catalog
          </span>
          <h1 className="text-charcoal font-heading font-bold text-2xl sm:text-3xl">
            Makers
          </h1>
          <p className="text-grey text-sm mt-2 max-w-2xl">
            The artisans and cooperatives behind every product. Stories,
            photos, and active-status flags. Each product references one
            maker.
          </p>
        </div>
        <Link
          href="/admin/bazaar/makers/new"
          className="px-4 py-2 rounded-full bg-charcoal text-white text-sm font-semibold hover:bg-charcoal/90 transition-colors whitespace-nowrap"
        >
          New maker
        </Link>
      </div>

      <div className="bg-white border border-charcoal/10 rounded-2xl overflow-hidden">
        {makers.length === 0 ? (
          <div className="p-12 text-center text-charcoal/60 text-sm">
            No makers yet. Add the first one to start the catalog.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-cream border-b border-charcoal/10">
                <tr className="text-left">
                  {["Name", "Country", "Region", "Status", ""].map((h) => (
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
                {makers.map((m) => (
                  <tr
                    key={m.id}
                    className="hover:bg-cream/50 transition-colors"
                  >
                    <td className="px-5 py-4 text-charcoal font-medium">
                      {m.name}
                    </td>
                    <td className="px-5 py-4 text-charcoal/70">{m.country}</td>
                    <td className="px-5 py-4 text-charcoal/70">{m.region}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium uppercase tracking-wider border ${
                          m.isActive
                            ? "bg-green/10 text-green-dark border-green/30"
                            : "bg-charcoal/8 text-charcoal/60 border-charcoal/15"
                        }`}
                      >
                        {m.isActive ? "Active" : "Hidden"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <Link
                        href={`/admin/bazaar/makers/${m.id}`}
                        className="text-green text-sm font-medium hover:underline"
                      >
                        Edit →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
