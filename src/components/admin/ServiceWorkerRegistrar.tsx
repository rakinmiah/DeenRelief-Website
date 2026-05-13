"use client";

import { useEffect } from "react";

/**
 * Mount-once registrar for the admin service worker.
 *
 * Lives under the admin layout so the SW is only registered on
 * /admin/* visits — public site visitors don't get a SW pinned to
 * their tab, which would have to be unregistered later if we ever
 * want to swap caching strategies for the donate flow.
 *
 * Scope: /admin (the SW file itself can claim a broader scope, but
 * we narrow it via the registration `scope` option). All admin
 * routes go through this SW; nothing else does.
 *
 * Update flow: when a new SW is detected (a deploy with a bumped
 * CACHE_VERSION inside /public/admin-service-worker.js), the browser
 * installs it in the background. We don't force-reload — the next
 * navigation picks up the new one automatically, since the SW
 * activates `self.clients.claim()`.
 */
export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    // Don't register on localhost during development unless we
    // explicitly want to test offline behaviour. The dev server
    // doesn't serve stable URLs (assets get HMR-rewritten every
    // change) and a SW caching those URLs would produce stale UI
    // during iteration.
    const isLocalhost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";
    if (isLocalhost && process.env.NEXT_PUBLIC_ENABLE_DEV_SW !== "1") {
      return;
    }

    // Register asynchronously after the page has settled. Without
    // the load wait, a slow SW install can compete with the initial
    // paint on a low-end Android.
    const handle = () => {
      navigator.serviceWorker
        .register("/admin-service-worker.js", { scope: "/admin" })
        .catch((err) => {
          // Don't surface — SW failure shouldn't break the page.
          // Logged for trustees who view the console.
          console.warn("[admin-sw] registration failed:", err);
        });
    };

    if (document.readyState === "complete") {
      handle();
    } else {
      window.addEventListener("load", handle, { once: true });
      return () => window.removeEventListener("load", handle);
    }
  }, []);

  return null;
}
