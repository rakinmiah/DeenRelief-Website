"use server";

/**
 * Test-scenario admin actions for the First Response dashboard.
 *
 * Lets the SMM (or anyone running a demo) spin up a realistic
 * emergency event on demand without waiting for a real cron to fire.
 * The events route through the SAME ingester the real sources use,
 * so they score via the same algorithm, fire push notifications when
 * appropriate, and behave identically to a real GDACS/IFRC alert
 * once inserted.
 *
 * Tagging: source='test' makes them easily distinguishable from real
 * events. The "Clear test events" action wipes ALL rows with that
 * source so cleanup is one click.
 */

import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/admin-session";
import { logAdminAction } from "@/lib/admin-audit";
import {
  ingestEmergencyEvent,
  type EmergencyEventInput,
} from "@/lib/first-response-ingest";
import { getSupabaseAdmin } from "@/lib/supabase";

export type TestActionResult =
  | { ok: true; eventId: string | null; score: number | null; tier: string }
  | { ok: false; error: string };

/* ─── Scenarios ───────────────────────────────────────────────────── */

export const TEST_SCENARIOS = {
  "bd-earthquake": {
    label: "Bangladesh M7.0 earthquake (Sylhet)",
    description:
      "CRITICAL push — strategic field presence + 2.0× UK Bangladeshi diaspora",
    expectedTier: "CRITICAL",
  },
  "ps-gaza-escalation": {
    label: "Palestine — Gaza conflict escalation",
    description:
      "CRITICAL push — strategic Palestine campaign matched",
    expectedTier: "CRITICAL",
  },
  "bd-flood": {
    label: "Bangladesh severe monsoon flood (Sylhet)",
    description:
      "CRITICAL push — matches orphan-sponsorship + build-a-school + clean-water",
    expectedTier: "CRITICAL",
  },
  "uk-cold-snap": {
    label: "Brighton — severe cold snap warning",
    description:
      "Dashboard only — uk-homeless intensification trigger, no push",
    expectedTier: "none",
  },
} as const;

export type TestScenarioId = keyof typeof TEST_SCENARIOS;

/**
 * Build an EmergencyEventInput for a given scenario. Pre-tuned
 * severity values so the score lands in the expected tier — all
 * test events get source='test' so the normaliseSeverity transform
 * doesn't apply (USGS-specific). Severity passes through as-is.
 */
function buildScenarioInput(
  scenarioId: TestScenarioId,
  uniqueSuffix: string
): EmergencyEventInput {
  const externalId = `test:${scenarioId}:${uniqueSuffix}`;

  switch (scenarioId) {
    case "bd-earthquake":
      return {
        externalId,
        source: "test",
        eventType: "earthquake",
        countryIso: "BD",
        region: "Sylhet division, north-east Bangladesh",
        title: "M 7.0 — 42km E of Sylhet, Bangladesh",
        summary:
          "A magnitude 7.0 earthquake struck near Sylhet at shallow depth. Initial reports indicate widespread structural damage in the city centre and surrounding villages. Power and communications disrupted across the division. (TEST EVENT — not a real alert.)",
        severityRaw: 3,
        sourceUrl: null,
        rawPayload: { scenario: scenarioId, generatedAt: new Date().toISOString() },
      };

    case "ps-gaza-escalation":
      return {
        externalId,
        source: "test",
        eventType: "conflict_escalation",
        countryIso: "PS",
        region: "Gaza Strip",
        title: "Escalation reported across Gaza — civilian casualties rising",
        summary:
          "Renewed military operations reported across multiple districts of the Gaza Strip. Initial humanitarian reports describe widespread displacement and disruption to medical services. (TEST EVENT — not a real alert.)",
        severityRaw: 3,
        sourceUrl: null,
        rawPayload: { scenario: scenarioId, generatedAt: new Date().toISOString() },
      };

    case "bd-flood":
      return {
        externalId,
        source: "test",
        eventType: "flood",
        countryIso: "BD",
        region: "Sylhet division",
        title: "Severe monsoon flooding inundates Sylhet — thousands displaced",
        summary:
          "Heavy monsoon rains have flooded large parts of Sylhet division. Initial reports describe river levels well above warning thresholds, widespread displacement, and contaminated drinking water in affected districts. (TEST EVENT — not a real alert.)",
        severityRaw: 3,
        sourceUrl: null,
        rawPayload: { scenario: scenarioId, generatedAt: new Date().toISOString() },
      };

    case "uk-cold-snap":
      return {
        externalId,
        source: "test",
        eventType: "cold_snap",
        countryIso: "GB-BRT",
        region: "Brighton & Sussex",
        title: "Met Office Amber warning — severe cold snap, Sussex coast",
        summary:
          "An amber cold-weather warning is in force across Sussex and the Brighton coast, with overnight temperatures forecast to fall to -5°C. Significant impact expected on rough-sleeper outreach operations. (TEST EVENT — not a real alert.)",
        severityRaw: 2,
        sourceUrl: null,
        rawPayload: { scenario: scenarioId, generatedAt: new Date().toISOString() },
      };
  }
}

/* ─── Create ──────────────────────────────────────────────────────── */

export async function createTestEventAction(
  scenarioId: TestScenarioId
): Promise<TestActionResult> {
  try {
    const session = await requireAdminSession();
    if (!(scenarioId in TEST_SCENARIOS)) {
      return { ok: false, error: "Unknown test scenario." };
    }

    // Unique suffix lets the SMM click the same scenario multiple times
    // (each click creates a fresh row to play with — different IDs).
    const suffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const input = buildScenarioInput(scenarioId, suffix);

    const result = await ingestEmergencyEvent(input);

    await logAdminAction({
      action: "first_response_test_event_created",
      userEmail: session.email,
      metadata: {
        scenarioId,
        score: result.drPriorityScore,
        tier: result.pushTier,
        externalId: input.externalId,
      },
    });

    revalidatePath("/admin/social/first-response");

    // Look up the created event id so the UI can link straight to it.
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from("emergency_events")
      .select("id")
      .eq("external_id", input.externalId)
      .maybeSingle<{ id: string }>();

    return {
      ok: true,
      eventId: data?.id ?? null,
      score: result.drPriorityScore,
      tier: result.pushTier,
    };
  } catch (err) {
    console.error("[test-event] create failed:", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/* ─── Clear ───────────────────────────────────────────────────────── */

export async function clearTestEventsAction(): Promise<
  { ok: true; deleted: number } | { ok: false; error: string }
> {
  try {
    const session = await requireAdminSession();
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("emergency_events")
      .delete()
      .eq("source", "test")
      .select("id");
    if (error) {
      console.error("[test-event] clear failed:", error);
      return { ok: false, error: error.message };
    }
    const deleted = data?.length ?? 0;

    await logAdminAction({
      action: "first_response_test_events_cleared",
      userEmail: session.email,
      metadata: { deleted },
    });

    revalidatePath("/admin/social/first-response");
    return { ok: true, deleted };
  } catch (err) {
    console.error("[test-event] clear unexpected error:", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
