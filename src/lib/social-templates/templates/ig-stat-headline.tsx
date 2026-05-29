/**
 * Template: ig-stat-headline
 * Category: stat · IG + FB carousel
 *
 * Single huge amber number anchored centre, with a small supporting
 * sentence below. Best for the "by-the-numbers" beat in a story
 * — 1.7M, 881, 6 a day, 50+. Restraint matters: the number IS the
 * slide; the body explains it but doesn't compete.
 *
 * Slots:
 *   eyebrow        (text, optional)   — "BY THE NUMBERS · WEST BANK 2026"
 *   stat           (text, required)   — the headline number
 *   body           (text, optional)   — one supporting sentence (sentence case)
 *   source         (text, optional)   — source attribution chip
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
    id: "ig-stat-headline",
    name: "Stat — huge headline number",
    description:
      "Single huge amber number, small editorial body underneath. For the by-the-numbers beat. Restraint over decoration.",
    platforms: ["instagram", "facebook"],
    category: "stat",
    aspect: "square",
    size: { w: SIZE, h: SIZE },
    previewPath: "/template-previews/ig-stat-headline.png",
    slots: [
      {
        id: "eyebrow",
        type: "text:eyebrow",
        required: false,
        hint: "'BY THE NUMBERS · WEST BANK 2026'",
      },
      {
        id: "stat",
        type: "text:title",
        required: true,
        hint: "The number — '1.7M', '881', '6 A DAY', '50+'",
      },
      {
        id: "body",
        type: "text:body",
        required: false,
        hint: "One supporting sentence in sentence case. The number IS the slide.",
      },
      {
        id: "source",
        type: "text:source",
        required: false,
        hint: "Source attribution — 'OCHA · 25 May 2026'",
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
    const stat = readText(slotValues, "stat") ?? "";
    const body = readText(slotValues, "body");
    const source = readText(slotValues, "source");
    const logoVariant = readChoice<"green" | "white">(
      slotValues,
      "logo_variant",
      "white"
    );
    const logoPosition = readChoice<
      "top_left" | "top_right" | "bottom_left" | "bottom_right"
    >(slotValues, "logo_position", "top_left");

    // Stat is intentionally HUGE. Step down only for long strings.
    const len = stat.length;
    const statSize = len > 12 ? 200 : len > 8 ? 260 : 320;

    return (
      <div
        style={{
          width: SIZE,
          height: SIZE,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
          backgroundColor: DR.forest,
          fontFamily: "DM Sans",
          paddingTop: 110,
          paddingBottom: 110,
          paddingLeft: 56,
          paddingRight: 56,
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
            fontSize: statSize,
            color: DR.amber,
            lineHeight: 0.95,
            letterSpacing: -2,
            marginBottom: body ? 28 : 0,
          }}
        >
          {stat}
        </div>

        {body && (
          <div
            style={{
              display: "flex",
              fontFamily: "DM Sans",
              fontWeight: 500,
              fontSize: 28,
              color: DR.cream,
              opacity: 0.9,
              lineHeight: 1.35,
              maxWidth: 860,
              textAlign: "center",
            }}
          >
            {body}
          </div>
        )}

        {source && (
          <div
            style={{
              position: "absolute",
              bottom: 96,
              display: "flex",
              alignItems: "center",
              gap: 10,
              backgroundColor: "rgba(247, 243, 232, 0.08)",
              paddingTop: 10,
              paddingBottom: 10,
              paddingLeft: 18,
              paddingRight: 18,
              borderRadius: 4,
            }}
          >
            <div style={{ display: "flex", width: 18, height: 2, backgroundColor: DR.amber }} />
            <div
              style={{
                display: "flex",
                fontFamily: "DM Sans",
                fontWeight: 700,
                fontSize: 13,
                color: DR.cream,
                opacity: 0.85,
                letterSpacing: 3,
                textTransform: "uppercase",
              }}
            >
              {source.replace(/^source:\s*/i, "")}
            </div>
          </div>
        )}

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
