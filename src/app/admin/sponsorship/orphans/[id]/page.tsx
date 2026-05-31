import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireSponsorshipAccess } from "@/lib/admin-session";
import {
  getOrphanById,
  listUpdates,
  listSponsorshipsForOrphan,
} from "@/lib/sponsorship-admin";
import { createSignedOrphanMediaUrl } from "@/lib/orphan-media";
import { createUpdateAction } from "../../actions";
import { PageHeader, Button, StatusBadge } from "@/components/admin/ui";
import OrphanEditor from "@/components/admin/OrphanEditor";

export const metadata: Metadata = {
  title: "Edit profile | Deen Relief Admin",
};
export const dynamic = "force-dynamic";

export default async function OrphanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSponsorshipAccess();
  const { id } = await params;
  const orphan = await getOrphanById(id);
  if (!orphan) notFound();

  const [updates, sponsorships] = await Promise.all([
    listUpdates(id),
    listSponsorshipsForOrphan(id),
  ]);
  const activeSponsors = sponsorships.filter((s) => s.status !== "ended").length;
  const photoUrl = orphan.profilePhotoPath
    ? await createSignedOrphanMediaUrl(orphan.profilePhotoPath)
    : null;

  const createUpdateForThisOrphan = createUpdateAction.bind(null, id);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <PageHeader
        backHref="/admin/sponsorship"
        backLabel="All profiles"
        title={orphan.displayName || "Unnamed profile"}
        description={`${activeSponsors} active sponsor${activeSponsors === 1 ? "" : "s"}.`}
      />

      <OrphanEditor orphan={orphan} photoUrl={photoUrl} />

      {/* Updates */}
      <section className="mt-10">
        <div className="flex items-center justify-between gap-3 mb-2">
          <h2 className="text-xs font-bold uppercase tracking-wide text-grey">
            Updates ({updates.length})
          </h2>
          <form action={createUpdateForThisOrphan}>
            <Button type="submit" variant="secondary" size="sm">
              + New update
            </Button>
          </form>
        </div>
        {updates.length === 0 ? (
          <div className="rounded-xl border border-dashed border-charcoal/15 px-4 py-8 text-center text-grey text-sm">
            No updates yet. Post one to share progress with this child&apos;s
            sponsors.
          </div>
        ) : (
          <div className="rounded-xl border border-charcoal/10 divide-y divide-charcoal/8 overflow-hidden bg-white">
            {updates.map((u) => (
              <Link
                key={u.id}
                href={`/admin/sponsorship/orphans/${id}/updates/${u.id}`}
                className="flex items-center gap-4 px-4 py-3.5 hover:bg-cream transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-charcoal truncate">
                    {u.title || (
                      <span className="text-grey/60 italic">Untitled update</span>
                    )}
                  </p>
                  <p className="text-xs text-grey/70 truncate">
                    {u.periodLabel ? `${u.periodLabel} · ` : ""}
                    {u.authorEmail}
                  </p>
                </div>
                <StatusBadge
                  domain="blog"
                  status={u.published ? "published" : "draft"}
                  className="shrink-0"
                />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
