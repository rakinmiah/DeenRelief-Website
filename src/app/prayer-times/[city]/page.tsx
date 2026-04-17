import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import BreadcrumbSchema from "@/components/BreadcrumbSchema";
import PrayerTimesUI from "@/components/PrayerTimesUI";
import { getCityBySlug, cities } from "@/lib/cities";
import { fetchPrayerTimes } from "@/lib/prayer-times";

interface PageProps {
  params: Promise<{ city: string }>;
}

export async function generateStaticParams() {
  return cities.map((city) => ({ city: city.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { city: slug } = await params;
  const city = getCityBySlug(slug);
  if (!city) return {};

  const title = `Prayer Times ${city.name} Today — Fajr, Dhuhr, Asr, Maghrib, Isha | Deen Relief`;
  const description = `Accurate prayer times for ${city.name} today. Fajr, Dhuhr, Asr, Maghrib, and Isha salah times for ${city.name} and surrounding areas, updated daily. Free UK timetable.`;

  return {
    title,
    description,
    alternates: { canonical: `/prayer-times/${slug}` },
    robots: { index: true, follow: true, "max-snippet": -1 },
    other: { "article:modified_time": new Date().toISOString().split("T")[0] },
    openGraph: {
      title,
      description,
      images: [{ url: "/images/hero-gulucuk-evi.webp", alt: `Prayer Times ${city.name}` }],
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

/**
 * City-specific FAQ data. The questions are the same across cities but the
 * answers reference the city name — this makes each page's FAQ schema
 * unique in Google's eyes and captures long-tail queries like
 * "what time is fajr in london today".
 */
function buildFaqs(cityName: string) {
  return [
    {
      question: `What time is Fajr in ${cityName} today?`,
      answer: `Fajr time in ${cityName} changes daily based on the position of the sun. Use our free prayer timetable above for today's accurate Fajr time in ${cityName} and surrounding areas. Times are calculated using the ISNA method.`,
    },
    {
      question: `What calculation method is used for ${cityName} prayer times?`,
      answer: `Prayer times for ${cityName} are calculated using the Islamic Society of North America (ISNA) method, which is widely used in the UK. This method calculates Fajr at 15° below the horizon and Isha at 15° below the horizon.`,
    },
    {
      question: `Are Jummah prayer times shown for ${cityName}?`,
      answer: `Jummah (Friday prayer) replaces Dhuhr on Fridays. The Dhuhr time shown on our timetable indicates when Jummah begins in ${cityName}. Many mosques start the khutbah 30–60 minutes before the listed Dhuhr time — check with your local mosque.`,
    },
    {
      question: `How accurate are the prayer times for ${cityName}?`,
      answer: `Our prayer times for ${cityName} are sourced from the Al-Adhan API, one of the most widely used Islamic prayer time calculation services. Times are calculated based on ${cityName}'s exact geographical coordinates and are updated daily.`,
    },
    {
      question: "Can I use these times during Ramadan?",
      answer: `Yes. During Ramadan, Fajr time marks the start of the fast (Suhoor ends) and Maghrib time marks the end of the fast (Iftar). Our ${cityName} timetable updates daily to reflect the exact times throughout Ramadan.`,
    },
  ];
}

export default async function CityPrayerTimesPage({ params }: PageProps) {
  const { city: slug } = await params;
  const city = getCityBySlug(slug);
  if (!city) notFound();

  // Server-side fetch — embeds today's prayer times in the HTML for Googlebot
  const prayerData = await fetchPrayerTimes(city.name);

  const faqs = buildFaqs(city.name);

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Prayer Times", href: "/prayer-times" },
          { name: city.name, href: `/prayer-times/${city.slug}` },
        ]}
      />
      <JsonLd data={faqSchema} />
      <Header />

      <main id="main-content" className="flex-1">
        {/* ─── Hero ─── */}
        <section className="relative min-h-[35vh] md:min-h-[40vh] flex items-center mt-[60px] md:mt-[64px]">
          <div className="absolute inset-0 z-0">
            <Image
              src="/images/hero-gulucuk-evi.webp"
              alt={`Prayer times for ${city.name} - Deen Relief`}
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
                Prayer Times {city.name} Today
              </h1>
              <p className="text-[0.875rem] sm:text-[0.9375rem] text-white/60 leading-[1.7] max-w-[24rem]">
                Accurate Fajr, Dhuhr, Asr, Maghrib, and Isha salah times
                for {city.name} and surrounding areas, updated daily.
              </p>
            </div>
          </div>
        </section>

        {/* ─── Prayer Times UI (client component) ─── */}
        <PrayerTimesUI
          defaultCity={city.name}
          useGeolocation={false}
          currentCitySlug={city.slug}
          initialTimings={prayerData?.timings ?? null}
          initialDateInfo={prayerData?.dateInfo ?? null}
        />

        {/* ─── About Prayer Times in {City} — unique indexable content ─── */}
        <section className="py-12 md:py-16 bg-white">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl sm:text-3xl font-heading font-bold text-charcoal leading-tight mb-4">
              About Prayer Times in {city.name}
            </h2>
            <div className="text-grey text-base sm:text-[1.0625rem] leading-[1.7] space-y-4">
              <p>
                Muslims in {city.name} observe five daily prayers (salah):
                Fajr (pre-dawn), Dhuhr (midday), Asr (afternoon), Maghrib
                (sunset), and Isha (night). Each prayer has a specific
                window that changes daily based on the sun&apos;s position
                relative to {city.name}&apos;s geographical coordinates.
              </p>
              <p>
                During summer months, Fajr in {city.name} can be as early as
                2:30 AM and Isha as late as 11:00 PM, while in winter these
                times converge significantly. This variation is especially
                pronounced in the UK due to its northern latitude — making
                an accurate, daily-updated timetable essential.
              </p>
              <p>
                Our prayer times for {city.name} are calculated using the
                ISNA (Islamic Society of North America) method, one of the
                most widely used calculation methods in the UK. Times
                include Fajr, Sunrise, Dhuhr, Asr, Maghrib, and Isha, and
                are updated automatically every day.
              </p>
            </div>

            {/* ─── FAQ Section ─── */}
            <div className="mt-12">
              <h2 className="text-2xl sm:text-3xl font-heading font-bold text-charcoal leading-tight mb-6">
                {city.name} Prayer Times FAQ
              </h2>
              <div className="divide-y divide-charcoal/8">
                {faqs.map((faq, i) => (
                  <details key={i} className="group py-4">
                    <summary className="flex items-center justify-between cursor-pointer list-none font-heading font-semibold text-[1.0625rem] text-charcoal pr-4 hover:text-green transition-colors duration-200">
                      {faq.question}
                      <svg
                        className="w-5 h-5 flex-shrink-0 text-charcoal/30 transition-transform duration-200 group-open:rotate-180"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                      </svg>
                    </summary>
                    <p className="mt-3 text-grey text-base sm:text-[1.0625rem] leading-[1.7]">
                      {faq.answer}
                    </p>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
