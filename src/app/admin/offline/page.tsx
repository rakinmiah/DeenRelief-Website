import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Offline | Deen Relief Admin",
  robots: { index: false, follow: false },
};

/**
 * The page the service worker falls back to when (a) the network is
 * unreachable AND (b) the requested admin page isn't in the cache.
 *
 * Pre-cached by the SW at install time so it loads instantly. Kept
 * intentionally minimal — no imports beyond what Next core provides
 * so it works even if the JS chunk fails to load.
 *
 * The visible cue here mirrors the OfflineIndicator banner that
 * appears on EVERY admin page when offline, so the trustee gets
 * consistent messaging whether they hit a cached page or this
 * fallback.
 */
export default function AdminOfflinePage() {
  return (
    <main className="min-h-[60vh] flex items-center justify-center px-6 py-12">
      <div className="max-w-md text-center">
        <div className="w-14 h-14 rounded-full bg-amber-light flex items-center justify-center mx-auto mb-5">
          <svg
            className="w-7 h-7 text-amber-dark"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.348 14.652a3.75 3.75 0 0 1 0-5.304m5.304 0a3.75 3.75 0 0 1 0 5.304m-7.425 2.122a6.75 6.75 0 0 1 0-9.546m9.546 0a6.75 6.75 0 0 1 0 9.546M5.106 18.894c-3.808-3.808-3.808-9.98 0-13.789m13.788 0c3.808 3.808 3.808 9.98 0 13.788M3 12h.008v.008H3V12Zm0 0c0 .414.336.75.75.75v0M21 12h-.008v-.008H21V12Zm0 0c0 .414-.336.75-.75.75v0M12 21v-.008m0 0v-.008M3 3l18 18"
            />
          </svg>
        </div>
        <h1 className="text-charcoal font-heading font-bold text-xl sm:text-2xl mb-2">
          You&apos;re offline
        </h1>
        <p className="text-charcoal/70 text-sm leading-relaxed mb-6">
          The admin needs an internet connection to load new pages,
          save changes, and send emails. Reconnect and the app will
          pick up where you left off.
        </p>
        <Link
          href="/admin/donations"
          className="inline-block px-5 py-2.5 rounded-full bg-charcoal text-white text-sm font-semibold hover:bg-charcoal/90 transition-colors"
        >
          Try again
        </Link>
      </div>
    </main>
  );
}
