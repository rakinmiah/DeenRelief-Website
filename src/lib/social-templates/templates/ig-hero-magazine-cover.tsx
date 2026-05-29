/**
 * Template: ig-hero-magazine-cover
 * Category: hero · IG + FB carousel
 *
 * Photo top 62%, dark green text panel bottom 38%. Eyebrow + big
 * Bowlby title + supporting body in the panel. The conventional
 * editorial-cover hero — strong photo, restrained typography.
 *
 * Slots:
 *   photo          (image:landscape, required)  — main photo
 *   eyebrow        (text, required)
 *   title          (text, required)             — main editorial beat
 *   body           (text, optional)             — supporting prose
 *   focal_point    (choice)                     — top|center|bottom crop anchor
 *   logo_variant   (choice)                     — defaults green (sits on photo)
 *   logo_position  (choice)                     — defaults top_left
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
const PHOTO_H = 670; // ~62%
const PANEL_H = SIZE - PHOTO_H;

const template: Template = {
  meta: {
    id: "ig-hero-magazine-cover",
    name: "Hero — magazine cover",
    description:
      "Photo top 62%, dark forest text panel bottom 38%. Restrained editorial cover. Best for landscape photos with the subject in the upper two-thirds.",
    platforms: ["instagram", "facebook"],
    category: "hero",
    aspect: "square",
    size: { w: SIZE, h: SIZE },
    previewPath: "/template-previews/ig-hero-magazine-cover.png",
    slots: [
      {
        id: "photo",
        type: "image:landscape",
        required: true,
        hint: "Landscape photo. Subject in the upper half so the bottom doesn't get cropped.",
      },
      {
        id: "eyebrow",
        type: "text:eyebrow",
        required: true,
        hint: "'FROM THE FIELD · 25 MAY 2026'",
      },
      {
        id: "title",
        type: "text:title",
        required: true,
        hint: "Editorial beat. 4–8 words.",
      },
      {
        id: "body",
        type: "text:body",
        required: false,
        hint: "One short supporting line.",
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
    const eyebrow = readText(slotValues, "eyebrow") ?? "";
    const title = readText(slotValues, "title") ?? "";
    const body = readText(slotValues, "body");
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
      title.length > 40 ? 52 : title.length > 24 ? 64 : 80;

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
            inset={56}
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
            paddingTop: 36,
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
              fontFamily: "DM Sans",
              fontWeight: 400,
              fontSize: 13,
              color: DR.cream,
              opacity: 0.55,
              letterSpacing: 3,
              textTransform: "uppercase",
            }}
          >
            <span style={{ display: "flex" }}>deenrelief.org</span>
            <span style={{ display: "flex" }}>Charity No. 1158608</span>
          </div>
        </div>
      </div>
    );
  },
};

export default template;
