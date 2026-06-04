/**
 * Element library — individual, brand-consistent building blocks the SMM can
 * drop onto any slide from the Elements panel, à la Canva. Each element is a
 * `build(ctx)` that returns one or more layers positioned on the current board
 * (square 1080 or landscape 1200×675); multi-layer elements are grouped on
 * insert so they move as one. Tokens + layer factories mirror presets.ts so
 * inserted elements match the templates exactly.
 */
import {
  type Layer,
  type TextLayer,
  type ShapeLayer,
  type ImageLayer,
  makeLayerId,
} from "@/lib/social-editor/types";
import type { BrandLogo } from "@/lib/social-editor/presets";

const C = {
  forest: "#163827",
  cream: "#F7F3E8",
  creamDim: "rgba(247,243,232,0.72)",
  amber: "#D4A843",
  red: "#C0392B",
  charcoal: "#1A1A2E",
} as const;
const ANTON = "Anton";
const BARLOW = "Barlow";

function text(p: Partial<TextLayer> & Pick<TextLayer, "x" | "y" | "w" | "h" | "text">): TextLayer {
  return {
    id: makeLayerId(), type: "text", rotation: 0, opacity: 1, locked: false,
    fontFamily: "DM Sans", fontSize: 40, fontWeight: 400, italic: false, underline: false,
    uppercase: false, color: C.cream, align: "left", lineHeight: 1.2, letterSpacing: 0,
    ...p,
  };
}
function shape(p: Partial<ShapeLayer> & Pick<ShapeLayer, "x" | "y" | "w" | "h" | "shape">): ShapeLayer {
  return {
    id: makeLayerId(), type: "shape", rotation: 0, opacity: 1, locked: false,
    fill: C.forest, stroke: C.forest, strokeWidth: 0, radius: 0, ...p,
  };
}
function image(p: Partial<ImageLayer> & Pick<ImageLayer, "x" | "y" | "w" | "h">): ImageLayer {
  return {
    id: makeLayerId(), type: "image", rotation: 0, opacity: 1, locked: false,
    src: "", objectFit: "cover", radius: 0, ...p,
  };
}

export type ElementCtx = {
  board: { w: number; h: number };
  logo: BrandLogo | null;
  logoLight: BrandLogo | null;
};
export type ElementDef = {
  id: string;
  label: string;
  /** A short hint shown under the label. */
  hint?: string;
  build: (ctx: ElementCtx) => Layer[];
};
export type ElementGroup = { key: string; title: string; items: ElementDef[] };

/** Place a block of natural width `w` × height `h` centred on the board. */
function centre(board: { w: number; h: number }, w: number, h: number) {
  return { x: Math.round(board.w / 2 - w / 2), y: Math.round(board.h / 2 - h / 2) };
}

export const ELEMENT_GROUPS: ElementGroup[] = [
  {
    key: "brand",
    title: "Brand",
    items: [
      {
        id: "logo",
        label: "DR logo",
        hint: "The brand mark",
        build: ({ board, logo, logoLight }) => {
          const bl = logoLight ?? logo;
          if (bl?.url) {
            const h = 120;
            const w = Math.max(1, Math.round(h * bl.aspect));
            const { x, y } = centre(board, w, h);
            return [image({ x, y, w, h, src: bl.url, objectFit: "contain", name: "brand-logo" })];
          }
          // Type lockup fallback.
          const { x, y } = centre(board, 392, 30);
          return [
            shape({ x, y: y + 4, w: 15, h: 15, shape: "rect", fill: C.amber, rotation: 45 }),
            text({ x: x + 32, y, w: 360, h: 30, text: "DEEN RELIEF", fontFamily: BARLOW, fontSize: 24, fontWeight: 700, uppercase: true, letterSpacing: 6, color: C.cream }),
          ];
        },
      },
      {
        id: "eyebrow",
        label: "Eyebrow tag",
        hint: "Location · date",
        build: ({ board }) => {
          const { x, y } = centre(board, 560, 32);
          return [text({ x, y, w: 560, h: 32, text: "FROM GAZA · 25 MAY 2026", fontFamily: BARLOW, fontSize: 24, fontWeight: 700, uppercase: true, letterSpacing: 5, color: C.amber })];
        },
      },
      {
        id: "gold-rule",
        label: "Gold rule",
        hint: "Divider",
        build: ({ board }) => {
          const { x, y } = centre(board, 96, 6);
          return [shape({ x, y, w: 96, h: 6, shape: "rect", fill: C.amber })];
        },
      },
      {
        id: "source-line",
        label: "Source line",
        hint: "Attribution + charity no.",
        build: ({ board }) => {
          const w = Math.min(700, board.w - 128);
          const { x } = centre(board, w, 26);
          return [text({ x, y: board.h - 70, w, h: 26, text: "Source: OCHA · deenrelief.org · Charity No. 1158608", fontFamily: BARLOW, fontSize: 16, fontWeight: 600, uppercase: true, letterSpacing: 3, color: C.cream, opacity: 0.55 })];
        },
      },
      {
        id: "zakat-line",
        label: "Zakat trust line",
        hint: "Trust signal",
        build: ({ board }) => {
          const w = Math.min(640, board.w - 128);
          const { x, y } = centre(board, w, 24);
          return [text({ x, y, w, h: 24, text: "Your Zakat, in trusted hands · Deen Relief is on the ground now", fontFamily: BARLOW, fontSize: 15, fontWeight: 600, uppercase: true, letterSpacing: 1.5, color: C.amber, opacity: 0.9 })];
        },
      },
    ],
  },
  {
    key: "appeal",
    title: "Appeal",
    items: [
      {
        id: "emergency-box",
        label: "Emergency appeal box",
        hint: "Red urgency chip",
        build: ({ board }) => {
          const w = 300, h = 44;
          const { x, y } = centre(board, w, h);
          return [
            shape({ x, y, w, h, shape: "rect", fill: C.red, radius: 6 }),
            text({ x, y: y + 13, w, h: 24, text: "Emergency Appeal", fontFamily: BARLOW, fontSize: 19, fontWeight: 800, uppercase: true, letterSpacing: 3, color: C.cream, align: "center" }),
          ];
        },
      },
      {
        id: "donate-button",
        label: "Donate button",
        hint: "Gold CTA pill",
        build: ({ board }) => {
          const w = 320, h = 96;
          const { x, y } = centre(board, w, h);
          return [
            shape({ x, y, w, h, shape: "rect", fill: C.amber, radius: 6 }),
            text({ x, y: y + Math.round((h - 36) / 2), w, h: 40, text: "DONATE NOW", fontFamily: BARLOW, fontSize: 30, fontWeight: 800, uppercase: true, letterSpacing: 3, color: C.forest, align: "center" }),
          ];
        },
      },
      {
        id: "tier-ladder",
        label: "Donation tiers",
        hint: "£X provides Y ladder",
        build: ({ board }) => {
          const rows = [
            { amt: "£30", label: "Emergency food parcel for a family" },
            { amt: "£100", label: "Winter shelter kit" },
            { amt: "£250", label: "Urgent medical aid" },
          ];
          const w = 560, h = 70 * rows.length;
          const { x, y } = centre(board, w, h);
          return rows.flatMap((r, i) => {
            const ry = y + i * 70;
            return [
              text({ x, y: ry, w: 130, h: 50, text: r.amt, fontFamily: ANTON, fontSize: 40, fontWeight: 400, uppercase: true, lineHeight: 0.95, color: C.amber }),
              text({ x: x + 142, y: ry + 8, w: w - 142, h: 56, text: r.label, fontFamily: BARLOW, fontSize: 20, fontWeight: 500, lineHeight: 1.16, color: C.cream }),
            ];
          });
        },
      },
      {
        id: "qr-placeholder",
        label: "QR placeholder",
        hint: "Tap to add a campaign QR",
        build: ({ board }) => {
          const s = 280;
          const { x, y } = centre(board, s, s);
          return [shape({ x, y, w: s, h: s, shape: "rect", fill: C.cream, stroke: C.amber, strokeWidth: 3, radius: 18, name: "qr-placeholder" })];
        },
      },
      {
        id: "scan-caption",
        label: "“Scan to give”",
        hint: "QR caption",
        build: ({ board }) => {
          const { x, y } = centre(board, 360, 28);
          return [text({ x, y, w: 360, h: 28, text: "Scan to give", fontFamily: BARLOW, fontSize: 20, fontWeight: 700, uppercase: true, letterSpacing: 3, color: C.cream, opacity: 0.75, align: "center" })];
        },
      },
    ],
  },
  {
    key: "data",
    title: "Data",
    items: [
      {
        id: "stat-cell",
        label: "Big stat",
        hint: "Figure + label",
        build: ({ board }) => {
          const { x, y } = centre(board, 340, 200);
          return [
            text({ x, y, w: 340, h: 150, text: "2.1M", fontFamily: ANTON, fontSize: 124, fontWeight: 400, uppercase: true, lineHeight: 0.86, letterSpacing: -3, color: C.amber }),
            text({ x, y: y + 150, w: 340, h: 60, text: "now depend on humanitarian aid", fontFamily: BARLOW, fontSize: 20, fontWeight: 500, lineHeight: 1.2, color: C.creamDim }),
          ];
        },
      },
      {
        id: "fact-row",
        label: "Fact row",
        hint: "Figure inline + label",
        build: ({ board }) => {
          const { x, y } = centre(board, 520, 56);
          return [
            text({ x, y, w: 156, h: 56, text: "9 in 10", fontFamily: ANTON, fontSize: 46, fontWeight: 400, uppercase: true, lineHeight: 0.95, letterSpacing: -1, color: C.amber }),
            text({ x: x + 174, y: y + 6, w: 346, h: 60, text: "families skip meals every day", fontFamily: BARLOW, fontSize: 21, fontWeight: 500, lineHeight: 1.18, color: C.cream }),
          ];
        },
      },
      {
        id: "quote-mark",
        label: "Quote mark",
        hint: "Gold open-quote",
        build: ({ board }) => {
          const { x, y } = centre(board, 200, 180);
          return [text({ x, y, w: 200, h: 200, text: "“", fontFamily: ANTON, fontSize: 220, fontWeight: 400, lineHeight: 0.8, color: C.amber })];
        },
      },
      {
        id: "headline",
        label: "Headline",
        hint: "Anton display",
        build: ({ board }) => {
          const w = Math.min(820, board.w - 128);
          const { x, y } = centre(board, w, 120);
          return [text({ x, y, w, h: 120, text: "881 killed since the ceasefire.", fontFamily: ANTON, fontSize: 64, fontWeight: 400, uppercase: true, lineHeight: 0.96, color: C.cream })];
        },
      },
    ],
  },
  {
    key: "photos",
    title: "Photos",
    items: [
      {
        id: "portrait-photo",
        label: "Portrait photo",
        hint: "Tap to add an image",
        build: ({ board }) => {
          const w = 440, h = 580;
          const { x, y } = centre(board, w, h);
          return [image({ x, y, w, h, src: "", objectFit: "cover", name: "photo" })];
        },
      },
      {
        id: "landscape-photo",
        label: "Wide photo",
        hint: "Tap to add an image",
        build: ({ board }) => {
          const w = Math.min(760, board.w - 80), h = Math.round(w * 0.56);
          const { x, y } = centre(board, w, h);
          return [image({ x, y, w, h, src: "", objectFit: "cover", name: "photo" })];
        },
      },
      {
        id: "square-photo",
        label: "Square photo",
        hint: "Tap to add an image",
        build: ({ board }) => {
          const s = 460;
          const { x, y } = centre(board, s, s);
          return [image({ x, y, w: s, h: s, src: "", objectFit: "cover", name: "photo" })];
        },
      },
    ],
  },
];
