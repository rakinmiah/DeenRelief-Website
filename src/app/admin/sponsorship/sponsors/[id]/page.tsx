import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireSponsorshipAccess } from "@/lib/admin-session";
import {
  getSponsorById,
  listSponsorshipsForSponsor,
  listOrphans,
} from "@/lib/sponsorship-admin";
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
      <Link
        href="/admin/sponsorship/sponsors"
        className="text-sm text-grey hover:text-charcoal transition-colors"
      >
        ← Sponsors
      </Link>
      <h1 className="mt-3 text-2xl font-heading font-bold text-charcoal">
        {sponsor.fullName || sponsor.contactEmail}
      </h1>
      <p className="text-sm text-grey mb-6">
        {sponsor.contactEmail} · {sponsor.status}
        {sponsor.stripeCustomerId ? ` · ${sponsor.stripeCustomerId}` : ""}
      </p>

      <SponsorDetailClient
        sponsorId={id}
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
