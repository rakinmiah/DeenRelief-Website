"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Button from "./Button";
import { cityNames } from "@/lib/cities";
import { priorityCities } from "@/lib/cities";

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

interface PrayerTimesUIProps {
  defaultCity: string;
  /** If true, attempts geolocation on mount. If false, fetches the default city directly. */
  useGeolocation?: boolean;
  /** Current city slug for linking (hides link to self in popular cities) */
  currentCitySlug?: string;
}

export default function PrayerTimesUI({
  defaultCity,
  useGeolocation = true,
  currentCitySlug,
}: PrayerTimesUIProps) {
  const [selectedCity, setSelectedCity] = useState(defaultCity);
  const [timings, setTimings] = useState<PrayerTimings | null>(null);
  const [dateInfo, setDateInfo] = useState<DateInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [currentPrayer, setCurrentPrayer] = useState("");
  const [nextPrayer, setNextPrayer] = useState("");
  const [usingLocation, setUsingLocation] = useState(false);
  const [locationName, setLocationName] = useState("");
  const [geoAttempted, setGeoAttempted] = useState(false);

  /* ── Fetch by city ── */
  const fetchByCity = useCallback(async (city: string) => {
    setLoading(true);
    setError(false);
    setUsingLocation(false);
    setLocationName("");
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

  /* ── Fetch by coordinates ── */
  const fetchByCoords = useCallback(async (lat: number, lng: number) => {
    setLoading(true);
    setError(false);
    setUsingLocation(true);
    try {
      const res = await fetch(
        `https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lng}&method=2`
      );
      const data = await res.json();
      if (data.code === 200) {
        setTimings(data.data.timings);
        setDateInfo(data.data.date);
        try {
          const geoRes = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
          );
          const geoData = await geoRes.json();
          setLocationName(
            geoData.city || geoData.locality || geoData.principalSubdivision || "Your Location"
          );
        } catch {
          setLocationName("Your Location");
        }
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  /* ── Request geolocation ── */
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      fetchByCity(selectedCity);
      setGeoAttempted(true);
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeoAttempted(true);
        fetchByCoords(position.coords.latitude, position.coords.longitude);
      },
      () => {
        setGeoAttempted(true);
        fetchByCity(selectedCity);
      },
      { timeout: 8000 }
    );
  }, [fetchByCity, fetchByCoords, selectedCity]);

  useEffect(() => {
    if (useGeolocation) {
      requestLocation();
    } else {
      fetchByCity(defaultCity);
      setGeoAttempted(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCityChange = (city: string) => {
    setSelectedCity(city);
    fetchByCity(city);
  };

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
    if (!current) { current = ""; next = "Fajr"; }
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

  const displayLocation = usingLocation
    ? locationName || "Your Location"
    : selectedCity;

  const nextPrayerTime = timings && nextPrayer ? timings[nextPrayer] : null;
  const nextPrayerLabel = prayerKeys.find((p) => p.key === nextPrayer)?.label;

  return (
    <>
      {/* ─── Next Prayer Summary + Location ─── */}
      <section className="py-10 md:py-12 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          {timings && !loading && !error && nextPrayerTime && (
            <div className="bg-green-dark rounded-2xl p-6 sm:p-8 text-center mb-8">
              <p className="text-white/50 text-xs font-bold uppercase tracking-wider mb-2">
                Next Prayer
              </p>
              <p className="text-white font-heading font-bold text-4xl sm:text-5xl mb-1">
                {formatTime(nextPrayerTime)}
              </p>
              <p className="text-white/70 font-heading font-semibold text-lg">
                {nextPrayerLabel}
              </p>
              {dateInfo && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <p className="text-white/50 text-sm">
                    {dateInfo.hijri.day} {dateInfo.hijri.month.en}{" "}
                    {dateInfo.hijri.year} AH
                  </p>
                  <p className="text-white/35 text-xs">
                    {dateInfo.gregorian.weekday.en},{" "}
                    {dateInfo.gregorian.day} {dateInfo.gregorian.month.en}{" "}
                    {dateInfo.gregorian.year}
                  </p>
                </div>
              )}
            </div>
          )}

          {usingLocation && locationName && (
            <div className="flex items-center justify-center gap-2 mb-6 text-sm text-green font-medium">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
              </svg>
              Showing times for {locationName}
            </div>
          )}

          <div className="max-w-sm mx-auto">
            {geoAttempted && !usingLocation && useGeolocation && (
              <button
                onClick={requestLocation}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 mb-4 rounded-xl border-2 border-green/20 text-green text-sm font-medium hover:bg-green-light/30 transition-colors duration-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                </svg>
                Use my location
              </button>
            )}

            <label
              htmlFor="city-select"
              className="block text-sm font-semibold text-charcoal mb-2 text-center"
            >
              {usingLocation ? "Or select a city" : "Select your city"}
            </label>
            <select
              id="city-select"
              value={usingLocation ? "" : selectedCity}
              onChange={(e) => handleCityChange(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-grey-light bg-white text-charcoal font-medium text-center focus:outline-none focus:border-green/40 transition-colors duration-200"
            >
              {usingLocation && (
                <option value="" disabled>
                  — Using your location —
                </option>
              )}
              {cityNames.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* ─── Prayer Times Table ─── */}
      <section className="pb-16 md:pb-24 bg-white">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading && (
            <div className="text-center py-16">
              <div className="w-8 h-8 border-2 border-green/20 border-t-green rounded-full animate-spin mx-auto mb-4" />
              <p className="text-grey text-sm">Loading prayer times...</p>
            </div>
          )}

          {error && !loading && (
            <div className="text-center py-16">
              <p className="text-charcoal text-base font-medium mb-4">
                Unable to load prayer times.
              </p>
              <button
                onClick={() =>
                  usingLocation ? requestLocation() : fetchByCity(selectedCity)
                }
                className="px-6 py-2.5 rounded-full bg-green text-white text-sm font-semibold hover:bg-green-dark transition-colors duration-200"
              >
                Try Again
              </button>
            </div>
          )}

          {timings && !loading && !error && (
            <>
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

              <p className="text-center text-charcoal/30 text-xs mt-4">
                Times calculated using ISNA method for {displayLocation}
              </p>

              <p className="text-center text-grey/50 text-xs mt-6">
                While you&apos;re here —{" "}
                <a
                  href="/palestine"
                  className="text-green/60 hover:text-green transition-colors duration-200"
                >
                  a family in Gaza needs your help
                </a>
              </p>
            </>
          )}
        </div>
      </section>

      {/* ─── Popular Cities ─── */}
      <section className="py-6 md:py-8 bg-cream">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-[11px] font-bold tracking-[0.1em] uppercase text-green mb-3">
            Prayer Times by City
          </p>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mb-3">
            {priorityCities.map((city) =>
              city.slug === currentCitySlug ? (
                <span
                  key={city.slug}
                  className="text-sm text-charcoal font-semibold"
                >
                  {city.name}
                </span>
              ) : (
                <Link
                  key={city.slug}
                  href={`/prayer-times/${city.slug}`}
                  className="text-sm text-grey hover:text-green transition-colors duration-200"
                >
                  {city.name}
                </Link>
              )
            )}
          </div>
          {currentCitySlug && (
            <Link
              href="/prayer-times"
              className="text-sm text-green font-medium hover:text-green-dark transition-colors duration-200"
            >
              View all UK cities &rarr;
            </Link>
          )}
        </div>
      </section>

      {/* ─── Donate CTA ─── */}
      <section className="py-14 md:py-16 bg-white">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-block text-[11px] font-bold tracking-[0.1em] uppercase text-green mb-3">
            Support Our Islamic Charity
          </span>
          <h2 className="text-xl sm:text-2xl font-heading font-bold text-charcoal mb-3">
            Give Sadaqah While You&apos;re Here
          </h2>
          <p className="text-grey text-sm leading-relaxed mb-6 max-w-md mx-auto">
            3,200+ families supported since 2013. From emergency relief in
            Gaza to orphan care in Bangladesh — every donation reaches
            those who need it most.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button variant="primary" href="/sadaqah">
              Give Sadaqah
            </Button>
            <Button variant="secondary" href="/zakat">
              Pay Zakat
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
