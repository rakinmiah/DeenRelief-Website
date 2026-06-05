"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AdminNotificationBell from "./AdminNotificationBell";
import AdminPushPrompt from "./AdminPushPrompt";
import AdminMobileDrawer from "./AdminMobileDrawer";
import CommandPalette from "./CommandPalette";
import { visibleGroups, flatVisible, type AdminRole } from "./admin-nav";

/**
 * Shared admin chrome. Two layouts inside one component, switched by
 * Tailwind's `lg` breakpoint:
 *
 *   lg+ (desktop):
 *     A fixed ~240px left sidebar — wordmark + notification bell on
 *     top, the role-filtered nav grouped under labelled sections
 *     (Giving · Bazaar · Programmes · Content · Social), then a
 *     footer with the push toggle, signed-in identity and Sign out.
 *     Main content is offset right with `lg:pl-60`.
 *
 *   <lg (phone / tablet portrait):
 *     A slim 56px top bar — hamburger on the left, wordmark centred,
 *     bell on the right. The hamburger opens AdminMobileDrawer, which
 *     renders the SAME grouped nav.
 *
 * Why the move from the old horizontal pill row to a sidebar: 11 flat
 * pills overflowed the header and gave every destination equal weight.
 * A grouped sidebar scales, signals hierarchy, and matches the
 * sidebar-first pattern of the tools trustees already use (Linear,
 * Stripe, Notion). The single source of truth for the nav lives in
 * admin-nav.tsx so this surface and the drawer never drift.
 *
 * PWA standalone: the mobile top bar pads with env(safe-area-inset-top)
 * so the iPhone notch doesn't clip it.
 */
export default function AdminShell({
  children,
  signedInAs = "info@deenrelief.org",
  role = "admin",
}: {
  children: React.ReactNode;
  signedInAs?: string;
  /**
   * Role of the signed-in user. Controls which nav groups/items are
   * rendered in both the sidebar and the mobile drawer. Defaults to
   * 'admin' for backward compat with any caller not yet passing a role.
   */
  role?: AdminRole;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Global ⌘K / Ctrl+K toggles the command palette from anywhere in the
  // admin. Registered unconditionally (before the login early-return) so
  // the hook order is stable; the palette only renders within the chrome.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Role-filtered nav, computed once. `homeHref` is the first item the
  // role can actually reach, so the wordmark never dead-ends a
  // non-admin user (e.g. a writer lands on /admin/blog). Social visibility
  // is handled inside admin-nav (gated by the SOCIAL_ALLOWED_EMAILS
  // allow-list), so the Social group only appears for permitted accounts.
  const groups = visibleGroups(role, signedInAs);
  const homeHref = flatVisible(role, signedInAs)[0]?.href ?? "/admin/donations";

  // The login + change-password pages render standalone without chrome.
  if (pathname === "/admin/login" || pathname === "/admin/change-password") {
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
    <div className="min-h-screen bg-cream print:bg-white print:min-h-0">
      {/* ── Desktop sidebar (lg+) ── print:hidden so a printed page
          (e.g. a packing slip) captures only the content. */}
      <aside className="hidden lg:flex lg:flex-col fixed inset-y-0 left-0 w-60 bg-white border-r border-charcoal/10 z-30 print:hidden">
        {/* Header — wordmark + notification bell */}
        <div className="flex items-center justify-between px-5 py-[18px] border-b border-charcoal/8">
          <Link href={homeHref} className="block" aria-label="Deen Relief Admin home">
            <span className="block text-[10px] font-bold tracking-[0.18em] uppercase text-amber-dark leading-tight">
              Deen Relief
            </span>
            <span className="block text-charcoal font-heading font-semibold text-base leading-tight">
              Admin
            </span>
          </Link>
          {/* Sidebar bell sits on the LEFT of the screen → open the panel
              rightward so it doesn't overflow the viewport's left edge. */}
          <AdminNotificationBell align="left" />
        </div>

        {/* Search trigger — opens the ⌘K command palette. */}
        <div className="px-3 pt-3">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg border border-charcoal/12 bg-charcoal/[0.02] text-charcoal/45 hover:border-charcoal/25 hover:text-charcoal/70 transition-colors"
            aria-label="Search (Command or Control + K)"
          >
            <svg className="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.2-3.2" strokeLinecap="round" />
            </svg>
            <span className="flex-1 text-left text-[13px]">Search…</span>
            <kbd className="text-[10px] font-semibold bg-charcoal/5 rounded px-1.5 py-0.5">⌘K</kbd>
          </button>
        </div>

        {/* Grouped nav */}
        <nav
          className="flex-1 overflow-y-auto px-3 py-4 space-y-5"
          aria-label="Admin sections"
        >
          {groups.map((group) => (
            <div key={group.label}>
              <p className="px-2.5 mb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-charcoal/40">
                {group.label}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = pathname.startsWith(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={isActive ? "page" : undefined}
                        className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors ${
                          isActive
                            ? "bg-charcoal text-white font-semibold"
                            : "text-charcoal/75 hover:bg-charcoal/5 hover:text-charcoal font-medium"
                        }`}
                      >
                        <span className={isActive ? "text-white" : "text-charcoal/45"}>
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
        <div className="border-t border-charcoal/8 p-4">
          <div className="mb-3">
            <AdminPushPrompt />
          </div>
          <p className="text-[10px] uppercase tracking-[0.1em] font-bold text-charcoal/40 mb-0.5">
            Signed in
          </p>
          <p className="text-[12px] text-charcoal/70 break-all mb-2.5">{signedInAs}</p>
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full px-3 py-1.5 rounded-full text-sm font-medium text-charcoal/70 border border-charcoal/15 hover:bg-cream hover:text-charcoal transition-colors"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Mobile / tablet top bar (<lg) ── */}
      <header
        className="lg:hidden bg-white border-b border-charcoal/10 sticky top-0 z-30 print:hidden"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="px-4 flex items-center justify-between h-14">
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
            href={homeHref}
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
          <div className="-mr-1 flex items-center">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Search"
              className="w-11 h-11 flex items-center justify-center text-charcoal/80 hover:bg-charcoal/5 rounded-full transition-colors"
            >
              <svg className="w-[22px] h-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.2-3.2" strokeLinecap="round" />
              </svg>
            </button>
            <AdminNotificationBell />
          </div>
        </div>
      </header>

      {/* Slide-out drawer — always mounted so its transition animates. */}
      <AdminMobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        signedInAs={signedInAs}
        onSignOut={handleSignOut}
        role={role}
      />

      {/* ⌘K command palette — global search across pages + records. */}
      <CommandPalette
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        role={role}
        email={signedInAs}
      />

      {/* Main content — offset by the sidebar on desktop. */}
      <div className="lg:pl-60">{children}</div>
    </div>
  );
}
