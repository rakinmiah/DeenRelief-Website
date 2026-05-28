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
import sharp from "sharp";
import { z } from "zod";
import type { CoverageEntry, EmergencyEvent } from "./first-response";
import { CAMPAIGNS, isValidCampaign, type CampaignSlug } from "./campaigns";
import { CAMPAIGN_LANDING_PATHS } from "./short-links";
import {
  getCandidateMediaForEvent,
  getMediaById,
  type MediaItem,
} from "./media-library";
import { fetchExternalImageryForEvent } from "./external-imagery-fetch";
import {
  EXTERNAL_FETCH_UA,
  getImageryById,
  type ExternalImagery,
} from "./external-imagery";

const MODEL = "claude-opus-4-7";

// ─── Image-as-vision helpers ───────────────────────────────────────────

/**
 * Downsize an image buffer to a vision-token-friendly thumbnail.
 *
 * Native Claude vision pricing is roughly proportional to (image
 * dimensions × 1.15 tokens/px²). Capping to ~512px on the long edge
 * lands at ~200–400 tokens per image — cheap enough that we can pass
 * 8–10 candidates per packet without breaking the budget. JPEG at
 * quality 70 is plenty for grounding "what's in this photo".
 */
async function toVisionThumbnail(input: Buffer): Promise<{
  data: string;
  mediaType: "image/jpeg";
}> {
  const out = await sharp(input)
    .resize(512, 512, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 70 })
    .toBuffer();
  return { data: out.toString("base64"), mediaType: "image/jpeg" };
}

/**
 * Resolve a packet media_id ('dr:<uuid>' or 'ext:<uuid>') to a vision-
 * ready image block. Returns null if the row is missing / archived /
 * the upstream fetch fails — caller treats null as "skip vision for
 * this candidate, fall back to metadata only".
 */
async function fetchAnthropicImageBlock(
  mediaId: string
): Promise<Anthropic.Messages.ImageBlockParam | null> {
  try {
    let bytes: Buffer | null = null;
    if (mediaId.startsWith("dr:")) {
      const media = await getMediaById(mediaId.slice(3));
      if (!media || media.archivedAt) return null;
      const res = await fetch(media.publicUrl);
      if (!res.ok) return null;
      bytes = Buffer.from(await res.arrayBuffer());
    } else if (mediaId.startsWith("ext:")) {
      const ext = await getImageryById(mediaId.slice(4));
      if (!ext || ext.archivedAt) return null;
      const res = await fetch(ext.url, {
        headers: { "User-Agent": EXTERNAL_FETCH_UA },
      });
      if (!res.ok) return null;
      bytes = Buffer.from(await res.arrayBuffer());
    }
    if (!bytes) return null;
    const thumb = await toVisionThumbnail(bytes);
    return {
      type: "image",
      source: {
        type: "base64",
        media_type: thumb.mediaType,
        data: thumb.data,
      },
    };
  } catch (err) {
    console.warn(
      `[first-response-packet] vision-block fetch failed for ${mediaId}:`,
      err
    );
    return null;
  }
}

// ─── Zod schemas (=== TypeScript types) ────────────────────────────────

/**
 * Stage 1 output — Claude's strategic brief, written BEFORE any
 * concrete copy. Forces the model to think like a senior SMM:
 * what's the angle, what arc fits, how many slides, what emotional
 * register lives on each surface. The brief is the source of truth
 * that Stage 2 composition must obey.
 */
export const StrategyBriefSchema = z.object({
  angle: z
    .string()
    .describe(
      "The HUMAN angle in 1–2 sentences. Not '1.7M displaced' — 'families wading through chest-deep water carrying children + the documents that prove their citizenship'. What is the donor seeing, feeling, and remembering tomorrow."
    ),
  arc: z
    .enum(["evidence", "before_after", "hero_image", "quiet_dignity", "testimony"])
    .describe(
      "Narrative shape. 'evidence' = facts stack toward urgency. 'before_after' = contrast yesterday vs today. 'hero_image' = single strong photo carries the post; copy is restrained. 'quiet_dignity' = no urgency theatre, witness-bearing. 'testimony' = ground-level voice (e.g. a field-team member, a survivor)."
    ),
  register_per_surface: z
    .object({
      caption: z
        .string()
        .describe(
          "Emotional register of the IG/FB/X caption — e.g. 'intimate, first-person, restrained' or 'urgent, factual, leading with geography'. The caption MUST NOT just summarise the slides — it's the human voice that contextualises them."
        ),
      slides: z
        .string()
        .describe(
          "Register of the carousel slides — e.g. 'factual scaffold building tension toward the appeal' or 'witness-bearing, slow, lets the photos carry the weight'."
        ),
      email: z
        .string()
        .describe(
          "Register of the email body — e.g. 'long-form bridge, second-person, ends in a clear ask'."
        ),
      press: z
        .string()
        .describe(
          "Register of the press release — e.g. 'institutional, on-record, factual'. Should read as if a different writer drafted it from the caption."
        ),
    })
    .describe(
      "Each surface plays a different role in the donor journey. Articulate the role explicitly so the four surfaces don't collapse into the same voice."
    ),
  slide_count: z
    .number()
    .int()
    .min(3)
    .max(8)
    .describe(
      "How many slides this story needs. 3 = single hard fact + tiers + appeal (the story is sharp and obvious). 5 = standard hero + evidence + response + tiers + appeal. 7–8 = the story has historical context, multiple facets, or multiple testimonies. Don't pad — every slide must earn its place."
    ),
  slide_count_rationale: z
    .string()
    .describe(
      "Why THIS count. One short paragraph justifying the choice in terms of what the story needs, not template adherence."
    ),
});
export type StrategyBrief = z.infer<typeof StrategyBriefSchema>;

/**
 * Stage 3 output — the creative director's critique. List of concrete
 * revisions to apply to the Stage 2 draft. Empty list = ship as-is.
 */
export const RevisionListSchema = z.object({
  overall_verdict: z
    .enum(["ship_as_is", "minor_revisions", "needs_rework"])
    .describe(
      "Top-line judgement. 'ship_as_is' = nothing to change. 'minor_revisions' = small fixes in the revisions array. 'needs_rework' = serious problems but apply the revisions anyway (we don't currently rerun)."
    ),
  revisions: z
    .array(
      z.object({
        target: z
          .enum([
            "headline",
            "social_post.caption",
            "social_post.hashtags",
            "slide.eyebrow",
            "slide.title",
            "slide.body",
            "slide.logo_variant",
            "slide.media_id",
            "slide.source_attribution",
            "email.subject_lines",
            "email.body",
            "press_release",
          ])
          .describe("Which packet field to revise."),
        slide_index: z
          .number()
          .int()
          .nullable()
          .describe(
            "For slide.* targets, the zero-based slide index. null for non-slide targets."
          ),
        new_value: z
          .string()
          .describe(
            "Replacement value. For slide.logo_variant: 'white' or 'green'. For slide.media_id: a valid 'dr:<uuid>' or 'ext:<uuid>' from the candidate pools, or the literal string 'null' to clear. For arrays (hashtags, subject_lines): JSON-encoded array string."
          ),
        reason: z
          .string()
          .describe(
            "Why this revision improves the packet. Short, specific — 'green logo would clash with green-foliage scene' beats 'looks better'."
          ),
      })
    )
    .describe(
      "Each revision targets ONE field. Empty array = ship as-is. List in priority order — we apply top-to-bottom and the highest-impact fix should be first."
    ),
});
export type RevisionList = z.infer<typeof RevisionListSchema>;

export const LaunchPacketSchema = z.object({
  /** Stage 1's brief, persisted on the packet so the dashboard can
   *  surface "why Claude built it this way" + Stage 3 can reference
   *  it. Required — every packet is built from a brief. */
  strategy_brief: StrategyBriefSchema,
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
  // ─── Visual carousel — 3–8 slides, 1080×1080 each ──────────────
  // The packet renderer generates these as actual PNG images via Satori
  // (Open Graph image generation). SMM uploads to IG/FB carousel with no
  // editing — pure typography, brand-styled, cream + charcoal palette.
  //
  // Slide COUNT is dynamic per strategy_brief.slide_count — don't
  // pad. Slide ORDER follows the rules below.
  carousel_slides: z
    .array(
      z.object({
        layout: z
          .enum(["hero", "fact", "response", "tiers", "testimony", "cta"])
          .describe(
            "Slide template to render. Order rules: slide 1 MUST be 'hero', the LAST slide MUST be 'cta'. Middle slides may be any combination of 'fact', 'response', 'tiers', 'testimony' — repeat them when the story warrants (e.g. two 'fact' slides for two distinct evidence beats). At most one 'tiers' slide per packet."
          ),
        eyebrow: z
          .string()
          .max(40)
          .nullable()
          .describe(
            "Small uppercase tag at the top of the slide. e.g. 'EMERGENCY APPEAL · 28 MAY 2026' for hero, 'THE FACTS' / 'WHAT WE KNOW' for fact, 'OUR RESPONSE' / 'ON THE GROUND' for response, 'HOW YOUR GIFT HELPS' for tiers, 'FROM SYLHET' for testimony, null for cta."
          ),
        title: z
          .string()
          .describe(
            "Main typographic line. For hero: 4–8 word headline. For fact: one hard verifiable fact. For response: DR's action stated plainly. For tiers: 'How your gift helps' or similar. For testimony: a short quote (≤80 chars) — attribution goes in source_attribution. For cta: 'Donate now'."
          ),
        body: z
          .string()
          .nullable()
          .describe(
            "Supporting line beneath the title. 1 short sentence (≤120 chars), or null when the slide is title-only. For tiers slide use null — the tier lines live in tier_lines."
          ),
        tier_lines: z
          .array(
            z.object({
              amount_gbp: z.number().int().describe("Amount in pounds"),
              short_description: z
                .string()
                .max(80)
                .describe(
                  "One short line — e.g. 'A week of emergency food for a family'."
                ),
            })
          )
          .nullable()
          .describe(
            "Only used by the 'tiers' slide — exactly 3 ascending tiers. null for every other layout."
          ),
        source_attribution: z
          .string()
          .max(60)
          .nullable()
          .describe(
            "Small italic source line at the bottom. Used by 'fact' (e.g. 'Source: USGS') and 'testimony' (e.g. '— Amina, Sylhet team'). null elsewhere."
          ),
        media_id: z
          .string()
          .nullable()
          .describe(
            "ID of a photo to render. MUST come from CANDIDATE MEDIA or EXTERNAL VERIFIED IMAGERY — never invent IDs. Format: 'dr:<uuid>' or 'ext:<uuid>'. PREFER DR library when relevant. Use for hero / response / testimony slides when a fitting photo exists. ALWAYS null for fact / tiers / cta (typography-only by design)."
          ),
        logo_variant: z
          .enum(["white", "green"])
          .describe(
            "Which DR logo variant the renderer should overlay on this slide. CRITICAL — pick based on the slide's BACKGROUND, not the brand default: 'green' (logo-on-light) for the CTA cream slide and for PHOTO slides where the photo is dark/saturated or has heavy human skin tones (the green wordmark reads as brand, not overlay). 'white' (logo-on-dark) for typography slides on the dark green field AND for photo slides where the photo is green-foliage-heavy / pale / sun-washed (a green logo would disappear into green foliage). When in doubt on a photo slide: pick 'white' — it's the safer contrast against most photo content."
          ),
      })
    )
    .min(3)
    .max(8)
    .describe(
      "3–8 slides total — must match strategy_brief.slide_count. First slide MUST be 'hero', last MUST be 'cta'. Middle slides per the brief's narrative arc."
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
CAROUSEL SLIDE RULES — 3–8 slides, dynamic count, fixed bookends
──────────────────────────────────────────────────────────────────────

The carousel renders as 1080×1080 PNG images, posted as an Instagram/
Facebook carousel. Slide count is YOUR call per strategy_brief.slide_count:

  • 3 slides — when the story is one sharp fact + the appeal
    (hero → tiers → cta), or hero → response → cta.
  • 5 slides — the standard arc (hero → fact → response → tiers → cta).
  • 7–8 slides — when the story has multiple evidence beats, a
    testimony, or historical context worth pacing out.

Don't pad. Every slide must earn its place. The brief's
slide_count_rationale must justify the count.

LAYOUTS (use as the story needs, not as a checklist):

  "hero" — slide 1 ALWAYS.
    • eyebrow: "EMERGENCY APPEAL · {DD MMM YYYY}" (or a kinder label
      like "URGENT NEED" if tone demands).
    • title: 4–8 word headline tighter than the page headline.
    • body: ≤100 chars — geography + stake.

  "fact" — repeatable. Use multiple for distinct evidence beats.
    • eyebrow: "THE FACTS" / "WHAT WE KNOW" / "BY THE NUMBERS".
    • title: One hard verifiable fact stated tightly.
    • body: One supporting context sentence ≤120 chars.
    • source_attribution: "Source: USGS" / "Source: ReliefWeb" / etc.

  "response" — repeatable but typically once.
    • eyebrow: "OUR RESPONSE" / "ON THE GROUND".
    • title: One sentence on what DR is doing.
    • body: One sentence on next step or scale.

  "testimony" — use when arc='testimony' or when a quote elevates the
    story above abstraction.
    • eyebrow: e.g. "FROM SYLHET" / "OUR FIELD TEAM".
    • title: a short quote ≤80 chars.
    • source_attribution: attribution, e.g. "— Amina, Sylhet team".

  "tiers" — at most ONE per packet.
    • eyebrow: "HOW YOUR GIFT HELPS".
    • title: "Every gift counts" or similar 3-word reassurance.
    • tier_lines: EXACTLY 3 ascending — typically £25 / £50 / £100.

  "cta" — last slide ALWAYS.
    • title: "Donate now" or close variant.
    • body: "Link in bio · deenrelief.org".

LOGO_VARIANT — picked PER SLIDE based on the slide's background.
  • Typography slides (dark green canvas): logo_variant = "white".
  • CTA slide (cream canvas): logo_variant = "green".
  • PHOTO slides: look at the chosen photo carefully:
      - Photo is green-foliage-heavy, pale, or sun-washed → "white"
      - Photo is dark/saturated, urban, water-heavy, dust/sand →
        "green" (the green wordmark reads as brand identity, not as
        an overlay)
      - When in doubt → "white" (safer contrast)
  This choice matters — green-on-green disappears, white-on-pale
  disappears. The renderer will not second-guess you.

Writing rules for slide text:
  • Single-line titles where possible — they wrap at slide scale.
  • No emojis on slides (renderer doesn't render colour emoji reliably).
  • The 🤍 lives in the caption text, NOT on slides.
  • Each slide stands alone — a donor seeing only one slide should
    still know what's happening and what to do.
  • Slides MUST NOT just repeat the caption. They are the visual
    spine; the caption is the human voice introducing them.

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
  /** Stage 1's brief — also embedded on packet.strategy_brief, exposed
   *  separately for the dashboard's "why Claude built it this way"
   *  surface. */
  strategyBrief: StrategyBrief;
  /** Stage 3's revision list — exposed so the debug panel can show
   *  exactly what the creative-director pass changed. */
  revisions: RevisionList;
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
  candidateMedia: MediaItem[],
  externalImagery: ExternalImagery[]
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

  // Candidate media list — DR's own photo inventory. PREFERRED source
  // when relevant (authentic, on-brand, no external attribution
  // required on slides).
  const candidateMediaLines =
    candidateMedia.length === 0
      ? "  • (no matching media in DR's library)"
      : candidateMedia
          .map((m) => {
            const bits = [
              `id=dr:${m.id}`,
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

  // External verified imagery — Wikimedia Commons + NASA EONET +
  // (when wired) ReliefWeb + IFRC. Use only when DR library has no
  // relevant match. Renderer auto-adds attribution line to slides.
  const externalImageryLines =
    externalImagery.length === 0
      ? "  • (no external imagery found for this event)"
      : externalImagery
          .map((e) => {
            const bits = [
              `id=ext:${e.id}`,
              `source=${e.source}`,
              e.title ? `title="${e.title.slice(0, 80)}"` : null,
              `license=${e.license}`,
              `credit="${e.creditText.slice(0, 80)}"`,
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

CANDIDATE MEDIA from DR's own library — PREFERRED source (more
authentic, no external attribution). Use this first when relevant.
IDs prefixed 'dr:' — pass exactly as shown:

${candidateMediaLines}

EXTERNAL VERIFIED IMAGERY — only use when DR's library has nothing
relevant for the event. Renderer auto-adds an attribution line on
slides using this source (CC-licensed, all free for use). IDs
prefixed 'ext:' — pass exactly as shown:

${externalImageryLines}

IMPORTANT: pass IDs verbatim including the 'dr:' or 'ext:' prefix.
Hero + response slides may use either source. Fact, tiers, cta:
always null (typography-only by design).

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

/* ─── Three-stage orchestration ──────────────────────────────────────
 *
 * Stage 1 — Strategy brief (text-only, ~3s)
 *   Claude writes the brief BEFORE any concrete copy: the human
 *   angle, the narrative arc, the slide count and why, the emotional
 *   register per surface. This is what stops every packet looking
 *   the same.
 *
 * Stage 2 — Composition (text + vision tokens, ~30s)
 *   Claude composes the full packet, OBEYING the brief. Vision
 *   thumbnails of the top candidate images are included so Claude
 *   actually sees what it's picking — drives the per-slide
 *   logo_variant choice and grounds image-fit decisions.
 *
 * Stage 3 — Art-director critique (text + vision, ~15s)
 *   Claude reviews its own draft with the picked images in vision
 *   tokens, returns a list of revisions. Catches green-on-green, copy
 *   that repeats the caption, tonal monotony, etc.
 *
 * Stage 4 — Deterministic revision application (in-code, ~ms)
 *   Walk the revisions list, mutate a deep copy of the draft. Then
 *   the existing sanitisation passes run (media_id coercion +
 *   caption truncation).
 */

/** Single user-message Stage 1 prompt: brief only, no packet. */
function buildStage1Prompt(
  input: GenerateLaunchPacketInput,
  candidateMedia: MediaItem[],
  externalImagery: ExternalImagery[]
): string {
  return `${buildEventBrief(input, candidateMedia, externalImagery)}

── STAGE 1: STRATEGY BRIEF ──

Do NOT write the packet yet. Write only the strategic brief: what's
the human angle, what narrative arc fits, how many slides, what
emotional register each surface (caption / slides / email / press)
must carry. Treat this like a senior SMM's notebook BEFORE drafting.

The brief drives every subsequent decision — be specific. Vague briefs
('warm and urgent') will produce templated packets. Concrete briefs
('the caption is restrained and first-person, like a colleague telling
a friend; the slides are factual and pace toward the appeal') produce
the kind of work a 15-year SMM would ship.`;
}

async function runStage1Strategy(
  client: Anthropic,
  input: GenerateLaunchPacketInput,
  candidateMedia: MediaItem[],
  externalImagery: ExternalImagery[]
): Promise<{
  brief: StrategyBrief;
  inputTokens: number;
  outputTokens: number;
}> {
  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 2000,
    output_config: {
      format: zodOutputFormat(StrategyBriefSchema),
      effort: "high" as const,
    },
    system: [
      {
        type: "text" as const,
        text: BRAND_VOICE_SYSTEM,
        cache_control: { type: "ephemeral" as const },
      },
    ],
    messages: [
      {
        role: "user",
        content: buildStage1Prompt(input, candidateMedia, externalImagery),
      },
    ],
  });
  if (!response.parsed_output) {
    throw new Error(
      `Stage 1 (strategy brief) produced no output (stop_reason: ${response.stop_reason}).`
    );
  }
  return {
    brief: response.parsed_output,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}

/** Build a multi-block user message for Stage 2: text brief + vision
 *  thumbnails for the top N candidates per pool. */
async function buildStage2Content(
  input: GenerateLaunchPacketInput,
  brief: StrategyBrief,
  candidateMedia: MediaItem[],
  externalImagery: ExternalImagery[]
): Promise<Array<Anthropic.Messages.TextBlockParam | Anthropic.Messages.ImageBlockParam>> {
  // Cap vision thumbnails to keep token cost predictable. Top 6 from
  // each pool is plenty — Claude rarely needs more than 3–4 photos
  // in a packet, so giving it ~12 choices is generous.
  const TOP_PER_POOL = 6;
  const drTop = candidateMedia.slice(0, TOP_PER_POOL);
  const extTop = externalImagery.slice(0, TOP_PER_POOL);

  // Fetch vision blocks in parallel — failures are non-fatal (Claude
  // still has the metadata, just won't see the photo).
  const drBlocks = await Promise.all(
    drTop.map((m) => fetchAnthropicImageBlock(`dr:${m.id}`))
  );
  const extBlocks = await Promise.all(
    extTop.map((e) => fetchAnthropicImageBlock(`ext:${e.id}`))
  );

  const blocks: Array<Anthropic.Messages.TextBlockParam | Anthropic.Messages.ImageBlockParam> = [];

  blocks.push({
    type: "text",
    text: `${buildEventBrief(input, candidateMedia, externalImagery)}

── STRATEGY BRIEF (from Stage 1) — your own work; obey it ──

${JSON.stringify(brief, null, 2)}

── STAGE 2: COMPOSE THE PACKET ──

Now build the full packet matching the brief. Use the vision thumbnails
that follow to GROUND your image picks — actually look at the photos,
don't reason from titles alone. Per-slide logo_variant must be chosen
based on the photo you SEE.

Honour brief.slide_count exactly. Slide 1 = 'hero'. Last slide = 'cta'.
Middle slides per the brief's arc.

VISION THUMBNAILS — DR LIBRARY (top candidates):`,
  });
  for (let i = 0; i < drBlocks.length; i += 1) {
    const m = drTop[i]!;
    blocks.push({ type: "text", text: `id=dr:${m.id} · caption="${m.caption ?? ""}"` });
    const b = drBlocks[i];
    if (b) blocks.push(b);
  }
  blocks.push({
    type: "text",
    text: `VISION THUMBNAILS — EXTERNAL IMAGERY (top candidates):`,
  });
  for (let i = 0; i < extBlocks.length; i += 1) {
    const e = extTop[i]!;
    blocks.push({
      type: "text",
      text: `id=ext:${e.id} · source=${e.source} · title="${e.title ?? ""}" · credit="${e.creditText}"`,
    });
    const b = extBlocks[i];
    if (b) blocks.push(b);
  }
  return blocks;
}

async function runStage2Compose(
  client: Anthropic,
  input: GenerateLaunchPacketInput,
  brief: StrategyBrief,
  candidateMedia: MediaItem[],
  externalImagery: ExternalImagery[]
): Promise<{
  draft: LaunchPacket;
  inputTokens: number;
  outputTokens: number;
}> {
  const content = await buildStage2Content(
    input,
    brief,
    candidateMedia,
    externalImagery
  );
  const response = await client.messages.parse({
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
    messages: [{ role: "user", content }],
  });
  if (!response.parsed_output) {
    throw new Error(
      `Stage 2 (composition) produced no output (stop_reason: ${response.stop_reason}).`
    );
  }
  return {
    draft: response.parsed_output,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}

/** Stage 3: critique. Vision tokens for the photos Claude PICKED in
 *  Stage 2 (not all candidates) — much smaller, more focused. */
async function runStage3Critique(
  client: Anthropic,
  draft: LaunchPacket
): Promise<{
  revisions: RevisionList;
  inputTokens: number;
  outputTokens: number;
}> {
  // Pull the picked media_ids out of the draft + fetch vision blocks
  // for each. Limit duplicates (same image picked for multiple slides).
  const pickedIds = Array.from(
    new Set(
      draft.carousel_slides
        .map((s) => s.media_id)
        .filter((x): x is string => Boolean(x))
    )
  );
  const visionBlocks = await Promise.all(
    pickedIds.map((id) => fetchAnthropicImageBlock(id))
  );

  const content: Array<Anthropic.Messages.TextBlockParam | Anthropic.Messages.ImageBlockParam> = [
    {
      type: "text",
      text: `You are the creative director at Deen Relief, reviewing a draft
launch packet before publish. The drafter (a copywriter on your team)
worked from a strategy brief; you're checking craft + brand fit +
whether what was promised in the brief is what was delivered.

You have:
  • The strategy brief
  • The full draft packet
  • Vision thumbnails of every photo the drafter picked

Be ruthless but specific. The drafter has 5 years; you have 15. You
catch what they miss. Common patterns to watch for:

  1. SLIDE / CAPTION REPETITION — the caption should INTRODUCE the
     slides, not summarise them. If the first sentence of the caption
     could be a slide title, that's lazy.
  2. LOGO CONTRAST — green wordmark disappears into green-foliage or
     pale-vegetation photos. White wordmark disappears against pale
     sky / sun-washed scenes. Look at each photo and check.
  3. IMAGE FIT — the photo on a slide should embody the slide's
     beat. Satellite imagery on a hero slide is cold/abstract — fine
     for a 'fact' slide, weak for an emotional opening. Ground-level
     human imagery belongs on the hero.
  4. TONAL MONOTONY — if every slide reads in the same register
     (all factual, or all emotional), the carousel flatlines.
  5. SLIDE PADDING — does every slide earn its place, or did the
     drafter pad to hit a count?
  6. REGISTER DRIFT — the brief specified caption / slides / email /
     press_release registers. Did the drafter respect them?

Return a revisions list. Empty list = ship-as-is (rare; only when
the draft is genuinely tight). Otherwise: each revision targets ONE
field with a specific replacement value and a one-sentence reason.

── STRATEGY BRIEF ──
${JSON.stringify(draft.strategy_brief, null, 2)}

── DRAFT PACKET (Stage 2 output) ──
${JSON.stringify(
  {
    headline: draft.headline,
    social_post: draft.social_post,
    carousel_slides: draft.carousel_slides.map((s, i) => ({
      index: i,
      ...s,
    })),
    email: draft.email,
    press_release: draft.press_release,
  },
  null,
  2
)}

── PICKED PHOTOS (vision thumbnails) ──`,
    },
  ];
  for (let i = 0; i < visionBlocks.length; i += 1) {
    const id = pickedIds[i]!;
    content.push({ type: "text", text: `id=${id}` });
    const b = visionBlocks[i];
    if (b) content.push(b);
  }

  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 3000,
    output_config: {
      format: zodOutputFormat(RevisionListSchema),
      effort: "high" as const,
    },
    messages: [{ role: "user", content }],
  });
  if (!response.parsed_output) {
    throw new Error(
      `Stage 3 (critique) produced no output (stop_reason: ${response.stop_reason}).`
    );
  }
  return {
    revisions: response.parsed_output,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}

/**
 * Apply Stage 3 revisions to the Stage 2 draft. Deterministic — no
 * model call. Unknown / malformed revisions are logged and skipped
 * rather than crashing the whole packet.
 */
function applyRevisions(
  draft: LaunchPacket,
  revisionList: RevisionList
): LaunchPacket {
  // Deep clone via JSON round-trip (the packet is plain data).
  const next: LaunchPacket = JSON.parse(JSON.stringify(draft));

  for (const r of revisionList.revisions) {
    try {
      const slideIdx = r.slide_index;
      switch (r.target) {
        case "headline":
          next.headline = r.new_value;
          break;
        case "social_post.caption":
          next.social_post.caption = r.new_value;
          break;
        case "social_post.hashtags":
          next.social_post.hashtags = JSON.parse(r.new_value);
          break;
        case "slide.eyebrow":
          if (slideIdx != null && next.carousel_slides[slideIdx]) {
            next.carousel_slides[slideIdx]!.eyebrow =
              r.new_value === "null" ? null : r.new_value;
          }
          break;
        case "slide.title":
          if (slideIdx != null && next.carousel_slides[slideIdx]) {
            next.carousel_slides[slideIdx]!.title = r.new_value;
          }
          break;
        case "slide.body":
          if (slideIdx != null && next.carousel_slides[slideIdx]) {
            next.carousel_slides[slideIdx]!.body =
              r.new_value === "null" ? null : r.new_value;
          }
          break;
        case "slide.logo_variant":
          if (
            slideIdx != null &&
            next.carousel_slides[slideIdx] &&
            (r.new_value === "white" || r.new_value === "green")
          ) {
            next.carousel_slides[slideIdx]!.logo_variant = r.new_value;
          }
          break;
        case "slide.media_id":
          if (slideIdx != null && next.carousel_slides[slideIdx]) {
            next.carousel_slides[slideIdx]!.media_id =
              r.new_value === "null" ? null : r.new_value;
          }
          break;
        case "slide.source_attribution":
          if (slideIdx != null && next.carousel_slides[slideIdx]) {
            next.carousel_slides[slideIdx]!.source_attribution =
              r.new_value === "null" ? null : r.new_value;
          }
          break;
        case "email.subject_lines":
          next.email.subject_lines = JSON.parse(r.new_value);
          break;
        case "email.body":
          next.email.body = r.new_value;
          break;
        case "press_release":
          next.press_release = r.new_value;
          break;
      }
    } catch (err) {
      console.warn(
        `[first-response-packet] revision skipped (${r.target}):`,
        err instanceof Error ? err.message : err
      );
    }
  }
  return next;
}

export async function generateLaunchPacket(
  input: GenerateLaunchPacketInput
): Promise<GenerateLaunchPacketResult> {
  const client = getClient();

  // Pre-fetch BOTH candidate pools in parallel — metadata first
  // (we'll fetch vision thumbnails in Stage 2 for only the top N).
  const [candidateMedia, externalImagery] = await Promise.all([
    getCandidateMediaForEvent({
      countryIso: input.event.countryIso,
      eventType: input.event.eventType,
      campaignSlugs: input.matchedCoverage.map((c) => c.campaignSlug),
      limit: 12,
    }),
    fetchExternalImageryForEvent(input.event),
  ]);

  // ── Stage 1: Strategy brief ──
  const s1 = await runStage1Strategy(
    client,
    input,
    candidateMedia,
    externalImagery
  );

  // ── Stage 2: Composition with vision ──
  const s2 = await runStage2Compose(
    client,
    input,
    s1.brief,
    candidateMedia,
    externalImagery
  );

  // Sanity-check: Stage 2 must echo the brief Claude wrote in Stage 1.
  // If it drifted, force the persisted brief to match what was used.
  s2.draft.strategy_brief = s1.brief;

  // ── Stage 3: Art-director critique with vision ──
  // Failure here is non-fatal — we'd rather ship the Stage 2 draft
  // than fail the whole packet on a critique-pass error.
  let revisions: RevisionList = { overall_verdict: "ship_as_is", revisions: [] };
  let s3Input = 0;
  let s3Output = 0;
  try {
    const s3 = await runStage3Critique(client, s2.draft);
    revisions = s3.revisions;
    s3Input = s3.inputTokens;
    s3Output = s3.outputTokens;
  } catch (err) {
    console.warn(
      "[first-response-packet] Stage 3 critique failed, shipping Stage 2 draft as-is:",
      err instanceof Error ? err.message : err
    );
  }

  // ── Stage 4: Apply revisions deterministically ──
  const revised = applyRevisions(s2.draft, revisions);

  // Safety pass 1: ensure any media_id is in one of the candidate
  // sets. Confabulated IDs would render as broken images.
  const drIds = new Set(candidateMedia.map((m) => `dr:${m.id}`));
  const extIds = new Set(externalImagery.map((e) => `ext:${e.id}`));
  const validIds = new Set<string>([...drIds, ...extIds]);
  const sanitisedSlides = revised.carousel_slides.map((slide) => {
    if (!slide.media_id) return slide;
    if (validIds.has(slide.media_id)) return slide;
    console.warn(
      `[first-response-packet] revised media_id=${slide.media_id} not in either candidate set — coercing to null.`
    );
    return { ...slide, media_id: null };
  });

  // Safety pass 2: cap the social post caption at 280 chars for X.
  const cappedCaption = truncateCaptionForX(revised.social_post.caption);

  return {
    packet: {
      ...revised,
      social_post: { ...revised.social_post, caption: cappedCaption },
      carousel_slides: sanitisedSlides,
    },
    model: MODEL,
    inputTokens: s1.inputTokens + s2.inputTokens + s3Input,
    outputTokens: s1.outputTokens + s2.outputTokens + s3Output,
    strategyBrief: s1.brief,
    revisions,
  };
}
