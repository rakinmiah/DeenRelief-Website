"use client";

import { useSyncExternalStore } from "react";

/**
 * Tiny pill at the top of the page that surfaces when the browser
 * reports it's lost network connection.
 *
 * Why: when a trustee marks an order shipped or sends an email and
 * the network has silently dropped (subway WiFi, dodgy hotspot, etc.)
 * the action fails. Without an indicator, the page just sits there
 * showing the optimistic state and the trustee has no idea why
 * nothing's saving. With the indicator, they at least know to retry
 * once back online.
 *
 * Uses useSyncExternalStore to subscribe to navigator.onLine via the
 * `online`/`offline` window events. This is the React-19-idiomatic
 * way to bind to browser APIs that fire events — gives us correct
 * hydration (snapshot returns true on the server, real value on the
 * client) and avoids the cascading-render lint warning that comes
 * with useEffect + setState patterns for the same use case.
 *
 * Caveat: navigator.onLine is unreliable on some browsers — it
 * reflects whether the OS thinks there's a connection, not whether
 * any specific server is reachable. But it's the best signal we've
 * got without polling, and false-negatives (says-online-but-isn't)
 * are rare enough in practice that this is still useful.
 *
 * Mounted once at the admin layout level. Renders nothing when
 * online — no DOM cost in the happy path beyond the listeners.
 */

function subscribe(callback: () => void): () => void {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getSnapshot(): boolean {
  return navigator.onLine;
}

function getServerSnapshot(): boolean {
  // SSR: assume online. Mismatch on first client paint only if user
  // was offline at load — they'll see the banner appear ~16ms later
  // which is acceptable.
  return true;
}

export default function OfflineIndicator() {
  const online = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-0 inset-x-0 z-50 flex items-center justify-center bg-amber-dark text-white text-[12px] font-medium py-1.5 px-4 shadow-sm"
      style={{ paddingTop: "calc(0.375rem + env(safe-area-inset-top))" }}
    >
      <span className="inline-flex items-center gap-1.5">
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.98 8.223A10.477 10.477 0 0 1 12 5c3.27 0 6.236 1.495 8.166 3.86M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-6a3 3 0 1 1 0-6 3 3 0 0 1 0 6Zm-6.366-4.5 12.732 12.732"
          />
        </svg>
        Offline — changes won&apos;t save until you&apos;re back online.
      </span>
    </div>
  );
}
