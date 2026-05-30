import Link from "next/link";
import type { Metadata } from "next";
import { createServerSupabase, requireSponsor } from "@/lib/supabase-server";

export const metadata: Metadata = { title: "Your sponsorships" };
export const dynamic = "force-dynamic";

interface DashboardOrphan {
  slug: string;
  displayName: string;
  country: string;
  region: string | null;
  ageBand: string | null;
  startedOn: string | null;
}

/** Whole months between a start date and now (never negative). */
function monthsSince(fromIso: string): number {
  const from = new Date(fromIso);
  const to = new Date();
  let m = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  if (to.getDate() < from.getDate()) m -= 1;
  return Math.max(0, m);
}

function durationLabel(startedOn: string): string {
  const m = monthsSince(startedOn);
  if (m < 1) return "Sponsoring since this month";
  if (m < 12) return `Sponsoring for ${m} month${m === 1 ? "" : "s"}`;
  const years = Math.floor(m / 12);
  const rem = m % 12;
  const y = `${years} year${years === 1 ? "" : "s"}`;
  return rem ? `Sponsoring for ${y}, ${rem} mo` : `Sponsoring for ${y}`;
}

export default async function SponsorDashboardPage() {
  await requireSponsor();

  // RLS scopes this to the signed-in sponsor's own links, and the embedded
  // orphans rows to children they're actively linked to.
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from("sponsorships")
    .select(
      "id, status, started_on, orphans ( slug, display_name, country, region, age_band )"
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
        startedOn: (row.started_on as string) ?? null,
      };
    })
    .filter((x): x is DashboardOrphan => x !== null);

  return (
    <section className="bg-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="max-w-2xl mb-10">
          <span className="inline-block text-[11px] font-bold tracking-[0.1em] uppercase text-green mb-3">
            Your sponsorships
          </span>
          <h1 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal leading-tight mb-3">
            Thank you for your support
          </h1>
          <p className="text-grey text-base sm:text-[1.0625rem] leading-[1.7]">
            Open a profile to read the latest updates, and to see the photos and
            videos we share about the child you sponsor.
          </p>
          {children.length > 0 && (
            <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-green/10 text-green-dark text-[13px] font-semibold px-3.5 py-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green" aria-hidden />
              New updates every month — far more than most sponsorship
              programmes
            </p>
          )}
        </div>

        {children.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-charcoal/15 bg-cream px-6 py-14 text-center text-grey">
            Your account isn&apos;t linked to a child yet. We&apos;ll be in touch
            shortly — or contact us if you think this is a mistake.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {children.map((c) => (
              <Link
                key={c.slug}
                href={`/sponsor/orphan/${c.slug}`}
                className="group block bg-white border border-charcoal/5 rounded-2xl p-6 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-1"
              >
                <div className="w-11 h-11 rounded-xl bg-green/10 text-green flex items-center justify-center mb-4">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.7}
                    viewBox="0 0 24 24"
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"
                    />
                  </svg>
                </div>
                <h2 className="font-heading font-bold text-lg text-charcoal mb-1 group-hover:text-green transition-colors">
                  {c.displayName}
                </h2>
                <p className="text-grey/80 text-sm leading-[1.6]">
                  {[c.country, c.region].filter(Boolean).join(" · ")}
                  {c.ageBand && <span> · age {c.ageBand}</span>}
                </p>
                {c.startedOn && (
                  <p className="mt-2 text-xs font-medium text-amber-dark">
                    {durationLabel(c.startedOn)}
                  </p>
                )}
                <span className="inline-block mt-4 text-sm font-semibold text-green">
                  View updates →
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
