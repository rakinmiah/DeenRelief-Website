import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="flex-1 flex items-center justify-center py-24 md:py-32">
        <div className="max-w-xl mx-auto px-4 sm:px-6 text-center">
          {/* Decorative 404 */}
          <p className="text-[7rem] sm:text-[9rem] font-heading font-bold leading-none text-green-light select-none">
            404
          </p>

          {/* Heading */}
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-charcoal -mt-4 mb-4">
            Page not found
          </h1>

          {/* Description */}
          <p className="text-grey text-base sm:text-[1.0625rem] leading-[1.7] mb-8 max-w-md mx-auto">
            The page you&apos;re looking for doesn&apos;t exist or has been
            moved. Let&apos;s get you back on track.
          </p>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-amber text-white font-body font-semibold text-base hover:bg-amber-dark transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green"
            >
              Back to Homepage
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center px-6 py-3 rounded-full border border-green/20 text-green font-body font-semibold text-base hover:bg-green-light/40 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green"
            >
              Contact Us
            </Link>
          </div>

          {/* Quick links */}
          <div className="mt-12 pt-8 border-t border-grey-light">
            <p className="text-[11px] font-bold tracking-[0.1em] uppercase text-green mb-4">
              Popular Pages
            </p>
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
              {[
                { href: "/palestine", label: "Palestine Appeal" },
                { href: "/cancer-care", label: "Cancer Care" },
                { href: "/orphan-sponsorship", label: "Orphan Sponsorship" },
                { href: "/zakat", label: "Pay Zakat" },
                { href: "/prayer-times", label: "Prayer Times" },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-grey hover:text-green transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
