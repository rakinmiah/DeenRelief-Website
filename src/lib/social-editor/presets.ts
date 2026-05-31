/**
 * Layer presets (Phase 10 wiring → 11).
 *
 * Seed EditorSlides from a news event's chosen content. The guided
 * builder shows the registry's TSX templates as polished previews; when
 * she picks one, `presetForTemplate` maps that templateId to a matching
 * LAYER preset so the canvas opens with the same look — now fully
 * editable. One preset per template the flow can reach, plus a generic
 * fallback.
 */

import {
  type EditorSlide,
  type Layer,
  type TextLayer,
  type ImageLayer,
  type ShapeLayer,
  type TextAlign,
  makeLayerId,
  DEFAULT_BOARD as B,
} from "./types";

/* ─── Brand tokens + fonts ────────────────────────────────────────── */
const C = {
  forest: "#163827",
  forestDeep: "#0F2A1C",
  forestSoft: "#1C432F",
  cream: "#F7F3E8",
  creamDim: "rgba(247,243,232,0.72)",
  amber: "#D4A843",
  goldDeep: "#A9842B", // gold ink on cream (J's URL)
  forestDim: "rgba(22,56,39,0.74)", // forest ink, dimmed (on cream bands)
  charcoal: "#1A1A2E",
  green: "#2D6A2E",
} as const;

const DISPLAY = "Bowlby One SC"; // heavy headline display
const SANS = "DM Sans";
const SERIF = "Source Serif 4";
const ANTON = "Anton"; // condensed display — the slide-library headline face
const BARLOW = "Barlow"; // the slide-library text face

/* ─── Layer factories ─────────────────────────────────────────────── */
function text(p: Partial<TextLayer> & Pick<TextLayer, "x" | "y" | "w" | "h" | "text">): TextLayer {
  return {
    id: makeLayerId(), type: "text", rotation: 0, opacity: 1, locked: false,
    fontFamily: SANS, fontSize: 40, fontWeight: 400, italic: false, underline: false,
    uppercase: false, color: C.cream, align: "left", lineHeight: 1.2, letterSpacing: 0,
    ...p,
  };
}
function image(p: Partial<ImageLayer> & Pick<ImageLayer, "x" | "y" | "w" | "h">): ImageLayer {
  return {
    id: makeLayerId(), type: "image", rotation: 0, opacity: 1, locked: false,
    src: "", objectFit: "cover", radius: 0, ...p,
  };
}
function shape(p: Partial<ShapeLayer> & Pick<ShapeLayer, "x" | "y" | "w" | "h" | "shape">): ShapeLayer {
  return {
    id: makeLayerId(), type: "shape", rotation: 0, opacity: 1, locked: false,
    fill: C.forest, stroke: C.forest, strokeWidth: 0, radius: 0, ...p,
  };
}
function brandMark(color: string = C.cream): TextLayer {
  return text({ x: 56, y: 52, w: 360, h: 40, text: "DEEN RELIEF", fontFamily: SANS, fontSize: 26, fontWeight: 800, uppercase: true, letterSpacing: 1, color });
}
function eyebrowLayer(t: string, y: number, color: string = C.amber): TextLayer {
  return text({ x: 56, y, w: 760, h: 36, text: t, fontSize: 22, fontWeight: 600, uppercase: true, letterSpacing: 3, color, opacity: 0.9 });
}
function rule(x: number, y: number, color: string = C.amber): ShapeLayer {
  return shape({ x, y, w: 96, h: 6, shape: "line", stroke: color, strokeWidth: 6 });
}
function footer(color: string = C.cream): TextLayer {
  return text({ x: 56, y: B - 70, w: B - 112, h: 30, text: "deenrelief.org · Charity No. 1158608", fontSize: 17, uppercase: true, letterSpacing: 3, color, opacity: 0.55 });
}
function slide(layers: Layer[], background: string): EditorSlide {
  return { id: `sl_${makeLayerId().slice(3)}`, width: B, height: B, background, layers };
}

/* ─── Content the presets read ────────────────────────────────────── */

/** The DR logo, resolved server-side from the active brand asset. The
 *  `aspect` (width / height) lets a preset size the logo box to the real
 *  artwork so `objectFit: contain` fills it with no centring gap. */
export type BrandLogo = { url: string; aspect: number };

export type SlideContent = {
  primary: string;
  secondary: string | null;
  imageUrl: string | null;
  eyebrow: string;
  /** Optional gold accent tail rendered on its own line below the cream
   *  headline — the library's two-tone treatment. */
  accent?: string | null;
  /** Auto-selected brand logo for this slide's background (on-dark for
   *  forest, on-light for cream). Null → fall back to a type lockup. */
  logo?: BrandLogo | null;
};

/* ─── Hero design system (faithful port of the Claude Design library) ─
 *
 * Five distinct Hero layouts (A–E), reconstructed 1:1 from the verified
 * `Deen Relief Slide Library` specs. Shared tokens: 78px uniform inset,
 * Anton 400 headlines (line-height 0.96), Barlow eyebrow/body, gold rule
 * + diamond motif. Geometry is board units (px on the 1080 board).
 */
const HPAD = 78; // uniform artboard inset (--pad)
const SCRIM =
  "linear-gradient(to bottom, rgba(15,42,28,0) 0%, rgba(15,42,28,0.55) 45%, rgba(15,42,28,0.94) 100%)";
const GLOW =
  "radial-gradient(120% 80% at 100% 0%, #1C432F 0%, rgba(28,67,47,0) 55%)";

function hEyebrow(t: string, x: number, y: number, w: number, align: TextAlign = "left"): TextLayer {
  return text({ x, y, w, h: 32, text: t, fontFamily: BARLOW, fontSize: 24, fontWeight: 700, uppercase: true, letterSpacing: 5, color: C.amber, align });
}
function hHead(t: string, x: number, y: number, w: number, h: number, size: number, align: TextAlign = "left", color: string = C.cream): TextLayer {
  return text({ x, y, w, h, text: t, fontFamily: ANTON, fontSize: size, fontWeight: 400, uppercase: true, lineHeight: 0.96, color, align });
}

/** Balance a headline into ~2 lines at the word break that most evens the
 *  halves — but only when it won't fit on one line. Respects manual "\n".
 *  Anton is very condensed (~0.46em/char), used to estimate the width. */
function balanceLines(t: string, maxWidth: number, size: number): string {
  if (t.includes("\n")) return t;
  if (t.length * size * 0.46 <= maxWidth) return t; // already fits one line
  const words = t.trim().split(/\s+/);
  if (words.length < 3) return t;
  let best = t;
  let bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(" ");
    const b = words.slice(i).join(" ");
    const diff = Math.abs(a.length - b.length);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = `${a}\n${b}`;
    }
  }
  return best;
}

/** A headline as a cream main block + an optional gold accent block on its
 *  own line(s) below — the library's signature two-tone treatment. */
function headlineBlock(
  primary: string,
  accent: string | null | undefined,
  x: number,
  y: number,
  w: number,
  size: number,
  align: TextAlign = "left"
): Layer[] {
  const lh = size * 0.96;
  const main = balanceLines(primary, w, size);
  const mainLines = main.split("\n").length;
  const layers: Layer[] = [
    hHead(main, x, y, w, Math.round(mainLines * lh + 12), size, align, C.cream),
  ];
  if (accent && accent.trim()) {
    const acc = balanceLines(accent, w, size);
    const accLines = acc.split("\n").length;
    layers.push(
      hHead(acc, x, Math.round(y + mainLines * lh), w, Math.round(accLines * lh + 12), size, align, C.amber)
    );
  }
  return layers;
}
/** The y of the baseline foot of a `headlineBlock` — mirrors its own
 *  line-counting math so callers can stack a rule/body directly beneath
 *  a headline that may wrap to two lines (or carry a gold accent tail). */
function headlineBottom(
  primary: string,
  accent: string | null | undefined,
  w: number,
  size: number,
  y: number
): number {
  const lh = size * 0.96;
  const mainLines = balanceLines(primary, w, size).split("\n").length;
  let lines = mainLines;
  if (accent && accent.trim()) lines += balanceLines(accent, w, size).split("\n").length;
  return Math.round(y + lines * lh);
}
function hBody(t: string, x: number, y: number, w: number, h: number): TextLayer {
  return text({ x, y, w, h, text: t, fontFamily: BARLOW, fontSize: 28, fontWeight: 400, lineHeight: 1.34, color: C.creamDim });
}
function goldBar(x: number, y: number, w: number = 64): ShapeLayer {
  return shape({ x, y, w, h: 3, shape: "rect", fill: C.amber });
}
function hTag(t: string, x: number, y: number, w: number, align: TextAlign = "left", opacity = 0.62): TextLayer {
  return text({ x, y, w, h: 30, text: t, fontFamily: BARLOW, fontSize: 23, fontWeight: 700, uppercase: true, letterSpacing: 4.5, color: C.cream, opacity, align });
}
/** Corner brand mark: the diamond + "DEEN RELIEF" vector type lockup.
 *  (The raster logo only rasterises in Satori at larger sizes — proven —
 *  so it can't be a small corner mark; it's reserved for a prominent
 *  placement, e.g. the CTA slide, where `resolveBrandLogo` feeds it.
 *  `_logo` is threaded through for that.) */
function wordmark(x: number, y: number, _logo: BrandLogo | null | undefined, color: string = C.cream): Layer[] {
  return [
    shape({ x, y: y + 4, w: 15, h: 15, shape: "rect", fill: C.amber, rotation: 45 }),
    text({ x: x + 32, y, w: 360, h: 30, text: "DEEN RELIEF", fontFamily: BARLOW, fontSize: 24, fontWeight: 700, uppercase: true, letterSpacing: 6, color }),
  ];
}

// HERO A — photo-led full-bleed
function heroPhotoFull(c: SlideContent): EditorSlide {
  const W = B - 2 * HPAD;
  const hasBody = !!c.secondary;
  // With supporting copy, drop the eyebrow/headline higher so the gold
  // rule + body have room to stack cleanly above the foot; without it,
  // sit the headline lower for a more grounded, photo-led feel.
  const eyebrowY = hasBody ? 590 : 643;
  const headY = eyebrowY + 52;
  const headSize = 84;
  const headBottom = headlineBottom(c.primary, c.accent, W, headSize, headY);
  const barY = headBottom + 28;
  return slide(
    [
      image({ x: 0, y: 0, w: B, h: B, src: c.imageUrl ?? "", objectFit: "cover" }),
      shape({ x: 0, y: 410, w: B, h: B - 410, shape: "rect", fill: SCRIM, locked: true }),
      ...wordmark(HPAD, HPAD, c.logo),
      hTag("Emergency Appeal", 582, HPAD + 6, 420, "right"),
      hEyebrow(c.eyebrow, HPAD, eyebrowY, W),
      ...headlineBlock(c.primary, c.accent, HPAD, headY, W, headSize),
      goldBar(HPAD, barY),
      ...(hasBody ? [hBody(c.secondary!, HPAD, barY + 24, W, 120)] : []),
    ],
    C.forest
  );
}

// HERO B — typography-only cover
function heroTypeCover(c: SlideContent): EditorSlide {
  return slide(
    [
      shape({ x: 0, y: 0, w: B, h: B, shape: "rect", fill: GLOW, locked: true }),
      ...wordmark(HPAD, HPAD, c.logo),
      hTag("Field Report", 582, HPAD + 6, 420, "right"),
      hEyebrow(c.eyebrow, HPAD, 383, 924),
      ...headlineBlock(c.primary, c.accent, HPAD, 443, 924, 132),
      goldBar(HPAD, 985),
      hTag("deenrelief.org", 162, 977, 600, "left", 0.8),
    ],
    C.forest
  );
}

// HERO C — top photo, bottom forest panel
function heroTopPanel(c: SlideContent): EditorSlide {
  const W = B - 2 * HPAD;
  const headSize = 80;
  const headY = 712;
  const headBottom = headlineBottom(c.primary, c.accent, W, headSize, headY);
  const barY = headBottom + 24;
  return slide(
    [
      image({ x: 0, y: 0, w: B, h: 594, src: c.imageUrl ?? "", objectFit: "cover" }),
      shape({ x: 0, y: 333, w: B, h: 261, shape: "rect", fill: SCRIM, locked: true }),
      ...wordmark(HPAD, HPAD, c.logo),
      hTag("Emergency Appeal", 582, HPAD + 6, 420, "right"),
      hEyebrow(c.eyebrow, HPAD, 660, W),
      ...headlineBlock(c.primary, c.accent, HPAD, headY, W, headSize),
      goldBar(HPAD, barY),
      ...(c.secondary ? [hBody(c.secondary, HPAD, barY + 22, W, 92)] : []),
    ],
    C.forest
  );
}

// HERO D — centered crest
function heroCrest(c: SlideContent): EditorSlide {
  const layers: Layer[] = [];
  layers.push(shape({ x: Math.round((B - 30) / 2), y: 310, w: 30, h: 30, shape: "rect", fill: C.amber, rotation: 45 }));
  layers.push(text({ x: HPAD, y: 356, w: B - 2 * HPAD, h: 30, text: "DEEN RELIEF", fontFamily: BARLOW, fontSize: 24, fontWeight: 700, uppercase: true, letterSpacing: 7, color: C.cream, align: "center" }));
  layers.push(hEyebrow(c.eyebrow, HPAD, 408, B - 2 * HPAD, "center"));
  layers.push(...headlineBlock(c.primary, c.accent, HPAD, 470, B - 2 * HPAD, 104, "center"));
  layers.push(goldBar(Math.round((B - 92) / 2), 714, 92));
  layers.push(text({ x: HPAD, y: 751, w: B - 2 * HPAD, h: 30, text: "A community response · 2026", fontFamily: BARLOW, fontSize: 23, fontWeight: 600, uppercase: true, letterSpacing: 4.5, color: C.creamDim, align: "center" }));
  return slide(layers, C.forest);
}

// HERO E — documentary caption bar over full-bleed photo
function heroCaption(c: SlideContent): EditorSlide {
  const W = B - 2 * HPAD;
  const headSize = 56;
  // Size the foot bar to the content: eyebrow + headline (1–2 lines) +
  // a credit line, all comfortably inside the bar above the board edge.
  const twoLine = headlineBottom(c.primary, c.accent, W, headSize, 0) > Math.round(headSize * 0.96) + 4;
  const barTop = twoLine ? 770 : 850;
  const headY = barTop + 86;
  const captionY = headlineBottom(c.primary, c.accent, W, headSize, headY) + 24;
  return slide(
    [
      image({ x: 0, y: 0, w: B, h: B, src: c.imageUrl ?? "", objectFit: "cover" }),
      ...wordmark(HPAD, HPAD, c.logo),
      hTag("Field Report", 582, HPAD + 6, 420, "right"),
      shape({ x: 0, y: barTop, w: B, h: B - barTop, shape: "rect", fill: C.forest, locked: true }),
      hEyebrow(c.eyebrow, HPAD, barTop + 42, W),
      ...headlineBlock(c.primary, c.accent, HPAD, headY, W, headSize),
      text({ x: HPAD, y: captionY, w: W, h: 30, text: "Photograph — Deen Relief field team", fontFamily: BARLOW, fontSize: 23, fontWeight: 500, color: C.creamDim }),
    ],
    C.forest
  );
}

// HERO F — Brand cover: gold-framed crest with the DEEN RELIEF wordmark,
// emblem diamond, and a centred brand column on a radial glow.
function heroLogoCover(c: SlideContent): EditorSlide {
  const cx = Math.round(B / 2);
  const FPAD = 46; // outer pad → the gold frame
  const frameW = B - 2 * FPAD; // 988
  const FGLOW =
    "radial-gradient(120% 70% at 50% 18%, #1C432F 0%, rgba(28,67,47,0) 60%)";
  // Centred brand column, both axes — measured top-down then nudged so the
  // optical centre lands mid-board. Gaps ≈ 34px between beats.
  const dia = 132;
  const colTop = 248; // tuned so the column is vertically centred in-frame
  const diaY = colTop;
  const eyebrowY = diaY + dia + 34; // 414
  const wmY = eyebrowY + 32 + 34; // 480 — eyebrow box + gap
  const wmSize = 124;
  const wmH = Math.round(2 * wmSize * 0.86 + 16); // 2 lines @ lh 0.86
  const ruleY = wmY + wmH + 34;
  const taglineY = ruleY + 3 + 34;
  // Gold emblem diamond + a thin forest inner keyline (inset 22 → ~88px).
  const innerDia = 88;
  return slide(
    [
      shape({ x: 0, y: 0, w: B, h: B, shape: "rect", fill: FGLOW, locked: true }),
      // The 2px gold frame — a transparent rect with a gold border.
      shape({ x: FPAD, y: FPAD, w: frameW, h: frameW, shape: "rect", fill: "transparent", stroke: "rgba(212,168,67,0.55)", strokeWidth: 2, locked: true }),
      // Emblem: gold diamond with a forest keyline diamond centred inside.
      shape({ x: Math.round(cx - dia / 2), y: diaY, w: dia, h: dia, shape: "rect", fill: C.amber, rotation: 45 }),
      shape({ x: Math.round(cx - innerDia / 2), y: Math.round(diaY + (dia - innerDia) / 2), w: innerDia, h: innerDia, shape: "rect", fill: "transparent", stroke: C.forest, strokeWidth: 2, rotation: 45 }),
      // Eyebrow (gold), wordmark (cream Anton, 2 lines), rule, tagline.
      text({ x: HPAD, y: eyebrowY, w: B - 2 * HPAD, h: 32, text: c.eyebrow, fontFamily: BARLOW, fontSize: 24, fontWeight: 700, uppercase: true, letterSpacing: 5, color: C.amber, align: "center" }),
      text({ x: HPAD, y: wmY, w: B - 2 * HPAD, h: wmH, text: "DEEN\nRELIEF", fontFamily: ANTON, fontSize: wmSize, fontWeight: 400, uppercase: true, lineHeight: 0.86, letterSpacing: 2.5, color: C.cream, align: "center" }),
      shape({ x: Math.round(cx - 48), y: ruleY, w: 96, h: 3, shape: "rect", fill: C.amber }),
      text({ x: HPAD, y: taglineY, w: B - 2 * HPAD, h: 30, text: "Relief with dignity · Since 2009", fontFamily: BARLOW, fontSize: 28, fontWeight: 600, uppercase: true, letterSpacing: 7, color: C.creamDim, align: "center" }),
      // Footer — pinned ~48px above the frame foot, 56px insets.
      shape({ x: FPAD + 56, y: B - FPAD - 48 - 9, w: 9, h: 9, shape: "rect", fill: C.amber, rotation: 45 }),
      text({ x: FPAD + 56 + 20, y: B - FPAD - 48 - 12, w: 480, h: 28, text: "Registered Charity 1180042", fontFamily: BARLOW, fontSize: 23, fontWeight: 600, uppercase: true, letterSpacing: 1.4, color: C.creamDim }),
      text({ x: B - FPAD - 56 - 420, y: B - FPAD - 48 - 12, w: 420, h: 28, text: "deenrelief.org", fontFamily: BARLOW, fontSize: 23, fontWeight: 600, uppercase: true, letterSpacing: 1.4, color: C.creamDim, align: "right" }),
    ],
    C.forest
  );
}

// HERO G — Asymmetric editorial: vertical gold spine, a rotated dateline
// reading upward, and a bottom-anchored headline block off to the right.
function heroSidebar(c: SlideContent): EditorSlide {
  const textX = 352;
  const W = B - textX - 64; // right inset 64 → ~664
  const headSize = 92;
  const headSecondary = c.secondary;
  // The block is bottom-anchored ~y912 and grows upward. Lay it out
  // bottom-up: body, rule, headline, eyebrow.
  const blockBottom = 912;
  const bodyH = 120;
  const bodyW = 520;
  const bodyY = blockBottom - bodyH;
  const ruleY = bodyY - 16; // gold rule sits above the body
  // Headline block sits above the rule; size it from its line count.
  const headMain = balanceLines(c.primary, W, headSize);
  const headLines = headMain.split("\n").length + (c.accent && c.accent.trim() ? balanceLines(c.accent, W, headSize).split("\n").length : 0);
  const headH = Math.round(headLines * headSize * 0.96 + 12);
  const headY = ruleY - 26 - headH;
  const eyebrowY = headY - 26 - 32;
  // Vertical dateline: a text box rotated -90° so it reads upward. Box is
  // sized to the text; centred on the spine column (~x300).
  const dateBoxW = 240;
  const dateBoxH = 32;
  const dateCx = 300;
  const dateCy = 320; // optical centre of the rotated line
  return slide(
    [
      shape({ x: 0, y: 0, w: B, h: B, shape: "rect", fill: GLOW, locked: true }),
      // Vertical gold spine.
      shape({ x: 320, y: 168, w: 3, h: 744, shape: "rect", fill: C.amber, locked: true }),
      // Corner row: wordmark left, "Dispatch" tag right.
      ...wordmark(HPAD, HPAD, c.logo),
      hTag("Dispatch", B - HPAD - 420, HPAD + 6, 420, "right"),
      // Rotated dateline reading upward (rotation -90), gold.
      text({ x: Math.round(dateCx - dateBoxW / 2), y: Math.round(dateCy - dateBoxH / 2), w: dateBoxW, h: dateBoxH, text: "Gaza · 2026", fontFamily: BARLOW, fontSize: 23, fontWeight: 700, uppercase: true, letterSpacing: 8, color: C.amber, align: "center", rotation: -90 }),
      // Editorial block — eyebrow (creamDim, NOT gold), headline, rule, body.
      text({ x: textX, y: eyebrowY, w: W, h: 32, text: c.eyebrow, fontFamily: BARLOW, fontSize: 24, fontWeight: 700, uppercase: true, letterSpacing: 5, color: C.creamDim }),
      ...headlineBlock(c.primary, c.accent, textX, headY, W, headSize),
      goldBar(textX, ruleY, 64),
      ...(headSecondary
        ? [hBody(headSecondary, textX, bodyY + 13, bodyW, bodyH)]
        : []),
    ],
    C.forest
  );
}

// HERO H — Stat-led: a giant numeral as hero, an Anton label beneath, and
// two footnote beats pinned to the foot (left + right).
function heroStat(c: SlideContent): EditorSlide {
  const W = B - 2 * HPAD;
  // c.primary is the giant figure (e.g. "62K"); c.secondary is the label
  // (e.g. "PALESTINIANS\nKILLED IN GAZA.").
  const figure = c.primary;
  const figureSize = 400;
  const figureH = Math.round(figureSize * 0.78 + 20);
  const labelText = c.secondary ?? "";
  const labelSize = 58;
  const labelLines = labelText ? labelText.split("\n").length : 1;
  const labelH = Math.round(labelLines * labelSize * 0.96 + 12);
  // Centre the figure+label group around the board middle. Group: eyebrow
  // (32) + gap 10 + figure + gap 10 + label.
  const groupH = 32 + 10 + figureH + 10 + labelH;
  const groupTop = Math.round((B - groupH) / 2) - 20; // slight optical lift
  const eyebrowY = groupTop;
  const figureY = eyebrowY + 32 + 10;
  const labelY = figureY + figureH + 10;
  // Footnote beats pinned bottom (y = 1080 - 78 - height). Wide enough that
  // a two-word uppercase eyebrow ("AND STILL COUNTING") stays on one line —
  // at 230 it wrapped and collided with the caption beneath it.
  const beatW = 300;
  const beatH = 132;
  const beatY = B - 78 - beatH;
  const leftX = 78;
  const rightX = B - 78 - beatW; // 772
  return slide(
    [
      shape({ x: 0, y: 0, w: B, h: B, shape: "rect", fill: GLOW, locked: true }),
      ...wordmark(HPAD, HPAD, c.logo),
      hTag("Emergency Appeal", B - HPAD - 420, HPAD + 6, 420, "right"),
      // Centred column: eyebrow, giant figure, label.
      text({ x: HPAD, y: eyebrowY, w: W, h: 32, text: c.eyebrow, fontFamily: BARLOW, fontSize: 24, fontWeight: 700, uppercase: true, letterSpacing: 5, color: C.amber, align: "center" }),
      text({ x: HPAD, y: figureY, w: W, h: figureH, text: figure, fontFamily: ANTON, fontSize: figureSize, fontWeight: 400, uppercase: true, lineHeight: 0.78, letterSpacing: -4, color: C.amber, align: "center" }),
      ...(labelText
        ? [text({ x: HPAD, y: labelY, w: W, h: labelH, text: labelText, fontFamily: ANTON, fontSize: labelSize, fontWeight: 400, uppercase: true, lineHeight: 0.96, color: C.cream, align: "center" })]
        : []),
      // LEFT beat: tick, eyebrow line, body.
      shape({ x: leftX, y: beatY, w: 32, h: 3, shape: "rect", fill: C.amber }),
      text({ x: leftX, y: beatY + 16, w: beatW, h: 28, text: "Since Oct 2023", fontFamily: BARLOW, fontSize: 23, fontWeight: 600, uppercase: true, letterSpacing: 1.4, color: C.cream }),
      text({ x: leftX, y: beatY + 50, w: beatW, h: 70, text: "Verified by the Gaza Health Ministry.", fontFamily: BARLOW, fontSize: 23, fontWeight: 400, lineHeight: 1.26, color: C.creamDim }),
      // RIGHT beat: right-aligned tick, eyebrow line, body.
      shape({ x: rightX + beatW - 32, y: beatY, w: 32, h: 3, shape: "rect", fill: C.amber }),
      text({ x: rightX, y: beatY + 16, w: beatW, h: 28, text: "And still counting", fontFamily: BARLOW, fontSize: 23, fontWeight: 600, uppercase: true, letterSpacing: 1.4, color: C.cream, align: "right" }),
      text({ x: rightX, y: beatY + 50, w: beatW, h: 70, text: "The toll rises with every passing week.", fontFamily: BARLOW, fontSize: 23, fontWeight: 400, lineHeight: 1.26, color: C.creamDim, align: "right" }),
    ],
    C.forest
  );
}

// HERO I — Quote-led: an oversized open-quote, a large cream quote set tight
// beneath it, and a one-line attribution row (rule + name + role).
function heroQuote(c: SlideContent): EditorSlide {
  const W = B - 2 * HPAD;
  const quoteW = Math.min(W, 880);
  const quoteSize = 66;
  // Vertically-centred content stack: open-quote, quote, attribution.
  const markH = 150; // open-quote box clamped ~150 tall
  const quoteLines = Math.min(4, Math.max(1, Math.ceil((c.primary.length * quoteSize * 0.52) / quoteW)));
  const quoteH = Math.round(quoteLines * quoteSize * 1.14 + 16);
  const attrH = 40;
  const groupH = markH + 6 + quoteH + 30 + attrH;
  const groupTop = Math.round((B - groupH) / 2) + 10; // optical centre
  const markY = groupTop;
  const quoteY = markY + markH + 6;
  const attrY = quoteY + quoteH + 30;
  return slide(
    [
      shape({ x: 0, y: 0, w: B, h: B, shape: "rect", fill: GLOW, locked: true }),
      ...wordmark(HPAD, HPAD, c.logo),
      hTag("In Their Words", B - HPAD - 420, HPAD + 6, 420, "right"),
      // Oversized gold open-quote, clamped tall so the quote sits tight under.
      text({ x: HPAD - 6, y: markY, w: 260, h: markH, text: "“", fontFamily: ANTON, fontSize: 300, fontWeight: 400, lineHeight: 0.8, color: C.amber }),
      // The quote — all cream (no inline gold), Barlow 500.
      text({ x: HPAD, y: quoteY, w: quoteW, h: quoteH, text: c.primary, fontFamily: BARLOW, fontSize: quoteSize, fontWeight: 500, lineHeight: 1.14, color: C.cream }),
      // Attribution row: rule + name + role, on one line.
      goldBar(HPAD, attrY + 14, 52),
      text({ x: HPAD + 52 + 20, y: attrY, w: 360, h: attrH, text: c.secondary ?? "", fontFamily: BARLOW, fontSize: 28, fontWeight: 700, color: C.cream }),
    ],
    C.forest
  );
}

// HERO J — Framed two-tone: a gold-bordered card with a forest top panel
// (~70%) carrying the headline, and a cream bottom band (~30%) holding the
// support copy + URL in dark ink.
function heroCornerCard(c: SlideContent): EditorSlide {
  const FPAD = 40; // outer pad → the 1000×1000 frame
  const frameW = B - 2 * FPAD; // 1000
  const bandH = 300; // cream band ≈ 30%
  const bandY = B - FPAD - bandH; // ~740
  const inset = 56;
  const innerX = FPAD + inset;
  const innerW = frameW - 2 * inset; // 888
  const headSize = 96;
  // Headline is bottom-anchored in the forest panel, just above the band.
  const headMain = balanceLines(c.primary, innerW, headSize);
  const headLines = headMain.split("\n").length;
  const headH = Math.round(headLines * headSize * 0.96 + 16);
  const headY = bandY - 40 - headH; // 40px clear above the band
  // Topbar + eyebrow near the panel top.
  const barY = FPAD + inset;
  const eyebrowY = barY + 30 + 40;
  return slide(
    [
      // Forest base fills the whole frame; the cream band paints over the foot.
      shape({ x: FPAD, y: FPAD, w: frameW, h: frameW, shape: "rect", fill: C.forest, locked: true }),
      shape({ x: FPAD, y: bandY, w: frameW, h: bandH, shape: "rect", fill: C.cream, locked: true }),
      // Topbar: wordmark + "Palestine Appeal" tag.
      ...wordmark(innerX, barY, c.logo),
      hTag("Palestine Appeal", FPAD + frameW - inset - 420, barY + 6, 420, "right"),
      // Eyebrow (gold) + headline (cream, bottom-anchored in the forest panel).
      text({ x: innerX, y: eyebrowY, w: innerW, h: 32, text: c.eyebrow, fontFamily: BARLOW, fontSize: 24, fontWeight: 700, uppercase: true, letterSpacing: 5, color: C.amber }),
      text({ x: innerX, y: headY, w: innerW, h: headH, text: headMain, fontFamily: ANTON, fontSize: headSize, fontWeight: 400, uppercase: true, lineHeight: 0.96, color: C.cream }),
      // Cream band: dark support copy (left) + gold-deep URL (right).
      ...(c.secondary
        ? [text({ x: innerX, y: bandY + Math.round((bandH - 110) / 2), w: 540, h: 110, text: c.secondary, fontFamily: BARLOW, fontSize: 28, fontWeight: 400, lineHeight: 1.3, color: C.forestDim })]
        : []),
      text({ x: FPAD + frameW - inset - 420, y: bandY + Math.round((bandH - 52) / 2), w: 420, h: 52, text: "deenrelief.org", fontFamily: ANTON, fontSize: 44, fontWeight: 400, color: C.goldDeep, align: "right" }),
      // The 2px gold border framing the whole 1000×1000 card, on top.
      shape({ x: FPAD, y: FPAD, w: frameW, h: frameW, shape: "rect", fill: "transparent", stroke: C.amber, strokeWidth: 2, locked: true }),
    ],
    C.forest
  );
}

/* ─── Fact presets ────────────────────────────────────────────────── */
function factTypography(c: SlideContent): EditorSlide {
  return slide(
    [
      brandMark(C.forest),
      eyebrowLayer(c.eyebrow, 140, C.green),
      rule(64, 196),
      text({ x: 64, y: 248, w: B - 128, h: 560, text: c.primary, fontFamily: SANS, fontSize: 56, fontWeight: 800, lineHeight: 1.12, color: C.charcoal }),
      footer(C.charcoal),
    ],
    C.cream
  );
}
function factPhoto(c: SlideContent): EditorSlide {
  return slide(
    [
      image({ x: 0, y: 0, w: B, h: 560, src: c.imageUrl ?? "" }),
      shape({ x: 0, y: 560, w: B, h: B - 560, shape: "rect", fill: C.forest }),
      rule(56, 616),
      eyebrowLayer(c.eyebrow, 638),
      text({ x: 56, y: 686, w: B - 112, h: 300, text: c.primary, fontFamily: SANS, fontSize: 44, fontWeight: 800, lineHeight: 1.14, color: C.cream }),
    ],
    C.forest
  );
}

/* ─── Stat preset ─────────────────────────────────────────────────── */
function statHeadline(c: SlideContent): EditorSlide {
  return slide(
    [
      brandMark(),
      rule(64, 320),
      eyebrowLayer(c.eyebrow, 352),
      text({ x: 64, y: 404, w: B - 128, h: 420, text: c.primary, fontFamily: DISPLAY, fontSize: 64, fontWeight: 400, uppercase: true, lineHeight: 1.04, color: C.cream }),
      ...(c.secondary ? [text({ x: 64, y: 840, w: B - 128, h: 90, text: c.secondary, fontSize: 24, lineHeight: 1.4, color: C.cream, opacity: 0.82 })] : []),
      footer(),
    ],
    C.forest
  );
}

/* ─── Testimony presets ───────────────────────────────────────────── */
function testimonyQuote(c: SlideContent): EditorSlide {
  return slide(
    [
      brandMark(C.forest),
      text({ x: 56, y: 150, w: 200, h: 160, text: "“", fontFamily: SERIF, fontSize: 200, fontWeight: 700, color: C.amber, opacity: 0.5 }),
      text({ x: 64, y: 320, w: B - 128, h: 460, text: c.primary, fontFamily: SERIF, fontSize: 50, fontWeight: 600, lineHeight: 1.28, color: C.charcoal }),
      ...(c.secondary ? [text({ x: 64, y: B - 150, w: B - 128, h: 40, text: `— ${c.secondary}`, fontSize: 24, fontWeight: 600, color: C.green })] : []),
    ],
    C.cream
  );
}
function testimonyPortrait(c: SlideContent): EditorSlide {
  return slide(
    [
      image({ x: 0, y: 0, w: B, h: 600, src: c.imageUrl ?? "" }),
      shape({ x: 0, y: 600, w: B, h: B - 600, shape: "rect", fill: C.forest }),
      text({ x: 56, y: 648, w: B - 112, h: 280, text: `“${c.primary}”`, fontFamily: SERIF, fontSize: 38, fontWeight: 600, lineHeight: 1.3, color: C.cream }),
      ...(c.secondary ? [text({ x: 56, y: B - 120, w: B - 112, h: 40, text: `— ${c.secondary}`, fontSize: 22, fontWeight: 600, color: C.amber })] : []),
    ],
    C.forest
  );
}

/* ─── Response preset ─────────────────────────────────────────────── */
function responsePhoto(c: SlideContent): EditorSlide {
  return slide(
    [
      image({ x: 0, y: 0, w: B, h: 560, src: c.imageUrl ?? "" }),
      shape({ x: 0, y: 560, w: B, h: B - 560, shape: "rect", fill: C.forest }),
      rule(56, 616),
      eyebrowLayer("OUR RESPONSE", 638),
      text({ x: 56, y: 686, w: B - 112, h: 240, text: c.primary, fontFamily: SANS, fontSize: 40, fontWeight: 700, lineHeight: 1.18, color: C.cream }),
    ],
    C.forest
  );
}

/* ─── CTA preset ──────────────────────────────────────────────────── */
function ctaDonate(c: SlideContent): EditorSlide {
  return slide(
    [
      brandMark(),
      text({ x: 80, y: 360, w: B - 160, h: 300, text: c.primary, fontFamily: DISPLAY, fontSize: 80, fontWeight: 400, uppercase: true, lineHeight: 1.02, color: C.cream, align: "center" }),
      shape({ x: B / 2 - 200, y: 720, w: 400, h: 92, shape: "rect", fill: C.amber, radius: 46 }),
      text({ x: B / 2 - 200, y: 748, w: 400, h: 48, text: "DONATE NOW", fontFamily: SANS, fontSize: 34, fontWeight: 800, uppercase: true, letterSpacing: 1, color: C.forest, align: "center" }),
      text({ x: 80, y: 980, w: B - 160, h: 36, text: "deenrelief.org/donate", fontSize: 22, uppercase: true, letterSpacing: 3, color: C.cream, opacity: 0.6, align: "center" }),
    ],
    C.forest
  );
}

/* ─── Map a chosen template → a layer preset ──────────────────────── */
export function presetForTemplate(templateId: string, c: SlideContent): EditorSlide {
  const id = templateId;
  // Faithful Hero library (A–E). Specific ids first so "hero-a" doesn't
  // get swallowed by the generic "hero" match.
  if (id.includes("hero-a")) return heroPhotoFull(c);
  if (id.includes("hero-b")) return heroTypeCover(c);
  if (id.includes("hero-c")) return heroTopPanel(c);
  if (id.includes("hero-d")) return heroCrest(c);
  if (id.includes("hero-e")) return heroCaption(c);
  if (id.includes("hero-f")) return heroLogoCover(c);
  if (id.includes("hero-g")) return heroSidebar(c);
  if (id.includes("hero-h")) return heroStat(c);
  if (id.includes("hero-i")) return heroQuote(c);
  if (id.includes("hero-j")) return heroCornerCard(c);
  if (id.includes("hero-typography")) return heroTypeCover(c);
  if (id.includes("hero-panel")) return heroTopPanel(c);
  if (id.includes("hero")) return heroPhotoFull(c);
  if (id.includes("fact-photo")) return factPhoto(c);
  if (id.includes("fact")) return factTypography(c);
  if (id.includes("stat")) return statHeadline(c);
  if (id.includes("testimony-portrait")) return testimonyPortrait(c);
  if (id.includes("testimony")) return testimonyQuote(c);
  if (id.includes("response")) return responsePhoto(c);
  if (id.includes("cta")) return ctaDonate(c);
  // Fallback — a clean typographic slide.
  return factTypography(c);
}

/** A blank closing CTA used when the flow is skipped. */
export function defaultCta(headline: string, eyebrow: string): EditorSlide {
  return ctaDonate({ primary: headline, secondary: null, imageUrl: null, eyebrow });
}
