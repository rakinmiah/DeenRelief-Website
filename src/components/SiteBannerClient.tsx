"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import type { BannerConfig } from "@/lib/site-config";

/**
 * Client wrapper for the site-wide banner. Owns three pieces of
 * behaviour the server component can't:
 *
 *   1. Hide on /admin/* paths so trustees aren't subjected to their
 *      own banner copy while they're working in the admin.
 *   2. 24h dismiss memory via localStorage so a donor who closes the
 *      banner doesn't see it again on every page until tomorrow.
 *      Implemented via useSyncExternalStore — SSR-safe (no hydration
 *      mismatch), no setState-in-effect.
 *   3. Per-session dismissal via the X button.
 *
 * The dismiss key includes a short hash of the message text so the
 * same banner text stays dismissed but a NEW message resets the
 * dismiss window (the SMM publishing a new urgent appeal should
 * reach donors who dismissed the old one).
 */
export default function SiteBannerClient({ config }: { config: BannerConfig }) {
  const pathname = usePathname();
  const dismissKey = `dr.banner.dismissed.${djb2(config.message)}`;

  // Persistent dismissal (24h via localStorage). useSyncExternalStore
  // returns false during SSR + first paint, then the actual value
  // post-hydration — React handles the swap without warning.
  const dismissedInStorage = useSyncExternalStore(
    subscribeNoop,
    () => readDismissal(dismissKey, config.dismissible),
    () => false
  );
  // Session-scoped dismissal from the X button this render.
  const [dismissedThisSession, setDismissedThisSession] = useState(false);

  const isAdminPath = pathname?.startsWith("/admin") ?? false;
  if (isAdminPath || dismissedInStorage || dismissedThisSession) return null;

  function handleDismiss() {
    setDismissedThisSession(true);
    if (!config.dismissible) return;
    try {
      window.localStorage.setItem(dismissKey, String(Date.now()));
    } catch {
      // localStorage unavailable (private mode etc.) — fine, the
      // session-scoped state still hides it for this page load.
    }
  }

  const isUrgent = config.theme === "urgent";

  return (
    <div
      role="region"
      aria-label="Site announcement"
      className={`w-full ${
        isUrgent ? "bg-red-700 text-white" : "bg-charcoal text-white"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center gap-3">
        {isUrgent && (
          <span
            className="shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/20"
            aria-hidden="true"
          >
            <svg
              className="w-3 h-3"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={3}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
              />
            </svg>
          </span>
        )}
        <p className="flex-1 text-[13px] sm:text-sm leading-snug">
          {config.message}
          {config.link && (
            <Link
              href={config.link.href}
              className="ml-2 inline-flex items-center gap-1 font-semibold underline underline-offset-4 hover:no-underline"
            >
              {config.link.label}
              <span aria-hidden="true">→</span>
            </Link>
          )}
        </p>
        {config.dismissible && (
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss"
            className="shrink-0 w-7 h-7 -mr-1 inline-flex items-center justify-center rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18 18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * No-op subscriber for useSyncExternalStore. We don't listen for
 * localStorage changes from other tabs — a donor dismissing in tab A
 * doesn't need to instantly update tab B. The next page render in
 * tab B will pick up the dismissal naturally.
 */
function subscribeNoop(): () => void {
  return () => {};
}

function readDismissal(key: string, dismissible: boolean): boolean {
  if (!dismissible) return false;
  if (typeof window === "undefined") return false;
  try {
    const ts = Number(window.localStorage.getItem(key));
    return Number.isFinite(ts) && Date.now() - ts < 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

/** Tiny non-cryptographic hash for the dismiss key. djb2 in 32 bits. */
function djb2(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash) ^ input.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}
