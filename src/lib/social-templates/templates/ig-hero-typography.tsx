/**
 * Template: ig-hero-typography
 * Category: hero · IG + FB carousel
 *
 * Typography-led hero — no photo. Big Bowlby caps headline centred on
 * the forest canvas, amber editorial eyebrow above, supporting body
 * below. Best when the story's strongest beat IS the words (a number,
 * a claim, a date) and no photo carries the same weight.
 *
 * Slots:
 *   eyebrow  (text, optional)  — small caps tag at top
 *   title    (text, required)  — main headline (≤ ~24 chars works best)
 *   body     (text, optional)  — supporting prose below
 *   logo_variant   (choice)    — green | white  (defaults white on forest)
 *   logo_position  (choice)    — top_left | ... | bottom_right
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
    id: "ig-hero-typography",
    name: "Hero — typography only",
    description:
      "No photo. Big Bowlby caps headline centred on forest green, amber eyebrow above, supporting body below. Best when the words ARE the story.",
    platforms: ["instagram", "facebook"],
    category: "hero",
    aspect: "square",
    size: { w: SIZE, h: SIZE },
    previewPath: "/template-previews/ig-hero-typography.png",
    slots: [
      {
        id: "eyebrow",
        type: "text:eyebrow",
        required: false,
        hint: "Small caps tag — e.g. 'EMERGENCY APPEAL · 25 MAY 2026'",
      },
      {
        id: "title",
        type: "text:title",
        required: true,
        hint: "Editorial beat. Shorter is stronger — 'GAZA, STILL.' beats a sentence.",
      },
      {
        id: "body",
        type: "text:body",
        required: false,
        hint: "One short supporting sentence — the strongest specific fact.",
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
    const title = readText(slotValues, "title") ?? "";
    const body = readText(slotValues, "body");
    const logoVariant = readChoice<"green" | "white">(
      slotValues,
      "logo_variant",
      "white"
    );
    const logoPosition = readChoice<
      "top_left" | "top_right" | "bottom_left" | "bottom_right"
    >(slotValues, "logo_position", "top_left");

    // Title sizes down as it gets longer so it doesn't wrap into a
    // tiny chunk against the wide canvas.
    const titleSize =
      title.length > 30 ? 110 : title.length > 20 ? 140 : 170;

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
          padding: 80,
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
            fontFamily: "Bowlby One SC",
            fontWeight: 400,
            fontSize: titleSize,
            color: DR.cream,
            letterSpacing: 0.5,
            lineHeight: 0.98,
            textTransform: "uppercase",
            textAlign: "center",
            maxWidth: 900,
            marginBottom: body ? 36 : 0,
          }}
        >
          {title}
        </div>

        {body && (
          <div
            style={{
              display: "flex",
              fontFamily: "DM Sans",
              fontWeight: 500,
              fontSize: 28,
              color: DR.cream,
              opacity: 0.82,
              lineHeight: 1.4,
              maxWidth: 780,
              textAlign: "center",
            }}
          >
            {body}
          </div>
        )}

        {/* Charity footer — always present, low-key. */}
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
