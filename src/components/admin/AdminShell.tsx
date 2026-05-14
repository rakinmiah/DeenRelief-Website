"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import AdminNotificationBell from "./AdminNotificationBell";
import AdminMobileDrawer from "./AdminMobileDrawer";

/**
 * Shared admin chrome. Two distinct layouts inside the same
 * component — driven by Tailwind responsive utilities:
 *
 *   md+ (desktop / tablet landscape):
 *     Full horizontal nav across the header. Wordmark on the
 *     left, eight nav pills, bell + signed-in email + Sign out
 *     button on the right.
 *
 *   <md (phone):
 *     Slim 56px header — hamburger button on the left, wordmark
 *     centred-ish, bell icon on the right. Tapping hamburger
 *     opens a slide-out drawer with the full nav, signed-in
 *     identity and Sign out button (see AdminMobileDrawer).
 *
 * The drawer pattern matches the main charity site's mobile
 * menu so trustees moving between admin + public site share
 * one mental model. Same component would work for a future
 * bottom-tab-bar variant if we ever change our minds, but
 * drawer scales to 8+ nav items without compromise.
 *
 * PWA standalone mode: the top header uses
 * env(safe-area-inset-top) for padding so iPhone notch + status
 * bar don't clip when the admin is installed to the home screen.
 */
const NAV_ITEMS = [
  { href: "/admin/donations", label: "Donations" },
  { href: "/admin/recurring", label: "Recurring" },
  { href: "/admin/bazaar/orders", label: "Bazaar Orders" },
  { href: "/admin/bazaar/inquiries", label: "Bazaar Inquiries" },
  { href: "/admin/bazaar/catalog", label: "Bazaar Catalog" },
  { href: "/admin/media", label: "Media" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/audit-log", label: "Audit log" },
];

export default function AdminShell({
  children,
  signedInAs = "info@deenrelief.org",
}: {
  children: React.ReactNode;
  signedInAs?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // The login page renders standalone without the admin chrome —
  // there's no session to sign out of and no nav to traverse.
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  async function handleSignOut() {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } finally {
      router.push("/admin/login");
    }
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col print:bg-white print:min-h-0">
      {/* print:hidden hides the admin nav so printing a page
          (e.g. /admin/bazaar/orders/[id] for a packing slip)
          captures just the page content, not the chrome. */}
      <header
        className="bg-white border-b border-charcoal/10 sticky top-0 z-30 print:hidden"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* ── Desktop row (md+) ── */}
          <div className="hidden md:flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link
                href="/admin/donations"
                className="block"
                aria-label="Deen Relief Admin home"
              >
                <span className="block text-[10px] font-bold tracking-[0.18em] uppercase text-amber-dark leading-tight">
                  Deen Relief
                </span>
                <span className="block text-charcoal font-heading font-semibold text-base leading-tight">
                  Admin
                </span>
              </Link>
              <nav
                className="flex items-center gap-1"
                aria-label="Admin sections"
              >
                {NAV_ITEMS.map((item) => {
                  const isActive = pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-charcoal text-white"
                          : "text-charcoal/70 hover:text-charcoal hover:bg-charcoal/5"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <AdminNotificationBell />
              <span className="hidden sm:inline text-sm text-charcoal/60">
                {signedInAs}
              </span>
              <button
                type="button"
                onClick={handleSignOut}
                className="px-3 py-1.5 rounded-full text-sm font-medium text-charcoal/70 hover:text-charcoal hover:bg-charcoal/5 transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>

          {/* ── Mobile row (<md) ── */}
          <div className="md:hidden flex items-center justify-between h-14">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation menu"
              className="w-11 h-11 -ml-2 flex items-center justify-center text-charcoal/80 hover:bg-charcoal/5 rounded-full transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                />
              </svg>
            </button>
            <Link
              href="/admin/donations"
              className="block text-center"
              aria-label="Deen Relief Admin home"
            >
              <span className="block text-[9px] font-bold tracking-[0.18em] uppercase text-amber-dark leading-tight">
                Deen Relief
              </span>
              <span className="block text-charcoal font-heading font-semibold text-sm leading-tight">
                Admin
              </span>
            </Link>
            <div className="-mr-1">
              <AdminNotificationBell />
            </div>
          </div>
        </div>
      </header>

      {/* The slide-out drawer with the full nav, mounted always
          so its open/close transition animates smoothly. */}
      <AdminMobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        signedInAs={signedInAs}
        onSignOut={handleSignOut}
      />

      <div className="flex-1">{children}</div>
    </div>
  );
}
