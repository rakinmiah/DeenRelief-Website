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

/* ─── Key-Fact design system (one sourced fact per slide, A–J) ────── *
 *
 * Ten "Fact" slides — each foregrounds a SINGLE sourced statement
 * (c.primary, e.g. "9 in 10 families now skip meals every day."), with a
 * small tag (c.eyebrow) and — always — a SOURCE line (c.secondary, or a
 * sensible OCHA default). Shared discipline with the Hero/Stat/CTA
 * systems: 78px insets, Anton uppercase facts (line-height 0.96), Barlow
 * eyebrow/source, gold rule + diamond motif. Geometry is board units on
 * the 1080 board. Sensible Gaza-appeal defaults so each renders with
 * sparse content.
 */

/** The fact's source line — defaults to OCHA when none is supplied. */
function factSource(c: SlideContent): string {
  return (c.secondary && c.secondary.trim()) || "Source: OCHA · 2026";
}
function factStatement(c: SlideContent): string {
  return c.primary || "1 in 2 children in Gaza now go to bed hungry.";
}
function factEyebrow(c: SlideContent): string {
  return c.eyebrow || "Key fact · Gaza";
}
/** A small gold "Source:" tag set in uppercase Barlow. */
function factSourceTag(t: string, x: number, y: number, w: number, color: string = C.amber, align: TextAlign = "left"): TextLayer {
  return text({ x, y, w, h: 30, text: t, fontFamily: BARLOW, fontSize: 22, fontWeight: 700, uppercase: true, letterSpacing: 3, color, opacity: 0.85, align });
}

// FACT A — Photo lower-third: full-bleed field photo, a top scrim for the
// chrome and a strong bottom scrim, the fact in the lower third, a gold
// rule and a source tag.
function factPhotoBleed(c: SlideContent): EditorSlide {
  const W = B - 2 * HPAD;
  const fact = factStatement(c);
  const factSize = 64;
  const sourceY = B - HPAD - 28;
  const ruleY = sourceY - 30;
  const factMain = balanceLines(fact, W, factSize);
  const factLines = factMain.split("\n").length;
  const factH = Math.round(factLines * factSize * 0.96 + 14);
  const factY = ruleY - 28 - factH;
  const eyebrowY = factY - 46;
  return slide(
    [
      image({ x: 0, y: 0, w: B, h: B, src: c.imageUrl ?? "", objectFit: "cover" }),
      shape({ x: 0, y: 340, w: B, h: B - 340, shape: "rect", fill: SCRIM, locked: true }),
      topScrim(),
      ...wordmark(HPAD, HPAD, c.logo),
      hTag("Key Fact", B - HPAD - 420, HPAD + 6, 420, "right"),
      hEyebrow(factEyebrow(c), HPAD, eyebrowY, W),
      hHead(factMain, HPAD, factY, W, factH, factSize, "left", C.cream),
      goldBar(HPAD, ruleY, 64),
      factSourceTag(factSource(c), HPAD, sourceY, W, C.amber),
    ],
    C.forest
  );
}

// FACT B — Type-led: type-only on forest. Eyebrow, a big Anton fact, a gold
// rule, and a gold source tag. The plain workhorse — no photo, all
// typographic authority.
function factTypeLed(c: SlideContent): EditorSlide {
  const W = B - 2 * HPAD;
  const fact = factStatement(c);
  const factSize = 92;
  const factMain = balanceLines(fact, W, factSize);
  const factLines = factMain.split("\n").length;
  const factH = Math.round(factLines * factSize * 0.96 + 16);
  const factY = 360;
  const ruleY = factY + factH + 30;
  const sourceY = ruleY + 40;
  return slide(
    [
      shape({ x: 0, y: 0, w: B, h: B, shape: "rect", fill: GLOW, locked: true }),
      ...wordmark(HPAD, HPAD, c.logo),
      hTag("Key Fact", B - HPAD - 420, HPAD + 6, 420, "right"),
      hEyebrow(factEyebrow(c), HPAD, factY - 50, W),
      hHead(factMain, HPAD, factY, W, factH, factSize, "left", C.cream),
      goldBar(HPAD, ruleY, 64),
      factSourceTag(factSource(c), HPAD, sourceY, W, C.amber),
    ],
    C.forest
  );
}

// FACT C — Top photo + panel: photo across the top ~55%, a forest panel
// below carrying eyebrow + fact + source (the heroTopPanel structure).
function factTopPanel(c: SlideContent): EditorSlide {
  const W = B - 2 * HPAD;
  const fact = factStatement(c);
  const factSize = 62;
  const eyebrowY = 660;
  const factY = eyebrowY + 50;
  const factMain = balanceLines(fact, W, factSize);
  const factLines = factMain.split("\n").length;
  const factH = Math.round(factLines * factSize * 0.96 + 12);
  const ruleY = factY + factH + 24;
  const sourceY = ruleY + 36;
  return slide(
    [
      image({ x: 0, y: 0, w: B, h: 594, src: c.imageUrl ?? "", objectFit: "cover" }),
      shape({ x: 0, y: 333, w: B, h: 261, shape: "rect", fill: SCRIM, locked: true }),
      topScrim(),
      ...wordmark(HPAD, HPAD, c.logo),
      hTag("Key Fact", B - HPAD - 420, HPAD + 6, 420, "right"),
      hEyebrow(factEyebrow(c), HPAD, eyebrowY, W),
      hHead(factMain, HPAD, factY, W, factH, factSize, "left", C.cream),
      goldBar(HPAD, ruleY, 64),
      factSourceTag(factSource(c), HPAD, sourceY, W, C.amber),
    ],
    C.forest
  );
}

// FACT D — Split: vertical 50/50. Photo on the left half, a forest panel on
// the right carrying the fact + source (the hero split-diptych structure).
function factSplit(c: SlideContent): EditorSlide {
  const half = Math.round(B / 2); // 540
  const pad = 56;
  const panelX = half + pad; // 596
  const panelW = B - panelX - pad; // 428
  const fact = factStatement(c);
  const factSize = 52;
  const factMain = balanceLines(fact, panelW, factSize);
  const factLines = factMain.split("\n").length;
  const factH = Math.round(factLines * factSize * 0.96 + 12);
  const eyebrowH = 30, gap1 = 20, gap2 = 24, ruleH = 3, gap3 = 24, sourceH = 30;
  const coreH = eyebrowH + gap1 + factH + gap2 + ruleH + gap3 + sourceH;
  const coreTop = Math.round((B - coreH) / 2) + 14;
  const eyebrowY = coreTop;
  const factY = eyebrowY + eyebrowH + gap1;
  const ruleY = factY + factH + gap2;
  const sourceY = ruleY + ruleH + gap3;
  return slide(
    [
      image({ x: 0, y: 0, w: half, h: B, src: c.imageUrl ?? "", objectFit: "cover" }),
      shape({ x: half, y: 0, w: B - half, h: B, shape: "rect", fill: C.forest, locked: true }),
      ...wordmark(panelX, HPAD, c.logo),
      text({ x: panelX, y: eyebrowY, w: panelW, h: eyebrowH, text: factEyebrow(c), fontFamily: BARLOW, fontSize: 21, fontWeight: 700, uppercase: true, letterSpacing: 3.5, color: C.amber }),
      hHead(factMain, panelX, factY, panelW, factH, factSize, "left", C.cream),
      goldBar(panelX, ruleY, 56),
      factSourceTag(factSource(c), panelX, sourceY, panelW, C.creamDim),
    ],
    C.forest
  );
}

// FACT E — Keyline card: the fact framed in a gold keyline card (inset 46)
// on forest, holding eyebrow + fact + source, centred in-frame.
function factKeyline(c: SlideContent): EditorSlide {
  const FPAD = 46;
  const frameW = B - 2 * FPAD; // 988
  const inset = 64;
  const innerX = FPAD + inset; // 110
  const innerW = frameW - 2 * inset; // 860
  const fact = factStatement(c);
  const factSize = 76;
  const factMain = balanceLines(fact, innerW, factSize);
  const factLines = factMain.split("\n").length;
  const factH = Math.round(factLines * factSize * 0.96 + 14);
  const eyebrowH = 32, gap1 = 24, gap2 = 30, ruleH = 3, gap3 = 28, sourceH = 30;
  const coreH = eyebrowH + gap1 + factH + gap2 + ruleH + gap3 + sourceH;
  const eyebrowY = Math.round((B - coreH) / 2);
  const factY = eyebrowY + eyebrowH + gap1;
  const ruleY = factY + factH + gap2;
  const sourceY = ruleY + ruleH + gap3;
  return slide(
    [
      shape({ x: 0, y: 0, w: B, h: B, shape: "rect", fill: GLOW, locked: true }),
      // Enclosing 2px gold keyline frame (988×988), inset 46.
      shape({ x: FPAD, y: FPAD, w: frameW, h: frameW, shape: "rect", fill: "transparent", stroke: "rgba(212,168,67,0.55)", strokeWidth: 2, locked: true }),
      ...wordmark(innerX, FPAD + 30, c.logo),
      hEyebrow(factEyebrow(c), innerX, eyebrowY, innerW),
      hHead(factMain, innerX, factY, innerW, factH, factSize, "left", C.cream),
      goldBar(innerX, ruleY, 64),
      factSourceTag(factSource(c), innerX, sourceY, innerW, C.amber),
      text({ x: innerX, y: B - FPAD - 30 - 28, w: innerW, h: 28, text: "deenrelief.org", fontFamily: BARLOW, fontSize: 22, fontWeight: 600, uppercase: true, letterSpacing: 3, color: C.creamDim, align: "right" }),
    ],
    C.forest
  );
}

// FACT F — Lead-in detail: a small lead-in eyebrow, the fact headline, plus
// one pulled supporting detail line, then a source line.
function factLeadIn(c: SlideContent): EditorSlide {
  const W = B - 2 * HPAD;
  const fact = factStatement(c);
  const factSize = 78;
  const factMain = balanceLines(fact, W, factSize);
  const factLines = factMain.split("\n").length;
  const factH = Math.round(factLines * factSize * 0.96 + 14);
  const eyebrowY = 268;
  const factY = eyebrowY + 50;
  const ruleY = factY + factH + 30;
  const detailY = ruleY + 30;
  const sourceY = B - HPAD - 28;
  return slide(
    [
      shape({ x: 0, y: 0, w: B, h: B, shape: "rect", fill: GLOW, locked: true }),
      ...wordmark(HPAD, HPAD, c.logo),
      hTag("Key Fact", B - HPAD - 420, HPAD + 6, 420, "right"),
      hEyebrow(factEyebrow(c), HPAD, eyebrowY, W),
      hHead(factMain, HPAD, factY, W, factH, factSize, "left", C.cream),
      goldBar(HPAD, ruleY, 64),
      // The pulled supporting detail (Barlow body).
      hBody("Aid agencies warn the window to prevent famine is closing fast, with deliveries running far below need.", HPAD, detailY, W, 150),
      factSourceTag(factSource(c), HPAD, sourceY, W, C.creamDim),
    ],
    C.forest
  );
}

// FACT G — Caption bar: full-bleed photo + a solid forest caption bar at the
// foot carrying the fact + a photo credit/source (the heroCaption structure).
function factCaptionBar(c: SlideContent): EditorSlide {
  const W = B - 2 * HPAD;
  const fact = factStatement(c);
  const factSize = 54;
  const factMain = balanceLines(fact, W, factSize);
  const factLines = factMain.split("\n").length;
  const factH = Math.round(factLines * factSize * 0.96 + 12);
  // Size the bar to the content: eyebrow + fact (1–2 lines) + a source line.
  const barTop = factLines > 1 ? 740 : 820;
  const eyebrowY = barTop + 42;
  const factY = eyebrowY + 46;
  const sourceY = factY + factH + 22;
  return slide(
    [
      image({ x: 0, y: 0, w: B, h: B, src: c.imageUrl ?? "", objectFit: "cover" }),
      topScrim(),
      ...wordmark(HPAD, HPAD, c.logo),
      hTag("Key Fact", B - HPAD - 420, HPAD + 6, 420, "right"),
      shape({ x: 0, y: barTop, w: B, h: B - barTop, shape: "rect", fill: C.forest, locked: true }),
      hEyebrow(factEyebrow(c), HPAD, eyebrowY, W),
      hHead(factMain, HPAD, factY, W, factH, factSize, "left", C.cream),
      factSourceTag(factSource(c), HPAD, sourceY, W, C.creamDim),
    ],
    C.forest
  );
}

// FACT H — Inset card: full-bleed photo with a gold-bordered forest card
// floated low holding eyebrow + fact + source (the heroInsetCard structure).
function factInsetCard(c: SlideContent): EditorSlide {
  const cardX = HPAD; // 78
  const cardW = B - 2 * HPAD; // 924
  const cardPad = 54;
  const innerX = cardX + cardPad;
  const innerW = cardW - 2 * cardPad; // 816
  const fact = factStatement(c);
  const factSize = 58;
  const factMain = balanceLines(fact, innerW, factSize);
  const factLines = factMain.split("\n").length;
  const factH = Math.round(factLines * factSize * 0.96 + 12);
  const contentH = 32 + 18 + factH + 22 + 30; // eyebrow + gap + fact + gap + source
  const cardH = contentH + 2 * cardPad;
  const cardY = B - HPAD - cardH;
  const eyebrowY = cardY + cardPad;
  const factY = eyebrowY + 32 + 18;
  const sourceY = factY + factH + 22;
  return slide(
    [
      image({ x: 0, y: 0, w: B, h: B, src: c.imageUrl ?? "", objectFit: "cover" }),
      topScrim(),
      ...wordmark(HPAD, HPAD, c.logo),
      hTag("Key Fact", B - HPAD - 420, HPAD + 6, 420, "right"),
      // Card: solid forest with a gold keyline border.
      shape({ x: cardX, y: cardY, w: cardW, h: cardH, shape: "rect", fill: C.forest, radius: 10, locked: true }),
      shape({ x: cardX, y: cardY, w: cardW, h: cardH, shape: "rect", fill: "transparent", stroke: C.amber, strokeWidth: 2, radius: 10, locked: true }),
      text({ x: innerX, y: eyebrowY, w: innerW, h: 32, text: factEyebrow(c), fontFamily: BARLOW, fontSize: 24, fontWeight: 700, uppercase: true, letterSpacing: 5, color: C.amber }),
      hHead(factMain, innerX, factY, innerW, factH, factSize, "left", C.cream),
      factSourceTag(factSource(c), innerX, sourceY, innerW, C.creamDim),
    ],
    C.forest
  );
}

// FACT I — Crest: a quiet centred crest. A gold diamond emblem (forest inner
// keyline), eyebrow, a centred Anton fact, a gold rule, and a source meta.
function factCrest(c: SlideContent): EditorSlide {
  const cx = Math.round(B / 2);
  const W = B - 2 * HPAD;
  const fact = factStatement(c);
  const dia = 46;
  const innerDia = 30;
  const factSize = 72;
  const factMain = balanceLines(fact, W, factSize);
  const factLines = factMain.split("\n").length;
  const factH = Math.round(factLines * factSize * 0.96 + 14);
  const diaY = 250;
  const eyebrowY = diaY + dia + 40;
  const factY = eyebrowY + 44;
  const ruleY = factY + factH + 30;
  const sourceY = ruleY + 38;
  return slide(
    [
      shape({ x: 0, y: 0, w: B, h: B, shape: "rect", fill: GLOW, locked: true }),
      // Enclosing 2px gold keyline frame (988×988), inset 46.
      shape({ x: 46, y: 46, w: B - 92, h: B - 92, shape: "rect", fill: "transparent", stroke: "rgba(212,168,67,0.55)", strokeWidth: 2, locked: true }),
      // Emblem: gold diamond + a forest keyline diamond centred inside.
      shape({ x: Math.round(cx - dia / 2), y: diaY, w: dia, h: dia, shape: "rect", fill: C.amber, rotation: 45 }),
      shape({ x: Math.round(cx - innerDia / 2), y: Math.round(diaY + (dia - innerDia) / 2), w: innerDia, h: innerDia, shape: "rect", fill: "transparent", stroke: C.forest, strokeWidth: 2, rotation: 45 }),
      hEyebrow(factEyebrow(c), HPAD, eyebrowY, W, "center"),
      hHead(factMain, HPAD, factY, W, factH, factSize, "center", C.cream),
      goldBar(Math.round(cx - 46), ruleY, 92),
      factSourceTag(factSource(c), HPAD, sourceY, W, C.creamDim, "center"),
    ],
    C.forest
  );
}

// FACT J — Two-tone: a gold-bordered two-tone card. A forest top panel
// carries the fact; a cream band below holds the source in dark ink (the
// heroCornerCard structure).
function factTwoTone(c: SlideContent): EditorSlide {
  const FPAD = 40; // outer pad → the 1000×1000 frame
  const frameW = B - 2 * FPAD; // 1000
  const bandH = 220; // cream band
  const bandY = B - FPAD - bandH; // ~820
  const inset = 56;
  const innerX = FPAD + inset;
  const innerW = frameW - 2 * inset; // 888
  const fact = factStatement(c);
  const factSize = 80;
  const factMain = balanceLines(fact, innerW, factSize);
  const factLines = factMain.split("\n").length;
  const factH = Math.round(factLines * factSize * 0.96 + 16);
  const factY = bandY - 44 - factH; // 44px clear above the band
  const barY = FPAD + inset;
  const eyebrowY = factY - 46;
  return slide(
    [
      // Forest base fills the whole frame; the cream band paints over the foot.
      shape({ x: FPAD, y: FPAD, w: frameW, h: frameW, shape: "rect", fill: C.forest, locked: true }),
      shape({ x: FPAD, y: bandY, w: frameW, h: bandH, shape: "rect", fill: C.cream, locked: true }),
      // Topbar: wordmark + "Key Fact" tag.
      ...wordmark(innerX, barY, c.logo),
      hTag("Key Fact", FPAD + frameW - inset - 420, barY + 6, 420, "right"),
      // Eyebrow (gold) + fact (cream, bottom-anchored in the forest panel).
      text({ x: innerX, y: eyebrowY, w: innerW, h: 32, text: factEyebrow(c), fontFamily: BARLOW, fontSize: 24, fontWeight: 700, uppercase: true, letterSpacing: 5, color: C.amber }),
      text({ x: innerX, y: factY, w: innerW, h: factH, text: factMain, fontFamily: ANTON, fontSize: factSize, fontWeight: 400, uppercase: true, lineHeight: 0.96, color: C.cream }),
      // Cream band: dark source (left) + gold-deep URL (right).
      text({ x: innerX, y: bandY + Math.round((bandH - 34) / 2), w: 540, h: 34, text: factSource(c), fontFamily: BARLOW, fontSize: 26, fontWeight: 700, uppercase: true, letterSpacing: 1, color: C.forestDim }),
      text({ x: FPAD + frameW - inset - 420, y: bandY + Math.round((bandH - 44) / 2), w: 420, h: 52, text: "deenrelief.org", fontFamily: ANTON, fontSize: 40, fontWeight: 400, color: C.goldDeep, align: "right" }),
      // The 2px gold border framing the whole 1000×1000 card, on top.
      shape({ x: FPAD, y: FPAD, w: frameW, h: frameW, shape: "rect", fill: "transparent", stroke: C.amber, strokeWidth: 2, locked: true }),
    ],
    C.forest
  );
}

/* ─── Testimony design system (attributed quote, A–J) ──────────────── *
 *
 * Ten polished "In their words" layouts in the Slide-Library system. Shared
 * grammar: 78px inset, Barlow 500 quote, an oversized Anton gold open-quote
 * ("“", ~300px lineHeight 0.8), a gold rule + an attribution row (name · role
 * · place). Photo variants use objectFit "cover" only; circular portraits use
 * an image whose radius = half its box (the render route clips with overflow
 * hidden). Defaults are a Gaza-appeal testimony so each renders standalone.
 */

const Q_DEFAULT =
  "We rebuild what we can with our hands, and we wait for the world to remember us.";
const Q_ATTR = "Dr. Layla K. · Surgeon, Khan Younis";

/** Estimate how many lines a Barlow quote wraps to in a given box — Barlow
 *  500 runs ≈ 0.52em/char. Clamped 1–`max` so the box never collapses. */
function quoteLineCount(t: string, w: number, size: number, max = 6): number {
  return Math.min(max, Math.max(1, Math.ceil((t.length * size * 0.52) / w)));
}

/** The big gold open-quote glyph (Anton, ~300px, lineHeight 0.8, amber). */
function openMark(x: number, y: number, size = 300, align: TextAlign = "left", w = 260): TextLayer {
  return text({ x, y, w, h: Math.round(size * 0.5), text: "“", fontFamily: ANTON, fontSize: size, fontWeight: 400, lineHeight: 0.8, color: C.amber, align });
}

/** The attribution row: a short gold rule + the name/role/place line. Returns
 *  the layers; callers place the rule and pass the attribution string. */
function attribRow(t: string | null, x: number, y: number, w: number, align: TextAlign = "left", ruleW = 64): Layer[] {
  const ruleX = align === "center" ? Math.round(x + (w - ruleW) / 2) : align === "right" ? x + w - ruleW : x;
  return [
    goldBar(ruleX, y, ruleW),
    text({ x, y: y + 22, w, h: 40, text: t ?? "", fontFamily: BARLOW, fontSize: 28, fontWeight: 700, color: C.cream, align }),
  ];
}

// TESTIMONY A — Open-quote: an oversized gold open-quote up top, the quote set
// tight beneath in Barlow 500, a gold rule + attribution row anchored low.
function quoteOpenMark(c: SlideContent): EditorSlide {
  const W = B - 2 * HPAD;
  const quoteW = Math.min(W, 884);
  const quoteSize = 64;
  const quote = c.primary || Q_DEFAULT;
  const markY = 250;
  const quoteY = markY + 154;
  const quoteLines = quoteLineCount(quote, quoteW, quoteSize, 5);
  const quoteH = Math.round(quoteLines * quoteSize * 1.18);
  const attrY = 868;
  return slide(
    [
      shape({ x: 0, y: 0, w: B, h: B, shape: "rect", fill: GLOW, locked: true }),
      ...wordmark(HPAD, HPAD, c.logo),
      hTag(c.eyebrow || "In Their Words", B - HPAD - 420, HPAD + 6, 420, "right"),
      openMark(HPAD - 6, markY),
      text({ x: HPAD, y: quoteY, w: quoteW, h: quoteH, text: quote, fontFamily: BARLOW, fontSize: quoteSize, fontWeight: 500, lineHeight: 1.18, color: C.cream }),
      ...attribRow(c.secondary || Q_ATTR, HPAD, attrY, 760),
    ],
    C.forest
  );
}

// TESTIMONY B — Portrait lower-third: full-bleed portrait, a top scrim for the
// chrome and a strong bottom scrim, the quote in the lower third + attribution.
function quotePortraitLowerThird(c: SlideContent): EditorSlide {
  const W = B - 2 * HPAD;
  const quoteSize = 46;
  const quote = c.primary || Q_DEFAULT;
  const quoteLines = quoteLineCount(quote, W, quoteSize, 4);
  const quoteH = Math.round(quoteLines * quoteSize * 1.22);
  const attrY = B - HPAD - 56;
  const quoteY = attrY - 26 - quoteH;
  const markY = quoteY - 96;
  return slide(
    [
      image({ x: 0, y: 0, w: B, h: B, src: c.imageUrl ?? "", objectFit: "cover" }),
      shape({ x: 0, y: 366, w: B, h: B - 366, shape: "rect", fill: SCRIM, locked: true }),
      topScrim(),
      ...wordmark(HPAD, HPAD, c.logo),
      hTag(c.eyebrow || "In Their Words", B - HPAD - 420, HPAD + 6, 420, "right"),
      openMark(HPAD - 6, markY, 180, "left", 200),
      text({ x: HPAD, y: quoteY, w: W, h: quoteH, text: quote, fontFamily: BARLOW, fontSize: quoteSize, fontWeight: 600, lineHeight: 1.22, color: C.cream }),
      goldBar(HPAD, attrY, 56),
      text({ x: HPAD, y: attrY + 20, w: W, h: 36, text: c.secondary || Q_ATTR, fontFamily: BARLOW, fontSize: 25, fontWeight: 700, color: C.amber }),
    ],
    C.forest
  );
}

// TESTIMONY C — Split: a vertical 50/50 — portrait on the left, a forest panel
// on the right carrying the open-quote + quote + attribution.
function quoteSplit(c: SlideContent): EditorSlide {
  const half = Math.round(B / 2); // 540
  const pad = 64;
  const panelX = half + pad; // 604
  const panelW = B - panelX - pad; // 412
  const quoteSize = 40;
  const quote = c.primary || Q_DEFAULT;
  const quoteLines = quoteLineCount(quote, panelW, quoteSize, 7);
  const quoteH = Math.round(quoteLines * quoteSize * 1.24);
  const markY = 250;
  const quoteY = markY + 116;
  const attrY = quoteY + quoteH + 36;
  return slide(
    [
      image({ x: 0, y: 0, w: half, h: B, src: c.imageUrl ?? "", objectFit: "cover" }),
      shape({ x: half, y: 0, w: B - half, h: B, shape: "rect", fill: C.forest, locked: true }),
      ...wordmark(panelX, HPAD, c.logo),
      openMark(panelX - 4, markY, 150, "left", 200),
      text({ x: panelX, y: quoteY, w: panelW, h: quoteH, text: quote, fontFamily: BARLOW, fontSize: quoteSize, fontWeight: 500, lineHeight: 1.24, color: C.cream }),
      goldBar(panelX, attrY, 56),
      text({ x: panelX, y: attrY + 20, w: panelW, h: 64, text: c.secondary || Q_ATTR, fontFamily: BARLOW, fontSize: 24, fontWeight: 700, lineHeight: 1.2, color: C.cream }),
    ],
    C.forest
  );
}

// TESTIMONY D — Portrait chip: forest field, a small circular portrait (an
// image with radius = half its box), the quote, and an attribution row.
function quotePortraitChip(c: SlideContent): EditorSlide {
  const W = B - 2 * HPAD;
  const quoteSize = 56;
  const quote = c.primary || Q_DEFAULT;
  const dia = 150; // circular portrait diameter
  const portraitY = 232;
  const quoteY = portraitY + dia + 64;
  const quoteLines = quoteLineCount(quote, W, quoteSize, 5);
  const quoteH = Math.round(quoteLines * quoteSize * 1.18);
  const attrY = quoteY + quoteH + 40;
  return slide(
    [
      shape({ x: 0, y: 0, w: B, h: B, shape: "rect", fill: GLOW, locked: true }),
      ...wordmark(HPAD, HPAD, c.logo),
      hTag(c.eyebrow || "In Their Words", B - HPAD - 420, HPAD + 6, 420, "right"),
      // Circular portrait: square image, radius = half → a circle; gold ring.
      image({ x: HPAD, y: portraitY, w: dia, h: dia, src: c.imageUrl ?? "", objectFit: "cover", radius: Math.round(dia / 2) }),
      shape({ x: HPAD, y: portraitY, w: dia, h: dia, shape: "ellipse", fill: "transparent", stroke: C.amber, strokeWidth: 2, locked: true }),
      text({ x: HPAD, y: quoteY, w: W, h: quoteH, text: quote, fontFamily: BARLOW, fontSize: quoteSize, fontWeight: 500, lineHeight: 1.18, color: C.cream }),
      ...attribRow(c.secondary || Q_ATTR, HPAD, attrY, W),
    ],
    C.forest
  );
}

// TESTIMONY E — Crest: a quiet centred crest — a small gold open-quote, the
// quote centred, a gold rule, and a centred attribution.
function quoteCrest(c: SlideContent): EditorSlide {
  const cx = Math.round(B / 2);
  const W = B - 2 * HPAD;
  const quoteSize = 52;
  const quote = c.primary || Q_DEFAULT;
  const quoteLines = quoteLineCount(quote, W, quoteSize, 5);
  const quoteH = Math.round(quoteLines * quoteSize * 1.2);
  // Centre the open-quote + quote group around the board middle.
  const markH = 90;
  const groupH = markH + quoteH;
  const markY = Math.round((B - groupH) / 2) - 30;
  const quoteY = markY + markH;
  const attrY = quoteY + quoteH + 40;
  return slide(
    [
      shape({ x: 0, y: 0, w: B, h: B, shape: "rect", fill: GLOW, locked: true }),
      shape({ x: 46, y: 46, w: B - 92, h: B - 92, shape: "rect", fill: "transparent", stroke: "rgba(212,168,67,0.55)", strokeWidth: 2, locked: true }),
      ...wordmark(HPAD, HPAD, c.logo),
      hTag(c.eyebrow || "In Their Words", B - HPAD - 420, HPAD + 6, 420, "right"),
      openMark(HPAD, markY, 160, "center", W),
      text({ x: HPAD, y: quoteY, w: W, h: quoteH, text: quote, fontFamily: BARLOW, fontSize: quoteSize, fontWeight: 500, lineHeight: 1.2, color: C.cream, align: "center" }),
      ...attribRow(c.secondary || Q_ATTR, HPAD, attrY, W, "center", 92),
    ],
    C.forest
  );
}

// TESTIMONY F — Gold emphasis: the quote in cream with ONE emphasis phrase
// (c.accent) rendered italic-gold on its own line, then an attribution row.
function quoteEmphasis(c: SlideContent): EditorSlide {
  const W = B - 2 * HPAD;
  const quoteW = Math.min(W, 884);
  const quoteSize = 60;
  const quote = c.primary || Q_DEFAULT;
  const markY = 250;
  const quoteY = markY + 142;
  const quoteLines = quoteLineCount(quote, quoteW, quoteSize, 4);
  const quoteH = Math.round(quoteLines * quoteSize * 1.18);
  const hasAccent = !!(c.accent && c.accent.trim());
  const accentY = quoteY + quoteH + 2;
  const accentH = hasAccent ? Math.round(quoteSize * 1.18 + 8) : 0;
  const attrY = hasAccent ? accentY + accentH + 30 : quoteY + quoteH + 36;
  return slide(
    [
      shape({ x: 0, y: 0, w: B, h: B, shape: "rect", fill: GLOW, locked: true }),
      ...wordmark(HPAD, HPAD, c.logo),
      hTag(c.eyebrow || "In Their Words", B - HPAD - 420, HPAD + 6, 420, "right"),
      openMark(HPAD - 6, markY),
      text({ x: HPAD, y: quoteY, w: quoteW, h: quoteH, text: quote, fontFamily: BARLOW, fontSize: quoteSize, fontWeight: 500, lineHeight: 1.18, color: C.cream }),
      ...(hasAccent
        ? [text({ x: HPAD, y: accentY, w: quoteW, h: accentH, text: c.accent!, fontFamily: BARLOW, fontSize: quoteSize, fontWeight: 500, italic: true, lineHeight: 1.18, color: C.amber })]
        : []),
      ...attribRow(c.secondary || Q_ATTR, HPAD, attrY, 760),
    ],
    C.forest
  );
}

// TESTIMONY G — Top portrait: portrait across the top ~50%, a forest panel
// below carrying the open-quote + quote + attribution.
function quoteTopPortrait(c: SlideContent): EditorSlide {
  const W = B - 2 * HPAD;
  const photoH = 540;
  const quoteSize = 44;
  const quote = c.primary || Q_DEFAULT;
  const markY = photoH + 44;
  const quoteY = markY + 92;
  const quoteLines = quoteLineCount(quote, W, quoteSize, 4);
  const quoteH = Math.round(quoteLines * quoteSize * 1.22);
  const attrY = quoteY + quoteH + 34;
  return slide(
    [
      image({ x: 0, y: 0, w: B, h: photoH, src: c.imageUrl ?? "", objectFit: "cover" }),
      shape({ x: 0, y: photoH, w: B, h: B - photoH, shape: "rect", fill: C.forest, locked: true }),
      topScrim(),
      ...wordmark(HPAD, HPAD, c.logo),
      hTag(c.eyebrow || "In Their Words", B - HPAD - 420, HPAD + 6, 420, "right"),
      openMark(HPAD - 4, markY, 130, "left", 200),
      text({ x: HPAD, y: quoteY, w: W, h: quoteH, text: quote, fontFamily: BARLOW, fontSize: quoteSize, fontWeight: 500, lineHeight: 1.22, color: C.cream }),
      goldBar(HPAD, attrY, 56),
      text({ x: HPAD, y: attrY + 20, w: W, h: 36, text: c.secondary || Q_ATTR, fontFamily: BARLOW, fontSize: 25, fontWeight: 700, color: C.cream }),
    ],
    C.forest
  );
}

// TESTIMONY H — Two-tone: a gold-bordered card — a forest panel carries the
// quote, a cream band below holds the attribution in dark forest ink.
function quoteTwoTone(c: SlideContent): EditorSlide {
  const FPAD = 40;
  const frameW = B - 2 * FPAD; // 1000
  const bandH = 240;
  const bandY = B - FPAD - bandH;
  const inset = 56;
  const innerX = FPAD + inset;
  const innerW = frameW - 2 * inset; // 888
  const quoteSize = 50;
  const quote = c.primary || Q_DEFAULT;
  const markY = FPAD + 150;
  const quoteY = markY + 116;
  const quoteLines = quoteLineCount(quote, innerW, quoteSize, 5);
  const quoteH = Math.round(quoteLines * quoteSize * 1.2);
  return slide(
    [
      shape({ x: FPAD, y: FPAD, w: frameW, h: frameW, shape: "rect", fill: C.forest, locked: true }),
      shape({ x: FPAD, y: bandY, w: frameW, h: bandH, shape: "rect", fill: C.cream, locked: true }),
      ...wordmark(innerX, FPAD + inset, c.logo),
      hTag(c.eyebrow || "In Their Words", FPAD + frameW - inset - 420, FPAD + inset + 6, 420, "right"),
      openMark(innerX - 6, markY, 150, "left", 220),
      text({ x: innerX, y: quoteY, w: innerW, h: quoteH, text: quote, fontFamily: BARLOW, fontSize: quoteSize, fontWeight: 500, lineHeight: 1.2, color: C.cream }),
      // Cream band: gold rule + attribution in dark forest ink.
      goldBar(innerX, bandY + Math.round((bandH - 60) / 2), 64),
      text({ x: innerX, y: bandY + Math.round((bandH - 60) / 2) + 22, w: innerW, h: 44, text: c.secondary || Q_ATTR, fontFamily: BARLOW, fontSize: 30, fontWeight: 700, color: C.forest }),
      shape({ x: FPAD, y: FPAD, w: frameW, h: frameW, shape: "rect", fill: "transparent", stroke: C.amber, strokeWidth: 2, locked: true }),
    ],
    C.forest
  );
}

// TESTIMONY I — Keyline card: the quote framed in a gold keyline card (inset
// ~46) on forest — open-quote + quote + attribution inside the frame.
function quoteKeylineCard(c: SlideContent): EditorSlide {
  const FPAD = 46;
  const frameW = B - 2 * FPAD; // 988
  const inset = 56;
  const innerX = FPAD + inset;
  const innerW = frameW - 2 * inset; // 876
  const quoteSize = 52;
  const quote = c.primary || Q_DEFAULT;
  const quoteLines = quoteLineCount(quote, innerW, quoteSize, 5);
  const quoteH = Math.round(quoteLines * quoteSize * 1.2);
  // Centre the open-quote + quote + attribution group within the frame.
  const markH = 96;
  const attrGap = 40, attrH = 62;
  const groupH = markH + quoteH + attrGap + attrH;
  const markY = Math.round((B - groupH) / 2) - 10;
  const quoteY = markY + markH;
  const attrY = quoteY + quoteH + attrGap;
  return slide(
    [
      shape({ x: 0, y: 0, w: B, h: B, shape: "rect", fill: GLOW, locked: true }),
      shape({ x: FPAD, y: FPAD, w: frameW, h: frameW, shape: "rect", fill: "transparent", stroke: C.amber, strokeWidth: 2, locked: true }),
      text({ x: innerX, y: FPAD + inset - 6, w: innerW, h: 30, text: c.eyebrow || "In Their Words", fontFamily: BARLOW, fontSize: 23, fontWeight: 700, uppercase: true, letterSpacing: 4.5, color: C.amber }),
      openMark(innerX - 6, markY, 160, "left", 220),
      text({ x: innerX, y: quoteY, w: innerW, h: quoteH, text: quote, fontFamily: BARLOW, fontSize: quoteSize, fontWeight: 500, lineHeight: 1.2, color: C.cream }),
      ...attribRow(c.secondary || Q_ATTR, innerX, attrY, innerW),
    ],
    C.forest
  );
}

// TESTIMONY J — Caption bar: full-bleed portrait + a solid forest caption bar
// at the foot carrying the quote + attribution (the heroCaption pattern).
function quoteCaptionBar(c: SlideContent): EditorSlide {
  const W = B - 2 * HPAD;
  const quoteSize = 42;
  const quote = c.primary || Q_DEFAULT;
  const quoteLines = quoteLineCount(quote, W, quoteSize, 4);
  const quoteH = Math.round(quoteLines * quoteSize * 1.22);
  const barH = quoteH + 178;
  const barTop = B - barH;
  const quoteY = barTop + 80;
  const attrY = quoteY + quoteH + 26;
  return slide(
    [
      image({ x: 0, y: 0, w: B, h: B, src: c.imageUrl ?? "", objectFit: "cover" }),
      topScrim(),
      ...wordmark(HPAD, HPAD, c.logo),
      hTag(c.eyebrow || "In Their Words", B - HPAD - 420, HPAD + 6, 420, "right"),
      shape({ x: 0, y: barTop, w: B, h: barH, shape: "rect", fill: C.forest, locked: true }),
      openMark(HPAD - 4, barTop + 16, 110, "left", 180),
      text({ x: HPAD, y: quoteY, w: W, h: quoteH, text: quote, fontFamily: BARLOW, fontSize: quoteSize, fontWeight: 500, lineHeight: 1.22, color: C.cream }),
      goldBar(HPAD, attrY, 56),
      text({ x: HPAD, y: attrY + 18, w: W, h: 34, text: c.secondary || Q_ATTR, fontFamily: BARLOW, fontSize: 24, fontWeight: 700, color: C.amber }),
    ],
    C.forest
  );
}

/* ─── "Our Response" design system (what DR is doing, A–J) ─────────── *
 *
 * Ten polished "Our response" layouts in the Slide-Library system — each
 * leads with what Deen Relief is doing on the ground (an active verb /
 * delivering, distributing, treating) so the deck closes the loop from
 * crisis → proof of action. Shared grammar with Hero/Fact: 78px inset,
 * Anton headlines (line-height 0.96), Barlow eyebrow/body, gold rule +
 * diamond motif. Photo variants use objectFit "cover" only. Defaults are
 * a Gaza-appeal response so each renders standalone.
 */

const R_DEFAULT =
  "Our teams are distributing food, water and medical aid across Gaza.";
const R_SUPPORT = "12,000 families reached this week.";
const R_EYEBROW = "Our response";

function respLine(c: SlideContent): string {
  return c.primary || R_DEFAULT;
}
function respEyebrow(c: SlideContent): string {
  return c.eyebrow || R_EYEBROW;
}

// RESPONSE A — Photo lower-third: full-bleed action photo, a top scrim for
// the chrome and a strong bottom scrim, the response line in the lower third
// over a gold rule + the eyebrow tag.
function respPhotoLowerThird(c: SlideContent): EditorSlide {
  const W = B - 2 * HPAD;
  const line = respLine(c);
  const headSize = 76;
  const tagY = B - HPAD - 30;
  const ruleY = tagY - 24;
  const headH = Math.round(
    balanceLines(line, W, headSize).split("\n").length * headSize * 0.96 + 12
  );
  const headY = ruleY - 28 - headH;
  return slide(
    [
      image({ x: 0, y: 0, w: B, h: B, src: c.imageUrl ?? "", objectFit: "cover" }),
      shape({ x: 0, y: 360, w: B, h: B - 360, shape: "rect", fill: SCRIM, locked: true }),
      topScrim(),
      ...wordmark(HPAD, HPAD, c.logo),
      hTag("On The Ground", B - HPAD - 420, HPAD + 6, 420, "right"),
      hHead(balanceLines(line, W, headSize), HPAD, headY, W, headH, headSize, "left", C.cream),
      goldBar(HPAD, ruleY, 64),
      hEyebrow(respEyebrow(c), HPAD, tagY, W),
    ],
    C.forest
  );
}

// RESPONSE B — Top photo + forest panel: action photo across the top ~55%,
// a forest panel below carrying eyebrow + response line + a supporting line.
function respTopPanel(c: SlideContent): EditorSlide {
  const W = B - 2 * HPAD;
  const line = respLine(c);
  const headSize = 72;
  const photoH = 594;
  const eyebrowY = 660;
  const headY = eyebrowY + 32 + 18;
  const headH = Math.round(
    balanceLines(line, W, headSize).split("\n").length * headSize * 0.96 + 12
  );
  const ruleY = headY + headH + 22;
  return slide(
    [
      image({ x: 0, y: 0, w: B, h: photoH, src: c.imageUrl ?? "", objectFit: "cover" }),
      shape({ x: 0, y: 333, w: B, h: photoH - 333, shape: "rect", fill: SCRIM, locked: true }),
      topScrim(),
      ...wordmark(HPAD, HPAD, c.logo),
      hTag("On The Ground", B - HPAD - 420, HPAD + 6, 420, "right"),
      hEyebrow(respEyebrow(c), HPAD, eyebrowY, W),
      hHead(balanceLines(line, W, headSize), HPAD, headY, W, headH, headSize, "left", C.cream),
      goldBar(HPAD, ruleY, 64),
      ...(c.secondary ? [hBody(c.secondary, HPAD, ruleY + 22, W, 92)] : []),
    ],
    C.forest
  );
}

// RESPONSE C — Split: vertical 50/50, action photo left, a forest panel right
// carrying eyebrow + response line + support (editorial diptych).
function respSplit(c: SlideContent): EditorSlide {
  const half = Math.round(B / 2); // 540
  const pad = 64;
  const panelX = half + pad; // 604
  const panelW = B - panelX - pad; // 412
  const line = respLine(c);
  const headSize = 58;
  const headMain = balanceLines(line, panelW, headSize);
  const headLines = headMain.split("\n").length;
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
      text({ x: panelX, y: eyebrowY, w: panelW, h: eyebrowH, text: respEyebrow(c), fontFamily: BARLOW, fontSize: 21, fontWeight: 700, uppercase: true, letterSpacing: 3.5, color: C.amber }),
      hHead(headMain, panelX, headY, panelW, headH, headSize, "left", C.cream),
      goldBar(panelX, ruleY, 56),
      ...(hasBody ? [hBody(c.secondary!, panelX, bodyY, panelW, bodyH)] : []),
    ],
    C.forest
  );
}

// RESPONSE D — Inset card: full-bleed action photo with a gold-bordered forest
// card floated low holding eyebrow + response line + support.
function respInsetCard(c: SlideContent): EditorSlide {
  const cardX = HPAD; // 78
  const cardW = B - 2 * HPAD; // 924
  const cardPad = 54;
  const innerX = cardX + cardPad;
  const innerW = cardW - 2 * cardPad; // 816
  const line = respLine(c);
  const headSize = 66;
  const headMain = balanceLines(line, innerW, headSize);
  const headLines = headMain.split("\n").length;
  const headH = Math.round(headLines * headSize * 0.96 + 12);
  const hasBody = !!c.secondary;
  const bodyH = hasBody ? 92 : 0;
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
      hTag("On The Ground", B - HPAD - 420, HPAD + 6, 420, "right"),
      shape({ x: cardX, y: cardY, w: cardW, h: cardH, shape: "rect", fill: C.forest, radius: 10, locked: true }),
      shape({ x: cardX, y: cardY, w: cardW, h: cardH, shape: "rect", fill: "transparent", stroke: C.amber, strokeWidth: 2, radius: 10, locked: true }),
      text({ x: innerX, y: eyebrowY, w: innerW, h: 32, text: respEyebrow(c), fontFamily: BARLOW, fontSize: 24, fontWeight: 700, uppercase: true, letterSpacing: 5, color: C.amber }),
      hHead(headMain, innerX, headY, innerW, headH, headSize, "left", C.cream),
      ...(hasBody ? [hBody(c.secondary!, innerX, bodyY, innerW, bodyH)] : []),
    ],
    C.forest
  );
}

// RESPONSE E — Stat-backed: the response line on forest with a small gold
// supporting stat ("12,000 families reached") set beneath it as proof.
function respStatBacked(c: SlideContent): EditorSlide {
  const W = B - 2 * HPAD;
  const line = respLine(c);
  const headSize = 80;
  const headMain = balanceLines(line, W, headSize);
  const headLines = headMain.split("\n").length;
  const headH = Math.round(headLines * headSize * 0.96 + 12);
  const eyebrowY = 300;
  const headY = eyebrowY + 32 + 20;
  const ruleY = headY + headH + 28;
  // Gold proof figure + a short caption beneath the rule.
  const stat = c.secondary || R_SUPPORT;
  const statY = ruleY + 48;
  return slide(
    [
      shape({ x: 0, y: 0, w: B, h: B, shape: "rect", fill: GLOW, locked: true }),
      ...wordmark(HPAD, HPAD, c.logo),
      hTag("On The Ground", B - HPAD - 420, HPAD + 6, 420, "right"),
      hEyebrow(respEyebrow(c), HPAD, eyebrowY, W),
      hHead(headMain, HPAD, headY, W, headH, headSize, "left", C.cream),
      goldBar(HPAD, ruleY, 64),
      // Gold proof stat — the measurable result of the response.
      text({ x: HPAD, y: statY, w: W, h: 96, text: stat, fontFamily: ANTON, fontSize: 84, fontWeight: 400, uppercase: true, lineHeight: 0.96, color: C.amber }),
      text({ x: HPAD, y: statY + 102, w: W, h: 36, text: "Delivered through our field teams", fontFamily: BARLOW, fontSize: 24, fontWeight: 600, uppercase: true, letterSpacing: 3, color: C.creamDim }),
    ],
    C.forest
  );
}

// RESPONSE F — Window crop: an intimate action photo in a rounded window on a
// forest field, with eyebrow + response line beneath (signature crop).
function respWindowCrop(c: SlideContent): EditorSlide {
  const winX = HPAD, winY = 150, winW = B - 2 * HPAD, winH = 552;
  const W = B - 2 * HPAD;
  const line = respLine(c);
  const headSize = 70;
  const eyebrowY = winY + winH + 52;
  const headY = eyebrowY + 32 + 16;
  const headH = Math.round(
    balanceLines(line, W, headSize).split("\n").length * headSize * 0.96 + 12
  );
  return slide(
    [
      shape({ x: 0, y: 0, w: B, h: B, shape: "rect", fill: GLOW, locked: true }),
      ...wordmark(HPAD, HPAD, c.logo),
      hTag("On The Ground", B - HPAD - 420, HPAD + 6, 420, "right"),
      image({ x: winX, y: winY, w: winW, h: winH, src: c.imageUrl ?? "", objectFit: "cover", radius: 18 }),
      shape({ x: winX, y: winY, w: winW, h: winH, shape: "rect", fill: "transparent", stroke: "rgba(212,168,67,0.45)", strokeWidth: 2, radius: 18, locked: true }),
      hEyebrow(respEyebrow(c), HPAD, eyebrowY, W),
      hHead(balanceLines(line, W, headSize), HPAD, headY, W, headH, headSize, "left", C.cream),
    ],
    C.forest
  );
}

// RESPONSE G — Checklist: a heading + a short 3-item checklist of what DR is
// providing on the ground (a gold diamond tick + item per row), on forest.
function respChecklist(c: SlideContent): EditorSlide {
  const W = B - 2 * HPAD;
  const heading = c.primary || "What we're delivering";
  const items = [
    "Hot meals and food parcels",
    "Clean water and medical aid",
    "Emergency shelter for families",
  ];
  const headSize = 76;
  const headY = 244;
  const headMain = balanceLines(heading, W, headSize);
  const headH = Math.round(headMain.split("\n").length * headSize * 0.96 + 12);
  const ruleY = headY + headH + 24;
  const rowsTop = ruleY + 56;
  const rowGap = 132;
  const layers: Layer[] = [
    shape({ x: 0, y: 0, w: B, h: B, shape: "rect", fill: GLOW, locked: true }),
    ...wordmark(HPAD, HPAD, c.logo),
    hTag("On The Ground", B - HPAD - 420, HPAD + 6, 420, "right"),
    hEyebrow(respEyebrow(c), HPAD, headY - 50, W),
    hHead(headMain, HPAD, headY, W, headH, headSize, "left", C.cream),
    goldBar(HPAD, ruleY, 64),
  ];
  items.forEach((it, i) => {
    const y = rowsTop + i * rowGap;
    // Gold diamond tick + the item line.
    layers.push(shape({ x: HPAD + 6, y: y + 14, w: 26, h: 26, shape: "rect", fill: C.amber, rotation: 45 }));
    layers.push(text({ x: HPAD + 70, y, w: W - 70, h: 64, text: it, fontFamily: BARLOW, fontSize: 34, fontWeight: 600, lineHeight: 1.2, color: C.cream }));
    if (i < items.length - 1) layers.push(shape({ x: HPAD, y: y + rowGap - 26, w: W, h: 1, shape: "rect", fill: "rgba(247,243,232,0.16)", locked: true }));
  });
  layers.push(footer(C.creamDim));
  return slide(layers, C.forest);
}

// RESPONSE H — Two-tone: a gold-bordered card — a forest panel carries the
// response line, a cream band below holds the support / URL in dark ink.
function respTwoTone(c: SlideContent): EditorSlide {
  const FPAD = 40; // outer pad → the 1000×1000 frame
  const frameW = B - 2 * FPAD; // 1000
  const bandH = 220; // cream band
  const bandY = B - FPAD - bandH; // ~820
  const inset = 56;
  const innerX = FPAD + inset;
  const innerW = frameW - 2 * inset; // 888
  const line = respLine(c);
  const headSize = 76;
  const headMain = balanceLines(line, innerW, headSize);
  const headLines = headMain.split("\n").length;
  const headH = Math.round(headLines * headSize * 0.96 + 16);
  const headY = bandY - 44 - headH; // 44px clear above the band
  const barY = FPAD + inset;
  const eyebrowY = headY - 46;
  return slide(
    [
      shape({ x: FPAD, y: FPAD, w: frameW, h: frameW, shape: "rect", fill: C.forest, locked: true }),
      shape({ x: FPAD, y: bandY, w: frameW, h: bandH, shape: "rect", fill: C.cream, locked: true }),
      ...wordmark(innerX, barY, c.logo),
      hTag("On The Ground", FPAD + frameW - inset - 420, barY + 6, 420, "right"),
      text({ x: innerX, y: eyebrowY, w: innerW, h: 32, text: respEyebrow(c), fontFamily: BARLOW, fontSize: 24, fontWeight: 700, uppercase: true, letterSpacing: 5, color: C.amber }),
      text({ x: innerX, y: headY, w: innerW, h: headH, text: headMain, fontFamily: ANTON, fontSize: headSize, fontWeight: 400, uppercase: true, lineHeight: 0.96, color: C.cream }),
      // Cream band: dark support (left) + gold-deep URL (right).
      text({ x: innerX, y: bandY + Math.round((bandH - 60) / 2), w: 540, h: 60, text: c.secondary || R_SUPPORT, fontFamily: BARLOW, fontSize: 27, fontWeight: 600, lineHeight: 1.24, color: C.forestDim }),
      text({ x: FPAD + frameW - inset - 420, y: bandY + Math.round((bandH - 44) / 2), w: 420, h: 52, text: "deenrelief.org", fontFamily: ANTON, fontSize: 40, fontWeight: 400, color: C.goldDeep, align: "right" }),
      shape({ x: FPAD, y: FPAD, w: frameW, h: frameW, shape: "rect", fill: "transparent", stroke: C.amber, strokeWidth: 2, locked: true }),
    ],
    C.forest
  );
}

// RESPONSE I — Caption bar: full-bleed action photo with a solid forest caption
// bar at the foot carrying the response line + a field credit.
function respCaptionBar(c: SlideContent): EditorSlide {
  const W = B - 2 * HPAD;
  const line = respLine(c);
  const headSize = 54;
  const twoLine =
    balanceLines(line, W, headSize).split("\n").length > 1;
  const barTop = twoLine ? 770 : 850;
  const headY = barTop + 86;
  const headH = Math.round(
    balanceLines(line, W, headSize).split("\n").length * headSize * 0.96 + 12
  );
  const captionY = headY + headH + 18;
  return slide(
    [
      image({ x: 0, y: 0, w: B, h: B, src: c.imageUrl ?? "", objectFit: "cover" }),
      topScrim(),
      ...wordmark(HPAD, HPAD, c.logo),
      hTag("On The Ground", B - HPAD - 420, HPAD + 6, 420, "right"),
      shape({ x: 0, y: barTop, w: B, h: B - barTop, shape: "rect", fill: C.forest, locked: true }),
      hEyebrow(respEyebrow(c), HPAD, barTop + 42, W),
      hHead(balanceLines(line, W, headSize), HPAD, headY, W, headH, headSize, "left", C.cream),
      text({ x: HPAD, y: captionY, w: W, h: 30, text: "Photograph — Deen Relief field team", fontFamily: BARLOW, fontSize: 23, fontWeight: 500, color: C.creamDim }),
    ],
    C.forest
  );
}

// RESPONSE J — How your gift helps: a "How your gift helps" framing on forest —
// a heading, the response line, a gold-accented impact line, and the URL foot.
function respGiftHelps(c: SlideContent): EditorSlide {
  const W = B - 2 * HPAD;
  const line = respLine(c);
  const headSize = 92;
  const headingY = 232;
  // Fixed heading; the response line is the body that follows.
  const heading = "How your\ngift helps";
  const headH = Math.round(heading.split("\n").length * headSize * 0.96 + 12);
  const ruleY = headingY + headH + 28;
  const lineY = ruleY + 50;
  const lineH = Math.round(
    Math.min(3, Math.max(1, Math.ceil((line.length * 32 * 0.52) / W))) * 32 * 1.34 + 8
  );
  const accentY = lineY + lineH + 24;
  return slide(
    [
      shape({ x: 0, y: 0, w: B, h: B, shape: "rect", fill: GLOW, locked: true }),
      ...wordmark(HPAD, HPAD, c.logo),
      hTag("Your Gift At Work", B - HPAD - 420, HPAD + 6, 420, "right"),
      hEyebrow(respEyebrow(c), HPAD, headingY - 50, W),
      text({ x: HPAD, y: headingY, w: W, h: headH, text: heading, fontFamily: ANTON, fontSize: headSize, fontWeight: 400, uppercase: true, lineHeight: 0.96, color: C.cream }),
      goldBar(HPAD, ruleY, 64),
      // The active response line (what your gift is doing right now).
      text({ x: HPAD, y: lineY, w: W, h: lineH, text: line, fontFamily: BARLOW, fontSize: 32, fontWeight: 500, lineHeight: 1.34, color: C.cream }),
      // Gold-accented impact line beneath.
      text({ x: HPAD, y: accentY, w: W, h: 70, text: c.secondary || R_SUPPORT, fontFamily: BARLOW, fontSize: 30, fontWeight: 700, lineHeight: 1.28, color: C.amber }),
      text({ x: HPAD, y: B - HPAD - 30, w: W, h: 30, text: "deenrelief.org · 100% donation policy", fontFamily: BARLOW, fontSize: 24, fontWeight: 700, uppercase: true, letterSpacing: 4, color: C.creamDim }),
    ],
    C.forest
  );
}

/* ─── Donation-tiers design system (the impact ladder, A–J) ───────── *
 *
 * Ten "Where your gift goes" layouts. Each shows the £30 / £100 / £250
 * impact ladder (or a single hero tier for D) with impact lines, and ends
 * with the deenrelief.org URL. Shared discipline with the Hero/Stat/CTA
 * systems: 78px insets, Anton uppercase amounts, Barlow eyebrow/labels,
 * the gold rule + diamond motif. tiers-a is the v1 `tiersLadder` above.
 */

type Tier = { amt: string; label: string };
const TIERS_DEFAULT: Tier[] = [
  { amt: "£30", label: "Emergency food parcel for a family" },
  { amt: "£100", label: "Winter shelter kit" },
  { amt: "£250", label: "Urgent medical aid" },
];
function tiersHeading(c: SlideContent): string {
  return c.primary || "Where your gift goes";
}

// TIERS B — Over photo: the ladder over a faint full-bleed photo with a
// scrim, the chrome on a top scrim, ending with the URL.
function tiersB(c: SlideContent): EditorSlide {
  const W = B - 2 * HPAD;
  const heading = tiersHeading(c);
  const headSize = 70;
  const headMain = balanceLines(heading, W, headSize);
  const headH = Math.round(headMain.split("\n").length * headSize * 0.96 + 12);
  const headY = 224;
  const ruleY = headY + headH + 22;
  const rowsTop = ruleY + 48;
  const rowGap = 140;
  const layers: Layer[] = [
    image({ x: 0, y: 0, w: B, h: B, src: c.imageUrl ?? "", objectFit: "cover" }),
    shape({ x: 0, y: 0, w: B, h: B, shape: "rect", fill: "rgba(15,42,28,0.86)", locked: true }),
    topScrim(),
    ...wordmark(HPAD, HPAD, c.logo),
    hTag("Palestine Appeal", B - HPAD - 420, HPAD + 6, 420, "right"),
    hHead(headMain, HPAD, headY, W, headH, headSize, "left", C.cream),
    goldBar(HPAD, ruleY, 64),
  ];
  TIERS_DEFAULT.forEach((t, i) => {
    const y = rowsTop + i * rowGap;
    layers.push(text({ x: HPAD, y, w: 240, h: 92, text: t.amt, fontFamily: ANTON, fontSize: 84, fontWeight: 400, color: C.amber }));
    layers.push(text({ x: HPAD + 248, y: y + 20, w: W - 248, h: 64, text: t.label, fontFamily: BARLOW, fontSize: 29, fontWeight: 500, lineHeight: 1.2, color: C.cream }));
    if (i < TIERS_DEFAULT.length - 1) layers.push(shape({ x: HPAD, y: y + rowGap - 26, w: W, h: 1, shape: "rect", fill: "rgba(247,243,232,0.2)", locked: true }));
  });
  layers.push(text({ x: HPAD, y: B - HPAD - 28, w: W, h: 30, text: "deenrelief.org · 100% donation policy", fontFamily: BARLOW, fontSize: 24, fontWeight: 700, uppercase: true, letterSpacing: 4, color: C.amber }));
  return slide(layers, C.forest);
}

// TIERS C — Gold inverted: a full gold field with forest ink. Forest
// wordmark, a forest heading + ladder, the URL foot. The loud ladder.
function tiersC(c: SlideContent): EditorSlide {
  const W = B - 2 * HPAD;
  const heading = tiersHeading(c);
  const headSize = 72;
  const headMain = balanceLines(heading, W, headSize);
  const headH = Math.round(headMain.split("\n").length * headSize * 0.96 + 12);
  const headY = 224;
  const ruleY = headY + headH + 22;
  const rowsTop = ruleY + 50;
  const rowGap = 148;
  const layers: Layer[] = [
    // Forest wordmark on the gold field.
    shape({ x: HPAD, y: HPAD + 4, w: 15, h: 15, shape: "rect", fill: C.forest, rotation: 45 }),
    text({ x: HPAD + 32, y: HPAD, w: 360, h: 30, text: "DEEN RELIEF", fontFamily: BARLOW, fontSize: 24, fontWeight: 700, uppercase: true, letterSpacing: 6, color: C.forest }),
    text({ x: B - HPAD - 420, y: HPAD + 6, w: 420, h: 30, text: "Palestine Appeal", fontFamily: BARLOW, fontSize: 23, fontWeight: 700, uppercase: true, letterSpacing: 4.5, color: C.forest, opacity: 0.7, align: "right" }),
    hHead(headMain, HPAD, headY, W, headH, headSize, "left", C.forest),
    shape({ x: HPAD, y: ruleY, w: 64, h: 3, shape: "rect", fill: C.forest }),
  ];
  TIERS_DEFAULT.forEach((t, i) => {
    const y = rowsTop + i * rowGap;
    layers.push(text({ x: HPAD, y, w: 240, h: 96, text: t.amt, fontFamily: ANTON, fontSize: 86, fontWeight: 400, color: C.forest }));
    layers.push(text({ x: HPAD + 252, y: y + 22, w: W - 252, h: 64, text: t.label, fontFamily: BARLOW, fontSize: 30, fontWeight: 600, lineHeight: 1.2, color: C.forestSoft }));
    if (i < TIERS_DEFAULT.length - 1) layers.push(shape({ x: HPAD, y: y + rowGap - 28, w: W, h: 1, shape: "rect", fill: "rgba(22,56,39,0.28)", locked: true }));
  });
  layers.push(text({ x: HPAD, y: B - HPAD - 30, w: W, h: 30, text: "deenrelief.org · 100% donation policy", fontFamily: BARLOW, fontSize: 24, fontWeight: 700, uppercase: true, letterSpacing: 4, color: C.forest, opacity: 0.78 }));
  return slide(layers, C.amber);
}

// TIERS D — Single hero tier: one colossal amount as the hero, with a
// big impact line beneath ("provides a week of food"), and the URL foot.
function tiersD(c: SlideContent): EditorSlide {
  const W = B - 2 * HPAD;
  const amt = "£50";
  const amtSize = 360;
  const amtH = Math.round(amtSize * 0.82 + 20);
  const labelSize = 56;
  const labelText = "PROVIDES A WEEK\nOF FOOD FOR A FAMILY.";
  const labelLines = labelText.split("\n").length;
  const labelH = Math.round(labelLines * labelSize * 0.96 + 12);
  const eyeGap = 60;
  const groupH = 32 + eyeGap + amtH + 14 + labelH;
  const groupTop = Math.round((B - groupH) / 2) - 8;
  const eyebrowY = groupTop;
  const amtY = eyebrowY + 32 + eyeGap;
  const labelY = amtY + amtH + 14;
  return slide(
    [
      shape({ x: 0, y: 0, w: B, h: B, shape: "rect", fill: GLOW, locked: true }),
      ...wordmark(HPAD, HPAD, c.logo),
      hTag("Palestine Appeal", B - HPAD - 420, HPAD + 6, 420, "right"),
      text({ x: HPAD, y: eyebrowY, w: W, h: 32, text: c.eyebrow || "Where your gift goes", fontFamily: BARLOW, fontSize: 24, fontWeight: 700, uppercase: true, letterSpacing: 5, color: C.amber, align: "center" }),
      text({ x: HPAD, y: amtY, w: W, h: amtH, text: amt, fontFamily: ANTON, fontSize: amtSize, fontWeight: 400, uppercase: true, lineHeight: 0.82, letterSpacing: -4, color: C.amber, align: "center" }),
      text({ x: HPAD, y: labelY, w: W, h: labelH, text: labelText, fontFamily: ANTON, fontSize: labelSize, fontWeight: 400, uppercase: true, lineHeight: 0.96, color: C.cream, align: "center" }),
      text({ x: HPAD, y: B - HPAD - 28, w: W, h: 30, text: "deenrelief.org · 100% donation policy", fontFamily: BARLOW, fontSize: 22, fontWeight: 600, uppercase: true, letterSpacing: 3, color: C.creamDim, align: "center" }),
    ],
    C.forest
  );
}

// TIERS E — Split: photo on the left half, the ladder on a forest panel
// right, with a heading and the URL foot.
function tiersE(c: SlideContent): EditorSlide {
  const half = Math.round(B / 2); // 540
  const pad = 56;
  const panelX = half + pad; // 596
  const panelW = B - panelX - pad; // 428
  const heading = tiersHeading(c);
  const headSize = 48;
  const headMain = balanceLines(heading, panelW, headSize);
  const headH = Math.round(headMain.split("\n").length * headSize * 0.96 + 12);
  const headY = 168;
  const ruleY = headY + headH + 22;
  const rowsTop = ruleY + 42;
  const rowGap = 168;
  const layers: Layer[] = [
    image({ x: 0, y: 0, w: half, h: B, src: c.imageUrl ?? "", objectFit: "cover" }),
    shape({ x: half, y: 0, w: B - half, h: B, shape: "rect", fill: C.forest, locked: true }),
    ...wordmark(panelX, HPAD, c.logo),
    text({ x: panelX, y: headY, w: panelW, h: headH, text: headMain, fontFamily: ANTON, fontSize: headSize, fontWeight: 400, uppercase: true, lineHeight: 0.96, color: C.cream }),
    goldBar(panelX, ruleY, 56),
  ];
  TIERS_DEFAULT.forEach((t, i) => {
    const y = rowsTop + i * rowGap;
    layers.push(text({ x: panelX, y, w: panelW, h: 80, text: t.amt, fontFamily: ANTON, fontSize: 72, fontWeight: 400, color: C.amber }));
    layers.push(text({ x: panelX, y: y + 74, w: panelW, h: 56, text: t.label, fontFamily: BARLOW, fontSize: 24, fontWeight: 500, lineHeight: 1.18, color: C.creamDim }));
  });
  layers.push(text({ x: panelX, y: B - HPAD - 28, w: panelW, h: 30, text: "deenrelief.org", fontFamily: BARLOW, fontSize: 22, fontWeight: 700, uppercase: true, letterSpacing: 3, color: C.amber }));
  return slide(layers, C.forest);
}

// TIERS F — With total ask: a heading + the ladder + a closing total-ask
// line ("£380 funds a family's month"), and the URL foot.
function tiersF(c: SlideContent): EditorSlide {
  const W = B - 2 * HPAD;
  const heading = tiersHeading(c);
  const headSize = 70;
  const headMain = balanceLines(heading, W, headSize);
  const headH = Math.round(headMain.split("\n").length * headSize * 0.96 + 12);
  const headY = 196;
  const ruleY = headY + headH + 20;
  const rowsTop = ruleY + 44;
  const rowGap = 128;
  const askY = rowsTop + 3 * rowGap + 6;
  const layers: Layer[] = [
    shape({ x: 0, y: 0, w: B, h: B, shape: "rect", fill: GLOW, locked: true }),
    ...wordmark(HPAD, HPAD, c.logo),
    hTag("Palestine Appeal", B - HPAD - 420, HPAD + 6, 420, "right"),
    hHead(headMain, HPAD, headY, W, headH, headSize, "left", C.cream),
    goldBar(HPAD, ruleY, 64),
  ];
  TIERS_DEFAULT.forEach((t, i) => {
    const y = rowsTop + i * rowGap;
    layers.push(text({ x: HPAD, y, w: 220, h: 80, text: t.amt, fontFamily: ANTON, fontSize: 72, fontWeight: 400, color: C.amber }));
    layers.push(text({ x: HPAD + 232, y: y + 18, w: W - 232, h: 56, text: t.label, fontFamily: BARLOW, fontSize: 28, fontWeight: 500, lineHeight: 1.2, color: C.cream }));
    layers.push(shape({ x: HPAD, y: y + rowGap - 22, w: W, h: 1, shape: "rect", fill: "rgba(247,243,232,0.16)", locked: true }));
  });
  // Total-ask line: a gold lead-in + cream sum.
  layers.push(text({ x: HPAD, y: askY, w: 320, h: 64, text: "£380", fontFamily: ANTON, fontSize: 56, fontWeight: 400, color: C.amber }));
  layers.push(text({ x: HPAD + 188, y: askY + 14, w: W - 188, h: 56, text: "funds a family's whole month.", fontFamily: BARLOW, fontSize: 28, fontWeight: 700, lineHeight: 1.2, color: C.cream }));
  layers.push(footer(C.creamDim));
  return slide(layers, C.forest);
}

// TIERS G — Zakat-framed: a "Your Zakat" eyebrow + heading, the ladder,
// and the URL foot — the same impact ladder framed as zakat-eligible.
function tiersG(c: SlideContent): EditorSlide {
  const W = B - 2 * HPAD;
  const headSize = 76;
  const heading = "Your Zakat,\nat work";
  const headH = Math.round(heading.split("\n").length * headSize * 0.96 + 12);
  const headingY = 220;
  const ruleY = headingY + headH + 22;
  const rowsTop = ruleY + 50;
  const rowGap = 150;
  const layers: Layer[] = [
    shape({ x: 0, y: 0, w: B, h: B, shape: "rect", fill: GLOW, locked: true }),
    ...wordmark(HPAD, HPAD, c.logo),
    hTag("Zakat Eligible", B - HPAD - 420, HPAD + 6, 420, "right"),
    hEyebrow(c.eyebrow || "Your Zakat · Palestine", HPAD, headingY - 50, W),
    text({ x: HPAD, y: headingY, w: W, h: headH, text: heading, fontFamily: ANTON, fontSize: headSize, fontWeight: 400, uppercase: true, lineHeight: 0.96, color: C.cream }),
    goldBar(HPAD, ruleY, 64),
  ];
  TIERS_DEFAULT.forEach((t, i) => {
    const y = rowsTop + i * rowGap;
    layers.push(text({ x: HPAD, y, w: 240, h: 96, text: t.amt, fontFamily: ANTON, fontSize: 88, fontWeight: 400, color: C.amber }));
    layers.push(text({ x: HPAD + 256, y: y + 22, w: W - 256, h: 64, text: t.label, fontFamily: BARLOW, fontSize: 30, fontWeight: 500, lineHeight: 1.2, color: C.cream }));
    if (i < TIERS_DEFAULT.length - 1) layers.push(shape({ x: HPAD, y: y + rowGap - 28, w: W, h: 1, shape: "rect", fill: "rgba(247,243,232,0.16)", locked: true }));
  });
  layers.push(text({ x: HPAD, y: B - HPAD - 28, w: W, h: 30, text: "deenrelief.org · 100% Zakat policy", fontFamily: BARLOW, fontSize: 22, fontWeight: 600, uppercase: true, letterSpacing: 3, color: C.amber }));
  return slide(layers, C.forest);
}

// TIERS H — Two-tone: a gold-bordered card with a forest panel carrying the
// heading + ladder, and a cream band holding the URL in dark ink.
function tiersH(c: SlideContent): EditorSlide {
  const FPAD = 40;
  const frameW = B - 2 * FPAD; // 1000
  const bandH = 180;
  const bandY = B - FPAD - bandH;
  const inset = 56;
  const innerX = FPAD + inset;
  const innerW = frameW - 2 * inset; // 888
  const heading = tiersHeading(c);
  const headSize = 60;
  const headMain = balanceLines(heading, innerW, headSize);
  const headH = Math.round(headMain.split("\n").length * headSize * 0.96 + 12);
  const barY = FPAD + inset;
  const headY = barY + 60;
  const ruleY = headY + headH + 20;
  const rowsTop = ruleY + 40;
  const rowGap = 132;
  const layers: Layer[] = [
    shape({ x: FPAD, y: FPAD, w: frameW, h: frameW, shape: "rect", fill: C.forest, locked: true }),
    shape({ x: FPAD, y: bandY, w: frameW, h: bandH, shape: "rect", fill: C.cream, locked: true }),
    ...wordmark(innerX, barY, c.logo),
    hTag("Palestine Appeal", FPAD + frameW - inset - 420, barY + 6, 420, "right"),
    text({ x: innerX, y: headY, w: innerW, h: headH, text: headMain, fontFamily: ANTON, fontSize: headSize, fontWeight: 400, uppercase: true, lineHeight: 0.96, color: C.cream }),
    goldBar(innerX, ruleY, 64),
  ];
  TIERS_DEFAULT.forEach((t, i) => {
    const y = rowsTop + i * rowGap;
    layers.push(text({ x: innerX, y, w: 220, h: 80, text: t.amt, fontFamily: ANTON, fontSize: 70, fontWeight: 400, color: C.amber }));
    layers.push(text({ x: innerX + 232, y: y + 16, w: innerW - 232, h: 56, text: t.label, fontFamily: BARLOW, fontSize: 27, fontWeight: 500, lineHeight: 1.2, color: C.cream }));
  });
  // Cream band: a dark label (left) + gold-deep URL (right).
  layers.push(text({ x: innerX, y: bandY + Math.round((bandH - 34) / 2), w: 540, h: 34, text: "Every gift counts", fontFamily: BARLOW, fontSize: 26, fontWeight: 700, uppercase: true, letterSpacing: 1, color: C.forestDim }));
  layers.push(text({ x: FPAD + frameW - inset - 420, y: bandY + Math.round((bandH - 44) / 2), w: 420, h: 52, text: "deenrelief.org", fontFamily: ANTON, fontSize: 40, fontWeight: 400, color: C.goldDeep, align: "right" }));
  layers.push(shape({ x: FPAD, y: FPAD, w: frameW, h: frameW, shape: "rect", fill: "transparent", stroke: C.amber, strokeWidth: 2, locked: true }));
  return slide(layers, C.forest);
}

// TIERS I — Keyline card: the ladder inside a gold keyline card on forest,
// with an eyebrow, heading and the URL foot.
function tiersI(c: SlideContent): EditorSlide {
  const cardX = HPAD;
  const cardY = 150;
  const cardW = B - 2 * HPAD; // 924
  const cardH = B - cardY - HPAD; // 852
  const inset = 52;
  const innerX = cardX + inset;
  const innerW = cardW - 2 * inset; // 820
  const heading = tiersHeading(c);
  const headSize = 60;
  const headMain = balanceLines(heading, innerW, headSize);
  const headH = Math.round(headMain.split("\n").length * headSize * 0.96 + 12);
  const eyebrowY = cardY + inset;
  const headY = eyebrowY + 40;
  const ruleY = headY + headH + 18;
  const rowsTop = ruleY + 38;
  const rowGap = 134;
  const layers: Layer[] = [
    shape({ x: 0, y: 0, w: B, h: B, shape: "rect", fill: GLOW, locked: true }),
    ...wordmark(HPAD, HPAD, c.logo),
    hTag("Palestine Appeal", B - HPAD - 420, HPAD + 6, 420, "right"),
    // The gold keyline card.
    shape({ x: cardX, y: cardY, w: cardW, h: cardH, shape: "rect", fill: "transparent", stroke: C.amber, strokeWidth: 2, radius: 10, locked: true }),
    text({ x: innerX, y: eyebrowY, w: innerW, h: 32, text: c.eyebrow || "Where your gift goes", fontFamily: BARLOW, fontSize: 22, fontWeight: 700, uppercase: true, letterSpacing: 4, color: C.amber }),
    text({ x: innerX, y: headY, w: innerW, h: headH, text: headMain, fontFamily: ANTON, fontSize: headSize, fontWeight: 400, uppercase: true, lineHeight: 0.96, color: C.cream }),
    goldBar(innerX, ruleY, 56),
  ];
  TIERS_DEFAULT.forEach((t, i) => {
    const y = rowsTop + i * rowGap;
    layers.push(text({ x: innerX, y, w: 220, h: 80, text: t.amt, fontFamily: ANTON, fontSize: 72, fontWeight: 400, color: C.amber }));
    layers.push(text({ x: innerX + 232, y: y + 16, w: innerW - 232, h: 56, text: t.label, fontFamily: BARLOW, fontSize: 27, fontWeight: 500, lineHeight: 1.2, color: C.cream }));
    if (i < TIERS_DEFAULT.length - 1) layers.push(shape({ x: innerX, y: y + rowGap - 24, w: innerW, h: 1, shape: "rect", fill: "rgba(247,243,232,0.16)", locked: true }));
  });
  layers.push(text({ x: innerX, y: cardY + cardH - inset - 6, w: innerW, h: 30, text: "deenrelief.org", fontFamily: BARLOW, fontSize: 22, fontWeight: 700, uppercase: true, letterSpacing: 3, color: C.amber }));
  return slide(layers, C.forest);
}

// TIERS J — Scan to give: a QR placeholder block beside the ladder, ending
// with the URL — the donor scans to give at any tier.
function tiersJ(c: SlideContent): EditorSlide {
  const W = B - 2 * HPAD;
  const heading = tiersHeading(c);
  const headSize = 64;
  const headMain = balanceLines(heading, W, headSize);
  const headH = Math.round(headMain.split("\n").length * headSize * 0.96 + 12);
  const headY = 200;
  const ruleY = headY + headH + 20;
  // QR placeholder block, lower-right.
  const qr = 300;
  const qrX = B - HPAD - qr;
  const qrY = ruleY + 44;
  const gridLayers: Layer[] = [];
  const cells = 5;
  const cell = Math.round((qr - 48) / cells);
  const gx = qrX + 24, gy = qrY + 24;
  for (let i = 1; i < cells; i++) {
    gridLayers.push(shape({ x: gx + i * cell, y: gy, w: 1, h: cell * cells, shape: "rect", fill: "rgba(22,56,39,0.18)", locked: true }));
    gridLayers.push(shape({ x: gx, y: gy + i * cell, w: cell * cells, h: 1, shape: "rect", fill: "rgba(22,56,39,0.18)", locked: true }));
  }
  gridLayers.push(shape({ x: gx + 6, y: gy + 6, w: cell - 8, h: cell - 8, shape: "rect", fill: C.forest, radius: 3, locked: true }));
  gridLayers.push(shape({ x: gx + (cells - 1) * cell + 8, y: gy + 6, w: cell - 8, h: cell - 8, shape: "rect", fill: C.forest, radius: 3, locked: true }));
  gridLayers.push(shape({ x: gx + 6, y: gy + (cells - 1) * cell + 8, w: cell - 8, h: cell - 8, shape: "rect", fill: C.forest, radius: 3, locked: true }));
  const ladderW = qrX - HPAD - 56;
  const rowsTop = qrY + 4;
  const rowGap = 100;
  const layers: Layer[] = [
    shape({ x: 0, y: 0, w: B, h: B, shape: "rect", fill: GLOW, locked: true }),
    ...wordmark(HPAD, HPAD, c.logo),
    hTag("Scan To Give", B - HPAD - 420, HPAD + 6, 420, "right"),
    hHead(headMain, HPAD, headY, W, headH, headSize, "left", C.cream),
    goldBar(HPAD, ruleY, 64),
    // QR placeholder.
    shape({ x: qrX, y: qrY, w: qr, h: qr, shape: "rect", fill: C.cream, radius: 18, locked: true }),
    shape({ x: qrX, y: qrY, w: qr, h: qr, shape: "rect", fill: "transparent", stroke: C.amber, strokeWidth: 3, radius: 18, locked: true }),
    ...gridLayers,
  ];
  TIERS_DEFAULT.forEach((t, i) => {
    const y = rowsTop + i * rowGap;
    layers.push(text({ x: HPAD, y, w: 180, h: 64, text: t.amt, fontFamily: ANTON, fontSize: 56, fontWeight: 400, color: C.amber }));
    layers.push(text({ x: HPAD, y: y + 56, w: ladderW, h: 36, text: t.label, fontFamily: BARLOW, fontSize: 23, fontWeight: 500, lineHeight: 1.16, color: C.creamDim }));
  });
  layers.push(text({ x: HPAD, y: B - HPAD - 28, w: W, h: 30, text: "deenrelief.org · Point your camera to donate", fontFamily: BARLOW, fontSize: 22, fontWeight: 700, uppercase: true, letterSpacing: 3, color: C.amber }));
  return slide(layers, C.forest);
}

/* ─── Before/After design system (then-and-now contrast, A–J) ─────── *
 *
 * Ten "Then & now" layouts. Each contrasts a before figure with an after
 * figure (default "36 → 7 hospitals") and carries a source line. Shared
 * discipline with the Hero/Stat systems: 78px insets, Anton numerals,
 * Barlow labels, gold rule/divider. beforeafter-a is the v1 `beforeAfter`.
 */

type BAState = { eyebrow: string; num: string; label: string };
const BA_BEFORE: BAState = { eyebrow: "Before · Oct 2023", num: "36", label: "Hospitals functioning" };
const BA_AFTER: BAState = { eyebrow: "Now · May 2026", num: "7", label: "Hospitals functioning" };
function baSource(c: SlideContent): string {
  return c.secondary || "Source: WHO · 2026";
}

// BEFORE/AFTER B — Vertical stack: the before figure over the after figure,
// joined by a gold divider, with a heading and a source foot.
function beforeafterB(c: SlideContent): EditorSlide {
  const W = B - 2 * HPAD;
  const numSize = 150;
  const layers: Layer[] = [
    shape({ x: 0, y: 0, w: B, h: B, shape: "rect", fill: GLOW, locked: true }),
    ...wordmark(HPAD, HPAD, c.logo),
    hTag("Palestine Appeal", B - HPAD - 420, HPAD + 6, 420, "right"),
    ...(c.primary ? [hHead(balanceLines(c.primary, W, 56), HPAD, 200, W, 76, 56, "left", C.cream)] : []),
    // BEFORE row (upper).
    text({ x: HPAD, y: 318, w: W, h: 30, text: BA_BEFORE.eyebrow, fontFamily: BARLOW, fontSize: 22, fontWeight: 700, uppercase: true, letterSpacing: 3, color: C.creamDim }),
    text({ x: HPAD, y: 348, w: 280, h: 156, text: BA_BEFORE.num, fontFamily: ANTON, fontSize: numSize, fontWeight: 400, lineHeight: 0.9, color: C.cream }),
    text({ x: HPAD + 300, y: 412, w: W - 300, h: 56, text: BA_BEFORE.label, fontFamily: BARLOW, fontSize: 30, fontWeight: 600, uppercase: true, letterSpacing: 1, color: C.creamDim }),
    // Gold divider between the two rows.
    shape({ x: HPAD, y: 540, w: W, h: 2, shape: "rect", fill: C.amber, locked: true }),
    // AFTER row (lower).
    text({ x: HPAD, y: 578, w: W, h: 30, text: BA_AFTER.eyebrow, fontFamily: BARLOW, fontSize: 22, fontWeight: 700, uppercase: true, letterSpacing: 3, color: C.amber }),
    text({ x: HPAD, y: 608, w: 280, h: 156, text: BA_AFTER.num, fontFamily: ANTON, fontSize: numSize, fontWeight: 400, lineHeight: 0.9, color: C.amber }),
    text({ x: HPAD + 300, y: 672, w: W - 300, h: 56, text: BA_AFTER.label, fontFamily: BARLOW, fontSize: 30, fontWeight: 600, uppercase: true, letterSpacing: 1, color: C.creamDim }),
    text({ x: HPAD, y: B - HPAD - 28, w: W, h: 30, text: baSource(c), fontFamily: BARLOW, fontSize: 22, fontWeight: 500, color: C.creamDim }),
  ];
  return slide(layers, C.forest);
}

// BEFORE/AFTER C — Two photos: a left/right photo split, each with a scrim
// and a "before"/"after" label + figure, and a source foot.
function beforeafterC(c: SlideContent): EditorSlide {
  const half = Math.round(B / 2);
  const W = B - 2 * HPAD;
  const numSize = 160;
  return slide(
    [
      image({ x: 0, y: 0, w: half, h: B, src: c.imageUrl ?? "", objectFit: "cover" }),
      image({ x: half, y: 0, w: B - half, h: B, src: c.imageUrl ?? "", objectFit: "cover" }),
      // Per-side scrims so the labels stay legible.
      shape({ x: 0, y: 0, w: half, h: B, shape: "rect", fill: "linear-gradient(to top, rgba(15,42,28,0.94) 0%, rgba(15,42,28,0.3) 55%, rgba(15,42,28,0.7) 100%)", locked: true }),
      shape({ x: half, y: 0, w: B - half, h: B, shape: "rect", fill: "linear-gradient(to top, rgba(15,42,28,0.94) 0%, rgba(15,42,28,0.3) 55%, rgba(15,42,28,0.7) 100%)", locked: true }),
      // Centre gold divider.
      shape({ x: half - 1, y: 0, w: 2, h: B, shape: "rect", fill: C.amber, locked: true }),
      ...wordmark(HPAD, HPAD, c.logo),
      text({ x: B - HPAD - 420, y: HPAD + 6, w: 420, h: 30, text: "Palestine Appeal", fontFamily: BARLOW, fontSize: 23, fontWeight: 700, uppercase: true, letterSpacing: 4.5, color: C.cream, opacity: 0.7, align: "right" }),
      // BEFORE side.
      text({ x: HPAD, y: 540, w: half - HPAD - 30, h: 30, text: BA_BEFORE.eyebrow, fontFamily: BARLOW, fontSize: 22, fontWeight: 700, uppercase: true, letterSpacing: 3, color: C.creamDim }),
      text({ x: HPAD, y: 574, w: half - HPAD - 30, h: 160, text: BA_BEFORE.num, fontFamily: ANTON, fontSize: numSize, fontWeight: 400, lineHeight: 0.9, color: C.cream }),
      text({ x: HPAD, y: 742, w: half - HPAD - 30, h: 56, text: BA_BEFORE.label, fontFamily: BARLOW, fontSize: 26, fontWeight: 600, uppercase: true, letterSpacing: 1, color: C.creamDim }),
      // AFTER side.
      text({ x: half + 30, y: 540, w: half - HPAD - 30, h: 30, text: BA_AFTER.eyebrow, fontFamily: BARLOW, fontSize: 22, fontWeight: 700, uppercase: true, letterSpacing: 3, color: C.amber }),
      text({ x: half + 30, y: 574, w: half - HPAD - 30, h: 160, text: BA_AFTER.num, fontFamily: ANTON, fontSize: numSize, fontWeight: 400, lineHeight: 0.9, color: C.amber }),
      text({ x: half + 30, y: 742, w: half - HPAD - 30, h: 56, text: BA_AFTER.label, fontFamily: BARLOW, fontSize: 26, fontWeight: 600, uppercase: true, letterSpacing: 1, color: C.creamDim }),
      text({ x: HPAD, y: B - HPAD - 28, w: W, h: 30, text: baSource(c), fontFamily: BARLOW, fontSize: 22, fontWeight: 500, color: C.creamDim, align: "center" }),
    ],
    C.forest
  );
}

// BEFORE/AFTER D — Connecting arrow: the two figures on one row joined by a
// gold connecting arrow ("36 → 7"), a heading, and a source foot.
function beforeafterD(c: SlideContent): EditorSlide {
  const W = B - 2 * HPAD;
  const numSize = 220;
  const numH = Math.round(numSize * 0.9);
  const rowY = 432;
  const leftX = HPAD;
  const leftW = 320;
  const rightX = B - HPAD - 320;
  const rightW = 320;
  // Arrow between the two figures: a gold rule + a chevron-ish head built
  // from two short rotated rules.
  const arrowY = rowY + Math.round(numH / 2);
  const arrowX0 = leftX + leftW + 8;
  const arrowX1 = rightX - 8;
  return slide(
    [
      shape({ x: 0, y: 0, w: B, h: B, shape: "rect", fill: GLOW, locked: true }),
      ...wordmark(HPAD, HPAD, c.logo),
      hTag("Palestine Appeal", B - HPAD - 420, HPAD + 6, 420, "right"),
      ...(c.primary ? [hHead(balanceLines(c.primary, W, 60), HPAD, 232, W, 80, 60, "center", C.cream)] : []),
      // BEFORE figure (left).
      text({ x: leftX, y: rowY - 50, w: leftW, h: 30, text: BA_BEFORE.eyebrow, fontFamily: BARLOW, fontSize: 22, fontWeight: 700, uppercase: true, letterSpacing: 3, color: C.creamDim, align: "center" }),
      text({ x: leftX, y: rowY, w: leftW, h: numH, text: BA_BEFORE.num, fontFamily: ANTON, fontSize: numSize, fontWeight: 400, lineHeight: 0.9, color: C.cream, align: "center" }),
      text({ x: leftX, y: rowY + numH + 4, w: leftW, h: 56, text: BA_BEFORE.label, fontFamily: BARLOW, fontSize: 24, fontWeight: 600, uppercase: true, letterSpacing: 1, color: C.creamDim, align: "center" }),
      // AFTER figure (right).
      text({ x: rightX, y: rowY - 50, w: rightW, h: 30, text: BA_AFTER.eyebrow, fontFamily: BARLOW, fontSize: 22, fontWeight: 700, uppercase: true, letterSpacing: 3, color: C.amber, align: "center" }),
      text({ x: rightX, y: rowY, w: rightW, h: numH, text: BA_AFTER.num, fontFamily: ANTON, fontSize: numSize, fontWeight: 400, lineHeight: 0.9, color: C.amber, align: "center" }),
      text({ x: rightX, y: rowY + numH + 4, w: rightW, h: 56, text: BA_AFTER.label, fontFamily: BARLOW, fontSize: 24, fontWeight: 600, uppercase: true, letterSpacing: 1, color: C.creamDim, align: "center" }),
      // Connecting arrow shaft + head.
      shape({ x: arrowX0, y: arrowY - 2, w: arrowX1 - arrowX0, h: 4, shape: "rect", fill: C.amber, locked: true }),
      shape({ x: arrowX1 - 22, y: arrowY - 16, w: 26, h: 4, shape: "rect", fill: C.amber, rotation: 45, locked: true }),
      shape({ x: arrowX1 - 22, y: arrowY + 16, w: 26, h: 4, shape: "rect", fill: C.amber, rotation: -45, locked: true }),
      text({ x: HPAD, y: B - HPAD - 28, w: W, h: 30, text: baSource(c), fontFamily: BARLOW, fontSize: 22, fontWeight: 500, color: C.creamDim, align: "center" }),
    ],
    C.forest
  );
}

// BEFORE/AFTER E — Small 'then' vs big 'now': the before figure set small,
// the after figure colossal, dramatising the collapse. With a source foot.
function beforeafterE(c: SlideContent): EditorSlide {
  const W = B - 2 * HPAD;
  const layers: Layer[] = [
    shape({ x: 0, y: 0, w: B, h: B, shape: "rect", fill: GLOW, locked: true }),
    ...wordmark(HPAD, HPAD, c.logo),
    hTag("Palestine Appeal", B - HPAD - 420, HPAD + 6, 420, "right"),
    ...(c.primary ? [hEyebrow(c.primary, HPAD, 232, W)] : [hEyebrow(c.eyebrow || "Then vs now", HPAD, 232, W)]),
    // Small 'then'.
    text({ x: HPAD, y: 300, w: W, h: 30, text: BA_BEFORE.eyebrow, fontFamily: BARLOW, fontSize: 22, fontWeight: 700, uppercase: true, letterSpacing: 3, color: C.creamDim }),
    text({ x: HPAD, y: 330, w: 200, h: 90, text: BA_BEFORE.num, fontFamily: ANTON, fontSize: 90, fontWeight: 400, lineHeight: 0.9, color: C.creamDim }),
    text({ x: HPAD + 168, y: 366, w: W - 168, h: 40, text: BA_BEFORE.label, fontFamily: BARLOW, fontSize: 26, fontWeight: 600, uppercase: true, letterSpacing: 1, color: C.creamDim }),
    // Big 'now'.
    text({ x: HPAD, y: 470, w: W, h: 30, text: BA_AFTER.eyebrow, fontFamily: BARLOW, fontSize: 24, fontWeight: 700, uppercase: true, letterSpacing: 4, color: C.amber }),
    text({ x: HPAD, y: 506, w: 480, h: 320, text: BA_AFTER.num, fontFamily: ANTON, fontSize: 360, fontWeight: 400, lineHeight: 0.82, letterSpacing: -4, color: C.amber }),
    text({ x: HPAD, y: 792, w: W, h: 50, text: BA_AFTER.label, fontFamily: ANTON, fontSize: 50, fontWeight: 400, uppercase: true, lineHeight: 0.96, color: C.cream }),
    text({ x: HPAD, y: B - HPAD - 28, w: W, h: 30, text: baSource(c), fontFamily: BARLOW, fontSize: 22, fontWeight: 500, color: C.creamDim }),
  ];
  return slide(layers, C.forest);
}

// BEFORE/AFTER F — Two-tone: a gold-bordered card with a forest panel
// carrying the before/after contrast, and a cream band holding the source.
function beforeafterF(c: SlideContent): EditorSlide {
  const FPAD = 40;
  const frameW = B - 2 * FPAD;
  const bandH = 180;
  const bandY = B - FPAD - bandH;
  const inset = 56;
  const innerX = FPAD + inset;
  const innerW = frameW - 2 * inset;
  const cx = Math.round(B / 2);
  const colW = Math.round((innerW - 80) / 2);
  const leftX = innerX;
  const rightX = cx + 40;
  const numY = 420;
  const numSize = 170;
  const barY = FPAD + inset;
  const layers: Layer[] = [
    shape({ x: FPAD, y: FPAD, w: frameW, h: frameW, shape: "rect", fill: C.forest, locked: true }),
    shape({ x: FPAD, y: bandY, w: frameW, h: bandH, shape: "rect", fill: C.cream, locked: true }),
    ...wordmark(innerX, barY, c.logo),
    hTag("Then & Now", FPAD + frameW - inset - 420, barY + 6, 420, "right"),
    ...(c.primary ? [hHead(balanceLines(c.primary, innerW, 56), innerX, barY + 64, innerW, 76, 56, "center", C.cream)] : []),
    shape({ x: cx - 1, y: numY - 40, w: 2, h: 300, shape: "rect", fill: C.amber, locked: true }),
    // BEFORE column.
    text({ x: leftX, y: numY - 50, w: colW, h: 30, text: BA_BEFORE.eyebrow, fontFamily: BARLOW, fontSize: 21, fontWeight: 700, uppercase: true, letterSpacing: 3, color: C.creamDim, align: "center" }),
    text({ x: leftX, y: numY, w: colW, h: 176, text: BA_BEFORE.num, fontFamily: ANTON, fontSize: numSize, fontWeight: 400, lineHeight: 0.9, color: C.cream, align: "center" }),
    text({ x: leftX, y: numY + 178, w: colW, h: 56, text: BA_BEFORE.label, fontFamily: BARLOW, fontSize: 23, fontWeight: 600, uppercase: true, letterSpacing: 1, color: C.creamDim, align: "center" }),
    // AFTER column.
    text({ x: rightX, y: numY - 50, w: colW, h: 30, text: BA_AFTER.eyebrow, fontFamily: BARLOW, fontSize: 21, fontWeight: 700, uppercase: true, letterSpacing: 3, color: C.amber, align: "center" }),
    text({ x: rightX, y: numY, w: colW, h: 176, text: BA_AFTER.num, fontFamily: ANTON, fontSize: numSize, fontWeight: 400, lineHeight: 0.9, color: C.amber, align: "center" }),
    text({ x: rightX, y: numY + 178, w: colW, h: 56, text: BA_AFTER.label, fontFamily: BARLOW, fontSize: 23, fontWeight: 600, uppercase: true, letterSpacing: 1, color: C.creamDim, align: "center" }),
    // Cream band: source (left) + URL (right).
    text({ x: innerX, y: bandY + Math.round((bandH - 34) / 2), w: 540, h: 34, text: baSource(c), fontFamily: BARLOW, fontSize: 24, fontWeight: 700, uppercase: true, letterSpacing: 1, color: C.forestDim }),
    text({ x: FPAD + frameW - inset - 420, y: bandY + Math.round((bandH - 44) / 2), w: 420, h: 52, text: "deenrelief.org", fontFamily: ANTON, fontSize: 40, fontWeight: 400, color: C.goldDeep, align: "right" }),
    shape({ x: FPAD, y: FPAD, w: frameW, h: frameW, shape: "rect", fill: "transparent", stroke: C.amber, strokeWidth: 2, locked: true }),
  ];
  return slide(layers, C.forest);
}

// BEFORE/AFTER G — Over photo: the before/after contrast over a faint
// full-bleed photo with a scrim, chrome on a top scrim, a source foot.
function beforeafterG(c: SlideContent): EditorSlide {
  const cx = Math.round(B / 2);
  const W = B - 2 * HPAD;
  const numY = 432;
  const numSize = 190;
  const colW = Math.round((B - 2 * HPAD - 80) / 2);
  const leftX = HPAD;
  const rightX = cx + 40;
  return slide(
    [
      image({ x: 0, y: 0, w: B, h: B, src: c.imageUrl ?? "", objectFit: "cover" }),
      shape({ x: 0, y: 0, w: B, h: B, shape: "rect", fill: "rgba(15,42,28,0.86)", locked: true }),
      topScrim(),
      ...wordmark(HPAD, HPAD, c.logo),
      hTag("Palestine Appeal", B - HPAD - 420, HPAD + 6, 420, "right"),
      ...(c.primary ? [hHead(balanceLines(c.primary, W, 60), HPAD, 232, W, 80, 60, "center", C.cream)] : []),
      shape({ x: cx - 1, y: 384, w: 2, h: 320, shape: "rect", fill: C.amber, locked: true }),
      text({ x: leftX, y: numY - 54, w: colW, h: 32, text: BA_BEFORE.eyebrow, fontFamily: BARLOW, fontSize: 22, fontWeight: 700, uppercase: true, letterSpacing: 3, color: C.creamDim, align: "center" }),
      text({ x: leftX, y: numY, w: colW, h: 196, text: BA_BEFORE.num, fontFamily: ANTON, fontSize: numSize, fontWeight: 400, lineHeight: 0.9, color: C.cream, align: "center" }),
      text({ x: leftX, y: numY + 192, w: colW, h: 60, text: BA_BEFORE.label, fontFamily: BARLOW, fontSize: 25, fontWeight: 600, uppercase: true, letterSpacing: 1, color: C.creamDim, align: "center" }),
      text({ x: rightX, y: numY - 54, w: colW, h: 32, text: BA_AFTER.eyebrow, fontFamily: BARLOW, fontSize: 22, fontWeight: 700, uppercase: true, letterSpacing: 3, color: C.amber, align: "center" }),
      text({ x: rightX, y: numY, w: colW, h: 196, text: BA_AFTER.num, fontFamily: ANTON, fontSize: numSize, fontWeight: 400, lineHeight: 0.9, color: C.amber, align: "center" }),
      text({ x: rightX, y: numY + 192, w: colW, h: 60, text: BA_AFTER.label, fontFamily: BARLOW, fontSize: 25, fontWeight: 600, uppercase: true, letterSpacing: 1, color: C.creamDim, align: "center" }),
      text({ x: HPAD, y: B - HPAD - 28, w: W, h: 30, text: baSource(c), fontFamily: BARLOW, fontSize: 22, fontWeight: 500, color: C.creamDim, align: "center" }),
    ],
    C.forest
  );
}

// BEFORE/AFTER H — Timeline: a before → after laid on a horizontal timeline
// with a dateline at each end and a source foot.
function beforeafterH(c: SlideContent): EditorSlide {
  const W = B - 2 * HPAD;
  const lineY = 470;
  const numY = lineY + 60;
  const numSize = 170;
  const leftX = HPAD;
  const rightX = B - HPAD - 320;
  const layers: Layer[] = [
    shape({ x: 0, y: 0, w: B, h: B, shape: "rect", fill: GLOW, locked: true }),
    ...wordmark(HPAD, HPAD, c.logo),
    hTag("Palestine Appeal", B - HPAD - 420, HPAD + 6, 420, "right"),
    ...(c.primary ? [hHead(balanceLines(c.primary, W, 56), HPAD, 232, W, 76, 56, "left", C.cream)] : []),
    // Timeline rule with end nodes.
    shape({ x: HPAD, y: lineY, w: W, h: 3, shape: "rect", fill: "rgba(247,243,232,0.3)", locked: true }),
    shape({ x: HPAD - 7, y: lineY - 6, w: 16, h: 16, shape: "rect", fill: C.cream, rotation: 45, locked: true }),
    shape({ x: B - HPAD - 9, y: lineY - 6, w: 16, h: 16, shape: "rect", fill: C.amber, rotation: 45, locked: true }),
    // Datelines above the line.
    text({ x: leftX, y: lineY - 44, w: 320, h: 30, text: BA_BEFORE.eyebrow, fontFamily: BARLOW, fontSize: 22, fontWeight: 700, uppercase: true, letterSpacing: 3, color: C.creamDim }),
    text({ x: rightX, y: lineY - 44, w: 320, h: 30, text: BA_AFTER.eyebrow, fontFamily: BARLOW, fontSize: 22, fontWeight: 700, uppercase: true, letterSpacing: 3, color: C.amber, align: "right" }),
    // Figures below the line.
    text({ x: leftX, y: numY, w: 320, h: 176, text: BA_BEFORE.num, fontFamily: ANTON, fontSize: numSize, fontWeight: 400, lineHeight: 0.9, color: C.cream }),
    text({ x: leftX, y: numY + 178, w: 360, h: 56, text: BA_BEFORE.label, fontFamily: BARLOW, fontSize: 24, fontWeight: 600, uppercase: true, letterSpacing: 1, color: C.creamDim }),
    text({ x: rightX, y: numY, w: 320, h: 176, text: BA_AFTER.num, fontFamily: ANTON, fontSize: numSize, fontWeight: 400, lineHeight: 0.9, color: C.amber, align: "right" }),
    text({ x: rightX - 40, y: numY + 178, w: 360, h: 56, text: BA_AFTER.label, fontFamily: BARLOW, fontSize: 24, fontWeight: 600, uppercase: true, letterSpacing: 1, color: C.creamDim, align: "right" }),
    text({ x: HPAD, y: B - HPAD - 28, w: W, h: 30, text: baSource(c), fontFamily: BARLOW, fontSize: 22, fontWeight: 500, color: C.creamDim }),
  ];
  return slide(layers, C.forest);
}

// BEFORE/AFTER I — Card-framed: the before/after contrast inside a gold
// keyline card on forest, with a heading and a source foot.
function beforeafterI(c: SlideContent): EditorSlide {
  const cardX = HPAD;
  const cardY = 168;
  const cardW = B - 2 * HPAD;
  const cardH = B - cardY - HPAD;
  const inset = 52;
  const innerX = cardX + inset;
  const innerW = cardW - 2 * inset;
  const cx = Math.round(B / 2);
  const colW = Math.round((innerW - 80) / 2);
  const leftX = innerX;
  const rightX = cx + 40;
  const numY = cardY + 300;
  const numSize = 170;
  const layers: Layer[] = [
    shape({ x: 0, y: 0, w: B, h: B, shape: "rect", fill: GLOW, locked: true }),
    ...wordmark(HPAD, HPAD, c.logo),
    hTag("Then & Now", B - HPAD - 420, HPAD + 6, 420, "right"),
    shape({ x: cardX, y: cardY, w: cardW, h: cardH, shape: "rect", fill: "transparent", stroke: C.amber, strokeWidth: 2, radius: 10, locked: true }),
    text({ x: innerX, y: cardY + inset, w: innerW, h: 32, text: c.eyebrow || "Healthcare in collapse", fontFamily: BARLOW, fontSize: 22, fontWeight: 700, uppercase: true, letterSpacing: 4, color: C.amber, align: "center" }),
    ...(c.primary ? [hHead(balanceLines(c.primary, innerW, 52), innerX, cardY + inset + 44, innerW, 70, 52, "center", C.cream)] : []),
    shape({ x: cx - 1, y: numY - 40, w: 2, h: 300, shape: "rect", fill: C.amber, locked: true }),
    text({ x: leftX, y: numY - 50, w: colW, h: 30, text: BA_BEFORE.eyebrow, fontFamily: BARLOW, fontSize: 21, fontWeight: 700, uppercase: true, letterSpacing: 3, color: C.creamDim, align: "center" }),
    text({ x: leftX, y: numY, w: colW, h: 176, text: BA_BEFORE.num, fontFamily: ANTON, fontSize: numSize, fontWeight: 400, lineHeight: 0.9, color: C.cream, align: "center" }),
    text({ x: leftX, y: numY + 178, w: colW, h: 56, text: BA_BEFORE.label, fontFamily: BARLOW, fontSize: 23, fontWeight: 600, uppercase: true, letterSpacing: 1, color: C.creamDim, align: "center" }),
    text({ x: rightX, y: numY - 50, w: colW, h: 30, text: BA_AFTER.eyebrow, fontFamily: BARLOW, fontSize: 21, fontWeight: 700, uppercase: true, letterSpacing: 3, color: C.amber, align: "center" }),
    text({ x: rightX, y: numY, w: colW, h: 176, text: BA_AFTER.num, fontFamily: ANTON, fontSize: numSize, fontWeight: 400, lineHeight: 0.9, color: C.amber, align: "center" }),
    text({ x: rightX, y: numY + 178, w: colW, h: 56, text: BA_AFTER.label, fontFamily: BARLOW, fontSize: 23, fontWeight: 600, uppercase: true, letterSpacing: 1, color: C.creamDim, align: "center" }),
    text({ x: innerX, y: cardY + cardH - inset - 6, w: innerW, h: 30, text: baSource(c), fontFamily: BARLOW, fontSize: 21, fontWeight: 500, color: C.creamDim, align: "center" }),
  ];
  return slide(layers, C.forest);
}

// BEFORE/AFTER J — Percentage-change hero: a giant "−80%" change figure with
// a struck-through 36 → 7 context line beneath, and a source foot.
function beforeafterJ(c: SlideContent): EditorSlide {
  const W = B - 2 * HPAD;
  const changeSize = 320;
  const changeH = Math.round(changeSize * 0.82 + 20);
  const eyeGap = 60;
  const ctxSize = 60;
  const ctxH = Math.round(ctxSize * 0.96 + 12);
  const groupH = 32 + eyeGap + changeH + 24 + ctxH;
  const groupTop = Math.round((B - groupH) / 2) - 6;
  const eyebrowY = groupTop;
  const changeY = eyebrowY + 32 + eyeGap;
  const ctxY = changeY + changeH + 24;
  return slide(
    [
      shape({ x: 0, y: 0, w: B, h: B, shape: "rect", fill: GLOW, locked: true }),
      ...wordmark(HPAD, HPAD, c.logo),
      hTag("Palestine Appeal", B - HPAD - 420, HPAD + 6, 420, "right"),
      text({ x: HPAD, y: eyebrowY, w: W, h: 32, text: c.eyebrow || "Hospitals functioning", fontFamily: BARLOW, fontSize: 24, fontWeight: 700, uppercase: true, letterSpacing: 5, color: C.amber, align: "center" }),
      text({ x: HPAD, y: changeY, w: W, h: changeH, text: "−80%", fontFamily: ANTON, fontSize: changeSize, fontWeight: 400, uppercase: true, lineHeight: 0.82, letterSpacing: -6, color: C.amber, align: "center" }),
      // Context: 36 (struck) → 7, centred beneath.
      text({ x: HPAD, y: ctxY, w: W, h: ctxH, text: "36 → 7 HOSPITALS", fontFamily: ANTON, fontSize: ctxSize, fontWeight: 400, uppercase: true, lineHeight: 0.96, color: C.cream, align: "center" }),
      // Strike-through rule over the leading "36".
      shape({ x: Math.round(B / 2 - 200), y: ctxY + Math.round(ctxSize * 0.46), w: 70, h: 3, shape: "rect", fill: "rgba(247,243,232,0.55)", locked: true }),
      text({ x: HPAD, y: B - HPAD - 28, w: W, h: 30, text: baSource(c), fontFamily: BARLOW, fontSize: 22, fontWeight: 500, color: C.creamDim, align: "center" }),
    ],
    C.forest
  );
}

/* ─── Multi-stat design system ("by the numbers", A–J) ────────────── *
 *
 * Ten "By the numbers" layouts. Each carries three figures (default
 * 2.3M / 1.9M / 90%) with short labels and a source line. Shared
 * discipline: 78px insets, Anton numerals, Barlow labels, the gold rule +
 * diamond motif. multistat-a is the v1 `multiStatStack` above.
 */

type MStat = { num: string; label: string };
const MS_DEFAULT: MStat[] = [
  { num: "2.3M", label: "facing acute food insecurity" },
  { num: "1.9M", label: "displaced from their homes" },
  { num: "90%", label: "of water unsafe to drink" },
];
function msHeading(c: SlideContent): string {
  return c.primary || "By the numbers";
}
function msSource(c: SlideContent): string {
  return c.secondary || "Source: OCHA · 2026";
}

// MULTI-STAT B — Single row: the three figures across one row, with a
// heading and a source foot.
function multistatB(c: SlideContent): EditorSlide {
  const W = B - 2 * HPAD;
  const heading = msHeading(c);
  const headSize = 70;
  const headMain = balanceLines(heading, W, headSize);
  const headH = Math.round(headMain.split("\n").length * headSize * 0.96 + 12);
  const headY = 232;
  const ruleY = headY + headH + 22;
  const rowY = ruleY + 130;
  const colW = Math.round((W - 80) / 3);
  const numSize = 110;
  const layers: Layer[] = [
    shape({ x: 0, y: 0, w: B, h: B, shape: "rect", fill: GLOW, locked: true }),
    ...wordmark(HPAD, HPAD, c.logo),
    hTag("By the Numbers", B - HPAD - 420, HPAD + 6, 420, "right"),
    hHead(headMain, HPAD, headY, W, headH, headSize, "left", C.cream),
    goldBar(HPAD, ruleY, 64),
  ];
  MS_DEFAULT.forEach((r, i) => {
    const x = HPAD + i * (colW + 40);
    layers.push(text({ x, y: rowY, w: colW, h: 116, text: r.num, fontFamily: ANTON, fontSize: numSize, fontWeight: 400, lineHeight: 0.9, color: C.amber }));
    layers.push(text({ x, y: rowY + 124, w: colW, h: 110, text: r.label, fontFamily: BARLOW, fontSize: 24, fontWeight: 500, lineHeight: 1.22, color: C.creamDim }));
  });
  layers.push(text({ x: HPAD, y: B - HPAD - 28, w: W, h: 30, text: msSource(c), fontFamily: BARLOW, fontSize: 22, fontWeight: 600, uppercase: true, letterSpacing: 3, color: C.creamDim }));
  return slide(layers, C.forest);
}

// MULTI-STAT C — Hero + supporting: one hero stat up top, then two smaller
// supporting beats beneath, with a source foot.
function multistatC(c: SlideContent): EditorSlide {
  const W = B - 2 * HPAD;
  const hero = MS_DEFAULT[0]!;
  const beats = [MS_DEFAULT[1]!, MS_DEFAULT[2]!];
  const heroY = 252;
  const heroSize = 280;
  const heroH = Math.round(heroSize * 0.82);
  const labelY = heroY + heroH + 6;
  const labelSize = 48;
  const labelH = Math.round(labelSize * 0.96 + 12);
  const beatsTop = labelY + labelH + 50;
  const beatGap = 130;
  const layers: Layer[] = [
    shape({ x: 0, y: 0, w: B, h: B, shape: "rect", fill: GLOW, locked: true }),
    ...wordmark(HPAD, HPAD, c.logo),
    hTag("By the Numbers", B - HPAD - 420, HPAD + 6, 420, "right"),
    hEyebrow(c.eyebrow || msHeading(c), HPAD, heroY - 50, W),
    text({ x: HPAD, y: heroY, w: W, h: heroH, text: hero.num, fontFamily: ANTON, fontSize: heroSize, fontWeight: 400, uppercase: true, lineHeight: 0.82, letterSpacing: -4, color: C.amber }),
    text({ x: HPAD, y: labelY, w: W, h: labelH, text: hero.label, fontFamily: ANTON, fontSize: labelSize, fontWeight: 400, uppercase: true, lineHeight: 0.96, color: C.cream }),
    goldBar(HPAD, beatsTop - 28, 64),
  ];
  beats.forEach((b, i) => {
    const y = beatsTop + i * beatGap;
    layers.push(text({ x: HPAD, y, w: 280, h: 80, text: b.num, fontFamily: ANTON, fontSize: 72, fontWeight: 400, color: C.amber }));
    layers.push(text({ x: HPAD + 260, y: y + 18, w: W - 260, h: 56, text: b.label, fontFamily: BARLOW, fontSize: 28, fontWeight: 500, lineHeight: 1.2, color: C.creamDim }));
  });
  layers.push(text({ x: HPAD, y: B - HPAD - 28, w: W, h: 30, text: msSource(c), fontFamily: BARLOW, fontSize: 22, fontWeight: 600, uppercase: true, letterSpacing: 3, color: C.creamDim }));
  return slide(layers, C.forest);
}

// MULTI-STAT D — Grid: a 3-cell row of bordered cells, each a figure +
// label, with a heading and a source foot.
function multistatD(c: SlideContent): EditorSlide {
  const W = B - 2 * HPAD;
  const heading = msHeading(c);
  const headSize = 64;
  const headMain = balanceLines(heading, W, headSize);
  const headH = Math.round(headMain.split("\n").length * headSize * 0.96 + 12);
  const headY = 220;
  const ruleY = headY + headH + 20;
  const cellGap = 24;
  const cellW = Math.round((W - 2 * cellGap) / 3);
  const cellH = 360;
  const cellY = ruleY + 50;
  const numSize = 92;
  const layers: Layer[] = [
    shape({ x: 0, y: 0, w: B, h: B, shape: "rect", fill: GLOW, locked: true }),
    ...wordmark(HPAD, HPAD, c.logo),
    hTag("By the Numbers", B - HPAD - 420, HPAD + 6, 420, "right"),
    hHead(headMain, HPAD, headY, W, headH, headSize, "left", C.cream),
    goldBar(HPAD, ruleY, 64),
  ];
  MS_DEFAULT.forEach((r, i) => {
    const x = HPAD + i * (cellW + cellGap);
    layers.push(shape({ x, y: cellY, w: cellW, h: cellH, shape: "rect", fill: "transparent", stroke: "rgba(212,168,67,0.45)", strokeWidth: 2, radius: 8, locked: true }));
    layers.push(text({ x: x + 28, y: cellY + 48, w: cellW - 56, h: 100, text: r.num, fontFamily: ANTON, fontSize: numSize, fontWeight: 400, lineHeight: 0.9, color: C.amber }));
    layers.push(text({ x: x + 28, y: cellY + 168, w: cellW - 56, h: 150, text: r.label, fontFamily: BARLOW, fontSize: 24, fontWeight: 500, lineHeight: 1.24, color: C.cream }));
  });
  layers.push(text({ x: HPAD, y: B - HPAD - 28, w: W, h: 30, text: msSource(c), fontFamily: BARLOW, fontSize: 22, fontWeight: 600, uppercase: true, letterSpacing: 3, color: C.creamDim }));
  return slide(layers, C.forest);
}

// MULTI-STAT E — Over photo: three figures over a faint full-bleed photo
// with a scrim, chrome on a top scrim, a source foot.
function multistatE(c: SlideContent): EditorSlide {
  const W = B - 2 * HPAD;
  const heading = msHeading(c);
  const headSize = 64;
  const headMain = balanceLines(heading, W, headSize);
  const headH = Math.round(headMain.split("\n").length * headSize * 0.96 + 12);
  const headY = 224;
  const ruleY = headY + headH + 20;
  const rowsTop = ruleY + 48;
  const rowGap = 150;
  const layers: Layer[] = [
    image({ x: 0, y: 0, w: B, h: B, src: c.imageUrl ?? "", objectFit: "cover" }),
    shape({ x: 0, y: 0, w: B, h: B, shape: "rect", fill: "rgba(15,42,28,0.86)", locked: true }),
    topScrim(),
    ...wordmark(HPAD, HPAD, c.logo),
    hTag("By the Numbers", B - HPAD - 420, HPAD + 6, 420, "right"),
    hHead(headMain, HPAD, headY, W, headH, headSize, "left", C.cream),
    goldBar(HPAD, ruleY, 64),
  ];
  MS_DEFAULT.forEach((r, i) => {
    const y = rowsTop + i * rowGap;
    layers.push(text({ x: HPAD, y, w: 320, h: 92, text: r.num, fontFamily: ANTON, fontSize: 82, fontWeight: 400, color: C.amber }));
    layers.push(text({ x: HPAD + 340, y: y + 22, w: W - 340, h: 64, text: r.label, fontFamily: BARLOW, fontSize: 28, fontWeight: 500, lineHeight: 1.2, color: C.cream }));
    if (i < MS_DEFAULT.length - 1) layers.push(shape({ x: HPAD, y: y + rowGap - 28, w: W, h: 1, shape: "rect", fill: "rgba(247,243,232,0.2)", locked: true }));
  });
  layers.push(text({ x: HPAD, y: B - HPAD - 28, w: W, h: 30, text: msSource(c), fontFamily: BARLOW, fontSize: 22, fontWeight: 600, uppercase: true, letterSpacing: 3, color: C.amber }));
  return slide(layers, C.forest);
}

// MULTI-STAT F — Two-tone: a gold-bordered card with a forest panel carrying
// the three figures, and a cream band holding the source + URL.
function multistatF(c: SlideContent): EditorSlide {
  const FPAD = 40;
  const frameW = B - 2 * FPAD;
  const bandH = 180;
  const bandY = B - FPAD - bandH;
  const inset = 56;
  const innerX = FPAD + inset;
  const innerW = frameW - 2 * inset;
  const heading = msHeading(c);
  const headSize = 56;
  const headMain = balanceLines(heading, innerW, headSize);
  const headH = Math.round(headMain.split("\n").length * headSize * 0.96 + 12);
  const barY = FPAD + inset;
  const headY = barY + 60;
  const ruleY = headY + headH + 20;
  const rowsTop = ruleY + 40;
  const rowGap = 132;
  const layers: Layer[] = [
    shape({ x: FPAD, y: FPAD, w: frameW, h: frameW, shape: "rect", fill: C.forest, locked: true }),
    shape({ x: FPAD, y: bandY, w: frameW, h: bandH, shape: "rect", fill: C.cream, locked: true }),
    ...wordmark(innerX, barY, c.logo),
    hTag("By the Numbers", FPAD + frameW - inset - 420, barY + 6, 420, "right"),
    text({ x: innerX, y: headY, w: innerW, h: headH, text: headMain, fontFamily: ANTON, fontSize: headSize, fontWeight: 400, uppercase: true, lineHeight: 0.96, color: C.cream }),
    goldBar(innerX, ruleY, 64),
  ];
  MS_DEFAULT.forEach((r, i) => {
    const y = rowsTop + i * rowGap;
    layers.push(text({ x: innerX, y, w: 280, h: 80, text: r.num, fontFamily: ANTON, fontSize: 70, fontWeight: 400, color: C.amber }));
    layers.push(text({ x: innerX + 280, y: y + 16, w: innerW - 280, h: 56, text: r.label, fontFamily: BARLOW, fontSize: 27, fontWeight: 500, lineHeight: 1.2, color: C.cream }));
  });
  layers.push(text({ x: innerX, y: bandY + Math.round((bandH - 34) / 2), w: 540, h: 34, text: msSource(c), fontFamily: BARLOW, fontSize: 24, fontWeight: 700, uppercase: true, letterSpacing: 1, color: C.forestDim }));
  layers.push(text({ x: FPAD + frameW - inset - 420, y: bandY + Math.round((bandH - 44) / 2), w: 420, h: 52, text: "deenrelief.org", fontFamily: ANTON, fontSize: 40, fontWeight: 400, color: C.goldDeep, align: "right" }));
  layers.push(shape({ x: FPAD, y: FPAD, w: frameW, h: frameW, shape: "rect", fill: "transparent", stroke: C.amber, strokeWidth: 2, locked: true }));
  return slide(layers, C.forest);
}

// MULTI-STAT G — Gold-ruled beats: the three figures separated by thin gold
// rules, each with a small uppercase label, a heading and a source foot.
function multistatG(c: SlideContent): EditorSlide {
  const W = B - 2 * HPAD;
  const heading = msHeading(c);
  const headSize = 68;
  const headMain = balanceLines(heading, W, headSize);
  const headH = Math.round(headMain.split("\n").length * headSize * 0.96 + 12);
  const headY = 220;
  const rowsTop = headY + headH + 56;
  const rowGap = 156;
  const layers: Layer[] = [
    shape({ x: 0, y: 0, w: B, h: B, shape: "rect", fill: GLOW, locked: true }),
    ...wordmark(HPAD, HPAD, c.logo),
    hTag("By the Numbers", B - HPAD - 420, HPAD + 6, 420, "right"),
    hHead(headMain, HPAD, headY, W, headH, headSize, "left", C.cream),
  ];
  MS_DEFAULT.forEach((r, i) => {
    const y = rowsTop + i * rowGap;
    // Gold rule above each beat.
    layers.push(shape({ x: HPAD, y, w: W, h: 2, shape: "rect", fill: C.amber, locked: true }));
    layers.push(text({ x: HPAD, y: y + 22, w: W, h: 30, text: r.label.toUpperCase(), fontFamily: BARLOW, fontSize: 22, fontWeight: 700, uppercase: true, letterSpacing: 3, color: C.creamDim }));
    layers.push(text({ x: HPAD, y: y + 50, w: W, h: 96, text: r.num, fontFamily: ANTON, fontSize: 84, fontWeight: 400, color: C.amber }));
  });
  layers.push(text({ x: HPAD, y: B - HPAD - 28, w: W, h: 30, text: msSource(c), fontFamily: BARLOW, fontSize: 22, fontWeight: 600, uppercase: true, letterSpacing: 3, color: C.creamDim }));
  return slide(layers, C.forest);
}

// MULTI-STAT H — Centred crest: a "By the numbers" crest — a gold keyline
// frame, a centred heading and three centred figures, a source foot.
function multistatH(c: SlideContent): EditorSlide {
  const W = B - 2 * HPAD;
  const heading = msHeading(c);
  const headSize = 60;
  const headMain = balanceLines(heading, W, headSize);
  const headH = Math.round(headMain.split("\n").length * headSize * 0.96 + 12);
  const eyebrowY = 188;
  const headY = eyebrowY + 44;
  const ruleY = headY + headH + 20;
  const rowsTop = ruleY + 50;
  const rowGap = 142;
  const layers: Layer[] = [
    shape({ x: 0, y: 0, w: B, h: B, shape: "rect", fill: GLOW, locked: true }),
    shape({ x: 46, y: 46, w: B - 92, h: B - 92, shape: "rect", fill: "transparent", stroke: "rgba(212,168,67,0.55)", strokeWidth: 2, locked: true }),
    hEyebrow(c.eyebrow || "By the numbers · Gaza", HPAD, eyebrowY, W, "center"),
    hHead(headMain, HPAD, headY, W, headH, headSize, "center", C.cream),
    goldBar(Math.round(B / 2 - 46), ruleY, 92),
  ];
  MS_DEFAULT.forEach((r, i) => {
    const y = rowsTop + i * rowGap;
    layers.push(text({ x: HPAD, y, w: W, h: 84, text: r.num, fontFamily: ANTON, fontSize: 76, fontWeight: 400, lineHeight: 0.9, color: C.amber, align: "center" }));
    layers.push(text({ x: HPAD, y: y + 80, w: W, h: 36, text: r.label, fontFamily: BARLOW, fontSize: 24, fontWeight: 600, uppercase: true, letterSpacing: 1, color: C.creamDim, align: "center" }));
  });
  layers.push(text({ x: HPAD, y: B - HPAD - 28, w: W, h: 30, text: msSource(c), fontFamily: BARLOW, fontSize: 22, fontWeight: 600, uppercase: true, letterSpacing: 3, color: C.creamDim, align: "center" }));
  return slide(layers, C.forest);
}

// MULTI-STAT I — Connecting timeline: the three figures on a connecting
// vertical timeline (gold spine + nodes), a heading and a source foot.
function multistatI(c: SlideContent): EditorSlide {
  const W = B - 2 * HPAD;
  const heading = msHeading(c);
  const headSize = 64;
  const headMain = balanceLines(heading, W, headSize);
  const headH = Math.round(headMain.split("\n").length * headSize * 0.96 + 12);
  const headY = 220;
  const ruleY = headY + headH + 22;
  const spineX = HPAD + 8;
  const rowsTop = ruleY + 50;
  const rowGap = 154;
  const textX = HPAD + 64;
  const textW = W - 64;
  const layers: Layer[] = [
    shape({ x: 0, y: 0, w: B, h: B, shape: "rect", fill: GLOW, locked: true }),
    ...wordmark(HPAD, HPAD, c.logo),
    hTag("By the Numbers", B - HPAD - 420, HPAD + 6, 420, "right"),
    hHead(headMain, HPAD, headY, W, headH, headSize, "left", C.cream),
    goldBar(HPAD, ruleY, 64),
    // Vertical gold spine through the node centres.
    shape({ x: spineX, y: rowsTop + 16, w: 2, h: 2 * rowGap, shape: "rect", fill: "rgba(212,168,67,0.5)", locked: true }),
  ];
  MS_DEFAULT.forEach((r, i) => {
    const y = rowsTop + i * rowGap;
    layers.push(shape({ x: spineX - 7, y: y + 8, w: 18, h: 18, shape: "rect", fill: C.amber, rotation: 45, locked: true }));
    layers.push(text({ x: textX, y, w: 300, h: 80, text: r.num, fontFamily: ANTON, fontSize: 70, fontWeight: 400, color: C.amber }));
    layers.push(text({ x: textX, y: y + 74, w: textW, h: 56, text: r.label, fontFamily: BARLOW, fontSize: 26, fontWeight: 500, lineHeight: 1.2, color: C.creamDim }));
  });
  layers.push(text({ x: HPAD, y: B - HPAD - 28, w: W, h: 30, text: msSource(c), fontFamily: BARLOW, fontSize: 22, fontWeight: 600, uppercase: true, letterSpacing: 3, color: C.creamDim }));
  return slide(layers, C.forest);
}

// MULTI-STAT J — Ledger: left-aligned figures, right-aligned labels, joined
// by dotted leaders — a "ledger" of the crisis, with a heading + source.
function multistatJ(c: SlideContent): EditorSlide {
  const W = B - 2 * HPAD;
  const heading = msHeading(c);
  const headSize = 68;
  const headMain = balanceLines(heading, W, headSize);
  const headH = Math.round(headMain.split("\n").length * headSize * 0.96 + 12);
  const headY = 220;
  const ruleY = headY + headH + 22;
  const rowsTop = ruleY + 50;
  const rowGap = 156;
  const layers: Layer[] = [
    shape({ x: 0, y: 0, w: B, h: B, shape: "rect", fill: GLOW, locked: true }),
    ...wordmark(HPAD, HPAD, c.logo),
    hTag("By the Numbers", B - HPAD - 420, HPAD + 6, 420, "right"),
    hHead(headMain, HPAD, headY, W, headH, headSize, "left", C.cream),
    goldBar(HPAD, ruleY, 64),
  ];
  MS_DEFAULT.forEach((r, i) => {
    const y = rowsTop + i * rowGap;
    // Figure left, label right, a thin leader rule between baselines.
    layers.push(text({ x: HPAD, y, w: 360, h: 92, text: r.num, fontFamily: ANTON, fontSize: 84, fontWeight: 400, color: C.amber }));
    layers.push(text({ x: HPAD + 360, y: y + 30, w: W - 360, h: 56, text: r.label, fontFamily: BARLOW, fontSize: 26, fontWeight: 600, uppercase: true, letterSpacing: 1, color: C.cream, align: "right" }));
    if (i < MS_DEFAULT.length - 1) layers.push(shape({ x: HPAD, y: y + rowGap - 30, w: W, h: 1, shape: "rect", fill: "rgba(247,243,232,0.16)", locked: true }));
  });
  layers.push(text({ x: HPAD, y: B - HPAD - 28, w: W, h: 30, text: msSource(c), fontFamily: BARLOW, fontSize: 22, fontWeight: 600, uppercase: true, letterSpacing: 3, color: C.creamDim }));
  return slide(layers, C.forest);
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
  // Specific ids first so "multistat-a" doesn't get swallowed by the generic
  // multistat/stat matches. (multistat-* must resolve before the stat-* and
  // generic "stat" library further down — it does, matched right here.)
  if (id.includes("multistat-a")) return multiStatStack(c);
  if (id.includes("multistat-b")) return multistatB(c);
  if (id.includes("multistat-c")) return multistatC(c);
  if (id.includes("multistat-d")) return multistatD(c);
  if (id.includes("multistat-e")) return multistatE(c);
  if (id.includes("multistat-f")) return multistatF(c);
  if (id.includes("multistat-g")) return multistatG(c);
  if (id.includes("multistat-h")) return multistatH(c);
  if (id.includes("multistat-i")) return multistatI(c);
  if (id.includes("multistat-j")) return multistatJ(c);
  if (id.includes("multistat") || id.includes("multi-stat")) return multiStatStack(c);
  // Donation-tiers library (A–J). Specific ids first so "tiers-a" doesn't get
  // swallowed by the generic "tiers" fallback below.
  if (id.includes("tiers-a")) return tiersLadder(c);
  if (id.includes("tiers-b")) return tiersB(c);
  if (id.includes("tiers-c")) return tiersC(c);
  if (id.includes("tiers-d")) return tiersD(c);
  if (id.includes("tiers-e")) return tiersE(c);
  if (id.includes("tiers-f")) return tiersF(c);
  if (id.includes("tiers-g")) return tiersG(c);
  if (id.includes("tiers-h")) return tiersH(c);
  if (id.includes("tiers-i")) return tiersI(c);
  if (id.includes("tiers-j")) return tiersJ(c);
  if (id.includes("tiers")) return tiersLadder(c);
  // Before/After library (A–J). Specific ids first so "beforeafter-a" doesn't
  // get swallowed by the generic "beforeafter" fallback below.
  if (id.includes("beforeafter-a")) return beforeAfter(c);
  if (id.includes("beforeafter-b")) return beforeafterB(c);
  if (id.includes("beforeafter-c")) return beforeafterC(c);
  if (id.includes("beforeafter-d")) return beforeafterD(c);
  if (id.includes("beforeafter-e")) return beforeafterE(c);
  if (id.includes("beforeafter-f")) return beforeafterF(c);
  if (id.includes("beforeafter-g")) return beforeafterG(c);
  if (id.includes("beforeafter-h")) return beforeafterH(c);
  if (id.includes("beforeafter-i")) return beforeafterI(c);
  if (id.includes("beforeafter-j")) return beforeafterJ(c);
  if (id.includes("beforeafter") || id.includes("before-after")) return beforeAfter(c);
  // Key-Fact library (A–J). Specific ids first so "fact-a" doesn't get
  // swallowed by the "fact-photo"/"fact" matches below. (fact-a..fact-j
  // don't contain "fact-photo", but ordering them first makes it certain.)
  if (id.includes("fact-a")) return factPhotoBleed(c);
  if (id.includes("fact-b")) return factTypeLed(c);
  if (id.includes("fact-c")) return factTopPanel(c);
  if (id.includes("fact-d")) return factSplit(c);
  if (id.includes("fact-e")) return factKeyline(c);
  if (id.includes("fact-f")) return factLeadIn(c);
  if (id.includes("fact-g")) return factCaptionBar(c);
  if (id.includes("fact-h")) return factInsetCard(c);
  if (id.includes("fact-i")) return factCrest(c);
  if (id.includes("fact-j")) return factTwoTone(c);
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
  // Testimony library (A–J). Specific ids first so "testimony-a" doesn't get
  // swallowed by the "testimony-portrait"/"testimony" matches below.
  // (testimony-a..testimony-j don't contain "testimony-portrait".)
  if (id.includes("testimony-a")) return quoteOpenMark(c);
  if (id.includes("testimony-b")) return quotePortraitLowerThird(c);
  if (id.includes("testimony-c")) return quoteSplit(c);
  if (id.includes("testimony-d")) return quotePortraitChip(c);
  if (id.includes("testimony-e")) return quoteCrest(c);
  if (id.includes("testimony-f")) return quoteEmphasis(c);
  if (id.includes("testimony-g")) return quoteTopPortrait(c);
  if (id.includes("testimony-h")) return quoteTwoTone(c);
  if (id.includes("testimony-i")) return quoteKeylineCard(c);
  if (id.includes("testimony-j")) return quoteCaptionBar(c);
  if (id.includes("testimony-portrait")) return testimonyPortrait(c);
  if (id.includes("testimony")) return testimonyQuote(c);
  // "Our response" library (A–J). Specific ids first so "response-a" doesn't
  // get swallowed by the generic "response" fallback below.
  if (id.includes("response-a")) return respPhotoLowerThird(c);
  if (id.includes("response-b")) return respTopPanel(c);
  if (id.includes("response-c")) return respSplit(c);
  if (id.includes("response-d")) return respInsetCard(c);
  if (id.includes("response-e")) return respStatBacked(c);
  if (id.includes("response-f")) return respWindowCrop(c);
  if (id.includes("response-g")) return respChecklist(c);
  if (id.includes("response-h")) return respTwoTone(c);
  if (id.includes("response-i")) return respCaptionBar(c);
  if (id.includes("response-j")) return respGiftHelps(c);
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
