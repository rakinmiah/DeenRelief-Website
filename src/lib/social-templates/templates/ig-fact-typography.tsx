/**
 * Template: ig-fact-typography
 * Category: fact · IG + FB carousel
 *
 * Typography-only fact slide. Eyebrow ("THE FACTS"), big Bowlby
 * factual title ("881 KILLED."), sentence-case body explaining /
 * contextualising the fact, source attribution chip at the bottom.
 * No photo — pure type, because the fact itself is the evidence.
 *
 * Slots:
 *   eyebrow        (text, optional)   — "THE FACTS · OCHA 2026"
 *   title          (text, required)   — the fact itself, Bowlby caps
 *   body           (text, optional)   — sentence-case explanation
 *   source         (text, required)   — source attribution chip
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
    id: "ig-fact-typography",
    name: "Fact — typography only",
    description:
      "Typography-only fact slide. Eyebrow + Bowlby fact + sentence-case body + sourced chip. For when the fact IS the evidence.",
    platforms: ["instagram", "facebook"],
    category: "fact",
    aspect: "square",
    size: { w: SIZE, h: SIZE },
    previewPath: "/template-previews/ig-fact-typography.png",
    slots: [
      {
        id: "eyebrow",
        type: "text:eyebrow",
        required: false,
        hint: "'THE FACTS' or 'WHAT WE KNOW · 25 MAY 2026'",
      },
      {
        id: "title",
        type: "text:title",
        required: true,
        hint: "The fact, short and final. '881 KILLED.', '2.3M DISPLACED.'",
      },
      {
        id: "body",
        type: "text:body",
        required: false,
        hint: "Sentence-case context. Who, when, where — keep specific.",
      },
      {
        id: "source",
        type: "text:source",
        required: true,
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
    const title = readText(slotValues, "title") ?? "";
    const body = readText(slotValues, "body");
    const source = readText(slotValues, "source") ?? "";
    const logoVariant = readChoice<"green" | "white">(
      slotValues,
      "logo_variant",
      "white"
    );
    const logoPosition = readChoice<
      "top_left" | "top_right" | "bottom_left" | "bottom_right"
    >(slotValues, "logo_position", "top_left");

    // Title is the fact — keep it big. Step down for long facts.
    const titleSize =
      title.length > 30 ? 110 : title.length > 18 ? 140 : 170;

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
          paddingTop: 110,
          paddingBottom: 110,
          paddingLeft: 64,
          paddingRight: 64,
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
            textTransform: "uppercase",
            letterSpacing: 0.5,
            lineHeight: 0.98,
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
              fontWeight: 400,
              fontSize: 26,
              color: DR.cream,
              opacity: 0.85,
              lineHeight: 1.4,
              maxWidth: 820,
              textAlign: "center",
            }}
          >
            {body}
          </div>
        )}

        {/* Source attribution chip */}
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
          <div
            style={{
              display: "flex",
              width: 18,
              height: 2,
              backgroundColor: DR.amber,
            }}
          />
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
