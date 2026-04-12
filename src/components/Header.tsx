"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Button from "./Button";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Our Work", href: "#campaigns" },
  { label: "Pay Zakat", href: "/zakat" },
  { label: "Prayer Times", href: "/prayer-times" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export default function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
            <Image
              src="/images/logo.webp"
              alt="Deen Relief"
              width={180}
              height={32}
              className="transition-all duration-300"
              style={{
                height: scrolled ? "28px" : "32px",
                width: "auto",
              }}
              priority
            />
          </Link>

          {/* Desktop Navigation */}
          <nav
            className="hidden md:flex items-center gap-8"
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
          <div className="hidden md:block">
            <Button variant="primary" size="sm" href="#donate">
              Donate
            </Button>
          </div>

          {/* Mobile: Donate Button + Hamburger */}
          <div className="flex md:hidden items-center gap-3">
            <Button variant="primary" size="sm" href="#donate">
              Donate
            </Button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-charcoal/70 transition-colors duration-200"
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
        {mobileMenuOpen && (
          <nav
            className="md:hidden mt-4 pb-4 pt-4 border-t border-charcoal/5"
            aria-label="Mobile navigation"
          >
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => {
                const active = isActive(link.href);
                return (
                  <Link
                    key={link.label}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`font-medium py-1 ${
                      active
                        ? "text-green text-[17px] font-bold"
                        : "text-charcoal/70 hover:text-green text-base"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
