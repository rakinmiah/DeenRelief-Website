"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

/**
 * "Enable notifications" toggle for the DR Admin PWA.
 *
 * Renders a small inline button in the admin chrome that walks the
 * user through:
 *   1. Permission request — Notification.requestPermission()
 *   2. Push subscription  — pushManager.subscribe({ applicationServerKey: VAPID_PUBLIC_KEY })
 *   3. Server save        — POST /api/admin/push/subscribe with the JSON
 *
 * Visibility rules:
 *   - Hidden entirely if the browser doesn't support push (no PushManager
 *     on serviceWorker registration)
 *   - Hidden entirely on iOS Safari that isn't running in standalone
 *     mode (Apple's policy: iOS only delivers push to home-screen-
 *     installed PWAs, so prompting in a regular Safari tab would set
 *     the user up for confusion when nothing buzzes)
 *   - Renders "Enable notifications" when permission is "default"
 *   - Renders "Notifications on" (greyed, with a small ✓) when active
 *   - Renders "Blocked in browser" copy when permission is "denied" so
 *     the user knows they need to fix it in OS settings
 *
 * iOS-specific note: the user MUST tap an explicit button. Auto-firing
 * requestPermission() from a useEffect on mount gets rejected on iOS
 * because it isn't user-gesture initiated. The button click is the
 * gesture.
 *
 * The component subscribes ONCE per device. Re-mounting (page nav)
 * reads localStorage for the cached "already subscribed" flag and
 * skips the request flow.
 */

const SUBSCRIBED_FLAG = "dr-admin-push-subscribed";

// ─── Permission state via useSyncExternalStore ───────────────────
//
// Notification.permission is a property that changes via the OS
// (user grants/revokes from system settings) and there's no event
// for it. We poll via useSyncExternalStore + a focus-based
// invalidation so the UI re-renders when the user returns to the
// tab after toggling permission in another app.

function subscribePermission(callback: () => void): () => void {
  // Best-effort: refresh permission state on tab focus + visibility
  // change. Polling outright would be wasteful.
  window.addEventListener("focus", callback);
  document.addEventListener("visibilitychange", callback);
  return () => {
    window.removeEventListener("focus", callback);
    document.removeEventListener("visibilitychange", callback);
  };
}

function getPermissionSnapshot(): NotificationPermission {
  if (typeof window === "undefined") return "default";
  if (typeof Notification === "undefined") return "default";
  return Notification.permission;
}

function getPermissionServerSnapshot(): NotificationPermission {
  return "default";
}

// ─── Helper: VAPID base64 → Uint8Array (browser idiom) ───────────

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  // Allocate a concrete ArrayBuffer (not SharedArrayBuffer) so the
  // Uint8Array's underlying buffer is typed as ArrayBuffer — which
  // pushManager.subscribe's applicationServerKey parameter requires.
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function AdminPushPrompt() {
  const router = useRouter();
  const permission = useSyncExternalStore(
    subscribePermission,
    getPermissionSnapshot,
    getPermissionServerSnapshot
  );
  const [supported, setSupported] = useState<boolean | null>(null);
  const [iosBlockedNoStandalone, setIosBlockedNoStandalone] =
    useState<boolean>(false);
  const [subscribed, setSubscribed] = useState<boolean>(false);
  const [busy, setBusy] = useState<boolean>(false);

  // Mount-only feature detection. Wrapped in useEffect so it runs
  // client-only and doesn't trip hydration.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hasSW = "serviceWorker" in navigator;
    const hasPush = "PushManager" in window;
    const hasNotif = "Notification" in window;
    setSupported(hasSW && hasPush && hasNotif);

    // iOS: require standalone install. Detect via the (legacy)
    // navigator.standalone property AND/OR the matchMedia
    // standalone display-mode. Both indicate the page is running
    // from a home-screen-installed PWA shell.
    const ua = navigator.userAgent;
    const isIOS =
      /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    if (isIOS) {
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        // @ts-expect-error iOS-only property
        Boolean(window.navigator.standalone);
      setIosBlockedNoStandalone(!standalone);
    }

    // Cached subscription flag — if we already subscribed on this
    // device, skip the prompt UI.
    try {
      setSubscribed(localStorage.getItem(SUBSCRIBED_FLAG) === "1");
    } catch {
      // localStorage unavailable (private browsing on Safari) — we
      // re-derive on demand via the service worker registration.
    }

    // Re-listen for service worker messages so a notificationclick
    // that focused this tab can route the user to the deep-link
    // URL.
    function onSwMessage(event: MessageEvent) {
      const data = event.data as { type?: string; url?: string } | undefined;
      if (data?.type === "admin-push-navigate" && data.url) {
        router.push(data.url);
      }
    }
    navigator.serviceWorker?.addEventListener("message", onSwMessage);
    return () => {
      navigator.serviceWorker?.removeEventListener("message", onSwMessage);
    };
  }, [router]);

  async function handleEnable() {
    setBusy(true);
    try {
      const result = await Notification.requestPermission();
      if (result !== "granted") {
        setBusy(false);
        return;
      }

      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) {
        alert(
          "Push notifications aren't configured yet (missing VAPID public key). Ask the admin to set NEXT_PUBLIC_VAPID_PUBLIC_KEY on the server."
        );
        setBusy(false);
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      // Re-subscribe even if a subscription already exists — the
      // server upserts on endpoint so this is idempotent, and it
      // catches the edge case of a subscription that exists in the
      // browser but somehow never made it to our DB.
      const existing = await reg.pushManager.getSubscription();
      const subscription =
        existing ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        }));

      const subJson = subscription.toJSON();
      const res = await fetch("/api/admin/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          keys: subJson.keys,
          userAgent: navigator.userAgent,
        }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || "Subscription save failed");
      }

      try {
        localStorage.setItem(SUBSCRIBED_FLAG, "1");
      } catch {
        // Best-effort. If we can't cache, the next visit will
        // re-show "Enable" — clicking again is idempotent so the
        // worst case is one extra tap.
      }
      setSubscribed(true);
    } catch (err) {
      console.error("[admin-push-prompt] enable failed:", err);
      alert(
        err instanceof Error
          ? `Couldn't enable notifications: ${err.message}`
          : "Couldn't enable notifications."
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleDisable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        await fetch("/api/admin/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint }),
        });
      }
      try {
        localStorage.removeItem(SUBSCRIBED_FLAG);
      } catch {
        // ignore
      }
      setSubscribed(false);
    } catch (err) {
      console.error("[admin-push-prompt] disable failed:", err);
    } finally {
      setBusy(false);
    }
  }

  // ─── Render ───────────────────────────────────────────────────

  if (supported === null) return null; // SSR / pre-mount
  if (supported === false) return null; // Browser doesn't support push at all
  if (iosBlockedNoStandalone) {
    // iOS Safari not in standalone — surface a small hint instead
    // of the button so the user understands why nothing shows.
    return (
      <span className="text-[11px] text-charcoal/50 whitespace-nowrap">
        Install to home screen for push
      </span>
    );
  }

  if (permission === "denied") {
    return (
      <span
        className="text-[11px] text-charcoal/50 whitespace-nowrap"
        title="Notifications are blocked. Enable them in your browser settings to re-allow."
      >
        Notifications blocked
      </span>
    );
  }

  if (subscribed && permission === "granted") {
    return (
      <button
        type="button"
        onClick={handleDisable}
        disabled={busy}
        className="inline-flex items-center gap-1.5 text-[11px] text-charcoal/60 hover:text-charcoal transition-colors whitespace-nowrap disabled:opacity-50"
        title="Click to disable push notifications on this device"
      >
        <svg
          className="w-3 h-3 text-green-dark"
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.7-9.3a1 1 0 0 0-1.4-1.4L9 10.6 7.7 9.3a1 1 0 0 0-1.4 1.4l2 2a1 1 0 0 0 1.4 0l4-4Z"
            clipRule="evenodd"
          />
        </svg>
        Notifications on
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleEnable}
      disabled={busy}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-charcoal/5 hover:bg-charcoal/10 text-charcoal text-[11px] font-medium transition-colors whitespace-nowrap disabled:opacity-50"
    >
      <svg
        className="w-3 h-3"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
        />
      </svg>
      {busy ? "Enabling…" : "Enable notifications"}
    </button>
  );
}
