import Image from "next/image";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BreadcrumbSchema from "@/components/BreadcrumbSchema";
import PrayerTimesUI from "@/components/PrayerTimesUI";
import { fetchPrayerTimes } from "@/lib/prayer-times";

export default async function PrayerTimesPage() {
  // Server-render Brighton's times as default (client overrides with geolocation)
  const prayerData = await fetchPrayerTimes("Brighton");

  return (
    <>
      <BreadcrumbSchema items={[{ name: "Prayer Times", href: "/prayer-times" }]} />
      <Header />

      <main id="main-content" className="flex-1">
        {/* ─── Hero ─── */}
        <section className="relative min-h-[35vh] md:min-h-[40vh] flex items-center mt-[60px] md:mt-[64px]">
          <div className="absolute inset-0 z-0">
            <Image
              src="/images/hero-gulucuk-evi.webp"
              alt="Deen Relief community"
              fill
              className="object-cover object-[center_45%]"
              priority
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to right, rgba(26,26,46,0.93) 0%, rgba(26,26,46,0.88) 35%, rgba(26,26,46,0.62) 52%, rgba(26,26,46,0.20) 75%, rgba(26,26,46,0.06) 100%)",
              }}
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to top, rgba(26,26,46,0.45) 0%, transparent 45%)",
              }}
            />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-10 md:py-14">
            <div className="max-w-[22rem] sm:max-w-[26rem] md:max-w-[28rem]">
              <span className="inline-block text-[11px] font-bold tracking-[0.1em] uppercase text-white/50 mb-3">
                Islamic Prayer Times UK
              </span>
              <h1 className="text-[1.75rem] sm:text-[2.25rem] lg:text-[2.5rem] leading-[1.18] sm:leading-[1.14] lg:leading-[1.12] text-white font-heading font-bold mb-3 tracking-[-0.02em]">
                Prayer Times UK — Accurate Salah Times Today
              </h1>
              <p className="text-[0.875rem] sm:text-[0.9375rem] text-white/60 leading-[1.7] max-w-[24rem]">
                Accurate Muslim prayer times for 96+ UK cities including
                London, Birmingham, Manchester, and Brighton. Fajr, Dhuhr,
                Asr, Maghrib, and Isha times updated daily.
              </p>
            </div>
          </div>
        </section>

        {/* ─── Prayer Times UI (client — geolocation enabled on hub) ─── */}
        <PrayerTimesUI
          defaultCity="Brighton"
          useGeolocation={true}
          initialTimings={prayerData?.timings ?? null}
          initialDateInfo={prayerData?.dateInfo ?? null}
        />

      </main>

      <Footer />
    </>
  );
}
