/**
 * Shared palette + helpers for the template registry.
 *
 * Every template imports DR brand tokens + the logo-positioning
 * helper from this file, so a brand-palette change updates every
 * template at once and the position math doesn't get re-implemented
 * in each template file.
 *
 * NOTE — this is the SAME palette + position math used by the legacy
 * slide route (src/app/api/admin/first-response/[id]/slide/[index]/route.tsx).
 * Once the deck builder is the primary path, we can delete the
 * duplicate in the slide route and re-import from here.
 */

import type React from "react";

/** Deen Relief brand palette. */
export const DR = {
  forest: "#163827", /* deep forest green — primary canvas */
  forestLight: "#1F4D3B", /* a touch brighter for accent strips */
  cream: "#F7F3E8", /* off-white, the "paper" of our editorial system */
  amber: "#E0A636", /* gold accent — eyebrows, dividers, URL pill */
  amberDeep: "#B97F23", /* hover / pressed variant */
  red: "#C0392B", /* used SPARINGLY on CTAs only */
  white: "#FFFFFF",
} as const;

/** Logo placement options — matches the schema field used since
 *  Phase 5a / wired in 5d. */
export type LogoPosition =
  | "top_left"
  | "top_right"
  | "bottom_left"
  | "bottom_right";

/** Compute the absolute-position style fields for a logo wrapper
 *  given a position enum + inset. Inset is the distance from the
 *  edge (uniform vertically + horizontally). */
export function logoPositionStyle(
  position: LogoPosition,
  inset: number
): React.CSSProperties {
  switch (position) {
    case "top_right":
      return { position: "absolute", top: inset, right: inset };
    case "bottom_left":
      return { position: "absolute", bottom: inset, left: inset };
    case "bottom_right":
      return { position: "absolute", bottom: inset, right: inset };
    case "top_left":
    default:
      return { position: "absolute", top: inset, left: inset };
  }
}

/** Standard logo block — picks the correct variant (green / white)
 *  based on the `variant` slot value and the available data URIs,
 *  positions per the `position` choice slot, and degrades to a
 *  small inline-SVG approximation when neither logo has been
 *  uploaded yet. */
export function TemplateLogo({
  variant,
  position,
  inset = 48,
  width = 320,
  height = 100,
  logoOnLight,
  logoOnDark,
}: {
  variant: "green" | "white";
  position: LogoPosition;
  inset?: number;
  width?: number;
  height?: number;
  logoOnLight: string | null;
  logoOnDark: string | null;
}) {
  const data = variant === "green" ? logoOnLight : logoOnDark;
  if (data) {
    return (
      <div style={{ ...logoPositionStyle(position, inset), display: "flex" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={data}
          alt="Deen Relief"
          width={width}
          height={height}
          style={{
            width,
            height,
            objectFit: "contain",
            objectPosition: "left center",
          }}
        />
      </div>
    );
  }
  // Fallback wordmark when no logo asset is uploaded yet.
  const fg = variant === "green" ? DR.forest : DR.cream;
  return (
    <div
      style={{
        ...logoPositionStyle(position, inset),
        display: "flex",
        alignItems: "center",
        fontFamily: "DM Sans",
        fontWeight: 700,
        fontSize: 22,
        letterSpacing: 3,
        color: fg,
        textTransform: "uppercase",
      }}
    >
      Deen Relief
    </div>
  );
}

/** Standard editorial eyebrow — small amber caps tag at the top of
 *  the panel. Renders the typical "FROM THE FIELD · 25 MAY 2026"
 *  pattern with a leading amber rule for visual rhythm. */
export function Eyebrow({
  text,
  color = DR.amber,
  inline = false,
}: {
  text: string;
  color?: string;
  inline?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        marginBottom: inline ? 8 : 18,
      }}
    >
      <div
        style={{
          display: "flex",
          width: 28,
          height: 2,
          backgroundColor: color,
        }}
      />
      <div
        style={{
          display: "flex",
          fontFamily: "DM Sans",
          fontWeight: 700,
          fontSize: 13,
          color,
          letterSpacing: 4,
          textTransform: "uppercase",
        }}
      >
        {text}
      </div>
    </div>
  );
}

/** Helper: pull a text value out of a slot value, or null if absent
 *  / not a text slot. Templates use this to defensively read their
 *  slot values without doing the type-discrimination dance every
 *  time. */
export function readText(
  slotValues: Record<string, unknown>,
  id: string
): string | null {
  const v = slotValues[id];
  if (!v || typeof v !== "object") return null;
  const obj = v as { type?: string; text?: string };
  if (obj.type !== "text" || typeof obj.text !== "string") return null;
  return obj.text;
}

/** Helper: pull a choice value out of a slot value, with default. */
export function readChoice<T extends string>(
  slotValues: Record<string, unknown>,
  id: string,
  defaultValue: T
): T {
  const v = slotValues[id];
  if (!v || typeof v !== "object") return defaultValue;
  const obj = v as { type?: string; value?: string };
  if (obj.type !== "choice" || typeof obj.value !== "string") return defaultValue;
  return obj.value as T;
}
