import Footer from "@/components/Footer";
import { BazaarCartProvider } from "@/components/bazaar/BazaarCartProvider";
import BazaarHeader from "@/components/bazaar/BazaarHeader";

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
