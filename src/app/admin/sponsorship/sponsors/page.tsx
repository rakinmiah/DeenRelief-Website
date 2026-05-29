import Link from "next/link";
import type { Metadata } from "next";
import { requireSponsorshipAccess } from "@/lib/admin-session";
import { listSponsors, listOrphans } from "@/lib/sponsorship-admin";
import SponsorsClient from "@/components/admin/SponsorsClient";

export const metadata: Metadata = { title: "Sponsors | Deen Relief Admin" };
export const dynamic = "force-dynamic";

export default async function SponsorsPage() {
  await requireSponsorshipAccess();
  const [sponsors, orphans] = await Promise.all([listSponsors(), listOrphans()]);
  const linkable = orphans.filter((o) => o.status !== "withdrawn");

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <Link
        href="/admin/sponsorship"
        className="text-sm text-grey hover:text-charcoal transition-colors"
      >
        ← Sponsorship
      </Link>
      <h1 className="mt-3 text-2xl font-heading font-bold text-charcoal">
        Sponsors
      </h1>
      <p className="text-sm text-grey mb-6">
        Invite a sponsor once their recurring donation is confirmed. They get a
        secure link to set a password and activate their account, then they can
        follow the child they support.
      </p>
      <SponsorsClient
        sponsors={sponsors}
        orphans={linkable.map((o) => ({ id: o.id, label: o.displayName || o.slug }))}
      />
    </div>
  );
}
