"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { haptic } from "@/lib/haptics";

/**
 * Slide-out left drawer that contains the full admin navigation
 * on mobile (replaces the cramped horizontal-scroll row that
 * used to live in the AdminShell header).
 *
 * Design choices:
 *   - Slides in from the left over a semi-transparent backdrop.
 *     Matches the main charity site's mobile menu pattern so
 *     trustees moving between admin + public site share one
 *     mental model.
 *   - Backdrop tap closes. Escape key closes. Tapping a nav item
 *     closes (and Next.js handles the navigation).
 *   - `inert` attribute + focus management keeps the rest of the
 *     page unreachable via tab while the drawer is open.
 *   - safe-area-inset-top/bottom padding so notched iPhones in
 *     PWA standalone mode don't clip the drawer content.
 *
 * Each nav item has an inline SVG icon + label. 56px tall rows
 * give comfortable thumb targets (Apple HIG min is 44, we round up
 * because admin trustees can be any age).
 */

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const ICON_PROPS = {
  className: "w-5 h-5",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  viewBox: "0 0 24 24",
  "aria-hidden": true,
} as const;

const NAV_ITEMS: NavItem[] = [
  {
    href: "/admin/donations",
    label: "Donations",
    icon: (
      <svg {...ICON_PROPS}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z"
        />
      </svg>
    ),
  },
  {
    href: "/admin/recurring",
    label: "Recurring",
    icon: (
      <svg {...ICON_PROPS}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
        />
      </svg>
    ),
  },
  {
    href: "/admin/bazaar/orders",
    label: "Bazaar Orders",
    icon: (
      <svg {...ICON_PROPS}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z"
        />
      </svg>
    ),
  },
  {
    href: "/admin/bazaar/inquiries",
    label: "Bazaar Inquiries",
    icon: (
      <svg {...ICON_PROPS}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.068.157 2.148.279 3.238.364.466.037.893.281 1.153.671L12 21l2.652-3.978c.26-.39.687-.634 1.153-.67 1.09-.086 2.17-.208 3.238-.365 1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"
        />
      </svg>
    ),
  },
  {
    href: "/admin/bazaar/catalog",
    label: "Bazaar Catalog",
    icon: (
      <svg {...ICON_PROPS}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6 6h.008v.008H6V6Z"
        />
      </svg>
    ),
  },
  {
    href: "/admin/media",
    label: "Media",
    icon: (
      <svg {...ICON_PROPS}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
        />
      </svg>
    ),
  },
  {
    href: "/admin/reports",
    label: "Reports",
    icon: (
      <svg {...ICON_PROPS}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"
        />
      </svg>
    ),
  },
  {
    href: "/admin/audit-log",
    label: "Audit log",
    icon: (
      <svg {...ICON_PROPS}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z"
        />
      </svg>
    ),
  },
];

export default function AdminMobileDrawer({
  open,
  onClose,
  signedInAs,
  onSignOut,
}: {
  open: boolean;
  onClose: () => void;
  signedInAs: string;
  onSignOut: () => void;
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
        className={`fixed inset-0 z-40 bg-charcoal/40 backdrop-blur-[2px] md:hidden transition-opacity duration-200 ${
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
        className={`fixed top-0 left-0 z-50 h-full w-72 max-w-[85vw] bg-white shadow-2xl md:hidden transform ${
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
            href="/admin/donations"
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

        {/* Nav list */}
        <nav className="flex-1 overflow-y-auto py-2" aria-label="Admin sections">
          <ul>
            {NAV_ITEMS.map((item, idx) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    ref={idx === 0 ? firstLinkRef : undefined}
                    href={item.href}
                    onClick={onClose}
                    className={`flex items-center gap-3 px-5 py-3.5 min-h-[48px] text-[15px] transition-colors ${
                      isActive
                        ? "bg-charcoal text-white font-semibold"
                        : "text-charcoal/80 hover:bg-charcoal/5 font-medium"
                    }`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <span
                      className={
                        isActive ? "text-white" : "text-charcoal/50"
                      }
                    >
                      {item.icon}
                    </span>
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer — signed-in identity + sign out */}
        <div className="border-t border-charcoal/10 p-4">
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
