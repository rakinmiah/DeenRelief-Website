"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import CartButtonWithPreview from "./CartButtonWithPreview";
/**
 * Slug → maker country map for the contextual Donate routing.
 *
 * Kept inline (rather than fetched from the DB) because BazaarHeader
 * is a client component that needs synchronous access on every
 * pathname change. The map updates when new products launch — a
 * known-drift trade for keeping the header simple.
 *
 * Future cleanup: have the product page server-side embed a meta
 * tag with the country, and read it client-side here.
 */
const PRODUCT_SLUG_TO_COUNTRY: Record<string, "Bangladesh" | "Turkey" | "Pakistan"> = {
  "the-sylhet-abaya": "Bangladesh",
  "the-anatolia-thobe": "Turkey",
  "the-dhaka-prayer-mat": "Bangladesh",
  "the-silk-hijab": "Bangladesh",
  "the-adana-tasbih": "Turkey",
  "the-embroidered-quran-cover": "Bangladesh",
};

/**
 * Single combined header for /bazaar/* routes.
 *
 * Replaces the previous dual-nav (main site Header + BazaarSubHeader).
 * The dual-nav ate ~108px of vertical space and made the visual
 * hierarchy ambiguous. This single bar:
 *   - Owns brand identity (Deen Relief Bazaar wordmark)
 *   - Owns shop navigation (Shop / Our Makers / Our Promise)
 *   - Owns commerce actions (Cart with hover preview, Donate CTA)
 *   - Provides a "← Deen Relief" backlink so customers can return to
 *     the main charity site
 *
 * Donate destination is contextual:
 *   - On /bazaar/[slug] for a Bangladesh-made product → /orphan-sponsorship
 *   - On /bazaar/[slug] for a Turkey-made product → /cancer-care
 *   - Anywhere else → /#donate (homepage donate section, donor picks)
 *
 * Why contextual: a customer browsing the Sylhet Abaya page has just
 * read about Khadija in Bangladesh. If they click Donate, sending them
 * to Bangladesh's orphan-sponsorship cause page produces a thematically
 * tighter conversion than dumping them at a generic donate hub. The
 * product context primes the cause page.
 *
 * Mobile layout: identity + actions on a top row; shop nav on a second
 * scrollable row below. Total mobile height ~100px (vs ~108px previous
 * dual-nav and the bottom row scrolls away on long pages).
 */

const NAV_LINKS = [
  // Home points back at the main Deen Relief site root — useful
  // for shoppers who arrived directly into /bazaar (e.g. via a
  // social link) and want to discover the charity context.
  { href: "/", label: "Home" },
  // Shop deep-links to the catalog grid (#catalog has scroll-mt-32
  // to compensate for the sticky header). From any other page the
  // anchor causes Next.js to scroll into view automatically after
  // navigation; from /bazaar itself it's an in-page scroll.
  // Visitors arriving via the Shop nav always land directly on the
  // products rather than the hero — the hero is for first-touch
  // discovery, the nav is for buyers who already know they want
  // to browse.
  { href: "/bazaar#catalog", label: "Shop" },
  { href: "/bazaar/about-our-makers", label: "Our Makers" },
  { href: "/bazaar/our-promise", label: "Our Promise" },
  // Bazaar gets its own contact surface (order number field,
  // buyer-shaped reasons, deflects to returns/shipping/sizing).
  // The main /contact remains for charity-programme questions.
  { href: "/bazaar/contact", label: "Contact" },
];

/**
 * Whether a nav link should render in its active style for the
 * current pathname.
 *
 * Two links need exact-match treatment:
 *   - `/`         — otherwise startsWith("/") matches every page
 *   - `/bazaar`   — otherwise it lights up on /bazaar/[slug],
 *                   /bazaar/cart, etc, when "Shop" is the more
 *                   general intent than the landing surface
 *
 * Every other link (Makers, Promise, Contact) uses startsWith so
 * nested routes (e.g. /contact/thank-you) still light up the
 * parent.
 */
function isLinkActive(linkHref: string, pathname: string): boolean {
  // Strip any #hash / ?query from the link so anchors like
  // "/bazaar#catalog" still light up "Shop" when the pathname is
  // plain "/bazaar". usePathname() never includes the hash, so
  // the comparison happens on path-only.
  const linkPath = linkHref.split("#")[0].split("?")[0];
  if (linkPath === "/" || linkPath === "/bazaar") {
    return pathname === linkPath;
  }
  return pathname.startsWith(linkPath);
}

/**
 * Derive the Donate href from the current pathname. Pure function —
 * easier to test in isolation than a hook-based version, and the
 * useEffect-on-pathname-change pattern from the analytics exclusion
 * helper is overkill for what's just a per-render derivation.
 */
function deriveDonateHref(pathname: string): string {
  const productMatch = pathname.match(/^\/bazaar\/([^/]+)$/);
  if (!productMatch) return "/#donate";
  const country = PRODUCT_SLUG_TO_COUNTRY[productMatch[1]];
  switch (country) {
    case "Bangladesh":
      return "/orphan-sponsorship";
    case "Turkey":
      return "/cancer-care";
    case "Pakistan":
      return "/#donate"; // No active Pakistan campaign; default to picker
    default:
      return "/#donate";
  }
}

export default function BazaarHeader() {
  const pathname = usePathname();
  const donateHref = deriveDonateHref(pathname);

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-charcoal/8 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top row — identity (left) + commerce CTAs (right) */}
        <div className="flex items-center justify-between h-[60px] md:h-[64px]">
          {/* Left cluster: Deen Relief logo (links back to charity home) */}
          {/* Replaces the previous text wordmark + "← Deen Relief"
              backlink — the logo IS the Deen Relief brand mark, no
              need for separate text. Clicking it goes to / (main
              charity site) which is the conventional logo behaviour.
              Customers stay oriented within the bazaar via the URL
              + the Shop / Our Makers / Our Promise nav. */}
          <Link
            href="/"
            className="block"
            aria-label="Deen Relief — back to charity home"
          >
            <Image
              src="/images/logo.webp"
              alt="Deen Relief"
              width={191}
              height={32}
              className="w-auto h-7 sm:h-8"
              priority
            />
          </Link>

          {/* Center: shop nav (desktop only — moves to second row on mobile) */}
          <nav
            className="hidden md:flex items-center gap-1"
            aria-label="Shop sections"
          >
            {NAV_LINKS.map((link) => {
              const isActive = isLinkActive(link.href, pathname);
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
          </nav>

          {/* Right: Cart (with hover preview) + Donate primary CTA */}
          <div className="flex items-center gap-2">
            <CartButtonWithPreview />
            <Link
              href={donateHref}
              className="px-4 py-1.5 rounded-full bg-amber text-charcoal text-sm font-semibold hover:bg-amber-dark transition-colors shadow-sm whitespace-nowrap"
            >
              Donate
            </Link>
          </div>
        </div>

        {/* Mobile shop nav — second row, horizontally scrollable */}
        <nav
          className="md:hidden flex gap-1 -mx-4 px-4 pb-3 overflow-x-auto"
          aria-label="Shop sections (mobile)"
        >
          {NAV_LINKS.map((link) => {
            const isActive = isLinkActive(link.href, pathname);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-charcoal text-white"
                    : "text-charcoal/70 hover:text-charcoal hover:bg-charcoal/5"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
