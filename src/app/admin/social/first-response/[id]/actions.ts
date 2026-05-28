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
import { enqueueNotification } from "@/lib/admin-notifications";
import { logAdminAction } from "@/lib/admin-audit";
import { requireAdminSession } from "@/lib/admin-session";
import { isValidCampaign, type CampaignSlug } from "@/lib/campaigns";
import { getCoverageMap, getEmergencyEventById } from "@/lib/first-response";
import {
  generateLaunchPacket,
  LaunchPacketSchema,
  type LaunchPacket,
} from "@/lib/first-response-packet";
import { createSpotlight } from "@/lib/now-spotlight";
import { CAMPAIGN_LANDING_PATHS } from "@/lib/short-links";
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

export interface LaunchAppealOptions {
  /** Days to spotlight on /now. 1–30, default 7. */
  spotlightDays?: number;
}

/**
 * Launch an emergency appeal — the one-button orchestrator that
 * collapses 5–10 minutes of clicking into ~3 seconds. Fires:
 *
 *   1. Site banner       — urgent theme, packet headline, link to
 *                          the matched campaign page.
 *   2. Featured campaign — set to the top matched campaign.
 *   3. /now spotlight    — points the bio link at the matched campaign
 *                          for 7 days (default).
 *   4. Admin push        — bell + OS push to every trustee with the
 *                          DR Admin PWA installed.
 *   5. Status            — event → 'launched', stamps appeal_launched_at.
 *
 * Refuses to re-fire if the event is already launched. The packet
 * must have been drafted first — the headline + link come from it.
 *
 * Best-effort across the 4 side effects: if one fails (e.g. banner
 * write OK but featured-campaign fails), we still try the rest and
 * mark the event launched. The audit metadata records which side
 * effects succeeded so a trustee can manually fix any gap.
 */
export async function launchAppealAction(
  eventId: string,
  options: LaunchAppealOptions = {}
): Promise<ActionResult<{ campaignSlug: string }>> {
  const session = await requireAdminSession();
  if (!eventId) return { ok: false, error: "Missing event id." };

  const event = await getEmergencyEventById(eventId);
  if (!event) return { ok: false, error: "Event not found." };
  if (event.appealLaunchedAt) {
    return { ok: false, error: "This appeal has already been launched." };
  }
  if (!event.draftPacketJson) {
    return {
      ok: false,
      error: "Draft the launch packet before launching the appeal.",
    };
  }

  const parsed = LaunchPacketSchema.safeParse(event.draftPacketJson);
  if (!parsed.success) {
    return {
      ok: false,
      error:
        "The stored packet doesn't match the current schema. Redraft it before launching.",
    };
  }
  const packet: LaunchPacket = parsed.data;

  // Pick the routing campaign — top-ranked matched campaign that's a
  // real CampaignSlug. The matched_campaigns array is already sorted by
  // coverage weight by computeMatchedCampaigns.
  const primaryMatch = event.matchedCampaigns.find((slug) =>
    isValidCampaign(slug)
  ) as CampaignSlug | undefined;
  if (!primaryMatch) {
    return {
      ok: false,
      error:
        "Event has no matched campaign — cannot route a launch. Check the coverage map.",
    };
  }
  const campaignPath = CAMPAIGN_LANDING_PATHS[primaryMatch];

  // Track which steps succeeded for audit + partial-failure visibility.
  const steps: Record<string, boolean | string> = {};
  const stepErrors: string[] = [];

  // SCOPE NOTE (changed 2026-05-28 per SMM request):
  // Launching an appeal NO LONGER edits the public site itself —
  // the site banner and the homepage's "featured campaign" stay
  // exactly as the SMM left them in Campaign Command Center. The
  // ONLY public-facing side effect is the /now spotlight, which is
  // a soft bio-link redirect rather than a site-content change.
  // She can still flip banner + featured manually from
  // /admin/social/banner and /admin/social/featured if she wants.

  // 1. /now spotlight — 7-day default for emergencies (a normal post is
  // 3 days; an emergency holds the bio link longer).
  const spotlightDays = Math.min(
    Math.max(options.spotlightDays ?? 7, 1),
    30
  );
  try {
    const spotlightResult = await createSpotlight({
      campaignSlug: primaryMatch,
      durationDays: spotlightDays,
      byEmail: session.email,
    });
    steps.spotlight = spotlightResult.ok ? true : spotlightResult.error;
    if (!spotlightResult.ok) {
      stepErrors.push(`spotlight: ${spotlightResult.error}`);
    }
  } catch (err) {
    steps.spotlight = err instanceof Error ? err.message : "threw";
    stepErrors.push(`spotlight: exception`);
  }

  // 2. Admin push — bell + OS push to every subscribed DR Admin user.
  // Fire-and-forget; enqueueNotification swallows its own errors.
  try {
    await enqueueNotification({
      type: "first_response_critical",
      severity: "urgent",
      title: `🚀 Appeal launched: ${packet.headline.slice(0, 80)}`,
      body: `/now spotlight set to ${primaryMatch} for ${spotlightDays} days. Score ${event.drPriorityScore?.toFixed(1) ?? "—"}.`,
      targetUrl: `/admin/social/first-response/${eventId}`,
      targetId: eventId,
    });
    steps.push = true;
  } catch (err) {
    steps.push = err instanceof Error ? err.message : "threw";
    // Push failure isn't critical — the appeal is live regardless.
  }

  // 5. Status + timestamp — final commit. If this fails the side effects
  // already happened, so the event will still be visibly different in
  // the dashboard even without the launched flag.
  const supabase = getSupabaseAdmin();
  const { error: updateErr } = await supabase
    .from("emergency_events")
    .update({
      status: "launched",
      appeal_launched_at: new Date().toISOString(),
      appeal_launched_by_email: session.email,
    })
    .eq("id", eventId);

  if (updateErr) {
    console.error("[first-response] launch status update failed:", updateErr);
    stepErrors.push(`status: ${updateErr.message}`);
  }

  await logAdminAction({
    action: "first_response_appeal_launched",
    userEmail: session.email,
    targetId: eventId,
    metadata: {
      campaignSlug: primaryMatch,
      campaignPath,
      headline: packet.headline,
      spotlightDays,
      steps,
      stepErrors: stepErrors.length > 0 ? stepErrors : undefined,
    },
  });

  revalidatePath(`/admin/social/first-response/${eventId}`);
  revalidatePath("/admin/social/first-response");
  revalidatePath("/admin/social");
  // The banner + featured campaign live on every public page; bust the
  // root layout cache so the appeal is visible on the next request.
  revalidatePath("/", "layout");

  if (stepErrors.length > 0) {
    return {
      ok: false,
      error: `Launched with errors: ${stepErrors.join("; ")}. Check Campaign Command Center.`,
    };
  }
  return { ok: true, campaignSlug: primaryMatch };
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

