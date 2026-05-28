/**
 * First Response launch packet generator.
 *
 * Given a detected emergency event, calls Claude (Opus 4.7) to draft a
 * complete launch packet — internal banner headline, donation tiers,
 * verified facts, a single unified social post (IG/FB/X), 5 visual
 * carousel slides, email subject lines + body, and a press release. The
 * SMM reviews + edits before publishing; this just provides the on-brand
 * starting point.
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
import {
  getCandidateMediaForEvent,
  type MediaItem,
} from "./media-library";

const MODEL = "claude-opus-4-7";

// ─── Zod schema (=== TypeScript type) ──────────────────────────────────

export const LaunchPacketSchema = z.object({
  headline: z
    .string()
    .describe(
      "Short, factual headline. 8–14 words, UK English, no emojis. Used INTERNALLY as the site-banner message and push-notification title when the SMM clicks 'Launch appeal' — never displayed as standalone section. Should be tight and stand-alone (a donor seeing only this in the banner needs to understand the situation)."
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
  social_post: z.object({
    // One caption that works identically on Instagram, Facebook, and X.
    // X's 280-char ceiling is the binding constraint; IG and FB tolerate
    // anything shorter. No inline URL — ends with "Link in bio to
    // donate" so it's IG-safe.
    //
    // No .max() constraint: LLMs can't reliably count characters, and
    // a hard cap here causes the whole structured-output parse to
    // fail when Claude goes 5-10 chars over. We do graceful post-hoc
    // truncation in code (truncateCaptionForX below) — safer than
    // failing the entire packet generation.
    caption: z
      .string()
      .describe(
        "ONE caption used identically across Instagram, Facebook, and X. Target ~240 characters, MUST be readable on X (280-char limit) — we'll truncate gracefully if you go over but aim short. Warm Deen Relief voice in UK English. NO inline URL (Instagram suppresses links). End with 'Link in bio to donate 🤍' or close variant. Lead with the situation, name the geography, mention the matched campaign loosely (e.g. 'our partners are deploying support'). The 🤍 sign-off is the closing flourish."
      ),
    hashtags: z
      .array(z.string())
      .min(4)
      .max(6)
      .describe(
        "4–6 hashtags appended below the caption. Mix campaign-specific (e.g. emergency-response, palestine), sector (charity, muslimcharity), and location (uk, brighton). NO # prefix — we add it on render."
      ),
  }),
  // ─── Visual carousel — 5 slides, 1080×1080 each ──────────────────
  // The packet renderer generates these as actual PNG images via Satori
  // (Open Graph image generation). SMM uploads to IG/FB carousel with no
  // editing — pure typography, brand-styled, cream + charcoal palette.
  carousel_slides: z
    .array(
      z.object({
        layout: z
          .enum(["hero", "fact", "response", "tiers", "cta"])
          .describe(
            "Slide template to render. EXACT order required: slide 1 = 'hero', slide 2 = 'fact', slide 3 = 'response', slide 4 = 'tiers', slide 5 = 'cta'."
          ),
        eyebrow: z
          .string()
          .max(40)
          .nullable()
          .describe(
            "Small uppercase tag at the top of the slide. e.g. 'EMERGENCY APPEAL · 28 MAY 2026' for hero, 'THE FACTS' for fact, 'OUR RESPONSE' for response, 'HOW YOUR GIFT HELPS' for tiers, null for cta."
          ),
        title: z
          .string()
          .describe(
            "Main typographic line — large serif, 1–2 lines on screen. For hero: a 4–8 word headline drawn from the page headline. For fact: a single hard fact stated as one short line (e.g. 'M5.1 earthquake — West Timor'). For response: DR's action stated plainly. For tiers: 'How your gift helps' or similar. For cta: 'Donate now'."
          ),
        body: z
          .string()
          .nullable()
          .describe(
            "Supporting line beneath the title. 1 short sentence (≤120 chars), or null when the slide is title-only. For tiers slide use null here — the tier lines live in tier_lines."
          ),
        tier_lines: z
          .array(
            z.object({
              amount_gbp: z.number().int().describe("Amount in pounds"),
              short_description: z
                .string()
                .max(80)
                .describe(
                  "One short line — e.g. 'A week of emergency food for a family'. Stays on ONE display line at slide scale."
                ),
            })
          )
          .nullable()
          .describe(
            "Only used by the 'tiers' slide — exactly 3 ascending tiers (a tight subset of the 4 donation_tiers). null for every other slide."
          ),
        source_attribution: z
          .string()
          .max(60)
          .nullable()
          .describe(
            "Small italic source line at the bottom — used by the 'fact' slide (e.g. 'Source: USGS'). null elsewhere."
          ),
        media_id: z
          .string()
          .nullable()
          .describe(
            "ID of a media_library item to render as the slide's photo background (full-bleed, dark green gradient overlay underneath the typography). MUST be picked from the CANDIDATE MEDIA list in the prompt — never invent IDs. Selection rules: (1) For 'hero' and 'response' layouts: USE A CANDIDATE if the list contains ANY photo matching the event's country, event_type, or campaign — typography-only is a last resort, only when the list is empty or every candidate is plainly irrelevant. Don't set null just because the candidates aren't perfectly tagged; pick the best available match. Prefer candidates with use_cases including 'emergency-hero' (hero slide) or 'response-illustration'/'team-coverage' (response slide), but use ANY relevant photo if those aren't tagged. (2) For 'fact', 'tiers', 'cta' layouts: ALWAYS null — typography-only by design."
          ),
      })
    )
    .length(5)
    .describe(
      "Exactly 5 slides in fixed order: hero, fact, response, tiers, cta. The renderer pairs each with its template — DO NOT reorder or omit slides."
    ),
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
SOCIAL POST RULES — single post for Instagram + Facebook + X
──────────────────────────────────────────────────────────────────────

You write ONE caption (the social_post.caption field) used identically
on all three platforms. The constraint is X's 280-char hard limit; IG
and FB tolerate anything shorter. Hashtags go AFTER the caption.

  • HARD LIMIT 280 characters in the caption itself. The validator
    REJECTS captions over 280 chars and the entire packet generation
    FAILS — so aim for ~240 chars to leave a safety margin.
  • Lead with the SITUATION — what's happening, where, who's affected.
  • UK English. Warm but factual. First-person plural ("our team").
  • NO inline URL — Instagram suppresses link-in-caption posts. Always
    "Link in bio to donate" (works for IG, reads natural on FB and X).
  • Close with 🤍 — once, at the end.
  • Hashtags: 4–6, no # prefix in your output, lowercase.
  • DON'T mention TikTok, Threads, or WhatsApp formats — those are
    dropped from the packet.

──────────────────────────────────────────────────────────────────────
CAROUSEL SLIDE RULES — 5 slides, fixed order
──────────────────────────────────────────────────────────────────────

The carousel renders as 5 typography-driven 1080×1080 PNG images, posted
as an Instagram/Facebook carousel. Each slide has a layout, eyebrow,
title, optional body, and (depending on layout) tier_lines or
source_attribution.

  SLIDE 1 — layout: "hero"
    • eyebrow: "EMERGENCY APPEAL · {DD MMM YYYY}" (uppercase, with the
      detected date in long-form). If "EMERGENCY APPEAL" doesn't fit
      the event tone, use a kinder label like "URGENT NEED".
    • title: 4–8 word headline (echoes the page headline but tighter)
    • body: ONE short sentence (≤100 chars) naming geography + stake.
    • tier_lines, source_attribution: null

  SLIDE 2 — layout: "fact"
    • eyebrow: "THE FACTS"
    • title: One hard verifiable fact stated tightly. e.g.
      "M5.1 earthquake — West Timor" or "2,000+ families displaced".
      Drawn from verified_facts. No invented numbers.
    • body: One supporting context sentence (≤120 chars).
    • source_attribution: "Source: USGS" / "Source: ReliefWeb" / etc.
      Match the actual signal source.
    • tier_lines: null

  SLIDE 3 — layout: "response"
    • eyebrow: "OUR RESPONSE"
    • title: One short sentence on what DR is doing. e.g.
      "Our Sylhet team is delivering emergency food and shelter."
      If DR has NO field presence in this region, say so plainly:
      "We are coordinating with local partners on the ground."
    • body: One short sentence on the immediate next step or scale.
    • tier_lines, source_attribution: null

  SLIDE 4 — layout: "tiers"
    • eyebrow: "HOW YOUR GIFT HELPS"
    • title: "Every gift counts" (or similar 3-word reassurance)
    • body: null
    • tier_lines: EXACTLY 3 tiers ascending — typically £25 / £50 / £100
      (a subset of the 4 donation_tiers). short_description ≤80 chars,
      readable on ONE display line.
    • source_attribution: null

  SLIDE 5 — layout: "cta"
    • eyebrow: null
    • title: "Donate now" (or close variant)
    • body: "Link in bio · deenrelief.org" (the URL is visible here for
      Facebook/X; Instagram users tap the bio link)
    • tier_lines, source_attribution: null

Writing rules for slide text:
  • Single-line titles where possible — they wrap at slide scale.
  • No emojis on slides (renderer doesn't render colour emoji reliably).
  • The 🤍 lives in the caption text, NOT on slides.
  • Each slide stands alone — a donor seeing only slide 4 should still
    understand what to do.

──────────────────────────────────────────────────────────────────────
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
 *
 * Candidate media: a pre-queried shortlist of media_library items
 * relevant to this event's geography/type/campaigns. Passed as text
 * metadata (id + caption + tags + use_cases). Claude returns chosen
 * IDs in the slides' media_id fields. We never ship image pixels to
 * Claude — that'd be ~£0.05/image; metadata-only selection is ~free.
 */
function buildEventBrief(
  input: GenerateLaunchPacketInput,
  candidateMedia: MediaItem[]
): string {
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

  // Candidate media list — passed as compact text. Each row gives
  // Claude enough metadata to pick which slide each image fits, by ID.
  const candidateMediaLines =
    candidateMedia.length === 0
      ? "  • (no matching media in the library — set every slide's media_id to null)"
      : candidateMedia
          .map((m) => {
            const bits = [
              `id=${m.id}`,
              m.caption ? `caption="${m.caption}"` : null,
              m.countryIso ? `country=${m.countryIso}` : null,
              m.eventTypes.length ? `events=${m.eventTypes.join(",")}` : null,
              m.tone ? `tone=${m.tone}` : null,
              m.useCases.length ? `use=${m.useCases.join(",")}` : null,
              m.tags.length ? `tags=${m.tags.slice(0, 5).join(",")}` : null,
            ]
              .filter(Boolean)
              .join(" · ");
            return `  • ${bits}`;
          })
          .join("\n");

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

CANDIDATE MEDIA from DR's library (PICK media_id BY ID FROM THIS LIST
ONLY — never invent IDs. ONLY use 'hero' and 'response' slides; for
'fact', 'tiers', 'cta' always set media_id to null):

${candidateMediaLines}

RAW SOURCE PAYLOAD (for verified facts — never invent numbers not present here):
\`\`\`json
${rawPayloadSummary}
\`\`\`

Generate the launch packet now in the structured format. Be specific,
on-brand, and dignified.`;
}

/**
 * Wrap messages.parse() with a single retry on validation failure.
 *
 * Claude occasionally returns a field a few characters over the
 * schema's max (most commonly the social_post.caption — counting
 * unicode/emoji is fuzzy in practice). The Anthropic SDK throws on
 * structured-output validation failures with a message containing
 * the path + constraint. We catch that, surface the exact violation
 * back to Claude in a follow-up turn, and let it try once more.
 *
 * One retry is enough in 99% of cases. Two failed attempts surfaces
 * the error to the caller — the SMM sees a useful message rather
 * than the system silently swallowing it.
 */
/**
 * Truncate a caption to X's 280-char limit, gracefully — prefer a
 * sentence boundary, then a word boundary, only break mid-word as a
 * last resort. Appends '…' if truncation happened so it's visually
 * obvious the SMM should review.
 *
 * Why this rather than a Zod .max(): structured-output validation
 * fails the entire packet generation when a string is over-cap, and
 * LLMs can't reliably count characters. Better to accept whatever
 * Claude produces and clean up here.
 */
function truncateCaptionForX(caption: string): string {
  const LIMIT = 280;
  if (caption.length <= LIMIT) return caption;

  console.warn(
    `[first-response-packet] caption ${caption.length} chars > ${LIMIT}, truncating gracefully`
  );

  // Reserve 1 char for the ellipsis.
  const cap = LIMIT - 1;
  const head = caption.slice(0, cap);

  // Try sentence-boundary truncation: find the last sentence-ender
  // in the candidate region. Scan from the end backwards.
  const sentenceEnders = [".", "!", "?"];
  let bestSentenceCut = -1;
  for (let i = head.length - 1; i >= LIMIT * 0.6; i -= 1) {
    if (sentenceEnders.includes(head[i] ?? "")) {
      // Followed by space, end of string, or another punctuation —
      // that's a real sentence boundary, not a decimal or abbreviation.
      const next = head[i + 1] ?? "";
      if (next === "" || next === " " || next === "\n") {
        bestSentenceCut = i + 1;
        break;
      }
    }
  }
  if (bestSentenceCut > 0) {
    return head.slice(0, bestSentenceCut).trimEnd() + "…";
  }

  // Otherwise try word-boundary: cut at the last space before the cap.
  const lastSpace = head.lastIndexOf(" ");
  if (lastSpace > LIMIT * 0.6) {
    return head.slice(0, lastSpace).trimEnd() + "…";
  }
  // Last resort: hard cut.
  return head.trimEnd() + "…";
}

async function generateWithRetry(client: Anthropic, brief: string) {
  const sharedRequest = {
    model: MODEL,
    max_tokens: 8000,
    output_config: {
      format: zodOutputFormat(LaunchPacketSchema),
      effort: "high" as const,
    },
    system: [
      {
        type: "text" as const,
        text: BRAND_VOICE_SYSTEM,
        cache_control: { type: "ephemeral" as const },
      },
    ],
  };

  try {
    return await client.messages.parse({
      ...sharedRequest,
      messages: [{ role: "user", content: brief }],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Only retry on validation errors — network / 5xx / rate limit
    // should bubble up. Validation errors contain "Failed to parse
    // structured output" or "Too big" / "Too small" from Zod.
    if (
      !message.includes("Failed to parse structured output") &&
      !message.includes("Too big") &&
      !message.includes("Too small") &&
      !message.includes("Invalid")
    ) {
      throw err;
    }
    console.warn(
      "[first-response-packet] validation failed, retrying once with correction hint:",
      message.slice(0, 200)
    );
    const correction = `Your previous attempt failed structured-output validation with this error:

${message}

Try again. Pay special attention to character limits — the caption MUST be 280 characters or fewer, and aim for ~240 to leave safety margin. Count carefully.`;
    return await client.messages.parse({
      ...sharedRequest,
      messages: [
        { role: "user", content: brief },
        { role: "user", content: correction },
      ],
    });
  }
}

export async function generateLaunchPacket(
  input: GenerateLaunchPacketInput
): Promise<GenerateLaunchPacketResult> {
  const client = getClient();

  // Pre-fetch candidate media before composing the prompt. Limited to
  // 12 candidates so the prompt stays compact; selection is metadata-
  // only (no vision tokens spent). Returns [] if the library is empty
  // — Claude then sets every media_id to null and slides render
  // typography-only (the Phase 4d aesthetic).
  const candidateMedia = await getCandidateMediaForEvent({
    countryIso: input.event.countryIso,
    eventType: input.event.eventType,
    campaignSlugs: input.matchedCoverage.map((c) => c.campaignSlug),
    limit: 12,
  });

  const brief = buildEventBrief(input, candidateMedia);

  // messages.parse() runs the request, validates the structured response
  // against the schema, and returns a typed object. The brand voice
  // system prompt is cached via cache_control so each subsequent packet
  // generation only pays for the variable brief + the output tokens.
  //
  // Auto-retry on validation failure: occasionally Claude returns a
  // caption a few chars over the limit (counting unicode + emoji is
  // fuzzy) and the Zod max() rejects it, failing the whole packet. We
  // catch that, append a precise correction message to the prompt, and
  // re-issue. One retry is enough to fix the vast majority of cases
  // without ballooning costs.
  const response = await generateWithRetry(client, brief);

  if (!response.parsed_output) {
    throw new Error(
      `Launch packet generation produced no parsed output (stop_reason: ${response.stop_reason}).`
    );
  }

  // Safety pass 1: ensure any media_id Claude picked actually exists
  // in our candidate set. Confabulated IDs would render as broken
  // images; forcing them to null lets the renderer fall back to
  // typography.
  const candidateIds = new Set(candidateMedia.map((m) => m.id));
  const sanitisedSlides = response.parsed_output.carousel_slides.map(
    (slide) => {
      if (!slide.media_id) return slide;
      if (candidateIds.has(slide.media_id)) return slide;
      console.warn(
        `[first-response-packet] Claude returned media_id=${slide.media_id} not in candidate set — coercing to null.`
      );
      return { ...slide, media_id: null };
    }
  );

  // Safety pass 2: cap the social post caption at 280 chars for X.
  // No .max() in the schema (would cause hard parse failures) — we
  // truncate gracefully here at a sentence/word boundary instead.
  const cappedCaption = truncateCaptionForX(
    response.parsed_output.social_post.caption
  );

  return {
    packet: {
      ...response.parsed_output,
      social_post: {
        ...response.parsed_output.social_post,
        caption: cappedCaption,
      },
      carousel_slides: sanitisedSlides,
    },
    model: response.model,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}
