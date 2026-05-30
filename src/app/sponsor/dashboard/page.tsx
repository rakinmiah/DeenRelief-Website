import Link from "next/link";
import type { Metadata } from "next";
import { createServerSupabase, requireSponsor } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { createSignedOrphanMediaUrl } from "@/lib/orphan-media";
import { resolveSponsor } from "@/lib/sponsor-donor";

export const metadata: Metadata = { title: "Your sponsorships" };
export const dynamic = "force-dynamic";

interface DashboardOrphan {
  id: string;
  slug: string;
  displayName: string;
  country: string;
  region: string | null;
  ageBand: string | null;
  startedOn: string | null;
  profilePhotoPath: string | null;
  photoUrl: string | null;
  hasUnread: boolean;
}

function NewBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 mb-2 rounded-full bg-green/10 text-green px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide">
      <span className="w-1.5 h-1.5 rounded-full bg-green" aria-hidden />
      New update
    </span>
  );
}

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

function placeLine(c: DashboardOrphan): string {
  const place = [c.country, c.region].filter(Boolean).join(" · ");
  if (place && c.ageBand) return `${place} · age ${c.ageBand}`;
  if (place) return place;
  if (c.ageBand) return `Age ${c.ageBand}`;
  return "";
}

function Photo({ c, className }: { c: DashboardOrphan; className: string }) {
  if (c.photoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={c.photoUrl} alt={c.displayName} className={`${className} object-cover`} />;
  }
  return (
    <div className={`${className} bg-green/10 flex items-center justify-center`}>
      <span className="font-heading font-bold text-5xl text-green/60">
        {(c.displayName.trim()[0] ?? "•").toUpperCase()}
      </span>
    </div>
  );
}

function ViewLink({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-1 mt-3 text-sm font-semibold text-green">
      View {name}&apos;s updates
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </span>
  );
}

export default async function SponsorDashboardPage() {
  const user = await requireSponsor();

  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from("sponsorships")
    .select(
      "id, status, started_on, orphans ( id, slug, display_name, country, region, age_band, profile_photo_path )"
    )
    .neq("status", "ended")
    .order("created_at", { ascending: true });

  const base: DashboardOrphan[] = (data ?? [])
    .map((row): DashboardOrphan | null => {
      const o = row.orphans as unknown as Record<string, unknown> | null;
      if (!o) return null;
      return {
        id: o.id as string,
        slug: o.slug as string,
        displayName: (o.display_name as string) ?? "",
        country: (o.country as string) ?? "",
        region: (o.region as string) ?? null,
        ageBand: (o.age_band as string) ?? null,
        startedOn: (row.started_on as string) ?? null,
        profilePhotoPath: (o.profile_photo_path as string) ?? null,
        photoUrl: null,
        hasUnread: false,
      };
    })
    .filter((x): x is DashboardOrphan => x !== null);

  const orphanIds = base.map((c) => c.id);

  // Latest published update per child (RLS-scoped).
  const latestByOrphan = new Map<string, string>();
  if (orphanIds.length > 0) {
    const { data: ups } = await supabase
      .from("orphan_updates")
      .select("orphan_id, published_at")
      .in("orphan_id", orphanIds)
      .eq("published", true)
      .order("published_at", { ascending: false });
    for (const u of ups ?? []) {
      const oid = u.orphan_id as string;
      if (!latestByOrphan.has(oid)) latestByOrphan.set(oid, u.published_at as string);
    }
  }

  // When this sponsor last opened each child's page (their own access log).
  const lastViewByOrphan = new Map<string, string>();
  if (orphanIds.length > 0) {
    const { data: views } = await getSupabaseAdmin()
      .from("child_media_access_log")
      .select("orphan_id, created_at")
      .eq("sponsor_id", user.id)
      .eq("action", "view_profile")
      .in("orphan_id", orphanIds)
      .order("created_at", { ascending: false });
    for (const v of views ?? []) {
      const oid = v.orphan_id as string;
      if (!lastViewByOrphan.has(oid)) lastViewByOrphan.set(oid, v.created_at as string);
    }
  }

  // Mint signed URLs for the child photos + compute the unread flag.
  const children = await Promise.all(
    base.map(async (c) => {
      const latest = latestByOrphan.get(c.id);
      const lastView = lastViewByOrphan.get(c.id);
      const hasUnread =
        !!latest && (!lastView || new Date(latest) > new Date(lastView));
      return {
        ...c,
        hasUnread,
        photoUrl: c.profilePhotoPath
          ? await createSignedOrphanMediaUrl(c.profilePhotoPath)
          : null,
      };
    })
  );

  const sponsor = await resolveSponsor(user);
  const firstName = sponsor.fullName.trim().split(" ")[0] || "";

  return (
    <section className="bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="mb-9 md:mb-11">
          <h1 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal leading-tight">
            {firstName ? `Assalamu alaikum, ${firstName}` : "Assalamu alaikum"}
          </h1>
          <p className="text-grey text-base sm:text-[1.0625rem] leading-[1.7] mt-2">
            {children.length > 0
              ? "Here's how the children you sponsor are doing — open a profile for their latest updates, photos and videos."
              : "Welcome to your sponsor account."}
          </p>
          {children.length > 0 && (
            <p className="text-sm text-grey/70 mt-2">
              We share new updates every month — far more than most sponsorship
              programmes.
            </p>
          )}
        </div>

        {children.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-charcoal/15 bg-cream px-6 py-14 text-center text-grey">
            Your account isn&apos;t linked to a child yet. We&apos;ll be in touch
            shortly — or contact us if you think this is a mistake.
          </div>
        ) : children.length === 1 ? (
          // ── Single child → hero card ──
          <Link
            href={`/sponsor/orphan/${children[0].slug}`}
            className="group block rounded-3xl border border-charcoal/8 bg-white shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md"
          >
            <div className="flex flex-col sm:flex-row">
              <Photo
                c={children[0]}
                className="w-full sm:w-1/2 aspect-[4/3] sm:aspect-auto sm:min-h-[20rem]"
              />
              <div className="p-6 sm:p-8 flex flex-col justify-center">
                {children[0].hasUnread && <NewBadge />}
                <span className="text-[11px] font-bold tracking-[0.1em] uppercase text-green mb-1.5">
                  The child you sponsor
                </span>
                <h2 className="font-heading font-bold text-3xl sm:text-4xl text-charcoal leading-tight group-hover:text-green transition-colors">
                  {children[0].displayName}
                </h2>
                <p className="text-grey text-base mt-2">{placeLine(children[0])}</p>
                {children[0].startedOn && (
                  <p className="mt-3 text-sm font-medium text-amber-dark">
                    {durationLabel(children[0].startedOn)}
                  </p>
                )}
                <ViewLink name={children[0].displayName} />
              </div>
            </div>
          </Link>
        ) : (
          // ── Multiple children → grid ──
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {children.map((c) => (
              <Link
                key={c.slug}
                href={`/sponsor/orphan/${c.slug}`}
                className="group block rounded-2xl border border-charcoal/8 bg-white shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-1"
              >
                <div className="relative">
                  <Photo c={c} className="w-full aspect-[4/3]" />
                  {c.hasUnread && (
                    <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-green shadow-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-green" aria-hidden />
                      New update
                    </span>
                  )}
                </div>
                <div className="p-5">
                  <h2 className="font-heading font-bold text-xl text-charcoal leading-snug group-hover:text-green transition-colors">
                    {c.displayName}
                  </h2>
                  <p className="text-grey/80 text-sm mt-1">{placeLine(c)}</p>
                  {c.startedOn && (
                    <p className="mt-1.5 text-xs font-medium text-amber-dark">
                      {durationLabel(c.startedOn)}
                    </p>
                  )}
                  <ViewLink name={c.displayName} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
