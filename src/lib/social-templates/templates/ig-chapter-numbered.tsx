/**
 * Template: ig-chapter-numbered
 * Category: chapter · IG + FB carousel
 *
 * Manifesto chapter slide. Big Bowlby numeral (280px) on the left,
 * claim title + proof body on the right. Anchor reference:
 * Charity:Water manifesto ("We believe in giving 100%. That
 * means..."). Each slide is one chapter of a longer post arc.
 *
 * Slots:
 *   chapter_number (text, required)  — "01", "02", "1", "5"
 *   title          (text, required)  — the claim — Bowlby caps
 *   body           (text, required)  — proof / explanation — sentence case
 *   logo_variant   (choice)          — defaults white
 *   logo_position  (choice)          — defaults top_right
 */

import {
  DR,
  TemplateLogo,
  readChoice,
  readText,
} from "../shared";
import type { Template } from "../types";

const SIZE = 1080;

const template: Template = {
  meta: {
    id: "ig-chapter-numbered",
    name: "Chapter — numbered manifesto",
    description:
      "Big Bowlby numeral on the left, claim + proof on the right. Anchor: Charity:Water manifesto pattern.",
    platforms: ["instagram", "facebook"],
    category: "chapter",
    aspect: "square",
    size: { w: SIZE, h: SIZE },
    previewPath: "/template-previews/ig-chapter-numbered.png",
    slots: [
      {
        id: "chapter_number",
        type: "text:title",
        required: true,
        hint: "'01', '02', '03' — zero-padded reads as a chapter mark.",
      },
      {
        id: "title",
        type: "text:title",
        required: true,
        hint: "The claim, Bowlby caps. 'WE BELIEVE IN 100%.'",
      },
      {
        id: "body",
        type: "text:body",
        required: true,
        hint: "Sentence-case proof. The 'that means...' clause.",
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
        defaultValue: "top_right",
      },
    ],
  },
  render({ slotValues, logoOnLight, logoOnDark }) {
    const chapterNumber = readText(slotValues, "chapter_number") ?? "01";
    const title = readText(slotValues, "title") ?? "";
    const body = readText(slotValues, "body") ?? "";
    const logoVariant = readChoice<"green" | "white">(
      slotValues,
      "logo_variant",
      "white"
    );
    const logoPosition = readChoice<
      "top_left" | "top_right" | "bottom_left" | "bottom_right"
    >(slotValues, "logo_position", "top_right");

    // Big chapter numeral. Shrinks slightly for 3+ digits.
    const numeralSize = chapterNumber.length > 2 ? 220 : 280;
    const titleSize =
      title.length > 40 ? 48 : title.length > 24 ? 60 : 72;

    return (
      <div
        style={{
          width: SIZE,
          height: SIZE,
          display: "flex",
          flexDirection: "row",
          backgroundColor: DR.forest,
          fontFamily: "DM Sans",
          paddingTop: 120,
          paddingBottom: 100,
          paddingLeft: 80,
          paddingRight: 80,
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

        {/* Left column — chapter numeral */}
        <div
          style={{
            width: 320,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "flex-start",
          }}
        >
          <div
            style={{
              display: "flex",
              fontFamily: "DM Sans",
              fontWeight: 700,
              fontSize: 14,
              color: DR.amber,
              letterSpacing: 4,
              textTransform: "uppercase",
              marginBottom: 18,
            }}
          >
            Chapter
          </div>
          <div
            style={{
              display: "flex",
              fontFamily: "Bowlby One SC",
              fontWeight: 400,
              fontSize: numeralSize,
              color: DR.amber,
              lineHeight: 0.9,
              letterSpacing: -2,
            }}
          >
            {chapterNumber}
          </div>
        </div>

        {/* Right column — claim + proof */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            paddingLeft: 48,
          }}
        >
          <div
            style={{
              display: "flex",
              fontFamily: "Bowlby One SC",
              fontWeight: 400,
              fontSize: titleSize,
              color: DR.cream,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              lineHeight: 1.0,
            }}
          >
            {title}
          </div>
          <div
            style={{
              display: "flex",
              width: 56,
              height: 2,
              backgroundColor: DR.amber,
              marginTop: 28,
              marginBottom: 28,
            }}
          />
          <div
            style={{
              display: "flex",
              fontFamily: "DM Sans",
              fontWeight: 400,
              fontSize: 24,
              color: DR.cream,
              opacity: 0.88,
              lineHeight: 1.45,
            }}
          >
            {body}
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 48,
            left: 80,
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
