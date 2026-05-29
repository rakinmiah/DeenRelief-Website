/**
 * Template: ig-cta-donate
 * Category: cta · IG + FB carousel
 *
 * Direct donation closer. Big Bowlby title ("Donate now", "Help us
 * reach them", etc.), amber URL pill, charity tag below. Used for the
 * `donate` cta_kind branch of the old auto-gen flow; here it's just
 * another template the SMM can pick when the post arc warrants a
 * transactional ask.
 *
 * Slots:
 *   title          (text, required)   — short call line
 *   url            (text, required)   — the URL to display in the pill
 *   campaign_label (text, optional)   — small caption under the pill
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

/** Auto-size the URL font so it fits the pill on a single line.
 *  Same logic as Phase 5c's UrlPill auto-sizer in the social-image
 *  route — Bowlby is wide so long URLs need smaller font. */
function urlFontSize(url: string): number {
  const len = url.length;
  if (len <= 16) return 56;
  if (len <= 22) return 48;
  if (len <= 28) return 40;
  if (len <= 34) return 34;
  return 28;
}

const template: Template = {
  meta: {
    id: "ig-cta-donate",
    name: "CTA — donate (URL pill)",
    description:
      "Direct ask. Bowlby title, amber URL pill, charity footer. Use when the post arc warrants a transactional close.",
    platforms: ["instagram", "facebook"],
    category: "cta",
    aspect: "square",
    size: { w: SIZE, h: SIZE },
    previewPath: "/template-previews/ig-cta-donate.png",
    slots: [
      {
        id: "title",
        type: "text:title",
        required: true,
        hint: "Short call. 'DONATE NOW', 'STAND WITH GAZA', 'BACK OUR TEAM'.",
      },
      {
        id: "url",
        type: "text:body",
        required: true,
        hint: "URL displayed in the pill. e.g. 'deenrelief.org/palestine'",
      },
      {
        id: "campaign_label",
        type: "text:body",
        required: false,
        hint: "Tiny caption below the pill. e.g. 'Palestine Emergency Relief'",
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
    const title = readText(slotValues, "title") ?? "DONATE NOW";
    const url = readText(slotValues, "url") ?? "deenrelief.org";
    const campaignLabel = readText(slotValues, "campaign_label");
    const logoVariant = readChoice<"green" | "white">(
      slotValues,
      "logo_variant",
      "white"
    );
    const logoPosition = readChoice<
      "top_left" | "top_right" | "bottom_left" | "bottom_right"
    >(slotValues, "logo_position", "top_left");

    const titleSize = title.length > 20 ? 130 : 170;
    const urlSize = urlFontSize(url);

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

        <div
          style={{
            display: "flex",
            fontFamily: "Bowlby One SC",
            fontWeight: 400,
            fontSize: titleSize,
            color: DR.cream,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            lineHeight: 0.96,
            textAlign: "center",
            marginBottom: 48,
            maxWidth: 900,
          }}
        >
          {title.toUpperCase()}
        </div>

        {/* URL pill */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            backgroundColor: DR.amber,
            paddingTop: Math.round(urlSize * 0.5),
            paddingBottom: Math.round(urlSize * 0.5),
            paddingLeft: Math.round(urlSize * 1.0),
            paddingRight: Math.round(urlSize * 1.0),
            borderRadius: 999,
          }}
        >
          <span
            style={{
              display: "flex",
              fontFamily: "Bowlby One SC",
              fontWeight: 400,
              fontSize: urlSize,
              color: DR.forest,
              letterSpacing: 1,
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}
          >
            {url}
          </span>
        </div>

        {campaignLabel && (
          <div
            style={{
              display: "flex",
              fontFamily: "DM Sans",
              fontWeight: 500,
              fontSize: 22,
              color: DR.cream,
              opacity: 0.65,
              marginTop: 28,
              letterSpacing: 0.5,
            }}
          >
            {campaignLabel}
          </div>
        )}

        {/* Charity footer */}
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
