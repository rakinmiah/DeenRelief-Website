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
import { TEST_SCENARIOS, type TestScenarioId } from "./test-scenarios";

// IMPORTANT: this file has "use server" at the top — Next.js only
// allows async function exports here. The TEST_SCENARIOS const +
// TestScenarioId type live in ./test-scenarios.ts. Client components
// must import them directly from there (this file's "use server"
// boundary strips non-async exports at the wire).

export type TestActionResult =
  | { ok: true; eventId: string | null; score: number | null; tier: string }
  | { ok: false; error: string };

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

    case "pk-flood-eonet":
      // Source MUST be 'eonet' (not 'test') — the NASA imagery fetcher
      // only runs when event.source === 'eonet'. The cleanup action
      // also matches external_id LIKE 'test:%' so this still gets
      // wiped by "Clear test events".
      //
      // raw_payload shape mirrors a real EONET API event so the
      // src/lib/external-imagery-sources/nasa-eonet.ts fetcher reads
      // sources[].url out of it identically to a real ingest. The image
      // URL ends in .jpg → matches the imagery-fetcher's regex, fetcher
      // upserts an external_imagery row, packet generator offers it to
      // Claude as a candidate. Renderer credits NASA Earth Observatory
      // bottom-right of the photo when Claude picks it.
      return {
        externalId,
        source: "eonet",
        eventType: "flood",
        countryIso: "PK",
        region: "Sindh province, southern Pakistan",
        title: "Severe flooding across Sindh — NASA EONET satellite tracking",
        summary:
          "NASA EONET is tracking widespread flooding across multiple districts of Sindh province following heavy monsoon rainfall. Satellite imagery shows extensive inundation of farmland and infrastructure along the Indus river basin. (TEST EVENT — not a real alert.)",
        severityRaw: 2,
        sourceUrl:
          "https://earthobservatory.nasa.gov/images/event/2022-pakistan-floods",
        rawPayload: {
          // Mirrors EONET API event shape (see src/lib/signal-sources/eonet.ts
          // EonetEvent interface). The imagery fetcher pulls sources[].url.
          id: `EONET_TEST_${uniqueSuffix}`,
          title: "Severe flooding across Sindh — NASA EONET satellite tracking",
          description:
            "Test event — exercises the NASA EONET signal-source path + external imagery integration for the launch packet generator.",
          link: "https://earthobservatory.nasa.gov/images/event/2022-pakistan-floods",
          categories: [{ id: "floods", title: "Floods" }],
          sources: [
            {
              id: "MODIS",
              // NASA MODIS satellite image of the 2022 Sindh floods,
              // hosted on Wikimedia Commons (which serves as a stable
              // permanent mirror for NASA public-domain imagery). The
              // image is genuinely a NASA Terra/MODIS capture from
              // 2022-08-30; Wikimedia just hosts the bytes. Verified
              // HTTP 200, ETag stable since 2024-01.
              //
              // Why Wikimedia rather than eoimages.gsfc.nasa.gov: the
              // NASA EO archive uses 6-digit image-record IDs that
              // aren't deterministic from the date/region, so any
              // hard-coded URL is fragile. Wikimedia URLs are content-
              // addressed by filename + hash — permanent once uploaded.
              //
              // Ends in .jpg → passes imagery-fetcher regex.
              url: "https://upload.wikimedia.org/wikipedia/commons/2/27/Deadly_Flooding_in_Pakistan_%28MODIS_2022-08-30%29.jpg",
            },
          ],
          geometry: [
            {
              date: new Date().toISOString(),
              type: "Point",
              coordinates: [68.0, 26.5],
            },
          ],
          // Tagged so the cleanup pass can identify test rows even
          // though source='eonet' (real EONET pulls share that source).
          scenario: scenarioId,
          generatedAt: new Date().toISOString(),
        },
      };

    case "ps-ocha-may26": {
      // REAL CLAUDE TEST EVENT — sourced from the OCHA oPt Humanitarian
      // Situation Report dated 25 May 2026 (ReliefWeb). external_id
      // uses 'realtest:' prefix specifically so isTestEvent() returns
      // false and Claude actually runs against substantive content.
      // Cost: ~$0.30 per redraft. The point of this scenario is to
      // stress-test the new briefing register (4u), fact specificity
      // (4v), and aggressive image use (4v) against real numbers from
      // a current OCHA dispatch.
      //
      // Numbers below extracted verbatim from:
      // https://reliefweb.int/report/occupied-palestinian-territory/opt-humanitarian-situation-report-25-may-2026
      const realExternalId = `realtest:ps-ocha-may26:${uniqueSuffix}`;
      return {
        externalId: realExternalId,
        source: "reliefweb",
        eventType: "conflict_escalation",
        countryIso: "PS",
        region: "Gaza Strip + West Bank including East Jerusalem",
        title:
          "oPt: Humanitarian Situation Report | 25 May 2026 — escalating violence, mass displacement",
        summary:
          "OCHA's current situation report covers the West Bank (50+ settler attacks in one week, 5 Palestinians killed 12–18 May, hundreds at risk of forced displacement in East Jerusalem) and Gaza Strip (1.7M people across 1,600 displacement sites, 881 fatalities since the October 2025 ceasefire per Gaza MoH, severe shortages of engine oil disrupting WASH services).",
        severityRaw: 3,
        sourceUrl:
          "https://reliefweb.int/report/occupied-palestinian-territory/opt-humanitarian-situation-report-25-may-2026",
        rawPayload: {
          // Compact extracted data mirroring how a ReliefWeb signal
          // would look once ReliefWeb fetcher is wired (Phase 4l stub).
          source_agency: "OCHA",
          report_type: "Situation Report",
          report_date: "2026-05-25",
          country_iso: "PSE",
          // ── Headline metrics (verified against the source URL) ──
          metrics: {
            // West Bank
            settler_attacks_week: 50,
            settler_attacks_year_to_date: 870,
            settler_attacks_communities_affected: 220,
            settler_attack_avg_per_day_2026: 6,
            palestinians_killed_wb_12_18_may: 5,
            palestinians_injured_wb_12_18_may: 60,
            structures_demolished_reporting_period: 24,
            structures_demolished_ytd_pct_agricultural: 71,
            khan_al_ahmar_at_risk_communities: 18,
            khan_al_ahmar_at_risk_people: 4000,
            // Gaza
            people_in_displacement_sites: 1700000,
            households_in_displacement_sites: 354480,
            displacement_sites_total: 1600,
            makeshift_sites_pct: 88,
            gaza_killed_since_ceasefire_oct2025: 881,
            gaza_injured_since_ceasefire_oct2025: 2621,
            gaza_killed_12_20_may: 24,
            gaza_injured_12_20_may: 159,
            families_displaced_16_17_may: 150,
            jabalya_strike_families_affected: 35,
            // Aid + access
            water_cubic_metres_per_day: 24000,
            water_delivery_locations: 2000,
            households_relying_on_water_deliveries_pct: 74,
            food_parcels_people: 440000,
            food_parcels_households: 122000,
            cooked_meals_per_day: 1000000,
            bread_metric_tons_per_day: 300,
            bread_pct_of_estimated_need: 36,
            kerem_shalom_offloading_pct: 81,
            diesel_litres_imported_7_20_may: 2100000,
            // Explosive ordnance
            eo_accidents_since_oct2025: 109,
            eo_killed_since_oct2025: 49,
            eo_injured_since_oct2025: 265,
          },
          highlights: [
            "More than 50 attacks by settlers across the West Bank in one week resulted in casualties or property damage, including arson attacks that damaged a mosque, homes, farmland and vehicles.",
            "OCHA has documented an average of six such attacks per day in 2026.",
            "Hundreds of Palestinians in eastern Jerusalem governorate at risk of forced displacement after the Israeli Finance Minister called for the rapid implementation of demolition orders against Khan al Ahmar.",
            "In Gaza, humanitarian partners launched a pest-control campaign in over 1,700 locations.",
            "Only half of all aid trucks from Egypt could offload at the Israeli-controlled Kerem Shalom Crossing in the first 18 days of May.",
            "1.7 million people across 1,600 displacement sites in Gaza; nearly 88 per cent reside in makeshift sites.",
            "881 fatalities and 2,621 injuries reported since the announcement of a ceasefire on 10 October 2025 (Gaza MoH).",
          ],
          attachments: [
            {
              title: "Situation Report PDF",
              format: "application/pdf",
              size_mb: 1.32,
            },
          ],
          // Wikimedia hints — the imagery fetcher's Wikimedia search
          // uses event-derived keywords. Including 'gaza humanitarian'
          // + 'palestinian territory' helps it find CC-licensed
          // photography from UN bodies (UNRWA, OCHA, World Bank).
          imagery_keywords: [
            "Gaza humanitarian situation",
            "Palestinian displacement",
            "Khan Younis displacement camp",
            "Jabalya refugee camp",
            "Khan al Ahmar Bedouin",
          ],
          scenario: scenarioId,
          generatedAt: new Date().toISOString(),
        },
      };
    }
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
    // Match three paths:
    //   • source='test' — original tagged-source rows
    //   • external_id LIKE 'test:%' — NASA-EONET-shaped scenarios using
    //     source='eonet' but tagged for cleanup
    //   • external_id LIKE 'realtest:%' — real-Claude scenarios sourced
    //     from live news (OCHA / ReliefWeb) where fixture-mode is
    //     intentionally bypassed to exercise the prompts on real content
    const { data, error } = await supabase
      .from("emergency_events")
      .delete()
      .or(
        "source.eq.test,external_id.like.test:%,external_id.like.realtest:%"
      )
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
