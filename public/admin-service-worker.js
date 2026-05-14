/**
 * Deen Relief Admin — service worker.
 *
 * Scope: /admin/* + the admin API routes. Registered only by the
 * admin layout; the public site keeps its own (currently no) SW.
 *
 * Strategy:
 *   - Static assets (the Next.js _next/static bundle, the admin
 *     icons, the manifest): cache-first. These have content hashes
 *     in their URLs so re-deploys naturally invalidate.
 *   - HTML navigations (admin pages): network-first with a 3-second
 *     timeout, then fall back to cache, then fall back to the
 *     offline page. Means a fresh deploy is picked up instantly when
 *     online, but the trustee gets a useful page when the network is
 *     down or slow.
 *   - API routes (POST/PUT/DELETE/server actions): pass through.
 *     Never cache mutations — caching here would mean a
 *     successful-looking response that didn't actually hit the
 *     backend.
 *
 * Cache versioning: bump CACHE_VERSION when this file's logic
 * changes, otherwise old SWs keep serving cached HTML even after
 * the strategy is improved.
 */

const CACHE_VERSION = "v2"; // v2: added push + notificationclick handlers
const STATIC_CACHE = `dr-admin-static-${CACHE_VERSION}`;
const HTML_CACHE = `dr-admin-html-${CACHE_VERSION}`;
const OFFLINE_URL = "/admin/offline";

// Network-first timeout for HTML — long enough that a slow but
// working network gets the fresh version, short enough that a dead
// network falls back to cache promptly.
const HTML_NETWORK_TIMEOUT_MS = 3000;

self.addEventListener("install", (event) => {
  // Pre-cache only the offline page. Everything else gets cached on
  // first visit. This keeps install-time fast and avoids racing
  // against a slow first paint.
  event.waitUntil(
    caches
      .open(HTML_CACHE)
      .then((cache) => cache.add(OFFLINE_URL))
      .catch(() => {
        // Best-effort — if the offline page isn't reachable at
        // install time we'll fall back to the browser's default
        // offline screen later. Don't block install on it.
      })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Wipe old-version caches so a deploy with a bumped CACHE_VERSION
  // doesn't accumulate junk forever.
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (k) => !k.endsWith(`-${CACHE_VERSION}`) && k.startsWith("dr-admin-")
            )
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Same-origin only — we don't cache Stripe/Resend/anyone else.
  if (url.origin !== self.location.origin) return;

  // Only handle GET. Anything mutating (POST/PUT/DELETE/server-action)
  // must always go to the network — caching a mutation would mean a
  // response that looks successful but never actually touched the DB.
  if (request.method !== "GET") return;

  // API routes: pass through. Could cache safe GETs later if we
  // ever surface a "last-known data when offline" mode, but for now
  // we want the freshest admin data possible.
  if (url.pathname.startsWith("/api/")) return;

  // HTML navigations: network-first with timeout, cache fallback,
  // offline-page fallback.
  if (request.mode === "navigate") {
    event.respondWith(handleNavigate(request));
    return;
  }

  // Static assets: cache-first with background revalidation
  // (stale-while-revalidate).
  if (isStaticAsset(url.pathname)) {
    event.respondWith(handleStatic(request));
    return;
  }

  // Everything else: pass through.
});

async function handleNavigate(request) {
  const cache = await caches.open(HTML_CACHE);

  // Race network vs. a short timeout. Whichever wins, the other is
  // still in flight — we cache the network response if it eventually
  // arrives so the next visit benefits.
  try {
    const networkPromise = fetch(request);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), HTML_NETWORK_TIMEOUT_MS)
    );

    const response = await Promise.race([networkPromise, timeoutPromise]);

    // Only cache 2xx responses. 3xx redirects are fine to pass
    // through but caching them would pin the user to an old
    // redirect destination after a deploy.
    if (response.ok) {
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch {
    // Network failed or timed out — try the cache.
    const cached = await cache.match(request);
    if (cached) return cached;

    // Last resort — the precached offline page.
    const offline = await cache.match(OFFLINE_URL);
    if (offline) return offline;

    // Truly nothing usable. Let the browser's default offline UI
    // show.
    return Response.error();
  }
}

async function handleStatic(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);

  // Cache-first: return immediately if present, refresh in
  // background.
  if (cached) {
    fetch(request)
      .then((response) => {
        if (response.ok) cache.put(request, response.clone());
      })
      .catch(() => {});
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch {
    return Response.error();
  }
}

function isStaticAsset(pathname) {
  return (
    pathname.startsWith("/_next/static/") ||
    pathname.startsWith("/icons/") ||
    pathname === "/admin-manifest.webmanifest" ||
    /\.(png|jpe?g|webp|avif|svg|woff2?|ico|css|js)$/.test(pathname)
  );
}

// ─── Web Push ─────────────────────────────────────────────────
//
// Fires when the browser's push service (FCM on Android, APNs on
// iOS, autopush on Firefox, etc.) wakes us with an incoming push.
// The server side (src/lib/admin-push.ts) sends a JSON payload
// like:
//   {
//     title: "New bazaar order",
//     body:  "Sara K. ordered the Sylhet scarf · DR-BZR-A1B2C3D4",
//     url:   "/admin/bazaar/orders/<id>",
//     tag:   "bazaar_order_placed:<id>",     // optional dedup
//     severity: "info" | "warning" | "urgent"
//   }
//
// On iOS the user must have installed the PWA to Home Screen for
// this to surface as an OS notification. On Android Chrome it
// works in regular tabs after permission grant. The service
// worker code is identical either way.
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    // If decoding fails we still want SOMETHING to surface — a
    // silent failure is the worst outcome (user wonders why their
    // phone buzzed with nothing visible).
    payload = { title: "DR Admin", body: "New notification" };
  }

  const title = payload.title || "DR Admin";
  const body = payload.body || "";
  const url = payload.url || "/admin/donations";
  const tag = payload.tag;

  const options = {
    body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    // The vibration pattern is Android-only — iOS uses its own
    // haptic profile and ignores this. Light double-pulse for
    // non-urgent, longer pulse for urgent.
    vibrate:
      payload.severity === "urgent" ? [200, 100, 200] : [100, 50, 100],
    data: { url },
  };
  if (tag) options.tag = tag;

  event.waitUntil(self.registration.showNotification(title, options));
});

// User taps the notification → open the deep-linked URL. If
// there's an existing admin tab open, focus it and navigate it
// to the URL via postMessage (handled in the client); otherwise
// open a fresh window.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/admin/donations";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        // Prefer focusing an already-open admin tab if any exists.
        for (const client of clients) {
          const clientUrl = new URL(client.url);
          if (clientUrl.pathname.startsWith("/admin")) {
            client.postMessage({ type: "admin-push-navigate", url: targetUrl });
            return client.focus();
          }
        }
        // No admin tab open — launch one at the target URL.
        return self.clients.openWindow(targetUrl);
      })
  );
});
