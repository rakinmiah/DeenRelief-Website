/**
 * Layer presets (Phase 10 wiring).
 *
 * Seed EditorSlides from a news event's extracted content + chosen
 * imagery. These replace the old slot-based TSX templates as the
 * STARTING arrangement for the canvas editor — once seeded, every
 * element is freely editable. The hero preset honours the template
 * the SMM picked in the guided builder; the rest scaffold fact + CTA
 * slides from the content.
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

/* ─── Brand tokens ────────────────────────────────────────────────── */
const C = {
  forest: "#163827",
  forestLight: "#1F4D3B",
  cream: "#F7F3E8",
  amber: "#D4A843",
  charcoal: "#1A1A2E",
  green: "#2D6A2E",
  white: "#FFFFFF",
} as const;

const HEAVY = '"DM Sans", sans-serif';
const SANS = '"DM Sans", sans-serif';

/* ─── Layer factories ─────────────────────────────────────────────── */
function text(p: Partial<TextLayer> & Pick<TextLayer, "x" | "y" | "w" | "h" | "text">): TextLayer {
  return {
    id: makeLayerId(),
    type: "text",
    rotation: 0,
    opacity: 1,
    locked: false,
    fontFamily: SANS,
    fontSize: 40,
    fontWeight: 400,
    italic: false,
    underline: false,
    uppercase: false,
    color: C.cream,
    align: "left",
    lineHeight: 1.2,
    letterSpacing: 0,
    ...p,
  };
}

function image(p: Partial<ImageLayer> & Pick<ImageLayer, "x" | "y" | "w" | "h">): ImageLayer {
  return {
    id: makeLayerId(),
    type: "image",
    rotation: 0,
    opacity: 1,
    locked: false,
    src: "",
    objectFit: "cover",
    radius: 0,
    ...p,
  };
}

function shape(p: Partial<ShapeLayer> & Pick<ShapeLayer, "x" | "y" | "w" | "h" | "shape">): ShapeLayer {
  return {
    id: makeLayerId(),
    type: "shape",
    rotation: 0,
    opacity: 1,
    locked: false,
    fill: C.forest,
    stroke: C.forest,
    strokeWidth: 0,
    radius: 0,
    ...p,
  };
}

function brandMark(color: string = C.cream): TextLayer {
  return text({
    x: 56,
    y: 52,
    w: 360,
    h: 40,
    text: "DEEN RELIEF",
    fontFamily: HEAVY,
    fontSize: 26,
    fontWeight: 800,
    uppercase: true,
    letterSpacing: 1,
    color,
  });
}

function footer(): TextLayer {
  return text({
    x: 56,
    y: B - 70,
    w: B - 112,
    h: 30,
    text: "deenrelief.org · Charity No. 1158608",
    fontSize: 17,
    uppercase: true,
    letterSpacing: 3,
    color: C.cream,
    opacity: 0.55,
  });
}

function slide(layers: Layer[], background: string): EditorSlide {
  return {
    id: `sl_${makeLayerId().slice(3)}`,
    width: B,
    height: B,
    background,
    layers,
  };
}

/* ─── Content shape the presets read ──────────────────────────────── */
export type SeedHero = {
  templateId: string;
  title: string;
  subtext: string | null;
  imageUrl: string | null;
  eyebrow: string;
};

export type SeedContent = {
  eyebrow: string;
  hero: SeedHero;
  facts: string[];
  ctaHeadline: string;
};

/* ─── Hero presets (one per guided template) ──────────────────────── */
function heroMagazine(h: SeedHero): EditorSlide {
  return slide(
    [
      image({ x: 0, y: 0, w: B, h: 670, src: h.imageUrl ?? "" }),
      shape({ x: 0, y: 670, w: B, h: B - 670, shape: "rect", fill: C.forest }),
      shape({ x: 56, y: 724, w: 96, h: 6, shape: "line", stroke: C.amber, strokeWidth: 6 }),
      brandMark(),
      text({ x: 56, y: 746, w: 700, h: 36, text: h.eyebrow, fontSize: 22, fontWeight: 600, uppercase: true, letterSpacing: 3, color: C.amber, opacity: 0.9 }),
      text({ x: 56, y: 792, w: 968, h: 170, text: h.title, fontFamily: HEAVY, fontSize: 76, fontWeight: 800, uppercase: true, lineHeight: 1.0, color: C.cream }),
      ...(h.subtext
        ? [text({ x: 56, y: 966, w: 920, h: 80, text: h.subtext, fontSize: 24, lineHeight: 1.4, color: C.cream, opacity: 0.82 })]
        : []),
    ],
    C.forest
  );
}

function heroTypography(h: SeedHero): EditorSlide {
  return slide(
    [
      brandMark(),
      shape({ x: 56, y: 360, w: 96, h: 6, shape: "line", stroke: C.amber, strokeWidth: 6 }),
      text({ x: 56, y: 392, w: 700, h: 36, text: h.eyebrow, fontSize: 22, fontWeight: 600, uppercase: true, letterSpacing: 3, color: C.amber, opacity: 0.9 }),
      text({ x: 56, y: 440, w: 968, h: 360, text: h.title, fontFamily: HEAVY, fontSize: 96, fontWeight: 800, uppercase: true, lineHeight: 1.0, color: C.cream }),
      ...(h.subtext
        ? [text({ x: 56, y: 812, w: 900, h: 100, text: h.subtext, fontSize: 26, lineHeight: 1.4, color: C.cream, opacity: 0.82 })]
        : []),
      footer(),
    ],
    C.forest
  );
}

function heroPanelRight(h: SeedHero): EditorSlide {
  const panelX = 560;
  return slide(
    [
      image({ x: 0, y: 0, w: panelX, h: B, src: h.imageUrl ?? "" }),
      shape({ x: panelX, y: 0, w: B - panelX, h: B, shape: "rect", fill: C.forest }),
      text({ x: panelX + 48, y: 64, w: B - panelX - 96, h: 40, text: "DEEN RELIEF", fontFamily: HEAVY, fontSize: 24, fontWeight: 800, uppercase: true, letterSpacing: 1, color: C.cream }),
      shape({ x: panelX + 48, y: 360, w: 80, h: 6, shape: "line", stroke: C.amber, strokeWidth: 6 }),
      text({ x: panelX + 48, y: 388, w: B - panelX - 96, h: 36, text: h.eyebrow, fontSize: 20, fontWeight: 600, uppercase: true, letterSpacing: 2, color: C.amber, opacity: 0.9 }),
      text({ x: panelX + 48, y: 432, w: B - panelX - 96, h: 320, text: h.title, fontFamily: HEAVY, fontSize: 58, fontWeight: 800, uppercase: true, lineHeight: 1.02, color: C.cream }),
      ...(h.subtext
        ? [text({ x: panelX + 48, y: 760, w: B - panelX - 96, h: 160, text: h.subtext, fontSize: 22, lineHeight: 1.4, color: C.cream, opacity: 0.82 })]
        : []),
    ],
    C.forest
  );
}

export function heroFor(h: SeedHero): EditorSlide {
  if (h.templateId.includes("typography")) return heroTypography(h);
  if (h.templateId.includes("panel")) return heroPanelRight(h);
  return heroMagazine(h);
}

/* ─── Fact + CTA presets ──────────────────────────────────────────── */
export function factSlide(fact: string, eyebrow: string, n: number): EditorSlide {
  return slide(
    [
      brandMark(C.forest),
      text({ x: 64, y: 132, w: 600, h: 36, text: eyebrow, fontSize: 20, fontWeight: 600, uppercase: true, letterSpacing: 3, color: C.amber }),
      shape({ x: 64, y: 188, w: 80, h: 6, shape: "line", stroke: C.amber, strokeWidth: 6 }),
      text({ x: 64, y: 240, w: B - 128, h: 620, text: fact, fontFamily: HEAVY, fontSize: 60, fontWeight: 800, lineHeight: 1.08, color: C.charcoal }),
      text({ x: 64, y: B - 96, w: B - 128, h: 30, text: `0${n} · deenrelief.org`, fontSize: 17, uppercase: true, letterSpacing: 3, color: C.charcoal, opacity: 0.5 }),
    ],
    C.cream
  );
}

export function ctaSlide(headline: string): EditorSlide {
  return slide(
    [
      brandMark(),
      text({ x: 80, y: 360, w: B - 160, h: 300, text: headline, fontFamily: HEAVY, fontSize: 84, fontWeight: 800, uppercase: true, lineHeight: 1.0, color: C.cream, align: "center" }),
      shape({ x: B / 2 - 200, y: 720, w: 400, h: 92, shape: "rect", fill: C.amber, radius: 46 }),
      text({ x: B / 2 - 200, y: 748, w: 400, h: 48, text: "DONATE NOW", fontFamily: HEAVY, fontSize: 34, fontWeight: 800, uppercase: true, letterSpacing: 1, color: C.forest, align: "center" }),
      text({ x: 80, y: 980, w: B - 160, h: 36, text: "deenrelief.org/donate", fontSize: 22, uppercase: true, letterSpacing: 3, color: C.cream, opacity: 0.6, align: "center" }),
    ],
    C.forest
  );
}

/* ─── Seed the whole deck ─────────────────────────────────────────── */
export function seedDeck(content: SeedContent, maxSlides: number): EditorSlide[] {
  const slides: EditorSlide[] = [heroFor(content.hero)];
  const factCount = Math.max(0, Math.min(content.facts.length, maxSlides - 2));
  for (let i = 0; i < factCount; i++) {
    slides.push(factSlide(content.facts[i]!, content.eyebrow, i + 1));
  }
  slides.push(ctaSlide(content.ctaHeadline));
  return slides.slice(0, Math.max(2, maxSlides));
}
