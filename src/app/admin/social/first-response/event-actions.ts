"use server";

/**
 * First Response event actions — manual management of detected emergency
 * events (separate from the test-scenario helpers in test-actions.ts).
 *
 * `deleteEmergencyEventAction` hard-deletes one event. The DB cascades clean
 * up the dependents: external_imagery + deck_drafts have ON DELETE CASCADE
 * (migrations 029 / 033) and social_posts.event_id is ON DELETE SET NULL
 * (migration 037), so a posted post's attribution survives while the source
 * report is removed. draft_content_blocks lives on the row itself, so it goes
 * with it.
 */

import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/admin-session";
import { logAdminAction } from "@/lib/admin-audit";
import { getSupabaseAdmin } from "@/lib/supabase";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function deleteEmergencyEventAction(
  eventId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const session = await requireAdminSession();
    if (!UUID_RE.test(eventId)) {
      return { ok: false, error: "Invalid event id." };
    }

    const supabase = getSupabaseAdmin();

    // Capture identity for the audit trail BEFORE deleting.
    const { data: ev } = await supabase
      .from("emergency_events")
      .select("title, source, external_id")
      .eq("id", eventId)
      .maybeSingle<{ title: string; source: string; external_id: string | null }>();
    if (!ev) {
      return { ok: false, error: "Event not found (already deleted?)." };
    }

    const { error } = await supabase
      .from("emergency_events")
      .delete()
      .eq("id", eventId);
    if (error) {
      console.error("[first-response] delete failed:", error);
      return { ok: false, error: error.message };
    }

    await logAdminAction({
      action: "first_response_event_deleted",
      userEmail: session.email,
      metadata: {
        eventId,
        title: ev.title,
        source: ev.source,
        externalId: ev.external_id,
      },
    });

    revalidatePath("/admin/social/first-response");
    return { ok: true };
  } catch (err) {
    console.error("[first-response] delete unexpected error:", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
