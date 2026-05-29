/**
 * Template: ig-response-photo
 * Category: response · IG + FB carousel
 *
 * DR's field response with a photo. Photo top 62%, dark forest panel
 * bottom 38%. Eyebrow "OUR RESPONSE", title is the action DR is
 * taking, body carries the specifics with numbers ("3,200 hot meals
 * served from our Khan Younis kitchen this week").
 *
 * Slots:
 *   photo          (image:landscape, required) — DR team / operation photo
 *   eyebrow        (text, optional)            — defaults "OUR RESPONSE"
 *   title          (text, required)            — what DR is doing
 *   body           (text, required)            — specifics with numbers
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
const PHOTO_H = 670; // ~62%
const PANEL_H = SIZE - PHOTO_H;

const template: Template = {
  meta: {
    id: "ig-response-photo",
    name: "Response — photo + panel",
    description:
      "DR's field response. Photo top, panel bottom with eyebrow 'OUR RESPONSE', action title, and specific numbers in the body.",
    platforms: ["instagram", "facebook"],
    category: "response",
    aspect: "square",
    size: { w: SIZE, h: SIZE },
    previewPath: "/template-previews/ig-response-photo.png",
    slots: [
      {
        id: "photo",
        type: "image:landscape",
        required: true,
        hint: "DR team in the field, the kitchen, the distribution, the clinic.",
      },
      {
        id: "eyebrow",
        type: "text:eyebrow",
        required: false,
        hint: "Defaults to 'OUR RESPONSE'. Override for 'ON THE GROUND · KHAN YOUNIS'.",
      },
      {
        id: "title",
        type: "text:title",
        required: true,
        hint: "What DR is doing — '3,200 HOT MEALS A DAY', 'CLINIC OPEN IN RAFAH'.",
      },
      {
        id: "body",
        type: "text:body",
        required: true,
        hint: "Specifics with numbers. Sentence case. Date and location anchor.",
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
    const eyebrow = readText(slotValues, "eyebrow") ?? "Our response";
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
      title.length > 40 ? 50 : title.length > 24 ? 62 : 76;

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
            <Eyebrow text={eyebrow} color={DR.amber} inline />
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
