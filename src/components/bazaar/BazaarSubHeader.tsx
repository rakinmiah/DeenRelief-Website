"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import CartButtonWithPreview from "./CartButtonWithPreview";

/**
 * A slim sub-navigation specific to /bazaar/* routes. Sits below the
 * main site Header so brand cohesion is preserved while making the shop
 * navigation discoverable. Includes a cart counter that updates live.
 *
 * Why a sub-header rather than extending the main Header: the main
 * Header is the single source of truth for charity nav. Adding shop
 * links there would dilute the donate-first hierarchy. The sub-header
 * scopes shop nav to shop pages only.
 */
export default function BazaarSubHeader() {
  const pathname = usePathname();

  const links = [
    { href: "/bazaar", label: "Shop" },
    { href: "/bazaar/about-our-makers", label: "Our Makers" },
    { href: "/bazaar/our-promise", label: "Our Promise" },
  ];

  return (
    <nav className="sticky top-[60px] md:top-[64px] z-30 bg-cream border-b border-charcoal/8 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-12">
          <div className="flex items-center gap-1 sm:gap-2">
            <span className="text-[11px] font-bold tracking-[0.15em] uppercase text-charcoal/50 mr-3 hidden sm:inline">
              Bazaar
            </span>
            {links.map((link) => {
              const isActive =
                link.href === "/bazaar"
                  ? pathname === "/bazaar"
                  : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-charcoal text-white"
                      : "text-charcoal/70 hover:text-charcoal hover:bg-charcoal/5"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
          <CartButtonWithPreview />
        </div>
      </div>
    </nav>
  );
}
