/**
 * Size recommendation logic + reference charts for the Bazaar's
 * sizing guide page.
 *
 * Sized for "true UK Muslim sizing" — the cuts our makers produce
 * track height as the primary axis (abayas are floor-length;
 * length must clear the foot but not pool) and bust as a
 * secondary check (the cuts are generous, so bust only forces a
 * size-up at the upper end of the chart). Body type
 * considerations (pregnancy, nursing) shift the recommendation
 * up one size to give comfortable room.
 *
 * Sources for size cut-offs:
 *   - Anchored to the seed migration's variant data (Small 52" /
 *     Medium 54" / Large 56" for abayas).
 *   - Bust ranges per size loosely tracked to UK 8–18 (Small ≈
 *     UK 8–12, Medium ≈ UK 12–16, Large ≈ UK 16–20+) which
 *     matches the regional commercial sizing the makers know.
 *
 * Why all numbers are explicit constants here rather than in the
 * DB: sizing physics doesn't change order-by-order. The DB has
 * the variants (which exist for sale, with stock counts); this
 * file has the *fit logic* tying customer measurements to those
 * variant choices. When sizes change, both update — keeping the
 * fit logic in code makes it diff-reviewable.
 */

export type GarmentType = "abaya" | "thobe";

/**
 * One row of the human-readable size chart. All dimensions in cm.
 * `lengthCm` is the garment's outer measurement (not the wearer's
 * height) — for abayas, this is the back-of-neck-to-hem length;
 * for thobes, the shoulder-to-hem length.
 */
export interface SizeChartRow {
  size: string;
  /** Human-readable fit range — e.g. "Fits 5'0" – 5'3" / 152-160cm" */
  fitsHeight: string;
  /** Wearer height range in cm — used by the recommender. */
  heightMinCm: number;
  heightMaxCm: number;
  /** Wearer bust circumference range. */
  bustMinCm: number;
  bustMaxCm: number;
  /** Garment length in cm. */
  lengthCm: number;
  /** Garment chest width (relaxed garment laid flat × 2 for circ).
   *  Useful for customers measuring against an existing piece. */
  garmentChestCm: number;
  /** Sleeve length (shoulder seam to cuff). */
  sleeveCm: number;
}

/**
 * Abaya size chart. Heights match the seed-data fit ranges.
 * Bust ranges are deliberately overlapping at the boundaries —
 * abayas are loose-cut so a person at the seam between sizes
 * has flexibility either way (the recommender prefers the
 * length-fit over the bust band when they disagree).
 */
export const ABAYA_SIZE_CHART: SizeChartRow[] = [
  {
    size: "Small (52\")",
    fitsHeight: "5'0\" – 5'3\" (152–160 cm)",
    heightMinCm: 152,
    heightMaxCm: 160,
    bustMinCm: 80,
    bustMaxCm: 95,
    lengthCm: 132,
    garmentChestCm: 112,
    sleeveCm: 56,
  },
  {
    size: "Medium (54\")",
    fitsHeight: "5'4\" – 5'7\" (161–170 cm)",
    heightMinCm: 161,
    heightMaxCm: 170,
    bustMinCm: 88,
    bustMaxCm: 105,
    lengthCm: 137,
    garmentChestCm: 118,
    sleeveCm: 58,
  },
  {
    size: "Large (56\")",
    fitsHeight: "5'8\" – 5'11\" (171–180 cm)",
    heightMinCm: 171,
    heightMaxCm: 180,
    bustMinCm: 97,
    bustMaxCm: 115,
    lengthCm: 142,
    garmentChestCm: 124,
    sleeveCm: 60,
  },
];

export const THOBE_SIZE_CHART: SizeChartRow[] = [
  {
    size: "Medium",
    fitsHeight: "5'4\" – 5'8\" (162–172 cm)",
    heightMinCm: 162,
    heightMaxCm: 172,
    bustMinCm: 92,
    bustMaxCm: 108,
    lengthCm: 145,
    garmentChestCm: 122,
    sleeveCm: 60,
  },
  {
    size: "Large",
    fitsHeight: "5'9\" – 6'0\" (173–182 cm)",
    heightMinCm: 173,
    heightMaxCm: 182,
    bustMinCm: 100,
    bustMaxCm: 116,
    lengthCm: 150,
    garmentChestCm: 130,
    sleeveCm: 62,
  },
  {
    size: "X-Large",
    fitsHeight: "6'0\" – 6'3\" (183–190 cm)",
    heightMinCm: 183,
    heightMaxCm: 190,
    bustMinCm: 108,
    bustMaxCm: 125,
    lengthCm: 155,
    garmentChestCm: 138,
    sleeveCm: 64,
  },
];

export function chartFor(garment: GarmentType): SizeChartRow[] {
  return garment === "abaya" ? ABAYA_SIZE_CHART : THOBE_SIZE_CHART;
}

// ─────────────────────────────────────────────────────────────────
// Recommendation
// ─────────────────────────────────────────────────────────────────

export type FitPreference = "roomier" | "true" | "fitted";

export interface RecommendationInput {
  garment: GarmentType;
  heightCm: number;
  bustCm: number;
  /** Optional hip — currently informational only, doesn't shift
   *  the recommendation. Hip-to-bust ratio matters for fitted
   *  Western cuts; abayas and thobes are too loose for it to bite. */
  hipCm?: number;
  fitPreference: FitPreference;
  /** Pregnancy or nursing — sizes up by one to give room across
   *  the bust + bump. */
  pregnantOrNursing: boolean;
}

export type RecommendationStatus =
  | "confident"
  | "between-sizes"
  | "size-up-recommended"
  | "size-down-recommended"
  | "out-of-range";

export interface Recommendation {
  status: RecommendationStatus;
  /** The recommended size from the chart. Null only when
   *  out-of-range (too tall / too short). */
  recommendedSize: string | null;
  /** Optional alternative — populated when the customer is
   *  between sizes (sits in the overlap on bust, or fit
   *  preference suggests trying the next size up). */
  alternativeSize?: string;
  /** Plain-English reasoning to render in the result card. One
   *  paragraph per "factor": height, bust, fit preference,
   *  pregnancy. */
  reasoning: string[];
  /** True when we recommend the customer email us for a custom
   *  order (too tall, too short, or out-of-bust). */
  customOrderEligible: boolean;
}

const HEIGHT_LOWER_BOUND_CM = 145;
const HEIGHT_UPPER_BOUND_CM_ABAYA = 185;
const HEIGHT_UPPER_BOUND_CM_THOBE = 195;
const BUST_FAR_TOO_LARGE_CM = 125;

/**
 * Pick a size by walking the chart and finding the row whose
 * height range contains the input. Falls back to the closest
 * row (above or below) when no exact match — recommender's
 * `status` field surfaces the inexact case to the caller.
 */
function pickByHeight(
  heightCm: number,
  chart: SizeChartRow[]
): { row: SizeChartRow | null; status: "exact" | "below" | "above" } {
  for (const row of chart) {
    if (heightCm >= row.heightMinCm && heightCm <= row.heightMaxCm) {
      return { row, status: "exact" };
    }
  }
  // Below the smallest size's lower bound
  if (heightCm < chart[0].heightMinCm) {
    return { row: chart[0], status: "below" };
  }
  // Above the largest size's upper bound
  return { row: chart[chart.length - 1], status: "above" };
}

/**
 * Apply the fit-preference + pregnancy modifiers to a base size
 * pick. Returns the same size when no modifier applies, or the
 * next size up (or down) when one does. Bounded by the chart
 * extremes — modifiers can't push past Small below or X-Large
 * above.
 */
function adjustForModifiers(
  baseRow: SizeChartRow,
  chart: SizeChartRow[],
  fitPreference: FitPreference,
  pregnantOrNursing: boolean,
  bustCm: number
): { row: SizeChartRow; wasShifted: "up" | "down" | null } {
  const baseIndex = chart.findIndex((r) => r.size === baseRow.size);

  // Pregnancy: always size up if not already at the top.
  if (pregnantOrNursing && baseIndex < chart.length - 1) {
    return { row: chart[baseIndex + 1], wasShifted: "up" };
  }

  // Bust check: if bust is above the row's max, size up.
  if (bustCm > baseRow.bustMaxCm && baseIndex < chart.length - 1) {
    return { row: chart[baseIndex + 1], wasShifted: "up" };
  }

  // Roomier preference: size up at the upper end of the band.
  if (
    fitPreference === "roomier" &&
    baseIndex < chart.length - 1 &&
    // Only size up if we're in the upper half of the band — at
    // the lower half a customer with "roomier" preference still
    // fits the base size, just less snugly.
    bustCm >= (baseRow.bustMinCm + baseRow.bustMaxCm) / 2
  ) {
    return { row: chart[baseIndex + 1], wasShifted: "up" };
  }

  // Fitted preference: size down at the lower end of the band.
  if (
    fitPreference === "fitted" &&
    baseIndex > 0 &&
    bustCm <= (baseRow.bustMinCm + baseRow.bustMaxCm) / 2
  ) {
    return { row: chart[baseIndex - 1], wasShifted: "down" };
  }

  return { row: baseRow, wasShifted: null };
}

/**
 * Build the human-readable reasoning sentences for each factor
 * that influenced the recommendation. Used to populate the
 * result card so the customer sees WHY they got the size they
 * did (vs a black-box recommender that says "Medium, trust us").
 */
function buildReasoning(
  input: RecommendationInput,
  picked: SizeChartRow,
  heightStatus: "exact" | "below" | "above",
  wasShifted: "up" | "down" | null
): string[] {
  const lines: string[] = [];

  if (heightStatus === "exact") {
    lines.push(
      `Your height of ${input.heightCm} cm sits inside the ${picked.size} length range (${picked.fitsHeight}).`
    );
  } else if (heightStatus === "below") {
    lines.push(
      `You're a touch shorter than our Small length range — the ${picked.size} will be longer than designed (around ${
        picked.heightMinCm - input.heightCm
      } cm extra). Many customers in this case prefer hemming to suit; email us before ordering if you'd like the hem shortened in-workshop.`
    );
  } else {
    lines.push(
      `You're a touch taller than our largest length — the ${picked.size} will be shorter than designed (around ${
        input.heightCm - picked.heightMaxCm
      } cm above the ankle). We can also order a custom longer batch — email us.`
    );
  }

  // Bust position within the band
  if (input.bustCm < picked.bustMinCm) {
    lines.push(
      `Your bust (${input.bustCm} cm) sits below the ${picked.size} chart range, which means the chest will be roomy. That's typical of how abayas are cut, so it's fine — but if you prefer a closer chest fit, try the next size down.`
    );
  } else if (input.bustCm > picked.bustMaxCm) {
    lines.push(
      `Your bust (${input.bustCm} cm) is above the ${picked.size} chart range, so we've already sized you up. Let us know if it still feels too snug — the cut is loose so it usually works.`
    );
  } else {
    lines.push(
      `Your bust (${input.bustCm} cm) sits comfortably inside the ${picked.size} chart range (${picked.bustMinCm}–${picked.bustMaxCm} cm).`
    );
  }

  if (wasShifted === "up" && !input.pregnantOrNursing) {
    if (input.fitPreference === "roomier") {
      lines.push(
        "You said you prefer a roomier fit — we've nudged your recommendation up one size."
      );
    }
  }
  if (wasShifted === "down") {
    lines.push(
      "You said you prefer a fitted feel — we've nudged your recommendation down one size."
    );
  }
  if (input.pregnantOrNursing) {
    lines.push(
      "You're currently pregnant or nursing — we've sized you up to give the bust and waist comfortable room. For later-stage maternity you may want to size up again, or pick a piece designed specifically for pregnancy."
    );
  }

  return lines;
}

export function recommendSize(input: RecommendationInput): Recommendation {
  const chart = chartFor(input.garment);
  const upperBound =
    input.garment === "abaya"
      ? HEIGHT_UPPER_BOUND_CM_ABAYA
      : HEIGHT_UPPER_BOUND_CM_THOBE;

  // Out-of-range height: surface custom-order option, don't pick
  // a size that we know won't fit.
  if (input.heightCm < HEIGHT_LOWER_BOUND_CM) {
    return {
      status: "out-of-range",
      recommendedSize: null,
      reasoning: [
        `${input.heightCm} cm is below our smallest size range. The ${chart[0].size} would be too long to wear comfortably without hemming. If you'd like, we can ask the maker to produce a custom shorter batch — email us with your height and chest measurements.`,
      ],
      customOrderEligible: true,
    };
  }
  if (input.heightCm > upperBound) {
    return {
      status: "out-of-range",
      recommendedSize: null,
      reasoning: [
        `${input.heightCm} cm is above our largest standard size. The ${chart[chart.length - 1].size} will sit above the ankle. We can order a custom longer batch from the maker — email us with your height and we'll come back with a quote and lead time.`,
      ],
      customOrderEligible: true,
    };
  }

  // Bust well outside the chart — independent of height. Surface
  // a custom-order pathway alongside the closest size.
  if (input.bustCm > BUST_FAR_TOO_LARGE_CM) {
    const closest = pickByHeight(input.heightCm, chart).row ?? chart[chart.length - 1];
    return {
      status: "out-of-range",
      recommendedSize: closest.size,
      reasoning: [
        `Your bust measurement (${input.bustCm} cm) is above our largest standard cut. The ${closest.size} is the closest length match but may feel tight across the chest. The maker can produce a custom wider batch — email us with your bust + height and we'll come back with a quote.`,
      ],
      customOrderEligible: true,
    };
  }

  const { row: pickedByHeight, status: heightStatus } = pickByHeight(
    input.heightCm,
    chart
  );
  const baseRow = pickedByHeight!;

  const { row: finalRow, wasShifted } = adjustForModifiers(
    baseRow,
    chart,
    input.fitPreference,
    input.pregnantOrNursing,
    input.bustCm
  );

  const reasoning = buildReasoning(input, finalRow, heightStatus, wasShifted);

  // Between-sizes detection: customer sits in the OVERLAP between
  // the bust ranges of two adjacent sizes AND we haven't already
  // shifted via modifiers. Surface the alternative so they know
  // they could also try the other.
  let alternativeSize: string | undefined;
  let status: RecommendationStatus = "confident";

  if (!wasShifted) {
    const finalIndex = chart.findIndex((r) => r.size === finalRow.size);
    const nextUp = chart[finalIndex + 1];
    if (nextUp && input.bustCm >= nextUp.bustMinCm) {
      // Bust is inside both finalRow's range AND nextUp's lower band
      alternativeSize = nextUp.size;
      status = "between-sizes";
      reasoning.push(
        `Your bust also fits the lower band of ${nextUp.size}. If you want a roomier silhouette, that's a reasonable second choice.`
      );
    }
  } else if (wasShifted === "up") {
    status = "size-up-recommended";
  } else if (wasShifted === "down") {
    status = "size-down-recommended";
  }

  return {
    status,
    recommendedSize: finalRow.size,
    alternativeSize,
    reasoning,
    customOrderEligible: false,
  };
}

// ─────────────────────────────────────────────────────────────────
// Unit conversion (helpers used by the client form when the user
// picks ft/in or inches over cm)
// ─────────────────────────────────────────────────────────────────

export function feetInchesToCm(feet: number, inches: number): number {
  return Math.round(feet * 30.48 + inches * 2.54);
}

export function inchesToCm(inches: number): number {
  return Math.round(inches * 2.54);
}
