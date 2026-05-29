/**
 * Template: ig-testimony-portrait
 * Category: testimony · IG + FB carousel
 *
 * Photo + quote split. Portrait photo fills the LEFT 50%; dark
 * forest panel takes the RIGHT 50% with Lora italic quote +
 * attribution. The portrait carries the dignity, the panel carries
 * the words. Eyebrow optional inside the panel.
 *
 * Slots:
 *   photo          (image:portrait, required) — the speaker
 *   eyebrow        (text, optional)           — small caps tag in the panel
 *   quote          (text, required)           — Lora italic
 *   attribution    (text, required)           — name, role, location
 *   focal_point    (choice)                   — top|center|bottom crop anchor
 *   logo_variant   (choice)                   — defaults green (on photo)
 *   logo_position  (choice)                   — defaults top_left
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
const PHOTO_W = 540; // 50%
const PANEL_W = SIZE - PHOTO_W;

const template: Template = {
  meta: {
    id: "ig-testimony-portrait",
    name: "Testimony — portrait + quote",
    description:
      "Portrait photo on the left 50%, dark forest panel on the right 50% with Lora italic quote + attribution.",
    platforms: ["instagram", "facebook"],
    category: "testimony",
    aspect: "square",
    size: { w: SIZE, h: SIZE },
    previewPath: "/template-previews/ig-testimony-portrait.png",
    slots: [
      {
        id: "photo",
        type: "image:portrait",
        required: true,
        hint: "Portrait of the speaker — head and shoulders works best at this aspect.",
      },
      {
        id: "eyebrow",
        type: "text:eyebrow",
        required: false,
        hint: "'TESTIMONY · GAZA 2026'",
      },
      {
        id: "quote",
        type: "text:quote",
        required: true,
        hint: "The quote. Sentence case. No quotation marks needed.",
      },
      {
        id: "attribution",
        type: "text:attribution",
        required: true,
        hint: "Name, role, location.",
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
    const quote = readText(slotValues, "quote") ?? "";
    const attribution = readText(slotValues, "attribution") ?? "";
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
    // Narrow panel — step the quote size down more aggressively.
    const quoteSize =
      quote.length > 160 ? 28 : quote.length > 100 ? 34 : quote.length > 60 ? 42 : 50;

    return (
      <div
        style={{
          width: SIZE,
          height: SIZE,
          display: "flex",
          flexDirection: "row",
          backgroundColor: DR.forest,
          fontFamily: "DM Sans",
          position: "relative",
        }}
      >
        {/* Photo column (left) */}
        <div
          style={{
            width: PHOTO_W,
            height: SIZE,
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
              width={PHOTO_W}
              height={SIZE}
              style={{
                width: PHOTO_W,
                height: SIZE,
                objectFit: "cover",
                objectPosition: `center ${focal}`,
              }}
            />
          )}
          <TemplateLogo
            variant={logoVariant}
            position={logoPosition}
            inset={48}
            width={260}
            logoOnLight={logoOnLight}
            logoOnDark={logoOnDark}
          />
          {creditText && (
            <div
              style={{
                position: "absolute",
                bottom: 16,
                right: 16,
                display: "flex",
                backgroundColor: "rgba(22, 56, 39, 0.78)",
                paddingTop: 6,
                paddingBottom: 6,
                paddingLeft: 12,
                paddingRight: 12,
                borderRadius: 4,
                maxWidth: PHOTO_W - 60,
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontFamily: "DM Sans",
                  fontStyle: "italic",
                  fontWeight: 400,
                  fontSize: 13,
                  color: DR.cream,
                  opacity: 0.92,
                }}
              >
                {creditText}
              </div>
            </div>
          )}
        </div>

        {/* Quote panel (right) */}
        <div
          style={{
            width: PANEL_W,
            height: SIZE,
            display: "flex",
            flexDirection: "column",
            backgroundColor: DR.forest,
            paddingTop: 64,
            paddingBottom: 56,
            paddingLeft: 48,
            paddingRight: 48,
            justifyContent: "center",
          }}
        >
          {eyebrow && <Eyebrow text={eyebrow} color={DR.amber} />}

          <div
            style={{
              display: "flex",
              fontFamily: "Lora",
              fontStyle: "italic",
              fontWeight: 700,
              fontSize: quoteSize,
              color: DR.cream,
              lineHeight: 1.25,
              letterSpacing: 0,
              marginBottom: 36,
            }}
          >
            {quote}
          </div>

          {/* Amber rule + attribution */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <div
              style={{
                display: "flex",
                width: 48,
                height: 2,
                backgroundColor: DR.amber,
              }}
            />
            <div
              style={{
                display: "flex",
                fontFamily: "DM Sans",
                fontWeight: 700,
                fontSize: 17,
                color: DR.amber,
                letterSpacing: 2.5,
                textTransform: "uppercase",
              }}
            >
              {attribution}
            </div>
          </div>

          <div
            style={{
              position: "absolute",
              bottom: 36,
              right: 48,
              display: "flex",
              fontFamily: "DM Sans",
              fontWeight: 400,
              fontSize: 12,
              color: DR.cream,
              opacity: 0.5,
              letterSpacing: 2,
              textTransform: "uppercase",
            }}
          >
            deenrelief.org
          </div>
        </div>
      </div>
    );
  },
};

export default template;
