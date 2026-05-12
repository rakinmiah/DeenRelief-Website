"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import AdminNotificationBell from "./AdminNotificationBell";

/**
 * Shared admin chrome — header with nav tabs + sign-out.
 *
 * Used by all /admin/* pages EXCEPT /admin/login (which doesn't need
 * the chrome since the user isn't yet signed in).
 *
 * Active-tab detection uses startsWith so /admin/donations/[id] still
 * highlights "Donations" in the nav.
 *
 * Production auth: this component runs as a child of the admin layout,
 * which itself runs under the auth gate (Supabase Auth + admin claim
 * check). If the gate fails, the layout 302-redirects to /admin/login
 * before this component ever renders.
 */
const NAV_ITEMS = [
  { href: "/admin/donations", label: "Donations" },
  { href: "/admin/recurring", label: "Recurring" },
  { href: "/admin/bazaar/orders", label: "Bazaar Orders" },
  { href: "/admin/bazaar/inquiries", label: "Bazaar Inquiries" },
  { href: "/admin/bazaar/catalog", label: "Bazaar Catalog" },
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
    <div className="min-h-screen bg-cream flex flex-col">
      <header className="bg-white border-b border-charcoal/10 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
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
                className="hidden md:flex items-center gap-1"
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
          {/* Mobile nav row */}
          <nav
            className="md:hidden -mx-4 px-4 pb-3 overflow-x-auto flex gap-1"
            aria-label="Admin sections (mobile)"
          >
            {NAV_ITEMS.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
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
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}
