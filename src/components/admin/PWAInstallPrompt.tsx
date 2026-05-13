"use client";

import { useEffect, useState } from "react";

/**
 * Custom install-prompt UI for the DR Admin PWA.
 *
 * Two platform branches:
 *
 * ─── Android / Chrome / Edge ───
 * The browser fires `beforeinstallprompt` once the engagement
 * criteria are met (user has visited the site enough, manifest is
 * present, SW is registered, etc.). We intercept that event and
 * stash the prompt so we can show our own UI at a convenient moment
 * — Chrome's native install banner is small, anonymous, and easily
 * missed. Our banner has clear copy about WHAT will be installed
 * ("DR Admin home-screen app") and a primary install button.
 *
 * ─── iOS Safari ───
 * No programmatic API exists. Safari users have to tap the share
 * button + Add to Home Screen manually. We detect "iOS Safari, not
 * already standalone" and show a 2-step illustrated banner pointing
 * at the share button location.
 *
 * Dismiss state stored in localStorage so we don't nag trustees
 * who've explicitly chosen not to install. They can re-enable by
 * clearing storage from the browser. A 7-day cooldown means a
 * dismiss-then-change-mind user gets re-prompted within a week.
 */

const DISMISS_KEY = "dr-admin-install-dismissed-at";
const DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Chrome's `beforeinstallprompt` event type. Not in standard
// TypeScript lib.dom — declared locally.
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Platform = "android" | "ios" | "other";

function detectPlatform(): Platform {
  if (typeof window === "undefined") return "other";
  const ua = navigator.userAgent;
  // iPad with iPadOS 13+ reports as desktop Safari — check both.
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (isIOS) {
    // Only Safari on iOS supports Add to Home Screen reliably. Chrome
    // / Firefox on iOS share Safari's WebKit but don't expose the
    // Share button in the same spot, so we treat them as "other".
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS/.test(ua);
    return isSafari ? "ios" : "other";
  }
  if (/Android/.test(ua)) return "android";
  return "other";
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  // matchMedia covers Android + iOS Chrome; navigator.standalone is
  // iOS Safari-specific.
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // @ts-expect-error iOS-only API
    Boolean(window.navigator.standalone)
  );
}

function wasRecentlyDismissed(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const ts = parseInt(raw, 10);
    if (!Number.isFinite(ts)) return false;
    return Date.now() - ts < DISMISS_COOLDOWN_MS;
  } catch {
    return false;
  }
}

function recordDismiss() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    // localStorage can fail in private browsing — silently skip,
    // we'll just re-show on next visit which is acceptable.
  }
}

export default function PWAInstallPrompt() {
  // Visible state holds BOTH the "should we show" decision AND the
  // platform-specific copy variant — we set it together so render-
  // time logic doesn't need to know how we figured platform out.
  const [visibleFor, setVisibleFor] = useState<"android" | "ios" | null>(
    null
  );
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  // Mount-only setup: figure out platform, attach beforeinstallprompt
  // listener, decide whether to show. We bundle the platform decision
  // INTO the visibility state so we don't need a second setState +
  // re-render to expose it.
  useEffect(() => {
    if (isStandalone()) return; // Already installed — don't pester.
    if (wasRecentlyDismissed()) return;

    const p = detectPlatform();

    if (p === "android") {
      function handle(e: Event) {
        e.preventDefault();
        const evt = e as BeforeInstallPromptEvent;
        setDeferredPrompt(evt);
        setVisibleFor("android");
      }
      window.addEventListener("beforeinstallprompt", handle);
      return () =>
        window.removeEventListener("beforeinstallprompt", handle);
    }

    if (p === "ios") {
      // iOS: just show the hint banner after a small delay so it
      // doesn't fight the page-load paint.
      const t = setTimeout(() => setVisibleFor("ios"), 2500);
      return () => clearTimeout(t);
    }

    // Other platforms (desktop, iOS-Chrome): don't render.
  }, []);

  function handleAndroidInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(({ outcome }) => {
      if (outcome === "dismissed") {
        recordDismiss();
      }
      setVisibleFor(null);
      setDeferredPrompt(null);
    });
  }

  function handleDismiss() {
    recordDismiss();
    setVisibleFor(null);
  }

  if (!visibleFor) return null;
  const platform = visibleFor;

  return (
    <div
      className="fixed inset-x-3 bottom-3 z-40 md:inset-x-auto md:right-6 md:bottom-6 md:max-w-sm bg-white border border-charcoal/10 rounded-2xl shadow-xl p-4"
      style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-charcoal flex items-center justify-center text-white font-heading font-bold text-lg">
          DR
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-charcoal font-heading font-semibold text-[14px] mb-0.5">
            Install DR Admin
          </p>
          {platform === "android" ? (
            <p className="text-charcoal/60 text-[12px] leading-snug">
              Add a home-screen icon and run DR Admin as its own
              app — fewer taps, no browser chrome.
            </p>
          ) : (
            <p className="text-charcoal/60 text-[12px] leading-snug">
              Tap the{" "}
              <span className="inline-block align-text-bottom">
                <svg
                  className="w-3.5 h-3.5 inline"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 8.25H7.5a2.25 2.25 0 0 0-2.25 2.25v9a2.25 2.25 0 0 0 2.25 2.25h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25H15M9 12l3 3m0 0 3-3m-3 3V2.25"
                  />
                </svg>
              </span>{" "}
              share button in Safari, then{" "}
              <strong>Add to Home Screen</strong>.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss"
          className="flex-shrink-0 w-7 h-7 -mr-1 -mt-1 flex items-center justify-center text-charcoal/40 hover:text-charcoal hover:bg-charcoal/5 rounded-full transition-colors"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.2}
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
      </div>

      {platform === "android" && (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={handleDismiss}
            className="flex-1 min-h-[40px] px-3 rounded-full bg-white border border-charcoal/15 text-charcoal text-xs font-medium hover:bg-cream transition-colors"
          >
            Not now
          </button>
          <button
            type="button"
            onClick={handleAndroidInstall}
            className="flex-1 min-h-[40px] px-3 rounded-full bg-charcoal text-white text-xs font-semibold hover:bg-charcoal/90 transition-colors"
          >
            Install
          </button>
        </div>
      )}
    </div>
  );
}
