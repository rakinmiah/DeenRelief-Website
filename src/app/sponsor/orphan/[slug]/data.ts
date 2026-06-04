import "server-only";

/**
 * Shared, RLS-scoped data loaders for a sponsored child's pages (hub,
 * /updates, /photos). Every loader uses the sponsor's own cookie-backed
 * client, so RLS guarantees the sponsor can only ever read a child they're
 * actively linked to. requireSponsor() also enforces auth + MFA step-up.
 */

import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { createServerSupabase, requireSponsor } from "@/lib/supabase-server";
import { logChildMediaAccess } from "@/lib/orphan-media";
import { clientIpFromRequest } from "@/lib/admin-audit";

export interface OrphanContext {
  userId: string;
  orphan: {
    id: string;
    slug: string;
    displayName: string;
    country: string | null;
    region: string | null;
    ageBand: string | null;
    bio: string | null;
    profilePhotoPath: string | null;
  };
  startedOn: string | null;
}

export interface UpdateItem {
  id: string;
  title: string;
  bodyHtml: string;
  periodLabel: string | null;
  publishedAt: string | null;
}

export interface GalleryMedia {
  id: string;
  kind: "photo" | "video";
  caption: string | null;
}

/** Resolve the linked child by slug (404 if not linked) + log the view. */
export async function loadOrphanContext(slug: string): Promise<OrphanContext> {
  const user = await requireSponsor();
  const supabase = await createServerSupabase();

  const { data: orphan } = await supabase
    .from("orphans")
    .select("id, slug, display_name, country, region, age_band, bio, profile_photo_path")
    .eq("slug", slug)
    .maybeSingle();
  if (!orphan) notFound();

  const { data: link } = await supabase
    .from("sponsorships")
    .select("started_on")
    .eq("orphan_id", orphan.id)
    .neq("status", "ended")
    .order("started_on", { ascending: true })
    .limit(1)
    .maybeSingle();

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

  return {
    userId: user.id,
    orphan: {
      id: orphan.id as string,
      slug: orphan.slug as string,
      displayName: (orphan.display_name as string) ?? "",
      country: (orphan.country as string) ?? null,
      region: (orphan.region as string) ?? null,
      ageBand: (orphan.age_band as string) ?? null,
      bio: (orphan.bio as string) ?? null,
      profilePhotoPath: (orphan.profile_photo_path as string) ?? null,
    },
    startedOn: (link?.started_on as string) ?? null,
  };
}

export async function loadUpdates(orphanId: string): Promise<UpdateItem[]> {
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from("orphan_updates")
    .select("id, title, body_html, period_label, published_at")
    .eq("orphan_id", orphanId)
    .eq("published", true)
    .order("published_at", { ascending: false });
  return (data ?? []).map((u) => ({
    id: u.id as string,
    title: (u.title as string) ?? "",
    bodyHtml: (u.body_html as string) ?? "",
    periodLabel: (u.period_label as string) ?? null,
    publishedAt: (u.published_at as string) ?? null,
  }));
}

export interface UpdateWithMedia extends UpdateItem {
  media: GalleryMedia[];
}

/** Published updates, each with its own media attached (for the timeline). */
export async function loadUpdatesWithMedia(
  orphanId: string
): Promise<UpdateWithMedia[]> {
  const supabase = await createServerSupabase();
  const { data: ups } = await supabase
    .from("orphan_updates")
    .select("id, title, body_html, period_label, published_at")
    .eq("orphan_id", orphanId)
    .eq("published", true)
    .order("published_at", { ascending: false });

  const list = (ups ?? []).map((u) => ({
    id: u.id as string,
    title: (u.title as string) ?? "",
    bodyHtml: (u.body_html as string) ?? "",
    periodLabel: (u.period_label as string) ?? null,
    publishedAt: (u.published_at as string) ?? null,
  }));
  const ids = list.map((u) => u.id);
  const byUpdate = new Map<string, GalleryMedia[]>();
  if (ids.length > 0) {
    const { data: media } = await supabase
      .from("orphan_update_media")
      .select("id, update_id, kind, caption, sort_order")
      .in("update_id", ids)
      .order("sort_order", { ascending: true });
    for (const m of media ?? []) {
      const arr = byUpdate.get(m.update_id as string) ?? [];
      arr.push({
        id: m.id as string,
        kind: m.kind as "photo" | "video",
        caption: (m.caption as string) ?? null,
      });
      byUpdate.set(m.update_id as string, arr);
    }
  }
  return list.map((u) => ({ ...u, media: byUpdate.get(u.id) ?? [] }));
}

/** All media across the child's published updates, newest-update-first. */
export async function loadGallery(orphanId: string): Promise<GalleryMedia[]> {
  const supabase = await createServerSupabase();
  const { data: ups } = await supabase
    .from("orphan_updates")
    .select("id, published_at")
    .eq("orphan_id", orphanId)
    .eq("published", true)
    .order("published_at", { ascending: false });
  const ids = (ups ?? []).map((u) => u.id as string);
  if (ids.length === 0) return [];
  const orderIdx = new Map(ids.map((id, i) => [id, i]));

  const { data: media } = await supabase
    .from("orphan_update_media")
    .select("id, update_id, kind, caption, sort_order")
    .in("update_id", ids);

  return (media ?? [])
    .map((m) => ({
      id: m.id as string,
      kind: m.kind as "photo" | "video",
      caption: (m.caption as string) ?? null,
      _u: orderIdx.get(m.update_id as string) ?? 999,
      _s: (m.sort_order as number) ?? 0,
    }))
    .sort((a, b) => a._u - b._u || a._s - b._s)
    .map(({ id, kind, caption }) => ({ id, kind, caption }));
}

/** Plain-text snippet from sanitised update HTML, for preview cards. */
export function snippet(html: string, max = 150): string {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}
