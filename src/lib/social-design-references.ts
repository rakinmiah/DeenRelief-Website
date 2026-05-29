/**
 * Curated design references fed to Stage 1 (strategy brief).
 *
 * Phase 5c — the user asked: "if we chose some of the strongest
 * references, would feeding them to the Claude API result in
 * stronger creation?" The answer is yes. Claude Opus 4.7's vision
 * can absorb design references as few-shot examples.
 *
 * Previously the social-audit findings only existed as prose in
 * SOCIAL_AUDIT_4o.md — Claude never SAW the posts. Now Stage 1 gets
 * a curated set of reference briefs (text + optional PNG) every time
 * it writes a strategy brief, so the model pattern-matches against
 * actual high-performing editorial discipline instead of just our
 * descriptions of it.
 *
 * Each reference is keyed to one or more `arc` values so we only
 * surface the relevant ones — e.g. Charity:Water's manifesto only
 * shows up for `manifesto` arcs, MSF's "Remember Us" surfaces for
 * `quiet_dignity`, `testimony`, and `evidence` arcs.
 *
 * Adding a PNG:
 *   1. Drop a screenshot of the reference post into
 *      /public/social-references/<id>.png
 *   2. The Stage 1 wiring picks it up automatically and sends it as
 *      a vision image block to Claude.
 *   3. No code change required — `imagePath` is computed from `id`.
 *
 * Without a PNG, only the structured brief text is sent — still much
 * stronger than nothing, but adding screenshots unlocks the vision
 * pattern-match which is where the real lift comes from.
 */

import type Anthropic from "@anthropic-ai/sdk";
import path from "node:path";
import { promises as fs } from "node:fs";

/** A reference is keyed to one or more arc values so Stage 1 only
 *  sees the references that actually inform the brief it's writing. */
type Arc =
  | "evidence"
  | "hero_image"
  | "quiet_dignity"
  | "testimony"
  | "before_after"
  | "awareness_petition"
  | "manifesto";

export type DesignReference = {
  /** Stable kebab-case ID. Used as the PNG filename. */
  id: string;
  /** Account + post handle as it appears on Instagram. */
  source: string;
  /** Engagement signal — what makes this a benchmark. */
  metric: string;
  /** One-line summary of the format / conceit. */
  conceit: string;
  /** 3–6 short bullets describing what this post does that DR's
   *  packets currently don't. Phrased as imperatives Claude can
   *  internalise — "open with the quote", "let the photo carry it",
   *  "restraint over urgency-theatre", etc. */
  steal: string[];
  /** Which strategy_brief.arc values this reference informs. */
  arcs: Arc[];
};

/* ─── The curated reference set ─────────────────────────────────── */
/* These are anchored by the audit captured in SOCIAL_AUDIT_4o.md /
 * SOCIAL_AUDIT_4y.md. Each entry is a benchmark Claude should
 * pattern-match against when its brief targets the listed arcs. */

export const DESIGN_REFERENCES: DesignReference[] = [
  {
    id: "msf-remember-us",
    source: "@medecinssansfrontieres · 'Remember Us' Gaza post",
    metric: "327,000 likes — the highest-engagement humanitarian post of 2023",
    conceit:
      "A handwritten quote from Dr Mahmoud Abu Nujaila ('We did what we could. Remember us.') rendered in serif italic over a dim, reverent photo. Caption opens with the quote in full and credits Dr Abu Nujaila by name; the slides are typographically restrained and let the testimony carry every frame.",
    steal: [
      "Open with the QUOTE in quotation marks, not a setup sentence.",
      "Name the source within the first 30 words — 'These words were written by Dr. Mahmoud Abu Nujaila on the night of...'",
      "Restraint beats urgency-theatre. No 'DONATE NOW' caps. No exclamation points.",
      "Hashtag CTA pair ('#ceasefirenow #freepalestine'), not a URL pill.",
      "Serif italic display face for the title — Lora not Bowlby.",
    ],
    arcs: ["quiet_dignity", "testimony", "evidence"],
  },
  {
    id: "ir-all-eyes-sudan",
    source: "@islamicreliefuk · 'All Eyes On Sudan' newspaper reel",
    metric: "9,200 likes — top-engagement Sudan post of January 2026",
    conceit:
      "A reel where someone holds up a printed broadsheet newspaper with the headline 'ALL EYES ON SUDAN'. The newspaper IS the post — the format invention is the headline-grabber. CTA is 'Comment PETITION → we'll DM you the link' (engagement, not money).",
    steal: [
      "Invent a FORMAT CONCEIT per story, don't just fill slide templates.",
      "ANGER is a permissible register — 'failed. failed. failed.'",
      "Comment-keyword CTA leverages the IG algorithm — different muscle than 'link in bio'.",
      "External quoted partner (named) pulls in authority/celebrity capital.",
      "Petition / signal posts are a distinct mode — no donation tiers, no price ladder.",
    ],
    arcs: ["awareness_petition", "evidence"],
  },
  {
    id: "ir-eid-prayers",
    source: "@islamicreliefuk · 'Wondering how to perform Eid prayers?' carousel",
    metric: "Festival-time signature post, Eid al-Adha 1447AH",
    conceit:
      "8-slide explainer carousel. Cover slide is a cinematic motion-blurred photo of a man kneeling in worship, surrounded by standing figures in white thobes. Title in WHITE SERIF ITALIC ('Eid prayers?' italicised for emphasis). Small Hijri-calendar eyebrow ('Eid al-Adha 1447AH · @islamicreliefuk'). Swipe-cue tag at the bottom of the cover.",
    steal: [
      "Serif italic display for contemplative/religious content — Lora not Bowlby.",
      "Cinematic dim photography with motion blur conveys life + reverence simultaneously.",
      "Hijri calendar dating ('1447AH') as cultural signalling alongside Gregorian.",
      "Explainer carousel format ≠ appeal carousel. No tiers, no donation CTA. Useful info only.",
      "Swipe-cue tag on the cover slide ('Here's how →') teaches the reader to swipe — lifts engagement.",
    ],
    arcs: ["quiet_dignity", "manifesto"],
  },
  {
    id: "charity-water-manifesto",
    source: "@charitywater · 'HI, WE'RE CHARITY: WATER' identity reel",
    metric: "1,500 likes — aspirational tier, masterclass manifesto structure",
    conceit:
      "Cinematic close-up reel of a boy drinking from a glass of water; soft lens flares; eyes looking up. Yellow hand-painted BRUSH SCRIPT overlay 'HI, / WE'RE / CHARITY: WATER' (stacked). White sans-serif sub-text: 'If we lost you at charity, we get it.' (self-aware). Caption is a 4-chapter manifesto with each chapter = one declarative claim + one sentence of specific proof.",
    steal: [
      "Manifesto chapter pattern — 'We believe X. That means Y.' Each chapter is one short declarative claim + one sentence of granular proof.",
      "Self-aware voice ('If we lost you at charity, we get it') acknowledges donor skepticism.",
      "Specifics replace claims — 'GPS coordinates, photos and stories' / '20 million people through 171,000 projects in 29 countries'. Every claim has granular proof.",
      "4-slide carousel where each slide IS one chapter is the cleanest translation.",
      "Brush-script for brand-identity moments — character-rich, not cold.",
    ],
    arcs: ["manifesto"],
  },
  {
    id: "muslim-hands-qurbani",
    source: "@muslimhandsuk · 'YOUR QURBANI in YEMEN' portrait post",
    metric: "Donor-action signature post — proof of delivery, restrained copy",
    conceit:
      "Ground-level portrait of two young Yemeni girls in leopard-print abayas, holding a Muslim Hands branded canvas bag (visible logo — proof of delivery). Display type 'YOUR QURBANI in YEMEN' in chunky white display caps, top-left positioned, with shadow drop. Hierarchy: YOUR small, QURBANI huge, IN YEMEN medium. Caption is exactly two sentences ('Your generosity helped spread the joy... May Allah accept your Qurbani and reward you immensely, amin'). The image carries the post.",
    steal: [
      "'YOUR' possessive opener — implicates the donor as agent ('YOUR sacrifices', 'YOUR Qurbani'). Much stronger than 'Help families'.",
      "Type positioned to RESPECT the subject's face — leave space.",
      "Branded aid visible in beneficiary's hand — proof of delivery without sanctimony.",
      "SPARE copy — two sentences. The image does the work.",
      "Cultural specificity (terracotta wall, skullcap) > stock-photo neutrality.",
    ],
    arcs: ["hero_image", "before_after"],
  },
  {
    id: "unicef-restraint",
    source: "@unicef · 'From Great Grandmother to Great Granddaughter' Darfur post",
    metric: "1,400 likes — institutional benchmark for generational-impact framing",
    conceit:
      "Multi-generational family portrait in Darfur, Sudan — grandmother, mother, and children seated together on a colourful traditional rug, makeshift textile backdrop. UNICEF photo credit small bottom-left. Below the photo, a cream panel with cyan headline 'FROM GREAT GRANDMOTHER TO GREAT GRANDDAUGHTER' + black body 'The stories of four generations of a family that has been impacted by war in Darfur, Sudan' + UNICEF for every child logo. Caption opens 'Twenty years ago, a great grandmother witnessed violence and displacement in Darfur, Sudan. Today, her great granddaughter is seeing the same.' The two-line then/now framing IS the emotional architecture.",
    steal: [
      "ONE subject per frame. Tight crop. The viewer's eye has somewhere to rest.",
      "Eyebrow tag (date + location) at the top — anchors the photo in time and place.",
      "Short overlay sentence, not a headline. Let the image speak.",
      "Verifiable institutional sources cited in the caption ('— UNICEF · 25 May 2026').",
      "No exclamation points. No 'URGENT'. The restraint signals authority.",
    ],
    arcs: ["quiet_dignity", "evidence", "hero_image"],
  },
];

/** Pick the references that inform Claude's brief for this arc. We
 *  cap at 3 to keep token cost predictable and to avoid overloading
 *  Claude with conflicting patterns — three strong references are
 *  more useful than six muddled ones. Order is preserved from the
 *  curated list (which is ordered by relevance per arc). */
export function selectReferencesForArc(arc: Arc): DesignReference[] {
  return DESIGN_REFERENCES.filter((r) => r.arcs.includes(arc)).slice(0, 3);
}

/** Render a reference as a concise text brief Claude can read.
 *  Used both inline in the Stage 1 prompt AND as the text caption
 *  that accompanies the PNG image block (so Claude knows what it's
 *  looking at). */
export function formatReferenceBrief(ref: DesignReference): string {
  const steal = ref.steal.map((s) => `    • ${s}`).join("\n");
  return `${ref.source}  [${ref.metric}]
  CONCEIT: ${ref.conceit}
  STEAL:
${steal}`;
}

/** Build the vision-input blocks for Stage 1. For each selected
 *  reference, we send:
 *    - A text block introducing the reference (source + metric)
 *    - An image block (the PNG screenshot) IF /public/social-references/<id>.png exists
 *    - A text block with the conceit + steal bullets
 *
 *  When the PNG doesn't exist we send the brief without the image
 *  block. The text-only version is still useful — Claude can reason
 *  about the conceit even without seeing the post — but the image
 *  block is where the real pattern-match unlock comes from.
 *
 *  Returns an array of blocks ready to splice into the Stage 1
 *  user message (text + image, in reading order).
 */
export async function buildReferenceVisionBlocks(
  references: DesignReference[]
): Promise<
  Array<Anthropic.Messages.TextBlockParam | Anthropic.Messages.ImageBlockParam>
> {
  const blocks: Array<
    Anthropic.Messages.TextBlockParam | Anthropic.Messages.ImageBlockParam
  > = [];

  for (const ref of references) {
    const imageBlock = await tryLoadReferencePng(ref.id);
    blocks.push({
      type: "text",
      text: `── REFERENCE: ${ref.source} ──\n${ref.metric}`,
    });
    if (imageBlock) blocks.push(imageBlock);
    blocks.push({
      type: "text",
      text: `CONCEIT: ${ref.conceit}\n\nWHAT TO STEAL:\n${ref.steal
        .map((s) => `  • ${s}`)
        .join("\n")}`,
    });
  }

  return blocks;
}

/** Try to load /public/social-references/<id>.{png|jpg|jpeg|webp}
 *  as a base64 image block. Returns null if no matching file exists
 *  — non-fatal so the reference text still flows through. */
async function tryLoadReferencePng(
  id: string
): Promise<Anthropic.Messages.ImageBlockParam | null> {
  // Resolve via cwd() — works in Next.js server context (route
  // handlers run with cwd set to the project root in both dev and
  // production builds).
  const dir = path.join(process.cwd(), "public", "social-references");

  // Anthropic's image block accepts image/jpeg, image/png, image/gif,
  // and image/webp. We try the common extensions in priority order;
  // first hit wins. PNG is preferred for the brand assets but JPG is
  // what Instagram serves, so most captured references will be JPG.
  const variants: Array<{ ext: string; mime: Anthropic.Messages.Base64ImageSource["media_type"] }> = [
    { ext: "png", mime: "image/png" },
    { ext: "jpg", mime: "image/jpeg" },
    { ext: "jpeg", mime: "image/jpeg" },
    { ext: "webp", mime: "image/webp" },
  ];

  for (const { ext, mime } of variants) {
    try {
      const buf = await fs.readFile(path.join(dir, `${id}.${ext}`));
      return {
        type: "image",
        source: {
          type: "base64",
          media_type: mime,
          data: buf.toString("base64"),
        },
      };
    } catch {
      // Try next extension.
    }
  }
  return null;
}
