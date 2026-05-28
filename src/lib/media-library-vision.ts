/**
 * Claude Vision tag suggester for the media library.
 *
 * When the SMM uploads an image, we call Claude Opus 4.7 with the
 * image as a vision input and a Zod-structured schema asking for
 * suggested metadata. The SMM reviews + edits in the upload form
 * before saving — we never persist AI suggestions silently.
 *
 * Cost: roughly £0.02 per upload (one image, ~1k input tokens with
 * vision, ~200 output tokens). One-time per asset; cheap.
 *
 * Why Claude (not OpenAI Vision / Google Vision):
 *   • Already in our SDK + we know the prompt-caching pattern
 *   • Structured output via Zod gives us a type-safe response
 *   • Same brand-voice context can be shared as a cached prefix
 *     across calls (the safeguarding rules in particular)
 */

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { CAMPAIGNS, type CampaignSlug } from "./campaigns";
import { MEDIA_TONES, MEDIA_USE_CASES } from "./media-library";

const MODEL = "claude-opus-4-7";

// ─── Suggestion schema ─────────────────────────────────────────────

export const MediaTagSuggestionsSchema = z.object({
  caption: z
    .string()
    .max(140)
    .describe(
      "One-line description of what the image shows. Dignified, factual, UK English. e.g. 'Deen Relief volunteers distributing food at Brighton seafront'. No emojis."
    ),
  tags: z
    .array(z.string())
    .min(3)
    .max(10)
    .describe(
      "3–10 lowercase free-text descriptive tags. Mix subject (volunteers, children, water-pump), location-hint (rural, urban, mosque), and mood (calm, busy)."
    ),
  campaign_slugs: z
    .array(z.string())
    .max(3)
    .describe(
      `Which DR campaigns this image suits. Choose from: ${Object.keys(CAMPAIGNS).join(", ")}. Empty array if generic / unclear.`
    ),
  country_iso: z
    .string()
    .nullable()
    .describe(
      "ISO 3166-1 alpha-2 country code if discernible (BD, PK, SY, PS, IN, GB, AF, YE, SD, SO, MM, TR, LB, EG, ID). null if not identifiable from the image."
    ),
  event_types: z
    .array(z.string())
    .max(3)
    .describe(
      "Event types this image suits — earthquake, flood, conflict, drought, cyclone, displacement, ramadan, qurbani, daily-operations, food-distribution, water-access, healthcare, education. Empty array if not event-specific."
    ),
  tone: z
    .enum([...MEDIA_TONES] as [string, ...string[]])
    .describe(
      `Dominant emotional register. dignified = neutral documentary; emergency = urgent crisis context; hopeful = positive forward-looking; gratitude = thank-you / appreciation; festival = Eid / Ramadan / celebration; documentary = matter-of-fact reportage.`
    ),
  use_cases: z
    .array(z.enum([...MEDIA_USE_CASES] as [string, ...string[]]))
    .max(4)
    .describe(
      `Slide-readiness hints. emergency-hero = strong full-bleed background for crisis appeals; response-illustration = supports a "we're doing X" slide; tier-illustration = pairs with a donation amount; gratitude = thank-you posts; festival = Eid/Ramadan posts; team-coverage = shows DR team in action; beneficiary-portrait = identifiable subject. Add 'consent-on-file' ONLY if you're certain DR has signed consent for an identifiable minor.`
    ),
  people_visible: z
    .boolean()
    .describe(
      "True if any human figures are recognisable in the shot. False if landscape, supplies, infrastructure, or backs-of-heads only."
    ),
  identifiable_minors: z
    .boolean()
    .describe(
      "True if children (under 18) are individually identifiable. False if minors are blurred, far away, or absent."
    ),
});

export type MediaTagSuggestions = z.infer<typeof MediaTagSuggestionsSchema>;

// ─── System prompt (cached prefix) ─────────────────────────────────

const TAGGER_SYSTEM = `You are the metadata tagger for Deen Relief's media library — a UK Islamic humanitarian charity (Charity No. 1158608) with field operations in Bangladesh, Syria, Pakistan, India, and Gaza/Palestine.

Your job: given an image, produce structured metadata so a launch-packet generator can later select the right image for emergency-appeal carousel slides.

RULES

  • Dignified accuracy. Describe what's actually in the image — never invent context that isn't visible.
  • Geography: only set country_iso if the image clearly identifies a country (signage, geography, distinctive landscape, or context cues). Otherwise null.
  • Safeguarding: identifiable_minors is true if you can see a child's face clearly. people_visible is true even for adults. Be conservative — false positives are safer than false negatives.
  • DO NOT speculate or moralise. Just describe.
  • UK English. No emojis. No religious phrases in captions.

CAMPAIGN ASSOCIATIONS — only suggest these when the image plausibly fits:

  • palestine: any Palestine/Gaza imagery, Palestinian flag, named locations
  • orphan-sponsorship: children in sponsored-child contexts, schools, family imagery (only when consent assumed)
  • cancer-care: Syrian children with cancer, hospital settings, medical
  • build-a-school: classroom builds, students in schools DR has built
  • clean-water: water pumps, wells, water distribution
  • uk-homeless: Brighton seafront, food parcels, UK street scenes
  • zakat / sadaqah: generally applicable — don't over-attach
  • qurbani: livestock, Eid Al-Adha imagery (only during the season)

USE-CASE HINTS — drive slide selection downstream:

  • emergency-hero: strong full-bleed photo suitable as a slide background under typography (clear sight-lines, no busy centre)
  • response-illustration: shows DR doing the work — volunteers, deliveries, action
  • tier-illustration: small/medium-scale subject suitable next to a donation tier
  • gratitude: thank-you / aftermath / smiling-recipient (with consent)
  • festival: Eid / Ramadan / celebration scenes
  • team-coverage: DR staff visible (Shabek, volunteers in DR T-shirts)
  • beneficiary-portrait: identifiable individual subject

TONE — one keyword that captures the dominant register:

  • dignified — calm, documentary, neutral
  • emergency — urgent, crisis context, aftermath
  • hopeful — recovery, smiles, forward motion
  • gratitude — thank-you, recognition
  • festival — Eid / Ramadan / celebration
  • documentary — matter-of-fact reportage

Return your structured response now.`;

// ─── Generator ─────────────────────────────────────────────────────

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (_client) return _client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set.");
  _client = new Anthropic({ apiKey });
  return _client;
}

export interface SuggestTagsInput {
  /** Public URL of the uploaded image (Supabase Storage URL). */
  imageUrl: string;
}

export interface SuggestTagsResult {
  suggestions: MediaTagSuggestions;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

export async function suggestMediaTags(
  input: SuggestTagsInput
): Promise<SuggestTagsResult> {
  const client = getClient();

  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 2000,
    output_config: {
      format: zodOutputFormat(MediaTagSuggestionsSchema),
      effort: "high",
    },
    system: [
      {
        type: "text",
        text: TAGGER_SYSTEM,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "url", url: input.imageUrl },
          },
          {
            type: "text",
            text: "Tag this image for the media library.",
          },
        ],
      },
    ],
  });

  if (!response.parsed_output) {
    throw new Error(
      `Tag suggestion produced no parsed output (stop_reason: ${response.stop_reason}).`
    );
  }

  // Validate suggested campaign slugs against the live registry —
  // Claude can confabulate slugs. Drop any that aren't real.
  const validCampaigns = response.parsed_output.campaign_slugs.filter((c) =>
    Object.keys(CAMPAIGNS).includes(c)
  ) as CampaignSlug[];

  return {
    suggestions: {
      ...response.parsed_output,
      campaign_slugs: validCampaigns,
    },
    model: response.model,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}
