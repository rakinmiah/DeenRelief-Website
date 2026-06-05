/**
 * Single-stage social content extraction (Phase 6b).
 *
 * Replaces the legacy 3-stage launch-packet generator
 * (src/lib/first-response-packet.ts) for the new deck-builder flow.
 *
 * THE PIVOT
 * ─────────
 * The legacy pipeline asked Claude to do everything — strategic brief,
 * full deck composition (slide_count, layout, media_id, logo_variant,
 * photo_composition, focal_point), then a critique pass — and shipped
 * a finished Satori PNG. Two problems:
 *
 *   1. Claude is a worse art director than a human SMM. The slide
 *      composition was the lowest-quality, highest-cost stage.
 *   2. The downstream UI now is a deck builder — the SMM picks
 *      templates, drops content cards into slots, picks images. The
 *      composition step belongs to her, not Claude.
 *
 * So this module shrinks Claude's job to what it's good at: reading
 * a raw event payload, mining the facts/quotes/sources verbatim, and
 * drafting MULTIPLE OPTIONS per content category in the Deen Relief
 * voice. The SMM consumes the output as drag-and-drop content cards
 * (see src/lib/social-templates/types.ts ContentCard kinds).
 *
 * KEY GUARANTEES
 * ──────────────
 * • NO FABRICATION. Quotes must come verbatim from raw_payload or be
 *   omitted entirely. Facts must include source attribution from
 *   raw_payload (OCHA / USGS / Met Office / ReliefWeb / etc).
 * • Title options vary in length + approach so the SMM has real
 *   editorial choices (3-5 word punchy beat, 5-8 word editorial beat,
 *   a possessive-opener variant, a date-led variant).
 * • Captions are platform-typed (instagram / facebook / x) — the X
 *   variant respects the 280-char limit, IG/FB get the longer form.
 *
 * COST + CACHING
 * ──────────────
 * Single client.messages.parse() call with effort: "high" and prompt
 * caching on the system prefix. Result is cached on
 * emergency_events.draft_content_blocks (jsonb) keyed by a SHA-256 of
 * raw_payload (see migration 030). Re-opening the compose page reads
 * cache; re-running extraction skips Claude unless raw_payload drifts.
 */

import { createHash } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

import type { EmergencyEvent } from "./first-response";
import {
  fetchCrisisContext,
  type EnrichmentSource,
} from "./first-response-enrichment";
import { getSupabaseAdmin } from "./supabase";

/**
 * Model choice: claude-sonnet-4-6.
 *
 * Phase 6b is a single-stage TEXT-ONLY extraction — no vision, no
 * slide composition, no art-direction judgement. Sonnet 4.6 is ~5x
 * cheaper than Opus 4.7 and produces equivalent output for structured
 * extraction tasks against a tight schema with explicit anti-
 * fabrication rules. If extraction quality drops in production, switch
 * the constant below to "claude-opus-4-7" — the rest of the module is
 * model-agnostic.
 */
const MODEL = "claude-sonnet-4-6";

// ─── Zod schema (=== TypeScript type) ──────────────────────────────────

/**
 * The exact contract Claude returns + the deck-builder UI consumes.
 *
 * Field-level rationale:
 *  • Multiple options on title/eyebrow/body — the SMM scans the
 *    cards and picks. Single-option output collapses choice and ends
 *    up generic.
 *  • `notes` on title_options — surfaces Claude's reasoning so the
 *    SMM understands the editorial intent (e.g. "newspaper beat",
 *    "sourced number", "possessive-opener variant").
 *  • `source` nullable on verified_facts — most should carry one;
 *    we allow null only when the raw_payload truly has no agency tag.
 *  • `attribution` REQUIRED on quotes (min 2 chars) — quotes without
 *    attribution are exactly what the no-fabrication rule prohibits.
 *  • `captions` keyed by platform, not array — IG vs FB vs X are
 *    distinct surfaces with distinct constraints.
 *  • `email` separated — subject lines + body live in the deck-builder
 *    side panel, not on the slide.
 */
export const ContentBlocksSchema = z.object({
  title_options: z
    .array(
      z.object({
        text: z.string().max(60),
        char_count: z.number().int(),
        notes: z
          .string()
          .nullable()
          .describe(
            "Why this title — e.g. 'newspaper beat', 'sourced number', 'possessive-opener variant', 'date-led'. Helps the SMM pick."
          ),
      })
    )
    .min(4)
    .max(8)
    .describe(
      "4–8 editorial title options. MUST vary in length and approach: at least one ≤ 5 words punchy beat, at least one 5–8 word editorial beat, and at least one possessive-opener variant ('YOUR…')."
    ),
  eyebrow_options: z
    .array(
      z.object({
        text: z.string().max(50),
      })
    )
    .min(2)
    .max(5)
    .describe(
      "2–5 eyebrow options. Small uppercase tags — date / location / section. e.g. 'BRIEFING · 28 MAY 2026', 'FROM SYLHET', 'BY THE NUMBERS'."
    ),
  body_options: z
    .array(
      z.object({
        text: z.string().max(250),
        char_count: z.number().int(),
      })
    )
    .min(4)
    .max(8)
    .describe(
      "4–8 supporting prose options — one to three sentences, ≤ 250 chars each. Each MUST contain a verbatim number, named location, agency, or dated event from raw_payload, and each MUST cover a DIFFERENT angle (don't restate the same figure twice). Generic 'communities are suffering' bodies are rejected."
    ),
  verified_facts: z
    .array(
      z.object({
        text: z.string().max(160),
        source: z
          .string()
          .nullable()
          .describe(
            "Source tag in 'AGENCY · DD MMM YYYY' format, e.g. 'OCHA · 25 May 2026'. null only when raw_payload genuinely has no source agency."
          ),
      })
    )
    .min(5)
    .max(12)
    .describe(
      "5–12 verified facts — DIG DEEP into raw_payload and surface as many DISTINCT data points as it genuinely supports. Each is ONE punchy line (≤ ~14 words, ≤ 160 chars) — a single hard beat, NOT a paragraph: lead with the figure and stop ('881 killed since the October ceasefire.'). Each MUST include a specific number, magnitude, coordinate, agency, or named institution drawn verbatim from raw_payload. CRITICAL — no two facts may restate the SAME figure or angle; span the different dimensions the source covers (casualties, injuries, displacement, access/siege, funding/appeal, children, health, infrastructure, food). These feed both Key-fact slides (the short fact IS the slide) and Stat slides (a giant figure pulled from the fact — so put the number first and keep it standalone). NO fabrication — if you don't have the number, don't write the fact."
    ),
  quotes: z
    .array(
      z.object({
        text: z.string().max(280),
        attribution: z
          .string()
          .min(2)
          .describe(
            "Who said it — full name + role when available, e.g. 'Dr. Mahmoud Abu Nujaila', 'Maryam Srour, MSF', 'Spokesperson, OCHA'."
          ),
      })
    )
    .min(0)
    .max(3)
    .describe(
      "0–3 attributed quotes EXTRACTED VERBATIM from raw_payload. If raw_payload contains no attributed quote, return an empty array. DO NOT invent dialogue."
    ),
  tier_lines: z
    .array(
      z.object({
        amount_gbp: z.number().int().positive(),
        short_description: z.string().max(80),
        long_description: z.string().max(200).nullable(),
      })
    )
    .min(2)
    .max(5)
    .describe(
      "2–5 donation tiers, ascending. Concrete impact descriptions — '14 days of rice, dahl and cooking oil for six people' beats 'a week of food'. Long descriptions are the expanded version surfaced on the tiers slide; null when the short line says it all."
    ),
  hashtags: z
    .array(z.string().max(40))
    .min(3)
    .max(8)
    .describe(
      "3–8 hashtags WITHOUT the # prefix (added on render). LEAD with movement / political tags when relevant (ceasefirenow, freepalestine, allEyesOnSudan). AT MOST one generic charity tag."
    ),
  captions: z
    .object({
      instagram: z
        .string()
        .max(2000)
        .describe(
          "Full IG caption — longform OK (IG tolerates up to 2200). Lead with the highest-priority opener available: verbatim quote → named voice → dated event → hard number. End with 'Link in bio to donate 🤍' or close variant. NO inline URLs (IG suppresses them)."
        ),
      facebook: z
        .string()
        .max(2000)
        .describe(
          "FB caption — usually identical to or slightly more verbose than IG. May include inline URL since FB renders links."
        ),
      x: z
        .string()
        .max(280)
        .describe(
          "X post — hard 280-char limit. Compress to the strongest single hook + a 'donate at deenrelief.org' or hashtag CTA. NO 🤍 (counts toward limit; better used as an IG flourish)."
        ),
    })
    .describe(
      "Per-platform captions. IG/FB lead with the opener and pace through the 5-beat pattern; X is the compressed hook."
    ),
  email: z.object({
    subject_lines: z
      .array(z.string().max(120))
      .min(2)
      .max(5)
      .describe(
        "2–5 subject line candidates for A/B testing. Mix: one urgency-led, one human-led ('From our team in Sylhet'), one factual ('M 7.0 earthquake in Sindh — Deen Relief response')."
      ),
    body: z
      .string()
      .max(4000)
      .describe(
        "Email body — 150–300 words. Opens with the situation, narrows to what donations enable, closes with a clear CTA to the campaign page. UK English. No 'Dear Valued Supporter'."
      ),
  }),
  chart_series: z
    .array(
      z.object({
        title: z
          .string()
          .max(60)
          .describe("What the chart shows, e.g. 'Displaced people by region'."),
        unit: z
          .string()
          .max(24)
          .nullable()
          .describe(
            "The shared unit/dimension of EVERY point — 'people', '%', '£', 'homes'. null if unitless."
          ),
        source: z
          .string()
          .nullable()
          .describe("Source tag, 'AGENCY · DD MMM YYYY'. null if none."),
        points: z
          .array(
            z.object({
              label: z.string().max(40).describe("The category, e.g. 'Gaza', 'Food'."),
              value: z
                .string()
                .max(16)
                .describe("The figure VERBATIM from raw_payload, e.g. '1.7M', '45%', '£0.40'."),
            })
          )
          .min(2)
          .max(6),
      })
    )
    .max(3)
    .default([])
    .describe(
      "0–3 COMPARABLE data series for charts. A series is 2–6 data points that share ONE unit/dimension and belong on a single axis — displacement BY REGION, spend BY SECTOR, need met BY CATEGORY, casualties BY AREA. ONLY include a series when raw_payload genuinely supports 2+ DIRECTLY COMPARABLE points (same unit, same kind of thing). NEVER mix units in one series (no '1.7M' beside '88%'). Values VERBATIM — no fabrication. Return [] when the report has no comparable grouping; a lone scattered fact is NOT a series."
    ),
});

export type ContentBlocks = z.infer<typeof ContentBlocksSchema>;

// ─── System prompt — distilled brand voice for content extraction ──────

/**
 * System prompt for the extraction step.
 *
 * Distilled from BRAND_VOICE_SYSTEM in src/lib/first-response-packet.ts.
 *
 * KEPT sections (still load-bearing when Claude is producing source
 * material rather than composing slides):
 *   • Core voice rules (UK English, first-person plural, 🤍 discipline)
 *   • EMERGENCY-NEWS BRIEFING REGISTER — sets the editorial tone
 *   • CAPTION OPENER PRIORITY — drives caption beat selection
 *   • POSSESSIVE-OPENER RULE — informs at least one title_option
 *   • HASHTAG INTENTIONALITY — hashtag picks
 *   • X / FB FACT DEDUPLICATION — still relevant; the SMM may pair a
 *     stat strip with a body and we need them not to repeat
 *   • TITLE DISCIPLINE (renamed from HERO SLIDE DISCIPLINE) — hard
 *     editorial bar for title_options
 *   • NO FABRICATED QUOTES — non-negotiable, sits on this code path now
 *
 * DROPPED sections (no longer apply — the SMM does composition):
 *   • CLOSING SLIDE DISCIPLINE — no slides here
 *   • IMAGE-CONTENT MATCH — Claude no longer picks images
 *   • Carousel slide rules / slide_count / layouts / arc-to-layout
 *     mapping
 *   • Photo composition (panel_below, panel_right, full_bleed_overlay)
 *   • logo_variant / logo_position / photo_focal_point rules
 *   • Strategy brief framing (arc, register_per_surface, slide_count_rationale)
 *
 * ADDED: the explicit content-extraction framing.
 */
const CONTENT_EXTRACTION_SYSTEM = `You are the in-house copywriter for Deen Relief, a UK-registered Islamic humanitarian charity (Charity No. 1158608), founded in 2013, based in Brighton with field operations in Bangladesh, Syria, Pakistan, India, and Gaza/Palestine.

YOUR JOB IN THIS REQUEST
────────────────────────
You are producing CONTENT BLOCKS for an SMM (social media manager) to compose into slides. You are NOT designing the deck. You are NOT picking images. You are NOT choosing layouts.

The SMM consumes your output as drag-and-drop content cards: she scans your title options, picks one, drops it into a hero slot, picks a body option, etc. Provide MULTIPLE OPTIONS per category so she has genuine editorial choice.

Title options MUST vary in length and approach. At minimum the set should include:
  • a 3–5 word punchy newspaper beat ('GAZA, STILL.', 'AFTER 600 DAYS.')
  • a 5–8 word editorial beat ('West Bank: six settler attacks a day')
  • a possessive-opener variant ('YOUR GIFT REACHED SYLHET')
  • a date- or location-anchored variant ('FROM SINDH, THIS MORNING')

If you produce four titles that all sound the same, you have failed the brief.

──────────────────────────────────────────────────────────────────────
BRAND VOICE — the rules
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
  • Closing emoji: 🤍 (white heart) as a quiet sign-off on IG/FB captions. NOT mid-caption. NOT on X (counts toward 280).
  • Geography signal: country flag emojis 🇧🇩 🇵🇰 🇸🇾 🇵🇸 🇮🇳 🇬🇧 — pair with the country name; signal location not decoration.

ACTUAL VOICE EXAMPLES (sampled from @deenrelief on Instagram, anchors):

  Example A — Brighton Reel:
    "Every week since 2013, our team of volunteers has been out come rain or shine to deliver essential food and other supplies to those in Brighton who are homeless or struggling financially. If you see us on the seafront, please come and say hi! And if you are interested in our work, visit deenrelief.org for more information on our various campaigns 🤍"

  Example B — Qurbani campaign:
    "Deen relief is helping feed families in need this Eid Al Adha with your Qurbani donations. Visit our website (link in bio) to donate. Options to support families in Bangladesh, Pakistan, Syria and India 🇧🇩 🇮🇳"

Notice: plain English, no formal opening, no jargon, donors named as "everyone who donated" not "valued supporters", concrete geography, ONE 🤍 at the end (or none).

DO
  • Lead with the situation — what's happening, where, who's affected.
  • Name field-team presence where it's true ("our Sylhet team is already on the ground").
  • Use concrete numbers from the verified facts — never invent figures.
  • Treat beneficiaries with dignity. Children and displaced families are not props.
  • UK English spelling: organise, behaviour, programme, neighbour.

DON'T
  • No corporate hashbrowns: "leveraging", "stakeholders", "impactful", "make a difference".
  • No urgency theatre: "URGENT URGENT URGENT", "TIME IS RUNNING OUT", "ACT NOW".
  • No exploitative imagery cues: "starving child", "tears", "desperate".
  • No fundraising thermometers, percentages, or "we need to raise £X" pressure.
  • No NGO-speak: "beneficiaries", "stakeholders", "capacity-building", "interventions".
  • DON'T fabricate facts. If you don't have a number, don't include one.
  • DON'T put external URLs in Instagram captions (IG suppresses them) — say "link in bio".
  • DON'T overuse Islamic phrases. One 🤍 at the end of a post is plenty.

──────────────────────────────────────────────────────────────────────
NO FABRICATION — non-negotiable
──────────────────────────────────────────────────────────────────────

Every verified_fact MUST trace to something in raw_payload — a number, a magnitude, a coordinate, an agency report, a named institution. Vague claims ("widespread damage", "many affected", "severe impact") fail the bar. Pull specifics verbatim:

  ✓ "M 7.0 earthquake at 12km depth · USGS"
  ✓ "33M people displaced across Sindh · OCHA Initial Assessments"
  ✓ "Amber cold-weather warning across Sussex, overnight −5°C forecast · Met Office"
  ✗ "Widespread structural damage" (no number)
  ✗ "Many families affected" (no count or source)

Every quote MUST be a real attributed statement that exists IN the raw_payload — a hospital whiteboard, a survivor statement, a field-team note, a partner spokesperson, an OCHA briefing line. If raw_payload contains no attributed quote, return an EMPTY quotes array. Do not invent dialogue. Do not put words in the mouth of 'Deen Relief field team', 'our staff', 'a beneficiary', or any other source unless the raw payload contains a real attributed quote.

  ✓ raw_payload.highlights contains: '"We will keep distributing while we can," said a UNICEF spokesperson in Gaza on 18 May.'
    → quotes can include that line with attribution.
  ✗ Inventing 'A mother in Khan Younis told our team she'd been displaced six times' when nothing like that appears in the source data.

A zero-quote output is correct and required when no source quote exists. The SMM trusts you to be conservative here.

──────────────────────────────────────────────────────────────────────
TITLE DISCIPLINE (was HERO SLIDE DISCIPLINE — the editorial bar)
──────────────────────────────────────────────────────────────────────

Title options are the highest-leverage content blocks. The SMM picks one and the donor sees it first. Apply this bar to EVERY title in title_options:

  • Short editorial beat. Most under 30 chars; punchy variants under 18.
  • Newspaper front-page, not paragraph summary.
  ✓ 'GAZA, STILL.'                 (12 chars — restraint)
  ✓ 'AFTER 600 DAYS.'              (15 chars — temporal weight)
  ✓ 'WEST BANK: 6 A DAY.'          (19 chars — specific, urgent)
  ✓ 'STAY WITH THEM.'              (15 chars — witness register)
  ✗ 'GAZA EMERGENCY APPEAL — DONATE NOW' (poster cliché)
  ✗ 'PEOPLE OF GAZA STILL NEED YOUR HELP' (33 chars + bland)
  ✗ 'CRITICAL UPDATE ON THE SITUATION IN PALESTINE' (newsroom-bland)

At least one title option in your set MUST be ≤ 18 chars (the punchy variant the SMM uses on the hero slide). At least one MUST be a possessive opener (YOUR-led). Other variants can be longer editorial beats.

──────────────────────────────────────────────────────────────────────
POSSESSIVE-OPENER RULE — a senior-SMM finding
──────────────────────────────────────────────────────────────────────

The most engaging Muslim-charity posts open in SECOND-PERSON POSSESSIVE — "Your Qurbani in Niger…", "Your sacrifices are feeding families…", "Your gift reached Sylhet last week…". This implicates the donor as the agent, not the passive recipient of an ask. Avoid the passive "Help families in need" or the third-person "Deen Relief is delivering aid".

ALWAYS include at least one possessive-opener variant in title_options and at least one possessive-opener variant in body_options. Mark them via the title's \`notes\` field as 'possessive-opener variant'.

Exception: for awareness / petition moments the lead should be the INJUSTICE not the donor's contribution — e.g. "Sudan is starving and the world looks away." Possessive framing fits donor-action moments; witness/petition moments need a different opener.

──────────────────────────────────────────────────────────────────────
EMERGENCY-NEWS BRIEFING REGISTER
──────────────────────────────────────────────────────────────────────

These extractions cover REAL DISASTERS — earthquakes, floods, conflict escalations, displacement events. The audience needs to TRUST the source before they'll donate. A campaign poster reads as a sales pitch; a news briefing earns credibility, and the donation follows.

  • Eyebrows read like a briefing — 'BRIEFING · 28 MAY 2026', 'BY THE NUMBERS', 'FROM THE FIELD', 'WHAT WE KNOW'. NOT 'EVERY GIFT COUNTS' or 'EMERGENCY APPEAL POSTER'.
  • Sources visible. On verified_facts, write the source tag like a wire-service stamp: 'USGS', 'OCHA · 25 May 2026', 'Met Office', 'ReliefWeb situation report 14'. Specific sources beat vague 'initial reports'.
  • Tone the CTA down. The SMM may drop a 'donate now' tier-line, but the captions should close with restraint — 'Link in bio to donate' or a hashtag CTA — never huge red shouting.

──────────────────────────────────────────────────────────────────────
CAPTION OPENER PRIORITY (Phase 4y research finding — anchored by MSF's
'Remember Us' Gaza post which earned 327K likes opening with a quote)
──────────────────────────────────────────────────────────────────────

In priority order, OPEN the IG and FB captions with the highest available:
  1. QUOTE IN QUOTATION MARKS — when raw_payload contains an attributed quote, open with the quote verbatim in quotation marks, attribute in the next sentence. Highest-engagement opener.
     Example: '"We did what we could. Remember us." — These words were written by Dr. Mahmoud Abu Nujaila on October 20th...'
  2. NAMED VOICE ATTRIBUTION — when a named staff member, partner, or beneficiary is in the source data, open with their voice: 'Our MSF colleague Renan sent us a message and told us what happened the night of May 26, 2026...'.
  3. SPECIFIC DATED EVENT — 'On 18 May 2026, OCHA reported...'
  4. HARD NUMBER LEAD — '1.7 million people are now sheltering...'
  5. PROVOCATION — 'Sudan. The world's largest humanitarian crisis, actively ignored by the world.'

DR's older captions used pattern 4 (numbers) which is mid-tier. Try patterns 1 or 2 first when the source supports them.

5-BEAT CAPTION STRUCTURE:
  Beat 1 — opener (see priority above)
  Beat 2 — one sentence context (who / when / where)
  Beat 3 — the harm / the news
  Beat 4 — expansion (name others affected, scale, additional context)
  Beat 5 — echo the opener fragment + hashtag-CTA or 'Link in bio to donate'

──────────────────────────────────────────────────────────────────────
X / FACEBOOK FACT DEDUPLICATION (still applies — even when Claude
doesn't compose, the SMM will pair captions with stat strips on slides)
──────────────────────────────────────────────────────────────────────

The IG/FB caption is read alongside the slides. If a verified_fact appears in the stat strip on a slide, the caption should pick a DIFFERENT angle for its lead — testimony, response, sensory detail, on-the-ground update — not the same number restated.

  ✓ verified_facts surface: '1.7M people · 1,600 sites · 881 killed since Oct ceasefire'
    caption opens: 'Our partners are still moving food parcels where the bombardment allows…'
  ✗ verified_facts surface: '1.7M people · 1,600 sites · 881 killed'
    caption opens: '1.7 million people in Gaza are living across 1,600 sites…'
    — same fact twice.

The X variant (280-char limit) can lead with the strongest single number since there's no parallel stat strip.

──────────────────────────────────────────────────────────────────────
HASHTAG INTENTIONALITY
──────────────────────────────────────────────────────────────────────

  • Aim for 3–6 hashtags on serious emergency posts, not 7–8.
  • LEAD with movement / political hashtags when relevant:
      ✓ ceasefirenow, freepalestine, allEyesOnSudan, muststopnow
      ✓ GazaUnderAttack, BringThemHome
  • Use AT MOST ONE generic charity hashtag, and only when truly relevant. The following signal CHARITY MARKETING and the audience scrolls past:
      ✗ muslimcharity, ukcharity, emergencyrelief, charity
  • DOUBLE-USE at least one hashtag as a word in the caption prose: 'He was killed... in #Gaza' — counts twice.
  • No # prefix in your output — the deck-builder adds it on render.

──────────────────────────────────────────────────────────────────────
EMAIL
──────────────────────────────────────────────────────────────────────

  • Subject lines: 2–5 candidates for A/B testing, each under 120 chars.
       - One urgency-led ('Bangladesh floods — your help needed')
       - One human-led ('From our team in Sylhet')
       - One factual ('M 6.5 earthquake in [region] — Deen Relief response')
  • Body: 150–300 words. No "Dear Valued Supporter" — open with the situation.

──────────────────────────────────────────────────────────────────────
TASK
──────────────────────────────────────────────────────────────────────

You will receive:
  • A detected emergency event (title, type, geography, raw_payload from GDACS / USGS / OCHA / ReliefWeb / IFRC / etc)
  • Deen Relief's matched campaigns
  • The DR priority score

Return CONTENT BLOCKS in the structured format — multiple options per category — for the SMM to compose into slides + posts. If a field can't be filled truthfully (no source data supports it), pull a different angle from raw_payload rather than fabricating.`;

// ─── Anthropic client ──────────────────────────────────────────────────

let _client: Anthropic | null = null;
function getDefaultClient(): Anthropic {
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

// ─── Cache helpers ─────────────────────────────────────────────────────

/**
 * SHA-256 of a JSON-serialised payload. Stable across runs. Used as a
 * cache key for the draft_content_blocks column — if raw_payload changes
 * (e.g. OCHA pushes an updated dispatch on the same event), the hash
 * drifts and the next extract call re-runs Claude.
 */
function hashPayload(payload: unknown): string {
  let serialised: string;
  try {
    serialised = JSON.stringify(payload ?? null);
  } catch {
    serialised = String(payload);
  }
  return createHash("sha256").update(serialised).digest("hex");
}

/**
 * Fetch raw_payload + cached content blocks + the cache hash for an
 * event. Used by extractContentBlocks() before deciding whether to
 * call Claude.
 */
async function fetchEventCacheState(eventId: string): Promise<{
  rawPayload: unknown;
  cachedBlocks: ContentBlocks | null;
  cachedHash: string | null;
  cachedSources: EnrichmentSource[];
} | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("emergency_events")
    .select("raw_payload, draft_content_blocks, draft_content_blocks_hash")
    .eq("id", eventId)
    .maybeSingle();

  if (error || !data) return null;

  // Parse the cached blocks defensively — if the stored shape predates
  // the current schema, we ignore the cache and re-extract. (Zod strips the
  // sibling `_sources` key, so cachedBlocks stays clean.)
  let cachedBlocks: ContentBlocks | null = null;
  if (data.draft_content_blocks) {
    const parsed = ContentBlocksSchema.safeParse(data.draft_content_blocks);
    cachedBlocks = parsed.success ? parsed.data : null;
  }

  // The enrichment sources ride along in the same jsonb under `_sources`
  // (set by persistContentBlocks) so a cache hit can still show them.
  let cachedSources: EnrichmentSource[] = [];
  const rawBlocks = data.draft_content_blocks as { _sources?: unknown } | null;
  if (rawBlocks && Array.isArray(rawBlocks._sources)) {
    cachedSources = (rawBlocks._sources as EnrichmentSource[]).filter(
      (s) => s && typeof s.title === "string"
    );
  }

  return {
    rawPayload: data.raw_payload,
    cachedBlocks,
    cachedHash: data.draft_content_blocks_hash,
    cachedSources,
  };
}

/**
 * Persist freshly-extracted blocks + their cache hash back to the row.
 * Failures here are warnings — the caller still got the blocks; we just
 * lose the cache.
 */
async function persistContentBlocks(
  eventId: string,
  blocks: ContentBlocks,
  hash: string,
  sources: EnrichmentSource[]
): Promise<void> {
  const supabase = getSupabaseAdmin();
  // Tuck the enrichment sources alongside the blocks in the same jsonb so a
  // future cache hit can still show "researched from …". Zod strips the
  // `_sources` sibling on read, so the cached blocks stay schema-clean.
  const stored = sources.length ? { ...blocks, _sources: sources } : blocks;
  const { error } = await supabase
    .from("emergency_events")
    .update({
      draft_content_blocks: stored,
      draft_content_blocks_hash: hash,
    })
    .eq("id", eventId);
  if (error) {
    console.warn(
      `[social-content-extraction] persist failed for event ${eventId}:`,
      error.message
    );
  }
}

// ─── User-message builder ──────────────────────────────────────────────

function buildEventBrief(
  event: EmergencyEvent,
  rawPayload: unknown,
  crisisBrief = ""
): string {
  // 2KB cap on the raw payload keeps the prompt small while still giving
  // Claude enough to mine. Most upstream signals (GDACS / OCHA / USGS)
  // serialise to well under that. Truncated payloads still work because
  // the prompt explicitly tells Claude not to fabricate beyond what's
  // present.
  let rawPayloadSummary = "";
  if (rawPayload) {
    try {
      rawPayloadSummary = JSON.stringify(rawPayload, null, 2);
      if (rawPayloadSummary.length > 2000) {
        rawPayloadSummary =
          rawPayloadSummary.slice(0, 2000) + "\n…(truncated)";
      }
    } catch {
      rawPayloadSummary = "(unserialisable)";
    }
  }

  const matchedCampaignsLine =
    event.matchedCampaigns.length === 0
      ? "(none — DR has no specific coverage for this geography)"
      : event.matchedCampaigns.join(", ");

  return `EMERGENCY EVENT — EXTRACT CONTENT BLOCKS

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

  Matched campaigns: ${matchedCampaignsLine}

RAW SOURCE PAYLOAD (the ONLY source of truth for facts + quotes — never invent specifics not present here):
\`\`\`json
${rawPayloadSummary || "(no raw_payload available)"}
\`\`\`
${
  crisisBrief
    ? `
ADDITIONAL VERIFIED CONTEXT — recent related reports about THIS SAME crisis, pulled from ReliefWeb (authoritative humanitarian sources: OCHA, UN agencies, OHCHR, MSF, IFRC, etc). Treat these as TRUSTED SOURCE MATERIAL you may extract facts and verbatim quotes from, exactly like the raw payload — every figure still traces to a named source + date below, and the same no-fabrication rule applies. Use them to surface MORE DISTINCT facts, figures, quotes and angles. BUT stay anchored to THIS event: only use details that pertain to the same crisis — ignore anything about a different incident or country. When you cite a fact from one of these, tag it with that report's source + date.

${crisisBrief}
`
    : ""
}
Extract CONTENT BLOCKS now in the structured format. Multiple options per category. NO FABRICATION — verified_facts trace to the raw payload OR the related reports above, quotes are verbatim and attributed (or the quotes array is empty).`;
}

// ─── Public API ────────────────────────────────────────────────────────

export interface ExtractContentBlocksOptions {
  /**
   * When true, returns a deterministic fixture instead of calling
   * Claude. Lets callers/tests exercise the pipeline without burning
   * credits. The fixture is shape-valid but content-thin — it should
   * never be shown to the SMM as if it were a real extraction.
   */
  useFixture?: boolean;
}

export interface ExtractContentBlocksResult {
  blocks: ContentBlocks;
  inputTokens: number;
  outputTokens: number;
  /** ReliefWeb reports whose content fed this extraction (transparency). */
  enrichmentSources: EnrichmentSource[];
}

/**
 * Extract content blocks from an emergency event.
 *
 * Cache flow:
 *   1. Look up the event row + cached blocks + cached hash.
 *   2. Compute hash(raw_payload). If it matches cachedHash AND
 *      cachedBlocks parse successfully → return cached. (No Claude.)
 *   3. Otherwise call Claude once, validate via Zod, write back
 *      blocks + hash, return.
 *
 * Errors:
 *   • Missing event row → throws (caller's responsibility to ensure
 *     the event exists before calling).
 *   • Claude returns no parsed_output → throws with the stop_reason.
 *
 * Cost shape (no vision tokens, no design references — single-stage):
 *   • System prefix ~3K tokens, cached after first call (90% discount).
 *   • Per-event user message ~1K tokens.
 *   • Output ~1.5K tokens.
 *   On Sonnet 4.6: roughly $0.02–0.04 per extraction on a cold cache;
 *   $0.005–0.01 once the system prefix is warm.
 */
export async function extractContentBlocks(
  client: Anthropic,
  event: EmergencyEvent,
  options: ExtractContentBlocksOptions = {}
): Promise<ExtractContentBlocksResult> {
  // ── Fixture fast-path ─────────────────────────────────────────────
  if (options.useFixture) {
    return {
      blocks: buildFixtureBlocks(event),
      inputTokens: 0,
      outputTokens: 0,
      enrichmentSources: [],
    };
  }

  // ── Cache check ──────────────────────────────────────────────────
  const cacheState = await fetchEventCacheState(event.id);
  if (!cacheState) {
    throw new Error(
      `extractContentBlocks: event ${event.id} not found in emergency_events.`
    );
  }
  const { rawPayload, cachedBlocks, cachedHash, cachedSources } = cacheState;
  const freshHash = hashPayload(rawPayload);

  if (cachedBlocks && cachedHash === freshHash) {
    // Cache hit. Return without burning tokens. Token counts are zero
    // since no API call was made — callers that log usage should branch
    // on cache hit if they need to distinguish.
    return {
      blocks: cachedBlocks,
      inputTokens: 0,
      outputTokens: 0,
      enrichmentSources: cachedSources,
    };
  }

  // ── Cold call ────────────────────────────────────────────────────
  // Lazy crisis enrichment: only on a cache MISS (so re-opens never pay for
  // it), pull recent related ReliefWeb reports for the SAME crisis so Claude
  // has far more authoritative material to mine. Free + capped + fault-tolerant
  // (an empty context just means we extract from the original event alone).
  const crisis = await fetchCrisisContext(event);
  const userMessage = buildEventBrief(event, rawPayload, crisis.brief);

  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 6000,
    output_config: {
      format: zodOutputFormat(ContentBlocksSchema),
      effort: "high" as const,
    },
    system: [
      {
        type: "text" as const,
        text: CONTENT_EXTRACTION_SYSTEM,
        cache_control: { type: "ephemeral" as const },
      },
    ],
    messages: [
      {
        role: "user",
        content: [{ type: "text" as const, text: userMessage }],
      },
    ],
  });

  if (!response.parsed_output) {
    throw new Error(
      `extractContentBlocks produced no output (stop_reason: ${response.stop_reason}).`
    );
  }

  const blocks = response.parsed_output;

  // Fire-and-forget the persist — we don't block the response on the DB
  // write. Failures are logged inside persistContentBlocks.
  await persistContentBlocks(event.id, blocks, freshHash, crisis.sources);

  return {
    blocks,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    enrichmentSources: crisis.sources,
  };
}

// ─── Fixture (for useFixture: true) ────────────────────────────────────

/**
 * Minimal shape-valid fixture. Echoes the event's title + country into
 * the placeholders so callers can visually distinguish a fixture from
 * a real extraction. NEVER ship this to the SMM as if it were a real
 * result — the prose is intentionally generic.
 */
function buildFixtureBlocks(event: EmergencyEvent): ContentBlocks {
  const country = event.countryIso ?? "the region";
  const ymd = event.detectedAt.toISOString().slice(0, 10);

  return {
    title_options: [
      {
        text: `${country.toUpperCase()}, STILL.`,
        char_count: `${country.toUpperCase()}, STILL.`.length,
        notes: "newspaper beat",
      },
      {
        text: "Your gift reaches the ground.",
        char_count: "Your gift reaches the ground.".length,
        notes: "possessive-opener variant",
      },
      {
        text: `Update from ${country}, ${ymd}.`,
        char_count: `Update from ${country}, ${ymd}.`.length,
        notes: "date-led editorial beat",
      },
      {
        text: "Stay with them.",
        char_count: "Stay with them.".length,
        notes: "witness register",
      },
    ],
    eyebrow_options: [
      { text: `BRIEFING · ${ymd}` },
      { text: "FROM THE FIELD" },
      { text: "BY THE NUMBERS" },
    ],
    body_options: [
      {
        text: `Our team is monitoring developments in ${country}. Detailed reporting will follow as field updates come in.`,
        char_count: 110,
      },
      {
        text: `Your support reaches families in ${country} through our partner network on the ground.`,
        char_count: 90,
      },
      {
        text: `${event.title} — initial assessments are underway.`,
        char_count: event.title.length + 35,
      },
    ],
    verified_facts: [
      {
        text: `Event detected ${ymd} (${event.source}).`,
        source: event.source,
      },
      {
        text: `Country: ${country}. Region: ${event.region ?? "—"}.`,
        source: event.source,
      },
      {
        text: "Fixture fact — replace before publishing.",
        source: null,
      },
    ],
    quotes: [],
    tier_lines: [
      {
        amount_gbp: 25,
        short_description: "A week of emergency food for a family",
        long_description: null,
      },
      {
        amount_gbp: 50,
        short_description: "A tarp shelter and bedding kit",
        long_description: null,
      },
      {
        amount_gbp: 100,
        short_description: "A month of essentials for a family of four",
        long_description: null,
      },
    ],
    hashtags: ["emergencyresponse", "deenrelief", country.toLowerCase()],
    captions: {
      instagram: `Our team is responding to developments in ${country}. Link in bio to donate 🤍`,
      facebook: `Our team is responding to developments in ${country}. Donate at deenrelief.org`,
      x: `Responding in ${country}. Donate: deenrelief.org`,
    },
    email: {
      subject_lines: [
        `${country} — your help needed`,
        `From our team responding in ${country}`,
      ],
      body: `Our team is monitoring the situation in ${country}.\n\nYour donations enable us to respond with our partner network on the ground.\n\nDonate at deenrelief.org.`,
    },
    chart_series: [
      {
        title: "Fixture series — replace with real comparable figures",
        unit: "people",
        source: event.source,
        points: [
          { label: "Region A", value: "1.7M" },
          { label: "Region B", value: "310k" },
          { label: "Region C", value: "140k" },
          { label: "Region D", value: "90k" },
        ],
      },
    ],
  };
}

// ─── Convenience for non-test callers ──────────────────────────────────

/**
 * Sugar for callers that don't want to instantiate their own Anthropic
 * client. The route handler uses this so it doesn't need to know about
 * the API key.
 */
export async function extractContentBlocksWithDefaultClient(
  event: EmergencyEvent,
  options: ExtractContentBlocksOptions = {}
): Promise<ExtractContentBlocksResult> {
  return extractContentBlocks(getDefaultClient(), event, options);
}

// ─── ContentBlocks → ContentCard[] adapter (Phase 6e integration) ──────

import type { ContentCard } from "./social-templates/types";

/**
 * Flatten a typed ContentBlocks payload into the discrete ContentCard
 * array the deck-builder Compose UI consumes (one draggable card per
 * option). The shape comes from src/lib/social-templates/types.ts —
 * each card's `kind` discriminator drives colour-coding + drop-target
 * compatibility in dnd-kit.
 *
 * Card ids are stable per (event extraction → card) — they encode the
 * source group + index. That means React keys are stable across re-
 * renders AND the SMM can drag the same card multiple times into
 * different slides without colliding.
 */
export function flattenBlocksToCards(
  blocks: ContentBlocks
): Array<{ id: string; card: ContentCard }> {
  const out: Array<{ id: string; card: ContentCard }> = [];

  blocks.title_options.forEach((t, i) => {
    out.push({
      id: `title-${i}`,
      card: { kind: "title", text: t.text, charCount: t.char_count },
    });
  });
  blocks.eyebrow_options.forEach((e, i) => {
    out.push({ id: `eyebrow-${i}`, card: { kind: "eyebrow", text: e.text } });
  });
  blocks.body_options.forEach((b, i) => {
    out.push({
      id: `body-${i}`,
      card: { kind: "body", text: b.text, charCount: b.char_count },
    });
  });
  blocks.verified_facts.forEach((f, i) => {
    out.push({
      id: `fact-${i}`,
      card: { kind: "fact", text: f.text, source: f.source },
    });
  });
  blocks.quotes.forEach((q, i) => {
    out.push({
      id: `quote-${i}`,
      card: { kind: "quote", text: q.text, attribution: q.attribution },
    });
  });
  blocks.tier_lines.forEach((t, i) => {
    out.push({
      id: `tier-${i}`,
      card: {
        kind: "tier_row",
        amountGbp: t.amount_gbp,
        shortDescription: t.short_description,
        longDescription: t.long_description,
      },
    });
  });
  blocks.hashtags.forEach((h, i) => {
    out.push({ id: `hashtag-${i}`, card: { kind: "hashtag", tag: h } });
  });
  out.push({
    id: "caption-ig",
    card: { kind: "caption_ig", text: blocks.captions.instagram },
  });
  out.push({
    id: "caption-fb",
    card: { kind: "caption_fb", text: blocks.captions.facebook },
  });
  out.push({
    id: "caption-x",
    card: { kind: "caption_x", text: blocks.captions.x },
  });
  blocks.email.subject_lines.forEach((s, i) => {
    out.push({ id: `email-subject-${i}`, card: { kind: "email_subject", text: s } });
  });
  out.push({
    id: "email-body",
    card: { kind: "email_body", text: blocks.email.body },
  });

  return out;
}
