import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Footer from "@/components/Footer";
import { BazaarCartProvider } from "@/components/bazaar/BazaarCartProvider";
import BazaarHeader from "@/components/bazaar/BazaarHeader";
import { isBazaarLive } from "@/lib/bazaar-flag";

/**
 * Pre-launch crawler suppression for the entire /bazaar/* tree.
 *
 * This is the belt-and-braces companion to "URL obscurity" — the client
 * has decided not to ship a kill switch (no env-flag gate) on the basis
 * that nobody can find the bazaar pages unless they're shared the link
 * directly. That's correct, but search engines DO crawl every link they
 * find anywhere on the wider web, so any internal share, dev preview, or
 * accidental inbound link could leak the not-yet-real catalog into the
 * index before stock and policy copy are finalised.
 *
 * Setting `robots: noindex, nofollow` at the layout level cascades to
 * every child segment that doesn't explicitly override it (none do today).
 * Once we go live we delete this block — at that point we WANT the shop
 * pages indexed.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Layout for /bazaar/* — wraps every shop page with:
 *   1. BazaarHeader — single combined nav (Bazaar wordmark + back-to-
 *      charity link + shop nav + Cart + Donate). Replaces the previous
 *      dual-nav of main site Header + BazaarSubHeader, which competed
 *      for visual weight and ate ~108px of sticky chrome.
 *   2. Cart provider context (cart state shared across all shop pages)
 *   3. Main site Footer (charity registration, full site links —
 *      preserves the "this is part of Deen Relief" signal at the
 *      bottom of every shop page even though the top is bazaar-led)
 *
 * Why a separate layout: keeps shop-only state and nav scoped to /bazaar.
 * If we ever decide the shop is a fully separate sub-domain (shop.deen
 * relief.org), this layout absorbs that change without touching pages.
 */
export default function BazaarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Pre-launch gate. When NEXT_PUBLIC_BAZAAR_ENABLED isn't set to
  // "true" on the deployment, every /bazaar/* route returns 404 at
  // the layout level — well before any page renders, so cart state,
  // product fetches, etc. all short-circuit. Admin bazaar routes
  // are NOT gated; they live under /admin and stay functional so a
  // trustee can keep working with the schema while the storefront
  // is dark. Flip this to "true" on Vercel to launch.
  if (!isBazaarLive()) {
    notFound();
  }

  return (
    <BazaarCartProvider>
      <BazaarHeader />
      <main id="main-content" className="flex-1 bg-white">
        {children}
      </main>
      <Footer />
    </BazaarCartProvider>
  );
}
