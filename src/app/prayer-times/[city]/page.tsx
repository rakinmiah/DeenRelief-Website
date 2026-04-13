import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PrayerTimesUI from "@/components/PrayerTimesUI";
import { getCityBySlug, priorityCities } from "@/lib/cities";

interface PageProps {
  params: Promise<{ city: string }>;
}

export async function generateStaticParams() {
  return priorityCities.map((city) => ({ city: city.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { city: slug } = await params;
  const city = getCityBySlug(slug);
  if (!city) return {};

  const title = `Prayer Times ${city.name} Today | Deen Relief`;
  const description = `Accurate prayer times for ${city.name} today. Fajr, Dhuhr, Asr, Maghrib, and Isha salah times updated daily. Free timetable.`;

  return {
    title,
    description,
    alternates: { canonical: `/prayer-times/${slug}` },
    openGraph: {
      title,
      description,
      images: [{ url: "/images/hero-gulucuk-evi.webp", alt: "Deen Relief" }],
    },
    twitter: {
      card: "summary_large_image",
      site: "@deenrelief",
      title,
      description,
      images: ["/images/hero-gulucuk-evi.webp"],
    },
  };
}

export default async function CityPrayerTimesPage({ params }: PageProps) {
  const { city: slug } = await params;
  const city = getCityBySlug(slug);
  if (!city) notFound();

  return (
    <>
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
                Prayer Times {city.name}
              </span>
              <h1 className="text-[1.75rem] sm:text-[2.25rem] lg:text-[2.5rem] leading-[1.18] sm:leading-[1.14] lg:leading-[1.12] text-white font-heading font-bold mb-3 tracking-[-0.02em]">
                Prayer Times {city.name} Today
              </h1>
              <p className="text-[0.875rem] sm:text-[0.9375rem] text-white/60 leading-[1.7] max-w-[24rem]">
                Accurate salah times for {city.name} and surrounding areas.
                Fajr, Dhuhr, Asr, Maghrib, and Isha times updated daily.
              </p>
            </div>
          </div>
        </section>

        <PrayerTimesUI
          defaultCity={city.name}
          useGeolocation={false}
          currentCitySlug={city.slug}
        />
      </main>

      <Footer />
    </>
  );
}
