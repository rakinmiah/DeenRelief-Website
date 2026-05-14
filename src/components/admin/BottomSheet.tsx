"use client";

import { useEffect, useRef } from "react";
import { haptic } from "@/lib/haptics";

/**
 * Reusable bottom sheet — slides up from the bottom edge on mobile,
 * dims the rest of the page, traps focus, locks body scroll. Used
 * across the admin for any mobile-first modal-style interaction:
 *   - Overflow actions on detail pages (refund, mark delivered, etc.)
 *   - Destructive confirmation dialogs (typed DELETE)
 *   - List-page filter panels (kind / tag / status filters)
 *
 * Why bottom-anchored on mobile rather than a centred modal?
 *   - Thumb reach: a centred dialog forces the user to reach the
 *     middle of a 6"+ screen. Bottom-anchored sticks to the
 *     thumb-friendly zone.
 *   - iOS / Android native pattern: every iOS share sheet, action
 *     sheet, and Google Maps detail card uses bottom-anchored.
 *     Trustees instinctively know to swipe-down-to-dismiss.
 *
 * Markup contract: parent decides when `open` is true. Children
 * render inside a scrollable content area with the drag-handle and
 * optional title baked into the chrome.
 *
 * On md+ the sheet centers itself and behaves like a conventional
 * modal — we don't have to author two markup trees because the
 * positioning is pure Tailwind.
 *
 * IMPORTANT: this is a CLIENT-mounted primitive. Don't try to
 * server-render it. Inert prop polyfill not needed — React 19 +
 * Next 16 ship with native `inert` support on all the browsers
 * the admin supports.
 */
export default function BottomSheet({
  open,
  onClose,
  title,
  children,
  /** Optional max-height override. Default 85vh on mobile (leaves a
   *  thumb of room above the system handles) and 80vh on desktop. */
  maxHeightClass,
  /** Hide the drag-handle bar at the top — false by default. Pass
   *  true for destructive dialogs where dragging-to-dismiss might
   *  be accidentally triggered. */
  hideHandle,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxHeightClass?: string;
  hideHandle?: boolean;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // Esc to close.
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  // Tap haptic on every open — feels like the sheet "lands" when it
  // slides up. No-op on platforms without navigator.vibrate.
  useEffect(() => {
    if (open) haptic("tap");
  }, [open]);

  // Body scroll lock — but only while the sheet is open.
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  // Capture the element that opened the sheet so we can restore
  // focus on close. Otherwise tab order ends up at the start of the
  // document and screen-reader users lose context.
  useEffect(() => {
    if (open) {
      previouslyFocused.current = document.activeElement as HTMLElement | null;
      // Defer focus to next frame so the slide-up animation has
      // begun (otherwise iOS Safari "focus before transform"
      // produces a flickery jump).
      const t = setTimeout(() => {
        const focusable = sheetRef.current?.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        focusable?.focus();
      }, 150);
      return () => clearTimeout(t);
    } else if (previouslyFocused.current) {
      previouslyFocused.current.focus({ preventScroll: true });
    }
  }, [open]);

  const maxH = maxHeightClass ?? "max-h-[85vh] md:max-h-[80vh]";

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-charcoal/40 backdrop-blur-[2px] transition-opacity duration-200 ${
          open
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Sheet panel.
          On mobile: fixed to the bottom, rounded top corners,
          slides up from `translate-y-full`. On md+: centered with
          rounded corners on all sides, slides up from a smaller
          offset.

          Safe-area-inset-bottom padding handles the iPhone home
          indicator in PWA standalone mode — without it, the last
          row of buttons sits behind the indicator bar. */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`fixed inset-x-0 bottom-0 z-50 md:inset-x-auto md:left-1/2 md:bottom-auto md:top-1/2 md:-translate-x-1/2 md:max-w-lg md:w-full bg-white shadow-2xl rounded-t-3xl md:rounded-3xl flex flex-col transform transition-transform duration-250 ease-out ${maxH} ${
          open
            ? "translate-y-0 md:-translate-y-1/2"
            : "translate-y-full md:translate-y-[calc(50vh+100%)]"
        }`}
        style={{
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {/* Drag handle. Pure decoration — actual drag-to-dismiss
            is wired later via the gestures pass. Visual affordance
            still helps users understand "this is dismissable". */}
        {!hideHandle && (
          <div className="flex justify-center pt-3 pb-1 md:hidden">
            <div
              aria-hidden="true"
              className="w-10 h-1.5 rounded-full bg-charcoal/15"
            />
          </div>
        )}

        {/* Header — optional title + close button */}
        {(title || hideHandle) && (
          <div className="flex items-center justify-between px-5 py-3 border-b border-charcoal/8 md:pt-5">
            {title ? (
              <h2 className="text-charcoal font-heading font-semibold text-base">
                {title}
              </h2>
            ) : (
              <span aria-hidden="true" />
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="w-9 h-9 -mr-1 flex items-center justify-center text-charcoal/60 hover:text-charcoal hover:bg-charcoal/5 rounded-full transition-colors"
            >
              <svg
                className="w-4 h-4"
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
        )}

        {/* Content — scrollable. `overscroll-contain` prevents the
            scroll chaining into the body underneath when the user
            reaches the top/bottom of the sheet's content. */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          {children}
        </div>
      </div>
    </>
  );
}
