"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

/**
 * Auto-scroll to the donation panel when the donor arrives from a
 * social/bio-link source.
 *
 * Why this exists:
 *   - Donors clicking deenrelief.org/now from an Instagram bio, or
 *     scanning a QR on a Story, are already at peak intent. They've
 *     just seen the call-to-action; making them scroll past a hero
 *     section to find the form is friction that costs conversions.
 *   - Donors arriving via Google search, direct, or any non-social
 *     source see the page normally — they need the trust-building
 *     content above the fold first.
 *
 * Detection rule: utm_source must match one of the known social /
 * bio-link sources (set below). The /now redirect bakes
 * utm_source=now into every redirect; /r/[slug] uses the platform
 * tag (instagram/tiktok/voice/qr/...) or 'short_link' when no
 * platform is set.
 *
 * Target: the first element on the page with `data-donate-panel`.
 * Each campaign landing page should add this attribute to its
 * donation form section. If no such element exists (e.g. on the
 * homepage), the scroll silently does nothing.
 *
 * Mount point: the root layout — this component is cheap (one
 * useEffect, no DOM until needed), so global mounting is the
 * right trade-off vs threading it through every campaign page.
 * It bails out on /admin/* paths so trustees aren't jolted around
 * inside the admin.
 */

const SOCIAL_UTM_SOURCES = new Set([
  "now",
  "short_link",
  "instagram",
  "tiktok",
  "facebook",
  "x",
  "threads",
  "linkedin",
  "whatsapp_channel",
  "whatsapp",
  "email",
  "voice",
  "qr",
]);

export default function ScrollToDonateOnSocial() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Never auto-scroll inside the admin.
    if (pathname?.startsWith("/admin")) return;
    // Only act when the URL says the donor arrived via a social/bio
    // surface.
    const source = searchParams.get("utm_source")?.toLowerCase();
    if (!source || !SOCIAL_UTM_SOURCES.has(source)) return;

    // Defer to next frame so the page has a chance to paint first —
    // we want the donor to see the page exists, then the scroll
    // happens. Without the rAF, on slow connections the scroll
    // sometimes fires before layout has settled and lands on the
    // wrong y.
    const id = requestAnimationFrame(() => {
      // Pick the first VISIBLE donate panel. Some pages have responsive
      // mobile + desktop variants (e.g. /palestine) — both carry the
      // attribute, but at any viewport only one is rendered. offsetParent
      // is null for display:none elements, which is what Tailwind's
      // hidden / lg:hidden / etc. produce. The visible variant always
      // has a non-null offsetParent.
      const targets = document.querySelectorAll<HTMLElement>(
        "[data-donate-panel]"
      );
      let target: HTMLElement | null = null;
      for (const candidate of targets) {
        if (candidate.offsetParent !== null) {
          target = candidate;
          break;
        }
      }
      if (!target) return;
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    return () => cancelAnimationFrame(id);
  }, [pathname, searchParams]);

  return null;
}
