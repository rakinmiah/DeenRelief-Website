/**
 * "How to measure" instructions for the sizing guide.
 *
 * Four measurements: height, bust, hip, sleeve. Each pairs a
 * simple inline SVG line drawing with plain-text instructions —
 * we deliberately use abstract figures rather than gendered or
 * stylised illustrations so the page reads as a clear technical
 * guide, not fashion editorial.
 *
 * Server component — pure rendering, no interactivity.
 */

export default function HowToMeasure() {
  return (
    <div className="grid sm:grid-cols-2 gap-6">
      <MeasurementCard
        label="Height"
        instruction="Stand barefoot against a wall with your back flat. Measure from the floor to the top of your head."
        why="Sets the abaya length — the most important dimension. We size by height bands, not chest."
        svg={<HeightDiagram />}
      />
      <MeasurementCard
        label="Bust"
        instruction="Wearing a light layer, wrap the tape around the fullest part of your bust. Keep it level all the way around — not too tight, not loose."
        why="Sets the chest fit. Abayas are loose-cut, so most bust measurements are forgiving."
        svg={<BustDiagram />}
      />
      <MeasurementCard
        label="Hip"
        instruction="Stand with feet together. Wrap the tape around the widest point of your hips — usually 18–20 cm below the waist."
        why="Optional for abayas (loose cut) but useful for thobe sizing and any future fitted pieces."
        svg={<HipDiagram />}
      />
      <MeasurementCard
        label="Sleeve"
        instruction="Bend your arm slightly. Measure from the bony point at the top of your shoulder, along the outside of the arm, to the wrist."
        why="Optional. Our abaya sleeves run generous; longer arms still fit because the cuffs are loose."
        svg={<SleeveDiagram />}
      />
    </div>
  );
}

function MeasurementCard({
  label,
  instruction,
  why,
  svg,
}: {
  label: string;
  instruction: string;
  why: string;
  svg: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-charcoal/10 p-5 flex gap-4">
      <div className="flex-shrink-0 w-20 h-28 sm:w-24 sm:h-32 flex items-center justify-center bg-cream rounded-lg">
        {svg}
      </div>
      <div>
        <h3 className="font-heading font-semibold text-base text-charcoal mb-1">
          {label}
        </h3>
        <p className="text-grey text-sm leading-[1.6] mb-2">{instruction}</p>
        <p className="text-charcoal/50 text-[12px] italic leading-[1.6]">
          {why}
        </p>
      </div>
    </div>
  );
}

// ─── SVG diagrams ─────────────────────────────────────────────
// Simple line drawings — schematic body silhouettes with a
// highlighted line showing where the measurement is taken.

const SVG_CLASS =
  "w-full h-full text-charcoal/70";
const HIGHLIGHT_CLASS = "text-amber-dark";

function HeightDiagram() {
  return (
    <svg
      viewBox="0 0 60 100"
      className={SVG_CLASS}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      {/* Body outline */}
      <circle cx="30" cy="12" r="6" />
      <path d="M30 18 V 30 M 20 30 H 40 V 60 H 35 V 90 M 25 90 V 60 M 20 30 V 50" />
      {/* Vertical measurement line on the left */}
      <line
        x1="6"
        y1="6"
        x2="6"
        y2="94"
        className={HIGHLIGHT_CLASS}
        stroke="currentColor"
        strokeWidth={1.5}
      />
      {/* Tick marks */}
      <line x1="3" y1="6" x2="9" y2="6" className={HIGHLIGHT_CLASS} stroke="currentColor" strokeWidth={1.5} />
      <line x1="3" y1="94" x2="9" y2="94" className={HIGHLIGHT_CLASS} stroke="currentColor" strokeWidth={1.5} />
      {/* Ground line */}
      <line x1="14" y1="94" x2="46" y2="94" strokeDasharray="2,2" />
    </svg>
  );
}

function BustDiagram() {
  return (
    <svg
      viewBox="0 0 60 100"
      className={SVG_CLASS}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      <circle cx="30" cy="12" r="6" />
      <path d="M30 18 V 30 M 20 30 H 40 V 60 H 35 V 90 M 25 90 V 60 M 20 30 V 50" />
      {/* Bust-line highlight */}
      <ellipse
        cx="30"
        cy="40"
        rx="14"
        ry="3"
        className={HIGHLIGHT_CLASS}
        stroke="currentColor"
        strokeWidth={1.5}
      />
    </svg>
  );
}

function HipDiagram() {
  return (
    <svg
      viewBox="0 0 60 100"
      className={SVG_CLASS}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      <circle cx="30" cy="12" r="6" />
      <path d="M30 18 V 30 M 20 30 H 40 V 60 H 35 V 90 M 25 90 V 60 M 20 30 V 50" />
      {/* Hip-line highlight */}
      <ellipse
        cx="30"
        cy="60"
        rx="13"
        ry="3"
        className={HIGHLIGHT_CLASS}
        stroke="currentColor"
        strokeWidth={1.5}
      />
    </svg>
  );
}

function SleeveDiagram() {
  return (
    <svg
      viewBox="0 0 60 100"
      className={SVG_CLASS}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      <circle cx="30" cy="12" r="6" />
      <path d="M30 18 V 30 M 20 30 H 40 V 60 H 35 V 90 M 25 90 V 60 M 20 30 V 50" />
      {/* Arm-line highlight: shoulder → bent elbow → wrist */}
      <path
        d="M 20 30 L 14 50 L 18 64"
        className={HIGHLIGHT_CLASS}
        stroke="currentColor"
        strokeWidth={2}
      />
      <circle cx="20" cy="30" r="1.5" className={HIGHLIGHT_CLASS} fill="currentColor" />
      <circle cx="18" cy="64" r="1.5" className={HIGHLIGHT_CLASS} fill="currentColor" />
    </svg>
  );
}
