/**
 * Template: ig-testimony-quote
 * Category: testimony · IG + FB carousel
 *
 * Typography-only pull quote. Lora italic title carrying the quote,
 * DM Sans attribution below in caps with an amber rule. Anchor
 * reference: MSF "Remember Us" pattern — restraint over urgency.
 * No quotation glyphs; the typography is the frame.
 *
 * Slots:
 *   eyebrow        (text, optional)   — "TESTIMONY · GAZA 2026"
 *   quote          (text, required)   — Lora italic, sentence case
 *   attribution    (text, required)   — Name, role, location
 *   logo_variant   (choice)           — defaults white
 *   logo_position  (choice)           — defaults top_left
 */

import {
  DR,
  Eyebrow,
  TemplateLogo,
  readChoice,
  readText,
} from "../shared";
import type { Template } from "../types";

const SIZE = 1080;

const template: Template = {
  meta: {
    id: "ig-testimony-quote",
    name: "Testimony — pull quote",
    description:
      "Typography-only pull quote. Lora italic on forest green with attribution beneath. Anchor: MSF 'Remember Us' pattern.",
    platforms: ["instagram", "facebook"],
    category: "testimony",
    aspect: "square",
    size: { w: SIZE, h: SIZE },
    previewPath: "/template-previews/ig-testimony-quote.png",
    slots: [
      {
        id: "eyebrow",
        type: "text:eyebrow",
        required: false,
        hint: "'TESTIMONY · GAZA 2026' or 'A VOICE FROM KHAN YOUNIS'",
      },
      {
        id: "quote",
        type: "text:quote",
        required: true,
        hint: "The quote itself, sentence case. No quotation marks needed — type frames it.",
      },
      {
        id: "attribution",
        type: "text:attribution",
        required: true,
        hint: "Name, role, location — 'Amina, 34 · Khan Younis'",
      },
      {
        id: "logo_variant",
        type: "choice:logo_variant",
        required: true,
        defaultValue: "white",
      },
      {
        id: "logo_position",
        type: "choice:logo_position",
        required: true,
        defaultValue: "top_left",
      },
    ],
  },
  render({ slotValues, logoOnLight, logoOnDark }) {
    const eyebrow = readText(slotValues, "eyebrow");
    const quote = readText(slotValues, "quote") ?? "";
    const attribution = readText(slotValues, "attribution") ?? "";
    const logoVariant = readChoice<"green" | "white">(
      slotValues,
      "logo_variant",
      "white"
    );
    const logoPosition = readChoice<
      "top_left" | "top_right" | "bottom_left" | "bottom_right"
    >(slotValues, "logo_position", "top_left");

    // Lora italic on forest — longer quotes get a smaller size to
    // keep the rhythm calm. We're going editorial, not tabloid.
    const quoteSize =
      quote.length > 160 ? 44 : quote.length > 100 ? 54 : quote.length > 60 ? 66 : 78;

    return (
      <div
        style={{
          width: SIZE,
          height: SIZE,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: DR.forest,
          fontFamily: "DM Sans",
          paddingTop: 130,
          paddingBottom: 110,
          paddingLeft: 90,
          paddingRight: 90,
          position: "relative",
        }}
      >
        <TemplateLogo
          variant={logoVariant}
          position={logoPosition}
          inset={56}
          logoOnLight={logoOnLight}
          logoOnDark={logoOnDark}
        />

        {eyebrow && <Eyebrow text={eyebrow} color={DR.amber} />}

        <div
          style={{
            display: "flex",
            fontFamily: "Lora",
            fontStyle: "italic",
            fontWeight: 700,
            fontSize: quoteSize,
            color: DR.cream,
            lineHeight: 1.2,
            letterSpacing: 0,
            textAlign: "center",
            maxWidth: 880,
            marginBottom: 48,
          }}
        >
          {quote}
        </div>

        {/* Amber rule + attribution */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 18,
          }}
        >
          <div
            style={{
              display: "flex",
              width: 64,
              height: 2,
              backgroundColor: DR.amber,
            }}
          />
          <div
            style={{
              display: "flex",
              fontFamily: "DM Sans",
              fontWeight: 700,
              fontSize: 22,
              color: DR.amber,
              letterSpacing: 3,
              textTransform: "uppercase",
              textAlign: "center",
            }}
          >
            {attribution}
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 48,
            display: "flex",
            fontFamily: "DM Sans",
            fontWeight: 400,
            fontSize: 14,
            color: DR.cream,
            opacity: 0.5,
            letterSpacing: 3,
            textTransform: "uppercase",
          }}
        >
          deenrelief.org · Charity No. 1158608
        </div>
      </div>
    );
  },
};

export default template;
