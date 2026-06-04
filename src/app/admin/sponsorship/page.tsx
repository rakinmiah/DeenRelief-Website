import Link from "next/link";
import type { Metadata } from "next";
import { requireSponsorshipAccess } from "@/lib/admin-session";
import { listOrphans, type Orphan } from "@/lib/sponsorship-admin";
import { PageHeader, Button, StatusBadge } from "@/components/admin/ui";
import { createOrphanAction } from "./actions";

export const metadata: Metadata = { title: "Sponsorship | Deen Relief Admin" };
export const dynamic = "force-dynamic";

function OrphanRow({ orphan }: { orphan: Orphan }) {
  return (
    <Link
      href={`/admin/sponsorship/orphans/${orphan.id}`}
      className="flex items-center gap-4 px-4 py-3.5 hover:bg-cream transition-colors"
    >
      <div className="flex-1 min-w-0">
        <p className="font-medium text-charcoal truncate">
          {orphan.displayName || (
            <span className="text-grey/60 italic">Unnamed profile</span>
          )}
          {orphan.pseudonym && (
            <span className="ml-2 text-[10px] uppercase tracking-wide text-grey/60">
              (pseudonym)
            </span>
          )}
        </p>
        <p className="text-xs text-grey/70 truncate">
          {[orphan.country, orphan.region].filter(Boolean).join(" · ")}
          {orphan.ageBand && <span> · age {orphan.ageBand}</span>}
        </p>
      </div>
      <StatusBadge domain="orphan" status={orphan.status} className="shrink-0" />
    </Link>
  );
}

export default async function SponsorshipAdminPage() {
  await requireSponsorshipAccess();
  const orphans = await listOrphans();
  const active = orphans.filter((o) => o.status !== "withdrawn");
  const withdrawn = orphans.filter((o) => o.status === "withdrawn");

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <PageHeader
        title="Sponsorship"
        description="Manage orphan profiles, post monthly updates, and link sponsors. Profiles are data-minimised by design — first name or pseudonym, country and broad region only, age band not date of birth. Photos and videos are stored privately and only ever shown to a linked sponsor."
        actions={
          <>
            <Button href="/admin/sponsorship/sponsors" variant="outline" size="sm">
              Sponsors
            </Button>
            <Button href="/admin/sponsorship/data-requests" variant="outline" size="sm">
              Data requests
            </Button>
            <form action={createOrphanAction}>
              <input type="hidden" name="displayName" value="" />
              <Button type="submit" variant="secondary" size="sm">
                + New profile
              </Button>
            </form>
          </>
        }
      />

      <section>
        <h2 className="text-xs font-bold uppercase tracking-wide text-grey mb-2">
          Profiles ({active.length})
        </h2>
        {active.length === 0 ? (
          <div className="rounded-xl border border-dashed border-charcoal/15 px-4 py-10 text-center text-grey">
            No profiles yet. Click{" "}
            <span className="font-medium">“New profile”</span> to add a child.
          </div>
        ) : (
          <div className="rounded-xl border border-charcoal/10 divide-y divide-charcoal/8 overflow-hidden bg-white">
            {active.map((o) => (
              <OrphanRow key={o.id} orphan={o} />
            ))}
          </div>
        )}
      </section>

      {withdrawn.length > 0 && (
        <details className="mt-7">
          <summary className="cursor-pointer text-xs font-bold uppercase tracking-wide text-grey/70 hover:text-grey">
            Withdrawn ({withdrawn.length})
          </summary>
          <div className="rounded-xl border border-charcoal/10 divide-y divide-charcoal/8 overflow-hidden bg-white mt-2 opacity-75">
            {withdrawn.map((o) => (
              <OrphanRow key={o.id} orphan={o} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
