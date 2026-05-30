import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { createServerSupabase, requireSponsor } from "@/lib/supabase-server";
import { logChildMediaAccess } from "@/lib/orphan-media";
import { clientIpFromRequest } from "@/lib/admin-audit";
import MediaPlayer from "./MediaPlayer";

export const metadata: Metadata = { title: "Updates" };
export const dynamic = "force-dynamic";

interface MediaItem {
  id: string;
  kind: "photo" | "video";
  caption: string | null;
}
interface UpdateItem {
  id: string;
  title: string;
  bodyHtml: string;
  periodLabel: string | null;
  publishedAt: string | null;
  media: MediaItem[];
}

function formatWhen(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function monthsSince(fromIso: string): number {
  const from = new Date(fromIso);
  const to = new Date();
  let m = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  if (to.getDate() < from.getDate()) m -= 1;
  return Math.max(0, m);
}

function formatSince(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

function durationPhrase(startedOn: string): string {
  const m = monthsSince(startedOn);
  if (m < 1) return "since this month";
  if (m < 12) return `for ${m} month${m === 1 ? "" : "s"}`;
  const years = Math.floor(m / 12);
  const rem = m % 12;
  const y = `${years} year${years === 1 ? "" : "s"}`;
  return rem ? `for ${y}, ${rem} month${rem === 1 ? "" : "s"}` : `for ${y}`;
}

export default async function OrphanProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const user = await requireSponsor();
  const { slug } = await params;

  const supabase = await createServerSupabase();

  // RLS: returns the orphan ONLY if this sponsor is actively linked.
  const { data: orphan } = await supabase
    .from("orphans")
    .select("id, slug, display_name, country, region, age_band, bio")
    .eq("slug", slug)
    .maybeSingle();
  if (!orphan) notFound();

  // This sponsor's start date for the milestone band (RLS-scoped to them).
  const { data: link } = await supabase
    .from("sponsorships")
    .select("started_on")
    .eq("orphan_id", orphan.id)
    .neq("status", "ended")
    .order("started_on", { ascending: true })
    .limit(1)
    .maybeSingle();
  const startedOn = (link?.started_on as string) ?? null;

  // Published updates for this child (RLS also enforces published + link).
  const { data: updateRows } = await supabase
    .from("orphan_updates")
    .select("id, title, body_html, period_label, published_at")
    .eq("orphan_id", orphan.id)
    .eq("published", true)
    .order("published_at", { ascending: false });

  const updateIds = (updateRows ?? []).map((u) => u.id as string);
  let mediaByUpdate = new Map<string, MediaItem[]>();
  if (updateIds.length > 0) {
    const { data: mediaRows } = await supabase
      .from("orphan_update_media")
      .select("id, update_id, kind, caption, sort_order")
      .in("update_id", updateIds)
      .order("sort_order", { ascending: true });
    mediaByUpdate = (mediaRows ?? []).reduce((acc, m) => {
      const list = acc.get(m.update_id as string) ?? [];
      list.push({
        id: m.id as string,
        kind: m.kind as "photo" | "video",
        caption: (m.caption as string) ?? null,
      });
      acc.set(m.update_id as string, list);
      return acc;
    }, new Map<string, MediaItem[]>());
  }

  const updates: UpdateItem[] = (updateRows ?? []).map((u) => ({
    id: u.id as string,
    title: (u.title as string) ?? "",
    bodyHtml: (u.body_html as string) ?? "",
    periodLabel: (u.period_label as string) ?? null,
    publishedAt: (u.published_at as string) ?? null,
    media: mediaByUpdate.get(u.id as string) ?? [],
  }));

  // Safeguarding access log (fire-and-forget).
  const h = await headers();
  const fauxReq = new Request("http://server.local", {
    headers: {
      "user-agent": h.get("user-agent") ?? "",
      "x-forwarded-for": h.get("x-forwarded-for") ?? "",
    },
  });
  await logChildMediaAccess({
    sponsorId: user.id,
    orphanId: orphan.id as string,
    action: "view_profile",
    ip: clientIpFromRequest(fauxReq),
    userAgent: h.get("user-agent"),
  });

  return (
    <div className="bg-white">
      {/* Header band */}
      <section className="bg-cream border-b border-charcoal/5">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 md:py-14">
          <Link
            href="/sponsor/dashboard"
            className="inline-flex items-center gap-1 text-sm font-medium text-grey hover:text-green transition-colors"
          >
            ← Your sponsorships
          </Link>

          <span className="block mt-6 text-[11px] font-bold tracking-[0.1em] uppercase text-green mb-2">
            The child you sponsor
          </span>
          <h1 className="text-4xl sm:text-5xl font-heading font-bold text-charcoal leading-[1.05]">
            {orphan.display_name as string}
          </h1>
          <p className="text-grey text-base mt-2">
            {[orphan.country, orphan.region].filter(Boolean).join(" · ")}
            {orphan.age_band && <span> · age {orphan.age_band as string}</span>}
          </p>
          {startedOn && (
            <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-white border border-charcoal/10 text-charcoal/80 text-[13px] font-semibold px-3.5 py-1.5 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-amber" aria-hidden />
              You&apos;ve been sponsoring {orphan.display_name as string}{" "}
              {durationPhrase(startedOn)} · since {formatSince(startedOn)}
            </p>
          )}
          {orphan.bio ? (
            <div
              className="dr-prose mt-5"
              dangerouslySetInnerHTML={{ __html: orphan.bio as string }}
            />
          ) : null}
        </div>
      </section>

      {/* Updates */}
      <section className="bg-white">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 md:py-16">
          <div className="flex items-start gap-2.5 rounded-2xl bg-amber-light/50 border border-amber/20 px-4 py-3 mb-10">
            <svg
              className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-dark"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.7}
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
              />
            </svg>
            <p className="text-[13px] text-amber-dark leading-relaxed">
              These updates and media are shared with you in confidence. Please
              keep them private and do not share or republish them.
            </p>
          </div>

          {updates.length === 0 ? (
            <p className="text-grey text-center py-12">
              No updates yet — we&apos;ll post the first one soon.
            </p>
          ) : (
            <div className="space-y-12">
              {updates.map((u) => (
                <article key={u.id}>
                  <span className="block text-[11px] font-bold uppercase tracking-[0.1em] text-green mb-2">
                    {u.periodLabel || formatWhen(u.publishedAt)}
                  </span>
                  <h2 className="text-2xl font-heading font-bold text-charcoal leading-tight mb-4">
                    {u.title || "Update"}
                  </h2>
                  {u.media.length > 0 && (
                    <div className="space-y-4 mb-5">
                      {u.media.map((m) => (
                        <MediaPlayer
                          key={m.id}
                          mediaId={m.id}
                          kind={m.kind}
                          caption={m.caption}
                        />
                      ))}
                    </div>
                  )}
                  {u.bodyHtml ? (
                    <div
                      className="dr-prose"
                      dangerouslySetInnerHTML={{ __html: u.bodyHtml }}
                    />
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
