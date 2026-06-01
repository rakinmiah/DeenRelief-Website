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
// Top-down scrim so the wordmark + corner tag stay legible over a bright
// photo (the fix-pass discipline: chrome always sits on protected ground).
const TOP_SCRIM =
  "linear-gradient(to bottom, rgba(15,42,28,0.82) 0%, rgba(15,42,28,0.5) 45%, rgba(15,42,28,0) 100%)";
const GLOW =
  "radial-gradient(120% 80% at 100% 0%, #1C432F 0%, rgba(28,67,47,0) 55%)";

/** A top scrim band (default 230px) behind the corner chrome on photo
 *  heroes. Locked so it isn't grabbed when editing. */
function topScrim(h = 230): ShapeLayer {
  return shape({ x: 0, y: 0, w: B, h, shape: "rect", fill: TOP_SCRIM, locked: true });
}

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
      // Bottom scrim (taller + darker so the whole headline sits protected)
      // and a top scrim so the corner chrome stays legible over bright sky.
      shape({ x: 0, y: 366, w: B, h: B - 366, shape: "rect", fill: SCRIM, locked: true }),
      topScrim(),
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
      // Standfirst in the lower-right — fills the old void and balances the
      // left-weighted headline (right-aligned, anchored above the footer).
      ...(c.secondary
        ? [text({ x: B - HPAD - 540, y: 866, w: 540, h: 88, text: c.secondary, fontFamily: BARLOW, fontSize: 27, fontWeight: 400, lineHeight: 1.34, color: C.creamDim, align: "right" })]
        : []),
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
      topScrim(),
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

// HERO D — centered crest: a thin enclosing keyline frame, a larger emblem
// diamond with a forest inner keyline, and a tightened symmetrical column —
// reads as an authoritative cover, not floating text.
function heroCrest(c: SlideContent): EditorSlide {
  const cx = Math.round(B / 2);
  const W = B - 2 * HPAD;
  const dia = 46;
  const innerDia = 30;
  const layers: Layer[] = [];
  // Enclosing 2px gold keyline frame (988×988), inset 46 like F.
  layers.push(shape({ x: 46, y: 46, w: B - 92, h: B - 92, shape: "rect", fill: "transparent", stroke: "rgba(212,168,67,0.55)", strokeWidth: 2, locked: true }));
  // Emblem: gold diamond + a forest keyline diamond centred inside.
  layers.push(shape({ x: Math.round(cx - dia / 2), y: 300, w: dia, h: dia, shape: "rect", fill: C.amber, rotation: 45 }));
  layers.push(shape({ x: Math.round(cx - innerDia / 2), y: Math.round(300 + (dia - innerDia) / 2), w: innerDia, h: innerDia, shape: "rect", fill: "transparent", stroke: C.forest, strokeWidth: 2, rotation: 45 }));
  layers.push(text({ x: HPAD, y: 378, w: W, h: 30, text: "DEEN RELIEF", fontFamily: BARLOW, fontSize: 24, fontWeight: 700, uppercase: true, letterSpacing: 7, color: C.cream, align: "center" }));
  layers.push(hEyebrow(c.eyebrow, HPAD, 428, W, "center"));
  layers.push(...headlineBlock(c.primary, c.accent, HPAD, 488, W, 104, "center"));
  layers.push(goldBar(Math.round((B - 92) / 2), 726, 92));
  layers.push(text({ x: HPAD, y: 763, w: W, h: 30, text: "A community response · 2026", fontFamily: BARLOW, fontSize: 23, fontWeight: 600, uppercase: true, letterSpacing: 4.5, color: C.creamDim, align: "center" }));
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
      topScrim(),
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
  const W = B - textX - HPAD; // right inset 78 → 650
  const headSize = 88;
  const hasBody = !!c.secondary;
  // Vertically-centred editorial block (eyebrow → headline → rule → body),
  // so there's no empty upper-right. Measure the core, then centre it.
  const headMain = balanceLines(c.primary, W, headSize);
  const headLines = headMain.split("\n").length + (c.accent && c.accent.trim() ? balanceLines(c.accent, W, headSize).split("\n").length : 0);
  const headH = Math.round(headLines * headSize * 0.96 + 12);
  const eyebrowH = 32, gap1 = 22, gap2 = 26, ruleH = 3, gap3 = 24;
  const bodyH = hasBody ? 100 : 0;
  const coreH = eyebrowH + gap1 + headH + gap2 + ruleH + (hasBody ? gap3 + bodyH : 0);
  const eyebrowY = Math.round((B - coreH) / 2);
  const headY = eyebrowY + eyebrowH + gap1;
  const ruleY = headY + headH + gap2;
  const bodyY = ruleY + ruleH + gap3;
  // Vertical dateline (rotated -90, reads upward), centred on the board and
  // sitting just left of the gold spine (x320).
  const dateBoxW = 260, dateBoxH = 32, dateCx = 300, dateCy = Math.round(B / 2);
  return slide(
    [
      shape({ x: 0, y: 0, w: B, h: B, shape: "rect", fill: GLOW, locked: true }),
      // Vertical gold spine.
      shape({ x: 320, y: 168, w: 3, h: 744, shape: "rect", fill: C.amber, locked: true }),
      // Corner row: wordmark left, "Dispatch" tag right.
      ...wordmark(HPAD, HPAD, c.logo),
      hTag("Dispatch", B - HPAD - 420, HPAD + 6, 420, "right"),
      // Rotated dateline reading upward (rotation -90), gold, centred on spine.
      text({ x: Math.round(dateCx - dateBoxW / 2), y: Math.round(dateCy - dateBoxH / 2), w: dateBoxW, h: dateBoxH, text: "Gaza · 2026", fontFamily: BARLOW, fontSize: 23, fontWeight: 700, uppercase: true, letterSpacing: 8, color: C.amber, align: "center", rotation: -90 }),
      // Editorial block — eyebrow (creamDim, NOT gold), headline, rule, body.
      text({ x: textX, y: eyebrowY, w: W, h: 32, text: c.eyebrow, fontFamily: BARLOW, fontSize: 24, fontWeight: 700, uppercase: true, letterSpacing: 5, color: C.creamDim }),
      ...headlineBlock(c.primary, c.accent, textX, headY, W, headSize),
      goldBar(textX, ruleY, 64),
      ...(hasBody ? [hBody(c.secondary!, textX, bodyY, W, bodyH)] : []),
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
  // Centre the figure+label group around the board middle. The eyebrow→figure
  // gap is generous: the 400px Anton numeral (lineHeight 0.78) overflows its
  // line box upward, so a small gap lets it merge into the eyebrow above.
  const eyeGap = 60;
  const groupH = 32 + eyeGap + figureH + 10 + labelH;
  const groupTop = Math.round((B - groupH) / 2) - 14; // slight optical lift
  const eyebrowY = groupTop;
  const figureY = eyebrowY + 32 + eyeGap;
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
  const quoteW = Math.min(W, 884);
  const quoteSize = 66;
  // Open-quote up top; quote beneath; an optional italic-gold accent tail
  // (the closest faithful port of the inline gold — layers are per-layer
  // colour, so the emphasis lands on its own line); attribution anchored
  // into the lower third over a gold rule so the bottom doesn't read empty.
  const markY = 250;
  const markH = 150;
  const quoteY = markY + markH + 4;
  const quoteLines = Math.min(4, Math.max(1, Math.ceil((c.primary.length * quoteSize * 0.52) / quoteW)));
  const quoteH = Math.round(quoteLines * quoteSize * 1.16);
  const hasAccent = !!(c.accent && c.accent.trim());
  const accentY = quoteY + quoteH + 2;
  const accentH = hasAccent ? Math.round(quoteSize * 1.16 + 8) : 0;
  const attrY = 856;
  return slide(
    [
      shape({ x: 0, y: 0, w: B, h: B, shape: "rect", fill: GLOW, locked: true }),
      ...wordmark(HPAD, HPAD, c.logo),
      hTag("In Their Words", B - HPAD - 420, HPAD + 6, 420, "right"),
      // Oversized gold open-quote, clamped tall so the quote sits tight under.
      text({ x: HPAD - 6, y: markY, w: 260, h: markH, text: "“", fontFamily: ANTON, fontSize: 300, fontWeight: 400, lineHeight: 0.8, color: C.amber }),
      // The quote — cream Barlow 500.
      text({ x: HPAD, y: quoteY, w: quoteW, h: quoteH, text: c.primary, fontFamily: BARLOW, fontSize: quoteSize, fontWeight: 500, lineHeight: 1.16, color: C.cream }),
      // Optional italic-gold accent phrase on its own line.
      ...(hasAccent
        ? [text({ x: HPAD, y: accentY, w: quoteW, h: accentH, text: c.accent!, fontFamily: BARLOW, fontSize: quoteSize, fontWeight: 500, italic: true, lineHeight: 1.16, color: C.amber })]
        : []),
      // Attribution: gold rule + name/role, anchored low.
      goldBar(HPAD, attrY, 64),
      text({ x: HPAD, y: attrY + 22, w: 760, h: 40, text: c.secondary ?? "", fontFamily: BARLOW, fontSize: 28, fontWeight: 700, color: C.cream }),
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
  const barY = FPAD + inset;
  // Eyebrow hugs the headline (both bottom-anchored in the forest panel),
  // so there's no dead gap mid-panel — the space above reads as intentional.
  const eyebrowY = headY - 46;
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

// HERO K — Split diptych: photo on the left half, a forest text panel on the
// right carrying eyebrow + headline + support (editorial magazine-cover feel).
function heroSplitDiptych(c: SlideContent): EditorSlide {
  const half = Math.round(B / 2); // 540
  const pad = 64;
  const panelX = half + pad; // 604
  const panelW = B - panelX - pad; // 412
  const headSize = 60;
  const headMain = balanceLines(c.primary, panelW, headSize);
  const headLines = headMain.split("\n").length + (c.accent && c.accent.trim() ? balanceLines(c.accent, panelW, headSize).split("\n").length : 0);
  const headH = Math.round(headLines * headSize * 0.96 + 12);
  const hasBody = !!c.secondary;
  const bodyH = hasBody ? 150 : 0;
  const eyebrowH = 30, gap1 = 18, gap2 = 22, ruleH = 3, gap3 = 20;
  const coreH = eyebrowH + gap1 + headH + gap2 + ruleH + (hasBody ? gap3 + bodyH : 0);
  const coreTop = Math.round((B - coreH) / 2) + 20;
  const eyebrowY = coreTop;
  const headY = eyebrowY + eyebrowH + gap1;
  const ruleY = headY + headH + gap2;
  const bodyY = ruleY + ruleH + gap3;
  return slide(
    [
      image({ x: 0, y: 0, w: half, h: B, src: c.imageUrl ?? "", objectFit: "cover" }),
      shape({ x: half, y: 0, w: B - half, h: B, shape: "rect", fill: C.forest, locked: true }),
      ...wordmark(panelX, HPAD, c.logo),
      text({ x: panelX, y: eyebrowY, w: panelW, h: eyebrowH, text: c.eyebrow, fontFamily: BARLOW, fontSize: 21, fontWeight: 700, uppercase: true, letterSpacing: 3.5, color: C.amber }),
      ...headlineBlock(c.primary, c.accent, panelX, headY, panelW, headSize),
      goldBar(panelX, ruleY, 56),
      ...(hasBody ? [hBody(c.secondary!, panelX, bodyY, panelW, bodyH)] : []),
    ],
    C.forest
  );
}

// HERO L — Lower-third broadcast: full-bleed photo, a gold "LIVE APPEAL"
// kicker chip top-left, headline in the lower third on a strong gradient, a
// gold rule and a location·date proof tag (proof-and-proximity system).
function heroBroadcast(c: SlideContent): EditorSlide {
  const W = B - 2 * HPAD;
  const headSize = 84;
  const tagY = B - HPAD - 30; // proof tag (location · date)
  const ruleY = tagY - 22;
  const headMain = balanceLines(c.primary, W, headSize);
  const headLines = headMain.split("\n").length + (c.accent && c.accent.trim() ? balanceLines(c.accent, W, headSize).split("\n").length : 0);
  const headH = Math.round(headLines * headSize * 0.96 + 12);
  const headY = ruleY - 28 - headH;
  const chipW = 226, chipH = 46;
  return slide(
    [
      image({ x: 0, y: 0, w: B, h: B, src: c.imageUrl ?? "", objectFit: "cover" }),
      shape({ x: 0, y: 360, w: B, h: B - 360, shape: "rect", fill: SCRIM, locked: true }),
      topScrim(),
      // Gold "LIVE APPEAL" kicker chip (forest text), top-left.
      shape({ x: HPAD, y: HPAD - 2, w: chipW, h: chipH, shape: "rect", fill: C.amber, radius: 5, locked: true }),
      text({ x: HPAD, y: HPAD - 2 + 12, w: chipW, h: 24, text: "Live Appeal", fontFamily: BARLOW, fontSize: 21, fontWeight: 800, uppercase: true, letterSpacing: 3, color: C.forest, align: "center" }),
      // Wordmark, right-aligned top.
      text({ x: B - HPAD - 360, y: HPAD + 6, w: 360, h: 30, text: "DEEN RELIEF", fontFamily: BARLOW, fontSize: 24, fontWeight: 700, uppercase: true, letterSpacing: 6, color: C.cream, align: "right" }),
      // Headline (lower third) + gold rule + location·date proof tag.
      ...headlineBlock(c.primary, c.accent, HPAD, headY, W, headSize),
      goldBar(HPAD, ruleY, 64),
      text({ x: HPAD, y: tagY, w: W, h: 30, text: c.eyebrow, fontFamily: BARLOW, fontSize: 24, fontWeight: 700, uppercase: true, letterSpacing: 4, color: C.amber }),
    ],
    C.forest
  );
}

// HERO M — Inset card: full-bleed photo with a gold-bordered forest card
// floated in the lower portion holding eyebrow + headline + support.
function heroInsetCard(c: SlideContent): EditorSlide {
  const cardX = HPAD; // 78
  const cardW = B - 2 * HPAD; // 924
  const cardPad = 54;
  const innerX = cardX + cardPad;
  const innerW = cardW - 2 * cardPad; // 816
  const headSize = 72;
  const headMain = balanceLines(c.primary, innerW, headSize);
  const headLines = headMain.split("\n").length + (c.accent && c.accent.trim() ? balanceLines(c.accent, innerW, headSize).split("\n").length : 0);
  const headH = Math.round(headLines * headSize * 0.96 + 12);
  const hasBody = !!c.secondary;
  const bodyH = hasBody ? 96 : 0;
  const contentH = 32 + 18 + headH + (hasBody ? 20 + bodyH : 0);
  const cardH = contentH + 2 * cardPad;
  const cardY = B - HPAD - cardH;
  const eyebrowY = cardY + cardPad;
  const headY = eyebrowY + 32 + 18;
  const bodyY = headY + headH + 20;
  return slide(
    [
      image({ x: 0, y: 0, w: B, h: B, src: c.imageUrl ?? "", objectFit: "cover" }),
      topScrim(),
      ...wordmark(HPAD, HPAD, c.logo),
      hTag("Emergency Appeal", B - HPAD - 420, HPAD + 6, 420, "right"),
      // Card: solid forest with a gold keyline border.
      shape({ x: cardX, y: cardY, w: cardW, h: cardH, shape: "rect", fill: C.forest, radius: 10, locked: true }),
      shape({ x: cardX, y: cardY, w: cardW, h: cardH, shape: "rect", fill: "transparent", stroke: C.amber, strokeWidth: 2, radius: 10, locked: true }),
      // Card content.
      text({ x: innerX, y: eyebrowY, w: innerW, h: 32, text: c.eyebrow, fontFamily: BARLOW, fontSize: 24, fontWeight: 700, uppercase: true, letterSpacing: 5, color: C.amber }),
      ...headlineBlock(c.primary, c.accent, innerX, headY, innerW, headSize),
      ...(hasBody ? [hBody(c.secondary!, innerX, bodyY, innerW, bodyH)] : []),
    ],
    C.forest
  );
}

// HERO N — Window crop: an intimate rounded-rect photo window on a generous
// forest field, with eyebrow + headline beneath (the brand's signature crop).
function heroWindowCrop(c: SlideContent): EditorSlide {
  const winX = HPAD, winY = 150, winW = B - 2 * HPAD, winH = 552;
  const W = B - 2 * HPAD;
  const headSize = 76;
  const eyebrowY = winY + winH + 52;
  const headY = eyebrowY + 32 + 16;
  return slide(
    [
      shape({ x: 0, y: 0, w: B, h: B, shape: "rect", fill: GLOW, locked: true }),
      ...wordmark(HPAD, HPAD, c.logo),
      hTag("Field Note", B - HPAD - 420, HPAD + 6, 420, "right"),
      // Rounded photo window + a thin gold keyline frame.
      image({ x: winX, y: winY, w: winW, h: winH, src: c.imageUrl ?? "", objectFit: "cover", radius: 18 }),
      shape({ x: winX, y: winY, w: winW, h: winH, shape: "rect", fill: "transparent", stroke: "rgba(212,168,67,0.45)", strokeWidth: 2, radius: 18, locked: true }),
      // Eyebrow + headline beneath the window.
      hEyebrow(c.eyebrow, HPAD, eyebrowY, W),
      ...headlineBlock(c.primary, c.accent, HPAD, headY, W, headSize),
    ],
    C.forest
  );
}

// HERO O — Duotone poster: the photo in a forest→gold duotone with a bold
// centred Anton headline overlaid, the wordmark, and a caption.
function heroDuotonePoster(c: SlideContent): EditorSlide {
  const W = B - 2 * HPAD;
  const headSize = 108;
  const headMain = balanceLines(c.primary, W, headSize);
  const headLines = headMain.split("\n").length + (c.accent && c.accent.trim() ? balanceLines(c.accent, W, headSize).split("\n").length : 0);
  const headH = Math.round(headLines * headSize * 0.96 + 12);
  const eyebrowY = Math.round((B - headH) / 2) - 70;
  const headY = eyebrowY + 32 + 22;
  // Duotone ≈ a mono photo under a forest→gold gradient wash; a soft veil
  // keeps the centred headline legible. (True gradient-map duotone isn't a
  // sharp primitive, so this is the faithful approximation.)
  const DUO = "linear-gradient(150deg, rgba(15,42,28,0.92) 0%, rgba(22,56,39,0.62) 48%, rgba(169,132,43,0.7) 100%)";
  const VEIL = "linear-gradient(to bottom, rgba(15,42,28,0) 0%, rgba(15,42,28,0.55) 50%, rgba(15,42,28,0) 100%)";
  return slide(
    [
      image({ x: 0, y: 0, w: B, h: B, src: c.imageUrl ?? "", objectFit: "cover", filter: "mono" }),
      shape({ x: 0, y: 0, w: B, h: B, shape: "rect", fill: DUO, locked: true }),
      shape({ x: 0, y: headY - 60, w: B, h: headH + 180, shape: "rect", fill: VEIL, locked: true }),
      topScrim(180),
      ...wordmark(HPAD, HPAD, c.logo),
      hTag("Emergency Appeal", B - HPAD - 420, HPAD + 6, 420, "right"),
      hEyebrow(c.eyebrow, HPAD, eyebrowY, W, "center"),
      ...headlineBlock(c.primary, c.accent, HPAD, headY, W, headSize, "center"),
      text({ x: HPAD, y: B - HPAD - 26, w: W, h: 30, text: "Deen Relief · 100% Donation Policy · deenrelief.org", fontFamily: BARLOW, fontSize: 21, fontWeight: 600, uppercase: true, letterSpacing: 3, color: C.creamDim, align: "center" }),
    ],
    C.forest
  );
}

/* ─── New middle-slide types (v1 — Phase 2 replaces with the polished 10) ─ */

// DONATION TIERS — "what your gift does": a heading + an impact ladder
// (amount + impact line per tier) on a forest field. Tier rows are sensible
// DR defaults the SMM edits on the canvas.
function tiersLadder(c: SlideContent): EditorSlide {
  const W = B - 2 * HPAD;
  const heading = c.primary || "Where your gift goes";
  const tiers = [
    { amt: "£30", label: "Emergency food parcel for a family" },
    { amt: "£100", label: "Winter shelter kit" },
    { amt: "£250", label: "Urgent medical aid" },
  ];
  const headSize = 76;
  const headY = 232;
  const headMain = balanceLines(heading, W, headSize);
  const headH = Math.round(headMain.split("\n").length * headSize * 0.96 + 12);
  const ruleY = headY + headH + 24;
  const rowsTop = ruleY + 56;
  const rowGap = 150;
  const layers: Layer[] = [
    shape({ x: 0, y: 0, w: B, h: B, shape: "rect", fill: GLOW, locked: true }),
    ...wordmark(HPAD, HPAD, c.logo),
    hTag("Palestine Appeal", B - HPAD - 420, HPAD + 6, 420, "right"),
    hHead(headMain, HPAD, headY, W, headH, headSize, "left", C.cream),
    goldBar(HPAD, ruleY, 64),
  ];
  tiers.forEach((t, i) => {
    const y = rowsTop + i * rowGap;
    layers.push(text({ x: HPAD, y, w: 240, h: 96, text: t.amt, fontFamily: ANTON, fontSize: 88, fontWeight: 400, color: C.amber }));
    layers.push(text({ x: HPAD + 256, y: y + 22, w: W - 256, h: 64, text: t.label, fontFamily: BARLOW, fontSize: 30, fontWeight: 500, lineHeight: 1.2, color: C.cream }));
    if (i < tiers.length - 1) layers.push(shape({ x: HPAD, y: y + rowGap - 28, w: W, h: 1, shape: "rect", fill: "rgba(247,243,232,0.16)", locked: true }));
  });
  layers.push(footer(C.creamDim));
  return slide(layers, C.forest);
}

// BEFORE / AFTER — a then-and-now contrast: two stat columns split by a gold
// divider, an optional headline, and a source line. Figures are defaults.
function beforeAfter(c: SlideContent): EditorSlide {
  const cx = Math.round(B / 2);
  const W = B - 2 * HPAD;
  const before = { eyebrow: "Before · Oct 2023", num: "36", label: "Hospitals functioning" };
  const after = { eyebrow: "Now · May 2026", num: "7", label: "Hospitals functioning" };
  const numY = 432;
  const numSize = 196;
  const colW = Math.round((B - 2 * HPAD - 80) / 2); // 422
  const leftX = HPAD;
  const rightX = cx + 40;
  const layers: Layer[] = [
    shape({ x: 0, y: 0, w: B, h: B, shape: "rect", fill: GLOW, locked: true }),
    ...wordmark(HPAD, HPAD, c.logo),
    hTag("Palestine Appeal", B - HPAD - 420, HPAD + 6, 420, "right"),
    ...(c.primary
      ? [hHead(balanceLines(c.primary, W, 60), HPAD, 232, W, 80, 60, "center", C.cream)]
      : []),
    shape({ x: cx - 1, y: 384, w: 2, h: 320, shape: "rect", fill: C.amber, locked: true }),
    // BEFORE column.
    text({ x: leftX, y: numY - 54, w: colW, h: 32, text: before.eyebrow, fontFamily: BARLOW, fontSize: 22, fontWeight: 700, uppercase: true, letterSpacing: 3, color: C.creamDim, align: "center" }),
    text({ x: leftX, y: numY, w: colW, h: 200, text: before.num, fontFamily: ANTON, fontSize: numSize, fontWeight: 400, lineHeight: 0.9, color: C.cream, align: "center" }),
    text({ x: leftX, y: numY + 196, w: colW, h: 60, text: before.label, fontFamily: BARLOW, fontSize: 25, fontWeight: 600, uppercase: true, letterSpacing: 1, color: C.creamDim, align: "center" }),
    // AFTER column.
    text({ x: rightX, y: numY - 54, w: colW, h: 32, text: after.eyebrow, fontFamily: BARLOW, fontSize: 22, fontWeight: 700, uppercase: true, letterSpacing: 3, color: C.amber, align: "center" }),
    text({ x: rightX, y: numY, w: colW, h: 200, text: after.num, fontFamily: ANTON, fontSize: numSize, fontWeight: 400, lineHeight: 0.9, color: C.amber, align: "center" }),
    text({ x: rightX, y: numY + 196, w: colW, h: 60, text: after.label, fontFamily: BARLOW, fontSize: 25, fontWeight: 600, uppercase: true, letterSpacing: 1, color: C.creamDim, align: "center" }),
    text({ x: HPAD, y: B - 140, w: W, h: 30, text: c.secondary || "Source: WHO · 2026", fontFamily: BARLOW, fontSize: 22, fontWeight: 500, color: C.creamDim, align: "center" }),
  ];
  return slide(layers, C.forest);
}

// MULTI-STAT — "by the numbers": three numbered figures stacked on forest.
function multiStatStack(c: SlideContent): EditorSlide {
  const W = B - 2 * HPAD;
  const heading = c.primary || "By the numbers";
  const rows = [
    { num: "2.3M", label: "facing acute food insecurity" },
    { num: "1.9M", label: "displaced from their homes" },
    { num: "90%", label: "of water unsafe to drink" },
  ];
  const headSize = 72;
  const headY = 232;
  const headH = Math.round(headSize * 0.96 + 12);
  const ruleY = headY + headH + 22;
  const rowsTop = ruleY + 52;
  const rowGap = 156;
  const layers: Layer[] = [
    shape({ x: 0, y: 0, w: B, h: B, shape: "rect", fill: GLOW, locked: true }),
    ...wordmark(HPAD, HPAD, c.logo),
    hTag("By the Numbers", B - HPAD - 420, HPAD + 6, 420, "right"),
    hHead(balanceLines(heading, W, headSize), HPAD, headY, W, headH, headSize, "left", C.cream),
    goldBar(HPAD, ruleY, 64),
  ];
  rows.forEach((r, i) => {
    const y = rowsTop + i * rowGap;
    layers.push(text({ x: HPAD, y: y + 8, w: 60, h: 36, text: `0${i + 1}`, fontFamily: BARLOW, fontSize: 22, fontWeight: 700, color: C.amber }));
    layers.push(text({ x: HPAD + 76, y, w: 300, h: 96, text: r.num, fontFamily: ANTON, fontSize: 84, fontWeight: 400, color: C.cream }));
    layers.push(text({ x: HPAD + 410, y: y + 28, w: W - 410, h: 64, text: r.label, fontFamily: BARLOW, fontSize: 28, fontWeight: 500, lineHeight: 1.2, color: C.creamDim }));
    if (i < rows.length - 1) layers.push(shape({ x: HPAD, y: y + rowGap - 30, w: W, h: 1, shape: "rect", fill: "rgba(247,243,232,0.16)", locked: true }));
  });
  return slide(layers, C.forest);
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

/* ─── CTA design system (closing donate slides, A–J) ───────────────── *
 *
 * Ten faithful "Call to Action" closing slides. Every one ends with the
 * unmistakable ask: a gold (or forest) DONATE pill and the deenrelief.org
 * URL. Shared discipline with the Hero system: 78px insets, Anton
 * uppercase asks (line-height 0.96), Barlow eyebrow/body, gold rule +
 * diamond motif. Geometry is board units on the 1080 board.
 */

/** Reusable DONATE pill — a gold rect (radius 6) with centred forest text.
 *  `dark` flips it to a forest pill with cream text (for gold fields). The
 *  pill is two layers so the text sits crisp on the fill; both returned. */
function donatePill(
  x: number,
  y: number,
  w: number,
  label: string = "DONATE NOW",
  dark: boolean = false
): Layer[] {
  const h = 96;
  return [
    shape({ x, y, w, h, shape: "rect", fill: dark ? C.forest : C.amber, radius: 6, locked: true }),
    text({ x, y: y + Math.round((h - 36) / 2), w, h: 40, text: label, fontFamily: BARLOW, fontSize: 30, fontWeight: 800, uppercase: true, letterSpacing: 3, color: dark ? C.cream : C.forest, align: "center" }),
  ];
}

// CTA A — Type-led: forest field, wordmark top, big Anton ask, a gold rule,
// a gold DONATE NOW pill, and the deenrelief.org foot. The plain workhorse
// close — no photo, all typographic authority.
function ctaForestType(c: SlideContent): EditorSlide {
  const W = B - 2 * HPAD;
  const ask = c.primary || "Stand with them today.";
  const headSize = 96;
  const headMain = balanceLines(ask, W, headSize);
  const headLines = headMain.split("\n").length;
  const headH = Math.round(headLines * headSize * 0.96 + 16);
  const headY = 360;
  const ruleY = headY + headH + 30;
  const pillW = 420;
  const pillY = ruleY + 56;
  return slide(
    [
      shape({ x: 0, y: 0, w: B, h: B, shape: "rect", fill: GLOW, locked: true }),
      ...wordmark(HPAD, HPAD, c.logo),
      hTag("Emergency Appeal", B - HPAD - 420, HPAD + 6, 420, "right"),
      hEyebrow(c.eyebrow || "Donate today", HPAD, headY - 50, W),
      hHead(headMain, HPAD, headY, W, headH, headSize, "left", C.cream),
      goldBar(HPAD, ruleY, 64),
      ...donatePill(HPAD, pillY, pillW),
      text({ x: HPAD, y: B - HPAD - 30, w: W, h: 30, text: "deenrelief.org · Every gift counts", fontFamily: BARLOW, fontSize: 24, fontWeight: 700, uppercase: true, letterSpacing: 4, color: C.amber }),
    ],
    C.forest
  );
}

// CTA B — Gold inverted: a full gold field with forest ink. Forest wordmark,
// a big Anton ask in forest, a forest DONATE pill with cream text, and a
// forest deenrelief.org foot. The loud, high-contrast close.
function ctaGoldInverted(c: SlideContent): EditorSlide {
  const W = B - 2 * HPAD;
  const ask = c.primary || "Stand with them today.";
  const headSize = 100;
  const headMain = balanceLines(ask, W, headSize);
  const headLines = headMain.split("\n").length;
  const headH = Math.round(headLines * headSize * 0.96 + 16);
  const headY = 372;
  const ruleY = headY + headH + 30;
  const pillW = 440;
  const pillY = ruleY + 56;
  return slide(
    [
      // Forest wordmark on the gold field.
      shape({ x: HPAD, y: HPAD + 4, w: 15, h: 15, shape: "rect", fill: C.forest, rotation: 45 }),
      text({ x: HPAD + 32, y: HPAD, w: 360, h: 30, text: "DEEN RELIEF", fontFamily: BARLOW, fontSize: 24, fontWeight: 700, uppercase: true, letterSpacing: 6, color: C.forest }),
      text({ x: B - HPAD - 420, y: HPAD + 6, w: 420, h: 30, text: c.eyebrow || "Emergency Appeal", fontFamily: BARLOW, fontSize: 23, fontWeight: 700, uppercase: true, letterSpacing: 4.5, color: C.forest, opacity: 0.7, align: "right" }),
      hHead(headMain, HPAD, headY, W, headH, headSize, "left", C.forest),
      shape({ x: HPAD, y: ruleY, w: 64, h: 3, shape: "rect", fill: C.forest }),
      ...donatePill(HPAD, pillY, pillW, "DONATE NOW", true),
      text({ x: HPAD, y: B - HPAD - 30, w: W, h: 30, text: "deenrelief.org · 100% donation policy", fontFamily: BARLOW, fontSize: 24, fontWeight: 700, uppercase: true, letterSpacing: 4, color: C.forest, opacity: 0.78 }),
    ],
    C.amber
  );
}

// CTA C — Photo lower-third: full-bleed photo, a top scrim for the chrome
// and a strong bottom scrim, the ask in the lower third, a gold rule, a gold
// DONATE pill and the deenrelief.org foot.
function ctaPhotoLowerThird(c: SlideContent): EditorSlide {
  const W = B - 2 * HPAD;
  const ask = c.primary || "Stand with them today.";
  const headSize = 80;
  const pillW = 400;
  const pillH = 96;
  const pillY = B - HPAD - pillH;
  const urlY = pillY - 0; // url sits to the right of the pill, vertically centred
  const headMain = balanceLines(ask, W, headSize);
  const headLines = headMain.split("\n").length;
  const headH = Math.round(headLines * headSize * 0.96 + 14);
  const ruleY = pillY - 36;
  const headY = ruleY - 26 - headH;
  return slide(
    [
      image({ x: 0, y: 0, w: B, h: B, src: c.imageUrl ?? "", objectFit: "cover" }),
      shape({ x: 0, y: 360, w: B, h: B - 360, shape: "rect", fill: SCRIM, locked: true }),
      topScrim(),
      ...wordmark(HPAD, HPAD, c.logo),
      hTag("Emergency Appeal", B - HPAD - 420, HPAD + 6, 420, "right"),
      hEyebrow(c.eyebrow || "Donate today", HPAD, headY - 46, W),
      hHead(headMain, HPAD, headY, W, headH, headSize, "left", C.cream),
      goldBar(HPAD, ruleY, 64),
      ...donatePill(HPAD, pillY, pillW),
      text({ x: HPAD + pillW + 28, y: urlY + Math.round((pillH - 28) / 2), w: W - pillW - 28, h: 30, text: "deenrelief.org", fontFamily: BARLOW, fontSize: 26, fontWeight: 700, uppercase: true, letterSpacing: 2, color: C.cream }),
    ],
    C.forest
  );
}

// CTA D — Crest: centred gold diamond emblem (forest inner keyline like the
// hero crest), eyebrow, Anton ask centred, gold rule, centred DONATE pill,
// charity-no foot — inside a thin gold keyline frame (inset 46).
function ctaCrest(c: SlideContent): EditorSlide {
  const cx = Math.round(B / 2);
  const W = B - 2 * HPAD;
  const ask = c.primary || "Stand with them today.";
  const dia = 56;
  const innerDia = 36;
  const diaY = 240;
  const eyebrowY = diaY + dia + 40;
  const headSize = 92;
  const headMain = balanceLines(ask, W, headSize);
  const headLines = headMain.split("\n").length;
  const headH = Math.round(headLines * headSize * 0.96 + 14);
  const headY = eyebrowY + 44;
  const ruleY = headY + headH + 28;
  const pillW = 420;
  const pillX = Math.round(cx - pillW / 2);
  const pillY = ruleY + 44;
  return slide(
    [
      shape({ x: 0, y: 0, w: B, h: B, shape: "rect", fill: GLOW, locked: true }),
      // Enclosing 2px gold keyline frame (988×988), inset 46.
      shape({ x: 46, y: 46, w: B - 92, h: B - 92, shape: "rect", fill: "transparent", stroke: "rgba(212,168,67,0.55)", strokeWidth: 2, locked: true }),
      // Emblem: gold diamond + forest inner keyline diamond.
      shape({ x: Math.round(cx - dia / 2), y: diaY, w: dia, h: dia, shape: "rect", fill: C.amber, rotation: 45 }),
      shape({ x: Math.round(cx - innerDia / 2), y: Math.round(diaY + (dia - innerDia) / 2), w: innerDia, h: innerDia, shape: "rect", fill: "transparent", stroke: C.forest, strokeWidth: 2, rotation: 45 }),
      hEyebrow(c.eyebrow || "Emergency Appeal", HPAD, eyebrowY, W, "center"),
      hHead(headMain, HPAD, headY, W, headH, headSize, "center", C.cream),
      goldBar(Math.round(cx - 46), ruleY, 92),
      ...donatePill(pillX, pillY, pillW),
      text({ x: HPAD, y: B - HPAD - 30, w: W, h: 30, text: "deenrelief.org · Registered Charity 1180042", fontFamily: BARLOW, fontSize: 22, fontWeight: 600, uppercase: true, letterSpacing: 3, color: C.creamDim, align: "center" }),
    ],
    C.forest
  );
}

// CTA E — Split: photo on the left half, a forest panel on the right holding
// the ask, a gold rule, a DONATE pill and the deenrelief.org foot (the hero
// split-diptych layout, closed with a donate ask).
function ctaSplit(c: SlideContent): EditorSlide {
  const half = Math.round(B / 2); // 540
  const pad = 56;
  const panelX = half + pad; // 596
  const panelW = B - panelX - pad; // 428
  const ask = c.primary || "Stand with them today.";
  const headSize = 62;
  const headMain = balanceLines(ask, panelW, headSize);
  const headLines = headMain.split("\n").length;
  const headH = Math.round(headLines * headSize * 0.96 + 12);
  const eyebrowH = 30, gap1 = 18, gap2 = 24, ruleH = 3, gap3 = 38, pillH = 96;
  const coreH = eyebrowH + gap1 + headH + gap2 + ruleH + gap3 + pillH;
  const coreTop = Math.round((B - coreH) / 2);
  const eyebrowY = coreTop;
  const headY = eyebrowY + eyebrowH + gap1;
  const ruleY = headY + headH + gap2;
  const pillY = ruleY + ruleH + gap3;
  return slide(
    [
      image({ x: 0, y: 0, w: half, h: B, src: c.imageUrl ?? "", objectFit: "cover" }),
      shape({ x: half, y: 0, w: B - half, h: B, shape: "rect", fill: C.forest, locked: true }),
      ...wordmark(panelX, HPAD, c.logo),
      text({ x: panelX, y: eyebrowY, w: panelW, h: eyebrowH, text: c.eyebrow || "Donate today", fontFamily: BARLOW, fontSize: 21, fontWeight: 700, uppercase: true, letterSpacing: 3.5, color: C.amber }),
      hHead(headMain, panelX, headY, panelW, headH, headSize, "left", C.cream),
      goldBar(panelX, ruleY, 56),
      ...donatePill(panelX, pillY, panelW),
      text({ x: panelX, y: B - HPAD - 28, w: panelW, h: 30, text: "deenrelief.org", fontFamily: BARLOW, fontSize: 24, fontWeight: 700, uppercase: true, letterSpacing: 2, color: C.amber }),
    ],
    C.forest
  );
}

// CTA F — Stat-led: a giant Anton numeral (c.secondary or default "2.1M"),
// "need you now.", the ask line, a gold rule, a DONATE pill and the foot.
function ctaStatLed(c: SlideContent): EditorSlide {
  const W = B - 2 * HPAD;
  const figure = c.secondary || "2.1M";
  const ask = c.primary || "Stand with them today.";
  const figureSize = 300;
  const figureH = Math.round(figureSize * 0.82);
  const figureY = 196;
  const labelY = figureY + figureH + 6;
  const askY = labelY + 78;
  const askSize = 60;
  const askMain = balanceLines(ask, W, askSize);
  const askLines = askMain.split("\n").length;
  const askH = Math.round(askLines * askSize * 0.96 + 12);
  const ruleY = askY + askH + 26;
  const pillW = 420;
  const pillY = ruleY + 44;
  return slide(
    [
      shape({ x: 0, y: 0, w: B, h: B, shape: "rect", fill: GLOW, locked: true }),
      ...wordmark(HPAD, HPAD, c.logo),
      hTag("Emergency Appeal", B - HPAD - 420, HPAD + 6, 420, "right"),
      text({ x: HPAD, y: figureY, w: W, h: figureH, text: figure, fontFamily: ANTON, fontSize: figureSize, fontWeight: 400, uppercase: true, lineHeight: 0.82, letterSpacing: -4, color: C.amber, align: "center" }),
      text({ x: HPAD, y: labelY, w: W, h: 62, text: "NEED YOU NOW.", fontFamily: ANTON, fontSize: 56, fontWeight: 400, uppercase: true, lineHeight: 0.96, color: C.cream, align: "center" }),
      hHead(askMain, HPAD, askY, W, askH, askSize, "center", C.cream),
      goldBar(Math.round(B / 2 - 46), ruleY, 92),
      ...donatePill(Math.round(B / 2 - pillW / 2), pillY, pillW),
      text({ x: HPAD, y: B - HPAD - 28, w: W, h: 30, text: "deenrelief.org", fontFamily: BARLOW, fontSize: 24, fontWeight: 700, uppercase: true, letterSpacing: 3, color: C.amber, align: "center" }),
    ],
    C.forest
  );
}

// CTA G — Quote-led: a short gold open-quote, a one-line testimony, an
// attribution, then the ask line, a DONATE pill and the deenrelief.org foot.
function ctaQuoteLed(c: SlideContent): EditorSlide {
  const W = B - 2 * HPAD;
  const quote = "They have no one but us. Your gift is their lifeline.";
  const attribution = c.secondary || "Aid worker, Gaza";
  const ask = c.primary || "Stand with them today.";
  const markY = 196;
  const quoteY = markY + 150;
  const quoteSize = 54;
  const quoteLines = Math.min(3, Math.max(1, Math.ceil((quote.length * quoteSize * 0.5) / W)));
  const quoteH = Math.round(quoteLines * quoteSize * 1.18);
  const attrY = quoteY + quoteH + 18;
  const askSize = 78;
  const askMain = balanceLines(ask, W, askSize);
  const askLines = askMain.split("\n").length;
  const askH = Math.round(askLines * askSize * 0.96 + 12);
  const pillW = 420;
  const pillH = 96;
  const pillY = B - HPAD - pillH;
  const ruleY = pillY - 40;
  const askY = ruleY - 26 - askH;
  return slide(
    [
      shape({ x: 0, y: 0, w: B, h: B, shape: "rect", fill: GLOW, locked: true }),
      ...wordmark(HPAD, HPAD, c.logo),
      hTag("In Their Words", B - HPAD - 420, HPAD + 6, 420, "right"),
      text({ x: HPAD - 6, y: markY, w: 260, h: 150, text: "“", fontFamily: ANTON, fontSize: 240, fontWeight: 400, lineHeight: 0.8, color: C.amber }),
      text({ x: HPAD, y: quoteY, w: W, h: quoteH, text: quote, fontFamily: BARLOW, fontSize: quoteSize, fontWeight: 500, lineHeight: 1.18, color: C.cream }),
      text({ x: HPAD, y: attrY, w: W, h: 34, text: `— ${attribution}`, fontFamily: BARLOW, fontSize: 26, fontWeight: 700, color: C.creamDim }),
      hHead(askMain, HPAD, askY, W, askH, askSize, "left", C.cream),
      goldBar(HPAD, ruleY, 64),
      ...donatePill(HPAD, pillY, pillW),
      text({ x: HPAD + pillW + 28, y: pillY + Math.round((pillH - 28) / 2), w: W - pillW - 28, h: 30, text: "deenrelief.org", fontFamily: BARLOW, fontSize: 26, fontWeight: 700, uppercase: true, letterSpacing: 2, color: C.amber }),
    ],
    C.forest
  );
}

// CTA H — Urgency: forest, a gold "EVERY HOUR COUNTS" kicker chip top, a big
// ask, a location·date proximity tag, a gold rule, a DONATE pill + the foot.
function ctaUrgency(c: SlideContent): EditorSlide {
  const W = B - 2 * HPAD;
  const ask = c.primary || "Stand with them today.";
  const chipW = 320, chipH = 50;
  const chipY = HPAD + 70;
  const headSize = 100;
  const headMain = balanceLines(ask, W, headSize);
  const headLines = headMain.split("\n").length;
  const headH = Math.round(headLines * headSize * 0.96 + 16);
  const headY = chipY + chipH + 56;
  const tagY = headY + headH + 26;
  const ruleY = tagY + 44;
  const pillW = 420;
  const pillY = ruleY + 44;
  return slide(
    [
      shape({ x: 0, y: 0, w: B, h: B, shape: "rect", fill: GLOW, locked: true }),
      ...wordmark(HPAD, HPAD, c.logo),
      // Gold urgency kicker chip (forest text).
      shape({ x: HPAD, y: chipY, w: chipW, h: chipH, shape: "rect", fill: C.amber, radius: 5, locked: true }),
      text({ x: HPAD, y: chipY + Math.round((chipH - 24) / 2), w: chipW, h: 26, text: "Every hour counts", fontFamily: BARLOW, fontSize: 22, fontWeight: 800, uppercase: true, letterSpacing: 3, color: C.forest, align: "center" }),
      hHead(headMain, HPAD, headY, W, headH, headSize, "left", C.cream),
      text({ x: HPAD, y: tagY, w: W, h: 30, text: c.eyebrow || "Gaza · Right now", fontFamily: BARLOW, fontSize: 24, fontWeight: 700, uppercase: true, letterSpacing: 4, color: C.amber }),
      goldBar(HPAD, ruleY, 64),
      ...donatePill(HPAD, pillY, pillW, "DONATE NOW"),
      text({ x: HPAD + pillW + 28, y: pillY + Math.round((96 - 28) / 2), w: W - pillW - 28, h: 30, text: "deenrelief.org", fontFamily: BARLOW, fontSize: 26, fontWeight: 700, uppercase: true, letterSpacing: 2, color: C.cream }),
    ],
    C.forest
  );
}

// CTA I — Scan to give: forest, a "SCAN TO GIVE" heading, a ~300px cream
// rounded-square QR placeholder (bordered + a subtle inner grid), the ask
// beside it, a DONATE pill and the deenrelief.org foot.
function ctaScanToGive(c: SlideContent): EditorSlide {
  const W = B - 2 * HPAD;
  const ask = c.primary || "Stand with them today.";
  const qr = 320;
  const qrX = HPAD;
  const qrY = 400;
  // Subtle inner grid: a few thin forest lines inside the cream square.
  const gridLayers: Layer[] = [];
  const cells = 5;
  const cell = Math.round((qr - 48) / cells);
  const gx = qrX + 24, gy = qrY + 24;
  for (let i = 1; i < cells; i++) {
    gridLayers.push(shape({ x: gx + i * cell, y: gy, w: 1, h: cell * cells, shape: "rect", fill: "rgba(22,56,39,0.18)", locked: true }));
    gridLayers.push(shape({ x: gx, y: gy + i * cell, w: cell * cells, h: 1, shape: "rect", fill: "rgba(22,56,39,0.18)", locked: true }));
  }
  // A few "finder" blocks so it reads as a QR, not a blank grid.
  gridLayers.push(shape({ x: gx + 6, y: gy + 6, w: cell - 8, h: cell - 8, shape: "rect", fill: C.forest, radius: 3, locked: true }));
  gridLayers.push(shape({ x: gx + (cells - 1) * cell + 8, y: gy + 6, w: cell - 8, h: cell - 8, shape: "rect", fill: C.forest, radius: 3, locked: true }));
  gridLayers.push(shape({ x: gx + 6, y: gy + (cells - 1) * cell + 8, w: cell - 8, h: cell - 8, shape: "rect", fill: C.forest, radius: 3, locked: true }));
  const textX = qrX + qr + 56;
  const textW = B - HPAD - textX;
  const askSize = 64;
  const askMain = balanceLines(ask, textW, askSize);
  const askLines = askMain.split("\n").length;
  const askH = Math.round(askLines * askSize * 0.96 + 12);
  const pillW = textW;
  const pillY = qrY + qr - 96;
  return slide(
    [
      shape({ x: 0, y: 0, w: B, h: B, shape: "rect", fill: GLOW, locked: true }),
      ...wordmark(HPAD, HPAD, c.logo),
      hTag("Emergency Appeal", B - HPAD - 420, HPAD + 6, 420, "right"),
      hEyebrow(c.eyebrow || "Scan to give", HPAD, 246, W),
      hHead("SCAN TO GIVE", HPAD, 290, W, 92, 84, "left", C.cream),
      // QR placeholder: cream rounded square + gold keyline + inner grid.
      shape({ x: qrX, y: qrY, w: qr, h: qr, shape: "rect", fill: C.cream, radius: 18, locked: true }),
      shape({ x: qrX, y: qrY, w: qr, h: qr, shape: "rect", fill: "transparent", stroke: C.amber, strokeWidth: 3, radius: 18, locked: true }),
      ...gridLayers,
      // Ask + DONATE pill beside the QR.
      hHead(askMain, textX, qrY, textW, askH, askSize, "left", C.cream),
      ...donatePill(textX, pillY, pillW),
      text({ x: HPAD, y: B - HPAD - 30, w: W, h: 30, text: "deenrelief.org · Point your camera to donate", fontFamily: BARLOW, fontSize: 24, fontWeight: 700, uppercase: true, letterSpacing: 3, color: C.amber }),
    ],
    C.forest
  );
}

// CTA J — Wordmark card: a clean closing brand card. Gold keyline frame, the
// large DEEN RELIEF wordmark + emblem diamond, a short closing line, a DONATE
// line, and a "Registered Charity 1180042 · deenrelief.org" foot.
function ctaWordmarkCard(c: SlideContent): EditorSlide {
  const cx = Math.round(B / 2);
  const FPAD = 46;
  const frameW = B - 2 * FPAD; // 988
  const FGLOW =
    "radial-gradient(120% 70% at 50% 18%, #1C432F 0%, rgba(28,67,47,0) 60%)";
  const dia = 120;
  const diaY = 230;
  const innerDia = 80;
  const eyebrowY = diaY + dia + 36;
  const wmY = eyebrowY + 32 + 28;
  const wmSize = 116;
  const wmH = Math.round(2 * wmSize * 0.86 + 16);
  const ruleY = wmY + wmH + 30;
  const closeY = ruleY + 3 + 30;
  const pillW = 420;
  const pillY = closeY + 60;
  return slide(
    [
      shape({ x: 0, y: 0, w: B, h: B, shape: "rect", fill: FGLOW, locked: true }),
      // 2px gold frame.
      shape({ x: FPAD, y: FPAD, w: frameW, h: frameW, shape: "rect", fill: "transparent", stroke: "rgba(212,168,67,0.55)", strokeWidth: 2, locked: true }),
      // Emblem: gold diamond + forest inner keyline.
      shape({ x: Math.round(cx - dia / 2), y: diaY, w: dia, h: dia, shape: "rect", fill: C.amber, rotation: 45 }),
      shape({ x: Math.round(cx - innerDia / 2), y: Math.round(diaY + (dia - innerDia) / 2), w: innerDia, h: innerDia, shape: "rect", fill: "transparent", stroke: C.forest, strokeWidth: 2, rotation: 45 }),
      text({ x: HPAD, y: eyebrowY, w: B - 2 * HPAD, h: 32, text: c.eyebrow || "Stand with them today", fontFamily: BARLOW, fontSize: 24, fontWeight: 700, uppercase: true, letterSpacing: 5, color: C.amber, align: "center" }),
      text({ x: HPAD, y: wmY, w: B - 2 * HPAD, h: wmH, text: "DEEN\nRELIEF", fontFamily: ANTON, fontSize: wmSize, fontWeight: 400, uppercase: true, lineHeight: 0.86, letterSpacing: 2.5, color: C.cream, align: "center" }),
      shape({ x: Math.round(cx - 48), y: ruleY, w: 96, h: 3, shape: "rect", fill: C.amber }),
      text({ x: HPAD, y: closeY, w: B - 2 * HPAD, h: 34, text: c.primary || "Give what you can, today.", fontFamily: BARLOW, fontSize: 28, fontWeight: 600, color: C.creamDim, align: "center" }),
      ...donatePill(Math.round(cx - pillW / 2), pillY, pillW),
      // Foot: charity no (left) + URL (right), pinned above the frame.
      text({ x: FPAD + 56, y: B - FPAD - 48 - 12, w: 480, h: 28, text: "Registered Charity 1180042", fontFamily: BARLOW, fontSize: 23, fontWeight: 600, uppercase: true, letterSpacing: 1.4, color: C.creamDim }),
      text({ x: B - FPAD - 56 - 420, y: B - FPAD - 48 - 12, w: 420, h: 28, text: "deenrelief.org", fontFamily: BARLOW, fontSize: 23, fontWeight: 600, uppercase: true, letterSpacing: 1.4, color: C.creamDim, align: "right" }),
    ],
    C.forest
  );
}

/* ─── Big-Stat design system (one giant figure, A–J) ──────────────── *
 *
 * Ten "Stat" slides — each foregrounds a single colossal Anton numeral
 * (c.primary, e.g. "2.1M"), with a short label (c.secondary) and a small
 * tag (c.eyebrow). EVERY stat carries a source line. Shared discipline
 * with the Hero/CTA systems: 78px insets, Anton uppercase numerals
 * (overflow their line box upward → generous top gaps), Barlow text, the
 * gold rule + diamond motif. Geometry is board units on the 1080 board.
 */

/** A small source line — defaults to OCHA when none is supplied. */
function statSource(c: SlideContent): string {
  return (c.secondary && c.secondary.trim()) || "Source: OCHA · 2026";
}

// STAT A — Colossal: a centred, board-filling Anton numeral, an eyebrow
// above (generous gap so the numeral doesn't merge into it), a short label
// beneath, and a source foot.
function statColossal(c: SlideContent): EditorSlide {
  const W = B - 2 * HPAD;
  const figure = c.primary || "2.1M";
  const figureSize = 380;
  const figureH = Math.round(figureSize * 0.82 + 20);
  const labelText = "Now depend on humanitarian aid.";
  const labelSize = 50;
  const labelH = Math.round(labelSize * 0.96 + 12);
  const eyeGap = 64; // generous top gap above the numeral (see heroStat)
  const groupH = 32 + eyeGap + figureH + 14 + labelH;
  const groupTop = Math.round((B - groupH) / 2) - 8;
  const eyebrowY = groupTop;
  const figureY = eyebrowY + 32 + eyeGap;
  const labelY = figureY + figureH + 14;
  return slide(
    [
      shape({ x: 0, y: 0, w: B, h: B, shape: "rect", fill: GLOW, locked: true }),
      ...wordmark(HPAD, HPAD, c.logo),
      hTag("By the Numbers", B - HPAD - 420, HPAD + 6, 420, "right"),
      text({ x: HPAD, y: eyebrowY, w: W, h: 32, text: c.eyebrow || "By the numbers · Gaza", fontFamily: BARLOW, fontSize: 24, fontWeight: 700, uppercase: true, letterSpacing: 5, color: C.amber, align: "center" }),
      text({ x: HPAD, y: figureY, w: W, h: figureH, text: figure, fontFamily: ANTON, fontSize: figureSize, fontWeight: 400, uppercase: true, lineHeight: 0.82, letterSpacing: -4, color: C.amber, align: "center" }),
      text({ x: HPAD, y: labelY, w: W, h: labelH, text: labelText, fontFamily: ANTON, fontSize: labelSize, fontWeight: 400, uppercase: true, lineHeight: 0.96, color: C.cream, align: "center" }),
      text({ x: HPAD, y: B - HPAD - 28, w: W, h: 30, text: statSource(c), fontFamily: BARLOW, fontSize: 22, fontWeight: 600, uppercase: true, letterSpacing: 3, color: C.creamDim, align: "center" }),
    ],
    C.forest
  );
}

// STAT B — With context: a big numeral in the upper area, then a context
// sentence (Barlow body) beneath, and a source foot.
function statContext(c: SlideContent): EditorSlide {
  const W = B - 2 * HPAD;
  const figure = c.primary || "2.1M";
  const figureSize = 320;
  const figureH = Math.round(figureSize * 0.82);
  const figureY = 248;
  const labelY = figureY + figureH + 6;
  const labelSize = 54;
  const labelH = Math.round(labelSize * 0.96 + 12);
  const context = "Now depend on humanitarian aid to survive — food, water, shelter and medicine, delivered against the odds.";
  const ctxY = labelY + labelH + 34;
  return slide(
    [
      shape({ x: 0, y: 0, w: B, h: B, shape: "rect", fill: GLOW, locked: true }),
      ...wordmark(HPAD, HPAD, c.logo),
      hTag("By the Numbers", B - HPAD - 420, HPAD + 6, 420, "right"),
      hEyebrow(c.eyebrow || "By the numbers · Gaza", HPAD, figureY - 50, W),
      text({ x: HPAD, y: figureY, w: W, h: figureH, text: figure, fontFamily: ANTON, fontSize: figureSize, fontWeight: 400, uppercase: true, lineHeight: 0.82, letterSpacing: -4, color: C.amber }),
      text({ x: HPAD, y: labelY, w: W, h: labelH, text: "People in need.", fontFamily: ANTON, fontSize: labelSize, fontWeight: 400, uppercase: true, lineHeight: 0.96, color: C.cream }),
      goldBar(HPAD, ctxY - 28, 64),
      hBody(context, HPAD, ctxY, W, 160),
      text({ x: HPAD, y: B - HPAD - 28, w: W, h: 30, text: statSource(c), fontFamily: BARLOW, fontSize: 22, fontWeight: 600, uppercase: true, letterSpacing: 3, color: C.creamDim }),
    ],
    C.forest
  );
}

// STAT C — Bleeding numeral: an oversized Anton numeral intentionally
// bleeding off the right + bottom edges as a graphic, the label set against
// it on protected ground, a source foot. (Board overflow:hidden clips it.)
function statBleed(c: SlideContent): EditorSlide {
  const W = B - 2 * HPAD;
  const figure = c.primary || "2.1M";
  const figureSize = 620; // colossal — overflows the board by design
  const figureH = Math.round(figureSize * 0.82);
  // Bleed off the right and bottom: positioned so the numeral runs past the
  // board edges; the board's overflow:hidden crops it into a graphic.
  const figureX = 300;
  const figureY = 360;
  const labelText = "PEOPLE\nIN NEED.";
  const labelSize = 100;
  const labelH = Math.round(2 * labelSize * 0.92 + 12);
  const labelY = Math.round((B - labelH) / 2) - 10;
  return slide(
    [
      shape({ x: 0, y: 0, w: B, h: B, shape: "rect", fill: GLOW, locked: true }),
      // The bleeding numeral, set low in the stack so the label reads on top.
      text({ x: figureX, y: figureY, w: 1400, h: figureH, text: figure, fontFamily: ANTON, fontSize: figureSize, fontWeight: 400, uppercase: true, lineHeight: 0.82, letterSpacing: -10, color: "rgba(212,168,67,0.92)" }),
      ...wordmark(HPAD, HPAD, c.logo),
      hTag("By the Numbers", B - HPAD - 420, HPAD + 6, 420, "right"),
      hEyebrow(c.eyebrow || "By the numbers · Gaza", HPAD, labelY - 50, W),
      text({ x: HPAD, y: labelY, w: 620, h: labelH, text: labelText, fontFamily: ANTON, fontSize: labelSize, fontWeight: 400, uppercase: true, lineHeight: 0.92, color: C.cream }),
      text({ x: HPAD, y: B - HPAD - 28, w: W, h: 30, text: statSource(c), fontFamily: BARLOW, fontSize: 22, fontWeight: 600, uppercase: true, letterSpacing: 3, color: C.creamDim }),
    ],
    C.forest
  );
}

// STAT D — Over photo: full-bleed photo, a top scrim for the chrome and a
// strong bottom scrim, the stat + label in the lower third, a source foot.
function statPhoto(c: SlideContent): EditorSlide {
  const W = B - 2 * HPAD;
  const figure = c.primary || "2.1M";
  const figureSize = 260;
  const figureH = Math.round(figureSize * 0.82);
  const labelSize = 50;
  const labelH = Math.round(labelSize * 0.96 + 12);
  const sourceY = B - HPAD - 28;
  const labelY = sourceY - 24 - labelH;
  const figureY = labelY - figureH - 2;
  const eyebrowY = figureY - 44;
  return slide(
    [
      image({ x: 0, y: 0, w: B, h: B, src: c.imageUrl ?? "", objectFit: "cover" }),
      shape({ x: 0, y: 340, w: B, h: B - 340, shape: "rect", fill: SCRIM, locked: true }),
      topScrim(),
      ...wordmark(HPAD, HPAD, c.logo),
      hTag("By the Numbers", B - HPAD - 420, HPAD + 6, 420, "right"),
      hEyebrow(c.eyebrow || "By the numbers · Gaza", HPAD, eyebrowY, W),
      text({ x: HPAD, y: figureY, w: W, h: figureH, text: figure, fontFamily: ANTON, fontSize: figureSize, fontWeight: 400, uppercase: true, lineHeight: 0.82, letterSpacing: -3, color: C.amber }),
      text({ x: HPAD, y: labelY, w: W, h: labelH, text: "People in need.", fontFamily: ANTON, fontSize: labelSize, fontWeight: 400, uppercase: true, lineHeight: 0.96, color: C.cream }),
      text({ x: HPAD, y: sourceY, w: W, h: 30, text: statSource(c), fontFamily: BARLOW, fontSize: 22, fontWeight: 600, uppercase: true, letterSpacing: 3, color: C.creamDim }),
    ],
    C.forest
  );
}

// STAT E — With unit: a big numeral with a gold unit/qualifier word set just
// after it ("2.1M" + "people"), a label beneath, a source foot.
function statUnit(c: SlideContent): EditorSlide {
  const W = B - 2 * HPAD;
  const figure = c.primary || "2.1M";
  const figureSize = 300;
  const figureH = Math.round(figureSize * 0.82);
  // Centre the figure+unit row: numeral measured narrowly so the gold unit
  // can sit beside it on a baseline-aligned row.
  const figW = Math.round(figure.length * figureSize * 0.5);
  const unit = "people";
  const unitSize = 64;
  const rowY = 320;
  const figX = HPAD;
  const unitX = figX + figW + 24;
  const labelSize = 52;
  const labelH = Math.round(labelSize * 0.96 + 12);
  const labelY = rowY + figureH + 8;
  return slide(
    [
      shape({ x: 0, y: 0, w: B, h: B, shape: "rect", fill: GLOW, locked: true }),
      ...wordmark(HPAD, HPAD, c.logo),
      hTag("By the Numbers", B - HPAD - 420, HPAD + 6, 420, "right"),
      hEyebrow(c.eyebrow || "By the numbers · Gaza", HPAD, rowY - 50, W),
      // The numeral + a gold qualifier word baseline-aligned beside it.
      text({ x: figX, y: rowY, w: figW + 40, h: figureH, text: figure, fontFamily: ANTON, fontSize: figureSize, fontWeight: 400, uppercase: true, lineHeight: 0.82, letterSpacing: -4, color: C.amber }),
      text({ x: unitX, y: rowY + figureH - Math.round(unitSize * 1.1), w: W - figW - 64, h: Math.round(unitSize * 1.2), text: unit, fontFamily: ANTON, fontSize: unitSize, fontWeight: 400, uppercase: true, lineHeight: 0.96, color: C.amber, opacity: 0.85 }),
      text({ x: HPAD, y: labelY, w: W, h: labelH, text: "Now depend on aid.", fontFamily: ANTON, fontSize: labelSize, fontWeight: 400, uppercase: true, lineHeight: 0.96, color: C.cream }),
      goldBar(HPAD, labelY + labelH + 26, 64),
      text({ x: HPAD, y: B - HPAD - 28, w: W, h: 30, text: statSource(c), fontFamily: BARLOW, fontSize: 22, fontWeight: 600, uppercase: true, letterSpacing: 3, color: C.creamDim }),
    ],
    C.forest
  );
}

// STAT F — Gold inverted: a full gold field with forest ink. Forest
// wordmark, a colossal forest numeral + label, a source foot. The loud,
// high-contrast stat.
function statGoldInverted(c: SlideContent): EditorSlide {
  const W = B - 2 * HPAD;
  const figure = c.primary || "2.1M";
  const figureSize = 360;
  const figureH = Math.round(figureSize * 0.82 + 20);
  const labelSize = 50;
  const labelH = Math.round(labelSize * 0.96 + 12);
  const eyeGap = 64;
  const groupH = 32 + eyeGap + figureH + 14 + labelH;
  const groupTop = Math.round((B - groupH) / 2) - 8;
  const eyebrowY = groupTop;
  const figureY = eyebrowY + 32 + eyeGap;
  const labelY = figureY + figureH + 14;
  return slide(
    [
      // Forest wordmark on the gold field.
      shape({ x: HPAD, y: HPAD + 4, w: 15, h: 15, shape: "rect", fill: C.forest, rotation: 45 }),
      text({ x: HPAD + 32, y: HPAD, w: 360, h: 30, text: "DEEN RELIEF", fontFamily: BARLOW, fontSize: 24, fontWeight: 700, uppercase: true, letterSpacing: 6, color: C.forest }),
      text({ x: B - HPAD - 420, y: HPAD + 6, w: 420, h: 30, text: "By the Numbers", fontFamily: BARLOW, fontSize: 23, fontWeight: 700, uppercase: true, letterSpacing: 4.5, color: C.forest, opacity: 0.7, align: "right" }),
      text({ x: HPAD, y: eyebrowY, w: W, h: 32, text: c.eyebrow || "By the numbers · Gaza", fontFamily: BARLOW, fontSize: 24, fontWeight: 700, uppercase: true, letterSpacing: 5, color: C.forest, opacity: 0.8, align: "center" }),
      text({ x: HPAD, y: figureY, w: W, h: figureH, text: figure, fontFamily: ANTON, fontSize: figureSize, fontWeight: 400, uppercase: true, lineHeight: 0.82, letterSpacing: -4, color: C.forest, align: "center" }),
      text({ x: HPAD, y: labelY, w: W, h: labelH, text: "Now depend on humanitarian aid.", fontFamily: ANTON, fontSize: labelSize, fontWeight: 400, uppercase: true, lineHeight: 0.96, color: C.forestSoft, align: "center" }),
      text({ x: HPAD, y: B - HPAD - 28, w: W, h: 30, text: statSource(c), fontFamily: BARLOW, fontSize: 22, fontWeight: 600, uppercase: true, letterSpacing: 3, color: C.forest, opacity: 0.72, align: "center" }),
    ],
    C.amber
  );
}

// STAT G — Split: photo on the left half, a forest panel on the right
// carrying the stat + label + a source line (the hero split-diptych
// structure, built around a single figure).
function statSplit(c: SlideContent): EditorSlide {
  const half = Math.round(B / 2); // 540
  const pad = 56;
  const panelX = half + pad; // 596
  const panelW = B - panelX - pad; // 428
  const figure = c.primary || "2.1M";
  const figureSize = 200;
  const figureH = Math.round(figureSize * 0.82);
  const labelSize = 46;
  const labelH = Math.round(2 * labelSize * 0.96 + 12);
  const eyebrowH = 30, gap1 = 20, gap2 = 14, gap3 = 26, ruleH = 3;
  const coreH = eyebrowH + gap1 + figureH + gap2 + labelH + gap3 + ruleH;
  const coreTop = Math.round((B - coreH) / 2) + 10;
  const eyebrowY = coreTop;
  const figureY = eyebrowY + eyebrowH + gap1;
  const labelY = figureY + figureH + gap2;
  const ruleY = labelY + labelH + gap3;
  return slide(
    [
      image({ x: 0, y: 0, w: half, h: B, src: c.imageUrl ?? "", objectFit: "cover" }),
      shape({ x: half, y: 0, w: B - half, h: B, shape: "rect", fill: C.forest, locked: true }),
      ...wordmark(panelX, HPAD, c.logo),
      text({ x: panelX, y: eyebrowY, w: panelW, h: eyebrowH, text: c.eyebrow || "By the numbers · Gaza", fontFamily: BARLOW, fontSize: 21, fontWeight: 700, uppercase: true, letterSpacing: 3.5, color: C.amber }),
      text({ x: panelX, y: figureY, w: panelW, h: figureH, text: figure, fontFamily: ANTON, fontSize: figureSize, fontWeight: 400, uppercase: true, lineHeight: 0.82, letterSpacing: -3, color: C.amber }),
      text({ x: panelX, y: labelY, w: panelW, h: labelH, text: "People in need.", fontFamily: ANTON, fontSize: labelSize, fontWeight: 400, uppercase: true, lineHeight: 0.96, color: C.cream }),
      goldBar(panelX, ruleY, 56),
      text({ x: panelX, y: B - HPAD - 28, w: panelW, h: 30, text: statSource(c), fontFamily: BARLOW, fontSize: 21, fontWeight: 600, uppercase: true, letterSpacing: 2, color: C.creamDim }),
    ],
    C.forest
  );
}

// STAT H — Crest: a centred gold keyline frame (inset 46), eyebrow, a big
// centred numeral, a gold rule, the label, and a source foot.
function statCrest(c: SlideContent): EditorSlide {
  const cx = Math.round(B / 2);
  const W = B - 2 * HPAD;
  const figure = c.primary || "2.1M";
  const figureSize = 300;
  const figureH = Math.round(figureSize * 0.82 + 16);
  const labelSize = 48;
  const labelH = Math.round(labelSize * 0.96 + 12);
  const eyeGap = 60;
  const ruleH = 3, gap1 = 34, gap2 = 30;
  const groupH = 32 + eyeGap + figureH + gap1 + ruleH + gap2 + labelH;
  const groupTop = Math.round((B - groupH) / 2) - 6;
  const eyebrowY = groupTop;
  const figureY = eyebrowY + 32 + eyeGap;
  const ruleY = figureY + figureH + gap1;
  const labelY = ruleY + ruleH + gap2;
  return slide(
    [
      shape({ x: 0, y: 0, w: B, h: B, shape: "rect", fill: GLOW, locked: true }),
      // Enclosing 2px gold keyline frame (988×988), inset 46.
      shape({ x: 46, y: 46, w: B - 92, h: B - 92, shape: "rect", fill: "transparent", stroke: "rgba(212,168,67,0.55)", strokeWidth: 2, locked: true }),
      hEyebrow(c.eyebrow || "By the numbers · Gaza", HPAD, eyebrowY, W, "center"),
      text({ x: HPAD, y: figureY, w: W, h: figureH, text: figure, fontFamily: ANTON, fontSize: figureSize, fontWeight: 400, uppercase: true, lineHeight: 0.82, letterSpacing: -4, color: C.amber, align: "center" }),
      goldBar(Math.round(cx - 46), ruleY, 92),
      text({ x: HPAD, y: labelY, w: W, h: labelH, text: "Now depend on aid.", fontFamily: ANTON, fontSize: labelSize, fontWeight: 400, uppercase: true, lineHeight: 0.96, color: C.cream, align: "center" }),
      text({ x: HPAD, y: B - HPAD - 28, w: W, h: 30, text: statSource(c), fontFamily: BARLOW, fontSize: 22, fontWeight: 600, uppercase: true, letterSpacing: 3, color: C.creamDim, align: "center" }),
    ],
    C.forest
  );
}

// STAT I — Comparison: a big numeral with a one-line "that's like…"
// comparison line giving the figure human scale, plus a source foot.
function statComparison(c: SlideContent): EditorSlide {
  const W = B - 2 * HPAD;
  const figure = c.primary || "2.1M";
  const figureSize = 320;
  const figureH = Math.round(figureSize * 0.82);
  const figureY = 268;
  const labelSize = 54;
  const labelH = Math.round(labelSize * 0.96 + 12);
  const labelY = figureY + figureH + 6;
  const cmpY = labelY + labelH + 40;
  return slide(
    [
      shape({ x: 0, y: 0, w: B, h: B, shape: "rect", fill: GLOW, locked: true }),
      ...wordmark(HPAD, HPAD, c.logo),
      hTag("By the Numbers", B - HPAD - 420, HPAD + 6, 420, "right"),
      hEyebrow(c.eyebrow || "By the numbers · Gaza", HPAD, figureY - 50, W),
      text({ x: HPAD, y: figureY, w: W, h: figureH, text: figure, fontFamily: ANTON, fontSize: figureSize, fontWeight: 400, uppercase: true, lineHeight: 0.82, letterSpacing: -4, color: C.amber }),
      text({ x: HPAD, y: labelY, w: W, h: labelH, text: "People in need.", fontFamily: ANTON, fontSize: labelSize, fontWeight: 400, uppercase: true, lineHeight: 0.96, color: C.cream }),
      // "That's like…" comparison — gold lead-in + cream scale line.
      text({ x: HPAD, y: cmpY, w: W, h: 30, text: "That's like…", fontFamily: BARLOW, fontSize: 23, fontWeight: 700, uppercase: true, letterSpacing: 4, color: C.amber }),
      text({ x: HPAD, y: cmpY + 38, w: W, h: 96, text: "…the entire population of a major city, depending on aid to survive.", fontFamily: BARLOW, fontSize: 30, fontWeight: 500, lineHeight: 1.3, color: C.cream }),
      text({ x: HPAD, y: B - HPAD - 28, w: W, h: 30, text: statSource(c), fontFamily: BARLOW, fontSize: 22, fontWeight: 600, uppercase: true, letterSpacing: 3, color: C.creamDim }),
    ],
    C.forest
  );
}

// STAT J — With beat: the stat + label, plus one small supporting footnote
// beat (gold tick + line) pinned to the foot, with a source line.
function statBeat(c: SlideContent): EditorSlide {
  const W = B - 2 * HPAD;
  const figure = c.primary || "2.1M";
  const figureSize = 340;
  const figureH = Math.round(figureSize * 0.82);
  const figureY = 252;
  const labelSize = 54;
  const labelH = Math.round(labelSize * 0.96 + 12);
  const labelY = figureY + figureH + 6;
  // Footnote beat pinned to the foot: a gold tick, an uppercase lead, a body.
  const sourceY = B - HPAD - 28;
  const beatBodyY = sourceY - 56;
  const beatLeadY = beatBodyY - 32;
  const tickY = beatLeadY - 18;
  return slide(
    [
      shape({ x: 0, y: 0, w: B, h: B, shape: "rect", fill: GLOW, locked: true }),
      ...wordmark(HPAD, HPAD, c.logo),
      hTag("By the Numbers", B - HPAD - 420, HPAD + 6, 420, "right"),
      hEyebrow(c.eyebrow || "By the numbers · Gaza", HPAD, figureY - 50, W),
      text({ x: HPAD, y: figureY, w: W, h: figureH, text: figure, fontFamily: ANTON, fontSize: figureSize, fontWeight: 400, uppercase: true, lineHeight: 0.82, letterSpacing: -4, color: C.amber }),
      text({ x: HPAD, y: labelY, w: W, h: labelH, text: "Now depend on aid.", fontFamily: ANTON, fontSize: labelSize, fontWeight: 400, uppercase: true, lineHeight: 0.96, color: C.cream }),
      // Footnote beat: tick + lead + body, sitting just above the source.
      shape({ x: HPAD, y: tickY, w: 32, h: 3, shape: "rect", fill: C.amber }),
      text({ x: HPAD, y: beatLeadY, w: W, h: 28, text: "And the number keeps rising", fontFamily: BARLOW, fontSize: 23, fontWeight: 600, uppercase: true, letterSpacing: 1.4, color: C.cream }),
      text({ x: HPAD, y: beatBodyY, w: W, h: 40, text: "Each week without a durable truce pushes more families into need.", fontFamily: BARLOW, fontSize: 23, fontWeight: 400, lineHeight: 1.26, color: C.creamDim }),
      text({ x: HPAD, y: sourceY, w: W, h: 30, text: statSource(c), fontFamily: BARLOW, fontSize: 22, fontWeight: 600, uppercase: true, letterSpacing: 3, color: C.creamDim, align: "right" }),
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
  if (id.includes("hero-k")) return heroSplitDiptych(c);
  if (id.includes("hero-l")) return heroBroadcast(c);
  if (id.includes("hero-m")) return heroInsetCard(c);
  if (id.includes("hero-n")) return heroWindowCrop(c);
  if (id.includes("hero-o")) return heroDuotonePoster(c);
  if (id.includes("hero-typography")) return heroTypeCover(c);
  if (id.includes("hero-panel")) return heroTopPanel(c);
  if (id.includes("hero")) return heroPhotoFull(c);
  // New middle types — multistat BEFORE the generic "stat" match below.
  if (id.includes("tiers")) return tiersLadder(c);
  if (id.includes("beforeafter") || id.includes("before-after")) return beforeAfter(c);
  if (id.includes("multistat") || id.includes("multi-stat")) return multiStatStack(c);
  if (id.includes("fact-photo")) return factPhoto(c);
  if (id.includes("fact")) return factTypography(c);
  // Big-Stat library (A–J). Specific ids first so "stat-a" doesn't get
  // swallowed by the generic "stat" fallback below. (multistat is already
  // matched above, so "multistat-*" never reaches here.)
  if (id.includes("stat-a")) return statColossal(c);
  if (id.includes("stat-b")) return statContext(c);
  if (id.includes("stat-c")) return statBleed(c);
  if (id.includes("stat-d")) return statPhoto(c);
  if (id.includes("stat-e")) return statUnit(c);
  if (id.includes("stat-f")) return statGoldInverted(c);
  if (id.includes("stat-g")) return statSplit(c);
  if (id.includes("stat-h")) return statCrest(c);
  if (id.includes("stat-i")) return statComparison(c);
  if (id.includes("stat-j")) return statBeat(c);
  if (id.includes("stat")) return statHeadline(c);
  if (id.includes("testimony-portrait")) return testimonyPortrait(c);
  if (id.includes("testimony")) return testimonyQuote(c);
  if (id.includes("response")) return responsePhoto(c);
  // Closing CTA library (A–J). Specific ids first so "cta-a" doesn't get
  // swallowed by the generic "cta" fallback below.
  if (id.includes("cta-a")) return ctaForestType(c);
  if (id.includes("cta-b")) return ctaGoldInverted(c);
  if (id.includes("cta-c")) return ctaPhotoLowerThird(c);
  if (id.includes("cta-d")) return ctaCrest(c);
  if (id.includes("cta-e")) return ctaSplit(c);
  if (id.includes("cta-f")) return ctaStatLed(c);
  if (id.includes("cta-g")) return ctaQuoteLed(c);
  if (id.includes("cta-h")) return ctaUrgency(c);
  if (id.includes("cta-i")) return ctaScanToGive(c);
  if (id.includes("cta-j")) return ctaWordmarkCard(c);
  if (id.includes("cta")) return ctaDonate(c);
  // Fallback — a clean typographic slide.
  return factTypography(c);
}

/** A blank closing CTA used when the flow is skipped. */
export function defaultCta(headline: string, eyebrow: string): EditorSlide {
  return ctaDonate({ primary: headline, secondary: null, imageUrl: null, eyebrow });
}
