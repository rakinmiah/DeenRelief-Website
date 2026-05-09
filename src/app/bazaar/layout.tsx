import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { BazaarCartProvider } from "@/components/bazaar/BazaarCartProvider";
import BazaarSubHeader from "@/components/bazaar/BazaarSubHeader";

/**
 * Layout for /bazaar/* — wraps every shop page with:
 *   1. The main site Header (preserves brand cohesion)
 *   2. The Bazaar sub-header (shop-specific nav + live cart counter)
 *   3. The cart provider context (cart state shared across all pages)
 *   4. The main site Footer (preserves brand cohesion)
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
      <Header />
      <BazaarSubHeader />
      <main id="main-content" className="flex-1 bg-white">
        {children}
      </main>
      <Footer />
    </BazaarCartProvider>
  );
}
