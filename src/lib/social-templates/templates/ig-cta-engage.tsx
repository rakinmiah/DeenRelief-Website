/**
 * Template: ig-cta-engage
 * Category: cta · IG + FB carousel
 *
 * Comment-keyword CTA — the social-native ask. Anchor reference:
 * Islamic Relief's "Comment PETITION" pattern. Title is the prompt
 * ("Stand with Gaza."), body explains the action ("Comment STAND to
 * receive the petition link"). Amber chip showcases the keyword.
 * No URL pill — the ask is the comment, not a click-out.
 *
 * Slots:
 *   eyebrow        (text, optional)   — "ADD YOUR VOICE"
 *   title          (text, required)   — short prompt — Bowlby caps
 *   keyword        (text, required)   — the single word readers should comment
 *   body           (text, required)   — sentence-case action instructions
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
    id: "ig-cta-engage",
    name: "CTA — comment keyword",
    description:
      "Comment-keyword close. Bowlby prompt + amber keyword chip + body instruction. Anchor: Islamic Relief 'Comment PETITION' pattern.",
    platforms: ["instagram", "facebook"],
    category: "cta",
    aspect: "square",
    size: { w: SIZE, h: SIZE },
    previewPath: "/template-previews/ig-cta-engage.png",
    slots: [
      {
        id: "eyebrow",
        type: "text:eyebrow",
        required: false,
        hint: "'ADD YOUR VOICE' or 'JOIN THE CALL'",
      },
      {
        id: "title",
        type: "text:title",
        required: true,
        hint: "Short prompt. 'STAND WITH GAZA.', 'BE A WITNESS.'",
      },
      {
        id: "keyword",
        type: "text:title",
        required: true,
        hint: "The single word readers comment. 'STAND', 'PETITION', 'JOIN'.",
      },
      {
        id: "body",
        type: "text:body",
        required: true,
        hint: "Sentence-case action — 'Comment STAND to receive the petition link.'",
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
    const keyword = readText(slotValues, "keyword") ?? "";
    const body = readText(slotValues, "body") ?? "";
    const logoVariant = readChoice<"green" | "white">(
      slotValues,
      "logo_variant",
      "white"
    );
    const logoPosition = readChoice<
      "top_left" | "top_right" | "bottom_left" | "bottom_right"
    >(slotValues, "logo_position", "top_left");

    const titleSize =
      title.length > 30 ? 84 : title.length > 18 ? 110 : 140;
    // Keyword chip — single word, very tight.
    const keywordSize = keyword.length > 10 ? 56 : keyword.length > 6 ? 72 : 88;

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
            marginBottom: 42,
          }}
        >
          {title}
        </div>

        {/* Keyword chip — amber on forest, mimics how the IG comment
            box will look when readers type the word. */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 36,
          }}
        >
          <div
            style={{
              display: "flex",
              fontFamily: "DM Sans",
              fontWeight: 500,
              fontSize: 24,
              color: DR.cream,
              opacity: 0.7,
              letterSpacing: 1,
            }}
          >
            comment
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              backgroundColor: DR.amber,
              paddingTop: Math.round(keywordSize * 0.28),
              paddingBottom: Math.round(keywordSize * 0.28),
              paddingLeft: Math.round(keywordSize * 0.6),
              paddingRight: Math.round(keywordSize * 0.6),
              borderRadius: 999,
            }}
          >
            <span
              style={{
                display: "flex",
                fontFamily: "Bowlby One SC",
                fontWeight: 400,
                fontSize: keywordSize,
                color: DR.forest,
                letterSpacing: 2,
                textTransform: "uppercase",
                whiteSpace: "nowrap",
              }}
            >
              {keyword}
            </span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            fontFamily: "DM Sans",
            fontWeight: 500,
            fontSize: 24,
            color: DR.cream,
            opacity: 0.88,
            lineHeight: 1.4,
            maxWidth: 760,
            textAlign: "center",
          }}
        >
          {body}
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
          Deen Relief · Charity No. 1158608
        </div>
      </div>
    );
  },
};

export default template;
