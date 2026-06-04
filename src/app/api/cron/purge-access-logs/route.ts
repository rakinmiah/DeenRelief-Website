import { NextResponse } from "next/server";
import { requireCronAuth } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * Data-retention purge for the safeguarding access log.
 *
 * child_media_access_log records who viewed/downloaded which child's media,
 * with IP + user-agent (personal data). UK GDPR requires we don't keep
 * personal data longer than necessary, so this cron deletes rows older than
 * the retention window. The safeguarding value is in recent access; older
 * entries are purged.
 *
 * Retention window: SPONSOR_ACCESS_LOG_RETENTION_DAYS (default 540 ≈ 18 months).
 * Auth: Vercel Cron `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(request: Request) {
  const auth = requireCronAuth(request);
  if (!auth.ok) return auth.response;

  const days = Number(process.env.SPONSOR_ACCESS_LOG_RETENTION_DAYS) || 540;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  try {
    const { data, error } = await getSupabaseAdmin()
      .from("child_media_access_log")
      .delete()
      .lt("created_at", cutoff)
      .select("id");
    if (error) {
      console.error("[cron/purge-access-logs] delete failed:", error.message);
      return NextResponse.json({ error: "Purge failed." }, { status: 500 });
    }
    const purged = data?.length ?? 0;
    console.log(`[cron/purge-access-logs] purged ${purged} rows older than ${days}d.`);
    return NextResponse.json({ ok: true, purged, retentionDays: days, cutoff });
  } catch (err) {
    console.error("[cron/purge-access-logs] threw:", err);
    return NextResponse.json({ error: "Purge failed." }, { status: 500 });
  }
}
