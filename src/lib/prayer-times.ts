/**
 * Server-side prayer time fetching for SSR/ISR.
 *
 * Fetches today's prayer times from the Al-Adhan API and returns them
 * in a shape compatible with PrayerTimesUI's state. Used by the
 * [city]/page.tsx server component to embed times in the initial HTML
 * so Googlebot can index them without executing JavaScript.
 *
 * Revalidation: 3600s (1 hour). Prayer times change once per day,
 * so hourly freshness is more than enough.
 *
 * Graceful failure: returns null if the API is down. The client-side
 * fetch in PrayerTimesUI takes over seamlessly.
 */

export interface PrayerTimings {
  [key: string]: string;
}

export interface DateInfo {
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

export interface PrayerTimesData {
  timings: PrayerTimings;
  dateInfo: DateInfo;
}

export async function fetchPrayerTimes(
  city: string
): Promise<PrayerTimesData | null> {
  try {
    const res = await fetch(
      `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(city)}&country=UK&method=2`,
      { next: { revalidate: 3600 } }
    );

    if (!res.ok) return null;

    const data = await res.json();

    if (data.code !== 200 || !data.data?.timings || !data.data?.date) {
      return null;
    }

    return {
      timings: data.data.timings,
      dateInfo: data.data.date,
    };
  } catch {
    return null;
  }
}
