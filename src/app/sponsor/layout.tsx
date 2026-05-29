import type { Metadata } from "next";
import Link from "next/link";

/**
 * Sponsor portal layout. The whole tree is noindex — these pages are private
 * and must never appear in search results, even if a URL leaks.
 *
 * Deliberately minimal chrome (not the full marketing Header/Footer) so the
 * portal reads as a calm, focused account area.
 */
export const metadata: Metadata = {
  title: { default: "Sponsor account | Deen Relief", template: "%s | Deen Relief" },
  robots: { index: false, follow: false },
};

export default function SponsorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <header className="bg-white border-b border-charcoal/10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/sponsor/dashboard" className="block" aria-label="Sponsor home">
            <span className="block text-[10px] font-bold tracking-[0.18em] uppercase text-amber-dark leading-tight">
              Deen Relief
            </span>
            <span className="block text-charcoal font-heading font-semibold text-base leading-tight">
              Sponsor account
            </span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/sponsor/dashboard" className="text-charcoal/70 hover:text-charcoal">
              Dashboard
            </Link>
            <Link href="/sponsor/account" className="text-charcoal/70 hover:text-charcoal">
              Account
            </Link>
            <Link
              href="/sponsor/logout"
              prefetch={false}
              className="text-charcoal/70 hover:text-charcoal"
            >
              Sign out
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-charcoal/10 py-6 text-center text-xs text-grey/70">
        Deen Relief · Registered charity in England &amp; Wales, No. 1158608
      </footer>
    </div>
  );
}
