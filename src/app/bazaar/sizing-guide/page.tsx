import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import SizingRecommenderClient from "@/components/bazaar/SizingRecommenderClient";
import HowToMeasure from "@/components/bazaar/HowToMeasure";
import SizeChartTable from "@/components/bazaar/SizeChartTable";
import BackToContactLink from "@/components/bazaar/BackToContactLink";
import BazaarFaqSection from "@/components/bazaar/BazaarFaqSection";
import BazaarPageOutro from "@/components/bazaar/BazaarPageOutro";
import {
  ABAYA_SIZE_CHART,
  THOBE_SIZE_CHART,
  type GarmentType,
} from "@/lib/bazaar-sizing";
import { BAZAAR_SIZING_FAQS } from "@/lib/bazaar-faqs";

export const metadata: Metadata = {
  title: "Find your size | Deen Relief Bazaar",
  description:
    "Find your abaya or thobe size in 60 seconds. Interactive size recommender, full measurement charts, and clear instructions on how to measure — sized for real bodies, not fashion-week standards.",
};

export const dynamic = "force-dynamic";

/**
 * /bazaar/sizing-guide — interactive sizing guide for the bazaar.
 *
 * Structure mirrors what other established Islamic clothing
 * stores (Inayah, Modanisa, Aab) put on their sizing pages —
 * hero, recommender, how-to-measure, full charts, FAQ, page outro.
 *
 * Deep-linkable via ?garment=abaya or ?garment=thobe so product
 * pages can drop the customer straight into the relevant chart.
 *
 * Background rotation matches the rest of the bazaar pages:
 *   Hero        → cream
 *   Recommender → white
 *   How to     → cream
 *   Charts     → white
 *   (FAQ)      → cream (from BazaarFaqSection)
 *   (Outro pivot)  → white
 *   (Trust ribbon) → green-dark
 */
export default async function SizingGuidePage({
  searchParams,
}: {
  searchParams: Promise<{ garment?: string }>;
}) {
  const params = await searchParams;
  const initialGarment: GarmentType =
    params.garment === "thobe" ? "thobe" : "abaya";

  return (
    <>
      {/* Thin white strip above the cream hero hosts the
          conditional "← Back to contact" link. Kept outside the
          centred hero so it doesn't fight the text alignment, and
          renders nothing for direct visitors (no ?from=contact). */}
      <div className="bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <Suspense fallback={null}>
            <BackToContactLink />
          </Suspense>
        </div>
      </div>

      {/* ─── Hero ─── */}
      <section className="bg-cream py-16 md:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-block text-[11px] font-bold tracking-[0.15em] uppercase text-amber-dark mb-4">
            Find your size
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-heading font-bold text-charcoal leading-[1.15] tracking-[-0.02em] mb-5">
            Sized for real bodies, not fashion-week standards.
          </h1>
          <p className="text-grey text-base sm:text-lg leading-[1.7] max-w-2xl mx-auto">
            Our cuts are designed in the workshops we work with directly,
            for the people who actually wear them. Enter your measurements
            below and we&apos;ll match you to the size that fits — with
            the reasoning behind it.
          </p>
        </div>
      </section>

      {/* ─── Recommender ─── */}
      <section className="bg-white py-12 md:py-16">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6 text-center">
            <span className="block text-[11px] font-bold tracking-[0.15em] uppercase text-amber-dark mb-2">
              60-second tool
            </span>
            <h2 className="text-charcoal font-heading font-bold text-2xl sm:text-3xl leading-tight">
              Get a size recommendation
            </h2>
          </div>
          <SizingRecommenderClient initialGarment={initialGarment} />
        </div>
      </section>

      {/* ─── How to measure ─── */}
      <section className="bg-cream py-12 md:py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <span className="block text-[11px] font-bold tracking-[0.15em] uppercase text-amber-dark mb-2">
              Step by step
            </span>
            <h2 className="text-charcoal font-heading font-bold text-2xl sm:text-3xl leading-tight">
              How to measure
            </h2>
            <p className="text-grey text-base mt-3 max-w-xl mx-auto leading-[1.7]">
              Grab a soft tape measure. If you don&apos;t have one, a piece
              of string + ruler works fine — measure the string after.
            </p>
          </div>
          <HowToMeasure />
        </div>
      </section>

      {/* ─── Size charts ─── */}
      <section className="bg-white py-12 md:py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <span className="block text-[11px] font-bold tracking-[0.15em] uppercase text-amber-dark mb-2">
              Full charts
            </span>
            <h2 className="text-charcoal font-heading font-bold text-2xl sm:text-3xl leading-tight">
              Every measurement, every size
            </h2>
            <p className="text-grey text-base mt-3 max-w-xl mx-auto leading-[1.7]">
              Compare your measurements directly, or match against an
              abaya / thobe you already own.
            </p>
          </div>
          <div className="space-y-6">
            <SizeChartTable rows={ABAYA_SIZE_CHART} garmentLabel="Abaya" />
            <SizeChartTable rows={THOBE_SIZE_CHART} garmentLabel="Thobe" />
          </div>
          <p className="mt-6 text-center text-[13px] text-charcoal/55">
            Hijabs are one-size square scarves (~90 × 90 cm) so no fitting
            chart needed. For prayer mats, tasbihs and other accessories,
            the product page has the full dimensions.
          </p>
          <div className="mt-8 text-center">
            <Link
              href="/bazaar"
              className="inline-flex items-center justify-center gap-2 text-charcoal font-semibold hover:text-green transition-colors"
            >
              Browse the collection
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      <BazaarFaqSection
        faqs={BAZAAR_SIZING_FAQS}
        page="sizing"
        heading="Sizing questions"
      />
      <BazaarPageOutro />
    </>
  );
}
