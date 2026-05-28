"use server";

/**
 * Server actions for the First Response event detail page.
 *
 *   - draftLaunchPacketAction(eventId) → calls Claude, persists the packet
 *   - markEventReviewedAction(eventId) → SMM acknowledged this event
 *   - dismissEventAction(eventId)      → SMM judged this not worth launching
 *
 * Every action requires an admin session (both 'admin' and 'social' roles
 * are allowed to drive First Response) and writes an audit row.
 */

import { revalidatePath } from "next/cache";
import { logAdminAction } from "@/lib/admin-audit";
import { requireAdminSession } from "@/lib/admin-session";
import { getCoverageMap, getEmergencyEventById } from "@/lib/first-response";
import {
  generateLaunchPacket,
  type LaunchPacket,
} from "@/lib/first-response-packet";
import { getSupabaseAdmin } from "@/lib/supabase";

export type ActionResult<T = void> =
  | (T extends void ? { ok: true } : { ok: true } & T)
  | { ok: false; error: string };

/**
 * Generate the launch packet for an emergency event via Claude and
 * persist it on the row. Idempotent in the sense that calling twice
 * just overwrites with a fresh draft — useful when the event's raw
 * payload has updated since the last draft.
 */
export async function draftLaunchPacketAction(
  eventId: string
): Promise<ActionResult<{ packet: LaunchPacket }>> {
  const session = await requireAdminSession();
  if (!eventId || typeof eventId !== "string") {
    return { ok: false, error: "Missing event id." };
  }

  // Load the event + the coverage map so the generator has the full picture.
  const [event, coverage] = await Promise.all([
    getEmergencyEventById(eventId),
    getCoverageMap(),
  ]);
  if (!event) return { ok: false, error: "Event not found." };

  // Matching coverage entries — using the same matcher logic as the
  // ingest helper (re-used so scoring inputs stay consistent).
  const matchedCoverage = coverage.filter((c) => {
    if (c.weight <= 0) return false;
    if (c.triggerEventTypes.length === 0) return false;
    if (event.eventType && !c.triggerEventTypes.includes(event.eventType)) {
      return false;
    }
    if (c.isCatchAll) return true;
    if (!event.countryIso) return false;
    const country = event.countryIso.toUpperCase();
    return c.geographies.some(
      (g) =>
        g === country ||
        g.startsWith(`${country}-`) ||
        country.startsWith(`${g}-`)
    );
  });

  let generated: Awaited<ReturnType<typeof generateLaunchPacket>>;
  try {
    generated = await generateLaunchPacket({
      event,
      matchedCoverage,
      rawPayload: event.rawPayload,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[first-response] draft generation failed:", err);
    return {
      ok: false,
      error: `Could not draft the launch packet: ${message}`,
    };
  }

  // Persist the draft + metadata.
  const supabase = getSupabaseAdmin();
  const { error: updateErr } = await supabase
    .from("emergency_events")
    .update({
      draft_packet_json: generated.packet,
      draft_packet_generated_at: new Date().toISOString(),
      draft_packet_generated_by_email: session.email,
      draft_packet_model: generated.model,
      draft_packet_input_tokens: generated.inputTokens,
      draft_packet_output_tokens: generated.outputTokens,
    })
    .eq("id", eventId);

  if (updateErr) {
    console.error("[first-response] draft persist failed:", updateErr);
    return { ok: false, error: "Generated, but could not save the draft." };
  }

  await logAdminAction({
    action: "first_response_packet_drafted",
    userEmail: session.email,
    targetId: eventId,
    metadata: {
      model: generated.model,
      inputTokens: generated.inputTokens,
      outputTokens: generated.outputTokens,
      matchedCampaigns: event.matchedCampaigns,
    },
  });

  revalidatePath(`/admin/social/first-response/${eventId}`);
  revalidatePath("/admin/social/first-response");

  return { ok: true, packet: generated.packet };
}

export async function markEventReviewedAction(
  eventId: string
): Promise<ActionResult> {
  const session = await requireAdminSession();
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("emergency_events")
    .update({
      status: "reviewed",
      reviewed_by_email: session.email,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", eventId);
  if (error) {
    console.error("[first-response] mark reviewed failed:", error);
    return { ok: false, error: "Could not mark the event as reviewed." };
  }
  await logAdminAction({
    action: "first_response_event_reviewed",
    userEmail: session.email,
    targetId: eventId,
  });
  revalidatePath(`/admin/social/first-response/${eventId}`);
  revalidatePath("/admin/social/first-response");
  return { ok: true };
}

export async function dismissEventAction(
  eventId: string
): Promise<ActionResult> {
  const session = await requireAdminSession();
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("emergency_events")
    .update({
      status: "dismissed",
      reviewed_by_email: session.email,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", eventId);
  if (error) {
    console.error("[first-response] dismiss failed:", error);
    return { ok: false, error: "Could not dismiss the event." };
  }
  await logAdminAction({
    action: "first_response_event_dismissed",
    userEmail: session.email,
    targetId: eventId,
  });
  revalidatePath(`/admin/social/first-response/${eventId}`);
  revalidatePath("/admin/social/first-response");
  return { ok: true };
}

