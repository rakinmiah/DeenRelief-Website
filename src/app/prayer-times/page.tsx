"use client";

import { useState, useEffect, useCallback } from "react";
import Header from "@/components/Header";
import Button from "@/components/Button";
import Footer from "@/components/Footer";

/* ── UK cities ── */
const cities = [
  "Brighton",
  "London",
  "Birmingham",
  "Manchester",
  "Leeds",
  "Glasgow",
  "Edinburgh",
  "Cardiff",
  "Bristol",
  "Leicester",
];

/* ── Prayer names to display ── */
const prayerKeys = [
  { key: "Fajr", label: "Fajr" },
  { key: "Sunrise", label: "Sunrise" },
  { key: "Dhuhr", label: "Dhuhr" },
  { key: "Asr", label: "Asr" },
  { key: "Maghrib", label: "Maghrib" },
  { key: "Isha", label: "Isha" },
];

/* ── Types ── */
interface PrayerTimings {
  [key: string]: string;
}

interface DateInfo {
  hijri: {
    day: string;
    month: { en: string };
    year: string;
    weekday: { en: string };
  };
  gregorian: {
    day: string;
    month: { en: string };
    year: string;
    weekday: { en: string };
  };
}

export default function PrayerTimesPage() {
  const [selectedCity, setSelectedCity] = useState("Brighton");
  const [timings, setTimings] = useState<PrayerTimings | null>(null);
  const [dateInfo, setDateInfo] = useState<DateInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [currentPrayer, setCurrentPrayer] = useState("");
  const [nextPrayer, setNextPrayer] = useState("");

  /* ── Fetch prayer times ── */
  const fetchPrayerTimes = useCallback(async (city: string) => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(
        `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(city)}&country=UK&method=2`
      );
      const data = await res.json();
      if (data.code === 200) {
        setTimings(data.data.timings);
        setDateInfo(data.data.date);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrayerTimes(selectedCity);
  }, [selectedCity, fetchPrayerTimes]);

  /* ── Compute current/next prayer ── */
  useEffect(() => {
    if (!timings) return;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    let current = "";
    let next = "";

    for (let i = 0; i < prayerKeys.length; i++) {
      const timeStr = timings[prayerKeys[i].key];
      if (!timeStr) continue;
      const [h, m] = timeStr.split(":").map(Number);
      const prayerMinutes = h * 60 + m;

      if (currentMinutes >= prayerMinutes) {
        current = prayerKeys[i].key;
        next = i + 1 < prayerKeys.length ? prayerKeys[i + 1].key : prayerKeys[0].key;
      }
    }

    // If before Fajr, next prayer is Fajr
    if (!current) {
      current = "";
      next = "Fajr";
    }

    setCurrentPrayer(current);
    setNextPrayer(next);
  }, [timings]);

  /* ── Format time to 12h ── */
  const formatTime = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 || 12;
    return `${hour12}:${m.toString().padStart(2, "0")} ${period}`;
  };

  return (
    <>
      <Header />

      <main id="main-content" className="flex-1">
        {/* ─── Page Header ─── */}
        <section className="pt-32 md:pt-36 pb-8 bg-white">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <span className="inline-block text-[11px] font-bold tracking-[0.1em] uppercase text-green mb-3">
                Prayer Times
              </span>
              <h1 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal leading-tight mb-3">
                Muslim Prayer Times
              </h1>
              <p className="text-grey text-base sm:text-[1.0625rem] leading-[1.7] mb-8">
                Accurate prayer times for cities across the UK. Updated
                daily.
              </p>

              {/* City Selector */}
              <div className="max-w-xs mx-auto">
                <label
                  htmlFor="city-select"
                  className="block text-sm font-semibold text-charcoal mb-2"
                >
                  Select your city
                </label>
                <select
                  id="city-select"
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-grey-light bg-white text-charcoal font-medium focus:outline-none focus:border-green/40 transition-colors duration-200"
                >
                  {cities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Prayer Times Display ─── */}
        <section className="pb-16 md:pb-24 bg-white">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Loading State */}
            {loading && (
              <div className="text-center py-16">
                <div className="w-8 h-8 border-2 border-green/20 border-t-green rounded-full animate-spin mx-auto mb-4" />
                <p className="text-grey text-sm">
                  Loading prayer times for {selectedCity}...
                </p>
              </div>
            )}

            {/* Error State */}
            {error && !loading && (
              <div className="text-center py-16">
                <p className="text-charcoal text-base font-medium mb-4">
                  Unable to load prayer times.
                </p>
                <button
                  onClick={() => fetchPrayerTimes(selectedCity)}
                  className="px-6 py-2.5 rounded-full bg-green text-white text-sm font-semibold hover:bg-green-dark transition-colors duration-200"
                >
                  Try Again
                </button>
              </div>
            )}

            {/* Prayer Times */}
            {timings && !loading && !error && (
              <>
                {/* Date Display */}
                {dateInfo && (
                  <div className="text-center mb-8">
                    <p className="font-heading font-semibold text-lg text-charcoal">
                      {dateInfo.hijri.day} {dateInfo.hijri.month.en}{" "}
                      {dateInfo.hijri.year} AH
                    </p>
                    <p className="text-grey text-sm">
                      {dateInfo.gregorian.weekday.en},{" "}
                      {dateInfo.gregorian.day} {dateInfo.gregorian.month.en}{" "}
                      {dateInfo.gregorian.year}
                    </p>
                  </div>
                )}

                {/* Prayer Table */}
                <div className="border border-charcoal/8 rounded-2xl overflow-hidden">
                  {prayerKeys.map((prayer, i) => {
                    const time = timings[prayer.key];
                    const isCurrent = currentPrayer === prayer.key;
                    const isNext = nextPrayer === prayer.key;

                    return (
                      <div
                        key={prayer.key}
                        className={`flex items-center justify-between px-6 py-4 ${
                          i < prayerKeys.length - 1
                            ? "border-b border-charcoal/5"
                            : ""
                        } ${
                          isCurrent
                            ? "bg-green-light/60 border-l-4 border-l-green"
                            : isNext
                            ? "bg-amber-light/40 border-l-4 border-l-amber"
                            : i % 2 === 0
                            ? "bg-white"
                            : "bg-cream/50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`font-heading font-semibold text-[1.0625rem] ${
                              isCurrent
                                ? "text-green-dark"
                                : isNext
                                ? "text-amber-dark"
                                : "text-charcoal"
                            }`}
                          >
                            {prayer.label}
                          </span>
                          {isCurrent && (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-green bg-green/10 px-2 py-0.5 rounded-full">
                              Current
                            </span>
                          )}
                          {isNext && (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-dark bg-amber-light px-2 py-0.5 rounded-full">
                              Next
                            </span>
                          )}
                        </div>
                        <span
                          className={`font-heading font-bold text-xl ${
                            isCurrent
                              ? "text-green-dark"
                              : isNext
                              ? "text-amber-dark"
                              : "text-charcoal"
                          }`}
                        >
                          {time ? formatTime(time) : "--:--"}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Method note */}
                <p className="text-center text-charcoal/30 text-xs mt-4">
                  Times calculated using ISNA method for {selectedCity}, UK
                </p>
              </>
            )}
          </div>
        </section>

        {/* ─── Donate CTA ─── */}
        <section className="py-12 md:py-14 bg-cream">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-xl sm:text-2xl font-heading font-bold text-charcoal mb-2">
              While You&apos;re Here
            </h2>
            <p className="text-grey text-sm mb-6">
              Your Sadaqah can change a life today.
            </p>
            <Button variant="secondary" href="/sadaqah">
              Give Sadaqah
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
