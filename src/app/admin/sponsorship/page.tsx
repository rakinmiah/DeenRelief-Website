import Link from "next/link";
import type { Metadata } from "next";
import { requireSponsorshipAccess } from "@/lib/admin-session";
import {
  listOrphans,
  type Orphan,
  type OrphanStatus,
} from "@/lib/sponsorship-admin";
import { createOrphanAction } from "./actions";

export const metadata: Metadata = { title: "Sponsorship | Deen Relief Admin" };
export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<OrphanStatus, string> = {
  available: "bg-grey-light text-grey",
  sponsored: "bg-green-light text-green",
  paused: "bg-amber-light text-amber-dark",
  graduated: "bg-blue-50 text-blue-700",
  withdrawn: "bg-red-50 text-red-600",
};

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
      <span
        className={`shrink-0 text-[10px] font-bold tracking-wide uppercase px-2 py-1 rounded-full ${STATUS_STYLE[orphan.status]}`}
      >
        {orphan.status}
      </span>
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
      <div className="flex items-center justify-between gap-3 mb-1">
        <h1 className="text-2xl font-heading font-bold text-charcoal">
          Sponsorship
        </h1>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/sponsorship/sponsors"
            className="px-3.5 py-2 text-sm rounded-lg border border-charcoal/15 text-charcoal hover:border-green hover:text-green transition-colors"
          >
            Sponsors
          </Link>
          <Link
            href="/admin/sponsorship/data-requests"
            className="px-3.5 py-2 text-sm rounded-lg border border-charcoal/15 text-charcoal hover:border-green hover:text-green transition-colors"
          >
            Data requests
          </Link>
          <form action={createOrphanAction}>
            <input type="hidden" name="displayName" value="" />
            <button
              type="submit"
              className="px-4 py-2 text-sm rounded-lg bg-green text-white font-medium hover:bg-green-dark transition-colors"
            >
              + New profile
            </button>
          </form>
        </div>
      </div>
      <p className="text-sm text-grey mb-7">
        Manage orphan profiles, post monthly updates, and link sponsors.
        Profiles are data-minimised by design — first name or pseudonym,
        country and broad region only, age band not date of birth. Photos and
        videos are stored privately and only ever shown to a linked sponsor.
      </p>

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
