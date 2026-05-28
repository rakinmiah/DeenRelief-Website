/**
 * First Response launch packet generator.
 *
 * Given a detected emergency event, calls Claude (Opus 4.7) to draft a
 * complete launch packet — headline, body copy, donation tiers, verified
 * facts, social posts across 5 platforms, email subject lines + body,
 * and a press release. The SMM reviews + edits before publishing; this
 * just provides the on-brand starting point.
 *
 * Brand voice + visual rules baked into the system prompt are sourced from
 * the live audit of Deen Relief's actual social presence — see the
 * Brand Voice Spec section below. Single source of truth for every piece
 * of generated copy on the platform.
 *
 * Why structured output via Zod + messages.parse():
 *   - Type-safe end-to-end (the Zod schema IS the TypeScript type)
 *   - Claude's structured output guarantees valid JSON matching the schema
 *   - No brittle string parsing or "extract JSON between ```" hacks
 */

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { CoverageEntry, EmergencyEvent } from "./first-response";
import { CAMPAIGNS, isValidCampaign, type CampaignSlug } from "./campaigns";
import { CAMPAIGN_LANDING_PATHS } from "./short-links";

const MODEL = "claude-opus-4-7";

// ─── Zod schema (=== TypeScript type) ──────────────────────────────────

export const LaunchPacketSchema = z.object({
  headline: z
    .string()
    .describe(
      "Short, factual headline for the emergency appeal page. 8–14 words. UK English. No emojis in the headline itself."
    ),
  subheadline: z
    .string()
    .describe(
      "One-sentence subheadline expanding on the headline. 15–25 words. Sets the stakes for the donor."
    ),
  body: z
    .string()
    .describe(
      "Body copy for the appeal page. 80–150 words. Factual, dignified, never exploitative. Names the affected geography, the immediate need, and what Deen Relief is doing. Mentions field-team presence where relevant. UK English. No emojis."
    ),
  donation_tiers: z
    .array(
      z.object({
        amount_gbp: z
          .number()
          .int()
          .describe("Suggested donation amount in pounds sterling"),
        description: z
          .string()
          .describe(
            "What this amount achieves. Concrete and specific (e.g. 'two weeks of food for a family of 4'). One sentence."
          ),
      })
    )
    .length(4)
    .describe(
      "Exactly 4 suggested donation tiers, ascending. Cover £25 / £50 / £100 / £250 roughly. Each tier ties to a tangible intervention appropriate to the event type."
    ),
  verified_facts: z
    .array(
      z.object({
        fact: z.string().describe("One concrete factual claim about the event"),
        source: z
          .string()
          .describe(
            "Source name or URL — GDACS, USGS, ReliefWeb, etc. Don't fabricate; only cite sources from the event payload."
          ),
      })
    )
    .min(2)
    .max(5)
    .describe(
      "2–5 verified facts the SMM can quote with confidence. Drawn from the event payload's raw data — don't invent figures."
    ),
  field_operations_note: z
    .string()
    .describe(
      "1–2 sentences mapping Deen Relief's existing field-team presence to this event. If DR has no field team in the affected region, say so plainly — the SMM can decide whether to launch."
    ),
  social_posts: z.object({
    instagram: z.object({
      caption: z
        .string()
        .describe(
          "Instagram feed caption. 60–120 words. Deen Relief voice: warm, conversational UK English, first-person plural ('our team', 'we'). NO inline URL (Instagram suppresses link-in-caption posts) — end with 'Visit our website (link in bio) to donate' or similar. End with the 🤍 emoji as the closing flourish."
        ),
      hashtags: z
        .array(z.string())
        .min(4)
        .max(6)
        .describe(
          "4–6 hashtags. Mix of campaign-specific (e.g. #qurbani #qurbani2026), sector (#charity #muslimcharity), and location (#brighton). Each without the # prefix — we'll add it on render."
        ),
    }),
    tiktok: z.object({
      voiceover_script: z
        .string()
        .describe(
          "30-second voiceover script for a vertical Reel/TikTok. Conversational, urgent but dignified. Mentions the deenrelief.org URL spoken aloud (NOT 'link in bio')."
        ),
      on_screen_text: z
        .array(z.string())
        .min(2)
        .max(4)
        .describe(
          "2–4 short on-screen text overlays that punctuate the video. Bold, declarative. Max ~8 words each."
        ),
      caption: z
        .string()
        .describe(
          "Short TikTok caption — 50 words max. More direct than Instagram. UK English."
        ),
      hashtags: z
        .array(z.string())
        .min(4)
        .max(6)
        .describe("4–6 hashtags without # prefix"),
    }),
    x: z
      .string()
      .max(270)
      .describe(
        "Tweet/X post — strictly under 270 characters to leave room for a quoted URL. UK English. Can include the deenrelief.org URL directly (X doesn't penalise external links the way Instagram does)."
      ),
    threads: z
      .string()
      .max(500)
      .describe(
        "Threads post — longer than X but shorter than IG. Conversational. Can include URL."
      ),
    whatsapp_channel: z
      .string()
      .describe(
        "WhatsApp Channel broadcast. Less polished, more direct ('Salaam — Bangladesh floods…'). Can include the deenrelief.org link directly (WhatsApp Channels don't suppress links). 80 words max. Ends with 🤍."
      ),
  }),
  email: z.object({
    subject_lines: z
      .array(z.string())
      .length(3)
      .describe(
        "Exactly 3 candidate email subject lines for A/B testing. Each under 60 chars. Mix one urgency-led, one human-led, one factual."
      ),
    body: z
      .string()
      .describe(
        "Email body in Deen Relief voice. 150–250 words. Opens with the situation, narrows to what donations enable, closes with a clear CTA to the campaign page. No 'Dear Valued Donor' boilerplate."
      ),
  }),
  press_release: z
    .string()
    .describe(
      "Press release for UK Muslim media outlets (5Pillars, Hyphen, Islam Channel, local imam networks). 200–300 words. Includes: dateline, situation summary, Deen Relief's response, a quote from 'Shabek Ali, founder of Deen Relief' (a generic but on-brand quote — the SMM can polish), and a boilerplate paragraph about DR (Charity No. 1158608)."
    ),
});

export type LaunchPacket = z.infer<typeof LaunchPacketSchema>;

// ─── The brand voice spec (cached prefix) ───────────────────────────────

/**
 * System prompt — locked-in Deen Relief brand voice, sourced from the
 * live audit of @deenrelief's Instagram / TikTok / Facebook. Treated as
 * a cached prefix (prompt caching) since it's stable across every
 * launch packet generation; the variable per-event content goes after.
 *
 * Kept verbose on purpose: an Opus-4.7-class model produces noticeably
 * more on-brand copy when the brand rules are given with worked examples
 * + negative examples than when they're left implicit.
 */
const BRAND_VOICE_SYSTEM = `You are the in-house copywriter for Deen Relief, a UK-registered Islamic humanitarian charity (Charity No. 1158608), founded in 2013, based in Brighton with field operations in Bangladesh, Syria, Pakistan, India, and Gaza/Palestine.

Your job is to draft on-brand launch packets for emergency humanitarian appeals. Every word must feel like it came from Deen Relief — not from a generic NGO press office, not from a corporate brand voice, not from an AI.

──────────────────────────────────────────────────────────────────────
BRAND VOICE — the rules, with worked examples
──────────────────────────────────────────────────────────────────────

VOICE
  • Tone: warm, conversational, accessible UK English. Never formal-press-release register.
  • Person: first-person plural — "our team", "everyone at Deen Relief", "we have been on the ground since 2013".
  • Length: short, scannable. 2–3 paragraphs in body copy, never one wall of text.
  • Islamic phrasing: SPARING and AUTHENTIC.
       ✓ Festival moments only: "May Allah bless you and accept your charity, Ameen"
       ✓ Closing sign-off: "Jazakallahu khairan" (rare, festival emails)
       ✗ DO NOT pepper every post with "In sha' Allah", "Bismillah", "Alhamdulillah".
       ✗ DO NOT start posts with Arabic phrases — start with the situation.
  • Closing emoji: 🤍 (white heart) as a quiet sign-off. NOT mid-caption. NOT every sentence.
  • Geography signal: country flag emojis 🇧🇩 🇵🇰 🇸🇾 🇵🇸 🇮🇳 🇬🇧 — pair with the country name, used to signal location not as decoration.

ACTUAL VOICE EXAMPLES (sampled from @deenrelief on Instagram, used verbatim as anchors):

  Example A — Brighton Reel:
    "Every week since 2013, our team of volunteers has been out come rain or shine to deliver essential food and other supplies to those in Brighton who are homeless or struggling financially. If you see us on the seafront, please come and say hi! And if you are interested in our work, visit deenrelief.org for more information on our various campaigns 🤍"

  Example B — Qurbani campaign:
    "Deen relief is helping feed families in need this Eid Al Adha with your Qurbani donations. Visit our website (link in bio) to donate. Options to support families in Bangladesh, Pakistan, Syria and India 🇧🇩 🇮🇳"

  Example C — Eid Mubarak post:
    "Eid Mubarak from everyone at Deen Relief, and a huge thank you to everyone who donated to this years Qurbani campaign. May Allah bless you and accept your charity, Ameen."

  Notice what these have in common: plain English, no formal opening, no jargon, donor named as "everyone who donated" not "valued supporters", concrete geography, ONE 🤍 at the end (or none, when the post itself is the gesture).

──────────────────────────────────────────────────────────────────────
WRITING RULES
──────────────────────────────────────────────────────────────────────

DO
  • Lead with the situation — what's happening, where, who's affected.
  • Name field-team presence where it's true (e.g. "our Sylhet team is already on the ground").
  • Use concrete numbers from the verified facts — never invent figures.
  • Treat beneficiaries with dignity. Children and displaced families are not props.
  • UK English spelling: organise, behaviour, programme, neighbour.

DON'T
  • No corporate hashbrowns: "leveraging", "stakeholders", "impactful", "make a difference".
  • No urgency theatre: "URGENT URGENT URGENT", "TIME IS RUNNING OUT", "ACT NOW".
  • No exploitative imagery cues: "starving child", "tears", "desperate".
  • No fundraising thermometers, percentages, or "we need to raise £X" pressure.
  • No stock-photo description fillers ("a beautiful young child smiles…").
  • No NGO-speak: "beneficiaries", "stakeholders", "capacity-building", "interventions".
  • DON'T fabricate facts. If you don't have a number, don't include one.
  • DON'T put external URLs in Instagram captions (Instagram suppresses them) — say "link in bio".
  • DON'T overuse Islamic phrases. One 🤍 at the end of a post is plenty.

──────────────────────────────────────────────────────────────────────
PLATFORM RULES
──────────────────────────────────────────────────────────────────────

INSTAGRAM
  • 60–120 words.
  • CTA: "Visit our website (link in bio) to donate" — never an inline URL.
  • End with 🤍.
  • 4–6 hashtags AFTER the caption text. Mix campaign + sector + location.

TIKTOK
  • Voiceover script: spoken aloud — 30 seconds = ~75–80 words.
  • On-screen text: declarative, ALL CAPS or sentence-case, NEVER more than 8 words per overlay.
  • CTA: spoken aloud — "go to deenrelief dot org" — listeners can't tap "link in bio".
  • Caption is shorter than IG, more direct.

X (TWITTER)
  • Under 270 characters (leaves room for URL).
  • Direct URL is fine — X doesn't penalise links the way Instagram does.

THREADS
  • Slightly longer than X, more conversational. Up to ~500 chars.

WHATSAPP CHANNEL
  • Most informal. Opens with "Salaam — " or similar.
  • Direct URL is fine (WhatsApp Channels don't suppress links).
  • Up to 80 words. End with 🤍.

EMAIL
  • Subject line: under 60 chars. Make 3 options for A/B testing.
       - One urgency-led ("Bangladesh floods — your help needed")
       - One human-led ("From our team in Sylhet")
       - One factual ("Magnitude 6.5 earthquake in [region] — Deen Relief response")
  • Body: 150–250 words. No "Dear Valued Supporter" — open with the situation.

PRESS RELEASE
  • For UK Muslim media outlets (5Pillars, Hyphen, Islam Channel, mosque newsletters).
  • 200–300 words.
  • Includes: dateline, situation, response, on-record quote from "Shabek Ali, founder of Deen Relief", boilerplate paragraph (Charity No. 1158608, founded 2013, field operations in [countries]).
  • Tone: factual, journalistic — slightly more formal than social posts, but still recognisable as Deen Relief.

──────────────────────────────────────────────────────────────────────
TASK
──────────────────────────────────────────────────────────────────────

You will be given:
  • A detected emergency event (title, type, geography, raw data from GDACS / USGS / ReliefWeb)
  • Deen Relief's matched campaign coverage (which campaigns can respond to this event)
  • The DR Priority Score (so you know how urgent this is)

Generate a complete launch packet in the structured format defined by the response schema. Every field must be on-brand by the rules above.

If you don't have enough information to fill a field truthfully (e.g. you don't know the exact death toll, or DR has no field team in the region), say so plainly in the field rather than inventing numbers. The SMM will polish; you provide the on-brand starting point.`;

// ─── Generator function ────────────────────────────────────────────────

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (_client) return _client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to .env.local and Vercel Environment Variables."
    );
  }
  _client = new Anthropic({ apiKey });
  return _client;
}

export interface GenerateLaunchPacketInput {
  event: EmergencyEvent;
  matchedCoverage: CoverageEntry[];
  /** Raw payload from the signal source (preserved on emergency_events.raw_payload). */
  rawPayload?: unknown;
}

export interface GenerateLaunchPacketResult {
  packet: LaunchPacket;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

/**
 * Build the per-event user message — variable content that comes AFTER
 * the cached system prefix. Kept compact: only the facts the model needs.
 */
function buildEventBrief(input: GenerateLaunchPacketInput): string {
  const { event, matchedCoverage, rawPayload } = input;

  const campaignLines = matchedCoverage
    .map((c) => {
      const label = isValidCampaign(c.campaignSlug)
        ? CAMPAIGNS[c.campaignSlug as CampaignSlug]
        : c.campaignSlug;
      const path = isValidCampaign(c.campaignSlug)
        ? CAMPAIGN_LANDING_PATHS[c.campaignSlug as CampaignSlug]
        : "/donate";
      const readiness = c.launchReadiness ?? "—";
      return `  • ${label} (weight ${c.weight}, ${readiness}) → ${path}`;
    })
    .join("\n");

  // Compact JSON sample of the raw payload — drop nothing-but-noise fields.
  // 2KB cap so the prompt stays small.
  let rawPayloadSummary = "";
  if (rawPayload) {
    try {
      rawPayloadSummary = JSON.stringify(rawPayload, null, 2);
      if (rawPayloadSummary.length > 2000) {
        rawPayloadSummary = rawPayloadSummary.slice(0, 2000) + "\n…(truncated)";
      }
    } catch {
      rawPayloadSummary = "(unserialisable)";
    }
  }

  return `EMERGENCY EVENT — DRAFT A LAUNCH PACKET

  Title:       ${event.title}
  Source:      ${event.source}
  Event type:  ${event.eventType ?? "(unknown)"}
  Country:     ${event.countryIso ?? "(unknown)"}
  Region:      ${event.region ?? "(unknown)"}
  Severity:    ${event.severityRaw ?? "(unknown)"} (raw)
  DR priority: ${event.drPriorityScore?.toFixed(1) ?? "(unscored)"}
  Detected:    ${event.detectedAt.toISOString()}
  Source URL:  ${event.sourceUrl ?? "(none)"}

  Summary from source:
  ${event.summary ? event.summary.slice(0, 800) : "(no summary supplied — work from the title only)"}

DEEN RELIEF MATCHED CAMPAIGNS (ranked by coverage weight, top is the
strongest recommendation):

${campaignLines || "  • (no matched campaigns — Deen Relief has no specific coverage for this geography)"}

RAW SOURCE PAYLOAD (for verified facts — never invent numbers not present here):
\`\`\`json
${rawPayloadSummary}
\`\`\`

Generate the launch packet now in the structured format. Be specific,
on-brand, and dignified.`;
}

export async function generateLaunchPacket(
  input: GenerateLaunchPacketInput
): Promise<GenerateLaunchPacketResult> {
  const client = getClient();
  const brief = buildEventBrief(input);

  // messages.parse() runs the request, validates the structured response
  // against the schema, and returns a typed object. The brand voice
  // system prompt is cached via cache_control so each subsequent packet
  // generation only pays for the variable brief + the output tokens.
  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 8000,
    output_config: {
      format: zodOutputFormat(LaunchPacketSchema),
      effort: "high",
    },
    system: [
      {
        type: "text",
        text: BRAND_VOICE_SYSTEM,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: brief }],
  });

  if (!response.parsed_output) {
    throw new Error(
      `Launch packet generation produced no parsed output (stop_reason: ${response.stop_reason}).`
    );
  }

  return {
    packet: response.parsed_output,
    model: response.model,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}
