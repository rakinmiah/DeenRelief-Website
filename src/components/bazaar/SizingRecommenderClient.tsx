"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  feetInchesToCm,
  inchesToCm,
  recommendSize,
  type FitPreference,
  type GarmentType,
  type Recommendation,
} from "@/lib/bazaar-sizing";
import { BAZAAR_SUPPORT_EMAIL } from "@/lib/bazaar-config";

/**
 * Interactive size recommender for the /bazaar/sizing-guide page.
 *
 * Inputs are deliberately minimal — height + bust + a fit-pref
 * radio + a pregnancy checkbox. Hip is captured but currently
 * doesn't shift the recommendation (loose-cut garments don't
 * need it); it's there for future cuts that DO bite on hip.
 *
 * Unit toggle: cm by default (matches the metric-first UK
 * audience), with one click to switch to ft/in for height and
 * inches for chest. Internal calculation is always cm; we
 * convert at the form boundary so the recommendation algorithm
 * stays unit-agnostic.
 *
 * Result card: green for confident fits, amber for between-
 * sizes / nudged recommendations, charcoal for out-of-range
 * (with a custom-order email pathway). Each result lists the
 * factor-by-factor reasoning the algorithm used so the customer
 * sees WHY this size, not just WHICH size.
 */

type UnitSystem = "cm" | "imperial";

export default function SizingRecommenderClient({
  initialGarment = "abaya",
}: {
  initialGarment?: GarmentType;
}) {
  const [garment, setGarment] = useState<GarmentType>(initialGarment);
  const [units, setUnits] = useState<UnitSystem>("cm");

  // Stored as strings to allow empty / partial input. Parsed at
  // recommend time.
  const [heightCm, setHeightCm] = useState("");
  const [heightFt, setHeightFt] = useState("");
  const [heightIn, setHeightIn] = useState("");
  const [bustCm, setBustCm] = useState("");
  const [bustIn, setBustIn] = useState("");
  const [hipCm, setHipCm] = useState("");
  const [hipIn, setHipIn] = useState("");
  const [fitPreference, setFitPreference] = useState<FitPreference>("true");
  const [pregnantOrNursing, setPregnantOrNursing] = useState(false);

  const [recommendation, setRecommendation] = useState<Recommendation | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  // Convert the form inputs to cm for the algorithm. Returns null
  // when required fields are missing or unparseable.
  const parsedMeasurements = useMemo(() => {
    let height = NaN;
    let bust = NaN;
    let hip = NaN;
    if (units === "cm") {
      height = Number(heightCm);
      bust = Number(bustCm);
      hip = hipCm.trim() === "" ? NaN : Number(hipCm);
    } else {
      const ft = Number(heightFt);
      const inch = heightIn.trim() === "" ? 0 : Number(heightIn);
      if (Number.isFinite(ft) && Number.isFinite(inch)) {
        height = feetInchesToCm(ft, inch);
      }
      if (bustIn.trim() !== "") bust = inchesToCm(Number(bustIn));
      if (hipIn.trim() !== "") hip = inchesToCm(Number(hipIn));
    }
    return {
      heightCm: Number.isFinite(height) ? height : null,
      bustCm: Number.isFinite(bust) ? bust : null,
      hipCm: Number.isFinite(hip) ? hip : null,
    };
  }, [units, heightCm, heightFt, heightIn, bustCm, bustIn, hipCm, hipIn]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setRecommendation(null);

    const { heightCm: h, bustCm: b, hipCm: hp } = parsedMeasurements;
    if (h === null || b === null) {
      setError("Enter your height and bust measurement to see a recommendation.");
      return;
    }
    if (h < 100 || h > 230) {
      setError("Height looks off — please double-check.");
      return;
    }
    if (b < 50 || b > 180) {
      setError("Bust measurement looks off — please double-check.");
      return;
    }

    setRecommendation(
      recommendSize({
        garment,
        heightCm: h,
        bustCm: b,
        ...(hp !== null ? { hipCm: hp } : {}),
        fitPreference,
        pregnantOrNursing,
      })
    );
  }

  function handleReset() {
    setHeightCm("");
    setHeightFt("");
    setHeightIn("");
    setBustCm("");
    setBustIn("");
    setHipCm("");
    setHipIn("");
    setFitPreference("true");
    setPregnantOrNursing(false);
    setRecommendation(null);
    setError(null);
  }

  return (
    <div className="bg-white rounded-3xl border border-charcoal/10 shadow-sm overflow-hidden">
      {/* Header band — garment switcher + unit toggle */}
      <div className="px-6 sm:px-8 pt-6 pb-4 border-b border-charcoal/8 bg-cream/40">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex bg-white border border-charcoal/15 rounded-full p-0.5">
            {(["abaya", "thobe"] as GarmentType[]).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => {
                  setGarment(g);
                  setRecommendation(null);
                }}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold capitalize transition-colors ${
                  garment === g
                    ? "bg-charcoal text-white"
                    : "text-charcoal/70 hover:text-charcoal"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
          <div className="inline-flex bg-white border border-charcoal/15 rounded-full p-0.5">
            {(["cm", "imperial"] as UnitSystem[]).map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setUnits(u)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-[0.1em] transition-colors ${
                  units === u
                    ? "bg-charcoal text-white"
                    : "text-charcoal/70 hover:text-charcoal"
                }`}
              >
                {u === "cm" ? "cm" : "ft / in"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="px-6 sm:px-8 py-6 space-y-5">
        {/* Height */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-2">
            Your height <span className="text-red-700">*</span>
          </label>
          {units === "cm" ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                inputMode="numeric"
                min={100}
                max={230}
                step={1}
                required
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                placeholder="165"
                className={inputCx}
              />
              <span className="text-charcoal/60 text-sm">cm</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="number"
                inputMode="numeric"
                min={3}
                max={7}
                step={1}
                required
                value={heightFt}
                onChange={(e) => setHeightFt(e.target.value)}
                placeholder="5"
                className={`${inputCx} max-w-[80px]`}
              />
              <span className="text-charcoal/60 text-sm">ft</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={11}
                step={1}
                value={heightIn}
                onChange={(e) => setHeightIn(e.target.value)}
                placeholder="6"
                className={`${inputCx} max-w-[80px]`}
              />
              <span className="text-charcoal/60 text-sm">in</span>
            </div>
          )}
        </div>

        {/* Bust */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-2">
            Bust / chest measurement <span className="text-red-700">*</span>
          </label>
          {units === "cm" ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                inputMode="numeric"
                min={50}
                max={180}
                step={1}
                required
                value={bustCm}
                onChange={(e) => setBustCm(e.target.value)}
                placeholder="92"
                className={inputCx}
              />
              <span className="text-charcoal/60 text-sm">cm</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="number"
                inputMode="numeric"
                min={20}
                max={70}
                step={1}
                required
                value={bustIn}
                onChange={(e) => setBustIn(e.target.value)}
                placeholder="36"
                className={inputCx}
              />
              <span className="text-charcoal/60 text-sm">in</span>
            </div>
          )}
          <p className="mt-1.5 text-[12px] text-charcoal/50 leading-snug">
            The widest point across the bust, wearing a light layer. Keep
            the tape level and snug, not tight.
          </p>
        </div>

        {/* Hip (optional) */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-2">
            Hip measurement <span className="text-charcoal/40">(optional)</span>
          </label>
          {units === "cm" ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                inputMode="numeric"
                min={50}
                max={180}
                step={1}
                value={hipCm}
                onChange={(e) => setHipCm(e.target.value)}
                placeholder="—"
                className={inputCx}
              />
              <span className="text-charcoal/60 text-sm">cm</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="number"
                inputMode="numeric"
                min={20}
                max={70}
                step={1}
                value={hipIn}
                onChange={(e) => setHipIn(e.target.value)}
                placeholder="—"
                className={inputCx}
              />
              <span className="text-charcoal/60 text-sm">in</span>
            </div>
          )}
        </div>

        {/* Fit preference */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-2">
            Fit preference
          </label>
          <div className="grid sm:grid-cols-3 gap-2">
            {(
              [
                { value: "fitted", label: "Closer fit" },
                { value: "true", label: "True to size" },
                { value: "roomier", label: "Roomier" },
              ] as { value: FitPreference; label: string }[]
            ).map((opt) => (
              <label
                key={opt.value}
                className={`flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium border cursor-pointer transition-colors ${
                  fitPreference === opt.value
                    ? "bg-charcoal text-white border-charcoal"
                    : "bg-white text-charcoal border-charcoal/15 hover:border-charcoal/40"
                }`}
              >
                <input
                  type="radio"
                  name="fitPreference"
                  value={opt.value}
                  checked={fitPreference === opt.value}
                  onChange={() => setFitPreference(opt.value)}
                  className="sr-only"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        {/* Pregnancy */}
        <label className="flex items-start gap-3 text-sm text-charcoal cursor-pointer">
          <input
            type="checkbox"
            checked={pregnantOrNursing}
            onChange={(e) => setPregnantOrNursing(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-charcoal/30 text-green focus:ring-green"
          />
          <span className="leading-snug">
            I&apos;m currently pregnant or nursing.
            <span className="block text-[12px] text-charcoal/50">
              Adds one size of room across the bust and waist.
            </span>
          </span>
        </label>

        {error && (
          <p className="text-[13px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="submit"
            className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-charcoal text-white font-semibold hover:bg-charcoal/90 transition-colors shadow-sm"
          >
            Find my size
          </button>
          {(recommendation !== null || error !== null) && (
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center justify-center px-5 py-3 rounded-full bg-white border border-charcoal/15 text-charcoal text-sm font-medium hover:bg-cream transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      </form>

      {/* Result card */}
      {recommendation && (
        <RecommendationCard
          recommendation={recommendation}
          garment={garment}
        />
      )}
    </div>
  );
}

function RecommendationCard({
  recommendation,
  garment,
}: {
  recommendation: Recommendation;
  garment: GarmentType;
}) {
  const isOutOfRange = recommendation.status === "out-of-range";

  // Result card colour tracks the confidence level. Confident
  // green; between-sizes / nudged amber; out-of-range charcoal.
  let bandClass: string;
  let kickerClass: string;
  let kickerLabel: string;
  if (recommendation.status === "confident") {
    bandClass = "bg-green/10 border-t-2 border-green/40";
    kickerClass = "text-green-dark";
    kickerLabel = "Confident fit";
  } else if (isOutOfRange) {
    bandClass = "bg-charcoal/5 border-t-2 border-charcoal/15";
    kickerClass = "text-charcoal/70";
    kickerLabel = "Outside our standard sizes";
  } else {
    bandClass = "bg-amber-light/40 border-t-2 border-amber/40";
    kickerClass = "text-amber-dark";
    kickerLabel =
      recommendation.status === "between-sizes"
        ? "Between sizes"
        : recommendation.status === "size-up-recommended"
          ? "Sized up for fit preference"
          : "Sized down for fit preference";
  }

  return (
    <div
      className={`px-6 sm:px-8 py-6 ${bandClass}`}
      role="status"
      aria-live="polite"
    >
      <div className="mb-4">
        <span
          className={`block text-[11px] font-bold tracking-[0.15em] uppercase mb-2 ${kickerClass}`}
        >
          {kickerLabel}
        </span>
        {recommendation.recommendedSize ? (
          <div className="flex items-baseline gap-3 flex-wrap">
            <h3 className="font-heading font-bold text-3xl text-charcoal">
              {recommendation.recommendedSize}
            </h3>
            {recommendation.alternativeSize && (
              <span className="text-charcoal/60 text-sm">
                or {recommendation.alternativeSize}
              </span>
            )}
          </div>
        ) : (
          <h3 className="font-heading font-bold text-2xl text-charcoal">
            Let&apos;s do a custom order
          </h3>
        )}
      </div>

      <ul className="space-y-2 text-[14px] text-charcoal/80 leading-[1.7] mb-5">
        {recommendation.reasoning.map((line, i) => (
          <li key={i} className="flex gap-2">
            <span aria-hidden="true" className="text-charcoal/40 mt-1">
              •
            </span>
            <span>{line}</span>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-3">
        {recommendation.recommendedSize && (
          <Link
            href={`/bazaar?recommended_size=${encodeURIComponent(recommendation.recommendedSize)}`}
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-charcoal text-white font-semibold text-sm hover:bg-charcoal/90 transition-colors"
          >
            Shop {garment === "abaya" ? "abayas" : "thobes"}
          </Link>
        )}
        {recommendation.customOrderEligible && (
          <a
            href={`mailto:${BAZAAR_SUPPORT_EMAIL}?subject=Custom%20${garment}%20order%20enquiry`}
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-amber text-charcoal font-semibold text-sm hover:bg-amber-dark hover:text-white transition-colors"
          >
            Email us about a custom order
          </a>
        )}
      </div>
    </div>
  );
}

const inputCx =
  "block w-full px-3 py-2 rounded-lg border border-charcoal/15 bg-white text-charcoal text-base focus:outline-none focus:border-charcoal/50 max-w-[140px]";
