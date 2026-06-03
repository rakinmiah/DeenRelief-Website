import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-session";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/social/short-links — active short links for the deck
 * builder's "Mark as posted" dialog. The short link is the attribution
 * anchor: picking the one she posted with is what lets real clicks +
 * donations flow back against the deck's templates + topic. Mirrors the
 * server-side load in posts/new/page.tsx, exposed for the client dialog.
 */
export async function GET() {
  await requireAdminSession();
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("short_links")
      .select("id, slug, campaign_slug, platform, notes")
      .is("archived_at", null)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    const links = (data ?? []).map((l) => ({
      id: l.id as string,
      slug: l.slug as string,
      campaignSlug: (l.campaign_slug as string | null) ?? null,
      platform: (l.platform as string | null) ?? null,
      notes: (l.notes as string | null) ?? null,
    }));
    return NextResponse.json({ links });
  } catch (err) {
    console.error("[short-links] list failed:", err);
    return NextResponse.json({ links: [] });
  }
}
