"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Button from "./Button";
import { isQurbaniLive } from "@/lib/qurbani";

// Maps pages with their own donation panels to their anchor IDs
const donateAnchors: Record<string, string> = {
  "/": "#donate",
  "/zakat": "#zakat-form",
  "/qurbani": "#donate-form",
  "/palestine": "#donate-form",
  "/cancer-care": "#donate-form",
  "/orphan-sponsorship": "#sponsor-form",
  "/build-a-school": "#donate-form",
  "/clean-water": "#donate-form",
  "/uk-homeless": "#donate-form",
  "/sadaqah": "#donate-form",
};

export default function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // On pages with a donation panel, scroll to it; otherwise go to homepage panel
  const donateHref = donateAnchors[pathname] ?? "/#donate";

  // Computed per render (not at module load) so warm Vercel functions still
  // drop the Qurbani link the first request after the deadline passes —
  // see src/lib/qurbani.ts for the date.
  const navLinks = [
    { label: "Home", href: "/" },
    { label: "Our Work", href: "/our-work" },
    { label: "Pay Zakat", href: "/zakat" },
    ...(isQurbaniLive() ? [{ label: "Qurbani", href: "/qurbani" }] : []),
    { label: "Prayer Times", href: "/prayer-times" },
    { label: "About", href: "/about" },
    { label: "Blog", href: "/blog" },
    { label: "Contact", href: "/contact" },
  ];

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href.replace("#", "/"));
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Lock body scroll when the mobile drawer is open so the page underneath
  // doesn't scroll behind the menu. Restores the original overflow on close
  // and on unmount (covers the link-tap-then-navigate path too).
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [mobileMenuOpen]);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 bg-white transition-all duration-300 ${
        scrolled ? "shadow-[0_1px_3px_rgba(0,0,0,0.06)] py-3" : "py-4"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            {/* Width/height match the asset's intrinsic 2085×349 ratio
                (≈5.97). Mismatching them trips Next.js Image's aspect-
                ratio warning when CSS resizes the height. */}
            <Image
              src="/images/logo.webp"
              alt="Deen Relief"
              width={191}
              height={32}
              className={`w-auto transition-[height] duration-300 ${scrolled ? "h-7" : "h-8"}`}
              priority
            />
          </Link>

          {/* Desktop Navigation */}
          <nav
            className="hidden lg:flex items-center gap-8"
            aria-label="Main navigation"
          >
            {navLinks.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  className={`font-medium tracking-wide transition-colors duration-200 ${
                    active
                      ? "text-green text-[15px] font-bold border-b-2 border-green pb-0.5"
                      : "text-charcoal/70 hover:text-green text-sm"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Desktop Donate Button */}
          <div className="hidden lg:block">
            <Button variant="primary" size="sm" href={donateHref}>
              Donate
            </Button>
          </div>

          {/* Mobile: Donate Button + Hamburger */}
          <div className="flex lg:hidden items-center gap-3">
            <Button variant="primary" size="sm" href={donateHref}>
              Donate
            </Button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2.5 text-charcoal/70 transition-colors duration-200"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {mobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <div
          className={`lg:hidden grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
            mobileMenuOpen
              ? "grid-rows-[1fr] opacity-100"
              : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="overflow-hidden">
            <nav
              className="mt-4 pb-4 pt-4 border-t border-charcoal/5"
              aria-label="Mobile navigation"
            >
              <div className="flex flex-col gap-4">
                {navLinks.map((link, i) => {
                  const active = isActive(link.href);
                  return (
                    <Link
                      key={link.label}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`font-medium py-1 transition-all duration-300 ${
                        mobileMenuOpen
                          ? "translate-y-0 opacity-100"
                          : "-translate-y-2 opacity-0"
                      } ${
                        active
                          ? "text-green text-[17px] font-bold"
                          : "text-charcoal/70 hover:text-green text-base"
                      }`}
                      style={{
                        transitionDelay: mobileMenuOpen
                          ? `${75 + i * 40}ms`
                          : "0ms",
                      }}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </div>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}
