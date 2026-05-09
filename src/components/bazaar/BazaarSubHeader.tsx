"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useBazaarCart } from "./BazaarCartProvider";

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
  const { itemCount } = useBazaarCart();

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
          <Link
            href="/bazaar/cart"
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium text-charcoal/80 hover:bg-charcoal/5 transition-colors"
            aria-label={`Cart, ${itemCount} item${itemCount === 1 ? "" : "s"}`}
          >
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
                d="M2.25 3h1.386a1.125 1.125 0 0 1 1.097.852l.481 1.927M7.5 14.25a3 3 0 0 0-3 3h15.75M7.5 14.25h11.25l1.45-7.25H5.214M7.5 14.25 5.214 7"
              />
            </svg>
            <span>Cart</span>
            {itemCount > 0 && (
              <span className="bg-amber text-charcoal text-[11px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                {itemCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </nav>
  );
}
