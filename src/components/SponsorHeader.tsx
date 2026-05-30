"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Button from "./Button";

/**
 * Header for the sponsor portal. Mirrors the public site's Header visual
 * language (fixed white bar, logo, scroll shadow, green active links, amber
 * CTA) but carries account navigation instead of the marketing nav, so a
 * signed-in sponsor can move around their portal.
 *
 * `authed` toggles between the signed-in nav (Dashboard / Account / Sign out)
 * and the signed-out state (Sign in), keeping login + set-password clean.
 */
export default function SponsorHeader({ authed }: { authed: boolean }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = authed
    ? [
        { label: "Dashboard", href: "/sponsor/dashboard" },
        { label: "Account", href: "/sponsor/account" },
      ]
    : [];

  const isActive = (href: string) => pathname.startsWith(href);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 bg-white transition-all duration-300 ${
        scrolled ? "shadow-[0_1px_3px_rgba(0,0,0,0.06)] py-3" : "py-4"
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <Link href={authed ? "/sponsor/dashboard" : "/"} className="flex-shrink-0">
            <Image
              src="/images/logo.webp"
              alt="Deen Relief"
              width={191}
              height={32}
              className={`w-auto transition-[height] duration-300 ${scrolled ? "h-7" : "h-8"}`}
              priority
            />
          </Link>

          <div className="flex items-center gap-4 sm:gap-6">
            <nav
              className="flex items-center gap-4 sm:gap-6"
              aria-label="Sponsor navigation"
            >
              {navLinks.map((link) => {
                const active = isActive(link.href);
                return (
                  <Link
                    key={link.label}
                    href={link.href}
                    className={`font-medium tracking-wide transition-colors duration-200 ${
                      active
                        ? "text-green text-sm sm:text-[15px] font-bold border-b-2 border-green pb-0.5"
                        : "text-charcoal/70 hover:text-green text-[13px] sm:text-sm"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
              {authed ? (
                <Link
                  href="/sponsor/logout"
                  prefetch={false}
                  className="text-charcoal/70 hover:text-green text-[13px] sm:text-sm font-medium tracking-wide transition-colors duration-200"
                >
                  Sign out
                </Link>
              ) : (
                <Link
                  href="/sponsor/login"
                  className="text-charcoal/70 hover:text-green text-[13px] sm:text-sm font-medium tracking-wide transition-colors duration-200"
                >
                  Sign in
                </Link>
              )}
            </nav>

            <div className="hidden sm:block">
              <Button variant="primary" size="sm" href="/orphan-sponsorship">
                Donate
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
