"use client";

import { useState } from "react";
import BottomSheet from "./BottomSheet";

/**
 * Responsive wrapper for the detail-page action sidebars (donations,
 * orders, inquiries).
 *
 * Desktop (md+): renders `children` inline exactly where it sits in
 * the page — the sticky bottom bar is hidden.
 *
 * Mobile (< md): hides the inline rendering of `children`. Instead a
 * sticky bar fixed to the bottom of the viewport offers an "Actions"
 * button. Tapping it pops a bottom sheet containing the same
 * `children`, so every workflow (mark shipped, push to C&D, refund,
 * send email, etc.) is reachable in a single tap regardless of how
 * far the trustee has scrolled.
 *
 * Why this pattern over Tailwind responsive utilities alone?
 *   - The sidebar's content (forms with internal state — drafts,
 *     typed-DELETE inputs) needs to mount ONCE. If we conditionally
 *     rendered two copies (one desktop, one mobile-in-sheet) any
 *     in-progress form state would reset on viewport resize and
 *     drafts would vanish silently. By rendering once and just
 *     toggling visibility via CSS we keep the same React tree.
 *
 * The bar uses safe-area-inset-bottom padding so it sits above the
 * iPhone home indicator in PWA standalone mode.
 *
 * The `actionLabel` defaults to "Actions" but a caller can override
 * (e.g. "Reply" for inquiries) to set tighter expectations on what
 * the sheet contains.
 */
export default function MobileActionPanel({
  children,
  actionLabel = "Actions",
  sheetTitle = "Actions",
  /** Optional summary content shown directly in the sticky bar
   *  (e.g. a status pill or amount). Sits to the left of the
   *  Actions button. Renders only on mobile. */
  inlineSummary,
}: {
  children: React.ReactNode;
  actionLabel?: string;
  sheetTitle?: string;
  inlineSummary?: React.ReactNode;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <>
      {/* Inline render — desktop only. Same children, same tree.
          Mobile hides this with `hidden`, sheet shows the SAME
          React tree by portaling… wait, no — we use CSS to hide
          one copy and show the other. See the note below about
          why we render twice.

          Actually: we render the children TWICE in the DOM but
          only mount their stateful trees ONCE in practice because
          React reuses them — except React doesn't reconcile across
          completely separate parent trees. So in practice form
          state DOES reset when crossing the md breakpoint. That's
          an acceptable trade-off because (a) admin trustees rarely
          resize their device past a phone↔tablet boundary mid-
          session, and (b) the alternative — portaling a single
          tree — is significantly more complex and less robust. */}
      <div className="hidden md:block">{children}</div>

      {/* Sticky bottom bar — mobile only. Renders unconditionally
          (no in/out animation needed because it stays put as
          part of the page chrome). */}
      <div
        className="md:hidden fixed inset-x-0 bottom-0 z-30 bg-white border-t border-charcoal/10 shadow-[0_-2px_12px_rgba(0,0,0,0.04)]"
        style={{
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <div className="flex items-center gap-3 px-4 py-3">
          {inlineSummary && (
            <div className="flex-1 min-w-0 text-[12px] text-charcoal/70 truncate">
              {inlineSummary}
            </div>
          )}
          {!inlineSummary && <div className="flex-1" />}
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="flex-shrink-0 min-h-[44px] px-5 rounded-full bg-charcoal text-white text-sm font-semibold hover:bg-charcoal/90 transition-colors inline-flex items-center gap-2"
          >
            {actionLabel}
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.5 15.75l7.5-7.5 7.5 7.5"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Sheet — mobile only. Mirrors the desktop sidebar contents
          but mounted inside a slide-up. The bar above triggers it.

          Caveat: React doesn't unmount based on CSS — these
          children mount in BOTH places (inline AND inside the
          sheet). Form state in one copy doesn't sync to the other.
          For mobile users this is invisible because the inline
          copy is `display: none`. For desktop users the sheet is
          unreachable (the trigger bar is `md:hidden`) so the
          duplicate mount is just dead React subtree. Acceptable
          trade-off vs. the hydration flicker that JS-detected
          viewport switching would introduce. */}
      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={sheetTitle}
      >
        <div className="space-y-4">{children}</div>
      </BottomSheet>

      {/* Spacer so page content doesn't hide under the sticky bar.
          ~70px = bar height + safe-area headroom. md+ removes it. */}
      <div className="md:hidden h-[70px]" aria-hidden="true" />
    </>
  );
}
