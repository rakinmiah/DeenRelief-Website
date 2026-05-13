"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { haptic } from "@/lib/haptics";

/**
 * Pull-to-refresh wrapper for admin list pages.
 *
 * Why: trustees coming back to a list page after handling a task on
 * the phone (replying to a customer, marking shipped, etc.) expect
 * the standard mobile gesture to refresh. Without this, they have to
 * find the URL bar and tap the refresh button — Safari hides it
 * behind a menu in PWA standalone mode, where there isn't one at
 * all.
 *
 * Wraps `router.refresh()` in a useTransition so we know exactly
 * when the server-side re-render finishes, and can fade the spinner
 * out at that point rather than guessing with a timer.
 *
 * Implementation choices:
 *   - Only triggers when the page is scrolled to the absolute top.
 *     Mid-page drags pass through unchanged.
 *   - Chrome on Android has a native pull-to-refresh that fights
 *     ours. We set `overscroll-behavior-y: contain` on the body
 *     via a useEffect — that disables the native gesture only
 *     while a PullToRefresh is mounted (cleaned up on unmount).
 *   - iOS Safari has no native web pull-to-refresh so this works
 *     out of the box.
 *   - Threshold: 72px (slightly more than the spinner's max travel)
 *     so a casual scroll-bounce doesn't accidentally refresh.
 *   - Resistance curve: drag past 80px and the indicator stops
 *     moving — feels like the gesture is "loaded" and ready to
 *     fire. Pure visual sugar; the threshold is purely linear.
 */

const PULL_THRESHOLD_PX = 72;
const PULL_MAX_DISPLAY_PX = 96;

export default function PullToRefresh({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startYRef = useRef<number | null>(null);
  const armedRef = useRef(false); // true once the user has crossed the threshold

  // Disable Chrome's native pull-to-refresh while this component is
  // mounted. Body-level so it affects the whole admin page (the
  // gesture targets the document scroll position, not any nested
  // scroll container).
  useEffect(() => {
    const original = document.body.style.overscrollBehaviorY;
    document.body.style.overscrollBehaviorY = "contain";
    return () => {
      document.body.style.overscrollBehaviorY = original;
    };
  }, []);

  // Once the route transition (router.refresh) settles, fade the
  // spinner out. The useTransition hook keeps isPending true until
  // the server-side re-render finishes — perfect spinner stop signal.
  useEffect(() => {
    if (refreshing && !isPending) {
      // Tiny delay so the spinner is visible long enough that the
      // user perceives "yes, something happened" rather than a flash.
      const t = setTimeout(() => {
        setRefreshing(false);
        setPull(0);
        armedRef.current = false;
      }, 300);
      return () => clearTimeout(t);
    }
  }, [refreshing, isPending]);

  function handleTouchStart(e: React.TouchEvent) {
    // Only start tracking if we're at the very top. Mid-page
    // touchstart needs to pass through to normal scroll.
    if (window.scrollY > 0) {
      startYRef.current = null;
      return;
    }
    if (refreshing) {
      startYRef.current = null;
      return;
    }
    const touch = e.touches[0];
    if (!touch) return;
    startYRef.current = touch.clientY;
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (startYRef.current === null) return;
    if (window.scrollY > 0) {
      // User scrolled back into the page mid-gesture (rare but
      // possible). Cancel.
      startYRef.current = null;
      setPull(0);
      return;
    }
    const touch = e.touches[0];
    if (!touch) return;
    const dy = touch.clientY - startYRef.current;
    if (dy <= 0) {
      setPull(0);
      return;
    }
    // Apply a resistance curve once we're past the threshold so
    // the spinner doesn't slide off into the void.
    const clamped = Math.min(dy, PULL_MAX_DISPLAY_PX);
    setPull(clamped);
    if (clamped >= PULL_THRESHOLD_PX && !armedRef.current) {
      armedRef.current = true;
      haptic("select"); // tiny tick when the gesture passes threshold
    } else if (clamped < PULL_THRESHOLD_PX && armedRef.current) {
      armedRef.current = false;
    }
  }

  function handleTouchEnd() {
    if (startYRef.current === null) return;
    startYRef.current = null;
    if (armedRef.current && !refreshing) {
      setRefreshing(true);
      haptic("confirm");
      startTransition(() => {
        router.refresh();
      });
    } else {
      // Snap back without refresh.
      setPull(0);
      armedRef.current = false;
    }
  }

  // Computed spinner state used for the visual.
  const spinnerY = refreshing ? PULL_THRESHOLD_PX : pull;
  const spinnerRotation = refreshing ? 0 : (pull / PULL_THRESHOLD_PX) * 360;
  const spinnerOpacity = Math.min(1, pull / 32) || (refreshing ? 1 : 0);

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      className="relative"
    >
      {/* Spinner — absolute-positioned, slides down as the user
          drags. Disappears when there's no pull AND not refreshing. */}
      <div
        aria-hidden="true"
        className="md:hidden absolute left-1/2 -translate-x-1/2 top-0 z-10 pointer-events-none"
        style={{
          transform: `translate(-50%, ${spinnerY - 24}px)`,
          transition: refreshing || pull === 0 ? "transform 250ms ease-out, opacity 200ms" : "none",
          opacity: spinnerOpacity,
        }}
      >
        <div className="w-10 h-10 rounded-full bg-white border border-charcoal/10 shadow-sm flex items-center justify-center">
          <svg
            className={`w-5 h-5 text-charcoal/70 ${refreshing ? "animate-spin" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={2.2}
            viewBox="0 0 24 24"
            style={{
              transform: refreshing ? undefined : `rotate(${spinnerRotation}deg)`,
              transition: refreshing ? undefined : "none",
            }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
            />
          </svg>
        </div>
      </div>

      {/* Page content. Translates down with the pull so the user
          feels the rubber-band. Snaps back when released. */}
      <div
        style={{
          transform: `translateY(${refreshing ? PULL_THRESHOLD_PX / 2 : pull / 2}px)`,
          transition: refreshing || pull === 0 ? "transform 250ms ease-out" : "none",
        }}
      >
        {children}
      </div>
    </div>
  );
}
