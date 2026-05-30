import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { createServerSupabase, requireSponsor } from "@/lib/supabase-server";
import {
  logChildMediaAccess,
  createSignedOrphanMediaUrl,
} from "@/lib/orphan-media";
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

function formatFullDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatMonthYear(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

function monthsSince(fromIso: string): number {
  const from = new Date(fromIso);
  const to = new Date();
  let m =
    (to.getFullYear() - from.getFullYear()) * 12 +
    (to.getMonth() - from.getMonth());
  if (to.getDate() < from.getDate()) m -= 1;
  return Math.max(0, m);
}

/** Bare duration phrase, e.g. "6 months", "1 year, 2 months", "less than a month". */
function durationBare(startedOn: string): string {
  const m = monthsSince(startedOn);
  if (m < 1) return "less than a month";
  if (m < 12) return `${m} month${m === 1 ? "" : "s"}`;
  const years = Math.floor(m / 12);
  const rem = m % 12;
  const y = `${years} year${years === 1 ? "" : "s"}`;
  return rem ? `${y}, ${rem} month${rem === 1 ? "" : "s"}` : y;
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
    .select("id, slug, display_name, country, region, age_band, bio, profile_photo_path")
    .eq("slug", slug)
    .maybeSingle();
  if (!orphan) notFound();

  // Hero photo — mint a short-lived signed URL for the private profile image.
  const heroUrl = orphan.profile_photo_path
    ? await createSignedOrphanMediaUrl(orphan.profile_photo_path as string)
    : null;

  // This sponsor's start date for the milestone strip (RLS-scoped to them).
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

  const name = orphan.display_name as string;
  const initial = name?.trim()?.[0]?.toUpperCase() ?? "•";
  const place = [orphan.country, orphan.region].filter(Boolean).join(" · ");

  return (
    <div className="bg-white">
      {/* ── Hero ── */}
      <section className="bg-cream">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-7 pb-10 md:pt-10 md:pb-14">
          <Link
            href="/sponsor/dashboard"
            className="inline-flex items-center gap-1 text-sm font-medium text-grey hover:text-green transition-colors"
          >
            ← Your sponsorships
          </Link>

          <div className="mt-7 flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-8">
            {heroUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={heroUrl}
                alt={name}
                className="w-28 h-28 sm:w-40 sm:h-40 rounded-3xl object-cover shadow-md ring-1 ring-charcoal/5 shrink-0"
              />
            ) : (
              <div className="w-28 h-28 sm:w-40 sm:h-40 rounded-3xl bg-green/10 ring-1 ring-charcoal/5 shadow-sm flex items-center justify-center shrink-0">
                <span className="font-heading font-bold text-4xl sm:text-5xl text-green/70">
                  {initial}
                </span>
              </div>
            )}

            <div className="min-w-0">
              <span className="block text-[11px] font-bold tracking-[0.1em] uppercase text-green mb-1.5">
                The child you sponsor
              </span>
              <h1 className="text-4xl sm:text-5xl font-heading font-bold text-charcoal leading-[1.03]">
                {name}
              </h1>
              {place && <p className="text-grey text-base mt-2">{place}{orphan.age_band && <span> · age {orphan.age_band as string}</span>}</p>}
              {!place && orphan.age_band && (
                <p className="text-grey text-base mt-2">Age {orphan.age_band as string}</p>
              )}
            </div>
          </div>

          {/* Milestone strip */}
          {startedOn && (
            <div className="mt-6 flex items-center gap-2.5 text-sm text-charcoal/80">
              <span className="w-2 h-2 rounded-full bg-amber shrink-0" aria-hidden />
              <span>
                Together since{" "}
                <strong className="text-charcoal">{formatMonthYear(startedOn)}</strong>{" "}
                · {durationBare(startedOn)}
              </span>
            </div>
          )}

          {orphan.bio ? (
            <div
              className="dr-prose mt-6 max-w-2xl"
              dangerouslySetInnerHTML={{ __html: orphan.bio as string }}
            />
          ) : null}

          <p className="mt-6 flex items-center gap-1.5 text-xs text-grey/70">
            <svg
              className="w-3.5 h-3.5 shrink-0"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
              />
            </svg>
            Shared with you in confidence — please keep these updates private.
          </p>
        </div>
      </section>

      {/* ── Updates timeline ── */}
      <section className="bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 md:py-16">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.1em] text-grey mb-8">
            Updates
          </h2>

          {updates.length === 0 ? (
            <p className="text-grey text-center py-12">
              No updates yet — we&apos;ll post the first one soon.
            </p>
          ) : (
            <div className="space-y-14 md:space-y-16">
              {updates.map((u) => (
                <article
                  key={u.id}
                  className="grid grid-cols-1 sm:grid-cols-[6.5rem_1fr] gap-2 sm:gap-8"
                >
                  {/* date rail */}
                  <div className="sm:text-right sm:pt-1">
                    <span className="block text-[11px] font-bold uppercase tracking-[0.1em] text-green">
                      {u.periodLabel || formatMonthYear(u.publishedAt)}
                    </span>
                    {u.publishedAt && (
                      <span className="block text-xs text-grey/55 mt-0.5">
                        {formatFullDate(u.publishedAt)}
                      </span>
                    )}
                  </div>

                  {/* content */}
                  <div className="min-w-0">
                    {u.title && (
                      <h3 className="text-2xl font-heading font-bold text-charcoal leading-tight mb-4">
                        {u.title}
                      </h3>
                    )}
                    {u.media.length > 0 && (
                      <div className="space-y-3 mb-5">
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
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
