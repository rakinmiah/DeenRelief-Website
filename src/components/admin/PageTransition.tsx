"use client";

import { usePathname } from "next/navigation";

/**
 * Subtle fade-up animation that fires on every admin route change.
 *
 * Why a client component instead of pure CSS:
 *   - We want the animation to fire on EVERY navigation, but not
 *     just on first hydration. CSS @keyframes attached to a static
 *     selector would fire once on first paint and never again,
 *     because React doesn't unmount/remount the main wrapper when
 *     navigating across pages in the same layout.
 *   - Keying the wrapper on pathname tells React "this is a new
 *     tree for each route" — so React unmounts the old tree and
 *     mounts the new one. The fresh mount re-fires the CSS
 *     animation, which is the trigger we want.
 *
 * The animation itself is intentionally subtle (12px translateY,
 * 250ms duration, ease-out curve). Admin trustees use this app
 * dozens of times a day — a heavy slide-in would get old by lunch
 * on day one. The goal is a small "yes, you navigated" cue that
 * fades into the background after the third use.
 *
 * Mounted at the admin layout level just inside AdminShell so it
 * wraps all page content, including the route-level main element.
 * Doesn't apply to chrome (header, drawer, install prompt).
 *
 * Reduced-motion: the keyframes is wrapped in a
 * @media (prefers-reduced-motion: no-preference) clause via
 * globals.css, so users who've asked the OS to minimise motion
 * see an instant render.
 */
export default function PageTransition({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="page-transition">
      {children}
    </div>
  );
}
