import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { createServerSupabase, getSponsorUser } from "@/lib/supabase-server";
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

export default async function OrphanProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const user = await getSponsorUser();
  if (!user) redirect("/sponsor/login");
  const { slug } = await params;

  const supabase = await createServerSupabase();

  // RLS: returns the orphan ONLY if this sponsor is actively linked.
  const { data: orphan } = await supabase
    .from("orphans")
    .select("id, slug, display_name, country, region, age_band, bio")
    .eq("slug", slug)
    .maybeSingle();
  if (!orphan) notFound();

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
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <Link
        href="/sponsor/dashboard"
        className="text-sm text-grey hover:text-charcoal transition-colors"
      >
        ← Your sponsorships
      </Link>

      <h1 className="mt-3 text-3xl font-heading font-bold text-charcoal">
        {orphan.display_name as string}
      </h1>
      <p className="text-sm text-grey mt-1">
        {[orphan.country, orphan.region].filter(Boolean).join(" · ")}
        {orphan.age_band && <span> · age {orphan.age_band as string}</span>}
      </p>
      {orphan.bio ? (
        <div
          className="mt-4 text-charcoal/85 leading-relaxed text-[15px]"
          dangerouslySetInnerHTML={{ __html: orphan.bio as string }}
        />
      ) : null}

      <div className="mt-6 rounded-lg bg-cream border border-charcoal/10 px-4 py-3 text-xs text-grey leading-relaxed">
        These updates and media are shared with you in confidence. Please keep
        them private and do not share or republish them.
      </div>

      <hr className="my-8 border-charcoal/10" />

      {updates.length === 0 ? (
        <p className="text-grey text-center py-10">
          No updates yet — we&apos;ll post the first one soon.
        </p>
      ) : (
        <div className="space-y-10">
          {updates.map((u) => (
            <article key={u.id}>
              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-amber-dark mb-1">
                {u.periodLabel || formatWhen(u.publishedAt)}
              </p>
              <h2 className="text-xl font-heading font-bold text-charcoal mb-3">
                {u.title || "Update"}
              </h2>
              {u.media.length > 0 && (
                <div className="space-y-4 mb-4">
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
                  className="text-charcoal/85 leading-relaxed text-[15px] space-y-3"
                  dangerouslySetInnerHTML={{ __html: u.bodyHtml }}
                />
              ) : null}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
