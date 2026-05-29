/**
 * Template: ig-hero-panel-right
 * Category: hero · IG + FB carousel
 *
 * Portrait photo fills the LEFT 60% column; dark forest text panel
 * takes the RIGHT 40%. Eyebrow + Bowlby title + body in the panel.
 * Use for portrait photos that would crop badly in the standard
 * panel-below hero (head or feet would get lost). Anchor reference:
 * legacy PhotoSlideRightPanel in the slide route (Phase 4t).
 *
 * Slots:
 *   photo          (image:portrait, required) — main photo
 *   eyebrow        (text, required)
 *   title          (text, required)
 *   body           (text, optional)
 *   focal_point    (choice)                   — top|center|bottom crop anchor
 *   logo_variant   (choice)                   — defaults green (sits on photo)
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
const PHOTO_W = 648; // 60% of 1080
const PANEL_W = SIZE - PHOTO_W;

const template: Template = {
  meta: {
    id: "ig-hero-panel-right",
    name: "Hero — portrait + right panel",
    description:
      "Portrait photo on the left 60%, dark forest panel on the right 40%. For tall photos that would crop badly in the magazine cover layout.",
    platforms: ["instagram", "facebook"],
    category: "hero",
    aspect: "square",
    size: { w: SIZE, h: SIZE },
    previewPath: "/template-previews/ig-hero-panel-right.png",
    slots: [
      {
        id: "photo",
        type: "image:portrait",
        required: true,
        hint: "Portrait or square photo. Subject's head ideally in the upper third.",
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
        hint: "Editorial beat. 4–8 words fits the narrow panel.",
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
    // The panel is narrow — title needs to step down sooner than in the
    // magazine cover layout.
    const titleSize =
      title.length > 40 ? 40 : title.length > 24 ? 52 : 64;

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
            width={300}
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

        {/* Text panel (right) */}
        <div
          style={{
            width: PANEL_W,
            height: SIZE,
            display: "flex",
            flexDirection: "column",
            backgroundColor: DR.forest,
            paddingTop: 56,
            paddingBottom: 48,
            paddingLeft: 40,
            paddingRight: 40,
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              justifyContent: "center",
            }}
          >
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
                lineHeight: 1.0,
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
                  fontSize: 20,
                  color: DR.cream,
                  opacity: 0.82,
                  lineHeight: 1.45,
                  marginTop: 20,
                }}
              >
                {body}
              </div>
            )}
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <div
              style={{
                display: "flex",
                fontFamily: "DM Sans",
                fontWeight: 700,
                fontSize: 15,
                color: DR.amber,
                letterSpacing: 1.5,
                textTransform: "uppercase",
              }}
            >
              deenrelief.org
            </div>
            <div
              style={{
                display: "flex",
                fontFamily: "DM Sans",
                fontWeight: 400,
                fontSize: 12,
                color: DR.cream,
                opacity: 0.55,
                letterSpacing: 1,
              }}
            >
              Charity No. 1158608
            </div>
          </div>
        </div>
      </div>
    );
  },
};

export default template;
