/**
 * Template: ig-tiers-ladder
 * Category: tiers · IG + FB carousel
 *
 * Price ladder — three rows of "£amount   short description". Amber
 * amount on the left, cream description on the right, vertically
 * centred. The conventional gift-tier slide.
 *
 * Slots:
 *   eyebrow        (text, optional)   — "HOW YOUR GIFT HELPS"
 *   title          (text, optional)   — defaults to "EVERY GIFT COUNTS"
 *   tier_rows      (tier:rows, required) — array of {amountGbp, shortDescription}
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

type TierRow = {
  amountGbp: number;
  shortDescription: string;
  longDescription: string | null;
};

function readTierRows(
  slotValues: Record<string, unknown>,
  id: string
): TierRow[] {
  const v = slotValues[id];
  if (!v || typeof v !== "object") return [];
  const obj = v as { type?: string; rows?: unknown };
  if (obj.type !== "tier_rows" || !Array.isArray(obj.rows)) return [];
  return obj.rows.filter(
    (r): r is TierRow =>
      typeof r === "object" &&
      r !== null &&
      typeof (r as TierRow).amountGbp === "number" &&
      typeof (r as TierRow).shortDescription === "string"
  );
}

const template: Template = {
  meta: {
    id: "ig-tiers-ladder",
    name: "Tiers — price ladder",
    description:
      "Three-row gift ladder. Amber amount + cream description per row. The conventional charity tier slide done cleanly.",
    platforms: ["instagram", "facebook"],
    category: "tiers",
    aspect: "square",
    size: { w: SIZE, h: SIZE },
    previewPath: "/template-previews/ig-tiers-ladder.png",
    slots: [
      {
        id: "eyebrow",
        type: "text:eyebrow",
        required: false,
        hint: "'HOW YOUR GIFT HELPS'",
      },
      {
        id: "title",
        type: "text:title",
        required: false,
        hint: "Defaults to 'EVERY GIFT COUNTS' if blank.",
      },
      {
        id: "tier_rows",
        type: "tier:rows",
        required: true,
        hint: "Drag in 2–4 tier_row cards from the content column.",
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
    const title = readText(slotValues, "title") ?? "EVERY GIFT COUNTS";
    const rows = readTierRows(slotValues, "tier_rows");
    const logoVariant = readChoice<"green" | "white">(
      slotValues,
      "logo_variant",
      "white"
    );
    const logoPosition = readChoice<
      "top_left" | "top_right" | "bottom_left" | "bottom_right"
    >(slotValues, "logo_position", "top_left");

    const visibleRows = rows.slice(0, 4);

    return (
      <div
        style={{
          width: SIZE,
          height: SIZE,
          display: "flex",
          flexDirection: "column",
          backgroundColor: DR.forest,
          fontFamily: "DM Sans",
          paddingTop: 130,
          paddingBottom: 80,
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

        {eyebrow && (
          <div style={{ alignSelf: "center" }}>
            <Eyebrow text={eyebrow} color={DR.amber} />
          </div>
        )}

        <div
          style={{
            display: "flex",
            fontFamily: "Bowlby One SC",
            fontWeight: 400,
            fontSize: 92,
            color: DR.cream,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            lineHeight: 1.0,
            marginBottom: 56,
            textAlign: "center",
            alignSelf: "center",
            maxWidth: 920,
          }}
        >
          {title}
        </div>

        {/* Rows */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 32,
            flex: 1,
          }}
        >
          {visibleRows.map((row, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 32,
                paddingBottom: 18,
                borderBottom:
                  i === visibleRows.length - 1
                    ? "none"
                    : "1px solid rgba(224, 166, 54, 0.25)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontFamily: "Bowlby One SC",
                  fontWeight: 400,
                  fontSize: 90,
                  color: DR.amber,
                  width: 220,
                }}
              >
                {`£${row.amountGbp}`}
              </div>
              <div
                style={{
                  display: "flex",
                  fontFamily: "DM Sans",
                  fontWeight: 500,
                  fontSize: 26,
                  color: DR.cream,
                  lineHeight: 1.3,
                  flex: 1,
                }}
              >
                {row.shortDescription}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            fontFamily: "DM Sans",
            fontWeight: 400,
            fontSize: 14,
            color: DR.cream,
            opacity: 0.5,
            letterSpacing: 3,
            textTransform: "uppercase",
            marginTop: 24,
          }}
        >
          deenrelief.org · Charity No. 1158608
        </div>
      </div>
    );
  },
};

export default template;
