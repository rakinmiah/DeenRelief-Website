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
 *  halves — so live SMM copy wraps cleanly. Respects manual "\n". */
function balanceLines(t: string): string {
  if (t.includes("\n")) return t;
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
  const main = balanceLines(primary);
  const mainLines = main.split("\n").length;
  const layers: Layer[] = [
    hHead(main, x, y, w, Math.round(mainLines * lh + 12), size, align, C.cream),
  ];
  if (accent && accent.trim()) {
    const acc = balanceLines(accent);
    const accLines = acc.split("\n").length;
    layers.push(
      hHead(acc, x, Math.round(y + mainLines * lh), w, Math.round(accLines * lh + 12), size, align, C.amber)
    );
  }
  return layers;
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
/** Corner brand mark: the real DR logo (downscaled at export so the
 *  oversized source art rasterises), falling back to a diamond +
 *  "DEEN RELIEF" type lockup when no logo is uploaded. */
function wordmark(x: number, y: number, logo: BrandLogo | null | undefined, color: string = C.cream): Layer[] {
  if (logo?.url) {
    const h = 42;
    const w = Math.max(60, Math.round(h * (logo.aspect || 4)));
    return [image({ x, y, w, h, src: logo.url, objectFit: "contain", locked: true })];
  }
  return [
    shape({ x, y: y + 4, w: 15, h: 15, shape: "rect", fill: C.amber, rotation: 45 }),
    text({ x: x + 32, y, w: 360, h: 30, text: "DEEN RELIEF", fontFamily: BARLOW, fontSize: 24, fontWeight: 700, uppercase: true, letterSpacing: 6, color }),
  ];
}

// HERO A — photo-led full-bleed
function heroPhotoFull(c: SlideContent): EditorSlide {
  return slide(
    [
      image({ x: 0, y: 0, w: B, h: B, src: c.imageUrl ?? "", objectFit: "cover" }),
      shape({ x: 0, y: 410, w: B, h: B - 410, shape: "rect", fill: SCRIM, locked: true }),
      ...wordmark(HPAD, HPAD, c.logo),
      hTag("Emergency Appeal", 582, HPAD + 6, 420, "right"),
      hEyebrow(c.eyebrow, HPAD, 643, 924),
      ...headlineBlock(c.primary, c.accent, HPAD, 695, 924, 86),
      goldBar(HPAD, 900),
      ...(c.secondary ? [hBody(c.secondary, 164, 887, 674, 120)] : []),
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
  return slide(
    [
      image({ x: 0, y: 0, w: B, h: 594, src: c.imageUrl ?? "", objectFit: "cover" }),
      shape({ x: 0, y: 333, w: B, h: 261, shape: "rect", fill: SCRIM, locked: true }),
      ...wordmark(HPAD, HPAD, c.logo),
      hTag("Emergency Appeal", 582, HPAD + 6, 420, "right"),
      hEyebrow(c.eyebrow, HPAD, 660, 924),
      ...headlineBlock(c.primary, c.accent, HPAD, 712, 924, 80),
      goldBar(HPAD, 917),
      ...(c.secondary ? [hBody(c.secondary, 164, 904, 754, 92)] : []),
    ],
    C.forest
  );
}

// HERO D — centered crest
function heroCrest(c: SlideContent): EditorSlide {
  const layers: Layer[] = [];
  if (c.logo?.url) {
    const h = 54;
    const w = Math.max(80, Math.round(h * (c.logo.aspect || 4)));
    layers.push(image({ x: Math.round((B - w) / 2), y: 316, w, h, src: c.logo.url, objectFit: "contain", locked: true }));
  } else {
    layers.push(shape({ x: Math.round((B - 30) / 2), y: 310, w: 30, h: 30, shape: "rect", fill: C.amber, rotation: 45 }));
    layers.push(text({ x: HPAD, y: 356, w: B - 2 * HPAD, h: 30, text: "DEEN RELIEF", fontFamily: BARLOW, fontSize: 24, fontWeight: 700, uppercase: true, letterSpacing: 7, color: C.cream, align: "center" }));
  }
  layers.push(hEyebrow(c.eyebrow, HPAD, 408, B - 2 * HPAD, "center"));
  layers.push(...headlineBlock(c.primary, c.accent, HPAD, 470, B - 2 * HPAD, 104, "center"));
  layers.push(goldBar(Math.round((B - 92) / 2), 714, 92));
  layers.push(text({ x: HPAD, y: 751, w: B - 2 * HPAD, h: 30, text: "A community response · 2026", fontFamily: BARLOW, fontSize: 23, fontWeight: 600, uppercase: true, letterSpacing: 4.5, color: C.creamDim, align: "center" }));
  return slide(layers, C.forest);
}

// HERO E — documentary caption bar over full-bleed photo
function heroCaption(c: SlideContent): EditorSlide {
  const barTop = 850;
  return slide(
    [
      image({ x: 0, y: 0, w: B, h: B, src: c.imageUrl ?? "", objectFit: "cover" }),
      ...wordmark(HPAD, HPAD, c.logo),
      hTag("Field Report", 582, HPAD + 6, 420, "right"),
      shape({ x: 0, y: barTop, w: B, h: B - barTop, shape: "rect", fill: C.forest, locked: true }),
      hEyebrow(c.eyebrow, HPAD, barTop + 42, B - 2 * HPAD),
      ...headlineBlock(c.primary, c.accent, HPAD, barTop + 86, B - 2 * HPAD, 56),
      text({ x: HPAD, y: barTop + 160, w: B - 2 * HPAD, h: 30, text: "Photograph — Deen Relief field team", fontFamily: BARLOW, fontSize: 23, fontWeight: 500, color: C.creamDim }),
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
