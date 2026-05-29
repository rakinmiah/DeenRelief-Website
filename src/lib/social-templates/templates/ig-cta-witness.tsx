/**
 * Template: ig-cta-witness
 * Category: cta · IG + FB carousel
 *
 * Final slide for the quiet_dignity / testimony register. Anchored by
 * the MSF "Remember Us" pattern — REMEMBER eyebrow, big Bowlby
 * statement, amber rule divider, hashtag pair as the ask (not a URL
 * pill), charity grounding footer. Reverent posts that ask for
 * engagement out-perform "DONATE NOW" closers on serious conflict
 * coverage.
 *
 * Slots:
 *   title          (text, required)   — short witness statement
 *   hashtag_pair   (text, required)   — '#tag1 · #tag2' formatted
 *   logo_variant   (choice)           — defaults white
 *   logo_position  (choice)           — defaults top_left
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
    id: "ig-cta-witness",
    name: "CTA — witness",
    description:
      "Reverent closer. Big statement, amber divider, hashtag pair instead of a URL pill. Anchor reference: MSF 'Remember Us' (327K likes).",
    platforms: ["instagram", "facebook"],
    category: "cta",
    aspect: "square",
    size: { w: SIZE, h: SIZE },
    previewPath: "/template-previews/ig-cta-witness.png",
    slots: [
      {
        id: "title",
        type: "text:title",
        required: true,
        hint: "Short witness statement — 'STAY WITH THEM.', 'REMEMBER US.', 'WE SEE YOU.'",
      },
      {
        id: "hashtag_pair",
        type: "text:body",
        required: true,
        hint: "Two hashtags separated by ' · '. e.g. '#ceasefirenow · #freepalestine'",
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
    const title = readText(slotValues, "title") ?? "";
    const hashtags =
      readText(slotValues, "hashtag_pair") ?? "#standwiththem · #ceasefirenow";
    const logoVariant = readChoice<"green" | "white">(
      slotValues,
      "logo_variant",
      "white"
    );
    const logoPosition = readChoice<
      "top_left" | "top_right" | "bottom_left" | "bottom_right"
    >(slotValues, "logo_position", "top_left");

    return (
      <div
        style={{
          width: SIZE,
          height: SIZE,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          alignItems: "center",
          textAlign: "center",
          backgroundColor: DR.forest,
          fontFamily: "DM Sans",
          paddingTop: 110,
          paddingBottom: 80,
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

        {/* Top: eyebrow + statement */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 28,
            }}
          >
            <div style={{ display: "flex", width: 28, height: 2, backgroundColor: DR.amber }} />
            <div
              style={{
                display: "flex",
                fontFamily: "DM Sans",
                fontWeight: 700,
                fontSize: 13,
                color: DR.amber,
                letterSpacing: 4,
                textTransform: "uppercase",
              }}
            >
              Remember
            </div>
          </div>
          <div
            style={{
              display: "flex",
              fontFamily: "Bowlby One SC",
              fontWeight: 400,
              fontSize: title.length > 30 ? 76 : 110,
              color: DR.cream,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              lineHeight: 1.0,
              maxWidth: 880,
              textAlign: "center",
            }}
          >
            {title}
          </div>
        </div>

        {/* Middle: amber rule + hashtag pair */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 28,
          }}
        >
          <div style={{ display: "flex", width: 96, height: 3, backgroundColor: DR.amber }} />
          <div
            style={{
              display: "flex",
              fontFamily: "DM Sans",
              fontWeight: 700,
              fontSize: 36,
              color: DR.amber,
              letterSpacing: 1.5,
              textTransform: "lowercase",
              textAlign: "center",
            }}
          >
            {hashtags}
          </div>
        </div>

        {/* Bottom: charity grounding */}
        <div
          style={{
            display: "flex",
            fontFamily: "DM Sans",
            fontWeight: 400,
            fontSize: 14,
            color: DR.cream,
            opacity: 0.5,
            letterSpacing: 3,
            textTransform: "uppercase",
            textAlign: "center",
          }}
        >
          Deen Relief · Charity No. 1158608
        </div>
      </div>
    );
  },
};

export default template;
