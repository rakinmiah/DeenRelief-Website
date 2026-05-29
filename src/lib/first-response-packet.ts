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
// NB: `sharp` is lazy-imported INSIDE toVisionThumbnail (below). It's
// a native binary dependency with a non-trivial cold-start cost and
// occasional load failures on Vercel; importing it at module init
// would propagate that cost to every consumer of LaunchPacketSchema
// (e.g. the slide route + social-image route) which never actually
// resize images. Lazy load keeps those routes lean.
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
  buildFixturePacket,
  isTestEvent,
} from "./first-response-packet-fixture";
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
  // Lazy load — see top-of-file note. Dynamic import keeps sharp out
  // of the slide-route + social-image-route bundle.
  const { default: sharp } = await import("sharp");
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
    .enum([
      "evidence",
      "before_after",
      "hero_image",
      "quiet_dignity",
      "testimony",
      "awareness_petition",
      "manifesto",
    ])
    .describe(
      "Narrative shape. Each arc maps to a distinct VISUAL MODE (the renderer picks fonts, layout and emphasis from this choice — don't pick arc just for vibes, the visual rendering follows it):\n" +
        "  • 'evidence' → typography-led editorial (Bowlby chunky display, dark forest canvas, factual chapters building toward urgency)\n" +
        "  • 'hero_image' → magazine cover (full-bleed photo, restrained Lora-italic title, photo carries the post)\n" +
        "  • 'quiet_dignity' → witness photojournalism (photo dominant, small Lora-italic captions, no urgency, no theatre — bear witness)\n" +
        "  • 'testimony' → quote-led (Lora-italic body, amber Caveat eyebrow, subject portrait, attribution)\n" +
        "  • 'before_after' → comparison split (display sans, two-photo grid, contrasts yesterday vs today)\n" +
        "  • 'awareness_petition' → activist (heavy uppercase, no donation tiers; CTA is comment-a-keyword OR share, not 'link in bio'). USE FOR signal/petition moments where action is non-monetary.\n" +
        "  • 'manifesto' → numbered chapters ('We believe X. That means Y.' pattern, one chapter per slide; lowercase sans + accent colour). USE FOR brand-identity / mission-statement / introducing-DR moments."
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
          "DEPRECATED (kept for back-compat). Press release is no longer rendered. Return an empty string."
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
  cta_mechanism: z
    .enum(["link_in_bio", "comment_keyword", "phone", "share"])
    .describe(
      "Primary call-to-action mechanism for this packet. Picked from the strategy_brief.arc:\n" +
        "  • 'link_in_bio' = donor clicks the bio link → /donate. Default for evidence/hero_image/quiet_dignity/testimony/before_after.\n" +
        "  • 'comment_keyword' = donor comments e.g. 'PETITION' → DR auto-DMs them a link. Use for 'awareness_petition' arc (engagement is itself reach).\n" +
        "  • 'phone' = donor calls the charity hotline. Use when the audience skews older / less digital.\n" +
        "  • 'share' = donor shares the post to amplify reach. Use for 'awareness_petition' or 'manifesto' brand-identity moments.\n" +
        "The caption + cta slide must MATCH this mechanism — if comment_keyword, the caption tells donors what keyword to comment."
    ),
  cta_keyword: z
    .string()
    .nullable()
    .describe(
      "Required ONLY when cta_mechanism = 'comment_keyword'. The single uppercase keyword donors comment to trigger a DM (e.g. 'PETITION', 'GAZA', 'SUDAN'). null for every other mechanism."
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
          .enum(["hero", "fact", "response", "tiers", "testimony", "chapter", "cta"])
          .describe(
            "Slide template to render. Order rules: slide 1 MUST be 'hero', the LAST slide MUST be 'cta'. Middle slides per arc:\n" +
              "  • Most arcs use 'fact', 'response', 'tiers', 'testimony' in the middle. Repeat 'fact' for multiple evidence beats. At most one 'tiers' slide.\n" +
              "  • 'manifesto' arc uses 'chapter' slides — one chapter per slide, each with title (the claim, e.g. 'We believe in showing up.') + body (the proof, e.g. 'Every week since 2013, our Brighton team...'). 3–5 chapter slides between hero and cta.\n" +
              "  • 'awareness_petition' arc OMITS the 'tiers' slide (no donation amounts) — uses 'fact' and 'testimony' middle slides instead."
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
    .default("")
    .describe(
      "DEPRECATED — press release is no longer rendered. Return an empty string. The 'press' register on strategy_brief.register_per_surface is also vestigial."
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
  • Close with 🤍 — once, at the end.
  • Hashtags: 4–6, no # prefix in your output, lowercase.
  • DON'T mention TikTok, Threads, or WhatsApp formats — those are
    dropped from the packet.

CTA mechanism dictates the call-to-action wording (cta_mechanism field):
  • 'link_in_bio' (default) → caption ends "Link in bio to donate" or
    similar. Works on IG (where inline URLs are suppressed), reads
    natural on FB + X.
  • 'comment_keyword' → caption ends "Comment '{KEYWORD}' and we'll
    DM you a link to {action}". Use for awareness/petition moments;
    DON'T ask for a donation here, ask for engagement.
  • 'phone' → caption ends "Call our team on {phone number}". For
    older-skewing audiences or breaking-news moments.
  • 'share' → caption ends "Share this post to {amplify/raise awareness}".
    For manifesto + awareness moments.

POSSESSIVE-OPENER RULE (a senior-SMM finding):
The most engaging Muslim-charity posts open in SECOND-PERSON POSSESSIVE
— "Your Qurbani in Niger…", "Your sacrifices are feeding families…",
"Your gift reached Sylhet last week…". This implicates the donor as
the agent, not the passive recipient of an ask. Avoid the passive
"Help families in need" or the third-person "Deen Relief is delivering
aid". Where the situation fits, lead with YOUR.

Exception: for 'awareness_petition' arc the lead should be the
INJUSTICE not the donor's contribution — e.g. "Sudan is starving and
the world looks away." Possessive framing fits donor-action arcs;
witness/petition arcs need a different opener.

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
  • DEPRECATED — no longer rendered. Return an empty string for the
    press_release field. The 'press' register on strategy_brief is also
    vestigial; you can still write it, but it has no downstream effect.

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
  const hasPhotos = candidateMedia.length > 0 || externalImagery.length > 0;
  const photoNote = hasPhotos
    ? `IMPORTANT — you have ${candidateMedia.length} DR-library + ${externalImagery.length} external-imagery candidates available. Your brief MUST address where the strongest photo goes. The HERO slide is where donors form their first impression — typography-only heroes are a fallback for when no fitting photo exists, NOT a default. If a fitting human/ground-level photo exists in DR's library, the hero takes it. If only satellite/aerial imagery exists (cold, abstract), consider whether it belongs on the hero or on a 'fact' slide.`
    : "No photos available — the carousel will be typography-only.";

  return `${buildEventBrief(input, candidateMedia, externalImagery)}

── STAGE 1: STRATEGY BRIEF ──

Do NOT write the packet yet. Write only the strategic brief: what's
the human angle, what narrative arc fits, how many slides, what
emotional register each surface must carry. Treat this like a senior
SMM's notebook BEFORE drafting.

The brief drives every subsequent decision — be specific. Vague briefs
('warm and urgent') produce templated packets. Concrete briefs ('the
caption is restrained and first-person, like a colleague telling a
friend; the slides pace from one hard fact to a quiet testimony to
the appeal; the email opens with a sensory detail') produce the kind
of work a 15-year SMM would ship.

PHOTO PLACEMENT (NON-NEGOTIABLE):
${photoNote}

SLIDE COUNT — THINK BEFORE PICKING:
A simple story (one hard fact + ask) = 3 slides. The standard arc
(hero → evidence → response → tiers → cta) = 5. A layered story
with multiple evidence beats, a testimony, OR historical context
= 6–8. DON'T default to 5 because that's what every charity does.
Justify your count in slide_count_rationale.

ARC → VISUAL MODE (the renderer obeys this; pick arc accordingly):
  • 'evidence' → typography-led editorial. Chunky Bowlby display.
    Best for: facts that need impact, scoring high on factual gravity.
  • 'hero_image' → magazine cover layout. Lora-italic title overlaid
    on a full-bleed photo. Best for: when one image carries the post.
  • 'quiet_dignity' → witness photojournalism. Photo dominant, small
    Lora-italic captions. Best for: famine, displacement, the
    'no urgency theatre' moments where bearing witness IS the
    response. Islamic Relief's 'Sudan is in Crisis' is a model.
  • 'testimony' → quote-led. Field-team or survivor voice with named
    attribution. Lora-italic body in a quote frame.
  • 'before_after' → comparison split. Two photos contrasting time.
    Best for: recovery stories, rebuilding, year-on-year impact.
  • 'awareness_petition' → activist. Heavy uppercase, no donation
    tiers. CTA is comment-a-keyword or share. Best for: signal
    moments where engagement IS the action (petitions, awareness
    days, ceasefire calls). Islamic Relief's 'All Eyes on Sudan'
    is the canonical reference.
  • 'manifesto' → numbered chapters. 'We believe X. That means Y.'
    pattern, one chapter per slide. Best for: brand-identity posts,
    'introducing DR' moments, year-in-review. Charity:Water's
    'HI, WE'RE CHARITY: WATER' is the canonical reference.

CAPTION LENGTH MUST MATCH ARC:
  • 'evidence', 'awareness_petition' → short + punchy (~120-180 chars).
    The slides carry the depth; the caption is the human hook.
  • 'hero_image', 'before_after' → medium (~180-240 chars). One vivid
    detail + one line of context + the ask.
  • 'quiet_dignity', 'testimony', 'manifesto' → longform (~200-280
    chars). Substantive prose with specifics. Chapter structure
    encouraged for manifesto.

REGISTER VARIATION — THE FOUR SURFACES MUST READ DIFFERENTLY:
  • caption: the human voice that introduces (intimate / restrained
    / first-person plural — NEVER a summary of the slides)
  • slides: the visual spine (factual, paced, building tension)
  • email: the longform bridge (second-person, expansive, opens
    with a sensory detail, narrows to the ask)
  • press: institutional (third-person, on-record, journalistic
    register that could run in The Guardian unchanged)

If any two of those register strings sound interchangeable, rewrite
them. Different surfaces, different jobs.`;
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

  const hasFittingCandidates =
    candidateMedia.length > 0 || externalImagery.length > 0;
  const heroMustHavePhoto = hasFittingCandidates;

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

${
  heroMustHavePhoto
    ? `HARD RULE — HERO SLIDE MUST USE A PHOTO:
The DR library has ${candidateMedia.length} matching photo${candidateMedia.length === 1 ? "" : "s"} and there are ${externalImagery.length} external candidate${externalImagery.length === 1 ? "" : "s"}. You MUST put a photo on the hero slide. Pick the strongest-fitting candidate from the vision thumbnails below — typography-only hero is RESERVED for the case where genuinely nothing fits, which is NOT this case.

DR's own library photos take priority over external imagery when both could work. A DR-library photo of someone in the event's country (BD, PK, SY, PS, IN, GB) with documentary tone or response-illustration use-case is almost always the right hero choice. If the hero is appeal-led and the response slide has a ground-level field photo, the response slide can take a second photo too.

If you leave the hero with media_id=null while a fitting candidate is visible in the thumbnails, the post-processing pass will OVERRIDE your choice and assign one anyway — so spend your judgement picking the BEST one, not whether to use one.`
    : `No DR-library or external candidates match this event — typography-only hero is acceptable here. Note this in your composition.`
}

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
 *  Stage 2 + the metadata of UNUSED candidates (so the critique can
 *  catch hero-typography-when-a-photo-was-available misses, which is
 *  the single biggest failure mode in production). */
async function runStage3Critique(
  client: Anthropic,
  draft: LaunchPacket,
  candidateMedia: MediaItem[],
  externalImagery: ExternalImagery[]
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

  // Compact list of unused candidates so the critique can see what
  // Stage 2 passed over. This is what surfaces the "hero is
  // typography-only but a perfect-fit DR photo was available" miss.
  const pickedSet = new Set(pickedIds);
  const unusedDrCandidates = candidateMedia
    .filter((m) => !pickedSet.has(`dr:${m.id}`))
    .slice(0, 8);
  const unusedExtCandidates = externalImagery
    .filter((e) => !pickedSet.has(`ext:${e.id}`))
    .slice(0, 4);

  const content: Array<Anthropic.Messages.TextBlockParam | Anthropic.Messages.ImageBlockParam> = [
    {
      type: "text",
      text: `You are the creative director at Deen Relief — 15 years agency,
5 years client-side at a UK Muslim charity. You are reviewing a
draft launch packet by a junior copywriter on your team before it
ships. They have talent; they don't yet have judgement. Your job
is to catch what they missed.

You have:
  • The strategy brief they were working from
  • Their full draft packet
  • Vision thumbnails of every photo they picked

WALK THROUGH THIS CHECKLIST. Each item below is a specific failure
mode you've seen this writer (and every junior on your team) commit.
For each item, look at the draft and ask: is this happening here?
If yes, return a concrete revision.

  ☐ HERO PHOTO BAR — If a fitting photo exists in the candidate
    pool but the hero slide is typography-only, that's a miss.
    Donors form their first impression on the hero. Move the
    strongest photo there unless the photo is genuinely wrong for
    the hero beat (e.g. only candidates are satellite / abstract).

  ☐ RHYTHMIC MONOTONY — Read the slide titles aloud in order. If
    three or more in a row are subject-verb-object declaratives in
    the same staccato cadence, the carousel reads metronomic. Vary
    one: turn it into a question, a fragment, a quote, a command.

  ☐ GENERIC CHARITY-SPEAK IN TIERS — Tier descriptions like 'a week
    of food for a family' are interchangeable with every other
    charity. Push for sensory specifics — '14 days of rice, dahl
    and cooking oil for six people' / 'a tarp shelter and bedding
    until the monsoon ends'. Same money, different mental picture.

  ☐ CAPTION REPEATS SLIDES — If the first sentence of the caption
    could be a slide title (or vice versa), the surfaces have
    collapsed into one voice. Rewrite the caption to INTRODUCE the
    slides with a human-voice hook, not summarise them.

  ☐ LOGO-PHOTO CONTRAST — Look at each photo + the chosen
    logo_variant. Green wordmark on green-foliage = disappears.
    Green wordmark on a mid-tone-green sky = poor contrast. White
    wordmark on pale / sun-washed / sky-heavy photo = disappears.
    Swap the variant where contrast is weak.

  ☐ REGISTER DRIFT — The brief specified register_per_surface.
    Does the caption sound restrained / first-person if the brief
    said so? Does the email read longform / second-person? Does
    the press release read like it could run in The Guardian
    unchanged? Flag any surface whose voice has drifted toward
    the others.

  ☐ EYEBROW CLICHÉ — DR's recurring eyebrows are 'EMERGENCY APPEAL',
    'THE FACTS', 'OUR RESPONSE', 'HOW YOUR GIFT HELPS'. They're fine
    but tired. A more specific eyebrow ('FROM SINDH, THIS MORNING')
    elevates the slide. Push for at least one specific eyebrow per
    packet.

  ☐ NO TESTIMONY WHEN ONE WOULD LAND — If the story has a real
    on-the-ground voice (DR's field team, a local partner, a
    survivor with named consent), and the carousel is all third-
    person reportage, propose adding a testimony slide. A quote
    elevates above abstraction.

  ☐ PADDED SLIDE — Walk each middle slide and ask: if I removed
    this slide, would the donor be missing anything? If no, the
    slide is padding. Propose dropping it OR repurposing its
    content into a stronger neighbour.

  ☐ POSSESSIVE OPENER MISSING — The strongest Muslim-charity posts
    open in SECOND-PERSON POSSESSIVE ('Your Qurbani in Niger…',
    'Your gift reached Sylhet last week…'). The drafter often
    defaults to passive 'Help families' or third-person 'Deen
    Relief is delivering aid'. If the caption opens passively AND
    the arc is donor-action-focused (evidence / hero_image /
    testimony / before_after), propose a YOUR-led rewrite. Skip
    this check for awareness_petition and quiet_dignity — those
    should lead with the injustice, not the donor.

  ☐ CAPTION LENGTH WRONG FOR ARC — Each arc has a target caption
    length (see brief). evidence + awareness_petition should be
    punchy (~120–180 chars); quiet_dignity + testimony +
    manifesto should be longform (~200–280 chars). If the drafter
    wrote 80 chars for a manifesto post or 270 chars for an
    evidence post, the rhythm is wrong. Propose a length-matched
    rewrite.

  ☐ GENERIC CLAIM WITHOUT SPECIFICS — Strong charities back every
    claim with granular proof. 'We're transparent' → 'donations come
    with GPS coordinates, photos and project updates'. 'We respond
    quickly' → 'first meals on the ground within 48 hours'. If
    any sentence in the email body or press_release makes a vague
    claim without immediate specifics, propose tightening.

  ☐ ARC ↔ LAYOUT MISMATCH — The strategy_brief.arc dictates the
    visual mode. Check:
      - arc='manifesto' but no 'chapter' slides → propose converting
        middle slides to chapter format ('We believe X. That means Y.')
      - arc='awareness_petition' but 'tiers' slide present → propose
        removing the tiers slide; awareness posts don't ask for money
      - arc='testimony' but no testimony slide → propose adding one
      - arc='quiet_dignity' but hero is typography-only → propose
        moving the strongest available photo to the hero slot

  ☐ CTA MECHANISM ↔ CAPTION ENDING MISMATCH — The packet's
    cta_mechanism must match the caption's closing line:
      - 'link_in_bio' → caption ends 'Link in bio to donate' or
        similar (NEVER 'Comment X')
      - 'comment_keyword' → caption ends 'Comment {KEYWORD}…'
        and cta_keyword field is set
      - 'share' → caption ends 'Share this post to…'
      - 'phone' → caption ends 'Call our team on…'
    If the mechanism and the caption ending don't agree, fix the
    caption.

Return a revisions list ranked by impact (most important first).
Empty list = ship-as-is (rare; only when the draft is genuinely
tight on every checklist item). Otherwise: each revision targets
ONE field with a specific replacement value and a one-sentence
reason naming the checklist item.

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

  // Append the UNUSED candidate metadata so the critique can compare
  // what was picked against what was available. The drafter often
  // leaves a perfect-fit DR photo unused on the hero — this gives
  // the creative-director pass the information needed to call that
  // out as a specific revision.
  if (unusedDrCandidates.length > 0 || unusedExtCandidates.length > 0) {
    const unusedLines: string[] = [];
    if (unusedDrCandidates.length > 0) {
      unusedLines.push("DR library candidates the drafter did NOT use:");
      for (const m of unusedDrCandidates) {
        const bits = [
          `id=dr:${m.id}`,
          m.caption ? `caption="${m.caption}"` : null,
          m.countryIso ? `country=${m.countryIso}` : null,
          m.eventTypes.length ? `events=${m.eventTypes.join(",")}` : null,
          m.tone ? `tone=${m.tone}` : null,
          m.useCases.length ? `use=${m.useCases.join(",")}` : null,
        ]
          .filter(Boolean)
          .join(" · ");
        unusedLines.push(`  • ${bits}`);
      }
    }
    if (unusedExtCandidates.length > 0) {
      unusedLines.push("External candidates the drafter did NOT use:");
      for (const e of unusedExtCandidates) {
        const bits = [
          `id=ext:${e.id}`,
          `source=${e.source}`,
          e.title ? `title="${e.title.slice(0, 80)}"` : null,
        ]
          .filter(Boolean)
          .join(" · ");
        unusedLines.push(`  • ${bits}`);
      }
    }
    content.push({
      type: "text",
      text: `\n── UNUSED CANDIDATES (the drafter had these but chose not to use them) ──
${unusedLines.join("\n")}

If the hero slide is typography-only AND any of these unused candidates
plausibly fit the event (matching country, event type, or campaign), that
is a miss. Propose a revision setting slide.media_id to the best
unused candidate's ID.`,
    });
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
 * Pick the best DR-library (or external) candidate for the hero slide
 * when Stage 2 left it null. Ranking is deterministic + cheap — we
 * can't call vision here, so we rank by metadata fit:
 *
 *   1. Country match beats no country match
 *   2. Event-type match (e.g. 'flood' photo for a flood event)
 *   3. Campaign match (matches one of event.matchedCampaigns)
 *   4. Tone match — 'documentary' / 'dignified' beat 'festival' / 'gratitude' for emergency events
 *   5. Use-case match — 'emergency-hero' / 'beneficiary-portrait' beat 'tier-illustration'
 *   6. People-visible + not-identifiable-minor (safeguarding-clean)
 *
 * DR library always beats external imagery when both have a fit.
 *
 * Returns null if NOTHING in the pools could be a sensible hero — at
 * which point typography-only is the right answer.
 */
export function pickBestCandidateForEvent(
  event: EmergencyEvent,
  drCandidates: MediaItem[],
  extCandidates: ExternalImagery[]
): { id: string; reason: string } | null {
  // Score DR candidates first; if any score > 0 we pick from those.
  const drScored = drCandidates
    .filter((m) => !m.identifiableMinors || m.useCases.includes("consent-on-file"))
    .map((m) => {
      let score = 0;
      const reasons: string[] = [];
      if (event.countryIso && m.countryIso === event.countryIso) {
        score += 10;
        reasons.push(`country=${event.countryIso}`);
      }
      if (event.eventType && m.eventTypes.includes(event.eventType)) {
        score += 6;
        reasons.push(`event=${event.eventType}`);
      }
      // Campaign overlap.
      const campaignOverlap = m.campaignSlugs.filter((c) =>
        event.matchedCampaigns?.includes(c)
      );
      if (campaignOverlap.length > 0) {
        score += 4 * campaignOverlap.length;
        reasons.push(`campaigns=${campaignOverlap.join(",")}`);
      }
      // Tone preference for emergency events.
      if (m.tone === "documentary" || m.tone === "dignified") {
        score += 2;
      } else if (m.tone === "festival" || m.tone === "gratitude") {
        score -= 2;
      }
      // Use-case match.
      if (
        m.useCases.includes("emergency-hero") ||
        m.useCases.includes("beneficiary-portrait") ||
        m.useCases.includes("response-illustration")
      ) {
        score += 2;
      }
      if (m.peopleVisible) score += 1;
      return { m, score, reasons };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  if (drScored.length > 0) {
    const top = drScored[0]!;
    return {
      id: `dr:${top.m.id}`,
      reason: top.reasons.join(", ") || `score=${top.score}`,
    };
  }

  // Fall back to external imagery — first match in the list (already
  // ordered by fetched_at desc, so most recent first).
  if (extCandidates.length > 0) {
    const top = extCandidates[0]!;
    return {
      id: `ext:${top.id}`,
      reason: `external/${top.source}`,
    };
  }

  return null;
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
  // FIXTURE FAST-PATH — test events skip Claude entirely so the SMM
  // can re-draft a test scenario 50 times during demo prep without
  // burning credits (each live generation is ~$0.30 with vision).
  // Set FORCE_LIVE_PACKET_GEN=1 in the env to bypass this and call
  // Claude on test events too (useful when verifying prompt changes).
  if (isTestEvent(input.event) && process.env.FORCE_LIVE_PACKET_GEN !== "1") {
    console.log(
      `[first-response-packet] test event detected (${input.event.externalId ?? input.event.id}) — returning fixture, skipping Claude`
    );
    const packet = buildFixturePacket(input.event);
    return {
      packet,
      model: "fixture",
      inputTokens: 0,
      outputTokens: 0,
      strategyBrief: packet.strategy_brief,
      revisions: { overall_verdict: "ship_as_is", revisions: [] },
    };
  }

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
    const s3 = await runStage3Critique(
      client,
      s2.draft,
      candidateMedia,
      externalImagery
    );
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

  // ── Stage 4.5: ENFORCE hero photo when candidates exist ──
  // The single biggest production failure is Stage 2 leaving the
  // hero typography-only despite a perfectly-fitting DR library
  // candidate sitting in the pool. Stage 3 critique should catch
  // this but doesn't always — especially when the arc is
  // 'quiet_dignity' or 'hero_image' where photos are non-negotiable.
  // We enforce it deterministically here.
  const heroIndex = revised.carousel_slides.findIndex(
    (s) => s.layout === "hero"
  );
  if (heroIndex !== -1 && !revised.carousel_slides[heroIndex]!.media_id) {
    const best = pickBestCandidateForEvent(
      input.event,
      candidateMedia,
      externalImagery
    );
    if (best) {
      console.warn(
        `[first-response-packet] enforcing hero photo — Stage 2 left it null; assigning ${best.id} (${best.reason})`
      );
      revised.carousel_slides[heroIndex] = {
        ...revised.carousel_slides[heroIndex]!,
        media_id: best.id,
        // Default to white logo on photo — safer contrast against
        // most photo content. Stage 3 would have picked green where
        // a green logo reads as brand; we can't replicate that here
        // without vision, so we ship the safe choice.
        logo_variant: "white",
      };
    }
  }

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
