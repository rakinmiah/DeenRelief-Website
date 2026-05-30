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
  makeLayerId,
  DEFAULT_BOARD as B,
} from "./types";

/* ─── Brand tokens + fonts ────────────────────────────────────────── */
const C = {
  forest: "#163827",
  cream: "#F7F3E8",
  amber: "#D4A843",
  charcoal: "#1A1A2E",
  green: "#2D6A2E",
} as const;

const DISPLAY = "Bowlby One SC"; // heavy headline display
const SANS = "DM Sans";
const SERIF = "Source Serif 4";

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
export type SlideContent = {
  primary: string;
  secondary: string | null;
  imageUrl: string | null;
  eyebrow: string;
};

/* ─── Hero presets (one per hero template) ────────────────────────── */
function heroMagazine(c: SlideContent): EditorSlide {
  return slide(
    [
      image({ x: 0, y: 0, w: B, h: 670, src: c.imageUrl ?? "" }),
      shape({ x: 0, y: 670, w: B, h: B - 670, shape: "rect", fill: C.forest }),
      rule(56, 724),
      brandMark(),
      eyebrowLayer(c.eyebrow, 746),
      text({ x: 56, y: 792, w: 968, h: 170, text: c.primary, fontFamily: DISPLAY, fontSize: 72, fontWeight: 400, uppercase: true, lineHeight: 1.02, color: C.cream }),
      ...(c.secondary ? [text({ x: 56, y: 966, w: 920, h: 80, text: c.secondary, fontSize: 24, lineHeight: 1.4, color: C.cream, opacity: 0.82 })] : []),
    ],
    C.forest
  );
}
function heroTypography(c: SlideContent): EditorSlide {
  return slide(
    [
      brandMark(),
      rule(56, 360),
      eyebrowLayer(c.eyebrow, 392),
      text({ x: 56, y: 440, w: 968, h: 360, text: c.primary, fontFamily: DISPLAY, fontSize: 92, fontWeight: 400, uppercase: true, lineHeight: 1.02, color: C.cream }),
      ...(c.secondary ? [text({ x: 56, y: 812, w: 900, h: 100, text: c.secondary, fontSize: 26, lineHeight: 1.4, color: C.cream, opacity: 0.82 })] : []),
      footer(),
    ],
    C.forest
  );
}
function heroPanelRight(c: SlideContent): EditorSlide {
  const px = 560;
  return slide(
    [
      image({ x: 0, y: 0, w: px, h: B, src: c.imageUrl ?? "" }),
      shape({ x: px, y: 0, w: B - px, h: B, shape: "rect", fill: C.forest }),
      text({ x: px + 48, y: 64, w: B - px - 96, h: 40, text: "DEEN RELIEF", fontFamily: SANS, fontSize: 24, fontWeight: 800, uppercase: true, letterSpacing: 1, color: C.cream }),
      rule(px + 48, 360),
      text({ x: px + 48, y: 392, w: B - px - 96, h: 36, text: c.eyebrow, fontSize: 20, fontWeight: 600, uppercase: true, letterSpacing: 2, color: C.amber, opacity: 0.9 }),
      text({ x: px + 48, y: 432, w: B - px - 96, h: 320, text: c.primary, fontFamily: DISPLAY, fontSize: 54, fontWeight: 400, uppercase: true, lineHeight: 1.04, color: C.cream }),
      ...(c.secondary ? [text({ x: px + 48, y: 760, w: B - px - 96, h: 160, text: c.secondary, fontSize: 22, lineHeight: 1.4, color: C.cream, opacity: 0.82 })] : []),
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
  if (id.includes("hero-typography")) return heroTypography(c);
  if (id.includes("hero-panel")) return heroPanelRight(c);
  if (id.includes("hero")) return heroMagazine(c);
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
