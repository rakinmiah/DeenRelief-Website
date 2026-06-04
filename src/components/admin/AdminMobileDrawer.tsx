"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { haptic } from "@/lib/haptics";
import AdminPushPrompt from "./AdminPushPrompt";
import { visibleGroups, flatVisible, type AdminRole } from "./admin-nav";

/**
 * Slide-out left drawer that contains the full admin navigation
 * on mobile / tablet portrait (the <lg counterpart to the desktop
 * sidebar in AdminShell).
 *
 * Design choices:
 *   - Slides in from the left over a semi-transparent backdrop.
 *     Matches the main charity site's mobile menu pattern so
 *     trustees moving between admin + public site share one
 *     mental model.
 *   - Backdrop tap closes. Escape key closes. Tapping a nav item
 *     closes (and Next.js handles the navigation).
 *   - focus management moves focus to the first nav item on open so
 *     keyboard users start in the nav, not the page below.
 *   - safe-area-inset-top/bottom padding so notched iPhones in
 *     PWA standalone mode don't clip the drawer content.
 *
 * The nav itself comes from the shared admin-nav module (grouped,
 * icon-rich, role-filtered) — the same source the desktop sidebar
 * uses, so the two surfaces never drift.
 */

export default function AdminMobileDrawer({
  open,
  onClose,
  signedInAs,
  onSignOut,
  role = "admin",
}: {
  open: boolean;
  onClose: () => void;
  signedInAs: string;
  onSignOut: () => void;
  /**
   * Role of the signed-in user. Drives which grouped nav sections
   * appear, via the shared `visibleGroups(role)` helper. Defaults to
   * 'admin' for backward compat.
   */
  role?: AdminRole;
}) {
  const pathname = usePathname();
  const drawerRef = useRef<HTMLElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);

  // Swipe-to-close state. The drawer normally renders pinned at
  // translate-x-0 (open) or -translate-x-full (closed). During a
  // drag we override that with a live pixel value held in
  // `dragOffsetPx` (a negative number while dragging left). On
  // release: if the user dragged far enough to cross the threshold,
  // we call onClose; otherwise we snap back to 0.
  //
  // Why pixel math instead of CSS transitions: the drawer needs to
  // follow the finger 1:1. Tailwind transition classes interpolate
  // every frame which would lag behind the touch. We disable
  // transitions during the drag and restore them on release.
  const [dragOffsetPx, setDragOffsetPx] = useState<number | null>(null);
  const dragStartXRef = useRef<number | null>(null);
  const dragStartTimeRef = useRef<number>(0);

  const SWIPE_CLOSE_THRESHOLD_PX = 64; // ~16% of a 384px drawer width
  const SWIPE_CLOSE_VELOCITY_PX_PER_MS = 0.4; // fast flick

  // Grouped, role-filtered nav from the shared source of truth (Social
  // is additionally email-gated via the allow-list).
  const groups = visibleGroups(role, signedInAs);
  // First visible item's href doubles as the role-appropriate "home"
  // link in the drawer header — never dead-ends a non-admin user.
  const homeHref = flatVisible(role, signedInAs)[0]?.href ?? "/admin/donations";

  // Escape key closes.
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  // Lock the body scroll while the drawer is open so the page
  // underneath doesn't slide around when the user swipes inside
  // the drawer.
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  // Move focus into the drawer when it opens, so keyboard users
  // tab through the nav rather than starting at the page below.
  useEffect(() => {
    if (open) {
      // Small delay so the open animation finishes before focus
      // moves — avoids a jarring camera jump on iOS.
      const t = setTimeout(() => firstLinkRef.current?.focus(), 150);
      return () => clearTimeout(t);
    }
  }, [open]);

  function handleTouchStart(e: React.TouchEvent) {
    const touch = e.touches[0];
    if (!touch) return;
    dragStartXRef.current = touch.clientX;
    dragStartTimeRef.current = performance.now();
    // Initialise at 0 so the inline style takes over immediately;
    // the CSS transition class is gated on dragOffsetPx === null.
    setDragOffsetPx(0);
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (dragStartXRef.current === null) return;
    const touch = e.touches[0];
    if (!touch) return;
    const dx = touch.clientX - dragStartXRef.current;
    // Only track leftward motion (drawer-closing direction). Cap
    // rightward drag at 0 so the drawer can't slide off the
    // right edge.
    setDragOffsetPx(Math.min(0, dx));
  }

  function handleTouchEnd() {
    if (dragStartXRef.current === null || dragOffsetPx === null) {
      dragStartXRef.current = null;
      setDragOffsetPx(null);
      return;
    }
    const elapsed = performance.now() - dragStartTimeRef.current;
    const velocity = Math.abs(dragOffsetPx) / Math.max(elapsed, 1);
    const closedByDistance = Math.abs(dragOffsetPx) > SWIPE_CLOSE_THRESHOLD_PX;
    const closedByVelocity =
      velocity > SWIPE_CLOSE_VELOCITY_PX_PER_MS && dragOffsetPx < -16;
    dragStartXRef.current = null;
    if (closedByDistance || closedByVelocity) {
      // Wipe the drag offset BEFORE calling onClose so the CSS
      // transition picks up from the current position back to
      // -100% (instead of snapping). The setDragOffsetPx(null)
      // in the open effect would otherwise interfere.
      setDragOffsetPx(null);
      haptic("tap");
      onClose();
    } else {
      // Snap back. Re-enable transitions by clearing the inline
      // style (dragOffsetPx === null → no inline transform → CSS
      // transition class handles the spring back).
      setDragOffsetPx(null);
    }
  }

  return (
    <>
      {/* Backdrop. Fades in/out with the drawer. Tap-to-close. */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-charcoal/40 backdrop-blur-[2px] lg:hidden transition-opacity duration-200 ${
          open
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Drawer panel */}
      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Admin navigation"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        // Transition is disabled DURING a drag so the panel follows
        // the finger 1:1. As soon as the drag ends (dragOffsetPx is
        // nulled) the transition class kicks back in for the
        // spring-back or close animation.
        className={`fixed top-0 left-0 z-50 h-full w-72 max-w-[85vw] bg-white shadow-2xl lg:hidden transform ${
          dragOffsetPx === null ? "transition-transform duration-200 ease-out" : ""
        } flex flex-col ${open ? "translate-x-0" : "-translate-x-full"}`}
        // Safe-area-inset padding so the drawer doesn't clip
        // behind the iPhone notch in PWA standalone mode. The
        // inline transform overrides the Tailwind class while
        // dragging — once released the inline style is wiped and
        // the className takes back over.
        style={{
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
          ...(dragOffsetPx !== null
            ? { transform: `translateX(${dragOffsetPx}px)` }
            : {}),
        }}
      >
        {/* Drawer header — DR Admin wordmark + close button. */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-charcoal/10">
          <Link
            href={homeHref}
            onClick={onClose}
            className="block"
          >
            <span className="block text-[10px] font-bold tracking-[0.18em] uppercase text-amber-dark leading-tight">
              Deen Relief
            </span>
            <span className="block text-charcoal font-heading font-semibold text-base leading-tight">
              Admin
            </span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="w-11 h-11 -mr-2 flex items-center justify-center text-charcoal/60 hover:text-charcoal hover:bg-charcoal/5 rounded-full transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
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

        {/* Grouped nav */}
        <nav
          className="flex-1 overflow-y-auto py-3 space-y-4"
          aria-label="Admin sections"
        >
          {groups.map((group, groupIdx) => (
            <div key={group.label}>
              <p className="px-5 mb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-charcoal/40">
                {group.label}
              </p>
              <ul>
                {group.items.map((item, itemIdx) => {
                  const isActive = pathname.startsWith(item.href);
                  // First link across all groups gets the focus ref.
                  const isFirst = groupIdx === 0 && itemIdx === 0;
                  return (
                    <li key={item.href}>
                      <Link
                        ref={isFirst ? firstLinkRef : undefined}
                        href={item.href}
                        onClick={onClose}
                        className={`flex items-center gap-3 px-5 py-3 min-h-[48px] text-[15px] transition-colors ${
                          isActive
                            ? "bg-charcoal text-white font-semibold"
                            : "text-charcoal/80 hover:bg-charcoal/5 font-medium"
                        }`}
                        aria-current={isActive ? "page" : undefined}
                      >
                        <span className={isActive ? "text-white" : "text-charcoal/50"}>
                          {item.icon}
                        </span>
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer — push toggle + signed-in identity + sign out */}
        <div className="border-t border-charcoal/10 p-4">
          {/* Push notifications toggle. On iOS this is the ONLY way
              to enable push because we hide it from the desktop
              header on phone-sized screens (cramped chrome). The
              component renders nothing if push isn't supported on
              this browser, or if iOS isn't in standalone PWA mode. */}
          <div className="mb-3">
            <AdminPushPrompt />
          </div>
          <p className="text-[11px] uppercase tracking-[0.1em] font-bold text-charcoal/40 mb-1">
            Signed in
          </p>
          <p className="text-[13px] text-charcoal/80 break-all mb-3 font-mono">
            {signedInAs}
          </p>
          <button
            type="button"
            onClick={() => {
              onClose();
              onSignOut();
            }}
            className="w-full min-h-[44px] px-4 py-2 rounded-full bg-white border border-charcoal/15 text-charcoal text-sm font-semibold hover:bg-cream transition-colors"
          >
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
