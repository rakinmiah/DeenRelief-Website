import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createServerSupabase, getSponsorUser } from "@/lib/supabase-server";

export const metadata: Metadata = { title: "Your sponsorships" };
export const dynamic = "force-dynamic";

interface DashboardOrphan {
  slug: string;
  displayName: string;
  country: string;
  region: string | null;
  ageBand: string | null;
}

export default async function SponsorDashboardPage() {
  const user = await getSponsorUser();
  if (!user) redirect("/sponsor/login");

  // RLS scopes this to the signed-in sponsor's own links, and the embedded
  // orphans rows to children they're actively linked to.
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from("sponsorships")
    .select(
      "id, status, orphans ( slug, display_name, country, region, age_band )"
    )
    .neq("status", "ended")
    .order("created_at", { ascending: true });

  const children: DashboardOrphan[] = (data ?? [])
    .map((row): DashboardOrphan | null => {
      const o = row.orphans as unknown as Record<string, unknown> | null;
      if (!o) return null;
      return {
        slug: o.slug as string,
        displayName: (o.display_name as string) ?? "",
        country: (o.country as string) ?? "",
        region: (o.region as string) ?? null,
        ageBand: (o.age_band as string) ?? null,
      };
    })
    .filter((x): x is DashboardOrphan => x !== null);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-2xl font-heading font-bold text-charcoal mb-1">
        Your sponsorships
      </h1>
      <p className="text-sm text-grey mb-8">
        Thank you for your support. Open a profile to read the latest updates.
      </p>

      {children.length === 0 ? (
        <div className="rounded-xl border border-dashed border-charcoal/15 px-4 py-12 text-center text-grey">
          Your account isn&apos;t linked to a child yet. We&apos;ll be in touch
          shortly — or contact us if you think this is a mistake.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {children.map((c) => (
            <Link
              key={c.slug}
              href={`/sponsor/orphan/${c.slug}`}
              className="block rounded-2xl border border-charcoal/10 bg-white p-5 hover:border-green hover:shadow-sm transition-all"
            >
              <p className="font-heading font-semibold text-lg text-charcoal">
                {c.displayName}
              </p>
              <p className="text-sm text-grey mt-1">
                {[c.country, c.region].filter(Boolean).join(" · ")}
                {c.ageBand && <span> · age {c.ageBand}</span>}
              </p>
              <span className="inline-block mt-4 text-sm font-medium text-green">
                View updates →
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
