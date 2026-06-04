/**
 * Template: ig-fact-photo
 * Category: fact · IG + FB carousel
 *
 * Photo-backed fact slide. Photo top 50%, dark forest panel bottom
 * 50% with eyebrow + factual Bowlby title + sentence-case sourced
 * body. The panel is slightly taller than the magazine cover hero
 * because the body is longer (it has to carry the source).
 *
 * Slots:
 *   photo          (image:landscape, required) — supporting photo
 *   eyebrow        (text, optional)            — "THE FACTS"
 *   title          (text, required)            — the fact, Bowlby caps
 *   body           (text, optional)            — sentence-case context
 *   source         (text, required)            — source attribution chip
 *   focal_point    (choice)                    — top|center|bottom crop anchor
 *   logo_variant   (choice)                    — defaults green
 *   logo_position  (choice)                    — defaults top_left
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
const PHOTO_H = 540; // 50%
const PANEL_H = SIZE - PHOTO_H;

const template: Template = {
  meta: {
    id: "ig-fact-photo",
    name: "Fact — photo + panel",
    description:
      "Photo top half, dark forest panel bottom half with eyebrow + Bowlby fact + sourced body. For facts that need a visual anchor.",
    platforms: ["instagram", "facebook"],
    category: "fact",
    aspect: "square",
    size: { w: SIZE, h: SIZE },
    previewPath: "/template-previews/ig-fact-photo.png",
    slots: [
      {
        id: "photo",
        type: "image:landscape",
        required: true,
        hint: "Landscape photo that supports the fact — location, context, scale.",
      },
      {
        id: "eyebrow",
        type: "text:eyebrow",
        required: false,
        hint: "'THE FACTS · WEST BANK 2026'",
      },
      {
        id: "title",
        type: "text:title",
        required: true,
        hint: "The fact. Short and final — '881 KILLED.'",
      },
      {
        id: "body",
        type: "text:body",
        required: false,
        hint: "Sentence-case context. Specifics over rhetoric.",
      },
      {
        id: "source",
        type: "text:source",
        required: true,
        hint: "Source attribution — 'OCHA · 25 May 2026'",
      },
      {
        id: "focal_point",
        type: "choice:focal_point",
        required: true,
        defaultValue: "center",
      },
      {
        id: "logo_variant",
        type: "choice:logo_variant",
        required: true,
        defaultValue: "green",
      },
      {
        id: "logo_position",
        type: "choice:logo_position",
        required: true,
        defaultValue: "top_left",
      },
    ],
  },
  render({
    slotValues,
    imageDataUris,
    logoOnLight,
    logoOnDark,
    creditText,
  }) {
    const eyebrow = readText(slotValues, "eyebrow");
    const title = readText(slotValues, "title") ?? "";
    const body = readText(slotValues, "body");
    const source = readText(slotValues, "source") ?? "";
    const focal = readChoice<"top" | "center" | "bottom">(
      slotValues,
      "focal_point",
      "center"
    );
    const logoVariant = readChoice<"green" | "white">(
      slotValues,
      "logo_variant",
      "green"
    );
    const logoPosition = readChoice<
      "top_left" | "top_right" | "bottom_left" | "bottom_right"
    >(slotValues, "logo_position", "top_left");

    const photoSrc = imageDataUris["photo"] ?? null;
    const titleSize =
      title.length > 30 ? 56 : title.length > 18 ? 72 : 90;

    return (
      <div
        style={{
          width: SIZE,
          height: SIZE,
          display: "flex",
          flexDirection: "column",
          backgroundColor: DR.forest,
          fontFamily: "DM Sans",
          position: "relative",
        }}
      >
        {/* Photo zone */}
        <div
          style={{
            width: SIZE,
            height: PHOTO_H,
            display: "flex",
            position: "relative",
            backgroundColor: DR.forestLight,
          }}
        >
          {photoSrc && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoSrc}
              alt=""
              width={SIZE}
              height={PHOTO_H}
              style={{
                width: SIZE,
                height: PHOTO_H,
                objectFit: "cover",
                objectPosition: `center ${focal}`,
              }}
            />
          )}
          <TemplateLogo
            variant={logoVariant}
            position={logoPosition}
            inset={48}
            logoOnLight={logoOnLight}
            logoOnDark={logoOnDark}
          />
          {creditText && (
            <div
              style={{
                position: "absolute",
                bottom: 14,
                right: 18,
                display: "flex",
                backgroundColor: "rgba(22, 56, 39, 0.78)",
                paddingTop: 6,
                paddingBottom: 6,
                paddingLeft: 12,
                paddingRight: 12,
                borderRadius: 4,
                maxWidth: 760,
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontFamily: "DM Sans",
                  fontStyle: "italic",
                  fontWeight: 400,
                  fontSize: 14,
                  color: DR.cream,
                  opacity: 0.92,
                }}
              >
                {creditText}
              </div>
            </div>
          )}
        </div>

        {/* Text panel */}
        <div
          style={{
            width: SIZE,
            height: PANEL_H,
            display: "flex",
            flexDirection: "column",
            backgroundColor: DR.forest,
            paddingTop: 40,
            paddingBottom: 32,
            paddingLeft: 56,
            paddingRight: 56,
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            {eyebrow && <Eyebrow text={eyebrow} color={DR.amber} inline />}
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
                marginTop: 8,
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
                  fontSize: 22,
                  color: DR.cream,
                  opacity: 0.82,
                  lineHeight: 1.4,
                  marginTop: 14,
                  maxWidth: 920,
                }}
              >
                {body}
              </div>
            )}
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
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
                  color: DR.amber,
                  letterSpacing: 3,
                  textTransform: "uppercase",
                }}
              >
                {source.replace(/^source:\s*/i, "")}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                fontFamily: "DM Sans",
                fontWeight: 400,
                fontSize: 13,
                color: DR.cream,
                opacity: 0.55,
                letterSpacing: 3,
                textTransform: "uppercase",
              }}
            >
              deenrelief.org
            </div>
          </div>
        </div>
      </div>
    );
  },
};

export default template;
