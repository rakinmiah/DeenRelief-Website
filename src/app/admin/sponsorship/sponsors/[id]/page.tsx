import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireSponsorshipAccess } from "@/lib/admin-session";
import {
  getSponsorById,
  listSponsorshipsForSponsor,
  listOrphans,
} from "@/lib/sponsorship-admin";
import { PageHeader, StatusBadge } from "@/components/admin/ui";
import SponsorDetailClient from "@/components/admin/SponsorDetailClient";

export const metadata: Metadata = { title: "Sponsor | Deen Relief Admin" };
export const dynamic = "force-dynamic";

export default async function SponsorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSponsorshipAccess();
  const { id } = await params;
  const sponsor = await getSponsorById(id);
  if (!sponsor) notFound();

  const [links, orphans] = await Promise.all([
    listSponsorshipsForSponsor(id),
    listOrphans(),
  ]);
  const orphanLabels = new Map(
    orphans.map((o) => [o.id, o.displayName || o.slug])
  );
  const linkable = orphans
    .filter((o) => o.status !== "withdrawn")
    .map((o) => ({ id: o.id, label: o.displayName || o.slug }));

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <PageHeader
        backHref="/admin/sponsorship/sponsors"
        backLabel="Sponsors"
        title={sponsor.fullName || sponsor.contactEmail}
        description={
          <span className="inline-flex items-center gap-2 flex-wrap">
            {sponsor.contactEmail}
            <StatusBadge domain="sponsor" status={sponsor.status} />
            {sponsor.stripeCustomerId && (
              <span className="font-mono text-xs text-charcoal/50">
                {sponsor.stripeCustomerId}
              </span>
            )}
          </span>
        }
      />

      <SponsorDetailClient
        sponsorId={id}
        status={sponsor.status}
        links={links.map((l) => ({
          id: l.id,
          orphanLabel: orphanLabels.get(l.orphanId) ?? l.orphanId,
          status: l.status,
          startedOn: l.startedOn,
        }))}
        orphans={linkable}
      />
    </div>
  );
}
