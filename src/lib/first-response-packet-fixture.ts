/**
 * Hand-crafted packet fixtures for TEST EVENTS only.
 *
 * Detected via `isTestEvent(event)` (source='test' OR external_id
 * prefix 'test:'). Real events from EONET / GDACS / IFRC / etc.
 * always call Claude. This file produces a deterministic, on-schema
 * packet so the SMM can re-draft a test event 50 times during demo
 * prep without burning Claude credits.
 *
 * To force Claude on a test event (e.g. to verify prompt changes
 * actually take effect): set FORCE_LIVE_PACKET_GEN=1 in the env.
 *
 * Fixture quality bar: the fixture's output must look genuinely
 * representative of a real Claude packet — same visual layout, same
 * register variation, the hero photo enforcement still fills in a
 * candidate. If a stakeholder ever saw the fixture by accident they
 * shouldn't be able to tell it from a Claude generation.
 */

import type { EmergencyEvent } from "./first-response";
import type { LaunchPacket } from "./first-response-packet";

/* ─── Test-event detection ─────────────────────────────────────── */

export function isTestEvent(event: EmergencyEvent): boolean {
  return (
    event.source === "test" || (event.externalId?.startsWith("test:") ?? false)
  );
}

/* ─── Scenario tag extraction ──────────────────────────────────── */

/**
 * Map the event back to its scenario ID so we can pick scenario-
 * specific copy. External_id format is 'test:<scenarioId>:<suffix>'.
 * Falls back to 'generic' when the format doesn't match.
 */
function scenarioOf(event: EmergencyEvent): string {
  if (!event.externalId) return "generic";
  const parts = event.externalId.split(":");
  if (parts.length >= 2 && parts[0] === "test") return parts[1]!;
  return "generic";
}

/* ─── Date helpers ─────────────────────────────────────────────── */

function formatDateLong(date: Date): string {
  return date
    .toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
    .toUpperCase();
}

/* ─── Per-scenario tunings ─────────────────────────────────────── */

interface ScenarioCopy {
  /** Arc choice — picks the visual mode. */
  arc: LaunchPacket["strategy_brief"]["arc"];
  /** First-person human angle for the brief. */
  angle: string;
  /** Top-line headline shown in the banner + email. */
  headline: string;
  /** Caption opener (the rest is templated). */
  captionLead: string;
  /** Slide hero title (typography or photo overlay). */
  heroTitle: string;
  /** Slide hero supporting line. */
  heroBody: string;
  /** Eyebrow on hero, e.g. 'EMERGENCY APPEAL · 28 MAY 2026'. */
  heroEyebrow: string;
  /** What DR is doing on the ground. */
  responseTitle: string;
  responseBody: string;
  /** A hard fact + source. */
  factTitle: string;
  factBody: string;
  factSource: string;
  /** Tier descriptions — specific, not generic-charity. */
  tier25: string;
  tier50: string;
  tier100: string;
  tier250: string;
  /** Hashtags (no # prefix). */
  hashtags: string[];
}

function copyForScenario(scenarioId: string, event: EmergencyEvent): ScenarioCopy {
  switch (scenarioId) {
    case "bd-earthquake":
      return {
        arc: "evidence",
        angle:
          "A magnitude-7 earthquake has shaken Sylhet. Families are sleeping outside their cracked homes; our team has been on the ground for hours.",
        headline: "M7.0 earthquake — our Sylhet team is responding",
        captionLead:
          "Your support is already moving. Our Sylhet team is delivering tarpaulins, food and medical aid to families sleeping outside.",
        heroTitle: "M7.0 earthquake — Sylhet",
        heroBody:
          "Widespread structural damage across the division. Families are without shelter tonight.",
        heroEyebrow: `EMERGENCY APPEAL · ${formatDateLong(new Date())}`,
        responseTitle: "Our Sylhet team is delivering aid now",
        responseBody:
          "Twelve volunteers are on the ground with tarpaulins, food and a paramedic. More are heading in from Dhaka.",
        factTitle: "Shallow-depth quake near a populated centre",
        factBody:
          "USGS reports a shallow-depth M7.0 event 42km east of Sylhet, near villages with limited reinforced construction.",
        factSource: "Source: USGS",
        tier25: "Tarpaulin + bedding for one family for two weeks",
        tier50: "Rice, dahl and cooking oil for a household of six",
        tier100: "A full emergency parcel: shelter, food and clean water",
        tier250: "Stocks the Sylhet team for a full day in the field",
        hashtags: ["bangladesh", "sylhet", "earthquakeresponse", "muslimcharity", "ukcharity"],
      };

    case "ps-gaza-escalation":
      return {
        arc: "awareness_petition",
        angle:
          "Gaza is being shelled again. Hospitals are running on generators. We are not asking for money in this post — we are asking you to refuse to look away.",
        headline: "Gaza is under bombardment — comment 'GAZA' to act",
        captionLead:
          "Gaza is being shelled again. Hospitals are running on generators. Children are being treated on the floor. The world is looking away.",
        heroTitle: "Gaza is being shelled — again",
        heroBody:
          "Hospitals are running on generators. Children are being treated on the floor.",
        heroEyebrow: `URGENT · ${formatDateLong(new Date())}`,
        responseTitle: "Our partners in Gaza are still operating",
        responseBody:
          "Working with local partners to keep clinics running and food parcels moving where the bombardment allows.",
        factTitle: "Hospitals on generator power for the third week",
        factBody:
          "Initial field reports from local partners describe widespread displacement and disruption to medical services.",
        factSource: "Source: Field reports · OCHA",
        tier25: "(awareness post — no donation tiers)",
        tier50: "",
        tier100: "",
        tier250: "",
        hashtags: ["gaza", "palestine", "ceasefirenow", "muslimcharity", "humanitarianlaw"],
      };

    case "bd-flood":
    case "pk-flood-eonet":
      return {
        arc: "quiet_dignity",
        angle:
          event.countryIso === "PK"
            ? "The Indus has overflowed across Sindh. Families are sleeping on rooftops; we have a team on the ground."
            : "The monsoon has hit Sylhet harder than 2022. Families are sleeping on rooftops; we have a team on the ground.",
        headline:
          event.countryIso === "PK"
            ? "Severe flooding across Sindh — our team is responding"
            : "Severe monsoon flooding in Sylhet — our team is responding",
        captionLead:
          "Families are sleeping on rooftops tonight. Your gift reaches them via a team we've worked with since 2013. 🤍",
        heroTitle:
          event.countryIso === "PK" ? "Sindh is under water" : "Sylhet is under water",
        heroBody:
          event.countryIso === "PK"
            ? "Monsoon floods have displaced families across southern Pakistan."
            : "Monsoon floods have displaced families across the division.",
        heroEyebrow: `URGENT NEED · ${formatDateLong(new Date())}`,
        responseTitle: "Familiar ground since 2013",
        responseBody:
          event.countryIso === "PK"
            ? "Our partners in Sindh are distributing clean water, hygiene kits and emergency food."
            : "Our Sylhet team is delivering clean water, food and tarpaulins.",
        factTitle: "Drinking water is no longer safe",
        factBody:
          "Initial field reports describe contaminated wells across the affected districts.",
        factSource: "Source: Initial field reports",
        tier25: "Two weeks of clean drinking water for a family",
        tier50: "An emergency hygiene and water-purification kit",
        tier100: "Food and clean water for a family of five",
        tier250: "Stocks the field team for a full day",
        hashtags:
          event.countryIso === "PK"
            ? ["pakistan", "sindh", "floodresponse", "muslimcharity", "ukcharity"]
            : ["bangladesh", "sylhet", "floodresponse", "muslimcharity", "ukcharity"],
      };

    case "uk-cold-snap":
      return {
        arc: "hero_image",
        angle:
          "Brighton's overnight temperatures are forecast to fall to -5°C. Our seafront team is out tonight with thermal bags and hot food.",
        headline:
          "Brighton cold snap — our seafront team is out tonight",
        captionLead:
          "Tonight, our team is on Brighton seafront with thermal bags, hot food and a kind word. Your support keeps this going.",
        heroTitle: "Brighton overnight — minus five",
        heroBody: "Our seafront team is out tonight with thermal bags and hot food.",
        heroEyebrow: `URGENT · ${formatDateLong(new Date())}`,
        responseTitle: "Every week since 2013",
        responseBody:
          "Our volunteers have been on Brighton seafront for over a decade. Tonight's bag count is the highest of the winter so far.",
        factTitle: "Amber cold-weather warning across Sussex",
        factBody:
          "The Met Office has issued an amber warning; rough-sleeper outreach faces severe operational impact.",
        factSource: "Source: Met Office",
        tier25: "A thermal sleeping bag for someone on the seafront",
        tier50: "Five hot meals + bags for a winter night patrol",
        tier100: "A week of bag-runs across central Brighton",
        tier250: "Stocks one full outreach Saturday",
        hashtags: ["brighton", "ukhomeless", "coldsnap", "muslimcharity", "ukcharity"],
      };

    default:
      return {
        arc: "evidence",
        angle: "Our team is responding on the ground.",
        headline: event.title,
        captionLead:
          "Your support reaches families our team has worked with for years. 🤍",
        heroTitle: event.title.slice(0, 60),
        heroBody:
          event.summary?.slice(0, 100) ??
          "Our team is mobilising to support families on the ground.",
        heroEyebrow: `URGENT · ${formatDateLong(new Date())}`,
        responseTitle: "Our team is responding",
        responseBody:
          "Coordinating with local partners who know the area best.",
        factTitle: "Field reports incoming",
        factBody: "Our partners on the ground are filing initial assessments.",
        factSource: "Source: Field reports",
        tier25: "Two weeks of essentials for a family",
        tier50: "Emergency hygiene kit and shelter materials",
        tier100: "Food and clean water for a household of five",
        tier250: "Stocks the field team for a full day",
        hashtags: ["muslimcharity", "ukcharity", "emergencyresponse"],
      };
  }
}

/* ─── Fixture builder ──────────────────────────────────────────── */

export function buildFixturePacket(event: EmergencyEvent): LaunchPacket {
  const scenarioId = scenarioOf(event);
  const c = copyForScenario(scenarioId, event);
  const isPetition = c.arc === "awareness_petition";

  // Common manifesto-arc check for slide count: petition arcs OMIT
  // tier slides. hero_image / quiet_dignity / evidence run the
  // standard 5-slide arc.
  const slides: LaunchPacket["carousel_slides"] = isPetition
    ? [
        {
          layout: "hero",
          eyebrow: c.heroEyebrow,
          title: c.heroTitle,
          body: c.heroBody,
          tier_lines: null,
          source_attribution: null,
          media_id: null, // Render-time enforcement fills this in.
          logo_variant: "white",
        },
        {
          layout: "fact",
          eyebrow: "WHAT WE KNOW",
          title: c.factTitle,
          body: c.factBody,
          tier_lines: null,
          source_attribution: c.factSource,
          media_id: null,
          logo_variant: "white",
        },
        {
          layout: "response",
          eyebrow: "ON THE GROUND",
          title: c.responseTitle,
          body: c.responseBody,
          tier_lines: null,
          source_attribution: null,
          media_id: null,
          logo_variant: "white",
        },
        {
          layout: "cta",
          eyebrow: null,
          title: "Comment 'GAZA'",
          body: "We'll DM you a link to act",
          tier_lines: null,
          source_attribution: null,
          media_id: null,
          logo_variant: "green",
        },
      ]
    : [
        {
          layout: "hero",
          eyebrow: c.heroEyebrow,
          title: c.heroTitle,
          body: c.heroBody,
          tier_lines: null,
          source_attribution: null,
          media_id: null, // Render-time enforcement fills this in.
          logo_variant: "white",
        },
        {
          layout: "fact",
          eyebrow: "WHAT WE KNOW",
          title: c.factTitle,
          body: c.factBody,
          tier_lines: null,
          source_attribution: c.factSource,
          media_id: null,
          logo_variant: "white",
        },
        {
          layout: "response",
          eyebrow: "ON THE GROUND",
          title: c.responseTitle,
          body: c.responseBody,
          tier_lines: null,
          source_attribution: null,
          media_id: null,
          logo_variant: "white",
        },
        {
          layout: "tiers",
          eyebrow: "HOW YOUR GIFT HELPS",
          title: "What your gift does",
          body: null,
          tier_lines: [
            { amount_gbp: 25, short_description: c.tier25 },
            { amount_gbp: 50, short_description: c.tier50 },
            { amount_gbp: 100, short_description: c.tier100 },
          ],
          source_attribution: null,
          media_id: null,
          logo_variant: "white",
        },
        {
          layout: "cta",
          eyebrow: null,
          title: "Donate now",
          body: "Link in bio · deenrelief.org",
          tier_lines: null,
          source_attribution: null,
          media_id: null,
          logo_variant: "green",
        },
      ];

  const tiers: LaunchPacket["donation_tiers"] = isPetition
    ? [
        { amount_gbp: 25, description: c.tier25 || "Two weeks of essentials for a family." },
        { amount_gbp: 50, description: c.tier50 || "Emergency hygiene kit and shelter materials." },
        { amount_gbp: 100, description: c.tier100 || "Food and clean water for a household." },
        { amount_gbp: 250, description: c.tier250 || "Stocks the field team for a full day." },
      ]
    : [
        { amount_gbp: 25, description: c.tier25 },
        { amount_gbp: 50, description: c.tier50 },
        { amount_gbp: 100, description: c.tier100 },
        { amount_gbp: 250, description: c.tier250 },
      ];

  return {
    strategy_brief: {
      angle: c.angle,
      arc: c.arc,
      register_per_surface: {
        caption: isPetition
          ? "angry, restrained, refusing to look away"
          : "intimate, first-person plural, our team is already moving",
        slides:
          c.arc === "quiet_dignity"
            ? "witness-bearing, slow, lets the photos carry the weight"
            : c.arc === "awareness_petition"
              ? "factual, building tension, the appeal is to refuse silence"
              : "factual scaffold building tension toward the appeal",
        email:
          "long-form bridge, second-person, opens with a sensory detail, narrows to the ask",
        press: "",
      },
      slide_count: slides.length,
      slide_count_rationale: isPetition
        ? "Petition arcs run 4 slides: hero → evidence → response → comment-keyword CTA. No tiers — the ask is engagement, not money."
        : "Standard arc: hero → evidence → response → tiers → CTA. The story is sharp enough to land in 5; padding would dilute it.",
    },
    headline: c.headline,
    donation_tiers: tiers,
    verified_facts: [
      { fact: c.factTitle, source: c.factSource },
      {
        fact: c.responseTitle,
        source: "Deen Relief field operations",
      },
    ],
    field_operations_note:
      event.countryIso === "GB-BRT"
        ? "Our seafront team has been operating in Brighton since 2013."
        : event.countryIso === "BD"
          ? "Our Bangladesh team has worked across Sylhet division since 2013."
          : event.countryIso === "PK"
            ? "Our partners in Pakistan have worked across Sindh since 2013."
            : event.countryIso === "PS"
              ? "We work with local partners across Gaza to keep aid moving."
              : "Coordinating with local partners on the ground.",
    cta_mechanism: isPetition ? "comment_keyword" : "link_in_bio",
    cta_keyword: isPetition ? "GAZA" : null,
    social_post: {
      caption: isPetition
        ? `${c.captionLead}\n\nWe are not asking for donations in this post. We are asking you to refuse to look away. Comment 'GAZA' and we'll DM you a link to act. 🤍`
        : `${c.captionLead}\n\nLink in bio to support. 🤍`,
      hashtags: c.hashtags,
    },
    carousel_slides: slides,
    email: {
      subject_lines: [
        `${c.headline}`,
        `From our team on the ground`,
        `Update from ${event.region ?? event.countryIso ?? "the field"}`,
      ],
      body:
        `${c.angle}\n\nOur team has been working in this region for years. Today they are moving aid where it's needed most.\n\n${c.responseBody}\n\nIf you can, please support — link below.\n\nDeenrelief.org\n\nJazakallahu khairan,\nEveryone at Deen Relief`,
    },
    press_release: "",
  };
}
